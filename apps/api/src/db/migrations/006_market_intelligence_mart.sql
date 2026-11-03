-- ============================================================================
-- MIGRACIÓN 006: MARKET INTELLIGENCE MART (ALP5-007)
-- FASE 5: XENIA Intelligence & AI
-- Célula Alpha - Zenplus OS
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.mart_market_intelligence (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- 1. Dimensiones geográficas y de proyecto
  zone varchar(50) NOT NULL,
  department varchar(50) NOT NULL,
  province varchar(50) NOT NULL,
  district varchar(100) NOT NULL,
  project_name varchar(100) NOT NULL,
  period_month char(7) NOT NULL, -- Formato YYYY-MM
  
  -- 2. Métricas de Inventario (M-05)
  total_units integer NOT NULL DEFAULT 0,
  available_units integer NOT NULL DEFAULT 0,
  reserved_units integer NOT NULL DEFAULT 0,
  sold_units integer NOT NULL DEFAULT 0,
  availability_ratio numeric(5,2) NOT NULL DEFAULT 0,
  avg_price_usd numeric(12,2) NOT NULL DEFAULT 0,
  min_price_usd numeric(12,2) NOT NULL DEFAULT 0,
  max_price_usd numeric(12,2) NOT NULL DEFAULT 0,
  total_inventory_value_usd numeric(14,2) NOT NULL DEFAULT 0,
  
  -- 3. Métricas de Demanda (M-01 y M-02)
  leads_captured integer NOT NULL DEFAULT 0,
  qualified_visits integer NOT NULL DEFAULT 0,
  active_opportunities integer NOT NULL DEFAULT 0,
  weighted_pipeline_amount_usd numeric(14,2) NOT NULL DEFAULT 0,
  reservations_count integer NOT NULL DEFAULT 0,
  lead_to_reservation_conversion_rate numeric(5,2) NOT NULL DEFAULT 0,
  
  -- 4. Métricas de Desempeño Comercial (M-03 y M-04)
  active_reservations_amount_usd numeric(14,2) NOT NULL DEFAULT 0,
  closed_operations_count integer NOT NULL DEFAULT 0,
  closed_operations_amount_usd numeric(14,2) NOT NULL DEFAULT 0,
  avg_cycle_time_days numeric(6,1) NOT NULL DEFAULT 0,
  
  -- 5. Gobernanza, Trazabilidad y Procedencia (ALP5-006 / ALP5-007)
  source_systems text[] NOT NULL DEFAULT '{"CRM","INVENTORY","CORE"}',
  reconciled_with_phase4 boolean NOT NULL DEFAULT true,
  data_freshness_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lineage_hash char(64) NOT NULL,
  classification varchar(20) NOT NULL DEFAULT 'INTERNAL',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Restricciones de integridad
  CONSTRAINT mart_market_period_check CHECK (period_month ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT mart_market_availability_check CHECK (availability_ratio >= 0 AND availability_ratio <= 100),
  CONSTRAINT mart_market_conversion_check CHECK (lead_to_reservation_conversion_rate >= 0 AND lead_to_reservation_conversion_rate <= 100),
  CONSTRAINT mart_market_classification_check CHECK (classification IN ('INTERNAL', 'CONFIDENTIAL')),
  CONSTRAINT mart_market_lineage_hash_check CHECK (lineage_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT mart_market_unique UNIQUE (zone, project_name, period_month)
);

CREATE INDEX IF NOT EXISTS mart_market_zone_idx ON analytics.mart_market_intelligence (zone);
CREATE INDEX IF NOT EXISTS mart_market_project_idx ON analytics.mart_market_intelligence (project_name);
CREATE INDEX IF NOT EXISTS mart_market_period_idx ON analytics.mart_market_intelligence (period_month);
CREATE INDEX IF NOT EXISTS mart_market_freshness_idx ON analytics.mart_market_intelligence (data_freshness_at DESC);

-- Vista analítica resumen por zona y periodo para consumo rápido de XENIA
CREATE OR REPLACE VIEW analytics.vw_market_intelligence_summary AS
SELECT
  zone,
  period_month,
  COUNT(DISTINCT project_name) AS projects_count,
  SUM(available_units) AS total_available_units,
  ROUND(AVG(avg_price_usd), 2) AS mean_price_usd,
  SUM(total_inventory_value_usd) AS total_valuation_usd,
  SUM(leads_captured) AS total_leads,
  SUM(reservations_count) AS total_reservations,
  ROUND(
    CASE WHEN SUM(leads_captured) > 0 
      THEN (SUM(reservations_count)::numeric / SUM(leads_captured)::numeric) * 100 
      ELSE 0 
    END, 2
  ) AS overall_conversion_rate,
  SUM(closed_operations_amount_usd) AS total_closed_amount_usd,
  MAX(data_freshness_at) AS last_freshness_at
FROM analytics.mart_market_intelligence
GROUP BY zone, period_month;

COMMIT;
