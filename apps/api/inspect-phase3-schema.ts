import { pool } from "./src/db";

async function main() {
  try {
    console.log("\n=== RESTRICCIONES Y CLAVES FORÁNEAS ===");

    const constraints = await pool.query(`
      SELECT
        ns.nspname AS schema_name,
        tbl.relname AS table_name,
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class tbl ON tbl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      WHERE ns.nspname IN ('crm', 'inventory', 'core')
        AND tbl.relname IN (
          'reservations',
          'assets',
          'asset_active_holds',
          'asset_timelines',
          'inventory_domain_events',
          'opportunities',
          'parties'
        )
      ORDER BY ns.nspname, tbl.relname, con.contype, con.conname;
    `);

    console.table(constraints.rows);

    console.log("\n=== ÍNDICES EXISTENTES ===");

    const indexes = await pool.query(`
      SELECT
        schemaname AS schema_name,
        tablename AS table_name,
        indexname AS index_name,
        indexdef AS definition
      FROM pg_indexes
      WHERE schemaname IN ('crm', 'inventory', 'core')
        AND tablename IN (
          'reservations',
          'assets',
          'asset_active_holds',
          'asset_timelines',
          'inventory_domain_events',
          'opportunities',
          'parties'
        )
      ORDER BY schemaname, tablename, indexname;
    `);

    console.table(indexes.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error en la inspección:", error);
  process.exitCode = 1;
});
