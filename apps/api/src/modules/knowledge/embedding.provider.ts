
import OpenAI from "openai";

export interface EmbeddingProvider {
  readonly provider: string;
  readonly model: string;
  readonly dimensions: number;

  generateEmbedding(content: string): Promise<EmbeddingResult>;
}

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
  provider: string;
  model: string;
  dimensions: number;
}

export class EmbeddingProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingProviderError";
  }
}

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly provider = "openai";
  readonly model: string;
  readonly dimensions: number;

  private readonly client: OpenAI;

  constructor(
    options: {
      apiKey?: string;
      model?: string;
      dimensions?: number;
      client?: OpenAI;
    } = {},
  ) {
    this.model =
      options.model ??
      process.env.OPENAI_EMBEDDING_MODEL ??
      DEFAULT_MODEL;

    const configuredDimensions =
  process.env.OPENAI_EMBEDDING_DIMENSIONS?.trim();

this.dimensions =
  options.dimensions ??
  (configuredDimensions
    ? Number(configuredDimensions)
    : DEFAULT_DIMENSIONS);

    if (!Number.isInteger(this.dimensions) || this.dimensions <= 0) {
      throw new EmbeddingProviderError(
        "Las dimensiones del embedding deben ser un entero positivo.",
      );
    }

    if (
      this.model !== "text-embedding-3-small" &&
      this.model !== "text-embedding-3-large"
    ) {
      throw new EmbeddingProviderError(
        "El modelo de embeddings configurado no está permitido.",
      );
    }

    this.client =
      options.client ??
      new OpenAI({
        apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
      });
  }

  async generateEmbedding(content: string): Promise<EmbeddingResult> {
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      throw new EmbeddingProviderError(
        "No se puede generar un embedding para contenido vacío.",
      );
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: normalizedContent,
        dimensions: this.dimensions,
        encoding_format: "float",
      });

      const embedding = response.data[0]?.embedding;

      if (!embedding || embedding.length !== this.dimensions) {
        throw new EmbeddingProviderError(
          "OpenAI devolvió un vector con dimensiones incorrectas.",
        );
      }

      if (!embedding.every(Number.isFinite)) {
        throw new EmbeddingProviderError(
          "OpenAI devolvió valores no válidos en el vector.",
        );
      }

      return {
        embedding,
        tokenCount: response.usage?.prompt_tokens ?? 0,
        provider: this.provider,
        model: this.model,
        dimensions: this.dimensions,
      };
    } catch (error) {
      if (error instanceof EmbeddingProviderError) {
        throw error;
      }

      throw new EmbeddingProviderError(
        "No se pudo generar el embedding mediante OpenAI.",
      );
    }
  }
}

export function createOpenAIEmbeddingProvider(): OpenAIEmbeddingProvider {
  return new OpenAIEmbeddingProvider();
}
