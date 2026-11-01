import { pool } from "../db";

async function main() {
  try {
    console.log("\n=== 1. RESUMEN DE ESTADOS DE RESERVAS ===");

    const statuses = await pool.query(`
      SELECT
        status,
        COUNT(*) AS total
      FROM crm.reservations
      GROUP BY status
      ORDER BY status
    `);

    console.table(statuses.rows);

    console.log("\n=== 2. CALIDAD DE FECHAS DE RESERVAS ===");

    const dates = await pool.query(`
      SELECT
        COUNT(*) AS total_reservas,
        COUNT(*) FILTER (
          WHERE expires_at IS NULL
        ) AS sin_fecha_vencimiento,
        COUNT(*) FILTER (
          WHERE created_at IS NULL
        ) AS sin_fecha_creacion,
        COUNT(*) FILTER (
          WHERE expires_at < created_at
        ) AS vencimiento_anterior_a_creacion,
        COUNT(*) FILTER (
          WHERE status = 'ACTIVE'
            AND expires_at <= CURRENT_TIMESTAMP
        ) AS activas_ya_vencidas,
        COUNT(*) FILTER (
          WHERE status = 'ACTIVE'
            AND expires_at > CURRENT_TIMESTAMP
        ) AS activas_vigentes
      FROM crm.reservations
    `);

    console.table(dates.rows);

    console.log("\n=== 3. RESERVAS POR ESTADO Y VENCIMIENTO ===");

    const expiration = await pool.query(`
      SELECT
        status,
        CASE
          WHEN expires_at <= CURRENT_TIMESTAMP THEN 'VENCIDA'
          ELSE 'VIGENTE'
        END AS condicion_fecha,
        COUNT(*) AS total
      FROM crm.reservations
      GROUP BY status, condicion_fecha
      ORDER BY status, condicion_fecha
    `);

    console.table(expiration.rows);

    console.log("\n=== 4. INTEGRIDAD DE RELACIONES ===");

    const relations = await pool.query(`
      SELECT
        COUNT(*) AS total_reservas,
        COUNT(*) FILTER (
          WHERE o.id IS NULL
        ) AS oportunidades_inexistentes,
        COUNT(*) FILTER (
          WHERE a.id IS NULL
        ) AS inmuebles_inexistentes,
        COUNT(*) FILTER (
          WHERE r.created_by IS NULL
             OR TRIM(r.created_by) = ''
        ) AS sin_creador,
        COUNT(*) FILTER (
          WHERE r.idempotency_key IS NULL
             OR TRIM(r.idempotency_key) = ''
        ) AS sin_clave_idempotencia
      FROM crm.reservations r
      LEFT JOIN crm.opportunities o
        ON o.id = r.opportunity_id
      LEFT JOIN inventory.assets a
        ON a.id = r.asset_id
    `);

    console.table(relations.rows);

  } catch (error) {
    console.error("Error en inspección:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();