import test from "node:test";
import assert from "node:assert/strict";
import { OperationService } from "./operation.service";

function createFakePool(options: {
  reservation?: Record<string, any> | null;
  existingOperation?: Record<string, any> | null;
  unexpired?: boolean;
  partyId?: string | null;
  failOn?: string;
} = {}) {
  const reservation = options.reservation === undefined
    ? {
        id: "res-001",
        opportunity_id: "opp-001",
        asset_id: "asset-001",
        status: "ACTIVE",
        expires_at: "2099-01-01T00:00:00.000Z",
      }
    : options.reservation;

  let existingOperation = options.existingOperation ?? null;
  const calls: string[] = [];
  const queryParams: Array<{ sql: string; params: any[] }> = [];

  const client = {
    async query(sql: string, params: any[] = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      calls.push(normalized);
      queryParams.push({ sql: normalized, params });
      if (options.failOn && normalized.includes(options.failOn)) {
        throw new Error("Fallo SQL simulado");
      }

      if (
        normalized === "BEGIN" ||
        normalized === "COMMIT" ||
        normalized === "ROLLBACK"
      ) {
        return { rows: [], rowCount: 0 };
      }

      if (
        normalized.includes("FROM crm.reservations") &&
        normalized.includes("FOR UPDATE")
      ) {
        if (!reservation) return { rows: [], rowCount: 0 };

        return {
          rows: [{
            ...reservation,
            is_unexpired: options.unexpired ?? true,
          }],
          rowCount: 1,
        };
      }

      if (
        normalized.includes("FROM crm.operations") &&
        normalized.includes("source_reservation_id")
      ) {
        return {
          rows: existingOperation ? [existingOperation] : [],
          rowCount: existingOperation ? 1 : 0,
        };
      }

      if (normalized.includes("INSERT INTO crm.operations")) {
        const operation = {
          id: params[0],
          source_reservation_id: params[1],
          opportunity_id: params[2],
          asset_id: params[3],
          status: "OPEN",
          reservation_snapshot: params[4],
          created_by: params[5],
        };
        existingOperation = operation;
        return { rows: [operation], rowCount: 1 };
      }

      if (normalized.includes("INSERT INTO crm.operation_status_history")) {
        return { rows: [], rowCount: 1 };
      }

      if (
        normalized.includes("FROM crm.opportunities o") &&
        normalized.includes("JOIN crm.leads l")
      ) {
        const partyId = options.partyId === undefined
          ? "party-001"
          : options.partyId;

        return {
          rows: partyId ? [{ party_id: partyId }] : [{ party_id: null }],
          rowCount: 1,
        };
      }

      if (normalized.includes("INSERT INTO crm.operation_participants")) {
        return { rows: [], rowCount: 1 };
      }

      if (normalized.includes("UPDATE crm.reservations")) {
        return { rows: [], rowCount: 1 };
      }

      throw new Error(`Consulta SQL inesperada en prueba: ${normalized}`);
    },
    release() {},
  };

  return {
    pool: {
      connect: async () => client,
    } as any,
    calls,
    queryParams,
  };
}

test("convierte una reserva activa y vigente en una operación", async () => {
  const fake = createFakePool();

  const result = await OperationService.convertReservation(
    { reservationId: "res-001", createdBy: "test-user" },
    fake.pool,
  );

  assert.equal(result.created, true);
  assert.equal(result.operation.source_reservation_id, "res-001");
  assert.equal(result.operation.opportunity_id, "opp-001");
  assert.equal(result.operation.asset_id, "asset-001");
  assert.equal(result.operation.status, "OPEN");

  assert.ok(fake.calls.some((sql) => sql === "BEGIN"));
  assert.ok(fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operations")));
  assert.ok(fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operation_status_history")));
  assert.ok(fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operation_participants")));
  assert.ok(fake.calls.some((sql) => sql.startsWith("UPDATE crm.reservations")));
  assert.ok(fake.calls.some((sql) => sql === "COMMIT"));
  assert.ok(!fake.calls.some((sql) => sql === "ROLLBACK"));

  const history = fake.queryParams.find(({ sql }) =>
    sql.startsWith("INSERT INTO crm.operation_status_history"),
  );
  assert.ok(history);
  assert.equal(history.params[1], "test-user");
  assert.equal(history.params[2], "Operación creada por conversión de reserva");
  assert.deepEqual(JSON.parse(history.params[3]), {
    sourceReservationId: "res-001",
  });

  const participant = fake.queryParams.find(({ sql }) =>
    sql.startsWith("INSERT INTO crm.operation_participants"),
  );
  assert.ok(participant);
  assert.equal(participant.params[1], "party-001");
  assert.equal(participant.params[2], "test-user");
});

test("no crea participante cuando el lead no tiene party_id", async () => {
  const fake = createFakePool({ partyId: null });

  const result = await OperationService.convertReservation(
    { reservationId: "res-001", createdBy: "test-user" },
    fake.pool,
  );

  assert.equal(result.created, true);
  assert.ok(fake.calls.some((sql) =>
    sql.startsWith("INSERT INTO crm.operation_status_history"),
  ));
  assert.ok(!fake.calls.some((sql) =>
    sql.startsWith("INSERT INTO crm.operation_participants"),
  ));
  assert.ok(fake.calls.some((sql) => sql === "COMMIT"));
});

test("un reintento devuelve la operación existente sin crear otra ni duplicar eventos", async () => {
  const existing = {
    id: "op-existing",
    source_reservation_id: "res-001",
    status: "OPEN",
  };
  const fake = createFakePool({ existingOperation: existing });

  const result = await OperationService.convertReservation(
    { reservationId: "res-001", createdBy: "test-user" },
    fake.pool,
  );

  assert.equal(result.created, false);
  assert.equal(result.operation.id, "op-existing");
  assert.ok(!fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operations")));
  assert.ok(!fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operation_status_history")));
  assert.ok(!fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operation_participants")));
  assert.ok(!fake.calls.some((sql) => sql.startsWith("UPDATE crm.reservations")));
  assert.ok(fake.calls.some((sql) => sql === "COMMIT"));
});

test("rechaza una reserva inexistente", async () => {
  const fake = createFakePool({ reservation: null });

  await assert.rejects(
    OperationService.convertReservation(
      { reservationId: "missing", createdBy: "test-user" },
      fake.pool,
    ),
    /NOT_FOUND/,
  );

  assert.ok(fake.calls.some((sql) => sql === "ROLLBACK"));
});

test("rechaza una reserva que no está activa", async () => {
  const fake = createFakePool({
    reservation: {
      id: "res-001",
      opportunity_id: "opp-001",
      asset_id: "asset-001",
      status: "CANCELLED",
    },
  });

  await assert.rejects(
    OperationService.convertReservation(
      { reservationId: "res-001", createdBy: "test-user" },
      fake.pool,
    ),
    /CONFLICT/,
  );

  assert.ok(!fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operations")));
  assert.ok(fake.calls.some((sql) => sql === "ROLLBACK"));
});

test("rechaza una reserva vencida", async () => {
  const fake = createFakePool({ unexpired: false });

  await assert.rejects(
    OperationService.convertReservation(
      { reservationId: "res-001", createdBy: "test-user" },
      fake.pool,
    ),
    /ha vencido/,
  );

  assert.ok(!fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operations")));
  assert.ok(fake.calls.some((sql) => sql === "ROLLBACK"));
});

test("rechaza datos obligatorios vacíos", async () => {
  const fake = createFakePool();

  await assert.rejects(
    OperationService.convertReservation(
      { reservationId: "  ", createdBy: "test-user" },
      fake.pool,
    ),
    /VALIDATION_ERROR/,
  );

  assert.equal(fake.calls.length, 0);
});

test("confirma la transacción solo después de guardar todos los cambios", async () => {
  const fake = createFakePool();

  const result = await OperationService.convertReservation(
    { reservationId: "res-001", createdBy: "test-user" },
    fake.pool,
  );

  assert.equal(result.created, true);

  const historyIndex = fake.calls.findIndex((sql) =>
    sql.startsWith("INSERT INTO crm.operation_status_history"),
  );
  const operationIndex = fake.calls.findIndex((sql) =>
    sql.startsWith("INSERT INTO crm.operations"),
  );
  const participantIndex = fake.calls.findIndex((sql) =>
    sql.startsWith("INSERT INTO crm.operation_participants"),
  );
  const reservationUpdateIndex = fake.calls.findIndex((sql) =>
    sql.startsWith("UPDATE crm.reservations"),
  );
  const commitIndex = fake.calls.indexOf("COMMIT");

  assert.ok(operationIndex > -1);
  assert.ok(historyIndex > operationIndex);
  assert.ok(participantIndex > historyIndex);
  assert.ok(reservationUpdateIndex > participantIndex);
  assert.ok(commitIndex > reservationUpdateIndex);
});

test("rechaza createdBy vacío sin iniciar una transacción", async () => {
  const fake = createFakePool();

  await assert.rejects(
    OperationService.convertReservation(
      { reservationId: "res-001", createdBy: "   " },
      fake.pool,
    ),
    /VALIDATION_ERROR/,
  );

  assert.equal(fake.calls.length, 0);
});


test("hace rollback si falla el registro del historial", async () => {
  const fake = createFakePool({
    failOn: "INSERT INTO crm.operation_status_history",
  });

  await assert.rejects(
    OperationService.convertReservation(
      { reservationId: "res-001", createdBy: "test-user" },
      fake.pool,
    ),
    /Fallo SQL simulado/,
  );

  assert.ok(
    fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operations")),
  );
  assert.ok(
    fake.calls.some((sql) =>
      sql.startsWith("INSERT INTO crm.operation_status_history"),
    ),
  );
  assert.ok(fake.calls.includes("ROLLBACK"));
  assert.ok(!fake.calls.includes("COMMIT"));
  assert.ok(
    !fake.calls.some((sql) =>
      sql.startsWith("INSERT INTO crm.operation_participants"),
    ),
  );
  assert.ok(
    !fake.calls.some((sql) => sql.startsWith("UPDATE crm.reservations")),
  );
});

test("hace rollback si falla el registro del participante", async () => {
  const fake = createFakePool({
    failOn: "INSERT INTO crm.operation_participants",
  });

  await assert.rejects(
    OperationService.convertReservation(
      { reservationId: "res-001", createdBy: "test-user" },
      fake.pool,
    ),
    /Fallo SQL simulado/,
  );

  assert.ok(
    fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operations")),
  );
  assert.ok(
    fake.calls.some((sql) =>
      sql.startsWith("INSERT INTO crm.operation_status_history"),
    ),
  );
  assert.ok(fake.calls.includes("ROLLBACK"));
  assert.ok(!fake.calls.includes("COMMIT"));
  assert.ok(
    !fake.calls.some((sql) => sql.startsWith("UPDATE crm.reservations")),
  );
});

test("hace rollback si falla la actualización de la reserva", async () => {
  const fake = createFakePool({
    failOn: "UPDATE crm.reservations",
  });

  await assert.rejects(
    OperationService.convertReservation(
      { reservationId: "res-001", createdBy: "test-user" },
      fake.pool,
    ),
    /Fallo SQL simulado/,
  );

  assert.ok(
    fake.calls.some((sql) => sql.startsWith("INSERT INTO crm.operations")),
  );
  assert.ok(
    fake.calls.some((sql) =>
      sql.startsWith("INSERT INTO crm.operation_status_history"),
    ),
  );
  assert.ok(
    fake.calls.some((sql) =>
      sql.startsWith("INSERT INTO crm.operation_participants"),
    ),
  );
  assert.ok(fake.calls.includes("ROLLBACK"));
  assert.ok(!fake.calls.includes("COMMIT"));
});
