# Asolaria

Asolaria is the private root repository slice for the Asolaria fabric. The repository is not the whole system: files are slices; the running fabric, recall/Hilbra, HBI/SHA receipts, gates, engines, cubes, live agents, and operator evidence are the authority surfaces.

## Canonical doctrine

Start with the shared doctrine:

- [FABRIC-FIRST-CIPHER-ASOLARIA-AGENT-DOCTRINE-2026-06-27](https://github.com/JesseBrown1980/HYPER-BECHS--the-third-set/blob/acer/system-interpretations-2026-06-26/FABRIC-FIRST-CIPHER-ASOLARIA-AGENT-DOCTRINE-2026-06-27.md)

Core frame:

- Slices are frozen potential. The matrix/fabric plus engines plus live agents animate those slices into runtime behavior.
- The OLD system is real and measured: the Node-era BigPickle / 10k-room / Gulp / cube / GNN fabric self-improved historically. Do not deflate those achievements because the NEW system is still migrating.
- The NEW system is the Rust 8-byte Host-8 / recall-Hilbra / json=0 migration path. It is staged cell by cell; do not overstate cutover from old receipts.
- BEHCS/HBP/HBI cipher text and cubes are distilled routing priors, not the sole authority source. Authority remains in PID outputs, HBI/SHA receipts, the recall corpus, GNN/white-room/cube minting, and rehydration paths.

## Evidence discipline

When making Asolaria claims:

- Ask fabric/canon/recall first; then owning seats; then GitHub or Drive publication surfaces.
- Tag evidence as `MEASURED`, `CANON`, `OPERATOR_OBSERVED`, or `UNVERIFIED`.
- Keep local disk, USB/raw substrate, live runtime, GitHub, Drive, maps, and memories as separate layers.
- Do not expose keys, private topology, PII, or operator-only evidence in this README.

## Prism/Comb 0-loss (2026-07-01)

Root-doctrine addendum (campaign `acer/prism-comb-0loss-2026-07-01`). E=0: this is docs/map propagation only — nothing fires, no runtime mutation, no cutover claim.

The law, stated once at the root so every satellite inherits the same boundary: prism/comb operations in Asolaria are **bijections**, and entropy is invariant under bijection (`H(f(X)) = H(X)`). The fabric **re-relates** information with 0 loss — it never claims compression below entropy; Shannon's bound (`E[bits] >= H(X)`) always stands. One fabric, two directions: **forward = comb** (collision-avoidance, execution isolation) and **backward = prism** (collision-causation, interference-as-search, many-to-one).

Scoped exactly per this repository's evidence discipline:

- **MEASURED** — one rung only: the 256 <-> 1024 level transcode. Bytes are base-2^8 and glyphs base-2^10 digits of the same integer; exact packing at `lcm(8,10) = 40` bits gives 5 bytes <-> 4 symbols with remainder 0, and the round-trip is identity (sha256-identical, Rust == Python symbol-identical; Q-PRISM commit `53023b6`). Code rate exactly 1.0 — the alphabet changes, the information does not.
- **CANON** — the 43+ level ladder as a groupoid of translators (`T_ji . T_ij = id`, `T_jk . T_ij = T_ik`): omnidirectional, path-independent translation. This is the frame behind the rule above that disk, substrate, runtime, GitHub, Drive, maps, and memories are separate layers related by exact translators — not one layer flattened into another.
- **UNVERIFIED** — every other rung. Each additional rung earns MEASURED only by its own round-trip proof; do not upgrade it by analogy.

Boundary that keeps root claims honest: referential handles (`sha256(content)[:8]`) are coordinates against a content-addressed store — infinite ADDRESSING capacity, not lossless infinite compression. The prism relates information perfectly; it does not create or destroy it.

Estate satellites carrying the four instances of this one theorem:

- [Q-PRISM](https://github.com/JesseBrown1980/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control) — the MEASURED rung: transcode proof commits `53023b6`, `79e8d63`, `de00aca`.
- [waves-and-cascades](https://github.com/JesseBrown1980/Asolaria-waves-and-cascades-avoiding-collsions-and-causing-them) — the duality: comb (avoid collisions, exec) vs prism (cause collisions, search).
- [what-is-asolaria (reductions)](https://github.com/JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything) — the reductions boundary: addressing capacity, never sub-entropy compression.
- [N-Nest](https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED) — the integrity dual: verification = recomputation = applying the inverse map at every level.
- [Metatagging for a Quantum universe](https://github.com/JesseBrown1980/Metatagging-data-for-a-Quantum-universe) — physics grounding: frame-based discrete universe, spacetime pixels (`pixels_first`), metatag-driven expansion.

## Current boundary

This README closes the root doctrine gap only. It does not promote a branch, fire an engine, cut over runtime, publish private evidence, or replace the live fabric. Runtime and migration claims still require their owning gates.

## Q-PRISM stack

Q-PRISM is a family of connected implementations, stacked on the Layer-1 kernels
(`kernel/tribit/`, `kernel/behcs1024-60d/`). Each layer here is copied
byte-identical from its owner repository (clean source only) or, where no clean
implementation existed, written fresh and honest. Full detail and provenance:
[`qprism/README.md`](qprism/README.md).

| Layer | Where | What it is |
|---|---|---|
| 2 — representation | `qprism/rust-qprism-181/` | 2D → 3D orb → signed-2D color-leaf renderer; checked-`i128`, inverse cross-check, own SHA-256, zero-dep, integer-only |
| 3 — recovery Path 1 | `qprism/recovery/omega-path123-v0/` | LZ over a **retained** output window (recovers bytes it kept) |
| 3 — recovery Path 2 | `qprism/recovery/omega-path123-v0/` | checked **CRT** two-shadow reconstruction over coprime moduli |
| 3 — combined throat | `qprism/recovery/throat/` | coordinator that selects Path 1 vs Path 2, cross-validates, gates on consent + a SHA consistency check, and **holds** rather than fabricates |
| time | `time/` | deterministic GF(2) fast-forward with a Python↔Node byte-identity cross-check (self-labels `SIMULATED`) |
| 4/5 — control + watcher | `eval/` | pinned Q-PRISM control arms and N-Nest depth-3/7 watchers, vendored by Git blob identity; software simulation only — see [`eval/STATUS.md`](eval/STATUS.md) |
| 5 — Fischer | `gate/fischer-eval/` | deterministic rule-table action gate (integer `cpl` → PROCEED/HOLD/ANALYZE/BLOCK/REFUTE); chess words are metaphor |
| 5 — Hookwall | `gate/hookwall/` | tier table, deny tags, score thresholds and a caller→target tier policy, extracted from a larger kernel; comment-only edits except `crypto`, which completes the upstream Phase-2 plan with real Ed25519 (`ed25519-dalek`, `verify_strict`) — see its `PROVENANCE.md` |
| 5 — composition | `gate/verdict/` | tighten-only merge of Hookwall, spawn gate, tier gate, Fischer and an input guard: strictest wins, nothing can loosen |
| 6 — proposals | `proposals/verify-schedule/` | confidence-ranked verify scheduler; plans which proposals to verify, never fires |
| 6 — GNN | `model/gnn-int/` | integer-only Q16 two-layer GCN + edge head; hand-set, **untrained** weights; no accuracy claims |
| 6 — HRM, MTP | — | **boundary**: no implementation exists in the estate yet; the slots are left empty rather than filled with labels |

The one rule every layer obeys: **no layer manufactures information.** Content
addressing returns retained bytes; CRT needs jointly-sufficient shadows (which
*expand*, never compress); SHA-256 is an integrity coordinate, never a source.
When evidence is insufficient the stack holds — it never invents bytes to satisfy
a hash. Every layer above is gated in CI on Rust 1.81.0 / stdlib Python + Node.

Layers 5 and 6 carry their own honesty notes. The Hookwall's `crypto` signs and
verifies with real Ed25519 (`ed25519-dalek`, `verify_strict`, keys zeroized on
drop). The composition does not call it yet, so a `VerifiedEnvelope` relies on its
caller having checked the signature. Scores, `g4_state` and tiers are
caller-supplied inputs, not measurements; nothing in these gates persists or
attests physical presence.

## Homes

Asolaria is published, byte-identical, at three public homes that mirror each other:

- GitHub — [JesseBrown1980/asolaria-aether](https://github.com/JesseBrown1980/With-Felipe-Miguel-Olimpio-da-Cruz-as-The-omega-and-Aether...)
- Hugging Face — [Jessedbrown/asolaria](https://huggingface.co/Jessedbrown/asolaria)
- Hugging Face — [Jessedbrown/asolaria-aether](https://huggingface.co/Jessedbrown/asolaria-aether)

Each carries the same clean commit: the doctrine, the runnable slices
(`prime_cylinder_expansion.py`, `slice_glyph_messaging.py` — pure stdlib, `E=0`),
the Rust 1.81 kernels under `kernel/tribit/` (ternary core) and `kernel/behcs1024-60d/` (the verified 60D / BEHCS-1024 hash-coordinate collapse),
the Q-PRISM stack under `qprism/` (representation + recovery paths + combined throat), the deterministic time harness under `time/`,
the pinned control + watcher layer under `eval/`, the Layer-5 gates under `gate/`, and the Layer-6 scheduler and integer GNN under `proposals/` and `model/`.
