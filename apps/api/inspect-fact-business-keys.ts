import { pool } from "./src/db";

async function main() {
  const checks = [
    {
      title: "CLAVES DE LEADS",
      sql: `
        SELECT cod_lead_bk AS clave
        FROM public.fact_lead
        LIMIT 10
      `
    },
    {
      title: "IDS DE LEADS",
      sql: `
        SELECT id AS clave
        FROM crm.leads
        ORDER BY created_at DESC
        LIMIT 10
      `
    },
    {
      title: "CLAVES DE VISITAS",
      sql: `
        SELECT cod_visita_bk AS clave
        FROM public.fact_visit
        LIMIT 10
      `
    },
    {
      title: "IDS DE VISITAS",
      sql: `
        SELECT id AS clave
        FROM crm.visits
        LIMIT 10
      `
    },
    {
      title: "CLAVES DE OPORTUNIDADES",
      sql: `
        SELECT cod_oportunidad_bk AS clave
        FROM public.fact_opportunity
        LIMIT 10
      `
    },
    {
      title: "IDS DE OPORTUNIDADES",
      sql: `
        SELECT id AS clave
        FROM crm.opportunities
        ORDER BY created_at DESC
        LIMIT 10
      `
    },
    {
      title: "CLAVES DE OPERACIONES",
      sql: `
        SELECT cod_operacion_bk AS clave
        FROM public.fact_operation
        LIMIT 10
      `
    }
  ];

  try {
    for (const item of checks) {
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
