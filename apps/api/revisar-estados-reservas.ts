import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        status,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE expires_at <= CURRENT_TIMESTAMP
        )::int AS vencidas,
        COUNT(*) FILTER (
          WHERE expires_at > CURRENT_TIMESTAMP
        )::int AS no_vencidas
      FROM crm.reservations
      GROUP BY status
      ORDER BY status
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
