import { pool } from "./src/db";

async function main() {
  try {
    const tables = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
        AND (
          table_name ILIKE '%lead%'
          OR table_name ILIKE '%visit%'
          OR table_name ILIKE '%opportun%'
          OR table_name ILIKE '%operation%'
          OR table_name ILIKE '%commercial%'
        )
      ORDER BY table_schema, table_name
    `);

    console.log("\n=== TABLAS RELACIONADAS ===");
    console.table(tables.rows);

    const columns = await pool.query(`
      SELECT table_schema, table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        AND (
          column_name ILIKE '%cod%'
          OR column_name ILIKE '%id%'
          OR column_name ILIKE '%source%'
          OR column_name ILIKE '%system%'
        )
        AND table_name IN (
          SELECT table_name
          FROM information_schema.tables
          WHERE table_type = 'BASE TABLE'
            AND table_schema NOT IN ('information_schema', 'pg_catalog')
            AND (
              table_name ILIKE '%lead%'
              OR table_name ILIKE '%visit%'
              OR table_name ILIKE '%opportun%'
              OR table_name ILIKE '%operation%'
              OR table_name ILIKE '%commercial%'
            )
        )
      ORDER BY table_schema, table_name, ordinal_position
    `);

    console.log("\n=== COLUMNAS DE IDENTIFICACIÓN ===");
    console.table(columns.rows);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
