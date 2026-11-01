import { pool } from "../db";

async function main() {
  const result = await pool.query(`
    SELECT
      table_name,
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'fact_lead',
        'fact_visit',
        'fact_opportunity'
      )
    ORDER BY table_name, ordinal_position
  `);

  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
