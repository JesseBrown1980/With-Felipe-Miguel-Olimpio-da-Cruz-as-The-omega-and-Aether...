# Authority Modes

Asolaria gateway supports three authority modes:

- `operator_primary`
- `shared_control`
- `asolaria_primary`

## Mode behavior

- `operator_primary`:
  - Autonomous actors (matching `authority.asolariaActorPatterns`) are blocked from invoking tools.
- `shared_control`:
  - Autonomous actors may invoke only `authority.sharedControlAllowTools`.
- `asolaria_primary`:
  - Autonomous actors may invoke allowlisted tools.
  - Tool-specific approval rules still apply (for example `localops.run`, `sandbox.execute`).

## Transition safety

- Transitions are two-step:
  1. Create request (`/authority/mode/request`)
  2. Confirm request (`/authority/mode/confirm`) with exact confirmation phrase from config (`authority.confirmationPhrase`)
- Pending requests expire by `authority.transitionTtlMs`.
- Rollback endpoint forces `operator_primary` immediately:
  - `/authority/mode/rollback`

## Handover guards

For transitions to `asolaria_primary`, gateway can enforce readiness checks before accepting a mode request.

- Status endpoint:
  - `GET /authority/readiness?targetMode=asolaria_primary`
- Drill endpoint:
  - `POST /authority/readiness/drill` with `{"targetMode":"asolaria_primary"}`
  - runs audit verify + heartbeat + readiness evaluation and returns pass/fail
  - response includes:
    - `drill.steps`
    - `drill.recommendedActions`
  - you can run heartbeat directly via `POST /heartbeat/run`
  - Asolaria UI proxy helpers:
    - `POST /api/gateway/heartbeat/run`
    - `POST /api/gateway/remediation/start-sandbox`
- Config section:
  - `authority.handoverGuards`
    - `enabled`
    - `enforceForAsolariaPrimary`
    - `requireAuditIntegrity`
    - `requireAuditGateOpen`
    - `requireRecentHeartbeatOk`
    - `maxHeartbeatAgeMinutes`
    - `requireNoPendingApprovals`
    - `maxPendingApprovals`
- Failure response:
  - HTTP `403`
  - `code: authority_handover_guard_failed`

State file:

- `data/gateway-authority-state.json`
