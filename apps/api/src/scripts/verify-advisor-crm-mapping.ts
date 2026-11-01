import { pool } from "../db";

async function main() {
  const result = await pool.query(`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM iam.users
        WHERE role = 'ADVISOR' AND is_active = true
      ) AS active_advisors,

      (
        SELECT COUNT(*)::int
        FROM crm.leads l
        JOIN iam.users u ON u.id = l.assigned_to
        WHERE u.role = 'ADVISOR'
      ) AS leads_matching_assigned_to,

      (
        SELECT COUNT(*)::int
        FROM crm.leads l
        JOIN iam.users u ON u.id = l.assigned_to_id
        WHERE u.role = 'ADVISOR'
      ) AS leads_matching_assigned_to_id,

      (
        SELECT COUNT(*)::int
        FROM crm.opportunities o
        JOIN iam.users u ON u.id = o.assigned_to_id
        WHERE u.role = 'ADVISOR'
      ) AS opportunities_matching_assigned_to_id;
  `);

  console.log("\n--- COMPROBACIÓN DE CORRESPONDENCIA DE ASESORES ---");
  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
