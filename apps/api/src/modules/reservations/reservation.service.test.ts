import test from "node:test";
import assert from "node:assert/strict";
import { ReservationService } from "./reservation.service";

const opportunityId = "opportunity-test-001";
const assetId = "asset-test-001";

function createFakePool() {
  const reservations = new Map<string, any>();
  const assets = new Map<string, any>([
    [
      assetId,
      {
        id: assetId,
        status: "AVAILABLE",
        commercial_status: "AVAILABLE",
        publication_status: "PUBLISHED",
      },
    ],
    [
      "asset-test-002",
      {
        id: "asset-test-002",
        status: "AVAILABLE",
        commercial_status: "AVAILABLE",
        publication_status: "PUBLISHED",
      },
    ],
  ]);

  const opportunities = new Set([opportunityId]);
  let insertCount = 0;
  let updateCount = 0;
  let rollbackCount = 0;

  const client = {
    async query(sql: string, params: any[] = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();

      if (
        normalized === "BEGIN" ||
        normalized === "COMMIT" ||
        normalized === "ROLLBACK" ||
        normalized.includes("pg_advisory_xact_lock")
      ) {
        if (normalized === "ROLLBACK") rollbackCount++;
        return { rows: [], rowCount: 0 };
      }

      if (
        normalized.includes("FROM crm.reservations") &&
        normalized.includes("idempotency_key = $1")
      ) {
        const reservation = reservations.get(params[0]);
        return {
          rows: reservation ? [reservation] : [],
          rowCount: reservation ? 1 : 0,
        };
      }

      if (normalized.includes("FROM inventory.assets")) {
        const asset = assets.get(params[0]);
        return {
          rows: asset ? [{ ...asset }] : [],
          rowCount: asset ? 1 : 0,
        };
      }

      if (normalized.includes("FROM crm.opportunities")) {
        const exists = opportunities.has(params[0]);
        return {
          rows: exists ? [{ id: params[0] }] : [],
          rowCount: exists ? 1 : 0,
        };
      }

      if (normalized.includes("FROM crm.offer_threads")) {
        return { rows: [], rowCount: 0 };
      }

      if (
        normalized.includes("FROM crm.reservations") &&
        normalized.includes("asset_id = $1")
      ) {
        return { rows: [], rowCount: 0 };
      }

      if (normalized.startsWith("INSERT INTO crm.reservations")) {
        insertCount++;

        const reservation = {
          id: params[0],
          opportunity_id: params[1],
          asset_id: params[2],
          offer_thread_id: params[3],
          idempotency_key: params[4],
          status: "ACTIVE",
          expires_at: "2030-01-01T00:00:00.000Z",
          created_by: params[6],
        };

        reservations.set(params[4], reservation);

        return { rows: [reservation], rowCount: 1 };
      }

      if (normalized.startsWith("UPDATE inventory.assets")) {
        updateCount++;
        const asset = assets.get(params[0]);

        if (asset) {
          asset.commercial_status = "RESERVATION_HOLD";
        }

        return { rows: [], rowCount: 1 };
      }

      throw new Error(`Consulta no simulada en la prueba: ${normalized}`);
    },

    release() {},
  };

  const fakePool = {
    async connect() {
      return client;
    },
  };

  return {
    pool: fakePool,
    reservations,
    assets,
    get insertCount() {
      return insertCount;
    },
    get updateCount() {
      return updateCount;
    },
    get rollbackCount() {
      return rollbackCount;
    },
  };
}

function validInput(idempotencyKey: string) {
  return {
    opportunityId,
    assetId,
    createdBy: "test-user",
    idempotencyKey,
    expiresInMinutes: 15,
  };
}

test("crea una reserva y pone el inmueble en espera", async () => {
  const fake = createFakePool();

  const result = await ReservationService.create(
    validInput("test-create-001"),
    fake.pool as any,
  );

  assert.equal(result.created, true);
  assert.equal(result.reservation.status, "ACTIVE");
  assert.equal(fake.insertCount, 1);
  assert.equal(fake.updateCount, 1);
  assert.equal(
    fake.assets.get(assetId).commercial_status,
    "RESERVATION_HOLD",
  );
});

test("repetir la misma clave devuelve la reserva existente", async () => {
  const fake = createFakePool();

  const first = await ReservationService.create(
    validInput("test-idempotency-001"),
    fake.pool as any,
  );

  const second = await ReservationService.create(
    validInput("test-idempotency-001"),
    fake.pool as any,
  );

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.reservation.id, first.reservation.id);
  assert.equal(fake.insertCount, 1);
  assert.equal(fake.updateCount, 1);
});

test("rechaza reutilizar la clave con otro inmueble", async () => {
  const fake = createFakePool();

  await ReservationService.create(
    validInput("test-conflict-001"),
    fake.pool as any,
  );

  await assert.rejects(
    ReservationService.create(
      {
        ...validInput("test-conflict-001"),
        assetId: "asset-test-002",
      },
      fake.pool as any,
    ),
    /CONFLICT: La clave de idempotencia ya se utilizó con otros datos/,
  );

  assert.equal(fake.insertCount, 1);
  assert.equal(fake.rollbackCount, 1);
  assert.equal(
    fake.assets.get("asset-test-002").commercial_status,
    "AVAILABLE",
  );
});

test("rechaza una duración de reserva inválida", async () => {
  const fake = createFakePool();

  await assert.rejects(
    ReservationService.create(
      {
        ...validInput("test-invalid-duration-001"),
        expiresInMinutes: 0,
      },
      fake.pool as any,
    ),
    /VALIDATION_ERROR: expiresInMinutes debe ser un entero entre 1 y 1440/,
  );

  assert.equal(fake.insertCount, 0);
});

test("rechaza un inmueble que ya está en espera de reserva", async () => {
  const fake = createFakePool();
  fake.assets.get(assetId).commercial_status = "RESERVATION_HOLD";

  await assert.rejects(
    ReservationService.create(
      validInput("test-unavailable-001"),
      fake.pool as any,
    ),
    /ASSET_UNAVAILABLE/,
  );

  assert.equal(fake.insertCount, 0);
  assert.equal(fake.rollbackCount, 1);
});


function createExpiryFakePool(options: {
  includeExpired?: boolean;
  includeFutureReservation?: boolean;
} = {}) {
  const assetId = "asset-expiry-001";

  const assets = new Map([
    [
      assetId,
      {
        id: assetId,
        status: "AVAILABLE",
        commercial_status: "RESERVATION_HOLD",
        publication_status: "PUBLISHED",
      },
    ],
  ]);

  const reservations: Array<{
    id: string;
    asset_id: string;
    status: string;
    expired: boolean;
  }> = [];

  if (options.includeExpired !== false) {
    reservations.push({
      id: "reservation-expired-001",
      asset_id: assetId,
      status: "ACTIVE",
      expired: true,
    });
  }

  if (options.includeFutureReservation) {
    reservations.push({
      id: "reservation-future-001",
      asset_id: assetId,
      status: "ACTIVE",
      expired: false,
    });
  }

  const client = {
    async query(sql: string, params: any[] = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();

      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(normalized)) {
        return { rows: [], rowCount: 0 };
      }

      if (normalized.startsWith("SELECT a.id")) {
        const hasExpiredReservation = reservations.some(
          (r) =>
            r.asset_id === assetId &&
            r.status === "ACTIVE" &&
            r.expired,
        );

        return {
          rows: hasExpiredReservation ? [{ id: assetId }] : [],
          rowCount: hasExpiredReservation ? 1 : 0,
        };
      }

      if (normalized.startsWith("UPDATE crm.reservations")) {
        const assetIds: string[] = params[0];

        const expired = reservations.filter((r) => {
          if (
            assetIds.includes(r.asset_id) &&
            r.status === "ACTIVE" &&
            r.expired
          ) {
            r.status = "EXPIRED";
            return true;
          }

          return false;
        });

        return {
          rows: expired.map((r) => ({ id: r.id })),
          rowCount: expired.length,
        };
      }

      if (normalized.startsWith("UPDATE inventory.assets a")) {
        const assetIds: string[] = params[0];
        const asset = assets.get(assetId);

        const hasFutureReservation = reservations.some(
          (r) =>
            r.asset_id === assetId &&
            r.status === "ACTIVE" &&
            !r.expired,
        );

        if (
          asset &&
          assetIds.includes(assetId) &&
          asset.status === "AVAILABLE" &&
          asset.commercial_status === "RESERVATION_HOLD" &&
          asset.publication_status === "PUBLISHED" &&
          !hasFutureReservation
        ) {
          asset.commercial_status = "AVAILABLE";

          return {
            rows: [{ id: assetId }],
            rowCount: 1,
          };
        }

        return { rows: [], rowCount: 0 };
      }

      throw new Error(
        `Consulta no simulada en prueba de vencimiento: ${normalized}`,
      );
    },

    release() {},
  };

  return {
    pool: {
      async connect() {
        return client;
      },
    },
    assets,
    reservations,
  };
}

test("vence una reserva caducada y libera el inmueble publicado", async () => {
  const fake = createExpiryFakePool();

  const result = await ReservationService.expireDueReservations(
    fake.pool as any,
  );

  assert.deepEqual(result, {
    expiredReservations: 1,
    releasedAssets: 1,
  });

  assert.equal(fake.reservations[0].status, "EXPIRED");
  assert.equal(
    fake.assets.get("asset-expiry-001")?.commercial_status,
    "AVAILABLE",
  );
});

test("no libera el inmueble si conserva otra reserva vigente", async () => {
  const fake = createExpiryFakePool({
    includeFutureReservation: true,
  });

  const result = await ReservationService.expireDueReservations(
    fake.pool as any,
  );

  assert.deepEqual(result, {
    expiredReservations: 1,
    releasedAssets: 0,
  });

  assert.equal(fake.reservations[0].status, "EXPIRED");
  assert.equal(fake.reservations[1].status, "ACTIVE");
  assert.equal(
    fake.assets.get("asset-expiry-001")?.commercial_status,
    "RESERVATION_HOLD",
  );
});

test("no cambia nada cuando no hay reservas vencidas", async () => {
  const fake = createExpiryFakePool({
    includeExpired: false,
  });

  const result = await ReservationService.expireDueReservations(
    fake.pool as any,
  );

  assert.deepEqual(result, {
    expiredReservations: 0,
    releasedAssets: 0,
  });

  assert.equal(fake.reservations.length, 0);
  assert.equal(
    fake.assets.get("asset-expiry-001")?.commercial_status,
    "RESERVATION_HOLD",
  );
});
