import { pool } from "./src/db";

async function main() {
  const client = await pool.connect();

  const checks = [
    {
      name: "PROBABILIDAD FUERA DEL RANGO 0 A 1",
      sql: `
        SELECT cod_oportunidad_bk, probabilidad_cierre
        FROM public.fact_opportunity
        WHERE probabilidad_cierre < 0
           OR probabilidad_cierre > 1;
      `
    },
    {
      name: "DURACIONES NEGATIVAS EN VISITAS",
      sql: `
        SELECT cod_visita_bk, duracion_minutos
        FROM public.fact_visit
        WHERE duracion_minutos < 0;
      `
    },
    {
      name: "DÍAS NEGATIVOS EN PIPELINE",
      sql: `
        SELECT cod_oportunidad_bk, dias_en_pipeline
        FROM public.fact_opportunity
        WHERE dias_en_pipeline < 0;
      `
    },
    {
      name: "DÍAS DE VALIDEZ NEGATIVOS",
      sql: `
        SELECT cod_reserva_bk, dias_validez_reserva
        FROM public.fact_reservation
        WHERE dias_validez_reserva < 0;
      `
    },
    {
      name: "TIEMPOS NEGATIVOS EN CAMBIOS DE ETAPA",
      sql: `
        SELECT cod_transaccion_bk,
               tiempo_permanencia_etapa_anterior_segundos
        FROM public.fact_stage_changes
        WHERE tiempo_permanencia_etapa_anterior_segundos < 0;
      `
    },
    {
      name: "MONTOS NEGATIVOS EN OPORTUNIDADES",
      sql: `
        SELECT cod_oportunidad_bk, monto_oportunidad, monto_ponderado
        FROM public.fact_opportunity
        WHERE monto_oportunidad < 0
           OR monto_ponderado < 0;
      `
    },
    {
      name: "MONTOS NEGATIVOS EN RESERVAS",
      sql: `
        SELECT cod_reserva_bk, monto_reserva, monto_total_venta
        FROM public.fact_reservation
        WHERE monto_reserva < 0
           OR monto_total_venta < 0;
      `
    },
    {
      name: "MONTOS NEGATIVOS EN OPERACIONES",
      sql: `
        SELECT cod_operacion_bk,
               monto_bruto,
               monto_descuento,
               monto_neto_operacion
        FROM public.fact_operation
        WHERE monto_bruto < 0
           OR monto_descuento < 0
           OR monto_neto_operacion < 0;
      `
    },
    {
      name: "MONTOS NEGATIVOS EN CIERRES",
      sql: `
        SELECT cod_cierre_bk,
               monto_final_cerrado,
               comision_total_generada,
               costos_asociados
        FROM public.fact_closing
        WHERE monto_final_cerrado < 0
           OR comision_total_generada < 0
           OR costos_asociados < 0;
      `
    }
  ];

  const dateTables = [
    "fact_lead",
    "fact_visit",
    "fact_opportunity",
    "fact_reservation",
    "fact_operation",
    "fact_stage_changes",
    "fact_closing"
  ];

  try {
    console.log("\n=== VALIDACIONES NUMÉRICAS ===");

    for (const check of checks) {
      console.log(`\n--- ${check.name} ---`);
      const result = await client.query(check.sql);
      console.table(result.rows);
      console.log("Registros encontrados:", result.rowCount);
    }

    console.log("\n=== FECHAS DE CREACIÓN NULAS ===");

    for (const table of dateTables) {
      const result = await client.query(`
        SELECT COUNT(*)::int AS total
        FROM public.${table}
        WHERE created_at IS NULL;
      `);

      console.log(
        `public.${table}: ${result.rows[0].total} fechas nulas`
      );
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
