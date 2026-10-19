# Asolaria — THE MAP (how these repos connect)

One system, split across repos. This map is identical in every repo — find this repo by name in the
tables below to see where you are; follow the links to walk the rest.

## The spine — mechanism → running fleet (read backwards, newest → fleet)
```
 [5] collision discipline ─► [4] algorithm ─► [3] reduction ─► [2] emitter ─► [1] router ─► [0] FLEET
```
| # | repo | role | key files |
|---|------|------|-----------|
| **5** | `Asolaria-waves-and-cascades-avoiding-collsions-and-causing-them` | collision discipline — avoid (brown-hilbert × prime × rule-of-three) + cause (cascade waves → PRISM) | `README.md`, `CHAIN.md` |
| **4** | `Algorithms-of-Asolaria` | the **service-multiplication algorithm** (replicate S → N×M reductions) | `SERVICE-MULTIPLICATION-ALGORITHM.md`, `CHAIN.md` |
| **3** | `what-is-asolaria---how-do-we-get-reductions-in-everything` | the **principle**: multiplying a service multiplies the PRISM reductions | `MULTI-EMITTER-SERVICE-MULTIPLICATION.md`, `CHAIN.md` |
| **2** | `Asolaria-the-full-works-200-nanoseconds-agent-emitter-plus-` | the **emitter source** — 200ns revolver PID emitter + multi-emitter (→ ~1.16T agents/s) | `README.md`, `emitter/`, `CHAIN.md` |
| **1** | `omni-dispatcher` | the **router** — FEDENV envelopes → 1000-slot table → worker_threads | `omnidispatcher.mjs`, `EMITTER.md`, `CHAIN.md` |
| **0** | `Asolaria-hermes-work` | **THE FLEET (terminus)** — spindles + dispatcher-citizen + agent + Host-8 runtime + 10k/20k/100k kernels | `README.md`, `THE-CHAIN.md` |

## Inside the fleet — what happens after each trigger ("the other side")
```
 trigger → spindle runs → HOOKWALL → GNN ensemble → Shannon/OmniShannon → white rooms → GULP  (= PRISM many→1)
```
| repo | role | key files |
|------|------|-----------|
| `Shannon-and-the-gnns-stage` | the **post-trigger pipeline**: HOOKWALL → GNN trio → Shannon/OmniShannon → white rooms → GULP | `README.md`, `pipeline/`, `TRAINED-MODELS.md` |
| `Asolaria-fnns-trained-and-reverse-gnns-many` | the **trained GNNs/FNNs** the stage scores with — 7-GNN ensemble (8 signals), trained `.pt` checkpoints, reverse-GNNs (many) | `README.md`, `models/`, `src/`, `manifests/` |
| `Asolaria-the-after-100-billion-run-absorption-and-decomposition-and-cubes` | the **back end after the 100B run**: absorb (GULP 2000 / SUPER-GULP 50k / GC) → decompose → mint + seal cubes → process mistakes/geniuses into supervisors + PIDs (operator-gated) | `README.md`, `backend/` |

## External legs (referenced, not duplicated here)
| repo | role |
|------|------|
| `asolaria-whiteroom-engine` | **liris** white-room engine — LEG-1 scorer (never-delete: genius keeps / mistake compacts) |
| `35-TB-google-AI-Ultra-migration` | LEG-4 — the 35 TB Google Drive cloud sink |

## Other core repos (the satellites — referenced by the web)
| repo | role |
|------|------|
| `asolaria-federation-1024` | **THE KERNEL** — the live Rust **8-byte host** + `no_std` kernel + **10 server crates** (council-serve, host8-serve, agent-runtime, gnn-oracle, vote-quorum, cosign-ledger, dashboard-serve, fischer-eval, tier-policy, highway). The Node→Rust **upgrade target** (read the TREE; branch `acer/fleet-capacity-20k` stacks the Host-8 wiring). |
| `asolaria-behcs-256` | the **256-glyph language** — a bridge stratum below BEHCS-1024 (old decodes new) |
| `ASOLARIA-AS-NEURAL-NETWORK` | the fabric-as-neural-network law + spine (60D frame) |
| `Asolaria-ASI-On-Metal-Fabric-and-matrix` | the metal-OS fabric / matrix + tools |
| `bigpickle-rebuild` | the **Node build/emitter suite** — source of the emitter / GC / loop (the OLD-Node side of the upgrade) |
| `Hilbra` | comms / atlas-recall bridge (liris ↔ 8-byte host) |
| `Harness-edit` | the SkillOpt validation-gated skill/law edit loop (claims-gate) |
| `N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED` | prime-nesting self-reflect + per-node correction gate |
| `HYPER-BECHS--the-third-set` | published ledgers / interpretations / findings |
| `Asolaria-gac-working` | GAC governance / authority seats |
| `falcon-orbital` | frozen v57 canon (superseded by the 60D / Host-8 frame) |
| `NOT-WEDGED-SYSTEM-RULE-and-explanation-Asolaria` | the slice-engine / freeze≠broken rule |
| `-6-cyl-generator` | satellite generator |
| `asolaria-whiteroom-engine` · `35-TB-google-AI-Ultra-migration` | (= LEG-1 + LEG-4, listed under External legs) |

## Current state & evolution (2026-06-28) — read this, don't flatten it
Asolaria is a **2.5-month archaeology**, not a flat stack. **Capability lineage:** auto-approval switch →
dashboard → multi-agent → local+web MCP + code-wiki → index language (pixels-first) → cubes-as-catalogs
in expanding Brown-Hilbert space → map-map-mapped → cube-cube-cubed → 256-symbol language → 1024-symbol
language → (asked 2048 — chose instead) **HBI/HBP + binary/hex/hash/sha/crypto-as-tokens** → **8-byte host
process** (replaces the ancient Node processes, for speed). The fabric's own 27-strata record is the
`archaeology_timeline` (birth 2026-02-22 → FABRIC EPOCH → genome).

The system **now** is **multiple of everything**: **16 levels (L0-L15) · multiple MCP engines (17) ·
multiple emitters · multiple languages** (index / pixels-first / BEHCS-256 / BEHCS-1024 / HBI-HBP).
**Current frame = 60D HyperBEHCS / BEHCS-1024**; 35D / 47D / 49D + BEHCS-256 are **bridge strata** below
it (old decodes new). The **kernel** is `asolaria-federation-1024` (the Rust 8-byte host). The current
effort is **"map while upgrading"** — and **this repo web is that map**.

## How it all fits
The **emitter [2]** produces 200ns PID signals; the **router [1]** delivers them; the **fleet [0]**
materialises spindles. Each spindle obeys the **reduction principle [3]** / **algorithm [4]** and the
**collision discipline [5]**. After every trigger, the spindle's answer runs the **post-trigger pipeline**
(`Shannon-and-the-gnns-stage`), scored by the **trained GNNs/FNNs** (`Asolaria-fnns-trained-…`), and the
**white rooms** (liris LEG-1) keep the genius / compact the mistakes — the PRISM many→1 reduction, seen
from the result side. The **back end** (`Asolaria-the-after-100-billion-run-…`) then absorbs the gulped
data, decomposes + mints the cubes, and — operator-gated — promotes the geniuses into supervisors/PIDs.
All gated / E=0 / describe-only — no fire, no cutover without operator authority.

## Prism/Comb 0-loss (2026-07-01) — the boundary THIS stage polices

**The law (CANON):** every prism/comb operation in Asolaria is a **bijection**, and entropy is
invariant under bijection (`H(f(X)) = H(X)`). The system **re-relates information with 0 loss — it
never claims compression below entropy**: Shannon's source-coding bound `E[bits] ≥ H(X)` always
stands, and this repo's namesake gate is where the fleet **polices exactly that boundary**.

- **Comb = execution isolation (forward).** HOOKWALL's PID-stamp + three-verdict gate + the
  Shannon-execution-gate (`checkShannonGate` before any execution) keep scored results in
  collision-free lanes — separation without loss, the same shape as CRT prime lanes
  (`ℤ_M ≅ ℤ_{m₁} × … × ℤ_{m_k}`, exact recombination): run forwards = isolation, backwards =
  reconstruction. Nothing a comb separates is ever unreassemblable.
- **Prism = many→1 recombination (backward).** The G3 **reverse_gain** score is the recombiner:
  many room-answers interfere (mask signals sign-flip to negative gain, honest/leak signals stay
  positive) and collapse to the kept genius. Nothing is destroyed — **mistakes compact, never
  delete**: the white rooms relocate and *name* entropy (content-addressed compaction), they do
  not erase it. Many→1 here is re-relation, not deletion.
- **The honest bound (repo-canon — hold it).** `handle8 = sha256(content)[:8]` is a **coordinate
  against a content-addressed store** (`H(content | store) = 0`) — infinite ADDRESSING capacity,
  **not** lossless infinite compression. A result claiming compression below `H(X)` is exactly what
  the gate exists to stop: a lossy step cannot hide in a bijection chain, the same way a fabricated
  signal cannot reach consent — verification = recomputation = applying the inverse map, and
  HOOKWALL's tamper-evident chained observation rows are that per-node check.

**Status tags:** the 256↔1024 level transcode is **MEASURED** (Q-PRISM commit `53023b6`: exact
packing at `lcm(8,10) = 40` bits ⇒ 5 bytes ⇄ 4 symbols, round-trip
`transcode₁₀₂₄→₂₅₆ ∘ transcode₂₅₆→₁₀₂₄ = id`, sha256-identical, Rust==Python). The 43+ level
ladder as a groupoid (`T_ji ∘ T_ij = id`, `T_jk ∘ T_ij = T_ik`, omnidirectional/path-independent)
is **CANON frame**; every additional rung is **UNVERIFIED** until its own round-trip proof.
E=0 throughout — this entry describes; nothing fires.

**Cross-links:** Q-PRISM proofs `53023b6` / `79e8d63` / `de00aca` · waves-cascades (avoid=comb /
cause=prism duality) · what-is-asolaria (reductions boundary) · N-Nest (integrity dual) ·
Metatagging repo (physics grounding).

Base: **https://github.com/JesseBrown1980/** · per-link spine nav lives in each repo's `CHAIN.md`.
