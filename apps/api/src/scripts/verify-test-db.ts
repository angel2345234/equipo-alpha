import { Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";

const envPath = path.resolve(__dirname, "../../.env.test");
const env = dotenv.config({ path: envPath });

if (env.error) {
  throw new Error("No se pudo leer apps/api/.env.test");
}

const connectionString = process.env.DATABASE_URL_TEST;

if (!connectionString) {
  throw new Error("Falta DATABASE_URL_TEST en apps/api/.env.test");
}

const connectionUrl = new URL(connectionString);

if (!connectionUrl.hostname.endsWith(".neon.tech")) {
  throw new Error(
    "Conexión rechazada: el host no parece ser un endpoint de Neon.",
  );
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
        current_database() AS database_name,
        current_user AS database_user,
        inet_server_addr()::text AS server_address,
        current_setting('transaction_read_only') AS transaction_read_only
    `);

    console.log("Host de conexión:", connectionUrl.hostname);
    console.log("Resultado de la comprobación:");
    console.log(JSON.stringify(result.rows[0], null, 2));
    console.log(
      "Nota: compara el host con el endpoint del branch de pruebas en Neon.",
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Falló la verificación:", error.message);
  process.exitCode = 1;
});
