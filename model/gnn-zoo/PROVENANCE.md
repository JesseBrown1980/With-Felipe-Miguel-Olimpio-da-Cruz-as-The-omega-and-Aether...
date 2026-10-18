# Provenance: model/gnn-zoo

This component holds ACER's item 6 regeneration deliveries of 2026-10-18: the first GNN zoo (four model
classes, their trainers and servers, 11 checkpoints), the first training export, the GNN contract, and the
corpora the zoo was trained on, with the graph-runtime events file. This file records where every byte came
from, how it is pinned, and what was measured on it. [`README.md`](README.md) has the results tables.

## Deliveries

| Delivery zip (as delivered) | Bytes | sha256 | Cube | FILE rows | merkle_sha256 | Kept here as |
|---|---|---|---|---|---|---|
| `FABLE5-REGEN-ITEM6A-FIRST-GNN-ZOO-CODE-CKPTS-2026-10-18.zip` | 973,062 | `f75cfa790ee5e3a5ca84378fdd62160bab9751f0eac592bf3e96ebce57b4a74a` | `FABLE5-REGEN-ITEM6A-FIRST-GNN-ZOO-CODE-CKPTS-2026-10-18` | 33 | `be87a86907dea45a20baeaf2878dcb07c6091180d96f905378da5ccd7192f7b6` | its 35 entries, unchanged, under `vendor/` |
| `FABLE5-REGEN-ITEM6B-GNN-ZOO-CORPORA-2026-10-18.zip` | 7,618,451 | `b8e156977c2e43c7335eae1251fffbf57cbfc25c7889b7a7e051eda5ee10b38a` | `FABLE5-REGEN-ITEM6B-GNN-ZOO-CORPORA-2026-10-18` | 6 | `ade88f15ef517a705498ae8d5e3c7aec89b260d719c3691cd75b4d089b313824` | the zip, unchanged, in `corpora/` |
| `FABLE5-REGEN-ITEM6C-GNN-EXPORT-AND-EVENTS-2026-10-18.zip` | 18,398,818 | `3344d8c5869aa48bfbd2b8ed7e591b7c34304736eb10939d8d34ca7aefb9fd2b` | `FABLE5-REGEN-ITEM6C-GNN-EXPORT-AND-EVENTS-2026-10-18` | 2 | `28a64c8836c954a58c21b810232fe1d0ccde13ce062983bf2e2b0301c0796dbd` | the zip, unchanged, in `corpora/` |

All three cubes carry `pid=8467a937cba309f7`, `owner=OP-JESSE`, `verify=sha256sum_-c_SHA256SUMS`. Their
`merkle_sha256` is the sha256 of the FILE rows' hex digests concatenated in row order (no separator); that rule
reproduces all three values, and `tools/verify_corpora.py` recomputes it. The 6C zip arrived twice (two upload
names); both copies have the sha256 above. Every zip entry was read before it was stored here.

The 6B and 6C bodies stay inside their zips because GitHub refuses files over 100 MB: the largest are
`gnn-training-export.json` (603,223,867 B) and `gnn-training-500k.json` (140,329,373 B). `tools/verify_corpora.py`
checks each zip's sha256, every entry name, the members against the cube, `SHA256SUMS` against the FILE rows,
and every body's byte count and sha256 by decompressing it as a stream; nothing is extracted.

## Vendored files

`UPSTREAM.sha256` pins all 37 files; `vendor/SHA256SUMS` (ACER's) pins the 33 FILE rows again. `git
hash-object <file>` gives the blob id.

| Path | Bytes | Git blob | sha256 |
|---|---|---|---|
| `vendor/first-training/gnn-training-export-20260315.json` | 820,693 | `c780e51e88d37137b66df0b9e7f4be92f259faad` | `adc5f9ebc4d1e63c0fe43f6858d66a6669c0866631aa33577e99fbd318f6b33b` |
| `vendor/first-training/gnnDataExport.js` | 4,813 | `f13659719cae7c240b7aea95b05bc6f152054be5` | `9956f6d71831cef86fddaccf2dd548603eed7993252b117c5f70cf7d562c613f` |
| `vendor/contract/gnn-contract-v1.json` | 3,242 | `bcbbea33b4aa47585d7792d40e74b2d20ce59a40` | `00219eececcbd1b1b7d2a139ccda4557f0cecfdd522073d2d083b9369a30b98a` |
| `vendor/gnn-patterns/baseline_model.pt` | 55,599 | `26caf5216a4df3a43250e40e1dd421180ca3c901` | `a09993369d31ca73345914812e5226b513f5fb9092f43e487a2eafc8c3b621f5` |
| `vendor/gnn-patterns/baseline_model_retrained.pre-L0-rekey-2026-05-26.pt` | 55,867 | `85895425c10771afdf4c1e1e8acfe48620f8ee39` | `d878d6eceeb5e77bd15928027b9cc516e125f4e38b1ce1283a1ba5f77fa57c9e` |
| `vendor/gnn-patterns/baseline_model_retrained.pt` | 55,623 | `193c05d9987674f3cf4b9a677fe92e6451f0b6b4` | `f7926cdd2fd517c195b5ec863f9bdf131a40f57dc43e7aabffe8b3fb7996a08c` |
| `vendor/gnn-patterns/contrastive_model.pt` | 99,137 | `a9050a98edb2f47987e40a1ccf0eeef01288377b` | `70d8d282287b386694f57c3f6604a119e27b489e0435013de9b731fcddb43876` |
| `vendor/gnn-patterns/contrastive_model.pt.bak` | 99,137 | `7d481059e279b737d1e3ffc92b88e7ab871dcc88` | `53e240240742f88e42886134725936034c665c36d8bb1dd330eb4c603b2e943d` |
| `vendor/gnn-patterns/convert_graph_events.py` | 11,836 | `d9f5e901887182ab69c73ab6adaac1cb7fd2f4ca` | `1522f0182164e6c89bbeacc64cb24ef6b97d79056812b4d9ca0f076edaeeffd9` |
| `vendor/gnn-patterns/gsl_model.pt` | 120,220 | `e563d0c692622b79ab4b0ab16213274e424c3c5f` | `d552c9b6d743c7c1744901e17883d6af614c28b28fded848bd808230f4f1b46e` |
| `vendor/gnn-patterns/gsl_model.pt.bak` | 120,156 | `51a0df434b5347ebbba6fa8f229c472f7c50299c` | `aa241f1f75c5210e7e1a23667479fa622e27f4fddf31ac65b5173cf6cd7553c8` |
| `vendor/gnn-patterns/gsl_model_archive_200k.pt` | 120,609 | `19c327f878a72a6974c73378a7f99fbb06c5c82f` | `c2c39657476951d6c65ea9d6492731fec527b2021a65e769ab3efc4970e9d2f3` |
| `vendor/gnn-patterns/gsl_model_archive_200k_shuffled.pt` | 120,834 | `022cffd5b7fe41823a4488df1165d787032b06fb` | `834204319e8b432d2e2f3863b73fb2818e78e0db029482d046e55f8140161a02` |
| `vendor/gnn-patterns/gslgnn_archive_200k_results.json` | 563 | `f9b97e9ad817420ba3ca38af2924a7f3f20a1578` | `206eb21d239bc2030864bfbe300405ef2e6f22bb64b39d1f767d6bcf472029d6` |
| `vendor/gnn-patterns/inference_server.py` | 1,501 | `a0e0be86f21fcef0f93961b486bce6b7130f906d` | `37834ada77a18fc9073fd65b6f28fba75164a90525645be4ab39448103cb3c30` |
| `vendor/gnn-patterns/inference_server_v2.py` | 9,279 | `f8a15864d39cdfea8c13c8477ad0efb0411ebad0` | `c6600b0e72a4c77420a17ecd6de1812a0e35a716f55cc937a573ac2accb9a60f` |
| `vendor/gnn-patterns/prototype_model.pt` | 73,857 | `d1b15cc5e0bdd0b62a43b1d0b7b4c00bfe6b3276` | `c820daac49b3d4834e7761acef4f2ae090c3d7697b8f2f0f86db8c3efce613bd` |
| `vendor/gnn-patterns/prototype_model.pt.bak` | 73,793 | `5c3dc66b92e7247682783a89fa9c22337aed7251` | `b5637c74f7dffbfa3a234e7e75ef31ebbab3cffb12a836bbdb69a0899fe62b55` |
| `vendor/gnn-patterns/rekey_checkpoints.py` | 1,500 | `d1b08fc07ccabfc701d22db5befb29147249d4dd` | `94a99effc1ed455a6afd27eb6afae17572baa6e5bcd236e651eca229fc95c19e` |
| `vendor/gnn-patterns/start_inference.sh` | 59 | `b93c1e7d11420abfafc7ad3132b73b5427f51980` | `48aaad3e72e4f1bf21e2e4f1f8ffd4ecb17d7f87f22b9e924409b8bd1cb14d87` |
| `vendor/gnn-patterns/train_all_models.py` | 18,838 | `09d488cd35934ffce58f1f47662ecd5c9e4025bf` | `b1232d47c04136a83287e41c2cb9a0aacefed2cb64dc2f31b65cf7d67b02f832` |
| `vendor/gnn-patterns/train_baseline.py` | 7,127 | `a0c153fc6e9c453d73d8c3fcebf0268e485604c5` | `df3dab508c39e6237ee34ccf8e9074cb83bd833bd0a51a7464e108411fbe5ee0` |
| `vendor/gnn-patterns/train_gslgnn_archive.py` | 5,792 | `7546f2b6ce56d6a2cd5f3cdcf5980cdeff1be84f` | `2fc169d5fa9c8dc59870603918d97dc8e51f1a9cbdf321f4199ef0c4fa7b983a` |
| `vendor/gnn-patterns/training_results.json` | 806 | `4a1a3b5cbdf57bdfb2d23ec7acb4eb0d3e4c437f` | `c6c2c9640ddabc4d5635aba8be950c6e3f3c3ec093352e2c31107438d70e96e5` |
| `vendor/gnn-patterns/models/contrastive_gnn.py` | 6,249 | `56329e61eb3e6ddb3ee97b46f997dd8dd8c6b39f` | `349a30c02d558734618c2d9c69384a088b84664dfcb0f798b10553ac431201fb` |
| `vendor/gnn-patterns/models/gnn_baseline.py` | 2,390 | `510f78890ec94b113f0610afbade8bafe6ca20e0` | `1dfa3343b1b1bac6e78bb8a698e360009f7966176aa68e6c8f4c110fcfb33b34` |
| `vendor/gnn-patterns/models/gsl_gnn.py` | 9,034 | `886b3b0c0cdbddba983fa8c3ae083c4520d38f0e` | `783b9b50d92ed8756270b87f5922d66a19972bfd51c1bc0d5ca0d5a483d22475` |
| `vendor/gnn-patterns/models/prototype_gnn.py` | 5,600 | `99e3087a10ee58e90c0935f5ab63b72fd3cdd07e` | `b57f630bf28bb0cf35b66caadf1d80ce7210b703afe421ce2f79318f0a13ceb7` |
| `vendor/gnn-patterns/models/schemas.py` | 1,700 | `58cda2ee94c2ab773394ff1138c3bbf817711425` | `490da322af4589a1eeca9ba361134838c65823ff2ea94dd3e8449823207e63c6` |
| `vendor/gnn-patterns/models/__init__.py` | 35 | `0ef9b432c6bbda74623a3bdfcdb1e22b75501c05` | `51b739fbc5851e391b90a917ee92062a97003f9428ec2167c49c7a76ff86bbc5` |
| `vendor/s2-ablation-refs/dispatch-seq47-all-acer-3substrate-and-seal.mjs` | 12,489 | `07d8bec31686f467993fb3e1d54933bdc73a705c` | `d058dfd4a756495d3719c1c8d3a0a70ab39864afbca3024e1c6f80f3940cb62e` |
| `vendor/s2-ablation-refs/dispatch-seq47-T1-swap-strict-band-and-vote.mjs` | 7,802 | `62eb27b6b9220e68b8a5b115e30f8d445f2a5fb6` | `6fbb1ec48c0b3ec06054b8c82bf0913fbfef21ea9ff18a76cce886ca8b8e64ff` |
| `vendor/ITEM6-STATUS.hbp` | 3,255 | `9dcf5fe524f02f9cfca61cff4eb51262be2060f6` | `5fccfc96f91002964cce6cd5b23648a16b9241eb12906e8b62960b643b995ab7` |
| `vendor/CUBE.hbp` | 4,944 | `eccfc4420c786b0c35d28de18bdfbdefbbe5112e` | `cc53b07744617b433126d29a41ee2a7fb52a71cbb07aa984d162e71784f7ce6d` |
| `vendor/SHA256SUMS` | 3,416 | `310b52d0a9f16911bbae5a4172a70369865ea47e` | `1605623d3baec38ec136fe9ef43e24b0219997c82237ec0cfca5c9a1d6e79b8d` |
| `corpora/FABLE5-REGEN-ITEM6B-GNN-ZOO-CORPORA-2026-10-18.zip` | 7,618,451 | `63a35fd33ad3b82aba08877d09d248904ce21d45` | `b8e156977c2e43c7335eae1251fffbf57cbfc25c7889b7a7e051eda5ee10b38a` |
| `corpora/FABLE5-REGEN-ITEM6C-GNN-EXPORT-AND-EVENTS-2026-10-18.zip` | 18,398,818 | `264a11873a04f16e8fab7c008c35462ac1d9159d` | `3344d8c5869aa48bfbd2b8ed7e591b7c34304736eb10939d8d34ca7aefb9fd2b` |

The bodies inside the two zips, as their cubes, `SHA256SUMS` and `vendor/ITEM6-STATUS.hbp` pin them:

| Zip entry | Bytes | sha256 |
|---|---|---|
| 6B `gnn-patterns/gnn-training-500k.json` | 140,329,373 | `d3329c0209683a693b172cdd3771b40f89871629c78f16b7f41f0e2479b00b85` |
| 6B `gnn-patterns/gnn-training-archive-200k.json` | 57,828,853 | `5e878a639ab3e4f4ef44e9014383746709adeed51d01e9d52f1ed4c17a01ac6f` |
| 6B `gnn-patterns/gnn-training-archive-50k.json` | 14,934,852 | `3c07fdf1d49b7466490e0de71aaab11e8070cc84a63b4bf778c0b05784f79677` |
| 6B `gnn-patterns/gnn-training-fresh-50k.json` | 15,586,569 | `4b8f266420269b22dddbbf0f679453abb0eb9f9919a2cf84ba90e4ed59a0dc9a` |
| 6B `gnn-patterns/gnn-training-sample-10k.json` | 3,178,131 | `97255401123757ab157ca84f8905565f5b9d23cf612377e10d4bbe746e3d5123` |
| 6B `gnn-patterns/gnn-training-sample-50k.json` | 14,934,852 | `06a0339d1e679f76e36593fef3d32b107918ce63c29dcb99a9a49384de729d2b` |
| 6C `gnn-patterns/gnn-training-export.json` | 603,223,867 | `d02afa163a453e5cb5c471b010fe316ba2b2900b2f676039b054291d52d0e7a2` |
| 6C `first-training/graph-runtime-events.ndjson` | 104,657,853 | `edd7ad3984718c524725ecdeefae493311996713ac1e5082a7b49ce3a0f0ad15` |

## Origin on ACER

- **First training set.** `vendor/ITEM6-STATUS.hbp`'s RECIPE row names the program `src/gnnDataExport.js`
  (sha256 `9956f6d7…`, the vendored file), its input `data/graph-runtime-events.ndjson` (sha256 `edd7ad39…`,
  104,657,853 B, "GREW_since_2026-03-15", the 6C events body) and its output `gnn-training-export-20260315.json`
  (`adc5f9eb…`), all relative to the Asolaria tree, `C:/Users/acer/Asolaria` (the integrator's record; the
  vendored `convert_graph_events.py:29` sets `DATA_DIR = "C:/Users/acer/Asolaria/data"`, and
  `train_baseline.py:181` reads `../../data/gnn-training-export-20260315.json` from its own directory). The row
  states `byte_exact=NO` (the export embeds `exportedAt=new Date()` and the events file grew).
- **The zoo (`gnn-patterns/`, `contract/`, `s2-ablation-refs/`).** The delivery does not name the ACER directory
  these came from. What the files and aether's records say: `convert_graph_events.py:8` names its output
  `E:/sovereignty/research/gnn-patterns/gnn-training-export.json` (line 32 writes it beside the script);
  the contract's own `sovereignty.location` is `E:\sovereignty\contracts\gnn-contract-v1.json`;
  `model/l2-contrastive/PROVENANCE.md` cites `feed-gnn-archaeology-to-fabric.mjs:16` naming
  `C:/Users/acer/Asolaria/sovereignty/research/gnn-patterns/inference_server_v2.py`, and a mirror report that lists
  `sovereignty/research/gnn-patterns/` as untracked in the acer working tree. The exact root on ACER is not given.
- **Line endings.** Six files hold CRLF line endings as delivered (`train_all_models.py`, `train_baseline.py`,
  `convert_graph_events.py`, `gnnDataExport.js`, `training_results.json`, `gslgnn_archive_200k_results.json`);
  they are stored unchanged (the repository's `.gitattributes` is `* -text`).

## The same bytes elsewhere in aether

Searched: every file of the working tree outside this directory (7,991 files) by sha256, and every `.pt` path in
the repository's history.

| Vendored file | Same sha256 at |
|---|---|
| `gnn-patterns/baseline_model.pt` | `model/l0-edge/vendor/gnn-sidecar/baseline_model.pt`, `acer/Asolaria/services/gnn-sidecar/baseline_model.pt` |
| `gnn-patterns/models/gnn_baseline.py` | `model/l0-edge/vendor/gnn-sidecar/models/`, `acer/Asolaria/services/gnn-sidecar/models/` |
| `gnn-patterns/models/prototype_gnn.py` | `model/l1-prototype/vendor/gnn-sidecar/models/` (the acer mirror's copy is another file, `4edb9439…`) |
| `gnn-patterns/models/contrastive_gnn.py` | `model/l2-contrastive/vendor/gnn-sidecar/models/`, `acer/Asolaria/services/gnn-sidecar/models/` |
| `gnn-patterns/models/gsl_gnn.py`, `models/__init__.py` | `model/l4-gslgnn/vendor/gnn-sidecar/models/`, `acer/Asolaria/services/gnn-sidecar/models/` |
| `gnn-patterns/models/schemas.py`, `train_baseline.py`, `start_inference.sh` | `acer/Asolaria/services/gnn-sidecar/` |

Every other vendored file, and every other checkpoint, is new to aether. `gnnDataExport.js` and `train_baseline.py`
equal `model/l0-edge/vendor/legacy/gnnDataExport.js` and `model/l0-edge/vendor/gnn-sidecar/train_baseline.py`
once CR bytes are removed. `inference_server.py` differs from model/l0-edge's vendored server
(`93a9a843…`) in one place: line 10 loads `baseline_model.pt` without renaming `conv*.lin.bias` to `conv*.bias`.

## Tools

| Tool | Lane | Writes / checks |
|---|---|---|
| `tools/verify_corpora.py` | stdlib, integers | prints one row per check of the two zips (stream) and of `vendor/CUBE.hbp` |
| `tools/zoo_ckpt.py` | stdlib, integers | (module) reads a checkpoint without torch: a restricted unpickler admitting only `collections.OrderedDict`, `torch._utils._rebuild_tensor_v2` and `torch.FloatStorage`, as model/l0-edge/tools/quantize.py does, without its sha256 pin and accepting a plain `dict` root |
| `tools/zoo_inspect.py [--check]` | stdlib, integers | `results/checkpoints.hbp`: keys, shapes, layouts, classes, aether matches, value diffs |
| `tools/zoo_weights.py [--check \| --self-check]` | stdlib, integers | `weights/*.rs`; `--self-check` renders each port's own checkpoint and compares every code line with that port's `src/weights.rs` (all four equal) |
| `tools/corpus_check.py [--check]` | stdlib, integers and exact fractions | `results/corpora.hbp`, every corpus and the events file read as streams |
| `tools/zoo_torch.py load\|trained-on\|parity-fixture [--check]`, `parity OUT` | torch | `results/torch-load.hbp`, `results/trained-on.hbp`, `tests/fixtures/parity-first.hbp`, the full parity file |
| `examples/*.rs` | Rust 1.81, integers | `PARITY` rows; `check.sh` diffs them with `results/parity.hbp` |

Float runs only inside torch and inside the owner's vendored Python (the trainers' `load_dataset`,
`build_tensors`, `build_node_features`), which `tools/zoo_torch.py` runs unchanged. Every number in the results
files is an integer or an exact fraction. `tools/zoo_torch.py` sets `ATEN_CPU_CAPABILITY=default`,
`MKL_CBWR=COMPATIBLE` and one thread before torch loads, as model/l0-edge/tools/model_parity.py does. Its three
committed outputs were written with Python 3.13.16, torch 2.14.1+cpu and torch_geometric 2.8.1; re-run with
torch 2.13.0+cpu and torch_geometric 2.7.0 (ACER's versions) they differ only in their `VERSIONS` line, and the 44
`PARITY` rows are the same.

## How the examples reuse the ports

Each example compiles one port's `src/model.rs` unchanged through `#[path]` (`model/l0-edge`, `l1-prototype`,
`l2-contrastive`, `l4-gslgnn`) next to a `weights` module under the names that file reads: model/l0-edge's own
`src/weights.rs` for `baseline_model.pt`, and `weights/*.rs` from `tools/zoo_weights.py` for the six other value
sets. `results/parity.hbp` records the sha256 of every port file the run compiled (`PORTSRC` lines). Examples are
compiled without `cfg(test)`, so the ports' own unit tests, which check their own weights, are not compiled here.
No port crate is modified.
