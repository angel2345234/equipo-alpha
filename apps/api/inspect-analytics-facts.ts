import { pool } from "./src/db";

async function main() {
  const client = await pool.connect();

  try {
    const tables = ["fact_commercial_events", "fact_operations"];

    for (const table of tables) {
      console.log(`\n=== COLUMNAS: analytics.${table} ===`);

      const columns = await client.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'analytics'
          AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);

      console.table(columns.rows);

      console.log(`\n=== DATOS: analytics.${table} ===`);

      const data = await client.query(
        `SELECT * FROM analytics.${table} LIMIT 10`
      );

      console.table(data.rows);
      console.log("Registros encontrados:", data.rowCount);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
