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
        current_database() AS database,
        current_user AS usuario,
        version() AS version
    `);

    console.log("Conexión a PostgreSQL exitosa.");
    console.log("Base de datos:", result.rows[0].database);
    console.log("Usuario:", result.rows[0].usuario);
    console.log("Servidor:", result.rows[0].version.split(",")[0]);
  } catch (error) {
    console.error("Falló la conexión a PostgreSQL.");
    console.error(error instanceof Error ? error.message : "Error desconocido");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
