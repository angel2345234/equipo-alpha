
import { pool } from "../../db";
import type { PoolClient } from "pg";

import {
  calculateContentHash,
} from "./knowledge.contract";

import {
  EmbeddingProvider,
  EmbeddingResult,
} from "./embedding.provider";

interface KnowledgeChunkRow {
  id: number;
  content: string;
}

interface ExistingEmbeddingRow {
  id: number;
  content_hash: string;
  status: string;
}

interface PendingEmbeddingRow {
  id: number;
}

export interface IndexKnowledgeChunkInput {
  chunkId: number;
}

export class KnowledgeEmbeddingServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "KnowledgeEmbeddingServiceError";
  }
}

export class KnowledgeEmbeddingService {
  constructor(
    private readonly dbPool: Pick<typeof pool, "connect">,
    private readonly provider: EmbeddingProvider,
  ) {}

  async indexChunk(input: IndexKnowledgeChunkInput) {
    if (!Number.isSafeInteger(input.chunkId) || input.chunkId <= 0) {
      throw new KnowledgeEmbeddingServiceError(
        "ID de fragmento inválido.",
        400,
      );
    }

    const client = await this.dbPool.connect();

    let pendingId: number | undefined;
    let transactionStarted = false;

    try {
      // 1. Obtener el fragmento.
      const chunkResult = await client.query<KnowledgeChunkRow>(
        `
          SELECT id, content
          FROM public.knowledge_chunks
          WHERE id = $1
        `,
        [input.chunkId],
      );

      if (chunkResult.rowCount === 0) {
        throw new KnowledgeEmbeddingServiceError(
          "Fragmento de conocimiento no encontrado.",
          404,
        );
      }

      const chunk = chunkResult.rows[0];
      const contentHash = calculateContentHash(chunk.content);

      // 2. Comprobar si existe un embedding activo con el mismo hash.
      const existingResult = await client.query<ExistingEmbeddingRow>(
        `
          SELECT id, content_hash, status
          FROM public.knowledge_embeddings
          WHERE chunk_id = $1
            AND provider = $2
            AND model = $3
            AND status = 'ACTIVE'
          LIMIT 1
        `,
        [
          chunk.id,
          this.provider.provider,
          this.provider.model,
        ],
      );

      const existing = existingResult.rows[0];

      if (existing?.content_hash.trim() === contentHash) {
        return {
          chunkId: chunk.id,
          embeddingId: existing.id,
          created: false,
          status: "ACTIVE" as const,
          contentHash,
        };
      }

      // 3. Registrar el nuevo embedding como PENDING.
      const pendingResult = await client.query<PendingEmbeddingRow>(
        `
          INSERT INTO public.knowledge_embeddings (
            chunk_id,
            provider,
            model,
            dimensions,
            content_hash,
            embedding,
            status,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, NULL, 'PENDING', $6::jsonb)
          RETURNING id
        `,
        [
          chunk.id,
          this.provider.provider,
          this.provider.model,
          this.provider.dimensions,
          contentHash,
          JSON.stringify({
            requestedAt: new Date().toISOString(),
          }),
        ],
      );

      pendingId = pendingResult.rows[0].id;

      // 4. Solicitar el embedding al proveedor.
      let embeddingResult: EmbeddingResult;

      try {
        embeddingResult = await this.provider.generateEmbedding(
          chunk.content,
        );
      } catch {
        await this.markAsFailed(
          client,
          pendingId,
          "No se pudo generar el embedding con el proveedor.",
        );

        throw new KnowledgeEmbeddingServiceError(
          "No se pudo generar el embedding del fragmento.",
          502,
        );
      }

      // 5. Validar la respuesta del proveedor.
      const validEmbedding =
        embeddingResult.provider === this.provider.provider &&
        embeddingResult.model === this.provider.model &&
        embeddingResult.dimensions === this.provider.dimensions &&
        embeddingResult.embedding.length === this.provider.dimensions &&
        embeddingResult.embedding.every(Number.isFinite);

      if (!validEmbedding) {
        await this.markAsFailed(
          client,
          pendingId,
          "La respuesta del proveedor no cumple el contrato.",
        );

        throw new KnowledgeEmbeddingServiceError(
          "La respuesta del proveedor contiene datos incompatibles.",
          502,
        );
      }

      // 6. Iniciar la transacción de activación.
      await client.query("BEGIN");
      transactionStarted = true;

      // Bloquear el fragmento y verificar que no haya cambiado.
      const currentChunkResult =
        await client.query<KnowledgeChunkRow>(
          `
            SELECT id, content
            FROM public.knowledge_chunks
            WHERE id = $1
            FOR UPDATE
          `,
          [chunk.id],
        );

      if (
        currentChunkResult.rowCount === 0 ||
        calculateContentHash(currentChunkResult.rows[0].content) !==
          contentHash
      ) {
        throw new KnowledgeEmbeddingServiceError(
          "El contenido del fragmento cambió durante la generación.",
          409,
        );
      }

      // 7. Desactivar la versión activa anterior.
      await client.query(
        `
          UPDATE public.knowledge_embeddings
          SET status = 'SUPERSEDED'
          WHERE chunk_id = $1
            AND provider = $2
            AND model = $3
            AND status = 'ACTIVE'
        `,
        [
          chunk.id,
          this.provider.provider,
          this.provider.model,
        ],
      );

      // 8. Activar el nuevo embedding.
      const vector = `[${embeddingResult.embedding.join(",")}]`;

      await client.query(
        `
          UPDATE public.knowledge_embeddings
          SET
            embedding = $2::public.vector,
            status = 'ACTIVE',
            metadata = metadata || $3::jsonb
          WHERE id = $1
            AND status = 'PENDING'
        `,
        [
          pendingId,
          vector,
          JSON.stringify({
            generatedAt: new Date().toISOString(),
            tokenCount: embeddingResult.tokenCount,
            contentHash,
          }),
        ],
      );

      await client.query("COMMIT");
      transactionStarted = false;

      return {
        chunkId: chunk.id,
        embeddingId: pendingId,
        created: true,
        status: "ACTIVE" as const,
        contentHash,
      };
    } catch (error) {
      // Revertir solamente si se inició una transacción.
      if (transactionStarted) {
        await client.query("ROLLBACK").catch(() => undefined);
        transactionStarted = false;
      }

      // Marcar el embedding pendiente como fallido.
      if (pendingId !== undefined) {
        await this.markAsFailed(
          client,
          pendingId,
          error instanceof Error
            ? error.message
            : "Error desconocido.",
        ).catch(() => undefined);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  private async markAsFailed(
    client: PoolClient,
    embeddingId: number,
    errorMessage: string,
  ): Promise<void> {
    await client.query(
      `
        UPDATE public.knowledge_embeddings
        SET
          status = 'FAILED',
          metadata = metadata || $2::jsonb
        WHERE id = $1
          AND status = 'PENDING'
      `,
      [
        embeddingId,
        JSON.stringify({
          failedAt: new Date().toISOString(),
          error: errorMessage,
        }),
      ],
    );
  }
}
