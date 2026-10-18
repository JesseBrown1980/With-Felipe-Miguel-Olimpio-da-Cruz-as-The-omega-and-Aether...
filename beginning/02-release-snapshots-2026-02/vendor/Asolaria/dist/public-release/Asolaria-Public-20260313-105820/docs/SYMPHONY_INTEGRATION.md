# Symphony Integration

This Asolaria integration treats `openai/symphony` as a managed sidecar service, not as an external
model provider.

## What Asolaria stores

- `repoRoot`: local checkout of the Symphony repository
- `workflowPath`: target `WORKFLOW.md` used by Symphony
- `linearProjectSlug`
- `LINEAR_API_KEY`
- `codexCommand`
- optional custom launch command / working directory

Secrets are stored in the owner vault under `integrations.symphony`.

## API

- `GET /api/integrations/symphony/status`
- `POST /api/integrations/symphony/config`
- `POST /api/integrations/symphony/start`
- `POST /api/integrations/symphony/stop`
- `POST /api/integrations/symphony/restart`

All mutating routes are loopback-only and Guardian-gated.

## Notes

- The reference implementation from `openai/symphony` currently depends on:
  - a local Symphony checkout
  - a valid `WORKFLOW.md`
  - `LINEAR_API_KEY`
  - Codex app-server support
  - the Elixir toolchain plus `mise` when using the stock Elixir runtime
- On Windows, Asolaria launches the built escript via `mise exec -- escript ./bin/symphony ...`
  instead of relying on the Unix shebang form.
- Asolaria treats `mix.exs` as the reference Elixir project marker. If `bin/symphony` has not been
  built yet, the stock start flow bootstraps with `mise trust`, `mise install`, `mix setup`, and
  `mix build` before launching the service.
- Asolaria reports missing prerequisites in `/api/integrations/symphony/status` instead of trying to
  launch blindly.
- Native Windows install for `mise` can be done with `winget install --id jdx.mise --exact`.

## Helm / Sentinel

- `Helm` is the controller admin terminal and may query/configure/start/stop Symphony through Asolaria.
- `Sentinel` is the helper/watch terminal and uses Symphony status to detect drift, stale issue queues, or controller packet mismatch.
- In QDD `SUPER_SWARM` mode, Symphony is the long-running issue lane only.
- Direct repo writes still belong to the local Codex lane; Symphony should not silently replace controller authority.

## Quick local config example

```powershell
$body = @{
  enabled = $true
  repoRoot = "C:\path\to\symphony"
  workflowPath = "C:\path\to\your-repo\WORKFLOW.md"
  linearProjectSlug = "your-linear-project-slug"
  linearApiKey = "<linear-token>"
  sourceRepoUrl = "https://github.com/your-org/your-repo.git"
  workspaceRoot = "C:\workspaces\symphony"
  codexCommand = "codex app-server"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:4781/api/integrations/symphony/config" `
  -ContentType "application/json" `
  -Body $body
```
