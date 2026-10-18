# ADR-0005: Request Attribution Middleware

## Status
Accepted (implemented 2026-03-15)

## Context
API mutations had no forensic trail linking them to a specific actor, source, or IP. The gateway-audit.ndjson existed but was only populated by the gateway helper service, not the main server. Every privileged connector action must be attributable and auditable per the Security Law.

## Decision
Add middleware/attribution.js that attaches {ip, isLoopback, actor, role, source, method, path, at} to every request, and appends mutation events (POST/PUT/DELETE/PATCH) to gateway-audit.ndjson. Wired into server.js via app.use("/api", attributionMiddleware()).

## Consequences
- Positive: every API mutation is now traceable to actor + IP + timestamp
- Negative: appending to NDJSON on every mutation adds ~1ms overhead
- Risk: audit file grows unbounded (needs rotation, same as graph events)

## Rollback
Remove app.use() line and middleware require from server.js.

## Evidence
- POST to /api/standing-directives produces audit entry with actor=loopback
