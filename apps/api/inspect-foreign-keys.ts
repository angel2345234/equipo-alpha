import { pool } from "./src/db";

async function main() {
  try {
    const result = await pool.query(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS referenced_schema,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.constraint_schema = ccu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema IN (
          'core', 'crm', 'inventory', 'analytics', 'public'
        )
      ORDER BY
        tc.table_schema,
        tc.table_name,
        tc.constraint_name;
    `);

    console.log("\n=== CLAVES FORÁNEAS EXISTENTES ===");
    console.table(result.rows);
    console.log("Total de relaciones:", result.rowCount);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Error:", error);
  process.exitCode = 1;
});
