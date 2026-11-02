import { pool } from "../db";
import { KnowledgeQualityService, QualityReport } from "../modules/xenia/knowledge-quality.service";

/**
 * ALP5-009: prueba de los Knowledge Quality Checks con datos controlados.
 *
 * Crea un esquema temporal (knowledge_qa_fixture) con el diseño de tablas de
 * ALP5-001/002, planta defectos conocidos, verifica que cada check los
 * detecte con el conteo exacto y BORRA el esquema al final.
 * No toca ninguna tabla real.
 */
const FIXTURE = "knowledge_qa_fixture";

async function createFixture() {
  await pool.query(`DROP SCHEMA IF EXISTS ${FIXTURE} CASCADE`);
  await pool.query(`
    CREATE SCHEMA ${FIXTURE};

    CREATE TABLE ${FIXTURE}.knowledge_sources (
      id SERIAL PRIMARY KEY, source_name VARCHAR(255), owner VARCHAR(255),
      type VARCHAR(100), sensitivity VARCHAR(50), validity_date TIMESTAMP,
      permissions TEXT, status VARCHAR(50), origin_url TEXT
    );
    CREATE TABLE ${FIXTURE}.knowledge_documents (
      id SERIAL PRIMARY KEY, source_id INT, title VARCHAR(255), version VARCHAR(50), content TEXT
    );
    -- Sin FK a propósito: simula datos legados que permiten chunks huérfanos
    CREATE TABLE ${FIXTURE}.knowledge_chunks (
      id SERIAL PRIMARY KEY, document_id INT, chunk_index INT, content TEXT
    );

    INSERT INTO ${FIXTURE}.knowledge_sources
      (source_name, owner, type, sensitivity, validity_date, permissions, status, origin_url) VALUES
      ('Guía de compra',        'Legal',     'GUIDE',  'PUBLIC',   now() + interval '1 year', 'ADVISOR', 'ACTIVE',   'https://zenplus.pe/guia'),   -- 1 ok (pero duplicada con 2)
      ('Guía de compra (copia)','Legal',     'GUIDE',  'PUBLIC',   now() + interval '1 year', 'ADVISOR', 'ACTIVE',   ' HTTPS://zenplus.pe/guia '), -- 2 duplicada
      ('Tarifario 2025',        'Comercial', 'PRICES', 'INTERNAL', '2025-01-01',              'ADVISOR', 'ACTIVE',   'https://zenplus.pe/tarifas'),-- 3 vencida y activa
      ('Política interna',      'RRHH',      'POLICY', 'INTERNAL', NULL,                      '',        'ACTIVE',   'https://zenplus.pe/policy'), -- 4 sin permisos
      ('Tarifario 2024',        'Comercial', 'PRICES', 'INTERNAL', '2024-01-01',              'ADVISOR', 'INACTIVE', 'https://zenplus.pe/t2024');  -- 5 vencida pero inactiva: OK

    INSERT INTO ${FIXTURE}.knowledge_documents (source_id, title, version, content) VALUES
      (1, 'Pasos de compra',       '1.0', 'Contenido A'),   -- 1
      (1, 'Pasos de compra (dup)', '1.0', 'Contenido A'),   -- 2 duplicado de 1
      (3, 'Tarifas',               '1.0', 'Contenido B');   -- 3 sin chunks

    INSERT INTO ${FIXTURE}.knowledge_chunks (document_id, chunk_index, content) VALUES
      (1,   0, 'Paso 1'),   -- 1 ok
      (2,   0, 'Paso 1'),   -- 2 ok
      (999, 0, 'Huérfano'), -- 3 huérfano
      (1,   1, '   ');      -- 4 vacío
  `);
}

function expect(report: QualityReport, id: string, status: string, affected: number, failures: string[]) {
  const check = report.checks.find((c) => c.id === id);
  const ok = check?.status === status && check?.affected === affected;
  console.log(`  ${ok ? "✅" : "❌"} ${id}: esperado ${status}/${affected}, obtenido ${check?.status}/${check?.affected}`);
  if (!ok) failures.push(id);
}

async function main() {
  const failures: string[] = [];
  try {
    console.log("\n=== TEST ALP5-009 KNOWLEDGE QUALITY CHECKS ===\n");

    // Caso 1: el modelo no existe -> todo SKIPPED, sin errores
    console.log("[Caso 1] Esquema inexistente → todos los checks SKIPPED");
    const none = await KnowledgeQualityService.runChecks("knowledge_qa_no_existe");
    const allSkipped = none.summary.skipped === none.checks.length;
    console.log(`  ${allSkipped ? "✅" : "❌"} ${none.summary.skipped}/${none.checks.length} SKIPPED`);
    if (!allSkipped) failures.push("caso1");

    // Caso 2: defectos plantados -> cada check los detecta con el conteo exacto
    console.log("\n[Caso 2] Defectos plantados");
    await createFixture();
    const report = await KnowledgeQualityService.runChecks(FIXTURE);
    expect(report, "duplicate_sources", "FAIL", 2, failures);
    expect(report, "duplicate_documents", "FAIL", 2, failures);
    expect(report, "expired_active_sources", "FAIL", 1, failures);
    expect(report, "orphan_chunks", "FAIL", 1, failures);
    expect(report, "documents_without_chunks", "FAIL", 1, failures);
    expect(report, "empty_chunks", "FAIL", 1, failures);
    expect(report, "missing_permissions", "FAIL", 1, failures);
    const blocked = report.passed === false;
    console.log(`  ${blocked ? "✅" : "❌"} passed=false (hay fallas CRITICAL/HIGH)`);
    if (!blocked) failures.push("caso2-passed");

    // Caso 3: sin la columna validity_date -> solo ese check queda SKIPPED
    console.log("\n[Caso 3] Columna faltante → check SKIPPED con motivo");
    await pool.query(`ALTER TABLE ${FIXTURE}.knowledge_sources DROP COLUMN validity_date`);
    const partial = await KnowledgeQualityService.runChecks(FIXTURE);
    expect(partial, "expired_active_sources", "SKIPPED", 0, failures);
    console.log(`     motivo: ${partial.checks.find((c) => c.id === "expired_active_sources")?.reason}`);

    // Caso 4: datos limpios -> todo PASS
    console.log("\n[Caso 4] Datos corregidos → todo PASS");
    await pool.query(`
      DELETE FROM ${FIXTURE}.knowledge_sources WHERE id IN (2, 4);
      ALTER TABLE ${FIXTURE}.knowledge_sources ADD COLUMN validity_date TIMESTAMP;
      DELETE FROM ${FIXTURE}.knowledge_documents WHERE id IN (2, 3);
      DELETE FROM ${FIXTURE}.knowledge_chunks WHERE id IN (2, 3, 4);
    `);
    const clean = await KnowledgeQualityService.runChecks(FIXTURE);
    const allPass = clean.summary.pass === clean.checks.length && clean.passed;
    console.log(`  ${allPass ? "✅" : "❌"} ${clean.summary.pass}/${clean.checks.length} PASS`);
    if (!allPass) failures.push("caso4");
  } catch (error) {
    console.error("[ERROR]", error);
    failures.push("excepcion");
  } finally {
    await pool.query(`DROP SCHEMA IF EXISTS ${FIXTURE} CASCADE`);
    console.log(`\n[CLEANUP] Esquema ${FIXTURE} eliminado`);
    await pool.end();
  }

  console.log("\n=========================================");
  console.log(failures.length === 0 ? "  RESULTADO: ✅ Todas las pruebas pasaron" : `  RESULTADO: ❌ Fallaron: ${failures.join(", ")}`);
  console.log("=========================================\n");
  if (failures.length > 0) process.exitCode = 1;
}

main();
