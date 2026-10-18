# asolaria-gnn-zoo

The first Asolaria GNN zoo, as ACER delivered it on 2026-10-18 (item 6A, 6B, 6C): four model classes with their
trainers and servers, 11 checkpoints, the first training export, the GNN contract, seven training corpora and the
graph-runtime events file; tools that verify every byte and measure what the checkpoints are; and a Rust crate
whose examples run aether's integer ports (`model/l0-edge`, `l1-prototype`, `l2-contrastive`, `l4-gslgnn`),
unchanged, with the zoo's weights. Crate `asolaria-gnn-zoo`, library `gnn_zoo`, no dependencies,
`#![forbid(unsafe_code)]`, Rust 1.81, no `f32`/`f64`. Where every byte came from is in
[`PROVENANCE.md`](PROVENANCE.md).

| Path | Content |
|---|---|
| `vendor/` | the 35 entries of the 6A zip, unchanged, in ACER's layout: `first-training/`, `contract/`, `gnn-patterns/` (with `models/`, the `.pt` and `.pt.bak` files), `s2-ablation-refs/`, `ITEM6-STATUS.hbp`, `CUBE.hbp`, `SHA256SUMS` |
| `corpora/` | the 6B and 6C delivery zips, unchanged (their bodies exceed GitHub's 100 MB limit, so they stay zipped) |
| `tools/` | stream verifier, checkpoint reader and inspector, weights converter, corpus checker (stdlib); torch harness |
| `results/` | `checkpoints.hbp`, `corpora.hbp`, `torch-load.hbp`, `trained-on.hbp`, `parity.hbp` |
| `weights/` | six zoo value sets as Q24 constants under the ports' names (generated, `--check`ed) |
| `src/`, `examples/` | the parity reader and the seven examples, one per weight set |
| `tests/fixtures/parity-first.hbp` | torch outputs on the first training set, so the Rust parity runs without torch |

## The checkpoints

Aether's levels: L0 EdgeLevelGNN, L1 PrototypeGNN, L2 ContrastiveGNN, L4 GSLGNN (the four `model/` ports). The
vendored `inference_server_v2.py:8-9, 61-68` names them the other way round for L1 and L2 (`L1_Contrastive`,
`L2_Prototype`). Layout: `pyg` = saved from a model built with torch_geometric's `GCNConv` (`conv*.bias`, an
`aggr_module` per conv in `_metadata`); `fallback` = the vendored files' ImportError `GCNConv`, one `Linear`
(`conv*.lin.bias`, no `aggr_module`); `rekeyed` = a `pyg` file after `rekey_checkpoints.py` renamed `conv*.bias`
to `conv*.lin.bias`. All tensors are float32; keys and shapes are in `results/checkpoints.hbp`.

| File | Bytes | sha256 | Class | Level | Layout | In aether before | Trained on |
|---|---|---|---|---|---|---|---|
| `baseline_model.pt` | 55,599 | `a0999336…` | EdgeLevelGNN(6, 64) | L0 | fallback | yes: model/l0-edge's vendored checkpoint, and `acer/` | `train_baseline.py:181`: `data/gnn-training-export-20260315.json` = `vendor/first-training/` (`adc5f9eb…`) |
| `baseline_model_retrained.pre-L0-rekey-2026-05-26.pt` | 55,867 | `d878d6ec…` | EdgeLevelGNN(6, 64) | L0 | pyg | no | the 50,000-edge corpus below |
| `baseline_model_retrained.pt` | 55,623 | `f7926cdd…` | EdgeLevelGNN(6, 64) | L0 | rekeyed, plain `dict`, no `_metadata` | no | same values as the line above |
| `prototype_model.pt` | 73,857 | `c820daac…` | PrototypeGNN(6, 64, 2, 3) | L1 | rekeyed | no | the 50,000-edge corpus below |
| `prototype_model.pt.bak` | 73,793 | `b5637c74…` | PrototypeGNN(6, 64, 2, 3) | L1 | pyg | no | same values as `prototype_model.pt` |
| `contrastive_model.pt` | 99,137 | `70d8d282…` | ContrastiveGNN(6, 64, 64, 2) | L2 | rekeyed | no | the 50,000-edge corpus below |
| `contrastive_model.pt.bak` | 99,137 | `53e24024…` | ContrastiveGNN(6, 64, 64, 2) | L2 | pyg | no | same values as `contrastive_model.pt` |
| `gsl_model.pt` | 120,220 | `d552c9b6…` | GSLGNN(6, 64, 2, 32) | L4 | rekeyed | no | the 50,000-edge corpus below |
| `gsl_model.pt.bak` | 120,156 | `aa241f1f…` | GSLGNN(6, 64, 2, 32) | L4 | pyg | no | same values as `gsl_model.pt` |
| `gsl_model_archive_200k.pt` | 120,609 | `c2c39657…` | GSLGNN(6, 64, 2, 32) | L4 | pyg | no | no delivered trainer writes this name (see below) |
| `gsl_model_archive_200k_shuffled.pt` | 120,834 | `83420431…` | GSLGNN(6, 64, 2, 32) | L4 | pyg | no | `train_gslgnn_archive.py:25-26`: `gnn-training-archive-200k.json` (`5e878a63…`) |

"In aether before" compares sha256 with all 16 checkpoint files in the repository (the four ports' vendored
checkpoints, the `acer/` mirror's nine, the three stratified retrains in `docs/handoffs/gnn-retrain-2026-10-18/`)
and with every checkpoint the four ports' PROVENANCE files pin (all of which are among those 16). By value, with
`conv*.bias` and `conv*.lin.bias` taken as one tensor: `baseline_model.pt` equals model/l0-edge's checkpoint; every
other zoo value set differs from every aether checkpoint of its class in every tensor, except the GSLGNN files,
which share 3 of 19 tensors with each other and with aether's GSLGNN checkpoints: `gsl.threshold` (float32
`0x3f000000`, 1/2, its initial value) and `conv1.bias`, `conv2.bias` (all zeros; the forward never reads them).
So 6 value sets in 10 files are new.

**.pt against .pt.bak.** The four pairs (`.pt`/`.pt.bak` for prototype, contrastive and gsl, and
`baseline_model_retrained.pt` against its `pre-L0-rekey` file) differ in no element of any tensor: 0 of 17,408,
0 of 23,330, 0 of 28,259 and 0 of 12,929 elements differ, so the largest difference is 0 ulp and exactly 0. What
differs is the key spelling, `conv1.bias`, `conv2.bias` (and `conv1_orig.bias`, `conv2_orig.bias` for GSLGNN)
renamed to `conv*.lin.bias`, which is what `rekey_checkpoints.py` does (it keeps the original as `.bak`), and, for
`baseline_model_retrained.pt`, a plain `dict` without `_metadata`. Per tensor rows: `DIFF` in
`results/checkpoints.hbp`.

**Loading** (`results/torch-load.hbp`, torch 2.14.1+cpu, torch_geometric 2.8.1). All 11 load with
`torch.load(weights_only=True)`, and their tensor bits equal those read without torch. Strictly, as saved, the 6
`pyg` files load into the torch_geometric classes and the 5 `fallback`/`rekeyed` files into the fallback classes;
every file loads into either after the `conv*.bias` / `conv*.lin.bias` rename the ports' servers apply.
`inference_server_v2.py` loads 4 of 4 models only when torch_geometric does not import (then `L0` from
`baseline_model_retrained.pt`, `L1_Contrastive` from `contrastive_model.pt`, `L2_Prototype` from
`prototype_model.pt`, `L4_GSLGNN` from `gsl_model.pt`, all with the one-`Linear` GCNConv and, for GSLGNN, the
fallback `to_dense_adj` that returns zeros); with torch_geometric installed it loads 0 of 4, since every file it
names has `conv*.lin.bias` keys. The vendored `inference_server.py` loads `baseline_model.pt` without the rename
that model/l0-edge's server has, so it too loads only without torch_geometric.

## What each checkpoint was trained on

`train_all_models.py` writes `baseline_model_retrained.pt`, `contrastive_model.pt`, `prototype_model.pt` and
`gsl_model.pt` and their test metrics to `training_results.json`. Its default dataset is
`gnn-training-export.json` (`d02afa16…`, line 408), optionally capped by `--max-edges` or replaced by `-d`; the
results file's test split holds 7,500 edges (`tp + fp + fn + tn`), 15% of 50,000. Each checkpoint was run through
the trainer's own `load_dataset`, `build_tensors`, `split_data` and `compute_metrics` (torch_geometric's GCNConv,
as line 24 imports it) on every corpus the trainer could have read (`results/trained-on.hbp`):

| Corpus as `train_all_models.py` reads it | nodes | test positives | EdgeLevelGNN | ContrastiveGNN | PrototypeGNN | GSLGNN |
|---|---|---|---|---|---|---|
| `gnn-training-sample-50k.json` (`06a0339d…`) | 2,053 | 32 | equal | equal | equal | equal |
| `gnn-training-archive-50k.json` (`3c07fdf1…`) | 2,053 | 32 | equal | equal | equal | equal |
| `gnn-training-archive-200k.json` with `--max-edges 50000` | 5,831 | 32 | equal | equal | fp 93, not 92 | equal |
| `gnn-training-export.json` with `--max-edges 50000` | 18,964 | 32 | equal | 26/91/6/7377 | 26/91/6/7377 | not run (dense 18,964 x 18,964) |
| `gnn-training-fresh-50k.json` | 8,304 | 0 | 0/0/0/7500 | 0/0/0/7500 | 0/0/0/7500 | not run |
| `gnn-training-500k.json` with `--max-edges 50000` | | | `load_dataset` raises UnicodeDecodeError | | | |

"equal" means tp, fp, fn and tn all equal `training_results.json` (EdgeLevelGNN 27/94/5/7374, ContrastiveGNN and
PrototypeGNN 27/92/5/7376, GSLGNN 32/0/0/7468). So the run behind `training_results.json` used the 50,000-edge
corpus whose content `gnn-training-sample-50k.json` and `gnn-training-archive-50k.json` both hold: the two files
differ only in their `exportedAt` value (11 bytes within offsets 37-50). Which of the two names was passed cannot
be told from the outputs. This is a match of evaluations, not a re-run of training (the trainers seed nothing).

- `baseline_model.pt`: `train_baseline.py` (lines 142-143) writes it; it reads `data/gnn-training-export-20260315.json`
  (line 181), the vendored first training set. No results file was delivered. Measured on that set's test split
  (edges 1,470-1,729, 9 positives): with the forward it was trained with (one-`Linear` GCNConv; its keys are the
  fallback layout) tp 9, fp 0, fn 0, tn 251; with torch_geometric's GCNConv, as model/l0-edge serves it, tp 0, fp 0,
  fn 9, tn 251.
- `gsl_model_archive_200k_shuffled.pt`: `train_gslgnn_archive.py` loads `gnn-training-archive-200k.json` and cuts
  a random 70/15/15 split with an unseeded `torch.randperm` (line 33), so its test split cannot be rebuilt. Its
  results file is consistent with the corpus: 200,000 edges, and its per-split positives 4,669 + 1,006 + 1,081 =
  6,756, the corpus's positive count. Over all 200,000 edges it gives tp 6,705, fp 41, fn 51, tn 193,203, each at
  least the reported test counts (1,071, 6, 10).
- `gsl_model_archive_200k.pt`: no delivered trainer or results file names it. `train_gslgnn_archive.py`'s
  docstring says the shuffle "fixes temporal label clustering that caused 0% F1 in chronological split"; measured,
  the chronological test split of `gnn-training-archive-200k.json` (its last 30,000 edges) holds 0 positives. Over
  all 200,000 edges this checkpoint gives tp 6,755, fp 150, fn 1, tn 193,094.

## Parity of the aether ports on these checkpoints

Each example compiles one port's `src/model.rs`, unchanged, with one zoo value set (`weights/*.rs` from
`tools/zoo_weights.py`, which reproduces each port's own `src/weights.rs` line for line from that port's
checkpoint). Graphs: the whole first training set (309 nodes, 1,730 edges) and the whole `sample-10k` corpus
(2,043 nodes, 10,000 edges), node features `[min(edgeVolume/100, 1), avgRisk/9, maxRisk/9, failureRate, online,
trustTier/3]` (`train_all_models.py:67-74`) rounded half up to Q24 from the exact JSON decimals; torch receives
the same values as float32. Differences are |port Q24 - Q24 rounding of torch's float32|, as the ports' own
parity tests take them; class is `> 1/2`, the trainers' decision. Rows are `results/parity.hbp`.

| Port (its forward) | Checkpoint values | Graph | Q24 equal | Max diff (Q24 units) | Class equal | Positives port / torch |
|---|---|---|---|---|---|---|
| l0-edge (torch_geometric GCNConv) | `baseline_model.pt` | first | 1,644 / 1,730 | 1 | 1,730 / 1,730 | 288 / 288 |
| | | sample-10k | 9,995 / 10,000 | 1 | 10,000 / 10,000 | 0 / 0 |
| | `baseline_model_retrained.pt` (= pre-L0-rekey) | first | 808 / 1,730 | 2 | 1,730 / 1,730 | 288 / 288 |
| | | sample-10k | 3,391 / 10,000 | 18 | 10,000 / 10,000 | 86 / 86 |
| l1-prototype (one-`Linear` GCNConv) | `prototype_model.pt` (= .bak) | first | 928 / 1,730 | 4 | 1,730 / 1,730 | 0 / 0 |
| | | sample-10k | 1,976 / 10,000 | 2 | 10,000 / 10,000 | 0 / 0 |
| l2-contrastive (one-`Linear` GCNConv) | `contrastive_model.pt` (= .bak) | first | 1,047 / 1,730 | 2 | 1,730 / 1,730 | 0 / 0 |
| | | sample-10k | 9,629 / 10,000 | 1 | 10,000 / 10,000 | 0 / 0 |
| l4-gslgnn (torch_geometric GCNConv) | `gsl_model.pt` (= .bak) | first | 1,579 / 1,730 | 5 | 1,730 / 1,730 | 297 / 297 |
| | | sample-10k | 9,942 / 10,000 | 1 | 10,000 / 10,000 | 5 / 5 |
| | `gsl_model_archive_200k.pt` | first | 1,591 / 1,730 | 5 | 1,730 / 1,730 | 298 / 298 |
| | | sample-10k | 9,914 / 10,000 | 9 | 10,000 / 10,000 | 15 / 15 |
| | `gsl_model_archive_200k_shuffled.pt` | first | 1,470 / 1,730 | 4 | 1,730 / 1,730 | 288 / 288 |
| | | sample-10k | 9,968 / 10,000 | 1 | 10,000 / 10,000 | 5 / 5 |

Every port fits its zoo checkpoints by shape, and on its own forward agrees with torch in class on every edge, at
most 18 Q24 units apart (`--check` allows 32, the bound model/l0-edge's tests allow).

Where the port's forward is not the one the checkpoint was trained with:

- **L1 and L2.** The zoo's PrototypeGNN and ContrastiveGNN were saved from torch_geometric models (`aggr_module`
  in `_metadata`; `train_all_models.py:24` imports torch_geometric's `GCNConv`). model/l1-prototype and
  model/l2-contrastive implement the one-`Linear` GCNConv, with no message passing, the layout of aether's own L1
  and L2 checkpoints. Against the forward these checkpoints were trained with, the ports' outputs differ in class on
  206 (PrototypeGNN) and 234 (ContrastiveGNN) of the first set's 1,730 edges: torch flags 206 and 234 positives,
  the ports 0. No aether port runs PrototypeGNN or ContrastiveGNN with torch_geometric's GCNConv.
- **L0, `baseline_model.pt`.** Trained with the one-`Linear` GCNConv, served by model/l0-edge with torch_geometric's
  (as model/l0-edge documents); the two forwards differ in class on 54 of the first set's 1,730 edges.

## The corpora (`results/corpora.hbp`)

Every corpus and the events file was read as a stream. In every readable export the stats block equals the
records (node, edge, benign and suspicious counts, the category set and the action count), node ids are unique,
`edgeIndex` equals the node order of each edge's `source` and `target`, every edge's `index` is its position,
every node's `edgeVolume` and `maxRisk` equal those of the edges that touch it and its `avgRisk` is within 1/200
of their exact mean, `trustTier` follows `type`, and no edge with `riskScore >= 6` or a blocked/denied action has
label 0.

| Corpus | Nodes | Edges | Labels 0 / 1 | edgeIndex | riskScore values |
|---|---|---|---|---|---|
| `first-training/gnn-training-export-20260315.json` | 309 | 1,730 | 1,468 / 262 | E x 2 | 0-9 |
| `gnn-training-sample-10k.json` | 2,043 | 10,000 | 10,000 / 0 | 2 x E | 0-5 |
| `gnn-training-sample-50k.json` | 2,053 | 50,000 | 43,376 / 6,624 | 2 x E | 0-9, 12 |
| `gnn-training-archive-50k.json` | 2,053 | 50,000 | 43,376 / 6,624 | 2 x E | 0-9, 12 |
| `gnn-training-fresh-50k.json` | 8,304 | 50,000 | 49,987 / 13 | 2 x E | 0-6, 8 |
| `gnn-training-archive-200k.json` | 5,831 | 200,000 | 193,244 / 6,756 | 2 x E | 0-9, 12 |
| `gnn-training-500k.json` | 5,831 (stats) | 500,000 (stats) | 493,244 / 6,756 (stats) | not readable | |
| `gnn-training-export.json` | 18,964 | 2,158,665 | 2,112,056 / 46,609 | 2 x E | 0-10, 12 |

- **`gnn-training-500k.json` is damaged.** Bytes 119,799,808 to 119,816,191, four aligned 4 KiB blocks, hold other
  data (one block of Markdown starting `---` / `ix: IX-494`, three of binary) in place of edge records: 499,939 of
  its 500,000 record starts are present, indices 436,849 to 436,909 are missing and 436,848 is cut. It is not UTF-8
  and not JSON, so `load_dataset` cannot read it. Its sha256 equals the CORPUS row of `ITEM6-STATUS.hbp`, so these
  are the bytes ACER holds. No delivered trainer names it.
- **The events file** (`graph-runtime-events.ndjson`, 6C): 138,760 lines, all `graph_event`, in time order from
  2026-04-01T19:10:26.807Z to 2026-07-14T19:32:26.904Z. None is at or before the first export's `exportedAt`
  (2026-03-15T23:25:59.676Z), so the RECIPE row's content check ("filter events to <= 2026-03-15, then compare
  stats") cannot be run on it: the file starts after that date. It holds 142 occurrences of two private LAN
  addresses, published by the owner's standing direction.
- `gnnDataExport.js` writes `edgeIndex` as one `[source, target]` pair per edge (E x 2); `train_all_models.py`
  passes `data["edgeIndex"]` to `torch.tensor` unchanged (line 76), which fits the converter's 2 x E layout only.

**Against `contract/gnn-contract-v1.json`.** The contract fixes the gate interface of the IX hot path (input
`verb`, `actor`, `target`, `context`, `policy`; output `ok`, `allow`, `score` an integer 0-9, `level` one of
`low`, `medium`, `high`, `critical`, `prediction`, `edge`) and its rules. It defines no node or edge feature
dimensions. The corpora's nodes hold 8 fields, 6 numeric (`edgeVolume`, `avgRisk`, `maxRisk`, `failureRate`,
`online`, `trustTier`), the six the trainers feed the models; edges hold 13 fields, of which the trainers read
only `label` (`train_baseline.py` also builds a 3-value edge vector that never reaches the model).
`gnnDataExport.js` calls its node record "8-dim" and its edge record "10-dim" (ADR-0010). No corpus has a 12-value
node vector or a 10-value numeric edge vector. Every `riskLevel` is in the contract's `level` set; `riskScore` stays
within the contract's 0-9 in the first export, sample-10k and fresh-50k, and reaches 12 (and 10 in the full export)
in the others.

## Checks

```sh
model/gnn-zoo/check.sh
```

runs, from `model/gnn-zoo/`: `sha256sum -c UPSTREAM.sha256` (37 files); `sha256sum -c SHA256SUMS` in `vendor/`
(33); `python3 -I tools/verify_corpora.py` (the zips, streamed, and the 6A cube); `tools/zoo_inspect.py --check`;
`tools/zoo_weights.py --self-check` and `--check`; `tools/corpus_check.py --check` (about a minute);
`cargo +1.81.0 fmt --check`, `clippy --locked --all-targets -- -D warnings`, `test --locked`; a no-float grep of
`src/`, `examples/` and `weights/`; and the seven examples with `--check` on `tests/fixtures/parity-first.hbp`,
compared with `results/parity.hbp`. With `ASOLARIA_TORCH_PYTHON` set to a Python with torch 2.14.1+cpu and
torch_geometric 2.8.1 it also runs `tools/zoo_torch.py load`, `trained-on` and `parity-fixture` with `--check`,
writes the full parity file to a temporary directory and compares all 44 `PARITY` rows; without it those print
`SKIP`. `check.sh --write-parity` rewrites `results/parity.hbp`.

## Not here, or not possible

- The ACER directory of the zoo: not stated by the delivery (see `PROVENANCE.md`).
- A re-run of any training: the trainers set no seed; the match above is of evaluations.
- Which of `sample-50k` and `archive-50k` was passed to the run behind `training_results.json` (same content).
- The test split of `gsl_model_archive_200k_shuffled.pt` (unseeded permutation), and any trainer or results file
  for `gsl_model_archive_200k.pt`.
- GSLGNN on corpora above 6,000 nodes (`export` capped at 50,000 edges, `fresh-50k`): the forward holds dense
  node x node matrices; not run.
- The first export rebuilt from the events file: the delivered events start 2026-04-01; the converter's archive
  input (`graph-runtime-events-archive-20260324.ndjson`) was not delivered.
- `gnn-training-500k.json` as JSON: damaged on ACER, as above.
- The S2 leakage-ablation trainer: `ITEM6-STATUS.hbp` records it as not on ACER; `s2-ablation-refs/` holds only
  the two dispatchers that reference it.
- An integer port of PrototypeGNN or ContrastiveGNN with torch_geometric's GCNConv, the forward the zoo's L1 and L2
  checkpoints were trained with.

## License

MIT OR Apache-2.0 for this crate's code and tools (see `Cargo.toml`). The files under `vendor/` and `corpora/`
are the owner's, byte-identical as delivered.
