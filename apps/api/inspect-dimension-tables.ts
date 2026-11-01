import { pool } from "./src/db";

async function main() {
  try {
    const tables = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN (
          'pg_catalog', 'information_schema'
        )
        AND table_name LIKE 'dim_%'
      ORDER BY table_schema, table_name;
    `);

    console.log("\n=== TABLAS DE DIMENSIONES ===");
    console.table(tables.rows);

    for (const table of tables.rows) {
      const columns = await pool.query(`
        SELECT
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
        ORDER BY ordinal_position;
      `, [table.table_schema, table.table_name]);

      const count = await pool.query(`
        SELECT COUNT(*)::int AS total
        FROM "${table.table_schema}"."${table.table_name}";
      `);

      console.log(
        `\n=== ${table.table_schema}.${table.table_name} ===`
      );
      console.log("Registros:", count.rows[0].total);
      console.table(columns.rows);
    }
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
