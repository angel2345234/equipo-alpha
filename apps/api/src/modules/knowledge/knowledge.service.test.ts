
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { KnowledgeService } from "./knowledge.service";

const document = {
  id: 1,
  source_id: 1,
  content: "Contenido de prueba del documento",
  version: "1.1",
  source_name: "Documentación Técnica Alpha",
  origin_url:
    "https://confluence.alpha.internal/docs/arquitectura",
  source_priority: "UNSPECIFIED",
};

function createMockPool(options: { missing?: boolean } = {}) {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];

  const client = {
    async query(sql: string, params?: unknown[]) {
      calls.push({ sql, params });

      if (
        sql.includes("SELECT") &&
        sql.includes("knowledge_documents")
      ) {
        return {
          rows: options.missing ? [] : [document],
          rowCount: options.missing ? 0 : 1,
        };
      }

      return { rows: [], rowCount: 1 };
    },
    release() {},
  };

  return {
    calls,
    pool: {
      async connect() {
        return client;
      },
    } as never,
  };
}

const input = {
  documentId: 1,
  freshness: {
    publishedAt: "2026-11-02T00:00:00.000Z",
    validFrom: "2026-11-02T00:00:00.000Z",
    validUntil: "2027-12-31T00:00:00.000Z",
    lastSyncedAt: "2026-11-03T00:00:00.000Z",
  },
  provenance: {
    sourceId: 1,
    sourceName: "Documentación Técnica Alpha",
    originUrl:
      "https://confluence.alpha.internal/docs/arquitectura",
    sourcePriority: "PRIMARY",
    retrievedAt: "2026-11-03T00:00:00.000Z",
    version: "1.1",
    parentDocumentId: 1,
  },
};

test("actualiza hash, vigencia y procedencia en una transacción", async () => {
  const mock = createMockPool();
  const service = new KnowledgeService(mock.pool);

  const result = await service.refreshDocument(input);

  assert.equal(
    result.contentHash,
    createHash("sha256")
      .update(document.content, "utf8")
      .digest("hex"),
  );

  assert.equal(result.documentId, 1);
  assert.equal(result.sourceId, 1);
  assert.ok(
    mock.calls.some((call) => call.sql.trim() === "COMMIT"),
  );
  assert.equal(
  mock.calls.filter(
    (call) =>
      call.sql.includes("UPDATE public.knowledge_documents") ||
      call.sql.includes("UPDATE public.knowledge_sources"),
  ).length,
  2,
);
});

test("rechaza procedencia de otra fuente y ejecuta rollback", async () => {
  const mock = createMockPool();
  const service = new KnowledgeService(mock.pool);

  await assert.rejects(
    service.refreshDocument({
      ...input,
      provenance: {
        ...input.provenance,
        sourceName: "Otra fuente",
      },
    }),
    /nombre o URL de procedencia no coincide/i,
  );

  assert.ok(
    mock.calls.some((call) => call.sql.trim() === "ROLLBACK"),
  );
});

test("rechaza documentos inexistentes y ejecuta rollback", async () => {
  const mock = createMockPool({ missing: true });
  const service = new KnowledgeService(mock.pool);

  await assert.rejects(
    service.refreshDocument(input),
    /documento no encontrado/i,
  );

  assert.ok(
    mock.calls.some((call) => call.sql.trim() === "ROLLBACK"),
  );
});

test("conserva la prioridad existente cuando recibe UNSPECIFIED", async () => {
  const mock = createMockPool();
  const service = new KnowledgeService(mock.pool);

  await service.refreshDocument({
    ...input,
    freshness: {},
    provenance: {
      ...input.provenance,
      sourcePriority: "UNSPECIFIED",
    },
  });

  const sourceUpdate = mock.calls.find((call) =>
    call.sql.includes("UPDATE public.knowledge_sources"),
  );

  assert.ok(sourceUpdate, "Debe actualizar la fuente");

  assert.match(
    sourceUpdate.sql,
    /WHEN \$2 = 'UNSPECIFIED' THEN source_priority/,
  );

  assert.equal(sourceUpdate.params?.[1], "UNSPECIFIED");
});
