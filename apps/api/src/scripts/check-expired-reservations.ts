import { pool } from "../db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        a.code,
        a.status,
        a.commercial_status,
        a.publication_status,
        (
          SELECT COUNT(*)
          FROM crm.reservations r
          WHERE r.asset_id = a.id
        ) AS total_reservations
      FROM inventory.assets a
      WHERE a.id = $1
    `, ["8f23d169-fcb6-471e-b804-a717ff6b41b6"]);

    console.table(result.rows);

    const keys = await pool.query(`
      SELECT idempotency_key, status
      FROM crm.reservations
      WHERE idempotency_key IN (
        'test-404-inmueble-001',
        'test-404-oportunidad-001'
      )
    `);

    console.log("Reservas con claves de prueba:", keys.rowCount);
    console.table(keys.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error completo:", error);
  process.exitCode = 1;
});
