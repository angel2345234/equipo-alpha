import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        c.table_schema,
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable
      FROM information_schema.columns c
      WHERE c.table_schema IN ('core', 'inventory', 'crm')
      ORDER BY c.table_schema, c.table_name, c.ordinal_position;
    `);

    for (const row of result.rows) {
      console.log(
        `${row.table_schema}.${row.table_name} | ` +
        `${row.column_name} | ${row.data_type} | ` +
        `nullable=${row.is_nullable}`
      );
    }
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
