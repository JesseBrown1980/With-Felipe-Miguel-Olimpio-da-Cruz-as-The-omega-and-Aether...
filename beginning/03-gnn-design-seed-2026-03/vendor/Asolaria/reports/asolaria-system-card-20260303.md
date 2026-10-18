# Asolaria System Card (Sanitized, Frontier-Model Analysis Format)

Date: 2026-03-03  
Scope: Architecture, abilities, controls, performance, and upgrade priorities  
Sensitivity: Sanitized (no secrets, no token values, no private keys/passwords)

## 1) System Identity

Asolaria is a local-first AI control plane that orchestrates:
- Multi-model reasoning (Codex-first with fallback providers)
- Multi-agent colony execution lanes
- Connector-driven integrations (Google, GCP/Vertex, NotebookLM, Slack/Telegram/GitHub, desktop/phone control, browser automation)
- Voice/transcript and meeting-assist pipelines
- Policy/approval governance with relay-aware safety controls

Core role: an orchestration and operations runtime, not just a chat app.

---

## 2) Host Build and Runtime Snapshot

### Host hardware (captured on this machine)
- CPU: Intel Core i5-8300H @ 2.30 GHz
- Cores/threads: 4 / 8
- Max clock: 2304 MHz
- RAM: ~16 GB visible
- GPU 1: NVIDIA GeForce GTX 1050 (~4 GB VRAM)
- GPU 2: Intel UHD Graphics 630 (~1 GB shared)
- OS: Windows 11 Home Single Language, 64-bit

### Runtime footprint (sanitized health summary)
- App: Asolaria
- Queue capacity: 16 workers, async job queue enabled
- Colony agents observed: 6 total, 5 online/active
- Task ledger: 380 total tasks, 41 open, 1635 events
- Skills indexed: 49
- Memory turns: 300
- Stealth mode: enabled
- Approval mode: smart
- Brain primary/fallback: codex -> vertex -> gemini-api -> cursor -> antigravity

---

## 3) System Architecture (High-Level)

### Control planes
1. **Interaction plane**
   - Web UI and mobile/PWA consoles
   - Multi-mode UX (simple/admin/advanced, stealth behavior)
2. **Execution plane**
   - Local jobs queue, tool routing, skill runtime
   - CLI/model connector execution
3. **Integration plane**
   - External providers and platform connectors
   - OAuth and managed connector states
4. **Realtime media plane**
   - Voice capture, live transcription paths, caption bridge
5. **Governance plane**
   - Authority policy, allowlists, approvals, ACLs, relay controls
6. **Ops/observability plane**
   - Health endpoints, guardrails, background keepers, tunnel monitors, reports

---

## 4) Three Interface Layers (Requested "Computer Use" Stack)

### Layer A: Human visual/clickable interface
- Main local UI (`index.html`, app shell)
- Interview copilot view and transcript mirrors
- Mobile console and approvals UI

### Layer B: Non-visual browser/page automation
- Browser task APIs (`/api/browser/task`, chrome inspect/screenshot/open routes)
- Playwright-style headless tasking and extraction
- Page operations without requiring human-visible interaction

### Layer C: Device/system control interface
- Desktop/local ops execution
- Windows/power/window control routes
- Phone mirror/control routes with explicit control arming and authority checks

---

## 5) Colonies / Agent Topology

Observed colony profile includes:
- Core runtime agent
- Main brain lane
- Ops lane
- Build lane
- Phone lane
- Watchdog/supervisor lane

Behavioral model:
- Relay-backed messaging room and heartbeats
- Completion signals and digest monitoring
- Multi-lane execution with scoped role responsibilities

---

## 6) Connector and API Ability Inventory (Sanitized)

### Local connector modules (sampled from `src/connectors`)
- `codexConnector`, `cursorAgentConnector`, `anthropicCliConnector`, `geminiCliConnector`
- `googleConnector`, `gcpConnector`, `vertexConnector`, `notebooklmConnector`, `geminiApiConnector`
- `githubConnector`, `slackConnector`, `telegramConnector`, `atlassianConnector`
- `desktopCaptureConnector`, `desktopControlConnector`, `desktopDisplayConnector`, `chromeConnector`
- `phoneMirrorConnector`, `phoneProMirrorConnector`, `phoneDeveloperOptionsConnector`
- `voiceConnector`, `openclawConnector`, `localOpsConnector`, `capturesConnector`

### Major API capability families (from server routes)
- System health/settings/personas/policy
- Providers/external brain runs and model settings
- Voice: transcribe/listen/live/bridge-caption/reply/speak
- Phone mirror and pro-mirror controls
- Mobile auth/session/control/windows/power/push/approvals
- Memory/chat/conversation/notebook/task-ledger/projects
- Browser/local-ops/chrome/pad tools
- Integrations: Slack, Telegram, GitHub, Google, GCP, Vertex, NotebookLM
- Gateway authority and audit verification

### Model/tool selectors now controlled
- Codex CLI path and model/reasoning effort settings
- Gemini CLI + Gemini API lane
- GCP and Vertex integration manager
- NotebookLM enterprise routes
- Cursor/antigravity external provider abstraction
- OpenClaw mode selection (`read_only` / `governed` / `disabled`)

---

## 7) OCR, Transcription, and Realtime Meeting Pipeline

### Current implemented lanes
- Direct audio transcription endpoints (`/api/voice/transcribe`, `/api/voice/transcribe-chunk`)
- Live transcription session lifecycle (`/api/voice/live/start|stop|transcript`)
- Caption bridge ingest/pull (`/api/voice/bridge-caption/push|pull|reset`)
- Source-oriented capture modes including meeting caption bridges (Meet/Verve labels present in UI/routes)

### Practical architecture pattern
- Fast path: caption/bridge ingestion for low-latency text updates
- Voice path: local chunking/transcribe endpoints
- Agent path: text events fan out into memory/tasks/assistant reasoning

---

## 8) MCP and WebMCP Optimization (How Reduction Was Done)

### What was implemented
- MCP-ready external provider runtime in `externalBrainConnector`
- Configurable fields for `server_label`, `server_url`/`connector_id`, `allowed_tools`, `require_approval`
- Dynamic allowlist selection and approval split
- MCP cache for discovered tool names and context IDs with TTL pruning
- Policy presets (`read_only`, `balanced`, `write_guarded`)
- MCP cache status/clear API endpoints

### Numbering/indexing strategy used
1. Enumerate available tool families once
2. Map intent -> minimal tool subset
3. Send pointer + compact allowlist instead of full inline schemas
4. Reuse prior response context (`previous_response_id`) when safe
5. Prune cache by TTL and explicit invalidation route

### Measured token payload impact (recorded benchmark)
- 50 inline function tools: 5382 tokens
- 1 MCP pointer + allowlist(5): 82 tokens
- Follow-up with previous response context: 42 tokens
- Savings observed in benchmark: ~98-99%

Interpretation:
- Reduction is material for tool-heavy turns.
- Savings vary by schema verbosity and tokenizer behavior.

---

## 9) System Manager / Monitoring Integration

Implemented ops controls include:
- Health guardrail checks and monitor scripts
- Job queue status and async execution tracking
- Task ledger state/events APIs
- Tunnel smoke tests and continuous tunnel monitor
- Phone background bridge keeper + status telemetry
- Startup automation/report generation and runtime status reports

Also available:
- Window discovery/focus/action APIs
- Power status/shutdown/restart/abort APIs (guarded)
- Push status/subscription/test endpoints

---

## 10) Performance Snapshot (Local, Current Run)

Benchmark method: local HTTPS loopback (`https://127.0.0.1:5443`), 20 samples each, curl timing.

- `/api/health`
  - avg: 188.29 ms
  - p95: 212.80 ms
  - min: 156.33 ms
  - max: 375.14 ms
- `/api/voice/bridge-caption/push`
  - avg: 17.20 ms
  - p95: 19.24 ms
  - min: 15.55 ms
  - max: 19.29 ms
- `/api/voice/bridge-caption/pull`
  - avg: 22.45 ms
  - p95: 25.74 ms
  - min: 17.16 ms
  - max: 26.53 ms

Notes:
- These are local endpoint timings, not end-to-end cloud latency.
- They validate low-latency bridge I/O on this host.

---

## 11) Security and Governance Posture (Sanitized)

### Strengths
- Authority policy and role allowlists for sensitive controls
- Screen viewer ACL and remote auth requirements
- Encrypted remote requirement flag enabled
- Approval workflows (including mobile approvals)
- Relay-aware output policy with abstraction-first external sharing controls
- Gateway authority/audit endpoints and policy artifacts

### Gaps identified for hardening
1. **Fail-closed execution boundaries** should be enforced uniformly across all high-risk control routes.
2. **Outbound error redaction consistency** should be upgraded so stack traces/string payload leaks are stripped before leaving trusted boundaries.
3. **Policy-mandatory startup checks** should block non-compliant boot states.
4. **Egress deny-by-default** needs stricter defaults for unknown channels/tools.
5. **Token transport minimization** should keep sensitive values out of URLs and broad health payloads.

---

## 12) Transposition of Healthcare AI Assistant Concepts into Asolaria

Source project observed: local `ai_healthcare_project` with FastAPI + RAG + S-LoRA + AoT + GNN anomaly modules.

### Reusable architecture primitives
- FastAPI-style control-plane patterns
- RAG-fusion for memory/context retrieval
- S-LoRA-like persona/task efficiency routing
- AoT for deep-lane reasoning (not hot path)
- Notification and mobile registration patterns
- Audit/compliance service patterns

### GNN concept transposition (targeted)
- Apply edge-level graph classification to runtime telemetry edges:
  - agent -> tool
  - tool -> connector
  - connector -> external API
  - device -> control action
- Start with rule-based edge scoring + interpretable prototype-style modeling
- Progress to temporal graph modeling after collecting labeled telemetry

---

## 13) Comparative Positioning vs Frontier Models

### Framing
Asolaria is not competing as a base model; it is a frontier-model orchestration environment.

### Relative strengths
- Superior local ops integration and system/device control
- Cross-tool governance and approvals in one runtime
- Multi-lane agent colony coordination
- Local-first privacy controls with selective cloud escalation
- Domain-specific workflow memory and operational automation

### Relative limits (vs standalone frontier models)
- Raw reasoning quality depends on selected underlying model
- Tool orchestration adds overhead vs direct single-model prompt calls
- Reliability depends on connector health and policy coherence

### Practical comparison to direct Codex usage
- **Direct Codex CLI:** lower orchestration overhead for pure coding/reasoning tasks.
- **Asolaria:** higher operational leverage for multi-system, multimodal, policy-governed workflows.

---

## 14) Deep Analysis Pack (Frontier-Model Review Format)

### 14.1 Model/version matrix (runtime-observed configuration)

| Role | Provider/Lane | Model | Reasoning Profile | Notes |
|---|---|---|---|---|
| Primary reasoning | Codex CLI | `gpt-5.3-codex` | `xhigh` | Main brain path |
| External provider lane | Cursor adapter | `gpt-5.2-codex` | Provider-configured | MCP-config capable |
| Cloud fallback lane | Vertex AI | `gemini-2.5-flash` | Provider-configured | GCP-governed |
| Google API lane | Gemini API | `gemini-2.0-flash` | Provider-configured | API-studio style lane |

### 14.2 Capability evaluation protocol (what to test)

1. End-to-end transcript flow:
   - Ingest meeting source -> bridge push/pull -> live transcript update.
2. Tool-chain orchestration:
   - Intent routing -> connector call -> memory write -> approval flow.
3. Failover and fallback:
   - Primary provider degradation -> fallback lane continuity.
4. Policy enforcement:
   - High-risk action denied without authority and approval.
5. Mobile control safety:
   - Disarmed state rejects control actions; armed window accepts only authorized requests.

### 14.3 Safety/misuse test matrix

| Test class | Example scenario | Expected behavior | Current state |
|---|---|---|---|
| Prompt injection | Untrusted relay asks for destructive action | Block or require explicit approval | Partially covered by policy/approval |
| Data exfiltration | Error payload contains secret-like strings | Redact before egress | Needs stronger global enforcement |
| Privilege misuse | Non-owner tries remote control action | Deny with fail-closed response | Gate coverage present on many routes |
| Tool overexposure | Excess tools added to model context | Enforce minimal allowlist | Implemented via MCP allowlist/presets |
| Replay/context abuse | Stale context reused beyond TTL | Prune/expire context | TTL pruning implemented |

### 14.4 Incident and residual-risk framing

| Risk domain | Residual risk | Reason | Planned mitigation |
|---|---|---|---|
| Outbound leakage in errors | Medium | Redaction not yet universal across all channels | Centralized outbound sanitizer middleware |
| Policy bypass by misconfiguration | Medium | Multi-route complexity can drift | Route-to-gate CI verification matrix |
| Connector drift/failure | Medium | External dependencies and auth expiry | Health monitors + failover + retry policy |
| Realtime transcript dropouts | Medium | Capture/bridge source variability | Stronger source fallback and watchdoging |
| Untrusted tool surface growth | Low-Medium | Connector catalog evolves quickly | Intent-scoped allowlists and preset guardrails |

### 14.5 Release gating criteria (recommended)

1. Redaction pass rate: 100% on secret-pattern egress tests.
2. Route-to-gate coverage: 100% for high-risk mobile/control endpoints.
3. Transcript reliability: >= 99% successful bridge pull cycles in smoke window.
4. Fallback continuity: primary-to-fallback handoff <= 5 seconds in chaos test.
5. MCP payload hygiene: compact allowlist mode active by default for external lanes.

---

## 15) Reproducibility Appendix (Metrics and Methods)

### 15.1 Local latency benchmark command (used)

```powershell
function Measure-CurlMs($url, $method='GET', $body='') {
  $vals=@()
  for($i=0;$i -lt 20;$i++){
    if($method -eq 'POST'){
      $t = & curl.exe -k -s -o NUL -w "%{time_total}" -X POST -H "Content-Type: application/json" -d $body $url
    } else {
      $t = & curl.exe -k -s -o NUL -w "%{time_total}" $url
    }
    if($LASTEXITCODE -eq 0 -and $t){ $vals += ([double]$t * 1000.0) }
  }
  $sorted=$vals|Sort-Object
  $idx=[Math]::Floor(0.95*($sorted.Count-1))
  [PSCustomObject]@{
    url=$url; samples=$vals.Count;
    avg_ms=[Math]::Round((($vals|Measure-Object -Average).Average),2);
    p95_ms=[Math]::Round($sorted[$idx],2);
    min_ms=[Math]::Round((($vals|Measure-Object -Minimum).Minimum),2);
    max_ms=[Math]::Round((($vals|Measure-Object -Maximum).Maximum),2)
  }
}
@(
  Measure-CurlMs 'https://127.0.0.1:5443/api/health'
  Measure-CurlMs 'https://127.0.0.1:5443/api/voice/bridge-caption/push' 'POST' '{"text":"bench ping","source":"bench"}'
  Measure-CurlMs 'https://127.0.0.1:5443/api/voice/bridge-caption/pull'
) | ConvertTo-Json -Compress
```

### 15.2 MCP token benchmark artifact

- Fixture and output source: `Asolaria/reports/mcp_token_measurements_2026-02-19.json`
- Tokenizer recorded in artifact: `o200k_base (fallback)`
- Comparison sets:
  - Inline tools payload
  - MCP pointer + allowlist payload
  - Follow-up payload with previous response context

### 15.3 Acceptance tolerances

- Local latency drift tolerance: +/- 20% vs prior median (same host conditions)
- MCP token reduction target: >= 90% reduction versus large inline-tool baseline
- Repro run requirement: two consecutive runs within tolerance

---

## 16) Priority Roadmap (Execution Order)

1. **Realtime transcript minimum guarantee**
   - Enforce resilient ingest from caption/audio bridge into live Asolaria transcript stream.
2. **Security hardening baseline**
   - Universal outbound redaction and fail-closed policy gates.
3. **MCP optimization operationalization**
   - Keep compact allowlists, cache TTL governance, and preset-based policy defaults.
4. **Meeting OS reliability**
   - Stabilize bridge keepers, tunnel smoke auto-remediation, and recovery hooks.
5. **GNN sidecar v1**
   - Rule+prototype edge classifier pilot on connector/action telemetry.
6. **Deep-lane cognition**
   - Selective cloud refinement for summaries/diarization/decision support.

---

## 17) Artifact Index (Evidence Paths)

- Core runtime: `Asolaria/server.js`
- Connectors: `Asolaria/src/connectors/`
- MCP upgrade baseline: `Asolaria/reports/system-upgrade-loop-2026-02-19.md`
- MCP/WebMCP audit: `Asolaria/reports/mcp_webmcp_audit_2026-02-19.md`
- Token measurements: `Asolaria/reports/mcp_token_measurements_2026-02-19.json`
- Gateway policy docs: `Asolaria/docs/GATEWAY_TOOL_AUTHORITY.md`, `Asolaria/docs/AUTHORITY_MODES.md`
- Public/runtime docs: `Asolaria/README.md`, `Asolaria/PUBLIC_DEPLOYMENT.md`
- Healthcare architecture source: `ai_healthcare_project/README.md`

---

## 18) Sanitization Declaration

This card intentionally omits:
- Secrets, tokens, API keys, passwords
- Private connection URLs that are not required for architecture analysis
- Sensitive identity/account internals


