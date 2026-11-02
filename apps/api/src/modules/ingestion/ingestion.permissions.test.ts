import test from "node:test";
import assert from "node:assert/strict";
import {
  IngestionContractError,
  normalizePermissionMetadata,
} from "./ingestion.contract";
import { requireIngestionAuth } from "./ingestion.auth";

test("normaliza y deduplica metadata de clasificación, roles, scopes y tags", () => {
  assert.deepEqual(
    normalizePermissionMetadata({
      classification: "CONFIDENTIAL",
      allowedRoles: [" advisor ", "ADVISOR", "manager"],
      dataScopes: ["Project:North", "project:north"],
      tags: [" PII ", "Customer"],
    }),
    {
      classification: "CONFIDENTIAL",
      allowedRoles: ["ADVISOR", "MANAGER"],
      dataScopes: ["project:north"],
      tags: ["customer", "pii"],
    },
  );
});

test("metadata ausente permanece restringida y sin acceso concedido", () => {
  assert.deepEqual(normalizePermissionMetadata(undefined), {
    classification: "RESTRICTED",
    allowedRoles: [],
    dataScopes: [],
    tags: [],
  });
});

test("rechaza clasificaciones y scopes malformados", () => {
  assert.throws(
    () => normalizePermissionMetadata({ classification: "TOP_SECRET" }),
    (error: unknown) =>
      error instanceof IngestionContractError &&
      error.code === "INVALID_PERMISSION_METADATA",
  );
  assert.throws(
    () => normalizePermissionMetadata({ dataScopes: [" "] }),
    (error: unknown) =>
      error instanceof IngestionContractError &&
      error.code === "INVALID_PERMISSION_METADATA",
  );
});

test("requiere un contexto autenticado con rol y scopes", () => {
  assert.deepEqual(
    requireIngestionAuth({
      subject: "user-1",
      role: "advisor",
      dataScopes: ["Project:North"],
    }),
    {
      subject: "user-1",
      role: "ADVISOR",
      dataScopes: ["project:north"],
    },
  );
  assert.throws(
    () => requireIngestionAuth(undefined),
    (error: unknown) =>
      error instanceof IngestionContractError &&
      error.code === "AUTHENTICATION_REQUIRED",
  );
  assert.throws(
    () =>
      requireIngestionAuth({
        subject: "user-1",
        role: "advisor",
        dataScopes: ["invalid scope"],
      }),
    (error: unknown) =>
      error instanceof IngestionContractError &&
      error.code === "INVALID_AUTH_CONTEXT",
  );
});
