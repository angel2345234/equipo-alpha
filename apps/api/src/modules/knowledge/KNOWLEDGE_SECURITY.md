# Knowledge Module - Security Requirements

## 1. Purpose

Define the security requirements for accessing and modifying
knowledge sources, documents and chunks.

This document supports ALP5-006 (Freshness & Provenance).

## 2. Authentication dependency

The repository currently does not expose a general authentication
middleware that establishes an authenticated principal.

The Knowledge module MUST NOT implement its own authentication
mechanism or reuse RESERVATION_EXPIRATION_ADMIN_KEY.

HTTP endpoints MUST NOT be exposed until a trusted authentication
middleware is integrated.

## 3. Authenticated principal contract

The Knowledge module expects an authenticated principal with:

- subject: authenticated user or service identifier.
- role: authenticated role.
- dataScopes: authorized data scopes.

The principal must originate from trusted authentication
middleware, never directly from request body parameters.

## 4. Authorization requirements

Before accessing or modifying knowledge records:

- Validate the authenticated principal.
- Validate the user's role.
- Validate the applicable data scopes.
- Enforce the document's permission metadata.
- Deny access when permissions cannot be established.

Empty or missing permissions must not grant access implicitly.

## 5. Data protection

- Do not expose restricted documents to unauthorized users.
- Do not return internal provenance metadata unless authorized.
- Do not log secrets, credentials or sensitive document content.
- Preserve source ownership, sensitivity and provenance.
- Keep PostgreSQL as the source of truth.

## 6. Endpoint integration requirements

Before mounting Knowledge HTTP routes:

1. Identify the trusted authentication middleware.
2. Define how the authenticated principal reaches the controller.
3. Validate role and data scopes.
4. Add positive and negative authorization tests.
5. Verify that unauthenticated requests are rejected.

## 7. Current implementation limitation

The current repository search identified references to
res.locals.auth in the Ingestion controller, but did not identify
the middleware that populates this property.

The reservation administrative API key is specific to the
reservation expiration operation and is not a substitute for
user authentication.

## 8. Pending dependency

Integration with the project's trusted authentication mechanism
is pending confirmation by the responsible team.

Until that dependency is resolved, Knowledge HTTP endpoints
must remain unexposed.

## 9. Scope

This document does not introduce a new authentication provider,
JWT implementation, user database or permission system.

It defines the security contract required for future integration.
