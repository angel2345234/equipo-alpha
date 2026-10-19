import { pool } from "./src/db";

async function main() {
  const result = await pool.query(`
    SELECT
      column_name,
      is_nullable,
      column_default,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'inventory'
      AND table_name = 'assets'
    ORDER BY ordinal_position;
  `);

  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
