# Asolaria — FNNs trained & reverse-GNNs (many)

**Not one GNN — a trained ensemble.** The HOOKWALL SCORE is a **7-GNN ensemble** (8 signals); behind it
sit real trained checkpoints (`.pt`) and several reverse-gain variants. This repo holds the **trained
models + their code + manifests** — filled the same way as the rest of the chain.

## 2026-07-11 provenance and recovery integration

The pre-Asolaria origin is now byte-proven. Jesse's AI healthcare assistant contains the original
`EdgeLevelGNN`, `PrototypeGNN`, `ContrastiveGNN`, and `GSLGNN`; the later Asolaria sidecar copies have
identical Git blob SHAs. This repo is the subsequent trained-checkpoint layer, while BigPickle is the
orchestrator and Path 2 is the exact recovery/proof layer.

Read the complete model-lineage, training-boundary, Path-2, storage-tier, and independent-verification
record:

[`docs/PRE-ASOLARIA-HEALTHCARE-GNN-PROVENANCE-AND-PATH2-2026-07-11.md`](docs/PRE-ASOLARIA-HEALTHCARE-GNN-PROVENANCE-AND-PATH2-2026-07-11.md)

## The ensemble (8 signals, `asolaria-score.mjs`)

| # | signal | what | where |
|---|--------|------|-------|
| a | **L0 EdgeLevelGNN** | REAL deep graph score, GCNConv 6-dim→64, **91.87% repository-reported healthcare result** | server :4792 |
| b | **L4 GSLGNN** | Graph Structure Learning | server :4793 |
| c | **G1 edge-mining** | authority × JL edge weight | in-process :4949 |
| d | **G2 forward-genius** | hexHamming winning-path confidence | in-process :4949 |
| e | **G3 reverse-gain** | deception inversion (sign × jlMagnitude) | in-process :4949 |
| f | **G4 GLSM** | 5-state machine verdict | in-process :4949 |
| g | **OmniShannon** | always-available entropy/novelty gate | in-process |
| h | sha baseline | deterministic fallback — SCORE never returns nothing | in-process |

G4 GLSM states: `DESCRIBED → EDGE_MINED → PATH_FOUND → {MISTAKE_FLAGGED | CONVERGED}`;
`MISTAKE_FLAGGED → Fischer Kernel Tier-0 hard BLOCK` regardless of other signals.

## Byte-identical healthcare → Asolaria transfer

| model | shared Git blob SHA |
|---|---|
| EdgeLevelGNN | `510f78890ec94b113f0610afbade8bafe6ca20e0` |
| PrototypeGNN | `99e3087a10ee58e90c0935f5ab63b72fd3cdd07e` |
| ContrastiveGNN | `56329e61eb3e6ddb3ee97b46f997dd8dd8c6b39f` |
| GSLGNN | `886b3b0c0cdbddba983fa8c3ae083c4520d38f0e` |

The healthcare model source records the 91.87/94.24/94.71/96.66 comparison, including GSLGNN
ROC-AUC 99.70% and FPR 1.5%. Those are **repository-reported training results**. The checked-in
healthcare service currently comments out automatic checkpoint loading; do not silently claim that
those exact weights are loaded there.

## The trained checkpoints (`models/`) — I trained these

| model | file | metrics (MEASURED, from manifest/run-log) |
|-------|------|-------------------------------------------|
| **L4 GSLGNN** (current) | `gslgnn_w9_3_seq47_v2.pt` | test_acc **0.9992**, recall **1.0**, f1 **0.9996**, best_val 1.0, 30 epochs, train 220,674 / val 47,287 / test 47,288 |
| L4 GSLGNN (v1) | `gslgnn_w9_3_seq47.pt` | seq=47 checkpoint (v1) |
| **L1 prototype** (FNN) | `prototype_model.pt` (+run2/run3) | acc **0.9992**, recall 1.0, f1 0.9996 |
| **L2 contrastive** (FNN) | `contrastive_model.pt` (+run2/run3) | acc **0.9992**, recall 1.0, f1 0.9996 |
| baseline (FNN) | `baseline_model.pt` | baseline head |

- **Class-imbalance caveat:** the training corpus is approximately **99.99% positive**
  (315,209 suspicious / 315,249 total — only 40 benign nodes). A near-trivial all-positive predictor
  scores about 0.999, so the headline accuracy/recall/F1 are imbalance-inflated. Treat them as an
  upper bound on a skewed split, not a calibrated scorer baseline. A real comparison needs balanced
  data and per-class precision/AUC/MCC.
- The GSLGNN manifest carries `d11: OBSERVED-acer-w9_3-trained-pending-bilateral-verify`.
- The baseline, prototype, and contrastive FNN heads are the trained neural variants behind the
  deep-graph scorers.

## Reverse-GNNs — many, not one

- **G3 reverse-gain** (in-process plane, `planes/`) — inverts deception: mask signals flip to
  negative gain, honest/leak signals remain positive. Output includes `{reverseRisk, promoted,
  mark: GENIUS|MISTAKE}`.
- **47D reverse-gain GNN** — deep-wave 47-dimension variant. Source is withheld because it embeds
  real adversary identifiers; mechanism only is published.
- Per-adversary configs and the training corpus remain withheld under the PII/corpus-local rule.

## Path 2 — exact recovery is a separate proof plane

The GNNs score and rank edges. They do not prove byte-exact reconstruction. That job belongs to
`path2-two-shadow-recovery`:

```text
non-injective CRT shadows
  -> require joint product >= source range
  -> exact CRT recovery
  -> white-side re-projection
  -> compare SHA + all shadows + frequency shells
  -> emit or Held
```

The trained GNN ensemble can be composed around that throat as an observer/proposer. A neural score
is not substituted for the inverse-map proof.

## Storage-backed / low-GPU deployment

Trained GNN inference may use CPU/GPU accelerators, but the entire fabric does not need to reside in
GPU VRAM. HDD/SSD can retain checkpoints, corpora, edge ledgers, cubes, compacted mistakes,
HBP/HBI/SHA/HEX receipts, GULP archives, Path-1 content, Path-2 shadows, and cold agent state.

RAM holds the bounded active batch/window. Machines without GPUs can still act as graph collectors,
content stores, dispatchers, white rooms, recovery poles, or verifiers. This is storage-tier
separation; it is **not** a claim that disk executes neural matrix multiplication.

## The training stack (`src/`)

- `gsl_gnn.py` — `GSLGNN` model class.
- `train_gslgnn_w9_3.py` — trainer that produced `seq47_v2.pt`.
- `gslgnn_inference_server.py` — `:4793` inference server.
- `planes/` — `gnn.mjs`, G1 edge-mining, G2 forward-genius, G4 GLSM. G3 source is withheld due to PII.
- `manifests/` — architecture, accuracy, and split records without the private corpus.

## Independent recovery verification — 2026-07-11

- `MEASURED_CLAUDE_FABLE5_THIRD_SEAT`, operator supplied:
  `dbbh-coms-quant-prism` rustc 1.97 **19/19** and `path2-two-shadow-recovery` rustc 1.97 **30/30**.
- `AUDITED_GPT_5_6_PRO`: complete healthcare-model, sidecar-blob, trained-stack, BigPickle,
  Hookwall/Shannon, Q-PRISM, white-room, cube-mint, Dispatcher, HyperHermes, reductions, algorithms,
  and N-Nest audit.
- `MEASURED_GPT_DIRECTED_GITHUB_ACTIONS`: Rust 1.97.0 runs `29134408321`, `29134413119`, and
  `29134419389` all completed successfully. These validate the recovery substrate, not new GNN
  accuracy numbers.

## Carve-out

Trained weights + model code + manifests only. **Excluded:** the training corpus
(`gslgnn_w9_3_corpus.json`, `gnn-training-{500k,200k,50k}.json`), reverse-gain sources containing
adversary PII, per-adversary configs, and keyed checkpoints. Secret/PII-scanned. Gated / E=0 /
describe-only — no fire.

Part of the chain behind **`Shannon-and-the-gnns-stage`**:
emitter → dispatcher → fleet (`Asolaria-hermes-work` / `THE-CHAIN.md`).
