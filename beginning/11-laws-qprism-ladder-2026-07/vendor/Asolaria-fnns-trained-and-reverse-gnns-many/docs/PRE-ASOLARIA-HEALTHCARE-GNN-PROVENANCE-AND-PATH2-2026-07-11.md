# Pre-Asolaria healthcare GNN provenance and Path-2 integration — 2026-07-11

## Direct origin

The trained Asolaria ensemble has a pre-Asolaria origin in Jesse's AI healthcare assistant. Four
edge-level model implementations were later copied byte-for-byte into the Asolaria GNN sidecar:

| model | healthcare/sidecar Git blob SHA |
|---|---|
| `EdgeLevelGNN` | `510f78890ec94b113f0610afbade8bafe6ca20e0` |
| `PrototypeGNN` | `99e3087a10ee58e90c0935f5ab63b72fd3cdd07e` |
| `ContrastiveGNN` | `56329e61eb3e6ddb3ee97b46f997dd8dd8c6b39f` |
| `GSLGNN` | `886b3b0c0cdbddba983fa8c3ae083c4520d38f0e` |

The matching blobs prove direct code lineage.

## Training evidence — two eras

### Healthcare-era reported results

The original model source records:

```text
EdgeLevelGNN    91.87%
PrototypeGNN    94.24%
ContrastiveGNN  94.71%
GSLGNN          96.66%, ROC-AUC 99.70%, FPR 1.5%
```

The implementations include real training mechanisms: learnable prototypes, supervised contrastive
loss, learned graph structure, and dual learned/original graph branches. The healthcare test suite
validates forward shapes, probability ranges, projection normalization, contrastive loss, learned
adjacency, and both GSL branches.

The checked-in healthcare service currently comments out automatic loading of
`weights/{model_type}_model.pt`. Therefore those numbers are correctly tagged
`REPOSITORY_REPORTED_TRAINING`, not a metric newly reproduced in the current healthcare runtime.

### Asolaria-era trained artifacts

This repository preserves subsequent `.pt` checkpoints, trainer code, inference server, manifests,
and held-out split metrics. Those are later trained artifacts and should not be backdated as the
exact healthcare checkpoints.

The class-imbalance warning remains binding: about 315,209 of 315,249 examples are positive. Near-
perfect aggregate scores are therefore not a calibrated balanced baseline.

## Why edge-level learning became system-level learning

The learned object is an edge:

```text
source node -- typed relation/event --> target node
```

That abstraction transfers from healthcare/FHIR/API graphs to:

- agent-to-agent messages;
- PID-to-PID routes;
- device-to-fabric signals;
- Hookwall envelopes;
- supervisor relationships;
- hypergraph paths and reverse-gain observations.

The later stack extends rather than replaces the original edge models:

```text
L0 EdgeLevelGNN
L4 GSLGNN
G1 edge-mining
G2 forward-genius
G3 reverse-gain
G4 GLSM
OmniShannon
SHA fallback
Fischer
Hookwall
```

## Path 2 and the trained GNNs

The GNN ensemble scores which edges, paths, anomalies, and candidate outputs matter. The Path-2
recovery crate solves a different problem: exact reconstruction and verification of represented
bytes.

```text
GNN plane:
  score / rank / classify / detect / propose

Path-2 plane:
  enforce joint capacity
  reconstruct by CRT
  re-project candidate
  require SHA/shadow/shell equality
  emit or Hold
```

This separation is important. A neural score is not proof of exact recovery. The DBBH→DBWH gate is
an inverse-map proof; the trained GNN can be an additional observer or proposer around it.

## Storage-backed deployment

The trained models may use CPU/GPU accelerators, but the entire fabric does not need to live in GPU
memory. The system can place the following on HDD/SSD:

- training corpora and held-out datasets;
- checkpoint files and manifests;
- cube bodies and compacted mistakes;
- HBP/HBI/SHA/HEX receipts;
- graph edge ledgers;
- GULP/SUPER-GULP archives;
- Path-1 retained content;
- Path-2 distributed shadows;
- cold agent and supervisor state.

RAM holds the bounded active batch/window. GNN inference can run as a sidecar on the machines that
have sufficient CPU/GPU capability. Other machines can serve as disk-backed memory, graph ingestion,
dispatch, white-room, recovery, or verification nodes.

The exact claim is storage-tier separation, not “hard drive performs neural tensor compute.”

## Independent recovery verification

### Claude Fable 5 — operator-supplied real third-seat runs

```text
dbbh-coms-quant-prism       rustc 1.97   19/19 green
path2-two-shadow-recovery   rustc 1.97   30/30 green
```

### GPT-5.6 Pro — audit and CI execution

GPT-5.6 Pro audited the healthcare models, byte-level transfer, this trained stack, BigPickle,
Hookwall/Shannon, both Q-PRISM recovery crates, the watcher gate, white rooms, cube mint,
Dispatcher, HyperHermes, reductions, algorithms, and N-Nest.

GPT-authored Rust 1.97 GitHub Actions runs completed successfully:

```text
Path 1      run 29134408321   exact 19-test assertion PASS
Path 2      run 29134413119   exact 30-test assertion PASS
Q-PRISM 3D run 29134419389   all targets PASS
```

Those runs validate the exact recovery/control plane; they are not misrepresented as new GNN model
accuracy benchmarks.

## Claim ledger

- `MEASURED`: four matching model blobs; later trained artifacts/manifests; score-plane source;
  Path-1/Path-2 recovery source and tests.
- `REPOSITORY_REPORTED_TRAINING`: healthcare comparative metrics.
- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`: supplied Rust recovery runs.
- `MEASURED_GPT_DIRECTED_GITHUB_ACTIONS`: successful independent Rust CI runs.
- `AUDITED_GPT_5_6_PRO`: complete cross-repository source/test/lineage audit.
- `BOUNDARY`: aggregate Asolaria checkpoint metrics remain imbalance-inflated; storage replaces
  resident state, not neural arithmetic.
- `UNVERIFIED`: live trained-GNN invocation inside the Rust Path-2 throat across physical Hilbra
  hosts.
