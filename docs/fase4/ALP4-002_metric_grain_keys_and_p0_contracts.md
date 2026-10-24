# DEFINICIÓN DE GRANO, CLAVES Y CONTRATOS DE MÉTRICA P0 (ALP4-002)

| Campo | Valor |
| :--- | :--- |
| **Ticket ID** | ALP4-002 |
| **Prioridad** | Must (P0) |
| **Fase** | Fase 4 — Data & Management Intelligence |
| **Célula** | Célula Alpha |
| **Responsable** | Equipo 1 (Data Foundation) |
| **Estado** | Aprobado & Vigente |

---

## 1. Definición de Grano de Datasets Críticos

El **grano** representa qué significa exactamente una fila dentro de un dataset analítico. Definirlo con precisión evita duplicidades, dobles conteos y discrepancias entre reportes.

| Dataset Analítico | Tipo | Grano Oficial (Significado de 1 Fila) | Clave Primaria / Natural Key |
| :--- | :---: | :--- | :--- |
| **`analytics.fact_leads`** | Transaccional | 1 evento individual de captación de prospecto (Lead). | `lead_key` (SK) / `crm.leads.id` |
| **`analytics.fact_opportunities`** | Transaccional | 1 oportunidad comercial calificada en el pipeline. | `opportunity_key` (SK) / `crm.opportunities.id` |
| **`analytics.fact_reservations`** | Acumulativo / Estado | 1 acuerdo de reserva inmobiliaria y su estado actual. | `reservation_key` (SK) / `crm.reservations.id` |
| **`analytics.fact_operations`** | Acumulativo / Hitos | 1 expediente de operación formalizada post-reserva. | `operation_key` (SK) / `crm.operations.id` |
| **`analytics.snap_inventory_daily`** | Snapshot Periódico | 1 activo inmobiliario evaluado al cierre de cada día (23:59:59 America/Lima). | `(asset_key, snapshot_date_key)` compuesto |

---

## 2. Estrategia de Claves (Keys Strategy)

1. **Surrogate Keys (SK):**
   - Utilizadas como clave primaria (`PRIMARY KEY`) en todas las dimensiones y hechos.
   - En `dim_date`, la SK es un entero de 8 dígitos: `YYYYMMDD` (ej. `20261024`).
   - En las demás dimensiones, es un `SERIAL / INTEGER` autoincremental gestionado por la capa analítica.
   - **Registro Desconocido:** La clave `-1` está reservada para registros nulos o pendientes de asignación en OLTP (`party_id IS NULL`).
2. **Natural / Business Keys (BK):**
   - Identificadores UUID o cadenas alfanuméricas originados en las tablas OLTP (`crm.leads.id`, `inventory.assets.id`, `core.parties.id`).
   - Mantienen un índice único (`UNIQUE INDEX`) para posibilitar cargas incrementales mediante `ON CONFLICT (natural_id) DO UPDATE`.
3. **Temporalidad y Zona Horaria:**
   - La base de datos almacena en UTC (`TIMESTAMPTZ`).
   - Para agregaciones comerciales diarias, semanales y mensuales se normaliza a la zona horaria **America/Lima** (`AT TIME ZONE 'America/Lima'`).

---

## 3. Los 5 Metric Contracts P0 (Gobernanza de Métricas)

Siguiendo el principio de métrica de Fase 4: *"Todo KPI P0 debe tener un Metric Contract: nombre, propósito, fórmula, grano, fuente, timezone, filtros, exclusiones, sensibilidad, owner y freshness."*

---

### METRIC CONTRACT P0-01: Total Leads Captados (Leads Volume)
* **Nombre:** `metric_leads_captured_total`
* **Propósito de Negocio:** Medir la capacidad de atracción del embudo comercial por canal, fecha y proyecto para evaluar campañas de marketing.
* **Fórmula:**
  $$\text{Leads Captados} = \sum \text{filas únicas en } fact\_leads$$
* **Grano:** 1 fila por evento de lead captado (agregable por `date_key`, `source_key`, `advisor_key`, `asset_key`).
* **Fuente Operacional Autorizada:** Tabla transaccional `crm.leads`.
* **Timezone:** `America/Lima` (UTC-5) para corte de fecha diaria.
* **Filtros y Criterios de Inclusión:**
  - Registros con `created_at` válido.
* **Exclusiones:**
  - Leads con etiqueta de prueba (`status = 'TEST'` o correos con dominio `@test.com`, `@example.com`).
* **Sensibilidad / PII:** **CONFIDENTIAL** (contiene datos personales; en BI exponer solo agregados o proyecciones sin correo ni teléfono).
* **Owner:** Líder Comercial & Marketing / Célula Alpha.
* **Freshness / SLA:** Ingestion diaria / Horaria en Staging (tolerancia máxima de desfase: 1 hora).

---

### METRIC CONTRACT P0-02: Tasa de Conversión Lead → Reserva (Lead-to-Reservation Conversion Rate)
* **Nombre:** `metric_lead_to_reservation_conversion_rate`
* **Propósito de Negocio:** Evaluar la efectividad del equipo de ventas y la calidad del inventario en convertir prospectos en acuerdos de reserva.
* **Fórmula:**
  $$\text{Conversion Rate} = \frac{\text{Conteo de Leads que generaron una Reserva confirmada}}{\text{Total de Leads únicos captados en el mismo cohorte temporal}} \times 100$$
* **Grano:** Por cohorte mensual de captación de lead, desagregado por canal de origen (`source_key`) y proyecto (`asset_key`).
* **Fuente Operacional Autorizada:** Join auditado entre `crm.leads` y `crm.reservations` vía `crm.parties` / `crm.opportunities`.
* **Timezone:** `America/Lima`.
* **Filtros e Inclusiones:**
  - Reservas con estado `CONFIRMED` o que hayan pasado a `OPERATION`.
* **Exclusiones:**
  - Reservas canceladas o expiradas antes de confirmación financiera.
* **Sensibilidad / PII:** **INTERNAL** (Métrica cuantitativa agregada, no expone PII).
* **Owner:** Dirección Comercial / Célula Alpha.
* **Freshness:** Cierre diario al término de la jornada comercial (23:59:59).

---

### METRIC CONTRACT P0-03: Valor Monetario de Reservas Activas (Active Reservations Pipeline Value USD)
* **Nombre:** `metric_active_reservations_amount_usd`
* **Propósito de Negocio:** Monitorear el valor financiero comprometido en proceso de cierre transaccional para proyecciones de flujo de caja.
* **Fórmula:**
  $$\text{Pipeline USD} = \sum (\text{reservation\_amount\_usd}) \quad \text{donde } status \in ('ACTIVE', 'CONFIRMED', 'PENDING_PAYMENT')$$
* **Grano:** 1 fila por reserva activa en la fecha de corte.
* **Fuente Operacional Autorizada:** `crm.reservations` con snapshot financiero de `inventory.assets.price`.
* **Timezone:** `America/Lima`.
* **Filtros e Inclusiones:**
  - Estado de reserva activo y no vencido (`expires_at > NOW()` o confirmada).
* **Exclusiones:**
  - Reservas en estado `EXPIRED`, `CANCELLED` o `REVERTED`.
* **Sensibilidad / PII:** **CONFIDENTIAL** (Información financiera estratégica).
* **Owner:** Gerencia de Finanzas / Célula Alpha.
* **Freshness:** Cerca de tiempo real (Near-real-time: 15 minutos de tolerancia).

---

### METRIC CONTRACT P0-04: Conteo y Duración de Operaciones por Etapa (Operations Cycle Time)
* **Nombre:** `metric_operations_cycle_time_days`
* **Propósito de Negocio:** Medir la velocidad de formalización legal y entrega transaccional desde la conversión de reserva hasta el cierre de la operación.
* **Fórmula:**
  $$\text{Duración en Días} = \text{EXTRACT(EPOCH FROM (updated\_at - created\_at)) / 86400}$$
  $$\text{Volumen de Operaciones} = \sum \text{operaciones agrupadas por } status$$
* **Grano:** 1 fila por operación inmobiliaria formalizada.
* **Fuente Operacional Autorizada:** `crm.operations` y `crm.operation_status_history`.
* **Timezone:** `America/Lima`.
* **Filtros e Inclusiones:**
  - Operaciones formalizadas a partir de reservas válidas.
* **Exclusiones:**
  - Operaciones anuladas por desistimiento previo a firma.
* **Sensibilidad / PII:** **INTERNAL**.
* **Owner:** Líder de Operaciones Inmobiliarias / Célula Alpha.
* **Freshness:** Diario al cierre.

---

### METRIC CONTRACT P0-05: Ratio de Disponibilidad de Inventario (Inventory Availability Ratio)
* **Nombre:** `metric_inventory_availability_ratio`
* **Propósito de Negocio:** Monitorear la ocupación, velocidad de venta (absorption rate) y porcentaje de stock disponible para la venta inmediata.
* **Fórmula:**
  $$\text{Ratio Disponibilidad} = \frac{\text{Conteo de Activos con status = 'AVAILABLE'}}{\text{Total de Activos comercializables activos en catálogo}} \times 100$$
* **Grano:** 1 fila por proyecto/tipo de inmueble por día (calculado desde `snap_inventory_daily`).
* **Fuente Operacional Autorizada:** `inventory.assets` y eventos de `inventory.inventory_domain_events`.
* **Timezone:** `America/Lima`.
* **Filtros e Inclusiones:**
  - Activos con estado operativo activo (no archivados).
* **Exclusiones:**
  - Unidades bloqueadas por litigio o de uso propio de la empresa desarrolladora.
* **Sensibilidad / PII:** **PUBLIC / INTERNAL** (Apto para portales públicos en agregados y dashboards comerciales).
* **Owner:** Jefe de Inventario / Célula Alpha.
* **Freshness:** Snapshot diario ejecutado a las 00:00:00.
