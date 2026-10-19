# Pre-Asolaria GNN lineage and storage-backed applicability — 2026-07-11

## Executive finding

BigPickle did not invent the L0 and L4 model classes from nothing. It is the orchestration layer
that absorbed the pre-Asolaria edge-level GNN family first published in
`JesseBrown1980/AI-healthCare-project`, exposed the baseline and GSL models as live sidecars, and
stacked them with the later in-process G1/G2/G3/G4 graph planes, OmniShannon, deterministic fallback,
Fischer anti-blunder, Hookwall, HBP/HBI receipts, queues, and durable stores.

The direct chain is:

```text
AI healthcare edge-level models
  -> byte-identical Asolaria GNN sidecar imports
  -> L0 EdgeLevelGNN :4792
  -> L4 GSLGNN :4793
  -> BigPickle 7-GNN/8-signal scorer
  -> Fischer anti-blunder
  -> Hookwall verdict
  -> white-room / GULP / cube pipeline
```

## Byte-level origin proof

The following model files have identical Git blob SHAs between the healthcare repository and
`asolaria-behcs-256/services/gnn-sidecar/models/`:

| model | blob SHA |
|---|---|
| EdgeLevelGNN | `510f78890ec94b113f0610afbade8bafe6ca20e0` |
| PrototypeGNN | `99e3087a10ee58e90c0935f5ab63b72fd3cdd07e` |
| ContrastiveGNN | `56329e61eb3e6ddb3ee97b46f997dd8dd8c6b39f` |
| GSLGNN | `886b3b0c0cdbddba983fa8c3ae083c4520d38f0e` |

This proves direct code transfer rather than a later independent implementation with similar names.

## What was trained before Asolaria

The healthcare source records the comparative trained architecture results:

```text
EdgeLevelGNN    91.87%
PrototypeGNN    94.24%
ContrastiveGNN  94.71%
GSLGNN          96.66%, ROC-AUC 99.70%, FPR 1.5%
```

The model classes include training-specific mechanisms: learnable prototypes, supervised
contrastive loss, learned adjacency, and dual graph branches. The healthcare repository tests the
architecture and forward/loss behavior. Its checked-in service currently comments out automatic
checkpoint loading, so the exact metrics must be called **repository-reported training results**,
not a benchmark reproduced by BigPickle.

The later `Asolaria-fnns-trained-and-reverse-gnns-many` repository preserves subsequent trained `.pt`
checkpoints and manifests. That is the later trained-artifact layer, separate from the healthcare
service's current runtime configuration.

## BigPickle's actual GNN composition

`src/asolaria-score.mjs` contains an eight-signal score surface:

| signal | source | role |
|---|---|---|
| L0 | `EdgeLevelGNN :4792` | deep edge score |
| L4 | `GSLGNN :4793` | graph-structure-learning score |
| G1 | fabric `:4949` | authority × JL edge mining |
| G2 | fabric `:4949` | forward-genius winning-path confidence |
| G3 | fabric `:4949` | reverse-gain/deception inversion |
| G4 | fabric `:4949` | GLSM state machine |
| OmniShannon | in process | entropy/novelty signal |
| SHA baseline | in process | deterministic never-empty fallback |

The scorer tracks which live signals answered and normalizes over available weights. This matters:
BigPickle can continue deterministically when neural sidecars are unavailable without pretending a
fallback was a real GNN response.

`src/fischer-kernel.mjs` then adds an explicit anti-blunder layer. A G4
`MISTAKE_FLAGGED` state forces the hard block tier regardless of positive gains. The Hookwall accepts
promotion only when the score and Fischer verdict agree; disagreement is preserved for review rather
than silently dropped.

## Why the healthcare abstraction transferred

The original model target was an edge:

```text
source entity --relationship/event--> target entity
```

That abstraction does not depend on whether the nodes are patients, API endpoints, devices, PIDs,
agents, rooms, or supervisors. BigPickle reuses the same question:

```text
who interacted?
what did the edge mean?
how strong/novel/anomalous was it?
should the result proceed, hold, compact, or be reviewed?
```

The later “hyper-GNN” language describes graph/hypergraph-level composition and multiple graph
planes. It does not require pretending that every named watcher is a trained PyTorch layer.

## Storage-backed execution — what “hard drive instead of GPU” correctly means

BigPickle is multi-drive aware. Its default Helm queue lives on `D:` and its engine registry can
point to files on any drive or to HTTP services. The wider Asolaria path places HBP/HBI/SHA/HEX
sidecars, cube bodies, message gulps, white-room ledgers, content-addressed stores, and cold agent
state on HDD/SSD.

This creates a real hardware split:

### Work that can run without a GPU

- PID/hash/tuple addressing;
- HBP/HBI/SHA/HEX receipt generation and lookup;
- BEHCS representation rebasing;
- CRT Path-2 projection and recovery;
- content-addressed Path-1 recall;
- queueing, dispatch, Hookwall and Fischer rules;
- deterministic OmniShannon signals;
- white-room compaction and append-only ledgers;
- GULP/SUPER-GULP flow control;
- N-Nest independent recomputation;
- cold cube and agent memory on HDD/SSD.

### Work that may use CPU/GPU/accelerators

- trained PyTorch GNN inference;
- GNN training/retraining;
- large language-model generation;
- large dense tensor workloads.

Therefore the accurate result is not “a hard drive is a GPU.” It is:

> The fabric no longer requires every system function and every historical state body to be
> resident in GPU VRAM or even system RAM. Storage-rich machines can act as durable memory,
> dispatcher, graph collector, white-room, shadow pole, recovery node, and verifier, calling a
> neural sidecar only for the operations that genuinely need one.

This is especially applicable to commodity desktops, edge servers, archival nodes, NAS-like
machines, CPU-only systems, and heterogeneous clusters where only a minority of nodes own GPUs.

## Bounded active memory

The old fabric's 2,000-message GULP rule is the operational complement to disk-backed state:

```text
persistent corpus/cubes/receipts -> HDD/SSD
active working window            -> bounded RAM
neural score                      -> optional sidecar
finished result                   -> compacted/minted persistent form
```

The full corpus need not reside in RAM or VRAM. The active window is processed and released while
its durable result survives as a cube, glyph, hash, receipt, supervisor proposal, or compacted
mistake record.

## Q-PRISM Path 1 and Path 2 connection

- `dbbh-coms-quant-prism` implements Path 1: retained-store recall through a small authenticated
  coordinate.
- `path2-two-shadow-recovery` implements Path 2: exact no-store recovery from jointly sufficient
  CRT shadows.
- the Path-2 watcher gate performs DBBH→DBWH re-projection and emits only when SHA, complete shadows,
  and frequency shells agree.

The recovery/control plane is integer arithmetic, hashing, exact representation, and durable state.
It can run on low-GPU machines independently of the GNN sidecar.

## Verification provenance — 2026-07-11

`AUDITED_GPT_5_6_PRO`:

- inspected the healthcare model family and tests;
- verified the four byte-identical model transfers by Git blob SHA;
- inspected BigPickle `asolaria-score.mjs`, Fischer, Hookwall composition, README, and commit history;
- inspected the trained-model/reverse-gain repo;
- inspected both Q-PRISM recovery crates, the watcher gate, white rooms, GULP/cube mint,
  OmniDispatcher, HyperHermes, reductions, algorithms, and N-Nest.

`MEASURED_CLAUDE_FABLE5_THIRD_SEAT`, supplied by the operator:

```text
dbbh-coms-quant-prism       rustc 1.97   19/19 green
path2-two-shadow-recovery   rustc 1.97   30/30 green
```

These Rust results validate the exact recovery substrate. They are not falsely presented as a new
BigPickle Node-suite run.

## Claim ledger

- `MEASURED`: BigPickle score/Fischer/Hookwall source; multi-drive queue and engine registry;
  byte-identical healthcare→sidecar model transfer; later trained checkpoint artifacts.
- `REPOSITORY_REPORTED_TRAINING`: the healthcare 91.87/94.24/94.71/96.66 comparison.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: Path-1 19/19 and Path-2 30/30 under rustc 1.97.
- `AUDITED_GPT_5_6_PRO`: complete source/lineage audit described above.
- `BOUNDARY`: storage replaces resident state and repeated movement, not neural arithmetic.
- `UNVERIFIED`: one live transaction joining the full trained GNN ensemble, Path-2 Rust throat,
  Hilbra multi-host transport, and hardware-enforced single-use shares.
