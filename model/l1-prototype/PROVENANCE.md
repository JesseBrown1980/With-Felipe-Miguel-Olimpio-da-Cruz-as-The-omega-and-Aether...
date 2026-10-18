# Provenance: asolaria-l1-prototype

This crate ports the trained L1 PrototypeGNN, with the weights of its run-1 checkpoint
`prototype_model.pt`, into integer-only Rust. This file records where every upstream byte came
from, which forward is ported and why, the measured agreement with the upstream class, the
scalars upstream code derived from the model's output, and what is not on disk.

## Lanes

| Lane | What runs there | Here |
|---|---|---|
| Hot (per request, in process) | Rust only: the forward on Q24 integers. No Python, torch, Node, JSON or HTTP. | `src/` |
| Cold (verification, CI only) | Stdlib Python (`tools/quantize.py`, `tools/int_referee.py`) and torch for the parity harness (`tools/model_parity.py`). | `tools/` |

The vendored Python file is imported only by the cold-lane torch parity harness.

The three tools use integer arithmetic only (Python integers; no float, no decimal).
Float runs in one place: inside torch, when `tools/model_parity.py` runs the vendored `PrototypeGNN` with the
trained float32 checkpoint. That is the owner's float32 lane, run unchanged, to show what the trained network
computes. The harness builds each input tensor from float32 bit patterns made with integers, and reads every torch
output by its bit pattern and converts it with integers (`float32_units` and `q24_of_float32_bits` in
`tools/quantize.py`, which reads the checkpoint's weights the same way). The upstream float values quoted below
(manifest metrics, README and test text, upstream code) are upstream's own printed output, not measurements made here.

## Vendored upstream files

Every file under `vendor/` is byte-identical to its upstream. `git hash-object <file>` gives the
blob id below, and CI runs `sha256sum -c UPSTREAM.sha256`.

| Vendored path | Upstream repository @ commit | Upstream path | Git blob | sha256 |
|---|---|---|---|---|
| `vendor/gnn-sidecar/models/prototype_gnn.py` | `JesseBrown1980/asolaria-behcs-256` @ `818cc235a6db815e3b2591339cf9b42aad3e85a0` | `services/gnn-sidecar/models/prototype_gnn.py` | `99e3087a10ee58e90c0935f5ab63b72fd3cdd07e` | `b57f630bf28bb0cf35b66caadf1d80ce7210b703afe421ce2f79318f0a13ceb7` |
| `vendor/fnns/models/prototype_model.pt` | `JesseBrown1980/Asolaria-fnns-trained-and-reverse-gnns-many` @ `c4b2458c88358c46155d3b308c594f9991720847` | `models/prototype_model.pt` | `1d1be27874e5fa4a7ef88026561033a0e0aac3fe` | `b4df990138ae215bbdda7c1fcf4902bc0a8cb72d9b7d8944eb965d0fc737dd22` |

The same bytes are also at these upstream paths (same git blob id):

- `prototype_gnn.py`: `JesseBrown1980/AI-healthCare-project` @ `e0048c0ad60705ecb447642f08b14b5c1bde7437`
  `backend/anomaly_detector/models/prototype_gnn.py`; the private mirror's `services/gnn-sidecar/models/prototype_gnn.py`
  and `dist/public-release/Asolaria-Public-20260410-093155/services/gnn-sidecar/models/prototype_gnn.py` (the only
  blob of that path in any mirror ref). The mirror was read, not copied: the vendored bytes come from behcs-256.
- `prototype_model.pt`: the fnns repository's `models/prototype_model_run3.pt` (run 3 = run 1).

Privacy scan before copying: `prototype_gnn.py` holds code and a paper title, no personal data; the checkpoint's
`data.pkl` holds only the state-dict keys, the module tree and tensor records.

## Pinned, not vendored

| What | Repository @ commit, path | Git blob | sha256 | Why it is pinned |
|---|---|---|---|---|
| L1 run-2 checkpoint | fnns @ `c4b2458c`, `models/prototype_model_run2.pt` (73,793 bytes) | `3660b469f648aa4287b9f6a19732543a22e72ccc` | `f9817037b888759ab8b1d1ff8d41b4aa4d3b0e790b70a5a73d659545527073b8` | Present upstream with the same keys, shapes and module tree as run 1 and different values. It is not the run-1 checkpoint and is not ported. |
| Run-1 manifest | fnns @ `c4b2458c`, `manifests/gnn_train_run1_results.json` | `abc11e6fd5882b811a16f46a8f4136be0fedf36e` | `4845cbb614c20024a116d7c516c6c5775fa9fdf068873fc21df8e4972187993e` | Names the run-1 checkpoint: `"L1_ckpt": "prototype_model.pt (72KB 2026-06-01 07:58)"`, with upstream's printed metrics `"L1_acc": 0.9992`, `"L1_prec": 0.9992`, `"L1_recall": 1.0`, `"L1_f1": 0.9996`. Not vendored (no JSON files in this stack). |
| L1/L2 status test | `JesseBrown1980/bigpickle-rebuild` @ `c592599c`, `tests/unit/gnn-l1-l2-status.test.mjs` | `9d92db79c8ddb6f9b983dbae6e74d76e99511a2e` | `8027739467b86ed13e8357213dd67527534a15751948836cfa6e88cbce9aca98` | The constructor arguments and the training environment (below). |

## Which forward is ported, and why

The checkpoint's state dict is

```
prototypes [2, 3, 64]
conv1.lin.weight [64, 6]   conv1.lin.bias [64]
conv2.lin.weight [64, 64]  conv2.lin.bias [64]
edge_projection.0.weight [64, 128]  edge_projection.0.bias [64]
edge_projection.2.weight [64, 64]   edge_projection.2.bias [64]
```

and its `_metadata` module tree is `'', conv1, conv1.lin, conv2, conv2.lin, edge_projection,
edge_projection.0, edge_projection.1, edge_projection.2`. That is the layout of `PrototypeGNN(6, 64, 2, 3)` when
`prototype_gnn.py` takes its `ImportError` branch (lines 17-24): `GCNConv` holds one `nn.Linear` and its forward is
`return self.lin(x)` (line 24), so `edge_index` does not enter the encoder. Measured with the vendored file under
torch 2.14.1 (the `LAYOUT` rows of `tests/fixtures/expected-model.hbp`, regenerated by `tools/model_parity.py`):

- fallback `GCNConv`: `load_state_dict(strict=True)` loads every key, and the model's module tree equals the
  checkpoint's;
- torch_geometric 2.8.1 `GCNConv` (lines 15-16): strict loading is refused, `missing=conv1.bias,conv2.bias`,
  `unexpected=conv1.lin.bias,conv2.lin.bias`, and that model has the extra modules `conv1.aggr_module,conv2.aggr_module`.

Upstream records the same training environment and key layout:

- bigpickle `tests/unit/gnn-l1-l2-status.test.mjs:132-135` (training prerequisites):
  "torch_geometric optional (falls back to stub GCNConv)"; line 139 lists the L2 checkpoint's expected keys as
  "conv1.lin.{weight,bias}, conv2.lin.{weight,bias}".
- bigpickle `src/fabric-thinker-gnn.mjs:224` (blob `423bd2e60cf76e38e18b7a01370a0092d5dce0da`):
  `state_dict_rekey_pending: 'L1/L2/L4 .pt files exist but torch-version key drift blocks load; L0 partial-load functional'`.
- fnns `README.md:55` names the model "**L1 prototype** (FNN)".

So the port runs the layers the weights were trained in: `conv1` and `conv2` are `Linear` layers on each node's
own features. The L0 server, behcs-256 `services/gnn-sidecar/inference_server.py:11` (blob
`3089da1d249f0eb76bb79e03a446714636474980`), renames `conv*.lin.bias` to `conv*.bias` and loads L0's checkpoint
into torch_geometric `GCNConv`. For L1 the server file `prototype_inference_server.py` is not on this container; the gnn-sidecar
cube `9859b576` locates it on ACER (sha256 `c4a36e8a…`, body pending transfer — see
[Not on disk](#not-on-disk) and docs/handoffs); upstream records a rekey as the pending load path, bigpickle
`src/fabric-thinker-gnn.mjs:15-16`: "When L1/L2/L4 also load (state_dict rekey pending), the full 4-layer immune
cascade activates". Measured with the same rename (torch 2.14.1+cpu, torch_geometric 2.8.1, the kernel pin below;
the `VARIANT` row of `tests/fixtures/expected-model.hbp`, which `tools/model_parity.py --check` regenerates): the
checkpoint loads into the torch_geometric `GCNConv` model with no missing or unexpected keys, and that model's
`forward` gives the same float32 bits as the fallback model, `0x3f7ffe5c`, on all 816 fixture edges.
`tools/model_parity.py --sweep` (300 random graphs of 2-9 nodes per scale `s`, features uniform in `[-s, s)` with at
most 24 significant bits, seed `0x4e4b`) gives equal `forward` bits at every tested `s` up to `2^28` (1, `2^8`,
`2^16`, `2^24`, `2^27`, `2^28`). At `s = 2^29`, 12 of 1,757 edges differ, by at most 2 Q24 units; the largest
difference is 2 at `2^30`, 8 at `2^33` and 50 at `2^36`. The node encodings `h` differ at every scale: at most 22 Q24
units at `s = 1` and 939,246 at `s = 2^16`. Every `SWEEP` row, under the kernel pin (differences are
`ceil(|a - b| * 2^24)` of the two float32 values, computed from their bits in integers):

| `s` | edges | `forward` bits unequal | max `forward` difference (Q24 units) | max `h` difference (Q24 units) |
|---|---|---|---|---|
| 1 | 1,838 | 0 | 0 | 22 |
| `2^8` | 1,800 | 0 | 0 | 4,409 |
| `2^16` | 1,828 | 0 | 0 | 939,246 |
| `2^24` | 1,703 | 0 | 0 | 214,506,073 |
| `2^27` | 1,704 | 0 | 0 | 1,814,129,303 |
| `2^28` | 1,757 | 0 | 0 | 4,352,152,320 |
| `2^29` | 1,757 | 12 | 2 | 6,050,237,972 |
| `2^30` | 1,854 | 376 | 2 | 17,355,051,024 |
| `2^33` | 1,771 | 712 | 8 | 120,259,058,288 |
| `2^36` | 1,860 | 1,580 | 50 | 1,225,842,192,384 |

Without the pin (torch's default kernel selection on the AVX-512 host below) the `forward` columns are the same and
the `h` maxima differ at four scales: 1,814,129,175 at `2^27`, 4,352,152,832 at `2^28`, 17,355,053,072 at `2^30` and
120,259,050,080 at `2^33`. This crate ports only the trained layout.

Constructor arguments: bigpickle `tests/unit/gnn-l1-l2-status.test.mjs:65-77` expects the :4795 server to build
`node_input_dim=6, hidden_dim=64, num_classes=2, num_prototypes_per_class=3`; the checkpoint's shapes agree.
`temperature` is not stored in the state dict and the test names none, so it is the constructor default `0.1`
(prototype_gnn.py:39).

## The forward in integers

| Upstream (prototype_gnn.py) | Here (`src/model.rs`) |
|---|---|
| `encode_nodes` 65-71: `conv1`, `relu`, `dropout` (off in eval), `conv2`; fallback `self.lin(x)` (24) | `encode_nodes`: two `Linear` layers, ReLU between, one round half up to Q24 per output, i128 sums |
| `get_edge_embeddings` 73-78: `cat(h[row], h[col])`, `Linear(128, 64)`, `ReLU`, `Linear(64, 64)` | `edge_outputs`: `EdgeOutput::embedding`, Q24 |
| `compute_prototype_distances` 80-105: `sum((e - p)^2)` per prototype, `min` per class, `-d / temperature` | `edge_outputs`: `EdgeOutput::logits_q48`, exact squared distances of the Q24 values (Q48), minimum per class, times `-10` |
| `forward` 107-131: `softmax(logits)[:, 1]` for two classes | `forward`, and `edge_outputs`: `EdgeOutput::probability_q24`, `1 / (1 + e^(l0 - l1))` rounded half up to Q24 |

`edge_outputs` returns one `EdgeOutput` per edge holding what `get_edge_embeddings`, `compute_prototype_distances`
and `forward` compute for it. `pair_output` is a helper added for this stack; prototype_gnn.py has no such method.

Weights are `floor(w * 2^24 + 1/2)` of the float32 values, read by their bit patterns (`tools/quantize.py`, a
restricted unpickler that needs no torch and refuses any checkpoint whose sha256, keys, shapes or module tree differ).
The sigmoid is written for this stack, not upstream. Its first step is the range-reduced integer series of
`model/l0-edge/src/model.rs` (`exp_neg`, `sigmoid_q24`; private there, so repeated here rather than reached through a
dependency). That series is within 12 units of `2^-62` of `e^-|t|` (at most 18 terms, each rounded to half a unit, and
`LN2_Q62` off by less than `3464/2^16` of a unit per octave: `LN2_Q62 - 2^62 ln 2` lies between `3463/2^16` and
`3464/2^16`, from the integer bounds of `tools/int_referee.py`; every error measured, over 252,154 inputs that include
each octave boundary, is below 4 units), so its quotient is within `2^-34` of `2^24 sigmoid(t)`. When the quotient
lies within `2^-32` of a half, `sigmoid_q24` decides the side exactly from lower and upper sums of the series of
`e^|t|`, at 128 bits and doubling until the sums decide, so it returns `floor(2^24 sigmoid(t) + 1/2)` for every logit.
The series step alone (as `model/l0-edge/src/model.rs` has it at commit `f67b300`, and as this crate had it before
the exact step) gives a value 1 away from that on 20 of the 736 boundary rows below; for example, logit_q48
`-2903085619798773`, where `2^24 sigmoid` is `556 + 1/2 + 31891840/2^64` (floor at Q64), gives 556.
`tools/int_referee.py` checks the sigmoid against the exact value on 2447 logits: 1711 over `[-20, 20]` and 736 whose
exact value lies within `2^-32` of a half (Q48 logits next to `ln((k + 1/2) / (2^24 - k - 1/2))`, on the integer
lattice and on multiples of 10, both signs). It computes in integers only: lower and upper bounds of `2^p e^|t|` from
the Taylor series with range halving (floor and ceiling of each term, a bound on the tail, then squarings), at a
precision `p` that starts at 128 bits and doubles until both bounds give the same `floor(2^24 sigmoid + 1/2)` and the
same side of the `2^-32` window; `ln` (for the boundary logits and `LN2_Q62`) comes the same way from bounds of
`m ln 2 + 2 atanh((c - d) / (c + d))`. Its rows are the ones the earlier version (Python decimal at 60 digits) wrote:
all 2,592 data rows of `tests/fixtures/expected-int.hbp` are unchanged, and only its third header line, which names
the method, changed. `pair_output(s, t)` is
`edge_outputs(&[s, t], &[(0, 1)])[0]`; because the encoder does not read `edge_index`, every edge's output equals the
`pair_output` of its two nodes (tested). For any `i64` inputs no intermediate exceeds i128 (bound test over the
generated weights).

## Measured agreement

Fixtures: 48 two-node graphs and 96 graphs of 2-9 nodes with self loops and duplicate edges, 816 edges; inputs in
the ranges of the six-feature scaling (train_baseline.py:31-38) and, in every fourth case, signed values up to
`2^40` (Q24). Every input has at most 24 significant bits, so torch receives it exactly; the harness sends each
as its float32 bit pattern.

| Comparison | Result |
|---|---|
| Rust vs `tools/int_referee.py` (Python integers) | equal on every value: 96 node encodings x 64, 48 edge embeddings x 64, 1632 logits, 816 probabilities |
| Rust sigmoid vs the exact value | equal on all 2447 rows, including the 736 within `2^-32` of a half |
| Rust vs torch, node encodings `h` (Q24 units) | max 1 in the cases with inputs below `2^31`; max 46 in the cases with inputs up to `2^40` (Q24 weight rounding times the input magnitude) |
| Rust vs torch, edge embeddings `e` | max 1 |
| Rust vs torch, logits (rounded to Q24) | max 32 for `l0`, which lies between -12 and -11 on every fixture edge (float32 spacing `2^-20` there, 16 Q24 units); max 8 for `l1`, which lies between -2 and -1 (spacing `2^-23`, 2 Q24 units) |
| Rust vs torch, probability | max 1 |

The torch side of this table comes from `tests/fixtures/expected-model.hbp`, which `tools/model_parity.py --check`
compares byte for byte, and torch's float32 results depend on the CPU kernels it selects. As
model/l0-edge/tools/model_parity.py does, the tool sets `ATEN_CPU_CAPABILITY=default`, `MKL_CBWR=COMPATIBLE`,
`OMP_NUM_THREADS=1` and `MKL_NUM_THREADS=1` before torch loads (ATen's scalar kernels, oneMKL's SSE2-only Conditional
Numerical Reproducibility code path, one thread), and the file's header names them. On the x86-64 AVX-512 host that
wrote the file (torch 2.14.1+cpu, torch_geometric 2.8.1, Python 3.13.16), `--check` passes with the caller's
environment unset or set to `MKL_ENABLE_INSTRUCTIONS=AVX2` (with and without `ATEN_CPU_CAPABILITY=default`),
`ATEN_CPU_CAPABILITY=default`, `MKL_ENABLE_INSTRUCTIONS=SSE4_2` or `AVX512`, `ATEN_CPU_CAPABILITY=avx2` or `avx512`,
`MKL_CBWR=AVX2`, or `OMP_NUM_THREADS=4 MKL_NUM_THREADS=3` (20 runs: these 10 environments in two separate torch
2.14.1+cpu environments). Before the pin, the committed file (written with torch's default selection) passed
`--check` with the caller's environment unset or set to `ATEN_CPU_CAPABILITY=default`, and failed with
`MKL_ENABLE_INSTRUCTIONS=AVX2`, with or without `ATEN_CPU_CAPABILITY=default` (`first_diff_line=19`, the `PAIR` row of
case 11). The pinned file differs from that one in 5 of its 6,144 `h_q24` values, each by 1 Q24 unit, in the `PAIR`
rows of cases 11 (2 values), 27, 35 and 43 (1 each), all cases with inputs up to `2^40`, and in 3 header lines (the
kernels, and that inputs and outputs pass as float32 bit patterns); every `e_q24`, `logits_q24`, `p_bits` and `p_q24`
value and the `LAYOUT` and `VARIANT` rows are unchanged. The same tool with the pin line removed (a scratch copy, not
committed) reproduces every data row of the earlier file with the caller's environment unset or set to
`ATEN_CPU_CAPABILITY=default`; with `MKL_ENABLE_INSTRUCTIONS=AVX2` it differs from the pinned file in 2 `h_q24` values
(cases 27 and 43, by 1 each) and from the earlier file in 3 (case 11 twice and case 35, by 1 each). It has not been run
on an AMD CPU or a non-x86-64 CPU here.

What the trained weights compute on these inputs (measured): `forward` gives `16776797 / 2^24` (Rust; `2^24` times
the exact sigmoid of the integer logits lies between `16776796 + 44629/2^16` and `16776796 + 44637/2^16`, Q16 floors
44629 at the smallest `l1 - l0` and 44636 at the largest) on all 816 edges, and torch gives the float32 `0x3f7ffe5c`,
exactly `16776796 / 2^24`, on all 816. The logit difference `l1 - l0` takes 13 distinct values over the 816 edges, all
in `[2982755245111350, 2982755318164950] / 2^48` (Q48; a span of 73,053,600 Q48 units), and across the 48 pair
embeddings each component varies by at most one Q24 unit. The weight scales account for it. In Q24 units of the
generated weights, the largest row sums of `|w|` are 19,677 (`conv1.lin.weight`), 32,610 (`conv2.lin.weight`),
207,493 (`edge_projection.0.weight`) and 20,771 (`edge_projection.2.weight`), while `edge_projection.2.bias` reaches
3,696,391 (its smallest entry is -3,380,083).

That value holds up to an input magnitude. The test `forward_by_input_magnitude_on_two_node_graphs`
(`tests/model.rs`) draws 300 two-node graphs per bound, all 12 Q24 features uniform in `[-2^k, 2^k)`, from a fixed
seed. `forward` gives only `16776797` at every bound up to `2^54` in Q24 (`2^30` in real units; 12 bounds, 3,600
graphs). Above that it varies: 2 values below `2^55`, 3 below `2^56`, 11 below `2^58`, 37 below `2^60`, 112 below
`2^62` (up to `16776947`) and 159 over the whole `i64` range (`16776797..16777028`).

Upstream's own note on the corpus behind these checkpoints, fnns `README.md:59-63` (blob
`46e1aeb952251c4b229538a53db8adc95d0db4fb`), directly under the table row that lists L1 (line 55):

```
- **Class-imbalance caveat:** the training corpus is approximately **99.99% positive**
  (315,209 suspicious / 315,249 total — only 40 benign nodes). A near-trivial all-positive predictor
  scores about 0.999, so the headline accuracy/recall/F1 are imbalance-inflated. Treat them as an
  upper bound on a skewed split, not a calibrated scorer baseline. A real comparison needs balanced
  data and per-class precision/AUC/MCC.
```

The run-1 manifest prints the same metrics for L1 and L2 (upstream's values: `acc` 0.9992, `prec` 0.9992, `recall`
1.0, `f1` 0.9996). For
L2, bigpickle `tests/unit/gnn-l1-l2-status.test.mjs:94-98`:

```
  it("L2 stays BENCHED until spread-verified (same degenerate-corpus caveat as L4)", { skip: SKIP_MISSING_SIDECAR }, () => {
    // Trained to ~99.92% on the 40-benign-vs-315k-suspicious corpus — the same
    // imbalance that left L4 a dead constant 0.5292. Present but NOT trusted as a
    // voter until a class-weighted retrain passes spread std > 0.01. The inference
    // server (:4796) is intentionally NOT wired until that spread check passes.
```

## Scalars upstream code derived from this model's output

`forward` returns one value per edge for two classes: prototype_gnn.py:128-131,

```python
probs = F.softmax(logits, dim=-1)
if self.num_classes == 2:
    return probs[:, 1]  # Return anomaly probability
```

Every scalar any upstream code on disk derives from a PrototypeGNN output:

- behcs-256 `src/gnn/hybrid-harness.js:32-33` (blob `14863cbf4d375c608172b01f97bb4d9396f44f5e`), the `prototype`
  scorer slot of a five-scorer mean: `const [o, r, g, c, p] = await Promise.all([omni(id), reverse(id), gsl(id), contrastive(id), prototype(id)]);`
  `const lcr = (o + r + g + c + p) / 5;`. The scorer is a parameter, "(agent_id) => Promise<score in [0,1]>" with a
  default of `h[0] / 255` of a sha256 (lines 19-23, 28); no caller of `runFanout` or `runShard` is on disk.
- `AI-healthCare-project` @ `e0048c0a` (the model's origin; `MODEL_TYPE` `"prototype"` builds it at
  `backend/anomaly_detector/service.py:41-49`, blob `a6454ddb93e8edd3edba37043c42baeb125ae700`). That service is
  configured with `MODEL_INPUT_DIM: int = 16`, `MODEL_HIDDEN_DIM: int = 32` and
  `NUM_CLASSES: int = int(os.getenv("NUM_CLASSES", "4"))` (`config.py:21-24`, blob
  `a0d670156b7615888ca0e0340e9bc9d350318a9a`), and its checkpoint loading is commented out (`service.py:104-107`),
  so it never ran these run-1 weights. With the default of 4 classes, `forward` returns the `[num_edges, 4]`
  probabilities (prototype_gnn.py:130-132), which `service.py:198-206` routes to its multi-class branch.
  - `api.py` (blob `f6b7e68934151ac172ffecf178b9dac7b6556fbc`) takes `scores = model(x, edge_index)` (line 50) and,
    per event, `score = scores_list[i]` (line 64): `is_anomaly = score > settings.ANOMALY_THRESHOLD` (line 65) with
    `ANOMALY_THRESHOLD: float = os.getenv("ANOMALY_THRESHOLD", 0.8)` (`config.py:34`);
    `explanation = f"{model_name} GNN score: {score:.4f}"` (line 69); `"model_confidence": 1.0 - abs(score - 0.5) * 2`
    (line 85).
  - `service.py`, multi-class branch (the default): `anomaly_prob = sum(class_probs[j] for j in range(1, len(class_probs)))`
    (line 250), `if class_info['is_anomaly'] and anomaly_prob > threshold:` (252), `confidence = class_probs[pred_class]`
    (254). Binary branch (`num_classes == 2`): `if score <= threshold:` (260; default `threshold: float = 0.5`, 141),
    `confidence = score`, `class_probs = [1.0 - score, score]` (263-264). Both branches:
    `'severity': 'high' if confidence > 0.8 else 'medium' if confidence > 0.6 else 'low'` (287), and
    `_explain_anomaly` receives `confidence` as `score` (271-272) and sets
    `explanation['confidence_level'] = 'high' if score > 0.8 else 'medium' if score > 0.6 else 'low'` (702).
  - `backend/patient_analyzer.py:258-283` (blob `eb5a0dbe3c2f74d4b575dc85a1f206b7a563fe48`) calls
    `detect_clinical_anomalies` with `threshold=0.5` and turns each anomaly whose `severity` is `"high"` into
    an alert that quotes `anomaly_score` with `:.2f`.
- bigpickle-rebuild @ `c592599c`, `src/asolaria-score.mjs:156` (blob `b101c0989de3af0ca41db0eac1293c758d7e5296`), has
  no L1 entry: `const WEIGHTS = { l0: 0.30, l4: 0.15, g1: 0.10, g2: 0.10, g3: 0.10, shannon: 0.15, baseline: 0.10 };`.
  bigpickle `src/fabric-thinker-gnn.mjs:223` only lists the name: `cascade_layers: ['L0_EdgeLevel', 'L1_Contrastive', 'L2_Prototype', 'L4_GSLGNN']`.

No composite weight is set here; the owner states it (OWNER-RULES 7b).

## Not on disk

Resolved since by the gnn-sidecar cube `9859b576` (verified 32/32, docs/handoffs): the cube located
`prototype_inference_server.py` (sha256 `c4a36e8a…`) and the prototype trainer `train_prototype.py`
(sha256 `25969b29…`) on ACER in `C:/Users/acer/Asolaria/services/gnn-sidecar/`, bodies pending
transfer. The first two rows below are therefore found on ACER, not missing — only their bodies are
not yet on this container. The table is the pre-cube search record.

| Missing | Where it should be, with evidence | Searched |
|---|---|---|
| `prototype_inference_server.py` (:4795) | `C:/Users/acer/Asolaria/services/gnn-sidecar/` per bigpickle `tests/unit/gnn-l1-l2-status.test.mjs:7-8, 20, 48-77` ("inference server written at prototype_inference_server.py (:4795)", `PORT = 4795`); the private mirror's `federation-remake-1024/servers/host8-serve/intake/ACER-DAEMON-SUPERVISOR-REGISTRATION.hbp:34` (branch `acer/daemon-supervisor-registration-2026-06-18` @ `15848d60`, blob `5801b6b8`) registers `name=gnn-sidecar-L1-prototype ... port=4795 ... status=DARK ... path=C:/Users/acer/Asolaria/services/gnn-sidecar/prototype_inference_server.py` | behcs-256, bigpickle-rebuild, Shannon-and-the-gnns-stage, fnns, federation-1024, every repository under `/home/user`, every ref and the full history of the private mirror, GitHub code search `prototype_inference_server user:JesseBrown1980` (0 results) |
| The L1 trainer | Same sidecar directory (the status test names `train_contrastive.py` for L2 at lines 106-117 and 129-131; no L1 trainer name appears anywhere) | as above, plus `train_prototype` |
| L1 training corpus file and input features | The run-1 manifest names no corpus. fnns `README.md:59-61`, the note under the checkpoint table that lists L1, gives the training corpus as "315,209 suspicious / 315,249 total — only 40 benign nodes", without naming the L1 trainer, the corpus file or the features. The status test gives the L2 trainer's corpus as `gslgnn_w9_3_corpus.json` (line 133), whose node features `train_gslgnn_w9_3.py:225-233` builds with the six-feature scaling of `train_baseline.py:31-38` | as above |

## Referees

| Tool | Lane | Checks |
|---|---|---|
| `tools/quantize.py [--check]` | stdlib, integers only | `src/weights.rs` from the pinned checkpoint, without torch: each float32 weight read by its bit pattern |
| `tools/int_referee.py [--check]` | stdlib, integers only | `tests/fixtures/expected-int.hbp`: the integer forward and the exact sigmoid, line by line against prototype_gnn.py |
| `tools/model_parity.py [--check]` | torch 2.14.1+cpu, torch_geometric 2.8.1, kernels pinned; float only inside torch, read by bit pattern | `tests/fixtures/expected-model.hbp`: the vendored class with its fallback `GCNConv` and the checkpoint, plus the `LAYOUT` rows and the `VARIANT` row |
| `tools/model_parity.py --sweep` | as `--check` | prints `SWEEP` rows: fallback against rekeyed `forward` by input scale, the numbers quoted in [Which forward is ported](#which-forward-is-ported-and-why); writes nothing |
