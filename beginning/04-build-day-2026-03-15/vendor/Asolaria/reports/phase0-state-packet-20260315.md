# Asolaria Civilization Super Swarm — Phase 0 State Packet
# Generated: 2026-03-15T15:40:00Z
# Controller: Helm
# Evidence Class: CODE-VERIFIED unless noted

---

## 1. Executive Diagnosis

Asolaria is a live, partially-working, highly-brittle sovereign control plane running as a 35,875-line Express.js monolith on port 4781. The previous build session (2026-03-15 00:00–13:00Z) completed Phase 0 and made significant progress into Phase 1–3 before memory pressure (16GB RAM, too many agents on one machine) caused a lockup.

The system has real infrastructure: a durable job queue with WAL, gateway auth skeleton, request attribution middleware, 33/42 connector manifests, 5 extracted route modules, and 6 standing directives. It also has real gaps: 367 routes still inline, no RBAC enforcement, no DPAPI key wrapping, no process supervisor beyond Omnispindle, and no WAL compaction.

As of this session, a second machine (Rayssa's PC, 192.168.1.8) has been connected as the Liris sub-colony with Claude Code CLI, SSH access, and a live two-way bridge relay. Work is now split across both machines.

---

## 2. Reality Reconciliation Table

| Item | Status | Evidence | Risk If Wrong | Notes |
|------|--------|----------|---------------|-------|
| Runtime (port 4781) | VERIFIED_EXISTS | curl /api/health/fast → ok:true | Critical | 35,875 lines, Express.js |
| Graph runtime event journal | VERIFIED_EXISTS | data/graph-runtime-events.ndjson, 1338 events | High | appendFileSync, no fsync — best-effort durability |
| Heuristic risk engine | VERIFIED_EXISTS | src/riskEngine.js (217 lines), src/edgeRiskEngine.js (149 lines) | Medium | Pure regex/keyword heuristic, NOT ML |
| Experimental edge prototypes | VERIFIED_EXISTS | graphRuntimeQuery.js lines 443-495 | Medium | 4 prototypes: provider-route, phone-loop, task-flow, privileged-control |
| Civilization world model | VERIFIED_EXISTS | src/civilizationWorld.js (1284 lines) | Medium | Single export: buildCivilizationWorldState |
| MQTT broker | VERIFIED_EXISTS | services/mqtt-broker/server.mjs, Aedes on 18883/18884 | Medium | Connected=false in health — broker may need restart |
| SwarmDesk export | VERIFIED_EXISTS | src/swarmDeskExport.js (155 lines) | Low | Payload builder for Dan's dashboard |
| Omnispindle agent spawner | VERIFIED_EXISTS | src/omnispindle.js (537 lines) | Medium | 5 lanes, auto-restart, health polling. Currently idle (0 agents) |
| Provider hierarchy | VERIFIED_EXISTS | brainOrchestrator.js, Anthropic primary | High | Non-democratic, Helm controls |
| Memory store | VERIFIED_EXISTS | src/memoryStore.js (927 lines), data/memory.json | High | 300-turn sliding window, file-backed with snapshots. NOT durable operational memory |
| Task ledger | VERIFIED_EXISTS | src/taskLedgerStore.js (821 lines), data/task-ledger.json | Medium | NDJSON events, JSON state. NOT a scheduler |
| Job queue with WAL | VERIFIED_EXISTS | src/jobQueue.js (371 lines), data/job-queue-wal.ndjson | High | ADR-0002 implemented. Recovery, retry, dead-letter all working |
| Process supervision | VERIFIED_PARTIAL | Omnispindle manages 5 lanes. Graceful shutdown (SIGTERM/SIGINT) exists. No general process supervisor | High | server.js lines 35669-35688 |
| API auth | VERIFIED_PARTIAL | middleware/auth.js (215 lines), loopback bypass. ADR-0003. No RBAC enforcement yet | Critical | 234/372 routes unprotected. Loopback-only guard on admin routes |
| Request attribution | VERIFIED_EXISTS | middleware/attribution.js (62 lines), 1154 audit entries | Medium | ADR-0005. Chain-hashed audit log |
| Approval engine | VERIFIED_EXISTS | src/approvalEngine.js (413 lines) | Medium | 10-level command risk classification, session-based prefix trust |
| Vault / key handling | VERIFIED_PARTIAL | src/secureVault.js (402 lines) AES-256-GCM. src/secretHardening.js (194 lines) DPAPI | High | Vault works. DPAPI exists but master key files are plaintext on disk |
| Connector manifests | VERIFIED_PARTIAL | 33/42 manifested. 9 remaining: atlassian, avatarNpc, captures, googleWorkspaceCli, microsoft, pad, uiVisualAudit, virtualDisplay, wol | Medium | ADR-0004. Liris working on remaining 9 now |
| Standing directives store | VERIFIED_EXISTS | src/standingDirectivesStore.js (107 lines), routes/standingDirectives.js | Medium | 6 active directives. JSON file with backup |
| Google write scopes | VERIFIED_MISSING | googleConnector.js: writeScopes=[] | High | READ-ONLY: gmail.readonly, calendar.readonly. No write governance |
| Phone edge path | VERIFIED_PARTIAL | phoneMirrorConnector.js, 40+ mobile API routes, Android app exists | Medium | Phone keeper not running. ADB reverse present |
| Sub-colony registration | VERIFIED_PARTIAL | src/remoteNodeRegistry.js (140 lines). In-memory only, no persistence | High | MQTT topic model exists. No actual registration logic. No Rayssa-specific config |
| GNN training pipeline | VERIFIED_MISSING | No ML code. Heuristic only | Low (future) | buildGraphRuntimeTrainingDataset exists for export |
| Prototype-GNN sidecar | VERIFIED_MISSING | No Python sidecar. No model artifacts | Low (future) | Edge prototypes exist as heuristic seeds |
| Visual dashboard rendering | VERIFIED_PARTIAL | swarm-civilization-preview.html/.js exists | Low | Local preview works. No live 3D Dan dashboard integration yet |
| Program absorption pipeline | VERIFIED_MISSING | localRebuildConnector.js exists but is plan generation, not AST absorption | Low (future) | |
| Liris sub-colony (Rayssa's PC) | VERIFIED_EXISTS | SSH live, Claude Code 2.1.76, bridge relay two-way confirmed | High | Just bootstrapped this session. MCP bridge on 4793, relay on 8788 |

---

## 3. Contract Freeze

### Route Contracts (372 /api/* routes)
- Owner: server.js (367 inline) + routes/ (5 extracted)
- Source of truth: server.js line 23107+
- Compatibility: ALL must survive. ADR-0001 strangler-fig extraction preserves old paths
- Migration risk: HIGH — any rename breaks clients
- Adapter required: YES for any moved route (re-export from old path)

### Schema Contracts
| Schema | Owner | Source of Truth |
|--------|-------|-----------------|
| Memory turns | memoryStore.js | {id, role, text, images[], files[], meta, at} |
| Task statuses | taskLedgerStore.js | planned, ready, in_progress, blocked, review, done, canceled, archived |
| Graph events | graphRuntimeStore.js | {schemaVersion:"1.0", kind, id, at, component, category, action, actor, subject, target, context, policy, detail, risk} |
| Risk output | riskEngine.js | {score:0-9, level:low/medium/high/critical, reasons[]} |
| Mistake ledger | mistakeLedgerStore.js | NDJSON append-only |
| Job queue WAL | jobQueue.js | NDJSON: {event, jobId, type, at, ...} |
| Gateway audit | middleware/attribution.js | NDJSON chain-hashed: {id, at, type, actor, payload, hash, prevHash} |

### MQTT Topic Contracts
- Prefix: `asolaria/`
- Federation: `asolaria/nodes/<nodeId>/runtime/health`, `runtime/presence`, `agents/colony/status`, `world/state`
- Published from server.js: worldState, colonyStatus, runtimeHealth, graphEvents

### Identity Contracts
- Admin terminals: Helm (controller), Sentinel (watcher) — NOT bridge lanes
- Bridge lanes: vector, rook, forge, falcon, asolaria, watchdog — NOT admin terminals
- Bridge room: `asolaria_bridge`
- Sub-colony: liris (Rayssa's PC) — new, registered this session

---

## 4. Monolith Seam Map

| Seam | Purpose | Routes/Functions | Destination | Status |
|------|---------|-----------------|-------------|--------|
| gateway/auth | Bearer auth + loopback bypass | All /api/* | middleware/auth.js | DONE (ADR-0003) |
| attribution | Mutation audit trail | All POST/PUT/DELETE/PATCH | middleware/attribution.js | DONE (ADR-0005) |
| hooks | Hook event ingestion | /api/hooks/* | routes/hooks.js | DONE |
| standing directives | Owner directive CRUD | /api/standing-directives/* | routes/standingDirectives.js | DONE |
| connector manifests | Plugin discovery | /api/connectors/manifests/* | routes/connectorManifests.js | DONE (ADR-0004) |
| gateway tokens | Token CRUD | /api/gateway/tokens/* | routes/gatewayTokens.js | DONE |
| security | Command classification, hardening | /api/security/* | routes/security.js | DONE |
| config | Runtime settings, provider config | ~15 routes | src/config/ (PLANNED) | NOT STARTED |
| graph runtime | Event query, export, diff | /api/graph-runtime/* (5 routes) | routes/graphRuntime.js (PLANNED) | NOT STARTED |
| job/scheduler | Queue status, dispatch | /api/worker-router/* (5 routes) | routes/workerRouter.js (PLANNED) | NOT STARTED |
| skills/tools | Skill index, rebuild, run | /api/skills/* (6 routes) | routes/skills.js (PLANNED) | NOT STARTED |
| world export | Civilization world bundle | /api/worker-runtime/civilization-world | routes/civilizationWorld.js (PLANNED) | NOT STARTED |
| voice | Transcription, synthesis | /api/voice/* (29 routes) | routes/voice.js (PLANNED) | NOT STARTED |
| mobile | Phone control, inbox | /api/mobile/* (40 routes) | routes/mobile.js (PLANNED) | NOT STARTED |
| integrations | All external services | /api/integrations/* (92 routes) | routes/integrations.js (PLANNED) | NOT STARTED |
| federation | Sub-colony nodes | /api/federation/* (3 routes) | routes/federation.js (PLANNED) | NOT STARTED |

7 seams extracted, ~10 major seams remaining. Largest: integrations (92 routes), mobile (40), voice (29), phone (30).

---

## 5. Durable Substrate Design

### Implemented
- **Job queue WAL**: data/job-queue-wal.ndjson — recovery on boot, retry with exponential backoff, dead-letter lane
- **Standing directives**: Survive restart. JSON file with atomic backup-on-write
- **Graceful shutdown**: SIGTERM/SIGINT drain job queue, append shutdown event to graph
- **Gateway audit**: Chain-hashed NDJSON mutation log

### Not Yet Implemented
- **WAL compaction**: WAL and audit files grow unbounded — needs rotation/pruning
- **Standing directive scheduler**: Directives are stored but not automatically executed on schedule
- **Message durability for MQTT**: No QoS configuration, no message persistence
- **General process supervisor**: Only Omnispindle supervises lane agents. No supervisor for the main server itself

---

## 6. Security Hardening Status

### Done
- Gateway auth skeleton (bearer token + loopback bypass) — ADR-0003
- Request attribution on all mutations — ADR-0005
- Approval engine (10-level risk classification)
- Vault encryption (AES-256-GCM)
- DPAPI hardening module exists

### Not Done
- RBAC enforcement (roles defined, not enforced)
- Master key protection (key files on disk)
- Token storage DPAPI wrapping
- Audit log rotation
- Non-loopback API surface hardening

---

## 7. ADR Log

| ADR | Title | Status |
|-----|-------|--------|
| ADR-0000 | Template | Reference |
| ADR-0001 | Strangler-fig monolith decomposition | Accepted, in progress |
| ADR-0002 | Durable job queue with WAL | Accepted, implemented |
| ADR-0003 | Gateway auth skeleton | Accepted, implemented |
| ADR-0004 | Connector manifest registry | Accepted, 33/42 done |
| ADR-0005 | Request attribution middleware | Accepted, implemented |

---

## 8. Dual-Machine Topology (New)

| Machine | IP | Role | Resources |
|---------|-----|------|-----------|
| Jesse's PC | 192.168.1.3 | Sovereign / Helm | Asolaria core, bridge relay (8788), MQTT broker (18883) |
| Rayssa's PC | 192.168.1.8 | Liris sub-colony | Claude Code 2.1.76, MCP bridge (4793), SSH access |
| Bridge relay | 0.0.0.0:8788 | Coordination | Room: asolaria_bridge, token-protected |
| Phone | — | Edge (degraded) | Not actively connected this session |

---

## 9. Next Slices (Prioritized)

1. **Finish 9 connector manifests** — Liris executing now
2. **Extract graph-runtime routes** — 5 routes, clean seam
3. **Extract worker-router routes** — 5 routes, clean seam
4. **Extract skills routes** — 6 routes, clean seam
5. **WAL compaction** — prevent unbounded file growth
6. **RBAC enforcement** — wire role checks into auth middleware
7. **Extract federation routes** — 3 routes, enable Liris registration
8. **MQTT broker restart** — currently disconnected
9. **Standing directive scheduler** — auto-execute directives on schedule
10. **Master key DPAPI wrapping** — move key files into DPAPI store

---

## 10. State Packet JSON

```json
{
  "phase": "1-3 overlap",
  "slice": "dual-machine-bootstrap + continued-decomposition",
  "status": "in_progress",
  "verified_exists": ["runtime", "graph_runtime", "risk_engine", "edge_prototypes", "civilization_world", "mqtt_broker", "swarmdesk_export", "omnispindle", "provider_hierarchy", "memory_store", "task_ledger", "job_queue_wal", "approval_engine", "vault", "standing_directives", "attribution_middleware", "gateway_auth", "liris_subcolony"],
  "verified_partial": ["api_auth", "connector_manifests", "phone_path", "subcolony_registration", "process_supervision", "secret_hardening", "visual_dashboard"],
  "verified_missing": ["gnn_pipeline", "prototype_gnn", "google_write_scopes", "program_absorption", "rbac_enforcement", "wal_compaction", "directive_scheduler", "mqtt_durability"],
  "unknowns": ["mqtt_broker_current_connection_state", "phone_keeper_state"],
  "contracts_touched": [],
  "adrs": ["ADR-0001", "ADR-0002", "ADR-0003", "ADR-0004", "ADR-0005"],
  "tests": [],
  "rollback": [],
  "next_slice": "graph-runtime-route-extraction",
  "blockers": [],
  "notes_for_next_session": [
    "Liris sub-colony is live on Rayssa's machine via SSH+Claude Code",
    "Bridge relay on 0.0.0.0:8788 must be restarted if Jesse's machine reboots",
    "33/42 connector manifests done, Liris finishing remaining 9",
    "367 routes still inline in server.js",
    "RBAC roles defined but not enforced",
    "Master vault keys still on disk as plaintext files"
  ]
}
```
