import { pool } from "../db";

async function main() {
  const result = await pool.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'iam'
      AND table_name = 'users'
    ORDER BY ordinal_position;
  `);

  console.log("\n--- ESTRUCTURA DE iam.users ---");
  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
