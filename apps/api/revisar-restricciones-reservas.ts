import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class tbl
        ON tbl.oid = con.conrelid
      JOIN pg_namespace ns
        ON ns.oid = tbl.relnamespace
      WHERE ns.nspname = 'crm'
        AND tbl.relname = 'reservations'
      ORDER BY con.contype, con.conname
    `);

    console.table(result.rows);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
