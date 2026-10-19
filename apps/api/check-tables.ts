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
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN ('core', 'inventory', 'crm')
      ORDER BY table_schema, table_name;
    `);

    if (result.rows.length === 0) {
      console.log("No se encontraron tablas en los esquemas core, inventory y crm.");
    } else {
      console.table(result.rows);
    }
  } catch (error) {
    console.error("Error al consultar las tablas:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
