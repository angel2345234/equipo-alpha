import { pool } from "../../db";

/**
 * ALP5-009: Knowledge Quality Checks.
 *
 * Revisa la calidad de la base de conocimiento de XENIA:
 *   - fuentes duplicadas
 *   - documentos duplicados
 *   - fuentes vencidas que siguen activas
 *   - chunks huérfanos y documentos sin chunks
 *   - permisos / sensibilidad / owner faltantes
 *
 * Diseño defensivo: antes de cada check verifica que las tablas y columnas
 * existan. Si faltan, el check queda SKIPPED con el motivo (no falla).
 * Así el servicio funciona aunque el modelo ALP5-001/002 todavía no esté
 * aplicado en la base, y se activa solo cuando el modelo exista.
 *
 * Privacidad: solo devuelve IDs de muestra, nunca contenido de documentos.
 */

export type CheckStatus = "PASS" | "FAIL" | "SKIPPED";
export type CheckSeverity = "CRITICAL" | "HIGH" | "MEDIUM";

export interface QualityCheckResult {
  id: string;
  title: string;
  severity: CheckSeverity;
  status: CheckStatus;
  affected: number;         // cantidad de registros con el problema
  sampleIds: string[];      // hasta 5 IDs para investigar (sin contenido)
  reason?: string;          // motivo cuando el check queda SKIPPED
}

export interface QualityReport {
  schema: string | null;
  generatedAt: string;
  summary: { pass: number; fail: number; skipped: number };
  passed: boolean;          // false si algún check CRITICAL o HIGH falló
  checks: QualityCheckResult[];
}

const TABLES = {
  sources: "knowledge_sources",
  documents: "knowledge_documents",
  chunks: "knowledge_chunks",
} as const;

// Esquemas donde se busca el modelo de conocimiento, en orden de preferencia
const CANDIDATE_SCHEMAS = ["knowledge", "analytics", "public"];
const ALLOWED_SENSITIVITY = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"];
const SAMPLE_LIMIT = 5;

const isSafeIdentifier = (name: string) => /^[a-z_][a-z0-9_]*$/.test(name);

/** Definición de un check: qué columnas necesita y qué SQL cuenta los problemas */
interface CheckDefinition {
  id: string;
  title: string;
  severity: CheckSeverity;
  requires: Partial<Record<keyof typeof TABLES, string[]>>;
  /** SQL que devuelve una fila por registro con problema, con columna "id" */
  sql: (s: string) => string;
}

const CHECKS: CheckDefinition[] = [
  {
    id: "duplicate_sources",
    title: "Fuentes activas duplicadas (mismo origen)",
    severity: "HIGH",
    requires: { sources: ["id", "origin_url", "status"] },
    sql: (s) => `
      SELECT id::text AS id FROM (
        SELECT id, COUNT(*) OVER (PARTITION BY lower(trim(origin_url))) AS n
        FROM ${s}.${TABLES.sources}
        WHERE status = 'ACTIVE' AND origin_url IS NOT NULL AND trim(origin_url) <> ''
      ) x WHERE n > 1`,
  },
  {
    id: "duplicate_documents",
    title: "Documentos duplicados (mismo contenido en la misma fuente)",
    severity: "MEDIUM",
    requires: { documents: ["id", "source_id", "content"] },
    sql: (s) => `
      SELECT id::text AS id FROM (
        SELECT id, COUNT(*) OVER (PARTITION BY source_id, md5(content)) AS n
        FROM ${s}.${TABLES.documents}
        WHERE content IS NOT NULL
      ) x WHERE n > 1`,
  },
  {
    id: "expired_active_sources",
    title: "Fuentes vencidas que siguen activas",
    severity: "HIGH",
    requires: { sources: ["id", "validity_date", "status"] },
    sql: (s) => `
      SELECT id::text AS id FROM ${s}.${TABLES.sources}
      WHERE status = 'ACTIVE' AND validity_date IS NOT NULL AND validity_date < now()`,
  },
  {
    id: "orphan_chunks",
    title: "Chunks huérfanos (su documento no existe)",
    severity: "HIGH",
    requires: { documents: ["id"], chunks: ["id", "document_id"] },
    sql: (s) => `
      SELECT c.id::text AS id FROM ${s}.${TABLES.chunks} c
      LEFT JOIN ${s}.${TABLES.documents} d ON d.id = c.document_id
      WHERE d.id IS NULL`,
  },
  {
    id: "documents_without_chunks",
    title: "Documentos sin chunks (no recuperables por búsqueda)",
    severity: "MEDIUM",
    requires: { documents: ["id"], chunks: ["document_id"] },
    sql: (s) => `
      SELECT d.id::text AS id FROM ${s}.${TABLES.documents} d
      WHERE NOT EXISTS (SELECT 1 FROM ${s}.${TABLES.chunks} c WHERE c.document_id = d.id)`,
  },
  {
    id: "empty_chunks",
    title: "Chunks vacíos",
    severity: "MEDIUM",
    requires: { chunks: ["id", "content"] },
    sql: (s) => `
      SELECT id::text AS id FROM ${s}.${TABLES.chunks}
      WHERE content IS NULL OR trim(content) = ''`,
  },
  {
    id: "missing_permissions",
    title: "Fuentes sin permisos, owner o sensibilidad válida",
    severity: "CRITICAL",
    requires: { sources: ["id", "permissions", "owner", "sensitivity"] },
    sql: (s) => `
      SELECT id::text AS id FROM ${s}.${TABLES.sources}
      WHERE permissions IS NULL OR trim(permissions) = ''
         OR owner IS NULL OR trim(owner) = ''
         OR sensitivity IS NULL
         OR upper(sensitivity) NOT IN (${ALLOWED_SENSITIVITY.map((v) => `'${v}'`).join(", ")})`,
  },
];

export class KnowledgeQualityService {
  /** Busca en qué esquema está knowledge_sources (o usa el indicado). */
  static async resolveSchema(preferred?: string): Promise<string | null> {
    const candidates = preferred ? [preferred] : CANDIDATE_SCHEMAS;
    for (const schema of candidates) {
      if (!isSafeIdentifier(schema)) {
        throw new Error(`Nombre de esquema inválido: "${schema}"`);
      }
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
        [schema, TABLES.sources],
      );
      if (rows.length > 0) return schema;
    }
    return null;
  }

  /** Devuelve las columnas existentes de cada tabla del modelo. */
  static async loadColumns(schema: string): Promise<Record<string, Set<string>>> {
    const { rows } = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = ANY($2::text[])`,
      [schema, Object.values(TABLES)],
    );
    const map: Record<string, Set<string>> = {};
    for (const r of rows) {
      (map[r.table_name] ??= new Set()).add(r.column_name);
    }
    return map;
  }

  /** Columnas que le faltan a un check, o lista vacía si puede ejecutarse. */
  private static missingFor(check: CheckDefinition, columns: Record<string, Set<string>>): string[] {
    const missing: string[] = [];
    for (const [key, cols] of Object.entries(check.requires)) {
      const table = TABLES[key as keyof typeof TABLES];
      const existing = columns[table];
      if (!existing) {
        missing.push(`${table} (tabla)`);
        continue;
      }
      for (const col of cols ?? []) {
        if (!existing.has(col)) missing.push(`${table}.${col}`);
      }
    }
    return missing;
  }

  static async runChecks(preferredSchema?: string): Promise<QualityReport> {
    const schema = await this.resolveSchema(preferredSchema);
    const columns = schema ? await this.loadColumns(schema) : {};
    const results: QualityCheckResult[] = [];

    for (const check of CHECKS) {
      const base = { id: check.id, title: check.title, severity: check.severity };

      if (!schema) {
        results.push({ ...base, status: "SKIPPED", affected: 0, sampleIds: [],
          reason: `No existe la tabla ${TABLES.sources} (modelo ALP5-001/002 no aplicado)` });
        continue;
      }

      const missing = this.missingFor(check, columns);
      if (missing.length > 0) {
        results.push({ ...base, status: "SKIPPED", affected: 0, sampleIds: [],
          reason: `Faltan: ${missing.join(", ")}` });
        continue;
      }

      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS affected,
                (array_agg(id ORDER BY id))[1:${SAMPLE_LIMIT}] AS sample
         FROM (${check.sql(schema)}) problems`,
      );
      const affected: number = rows[0].affected;
      results.push({
        ...base,
        status: affected === 0 ? "PASS" : "FAIL",
        affected,
        sampleIds: rows[0].sample ?? [],
      });
    }

    const summary = {
      pass: results.filter((r) => r.status === "PASS").length,
      fail: results.filter((r) => r.status === "FAIL").length,
      skipped: results.filter((r) => r.status === "SKIPPED").length,
    };
    const blocking = results.some(
      (r) => r.status === "FAIL" && (r.severity === "CRITICAL" || r.severity === "HIGH"),
    );

    return {
      schema,
      generatedAt: new Date().toISOString(),
      summary,
      passed: !blocking,
      checks: results,
    };
  }
}
