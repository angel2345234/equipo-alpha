import { pool } from "../db";

async function main() {
  const client = await pool.connect();

  try {
    console.log("\n=== 1. CALIDAD DE OPORTUNIDADES ===\n");

    const opportunities = await client.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(amount) AS con_monto,
        COUNT(*) FILTER (WHERE amount IS NULL) AS sin_monto,
        COUNT(*) FILTER (WHERE amount < 0) AS montos_negativos,
        COUNT(DISTINCT currency) AS monedas_distintas
      FROM crm.opportunities;
    `);

    console.table(opportunities.rows);

    const currencies = await client.query(`
      SELECT currency, COUNT(*) AS total
      FROM crm.opportunities
      GROUP BY currency
      ORDER BY currency;
    `);

    console.log("\nMonedas de oportunidades:");
    console.table(currencies.rows);

    console.log("\n=== 2. CALIDAD DE INMUEBLES ===\n");

    const assets = await client.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(price) AS con_precio,
        COUNT(*) FILTER (WHERE price IS NULL) AS sin_precio,
        COUNT(*) FILTER (WHERE price < 0) AS precios_negativos,
        COUNT(DISTINCT currency) AS monedas_distintas
      FROM inventory.assets;
    `);

    console.table(assets.rows);

    const assetCurrencies = await client.query(`
      SELECT currency, COUNT(*) AS total
      FROM inventory.assets
      GROUP BY currency
      ORDER BY currency;
    `);

    console.log("\nMonedas de inmuebles:");
    console.table(assetCurrencies.rows);

    console.log("\n=== 3. CALIDAD DE UNIDADES ===\n");

    const units = await client.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(asset_id) AS asociadas_a_inmueble,
        COUNT(*) FILTER (WHERE asset_id IS NULL) AS sin_inmueble,
        COUNT(price) AS con_precio,
        COUNT(current_price) AS con_precio_actual,
        COUNT(*) FILTER (WHERE price < 0) AS precios_negativos,
        COUNT(*) FILTER (WHERE current_price < 0) AS precios_actuales_negativos
      FROM inventory.units;
    `);

    console.table(units.rows);

    console.log("\n=== 4. RELACIÓN ENTRE RESERVAS, OPORTUNIDADES E INMUEBLES ===\n");

    const reservations = await client.query(`
      SELECT
        COUNT(*) AS total_reservas,
        COUNT(o.id) AS con_oportunidad_existente,
        COUNT(a.id) AS con_inmueble_existente,
        COUNT(*) FILTER (WHERE o.amount IS NOT NULL) AS oportunidad_con_monto,
        COUNT(*) FILTER (WHERE o.amount IS NULL) AS oportunidad_sin_monto
      FROM crm.reservations r
      LEFT JOIN crm.opportunities o ON o.id = r.opportunity_id
      LEFT JOIN inventory.assets a ON a.id = r.asset_id;
    `);

    console.table(reservations.rows);

    console.log("\n=== 5. RELACIÓN ENTRE UNIDADES E INMUEBLES ===\n");

    const unitRelations = await client.query(`
      SELECT
        COUNT(*) AS total_unidades,
        COUNT(a.id) AS inmueble_existente,
        COUNT(*) FILTER (WHERE a.id IS NULL) AS inmueble_no_encontrado
      FROM inventory.units u
      LEFT JOIN inventory.assets a ON a.id = u.asset_id;
    `);

    console.table(unitRelations.rows);

  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("Error durante el diagnóstico:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });