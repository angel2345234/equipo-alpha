import { Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
  path: path.resolve(__dirname, "../../.env.test"),
});

const connectionString = process.env.DATABASE_URL_TEST;

if (!connectionString) {
  throw new Error("Falta DATABASE_URL_TEST en apps/api/.env.test");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        table_schema,
        table_name
      FROM information_schema.tables
      WHERE table_schema IN ('crm', 'inventory', 'core')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);

    console.log("Tablas encontradas:");
    console.table(result.rows);

    const counts = await pool.query(`
      SELECT
        to_regclass('crm.operations') AS operations,
        to_regclass('crm.operation_status_history') AS status_history,
        to_regclass('crm.operation_participants') AS participants
    `);

    console.log("Tablas necesarias para fase 3:");
    console.table(counts.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Falló la inspección:", error.message);
  process.exitCode = 1;
});
