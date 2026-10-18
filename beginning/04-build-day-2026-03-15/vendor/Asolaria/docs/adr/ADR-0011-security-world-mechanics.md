# ADR-0011: Security World Mechanics

## Status
Accepted (2026-03-15)

## Context
The civilization world needs visual security mechanics: police inspection gates, suspicious packet review, anomaly quarantine zones, arrested agent containment, risk-driven route restrictions, and explicit human override. These are rendered in Dan's Madness/SwarmDesk shell based on truth-layer data from Asolaria.

## Decision
Define security world entities and mechanics as part of the civilization world model:

### Gate Entities
- Type: `gate`
- District: `gate_ring`
- States: `open`, `checking`, `blocked`, `quarantine`
- Gates appear at district boundaries
- Risk threshold determines gate state

### Police Agents
- Type: `agent` with role `watchdog` or `sentinel`
- Patrol routes between gates
- Respond to high-risk edge events
- Visual: converge on anomalous nodes when alert fires

### Quarantine Zone
- Type: `district` with special rendering
- Entities with risk score >= 7 are visually moved to quarantine
- Quarantine is visual only — actual blocking is done by approval engine
- Entities can be released by human override (APPROVE command)

### Arrest Mechanic
- When guardian blocks an action, the originating entity gets "arrested" state
- Visual: red glow, containment border, connecting route turns red
- Duration: until approval is granted or denied
- Automatic release after approval TTL expires

### Route Risk Coloring (per ADR-0008)
- Green: risk 0-2 (benign)
- Yellow: risk 3-5 (medium)
- Orange: risk 6-7 (high)
- Red: risk 8-9 (critical)
- Pulsing: active/hot route
- Dashed: learned latent route (GSL-GNN, future)

### Human Override
- Owner can override any quarantine/arrest via approval API
- Override emits graph event with full audit trail
- Visual: override shows as "pardon" animation

## Implementation
These mechanics are DATA-DRIVEN — Asolaria publishes entity states and risk scores via MQTT world/state. Dan's dashboard renders them. Asolaria does not render visuals.

### MQTT World State Entity Extension
```json
{
  "id": "entity_id",
  "securityState": "normal|checking|quarantined|arrested",
  "arrestReason": "guardian_blocked|approval_pending|...",
  "quarantineSince": "ISO timestamp or null",
  "approvalId": "pending approval ID or null"
}
```

## Consequences
- Positive: security is visible and tangible in the 3D world
- Positive: operators can see and respond to threats in real-time
- Negative: visual complexity increases
- Risk: false positives create visual noise — mitigated by tunable thresholds
