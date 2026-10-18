# ADR-0008: Visual World Event/Render Contract

## Status
Accepted (2026-03-15)

## Context
Dan's Madness/Inventorium/SwarmDesk is the intended visual surface for Asolaria's civilization world. The MQTT transport exists. The SwarmDesk export endpoint exists. But there is no formal contract defining what Asolaria publishes and what the visual layer expects to render.

## Decision
Define a stable event/render contract between Asolaria (truth layer) and Madness (visual layer):

### Truth Events Published by Asolaria
Topic: `asolaria/world/state` — full world snapshot
Topic: `asolaria/graph/events` — individual graph events
Topic: `asolaria/colony/status` — colony agent status
Topic: `asolaria/health` — runtime health

### Renderable Entity Schema
```json
{
  "id": "string",
  "type": "sovereign|sub_colony|agent|tower|surface|gate|packet|task",
  "name": "string",
  "district": "citadel|colony|perimeter|gate_ring|cloud_arc|world_bridge|ledger_quarter|workshop",
  "state": "moving|awake|disturbed|resting|steady",
  "online": "boolean",
  "risk": { "score": 0-9, "level": "low|medium|high|critical" },
  "position": { "x": 0, "y": 0 }
}
```

### Route/Risk Visualization
```json
{
  "id": "string",
  "from": "entityId",
  "to": "entityId",
  "kind": "data_flow|control|approval|world_bridge|federation",
  "risk": { "score": 0-9, "level": "string" },
  "hot": "boolean"
}
```

### Update Cadence
- World state: every 15s via MQTT retained
- Colony status: every 10s via MQTT retained
- Graph events: real-time stream
- Health: every 30s via MQTT retained

### API Endpoints for Dashboard
- GET /api/worker-runtime/civilization-world — full world bundle
- GET /api/worker-runtime/swarmdesk-export — SwarmDesk-formatted payload
- GET /api/worker-runtime/trusted-entities — entity registry
- GET /api/graph-runtime/stream — SSE event stream

## Consequences
- Positive: Dan's dashboard can render live Asolaria state with a stable contract
- Negative: schema changes require contract migration
- Risk: MQTT broker restart drops retained state until next publish cycle

## Rollback
Contract is documentation — no code to roll back.
