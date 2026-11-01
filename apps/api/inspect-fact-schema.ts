import { pool } from "./src/db";

async function main() {
  const result = await pool.query(`
    SELECT
      table_schema,
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema IN ('public', 'analytics')
      AND table_name IN (
        'fact_lead',
        'fact_visit',
        'fact_opportunity',
        'fact_reservation',
        'fact_operation',
        'fact_stage_changes',
        'fact_closing'
      )
    ORDER BY table_schema, table_name, ordinal_position;
  `);

  for (const row of result.rows) {
    console.log(
      `${row.table_schema}.${row.table_name} | ${row.column_name} | ${row.data_type} | nullable=${row.is_nullable} | default=${row.column_default}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
