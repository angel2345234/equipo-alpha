import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        table_schema,
        table_name
      FROM information_schema.tables
      WHERE table_schema IN ('core', 'crm', 'inventory', 'analytics')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name;
    `);

    console.table(result.rows);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
