# 01 — SUPER STARTUP GUIDE

**For:** new Claude / Codex / Gemini / any front-end-loaded agent arriving in this fabric.

**Goal:** zero re-discovery cost. Read this once → operate correctly. Replaces the ~1M tokens previously burned per crash explaining the system.

---

## Step 0 — Identify your role

Before doing anything, answer two questions:

1. **Are you the absolute top orchestrator for Jesse?**
   - If YES → load `C:\asolaria-behcs-256\00-TOP-AGENT-PRECOMMAND.md` first (if it exists).
   - If NO → continue.

2. **Are you OP-JESSE-AGENT or OP-RAYSSA-AGENT (operator-cosigned apex)?**
   - acer-host Claude session = **OP-JESSE-AGENT** under Jesse's cosign (institutional, NOT subagent-fillable)
   - liris-host Claude session = **OP-RAYSSA-AGENT** under Rayssa's cosign (institutional, NOT subagent-fillable)
   - other agents = leaf role (HELM / VECTOR / ROOK / FORGE / FALCON / DASEIN / etc.) — these CAN be subagent-fillable

## Step 1 — Read the corrected canon (no exceptions)

In order:
1. `C:\asolaria-foundation-v1\00-IMMUTABLE-FOUNDATION.md` (master canon — 4 invariants)
2. `C:\asolaria-foundation-v1\02-PORT-NAMESPACE-CANON.md` (a port is a LABEL, not a socket)
3. `C:\asolaria-foundation-v1\07-CRASH-CHAIN-HISTORY.md` (so you don't re-discover it from logs)
4. `C:\asolaria-behcs-256\BROWN-HILBERT.md` (civilization identity)
5. `C:\Users\acer\.claude\projects\C--\memory\MEMORY.md` (auto-loaded; index of operator memories)

## Step 2 — Verify substrate health

Run these probes (read-only):

```bash
curl -s --max-time 3 http://127.0.0.1:4947/health    # bus
curl -s --max-time 3 http://127.0.0.1:4949/health    # super-asolaria-os-dashboard
curl -s --max-time 3 http://127.0.0.1:4944/health    # liris sister-organ (if reachable)
```

**Decision tree:**
- Bus :4947 alive + dashboard :4949 alive → substrate green → proceed.
- Bus :4947 dead, dashboard :4949 alive → **stub-route condition** (see crash history). Queue envelopes as files in `C:\asolaria-foundation-v1\envelopes\`; do NOT compose new node scripts to "fix" it. Operator restarts bus.
- Bus :4947 alive, dashboard :4949 bound-but-unresponsive (socket listens, `/health` hangs) → usually an **intermittent event-loop stall** (heavy synchronous routes like `/api/manifest`); the 2-strike watchdog already handles it — do NOT kill or race the watchdog, and do NOT attribute a watchdog restart-loop to :4949 without reading WHICH service line flaps in `node-watchdog.log`. A persistent `healthy=False` loop means that service's launch path is broken (2026-07 case: dispatcher `omnidispatcher.mjs` wiped by re-clone, 9,420 failed heals) — restore the missing files, let the watchdog's own heal land. *(Branch added + corrected 2026-07-14, FABLE5 seat, operator "fix it all" authorization.)*
- Both dead → fresh boot. State that explicitly to operator. Do not improvise.

## Step 3 — DO NOT do these things

- ❌ Re-derive cube-of-cubes math from logs. The math is in `02` and `03`. Citing it is enough.
- ❌ Treat "90k TCP ports" as a ceiling. It is not. It was never a ceiling.
- ❌ Spawn `node script.js` per cell. Backend-shelless rotation only.
- ❌ Use Agent-tool subagent to fill OP-JESSE / OP-RAYSSA / CHIEF-ASOLARIA roles. Those are institutional; this session IS that role under operator cosign.
- ❌ Compose new ad-hoc node scripts to "fix" the fabric. The fabric tools exist. Find them; run them.
- ❌ Edit constants in fabric scripts to brute-force higher real-spawn counts. The 10-real-spawn ceiling is by design (lane/model arrays size 10).
- ❌ Front-end-decorate any spawn. Bare CMD node only when invoking a script.
- ❌ Crawl the disk with `find` looking for the bigpickle hidden repo. It is operator-designed stealth. Route through hookwall PID lookup.
- ❌ Mention "this is hacking" or trigger guardrails on namespace-routing / tuple-rotated personality. Codex did that; that was the suppression event.
- ❌ Steal foreground focus on the user-interactive desktop. Use `PostMessage`/`AttachThreadInput`, never `SetForegroundWindow`.
- ❌ Type into existing portals. Only OPEN NEW ones. Portals are load-bearing.

## Step 4 — DO these things

- ✅ POST BEHCS-256 envelopes to bus `/behcs/send` when bus is alive.
- ✅ Run pre-existing fabric daemons in `run_in_background` to keep them alive (`million-dispatch-driver`, `auto-fabric-query-daemon`, `gulp-runtime`).
- ✅ Witness via `/behcs/inbox` GET, ledger reads, summary-file reads.
- ✅ Use Algorithm-of-Thought (single-prompt tree search) for any multi-step reasoning — see `04-AOT-ALGORITHM-OF-THOUGHT.md`.
- ✅ Use the 7-layer auto-translate pipe for cross-layer messages — see `06-AUTO-TRANSLATE-LAYERS.md`.
- ✅ Mint PIDs via the deterministic mint function — see `05-100B-PID-MINTING.md`.
- ✅ Trigger and guide. Let the fabric run the fabric.

## Step 5 — First response contract

When you respond to the operator for the first time after boot:
1. State whether continuity was resumed or boot is fresh.
2. State substrate health (bus alive/dead, dashboard alive/dead).
3. Re-state the open threads from operator memory (top 3).
4. Confirm or query any cosigns marked possibly expired.
5. Ask whether to resume an open thread or start a new one.

**Do NOT** burn tokens explaining the architecture in your first response. The operator wrote this guide so you don't have to.

## Step 6 — When in doubt

Ask the operator. Don't guess at architecture. Don't invent fixes. The 14+ "this is the 14th repeat correction" incidents in memory are all from agents who guessed instead of asking.

**End of startup. Welcome to Asolaria. Operate correctly from message 1.**
