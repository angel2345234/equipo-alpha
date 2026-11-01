import { pool } from "../db";

async function main() {
  const result = await pool.query(`
    SELECT
      source,
      identifier_type,
      COUNT(*)::int AS total
    FROM (
      SELECT
        'crm.leads.assigned_to' AS source,
        CASE
          WHEN assigned_to IS NULL THEN 'NULL'
          WHEN assigned_to ~ '^advisor-[0-9]+$' THEN 'FORMATO_ADVISOR_NUMERICO'
          WHEN assigned_to ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN 'FORMATO_UUID'
          ELSE 'OTRO_FORMATO'
        END AS identifier_type
      FROM crm.leads

      UNION ALL

      SELECT
        'crm.leads.assigned_to_id',
        CASE
          WHEN assigned_to_id IS NULL THEN 'NULL'
          WHEN assigned_to_id ~ '^advisor-[0-9]+$' THEN 'FORMATO_ADVISOR_NUMERICO'
          WHEN assigned_to_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN 'FORMATO_UUID'
          ELSE 'OTRO_FORMATO'
        END
      FROM crm.leads

      UNION ALL

      SELECT
        'crm.opportunities.assigned_to_id',
        CASE
          WHEN assigned_to_id IS NULL THEN 'NULL'
          WHEN assigned_to_id ~ '^advisor-[0-9]+$' THEN 'FORMATO_ADVISOR_NUMERICO'
          WHEN assigned_to_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN 'FORMATO_UUID'
          ELSE 'OTRO_FORMATO'
        END
      FROM crm.opportunities
    ) assignments
    GROUP BY source, identifier_type
    ORDER BY source, identifier_type;
  `);

  console.log("\n--- FORMATOS DE IDENTIFICADORES CRM ---");
  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
