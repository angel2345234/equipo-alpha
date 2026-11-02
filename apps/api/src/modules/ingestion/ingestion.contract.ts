import { createHash } from "node:crypto";

export type IngestionStatus =
  "RECEIVED" | "VALIDATING" | "PROCESSING" | "SUCCEEDED" | "FAILED";

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface RegisterIngestionRunInput {
  sourceSystem: string;
  datasetName: string;
  contractVersion: number;
  payload: unknown;
  permissionMetadata?: IngestionPermissionMetadata;
}

export type IngestionClassification =
  "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

export interface IngestionPermissionMetadata {
  classification?: IngestionClassification;
  allowedRoles?: string[];
  dataScopes?: string[];
  tags?: string[];
}

export interface NormalizedPermissionMetadata {
  classification: IngestionClassification;
  allowedRoles: string[];
  dataScopes: string[];
  tags: string[];
}

export interface IngestionErrorInput {
  phase: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

export class IngestionContractError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = "IngestionContractError";
  }
}

const transitions: Record<IngestionStatus, readonly IngestionStatus[]> = {
  RECEIVED: ["VALIDATING", "FAILED"],
  VALIDATING: ["PROCESSING", "FAILED"],
  PROCESSING: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: [],
  FAILED: ["VALIDATING"],
};

function normalizeJsonValue(
  value: unknown,
  ancestors: WeakSet<object>,
): JsonValue {
  if (value === null || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new IngestionContractError(
        "El payload contiene un número no finito.",
        "INVALID_PAYLOAD_NUMBER",
      );
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw new IngestionContractError(
        "El payload contiene una referencia circular.",
        "CIRCULAR_PAYLOAD",
      );
    }
    ancestors.add(value);
    const result = value.map((item) => normalizeJsonValue(item, ancestors));
    ancestors.delete(value);
    return result;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(record);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new IngestionContractError(
        "El payload solo admite objetos JSON simples.",
        "INVALID_PAYLOAD_OBJECT",
      );
    }
    if (ancestors.has(record)) {
      throw new IngestionContractError(
        "El payload contiene una referencia circular.",
        "CIRCULAR_PAYLOAD",
      );
    }

    ancestors.add(record);
    const normalized: Record<string, JsonValue> = Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => {
          const property = record[key];
          if (property === undefined) {
            throw new IngestionContractError(
              "El payload contiene un valor undefined.",
              "UNSUPPORTED_PAYLOAD_VALUE",
            );
          }
          return [key, normalizeJsonValue(property, ancestors)];
        }),
    );
    ancestors.delete(record);
    return normalized;
  }

  throw new IngestionContractError(
    "El payload contiene un valor que no pertenece a JSON.",
    "UNSUPPORTED_PAYLOAD_VALUE",
  );
}

export function normalizePayload(payload: unknown): JsonValue {
  if (payload === null || typeof payload !== "object") {
    throw new IngestionContractError(
      "El payload debe ser un objeto o arreglo JSON.",
      "INVALID_PAYLOAD",
    );
  }
  return normalizeJsonValue(payload, new WeakSet<object>());
}

function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const properties = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${properties.join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new IngestionContractError(
      "El payload contiene un valor que no pertenece a JSON.",
      "UNSUPPORTED_PAYLOAD_VALUE",
    );
  }
  return serialized;
}

export function checksumPayload(payload: JsonValue): string {
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function normalizeIdentifier(
  value: unknown,
  field: string,
  casing: "upper" | "lower",
): string {
  if (typeof value !== "string") {
    throw new IngestionContractError(
      `${field} debe ser texto.`,
      "INVALID_INGESTION_METADATA",
    );
  }

  const normalized =
    casing === "upper"
      ? value.trim().toUpperCase()
      : value.trim().toLowerCase();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(normalized)) {
    throw new IngestionContractError(
      `${field} tiene un formato inválido.`,
      "INVALID_INGESTION_METADATA",
    );
  }
  return normalized;
}

export function normalizeDatasetName(value: unknown): string {
  return normalizeIdentifier(value, "datasetName", "lower");
}

function normalizeMetadataList(
  value: unknown,
  field: string,
  casing: "upper" | "lower",
): string[] {
  if (value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new IngestionContractError(
      `${field} debe ser un arreglo de textos.`,
      "INVALID_PERMISSION_METADATA",
    );
  }

  const values = value.map((item) => {
    const normalized =
      casing === "upper"
        ? item.trim().toUpperCase()
        : item.trim().toLowerCase();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_.\/-]{0,199}$/.test(normalized)) {
      throw new IngestionContractError(
        `${field} contiene un valor vacío o con formato inválido.`,
        "INVALID_PERMISSION_METADATA",
      );
    }
    return normalized;
  });
  return [...new Set(values)].sort();
}

export function normalizePermissionMetadata(
  value: unknown,
): NormalizedPermissionMetadata {
  if (
    value !== undefined &&
    (value === null || typeof value !== "object" || Array.isArray(value))
  ) {
    throw new IngestionContractError(
      "permissionMetadata debe ser un objeto.",
      "INVALID_PERMISSION_METADATA",
    );
  }
  const metadata = (value ?? {}) as Record<string, unknown>;
  const classification = metadata.classification ?? "RESTRICTED";
  if (
    classification !== "PUBLIC" &&
    classification !== "INTERNAL" &&
    classification !== "CONFIDENTIAL" &&
    classification !== "RESTRICTED"
  ) {
    throw new IngestionContractError(
      "classification debe ser PUBLIC, INTERNAL, CONFIDENTIAL o RESTRICTED.",
      "INVALID_PERMISSION_METADATA",
    );
  }

  return {
    classification,
    allowedRoles: normalizeMetadataList(
      metadata.allowedRoles,
      "allowedRoles",
      "upper",
    ),
    dataScopes: normalizeMetadataList(
      metadata.dataScopes,
      "dataScopes",
      "lower",
    ),
    tags: normalizeMetadataList(metadata.tags, "tags", "lower"),
  };
}

export function normalizeRegistration(input: RegisterIngestionRunInput): {
  sourceSystem: string;
  datasetName: string;
  contractVersion: number;
  normalizedPayload: JsonValue;
  payloadChecksum: string;
  permissionMetadata: NormalizedPermissionMetadata;
} {
  const sourceSystem = normalizeIdentifier(
    input?.sourceSystem,
    "sourceSystem",
    "upper",
  );
  const datasetName = normalizeIdentifier(
    input?.datasetName,
    "datasetName",
    "lower",
  );
  if (
    !Number.isSafeInteger(input?.contractVersion) ||
    input.contractVersion < 1
  ) {
    throw new IngestionContractError(
      "contractVersion debe ser un entero positivo.",
      "INVALID_CONTRACT_VERSION",
    );
  }

  const normalizedPayload = normalizePayload(input.payload);
  return {
    sourceSystem,
    datasetName,
    contractVersion: input.contractVersion,
    normalizedPayload,
    payloadChecksum: checksumPayload(normalizedPayload),
    permissionMetadata: normalizePermissionMetadata(input.permissionMetadata),
  };
}

export function isIngestionStatus(value: unknown): value is IngestionStatus {
  return (
    value === "RECEIVED" ||
    value === "VALIDATING" ||
    value === "PROCESSING" ||
    value === "SUCCEEDED" ||
    value === "FAILED"
  );
}

export function assertIngestionTransition(
  current: IngestionStatus,
  next: IngestionStatus,
): void {
  if (!transitions[current].includes(next)) {
    throw new IngestionContractError(
      `No se permite la transición de ${current} a ${next}.`,
      "INVALID_STATUS_TRANSITION",
      409,
    );
  }
}

export function normalizeIngestionError(input: unknown): {
  phase: string;
  code: string;
  message: string;
  details: JsonValue;
  retryable: boolean;
} {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new IngestionContractError(
      "El error de ingesta debe ser un objeto.",
      "INVALID_INGESTION_ERROR",
    );
  }

  const error = input as Record<string, unknown>;
  const phase = normalizeIdentifier(error.phase, "phase", "lower");
  const code = normalizeIdentifier(error.code, "code", "upper");
  if (typeof error.message !== "string" || !error.message.trim()) {
    throw new IngestionContractError(
      "El error de ingesta requiere un message no vacío.",
      "INVALID_INGESTION_ERROR",
    );
  }
  if (error.retryable !== undefined && typeof error.retryable !== "boolean") {
    throw new IngestionContractError(
      "retryable debe ser booleano.",
      "INVALID_INGESTION_ERROR",
    );
  }
  const details = error.details ?? {};
  if (
    details === null ||
    typeof details !== "object" ||
    Array.isArray(details)
  ) {
    throw new IngestionContractError(
      "details debe ser un objeto.",
      "INVALID_INGESTION_ERROR",
    );
  }

  return {
    phase,
    code,
    message: error.message.trim(),
    details: normalizePayload(details),
    retryable: error.retryable ?? false,
  };
}
