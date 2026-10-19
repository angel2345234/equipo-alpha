import { pool } from "../db";

async function initDB() {
  const client = await pool.connect();
  try {
    console.log("Iniciando creación de esquemas y tablas en Neon PostgreSQL...");

    await client.query("BEGIN");

    // 1. Crear esquemas modulares
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS core;
      CREATE SCHEMA IF NOT EXISTS inventory;
      CREATE SCHEMA IF NOT EXISTS crm;
    `);

    // 2. Tabla Core: Proyectos
    await client.query(`
      CREATE TABLE IF NOT EXISTS core.projects (
        id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        location VARCHAR(150),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Tabla Inventory: Activos Inmobiliarios (Assets)
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory.assets (
        id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id VARCHAR(50) REFERENCES core.projects(id) ON DELETE SET NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(150) NOT NULL,
        type VARCHAR(30) NOT NULL,
        status VARCHAR(50) DEFAULT 'DRAFT',
        price NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        area NUMERIC(10, 2) NOT NULL,
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Tabla Inventory: Unidades físicas
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory.units (
        id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        asset_id VARCHAR(50) NOT NULL REFERENCES inventory.assets(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        floor INT,
        price NUMERIC(12, 2),
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Tabla CRM: Parties (Party Pattern para clientes y asesores)
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm.parties (
        id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        party_type VARCHAR(20) DEFAULT 'PERSON',
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        phone VARCHAR(30),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. Tabla CRM: Leads (Prospectos captados desde la Web)
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm.leads (
        id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        party_id VARCHAR(50) REFERENCES crm.parties(id) ON DELETE SET NULL,
        asset_id VARCHAR(50) REFERENCES inventory.assets(id) ON DELETE SET NULL,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        source VARCHAR(50) DEFAULT 'WEB_FORM',
        message TEXT,
        assigned_to VARCHAR(50) DEFAULT 'advisor-1',
        status VARCHAR(50) DEFAULT 'NEW',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query("COMMIT");
    console.log("¡Esquemas y tablas creadas exitosamente en Neon Cloud!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al inicializar la base de datos:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();