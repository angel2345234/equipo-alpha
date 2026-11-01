import { pool } from "../db";

async function main() {
  const result = await pool.query(`
    SELECT
      table_schema,
      table_name,
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema IN ('core', 'crm', 'analytics')
      AND (
        table_name ILIKE '%advisor%'
        OR table_name ILIKE '%asesor%'
        OR table_name ILIKE '%user%'
        OR table_name ILIKE '%party%'
        OR table_name IN ('dim_date', 'dim_advisor')
      )
    ORDER BY table_schema, table_name, ordinal_position
  `);

  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
