import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        cod_oportunidad_bk,
        monto_oportunidad,
        probabilidad_cierre,
        monto_ponderado,
        CASE
          WHEN monto_oportunidad <> 0
          THEN ROUND(monto_ponderado / monto_oportunidad, 4)
          ELSE NULL
        END AS factor_ponderacion
      FROM public.fact_opportunity;
    `);

    console.table(result.rows);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
