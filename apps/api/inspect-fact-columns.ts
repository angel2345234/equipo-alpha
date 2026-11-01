import { pool } from "./src/db";

async function main() {
  const result = await pool.query(`
    SELECT
      table_schema,
      table_name,
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'fact_lead',
        'fact_visit',
        'fact_opportunity',
        'fact_reservation',
        'fact_operation',
        'fact_stage_changes',
        'fact_closing'
      )
    ORDER BY table_name, ordinal_position;
  `);

  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
