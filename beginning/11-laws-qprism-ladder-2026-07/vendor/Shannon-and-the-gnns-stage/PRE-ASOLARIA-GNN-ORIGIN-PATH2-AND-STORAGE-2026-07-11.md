# Pre-Asolaria GNN origin, Path 2, and storage-backed stage — 2026-07-11

## Why this belongs in the stage repository

The post-trigger stage is where three different kinds of evidence meet:

```text
neural evidence       -> GNN/FNN scores and graph-path proposals
deterministic evidence-> Fischer, Shannon, receipts, and policy gates
exact recovery proof  -> Path 1 / Path 2 / DBBH→DBWH inverse checks
```

These must cooperate without being conflated. A high GNN score is not a byte-exact recovery proof;
a correct CRT reconstruction is not a semantic judgment; a disk-backed receipt is not a neural
model. The stage combines them into one held-safe path.

## Pre-Asolaria GNN origin

Jesse's AI healthcare assistant contains the pre-Asolaria edge-level family:

```text
EdgeLevelGNN
PrototypeGNN
ContrastiveGNN
GSLGNN
```

The later Asolaria sidecar copies are byte-identical at the Git blob level:

```text
baseline     510f78890ec94b113f0610afbade8bafe6ca20e0
prototype    99e3087a10ee58e90c0935f5ab63b72fd3cdd07e
contrastive  56329e61eb3e6ddb3ee97b46f997dd8dd8c6b39f
gsl          886b3b0c0cdbddba983fa8c3ae083c4520d38f0e
```

The healthcare source reports 91.87%, 94.24%, 94.71%, and 96.66% comparative training results.
Those are repository-reported metrics. The current healthcare service comments out automatic
checkpoint loading. Later trained `.pt` artifacts/manifests are preserved in
`Asolaria-fnns-trained-and-reverse-gnns-many`.

## The complete score stage

BigPickle and Hookwall assemble:

```text
L0 EdgeLevelGNN :4792
L4 GSLGNN :4793
G1 edge-mining
G2 forward-genius
G3 reverse-gain
G4 GLSM
OmniShannon
SHA fallback
Fischer anti-blunder
three-verdict Hookwall
```

The key provenance rule is that missing neural signals remain missing. Deterministic fallback keeps
the scorer total but must not be mislabeled as a real GNN response.

## Path 1 — retained-object exact recall

After scoring/curation, an object can be recalled through `dbbh-coms-quant-prism` when the receiver
already retains it:

```text
address + consent + receipts
  -> receiver store lookup
  -> SHA re-derivation
  -> exact bytes or Held
```

The short address selects entropy that already exists in storage.

## Path 2 — exact no-store reconstruction

`path2-two-shadow-recovery` represents bounded blocks as CRT residues:

```text
S_i = X mod p_i
```

One shadow is non-injective. A selected set becomes exact only when:

```text
product(p_i) >= source_range
```

Insufficient capacity returns `Held::InsufficientJointCapacity`. Extra selected cylinders must
agree with the recovered object.

## DBBH → DBWH emission gate

The white side does not trust a first-pass reconstruction. It rebuilds the projection:

```text
black P(X)
  -> recover R(P(X)) = X'
  -> white P(X')
  -> compare SHA + all shadows + frequency shells
```

The required invariant is:

```text
P(R(P(X))) = P(X)
```

Only then may a verified classical clone leave the white side. Otherwise the result remains held.

The local Path-2 watcher roles are deterministic consistency checks:

```text
OmniShannon  capacity ledger
GnnForward   black-to-white recovery
ReverseGnn   white-to-black re-projection
MTP1         pixel plane
MTP2         shell plane
MTP3         cylinder plane
```

The separate trained neural sidecars can observe this throat; their presence is not inferred merely
from the role names.

## White rooms and GULP as storage transfer

The stage does not pile all outputs in memory:

```text
answer/envelope
  -> score/gate
  -> white-room KEEP or COMPACT
  -> GULP 2000
  -> SUPER-GULP 50000
  -> cube/glyph/hash/receipt/cold body on storage
```

The active window is bounded while the durable result survives. Mistakes are compacted and retained
as evidence rather than erased.

## “Hard drive instead of GPU” — exact scope

The post-trigger stage can place these on HDD/SSD:

- message archives and GULP products;
- cube bodies and compacted mistakes;
- GNN edge ledgers;
- HBP/HBI/SHA/HEX receipts;
- Path-1 retained content;
- Path-2 shadow lanes;
- model checkpoints and manifests;
- cold supervisor/agent state.

CPU/storage operations include:

- SHA, Host8, and PID addressing;
- BEHCS rebasing;
- CRT recovery;
- Fischer and Hookwall rules;
- deterministic Shannon checks;
- white-room compaction;
- receipt verification and N-Nest recomputation.

GPU/accelerator operations may include trained GNN inference, training, and LLM generation.
Therefore disk replaces resident state and repeated movement, not tensor arithmetic.

This lets CPU-only and storage-rich machines participate as collection, queue, white-room, recovery,
and verification nodes while accelerator-owning machines provide neural scoring as sidecars.

## Verification provenance

### Claude Fable 5 — operator-supplied real third-seat runs

```text
dbbh-coms-quant-prism       rustc 1.97   19/19 green
path2-two-shadow-recovery   rustc 1.97   30/30 green
```

### GPT-5.6 Pro — audit and independent CI execution

GPT-5.6 Pro audited the healthcare models, byte-identical transfer, BigPickle/Fischer, trained GNNs,
this stage, Q-PRISM Path 1 and Path 2, watcher gate, white rooms, cube mint, reductions, algorithms,
Dispatcher, HyperHermes, and N-Nest.

GPT-authored Rust 1.97.0 GitHub Actions runs completed successfully:

```text
Path 1      run 29134408321   exact 19-test assertion PASS
Path 2      run 29134413119   exact 30-test assertion PASS
Q-PRISM 3D run 29134419389   all targets PASS
```

The Rust runs validate exact recovery and watcher mechanics. They are not new GNN benchmark results.

## Claim ledger

- `MEASURED`: source lineage, score/gate paths, trained artifacts, Path-1/Path-2 exact recovery,
  DBWH re-projection, disk-backed flow-not-pile mechanisms.
- `REPOSITORY_REPORTED_TRAINING`: healthcare comparative metrics.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: supplied Rust results.
- `MEASURED_GPT_DIRECTED_GITHUB_ACTIONS`: successful Rust CI runs.
- `AUDITED_GPT_5_6_PRO`: complete cross-repository audit.
- `BOUNDARY`: disk is a durable state tier, not a GPU arithmetic replacement.
- `UNVERIFIED`: one live cross-machine transaction through trained GNNs, Path-2 Rust, Hilbra, and
  hardware-enforced one-use shares.
