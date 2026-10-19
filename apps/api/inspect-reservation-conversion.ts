import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        r.id AS reservation_id,
        r.opportunity_id,
        r.asset_id,
        r.status AS reservation_status,
        r.expires_at,
        r.converted_at,
        (r.expires_at > CURRENT_TIMESTAMP) AS is_unexpired,
        a.status AS asset_status,
        a.commercial_status,
        a.publication_status
      FROM crm.reservations r
      LEFT JOIN inventory.assets a ON a.id = r.asset_id
      ORDER BY r.created_at
    `);

    console.table(result.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
