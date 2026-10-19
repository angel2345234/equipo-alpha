import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        'status' AS columna,
        status AS valor,
        COUNT(*)::int AS total
      FROM inventory.assets
      GROUP BY status

      UNION ALL

      SELECT
        'commercial_status',
        commercial_status,
        COUNT(*)::int
      FROM inventory.assets
      GROUP BY commercial_status

      UNION ALL

      SELECT
        'publication_status',
        publication_status,
        COUNT(*)::int
      FROM inventory.assets
      GROUP BY publication_status

      ORDER BY columna, valor
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

