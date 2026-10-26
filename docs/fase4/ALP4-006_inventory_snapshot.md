# SNAPSHOT DIARIO DE INVENTARIO (ALP4-006)

| Campo | Valor |
| :--- | :--- |
| **Ticket ID** | ALP4-006 |
| **Prioridad** | Must (P0) |
| **Fase** | Fase 4 — Data & Management Intelligence |
| **Célula** | Célula Alpha |
| **Responsable** | Wimmer Román |
| **Estado** | Implementado en branch de prueba (`dev-wimmer`) — pendiente de review |

---

## 1. Objetivo

`inventory.assets` solo guarda el estado **actual** de cada activo. Este ticket guarda una "foto" diaria de disponibilidad, publicación y precio para poder medir tendencias (ej. cuántos activos disponibles había cada semana) sin sobrescribir el pasado.

## 2. Tabla `analytics.snap_inventory_daily`

**Grano (ALP4-002):** 1 activo inmobiliario evaluado por día (America/Lima).
**Clave primaria:** `(snapshot_date_key, asset_key)`.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `snapshot_date_key` | `INTEGER` | FK a `dim_date` (`YYYYMMDD`) |
| `asset_key` | `INTEGER` | FK a `dim_asset` |
| `asset_id` | `VARCHAR(50)` | Natural key (`inventory.assets.id`) para reconciliar |
| `commercial_status` | `VARCHAR(50)` | Estado comercial (`AVAILABLE`, `RESERVATION_HOLD`, ...) |
| `publication_status` | `VARCHAR(50)` | Estado de publicación (`PUBLISHED`, `DRAFT`, ...) |
| `is_available` | `BOOLEAN` | `commercial_status = 'AVAILABLE'` |
| `is_published` | `BOOLEAN` | `publication_status = 'PUBLISHED'` |
| `has_active_hold` | `BOOLEAN` | Hold vigente en `inventory.asset_active_holds` |
| `price_amount` / `currency` | `NUMERIC` / `VARCHAR(3)` | Precio en moneda original |
| `amount_price_usd` | `NUMERIC(14,2)` | Precio en USD (solo si `currency = 'USD'`) |
| `etl_loaded_at`, `etl_updated_at`, `source_system` | — | Auditoría ETL (ALP4-001) |

## 3. Archivos

| Archivo | Rol |
| :--- | :--- |
| `apps/api/src/db/migrations/004_create_inventory_snapshot.sql` | Crea la tabla e índices (idempotente) |
| `apps/api/src/modules/analytics/inventory-snapshot.service.ts` | `takeDailySnapshot()` y `checkSnapshot()` |
| `apps/api/src/scripts/run-inventory-snapshot.ts` | Aplica la migración, toma el snapshot y reconcilia |

## 4. Ejecución

```bash
# Desde apps/api
npm run db:analytics:snapshot               # snapshot de hoy (America/Lima)
npx tsx src/scripts/run-inventory-snapshot.ts 2026-10-26   # fecha específica
```

Orden interno: (1) migración 004, (2) sincroniza `dim_asset`, (3) inserta la foto con `ON CONFLICT DO UPDATE`, (4) reconcilia contra `inventory.assets`. El script termina con código 1 si la reconciliación falla.

## 5. Decisiones de diseño

- **Usa `commercial_status` y `publication_status`, no `status`.** La columna `status` es de la Ola 1 y no refleja la separación de Fase 2 (un activo en `RESERVATION_HOLD` tiene `status = AVAILABLE`).
- **Re-ejecutable:** ejecutar dos veces el mismo día actualiza la foto (`etl_updated_at`), no duplica filas.
- **Sincroniza `dim_asset` antes del snapshot** para que ningún activo caiga en `asset_key = -1` (dos activos en -1 chocarían en la clave primaria).
- **Sin tipo de cambio:** `amount_price_usd` queda `NULL` para monedas distintas de USD. Todos los activos actuales están en USD.
- **No reconstruye historia:** un snapshot con fecha pasada guarda el estado de *hoy* con esa fecha. Solo debe usarse para corregir una ejecución fallida del mismo día.

## 6. Evidencia (branch `dev-wimmer`, 26/10/2026)

| Prueba | Resultado |
| :--- | :--- |
| Migración 004 aplicada | OK |
| Snapshot 20261026 | 7 filas = 7 activos en `inventory.assets` |
| Filas en `asset_key = -1` | 0 |
| Re-ejecución mismo día | 7 filas (sin duplicados), `etl_updated_at` actualizado |
| Fecha con formato inválido | Rechazada con error y código de salida 1 |
| KPI P0-05 disponibilidad | **85.71 %** (6 de 7) |

## 7. Pendientes y hallazgos

- **Programación diaria:** falta definir quién ejecuta el snapshot cada día (cron / scheduler). La guía indica freshness diario a las 00:00 (America/Lima).
- **`dim_asset.current_status`** se alimenta de la columna antigua `status`; muestra `AVAILABLE` para el activo `LOTE-A12`, que está en `RESERVATION_HOLD`. Sugerencia: usar `commercial_status`.
- **Hold vencido sin liberar:** `LOTE-A12` sigue en `RESERVATION_HOLD`, pero ninguno de sus holds está vigente.
- **`dim_geography` vacía:** la sincronización lee `core.projects.location`; los distritos están en `inventory.projects.city/district`.
