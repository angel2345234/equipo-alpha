import { pool } from "../db";

async function main() {
  const result = await pool.query(`
    SELECT id, advisor_name, is_active
    FROM analytics.dim_advisor
    ORDER BY id
  `);

  console.log("--- ASESORES EN ANALYTICS.DIM_ADVISOR ---");
  console.table(result.rows);
  console.log("Total:", result.rowCount);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
