import { pool } from "./src/db";

async function main() {
  const client = await pool.connect();

  try {
    console.log("\n=== TABLAS ANALÍTICAS Y SU ESQUEMA ===");

    const tables = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name IN (
        'fact_lead',
        'fact_visit',
        'fact_opportunity',
        'fact_reservation',
        'fact_operation',
        'fact_stage_changes',
        'fact_closing'
      )
      ORDER BY table_schema, table_name;
    `);

    console.table(tables.rows);

    console.log("\n=== COLUMNAS DE LAS TABLAS DE HECHOS ===");

    const columns = await client.query(`
      SELECT
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name IN (
        'fact_lead',
        'fact_visit',
        'fact_opportunity',
        'fact_reservation',
        'fact_operation',
        'fact_stage_changes',
        'fact_closing'
      )
      ORDER BY table_schema, table_name, ordinal_position;
    `);

    console.table(columns.rows);

    console.log("\n=== RESTRICCIONES DE LAS TABLAS DE HECHOS ===");

    const constraints = await client.query(`
      SELECT
        tc.table_schema,
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_name IN (
        'fact_lead',
        'fact_visit',
        'fact_opportunity',
        'fact_reservation',
        'fact_operation',
        'fact_stage_changes',
        'fact_closing'
      )
      ORDER BY tc.table_schema, tc.table_name;
    `);

    console.table(constraints.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error en inspección:", error);
  process.exitCode = 1;
});
