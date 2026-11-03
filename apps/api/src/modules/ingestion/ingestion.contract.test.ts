import test from "node:test";
import assert from "node:assert/strict";
import {
  assertIngestionTransition,
  checksumPayload,
  IngestionContractError,
  normalizePayload,
  normalizeRegistration,
} from "./ingestion.contract";

test("normaliza texto y produce el mismo checksum sin importar el orden de las claves", () => {
  const first = normalizeRegistration({
    sourceSystem: " crm ",
    datasetName: " Leads ",
    contractVersion: 1,
    payload: { name: " Ana ", nested: { z: 2, a: 1 } },
  });
  const second = normalizeRegistration({
    sourceSystem: "CRM",
    datasetName: "leads",
    contractVersion: 1,
    payload: { nested: { a: 1, z: 2 }, name: "Ana" },
  });

  assert.equal(first.sourceSystem, "CRM");
  assert.equal(first.datasetName, "leads");
  assert.deepEqual(first.normalizedPayload, second.normalizedPayload);
  assert.equal(first.payloadChecksum, second.payloadChecksum);
  assert.match(first.payloadChecksum, /^[0-9a-f]{64}$/);
});

test("conserva el orden de los arreglos al calcular el checksum", () => {
  assert.notEqual(
    checksumPayload(normalizePayload([1, 2])),
    checksumPayload(normalizePayload([2, 1])),
  );
});

test("normaliza claves JSON especiales sin perder sus valores", () => {
  const payload = JSON.parse('{"__proto__":{"active":true}}');

  assert.deepEqual(normalizePayload(payload), payload);
});

test("rechaza valores no JSON y versiones de contrato inválidas", () => {
  assert.throws(
    () => normalizePayload({ amount: Number.NaN }),
    (error: unknown) =>
      error instanceof IngestionContractError &&
      error.code === "INVALID_PAYLOAD_NUMBER",
  );
  assert.throws(
    () =>
      normalizeRegistration({
        sourceSystem: "CRM",
        datasetName: "leads",
        contractVersion: 0,
        payload: {},
      }),
    (error: unknown) =>
      error instanceof IngestionContractError &&
      error.code === "INVALID_CONTRACT_VERSION",
  );
});

test("permite transiciones definidas y bloquea reabrir una ejecución exitosa", () => {
  assert.doesNotThrow(() =>
    assertIngestionTransition("RECEIVED", "VALIDATING"),
  );
  assert.doesNotThrow(() => assertIngestionTransition("FAILED", "VALIDATING"));
  assert.throws(
    () => assertIngestionTransition("SUCCEEDED", "VALIDATING"),
    (error: unknown) =>
      error instanceof IngestionContractError &&
      error.code === "INVALID_STATUS_TRANSITION",
  );
});
