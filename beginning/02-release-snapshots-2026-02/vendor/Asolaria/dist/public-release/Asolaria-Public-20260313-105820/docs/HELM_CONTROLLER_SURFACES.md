# Helm Controller Surfaces

This is the single entry point for `Helm` controller actions on the local machine.

## Primary Tool

- `C:\Users\acer\Asolaria\tools\Invoke-Helm-Control.ps1`

The tool keeps the admin-terminal identity separate from bridge lane names.

- `Helm` remains the controller identity.
- Relay packets are sent through `Asolaria` by default.
- `vector` and `rook` remain inner relay lanes only.
- Relay sender tokens are resolved from the bridge profile env var first and the local bridge policy file second.

## Supported Actions

- `Status`
  - QDD runtime summary across swarm, worker-router, Symphony, Augment, Gemini, project, and mistake hints
- `Relay`
  - send a bounded packet into `asolaria_bridge` for `vector`, `rook`, or another inner lane
- `Dispatch`
  - send a bounded work packet into `/api/worker-router/dispatch`
- `Symphony`
  - submit long-running work directly into `/api/integrations/symphony/submit`
- `Projects`
  - inspect QDD or another registered project
- `MistakeHints`
  - pull mistake-taxonomy avoidance hints
- `MistakePatterns`
  - inspect active mistake patterns
- `BrowserTask`
  - queue an Asolaria browser task
- `Playwright`
  - run local `playwright-cli` through `npx`

## Examples

### QDD runtime summary

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Invoke-Helm-Control.ps1 -Action Status
```

### Relay a task packet to `vector`

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Invoke-Helm-Control.ps1 `
  -Action Relay `
  -RelayTarget vector `
  -Thread qdd-super-swarm-20260311 `
  -RelayKind TASK `
  -Text "Review the current QDD restart packet and report only conflicts with the monorepo source of truth."
```

### Relay a note to `rook`

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Invoke-Helm-Control.ps1 `
  -Action Relay `
  -RelayTarget rook `
  -Thread qdd-super-swarm-20260311 `
  -RelayKind NOTE `
  -Text "Track ops drift only. Do not redefine the QDD implementation target."
```

### Route a bounded QDD task through the worker router

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Invoke-Helm-Control.ps1 `
  -Action Dispatch `
  -Title "QDD EZ Protect monorepo gap check" `
  -Objective "Compare the monorepo EZ Protect slice against the old reference repo and return only missing files and active blockers." `
  -TaskType research `
  -Sensitivity internal `
  -ProjectScope qdd `
  -AllowedPath "D:\projects\QDD\ebacmap-master","D:\projects\QDD\ebacmap"
```

### Submit long-running work directly to Symphony

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Invoke-Helm-Control.ps1 `
  -Action Symphony `
  -Title "Track QDD rollout evidence blockers" `
  -Objective "Maintain the live blocker list for provisioning proof, seed logs, rollback notes, and validation credentials." `
  -TaskType long_running `
  -Sensitivity internal `
  -ProjectScope qdd
```

### Pull QDD mistake hints

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Invoke-Helm-Control.ps1 `
  -Action MistakeHints `
  -ActivityType orchestration `
  -Limit 8
```

### Queue an Asolaria browser task

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Invoke-Helm-Control.ps1 `
  -Action BrowserTask `
  -Url "https://example.com" `
  -BrowserStep "extract_text" `
  -BrowserStep "extract_links"
```

### Use local Playwright CLI

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Invoke-Helm-Control.ps1 `
  -Action Playwright `
  -PlaywrightArgs snapshot
```

## Guardrails

- Do not use `Helm` as the relay sender lane name.
- Do not treat `augment_context` as a writer lane.
- Do not treat Symphony issue submission as direct repo mutation.
- Keep `qdd` pointed at `D:\projects\QDD\ebacmap-master`.
