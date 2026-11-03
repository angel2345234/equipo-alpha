import { readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../db";

async function migrateIngestionContract() {
  const migrationPath = path.resolve(
    __dirname,
    "../db/migrations/004_ingestion_contract.sql",
  );

  try {
    const migration = await readFile(migrationPath, "utf8");
    await pool.query(migration);
    console.log("Contrato de ingesta ALP5-003 aplicado correctamente.");
  } catch (error: unknown) {
    console.error("No se pudo aplicar la migración ALP5-003:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void migrateIngestionContract();
