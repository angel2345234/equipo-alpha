import { pool } from "../../db";

/**
 * ALP5-010: XENIA Safe Aggregates.
 *
 * Lee las vistas agregadas (sin PII) de la migración 007 y las devuelve con
 * su procedencia (provenance), según el contrato transversal de XENIA:
 * fuente, sensibilidad, fecha de actualización de la fuente y fecha de consulta.
 */

export type Sensitivity = "PUBLIC" | "INTERNAL";

export interface Provenance {
  dataset: string;              // vista consultada
  sourceTables: string;         // tablas OLTP de origen
  sensitivity: Sensitivity;
  sourceUpdatedAt: string | null; // último cambio en la fuente
  generatedAt: string;          // momento de la consulta
  privacyRules: string[];
}

export interface AggregateResponse<T> {
  data: T[];
  provenance: Provenance;
}

export const AGGREGATES = {
  inventoryByZone: {
    view: "analytics.agg_xenia_inventory_by_zone",
    sourceTables: "inventory.assets + inventory.projects",
    sensitivity: "PUBLIC" as Sensitivity,
    privacyRules: ["Solo activos publicados", "Sin datos personales"],
  },
  leadDemand: {
    view: "analytics.agg_xenia_lead_demand_monthly",
    sourceTables: "crm.leads + inventory.assets + inventory.projects",
    sensitivity: "INTERNAL" as Sensitivity,
    privacyRules: [
      "Sin datos personales",
      "Grupos con menos de 3 leads ocultos (k-anonimidad k=3)",
      "Excluye leads TEST y correos de prueba (Metric Contract P0-01)",
    ],
  },
} as const;

/** Columnas que nunca deben aparecer en un agregado de XENIA */
export const PII_COLUMN_PATTERN = /(email|phone|telefono|full_name|first_name|last_name|dni|document_number|party_id|address)/i;

export class XeniaAggregatesService {
  private static async read<T>(key: keyof typeof AGGREGATES, orderBy: string): Promise<AggregateResponse<T>> {
    const def = AGGREGATES[key];
    const { rows } = await pool.query(`SELECT * FROM ${def.view} ORDER BY ${orderBy}`);

    // La fecha más reciente de la fuente entre las filas visibles
    const dates = rows
      .map((r) => r.source_updated_at)
      .filter((d): d is Date => d instanceof Date);
    const sourceUpdatedAt = dates.length
      ? new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString()
      : null;

    return {
      data: rows as T[],
      provenance: {
        dataset: def.view,
        sourceTables: def.sourceTables,
        sensitivity: def.sensitivity,
        sourceUpdatedAt,
        generatedAt: new Date().toISOString(),
        privacyRules: [...def.privacyRules],
      },
    };
  }

  static getInventoryByZone() {
    return this.read("inventoryByZone", "city, district, asset_type");
  }

  static getLeadDemand() {
    return this.read("leadDemand", "month DESC, source, district, asset_type");
  }
}
