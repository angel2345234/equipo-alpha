import { pool } from "../db";

async function main() {
  const leads = await pool.query(`
    SELECT
      id,
      full_name,
      source,
      assigned_to,
      assigned_to_id,
      status,
      party_id,
      asset_id,
      created_at
    FROM crm.leads
    WHERE id = 'LD-2026-001'
    LIMIT 5
  `);

  console.log("\n--- REGISTRO CRM RELACIONADO ---");
  console.table(leads.rows);

  if (leads.rowCount === 0) {
    console.log("No existe un lead con ese identificador.");
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
