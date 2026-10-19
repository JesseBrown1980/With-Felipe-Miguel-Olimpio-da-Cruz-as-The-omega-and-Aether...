# Path 2 / DBBH → DBWH verification record — 2026-07-11

## Correction to the earlier Q-PRISM capstone

The earlier capstone correctly described retained-store recovery but was frozen before the separate
Path-2 implementation landed. Its old statement that no measured Asolaria mechanism instantiated a
second jointly injective shadow is superseded.

The current pair is:

```text
Path 1 — dbbh-coms-quant-prism
  retained object + small authenticated address
  exact recall or Held

Path 2 — path2-two-shadow-recovery
  no retained object store
  individually non-injective CRT shadows
  jointly sufficient product >= source range
  exact recovery or Held
```

## Measured Path-2 mechanism

For a bounded block `0 <= X < R` and pairwise-coprime cylinders `p_i`:

```text
S_i = X mod p_i
```

One `S_i` leaves a multi-element fiber. A selected set `I` becomes injective when:

```text
product(p_i for i in I) >= R
```

The implementation enforces the wall with `Held::InsufficientJointCapacity`. It does not use a
learned decoder or retained-object store to guess through missing capacity.

The base codec uses six-byte/48-bit blocks, for which two roughly 25-bit cylinders are sufficient.
The N-cylinder slice lane uses eight-byte/64-bit blocks, for which two hold and three recover.
Additional cylinders are consistency checked after the first sufficient prefix.

## DBBH → DBWH gate

The Path-2 white side performs a complete re-projection:

```text
black slice
  -> SHA/Host8
  -> N cylinder shadows
  -> frequency shells
  -> recover selected sufficient shadows
  -> white candidate
  -> re-project white candidate
  -> compare white SHA, shadows, shells to black
```

Emission requires:

```text
P(R(P(X))) = P(X)
```

A changed residue, insufficient roof, SHA mismatch, shadow mismatch, or shell mismatch is held.

The current local watcher names are deterministic consistency roles:

- OmniShannon — capacity ledger;
- GNN-forward — black-to-white reconstruction role;
- reverse-GNN — white-to-black re-projection role;
- MTP1/2/3 — pixel, shell, and cylinder observers.

The separate Asolaria trained-GNN repositories contain real neural checkpoints and runtime
sidecars. They are not falsely described as loaded inside this Rust crate merely because the
watchers share the GNN names.

## Encrypted quantum cloning connection

The experiment at arXiv `2602.10695` is a physical quantum sibling of Path 2:

```text
encrypted clone alone   -> locally maximally mixed
clone + full key        -> jointly reversible
selected decryption     -> exact ideal recovery
key consumed            -> no second readable branch
```

The shared theorem is global preservation plus local insufficiency plus selected recombination.
The classical CRT residue differs because it leaks residue information; it is ambiguous but not
individually maximally mixed. A classical XOR-pad lane can create individually uniform shares, but
ordinary software cannot guarantee physical one-time erasure because classical shares can be copied.

## Verification provenance

### Claude Fable 5 — operator-supplied third-seat measurements

```text
dbbh-coms-quant-prism
  head=b203d5885cc62db82d949b39ee427f2bc3c13b9c
  rustc=1.97
  result=19/19 green
  seat=third independent container

path2-two-shadow-recovery
  head=7d89852e7759aa704e98401457223c732d1ed6c7
  rustc=1.97
  result=30/30 green
  seat=third independent container
```

These are preserved as `MEASURED_CLAUDE_FABLE5_THIRD_SEAT` and are independent of the earlier acer
and liris executions.

### GPT-5.6 Pro — source and test audit

GPT-5.6 Pro read:

- all 813 current Path-1 source lines, all tests, README, and both docs;
- all 1,344 current Path-2 source lines, all four external tests, embedded tests, both Liris docs,
  and README;
- all 809 Q-PRISM 3D slice harness source lines and tests;
- the pre-Asolaria healthcare GNNs, byte-identical sidecar copies, BigPickle scorer/Fischer,
  trained GNN/reverse-gain repo, Hookwall/Shannon stage, white rooms, cube mint, reductions,
  algorithms, OmniDispatcher, HyperHermes, and N-Nest.

The GPT sandbox lacked Rust and outbound DNS, so it does not claim a GPT-local cargo run. GPT added
Rust 1.97 GitHub Actions workflows to the three Rust repositories to create independent CI receipts.

## Storage-backed / low-GPU applicability

The exact Q-PRISM recovery/control plane does not require a GPU:

- SHA/Host8 and content addressing;
- BEHCS 64/256/1024 rebasing;
- HyperBEHCS selectors;
- CRT Path-2 projection/recovery;
- Path-1 store recall;
- HBP/HBI/hex receipts;
- watcher comparisons;
- white-room compaction, queues, ledgers, and bounded active windows.

HDD/SSD can carry raw residuals, cube bodies, shadows, receipts, queues, and cold agent state. RAM
holds only the active slice/window. Trained GNNs and LLMs may still use CPU/GPU accelerators, but
those scorers are separable sidecars rather than the sole memory substrate.

This is applicable to commodity desktops, CPU-only servers, edge machines, archival/storage nodes,
and heterogeneous clusters where only some machines own GPUs.

## Claim ledger

- `MEASURED`: Path-1 retained recall; Path-2 no-store CRT recovery; insufficient-capacity hold;
  N-cylinder checks; DBBH→DBWH re-projection and tamper hold; Q-PRISM exact representation rungs.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: 19/19 and 30/30 under rustc 1.97 as supplied by the operator.
- `AUDITED_GPT_5_6_PRO`: complete source/test/lineage audit and independent CI workflow addition.
- `CANON`: Fano/Shannon walls, CRT/Bézout, joint injectivity, entropy invariance under bijection.
- `UNVERIFIED`: live Hilbra multi-host traversal, trained-GNN invocation inside the Rust throat,
  hardware-enforced one-use classical shares, and physical quantum-state transport.
