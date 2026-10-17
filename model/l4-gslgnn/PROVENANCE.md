# Provenance: asolaria-l4-gslgnn

This crate ports the trained L4 GSLGNN that the Asolaria sidecar serves on port 4793, with its served
checkpoint `gslgnn_w9_3_seq47_v2.pt`, and the request asolaria-score sends it, into integer-only Rust.
This file records where every upstream byte came from, which forward is ported and why, how the
parity harness runs the upstream server code, and the measured agreement and outputs.

## Lanes

| Lane | What runs there | Here |
|---|---|---|
| Hot (per request, in process) | Rust only, integers only: SHA-256 of the request strings, the input conversion, the forward, `toFixed(4)`. No Python, torch, Node, JSON or HTTP. | `src/` |
| Cold (verification, CI only) | Stdlib Python referees, and torch + torch_geometric for the parity harness. | `tools/` |

The vendored Python files are imported only by the cold-lane parity harness. Nothing in the hot lane
reads the vendored checkpoint; `src/weights.rs` is generated from it without torch.

## Vendored upstream files

Every file under `vendor/` is byte-identical to its upstream. `git hash-object <file>` gives the
blob id below, and CI runs `sha256sum -c UPSTREAM.sha256`.

| Vendored path | Upstream repository @ commit | Upstream path | Git blob | sha256 |
|---|---|---|---|---|
| `vendor/fnns/src/gslgnn_inference_server.py` | `JesseBrown1980/Asolaria-fnns-trained-and-reverse-gnns-many` @ `c4b2458c88358c46155d3b308c594f9991720847` | `src/gslgnn_inference_server.py` | `b31236d28cb0a5145e718c54334bb577b5f5c23f` | `8ac31eff0320a3bc0eb9a3c95ed8c271d93c5fbce907230ed2e76a390a01fc88` |
| `vendor/fnns/models/gslgnn_w9_3_seq47_v2.pt` | `JesseBrown1980/Asolaria-fnns-trained-and-reverse-gnns-many` @ `c4b2458c88358c46155d3b308c594f9991720847` | `models/gslgnn_w9_3_seq47_v2.pt` | `e3a9712b50f8e7b31590b0aa944e6a9ba6ea565b` | `9e50723b10c9de5c27baa5bc9386340bf72f76bcae2877064a47e4627a86602c` |
| `vendor/gnn-sidecar/models/gsl_gnn.py` | `JesseBrown1980/asolaria-behcs-256` @ `818cc235a6db815e3b2591339cf9b42aad3e85a0` | `services/gnn-sidecar/models/gsl_gnn.py` | `886b3b0c0cdbddba983fa8c3ae083c4520d38f0e` | `783b9b50d92ed8756270b87f5922d66a19972bfd51c1bc0d5ca0d5a483d22475` |
| `vendor/gnn-sidecar/models/__init__.py` | `JesseBrown1980/asolaria-behcs-256` @ `818cc235a6db815e3b2591339cf9b42aad3e85a0` | `services/gnn-sidecar/models/__init__.py` | `0ef9b432c6bbda74623a3bdfcdb1e22b75501c05` | `51b739fbc5851e391b90a917ee92062a97003f9428ec2167c49c7a76ff86bbc5` |

The same `gsl_gnn.py` bytes (blob `886b3b0c`) are also at Asolaria-fnns @ `c4b2458c` `src/gsl_gnn.py`.

All four files were read in full before copying. The server holds code, comments naming the fabric
ruling and the `acer-micro` voter, and its response fields; `gsl_gnn.py` holds code and docstrings;
`__init__.py` is one comment line; the checkpoint's `data.pkl` holds only the 19 state-dict keys, the
23 module paths, `cpu` and the storage records, and its other entries are float32 tensor bytes, format
markers and a numeric serialization id. None holds personal data.

### Pinned, not vendored

| Upstream | Size | Git blob | sha256 |
|---|---|---|---|
| Asolaria-fnns @ `c4b2458c` `models/gslgnn_w9_3_seq47.pt` (v1, not served) | 120,356 | `6cddadc91ff4e6fa2bbfc315d90fa1bab0117c6b` | `6f82384ff2e313b1f34b48cca5c1c2bb3a8f9391bba54db7afbb36c5fda91ad5` |
| Asolaria-fnns @ `c4b2458c` `manifests/gslgnn_w9_3_seq47_v2_manifest.json` | 1,520 | `f1eb3675ab5e8822d1511ce4b3062d51ee50b2dd` | `65324379834efad6f13780bf9f3f45b37f17fd4e61117367b13931116da81019` |
| Asolaria-fnns @ `c4b2458c` `manifests/gslgnn_w9_3_seq47_manifest.json` | 1,479 | `34251205696e0fb71097e21b0d7925881e975b95` | `cff92f439044267987a8addd1c94f3d8b0fc96e6380769f20f015e197477074b` |
| Asolaria-fnns @ `c4b2458c` `src/train_gslgnn_w9_3.py` (the trainer) | 358 lines | `c964b9e25b09d757a9cd3876e50d59ea55bb5a0a` | `af694c1f6d3ea13b0b64f8763d2605f679b2d542ee9892135d5dbb41ce4fcef9` |
| `JesseBrown1980/Shannon-and-the-gnns-stage` @ `32f9670a648dbbd02d64524e91150efeec8e4d2c` `pipeline/asolaria-score.mjs` (180 lines) | | `b101c0989de3af0ca41db0eac1293c758d7e5296` | `aee9c38328e75bc71f6e17a288637ddd1dbc4633576006dce9bc50c898093530` |

`asolaria-score.mjs` is vendored byte-identical in `model/l0-edge/vendor/pipeline/`; the line numbers
cited below are of that blob.

## What is ported and what is only vendored

| Upstream | Ported to | Notes |
|---|---|---|
| `gslgnn_w9_3_seq47_v2.pt` (float32 state dict, 19 tensors, 28,259 values) | `src/weights.rs` | `floor(w * 2^24 + 1/2)` per weight, written by `tools/quantize.py` without torch; the tool refuses any key list or `_metadata` module-path list other than the torch_geometric class's. |
| `GSLGNN.forward` (gsl_gnn.py:171-220) in eval mode, `num_classes=2`, as gslgnn_inference_server.py:21-36 builds it and line 54 calls it | `src/model.rs` `edge_scores` | See [Which forward is ported](#which-forward-is-ported-and-why). |
| `GraphStructureLearner.forward` (gsl_gnn.py:50-94), `encode_with_learned_graph`, `encode_with_original_graph`, `get_edge_embeddings` (lines 137-169) | `src/model.rs` | Called by the forward. |
| The L4 request of asolaria-score.mjs:112-113, 127 (`nodes` `[node(sha16(pid)), node(sha16(content))]`, `edges` `[[0, 1]]`) and lines 78, 128 (`scores[0]`, `+l4.toFixed(4)`) | `src/lib.rs` `request_nodes`, `score_request`, `byte_input_q24`; `src/model.rs` `q24_to_e4` | The input path of the :4793 call, below. |

Vendored only, not ported:

- The HTTP handler of the server (lines 39-73): the port runs the model in process.
- The fallback `GCNConv`, `to_dense_adj` and `dense_to_sparse` of gsl_gnn.py:20-32 (taken only when
  `torch_geometric` does not import); the checkpoint is saved in the torch_geometric layout.
- `return_weights=True`, `get_learned_graph` and `get_edge_importance` (gsl_gnn.py:218-240): the
  server never calls them.

## Which forward is ported, and why

asolaria-score reads its L4 signal from `POST :4793/infer` (asolaria-score.mjs:125-129, through the
`l0Infer` function of lines 73-83 with `port: 4793`). That port is served by
`gslgnn_inference_server.py`: it builds `MODEL = GSLGNN(node_input_dim=6, hidden_dim=64)`, loads the
v2 checkpoint, remaps keys between `.lin.bias` and `.bias` where the model lacks one, loads the
result (strict) and calls `eval()` (lines 21-36). The ported forward is that object's.

- **torch_geometric branch.** gsl_gnn.py:17-19 import `GCNConv`, `to_dense_adj` and
  `dense_to_sparse` from torch_geometric; only on ImportError (lines 20-32) does it define a
  `GCNConv` that is one `nn.Linear` ignoring `edge_index` and a `to_dense_adj` returning zeros. The
  checkpoint's keys (`conv*.bias`, `conv*.lin.weight`, no `conv*.lin.bias`) and module paths (an
  `aggr_module` per conv) are the torch_geometric layout, so the served forward is the
  torch_geometric branch under torch_geometric 2.8.1. The parity harness asserts that all four
  convs of the served `MODEL` are `torch_geometric.nn.conv.gcn_conv.GCNConv`, so it never compares
  against the fallback.
- **Key remap.** For this checkpoint every key is already in the model, so lines 26-34 rename
  nothing; the harness asserts this (`renamed_keys=0` in the `LAYOUT` row).
- **Request.** The server reads only `nodes` and `edges` (line 46); asolaria-score.mjs:75 also sends
  `edge_features` (`edgeFeat`, line 114), which the L4 forward never sees. `nodes` arrive as JavaScript
  doubles `byte / 255` (line 113) and become float32 at server line 51.

The forward, per request graph of `n` nodes:

1. **Learned adjacency** (gsl_gnn.py:63-91). `keys = key_transform(x)`, `queries = query_transform(x)`
   (`Linear(6, 32)` each); `attention = sigmoid(queries @ keys.T / sqrt(32))`, where torch divides by
   the float32 of the Python scalar `32 ** 0.5`, 11863283 * 2^-21 (measured: 200,000 of 200,000
   quotients equal division by that value); `mask = attention > sigmoid(threshold)`;
   `combined = 0.5 * to_dense_adj(edge_index, max_num_nodes=n)[0] + 0.5 * attention * mask`.
   torch_geometric's `to_dense_adj` (utils/_to_dense_adj.py:89-97) sums duplicate edges and keeps
   self-loop edges.
2. **Self loops and row normalisation** (lines 190-195): `+ I`, then each row divided by its sum
   (`clamp(min=1)` never applies: every row sum is at least 1).
3. **Learned branch** (lines 137-154): `adj @ x`, `conv1.lin`, ReLU, `adj @ h`, `conv2.lin`. In
   torch_geometric's `GCNConv`, `lin` is `Linear(bias=False)` and the bias is the conv's own
   parameter, so this branch applies no bias; `conv1.bias` and `conv2.bias` (all zero in the
   checkpoint) are not read.
4. **Original branch** (lines 156-163): torch_geometric 2.8.1 `GCNConv` twice with ReLU between
   (gcn_conv.py:99-113 `gcn_norm`: existing self loops dropped and one added per node with weight 1,
   duplicates kept, degree at the target; lines 227-268: `lin`, propagation source to target, bias).
5. **Edge head** (lines 165-169, 204-214): per edge `(row, col)`,
   `edge_classifier(cat(h_learned[row], h_learned[col], h_original[row], h_original[col]))` =
   `Linear(256, 64)`, ReLU, `Dropout` (off in eval), `Linear(64, 32)`, ReLU, `Linear(32, 2)`; then
   `softmax(dim=-1)[:, 1]`.

Integer arithmetic: Q24 values with i128 accumulation and one round-half-up per layer output.
Adjacency entries are held in Q25, so `0.5 * count` and `0.5 * attention` are exact;
the two row-normalised products are computed as exact weighted means, each rounded once. The
attention score `q . k` stays in exact Q48 and is divided by 11863283 * 2^-21 with one rounding; the
sigmoid is the fixed-point sigmoid equal to a 60-digit decimal reference (1,811 rows). The mask
compares the attention and `sigmoid(threshold)` each rounded to Q24; in [0.5, 1), where
`sigmoid(threshold)` = 0.62246 lies, float32 values are exactly the Q24 grid, and
`sigmoid_q24(0.5)` = 10443135 is torch's float32 result 0x3f1f597f. For two classes
`softmax(logits)[1]` is the sigmoid of the exact Q48 difference `logits[1] - logits[0]`. The original
branch uses the normalisation coefficients `round(2^32 / sqrt(d_s * d_t))` of `model/l0-edge`.

Domain: `edge_scores` returns an error for no nodes or no edges (the server answers 400 for no edges,
lines 49-50), an edge index `>= n` (torch raises), a feature beyond `MAX_INPUT_Q24` = 2^40 (65536.0),
or more than 2^20 nodes or edges; within these bounds a unit test shows no intermediate can overflow
i128. The request path is always inside them.

## The input path of the :4793 call

`model/l0-edge` builds its L0 inputs from observed graph events (`observe_pair`: `extract_node_features`
then the train_baseline.py scaling `[min(vol/100, 1), avgRisk/9, maxRisk/9, failureRate, online,
trustTier/3]`). That is not the input upstream sends to :4793. asolaria-score.mjs sends, for both :4792
(line 121) and :4793 (line 127), `nodes = [node(ph), node(ch)]` with `ph = sha16(pid)`,
`ch = sha16(content)` (line 112), `sha16(s)` the first 16 hex digits of SHA-256 of `String(s)` (line 25),
and `node(h)[i] = parseInt(h.slice(2i, 2i + 2), 16) / 255` for `i` in 0..6 (line 113). This crate ports
that path: `request_nodes(pid, content)` takes the first six bytes of SHA-256 of each UTF-8 string and
converts each byte to the Q24 value of `float32(binary64(byte / 255))` (`byte_input_q24`, equal to the
stdlib referee on all 256 bytes). `score_request` runs the forward on edge `(0, 1)` and returns
`scores[0]` in Q24 and `+scores[0].toFixed(4)` in e4 units, rounding half up on the exact Q24 value.
So aether's L0 lane (event features) and this L4 lane (request hashes) use different input
derivations; upstream used the hash derivation for both calls.

## Staging the server for the parity harness

At `c4b2458c`, `src/gslgnn_inference_server.py` cannot import where it sits: line 15 puts its own
directory on `sys.path` and line 16 runs `from models.gsl_gnn import GSLGNN`, which resolves to
`src/models/gsl_gnn.py`; that file is not in the repository (`gsl_gnn.py` is at `src/gsl_gnn.py`).
Line 18 loads `Path(__file__).with_name("gslgnn_w9_3_seq47_v2.pt")`, i.e. `src/gslgnn_w9_3_seq47_v2.pt`;
the checkpoint is at `models/`. Executed on a throwaway copy of that layout (`python -I -B`): the import
stops with `ModuleNotFoundError: No module named 'models'`, and with `src/models/` added, with
`FileNotFoundError` for `src/gslgnn_w9_3_seq47_v2.pt`. The v2 manifest records where it ran:
`"checkpoint_path": "C:\\Users\\acer\\Asolaria\\services\\gnn-sidecar\\gslgnn_w9_3_seq47_v2.pt"` and
`"model_class": "services/gnn-sidecar/models/gsl_gnn.py::GSLGNN"`, the layout of behcs-256
`services/gnn-sidecar/` (which holds `models/__init__.py` and `models/gsl_gnn.py` but no
`gslgnn_inference_server.py`).

The private mirror `asolaria-mirror.git` (read only, nothing copied from it) holds that layout at
commit `7991d355666e6e4cd2c7c51143cedfccabe95083` (2026-04-30) `services/gnn-sidecar/`: a
`gslgnn_inference_server.py` (blob `e5052afa179ec69535519e433a4de7bb954c7f4e`, 62 lines) beside
`models/__init__.py` and `models/gsl_gnn.py` (the vendored blobs `0ef9b432`, `886b3b0c`), the
checkpoint as `gslgnn-trained-2026-04-29.pt` (blob `e3a9712b`, the vendored v2 bytes) and the v2
manifest as `gslgnn-v2-manifest.json` (blob `f1eb3675`). That server version imports
`models.gsl_gnn` from its own directory, builds `GSLGNN(node_input_dim=6, hidden_dim=64)`, loads the
checkpoint without a key remap (strict), calls `eval()`, and requires `edges[*]` of length 2; its
response fields differ. Staged the same way and compared in the cold lane (`python -I -B`, the
pinned kernels): its `MODEL` has the same state dict as the vendored server's, both use
torch_geometric's `GCNConv`, and probs[:, 1] is bit-identical on all 205 `GRAPH` and `BOUNDARY`
rows of `tests/fixtures/expected-model.hbp`. The port therefore matches both server versions.

`tools/model_parity.py` copies the four vendored files, after checking their sha256, into
one temporary directory in that layout (server, `models/__init__.py`, `models/gsl_gnn.py`, and the
checkpoint beside the server) and imports the server module there, so its lines 13-36 run unchanged
and its `MODEL` is the object compared. This staging is a cold-lane arrangement; no upstream file is
changed. The harness sets `sys.dont_write_bytecode` before any import, so no `__pycache__` is written
beside staged or vendored sources. It does not run the HTTP handler: per graph it mirrors lines 51-54
(`torch.tensor(nodes, dtype=torch.float32)`, `torch.tensor(edges, dtype=torch.long).t().contiguous()`,
`MODEL(x, edge_index)` under `no_grad`), and per request asolaria-score.mjs:112-113, 127-128.

The harness pins `ATEN_CPU_CAPABILITY=avx2` and `MKL_ENABLE_INSTRUCTIONS=AVX2` before importing torch
and runs one thread. Measured on an AVX-512 host: without the pin, the `BOUNDARY` rows move with the
MKL instruction set (the float32 crossing of the mask shifts), and under `ATEN_CPU_CAPABILITY=default`
16 values change by 1 Q24 unit (7 `GRAPH`, 1 `REQUEST`, 8 `BOUNDARY`); with the pin, `--check` passes under any of
`ATEN_CPU_CAPABILITY=avx512|default`, `MKL_ENABLE_INSTRUCTIONS=AVX512` and `OMP_NUM_THREADS=4`, and in
both torch environments on this host (`scratchpad/torchvenv`, `scratchpad/ci-torch-venv`; torch
2.14.1+cpu, torch_geometric 2.8.1, Python 3.13.16).

## Measured agreement

| Check | Cases | Result |
|---|---|---|
| Rust `edge_scores` vs the served `MODEL` (`tests/model.rs`) | 393 edges of 125 graphs (5 fixed, 120 seeded) | max \|rust - torch\| = 1 Q24 unit; 306 of 393 equal; the test allows 16 |
| Rust attention mask vs torch's `attention > sigmoid(threshold)` (`src/model.rs` unit test) | 3,616 entries of the 125 graphs (598 set) | all equal |
| Rust `score_request` vs the mirrored request (`tests/model.rs`) | 64 pid/content pairs (incl. empty strings, non-ASCII UTF-8) | `request_nodes` equal on all; max \|rust - torch\| = 1 Q24 unit; `toFixed(4)` equal on all 64 (all `5292`); no mask entry set, in torch or here |
| `BOUNDARY` rows: 16 inputs around each of 5 float32 crossings of the mask entry (0, 1) | 80 inputs | the mask here differs from torch's at 12 (from 1 step before to 4 steps after torch's crossing); every score within 9 Q24 units |
| Fixed-point sigmoid vs Python `decimal` at 60 digits | 1,811 logits | all equal |
| `byte_input_q24` vs `struct` float32 of `byte / 255` | 256 bytes | all equal |
| `weights.rs` vs `tools/quantize.py --check` | 28,259 weights, 23 module paths | equal |

Fresh-seed re-runs (`tools/model_parity.py --seed N --out FILE`, then
`cargo run --example parity -- FILE`), not committed:

| Seed | GRAPH edges, max diff | REQUEST, max diff, toFixed(4) | BOUNDARY rows, max diff |
|---|---|---|---|
| `0x1234567` | 372, 1 | 64, 1, all equal | 176, 6 |
| `0xC0FFEE` | 377, 1 | 64, 1, all equal | 192, 10 |
| `0x4793` | 353, 1 | 64, 1, all equal | 176, 5 |

Search for inputs where the port and torch disagree: 600 seeded searches with the harness's
`boundary_rows` (one feature of node 1 swept over float32 values in [0.5, 8] with the other features
in [-2, 2]) found 235 crossings; at the 12 float32 inputs around each (steps -6 to +5 from torch's
crossing; 2,820 inputs) the mask here differs from torch's at 512, at steps -6 to +5, both ends of that
sampled window. The score differs by at most 1 Q24 unit where the masks agree and by at most 13 Q24
units (7.7e-7) where they differ. That search's seed is not recorded; its 2,820 rows were re-run: torch
reproduces every row byte for byte and the port gives the same counts. A second search with a wider
window (seed `0x51F15E`, 600 searches, the 64 float32 inputs around each crossing, steps -32 to +31)
found 256 crossings (16,384 inputs); the mask here differs from torch's at 514, at steps -6 to +12; the
score differs by at most 1 Q24 unit where the masks agree and by at most 10 where they differ. Both are
cold-lane scratch measurements, not committed. The
width of the disagreement window follows from the Q24 rounding of the `key_transform` and `query_transform`
weights and from torch's float32 rounding of the scores; on request inputs (`byte / 255`) the
attention score `q . k / sqrt(32)` measured 0.004 to 0.133 over 2,000 seeded requests (a cold-lane
scratch measurement on the served `MODEL`, not committed), below the threshold 0.5, and no mask entry
was set; the 64 fixture requests assert the same in torch and here.

## Measured outputs of the served checkpoint

- Every request scored: over the 64 fixture requests, `scores[0]` is 8,877,767 to 8,877,785 Q24 units
  in torch (0.5291561 to 0.5291572) and 8,877,767 to 8,877,786 in Rust. The smallest is 103 Q24 units
  (6.1e-6) above 0.52915 (8,877,663.85 Q24 units), below which `toFixed(4)` would give `0.5291`.
  `signals.l4` is `0.5292` on every request measured.
- The fixture graphs (inputs up to 2^29 Q24 units, i.e. 32.0, masks set and unset): probs[:, 1] from
  8,877,586 to 8,878,792 Q24 units (0.5291454 to 0.5292172) in torch.
- The wiring map's probe (`universe/WIRING-MAP.md:338-349`, `universe/tools/l4_probe.py`) measured,
  for v2, 500 score requests from 0.529156 to 0.529158 (stdev 2.941e-07, one value at 4 decimals,
  0.5292) and 500 uniform inputs from 0.529156 to 0.529157 (stdev 2.726e-07); for v1, 0.000000 on both
  sets (stdev 8.388e-11 and 5.938e-11). Re-run for this crate with `python -I -B` against copies of the
  files, in both torch environments: the same eight numbers.
- Upstream's notes on this output: asolaria-score.mjs:28 "may still return degenerate 0.5292 score
  until corpus rebalancing — honest provenance tracked", and line 31 (`L4_STATUS.note`) "process alive,
  now queried alongside L0. May show dead-constant 0.5292 until corpus rebalance.", with
  `rebalance_when: 'retrain spread std > 0.01 on balanced corpus'` (line 32). The server's response
  carries `"disclosure": "label-rule-learnability not generalization; fit-for-body-tally-scoring"`
  (line 61).
- The v2 manifest: corpus 109 nodes, 315,249 edges, 40 benign and 315,209 suspicious
  (`labelRatio` 0.99987); `test_accuracy` 0.99915, `test_precision` 0.99915, `test_recall` 1.0,
  `test_f1` 0.99958, 30 epochs. The v1 manifest: 97 nodes, 13,783 edges, 13,743 benign and 40
  suspicious; `test_accuracy` 0.98066, `test_precision` 0, `test_recall` 0.0. The corpora
  (`gslgnn_w9_3_corpus.json`, sha256 `0f123581…` for v2) are not on disk, so these metrics are not
  re-measured here.
- `gsl.threshold` is 0.5 exactly (float32 0x3f000000), the value gsl_gnn.py:48 initialises; it
  reaches the forward only through the mask comparison.
- gsl_gnn.py's docstring states "Accuracy: 96.66% (+4.79% over baseline) - BEST PERFORMING MODEL",
  "ROC-AUC: 99.70%", "False Positive Rate: 1.5%" (lines 7-10). No evaluation code or log for those
  figures is on disk.

## Composite weight

asolaria-score.mjs:152, 156 give L4 the weight 0.15 among `l0 0.30, l4 0.15, g1 0.10, g2 0.10,
g3 0.10, shannon 0.15, baseline 0.10`, normalised over the signals present (lines 157-162). That
weight is already in `gate/observed/src/score.rs` (`composite_e4`, slot `l4`, 15); this crate supplies
the value for that slot as `score_request(pid, content).score_e4`. Wiring it there is the
integrator's step.

## Referees

| Tool | Needs | Writes; `--check` diffs |
|---|---|---|
| `tools/quantize.py` | stdlib | `src/weights.rs`, from the checkpoint read by a restricted unpickler (only `collections.OrderedDict`, `torch._utils._rebuild_tensor_v2`, `torch.FloatStorage`) |
| `tools/math_referee.py` | stdlib | `tests/fixtures/expected-math.hbp` (`LN2_Q62`, `SQRT32_F32`, 1,811 `SIGMOID`, 256 `BYTE` rows) |
| `tools/model_parity.py` | torch 2.14.1+cpu, torch_geometric 2.8.1 | `tests/fixtures/expected-model.hbp` (`LAYOUT`, 125 `GRAPH`, 64 `REQUEST`, 80 `BOUNDARY` rows) |

Every data file these tools write is HBP text; no JSON is read or written.
