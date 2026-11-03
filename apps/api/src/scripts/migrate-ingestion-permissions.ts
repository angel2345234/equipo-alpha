import { readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../db";

async function migrateIngestionPermissions() {
  const migrationPath = path.resolve(
    __dirname,
    "../db/migrations/005_ingestion_permission_metadata.sql",
  );

  try {
    const migration = await readFile(migrationPath, "utf8");
    await pool.query(migration);
    console.log("Metadata de permisos ALP5-004 aplicada correctamente.");
  } catch (error: unknown) {
    console.error("No se pudo aplicar la migración ALP5-004:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void migrateIngestionPermissions();
