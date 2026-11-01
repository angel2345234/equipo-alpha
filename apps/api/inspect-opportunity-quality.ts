import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE probabilidad_cierre IS NULL
             OR probabilidad_cierre < 0
             OR probabilidad_cierre > 100
        )::int AS probabilidades_invalidas,
        COUNT(*) FILTER (
          WHERE monto_ponderado IS NULL
             OR ABS(
               monto_ponderado -
               (monto_oportunidad * probabilidad_cierre / 100)
             ) > 0.01
        )::int AS montos_ponderados_inconsistentes
      FROM public.fact_opportunity;
    `);

    console.table(result.rows);

    const details = await pool.query(`
      SELECT
        cod_oportunidad_bk,
        monto_oportunidad,
        probabilidad_cierre,
        monto_ponderado,
        ROUND(
          monto_oportunidad * probabilidad_cierre / 100,
          2
        ) AS monto_ponderado_esperado
      FROM public.fact_opportunity
      WHERE probabilidad_cierre IS NULL
         OR probabilidad_cierre < 0
         OR probabilidad_cierre > 100
         OR monto_ponderado IS NULL
         OR ABS(
           monto_ponderado -
           (monto_oportunidad * probabilidad_cierre / 100)
         ) > 0.01;
    `);

    console.log("\n=== REGISTROS QUE REQUIEREN REVISIÓN ===");
    console.table(details.rows);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
