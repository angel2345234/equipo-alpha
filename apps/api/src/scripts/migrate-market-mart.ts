import { readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../db";

async function migrateMarketMart() {
  const migrationPath = path.resolve(
    __dirname,
    "../db/migrations/006_market_intelligence_mart.sql",
  );

  try {
    const migration = await readFile(migrationPath, "utf8");
    await pool.query(migration);
    console.log("Market Intelligence Mart ALP5-007 aplicado correctamente.");
  } catch (error: unknown) {
    console.error("No se pudo aplicar la migración ALP5-007:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void migrateMarketMart();
