import { pool } from "../db";

async function main() {
  const leads = await pool.query(`
    SELECT
      assigned_to,
      assigned_to_id,
      COUNT(*)::int AS total
    FROM crm.leads
    GROUP BY assigned_to, assigned_to_id
    ORDER BY assigned_to, assigned_to_id
    LIMIT 30
  `);

  console.log("\n--- ASIGNACIONES EN LEADS ---");
  console.table(leads.rows);

  const opportunities = await pool.query(`
    SELECT
      assigned_to_id,
      COUNT(*)::int AS total
    FROM crm.opportunities
    GROUP BY assigned_to_id
    ORDER BY assigned_to_id
    LIMIT 30
  `);

  console.log("\n--- ASIGNACIONES EN OPPORTUNITIES ---");
  console.table(opportunities.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
