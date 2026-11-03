# ALP5-003 — Contrato del pipeline de ingesta

| Campo     | Valor        |
| --------- | ------------ |
| Ticket    | ALP5-003     |
| Prioridad | MUST         |
| Estado    | Implementado |

## Alcance

El contrato registra ejecuciones, su payload normalizado, checksum, versión y errores. No carga datos en tablas de negocio: cada pipeline debe validar y transformar su dataset antes de marcar la ejecución como exitosa.

Los objetos de control y auditoría viven en `analytics.ingestion_runs` y `analytics.ingestion_errors`; no crean dependencias desde OLTP hacia `analytics`.

## Normalización y deduplicación

- `sourceSystem` se recorta y se normaliza a mayúsculas; `datasetName`, a minúsculas. Ambos admiten hasta 100 caracteres alfanuméricos, puntos, guiones y guiones bajos.
- `contractVersion` es un entero positivo que identifica la versión del contrato de datos.
- El payload debe ser un objeto o arreglo JSON. Se recortan espacios al inicio y final de valores de texto, las claves de objetos se ordenan recursivamente y los arreglos conservan su orden. No se admiten ciclos, `undefined`, fechas/instancias de clases ni números no finitos.
- `payloadChecksum` es SHA-256 hexadecimal minúsculo de la representación JSON canónica del payload normalizado.
- La combinación de sistema, dataset, versión y checksum es idempotente. Repetirla devuelve la ejecución existente; para procesar contenido cambiado se genera otro checksum y para evolucionar la forma se incrementa la versión.

## Estados y errores

`RECEIVED → VALIDATING → PROCESSING → SUCCEEDED` es la secuencia normal. Desde `RECEIVED`, `VALIDATING` o `PROCESSING` se puede pasar a `FAILED`. Un fallo puede reintentarse con `FAILED → VALIDATING`; una ejecución `SUCCEEDED` es terminal. Cada inicio de validación incrementa `attemptCount`.

La transición a `FAILED` requiere `error` con `phase`, `code` y `message`; `details` es un objeto JSON opcional y `retryable` es booleano opcional. Se guarda el último error en la ejecución y cada ocurrencia en el historial `ingestion_errors`. Un error no se acepta para otros estados. Las transiciones inválidas responden HTTP 409.

## API

La API está montada bajo `/api/ingestion`:

- `POST /runs`: `{ "sourceSystem": "CRM", "datasetName": "leads", "contractVersion": 1, "payload": { ... } }`. Responde 201 al crear o 200 al deduplicar.
- `GET /runs/:id`: devuelve estado y errores de la ejecución; no expone el payload almacenado. Desde ALP5-004 requiere principal autenticado y permiso por rol/Data Scope.
- `PATCH /runs/:id/status`: `{ "status": "VALIDATING" }`, `{ "status": "PROCESSING" }`, `{ "status": "SUCCEEDED" }` o `{ "status": "FAILED", "error": { "phase": "transform", "code": "INVALID_ROW", "message": "...", "details": {}, "retryable": false } }`.

Los endpoints son interfaces de control, no realizan la transformación/carga del dataset. La lista y detalle de ejecuciones usan `res.locals.auth` poblado por middleware confiable; ver el contrato de [ALP5-004](./ALP5-004_permission_metadata.md). Los endpoints de registro y cambio de estado deben exponerse solo a productores confiables o protegerse en el gateway de despliegue.

## Despliegue

Aplicar una vez la migración idempotente con `npm run db:ingestion:migrate --workspace=api` desde la raíz del monorepo. `DATABASE_URL` debe apuntar a la base PostgreSQL correspondiente.
