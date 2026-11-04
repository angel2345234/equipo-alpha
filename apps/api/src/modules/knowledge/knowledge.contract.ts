import { createHash } from "node:crypto";

export type SourcePriority = "PRIMARY" | "SECONDARY" | "UNSPECIFIED";

export interface KnowledgeProvenance {
  sourceId: number;
  sourceName: string;
  originUrl: string;
  sourcePriority: SourcePriority;
  retrievedAt: string;
  publishedAt?: string;
  version?: string;
  parentDocumentId?: number;
}

export interface KnowledgeFreshness {
  publishedAt?: string;
  validFrom?: string;
  validUntil?: string;
  lastSyncedAt?: string;
}

export interface KnowledgeMetadata {
  classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  allowedRoles: string[];
  dataScopes: string[];
  tags: string[];
}

export class KnowledgeContractError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = "KnowledgeContractError";
  }
}

function optionalDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;

  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new KnowledgeContractError(
      `${field} debe ser una fecha válida.`,
      "INVALID_KNOWLEDGE_DATE",
    );
  }

  return new Date(value).toISOString();
}

function positiveId(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new KnowledgeContractError(
      `${field} debe ser un entero positivo.`,
      "INVALID_KNOWLEDGE_ID",
    );
  }
  return Number(value);
}

export function normalizeFreshness(input: unknown): KnowledgeFreshness {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new KnowledgeContractError(
      "freshness debe ser un objeto.",
      "INVALID_KNOWLEDGE_FRESHNESS",
    );
  }

  const value = input as Record<string, unknown>;
  const result: KnowledgeFreshness = {
    publishedAt: optionalDate(value.publishedAt, "publishedAt"),
    validFrom: optionalDate(value.validFrom, "validFrom"),
    validUntil: optionalDate(value.validUntil, "validUntil"),
    lastSyncedAt: optionalDate(value.lastSyncedAt, "lastSyncedAt"),
  };

  if (
    result.validFrom &&
    result.validUntil &&
    Date.parse(result.validUntil) < Date.parse(result.validFrom)
  ) {
    throw new KnowledgeContractError(
      "validUntil no puede ser anterior a validFrom.",
      "INVALID_KNOWLEDGE_VALIDITY_RANGE",
    );
  }

  return result;
}

export function normalizeProvenance(input: unknown): KnowledgeProvenance {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new KnowledgeContractError(
      "provenance debe ser un objeto.",
      "INVALID_KNOWLEDGE_PROVENANCE",
    );
  }

  const value = input as Record<string, unknown>;
  const sourceName =
    typeof value.sourceName === "string" ? value.sourceName.trim() : "";
  const originUrl =
    typeof value.originUrl === "string" ? value.originUrl.trim() : "";

  if (!sourceName || !originUrl) {
    throw new KnowledgeContractError(
      "sourceName y originUrl son obligatorios.",
      "INVALID_KNOWLEDGE_PROVENANCE",
    );
  }

  try {
    const url = new URL(originUrl);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new KnowledgeContractError(
      "originUrl debe ser una URL HTTP o HTTPS válida.",
      "INVALID_KNOWLEDGE_ORIGIN_URL",
    );
  }

  const priority = value.sourcePriority ?? "UNSPECIFIED";
  if (
    priority !== "PRIMARY" &&
    priority !== "SECONDARY" &&
    priority !== "UNSPECIFIED"
  ) {
    throw new KnowledgeContractError(
      "sourcePriority no es válido.",
      "INVALID_SOURCE_PRIORITY",
    );
  }

  const retrievedAt = optionalDate(value.retrievedAt, "retrievedAt");
  if (!retrievedAt) {
    throw new KnowledgeContractError(
      "retrievedAt es obligatorio.",
      "INVALID_KNOWLEDGE_PROVENANCE",
    );
  }

  return {
    sourceId: positiveId(value.sourceId, "sourceId"),
    sourceName,
    originUrl,
    sourcePriority: priority,
    retrievedAt,
    publishedAt: optionalDate(value.publishedAt, "publishedAt"),
    version:
      typeof value.version === "string" ? value.version.trim() || undefined : undefined,
    parentDocumentId:
      value.parentDocumentId === undefined
        ? undefined
        : positiveId(value.parentDocumentId, "parentDocumentId"),
  };
}

export function normalizeKnowledgeMetadata(input: unknown): KnowledgeMetadata {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new KnowledgeContractError(
      "metadata debe ser un objeto.",
      "INVALID_KNOWLEDGE_METADATA",
    );
  }

  const value = input as Record<string, unknown>;
  const classification = value.classification ?? "RESTRICTED";

  if (
    classification !== "PUBLIC" &&
    classification !== "INTERNAL" &&
    classification !== "CONFIDENTIAL" &&
    classification !== "RESTRICTED"
  ) {
    throw new KnowledgeContractError(
      "classification no es válida.",
      "INVALID_KNOWLEDGE_CLASSIFICATION",
    );
  }

  function normalizeList(field: string, casing: "upper" | "lower"): string[] {
    const items = value[field] ?? [];
    if (!Array.isArray(items) || !items.every((item) => typeof item === "string")) {
      throw new KnowledgeContractError(
        `${field} debe ser un arreglo de textos.`,
        "INVALID_KNOWLEDGE_METADATA",
      );
    }

    return [...new Set(items.map((item: string) =>
      casing === "upper" ? item.trim().toUpperCase() : item.trim().toLowerCase()
    ).filter(Boolean))].sort();
  }

  return {
    classification,
    allowedRoles: normalizeList("allowedRoles", "upper"),
    dataScopes: normalizeList("dataScopes", "lower"),
    tags: normalizeList("tags", "lower"),
  };
}

export function calculateContentHash(content: string): string {
  if (typeof content !== "string" || !content.trim()) {
    throw new KnowledgeContractError(
      "El contenido no puede estar vacío.",
      "INVALID_KNOWLEDGE_CONTENT",
    );
  }

  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function isKnowledgeDocumentFresh(
  freshness: KnowledgeFreshness,
  now: Date = new Date(),
): boolean {
  if (freshness.validFrom && Date.parse(freshness.validFrom) > now.getTime()) {
    return false;
  }

  if (freshness.validUntil && Date.parse(freshness.validUntil) < now.getTime()) {
    return false;
  }

  return true;
}
