import { pool } from "./src/db";

const checks = [
  {
    name: "fact_lead",
    sql: `
      SELECT cod_lead_bk AS business_key, COUNT(*) AS repetitions
      FROM public.fact_lead
      GROUP BY cod_lead_bk
      HAVING COUNT(*) > 1
    `
  },
  {
    name: "fact_visit",
    sql: `
      SELECT cod_visita_bk AS business_key, COUNT(*) AS repetitions
      FROM public.fact_visit
      GROUP BY cod_visita_bk
      HAVING COUNT(*) > 1
    `
  },
  {
    name: "fact_opportunity",
    sql: `
      SELECT cod_oportunidad_bk AS business_key, COUNT(*) AS repetitions
      FROM public.fact_opportunity
      GROUP BY cod_oportunidad_bk
      HAVING COUNT(*) > 1
    `
  },
  {
    name: "fact_reservation",
    sql: `
      SELECT cod_reserva_bk AS business_key, COUNT(*) AS repetitions
      FROM public.fact_reservation
      GROUP BY cod_reserva_bk
      HAVING COUNT(*) > 1
    `
  },
  {
    name: "fact_operation",
    sql: `
      SELECT cod_operacion_bk AS business_key, COUNT(*) AS repetitions
      FROM public.fact_operation
      GROUP BY cod_operacion_bk
      HAVING COUNT(*) > 1
    `
  },
  {
    name: "fact_stage_changes",
    sql: `
      SELECT cod_transaccion_bk AS business_key, COUNT(*) AS repetitions
      FROM public.fact_stage_changes
      GROUP BY cod_transaccion_bk
      HAVING COUNT(*) > 1
    `
  },
  {
    name: "fact_closing",
    sql: `
      SELECT cod_cierre_bk AS business_key, COUNT(*) AS repetitions
      FROM public.fact_closing
      GROUP BY cod_cierre_bk
      HAVING COUNT(*) > 1
    `
  }
];

async function main() {
  for (const check of checks) {
    const result = await pool.query(check.sql);
    console.log(`\n=== ${check.name} ===`);
    console.log(`Duplicados encontrados: ${result.rowCount}`);

    for (const row of result.rows) {
      console.log(row);
    }
  }

  const freshness = await pool.query(`
    SELECT
      'fact_lead' AS table_name,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE created_at IS NULL) AS null_dates,
      MAX(created_at) AS latest_record
    FROM public.fact_lead

    UNION ALL

    SELECT 'fact_visit', COUNT(*),
      COUNT(*) FILTER (WHERE created_at IS NULL), MAX(created_at)
    FROM public.fact_visit

    UNION ALL

    SELECT 'fact_opportunity', COUNT(*),
      COUNT(*) FILTER (WHERE created_at IS NULL), MAX(created_at)
    FROM public.fact_opportunity

    UNION ALL

    SELECT 'fact_reservation', COUNT(*),
      COUNT(*) FILTER (WHERE created_at IS NULL), MAX(created_at)
    FROM public.fact_reservation

    UNION ALL

    SELECT 'fact_operation', COUNT(*),
      COUNT(*) FILTER (WHERE created_at IS NULL), MAX(created_at)
    FROM public.fact_operation

    UNION ALL

    SELECT 'fact_stage_changes', COUNT(*),
      COUNT(*) FILTER (WHERE created_at IS NULL), MAX(created_at)
    FROM public.fact_stage_changes

    UNION ALL

    SELECT 'fact_closing', COUNT(*),
      COUNT(*) FILTER (WHERE created_at IS NULL), MAX(created_at)
    FROM public.fact_closing;
  `);

  console.log("\n=== FRESCURA DE DATOS ===");
  console.table(freshness.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
