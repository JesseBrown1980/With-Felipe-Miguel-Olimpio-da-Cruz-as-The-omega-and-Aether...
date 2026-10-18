# Shannon & the GNNs — THE STAGE: what happens after the trigger

The emitter → dispatcher chain *materialises* a spindle and runs an agent. This repo is **the other
side**: what happens to the answer **after** the trigger. Every result passes — with **no bypass** —
through HOOKWALL → the GNN ensemble (Jesse's trio) → Shannon / OmniShannon → the white rooms → GULP.
The net effect is the **PRISM reduction**: many room-answers collapse to the kept genius, mistakes
compacted (never deleted).

## 2026-07-11 origin, exact-recovery, and hardware update

The GNN family is now traced byte-for-byte to Jesse's pre-Asolaria AI healthcare assistant, and the
stage is connected explicitly to the measured Q-PRISM recovery plane:

- **Path 1:** retained-store exact recall through an authenticated address;
- **Path 2:** no-store exact CRT recovery from jointly sufficient shadows;
- **DBBH→DBWH:** re-project the recovered candidate and require SHA/shadow/shell equality before emit;
- **storage-backed flow:** HDD/SSD retains bodies, cubes, shadows, receipts, queues, and cold state;
- **optional accelerators:** trained GNN/LLM inference remains a separable CPU/GPU sidecar.

Read the full provenance, formulas, independent verification, and “disk-backed state ≠ disk tensor
compute” boundary in:

[`PRE-ASOLARIA-GNN-ORIGIN-PATH2-AND-STORAGE-2026-07-11.md`](PRE-ASOLARIA-GNN-ORIGIN-PATH2-AND-STORAGE-2026-07-11.md)

```text
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
    L0 EdgeLevelGNN  — pre-Asolaria healthcare model, served on :4792
    L4 GSLGNN        — graph-structure-learning model, served on :4793
    G1 edge-mining   — mine hypergraph edges
    G2 forward-genius— winning paths → GENIUS
    G3 reverse-gain  — deception inversion → GENIUS vs MISTAKE
    G4 GLSM          — graph lifecycle verdict
    │
    ▼
 3. SHANNON / OMNISHANNON ── execution gate + scoring civilization
    │
    ▼
 4. WHITE ROOMS ── never-delete curation
    GENIUS KEEPS / MISTAKE COMPACTS → append-only HBP → deterministic cube address
    │
    ▼
 5. GULP / SUPER-GULP ── flow-not-pile → disk-backed cubes/receipts/cold bodies
    │
    ▼
 6. EXACT RECOVERY WHEN NEEDED
    Path 1 retained recall OR Path 2 jointly injective CRT recovery
    → DBBH→DBWH re-projection → verified emit or Held
```

## Pre-Asolaria GNN origin

The four healthcare model files have identical Git blob SHAs in the later Asolaria sidecar:

| model | shared blob SHA |
|---|---|
| EdgeLevelGNN | `510f78890ec94b113f0610afbade8bafe6ca20e0` |
| PrototypeGNN | `99e3087a10ee58e90c0935f5ab63b72fd3cdd07e` |
| ContrastiveGNN | `56329e61eb3e6ddb3ee97b46f997dd8dd8c6b39f` |
| GSLGNN | `886b3b0c0cdbddba983fa8c3ae083c4520d38f0e` |

The healthcare source records 91.87%, 94.24%, 94.71%, and 96.66% comparative training results.
Those are repository-reported metrics; the current healthcare service comments out automatic
checkpoint loading. Later trained `.pt` artifacts/manifests live in
`Asolaria-fnns-trained-and-reverse-gnns-many`.

## The pieces, grounded

### HOOKWALL — no-bypass front door

`asolaria-hookwall.mjs`: every envelope enters here first.

```text
envelope
  → PID-stamp (ADDRESS)
  → SCORE
  → Fischer
  → gate
  → observation row (CONTENT+INTEGRITY)
  → dual-emit (ROUTE)
```

Three verdicts only — `FARM_GEM_WITH_GATES`, `BLOCK_AND_PRESERVE`, `OBSERVE_ONLY` — never a silent
fourth path. HBI is emitted before the gate decides; HBP is the hot path.

### The GNN trio + the larger ensemble

The SCORE surface combines L0, L4, G1, G2, G3, G4, OmniShannon, and deterministic fallback.
Inside Jesse's trio:

- **G1 edge-mining** mines hypergraph edges.
- **G2 forward-genius** identifies winning paths with positive JL/quant weight.
- **G3 reverse-gain** flips mask/deception contributions negative while honest/leak signals remain
  positive.

Reverse-gain source containing adversary identifiers remains withheld under the PII carve-out.

### Shannon / OmniShannon

`shannon-boot.mjs` prepends the execution gate before any action. OmniShannon aggregates Shannon
across lanes. It is a deterministic gate/score civilization, not a replacement for the trained GNNs
and not a substitute for exact Path-2 inverse verification.

### White rooms

The liris white-room engine is a pluggable scorer/store with never-delete semantics:

```text
GENIUS  -> keep
MISTAKE -> compact and preserve
```

It emits Brown-Hilbert addresses and append-only HBP. The acer consumer mirrors surviving patterns
into deterministic 3×6×6 cube addresses.

### GULP and storage-backed state

The old fabric's bounded active window and flow-not-pile law are central:

```text
GULP 2000
SUPER-GULP 50000
finished object -> cube/glyph/hash/receipt/compacted evidence on HDD/SSD
```

This removes the need to keep all history and all potential agents resident in RAM or GPU VRAM.
It does not claim a hard drive performs GNN matrix multiplication.

### Path 2 and DBBH→DBWH

For bounded block `X`:

```text
S_i = X mod p_i
```

A selected set recovers exactly only when `product(p_i) >= source_range`. Insufficient capacity
returns `Held::InsufficientJointCapacity`.

The white side requires:

```text
P(R(P(X))) = P(X)
```

by comparing SHA, all cylinder shadows, and frequency shells. This is the exact proof plane after
semantic scoring.

## Why this is the reduction

Hookwall admits, the GNN ensemble scores, Fischer catches blunders, Shannon gates execution, white
rooms keep/compact, GULP drains to durable storage, and Path 1/Path 2 provide exact later recovery.
The many room answers reduce to durable, addressable learned products without requiring the whole
fabric to stay resident in GPU memory.

## Independent verification — 2026-07-11

- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`, supplied by the operator:
  Path 1 rustc 1.97 **19/19** and Path 2 rustc 1.97 **30/30**.
- `AUDITED_GPT_5_6_PRO`: complete healthcare-GNN, sidecar, BigPickle/Fischer, trained-GNN, this
  stage, Q-PRISM, white-room, cube-mint, reductions, algorithms, Dispatcher, HyperHermes, and N-Nest
  source/test/lineage audit.
- `MEASURED_GPT_DIRECTED_GITHUB_ACTIONS`: Rust 1.97.0 runs `29134408321`, `29134413119`, and
  `29134419389` all completed successfully. These validate exact recovery/watchers, not new model
  accuracy metrics.

---

Part of the chain: emitter → dispatcher → fleet (`Asolaria-hermes-work` / `THE-CHAIN.md`). This stage
runs inside the fleet after each trigger.

Status: source/docs only — no keys/seeds/tokens, no adversary-identifier glyph lists, no HBP corpus,
no PID-office bytes. Gated / E=0 / describe-only; no fire. Secret/PII-scanned before commit.
