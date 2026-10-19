import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        status,
        expires_at,
        opportunity_id,
        asset_id
      FROM crm.reservations
      WHERE status = 'ACTIVE'
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log("Reservas activas y vigentes:", result.rowCount);
    console.table(result.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error consultando reservas:", error);
  process.exitCode = 1;
});
