import { pool } from "./src/db";

async function main() {
  try {
    console.log("\n=== EXISTENCIA DE TABLAS ===");

    const tables = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN ('crm', 'core', 'inventory')
        AND table_name IN (
          'operations',
          'reservations',
          'opportunities',
          'parties',
          'assets',
          'asset_active_holds',
          'asset_timelines',
          'inventory_domain_events'
        )
      ORDER BY table_schema, table_name;
    `);

    console.table(tables.rows);

    console.log("\n=== COLUMNAS Y TIPOS ===");

    const columns = await pool.query(`
      SELECT
        table_schema,
        table_name,
        ordinal_position,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema IN ('crm', 'core', 'inventory')
        AND table_name IN (
          'operations',
          'reservations',
          'opportunities',
          'parties',
          'assets',
          'asset_active_holds',
          'asset_timelines',
          'inventory_domain_events'
        )
      ORDER BY table_schema, table_name, ordinal_position;
    `);

    console.table(columns.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error en la inspección:", error);
  process.exitCode = 1;
});
