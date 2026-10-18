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
- `POST /authority/mode/request`
- `POST /authority/mode/confirm`
- `POST /authority/mode/rollback`

## WS message types

- `tool.invoke`
- `approvals.list`
- `approval.decide`
- `tools.policy`
- `authority.status`
- `authority.mode.request`
- `authority.mode.confirm`
- `authority.mode.rollback`

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
