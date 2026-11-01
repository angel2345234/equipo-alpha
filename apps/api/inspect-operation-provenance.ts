import { pool } from "./src/db";

async function main() {
  try {
    const columns = await pool.query(`
      SELECT table_schema, table_name, column_name, data_type
      FROM information_schema.columns
      WHERE (table_schema = 'operation' AND table_name = 'operations')
         OR (table_schema = 'public' AND table_name = 'fact_operation')
      ORDER BY table_schema, table_name, ordinal_position
    `);

    console.log("\n=== ESTRUCTURA DE LAS TABLAS ===");
    console.table(columns.rows);

    const fact = await pool.query(`
      SELECT
        cod_operacion_bk,
        source_system,
        tipo_operacion,
        monto_bruto,
        monto_descuento,
        monto_neto_operacion,
        cantidad_unidades,
        created_at
      FROM public.fact_operation
    `);

    console.log("\n=== HECHO DE OPERACIÓN ===");
    console.table(fact.rows);

    const operations = await pool.query(`
      SELECT code, created_at, updated_at
      FROM operation.operations
      ORDER BY created_at
    `);

    console.log("\n=== OPERACIONES ACTUALES (METADATOS) ===");
    console.table(operations.rows);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
