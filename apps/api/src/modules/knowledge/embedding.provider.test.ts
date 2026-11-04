
import test from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";

import {
  EmbeddingProviderError,
  OpenAIEmbeddingProvider,
} from "./embedding.provider";

function createMockClient(
  embedding: number[] = Array(1536).fill(0.1),
): OpenAI {
  return {
    embeddings: {
      create: async () => ({
        data: [{ embedding }],
        usage: {
          prompt_tokens: 12,
          total_tokens: 12,
        },
      }),
    },
  } as unknown as OpenAI;
}

test("genera un embedding con OpenAI y 1536 dimensiones", async () => {
  const provider = new OpenAIEmbeddingProvider({
    client: createMockClient(),
  });

  const result = await provider.generateEmbedding(
    "Texto de prueba para embeddings.",
  );

  assert.equal(result.provider, "openai");
  assert.equal(result.model, "text-embedding-3-small");
  assert.equal(result.dimensions, 1536);
  assert.equal(result.embedding.length, 1536);
  assert.equal(result.tokenCount, 12);
});

test("rechaza contenido vacío", async () => {
  const provider = new OpenAIEmbeddingProvider({
    client: createMockClient(),
  });

  await assert.rejects(
    () => provider.generateEmbedding("   "),
    EmbeddingProviderError,
  );
});

test("rechaza vectores con dimensiones incorrectas", async () => {
  const provider = new OpenAIEmbeddingProvider({
    client: createMockClient([0.1, 0.2, 0.3]),
  });

  await assert.rejects(
    () => provider.generateEmbedding("Texto de prueba."),
    /dimensiones incorrectas/,
  );
});

test("rechaza dimensiones de configuración inválidas", () => {
  assert.throws(
    () =>
      new OpenAIEmbeddingProvider({
        dimensions: 0,
        client: createMockClient(),
      }),
    /entero positivo/,
  );
});

test("rechaza modelos no permitidos", () => {
  assert.throws(
    () =>
      new OpenAIEmbeddingProvider({
        model: "modelo-inexistente",
        client: createMockClient(),
      }),
    /no está permitido/,
  );
});

test("rechaza vectores que contienen valores no finitos", async () => {
  const invalidEmbedding = Array(1536).fill(0.1);
  invalidEmbedding[0] = Number.NaN;

  const provider = new OpenAIEmbeddingProvider({
    client: createMockClient(invalidEmbedding),
  });

  await assert.rejects(
    () => provider.generateEmbedding("Texto de prueba."),
    /valores no válidos/,
  );
});
