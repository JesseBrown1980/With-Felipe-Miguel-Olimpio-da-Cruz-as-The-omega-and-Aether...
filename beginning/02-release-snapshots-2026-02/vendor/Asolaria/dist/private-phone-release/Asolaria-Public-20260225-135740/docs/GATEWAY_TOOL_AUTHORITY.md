# Gateway Tool Authority

The gateway now supports policy-enforced tool invocation with approval gates.

## HTTP endpoints (Bearer gateway token required)

- `POST /invoke`
  - Body:
    - `tool`: tool id (for example `github.status`, `github.repos`, `browser.task`, `localops.run`, `sandbox.execute`)
    - `payload`: tool payload object
    - `approvalId` (optional): required for tools that need approval
    - `actor` (optional)
- `GET /approvals?status=pending&limit=50`
- `POST /approvals/:id/decide`
  - Body:
    - `decision`: `approve` or `deny`
    - `reason` (optional)
    - `actor` (optional)
- `GET /tools/policy`
- `GET /authority/status`
- `GET /authority/readiness`
- `POST /authority/readiness/drill`
- `POST /heartbeat/run`
- `POST /authority/mode/request`
- `POST /authority/mode/confirm`
- `POST /authority/mode/rollback`
- `GET /audit/status`
- `GET /audit/events`
- `GET /audit/verify`
- `POST /audit/verify`

## WS message types

- `tool.invoke`
- `approvals.list`
- `approval.decide`
- `tools.policy`
- `authority.status`
- `authority.readiness`
- `authority.readiness.drill`
- `authority.mode.request`
- `authority.mode.confirm`
- `authority.mode.rollback`
- `audit.status`
- `audit.list`
- `audit.verify`

## Readiness drill output

- `POST /authority/readiness/drill` and WS `authority.readiness.drill` return:
  - `drill.ok`
  - `drill.steps`
  - `drill.recommendedActions` (operator remediation hints)
- Manual remediation helpers:
  - `POST /heartbeat/run` on gateway
  - `POST /api/gateway/heartbeat/run` on Asolaria main app proxy
  - `POST /api/gateway/remediation/start-sandbox` on Asolaria main app proxy

## Approval model

- Policy file: `config/asolaria.gateway.json`
- Default approval-required tools:
  - `localops.run`
  - `sandbox.execute`
- Approval records:
  - Stored in `data/gateway-approvals.json`
  - One-time use
  - Bound to tool id + input hash
  - Expire by TTL (`tools.approvals.ttlMs`)

## Audit trail

- Authority/approval/tool-mode events are appended to:
  - `data/gateway-audit.ndjson`
- Hash chain verification is available via:
  - HTTP: `GET /audit/verify` (or `POST /audit/verify`)
  - WebSocket: `audit.verify`
- If audit integrity fails and `audit.gateControlWritesOnFailure=true`, control-write actions are blocked with:
  - `code: audit_integrity_locked`
  - `status: 503`

See `docs/GATEWAY_AUDIT_LOG.md` for the full audit contract.

## Example flow (PowerShell)

```powershell
$token = (Get-Content -Raw C:\Users\acer\Asolaria\data\vault\owner\gateway\gateway.token.txt).Trim()
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# 1) Invoke a tool that requires approval
$req = @{ tool="localops.run"; payload=@{ task="build"; target="asolaria" }; actor="owner" } | ConvertTo-Json -Depth 8
$first = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4791/invoke" -Headers $headers -Body $req -SkipHttpErrorCheck
$approvalId = $first.details.approval.id

# 2) Approve
$decision = @{ decision="approve"; actor="owner"; reason="one-time allow" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4791/approvals/$approvalId/decide" -Headers $headers -Body $decision

# 3) Re-run with approvalId
$req2 = @{ tool="localops.run"; payload=@{ task="build"; target="asolaria" }; approvalId=$approvalId; actor="owner" } | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4791/invoke" -Headers $headers -Body $req2
```
