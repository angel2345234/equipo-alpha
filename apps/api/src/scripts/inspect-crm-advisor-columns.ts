import { pool } from "../db";

async function main() {
  const result = await pool.query(`
    SELECT
      table_schema,
      table_name,
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'crm'
      AND (
        column_name ILIKE '%advisor%'
        OR column_name ILIKE '%asesor%'
        OR column_name ILIKE '%assigned%'
        OR column_name ILIKE '%seller%'
        OR column_name ILIKE '%vendedor%'
        OR column_name ILIKE '%owner%'
      )
    ORDER BY table_name, ordinal_position
  `);

  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
