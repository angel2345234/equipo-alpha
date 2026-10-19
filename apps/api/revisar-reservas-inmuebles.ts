import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        r.id AS reservation_id,
        r.status AS reservation_status,
        r.expires_at,
        r.created_at AS reservation_created_at,
        a.id AS asset_id,
        a.code AS asset_code,
        a.status AS asset_status,
        a.commercial_status,
        a.publication_status,
        CASE
          WHEN r.expires_at <= CURRENT_TIMESTAMP THEN true
          ELSE false
        END AS is_expired
      FROM crm.reservations r
      JOIN inventory.assets a
        ON a.id = r.asset_id
      ORDER BY r.expires_at ASC
    `);

    console.table(result.rows);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
