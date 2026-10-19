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
      SELECT 'reservations' AS table_name, COUNT(*)::int AS total
      FROM crm.reservations
      UNION ALL
      SELECT 'operations', COUNT(*)::int FROM crm.operations
      UNION ALL
      SELECT 'operation_status_history', COUNT(*)::int
      FROM crm.operation_status_history
      UNION ALL
      SELECT 'operation_participants', COUNT(*)::int
      FROM crm.operation_participants
      UNION ALL
      SELECT 'leads', COUNT(*)::int FROM crm.leads
      UNION ALL
      SELECT 'opportunities', COUNT(*)::int
      FROM crm.opportunities
      ORDER BY table_name
    `);

    console.table(result.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Falló la consulta:", error.message);
  process.exitCode = 1;
});
