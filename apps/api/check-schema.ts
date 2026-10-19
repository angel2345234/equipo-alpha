import { pool } from "./src/db";

async function main() {
  const result = await pool.query(`
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema IN ('core', 'inventory', 'crm')
    ORDER BY table_schema, table_name, ordinal_position
  `);

  for (const row of result.rows) {
    console.log(
      `${row.table_schema}.${row.table_name}.${row.column_name}: ${row.data_type}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
