import { pool } from "./src/db";

async function main() {
  try {
    console.log("\n=== RESTRICCIONES DE OPERACIONES ===");

    const constraints = await pool.query(`
      SELECT
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class tbl ON tbl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      WHERE ns.nspname = 'crm'
        AND tbl.relname = 'operations'
      ORDER BY con.contype, con.conname;
    `);

    console.table(constraints.rows);

    console.log("\n=== ÍNDICES DE OPERACIONES ===");

    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'crm'
        AND tablename = 'operations'
      ORDER BY indexname;
    `);

    console.table(indexes.rows);

    console.log("\n=== ESTADOS Y CANTIDAD DE OPERACIONES ===");

    const statuses = await pool.query(`
      SELECT status, COUNT(*)::int AS total
      FROM crm.operations
      GROUP BY status
      ORDER BY status;
    `);

    console.table(statuses.rows);

    console.log("\n=== TABLAS RELACIONADAS CON OPERACIONES ===");

    const relatedTables = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN ('crm', 'core', 'inventory')
        AND (
          table_name ILIKE '%operation%'
          OR table_name ILIKE '%participant%'
          OR table_name ILIKE '%history%'
          OR table_name ILIKE '%audit%'
          OR table_name ILIKE '%event%'
        )
      ORDER BY table_schema, table_name;
    `);

    console.table(relatedTables.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error en la inspección:", error);
  process.exitCode = 1;
});
