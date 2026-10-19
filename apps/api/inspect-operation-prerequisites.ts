import "dotenv/config";
import { pool } from "./src/db";

async function main() {
  try {
    const assets = await pool.query(`
      SELECT
        COUNT(*)::int AS total_disponibles
      FROM inventory.assets
      WHERE status = 'AVAILABLE'
        AND commercial_status = 'AVAILABLE'
        AND publication_status = 'PUBLISHED'
    `);

    const opportunities = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM crm.opportunities
    `);

    console.log("=== Inmuebles elegibles para reservar ===");
    console.table(assets.rows);

    console.log("=== Oportunidades existentes ===");
    console.table(opportunities.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});

