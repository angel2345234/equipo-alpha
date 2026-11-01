import { pool } from "./src/db";

async function main() {
  try {
    const tables = await pool.query(`
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name LIKE 'fact_%'
        AND column_name LIKE '%_sk'
      ORDER BY table_name, ordinal_position;
    `);

    console.log("\n=== CLAVES SUSTITUTAS EN LOS HECHOS ===");

    for (const item of tables.rows) {
      const schema = item.table_schema;
      const table = item.table_name;
      const column = item.column_name;

      const result = await pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT("${column}")::int AS no_nulos,
          COUNT(*) FILTER (
            WHERE "${column}" IS NULL
          )::int AS nulos,
          COUNT(DISTINCT "${column}")::int AS valores_distintos,
          MIN("${column}"::text) AS valor_minimo,
          MAX("${column}"::text) AS valor_maximo
        FROM "${schema}"."${table}";
      `);

      console.log(`\n${schema}.${table}.${column}`);
      console.table(result.rows);
    }
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
