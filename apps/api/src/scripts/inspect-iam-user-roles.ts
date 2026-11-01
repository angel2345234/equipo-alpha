import { pool } from "../db";

async function main() {
  const roles = await pool.query(`
    SELECT
      role,
      is_active,
      COUNT(*)::int AS total
    FROM iam.users
    GROUP BY role, is_active
    ORDER BY role, is_active;
  `);

  const relations = await pool.query(`
    SELECT
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      ccu.table_schema AS referenced_schema,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'iam'
      AND ccu.table_name = 'users'
    ORDER BY tc.table_schema, tc.table_name;
  `);

  console.log("\n--- ROLES DE iam.users (SIN DATOS PERSONALES) ---");
  console.table(roles.rows);

  console.log("\n--- RELACIONES FK HACIA iam.users ---");
  console.table(relations.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
