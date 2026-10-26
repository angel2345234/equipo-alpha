-- ============================================================================
-- MIGRACIÓN 004: SNAPSHOT DIARIO DE INVENTARIO (ALP4-006)
-- FASE 4: Data & Management Intelligence
-- Célula Alpha - Zenplus OS
--
-- Grano (ALP4-002): 1 activo inmobiliario evaluado al cierre de cada día
--                   (America/Lima). Clave compuesta (snapshot_date_key, asset_key).
-- Fuente OLTP:      inventory.assets + inventory.asset_active_holds
-- Consumidor:       KPI P0-05 metric_inventory_availability_ratio
--
-- Idempotente: puede ejecutarse varias veces sin error ni duplicados.
-- Requiere:    migración 003_create_analytics_schema_and_dimensions.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS analytics.snap_inventory_daily (
  -- Claves
  snapshot_date_key  INTEGER       NOT NULL REFERENCES analytics.dim_date(date_key),
  asset_key          INTEGER       NOT NULL REFERENCES analytics.dim_asset(asset_key),
  asset_id           VARCHAR(50)   NOT NULL, -- Natural key (inventory.assets.id) para reconciliar con OLTP

  -- Estado del activo en la fecha del snapshot (Fase 2: estados separados)
  commercial_status  VARCHAR(50)   NOT NULL, -- AVAILABLE, RESERVATION_HOLD, RESERVED, SOLD...
  publication_status VARCHAR(50)   NOT NULL, -- PUBLISHED, DRAFT, UNPUBLISHED...

  -- Banderas derivadas para agregaciones rápidas
  is_available       BOOLEAN       NOT NULL, -- commercial_status = 'AVAILABLE'
  is_published       BOOLEAN       NOT NULL, -- publication_status = 'PUBLISHED'
  has_active_hold    BOOLEAN       NOT NULL, -- existe hold vigente en inventory.asset_active_holds

  -- Precio vigente en la fecha del snapshot
  price_amount       NUMERIC(14,2),          -- precio en su moneda original
  currency           VARCHAR(3),
  amount_price_usd   NUMERIC(14,2),          -- solo si currency = 'USD' (sin tipo de cambio en F4)

  -- Auditoría ETL obligatoria (ALP4-001)
  etl_loaded_at      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  etl_updated_at     TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_system      VARCHAR(50)   NOT NULL DEFAULT 'ZENPLUS_OLTP',

  CONSTRAINT snap_inventory_daily_pk PRIMARY KEY (snapshot_date_key, asset_key)
);

-- Tendencia de un activo a lo largo del tiempo
CREATE INDEX IF NOT EXISTS snap_inventory_daily_asset_idx
  ON analytics.snap_inventory_daily (asset_key, snapshot_date_key);

-- Conteos por estado en una fecha (KPI de disponibilidad)
CREATE INDEX IF NOT EXISTS snap_inventory_daily_date_status_idx
  ON analytics.snap_inventory_daily (snapshot_date_key, commercial_status);

COMMENT ON TABLE analytics.snap_inventory_daily IS
  'ALP4-006: snapshot diario de disponibilidad, publicación y precio por activo. Grano: 1 activo por día (America/Lima).';

COMMIT;
