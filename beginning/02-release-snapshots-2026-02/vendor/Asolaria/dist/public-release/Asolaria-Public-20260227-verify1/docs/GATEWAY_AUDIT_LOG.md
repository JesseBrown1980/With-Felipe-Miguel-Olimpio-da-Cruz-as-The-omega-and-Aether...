# Gateway Audit Log

The gateway maintains a tamper-evident append-only audit log for authority events.

## Storage

- Config section: `config/asolaria.gateway.json` -> `audit`
- Default file: `data/gateway-audit.ndjson`
- Format: one JSON object per line (NDJSON)
- Chain model:
  - each entry stores `prevHash`
  - each entry stores `hash = SHA-256(prevHash|id|at|type|payloadHash)`
  - payload integrity uses `payloadHash = SHA-256(stable_json(payload))`

## Integrity Gate

The gateway can fail closed when audit integrity is broken.

- Config:
  - `audit.verifyEveryMinutes` (default `10`)
  - `audit.gateControlWritesOnFailure` (default `true`)
- Behavior when locked:
  - blocks control-write actions:
    - `POST /invoke`
    - `POST /approvals/:id/decide`
    - `POST /authority/mode/request`
    - `POST /authority/mode/confirm`
    - `POST /authority/mode/rollback`
    - WS: `tool.invoke`, `approval.decide`, `authority.mode.*`
  - returns error code `audit_integrity_locked` (HTTP `503`)
- Unlock path:
  - fix audit file integrity issue
  - run `GET/POST /audit/verify` (or wait for periodic verify)
  - lock clears automatically once verify returns `ok=true`

## Event coverage

Current audited event sources include:

- authority mode requests/confirmations/rollbacks
- approval creation/decision/use
- tool invoke success/failure summaries
- gateway startup authority event

## HTTP API (Bearer token required)

- `GET /audit/status`
  - returns file path, totals, last hash, integrity snapshot, and gate status
- `GET /audit/events?type=<type>&since=<iso>&limit=<n>`
  - reverse-chronological event query
- `GET /audit/verify`
- `POST /audit/verify`
  - recomputes and validates full chain integrity

## Asolaria UI proxy API

For the built-in web UI (`public/index.html`), Asolaria exposes loopback-only proxy routes:

- `GET /api/gateway/authority/status`
- `GET /api/gateway/authority/readiness`
- `POST /api/gateway/authority/readiness/drill`
- `POST /api/gateway/heartbeat/run`
- `POST /api/gateway/remediation/start-sandbox`
- `GET /api/gateway/audit/status`
- `GET /api/gateway/audit/events`
- `GET /api/gateway/audit/verify`
- `POST /api/gateway/audit/verify`

These proxy routes read the gateway token from:

- `ASOLARIA_GATEWAY_TOKEN` (preferred), or
- `config/asolaria.gateway.json` -> `gateway.auth.tokenFile`.

## WebSocket API

- request `audit.status` -> response `audit.status.result`
- request `audit.list` with optional payload:
  - `type`, `since`, `limit`
  - response `audit.list.result`
- request `audit.verify` -> response `audit.verify.result`

## Operator checks

PowerShell quick check:

```powershell
$token = (Get-Content -Raw .\data\vault\owner\gateway\gateway.token.txt).Trim()
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://127.0.0.1:4791/audit/status" -Headers $headers | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "http://127.0.0.1:4791/audit/verify" -Headers $headers | ConvertTo-Json -Depth 10
```
