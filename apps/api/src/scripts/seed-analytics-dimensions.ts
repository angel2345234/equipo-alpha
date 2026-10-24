import fs from "node:fs";
import path from "node:path";
import { pool } from "../db";
import { DimensionsService } from "../modules/analytics/dimensions.service";

async function main() {
  const client = await pool.connect();
  try {
    console.log("\n=======================================================");
    console.log("  INICIALIZACIÓN DE DATA FOUNDATION - FASE 4 ALPHA");
    console.log("  Tickets: ALP4-001 | ALP4-002 | ALP4-003");
    console.log("=======================================================\n");

    // 1. Ejecutar migración SQL 003
    const migrationPath = path.resolve(__dirname, "../db/migrations/003_create_analytics_schema_and_dimensions.sql");
    console.log(`[MIGRATION] Leyendo ${migrationPath}...`);
    const sql = fs.readFileSync(migrationPath, "utf-8");

    console.log("[MIGRATION] Aplicando migración 003 en base de datos...");
    await client.query(sql);
    console.log("[MIGRATION] ¡Esquema analytics y tablas de dimensiones creadas con éxito!");

    // 2. Poblar y sincronizar datos de dimensiones
    await DimensionsService.runFullDimensionsSync();

    console.log("\n[SUCCESS] Data Foundation inicializada correctamente para Sprint 1.\n");
  } catch (error) {
    console.error("[ERROR] Falló la inicialización analítica:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
