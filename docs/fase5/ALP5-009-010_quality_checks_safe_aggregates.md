# KNOWLEDGE QUALITY CHECKS (ALP5-009) Y XENIA SAFE AGGREGATES (ALP5-010)

| Campo | Valor |
| :--- | :--- |
| **Tickets** | ALP5-009 (SHOULD) · ALP5-010 (COULD) |
| **Fase** | Fase 5 — XENIA Intelligence & AI |
| **Célula** | Célula Alpha |
| **Responsable** | Wimmer Román |
| **Estado** | Implementado y probado en branch de prueba (`dev-wimmer`) — pendiente de review |

---

## 1. Endpoints

| Método | Ruta | Ticket | Sensibilidad |
| :--- | :--- | :--- | :--- |
| GET | `/api/xenia/knowledge/quality` | ALP5-009 | INTERNAL |
| GET | `/api/xenia/aggregates/inventory-by-zone` | ALP5-010 | PUBLIC |
| GET | `/api/xenia/aggregates/lead-demand` | ALP5-010 | INTERNAL |

Todas las respuestas de agregados incluyen un bloque `provenance` (contrato transversal de XENIA):

```json
"provenance": {
  "dataset": "analytics.agg_xenia_inventory_by_zone",
  "sourceTables": "inventory.assets + inventory.projects",
  "sensitivity": "PUBLIC",
  "sourceUpdatedAt": "2026-10-18T11:52:54.674Z",
  "generatedAt": "2026-11-02T16:52:17.785Z",
  "privacyRules": ["Solo activos publicados", "Sin datos personales"]
}
```

---

## 2. ALP5-009 — Knowledge Quality Checks

| Check | Severidad | Detecta |
| :--- | :--- | :--- |
| `duplicate_sources` | HIGH | Fuentes ACTIVE con el mismo `origin_url` (sin distinguir mayúsculas/espacios) |
| `duplicate_documents` | MEDIUM | Documentos con el mismo contenido (`md5`) en la misma fuente |
| `expired_active_sources` | HIGH | Fuentes ACTIVE con `validity_date` vencida |
| `orphan_chunks` | HIGH | Chunks cuyo documento no existe |
| `documents_without_chunks` | MEDIUM | Documentos que no pueden recuperarse por búsqueda |
| `empty_chunks` | MEDIUM | Chunks con contenido vacío |
| `missing_permissions` | CRITICAL | Fuentes sin `permissions`, `owner` o con `sensitivity` fuera de PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED |

**Estados:** `PASS` · `FAIL` · `SKIPPED` (con motivo). `passed = false` si falla algún check CRITICAL o HIGH.

**Diseño defensivo:** el modelo ALP5-001/002 fue revertido el 01/11, así que el servicio primero busca `knowledge_sources` en los esquemas `knowledge`, `analytics` y `public`, y revisa columna por columna. Si algo falta, el check queda `SKIPPED` indicando qué falta, en lugar de fallar. Se activa solo cuando el modelo exista.

**Contrato de columnas esperado** (diseño del commit revertido `f754cd3`): `knowledge_sources(id, owner, sensitivity, validity_date, permissions, status, origin_url)`, `knowledge_documents(id, source_id, content)`, `knowledge_chunks(id, document_id, content)`. Si ALP5-001/002 cambia nombres, ajustar `requires` en `knowledge-quality.service.ts`.

**Privacidad:** el informe devuelve solo IDs de muestra (máx. 5), nunca contenido.

---

## 3. ALP5-010 — XENIA Safe Aggregates

| Vista | Grano | Sensibilidad | Reglas |
| :--- | :--- | :--- | :--- |
| `analytics.agg_xenia_inventory_by_zone` | ciudad + distrito + tipo | PUBLIC | Solo activos `PUBLISHED`; precios solo USD |
| `analytics.agg_xenia_lead_demand_monthly` | mes (America/Lima) + canal + distrito + tipo | INTERNAL | k-anonimidad k = 3; exclusiones del Metric Contract P0-01 |

- **Vistas, no tablas:** siempre reflejan el OLTP actual y no copian datos personales.
- **k-anonimidad:** si un grupo tiene menos de 3 leads, `count_leads`, `count_qualified` y `source_updated_at` quedan en `NULL` y `is_suppressed = true`, para que no se pueda identificar a una persona por descarte.
- **Exclusiones P0-01:** leads con `status = 'TEST'` y correos `@test.com` / `@example.com`, igual que el KPI oficial.

---

## 4. Archivos

| Archivo | Rol |
| :--- | :--- |
| `apps/api/src/modules/xenia/knowledge-quality.service.ts` | Checks de calidad (ALP5-009) |
| `apps/api/src/modules/xenia/xenia-aggregates.service.ts` | Lectura de vistas + provenance (ALP5-010) |
| `apps/api/src/modules/xenia/xenia.controller.ts` / `xenia.routes.ts` | Endpoints `/api/xenia/*` |
| `apps/api/src/db/migrations/006_create_xenia_safe_aggregates.sql` | Vistas `agg_xenia_*` (idempotente) |
| `apps/api/src/scripts/test-knowledge-quality.ts` | Prueba con defectos plantados en esquema temporal |
| `apps/api/src/scripts/run-xenia-aggregates.ts` | Aplica 006 + guardia PII + reconciliación |
| `apps/api/src/index.ts`, `apps/api/package.json` | Registro de rutas y scripts |

```bash
# Desde apps/api
npm run test:xenia:quality     # prueba ALP5-009 (crea y borra knowledge_qa_fixture)
npm run db:xenia:aggregates    # aplica 006 y verifica ALP5-010
```

---

## 5. Evidencia (branch `dev-wimmer`, 02/11/2026)

**ALP5-009 — test con defectos plantados**

| Caso | Resultado |
| :--- | :--- |
| Modelo inexistente | 7/7 SKIPPED, sin errores ✅ |
| Defectos plantados | Los 7 checks detectan el conteo exacto; `passed = false` ✅ |
| Columna `validity_date` eliminada | Solo ese check SKIPPED, con motivo ✅ |
| Datos corregidos | 7/7 PASS ✅ |
| Limpieza | Esquema temporal eliminado ✅ |

**ALP5-010 — verificación**

| Verificación | Resultado |
| :--- | :--- |
| Guardia PII | 0 columnas de PII en ambas vistas ✅ |
| Inventario | 6 publicados en la vista = 6 en OLTP ✅ |
| Leads | 3 grupos = 3 en la fuente, 0 diferencias; 1 grupo oculto por k = 3 ✅ |
| Endpoints | Los 3 responden HTTP 200 ✅ |
| `tsc --noEmit` | 0 errores en todo `apps/api` ✅ |

---

## 6. Limitaciones y pendientes

- **Dependencia ALP5-001/002:** el 009 se valida con datos de prueba; con el modelo real, revisar que las columnas coincidan con el contrato de la sección 2.
- **Seguridad (bloqueante para exponer):** la API no tiene autenticación ni RBAC. Los endpoints INTERNAL (`/knowledge/quality`, `/aggregates/lead-demand`) no deben exponerse fuera de la red interna hasta que Security implemente control por rol.
- **Numeración de migraciones:** `004` y `005` son de ALP5-003/004 (Angel, 02/11); esta migración usa `006`. El snapshot ALP4-006 (`004_create_inventory_snapshot.sql`, aún sin PR) choca con el `004` de Angel y debe renumerarse. Acordar la numeración en equipo.
- **Modelo de permisos:** ALP5-004 (Angel) guarda clasificación y roles en `analytics.ingestion_runs` (`classification`, `allowed_roles`, `data_scopes`); el check `missing_permissions` revisa `knowledge_sources.permissions` (diseño revertido de ALP5-001/002). Acordar cuál es la tabla oficial y ajustar el check.
- **Hallazgo de datos:** 9 de 20 leads tienen `asset_id` que no existe en `inventory.assets` (aparecen como `SIN ACTIVO`). Revisar integridad referencial de `crm.leads.asset_id`.
- **Hallazgo de datos:** el proyecto "Residencial Zenplus Los Álamos" no tiene `district`; sus leads aparecen como `SIN DISTRITO`.
