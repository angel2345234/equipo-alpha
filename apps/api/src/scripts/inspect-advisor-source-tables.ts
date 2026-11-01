import { pool } from "../db";

async function main() {
  const result = await pool.query(`
    SELECT
      table_schema,
      table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      AND (
        table_name ILIKE '%advisor%'
        OR table_name ILIKE '%asesor%'
        OR table_name ILIKE '%user%'
        OR table_name ILIKE '%employee%'
        OR table_name ILIKE '%seller%'
        OR table_name ILIKE '%agent%'
      )
    ORDER BY table_schema, table_name;
  `);

  console.log("\n--- TABLAS RELACIONADAS CON ASESORES Y USUARIOS ---");
  console.table(result.rows);

  if (result.rowCount === 0) {
    console.log("No se encontraron tablas con esos nombres.");
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
