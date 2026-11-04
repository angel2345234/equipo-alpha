
import test from "node:test";
import assert from "node:assert/strict";

import { createKnowledgeChunks } from "./knowledge.chunker";

test("conserva una oración corta en un solo fragmento", () => {
  const content =
    "Este documento describe los fundamentos de la arquitectura de microservicios y bases de datos en Neon para el monorepo equipo-alpha.";

  const chunks = createKnowledgeChunks(content);

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].content, content);
  assert.ok(chunks[0].tokenCount > 0);
});

test("rechaza contenido vacío", () => {
  assert.throws(
    () => createKnowledgeChunks("   "),
    /contenido del documento está vacío/,
  );
});

test("rechaza una configuración de tokens inválida", () => {
  assert.throws(
    () =>
      createKnowledgeChunks("Texto de prueba.", {
        maxTokens: 0,
      }),
    /maxTokens/,
  );
});

test("divide documentos largos sin superar el máximo de tokens", () => {
  const content = Array.from(
    { length: 100 },
    (_, index) =>
      `Esta es la oración número ${index + 1} del documento de arquitectura.`,
  ).join(" ");

  const chunks = createKnowledgeChunks(content, {
    maxTokens: 50,
    overlapTokens: 5,
  });

  assert.ok(chunks.length > 1);

  for (const chunk of chunks) {
    assert.ok(chunk.tokenCount <= 50);
    assert.ok(chunk.content.length > 0);
  }
});

test("asigna índices consecutivos", () => {
  const content = Array.from(
    { length: 30 },
    (_, index) => `Oración de prueba número ${index + 1}.`,
  ).join(" ");

  const chunks = createKnowledgeChunks(content, {
    maxTokens: 20,
    overlapTokens: 2,
  });

  assert.deepEqual(
    chunks.map((chunk) => chunk.chunkIndex),
    chunks.map((_, index) => index),
  );
});

test("rechaza un solapamiento mayor o igual al máximo", () => {
  assert.throws(
    () =>
      createKnowledgeChunks("Texto de prueba.", {
        maxTokens: 20,
        overlapTokens: 20,
      }),
    /overlapTokens/,
  );
});

test("acepta solapamiento de cero tokens", () => {
  const content = Array.from(
    { length: 40 },
    (_, index) => `Esta es la oración número ${index + 1} del documento.`,
  ).join(" ");

  const chunks = createKnowledgeChunks(content, {
    maxTokens: 30,
    overlapTokens: 0,
  });

  assert.ok(chunks.length > 1);

  for (const chunk of chunks) {
    assert.ok(chunk.tokenCount <= 30);
  }
});

test("no supera el máximo al combinar solapamiento y oraciones", () => {
  const content = Array.from(
    { length: 50 },
    (_, index) =>
      `La arquitectura del sistema contiene información importante sobre el módulo número ${index + 1}.`,
  ).join(" ");

  const chunks = createKnowledgeChunks(content, {
    maxTokens: 30,
    overlapTokens: 15,
  });

  assert.ok(chunks.length > 1);

  for (const chunk of chunks) {
    assert.ok(
      chunk.tokenCount <= 30,
      `El fragmento ${chunk.chunkIndex} supera el máximo: ${chunk.tokenCount} tokens.`,
    );
  }
});

test("rechaza un solapamiento negativo", () => {
  assert.throws(
    () =>
      createKnowledgeChunks("Texto de prueba.", {
        maxTokens: 20,
        overlapTokens: -1,
      }),
    /overlapTokens/,
  );
});
