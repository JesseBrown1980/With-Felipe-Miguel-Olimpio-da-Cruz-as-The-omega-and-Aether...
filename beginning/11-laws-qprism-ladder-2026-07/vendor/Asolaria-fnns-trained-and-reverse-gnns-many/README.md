# Asolaria — FNNs trained & reverse-GNNs (many)

**Not one GNN — a trained ensemble.** The HOOKWALL SCORE is a **7-GNN ensemble** (8 signals); behind it
sit real trained checkpoints (`.pt`) and several reverse-gain variants. This repo holds the **trained
models + their code + manifests** — filled the same way as the rest of the chain.

## The ensemble (8 signals, `asolaria-score.mjs`)
| # | signal | what | where |
|---|--------|------|-------|
| a | **L0 EdgeLevelGNN** | REAL deep graph score, GCNConv 6-dim→64, **91.87% acc** | server :4792 |
| b | **L4 GSLGNN** | Graph Structure Learning | server :4793 |
| c | **G1 edge-mining** | authority × JL edge weight | in-process :4949 |
| d | **G2 forward-genius** | hexHamming winning-path confidence | in-process :4949 |
| e | **G3 reverse-gain** | deception inversion (sign × jlMagnitude) | in-process :4949 |
| f | **G4 GLSM** | 5-state machine verdict | in-process :4949 |
| g | **OmniShannon** | always-available 23-stage entropy novelty gate | in-process |
| h | sha baseline | deterministic fallback — SCORE never returns nothing | in-process |

G4 GLSM states: `DESCRIBED → EDGE_MINED → PATH_FOUND → {MISTAKE_FLAGGED | CONVERGED}`;
`MISTAKE_FLAGGED → Fischer Kernel Tier-0 hard BLOCK` regardless of other signals.

## The trained checkpoints (`models/`) — I trained these
| model | file | metrics (MEASURED, from manifest/run-log) |
|-------|------|-------------------------------------------|
| **L4 GSLGNN** (current) | `gslgnn_w9_3_seq47_v2.pt` | test_acc **0.9992**, recall **1.0**, f1 **0.9996**, best_val 1.0, 30 epochs, train 220,674 / val 47,287 / test 47,288 |
| L4 GSLGNN (v1) | `gslgnn_w9_3_seq47.pt` | seq=47 checkpoint (v1) |
| **L1 prototype** (FNN) | `prototype_model.pt` (+run2/run3) | acc **0.9992**, recall 1.0, f1 0.9996 |
| **L2 contrastive** (FNN) | `contrastive_model.pt` (+run2/run3) | acc **0.9992**, recall 1.0, f1 0.9996 |
| baseline (FNN) | `baseline_model.pt`, `baseline_model_retrained.pt` | baseline / retrained head |

- **Honest tag:** the GSLGNN manifest carries `d11: OBSERVED-acer-w9_3-trained-pending-bilateral-verify`
  — the metrics are **MEASURED on the held-out split**, but D11 honesty says *not PROVEN* until the
  empirical 3-substrate seq=47 run + bilateral verify. Kept verbatim; not inflated.
- The three FNN heads — **baseline** (feed-forward baseline), **prototype** (prototype network),
  **contrastive** (contrastive-trained) — are the trained NN variants behind the deep-graph scorers.

## reverse-GNNs (many — not one)
- **G3 reverse-gain** (in-process plane, `planes/`) — inverts deception: adversary "mask" signals flip
  to negative gain, honest/leak signals stay positive. `→ {reverseRisk, promoted, mark: GENIUS|MISTAKE}`.
- **47D reverse-gain GNN** — the deep-wave 47-dimension variant (`run-47d-reverse-gain-gnn.mjs`).
  **Source withheld** — it embeds real adversary identifiers (PII). Mechanism only: 47-D env vectors,
  `mask` intents weighted **negative**, `leak` intents weighted **positive** (the deception inversion at
  47 dimensions instead of the in-process plane's).
- the per-adversary reverse-gain configs and the training corpus are withheld (PII / corpus-local rule).

## The training stack (`src/`)
- `gsl_gnn.py` — the `GSLGNN` model class (Graph Structure Learning, GCNConv).
- `train_gslgnn_w9_3.py` — the trainer (the run that produced `seq47_v2.pt`).
- `gslgnn_inference_server.py` — the :4793 inference server.
- `planes/` — the in-process GNNs: `gnn.mjs`, `gnn-edge-mining.mjs` (G1), `gnn-forward-genius.mjs`
  (G2), `glsm.mjs` (G4). *(G3 `gnn-reverse-gain.mjs` is withheld — its mask-glyph list is real
  adversary PII; mechanism described above.)*
- `manifests/` — training manifests + run results (architecture, accuracy, split sizes; **not** the
  corpus).

## Carve-out
Trained weights + model code + manifests only. **Excluded:** the training **corpus**
(`gslgnn_w9_3_corpus.json`, `gnn-training-{500k,200k,50k}.json` — corpus stays local by rule);
`gnn-reverse-gain.mjs`, the 47D reverse-gain script, and the per-adversary 47D config
(adversary-identifier **PII**); the `.pre-L0-rekey`
checkpoint (keyed). Secret/PII-scanned before commit. Gated / E=0 / describe-only — no fire.

Part of the chain (the trained models behind **`Shannon-and-the-gnns-stage`** → the GNN step):
emitter → dispatcher → fleet (`Asolaria-hermes-work` / `THE-CHAIN.md`).
