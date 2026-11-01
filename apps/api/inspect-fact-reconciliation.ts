import { pool } from "./src/db";

async function main() {
  try {
    const queries = [
      {
        title: "LEADS",
        sql: `
          SELECT
            (SELECT COUNT(*) FROM public.fact_lead) AS fact_total,
            (SELECT COUNT(*) FROM crm.leads) AS source_total,
            (
              SELECT COUNT(*)
              FROM public.fact_lead f
              JOIN crm.leads s
                ON s.id = f.cod_lead_bk
            ) AS matched
        `
      },
      {
        title: "VISITAS",
        sql: `
          SELECT
            (SELECT COUNT(*) FROM public.fact_visit) AS fact_total,
            (SELECT COUNT(*) FROM crm.visits) AS source_total,
            (
              SELECT COUNT(*)
              FROM public.fact_visit f
              JOIN crm.visits s
                ON s.id = f.cod_visita_bk
            ) AS matched
        `
      },
      {
        title: "OPORTUNIDADES",
        sql: `
          SELECT
            (SELECT COUNT(*) FROM public.fact_opportunity) AS fact_total,
            (SELECT COUNT(*) FROM crm.opportunities) AS source_total,
            (
              SELECT COUNT(*)
              FROM public.fact_opportunity f
              JOIN crm.opportunities s
                ON s.id = f.cod_oportunidad_bk
            ) AS matched
        `
      },
      {
        title: "RESERVAS",
        sql: `
          SELECT
            (SELECT COUNT(*) FROM public.fact_reservation) AS fact_total,
            (SELECT COUNT(*) FROM crm.reservations) AS source_total,
            (
              SELECT COUNT(*)
              FROM public.fact_reservation f
              JOIN crm.reservations s
                ON s.id = f.cod_reserva_bk
            ) AS matched
        `
      },
      {
        title: "OPERACIONES",
        sql: `
          SELECT
            (SELECT COUNT(*) FROM public.fact_operation) AS fact_total,
            (SELECT COUNT(*) FROM crm.operations) AS source_total,
            (
              SELECT COUNT(*)
              FROM public.fact_operation f
              JOIN crm.operations s
                ON s.id = f.cod_operacion_bk
            ) AS matched
        `
      }
    ];

    for (const item of queries) {
      const result = await pool.query(item.sql);
      console.log(`\n=== ${item.title} ===`);
      console.table(result.rows);
    }
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
