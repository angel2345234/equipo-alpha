import "dotenv/config";
import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.status,
        r.expires_at,
        r.opportunity_id,
        r.asset_id,
        (r.expires_at > CURRENT_TIMESTAMP) AS is_unexpired,
        EXISTS (
          SELECT 1
          FROM crm.operations o
          WHERE o.source_reservation_id = r.id
        ) AS has_operation
      FROM crm.reservations r
      WHERE r.status = 'ACTIVE'
      ORDER BY r.expires_at DESC
      LIMIT 20
    `);

    console.table(result.rows);
    console.log("Reservas activas encontradas:", result.rowCount);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error al consultar reservas:", error);
  process.exitCode = 1;
});
