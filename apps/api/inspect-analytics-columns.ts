import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema IN ('public', 'analytics')
        AND (
          table_name LIKE 'fact_%'
          OR table_name LIKE 'dim_%'
        )
      ORDER BY table_schema, table_name, ordinal_position;
    `);

    for (const row of result.rows) {
      console.log(
        `${row.table_schema}.${row.table_name} | ` +
        `${row.column_name} | ${row.data_type} | ` +
        `nullable: ${row.is_nullable}`
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
