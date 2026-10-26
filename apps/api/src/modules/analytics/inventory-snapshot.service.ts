import { pool } from "../../db";
import { DimensionsService } from "./dimensions.service";

/**
 * ALP4-006: Snapshot diario de inventario.
 *
 * Toma una "foto" del estado comercial, de publicación y del precio de cada
 * activo en inventory.assets y la guarda en analytics.snap_inventory_daily.
 * Grano: 1 activo por día (America/Lima). Re-ejecutable: el mismo día actualiza
 * la foto existente en lugar de duplicarla.
 */

export interface InventorySnapshotSummary {
  snapshotDate: string;          // YYYY-MM-DD (America/Lima)
  snapshotDateKey: number;       // YYYYMMDD
  rowsWritten: number;
}

export interface InventorySnapshotCheck {
  snapshotDateKey: number;
  oltpAssets: number;            // activos en inventory.assets
  snapshotRows: number;          // filas en el snapshot de esa fecha
  unknownAssetRows: number;      // filas que cayeron en asset_key = -1
  available: number;
  published: number;
  withActiveHold: number;
  availabilityRatioPct: number | null; // KPI P0-05
}

export class InventorySnapshotService {
  /**
   * Devuelve la fecha de hoy en America/Lima como YYYY-MM-DD.
   */
  static async todayInLima(): Promise<string> {
    const { rows } = await pool.query(
      `SELECT to_char((now() AT TIME ZONE 'America/Lima')::date, 'YYYY-MM-DD') AS d`,
    );
    return rows[0].d;
  }

  static toDateKey(date: string): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Fecha inválida "${date}". Formato esperado: YYYY-MM-DD`);
    }
    return Number(date.replace(/-/g, ""));
  }

  /**
   * Toma el snapshot de la fecha indicada (por defecto, hoy en America/Lima).
   * Primero sincroniza dim_asset para que todo activo tenga su asset_key.
   */
  static async takeDailySnapshot(snapshotDate?: string): Promise<InventorySnapshotSummary> {
    const date = snapshotDate ?? (await this.todayInLima());
    const dateKey = this.toDateKey(date);

    // 1. Asegurar que todos los activos existan en la dimensión
    await DimensionsService.syncAssetDimension();

    // 2. Escribir la foto del día en una sola transacción
    const client = await pool.connect();
    try {
      console.log(`[SNAPSHOT] Tomando snapshot de inventario para ${date} (date_key ${dateKey})...`);
      await client.query("BEGIN");

      const result = await client.query(
        `
        INSERT INTO analytics.snap_inventory_daily (
          snapshot_date_key, asset_key, asset_id,
          commercial_status, publication_status,
          is_available, is_published, has_active_hold,
          price_amount, currency, amount_price_usd
        )
        SELECT
          $1::int                                        AS snapshot_date_key,
          COALESCE(d.asset_key, -1)                      AS asset_key,
          a.id                                           AS asset_id,
          COALESCE(a.commercial_status, 'UNKNOWN')       AS commercial_status,
          COALESCE(a.publication_status, 'UNKNOWN')      AS publication_status,
          COALESCE(a.commercial_status = 'AVAILABLE', false)  AS is_available,
          COALESCE(a.publication_status = 'PUBLISHED', false) AS is_published,
          EXISTS (
            SELECT 1 FROM inventory.asset_active_holds h
            WHERE h.asset_id = a.id AND h.expires_at > now()
          )                                              AS has_active_hold,
          a.price                                        AS price_amount,
          a.currency                                     AS currency,
          CASE WHEN a.currency = 'USD' THEN a.price END  AS amount_price_usd
        FROM inventory.assets a
        LEFT JOIN analytics.dim_asset d ON d.asset_id = a.id
        ON CONFLICT (snapshot_date_key, asset_key) DO UPDATE SET
          asset_id           = EXCLUDED.asset_id,
          commercial_status  = EXCLUDED.commercial_status,
          publication_status = EXCLUDED.publication_status,
          is_available       = EXCLUDED.is_available,
          is_published       = EXCLUDED.is_published,
          has_active_hold    = EXCLUDED.has_active_hold,
          price_amount       = EXCLUDED.price_amount,
          currency           = EXCLUDED.currency,
          amount_price_usd   = EXCLUDED.amount_price_usd,
          etl_updated_at     = CURRENT_TIMESTAMP;
        `,
        [dateKey],
      );

      await client.query("COMMIT");
      console.log(`[SNAPSHOT] ${result.rowCount} activos registrados en analytics.snap_inventory_daily.`);
      return { snapshotDate: date, snapshotDateKey: dateKey, rowsWritten: result.rowCount ?? 0 };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reconciliación del snapshot contra la fuente OLTP y cálculo del KPI P0-05.
   */
  static async checkSnapshot(snapshotDateKey: number): Promise<InventorySnapshotCheck> {
    const { rows } = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM inventory.assets)::int                          AS oltp_assets,
        COUNT(*)::int                                                         AS snapshot_rows,
        COUNT(*) FILTER (WHERE asset_key = -1)::int                           AS unknown_asset_rows,
        COUNT(*) FILTER (WHERE is_available)::int                             AS available,
        COUNT(*) FILTER (WHERE is_published)::int                             AS published,
        COUNT(*) FILTER (WHERE has_active_hold)::int                          AS with_active_hold,
        ROUND(100.0 * COUNT(*) FILTER (WHERE is_available) / NULLIF(COUNT(*), 0), 2) AS ratio
      FROM analytics.snap_inventory_daily
      WHERE snapshot_date_key = $1
      `,
      [snapshotDateKey],
    );
    const r = rows[0];
    return {
      snapshotDateKey,
      oltpAssets: r.oltp_assets,
      snapshotRows: r.snapshot_rows,
      unknownAssetRows: r.unknown_asset_rows,
      available: r.available,
      published: r.published,
      withActiveHold: r.with_active_hold,
      availabilityRatioPct: r.ratio === null ? null : Number(r.ratio),
    };
  }
}
