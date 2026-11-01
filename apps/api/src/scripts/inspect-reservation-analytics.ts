import { pool } from "../db";

async function main() {
  const client = await pool.connect();

  try {
    console.log("\n=== INSPECCIÓN DE TABLAS OPERATIVAS Y ANALÍTICAS ===\n");

    const tables = await client.query(`
      SELECT
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE
        (table_schema = 'crm'
          AND table_name IN ('reservations', 'operations'))
        OR
        (table_schema = 'public'
          AND table_name IN ('fact_reservation', 'fact_operation'))
      ORDER BY table_schema, table_name, ordinal_position;
    `);

    console.table(tables.rows);

    console.log("\n=== EXISTENCIA DE LAS CUATRO TABLAS ===\n");

    const existence = await client.query(`
      SELECT
        to_regclass('crm.reservations') AS crm_reservations,
        to_regclass('crm.operations') AS crm_operations,
        to_regclass('public.fact_reservation') AS fact_reservation,
        to_regclass('public.fact_operation') AS fact_operation;
    `);

    console.table(existence.rows);
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("Error durante la inspección:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });