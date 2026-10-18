# Provenance: asolaria-l2-contrastive

This crate ports the trained L2 ContrastiveGNN, with its run-1 checkpoint, into integer-only Rust.
This file records where every upstream byte came from, why the forward is the one ported, where the
training script, a server and the consumers are (or should be), which values upstream derives from
the network's outputs, and the measured agreement.

## Lanes

| Lane | What runs there | Here |
|---|---|---|
| Hot (per request, in process) | Rust only, integers only: the forward and its outputs. No Python, torch, Node, JSON or HTTP. | `src/` |
| Cold (verification, CI only) | Stdlib Python referees, and torch + torch_geometric for the parity harness. The tools compute in integers only; float runs only inside torch, which runs the vendored class with the float32 checkpoint (the owner's float32 lane, unchanged). Inputs reach torch as float32 bit patterns built with integers, and its outputs are read by bit pattern and converted with integers. | `tools/` |

The vendored Python file is imported only by the cold-lane parity harness (and by
`tools/measurements.py`, which imports that harness). Nothing in the hot lane reads the vendored
checkpoint; `src/weights.rs` is generated from it without torch.

## Vendored upstream files

Every file under `vendor/` is byte-identical to its upstream. `git hash-object <file>` gives the
blob id below, and CI runs `sha256sum -c UPSTREAM.sha256`.

| Vendored path | Upstream repository @ commit | Upstream path | Git blob | sha256 |
|---|---|---|---|---|
| `vendor/gnn-sidecar/models/contrastive_gnn.py` | `JesseBrown1980/asolaria-behcs-256` @ `818cc235a6db815e3b2591339cf9b42aad3e85a0` | `services/gnn-sidecar/models/contrastive_gnn.py` | `56329e61eb3e6ddb3ee97b46f997dd8dd8c6b39f` | `349a30c02d558734618c2d9c69384a088b84664dfcb0f798b10553ac431201fb` |
| `vendor/fnns/models/contrastive_model.pt` | `JesseBrown1980/Asolaria-fnns-trained-and-reverse-gnns-many` @ `c4b2458c88358c46155d3b308c594f9991720847` | `models/contrastive_model.pt` | `76b7ec50d57e1a70cb9d755edffc75afc15e7a4b` | `d371dbbf97ecee87846a87a1a57492e3c03d97168a9b5f5cfcc1fee411488eef` |

The same bytes are also at (same git blob id):

- `contrastive_gnn.py`: `JesseBrown1980/AI-healthCare-project` @ `e0048c0ad60705ecb447642f08b14b5c1bde7437`
  `backend/anomaly_detector/models/contrastive_gnn.py`.
- `contrastive_model.pt`: `Asolaria-fnns-trained-and-reverse-gnns-many` @ `c4b2458c` `models/contrastive_model_run3.pt`
  (run 3 is byte-identical to run 1).

Both files were read in full before copying. `contrastive_gnn.py` holds code and docstrings only;
the checkpoint's `data.pkl` holds only the state-dict keys, module paths and tensor records, and its
other entries are float32 tensor bytes, format markers and a numeric serialization id. Neither holds
personal data.

### Pinned, not vendored

| Upstream (`Asolaria-fnns-trained-and-reverse-gnns-many` @ `c4b2458c`) | Size | Git blob | sha256 |
|---|---|---|---|
| `models/contrastive_model_run2.pt` (run 2) | 99,073 | `6ab8743e0e3dca29de7387443a618272a2c0507f` | `048764063f6711be5f501f5f65155dc8d017c1106d99aecf2580ded2906ebe72` |
| `models/contrastive_model_run3.pt` (run 3, = run 1) | 99,073 | `76b7ec50d57e1a70cb9d755edffc75afc15e7a4b` | `d371dbbf97ecee87846a87a1a57492e3c03d97168a9b5f5cfcc1fee411488eef` |
| `manifests/gnn_train_run1_results.json` | 295 | `abc11e6fd5882b811a16f46a8f4136be0fedf36e` | `4845cbb614c20024a116d7c516c6c5775fa9fdf068873fc21df8e4972187993e` |

Run 2's `data.pkl` is byte-identical to run 1's (sha256 `87159ddc…`: same keys, shapes and module
paths); its tensor bytes differ. Since 2026-10-18, copies of runs 1, 2 and 3 with these sha256 are on
this container at `acer/Asolaria/services/gnn-sidecar/contrastive_model{,_run2,_run3}.pt` (cube
`9859b576`); `tools/measurements.py` reads run 2 from there after checking its sha256. The run-1 manifest reads `"L2_ckpt": "contrastive_model.pt (97KB 2026-06-01 08:02)"`,
`"L2_acc": 0.9992`, `"L2_prec": 0.9992`, `"L2_recall": 1.0`, `"L2_f1": 0.9996`. The port uses run 1.

## What is ported and what is only vendored

| Upstream | Ported to | Notes |
|---|---|---|
| `contrastive_model.pt` (float32 state dict, 14 tensors, 23,330 values) | `src/weights.rs` | `floor(w * 2^24 + 1/2)` per weight, written by `tools/quantize.py` without torch; the tool refuses any key list or `_metadata` module-path list other than the fallback class's. |
| `ContrastiveGNN.forward` (contrastive_gnn.py:92-122), eval mode, `num_classes=2` | `src/model.rs` `anomaly_probabilities`, `edge_outputs`, `edge_output` | See [Which forward is ported](#which-forward-is-ported-and-why). |
| `encode_nodes`, `get_edge_embeddings`, `get_projections` (contrastive_gnn.py:72-90) | `src/model.rs` | Called by the forward. |

Vendored only, not ported:

- `SupervisedContrastiveLoss` (contrastive_gnn.py:125-172): the training loss over projections.
- The torch_geometric branch of contrastive_gnn.py:15-16: the checkpoint does not load into it (below).

## Which forward is ported, and why

Upstream's status test states that the L2 server was not written, and the cube `9859b576` manifest
records it as not on ACER (see [Server](#server) for the scope), so there is no served forward to
follow.
The forward ported is the one the checkpoint was saved from, read off its layout:

- Keys, in order: `conv1.lin.weight` (64 x 6), `conv1.lin.bias` (64), `conv2.lin.weight` (64 x 64),
  `conv2.lin.bias` (64), `edge_mlp.0.weight` (64 x 128), `edge_mlp.0.bias`, `projection_head.0.weight`
  (64 x 64), `projection_head.0.bias`, `projection_head.2.weight` (64 x 64), `projection_head.2.bias`,
  `classifier.0.weight` (32 x 64), `classifier.0.bias` (32), `classifier.3.weight` (2 x 32),
  `classifier.3.bias` (2). So `node_input_dim=6`, `hidden_dim=64`, `projection_dim=64`, `num_classes=2`.
- `_metadata` module paths: `''`, `conv1`, `conv1.lin`, `conv2`, `conv2.lin`, `edge_mlp`, `edge_mlp.0..2`,
  `projection_head`, `projection_head.0..2`, `classifier`, `classifier.0..3` (18 paths).

That is exactly the module tree of `ContrastiveGNN(6, 64)` built with the fallback `GCNConv` of
contrastive_gnn.py:17-23, the class the file defines when `from torch_geometric.nn import GCNConv`
raises ImportError: a module holding one `nn.Linear` named `lin`, with
`forward(x, edge_index): return self.lin(x)`. `tools/model_parity.py` measures both sides under
torch 2.14.1+cpu and records them in the `LAYOUT` row of `tests/fixtures/expected-model.hbp`:

- Fallback class: keys and module paths equal the checkpoint's; `load_state_dict` (strict) succeeds.
- torch_geometric 2.8.1 `GCNConv`: the class's module paths add `conv1.aggr_module` and
  `conv2.aggr_module`, and a strict load of the checkpoint is refused with missing keys
  `conv1.bias, conv2.bias` and unexpected keys `conv1.lin.bias, conv2.lin.bias`.

Upstream states this layout directly. bigpickle-rebuild @ `c592599c`
`tests/unit/gnn-l1-l2-status.test.mjs:135` lists "torch_geometric optional (falls back to stub GCNConv)"
among the prerequisites of `train_contrastive.py`, and lines 139-143 give its expected output as "Keys:
conv1.lin.{weight,bias}, conv2.lin.{weight,bias}, edge_mlp.0.{weight,bias}, projection_head.{0,2}.{weight,bias},
classifier.{0,3}.{weight,bias}" and "Architecture: ContrastiveGNN(node_input_dim=6, hidden_dim=64,
projection_dim=64, num_classes=2)": the keys and shapes listed above (the whole note is quoted under
[Training script](#training-script)). The same repository's `src/fabric-thinker-gnn.mjs:224` records that
the checkpoints do not load there:
`state_dict_rekey_pending: 'L1/L2/L4 .pt files exist but torch-version key drift blocks load; L0 partial-load functional'`.
The key difference measured here (torch 2.14.1+cpu, torch_geometric 2.8.1) is the one between the two
`GCNConv` classes contrastive_gnn.py:15-23 can define, depending on whether torch_geometric imports,
which is what status-test line 135 describes.
For L0, `inference_server.py:11` renames `conv*.lin.bias` to `conv*.bias` and serves torch_geometric
`GCNConv`; no L2 code upstream performs a rename or a load, so this crate applies none.

The ported forward, per node: `conv1` = `Linear(6, 64)`, ReLU, dropout (off in eval), `conv2` =
`Linear(64, 64)`; `edge_index` is not used by these layers. Per edge `(row, col)`:
`edge_mlp(cat(h[row], h[col]))` = `Linear(128, 64)`, ReLU, `Dropout(0.3)` (off in eval). Then
`classifier` = `Linear(64, 32)`, ReLU, Dropout, `Linear(32, 2)`, `F.softmax(dim=-1)`, and the
forward returns `probs[:, 1]`; with `return_projections=True` it also returns
`F.normalize(projection_head(edge_embeddings), p=2, dim=1)`, `projection_head` = `Linear(64, 64)`,
ReLU, `Linear(64, 64)`. Each edge's outputs depend on the features of its two end nodes only;
`tests/model.rs` checks this on every fixture edge.

Integer arithmetic: Q24 values, i128 accumulation, one round-half-up per layer output. The two
logits stay in Q48 and their exact difference goes through a fixed-point sigmoid
(`softmax([a, b])[1] = 1 / (1 + e^(a - b))`), computed from a Q62 range-reduced `e^-|t|` and rounded
once to Q24. It equals the exact integer reference (`tools/math_referee.py`) on the 1,511 committed
logits and on 20,000 further random logits in [-20, 20) (seed 20261018). Next to a rounding tie it
can be 1 unit away: for 15,000 half-unit points `k + 1/2` (seed `0x5EED71E5`), the four Q48 logits
around each point's exact crossing (60,000 logits, each within 2 Q48 units of it), 9 differ by 1,
each with an exact value less than 2^-39 units from its half-unit point. (The earlier text gave 6 for
a 60,000-logit sample measured against a 60-digit `Decimal` reference, whose script was not
retained; the count depends on the sample.) The projection stays in Q48 into `F.normalize`, which
divides by `max(||v||_2, eps)` with eps the float32 of `1e-12` (9223372 * 2^-63), as
torch/nn/functional.py:6126-6127 does; the integer square root is taken at 2^-8 of a unit after
scaling the vector so its largest component is below 2^51. It equals the exact reference on the 126
committed vectors. A vector whose largest component is at least 2^51 is rounded by that scaling, so
a component whose exact value is a half-unit tie can be 1 unit away. Of 1,000 constructed vectors
(seed `0x7135`; exact norm 2^25 times an integer, so each odd component before scaling is an exact
half-unit tie; both signs), the 686 with largest component at least 2^51 hold 2,952 tie components:
633 of those vectors differ, in 1,446 tie components, each by 1, and no other component differs. The
314 with largest component below 2^51 (1,376 tie components) all equal the reference. (The earlier
text gave 292 of 598 and 0 of 402 for a construction whose script was not retained.) Both
measurements are `tools/measurements.py ties`, which runs `sigmoid_q24` and `normalize_q24` from a
verbatim copy of `src/model.rs`.

## Training script

The gnn-sidecar cube `9859b576` located `train_contrastive.py` on ACER (sha256 `87247eb4…`); its body
was transferred on 2026-10-18 and is at `acer/Asolaria/services/gnn-sidecar/train_contrastive.py`. bigpickle-rebuild @ `c592599c` `tests/unit/gnn-l1-l2-status.test.mjs` names it and
says how it was to be run: line 12 "training required: run train_contrastive.py", line 90
"train_contrastive.py was run 2026-06-01", and lines 106-116 expect `train_contrastive.py`
referencing `contrastive_model.pt` in the sidecar directory, whose default is
`C:/Users/acer/Asolaria/services/gnn-sidecar` (line 20). Lines 124-147, `describe("L2 gap: what
training requires")`, hold this note:

```text
To produce contrastive_model.pt:

  cd C:/Users/acer/Asolaria/services/gnn-sidecar
  python train_contrastive.py

Prerequisites:
  - gslgnn_w9_3_corpus.json (present)
  - torch + numpy (present per L0/L1/L4 successful runs)
  - torch_geometric optional (falls back to stub GCNConv)

Expected output:
  - contrastive_model.pt (~50-150 KB state_dict)
  - Keys: conv1.lin.{weight,bias}, conv2.lin.{weight,bias},
          edge_mlp.0.{weight,bias}, projection_head.{0,2}.{weight,bias},
          classifier.{0,3}.{weight,bias}
  - Architecture: ContrastiveGNN(node_input_dim=6, hidden_dim=64,
                                 projection_dim=64, num_classes=2)

After training, write contrastive_inference_server.py at :4796
following the same pattern as prototype_inference_server.py.
```

The vendored checkpoint (99,073 bytes) has exactly these keys and this architecture.

**Corpus: named and pinned upstream.** The note names `gslgnn_w9_3_corpus.json`. The gnn-sidecar
cube `9859b576` located a build of it on ACER (sha256 `7e7d0406…`, 68,695,303 B), transferred on
2026-10-18 to `acer/Asolaria/services/gnn-sidecar/gslgnn_w9_3_corpus.json`; that build differs from the v2 manifest's pinned
`0f123581…` below, since `build_corpus()` joins time-varying orchestrator ticks, so the exact v2
corpus is not the cube's copy. Asolaria-fnns @ `c4b2458c` `src/train_gslgnn_w9_3.py` builds it in
`build_corpus()` (lines 182-205, historical orchestrator ticks joined with the current Phase-1
tensor-fabric outputs), and `main()` writes it to `SIDECAR_DIR / "gslgnn_w9_3_corpus.json"`
(lines 317-324; `SIDECAR_DIR` is `services/gnn-sidecar`, line 35) and takes its sha256.
`manifests/gslgnn_w9_3_seq47_v2_manifest.json:5-13` pins it: `corpus_sha256`
`0f1235818828b27d0e143385eb322733e784151bc8a2b8dc60855dc6f5e9699e`, `totalNodes` 109,
`totalEdges` 315,249, `benign` 40, `suspicious` 315,209 (both counted over edge labels,
train_gslgnn_w9_3.py:195-196). These are the counts of the status test's
"40-benign-vs-315k-suspicious corpus" (line 95) and of the Asolaria-fnns README (lines 59-60). The
v2-pinned bytes (`0f123581…`) are not on this container: on 2026-10-18 `find / -xdev -name
'gslgnn_w9_3_corpus*'` finds only copies of the cube's build `7e7d0406…` (the one in this repository
is `acer/Asolaria/services/gnn-sidecar/gslgnn_w9_3_corpus.json`), and no path in the private mirror
matches.

**Searched for the trainer on 2026-10-17, before the cube transfer, and not found then.** The searches
below looked for `train_contrastive`, `contrastive_inference_server`, `prototype_inference_server`,
`gslgnn_w9_3_corpus` and `train_all_models`, and found none of them in these scopes at that time
(since 2026-10-18 `train_contrastive.py`, `prototype_inference_server.py` and the corpus build above
are in `acer/`, and `train_all_models.py` arrived in ACER's delivery `FABLE5-REGEN-ITEM6A-FIRST-GNN-ZOO-CODE-CKPTS-2026-10-18`):

- every file on the container of that day (`find / -xdev`), including behcs-256 @ `818cc235` `services/gnn-sidecar/`
  (holds `baseline_model.pt`, `inference_server.py`, `models/`, `start_inference.sh`,
  `train_baseline.py`) and Asolaria-fnns @ `c4b2458c` (holds `src/train_gslgnn_w9_3.py` only);
- every path in the git history of the behcs-256 (68 commits), bigpickle-rebuild, Asolaria-fnns and
  Shannon-and-the-gnns-stage clones;
- every path in all 364 commits of the private mirror `asolaria-mirror.git` (16,126 distinct paths;
  its `services/gnn-sidecar/` holds `train_baseline.py` and `train_gslgnn_w9_3.py`);
- every path in every commit of clones of 11 more of the owner's repositories:
  Omni-Asolaria-ASI-OS-Matrix-Fabric, asolaria-asi-os, asolaria-os, raw-data, asolaria-eggs,
  asolaria-cube-cloud, asolaria-agent-memory, how-and-why-the-system-works,
  asolaria-whiteroom-engine, asolaria-quantum-universe-alive, and
  Glyphs-Actual-glyphs---gnns-and-tables-needed-to-rebuild-the-system @ `90d38940`.

GitHub code search is no evidence either way for these repositories. Over `user:JesseBrown1980` it
returns nothing for `train_contrastive`, but also nothing for strings that are in bigpickle-rebuild
and Asolaria-fnns (`state_dict_rekey_pending`, `"contrastive_model.pt"`). Even
`repo:JesseBrown1980/bigpickle-rebuild import` returns nothing, with `incomplete_results` set
(2026-10-17), so its index does not cover those two repositories.

One mirror file, `reports/original-hermes-github-update-readiness-latest.json` (mirror commit
`1228174`, `generatedAt` `2026-04-25T01:15:58.969Z`), lists as untracked (`??`) in the acer working
tree the paths `sovereignty/research/gnn-patterns/train_all_models.py`, `.../contrastive_model.pt`,
`.../prototype_model.pt`, `.../inference_server_v2.py`, `.../training_results.json`,
`.../convert_graph_events.py` and `.../models/contrastive_gnn.py`. Being untracked, their bytes are
in no commit, and no object under that directory exists in the mirror. The report was written before
run 1, whose manifest dates `contrastive_model.pt` 2026-06-01 08:02, and lists a different directory
from the status test's `services/gnn-sidecar`, so it says nothing about the trainer of run 1. Files
at those paths reached this container on 2026-10-18 in ACER's delivery
`FABLE5-REGEN-ITEM6A-FIRST-GNN-ZOO-CODE-CKPTS-2026-10-18` (its `gnn-patterns/`): its
`models/contrastive_gnn.py` is byte-identical to the vendored file (`349a30c0…`), and its
`contrastive_model.pt` (99,137 B, sha256 `70d8d282…`) is a different checkpoint from run 1 (99,073 B,
`d371dbbf…`).

On disk, then: the corpus's name, sha256 and counts, the feature order of the corpus's own trainer
(`[min(edgeVolume/100, 1), avgRisk/9, maxRisk/9, failureRate, online, trustTier/3]`,
train_gslgnn_w9_3.py:224-231, the same order as train_baseline.py:31-38), and the L2 trainer's
expected keys and architecture. Not on this container until 2026-10-18 (now at
`acer/Asolaria/services/gnn-sidecar/train_contrastive.py`, sha256 `87247eb4…`): the L2 trainer's own
code, and with it how it turns the corpus into node features and labels, its loss weights and its
split. That file builds node features in the same six-feature order (train_contrastive.py:25-36),
takes each edge's `label` (lines 46-47), splits by edge order at 70% and 85% (lines 64-66), and trains
with `nn.CrossEntropyLoss()` plus 0.3 times `SupervisedContrastiveLoss(temperature=0.07)` (lines
70-72, 111-113). The checkpoint's input width is 6. This crate takes the Q24 feature matrix as input
and does not build features.

## Server

Not written, by upstream's own statement; the cube `9859b576` manifest records it as not on ACER
(LIRIS and the cloud sessions not searched), and `find / -xdev -name 'contrastive_inference_server*'`
finds nothing on this container (2026-10-18). The status test asserts its absence:
`tests/unit/gnn-l1-l2-status.test.mjs:94-104` (bigpickle-rebuild @ `c592599c`),
"L2 stays BENCHED until spread-verified (same degenerate-corpus caveat as L4)", with the comment
"Trained to ~99.92% on the 40-benign-vs-315k-suspicious corpus — the same imbalance that left L4 a
dead constant 0.5292. Present but NOT trusted as a voter until a class-weighted retrain passes spread
std > 0.01. The inference server (:4796) is intentionally NOT wired until that spread check passes."
and the assertion that `contrastive_inference_server.py` does not exist (the :4796 server). The same file's header
(lines 10-12) reads "L2 STATUS : CHECKPOINT ABSENT — contrastive_model.pt does not exist / inference
server NOT written (no weights to load) / training required: run train_contrastive.py", and the
describe block at line 84 reads "L2 ContrastiveGNN checkpoint (TRAINED 2026-06-01 — gap closed)".
Lines 145-146 plan the server: "After training, write contrastive_inference_server.py at :4796
following the same pattern as prototype_inference_server.py." `prototype_inference_server.py`, which
the header names as the L1 server at :4795 (lines 7-8), was not found by the searches listed under
[Training script](#training-script); the gnn-sidecar cube `9859b576` later located it on ACER (sha256
`c4a36e8a…`), and it was transferred on 2026-10-18 to
`acer/Asolaria/services/gnn-sidecar/prototype_inference_server.py`.
`feed-gnn-archaeology-to-fabric.mjs:16` names an `inference_server_v2` with role
`4-layer-immune-cascade` at `C:/Users/acer/Asolaria/sovereignty/research/gnn-patterns/inference_server_v2.py`;
its bytes are in no commit of the private mirror (the mirror report above lists the path as
untracked), and a file of that name (9,279 B, sha256 `c6600b0e…`) reached this container on
2026-10-18 in the ITEM6A delivery above.

## Consumers, and the values upstream derives from the outputs

| Where | What it reads | What it derives |
|---|---|---|
| contrastive_gnn.py:120-121 | `probs` | `probs[:, 1]`, commented "Return anomaly probability": the forward's only output for two classes |
| contrastive_gnn.py:116-118, 125-172 | `projections` (`return_projections=True`) | `SupervisedContrastiveLoss` over them, in training |
| behcs-256 @ `818cc235` `src/gnn/hybrid-harness.js:18-35` (blob `14863cbf`) | a `contrastive(agent_id)` scorer, "score in [0,1]" | `lcr = (o + r + g + c + p) / 5` over omni, reverse, gsl, contrastive and prototype, then `lcr.toFixed(6)` into a shard sha256; the default scorer is `sha256(String(id))[0] / 255` (lines 20-23). No caller supplies a contrastive scorer; `data/gnn/1B-manifest.json:11` reads "Composite sha manifest to be regenerated by hybrid-harness when scorers wired". |
| AI-healthCare-project @ `e0048c0a` `backend/anomaly_detector/service.py:51-58`, `api.py:50-65` | `model(x, edge_index)` | with two classes, an edge is reported when `score > threshold` (service.py:258-260, default `threshold=0.5` at :141; api.py:65 `score > settings.ANOMALY_THRESHOLD`, 0.8 at config.py:34); with more classes, when the argmax class is an anomaly class and the anomaly classes' probabilities sum above the threshold (service.py:245-252). With `MODEL_TYPE=contrastive` (default `gsl`, config.py:18) that service builds `ContrastiveGNN(16, 32, projection_dim=64, num_classes=4)` by default (config.py:21-29) and loads no weights (service.py:104-107 are comments), so it does not run this checkpoint. |
| asolaria-score.mjs (Shannon-and-the-gnns-stage @ `32f9670a`, lines 151-163) | — | no L2 signal and no L2 weight |
| bigpickle-rebuild `src/fabric-thinker-gnn.mjs:223` | — | lists `cascade_layers: ['L0_EdgeLevel', 'L1_Contrastive', 'L2_Prototype', 'L4_GSLGNN']`; `feed-gnn-archaeology-to-fabric.mjs:12` gives contrastive_gnn the role `L1-embedding-separation`, accuracy 0.9471. The run-1 manifest and the status test call the contrastive network L2. |
| Asolaria-fnns `manifests/gnn_train_run1_results.json` | the trainer's evaluation | `L2_acc`, `L2_prec`, `L2_recall`, `L2_f1` (trainer on ACER in cube `9859b576`) |

So the one scalar upstream code takes from this network is `probs[:, 1]`, which this crate returns
as `anomaly_q24`; the projections are returned as `projection_q24`. The only combining rule that
names a contrastive score is hybrid-harness's equal fifth, with a stub scorer in place of the
network. L2 is not a composite voter, and not for want of an owner-supplied weight (owner decision
7b, correction of 2026-10-18): the system benches it, for its training corpus. The status test
(gnn-l1-l2-status.test.mjs:94-104, quoted under [Server](#server)) keeps L2 benched and its :4796
server unwired until a class-weighted retrain passes the spread check (std > 0.01); the committed
scorer (`gate/observed/src/score.rs`, `Signals`) carries no l1 or l2 field and its composite omits
them. That item is closed, not pending owner input; adding L2 later would need such a retrain first
and a new owner decision then. This crate defines no weight.

## Measured agreement

| Check | Cases | Result |
|---|---|---|
| Rust `anomaly_probabilities` vs the vendored class (fallback `GCNConv`, run-1 checkpoint, torch 2.14.1+cpu, Python 3.13.16), `tests/model.rs` | 262 edges of the 104 layout graphs | max \|rust - torch\| = 1 Q24 unit; 166 of 262 equal; the test allows 16 |
| Rust `edge_outputs` projections vs the same | 16,768 components of those edges | max \|rust - torch\| = 8 Q24 units (8/2^24); 13,857 of 16,768 equal; the test allows 16 |
| Rust `edge_outputs` vs the same on the `mag<K>` graphs: features of both signs up to 2^K, float32-exact, 40 graphs per K | K = 4, 8, 12, 16, 20: 98, 104, 101, 96, 94 edges | max \|rust - torch\| of `probs[:, 1]`: 1, 1, 1, 3, 11 Q24 units; of projection components: 7, 7, 8, 80, 946; the test allows 16 up to K = 8 and 16 * 2^(K - 8) above |
| Fixed-point sigmoid vs the exact integer reference (`tools/math_referee.py`) | 1,511 logits | all equal (1 unit apart next to a rounding tie; see [above](#which-forward-is-ported-and-why)) |
| Integer `F.normalize` vs exact integer reference (`tools/math_referee.py`) | 126 vectors, 8,064 components (zero, one-hot, near-eps, 3-4-5 and 5-12-13 directions, magnitudes 2^1 to 2^119) | all equal (1 unit apart at a half-unit tie when the largest component is at least 2^51; see above) |
| `weights.rs` vs `tools/quantize.py --check` | 23,330 weights, 18 module paths | equal |
| `edge_output(x[s], x[t])` vs `edge_outputs(x, edges)[k]` | 755 edges | all equal |

The projection differences of up to 8 units come from the weights' Q24 rounding, as the exact forward
below shows. The vector before `F.normalize` is close to `projection_head.2.bias`, 7 of whose 64
components are nonzero in Q24, dominated by component 48 (-1,128,270 Q24). The Q24-rounded bias's
exact squared norm is 1273026084679/2^48, and its Q24 norm is 1,128,284 floored (nearest 1,128,285);
the float32 bias's squared norm floors to 1,273,026,076,861 Q48 and gives the same floor and nearest.
The bias's largest float32-to-Q24 rounding shift, measured from its float32 bits, is 509/1024 Q24
units (509/2^34 in value), at component 45 (Q24 -958); `F.normalize`, dividing by the norm, scales a
shift across the bias's direction to at most 509 * 2^14/1128284 = 2084864/282071 Q24 units (between 7
and 8). No weight's rounding shifts it by more than 1/2 unit (2^-25), which gives the per-component
bound 2^23/1128284 = 2097152/282071 (also between 7 and 8); over all 23,330 weights the largest shift
is exactly 1/2 unit, at 139 exact ties (the first at flat index 10 of `conv1.lin.weight`). The measured
maximum, 8 units, is 1 above the integer part of those per-component values: all 14 rounded tensors
contribute, and the forward with the Q24 weights in exact arithmetic reaches 8 units on its own.

**Input magnitude.** The first two rows hold for the layout graphs: the 6-feature training layout
with risk up to 21, 100 and 1,000,000, raw Q24 values in [-2^26, 2^26), and four fixed graphs. The
agreement depends on input magnitude. `src/weights.rs` holds each float32 weight rounded to Q24,
which moves it by up to 2^-25, and `conv1` multiplies that by the input. For features of both signs
the difference from torch stays within 3 (`probs[:, 1]`) and 7 (projections) units up to 2^10 in the
sweep below and grows beyond, roughly in proportion to the features' magnitude (the `mag` row). With
`MAGNITUDE_GRAPHS = 400` in copies of `tools/model_parity.py` and `tests/model.rs` (2,104 graphs,
5,269 edges, 337,216 projection values; a 2,204,931-byte file, not committed), the same test
printed, for K = 4, 8, 12, 16, 20 (1,009, 994, 970, 1,015, 1,019 edges): `probs[:, 1]` at most 1, 2,
1, 17, 27 units apart, and projections at most 7, 7, 8, 77, 1,111 (re-run on 2026-10-18 with the
same results).

**Exact forward.** `tools/measurements.py exact` (cold lane, not part of the checks) evaluates the
vendored class's eval-mode forward in integer arithmetic with the run-1 float32 weights at their
exact values (integer multiples of 2^-149): exact layer sums and ReLU, the exact sigmoid of
`logits[1] - logits[0]` and the exact `F.normalize`, each rounded once to Q24 as the fixture's q24
fields are. It runs Rust from a probe built from verbatim copies of `src/`, and torch (the owner's
float32 lane) through `tools/model_parity.py`. It also evaluates the same exact forward with the Q24
weights of `src/weights.rs`, which isolates the weights' rounding from Rust's per-layer rounding.
Largest \|difference\| of Q24 values, `probs[:, 1]` / projection components:

| Graphs | Edges | Rust - torch | Rust - exact | torch - exact | exact with Q24 weights - exact | Rust - exact with Q24 weights |
|---|---|---|---|---|---|---|
| fixture layout (187 training-layout, 66 raw, 9 fixed) | 262 | 1 / 8 | 0 / 8 | 1 / 2 | 1 / 8 | 1 / 1 |
| fixture `mag4` | 98 | 1 / 7 | 1 / 7 | 1 / 1 | 1 / 7 | 1 / 1 |
| fixture `mag8` | 104 | 1 / 7 | 1 / 7 | 1 / 1 | 0 / 7 | 1 / 0 |
| fixture `mag12` | 101 | 1 / 8 | 1 / 8 | 1 / 3 | 1 / 8 | 1 / 1 |
| fixture `mag16` | 96 | 3 / 80 | 2 / 80 | 1 / 2 | 2 / 80 | 0 / 0 |
| fixture `mag20` | 94 | 11 / 946 | 11 / 946 | 1 / 3 | 11 / 946 | 0 / 1 |
| sweep K = 8 | 3,808 + 3,660 | 2 / 7 | 1 / 7 | 1 / 1 | 1 / 7 | 1 / 1 |
| sweep K = 10 | 3,731 + 3,806 | 3 / 7 | 2 / 7 | 1 / 2 | 2 / 7 | 1 / 1 |
| sweep K = 12 | 3,769 + 3,768 | 5 / 8 | 6 / 8 | 1 / 3 | 6 / 8 | 1 / 1 |
| sweep K = 16 | 3,752 + 3,759 | 11 / 83 | 11 / 83 | 2 / 3 | 11 / 83 | 1 / 1 |
| sweep K = 20 | 3,765 + 3,759 | 41 / 1,125 | 41 / 1,125 | 1 / 4 | 41 / 1,125 | 1 / 1 |

The fixture rows reproduce the test's Rust - torch maxima. The sweep uses `tools/model_parity.py`'s
`Lcg` and `magnitude_graph` (float32-exact features of both signs up to 2^K) with seeds 7777 and
31337, 1,500 graphs per K per seed, K in the order shown; its edge counts are given per seed. So the
difference from torch sits on the Rust side and comes from the weights' Q24 rounding: Rust stays
within 1 unit of the exact forward with its own Q24 weights, and torch's float32 forward stays within
2 (`probs[:, 1]`) and 4 (projections) units of the exact values. 642 input values of the fixture's
layout graphs are not float32-exact (Q24 values with more than 24 significant bits, which torch
receives rounded); the exact forward at torch's rounded inputs gives the same Q24 outputs as at the
Q24 inputs on every fixture edge. An earlier sweep (seeds 7777 and 31337, 3,799 and 3,932 edges per
magnitude; its script was not retained) reported Rust - torch at most 2, 2 and 5 (`probs[:, 1]`) and
7, 7 and 8 (projections) up to 2^8, 2^10 and 2^12. It also compared against a float64 copy of the
class with the same float32 weights, which ran float64 outside the owner's float lanes, and placed
the difference on the Rust side; the exact forward above replaces that comparison with integers and
reaches the same conclusion.

`tools/model_parity.py --check` compares the committed file byte for byte, and torch's float32
results depend on the CPU kernels it selects. As model/l0-edge/tools/model_parity.py does, the tool
sets `ATEN_CPU_CAPABILITY=default`, `MKL_CBWR=COMPATIBLE`, `OMP_NUM_THREADS=1` and
`MKL_NUM_THREADS=1` before torch loads (ATen's scalar kernels, oneMKL's SSE2-only Conditional
Numerical Reproducibility code path, one thread), and the file's header names them. On the x86-64
AVX-512 host that wrote the file, `--check` passes with the caller's environment unset or set to
`MKL_ENABLE_INSTRUCTIONS=AVX2`, `SSE4_2` or `AVX512`, `ATEN_CPU_CAPABILITY=avx2` or `avx512`,
`MKL_CBWR=AVX2`, `OMP_NUM_THREADS=4` or `MKL_NUM_THREADS=3`, in both torch environments on that host
(torch 2.14.1+cpu, torch_geometric 2.8.1, Python 3.13.16). Without the pin, torch's default
selection on that host gives 22 projection values that differ from the file (by at most 2 Q24 units)
and the same `probs[:, 1]` bit patterns; with `MKL_ENABLE_INSTRUCTIONS=AVX2` and no pin, 14
projection values and 1 `probs[:, 1]` bit pattern differ (at most 2 units). The unpinned counts
depend on the host. On a later container (2026-10-18; Intel Xeon Processor @ 2.10GHz, AVX-512, 4
cores; the same torch, torch_geometric and Python in both environments), a copy of the tool with
`KERNEL_ENV = {}` gives 92 projection values (at most 2 units) and 1 `probs[:, 1]` bit pattern (2
units) that differ from the file, and with `MKL_ENABLE_INSTRUCTIONS=AVX2` and no pin 85 projection
values (at most 1 unit) and 2 bit patterns (at most 2 units); with the pin, `--check` passes there
under each caller setting listed above. It has not been run on an AMD CPU here.

The inputs reach torch as float32 bit patterns made in integers (`q / 2^24` rounded once, to
nearest, ties to even; the fixture header's "rounded to nearest even" names the same rounding).
The earlier harness formed `q / 2^24` as a Python float first and let torch round that to float32;
the two paths differ only when `|q| >= 2^54` (for `q = 2^54 + 2^30 + 1`: `4e800000` then,
`4e800001` now). Every fixture input has `|q| < 2^44`, so the committed file is the same either way.

## Measured outputs of the run-1 checkpoint (fixture graphs, SYNTHETIC)

Measured with `tools/measurements.py outputs` (and `weights`, `run2`) in integers. The population
standard deviation below is the floor of the integer square root of the exact variance of the
float32 values (read by bit pattern, as integer multiples of 2^-149), in Q24; it is compared with the
status test's 0.01 exactly (variance against 1/10,000), and the comparison is given as a balanced
trit (-1 below, 0 equal, +1 above). 0.01 is 4194304/25 Q24 (between 167,772 and 167,773).

- `probs[:, 1]` over all 262 edges of the layout graphs, Q24 (1.0 = 2^24 = 16,777,216): minimum
  16,652,342 (16652342/2^24), maximum 16,777,216, range 124,874, 137 distinct values; 50 edges give
  exactly 1.0 (float32 bits `3f800000`, Q24 16,777,216); population standard deviation 31,873 Q24
  (floor; 31873/2^24), trit -1 against 0.01. The 262 edges are 187 of the 80 random training-layout
  graphs (`case % 5 != 4`; risk up to 21, 100 or 1,000,000), 66 of the 20 raw-Q24 graphs
  (`case % 5 == 4`) and 9 of the four fixed graphs. Over the 187: minimum 16,770,213
  (16770213/2^24), maximum 16,777,216, range 7,003, 97 distinct values, the same 50 edges exactly
  1.0; population standard deviation 1,358 Q24 (floor; 1358/2^24), trit -1. (The four fixed graphs
  also hold features in the layout's six slots; with their 9 edges the set is 196 edges, minimum
  16,764,769, range 12,447, 104 distinct values, standard deviation 1,778 Q24, trit -1.) The status
  test's promotion criterion is "spread std > 0.01" on its corpus; that corpus's bytes were not on this
  container when these were measured (the gnn-sidecar cube `9859b576` later located a build on ACER,
  `7e7d0406…`, transferred 2026-10-18 to `acer/`), so these numbers describe the synthetic fixture
  only; the owner's live-corpus measurements are in `docs/handoffs/gnn-recheck-2026-10-18/`.
- Projections, over the 262 layout edges: the mean direction (the summed projection vector,
  normalized) has its largest-magnitude component at number 48, Q30 magnitude 1,073,727,916
  (-1073727916/2^30), the integer square root floored toward zero; the adjacent Q30 value
  -1073727917/2^30 is the nearer one, so this ratio is the truncated neighbour, not the rounded
  one (the component sits between the two). The next-largest component, number 13, is more than 244
  times smaller: the summed Q24 components are -4,395,573,014 and -17,985,776, a ratio of
  4395573014/17985776 (between 244 and 245). Every edge's projection has cosine at least
  1,073,738,443 in Q30 (1073738443/2^30) with that mean direction, computed with integer square
  root, which floors toward zero and so holds as a lower bound (the adjacent 1073738444/2^30 is the
  rounded value and would not bound from below).
  (Q30 scale, 1.0 = 2^30 = 1,073,741,824.) Equivalently, projection component 48 lies within
  [-16,777,000, -16,776,935] Q24 on every layout edge (1.0 = 2^24).
- `conv1.lin.weight` columns 1 and 2 are equal in all 64 rows, in run 1 and in run 2 (by float32 bit
  pattern, `tools/measurements.py weights`). In the
  6-feature layout of train_baseline.py:31-38 and train_gslgnn_w9_3.py:224-231 (the trainer of the
  corpus the status test names for L2) these columns take `avgRisk/9` and `maxRisk/9`, and the L2
  trainer, on this container since 2026-10-18 at
  `acer/Asolaria/services/gnn-sidecar/train_contrastive.py` (`87247eb4…`), builds the same order
  (train_contrastive.py:25-36).
- Asolaria-fnns README.md states for these checkpoints: "the training corpus is approximately
  **99.99% positive** (315,209 suspicious / 315,249 total — only 40 benign nodes)" and "Treat them as
  an upper bound on a skewed split, not a calibrated scorer baseline." The fixture measurements do
  not reach the manifest's accuracy, precision, recall or F1. Those need the v2-pinned corpus
  (`0f123581…`; not on this container, whose build is the cube's `7e7d0406…`) and a run of the
  trainer, which is on this container.

Run 2 (pinned above; sha256 `048764063f…` checked before use), measured in the cold lane on the same
262 layout edges with the same vendored class (torch is the only place float runs; both runs' outputs
are read by bit pattern and compared with integers): `probs[:, 1]` Q24 (1.0 = 2^24) minimum
16,647,798 (16647798/2^24), maximum 16,777,216, range 129,418, 146 distinct values, the same 50 edges
exactly 1.0; population standard deviation 32,578 Q24 (floor; 32578/2^24), trit -1 against 0.01. The
largest \|run1 - run2\| of `probs[:, 1]` is exactly 1079/2^21 = 8632/2^24 (8,632 Q24 units). Its
projections point in a different direction: the largest \|run1 - run2\| projection component is
exactly 549755523363/2^39 in float32 (16777207 * 2^15 + 4387, over 2^39; nearly a full unit),
16,777,208 Q24 units as a ceiling, and 16,777,207 Q24 units between the two Q24-rounded values.
Run 1 run this way reproduces the committed fixture's `p_bits` and projection Q24 values on all 104
layout graphs.

## Referees

| Tool | Needs | Writes; `--check` diffs |
|---|---|---|
| `tools/quantize.py` | stdlib | `src/weights.rs`, from the checkpoint read by a restricted unpickler (only `collections.OrderedDict`, `torch._utils._rebuild_tensor_v2`, `torch.FloatStorage`) |
| `tools/math_referee.py` | stdlib | `tests/fixtures/expected-math.hbp` |
| `tools/model_parity.py` | torch 2.14.1+cpu, torch_geometric 2.8.1 | `tests/fixtures/expected-model.hbp` |
| `tools/measurements.py` (not a check) | stdlib (`outputs`, `weights`); cargo +1.81.0 (`ties`); torch as above (`run2`; `exact` with cargo) | nothing in the crate; prints the measurements above as HBP rows |

Every tool computes in integers only (no Python float, `Decimal`, `Fraction` or `math` function other
than `isqrt`, `prod` and `gcd`); float runs only inside torch. Every data file these tools write is HBP
text.
