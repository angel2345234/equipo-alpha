
import test from "node:test";
import assert from "node:assert/strict";

import { calculateContentHash } from "./knowledge.contract";
import { KnowledgeEmbeddingService } from "./knowledge.embedding.service";
import {
  EmbeddingProvider,
  EmbeddingResult,
} from "./embedding.provider";

const CONTENT =
  "Este documento describe los fundamentos de la arquitectura de microservicios.";

function createProvider(
  options: {
    fail?: boolean;
    embedding?: number[];
  } = {},
): EmbeddingProvider {
  return {
    provider: "openai",
    model: "text-embedding-3-small",
    dimensions: 1536,

    async generateEmbedding(): Promise<EmbeddingResult> {
      if (options.fail) {
        throw new Error("Error simulado de OpenAI.");
      }

      return {
        embedding: options.embedding ?? Array(1536).fill(0.1),
        tokenCount: 12,
        provider: "openai",
        model: "text-embedding-3-small",
        dimensions: 1536,
      };
    },
  };
}

function createDatabaseMock(
  options: {
    existing?: boolean;
    existingHash?: string;
    missing?: boolean;
    updatedContent?: string;
  } = {},
) {
  const queries: string[] = [];

  const client = {
    async query(sql: string) {
      queries.push(sql);

      // Consulta de un embedding activo existente.
      if (sql.includes("SELECT id, content_hash, status")) {
        return {
          rowCount: options.existing ? 1 : 0,
          rows: options.existing
            ? [
                {
                  id: 10,
                  content_hash:
                    options.existingHash ?? "b".repeat(64),
                  status: "ACTIVE",
                },
              ]
            : [],
        };
      }

      // Consulta del chunk bloqueado durante la transacción.
      if (sql.includes("FOR UPDATE")) {
        return {
          rowCount: options.missing ? 0 : 1,
          rows: options.missing
            ? []
            : [
                {
                  id: 1,
                  content: options.updatedContent ?? CONTENT,
                },
              ],
        };
      }

      // Consulta inicial del contenido del fragmento.
      if (
        sql.includes("SELECT id, content") &&
        sql.includes("knowledge_chunks")
      ) {
        return {
          rowCount: options.missing ? 0 : 1,
          rows: options.missing
            ? []
            : [{ id: 1, content: CONTENT }],
        };
      }

      // Inserción de un embedding pendiente.
      if (sql.includes("INSERT INTO public.knowledge_embeddings")) {
        return {
          rowCount: 1,
          rows: [{ id: 20 }],
        };
      }

      return {
        rowCount: 1,
        rows: [],
      };
    },

    release() {},
  };

  return {
    queries,
    connect: async () => client,
  };
}

test("rechaza un ID de fragmento inválido", async () => {
  const db = createDatabaseMock();

  const service = new KnowledgeEmbeddingService(
    db as never,
    createProvider(),
  );

  await assert.rejects(
    () => service.indexChunk({ chunkId: 0 }),
    /ID de fragmento inválido/,
  );
});

test("rechaza un fragmento inexistente", async () => {
  const db = createDatabaseMock({ missing: true });

  const service = new KnowledgeEmbeddingService(
    db as never,
    createProvider(),
  );

  await assert.rejects(
    () => service.indexChunk({ chunkId: 1 }),
    /Fragmento de conocimiento no encontrado/,
  );
});

test("no vuelve a generar un embedding activo con el mismo hash", async () => {
  const db = createDatabaseMock({
    existing: true,
    existingHash: calculateContentHash(CONTENT),
  });

  let generated = false;

  const baseProvider = createProvider();

  const provider: EmbeddingProvider = {
    provider: baseProvider.provider,
    model: baseProvider.model,
    dimensions: baseProvider.dimensions,

    async generateEmbedding(content: string) {
      generated = true;
      return baseProvider.generateEmbedding(content);
    },
  };

  const service = new KnowledgeEmbeddingService(
    db as never,
    provider,
  );

  const result = await service.indexChunk({ chunkId: 1 });

  assert.equal(result.created, false);
  assert.equal(result.status, "ACTIVE");
  assert.equal(result.embeddingId, 10);
  assert.equal(generated, false);
});

test("crea un embedding nuevo y activa la versión", async () => {
  const db = createDatabaseMock();

  const service = new KnowledgeEmbeddingService(
    db as never,
    createProvider(),
  );

  const result = await service.indexChunk({ chunkId: 1 });

  assert.equal(result.chunkId, 1);
  assert.equal(result.embeddingId, 20);
  assert.equal(result.created, true);
  assert.equal(result.status, "ACTIVE");

  assert.ok(
    db.queries.some((query) => query.includes("BEGIN")),
  );

  assert.ok(
    db.queries.some((query) => query.includes("COMMIT")),
  );
});

test("rechaza vectores de dimensiones incorrectas", async () => {
  const db = createDatabaseMock();

  const service = new KnowledgeEmbeddingService(
    db as never,
    createProvider({
      embedding: [0.1, 0.2, 0.3],
    }),
  );

  await assert.rejects(
    () => service.indexChunk({ chunkId: 1 }),
    /datos incompatibles/,
  );
});

test("marca como FAILED el embedding cuando falla el proveedor", async () => {
  const db = createDatabaseMock();

  const service = new KnowledgeEmbeddingService(
    db as never,
    createProvider({
      fail: true,
    }),
  );

  await assert.rejects(
    () => service.indexChunk({ chunkId: 1 }),
    /No se pudo generar el embedding del fragmento/,
  );

  assert.ok(
    db.queries.some(
      (query) =>
        query.includes("UPDATE public.knowledge_embeddings") &&
        query.includes("status = 'FAILED'"),
    ),
  );
});

test("rechaza activar el embedding si el contenido del fragmento cambió", async () => {
  const db = createDatabaseMock({
    updatedContent:
      "Contenido actualizado mientras se generaba el embedding.",
  });

  const service = new KnowledgeEmbeddingService(
    db as never,
    createProvider(),
  );

  await assert.rejects(
    () => service.indexChunk({ chunkId: 1 }),
    /El contenido del fragmento cambió/,
  );

  assert.ok(
    db.queries.some((query) => query.includes("ROLLBACK")),
  );

  assert.ok(
    !db.queries.some((query) => query.includes("COMMIT")),
  );
});
