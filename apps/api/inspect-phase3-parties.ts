import { pool } from "./src/db";

async function main() {
  try {
    console.log("\n=== COLUMNAS DE LEADS Y PARTES ===");

    const columns = await pool.query(`
      SELECT
        table_schema,
        table_name,
        ordinal_position,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE (table_schema = 'crm' AND table_name IN (
        'leads', 'opportunities', 'parties'
      ))
      OR (table_schema = 'core' AND table_name = 'parties')
      ORDER BY table_schema, table_name, ordinal_position;
    `);

    console.table(columns.rows);

    console.log("\n=== RELACIONES DE LEADS Y OPORTUNIDADES ===");

    const constraints = await pool.query(`
      SELECT
        ns.nspname AS schema_name,
        tbl.relname AS table_name,
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class tbl ON tbl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      WHERE ns.nspname IN ('crm', 'core')
        AND tbl.relname IN ('leads', 'opportunities', 'parties')
        AND con.contype = 'f'
      ORDER BY ns.nspname, tbl.relname, con.conname;
    `);

    console.table(constraints.rows);

    console.log("\n=== COLUMNAS DE ASIGNACIÓN Y PARTICIPANTES ===");

    const related = await pool.query(`
      SELECT table_schema, table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema IN ('crm', 'core')
        AND column_name IN (
          'assigned_to_id',
          'assigned_to',
          'party_id',
          'lead_id',
          'contact_id',
          'owner_party_id'
        )
      ORDER BY table_schema, table_name, ordinal_position;
    `);

    console.table(related.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error en la inspección:", error);
  process.exitCode = 1;
});
