
import { getEncoding } from "js-tiktoken";

export interface KnowledgeChunk {
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

export interface KnowledgeChunkerOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_OVERLAP_TOKENS = 50;
const MIN_CHUNK_TOKENS = 1;

function splitIntoSentences(text: string): string[] {
  return (
    text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) ?? []
  )
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function createKnowledgeChunks(
  content: string,
  options: KnowledgeChunkerOptions = {},
): KnowledgeChunk[] {
  const normalizedContent = content.trim().replace(/\s+/g, " ");

  if (!normalizedContent) {
    throw new Error("El contenido del documento está vacío.");
  }

  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;

  if (!Number.isInteger(maxTokens) || maxTokens < 1) {
    throw new Error("maxTokens debe ser un entero positivo.");
  }

  if (
    !Number.isInteger(overlapTokens) ||
    overlapTokens < 0 ||
    overlapTokens >= maxTokens
  ) {
    throw new Error(
      "overlapTokens debe ser un entero no negativo menor que maxTokens.",
    );
  }

  const encoding = getEncoding("cl100k_base");

  try {
    const sentences = splitIntoSentences(normalizedContent);
    const chunks: KnowledgeChunk[] = [];

    let currentTokens: number[] = [];

    const saveChunk = (tokens: number[]) => {
      if (tokens.length < MIN_CHUNK_TOKENS) return;

      const chunkContent = encoding.decode(tokens).trim();

      if (!chunkContent) return;

      chunks.push({
        chunkIndex: chunks.length,
        content: chunkContent,
        tokenCount: tokens.length,
      });
    };

    const getOverlap = (tokens: number[]): number[] => {
      if (overlapTokens === 0) {
        return [];
      }

      return tokens.slice(-overlapTokens);
    };

    for (const sentence of sentences) {
      let remainingTokens = Array.from(encoding.encode(sentence));

      if (currentTokens.length + remainingTokens.length <= maxTokens) {
        currentTokens.push(...remainingTokens);
        continue;
      }

      // Guarda el fragmento actual antes de añadir la siguiente oración.
      if (currentTokens.length > 0) {
        saveChunk(currentTokens);
        currentTokens = getOverlap(currentTokens);
      }

      // Añade los tokens restantes respetando siempre maxTokens.
      while (remainingTokens.length > 0) {
        const availableSpace = maxTokens - currentTokens.length;
        const tokensToAdd = Math.min(
          availableSpace,
          remainingTokens.length,
        );

        currentTokens.push(...remainingTokens.slice(0, tokensToAdd));
        remainingTokens = remainingTokens.slice(tokensToAdd);

        // Si quedan tokens, guarda el fragmento y continúa con solapamiento.
        if (remainingTokens.length > 0) {
          saveChunk(currentTokens);
          currentTokens = getOverlap(currentTokens);
        }
      }
    }

    if (currentTokens.length > 0) {
      saveChunk(currentTokens);
    }

    return chunks;
  } finally {
    // Libera los recursos del tokenizador cuando la API lo permite.
    if ("free" in encoding && typeof encoding.free === "function") {
      encoding.free();
    }
  }
}
