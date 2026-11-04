import { readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../db";

async function migrateKnowledgeFreshness() {
  const migrationPath = path.resolve(
    __dirname,
    "../db/migrations/006_knowledge_freshness_provenance.sql",
  );

  try {
    const migration = (await readFile(migrationPath, "utf8")).replace(/^\uFEFF/, "");
    await pool.query(migration);
    console.log("Migración ALP5-006 aplicada correctamente.");
  } catch (error: unknown) {
    console.error("No se pudo aplicar la migración ALP5-006:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void migrateKnowledgeFreshness();
