import { pool } from "../db";

async function main() {
  try {
    console.log("\n=== 1. RESUMEN DE INMUEBLES EN RESERVATION_HOLD ===");

    const summary = await pool.query(`
      SELECT
        COUNT(*) AS total_inmuebles,
        COUNT(*) FILTER (
          WHERE commercial_status = 'RESERVATION_HOLD'
        ) AS inmuebles_en_hold,
        COUNT(*) FILTER (
          WHERE commercial_status = 'AVAILABLE'
        ) AS inmuebles_disponibles
      FROM inventory.assets
    `);

    console.table(summary.rows);

    console.log("\n=== 2. RESERVAS ASOCIADAS A INMUEBLES EN HOLD ===");

    const holds = await pool.query(`
      SELECT
        a.commercial_status,
        COUNT(DISTINCT a.id) AS total_inmuebles,
        COUNT(r.id) AS total_reservas,
        COUNT(r.id) FILTER (
          WHERE r.status = 'ACTIVE'
            AND r.expires_at > CURRENT_TIMESTAMP
        ) AS reservas_activas_vigentes,
        COUNT(r.id) FILTER (
          WHERE r.status = 'ACTIVE'
            AND r.expires_at <= CURRENT_TIMESTAMP
        ) AS reservas_activas_vencidas,
        COUNT(r.id) FILTER (
          WHERE r.status = 'EXPIRED'
        ) AS reservas_expiradas
      FROM inventory.assets a
      LEFT JOIN crm.reservations r
        ON r.asset_id = a.id
      WHERE a.commercial_status = 'RESERVATION_HOLD'
      GROUP BY a.commercial_status
    `);

    console.table(holds.rows);

    console.log("\n=== 3. INMUEBLES EN HOLD SIN RESERVA ACTIVA VIGENTE ===");

    const inconsistent = await pool.query(`
      SELECT
        COUNT(*) AS inmuebles_en_hold,
        COUNT(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1
            FROM crm.reservations r
            WHERE r.asset_id = a.id
              AND r.status = 'ACTIVE'
              AND r.expires_at > CURRENT_TIMESTAMP
          )
        ) AS hold_sin_reserva_activa_vigente
      FROM inventory.assets a
      WHERE a.commercial_status = 'RESERVATION_HOLD'
    `);

    console.table(inconsistent.rows);

    console.log("\n=== 4. RESUMEN DE ESTADOS DE RESERVAS POR INMUEBLE ===");

    const details = await pool.query(`
      SELECT
        a.commercial_status,
        COUNT(DISTINCT a.id) AS total_inmuebles,
        COUNT(DISTINCT r.id) FILTER (
          WHERE r.status = 'ACTIVE'
        ) AS reservas_active,
        COUNT(DISTINCT r.id) FILTER (
          WHERE r.status = 'EXPIRED'
        ) AS reservas_expired,
        COUNT(DISTINCT r.id) FILTER (
          WHERE r.status = 'CANCELLED'
        ) AS reservas_cancelled,
        COUNT(DISTINCT r.id) FILTER (
          WHERE r.status = 'CONVERTED'
        ) AS reservas_converted
      FROM inventory.assets a
      LEFT JOIN crm.reservations r
        ON r.asset_id = a.id
      GROUP BY a.commercial_status
      ORDER BY a.commercial_status
    `);

    console.table(details.rows);

  } catch (error) {
    console.error("Error en inspección:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();