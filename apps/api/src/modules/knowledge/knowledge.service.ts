
import { pool } from "../../db";
import {
  calculateContentHash,
  normalizeFreshness,
  normalizeProvenance,
} from "./knowledge.contract";

export interface RefreshKnowledgeDocumentInput {
  documentId: number;
  freshness: unknown;
  provenance: unknown;
}

export class KnowledgeServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "KnowledgeServiceError";
  }
}

export class KnowledgeService {
  constructor(
    private readonly dbPool: Pick<typeof pool, "connect"> = pool,
  ) {}

  async refreshDocument(input: RefreshKnowledgeDocumentInput) {
    if (!Number.isSafeInteger(input.documentId) || input.documentId <= 0) {
      throw new KnowledgeServiceError("ID de documento inválido.", 400);
    }

    const freshness = normalizeFreshness(input.freshness);
    const provenance = normalizeProvenance(input.provenance);

    const client = await this.dbPool.connect();

    try {
      await client.query("BEGIN");

      const documentResult = await client.query(
        `
          SELECT
            d.id,
            d.source_id,
            d.content,
            d.version,
            s.source_name,
            s.origin_url,
            s.source_priority
          FROM public.knowledge_documents d
          INNER JOIN public.knowledge_sources s
            ON s.id = d.source_id
          WHERE d.id = $1
          FOR UPDATE OF d, s
        `,
        [input.documentId],
      );

      if (documentResult.rowCount === 0) {
        throw new KnowledgeServiceError("Documento no encontrado.", 404);
      }

      const document = documentResult.rows[0];

      if (provenance.sourceId !== document.source_id) {
        throw new KnowledgeServiceError(
          "La procedencia no corresponde a la fuente del documento.",
          400,
        );
      }

      if (
        provenance.sourceName !== document.source_name ||
        provenance.originUrl !== document.origin_url
      ) {
        throw new KnowledgeServiceError(
          "El nombre o URL de procedencia no coincide con la fuente registrada.",
          400,
        );
      }

      const contentHash = calculateContentHash(document.content);

      await client.query(
        `
          UPDATE public.knowledge_documents
          SET
            published_at = COALESCE($2, published_at),
            valid_from = COALESCE($3, valid_from),
            valid_until = COALESCE($4, valid_until),
            content_hash = $5,
            provenance_metadata = provenance_metadata || $6::jsonb,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          document.id,
          freshness.publishedAt ?? null,
          freshness.validFrom ?? null,
          freshness.validUntil ?? null,
          contentHash,
          JSON.stringify(provenance),
        ],
      );

      await client.query(
        `
          UPDATE public.knowledge_sources
          SET
            source_priority = CASE
              WHEN $2 = 'UNSPECIFIED' THEN source_priority
              ELSE $2
            END,
            last_synced_at = $3,
            provenance_metadata = provenance_metadata || $4::jsonb
          WHERE id = $1
        `,
        [
          document.source_id,
          provenance.sourcePriority,
          freshness.lastSyncedAt ?? provenance.retrievedAt,
          JSON.stringify({
            retrievedAt: provenance.retrievedAt,
            documentId: document.id,
            contentHash,
          }),
        ],
      );

      await client.query("COMMIT");

      return {
        documentId: document.id,
        sourceId: document.source_id,
        contentHash,
        freshness,
        provenance,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export const knowledgeService = new KnowledgeService();
