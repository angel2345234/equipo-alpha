import { pool } from "./src/db";

async function main() {
  const client = await pool.connect();

  const checks = [
    {
      name: "DUPLICADOS EN FACT_LEAD",
      sql: `
        SELECT cod_lead_bk, COUNT(*)::int AS total
        FROM public.fact_lead
        GROUP BY cod_lead_bk
        HAVING COUNT(*) > 1;
      `
    },
    {
      name: "DUPLICADOS EN FACT_VISIT",
      sql: `
        SELECT cod_visita_bk, COUNT(*)::int AS total
        FROM public.fact_visit
        GROUP BY cod_visita_bk
        HAVING COUNT(*) > 1;
      `
    },
    {
      name: "DUPLICADOS EN FACT_OPPORTUNITY",
      sql: `
        SELECT cod_oportunidad_bk, COUNT(*)::int AS total
        FROM public.fact_opportunity
        GROUP BY cod_oportunidad_bk
        HAVING COUNT(*) > 1;
      `
    },
    {
      name: "DUPLICADOS EN FACT_RESERVATION",
      sql: `
        SELECT cod_reserva_bk, COUNT(*)::int AS total
        FROM public.fact_reservation
        GROUP BY cod_reserva_bk
        HAVING COUNT(*) > 1;
      `
    },
    {
      name: "DUPLICADOS EN FACT_OPERATION",
      sql: `
        SELECT cod_operacion_bk, COUNT(*)::int AS total
        FROM public.fact_operation
        GROUP BY cod_operacion_bk
        HAVING COUNT(*) > 1;
      `
    },
    {
      name: "DUPLICADOS EN FACT_STAGE_CHANGES",
      sql: `
        SELECT cod_transaccion_bk, COUNT(*)::int AS total
        FROM public.fact_stage_changes
        GROUP BY cod_transaccion_bk
        HAVING COUNT(*) > 1;
      `
    },
    {
      name: "DUPLICADOS EN FACT_CLOSING",
      sql: `
        SELECT cod_cierre_bk, COUNT(*)::int AS total
        FROM public.fact_closing
        GROUP BY cod_cierre_bk
        HAVING COUNT(*) > 1;
      `
    }
  ];

  try {
    for (const check of checks) {
      console.log(`\n=== ${check.name} ===`);

      const result = await client.query(check.sql);

      console.table(result.rows);
      console.log("Duplicados encontrados:", result.rowCount);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
