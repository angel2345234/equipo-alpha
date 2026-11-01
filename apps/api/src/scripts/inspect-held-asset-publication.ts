import { pool } from "../db";

async function main() {
  try {
    console.log("\n=== ESTADO DEL INMUEBLE EN RESERVATION_HOLD ===");

    const result = await pool.query(`
      SELECT
        a.status,
        a.commercial_status,
        a.publication_status,
        a.updated_at,
        r.status AS estado_reserva,
        r.expires_at,
        CASE
          WHEN r.expires_at <= CURRENT_TIMESTAMP THEN 'VENCIDA'
          ELSE 'VIGENTE'
        END AS condicion_reserva,
        CASE
          WHEN a.status <> 'AVAILABLE' THEN 'NO_CUMPLE_STATUS'
          WHEN a.commercial_status <> 'RESERVATION_HOLD' THEN 'NO_ESTA_EN_HOLD'
          WHEN a.publication_status <> 'PUBLISHED' THEN 'NO_CUMPLE_PUBLICACION'
          WHEN EXISTS (
            SELECT 1
            FROM crm.reservations r2
            WHERE r2.asset_id = a.id
              AND r2.status = 'ACTIVE'
              AND r2.expires_at > CURRENT_TIMESTAMP
          ) THEN 'TIENE_RESERVA_VIGENTE'
          ELSE 'CUMPLE_CONDICIONES_DE_LIBERACION'
        END AS diagnostico_liberacion
      FROM inventory.assets a
      LEFT JOIN crm.reservations r
        ON r.asset_id = a.id
      WHERE a.commercial_status = 'RESERVATION_HOLD'
    `);

    console.table(result.rows);

    console.log("\n=== RESUMEN DE CONDICIONES DE PUBLICACIÓN ===");

    const publication = await pool.query(`
      SELECT
        publication_status,
        COUNT(*) AS total
      FROM inventory.assets
      WHERE commercial_status = 'RESERVATION_HOLD'
      GROUP BY publication_status
    `);

    console.table(publication.rows);

  } catch (error) {
    console.error("Error en inspección:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();