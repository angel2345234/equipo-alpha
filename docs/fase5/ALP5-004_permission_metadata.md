# ALP5-004 — Metadata de permisos para retrieval

| Campo     | Valor        |
| --------- | ------------ |
| Ticket    | ALP5-004     |
| Prioridad | MUST         |
| Estado    | Implementado |

## Metadata por ejecución

`analytics.ingestion_runs` registra `classification`, `allowed_roles`, `data_scopes` y `tags`. Al crear una ejecución se envía `permissionMetadata`:

```json
{
  "classification": "CONFIDENTIAL",
  "allowedRoles": ["ADVISOR", "MANAGER"],
  "dataScopes": ["project:north"],
  "tags": ["customer", "pii"]
}
```

Clasificaciones permitidas: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` y `RESTRICTED`. Los roles se recortan y normalizan a mayúsculas; scopes y tags, a minúsculas. Se eliminan duplicados y se ordenan. Si no se entrega metadata, se usa `RESTRICTED` con allowlist vacía, que no permite retrieval a ningún rol.

La clasificación es una etiqueta de gobernanza; el permiso efectivo se decide mediante `allowedRoles` y `dataScopes`. Una lista de scopes vacía significa que no hay restricción adicional de scope, pero la coincidencia del rol sigue siendo obligatoria. Si la lista contiene scopes, basta una coincidencia entre el principal y el recurso.

## Principal autenticado

El middleware de autenticación existente debe poblar `res.locals.auth` antes de las rutas de retrieval:

```ts
{
  subject: string;
  role: string;
  dataScopes: string[];
}
```

No se leen rol ni scopes de parámetros, query o body del cliente. Si el principal falta o está malformado, retrieval responde 401. El servicio aplica los filtros de rol y scopes en la consulta SQL. Las ejecuciones no autorizadas responden 404, sin revelar si el ID existe.

## API de retrieval

Montada bajo `/api/ingestion`:

- `GET /runs`: lista hasta 100 ejecuciones autorizadas. Filtros opcionales: `datasetName`, `classification` y `tags` (tags separados por coma; coincide cualquier tag).
- `GET /runs/:id`: recupera una ejecución autorizada y su historial de errores; no expone el payload.

El middleware debe resolver el rol y scopes desde la identidad autenticada y su fuente de autorización confiable. La migración solo añade metadata y no sustituye ni inventa autenticación.

## Idempotencia y despliegue

Una repetición con el mismo sistema, dataset, versión y checksum debe conservar exactamente la misma metadata de permisos; cambios de metadata para ese mismo contenido responden 409. Para aplicar cambios de esquema: `npm run db:ingestion:permissions:migrate --workspace=api` con `DATABASE_URL` configurada. La migración asigna `RESTRICTED` y allowlists vacías a ejecuciones ya existentes.
