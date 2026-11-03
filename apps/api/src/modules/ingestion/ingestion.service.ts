import { pool } from "../../db";
import {
  assertIngestionTransition,
  IngestionClassification,
  IngestionContractError,
  IngestionErrorInput,
  IngestionPermissionMetadata,
  IngestionStatus,
  normalizeIngestionError,
  normalizePermissionMetadata,
  normalizeRegistration,
  RegisterIngestionRunInput,
} from "./ingestion.contract";
import { IngestionAuthContext } from "./ingestion.auth";

interface IngestionRunRow {
  id: string;
  source_system: string;
  dataset_name: string;
  contract_version: number;
  payload_checksum: string;
  classification: IngestionClassification;
  allowed_roles: string[];
  data_scopes: string[];
  tags: string[];
  status: IngestionStatus;
  attempt_count: number;
  last_error_code: string | null;
  last_error_message: string | null;
  received_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IngestionRun {
  id: string;
  sourceSystem: string;
  datasetName: string;
  contractVersion: number;
  payloadChecksum: string;
  permissionMetadata: Required<IngestionPermissionMetadata>;
  status: IngestionStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  receivedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toRun(row: IngestionRunRow): IngestionRun {
  return {
    id: row.id,
    sourceSystem: row.source_system,
    datasetName: row.dataset_name,
    contractVersion: row.contract_version,
    payloadChecksum: row.payload_checksum.trim(),
    permissionMetadata: {
      classification: row.classification,
      allowedRoles: row.allowed_roles,
      dataScopes: row.data_scopes,
      tags: row.tags,
    },
    status: row.status,
    attemptCount: row.attempt_count,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    receivedAt: row.received_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class IngestionService {
  static async registerRun(input: RegisterIngestionRunInput) {
    const normalized = normalizeRegistration(input);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const inserted = await client.query<IngestionRunRow>(
        `INSERT INTO analytics.ingestion_runs (
           source_system,
           dataset_name,
           contract_version,
           payload_checksum,
           normalized_payload,
           classification,
           allowed_roles,
           data_scopes,
           tags
         ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
         ON CONFLICT (
           source_system,
           dataset_name,
           contract_version,
           payload_checksum
         ) DO NOTHING
         RETURNING *`,
        [
          normalized.sourceSystem,
          normalized.datasetName,
          normalized.contractVersion,
          normalized.payloadChecksum,
          JSON.stringify(normalized.normalizedPayload),
          normalized.permissionMetadata.classification,
          normalized.permissionMetadata.allowedRoles,
          normalized.permissionMetadata.dataScopes,
          normalized.permissionMetadata.tags,
        ],
      );

      let row = inserted.rows[0];
      const created = Boolean(row);
      if (!row) {
        const existing = await client.query<IngestionRunRow>(
          `SELECT *
           FROM analytics.ingestion_runs
           WHERE source_system = $1
             AND dataset_name = $2
             AND contract_version = $3
             AND payload_checksum = $4`,
          [
            normalized.sourceSystem,
            normalized.datasetName,
            normalized.contractVersion,
            normalized.payloadChecksum,
          ],
        );
        row = existing.rows[0];
        if (!row) {
          throw new Error("No se pudo recuperar la ejecución idempotente.");
        }
        if (
          row.classification !== normalized.permissionMetadata.classification ||
          JSON.stringify(row.allowed_roles) !==
            JSON.stringify(normalized.permissionMetadata.allowedRoles) ||
          JSON.stringify(row.data_scopes) !==
            JSON.stringify(normalized.permissionMetadata.dataScopes) ||
          JSON.stringify(row.tags) !==
            JSON.stringify(normalized.permissionMetadata.tags)
        ) {
          throw new IngestionContractError(
            "El contenido ya está registrado con otra metadata de permisos.",
            "INGESTION_PERMISSION_METADATA_CONFLICT",
            409,
          );
        }
      }

      await client.query("COMMIT");
      return { run: toRun(row), created };
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRun(id: string, principal: IngestionAuthContext) {
    const runResult = await pool.query<IngestionRunRow>(
      `SELECT *
       FROM analytics.ingestion_runs
       WHERE id = $1
         AND $2 = ANY(allowed_roles)
         AND (
           cardinality(data_scopes) = 0
           OR data_scopes && $3::text[]
         )`,
      [id, principal.role, principal.dataScopes],
    );
    const row = runResult.rows[0];
    if (!row) {
      throw new IngestionContractError(
        "No se encontró la ejecución de ingesta.",
        "INGESTION_RUN_NOT_FOUND",
        404,
      );
    }

    const errors = await pool.query(
      `SELECT
         id,
         phase,
         error_code AS code,
         message,
         details,
         retryable,
         created_at AS "createdAt"
       FROM analytics.ingestion_errors
       WHERE ingestion_run_id = $1
       ORDER BY created_at ASC, id ASC`,
      [id],
    );

    return { run: toRun(row), errors: errors.rows };
  }

  static async listRuns(
    principal: IngestionAuthContext,
    filters: {
      datasetName?: string;
      classification?: IngestionClassification;
      tags?: string[];
    } = {},
  ) {
    const result = await pool.query<IngestionRunRow>(
      `SELECT *
       FROM analytics.ingestion_runs
       WHERE $1 = ANY(allowed_roles)
         AND (
           cardinality(data_scopes) = 0
           OR data_scopes && $2::text[]
         )
         AND ($3::text IS NULL OR dataset_name = $3)
         AND ($4::text IS NULL OR classification = $4)
         AND (cardinality($5::text[]) = 0 OR tags && $5::text[])
       ORDER BY received_at DESC, id DESC
       LIMIT 100`,
      [
        principal.role,
        principal.dataScopes,
        filters.datasetName ?? null,
        filters.classification ?? null,
        filters.tags ?? [],
      ],
    );
    return result.rows.map(toRun);
  }

  static async transitionRun(
    id: string,
    status: IngestionStatus,
    errorInput?: IngestionErrorInput,
  ) {
    if (status === "FAILED" && errorInput === undefined) {
      throw new IngestionContractError(
        "El estado FAILED requiere un objeto error.",
        "INGESTION_ERROR_REQUIRED",
      );
    }
    if (status !== "FAILED" && errorInput !== undefined) {
      throw new IngestionContractError(
        "El objeto error solo se acepta al pasar a FAILED.",
        "UNEXPECTED_INGESTION_ERROR",
      );
    }
    const normalizedError =
      errorInput === undefined
        ? undefined
        : normalizeIngestionError(errorInput);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const currentResult = await client.query<IngestionRunRow>(
        "SELECT * FROM analytics.ingestion_runs WHERE id = $1 FOR UPDATE",
        [id],
      );
      const current = currentResult.rows[0];
      if (!current) {
        throw new IngestionContractError(
          "No se encontró la ejecución de ingesta.",
          "INGESTION_RUN_NOT_FOUND",
          404,
        );
      }
      assertIngestionTransition(current.status, status);

      const updated = await client.query<IngestionRunRow>(
        `UPDATE analytics.ingestion_runs
         SET status = $2,
             attempt_count = attempt_count + CASE WHEN $2 = 'VALIDATING' THEN 1 ELSE 0 END,
             last_error_code = CASE WHEN $2 = 'VALIDATING' THEN NULL ELSE $3 END,
             last_error_message = CASE WHEN $2 = 'VALIDATING' THEN NULL ELSE $4 END,
             started_at = CASE
               WHEN $2 = 'VALIDATING' THEN COALESCE(started_at, CURRENT_TIMESTAMP)
               ELSE started_at
             END,
             completed_at = CASE
               WHEN $2 IN ('SUCCEEDED', 'FAILED') THEN CURRENT_TIMESTAMP
               WHEN $2 = 'VALIDATING' THEN NULL
               ELSE completed_at
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [
          id,
          status,
          normalizedError?.code ?? null,
          normalizedError?.message ?? null,
        ],
      );

      if (normalizedError) {
        await client.query(
          `INSERT INTO analytics.ingestion_errors (
             ingestion_run_id,
             phase,
             error_code,
             message,
             details,
             retryable
           ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
          [
            id,
            normalizedError.phase,
            normalizedError.code,
            normalizedError.message,
            JSON.stringify(normalizedError.details),
            normalizedError.retryable,
          ],
        );
      }

      await client.query("COMMIT");
      return toRun(updated.rows[0]);
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
