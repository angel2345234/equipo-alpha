# ALP5-007 — Market Intelligence Mart (Dataset Inicial de Zonas, Inventario, Demanda y Desempeño)

| Campo     | Valor                                                         |
| :-------- | :------------------------------------------------------------ |
| Ticket    | **ALP5-007**                                                  |
| Prioridad | **SHOULD**                                                    |
| Estado    | **Implementado y Verificado**                                 |
| Módulo    | `apps/api/src/modules/market-intelligence`                    |
| Migración | `apps/api/src/db/migrations/006_market_intelligence_mart.sql` |

---

## 1. Alcance y Objetivos

Conforme al backlog de Fase 5 (*XENIA Intelligence & AI*), el ticket **ALP5-007** crea el **Market Intelligence Mart**, la capa analítica de datos agregados para abastecer de conocimiento verídico y actualizado a **XENIA** respecto a:
- **Zonas y Ubicación Geográfica:** Cobertura por zona comercial, departamento, provincia y distrito (`dim_geography`).
- **Inventario:** Unidades totales, disponibles, reservadas, ratio de disponibilidad y dispersión de precios en USD (`dim_asset`, `snap_inventory_daily`).
- **Demanda y Pipeline Comercial:** Leads captados, visitas calificadas, oportunidades activas, monto ponderado y ratio de conversión lead-a-reserva (`fact_lead`, `fact_visit`, `fact_opportunity`).
- **Desempeño Transaccional:** Volumen de reservas activas, operaciones de venta cerradas y tiempo de ciclo promedio (`fact_reservation`, `fact_operation`, `fact_closing`).
- **Gobernanza y Procedencia:** Trazabilidad de sistemas fuente (`CRM`, `INVENTORY`, `CORE`), sello de frescura (`dataFreshnessAt`), clasificación de sensibilidad (`INTERNAL`) y hash de linaje criptográfico SHA-256.

---

## 2. Reconciliación con Fase 4

El Mart cumple con el criterio de **Exit Gate de Fase 5** (*"Market Intelligence P0 se reconcilia con las fuentes de Fase 4"*):

| Dimensión / Métrica | Fuente Fase 4 | Fórmula / Regla de Cálculo en el Mart |
| :--- | :--- | :--- |
| **Zonas y Proyectos** | `analytics.dim_geography` / `dim_asset.project_name` | Grano dimensional: `(zone, project_name, period_month)`. |
| **M-01: Leads Captados** | `analytics.fact_lead` | Suma de registros de captación en el periodo. |
| **M-02: Conversión Lead-Reserva** | `analytics.fact_lead` vs `analytics.fact_reservation` | `(reservas_count / leads_captured) * 100` (%) |
| **M-03: Monto Reservas Activas** | `analytics.fact_reservation` | Suma de `monto_reserva` con estado activo y vigente en USD. |
| **M-04: Tiempo de Ciclo** | `analytics.fact_operation` vs `analytics.fact_stage_changes` | Promedio de días transcurridos desde captación hasta cierre. |
| **M-05: Ratio Disponibilidad** | `analytics.snap_inventory_daily` / `inventory.assets` | `(available_units / total_units) * 100` (%) |

---

## 3. Modelo de Datos y Esquema DDL

### Tabla Principal: `analytics.mart_market_intelligence`
- **Clave Primaria:** `id text` (UUID o hash).
- **Unicidad:** `UNIQUE (zone, project_name, period_month)`.
- **Integridad:**
  - `availability_ratio`: entre 0% y 100%.
  - `lead_to_reservation_conversion_rate`: entre 0% y 100%.
  - `classification`: `'INTERNAL'` o `'CONFIDENTIAL'`.
  - `lineage_hash`: SHA-256 de 64 caracteres hexadecimales.

### Vista Resumen: `analytics.vw_market_intelligence_summary`
Proporciona agregación a nivel de Zona y Periodo para consultas rápidas de alto nivel requeridas por XENIA:
```sql
SELECT zone, period_month, projects_count, total_available_units, mean_price_usd, overall_conversion_rate
FROM analytics.vw_market_intelligence_summary;
```

---

## 4. Gobernanza y Procedencia (ALP5-006 / ALP5-007)

Cada registro del Mart genera automáticamente un **hash de linaje determinista**:
```typescript
const lineageHash = marketIntelligenceService.computeLineageHash(
  dimensions,
  ["CRM", "INVENTORY", "CORE"],
  freshnessDate
);
```
Esto garantiza trazabilidad auditable: ante cualquier auditoría o consulta de XENIA, es posible determinar con qué corte de datos y sistemas de origen se calculó el indicador.

---

## 5. Pruebas Unitarias y Verificación

La suite de tests unitarios cubre:
- Cálculo exacto de ratios de disponibilidad y conversión sin desbordes ni divisiones por cero.
- Manejo seguro de listas de inventario vacías o precios no finitos.
- Ponderación de montos de pipeline por probabilidad de cierre.
- Cálculo de tiempos de ciclo promedio en días.
- Filtros dimensionales y generación de resúmenes ejecutivos.
- Generación de hashes de linaje SHA-256 válidos.

Ejecutar tests:
```bash
npm test --workspace=api
```

Para aplicar la migración DDL en el entorno con PostgreSQL:
```bash
npm run db:market-mart:migrate --workspace=api
```
