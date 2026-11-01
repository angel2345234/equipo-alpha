import { pool } from "../db";

async function main() {
  const result = await pool.query(`
    SELECT
      table_schema,
      table_name,
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE
      (table_schema = 'crm' AND table_name IN ('opportunities', 'leads'))
      OR
      (table_schema = 'inventory' AND table_name IN ('assets', 'units'))
    ORDER BY table_schema, table_name, ordinal_position;
  `);

  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
