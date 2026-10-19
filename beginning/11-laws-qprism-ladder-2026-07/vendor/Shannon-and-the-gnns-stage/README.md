# Shannon & the GNNs — THE STAGE: what happens after the trigger

The emitter → dispatcher chain *materialises* a spindle and runs an agent. This repo is **the other
side**: what happens to the answer **after** the trigger. Every result passes — with **no bypass** —
through HOOKWALL → the GNN ensemble (Jesse's trio) → Shannon / OmniShannon → the white rooms → GULP.
The net effect is the **PRISM reduction**: many room-answers collapse to the kept genius, mistakes
compacted (never deleted).

```
 TRIGGER  (emitter → dispatcher → spindle materialises → agent produces an answer/envelope)
    │
    ▼
 1. HOOKWALL ── the uniform no-bypass front door
    PID-stamp (BH.HOOKWALL.<sha16>) → SCORE → Fischer anti-blunder → 3-verdict gate
    → tamper-evident observation row (chained) → DUAL-EMIT (never silently drop)
    │  lineage DAN-HOOKS → hookwall/{dispatch, event-router, gnn-feeder, promotion-bridge,
    │           cubes-indexer, tier-classifier, approval-guard}; gnn-feeder feeds ↓
    ▼
 2. GNN ── the 7-GNN ensemble score, with Jesse's 3-GNN trio
    G1 edge-mining     — mine the hypergraph edges (the GNN edge ledger)
    G2 forward-genius  — forward propagation → WINNING PATHS (+weight js_quant) → GENIUS
    G3 reverse-gain    — inverts deception: adversary "mask" signals flip to negative gain,
                         honest/leak signals stay positive → mark GENIUS vs MISTAKE
    composite = weighted real signals (honest provenance); reverseGain → {reverseRisk, promoted, mark}
    │
    ▼
 3. SHANNON / OMNISHANNON ── the execution gate + scoring civilization
    Shannon-execution-gate (gate-prepend, from the DAN-HOOKS approval-guard): checkShannonGate
    before any execution. OmniShannon = the omni/aggregate Shannon over all lanes; "Shannon parts"
    = the omnishannon parts. (absorb_8_shannon_civilization · absorb_9_omnishannon_parts)
    │
    ▼
 4. WHITE ROOMS ── the never-delete curation chambers (liris's engine + acer mirror)
    liris white-room engine = LEG-1 SCORER: emit a Brown-Hilbert address → open a white-room →
    score → GENIUS KEEPS / MISTAKE COMPACTS (never deletes) → seal append-only HBP → rotate.
    acer whiteroom-consumer mirrors it: digest each surviving pattern → a deterministic 3×6×6 cube
    address (sha256-sliced) → EVT-WHITEROOM-DIGESTED. (7 white rooms · OMNIWHITEROOM servant)
    │
    ▼
 5. GULP / SUPER-GULP ── the GC: gulp every N, flow-not-pile → back to drives-as-RAM
```

## The pieces, grounded

### HOOKWALL — "no bypass" front door
`asolaria-hookwall.mjs`: *"One of the three keys: HOOKWALL → PID → GNN → self-automation."* Every
envelope enters here first. `envelope → PID-stamp (ADDRESS) → SCORE → gate → observation row
(CONTENT+INTEGRITY) → dual-emit (ROUTE)`. Three verdicts only — `FARM_GEM_WITH_GATES` (promote-eligible),
`BLOCK_AND_PRESERVE` (keep as evidence, never delete), `OBSERVE_ONLY` — **never a silent fourth path**.
Includes a Fischer anti-blunder eval (pixels-first: HBI emitted before the gate decides). HBP only, no
JSON hot path.

### The GNN trio (Jesse's 3-GNN stack) + the 7-GNN ensemble
The SCORE primitive is a **7-GNN ensemble** ("PIXELS FIRST → HBI → HBP → binary → hash → sha →
256/1024 → cubed"; L4 GSLGNN routed via `realInferEnsemble`). Inside it, Jesse's trio:
- **G1 edge-mining** — mines edges of the hypergraph.
- **G2 forward-genius** — forward propagation identifies *winning paths*; genius-mining = +weight on the
  JL projection (`js_quant`).
- **G3 reverse-gain** — **inverts deception**: signals an adversary emitted to *look like us* (mask
  glyphs) get their contribution sign-flipped to **negative gain**; signals they couldn't suppress
  (honest/leak) stay **positive**. `reverseGain(score) → {reverseRisk, promoted, mark:
  FORWARD_GNN_MARK_GENIUS | REVERSE_GAIN_MARK_MISTAKE}`. Lineage: Dan Edens' 6-hook bundle (Omnispindle
  MCP), federation-modified, DAN-ACCEPTED 2026-05-19.
  *(The reverse-gain source lists concrete adversary identifiers and is withheld from this repo — PII.)*

### Shannon / OmniShannon — the execution gate
`shannon-boot.mjs` (Cohort-R): lineage `DAN-HOOKS → HOOKWALL{dispatch,event-router,gnn-feeder,
promotion-bridge,cubes-indexer,tier-classifier,approval-guard} → DAN-HOOKS-APPROVAL-GUARD →
SHANNON-EXECUTION-GATE → bootShannon + checkShannonGate`. Shannon is the **gate-prepend** that decides
whether a scored result may execute; **OmniShannon** aggregates Shannon across every lane ("Shannon
parts" = the omnishannon parts). Registered seats: `prof-PROF-SHANNON`, `sup-shannon`,
`servant-SERVANT-OMNISHANNON`, `sup-omnishannon`, `sub-ROOM-SECTOR-LANE-SHANNON`.

### The white rooms — never-delete curation (liris LEG-1 + acer mirror)
The liris **white-room engine** (`asolaria-whiteroom-engine`) is **LEG-1 of the four-leg fabric — the
scorer**: pluggable-store, pluggable-scorer, **never-delete**; emits a Brown-Hilbert address, opens a
white-room, scores it, **keeps genius / compacts (never deletes) mistakes**, seals an append-only HBP
row. The four legs: LEG-1 engine(scorer) · LEG-2 prime-sector allocator
(`BH.SECTOR.P{prime}.R{room:07d}.{sha16}`) · LEG-3 github bus (commit=emit) · LEG-4 `GoogleDriveStore`
(35 TB sink). `port.port.port` here is a **logical nested address from sha bytes — one process, no real
sockets** (the operator's "same process" constraint, avoiding the socket storm). The acer
`whiteroom-consumer` mirrors liris's `room:whiteroom` envelopes into 3×6×6 cube addresses. Seats:
`sup-absorb_7_white_rooms`, `servant-SERVANT-OMNIWHITEROOM`, `sub-ROOM-SECTOR-LANE-WHITE_ROOM`,
`sup-cluster_white_rooms_dir_indexed`.

## Why this IS the reduction
HOOKWALL admits, the GNN trio scores (genius up, deception down), Shannon gates execution, the white
rooms keep the genius and compact the mistakes — so the **many** room-answers reduce to the kept few.
This is the post-trigger half of the PRISM many→1 (`planPrismRoute`, reverse_gain GNN) seen from the
emitter side.

---
Part of the chain: emitter → dispatcher → fleet (`Asolaria-hermes-work` / `THE-CHAIN.md`). This stage is
what runs *inside* the fleet after each trigger.
Status: source/docs only — no keys/seeds/tokens, **no adversary-identifier (PII) glyph lists**, no HBP
corpus, no PID-office bytes. Gated / E=0 / describe-only; no fire. Secret/PII-scanned before commit.
