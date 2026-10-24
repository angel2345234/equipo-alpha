# DICCIONARIO DE DATOS: DIMENSIONES CORE (ALP4-003)

| Campo | Valor |
| :--- | :--- |
| **Ticket ID** | ALP4-003 |
| **Prioridad** | Must (P0) |
| **Fase** | Fase 4 — Data & Management Intelligence |
| **Célula** | Célula Alpha |
| **Responsable** | Equipo 1 (Data Foundation) |
| **Estado** | Aprobado & Vigente |

---

## 1. Visión General de las Dimensiones

Las dimensiones proporcionan el contexto descriptivo de las métricas comerciales y financieras. En concordancia con los tickets de la Fase 4, se definen las 5 dimensiones maestras aprobadas:
1. **`analytics.dim_date`**: Dimensión de tiempo para agregación temporal sin funciones en tiempo de ejecución.
2. **`analytics.dim_geography`**: Dimensión de ubicación espacial de proyectos y activos.
3. **`analytics.dim_advisor`**: Dimensión de fuerza de ventas y asesores comerciales.
4. **`analytics.dim_source`**: Dimensión de canales de captación y atribución de marketing.
5. **`analytics.dim_asset`**: Dimensión de inventario de activos inmobiliarios.

---

## 2. Especificación Detallada de Dimensiones

### 2.1 `analytics.dim_date` (Dimensión Fecha)
* **Grano:** 1 día calendario. Rango inicial: 2024-01-01 a 2030-12-31.
* **Clave Primaria:** `date_key` (Entero `YYYYMMDD`, ej: `20261024`).

| Columna | Tipo de Dato | Nulable | Descripción |
| :--- | :--- | :---: | :--- |
| `date_key` | `INTEGER` | NO | Clave subrogada `YYYYMMDD` (ej. 20261024). |
| `full_date` | `DATE` | NO | Fecha calendario pura (`2026-10-24`). |
| `year` | `SMALLINT` | NO | Año calendario de 4 dígitos (ej. 2026). |
| `quarter` | `SMALLINT` | NO | Trimestre del año (1 a 4). |
| `quarter_name` | `VARCHAR(10)` | NO | Etiqueta de trimestre (`Q1-2026`, `Q4-2026`). |
| `month` | `SMALLINT` | NO | Número de mes (1 a 12). |
| `month_name` | `VARCHAR(20)` | NO | Nombre del mes en español (`Enero`, `Octubre`). |
| `month_year` | `VARCHAR(10)` | NO | Formato abreviado (`2026-10`). |
| `week_of_year` | `SMALLINT` | NO | Semana ISO del año (1 a 53). |
| `day_of_month` | `SMALLINT` | NO | Día del mes (1 a 31). |
| `day_of_week` | `SMALLINT` | NO | Día de la semana (1 = Lunes, 7 = Domingo). |
| `day_name` | `VARCHAR(20)` | NO | Nombre del día (`Lunes`, `Sábado`). |
| `is_weekend` | `BOOLEAN` | NO | `TRUE` si es sábado o domingo. |
| `is_holiday_pe` | `BOOLEAN` | NO | `TRUE` si es feriado oficial en Perú. |

---

### 2.2 `analytics.dim_geography` (Dimensión Geografía)
* **Grano:** 1 localidad geográfica única (Distrito / Zona / Ciudad).
* **Clave Primaria:** `geography_key` (`SERIAL` autoincremental).

| Columna | Tipo de Dato | Nulable | Descripción |
| :--- | :--- | :---: | :--- |
| `geography_key` | `INTEGER` | NO | Clave subrogada. |
| `country` | `VARCHAR(50)` | NO | País (`Perú`). |
| `department` | `VARCHAR(50)` | NO | Departamento / Región (`Lima`). |
| `province` | `VARCHAR(50)` | NO | Provincia (`Lima`). |
| `district` | `VARCHAR(100)` | NO | Distrito (`Miraflores`, `San Isidro`, `Surco`). |
| `zone` | `VARCHAR(50)` | SÍ | Zona comercial (`Lima Top`, `Lima Moderna`). |
| `created_at` | `TIMESTAMPTZ` | NO | Fecha de creación del registro. |

---

### 2.3 `analytics.dim_advisor` (Dimensión Asesor Comercial)
* **Grano:** 1 asesor o agente comercial.
* **Clave Primaria:** `advisor_key` (`SERIAL` autoincremental).
* **Origen:** `core.parties` (roles `ADVISOR` o asignados en `crm.leads.assigned_to`).

| Columna | Tipo de Dato | Nulable | Descripción / PII Handling |
| :--- | :--- | :---: | :--- |
| `advisor_key` | `INTEGER` | NO | Clave subrogada analítica. |
| `advisor_id` | `VARCHAR(50)` | NO | Natural Key (`core.parties.id`). |
| `full_name` | `VARCHAR(150)` | NO | Nombre completo del asesor. |
| `email_masked` | `VARCHAR(150)` | SÍ | Correo ofuscado (`j***@zenplus.pe`) para BI seguro. |
| `team` | `VARCHAR(50)` | SÍ | Equipo comercial (`Alpha`, `Directo`, `Inmobiliario`). |
| `status` | `VARCHAR(30)` | NO | Estado del asesor (`ACTIVE`, `INACTIVE`). |
| `is_active` | `BOOLEAN` | NO | Flag booleano de disponibilidad comercial. |

---

### 2.4 `analytics.dim_source` (Dimensión Canal de Captación)
* **Grano:** 1 canal o fuente de captación de leads y ventas.
* **Clave Primaria:** `source_key` (`SERIAL` autoincremental).

| Columna | Tipo de Dato | Nulable | Descripción |
| :--- | :--- | :---: | :--- |
| `source_key` | `INTEGER` | NO | Clave subrogada. |
| `source_code` | `VARCHAR(50)` | NO | Código de canal (`WEB_FORM`, `PORTAL_INM`, `REFERRAL`). |
| `source_name` | `VARCHAR(100)` | NO | Nombre legible (`Formulario Web Oficial`, `Portal Inmobiliario`). |
| `channel_category` | `VARCHAR(50)` | NO | Categoría general (`DIGITAL`, `PRESENCIAL`, `REFERIDO`). |
| `is_paid` | `BOOLEAN` | NO | `TRUE` si proviene de pauta publicitaria pagada. |

---

### 2.5 `analytics.dim_asset` (Dimensión Activo Inmobiliario)
* **Grano:** 1 activo inmobiliario individual (Departamento, Oficina, Local, Lote).
* **Clave Primaria:** `asset_key` (`SERIAL` autoincremental).
* **Origen:** `inventory.assets` y `core.projects`.

| Columna | Tipo de Dato | Nulable | Descripción |
| :--- | :--- | :---: | :--- |
| `asset_key` | `INTEGER` | NO | Clave subrogada analítica. |
| `asset_id` | `VARCHAR(50)` | NO | Natural Key (`inventory.assets.id`). |
| `asset_code` | `VARCHAR(50)` | NO | Código comercial único (`DEP-101`, `OFI-502`). |
| `title` | `VARCHAR(150)` | NO | Título descriptivo del activo. |
| `project_name` | `VARCHAR(150)` | SÍ | Nombre del proyecto inmobiliario asociado (`core.projects.name`). |
| `asset_type` | `VARCHAR(50)` | NO | Tipo (`APARTMENT`, `OFFICE`, `COMMERCIAL`, `PARKING`). |
| `current_status` | `VARCHAR(50)` | NO | Estado operativo (`AVAILABLE`, `RESERVED`, `SOLD`). |
| `base_price_usd` | `NUMERIC(12, 2)`| NO | Precio base comercial expresado en USD. |
| `area_m2` | `NUMERIC(10, 2)`| NO | Área total en metros cuadrados. |
| `currency` | `VARCHAR(3)` | NO | Moneda de referencia (`USD`). |
| `geography_key` | `INTEGER` | SÍ | FK hacia `analytics.dim_geography`. |
| `source_created_at` | `TIMESTAMPTZ` | SÍ | Fecha original de alta en inventario. |

---

## 3. Registros Desconocidos / Por Defecto (Fallback Records)

Cada dimensión cuenta con una fila reservada con `Key = -1`:

```sql
-- Ejemplo de integridad para registros no asignados o nulos:
INSERT INTO analytics.dim_advisor (advisor_key, advisor_id, full_name, email_masked, status, is_active)
VALUES (-1, 'UNKNOWN', 'SIN ASESOR ASIGNADO', 'none@zenplus.pe', 'INACTIVE', false)
ON CONFLICT (advisor_key) DO NOTHING;
```
Esto asegura que cualquier hecho con un campo nulo en la fuente apunte a `-1` sin romper los `INNER JOIN` ni generar pérdidas de conteo.
