import { pool } from "./src/db";

async function main() {
  try {
    const statuses = await pool.query(`
      SELECT status, COUNT(*)::int AS total
      FROM crm.reservations
      GROUP BY status
      ORDER BY status
    `);

    const constraints = await pool.query(`
      SELECT
        c.conname AS constraint_name,
        c.contype AS constraint_type,
        pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'crm'
        AND t.relname = 'reservations'
      ORDER BY c.contype, c.conname
    `);

    console.log("\n--- Estados actuales ---");
    console.table(statuses.rows);

    console.log("\n--- Restricciones de crm.reservations ---");
    console.table(constraints.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
