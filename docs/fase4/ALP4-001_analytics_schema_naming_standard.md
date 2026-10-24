# ESTÁNDAR DE ARQUITECTURA ANALÍTICA, ESQUEMA Y NOMENCLATURA (ALP4-001)

| Campo | Valor |
| :--- | :--- |
| **Ticket ID** | ALP4-001 |
| **Prioridad** | Must (P0) |
| **Fase** | Fase 4 — Data & Management Intelligence |
| **Célula** | Célula Alpha |
| **Responsable** | Equipo 1 (Data Foundation) |
| **Estado** | Implementado & Aprobado |

---

## 1. Misión y Principios de Aislamiento

El objetivo de este estándar es garantizar que la capa analítica de **ZENPLUS OS** funcione de forma desacoplada y confiable, sin impactar negativamente el rendimiento ni la integridad transaccional (OLTP) de los esquemas `core`, `inventory` y `crm`.

### Reglas Cardinales:
1. **Aislamiento de Esquema:** Todas las tablas, vistas y procedimientos analíticos residen exclusivamente en el esquema dedicado `analytics`.
2. **Lectura No Bloqueante:** Las transformaciones y lecturas analíticas sobre datos operacionales deben ejecutarse sin bloquear las transacciones del negocio.
3. **No Dependencia Inversa:** Ninguna tabla o proceso del sistema operacional (OLTP) puede depender de objetos del esquema `analytics`.
4. **Timezone Oficial Unificado:** El almacenamiento de marcas de tiempo se realiza en UTC (`TIMESTAMPTZ`), y las dimensiones temporales proyectan las agrupaciones comerciales en la zona horaria oficial del negocio: **America/Lima (UTC-5)**.

---

## 2. Convenciones de Nomenclatura (Naming Standard)

Para asegurar la claridad, predictibilidad y gobernanza en el consumo de datos por parte de Beta (APIs analíticas) y Gamma (Dashboards/UI), se aplican las siguientes reglas de nomenclatura:

### 2.1 Prefijos de Tablas y Vistas
- **`dim_<entidad>`**: Tablas de dimensiones que proporcionan contexto cualitativo, categórico y temporal (ej. `dim_date`, `dim_advisor`, `dim_asset`).
- **`fact_<proceso>`**: Tablas de hechos con grano transaccional o acumulativo que contienen métricas cuantificables (ej. `fact_leads`, `fact_reservations`, `fact_operations`).
- **`snap_<entidad>_<periodicidad>`**: Tablas de snapshots periódicos para análisis de tendencias y estados históricos (ej. `snap_inventory_daily`).
- **`vw_<proposito>`**: Vistas analíticas gobernadas, con aplicación de PII-safe masking y filtros de control de acceso.
- **`agg_<proposito>`**: Tablas o vistas materializadas de agregados de alto rendimiento (ej. agregados listos para XENIA).

### 2.2 Convenciones de Columnas
- **Claves Subrogadas (Surrogate Keys):** `<entidad>_key` de tipo entero (`INTEGER` o `BIGINT`), autoincrementales o calculadas (ej. `date_key`, `advisor_key`, `asset_key`).
- **Claves Naturales / de Negocio (Business Keys):** `<entidad>_id` o `natural_id` de tipo texto/UUID referenciando la tabla origen del OLTP (ej. `party_id`, `asset_id`).
- **Fechas y Tiempos:**
  - `*_at`: Marcas de tiempo de auditoría (`created_at`, `updated_at`) en `TIMESTAMPTZ`.
  - `*_date`: Fechas calendario puras tipo `DATE`.
  - `*_key`: Claves foráneas hacia `dim_date` en formato numérico `YYYYMMDD` (ej. `20261024`).
- **Métricas Numéricas:**
  - `amount_*_usd`: Montos monetarios normalizados en dólares (`NUMERIC(14, 2)`).
  - `count_*`: Conteos discretos (`INTEGER` o `BIGINT`).
  - `ratio_*` o `pct_*`: Porcentajes y razones (`NUMERIC(6, 4)`).
  - `duration_*_days` / `duration_*_hours`: Métricas de ciclo de vida en unidades explícitas.
- **Campos de Auditoría Obligatorios en el Esquema Analítico:**
  - `etl_loaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`: Momento de inserción en el data mart.
  - `etl_updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`: Momento de última actualización.
  - `source_system VARCHAR(50) DEFAULT 'ZENPLUS_OLTP'`: Identificador del sistema de procedencia.

---

## 3. Política de Integridad Referencial y Registro Desconocido (Unknown Row)

En análisis de datos, los `JOIN` no deben eliminar filas de hechos cuando una dimensión es nula o no se ha asignado aún (ej. un Lead sin asesor asignado).

Para evitar inconsistencias o conteos inexactos:
- Cada tabla de dimensión incluye obligatoriamente un registro con **Surrogate Key `-1`** (o `0`), con valores explícitos:
  - Nombre: `'NO ASIGNADO'` o `'DESCONOCIDO'`.
  - Código: `'N/A'`.
- De esta manera, los `INNER JOIN` entre hechos y dimensiones nunca descartan métricas y mantienen la integridad referencial.

---

## 4. Pipeline de Versionado y Migraciones

Las alteraciones a la base de datos analítica siguen el mismo ciclo de control que el resto del backend:
1. Cada cambio se escribe en un archivo SQL versionado y secuencial en `apps/api/src/db/migrations/`.
2. Las migraciones deben ser **idempotentes** (usar `CREATE SCHEMA IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
3. Todo script analítico debe poder re-ejecutarse sin duplicar datos ni alterar tablas de otros esquemas.
