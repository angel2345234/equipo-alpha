import { pool } from "../db";

async function main() {
  const columns = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'parties'
    ORDER BY ordinal_position
  `);

  console.log("\nCOLUMNAS DE core.parties:");
  console.table(columns.rows);

  const data = await pool.query(`
    SELECT *
    FROM core.parties
    LIMIT 10
  `);

  console.log("\nPRIMEROS 10 REGISTROS:");
  console.table(data.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
