import { pool } from "./src/db";

async function main() {
  const client = await pool.connect();

  try {
    console.log("\n=== TABLAS EXISTENTES EN ANALYTICS ===");

    const result = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'analytics'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.table(result.rows);

    console.log("\n=== EXISTENCIA Y REGISTROS ===");

    const tables = [
      "analytics.dim_date",
      "analytics.dim_geography",
      "analytics.dim_advisor",
      "analytics.dim_source",
      "analytics.dim_asset",
      "public.fact_lead",
      "public.fact_visit",
      "public.fact_opportunity",
      "public.fact_reservation",
      "public.fact_operation",
      "public.fact_stage_changes",
      "public.fact_closing"
    ];

    for (const table of tables) {
      const exists = await client.query(
        "SELECT to_regclass($1) IS NOT NULL AS exists",
        [table]
      );

      if (!exists.rows[0].exists) {
        console.log(`${table}: NO EXISTE`);
        continue;
      }

      const count = await client.query(
        `SELECT COUNT(*)::integer AS total FROM ${table}`
      );

      console.log(`${table}: ${count.rows[0].total} registros`);
    }

    console.log("\n=== RESTRICCIONES DE DIMENSIONES ===");

    const constraints = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'analytics'
      ORDER BY tc.table_name, tc.constraint_type;
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
