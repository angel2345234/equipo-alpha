import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateContentHash,
  isKnowledgeDocumentFresh,
  KnowledgeContractError,
  normalizeFreshness,
  normalizeKnowledgeMetadata,
  normalizeProvenance,
} from "./knowledge.contract";

test("genera un hash SHA-256 de 64 caracteres", () => {
  const hash = calculateContentHash("Documento de prueba");
  assert.match(hash, /^[a-f0-9]{64}$/);
});

test("rechaza contenido vacío", () => {
  assert.throws(
    () => calculateContentHash(" "),
    (error: unknown) =>
      error instanceof KnowledgeContractError &&
      error.code === "INVALID_KNOWLEDGE_CONTENT",
  );
});

test("normaliza fechas y valida el periodo de vigencia", () => {
  const result = normalizeFreshness({
    validFrom: "2026-01-01",
    validUntil: "2027-01-01",
  });

  assert.equal(result.validFrom, "2026-01-01T00:00:00.000Z");

  assert.throws(
    () => normalizeFreshness({
      validFrom: "2027-01-01",
      validUntil: "2026-01-01",
    }),
    (error: unknown) =>
      error instanceof KnowledgeContractError &&
      error.code === "INVALID_KNOWLEDGE_VALIDITY_RANGE",
  );
});

test("determina si un documento está vigente", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");

  assert.equal(
    isKnowledgeDocumentFresh({
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2027-01-01T00:00:00.000Z",
    }, now),
    true,
  );

  assert.equal(
    isKnowledgeDocumentFresh({
      validUntil: "2026-01-01T00:00:00.000Z",
    }, now),
    false,
  );
});

test("normaliza procedencia y prioridad de la fuente", () => {
  const result = normalizeProvenance({
    sourceId: 1,
    sourceName: " Documentación Alpha ",
    originUrl: "https://example.com/docs",
    sourcePriority: "PRIMARY",
    retrievedAt: "2026-06-01T10:00:00Z",
  });

  assert.equal(result.sourceName, "Documentación Alpha");
  assert.equal(result.sourcePriority, "PRIMARY");
});

test("rechaza procedencia sin fuente válida", () => {
  assert.throws(
    () => normalizeProvenance({
      sourceId: 1,
      sourceName: "",
      originUrl: "https://example.com",
      retrievedAt: "2026-06-01",
    }),
    KnowledgeContractError,
  );
});

test("usa clasificación RESTRICTED por defecto", () => {
  const metadata = normalizeKnowledgeMetadata({});
  assert.equal(metadata.classification, "RESTRICTED");
});

test("normaliza roles, scopes y etiquetas", () => {
  const metadata = normalizeKnowledgeMetadata({
    classification: "INTERNAL",
    allowedRoles: ["admin", "ADMIN"],
    dataScopes: ["CRM:LEADS"],
    tags: ["Architecture"],
  });

  assert.deepEqual(metadata.allowedRoles, ["ADMIN"]);
  assert.deepEqual(metadata.dataScopes, ["crm:leads"]);
  assert.deepEqual(metadata.tags, ["architecture"]);
});
