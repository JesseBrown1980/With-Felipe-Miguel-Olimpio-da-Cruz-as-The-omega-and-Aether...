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

State file:

- `data/gateway-authority-state.json`
