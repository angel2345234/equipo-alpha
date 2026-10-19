import { pool } from "../db";

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Cargando datos sintéticos de prueba para Ola 1...");

    await client.query("BEGIN");

    // 1. Proyecto base
    const projectRes = await client.query(`
      INSERT INTO core.projects (id, name, description, status, location)
      VALUES ('proj-001', 'Residencial ZenPlus Los Álamos', 'Desarrollo residencial privado', 'ACTIVE', 'Lima, Perú')
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `);

    // 2. Activo en estado DRAFT / AVAILABLE
    await client.query(`
      INSERT INTO inventory.assets (id, project_id, code, title, type, status, price, currency, area, details)
      VALUES (
        'asset-001',
        'proj-001',
        'LOTE-A12',
        'Lote Residencial A-12',
        'LOT',
        'DRAFT',
        45000.00,
        'USD',
        120.50,
        '{"stage": "Pre-venta", "block": "A"}'::jsonb
      )
      ON CONFLICT (code) DO NOTHING;
    `);

    await client.query("COMMIT");
    console.log("¡Seed sintético cargado con éxito!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al cargar seed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();