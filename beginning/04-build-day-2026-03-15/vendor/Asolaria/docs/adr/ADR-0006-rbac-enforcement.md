# ADR-0006: RBAC Enforcement on Extracted Routes

## Status
Accepted (implemented 2026-03-15)

## Context
ADR-0003 defined RBAC roles (sovereign, admin, lane, external, readonly, mobile) and middleware (requireRole, requirePermission) but never wired enforcement. All 269+ routes rely only on loopback-only guards. Non-loopback authenticated clients (bearer tokens) get through without role checks.

## Decision
Wire `requirePermission("write")` on all POST/PUT/DELETE route modules that accept mutations. Wire `requirePermission("admin")` on admin-only routes (omnispindle, admin-terminals, gateway tokens, security). Read-only GET routes remain accessible to all authenticated roles.

## Enforcement Map
- routes/omnispindle.js — requirePermission("admin")
- routes/adminTerminals.js — requirePermission("admin")
- routes/gatewayTokens.js — requirePermission("admin")
- routes/security.js — requirePermission("admin")
- routes/projects.js — GET: read, POST/PUT/DELETE: requirePermission("write")
- routes/taskLedger.js — GET: read, POST/PATCH/DELETE: requirePermission("write")
- routes/mistakes.js — GET: read, POST: requirePermission("write")
- routes/personas.js — GET: read, POST/DELETE: requirePermission("write")
- routes/captures.js — GET: read, POST: requirePermission("write")
- routes/uploads.js — POST: requirePermission("write")
- routes/workerRouter.js — GET: read, POST: requirePermission("write")
- routes/autoContinue.js — POST: requirePermission("admin")

## Consequences
- Positive: authenticated external/readonly clients can no longer mutate state
- Negative: existing loopback clients unaffected (loopback = admin by default)
- Risk: MCP control bridge clients need admin tokens to mutate

## Rollback
Remove requirePermission calls from route files. Existing loopback behavior is unaffected.
