import { pool } from "../db";

const facts = [
  {
    table: "fact_lead",
    businessKey: "cod_lead_bk",
    required: [
      "id_cliente_sk",
      "id_fecha_captacion_sk",
      "id_canal_origen_sk",
      "id_vendedor_asignado_sk",
      "cod_lead_bk",
      "estado_lead",
      "source_system",
    ],
  },
  {
    table: "fact_visit",
    businessKey: "cod_visita_bk",
    required: [
      "id_cliente_sk",
      "id_vendedor_sk",
      "id_ubicacion_sk",
      "id_fecha_visita_sk",
      "cod_visita_bk",
      "tipo_visita",
      "resultado_visita",
    ],
  },
  {
    table: "fact_opportunity",
    businessKey: "cod_oportunidad_bk",
    required: [
      "id_cliente_sk",
      "id_vendedor_sk",
      "id_producto_sk",
      "id_fecha_apertura_sk",
      "id_fecha_cierre_estimada_sk",
      "cod_oportunidad_bk",
      "etapa_crm",
    ],
  },
  {
    table: "fact_reservation",
    businessKey: "cod_reserva_bk",
    required: [
      "id_cliente_sk",
      "id_vendedor_sk",
      "id_producto_sk",
      "id_fecha_reserva_sk",
      "cod_reserva_bk",
      "estado_reserva",
    ],
  },
  {
    table: "fact_operation",
    businessKey: "cod_operacion_bk",
    required: [
      "id_cliente_sk",
      "id_vendedor_sk",
      "id_producto_sk",
      "id_ubicacion_sk",
      "id_fecha_operacion_sk",
      "cod_operacion_bk",
      "tipo_operacion",
      "source_system",
    ],
  },
  {
    table: "fact_stage_changes",
    businessKey: null,
    required: [
      "id_entidad_sk",
      "id_fecha_cambio_sk",
      "cod_transaccion_bk",
      "etapa_nueva",
      "origen_cambio",
    ],
  },
  {
    table: "fact_closing",
    businessKey: "cod_cierre_bk",
    required: [
      "id_producto_sk",
      "id_ubicacion_sk",
      "id_fecha_cierre_sk",
      "cod_cierre_bk",
      "estado_cierre",
    ],
  },
];

const numericChecks = [
  {
    table: "fact_visit",
    name: "Duración negativa",
    sql: "duracion_minutos < 0",
  },
  {
    table: "fact_visit",
    name: "Cantidad de visitas no positiva",
    sql: "cantidad_visitas <= 0",
  },
  {
    table: "fact_reservation",
    name: "Importes negativos",
    sql: "monto_reserva < 0 OR monto_total_venta < 0",
  },
  {
    table: "fact_reservation",
    name: "Días de validez negativos",
    sql: "dias_validez_reserva < 0",
  },
  {
    table: "fact_opportunity",
    name: "Importe de oportunidad negativo",
    sql: "monto_oportunidad < 0",
  },
  {
    table: "fact_opportunity",
    name: "Probabilidad fuera del rango 0-100",
    sql: "probabilidad_cierre < 0 OR probabilidad_cierre > 100",
  },
  {
    table: "fact_opportunity",
    name: "Monto ponderado negativo o inconsistente",
    sql: "monto_ponderado < 0 OR ABS(monto_ponderado - (monto_oportunidad * probabilidad_cierre / 100)) > 0.01",
  },
  {
    table: "fact_opportunity",
    name: "Días en pipeline negativos",
    sql: "dias_en_pipeline < 0",
  },
  {
    table: "fact_operation",
    name: "Importes negativos",
    sql: "monto_bruto < 0 OR monto_descuento < 0 OR monto_neto_operacion < 0",
  },
  {
    table: "fact_operation",
    name: "Descuento superior al importe bruto",
    sql: "monto_descuento > monto_bruto",
  },
  {
    table: "fact_operation",
    name: "Importe neto inconsistente",
    sql: "ABS(monto_neto_operacion - (monto_bruto - COALESCE(monto_descuento, 0))) > 0.01",
  },
  {
    table: "fact_operation",
    name: "Cantidad de unidades no positiva",
    sql: "cantidad_unidades <= 0",
  },
  {
    table: "fact_closing",
    name: "Importes negativos",
    sql: "monto_final_cerrado < 0 OR comision_total_generada < 0 OR costos_asociados < 0",
  },
  {
    table: "fact_stage_changes",
    name: "Permanencia negativa",
    sql: "tiempo_permanencia_etapa_anterior_segundos < 0",
  },
];

const dimensionChecks = [
  {
    name: "Dimensión de fechas",
    table: "analytics.dim_date",
    key: "date_key",
    facts: [
      { table: "fact_lead", column: "id_fecha_captacion_sk" },
      { table: "fact_visit", column: "id_fecha_visita_sk" },
      { table: "fact_opportunity", column: "id_fecha_apertura_sk" },
    ],
  },
  {
    name: "Dimensión de asesores",
    table: "analytics.dim_advisor",
    key: "id",
    facts: [
      { table: "fact_lead", column: "id_vendedor_asignado_sk" },
      { table: "fact_visit", column: "id_vendedor_sk" },
      { table: "fact_opportunity", column: "id_vendedor_sk" },
    ],
  },
];

async function main() {
  const client = await pool.connect();

  try {
    console.log("\n==============================================");
    console.log(" VERIFICACIÓN DE CALIDAD DE HECHOS ANALÍTICOS");
    console.log(" ALP4-007");
    console.log("==============================================\n");

    let totalIssues = 0;

    for (const fact of facts) {
      console.log(`\n--- ${fact.table} ---`);

      const nullResult = await client.query(`
        SELECT COUNT(*)::int AS total
        FROM public.${fact.table}
        WHERE created_at IS NULL
      `);

      const nullCount = nullResult.rows[0].total;

      console.log(
        `created_at nulo: ${nullCount === 0 ? "OK" : "REVISAR"} (${nullCount})`
      );

      totalIssues += nullCount;

      for (const column of fact.required) {
        const result = await client.query(`
          SELECT COUNT(*)::int AS total
          FROM public.${fact.table}
          WHERE ${column} IS NULL
             OR (
               pg_typeof(${column}) = 'character varying'::regtype
               AND BTRIM(${column}::text) = ''
             )
        `);

        const count = result.rows[0].total;

        if (count > 0) {
          console.log(`Campo ${column}: REVISAR (${count})`);
          totalIssues += count;
        }
      }

      if (fact.businessKey) {
        const duplicateResult = await client.query(`
          SELECT COUNT(*)::int AS total
          FROM (
            SELECT ${fact.businessKey}
            FROM public.${fact.table}
            GROUP BY ${fact.businessKey}
            HAVING COUNT(*) > 1
          ) duplicates
        `);

        const duplicates = duplicateResult.rows[0].total;

        console.log(
          `Duplicados ${fact.businessKey}: ${duplicates}`
        );

        totalIssues += duplicates;
      } else {
        console.log(
          "Unicidad: NO EVALUADA (la clave puede repetirse legítimamente)"
        );
      }

      const countResult = await client.query(`
        SELECT
          COUNT(*)::int AS total,
          MAX(created_at) AS ultima_actualizacion
        FROM public.${fact.table}
      `);

      console.log(
        `Registros: ${countResult.rows[0].total}`
      );

      console.log(
        `Último registro: ${
          countResult.rows[0].ultima_actualizacion ?? "Sin datos"
        }`
      );
    }

    console.log("\n--- VALIDACIONES DE RANGOS NUMÉRICOS ---");

    for (const check of numericChecks) {
      const result = await client.query(`
        SELECT COUNT(*)::int AS total
        FROM public.${check.table}
        WHERE ${check.sql}
      `);

      const count = result.rows[0].total;

      console.log(
        `${check.table} | ${check.name}: ${count === 0 ? "OK" : "REVISAR"} (${count})`
      );

      totalIssues += count;
    }

console.log("\n--- INTEGRIDAD REFERENCIAL DIMENSIONAL ---");

for (const dimension of dimensionChecks) {
  console.log(`\n${dimension.name}`);

  for (const fact of dimension.facts) {
    const result = await client.query(`
      SELECT COUNT(*)::int AS total
      FROM public.${fact.table} f
      LEFT JOIN ${dimension.table} d
        ON d.${dimension.key} = f.${fact.column}
      WHERE f.${fact.column} IS NOT NULL
        AND d.${dimension.key} IS NULL
    `);

    const count = result.rows[0].total;

    console.log(
      `${fact.table}.${fact.column}: ${count === 0 ? "OK" : "REVISAR"} (${count} sin correspondencia)`
    );

    totalIssues += count;
  }
}

    console.log("\n==============================================");
    console.log(`TOTAL DE INCIDENCIAS DETECTADAS: ${totalIssues}`);
    console.log("==============================================\n");
  } catch (error) {
    console.error("Error durante la verificación:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();