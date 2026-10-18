# Liris Multi-Cylinder 3D Q-PRISM Slice Harness

Status: `MEASURED_LIRIS_LOCAL` for the Rust harness and tests on the Ubuntu lane; `DESIGN/CANON_NEXT` for live cross-fabric deployment over Hilbra/office services.

This is the Liris-side extension for cross-fabric synthesis. It lifts Acer Path 2 from a two-residue cell into a 60D+ Q-PRISM slice harness:

```text
frozen slice
  -> classical wavelength branches: binary / hex / sha / BEHCS-64 / BEHCS-256 / BEHCS-1024 / HyperBEHCS-60D
  -> N coprime cylinders
  -> MTP1/MTP2/MTP3 + Omnishannon/GNN/reverse-GNN watcher rows
  -> HBI/HBP tuple rows, json=0
  -> exact recovery from any sufficient cylinder subset, or Held
```

## What Changed

`src/lib.rs` now includes:

- `MultiCylinder`: N-cylinder CRT projection and recovery.
- `MultiShadows`: one residue lane per cylinder; no retained object store.
- `crt_many`: CRT join over any pairwise-coprime cylinder subset.
- `joint_capacity_bits_floor`: calculable slice roof; adding cylinders raises the roof.
- `BehcsFrame`: BEHCS-64 / BEHCS-256 / BEHCS-1024 wavelength frames, each byte-round-tripping.
- `sha256`, `Sha256Digest`, `host8`: pure-std addressing tokens.
- `HyperCoord60`: deterministic 60D coordinate derived from the slice digest.
- `QPrismSlice3d`: combines Host8, sha, HyperBEHCS-60D, BEHCS wavelengths, N-cylinder shadows, and HBP rows.

## Tests

`tests/multicylinder_qprism.rs` proves:

- two ~25-bit cylinders hold for an 8-byte slice;
- three cylinders recover the exact slice without a store;
- the calculable slice roof rises as cylinders are added;
- BEHCS-64 / 256 / 1024 wavelength frames round-trip byte-identically;
- Q-PRISM 3D slice rows emit HBP-style tuple text ending in `json=0`, with no payload body and no JSON object;
- SHA256 and Host8 are stable tokens.

## Claims Boundary

`MEASURED`: local Rust mechanism, 14/14 tests after this branch.

`CANON`: CRT over coprime cylinders; BEHCS representation round trips when codebooks/proofs exist; Shannon boundary remains intact.

`DESIGN/CANON_NEXT`: 3D visual PID supervisors, MTP agents, Omnishannon/GNN/reverse-GNN watchers, and live Hilbra cross-fabric synthesis.

`DENY`: this does not claim physical quantum cloning or violation of the no-cloning theorem. Here, cloning means classical replication of representation branches, residues, hashes, and HBP/HBI rows. Classical shadows can be copied; unknown quantum states cannot.

## Cross-Fabric Synthesis Target

Acer can attack this branch by checking that:

```text
Path2 two-cylinder proof remains intact.
Liris N-cylinder extension raises capacity honestly.
Any insufficient subset holds.
Any sufficient subset recovers exactly.
Rows stay HBP/HBI-style, json=0.
No Node, no JSON substrate, no live hardware claim.
```
