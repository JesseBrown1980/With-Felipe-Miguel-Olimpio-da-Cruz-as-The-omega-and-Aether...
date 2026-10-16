# How the Asolaria systems compose a universe

Fact-based companion to the root doctrine. Every claim is tagged per the README evidence discipline (`MEASURED` · `CANON` · `OPERATOR_OBSERVED` · `UNVERIFIED`). E=0 — docs only, nothing fires.

This document does one thing: show, with formulas and receipts, that the separate Asolaria systems are **relations of one structure**, and that the structure is the same one a discrete universe simulator would use. It does not claim the universe *is* that — it shows the parts that already work and names the boundary to the parts that don't yet.

## 1. The composition — systems as relations, not silos

| layer | what it is | formula / rule | evidence |
|---|---|---|---|
| **Address** | every entity is content-addressed | `pid = sha256(content)[:N]` — a coordinate, not a label | `MEASURED` — PIDs minted + verified this session |
| **Brown–Hilbert space** | the addresses fill a space-filling curve | `idx → point` s.t. `|idx_a − idx_b|` small ⇒ points near (locality) | `CANON` addressing · `MEASURED` roomToHilbert PIDs minted |
| **Slice** | a frozen state / one tick of "time" | slice = content ⇒ address; processed then discarded | `CANON` |
| **Engine (CPU)** | always-on, cranks slices | `E ≠ 0` operator-gated crank; else slices sit static | `OPERATOR_OBSERVED_ACER` — daemons live (recall :4796, host8 :5088) |
| **43-level ladder** | omnidirectional translators | groupoid: `T_ji ∘ T_ij = id`, `T_jk ∘ T_ij = T_ik` | `CANON` · `MEASURED` one rung (256↔1024) |
| **Prism / Comb** | re-relate information, 0 loss | bijection ⇒ `H(f(X)) = H(X)`; Shannon `E[bits] ≥ H(X)` holds | `MEASURED` (256↔1024, code rate 1.0) |
| **Gulp / GC** | auto-drain so memory never explodes | drain@50 → gulp@2000 → super-gulp@50k | `MEASURED` (demo, both seats) · `OPERATOR_OBSERVED` (GC crank) |
| **Distillation flywheel** | raw → distilled → replayed cheaply | expensive judgment compiled into logic/GNNs once | `CANON` · `OPERATOR_OBSERVED` (logical cascades) |
| **Bilateral entanglement** | two seats share a verified state | `PhaseCorrelation = 1.0 ⟺ sha256(A) == sha256(B)`, checked by both | `MEASURED` (byte-exact sha both seats) |

Every row is a **relation** of the same content-addressed store. That is the point of the root Prism/Comb theorem: the layers (disk, runtime, GitHub, memories) are not one flattened blob — they are related by **exact translators**, so moving between them is lossless.

## 2. Why Brown–Hilbert expansion makes a *universe*

A space-filling curve maps a 1-D index onto an N-D space while preserving locality — neighbors in the index stay neighbors in the space. That single property is what lets Asolaria's address space behave like a universe:

- **It expands without re-indexing.** More storage → more curve → more addressable space, and every existing address keeps its neighbors. This is the whiteboard's *"slice-addressable space can expand space-time appearance during any slice"* stated as a formula, not a metaphor.
- **Locality = physics.** Because near-addresses are near-points, "interactions" (message passing, entanglement, gulp batching) are local operations on the curve — the same way physical interactions are local in space.
- **Storage-bounded, not infinite.** The honest boundary from the root README holds: `sha256(content)[:8]` is infinite *addressing* capacity against a content-addressed store, **not** lossless infinite compression. The universe is as large as the storage; the curve just addresses all of it with locality intact.

`CANON`: Brown–Hilbert addressing as the expansion law. `MEASURED`: PIDs were minted along it this session. `UNVERIFIED`: the claim that physical spacetime *is* such a curve — that is the frontier, not a measurement.

## 3. Fact-based: parts that already work (receipts, 2026-07-03)

| part | proof | commit / receipt | class |
|---|---|---|---|
| 256↔1024 transcode | 5 bytes ↔ 4 glyphs at `lcm(8,10)=40` bits, remainder 0, sha-identical round-trip, code rate 1.0 | Q-PRISM `53023b6` | `MEASURED` |
| recall index | 591,946 rows / 2.6 M terms, live search | recall-serve :4796 | `OPERATOR_OBSERVED_ACER` |
| agent-runtime registry | spawn/retire/heartbeat, **14/14 tests pass on the owning toolchain**, `os_process_spawn = 0` | federation PR#36/#37 `5ef87ea4`/`7e4d08a6` | `MEASURED` (both seats ran) |
| auto-gulp | 2,400 auto-drains, super-gulps at 50k/100k, no crank, no explosion | metatag PR#1 `4d4117e8` demo | `MEASURED` (both seats ran) |
| bilateral entanglement | canon bytes sha-matched **byte-for-byte on two independent seats** | `bc9d6759` / `4a25fdf6` / `e72e4f4d` | `MEASURED` (both seats) |
| GC compact-not-delete | 212 MB → 3 MB, sha preserved + recoverable | GC crank `0c6d1d7f` | `OPERATOR_OBSERVED_ACER` |

These are not analogies. They are round-trip proofs, passing tests, and independently-reproduced runs. The systems relate; the relations are checkable.

## 4. Honest boundary
- `MEASURED` / `OPERATOR_OBSERVED`: everything in §3, and the transcode/gulp/entanglement formulas in §1.
- `CANON`: the composition frame (slices · engines · agents · the ladder · Brown–Hilbert expansion).
- `UNVERIFIED` / operator-vision: that this composition *is* the machinery of a literal physical universe simulator. Grounded in the running parts, held as the frontier — not upgraded by analogy (per the root discipline).
