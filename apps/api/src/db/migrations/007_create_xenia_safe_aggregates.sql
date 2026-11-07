-- ============================================================================
-- MIGRACIÓN 007: XENIA SAFE AGGREGATES (ALP5-010)
-- FASE 5: XENIA Intelligence & AI
-- Célula Alpha - Zenplus OS
--
-- Agregados SIN PII para insights de XENIA y contenido público.
-- Son vistas: siempre reflejan los datos actuales del OLTP (freshness = tiempo real)
-- y no copian información personal.
--
-- Reglas de privacidad:
--   * Ninguna vista expone nombre, correo, teléfono ni IDs de personas.
--   * agg_xenia_lead_demand_monthly oculta los grupos con menos de 3 leads
--     (k-anonimidad, k = 3) para evitar identificar personas por descarte.
--
-- Idempotente: CREATE OR REPLACE VIEW.
-- Nota de numeración: 004-005 = ALP5-003/004 (Angel), 006 = ALP5-007 market mart (Cristian).
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS analytics;

-- ----------------------------------------------------------------------------
-- 1. INVENTARIO PUBLICADO POR ZONA Y TIPO  (sensibilidad: PUBLIC)
--    Grano: 1 fila por ciudad + distrito + tipo de activo.
--    Solo activos PUBLISHED: lo que ya es visible en ZENPLUS.pe.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.agg_xenia_inventory_by_zone AS
SELECT
  COALESCE(p.city, 'SIN CIUDAD')                                         AS city,
  COALESCE(p.district, 'SIN DISTRITO')                                   AS district,
  a.type                                                                 AS asset_type,
  COUNT(*)::int                                                          AS count_published,
  COUNT(*) FILTER (WHERE a.commercial_status = 'AVAILABLE')::int        AS count_available,
  MIN(a.price) FILTER (WHERE a.currency = 'USD')                         AS min_price_usd,
  ROUND(AVG(a.price) FILTER (WHERE a.currency = 'USD'), 2)               AS avg_price_usd,
  MAX(a.price) FILTER (WHERE a.currency = 'USD')                         AS max_price_usd,
  ROUND(AVG(a.area), 2)                                                  AS avg_area_m2,
  'PUBLIC'::text                                                         AS sensitivity,
  'inventory.assets + inventory.projects'::text                          AS source_tables,
  MAX(a.updated_at)                                                      AS source_updated_at
FROM inventory.assets a
LEFT JOIN inventory.projects p ON p.id = a.project_id
WHERE a.publication_status = 'PUBLISHED'
GROUP BY 1, 2, 3;

COMMENT ON VIEW analytics.agg_xenia_inventory_by_zone IS
  'ALP5-010: inventario publicado por zona y tipo. PUBLIC. Sin PII.';

-- ----------------------------------------------------------------------------
-- 2. DEMANDA DE LEADS POR MES, CANAL Y ZONA  (sensibilidad: INTERNAL)
--    Grano: 1 fila por mes (America/Lima) + canal + distrito + tipo de activo.
--    Exclusiones del Metric Contract P0-01: leads TEST y correos de prueba.
--    Grupos con menos de 3 leads: conteos en NULL (is_suppressed = true).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.agg_xenia_lead_demand_monthly AS
WITH base AS (
  SELECT
    to_char(l.created_at AT TIME ZONE 'America/Lima', 'YYYY-MM')         AS month,
    COALESCE(l.source, 'UNKNOWN')                                         AS source,
    COALESCE(p.district, 'SIN DISTRITO')                                  AS district,
    COALESCE(a.type, 'SIN ACTIVO')                                        AS asset_type,
    COUNT(*)::int                                                         AS n_leads,
    COUNT(*) FILTER (WHERE l.qualified_at IS NOT NULL)::int               AS n_qualified,
    MAX(l.updated_at)                                                     AS last_update
  FROM crm.leads l
  LEFT JOIN inventory.assets a   ON a.id = l.asset_id
  LEFT JOIN inventory.projects p ON p.id = a.project_id
  WHERE COALESCE(l.status, '') <> 'TEST'
    AND COALESCE(l.email, '') NOT ILIKE '%@test.com'
    AND COALESCE(l.email, '') NOT ILIKE '%@example.com'
  GROUP BY 1, 2, 3, 4
)
SELECT
  month,
  source,
  district,
  asset_type,
  (n_leads < 3)                                       AS is_suppressed,
  CASE WHEN n_leads >= 3 THEN n_leads END             AS count_leads,
  CASE WHEN n_leads >= 3 THEN n_qualified END         AS count_qualified,
  3                                                   AS k_threshold,
  'INTERNAL'::text                                    AS sensitivity,
  'crm.leads + inventory.assets + inventory.projects'::text AS source_tables,
  CASE WHEN n_leads >= 3 THEN last_update END         AS source_updated_at
FROM base;

COMMENT ON VIEW analytics.agg_xenia_lead_demand_monthly IS
  'ALP5-010: demanda de leads por mes, canal y zona. INTERNAL. Sin PII. k-anonimidad k=3.';

COMMIT;
