import fs from "node:fs";
import path from "node:path";
import { pool } from "../db";
import { AGGREGATES, PII_COLUMN_PATTERN, XeniaAggregatesService } from "../modules/xenia/xenia-aggregates.service";

/**
 * ALP5-010: aplica la migración 007 y verifica los XENIA Safe Aggregates.
 *
 *   1. Guardia PII: ninguna vista tiene columnas de datos personales.
 *   2. Reconciliación de inventario: la suma de la vista = activos publicados en OLTP.
 *   3. Reconciliación de leads: cada grupo coincide con la fuente, y los grupos
 *      con menos de 3 leads están ocultos (k-anonimidad).
 *
 * Termina con código 1 si alguna verificación falla.
 */
async function main() {
  const failures: string[] = [];
  const check = (ok: boolean, label: string) => {
    console.log(`  ${ok ? "✅" : "❌"} ${label}`);
    if (!ok) failures.push(label);
  };

  try {
    console.log("\n=======================================================");
    console.log("  XENIA SAFE AGGREGATES (ALP5-010)");
    console.log("=======================================================\n");

    // 0. Migración idempotente
    const migrationPath = path.resolve(__dirname, "../db/migrations/007_create_xenia_safe_aggregates.sql");
    await pool.query(fs.readFileSync(migrationPath, "utf-8"));
    console.log("[MIGRATION] 007_create_xenia_safe_aggregates.sql aplicada\n");

    // 1. Guardia PII sobre las columnas de las vistas
    console.log("[1] Guardia PII");
    for (const def of Object.values(AGGREGATES)) {
      const [schema, view] = def.view.split(".");
      const { rows } = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
        [schema, view],
      );
      const pii = rows.map((r) => r.column_name).filter((c: string) => PII_COLUMN_PATTERN.test(c));
      check(pii.length === 0, `${def.view}: ${rows.length} columnas, 0 de PII${pii.length ? ` (encontradas: ${pii.join(", ")})` : ""}`);
    }

    // 2. Reconciliación de inventario
    console.log("\n[2] Inventario por zona vs inventory.assets");
    const inv = await XeniaAggregatesService.getInventoryByZone();
    console.table(inv.data.map((r: any) => ({
      ciudad: r.city, distrito: r.district, tipo: r.asset_type,
      publicados: r.count_published, disponibles: r.count_available,
      min_usd: r.min_price_usd, max_usd: r.max_price_usd,
    })));
    const viewTotal = inv.data.reduce((s: number, r: any) => s + r.count_published, 0);
    const { rows: src } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM inventory.assets WHERE publication_status = 'PUBLISHED'`,
    );
    check(viewTotal === src[0].n, `Publicados en la vista (${viewTotal}) = publicados en OLTP (${src[0].n})`);

    // 3. Reconciliación de leads, grupo por grupo
    console.log("\n[3] Demanda de leads vs crm.leads (k = 3)");
    const demand = await XeniaAggregatesService.getLeadDemand();
    console.table(demand.data.map((r: any) => ({
      mes: r.month, canal: r.source, distrito: r.district, tipo: r.asset_type,
      oculto: r.is_suppressed, leads: r.count_leads, calificados: r.count_qualified,
    })));
    const { rows: raw } = await pool.query(`
      SELECT to_char(l.created_at AT TIME ZONE 'America/Lima','YYYY-MM') AS month,
             COALESCE(l.source,'UNKNOWN') AS source,
             COALESCE(p.district,'SIN DISTRITO') AS district,
             COALESCE(a.type,'SIN ACTIVO') AS asset_type,
             COUNT(*)::int AS n
      FROM crm.leads l
      LEFT JOIN inventory.assets a ON a.id = l.asset_id
      LEFT JOIN inventory.projects p ON p.id = a.project_id
      WHERE COALESCE(l.status,'') <> 'TEST'
        AND COALESCE(l.email,'') NOT ILIKE '%@test.com'
        AND COALESCE(l.email,'') NOT ILIKE '%@example.com'
      GROUP BY 1,2,3,4`);
    const key = (r: any) => `${r.month}|${r.source}|${r.district}|${r.asset_type}`;
    const viewByKey = new Map(demand.data.map((r: any) => [key(r), r]));
    let mismatches = 0;
    let suppressed = 0;
    for (const r of raw) {
      const v: any = viewByKey.get(key(r));
      const expectedSuppressed = r.n < 3;
      const ok = v && v.is_suppressed === expectedSuppressed &&
        (expectedSuppressed ? v.count_leads === null : v.count_leads === r.n);
      if (!ok) mismatches++;
      if (expectedSuppressed) suppressed++;
    }
    check(raw.length === demand.data.length, `Grupos en la vista (${demand.data.length}) = grupos en la fuente (${raw.length})`);
    check(mismatches === 0, `Conteos coinciden con la fuente (${mismatches} diferencias)`);
    console.log(`     Grupos ocultos por k-anonimidad: ${suppressed}`);

    console.log("\n[PROVENANCE] inventory-by-zone:", JSON.stringify(inv.provenance, null, 2));

    console.log("\n=======================================================");
    console.log(failures.length === 0
      ? "  RESULTADO: ✅ Agregados seguros y reconciliados"
      : `  RESULTADO: ❌ ${failures.length} verificación(es) fallida(s)`);
    console.log("=======================================================\n");
    if (failures.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error("[ERROR] Falló la verificación de agregados:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
