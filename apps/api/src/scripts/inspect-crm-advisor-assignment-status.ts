import { pool } from "../db";

async function main() {
  const result = await pool.query(`
    SELECT
      'crm.leads.assigned_to' AS source,
      CASE
        WHEN l.assigned_to IS NULL THEN 'SIN_ASIGNAR'
        WHEN u.id IS NOT NULL THEN 'COINCIDE_CON_IAM'
        ELSE 'SIN_COINCIDENCIA_EN_IAM'
      END AS mapping_status,
      COUNT(*)::int AS total
    FROM crm.leads l
    LEFT JOIN iam.users u ON u.id = l.assigned_to
    GROUP BY 1, 2

    UNION ALL

    SELECT
      'crm.leads.assigned_to_id',
      CASE
        WHEN l.assigned_to_id IS NULL THEN 'SIN_ASIGNAR'
        WHEN u.id IS NOT NULL THEN 'COINCIDE_CON_IAM'
        ELSE 'SIN_COINCIDENCIA_EN_IAM'
      END,
      COUNT(*)::int
    FROM crm.leads l
    LEFT JOIN iam.users u ON u.id = l.assigned_to_id
    GROUP BY 1, 2

    UNION ALL

    SELECT
      'crm.opportunities.assigned_to_id',
      CASE
        WHEN o.assigned_to_id IS NULL THEN 'SIN_ASIGNAR'
        WHEN u.id IS NOT NULL THEN 'COINCIDE_CON_IAM'
        ELSE 'SIN_COINCIDENCIA_EN_IAM'
      END,
      COUNT(*)::int
    FROM crm.opportunities o
    LEFT JOIN iam.users u ON u.id = o.assigned_to_id
    GROUP BY 1, 2

    ORDER BY 1, 2;
  `);

  console.log("\n--- DISTRIBUCIÓN DE ASIGNACIONES CRM ---");
  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
