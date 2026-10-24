import { pool } from "../db";

async function main() {
  const client = await pool.connect();
  try {
    console.log("\n=======================================================");
    console.log("  VERIFICACIÓN QA DATA FOUNDATION (ALP4-001 / 002 / 003)");
    console.log("  Célula Alpha - Validación de Integridad Analítica");
    console.log("=======================================================\n");

    let allChecksPassed = true;

    // Check 1: Esquema analytics
    const schemaRes = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'analytics';
    `);
    const schemaOk = schemaRes.rows.length > 0;
    console.log(`1. [SCHEMA] Esquema 'analytics' existe: ${schemaOk ? "✅ OK" : "❌ FALLÓ"}`);
    if (!schemaOk) allChecksPassed = false;

    // Check 2: Tablas de dimensiones requeridas
    const requiredTables = ["dim_date", "dim_geography", "dim_advisor", "dim_source", "dim_asset"];
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'analytics';
    `);
    const existingTables = new Set(tablesRes.rows.map((r: any) => r.table_name));

    console.log("\n2. [TABLES] Verificación de Dimensiones Core:");
    for (const t of requiredTables) {
      const exists = existingTables.has(t);
      console.log(`   - analytics.${t}: ${exists ? "✅ Presente" : "❌ Faltante"}`);
      if (!exists) allChecksPassed = false;
    }

    // Check 3: Verificación de Fallback Unknown Record (Key = -1)
    console.log("\n3. [INTEGRITY] Verificación de Registro Desconocido (-1):");
    const fallbackQueries = [
      { name: "dim_date", sql: "SELECT COUNT(*) FROM analytics.dim_date WHERE date_key = -1" },
      { name: "dim_geography", sql: "SELECT COUNT(*) FROM analytics.dim_geography WHERE geography_key = -1" },
      { name: "dim_advisor", sql: "SELECT COUNT(*) FROM analytics.dim_advisor WHERE advisor_key = -1" },
      { name: "dim_source", sql: "SELECT COUNT(*) FROM analytics.dim_source WHERE source_key = -1" },
      { name: "dim_asset", sql: "SELECT COUNT(*) FROM analytics.dim_asset WHERE asset_key = -1" },
    ];

    for (const f of fallbackQueries) {
      if (existingTables.has(f.name)) {
        const res = await client.query(f.sql);
        const hasFallback = parseInt(res.rows[0].count, 10) > 0;
        console.log(`   - ${f.name} (Key -1): ${hasFallback ? "✅ Presente" : "❌ Faltante"}`);
        if (!hasFallback) allChecksPassed = false;
      }
    }

    // Check 4: Conteos y Grano
    console.log("\n4. [COUNTS] Resumen de Población de Dimensiones:");
    const summaryData: any[] = [];
    for (const t of requiredTables) {
      if (existingTables.has(t)) {
        const countRes = await client.query(`SELECT COUNT(*) AS total FROM analytics.${t}`);
        summaryData.push({
          Dimension: `analytics.${t}`,
          TotalFilas: countRes.rows[0].total,
          Estado: parseInt(countRes.rows[0].total, 10) > 0 ? "POBLADA" : "VACÍA",
        });
      }
    }
    console.table(summaryData);

    // Check 5: Unicidad de Claves de Negocio (No Duplicados)
    console.log("5. [KEYS] Unicidad de Claves Naturales:");
    const uniquenessChecks = [
      { name: "dim_advisor", col: "advisor_id" },
      { name: "dim_asset", col: "asset_id" },
      { name: "dim_source", col: "source_code" },
    ];

    for (const u of uniquenessChecks) {
      if (existingTables.has(u.name)) {
        const dupRes = await client.query(`
          SELECT ${u.col}, COUNT(*) 
          FROM analytics.${u.name} 
          GROUP BY ${u.col} 
          HAVING COUNT(*) > 1;
        `);
        const noDuplicates = dupRes.rows.length === 0;
        console.log(`   - ${u.name}.${u.col} sin duplicados: ${noDuplicates ? "✅ OK" : "❌ DUPLICADOS DETECTADOS"}`);
        if (!noDuplicates) allChecksPassed = false;
      }
    }

    console.log("\n=======================================================");
    if (allChecksPassed) {
      console.log("  RESULTADO FINAL: ✅ TODOS LOS CHECKS PASARON CON ÉXITO");
      console.log("  Data Foundation lista para Sprint 2 (Facts Comerciales)");
    } else {
      console.log("  RESULTADO FINAL: ❌ EXISTEN CHECKS NO SUPERADOS");
      process.exitCode = 1;
    }
    console.log("=======================================================\n");

  } catch (error) {
    console.error("[ERROR] Excepción durante la verificación:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
