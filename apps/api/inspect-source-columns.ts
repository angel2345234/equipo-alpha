import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE
        (table_schema = 'crm'
          AND table_name IN (
            'leads',
            'visits',
            'opportunities',
            'reservations',
            'operations',
            'parties'
          ))
        OR
        (table_schema = 'core'
          AND table_name IN ('parties', 'projects'))
        OR
        (table_schema = 'inventory'
          AND table_name IN ('assets', 'projects'))
        OR
        (table_schema = 'analytics'
          AND table_name IN ('dim_date', 'dim_advisor'))
      ORDER BY table_schema, table_name, ordinal_position;
    `);

    for (const row of result.rows) {
      console.log(
        `${row.table_schema}.${row.table_name} | ` +
        `${row.column_name} | ${row.data_type} | ` +
        `nullable: ${row.is_nullable}`
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
