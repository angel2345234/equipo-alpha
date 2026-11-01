import { pool } from "../db";

async function main() {
  const queries = [
    {
      name: "Fechas de leads",
      sql: `
        SELECT DISTINCT f.id_fecha_captacion_sk AS clave
        FROM public.fact_lead f
        LEFT JOIN analytics.dim_date d
          ON d.date_key = f.id_fecha_captacion_sk
        WHERE f.id_fecha_captacion_sk IS NOT NULL
          AND d.date_key IS NULL
      `,
    },
    {
      name: "Fechas de visitas",
      sql: `
        SELECT DISTINCT f.id_fecha_visita_sk AS clave
        FROM public.fact_visit f
        LEFT JOIN analytics.dim_date d
          ON d.date_key = f.id_fecha_visita_sk
        WHERE f.id_fecha_visita_sk IS NOT NULL
          AND d.date_key IS NULL
      `,
    },
    {
      name: "Fechas de oportunidades",
      sql: `
        SELECT DISTINCT f.id_fecha_apertura_sk AS clave
        FROM public.fact_opportunity f
        LEFT JOIN analytics.dim_date d
          ON d.date_key = f.id_fecha_apertura_sk
        WHERE f.id_fecha_apertura_sk IS NOT NULL
          AND d.date_key IS NULL
      `,
    },
    {
      name: "Asesores de leads",
      sql: `
        SELECT DISTINCT f.id_vendedor_asignado_sk AS clave
        FROM public.fact_lead f
        LEFT JOIN analytics.dim_advisor d
          ON d.id = f.id_vendedor_asignado_sk
        WHERE f.id_vendedor_asignado_sk IS NOT NULL
          AND d.id IS NULL
      `,
    },
    {
      name: "Asesores de visitas",
      sql: `
        SELECT DISTINCT f.id_vendedor_sk AS clave
        FROM public.fact_visit f
        LEFT JOIN analytics.dim_advisor d
          ON d.id = f.id_vendedor_sk
        WHERE f.id_vendedor_sk IS NOT NULL
          AND d.id IS NULL
      `,
    },
    {
      name: "Asesores de oportunidades",
      sql: `
        SELECT DISTINCT f.id_vendedor_sk AS clave
        FROM public.fact_opportunity f
        LEFT JOIN analytics.dim_advisor d
          ON d.id = f.id_vendedor_sk
        WHERE f.id_vendedor_sk IS NOT NULL
          AND d.id IS NULL
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
