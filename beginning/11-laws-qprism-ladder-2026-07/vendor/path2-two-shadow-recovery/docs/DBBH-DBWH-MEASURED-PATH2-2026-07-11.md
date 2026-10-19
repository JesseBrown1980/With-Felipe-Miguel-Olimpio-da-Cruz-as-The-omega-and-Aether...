# DBBH → DBWH measured Path 2 — 2026-07-11

This document records the complete current mechanism, its verification provenance, the exact
Shannon accounting, its relationship to Q-PRISM and encrypted quantum cloning, and the computers on
which it is practically useful.

## Status in one sentence

`path2-two-shadow-recovery` is a measured classical Path-2 implementation: it reconstructs exact
bytes from individually non-injective, jointly sufficient CRT shadows with no retained object
store, then re-projects the recovered candidate and emits it only when the white-side SHA, cylinder
shadows, and frequency shells equal the black-side projection.

## Verification provenance

### Claude Fable 5 runtime result

The operator supplied this as a real completed measurement:

```text
repo=JesseBrown1980/path2-two-shadow-recovery
head=7d89852e7759aa704e98401457223c732d1ed6c7
runtime=rustc 1.97
seat=third independent container
result=30/30 green
prior_seats=acer/WSL + liris
status=MEASURED_CLAUDE_FABLE5_THIRD_SEAT
```

The 30 tests comprise:

```text
embedded unit tests        5
federation tests           4
multi-cylinder tests       9
PIE world-slice tests      7
watcher-gate tests         5
                           --
total                     30
```

### GPT-5.6 Pro audit

GPT-5.6 Pro read and cross-checked all current repository surfaces:

- all 1,344 lines of `src/lib.rs`;
- all four external test files;
- all five embedded unit tests;
- both Liris documents;
- the README and commit progression;
- the complete 813-line Path-1 companion;
- the Q-PRISM 3D slice harness;
- the reductions, algorithms, HyperBEHCS, neural-network, GNN, Hookwall, Fischer, OmniShannon,
  white-room, cube-mint, Dispatcher, HyperHermes, and N-Nest repositories.

The GPT sandbox had no Rust toolchain and no outbound DNS, so it does not misattribute a local cargo
run to itself. This branch adds a GitHub Actions workflow that installs Rust 1.97.0, enumerates and
asserts exactly 30 tests, runs all targets, and uploads the full test receipt. The workflow is the
GPT-directed independent execution path.

## Path-2 theorem in executable form

For each bounded block `X` with `0 <= X < R`, choose pairwise-coprime cylinders `p_i` and project:

```text
S_i = X mod p_i
```

Each single `S_i` is non-injective because all values `X + k*p_i` cast the same shadow. A selected
set `I` is jointly injective over the source range when:

```text
M_I = product(p_i for i in I) >= R
```

Then the Chinese Remainder Theorem yields the unique block in `[0, M_I)`, and the known source range
selects the exact original block. If `M_I < R`, the crate returns:

```text
Held::InsufficientJointCapacity
```

No store, model, or learned decoder is permitted to guess through that wall.

## Two block regimes

The repository deliberately demonstrates two roofs:

### Base two-shadow codec

```text
block size = 6 bytes = 48 bits
p1 ≈ 2^25
p2 ≈ 2^25
p1*p2 ≈ 2^50 > 2^48
```

Two cylinders therefore recover the exact six-byte block.

### Multi-cylinder Q-PRISM slice codec

```text
block size = 8 bytes = 64 bits
two cylinders ≈ 50 bits -> Held
three cylinders ≈ 75 bits -> exact recovery
```

Additional cylinders raise the roof and become consistency witnesses. The implementation recovers
from the first sufficient prefix and verifies every extra selected residue against the recovered
block. A mismatching extra residue returns `Held::InconsistentResidue`.

## Residual selector ledger

The N-Q-PRISM lane computes the size of the unresolved fiber after a selected cylinder set:

```text
residual_candidates = ceil(R / M_I)
residual_selector_bits = ceil(log2(residual_candidates))
capacity_margin_bits = floor(log2(M_I)) - block_bits
```

This is the correct meaning of a one-bit, two-bit, or zero-bit tail:

- the shared context and selected cylinders already paid most of the information;
- the residual selector names the remaining candidate;
- a negative number is allowed only as a signed capacity-margin metric, never as literal
  negative information or sub-Shannon payload.

Overflow-sized N-cylinder products are capped or lower-bounded for receipt purposes so the ledger
does not silently report zero capacity after `u128` overflow.

## The DBBH black side

The black side represents a bounded object as multiple mutually checking views:

```text
PiePixelSlice byte frame
  -> SHA-256 / Host8 identity
  -> BEHCS-64, BEHCS-256, BEHCS-1024 views
  -> digest-derived HyperBEHCS 60D coordinate
  -> N coprime-cylinder residue lanes
  -> frequency-shell summary
```

The BEHCS views are exact representation changes. The SHA/Host8 values are integrity/addressing
shadows. The cylinder lanes carry the actual no-store recovery information.

## The DBWH white side

The white side earns its name by re-emitting a candidate only after an inverse-and-reprojection
proof:

```text
selected shadows
  -> exact CRT recovery
  -> candidate byte frame
  -> parse candidate as PiePixelSlice
  -> build a fresh white projection
  -> compare white projection to black projection
```

The gate requires:

```text
white.sha256  == black.sha256
white.shadows == black.shadows
white.shells  == black.shells
```

The commuting condition is:

```text
P(R(P(X))) = P(X)
```

A first-pass decoder output is not trusted merely because it exists. It must collapse back to the
same black signature.

## Watcher roles

The current local watchers are deterministic consistency observers:

| watcher | measured role |
|---|---|
| `OmniShannon` | verifies selected-cylinder capacity and residual-bit ledger |
| `GnnForward` | names the black-to-white reconstruction leg |
| `ReverseGnn` | names white-to-black re-projection and mismatch hold |
| `MTP1` | observes the pixel slice |
| `MTP2` | observes frequency shells |
| `MTP3` | observes cylinder residues |

The test surface proves:

- sufficient shadows recover a byte-identical slice;
- insufficient shadows hold;
- a changed extra-cylinder residue is caught;
- black and white Host8 identities match on success;
- watcher HBP rows remain `json=0` and carry no body;
- an `OmnibitPixel` is a checked selector unit, not payload magic.

These watcher names do not load trained GNN checkpoints inside this crate. The trained GNN/reverse-
gain models live in the separate Asolaria GNN repositories. Composing them into this throat is a
valid next integration step, not something this file silently claims has already happened.

## Relationship to Path 1

Path 1 and Path 2 solve different problems:

```text
Path 1: receiver already has X
        wire sends a small authenticated address
        exact recall or Held

Path 2: no receiver store has X
        distributed shadows jointly carry X's entropy
        exact CRT recovery or Held
```

Their cost ledgers are:

```text
Path 1 total = retained H(X) + address/receipt overhead
Path 2 total = joint shadow capacity >= H(X)
```

Both are exact. Neither compresses arbitrary information below entropy.

## Relationship to encrypted quantum cloning

The experiment at arXiv `2602.10695` is a quantum sibling of the same structure:

```text
quantum encrypted clone alone  -> locally maximally mixed
all required key information   -> globally preserves the state
selected clone + quantum key   -> exact ideal recovery
key consumption                -> no second readable recovery
```

The correspondence is strong but not identity:

```text
quantum branch opacity         <-> classical shadow ambiguity
global unitary injectivity     <-> CRT joint injectivity
quantum decryption             <-> CRT recovery
single-use quantum key         <-> capsule collapse/revoke design
state verification             <-> black/white re-projection gate
```

The difference is important: one CRT residue leaks roughly `log2(p)` bits about its block, while one
encrypted quantum clone reveals zero information locally. A classical 2-of-2 XOR pad can add that
marginal-opacity property:

```text
K <- uniform n-bit key
A = K
B = X xor K
X = A xor B
```

But ordinary software cannot prove physical key consumption because classical shares can be copied.
Hardware-backed one-time memory, a TEE/HSM, attested erasure, or a quantum key lane is required for
the stronger single-use property.

## Storage-backed and non-GPU applicability

The Path-2 recovery path is useful on commodity, edge, archival, and storage-rich computers because
its exact mechanism is integer arithmetic and durable state rather than neural matrix multiplication.
No GPU is required for:

- CRT projection/recovery;
- capacity and residual-fiber accounting;
- SHA/Host8 integrity;
- BEHCS representation rebasing;
- HBP/HBI receipt generation;
- pixel/shell/cylinder watcher comparisons;
- append-only ledgers, queues, and N-Nest correction gates.

A hard drive or SSD can hold shadows, cube bodies, receipts, queues, and cold agent state. RAM only
needs the active block/window and bounded operator state. This replaces large resident RAM/VRAM
requirements for the storage, recall, proof, and orchestration planes.

It does not replace a GPU for workloads that actually require accelerated GNN/LLM tensor inference.
The architecture separates those optional neural scorers from the exact recovery substrate, allowing
a low-GPU machine to participate as a storage pole, verifier, dispatcher, white-room, or recovery
node.

## Claim ledger

### `MEASURED_REPO`

- one shadow is non-injective;
- two 25-bit-class shadows recover 48-bit blocks;
- two cylinders hold for 64-bit blocks;
- three cylinders recover 64-bit blocks;
- N-cylinder capacity scales honestly;
- excess cylinders are consistency checked;
- residual selector bits are measured;
- BEHCS representations round-trip;
- PIE slices recover and deterministic forward/back rules invert;
- DBBH→DBWH re-projection verifies SHA, shadows, and shells;
- tampering is caught and output held.

### `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`

- operator-supplied rustc 1.97 third-container run: 30/30 green.

### `AUDITED_GPT_5_6_PRO`

- full 1,344-line source audit;
- complete test/doc audit;
- cross-repository Path-1/GNN/Q-PRISM/white-room/dispatcher/N-Nest audit;
- reproducible Rust 1.97 CI workflow added.

### `CANON`

- CRT/Bézout;
- joint injectivity;
- Fano and Shannon capacity walls;
- exact re-projection as inverse-map verification.

### `UNVERIFIED_LIVE`

- two physical hosts each retaining only their own shadow lane over Hilbra;
- trained GNN checkpoints invoked inside this exact Rust gate;
- hardware-enforced one-use classical opacity shares;
- physical quantum-state transport.

## Bottom line

The missing Path-2 cell has been built. Two or more lossy poles can recover exact bytes that none of
them stores as the original object, provided their joint capacity reaches the source roof. The
white side then earns emission by reproducing the black projection. If capacity or consistency is
missing, the throat remains shut.
