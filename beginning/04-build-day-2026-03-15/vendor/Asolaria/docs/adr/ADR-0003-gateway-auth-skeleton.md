# ADR-0003: Gateway Auth Skeleton

## Status
Accepted (implemented 2026-03-15)

## Context
All 383+ /api/* routes on port 4781 are unauthenticated. Any device on the local network can query or mutate Asolaria state. This must be hardened before exposing write-capable Google governance (Phase 4) or MCP remote AI (Phase 8).

## Decision
Add bearer token middleware at middleware/auth.js with loopback bypass. Loopback requests (127.0.0.1, ::1) continue without auth for backward compatibility. Non-loopback requests require `Authorization: Bearer <token>`. Tokens are stored in data/gateway-auth-tokens.json with label, role, createdAt, lastUsedAt. Token management API at /api/gateway/tokens (loopback only).

## RBAC skeleton
Roles defined but not yet enforced: sovereign, admin, lane, external, readonly.

## Consequences
- Positive: non-loopback access now requires auth, token audit trail exists
- Negative: loopback bypass means local processes are still trusted (acceptable for Phase 2)
- Risk: token storage is file-based not DPAPI-wrapped yet (Phase 2 hardening)

## Rollback
Remove middleware/auth.js require and app.use() call from server.js.

## Evidence
- Non-loopback request without bearer gets 401
- Loopback request still works without token
- /api/gateway/tokens shows token list
