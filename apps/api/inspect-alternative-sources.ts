import { pool } from "./src/db";

async function main() {
  const checks = [
    {
      title: "OPERACIONES DEL ESQUEMA operation",
      sql: `
        SELECT
          code,
          id,
          reservation_id
        FROM operation.operations
        ORDER BY code
        LIMIT 20
      `
    },
    {
      title: "HECHOS DE OPERACIONES ANALYTICS",
      sql: `
        SELECT id, operation_code
        FROM analytics.fact_operations
        ORDER BY id
        LIMIT 20
      `
    },
    {
      title: "EVENTOS COMERCIALES ANALYTICS",
      sql: `
        SELECT id, event_code, event_type, operation_id
        FROM analytics.fact_commercial_events
        ORDER BY id
        LIMIT 20
      `
    },
    {
      title: "PROCEDENCIA DE LOS HECHOS PUBLIC",
      sql: `
        SELECT 'lead' AS entidad, cod_lead_bk AS codigo,
               source_system
        FROM public.fact_lead
        UNION ALL
        SELECT 'operation', cod_operacion_bk, source_system
        FROM public.fact_operation
      `
    },
    {
      title: "CONTEOS DE FUENTES",
      sql: `
        SELECT 'operation.operations' AS fuente, COUNT(*) AS total
        FROM operation.operations
        UNION ALL
        SELECT 'finance.commercial_commissions', COUNT(*)
        FROM finance.commercial_commissions
        UNION ALL
        SELECT 'analytics.fact_operations', COUNT(*)
        FROM analytics.fact_operations
        UNION ALL
        SELECT 'analytics.fact_commercial_events', COUNT(*)
        FROM analytics.fact_commercial_events
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
