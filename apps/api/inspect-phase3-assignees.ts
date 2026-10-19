import { pool } from "./src/db";

async function main() {
  try {
    console.log("\n=== TABLAS RELACIONADAS CON USUARIOS Y ASESORES ===");

    const tables = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN ('core', 'crm')
        AND table_type = 'BASE TABLE'
        AND (
          table_name ILIKE '%user%'
          OR table_name ILIKE '%advisor%'
          OR table_name ILIKE '%agent%'
          OR table_name ILIKE '%employee%'
          OR table_name ILIKE '%staff%'
        )
      ORDER BY table_schema, table_name;
    `);

    console.table(tables.rows);

    console.log("\n=== CLAVES FORÁNEAS DE ASIGNACIÓN ===");

    const fks = await pool.query(`
      SELECT
        ns.nspname AS schema_name,
        tbl.relname AS table_name,
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class tbl ON tbl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      WHERE ns.nspname IN ('core', 'crm')
        AND tbl.relname IN ('leads', 'opportunities')
        AND con.contype = 'f'
      ORDER BY tbl.relname, con.conname;
    `);

    console.table(fks.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error en la inspección:", error);
  process.exitCode = 1;
});
