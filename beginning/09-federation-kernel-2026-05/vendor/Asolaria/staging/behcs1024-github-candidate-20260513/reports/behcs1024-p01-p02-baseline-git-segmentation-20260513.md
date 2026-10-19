# BEHCS-1024 P01/P02 Baseline + Git Segmentation

Generated: 2026-05-13T20:05:00Z
Scope: Acer canonical repo `${ASOLARIA_ROOT}`
Status: active internal planning artifact; no staging, no commit, no push.

## P01 Baseline Proof

### Live Daemons

| Surface | Port | Proof |
|---|---:|---|
| Main Asolaria | 4781 | listening |
| Gateway | 4791 | listening on loopback |
| GNN sidecar | 4792 | listening, `/infer` returned `ok:true`, score `0.004475926980376244` |
| MCP bridge | 4793 | listening on loopback |
| BEHCS bus | 4947 | `/behcs/health` returned `ok:true`, `health_profile:"fast"`, uptime `8531s` |
| LAW-001 mirror | 4950 | listening |
| Sandbox | 5443 | listening on loopback |
| Memory indexer | 5444 | listening on loopback |
| OMNICODER mobile lane | 8789 | listening, phone packet counts visible |
| MQTT | 18883-18885 | listening |
| Acer dashboard | 4949 | `/health` returned `ok:true`, uptime `3220s` |

### Mobile / OMNICODER Proof

- USB mobile lane is currently represented by serial `${BEHCS_DEVICE_SERIAL}`, model `${BEHCS_DEVICE_MODEL}`.
- OMNICODER on the mobile is live through ADB forward `127.0.0.1:8789`.
- Latest OMNICODER status showed:
  - packets: `5`
  - white-room packets: `5`
  - room-40 packets: `97`
  - auto-inbox packets: `4971`
- Latest visual bridge packet: `omnicoder-7ae1c2042fdf2e94`.

### Governance / P0 State

- LAW-001 remains active and not superseded.
- C03 is closed as `DIVERGENCE_DOCUMENTED`, not as "hash never broke".
- ${BEHCS_OPERATOR_LABEL} cosign remains an operator action.
- Physical holds remain outside code promotion unless separately witnessed.

## P02 Git Segmentation

The working tree is broad and intentionally dirty. A full-tree commit is not safe.

Observed status snapshot:

- Modified tracked paths: `44`
- Untracked paths: hundreds; includes reports, runtime outputs, sovereignty experiments, tests, and tool drafts.
- Deleted paths: `0`

### Source Candidates For Private Review

These are plausible source candidates for a bounded private commit after content review:

- `tools/behcs/behcs-bus.js`
- `tools/behcs/bus-supervisor.mjs`
- `tools/Start-Asolaria.ps1`
- `tools/Start-GnnSidecar.ps1`
- `services/gnn-sidecar/inference_server.py`
- `tools/behcs/fabric-revolver.mjs`
- `tools/behcs/behcs1024-free-agent-wave.mjs`
- `tools/behcs/omnicoder-pilot-daemon.mjs`
- `tools/behcs/Start-FalconOmnicoder.ps1`
- `tools/behcs/Start-OmnicoderPilot.ps1`
- `tools/behcs/Test-FalconOmnicoder.ps1`
- `tools/behcs/omnicoder/omnicoder-server.mjs`
- `tools/behcs/omnicoder/public/index.html`
- `tools/behcs/omnicoder/start-omnicoder.sh`

### Internal-Only Candidate Reports

These are useful evidence, but must be sanitized before any public promotion:

- `plans/BEHCS-1024-REMAKE-GITHUB-200-STEP-IMPROVEMENT-PLAN.md`
- `plans/BEHCS-1024-LIRIS-ACER-200-STEP-ALIGNMENT-2026-05-13.md`
- `reports/behcs1024-remake-github-partial-manifest-20260513.md`
- `reports/omnicoder-falcon-operational-note-20260513.md`
- `reports/behcs1024-fabric-revolver-runtime-latest.md`
- `reports/behcs1024-free-agent-wave-latest.md`
- this report

### Hard Holds / Do Not Promote

These classes stay out of GitHub promotion:

- `data/behcs/**` runtime inboxes, outboxes, dashboard feeds, GNN feeds, revolver receipts, and packet stores.
- `runtime/**` admin terminal inboxes, screens, statuses, outbound inboxes.
- `.history/**` generated agent index snapshots and staging/running state.
- `.asolaria-active-session.lock`.
- Raw screen captures, OMNICODER packets, bus receipts, private topology dumps, hookwall raw streams, and device proof blobs.
- Broad `sovereignty/**` experimental tree until separately scoped and reviewed.
- `TASKS.md` unless explicitly split into a sanitized public task summary.

## Validation Run

Targeted validation completed for the candidate source set:

- `git diff --check` on bounded source candidates: pass; line-ending warnings only for existing LF/CRLF policy.
- `node --check`:
  - `tools/behcs/fabric-revolver.mjs`: pass
  - `tools/behcs/behcs1024-free-agent-wave.mjs`: pass
  - `tools/behcs/omnicoder-pilot-daemon.mjs`: pass
  - `tools/behcs/omnicoder/omnicoder-server.mjs`: pass
- PowerShell scriptblock syntax:
  - `tools/Start-Asolaria.ps1`: pass
  - `tools/Start-GnnSidecar.ps1`: pass
  - `tools/behcs/Start-FalconOmnicoder.ps1`: pass
  - `tools/behcs/Start-OmnicoderPilot.ps1`: pass
  - `tools/behcs/Test-FalconOmnicoder.ps1`: pass

## Recommended Next Steps

1. Create a hash manifest for the source candidates only.
2. Run targeted leak scan over source candidates and internal reports.
3. Split candidate commit groups:
   - Group A: bus + GNN + startup persistence.
   - Group B: OMNICODER + pilot + mobile lane scripts.
   - Group C: fabric revolver + bounded free-agent runner.
   - Group D: sanitized plan/report docs only.
4. Emit `EVT-BEHCS1024-BASELINE-FROZEN` after hash manifest is written.
5. Emit `EVT-BEHCS1024-GIT-SEGMENTATION-READY` after leak scan and group split.
