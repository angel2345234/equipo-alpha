import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

// Cargar el .env desde la ruta correcta
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ Error: DATABASE_URL no está definida en el archivo .env");
  process.exit(1);
}

const sql = neon(connectionString);

async function runMigration() {
  console.log("⏳ Conectando a Neon y ejecutando migración de analíticas...");

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS fact_lead (
          id_fact_lead_sk SERIAL PRIMARY KEY,
          id_cliente_sk INT NOT NULL,
          id_fecha_captacion_sk INT NOT NULL,
          id_canal_origen_sk INT NOT NULL,
          id_vendedor_asignado_sk INT NOT NULL,
          cod_lead_bk VARCHAR(50) NOT NULL,
          estado_lead VARCHAR(30) NOT NULL,
          source_system VARCHAR(50) NOT NULL,
          cantidad_leads INT DEFAULT 1,
          score_lead INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS fact_visit (
          id_fact_visit_sk SERIAL PRIMARY KEY,
          id_cliente_sk INT NOT NULL,
          id_vendedor_sk INT NOT NULL,
          id_ubicacion_sk INT NOT NULL,
          id_fecha_visita_sk INT NOT NULL,
          cod_visita_bk VARCHAR(50) NOT NULL,
          tipo_visita VARCHAR(50) NOT NULL,
          resultado_visita VARCHAR(50) NOT NULL,
          duracion_minutos INT,
          es_primera_visita INT DEFAULT 0,
          cantidad_visitas INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS fact_opportunity (
          id_fact_opportunity_sk SERIAL PRIMARY KEY,
          id_cliente_sk INT NOT NULL,
          id_vendedor_sk INT NOT NULL,
          id_producto_sk INT NOT NULL,
          id_fecha_apertura_sk INT NOT NULL,
          id_fecha_cierre_estimada_sk INT NOT NULL,
          cod_oportunidad_bk VARCHAR(50) NOT NULL,
          etapa_crm VARCHAR(50) NOT NULL,
          motivo_perdida VARCHAR(100),
          monto_oportunidad NUMERIC(12,2) NOT NULL,
          probabilidad_cierre NUMERIC(5,2) NOT NULL,
          monto_ponderado NUMERIC(12,2) NOT NULL,
          dias_en_pipeline INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS fact_reservation (
          id_fact_reservation_sk SERIAL PRIMARY KEY,
          id_cliente_sk INT NOT NULL,
          id_vendedor_sk INT NOT NULL,
          id_producto_sk INT NOT NULL,
          id_fecha_reserva_sk INT NOT NULL,
          cod_reserva_bk VARCHAR(50) NOT NULL,
          cod_oportunidad_bk VARCHAR(50),
          estado_reserva VARCHAR(30) NOT NULL,
          monto_reserva NUMERIC(12,2) NOT NULL,
          monto_total_venta NUMERIC(12,2) NOT NULL,
          dias_validez_reserva INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS fact_operation (
          id_fact_operation_sk SERIAL PRIMARY KEY,
          id_cliente_sk INT NOT NULL,
          id_vendedor_sk INT NOT NULL,
          id_producto_sk INT NOT NULL,
          id_ubicacion_sk INT NOT NULL,
          id_fecha_operacion_sk INT NOT NULL,
          cod_operacion_bk VARCHAR(50) NOT NULL,
          tipo_operacion VARCHAR(50) NOT NULL,
          source_system VARCHAR(50) NOT NULL,
          monto_bruto NUMERIC(12,2) NOT NULL,
          monto_descuento NUMERIC(12,2) DEFAULT 0,
          monto_neto_operacion NUMERIC(12,2) NOT NULL,
          cantidad_unidades INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS fact_stage_changes (
          id_fact_stage_change_sk SERIAL PRIMARY KEY,
          id_entidad_sk INT NOT NULL,
          id_vendedor_sk INT,
          id_fecha_cambio_sk INT NOT NULL,
          cod_transaccion_bk VARCHAR(50) NOT NULL,
          etapa_anterior VARCHAR(50),
          etapa_nueva VARCHAR(50) NOT NULL,
          origen_cambio VARCHAR(50) NOT NULL,
          tiempo_permanencia_etapa_anterior_segundos INT,
          cambio_efectuado INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS fact_closing (
          id_fact_closing_sk SERIAL PRIMARY KEY,
          id_producto_sk INT NOT NULL,
          id_ubicacion_sk INT NOT NULL,
          id_fecha_cierre_sk INT NOT NULL,
          cod_cierre_bk VARCHAR(50) NOT NULL,
          estado_cierre VARCHAR(30) NOT NULL,
          monto_final_cerrado NUMERIC(12,2) NOT NULL,
          comision_total_generada NUMERIC(12,2) DEFAULT 0,
          costos_asociados NUMERIC(12,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log("✅ ¡Tablas de hechos creadas exitosamente en Neon!");
  } catch (error) {
    console.error("❌ Error al ejecutar la migración:", error);
  }
}

runMigration();