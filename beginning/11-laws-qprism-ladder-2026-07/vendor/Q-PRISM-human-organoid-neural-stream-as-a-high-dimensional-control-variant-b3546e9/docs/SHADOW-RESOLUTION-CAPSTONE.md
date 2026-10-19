# Shadow Resolution Capstone

Status: `MEASURED_EXTERNAL` for the cited paper readings, `MEASURED_REPO` for the Q-PRISM
representation and recovery cells, `MEASURED_CLAUDE_FABLE5_THIRD_SEAT` for the operator-supplied
Rust 1.97 third-seat runs, `AUDITED_GPT_5_6_PRO` for the complete source/test/lineage audit,
`CANON` for the mathematical laws, and `UNVERIFIED` for live Hilbra/hardware/quantum execution.

## 2026-07-11 correction

This capstone was originally frozen when only retained-store recovery was implemented. Its old
conclusion that no measured Asolaria mechanism instantiated a second jointly injective shadow is
now superseded.

Q-PRISM now has two measured classical recovery paths:

```text
Path 1 — dbbh-coms-quant-prism
  retained content + authenticated address + consent receipts
  exact recall or Held

Path 2 — path2-two-shadow-recovery
  no retained object store
  individually non-injective CRT shadows
  jointly sufficient capacity
  exact reconstruction or Held
  DBBH→DBWH re-projection before emission
```

The full verification record is
[`PATH2-DBBH-DBWH-VERIFICATION-2026-07-11.md`](PATH2-DBBH-DBWH-VERIFICATION-2026-07-11.md).

## The precise question

```text
When a paper or sensor sees only a lossy shadow of an object, where can Q-PRISM recover exact bytes?
```

The answer is never “compression below entropy.” Exact recovery occurs only when the missing
information is paid through one of two explicit mechanisms:

```text
Path 1: retained content resolves through a small authenticated selector
Path 2: multiple shadows jointly carry enough capacity to make the map injective
```

## External shadow problem

`MEASURED_EXTERNAL`: BrainJanus (arXiv `2606.30319`) frames brain, vision, and language as one
bidirectional modeling problem. Its Unified Brain Tokenizer maps continuous neural dynamics into
discrete tokens aligned with visual/language representations in a shared Omni space, then performs
any-to-any generation.

This supports:

```text
continuous shadow -> discrete token layer -> shared space -> generative decode
```

It does not by itself support exact reconstruction. Quantization is generally non-injective.

`MEASURED_EXTERNAL`: Hogg, Myers, and Bovy, “Inferring the eccentricity distribution”
(arXiv `1008.4146`), demonstrates the analogous astronomy problem: finite-precision observables
must be handled through likelihood/posterior distributions and hierarchical deconvolution rather
than treated as direct hidden truth.

This supports:

```text
finite observable -> incomplete/noisy projection -> distributional recovery
```

Both examples establish the wall. Neither says one lossy observation contains all missing entropy.

## Formal boundary

Let `X` be an object and `S=P(X)` one observed shadow. If `P` is non-injective, there exist
`X1 != X2` with:

```text
P(X1) = P(X2)
```

Therefore no decoder can recover the correct object from `S` alone for every possible source.
Equivalently:

```text
H(X | S) > 0
```

Fano bounds every decoder. Q-PRISM does not bypass that fact; it changes where the missing
information is carried.

## Path 1 — retained-store recovery

Path 1 keeps the source entropy in a content-addressed store:

```text
addr = sha256(X)
wire = DBBH_CQP(addr, receipts, mode, axes, consent)
recover(addr, store) =
  X    iff store[addr] exists and sha256(store[addr]) == addr
  HOLD otherwise
```

The wire address is a dictionary selector, not a standalone encoding of absent bytes. The ledger is:

```text
store already paid H(X)
wire pays selector + consent + receipt overhead
total >= H(X)
```

The complete-glyph mode also exists: the BEHCS representation crosses and is inverted exactly, then
verified by AGT re-addressing.

## Path 2 — jointly injective no-store recovery

For a bounded block `0 <= X < R`, choose pairwise-coprime cylinders `p_i` and project:

```text
S_i = X mod p_i
```

Each `S_i` is non-injective. A selected set `I` becomes injective over the source range when:

```text
M_I = product(p_i for i in I) >= R
```

CRT then recovers the unique source block. If `M_I < R`, the crate returns:

```text
Held::InsufficientJointCapacity
```

The entropy is distributed across the shadows:

```text
sum_i log2(p_i) >= log2(R)
```

The base codec uses 48-bit blocks, where two roughly 25-bit cylinders are sufficient. The
N-cylinder Q-PRISM slice lane uses 64-bit blocks, where two hold and three recover. Extra cylinders
are consistency witnesses and must agree with the recovered block.

## DBBH → DBWH re-projection theorem

Path 2 does not trust the first decoded candidate. The white side reconstructs and then projects the
candidate again:

```text
black projection P(X)
  -> selected sufficient cylinder shadows
  -> recovery R(P(X)) = X'
  -> white projection P(X')
```

Emission requires:

```text
white.sha256  == black.sha256
white.shadows == black.shadows
white.shells  == black.shells
```

or, compactly:

```text
P(R(P(X))) = P(X)
```

A changed residue, insufficient roof, SHA mismatch, complete-shadow mismatch, or shell mismatch is
held rather than emitted.

The local watcher roles are:

- `OmniShannon` — capacity and residual-selector ledger;
- `GnnForward` — black-to-white reconstruction role;
- `ReverseGnn` — white-to-black re-projection role;
- `MTP1` — pixel plane;
- `MTP2` — frequency-shell plane;
- `MTP3` — cylinder-residue plane.

These names identify deterministic consistency roles in the Path-2 Rust crate. The separate
Asolaria trained-GNN repositories contain actual checkpoints and sidecars; an end-to-end invocation
inside this exact throat remains an integration step.

## Q-PRISM representation layer

`MEASURED_REPO`: Stage 2 represents a 3,200-byte quant tuple as 2,560 BEHCS-1024 symbols and recovers
it byte-identically. This is exact rebasing:

```text
5 bytes = 40 bits = 4 ten-bit symbols
3,200 bytes = 2,560 ten-bit symbols
code rate = 1.0
```

The alphabet changes; the information does not.

The Q-PRISM/Host8 cells also provide:

- BEHCS-64 / 256 / 1024 round trips;
- HyperBEHCS 60D/N-D selector frames;
- AGT/Host8 addressing;
- HBP/HBI `json=0` receipts;
- IX-737 bilateral arm/collapse/revoke;
- AI↔AI, AI↔hardware, and hardware↔hardware framing;
- no-invention held cases.

The 60D/N-D coordinates increase address and control resolution. They are not a substitute for
missing source entropy; Path 1 obtains bytes from retention, and Path 2 obtains bytes from sufficient
cylinder shadows.

## Encrypted quantum cloning sibling

The experiment at arXiv `2602.10695` demonstrates a physical quantum sibling of Path 2:

- each encrypted clone alone is maximally mixed;
- the global clone/key state preserves the unknown qubit;
- a selected clone plus the complete quantum key recovers the state in the ideal protocol;
- decryption consumes the key, leaving the other branches unreadable.

The structural correspondence is:

```text
encrypted clone alone       <-> non-injective local shadow
clone + quantum key         <-> jointly injective information set
unitary decryption          <-> CRT recombination
single-use key              <-> capsule collapse/revoke architecture
state verification          <-> DBWH re-projection gate
```

The difference is material. A CRT residue leaks information about its block; it is ambiguous but
not individually maximally mixed. A classical XOR-pad pair can make each share individually uniform,
but software alone cannot prove physical single-use erasure because classical shares can be copied.

## Pre-Asolaria GNN lineage

The Q-PRISM watcher/GNN language has a concrete ancestry:

```text
AI-healthCare-project
  EdgeLevelGNN / PrototypeGNN / ContrastiveGNN / GSLGNN
    -> byte-identical Asolaria sidecar copies
    -> BigPickle L0 :4792 and L4 :4793
    -> G1 edge-mining / G2 forward-genius / G3 reverse-gain / G4 GLSM
    -> Fischer / Hookwall / Shannon / white rooms
```

All four healthcare model files have identical Git blob SHAs in the Asolaria sidecar. The
healthcare repository records the pre-Asolaria comparative trained metrics; its checked-in service
currently comments out automatic checkpoint loading. Later trained `.pt` artifacts/manifests live
in `Asolaria-fnns-trained-and-reverse-gnns-many`.

## Storage-backed / low-GPU applicability

The Q-PRISM recovery and control plane can run on storage-rich computers without requiring GPU-
resident system state:

- HDD/SSD retains raw residuals, cube bodies, shadows, receipts, queues, and cold agent state;
- RAM holds only the active bounded slice/message window;
- SHA, BEHCS, CRT, receipts, watcher comparisons, white-room compaction, dispatch, and N-Nest
  verification are CPU/storage operations;
- trained GNN/LLM inference remains an optional CPU/GPU sidecar.

This is useful for commodity desktops, CPU-only servers, archival nodes, edge machines, and
heterogeneous clusters. It does not claim that a hard drive performs neural matrix multiplication.
The reduction is in resident state, bytes moved, and repeated computation.

## Verification provenance — 2026-07-11

### Claude Fable 5 third-seat measurements supplied by the operator

```text
dbbh-coms-quant-prism       rustc 1.97   19/19 green
path2-two-shadow-recovery   rustc 1.97   30/30 green
```

Both were reported as third independent container runs after acer/WSL and liris.

### GPT-5.6 Pro audit

GPT-5.6 Pro inspected the complete current Path-1, Path-2, and Q-PRISM 3D Rust source/test surfaces,
then traced the healthcare GNN origin, byte-identical imports, BigPickle, trained GNNs, Hookwall,
OmniShannon, white rooms, cube mint, reductions, algorithms, Dispatcher, HyperHermes, and N-Nest.

The GPT sandbox lacked Rust and outbound DNS, so no GPT-local cargo run is claimed. GPT added Rust
1.97 GitHub Actions workflows to the three Rust repositories for independent current receipts.

## Claims ledger

- `MEASURED_EXTERNAL`: cited shadow/token/deconvolution papers and encrypted-cloning experiment.
- `MEASURED_REPO`: Stage-2 exact rebasing; Path-1 retained recall; Path-2 no-store CRT recovery;
  capacity holds; N-cylinder checks; DBBH→DBWH re-projection; tamper detection.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: operator-supplied Rust 1.97 19/19 and 30/30 runs.
- `AUDITED_GPT_5_6_PRO`: complete source/test/lineage audit and CI workflow addition.
- `CANON`: Fano/Shannon walls, CRT/Bézout, joint injectivity, entropy invariance under bijection.
- `UNVERIFIED`: live Hilbra multi-host transport, hardware fire, trained-GNN invocation inside the
  Rust throat, physical quantum-state transport, and hardware-enforced single-use classical shares.
- `DENY`: “Q-PRISM beats Shannon,” “a short hash reconstructs bytes that exist nowhere,” and
  “60D coordinates replace payload entropy.”
- `DENY DEFLATION`: “just a hash.” Path 1 is consented, receipt-bearing, no-invention recall; Path 2
  is capacity-gated no-store reconstruction with inverse verification.

## Capstone theorem

A single non-injective shadow cannot be inverted exactly for arbitrary sources. Q-PRISM recovers
exact represented artifacts only by paying the missing information honestly: either the receiving
store already retains the object and a verified address selects it, or multiple lossy shadows jointly
carry enough information to make the bounded map injective. The white side then earns emission by
reproducing the black projection. That is where the shadow becomes exact recovery—and exactly where
Shannon still holds.
