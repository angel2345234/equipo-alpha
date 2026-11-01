import { pool } from "./src/db";

async function main() {
  const result = await pool.query(`
    SELECT
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.table_schema IN ('public', 'analytics')
      AND (
        tc.table_name LIKE 'fact_%'
        OR tc.table_name LIKE 'dim_%'
      )
    ORDER BY tc.table_schema, tc.table_name, tc.constraint_type;
  `);

  for (const row of result.rows) {
    console.log(
      `${row.table_schema}.${row.table_name} | ${row.constraint_type} | ${row.column_name ?? "-"} | ${row.constraint_name}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
