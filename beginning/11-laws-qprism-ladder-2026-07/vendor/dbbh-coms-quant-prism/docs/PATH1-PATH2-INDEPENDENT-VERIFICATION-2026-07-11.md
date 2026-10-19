# Path 1 / Path 2 independent verification — 2026-07-11

Status vocabulary used here:

- `MEASURED_REPO` — directly implemented and covered by the repository test surface.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT` — runtime result supplied by the operator from an independent Claude Fable 5 container run.
- `AUDITED_GPT_5_6_PRO` — complete source/test/document audit performed by GPT-5.6 Pro.
- `CI_GPT_DIRECTED` — GitHub Actions workflow added by the GPT-5.6 Pro verification pass; its run result is authoritative only after Actions completes.
- `CANON` — mathematical or architectural doctrine, not itself a runtime measurement.
- `UNVERIFIED_LIVE` — requires a live multi-host, hardware, or production-fabric run.

## Verification provenance

### Claude Fable 5 — third independent runtime seat

The operator supplied the following completed run as a real measurement:

```text
repo=JesseBrown1980/dbbh-coms-quant-prism
head=b203d5885cc62db82d949b39ee427f2bc3c13b9c
runtime=rustc 1.97
seat=third independent container
result=19/19 green
prior_seats=acer/WSL + liris
status=MEASURED_CLAUDE_FABLE5_THIRD_SEAT
```

This is distinct from the earlier checked-in WSL/rustc 1.96 receipt. It is preserved as operator-supplied runtime evidence and is not relabeled as a GPT-local run.

### GPT-5.6 Pro — complete source and test audit

GPT-5.6 Pro read and cross-checked:

- all 813 current lines of `src/lib.rs`;
- the eight embedded unit tests;
- `tests/integration.rs`, `tests/suite.rs`, and `tests/system.rs`;
- the README;
- `docs/WHAT-THE-PAPERS-PROVE-ABOUT-THE-PRISM.md`;
- `docs/SHADOW-RESOLUTION-CAPSTONE.md`;
- the companion `path2-two-shadow-recovery` source, four external test files, two Liris docs, and README;
- the Q-PRISM 3D slice watcher implementation;
- the reductions, algorithms, GNN, Hookwall, OmniShannon, white-room, cube-mint, dispatcher, HyperHermes, and N-Nest lineage repositories.

The GPT execution sandbox did not contain `rustc`/`cargo` and had no outbound DNS, so it does **not** claim an independent local cargo execution. This change adds `.github/workflows/rust-1.97-independent-verification.yml`, which installs Rust 1.97.0, asserts the exact 19-test surface, runs every target, and uploads the full receipt. That workflow is the GPT-directed independent execution lane.

## Path 1 — what this crate measures

This crate implements retained-store recall:

```text
content X
  -> BEHCS/HyperBEHCS bijective representation
  -> AGT content address
  -> IX-737 two-party capsule
  -> address or addressed glyph crossing
  -> receiver store lookup / inverse transcode
  -> AGT re-derivation
  -> exact bytes or Held
```

The two crossing modes must not be conflated:

1. `dbbh_send` carries the complete BEHCS-1024 glyph representation. Recovery is the inverse bijection, then AGT verification.
2. `dbbh_send_addressed` carries only the AGT coordinate. Recovery succeeds only when the receiving store already retains the exact object.

The address-only entropy ledger is:

```text
receiver_store already paid H(X)
wire pays selector + consent + receipt overhead
missing retained object -> Held::AddressMismatch
```

This is a real reduction in bytes moved and recomputed. It is not compression below entropy and it never invents missing content.

## Path 2 — the stale capstone statement is superseded

The original capstone correctly separated two exact-recovery paths but recorded Path 2 as not yet instantiated. That historical statement is now stale.

`JesseBrown1980/path2-two-shadow-recovery` implements Path 2 with CRT over pairwise-coprime cylinders:

```text
S_i = X mod p_i
```

Each `S_i` is non-injective. A selected set `I` becomes jointly injective over range `0 <= X < R` when:

```text
product(p_i for i in I) >= R
```

Then CRT reconstructs the unique `X`; otherwise the implementation returns:

```text
Held::InsufficientJointCapacity
```

Path 2 pays the entropy in its distributed shadows and requires no retained object store:

```text
Path 1 = store(H(X)) + small address
Path 2 = jointly sufficient shadow capacity + no store
both >= H(X)
```

## DBBH -> DBWH — why the white-hole name is earned

The Path-2 watcher gate does more than decode once. It performs a black-to-white-to-black commuting check:

```text
BLACK:
  slice
    -> CRT cylinder shadows
    -> SHA/Host8 identity
    -> frequency shells
    -> Q-PRISM representation

WHITE:
  selected sufficient shadows
    -> exact CRT recovery
    -> candidate slice
    -> complete re-projection

GATE:
  white.sha      == black.sha
  white.shadows  == black.shadows
  white.shells   == black.shells
  capacity       >= slice roof
    -> verified classical clone
  otherwise
    -> Held
```

A single changed extra-cylinder residue is caught by the consistency check. An under-capacity subset is held before emission. The emitted object must collapse back to the same black signature.

The named local watchers are consistency roles:

- `OmniShannon` — capacity ledger;
- `GnnForward` — black projection to white candidate;
- `ReverseGnn` — white candidate to black re-projection;
- `MTP1` — pixel plane;
- `MTP2` — shell plane;
- `MTP3` — cylinder plane.

In `path2-two-shadow-recovery` those watcher names denote deterministic verification stages, not loaded neural checkpoints. The trained GNN civilization exists separately and can be composed with the throat; that end-to-end composition is not silently claimed here.

## Quantum encrypted-cloning sibling

The experimental encrypted-cloning work at arXiv `2602.10695` supplies a physical quantum sibling of Path 2:

- each encrypted clone is locally maximally mixed;
- the clone plus the complete quantum key is jointly reversible;
- one selected branch recovers the original state in the ideal protocol;
- decryption consumes the quantum key, preventing a second readable recovery.

The structural correspondence is:

```text
encrypted clone alone      <-> one non-injective shadow
clone + quantum key        <-> jointly injective shadow set
unitary decryption         <-> CRT reconstruction
key consumption            <-> capsule collapse/revoke authority
state verification         <-> re-project-and-compare watcher gate
```

The classical CRT shadows in Path 2 are ambiguous but not individually informationless. A 2-of-2 XOR-pad lane can add classical marginal opacity (`A=K`, `B=X xor K`), but ordinary software cannot prove physical one-time erasure because classical shares can be copied. A hardware-backed or quantum key lane is required for the stronger single-use property.

## Storage-backed and non-GPU applicability

This result is directly useful on storage-rich, accelerator-poor computers because the following operations require no GPU:

- SHA-256 and AGT content addressing;
- BEHCS 64/256/1024 and HyperBEHCS representation rebasing;
- IX-737 state transitions and receipt-chain verification;
- CRT projection and recovery;
- DBBH -> DBWH re-projection checks;
- HBP/HBI/hex sidecars;
- white-room compaction and append-only ledgers;
- dispatcher queues, PID tables, and N-Nest recomputation gates.

A hard drive or SSD can hold the retained store, cube bodies, receipts, queues, and cold agent state while RAM holds only the active bounded window. This is a storage-tier substitution for resident RAM/VRAM, not a claim that disk executes neural matrix multiplication.

Trained PyTorch GNNs and large language models may still benefit from or require CPU/GPU/accelerator compute. The important architectural result is that exact recovery, routing, proof, gating, and durable system memory can run independently of the GPU and can call neural inference as an optional sidecar.

## Updated claim ledger

### `MEASURED_REPO`

- Path-1 full-glyph round-trip;
- Path-1 address-only retained-store recall;
- BEHCS ladder round-trips;
- PID-specific 60D selector construction;
- bilateral consent, collapse, revoke, and stranger rejection;
- receipt-chain integrity and tamper detection;
- no-retention/no-invention hold;
- fixed-size address behavior.

### `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`

- Rust 1.97, 19/19 green on a third independent container, as supplied by the operator.

### `AUDITED_GPT_5_6_PRO`

- complete current Path-1 source/test/doc audit;
- complete current Path-2 source/test/doc audit;
- cross-repository theorem and lineage audit;
- CI workflow added for a reproducible Rust 1.97 execution receipt.

### `MEASURED_PATH2_COMPANION`

- no-store CRT recovery from jointly sufficient shadows;
- insufficient capacity held;
- N-cylinder recovery and residual-bit ledger;
- DBBH -> DBWH re-projection;
- SHA/shadow/shell disagreement held;
- tampered residue detected.

### `UNVERIFIED_LIVE`

- a live Hilbra-keyed multi-host tunnel;
- physical quantum transport controlled by HyperBEHCS selectors;
- hardware-enforced single-use classical shares;
- one production transaction invoking the full trained GNN ensemble inside this exact Rust throat.

## Bottom line

Path 1 is measured retained-object recall. Path 2 is now measured no-store reconstruction from jointly injective shadows. The DBBH -> DBWH watcher gate verifies the emitted object by re-projecting it to the original black signature. These are exact, useful classical mechanisms that preserve Shannon's accounting and can run on CPU-and-storage-oriented machines without requiring a GPU for the recovery/control plane.
