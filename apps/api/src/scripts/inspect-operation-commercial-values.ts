import { pool } from "../db";

async function main() {
  try {
    console.log("\n=== 1. OPERACIONES REGISTRADAS ===");

    const operations = await pool.query(`
      SELECT
        COUNT(*) AS total_operaciones,
        COUNT(source_reservation_id) AS con_reserva_origen,
        COUNT(opportunity_id) AS con_oportunidad,
        COUNT(asset_id) AS con_inmueble
      FROM crm.operations
    `);

    console.table(operations.rows);

    console.log("\n=== 2. ESTADOS DE LAS OPERACIONES ===");

    const statuses = await pool.query(`
      SELECT status, COUNT(*) AS total
      FROM crm.operations
      GROUP BY status
      ORDER BY status
    `);

    console.table(statuses.rows);

    console.log("\n=== 3. VALORES COMERCIALES ASOCIADOS ===");

    const values = await pool.query(`
      SELECT
        COUNT(*) AS total_operaciones,
        COUNT(o.amount) AS oportunidades_con_monto,
        COUNT(a.price) AS inmuebles_con_precio,
        COUNT(*) FILTER (
          WHERE o.amount IS NOT NULL AND a.price IS NOT NULL
        ) AS con_ambos_valores,
        COUNT(*) FILTER (
          WHERE o.currency IS NOT NULL AND a.currency IS NOT NULL
            AND o.currency <> a.currency
        ) AS monedas_diferentes
      FROM crm.operations op
      LEFT JOIN crm.opportunities o
        ON o.id = op.opportunity_id
      LEFT JOIN inventory.assets a
        ON a.id = op.asset_id
    `);

    console.table(values.rows);

    console.log("\n=== 4. RESUMEN DE IMPORTES POR MONEDA ===");

    const amounts = await pool.query(`
      SELECT
        o.currency AS moneda_oportunidad,
        a.currency AS moneda_inmueble,
        COUNT(*) AS total_operaciones,
        MIN(o.amount) AS monto_oportunidad_minimo,
        MAX(o.amount) AS monto_oportunidad_maximo,
        MIN(a.price) AS precio_inmueble_minimo,
        MAX(a.price) AS precio_inmueble_maximo
      FROM crm.operations op
      LEFT JOIN crm.opportunities o
        ON o.id = op.opportunity_id
      LEFT JOIN inventory.assets a
        ON a.id = op.asset_id
      GROUP BY o.currency, a.currency
      ORDER BY o.currency, a.currency
    `);

    console.table(amounts.rows);

  } catch (error) {
    console.error("Error en inspección:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();