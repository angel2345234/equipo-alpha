import { pool } from "../db";

async function main() {
  for (const table of [
    "fact_lead",
    "fact_visit",
    "fact_opportunity"
  ]) {
    console.log(`\n--- ${table} ---`);

    const result = await pool.query(`
      SELECT *
      FROM public.${table}
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.table(result.rows);
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
