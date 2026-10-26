import fs from "node:fs";
import path from "node:path";
import { pool } from "../db";
import { InventorySnapshotService } from "../modules/analytics/inventory-snapshot.service";

/**
 * ALP4-006: Aplica la migración 004 y toma el snapshot diario de inventario.
 *
 * Uso:
 *   tsx src/scripts/run-inventory-snapshot.ts              -> snapshot de hoy (America/Lima)
 *   tsx src/scripts/run-inventory-snapshot.ts 2026-10-26   -> snapshot con fecha indicada
 *
 * Termina con código 1 si la reconciliación contra OLTP falla.
 */
async function main() {
  const dateArg = process.argv[2];

  try {
    console.log("\n=======================================================");
    console.log("  SNAPSHOT DIARIO DE INVENTARIO (ALP4-006)");
    console.log("=======================================================\n");

    // 1. Migración idempotente
    const migrationPath = path.resolve(__dirname, "../db/migrations/004_create_inventory_snapshot.sql");
    console.log("[MIGRATION] Aplicando 004_create_inventory_snapshot.sql...");
    await pool.query(fs.readFileSync(migrationPath, "utf-8"));
    console.log("[MIGRATION] OK");

    // 2. Snapshot
    const summary = await InventorySnapshotService.takeDailySnapshot(dateArg);

    // 3. Reconciliación contra la fuente
    const check = await InventorySnapshotService.checkSnapshot(summary.snapshotDateKey);
    console.log("\n[CHECK] Reconciliación contra inventory.assets:");
    console.table([check]);

    const failures: string[] = [];
    if (check.snapshotRows !== check.oltpAssets) {
      failures.push(`Filas del snapshot (${check.snapshotRows}) ≠ activos en OLTP (${check.oltpAssets})`);
    }
    if (check.unknownAssetRows > 0) {
      failures.push(`${check.unknownAssetRows} fila(s) sin asset_key (cayeron en -1)`);
    }

    console.log("\n=======================================================");
    if (failures.length === 0) {
      console.log("  RESULTADO: ✅ Snapshot reconciliado con la fuente");
      console.log(`  KPI P0-05 disponibilidad: ${check.availabilityRatioPct}% (${check.available}/${check.snapshotRows})`);
    } else {
      console.log("  RESULTADO: ❌ Reconciliación fallida");
      failures.forEach((f) => console.log(`   - ${f}`));
      process.exitCode = 1;
    }
    console.log("=======================================================\n");
  } catch (error) {
    console.error("[ERROR] Falló el snapshot de inventario:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
