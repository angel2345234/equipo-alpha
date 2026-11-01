import { pool } from "./src/db";

async function main() {
  const checks = [
    {
      name: "Fechas de leads",
      sql: `
        SELECT COUNT(*) AS total,
          COUNT(d.date_key) AS matched,
          COUNT(*) FILTER (WHERE d.date_key IS NULL) AS unmatched
        FROM public.fact_lead f
        LEFT JOIN analytics.dim_date d
          ON d.date_key = f.id_fecha_captacion_sk
      `
    },
    {
      name: "Fechas de visitas",
      sql: `
        SELECT COUNT(*) AS total,
          COUNT(d.date_key) AS matched,
          COUNT(*) FILTER (WHERE d.date_key IS NULL) AS unmatched
        FROM public.fact_visit f
        LEFT JOIN analytics.dim_date d
          ON d.date_key = f.id_fecha_visita_sk
      `
    },
    {
      name: "Fechas de oportunidades",
      sql: `
        SELECT COUNT(*) AS total,
          COUNT(d.date_key) AS matched,
          COUNT(*) FILTER (WHERE d.date_key IS NULL) AS unmatched
        FROM public.fact_opportunity f
        LEFT JOIN analytics.dim_date d
          ON d.date_key = f.id_fecha_apertura_sk
      `
    },
    {
      name: "Asesores de leads",
      sql: `
        SELECT COUNT(*) AS total,
          COUNT(d.id) AS matched,
          COUNT(*) FILTER (WHERE d.id IS NULL) AS unmatched
        FROM public.fact_lead f
        LEFT JOIN analytics.dim_advisor d
          ON d.id = f.id_vendedor_asignado_sk
      `
    },
    {
      name: "Asesores de visitas",
      sql: `
        SELECT COUNT(*) AS total,
          COUNT(d.id) AS matched,
          COUNT(*) FILTER (WHERE d.id IS NULL) AS unmatched
        FROM public.fact_visit f
        LEFT JOIN analytics.dim_advisor d
          ON d.id = f.id_vendedor_sk
      `
    }
  ];

  for (const check of checks) {
    const result = await pool.query(check.sql);
    console.log(`\n=== ${check.name} ===`);
    console.table(result.rows);
  }

  const dimensions = await pool.query(`
    SELECT 'dim_date' AS dimension, COUNT(*) AS total
    FROM analytics.dim_date
    UNION ALL
    SELECT 'dim_advisor', COUNT(*)
    FROM analytics.dim_advisor
  `);

  console.log("\n=== DIMENSIONES ===");
  console.table(dimensions.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
