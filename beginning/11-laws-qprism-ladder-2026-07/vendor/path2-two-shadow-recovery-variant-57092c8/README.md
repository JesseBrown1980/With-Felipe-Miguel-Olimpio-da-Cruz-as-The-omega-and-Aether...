# path2-two-shadow-recovery

**Path 2 of the shadow-resolution capstone.** Pure Rust, **zero deps**.

Path 1 (the `dbbh-coms-quant-prism` crate) recovers a *retained* object by content address — a
store holds it. **Path 2 retains nothing.** It recovers an object from **two jointly-injective
lossy shadows**: each shadow alone is provably ambiguous (non-injective — many objects cast it),
but the two together cut the fiber `P1⁻¹(s1) ∩ P2⁻¹(s2)` to a singleton and reconstruct the
object **exactly, with no store anywhere.** This is the honest **double binary black hole**: two
poles recover what neither holds.

> **2026-07-11 status:** Path 2 is no longer merely a capstone theorem. It is measured code. The
> crate also contains the DBBH→DBWH watcher gate: recover a white-side candidate, re-project it,
> and emit only when SHA, complete cylinder shadows, and frequency shells match the black-side
> projection. See [`docs/DBBH-DBWH-MEASURED-PATH2-2026-07-11.md`](docs/DBBH-DBWH-MEASURED-PATH2-2026-07-11.md).

## Mechanism — CRT over coprime cylinders

For a block `x < R` and pairwise-coprime cylinders `p1, p2, ...`:

- `shadow_i = x mod p_i` — each shadow is **lossy** (`x` and `x+k·p_i` share it).
- if `Π p_i ≥ R`: the selected set uniquely determines `x` by the Chinese Remainder Theorem →
  **exact recovery, no store**.
- if `Π p_i < R`: the shadows do not jointly carry `log2(R)` bits →
  **`Held::InsufficientJointCapacity`**. Add another cylinder/pole; never guess.

## Honest ledger — Shannon intact

- One shadow carries about `log2(p)` bits and is non-injective.
- A sufficient set carries at least `log2(R)` bits; its over-determination margin buys consistency
  checks and no-store recovery.
- **Path 1 pays** `store(H(X)) + tiny address`.
- **Path 2 pays** jointly sufficient shadows and keeps **no object store**.
- Both totals are `≥ H(X)`. Entropy is retained or distributed, never destroyed.

## Federation form

`tests/federation.rs`: party **A** holds only `shadow_a` and party **B** holds only `shadow_b`;
the original object is retained nowhere. Joining the two projections reconstructs the exact truth.
A single pole does not reconstruct the truth. This is the capstone condition
`I(X;S2|S1) ≥ H(X|S1)` in running code.

The base codec uses six-byte/48-bit blocks. Two roughly 25-bit cylinders provide roughly 50 bits,
so two are sufficient. The N-cylinder Q-PRISM lane uses eight-byte/64-bit blocks: two cylinders
hold, three recover, and every extra selected cylinder is checked against the recovered block.

## DBBH → DBWH watcher gate

The local throat performs an inverse-and-reprojection proof:

```text
BLACK:
  slice -> SHA/Host8 + BEHCS views + N cylinder shadows + frequency shells

WHITE:
  sufficient shadows -> CRT recovery -> candidate -> fresh projection

EMIT only when:
  white.sha256  == black.sha256
  white.shadows == black.shadows
  white.shells  == black.shells
  selected capacity reaches the slice roof

otherwise -> Held
```

The deterministic watcher roles are:

- `OmniShannon` — capacity and residual-bit ledger;
- `GnnForward` — black-to-white reconstruction role;
- `ReverseGnn` — white-to-black re-projection role;
- `MTP1` — pixel plane;
- `MTP2` — frequency-shell plane;
- `MTP3` — cylinder-residue plane.

The names `GnnForward` and `ReverseGnn` describe consistency roles in this crate; they do not load
trained neural checkpoints here. The separate trained GNN/reverse-gain repositories can be composed
with this throat without being falsely claimed as already embedded.

## Liris multi-cylinder 3D Q-PRISM slice harness

`MultiCylinder` + `QPrismSlice3d` generalize the two-shadow proof to N coprime cylinders and project
a frozen slice into classical representation wavelengths: binary/hex/SHA, BEHCS-64,
BEHCS-256, BEHCS-1024, and a digest-derived HyperBEHCS-60D coordinate. HBP rows end in `json=0`
and carry no payload body.

Measured properties include:

- two roughly 25-bit cylinders hold for an eight-byte slice;
- three cylinders recover exactly without a store;
- the calculable roof rises with each cylinder;
- all seven default cylinders add redundancy without a false `u128` overflow hold;
- extra residues are consistency checked;
- residual selector bits can honestly fall to 2, 1, or 0 after shared context narrows the fiber.

See [`docs/LIRIS-MULTICYLINDER-QPRISM-SLICE.md`](docs/LIRIS-MULTICYLINDER-QPRISM-SLICE.md).

## Liris PIE world-slice harness

Metatagged particles render into a pixels-first bounded slice; the slice projects into N coprime
cylinder shadows; same-radius pixels form a frequency-shell view; and a deterministic LeWorld-style
rule computes the next or previous slice byte-identically only after sufficient recovery. If the
roof is not met, prediction returns `Held::InsufficientJointCapacity` instead of inventing a future.

See [`docs/LIRIS-PIE-WORLD-SLICE.md`](docs/LIRIS-PIE-WORLD-SLICE.md).

## Quantum sibling and exact boundary

The encrypted-cloning experiment at arXiv `2602.10695` is a quantum sibling of Path 2: each quantum
clone is locally maximally mixed, while clone plus the complete quantum key are jointly reversible;
decryption selects one branch and consumes the key.

CRT shadows are non-injective but not informationless — one residue still reveals information about
the block. A classical XOR-pad lane can provide individually uniform shares, but ordinary software
cannot prove physical single-use erasure because classical shares can be copied. The present crate
claims classical exact recovery and watcher-gated emission, not physical quantum cloning.

## Storage-backed / non-GPU applicability

The exact recovery substrate is useful on commodity and storage-rich machines. CRT, SHA/Host8,
BEHCS rebasing, HBP/HBI receipts, watcher comparisons, queues, ledgers, and N-Nest correction gates
are CPU/storage operations. HDD/SSD can retain shadows, cubes, receipts, and cold agent state while
RAM holds only the active block/window.

This is not a claim that disk replaces a GPU for neural matrix multiplication. Trained GNN/LLM
inference remains an optional CPU/GPU sidecar. A low-GPU machine can still act as a shadow pole,
recovery node, verifier, white-room, dispatcher, or durable memory node.

## Verification

The current test surface is exactly **30 tests**:

```text
embedded unit tests        5
federation tests           4
multi-cylinder tests       9
PIE world-slice tests      7
watcher-gate tests         5
                           --
total                     30
```

- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: the operator supplied a real Claude Fable 5 run on a third
  independent container using **rustc 1.97**, **30/30 green**, independent of acer/WSL and liris.
- `AUDITED_GPT_5_6_PRO`: GPT-5.6 Pro read all 1,344 source lines, all tests, both Liris docs, the
  README, and the full Path-1/Q-PRISM/GNN/white-room/dispatcher/N-Nest lineage.
- The GPT sandbox lacked Rust and outbound DNS, so it does not falsely claim a local cargo run.
- `CI_GPT_DIRECTED`: `.github/workflows/rust-1.97-independent-verification.yml` installs Rust
  1.97.0, asserts exactly 30 tests, runs all targets, and uploads the complete receipt.

Run locally with:

```bash
cargo test --all-targets
```

## Status

- `MEASURED` — CRT two-shadow recovery, byte round-trip, neither-pole-alone property,
  Shannon-held boundary, N-cylinder recovery, residual-bit ledger, PIE deterministic inversion,
  DBBH→DBWH re-projection, and tamper holds.
- `CANON` — CRT/Bézout, joint injectivity, Fano/Shannon walls, and inverse-map verification.
- `UNVERIFIED` — a live federated deployment where separate physical hosts retain separate shadow
  lanes over Hilbra; trained-GNN invocation inside this exact Rust gate; hardware-enforced one-use
  classical shares; physical quantum transport.

## License

MIT OR Apache-2.0.
