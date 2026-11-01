import { pool } from "../db";

async function main() {
  const queries = [
    {
      name: "Lead",
      sql: `
        SELECT
          cod_lead_bk,
          id_fecha_captacion_sk,
          id_vendedor_asignado_sk
        FROM public.fact_lead
        WHERE id_vendedor_asignado_sk = 12
      `,
    },
    {
      name: "Visita",
      sql: `
        SELECT
          cod_visita_bk,
          id_fecha_visita_sk,
          id_vendedor_sk
        FROM public.fact_visit
        WHERE id_vendedor_sk = 12
      `,
    },
    {
      name: "Oportunidad",
      sql: `
        SELECT
          cod_oportunidad_bk,
          id_fecha_apertura_sk,
          id_vendedor_sk
        FROM public.fact_opportunity
        WHERE id_vendedor_sk = 12
      `,
    },
  ];

  for (const query of queries) {
    const result = await pool.query(query.sql);
    console.log(`\n${query.name}:`);
    console.table(result.rows);
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
