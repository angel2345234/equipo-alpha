import { IngestionContractError } from "./ingestion.contract";

export interface IngestionAuthContext {
  subject: string;
  role: string;
  dataScopes: string[];
}

declare global {
  namespace Express {
    interface Locals {
      auth?: IngestionAuthContext;
    }
  }
}

export function requireIngestionAuth(context: unknown): IngestionAuthContext {
  if (
    context === null ||
    typeof context !== "object" ||
    Array.isArray(context)
  ) {
    throw new IngestionContractError(
      "Se requiere un principal autenticado.",
      "AUTHENTICATION_REQUIRED",
      401,
    );
  }

  const principal = context as Record<string, unknown>;
  if (
    typeof principal.subject !== "string" ||
    !principal.subject.trim() ||
    typeof principal.role !== "string" ||
    !principal.role.trim() ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(principal.role.trim()) ||
    !Array.isArray(principal.dataScopes) ||
    !principal.dataScopes.every(
      (scope) =>
        typeof scope === "string" &&
        /^[a-zA-Z0-9][a-zA-Z0-9:_.\/-]{0,199}$/.test(scope.trim()),
    )
  ) {
    throw new IngestionContractError(
      "El principal autenticado no tiene el contexto de acceso requerido.",
      "INVALID_AUTH_CONTEXT",
      401,
    );
  }

  return {
    subject: principal.subject.trim(),
    role: principal.role.trim().toUpperCase(),
    dataScopes: principal.dataScopes.map((scope) => scope.trim().toLowerCase()),
  };
}
