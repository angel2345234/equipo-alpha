import { pool } from "../db";

async function main() {
  try {
    console.log("\n=== 1. IDENTIFICADORES Y TRAZABILIDAD ===");

    const lineage = await pool.query(`
      SELECT
        COUNT(*) AS total_reservas,
        COUNT(DISTINCT r.id) AS ids_reserva_distintos,
        COUNT(DISTINCT r.idempotency_key) AS claves_idempotencia_distintas,
        COUNT(DISTINCT r.opportunity_id) AS oportunidades_distintas,
        COUNT(DISTINCT r.asset_id) AS inmuebles_distintos,
        COUNT(DISTINCT r.source_reservation_id) AS origenes_distintos
      FROM (
        SELECT
          id,
          idempotency_key,
          opportunity_id,
          asset_id,
          id AS source_reservation_id
        FROM crm.reservations
      ) r
    `);

    console.table(lineage.rows);

    console.log("\n=== 2. RELACIONES COMERCIALES POR RESERVA ===");

    const relations = await pool.query(`
      SELECT
        r.status AS estado_reserva,
        CASE
          WHEN o.id IS NULL THEN 'SIN_OPORTUNIDAD'
          ELSE 'OPORTUNIDAD_EXISTENTE'
        END AS relacion_oportunidad,
        CASE
          WHEN a.id IS NULL THEN 'SIN_INMUEBLE'
          ELSE 'INMUEBLE_EXISTENTE'
        END AS relacion_inmueble,
        o.stage AS etapa_oportunidad,
        o.amount AS monto_oportunidad,
        o.currency AS moneda_oportunidad,
        a.status AS estado_inmueble,
        a.commercial_status AS estado_comercial_inmueble,
        a.price AS precio_inmueble,
        a.currency AS moneda_inmueble,
        CASE
          WHEN o.currency IS NULL OR a.currency IS NULL THEN 'MONEDA_NO_DISPONIBLE'
          WHEN o.currency = a.currency THEN 'MISMA_MONEDA'
          ELSE 'MONEDAS_DIFERENTES'
        END AS validacion_moneda
      FROM crm.reservations r
      LEFT JOIN crm.opportunities o
        ON o.id = r.opportunity_id
      LEFT JOIN inventory.assets a
        ON a.id = r.asset_id
      ORDER BY r.created_at
    `);

    console.table(relations.rows);

    console.log("\n=== 3. RESERVAS CON OPERACIÓN ASOCIADA ===");

    const operations = await pool.query(`
      SELECT
        COUNT(*) AS total_reservas,
        COUNT(op.id) AS reservas_con_operacion,
        COUNT(*) FILTER (
          WHERE op.id IS NULL
        ) AS reservas_sin_operacion,
        COUNT(*) FILTER (
          WHERE op.id IS NOT NULL
            AND r.status <> 'CONVERTED'
        ) AS operaciones_con_estado_reserva_inconsistente
      FROM crm.reservations r
      LEFT JOIN crm.operations op
        ON op.source_reservation_id = r.id
    `);

    console.table(operations.rows);

  } catch (error) {
    console.error("Error en inspección:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();