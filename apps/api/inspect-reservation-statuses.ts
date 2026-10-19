import "dotenv/config";
import { pool } from "./src/db";

async function main() {
  try {
    const counts = await pool.query(`
      SELECT status, COUNT(*)::int AS total
      FROM crm.reservations
      GROUP BY status
      ORDER BY status
    `);

    console.log("=== Reservas agrupadas por estado ===");
    console.table(counts.rows);

    const recent = await pool.query(`
      SELECT
        r.id,
        r.status,
        r.expires_at,
        (r.expires_at > CURRENT_TIMESTAMP) AS is_unexpired,
        EXISTS (
          SELECT 1
          FROM crm.operations o
          WHERE o.source_reservation_id = r.id
        ) AS has_operation
      FROM crm.reservations r
      ORDER BY r.created_at DESC
      LIMIT 10
    `);

    console.log("=== Últimas 10 reservas ===");
    console.table(recent.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
