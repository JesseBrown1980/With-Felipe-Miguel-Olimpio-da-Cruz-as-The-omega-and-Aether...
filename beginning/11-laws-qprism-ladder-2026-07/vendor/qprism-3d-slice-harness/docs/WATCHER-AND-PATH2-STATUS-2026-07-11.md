# Q-PRISM watcher and Path-2 status — 2026-07-11

## What this crate measures

This crate is the representation-and-recovery harness that joins four exact classical mechanisms:

1. multiple byte-recoverable representation wavelengths;
2. SHA as a declared address/integrity shadow rather than a reversible lane;
3. a PID-specific 60D/N-D selector surface;
4. no-store CRT recovery from jointly sufficient cylinder shadows.

Its central gate is:

```text
encode each declared lossless wavelength
  -> decode it
  -> require byte identity

project the slice into cylinder shadows
  -> recover from a sufficient subset
  -> require byte identity

anything silently lossy
  -> Held
```

## Relationship to the two dedicated recovery crates

- `dbbh-coms-quant-prism` is **Path 1**: retained-store recall through a small authenticated address.
- `path2-two-shadow-recovery` is **Path 2**: exact no-store recovery from jointly injective CRT shadows.
- this crate is the 3D/N-D representation harness that projects every slice into watched wavelength,
  selector, MTP, and cylinder views before Path-2 recombination.

The dedicated Path-2 crate now also contains the stronger DBBH→DBWH re-projection gate: recover a
candidate, project it again, and compare SHA, every cylinder shadow, and frequency shells before
emission.

## Watcher status

### Measured OmniShannon behavior

`omnishannon_watch` is executable and measured. It classifies every wavelength as:

- `Lossless` when `decode(encode(X)) == X`;
- `Shadow` for SHA, which is intentionally not byte-recoverable alone;
- `Held` when a lane declared lossless fails its round trip.

The current eight lanes contain seven exact representations and one declared SHA shadow.

### GNN and reverse-GNN boundary

The `gnn_watch` and `reverse_gnn_watch` fields in this crate are explicitly tagged design scaffolds.
They record the intended edge-analysis roles but do not load PyTorch checkpoints or invoke the
separate GNN sidecars.

The real trained GNN lineage exists in:

- `AI-healthCare-project` — pre-Asolaria EdgeLevel, Prototype, Contrastive, and GSL model family;
- `asolaria-behcs-256/services/gnn-sidecar` — byte-identical imports of those model classes;
- `Asolaria-fnns-trained-and-reverse-gnns-many` — trained checkpoints/manifests and the later
  edge-mining, forward-genius, reverse-gain, and GLSM planes;
- `bigpickle-rebuild/src/asolaria-score.mjs` — runtime orchestration of L0/L4 and G1-G4 plus
  OmniShannon and deterministic fallback.

Composing those trained models into this Rust edge gate is a valid integration step. This crate does
not claim the composition has already occurred merely because the fields are named GNN.

## Verification provenance

`AUDITED_GPT_5_6_PRO`:

- all 809 current lines of `src/lib.rs` were read and cross-checked;
- the representation decoders, OmniShannon marks, 60D/N-D selectors, cylinders, MTP supervisors,
  harness report, expansion, and tests were inspected;
- the complete Path-1 and Path-2 crates and their external tests/docs were cross-checked;
- the broader GNN, white-room, cube-mint, dispatcher, HyperHermes, reductions, algorithms, and
  N-Nest lineage was inspected.

The GPT sandbox lacked Rust and outbound DNS, so no GPT-local cargo run is claimed. This branch adds
`.github/workflows/rust-1.97-independent-verification.yml`, which installs Rust 1.97.0, enumerates
the current test surface, runs all targets, and uploads the receipt.

The operator-provided Claude Fable 5 third-seat results apply directly to the two dedicated crates:

```text
dbbh-coms-quant-prism       rustc 1.97   19/19 green
path2-two-shadow-recovery   rustc 1.97   30/30 green
```

They are not silently reused as a test result for this separate crate.

## Storage-backed applicability

The harness can run on CPU-and-storage-oriented computers. None of the following requires a GPU:

- binary, hex, HBI/HBP, and BEHCS representation round trips;
- SHA/Host8 integrity;
- 60D/N-D selector derivation;
- CRT cylinder projection and recovery;
- OmniShannon byte-identity checks;
- MTP selector records;
- HBP receipt emission.

HDD/SSD can carry cube bodies, shadows, receipts, and cold state. RAM only needs the active slice and
bounded working structures. This is a real way for storage-rich, low-GPU machines to participate in
the Asolaria fabric.

The claim is not that disk executes trained neural inference. GPU/accelerator compute remains
beneficial for the actual GNN or LLM sidecars. The representation, recovery, routing, and proof
planes remain independently usable without one.

## Quantum sibling boundary

Encrypted quantum cloning at arXiv `2602.10695` validates a physical sibling of the Path-2 pattern:
locally unreadable branches, globally reversible information, selected recovery, and a consumed
quantum key. This crate remains classical. Its representation branches can be copied, and its CRT
residues are ambiguous rather than individually maximally mixed.

## Claim ledger

- `MEASURED`: seven exact wavelength round trips, one declared SHA shadow, OmniShannon hold logic,
  60D/N-D selectors, multi-cylinder exact recovery, insufficient-capacity hold, MTP records, HBP
  hot-path rows.
- `AUDITED_GPT_5_6_PRO`: complete source/test/lineage audit and CI workflow addition.
- `DESIGN`: trained GNN/reverse-GNN invocation inside this crate.
- `UNVERIFIED`: live cross-machine Hilbra traversal, hardware fire, quantum-state transport, and
  hardware-enforced one-time classical shares.
