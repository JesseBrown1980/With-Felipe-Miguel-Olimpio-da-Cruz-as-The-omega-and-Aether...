# repro/ — sudoku/easy CPU reproduction (prepared, held)

> ## HELD — E≠0: this evaluation has NOT been run; it runs only on the operator's explicit go.
>
> Nothing in this directory was downloaded, unpickled, loaded or evaluated. No weights
> or datasets were fetched (only metadata-only HTTP to the Hugging Face API). Every
> script here is a no-op until invoked with `NCM_OPERATOR_GO=1`. This directory makes
> the smallest released NCM eval — **sudoku/easy**, metric exact-match — one command
> away, and fully safe, so it is ready the moment the operator says go.

Tags: **MEASURED** = computed here on 2026-10-18; **NAMED** = the authors' figure, not
reproduced here; **CONJECTURE** = an unproven derivation.

## 1. Certified manifest rows (MEASURED, 5/5)

The five files the sudoku/easy run needs, taken from the pinned manifests
(`../manifests/hf-ncm-checkpoints.hbp` @ `d342ce8a…`,
`../manifests/hf-ncm-datasets.hbp` @ `6580ba41…`) and each verified **row-by-row**
against the live Hugging Face API tree on 2026-10-18 — size, git blob oid, and (for
LFS files) the LFS oid = content sha256 all MATCH. No blobs were downloaded; the
`.../tree/<rev>?recursive=true` endpoint returns metadata only.

**Checkpoints** — `hazyresearch/ncm-checkpoints` @ `d342ce8aaea58830eef3b8ad473664673e41f692`

| path | bytes | sha256 (LFS oid) | git blob oid | API |
|---|---:|---|---|---|
| `sudoku/easy/generator.pt` | 102,560,203 | `1cefebcd1eae0e210b7e991fdce0e86964d0e897e94a3b432d1008ab92d9926e` | `90f77db72c484dccbaf9677b6d7a0ac0b6951ac3` | OK |
| `sudoku/easy/tokenizer.pt` | 59,816,209 | `3f9c87e99fd49900929cd650181f55bf00530280416992b11ddc4ea869b39d68` | `6cb4b0295300ede3d9dfa137fe38c10f8a056e98` | OK |
| `sudoku/easy/config.yaml` | 1,980 | — (non-LFS, in git) | `adef40fc50a296bf598ecf6fee092bc571715c34` | OK |

**Datasets** — `hazyresearch/ncm-datasets` @ `6580ba41a4b0a976dde876fbe84d25327617b0e6`

| path | bytes | sha256 (LFS oid) | git blob oid | API |
|---|---:|---|---|---|
| `sudoku/easy/puzzles.pickle` | 372,063 | `403353dd5d11e49d42627aee84c7b1ceb399fda03d01f6210ce78d0e61f2b29d` | `b4877d8dedb33122b50bd332d44b4161ddd855ab` | OK |
| `sudoku/easy/solutions.pickle` | 364,063 | `b52de75f5e4642adca58b18967bcd4bbcafa699c61b21ac33ee0fd7389e0d576` | `c567d070dc540df63793a839da29071e5d7ccb96` | OK |

`puzzles.pickle` is the test boards (config `data.test`); `solutions.pickle` is the
reference grids used for exact scoring (config `data.test_refs`). `config.yaml` here is
the **training-side** config bundled with the weights; it is fetched for certification
only — the evaluation uses the vendored `config/eval/sudoku-easy.yaml`, not this file.

Total download: **163,114,518 bytes ≈ 163 MB (155.6 MiB)**. Disk: keep ~0.5 GB free
(blobs + a small scratch copy of the code; the model code itself is a few hundred KB).
On this host `/` had ~2.2 GB free on 2026-10-18 (MEASURED), which is enough. Point
`HF_HOME` at a scratch dir and delete it afterward so no second cache copy lingers.

## 2. The safe-load plan (from the source alone; nothing loaded)

The vendored upstream loads these files unsafely — both would run arbitrary code:
- `vendor/ncm/scripts/eval_shard.py:52` `torch.load(generator.pt, map_location="cpu", weights_only=False)` → `sd["model"]`
- `vendor/ncm/tokenization/vqvae_tokenizer.py:18` `torch.load(tokenizer.pt, weights_only=False, map_location='cpu')['model']`
- `vendor/ncm/scripts/eval_shard.py:87,88` `pickle.load(open(puzzles/solutions.pickle,"rb"))`

The use of `weights_only=False` is a signal: a tensors-only checkpoint would not need
it, so the top-level checkpoint dict almost certainly also carries non-tensor objects
(most likely the OmegaConf training config and/or an `argparse.Namespace`) — exactly the
globals `weights_only=True` refuses. `safe_load.py` replaces all four loads:

**`.pt` files (`load_pt`) — `torch.load(weights_only=True, map_location="cpu")`:**
1. Static scan first (`pickletools.genops`, executes no opcode; works on the torch zip
   by reading its `data.pkl` member) and list every `GLOBAL` the pickle references.
2. A state_dict needs only these, all already on torch's default weights_only allowlist:
   `collections.OrderedDict`, `torch._utils._rebuild_tensor_v2`,
   `torch._utils._rebuild_parameter`, and the storage classes (`torch.*Storage`,
   `torch.storage.UntypedStorage`) via `persistent_load`. If the scan shows **only**
   these → `torch.load(weights_only=True)` loads directly, then take `["model"]`.
3. Globals `weights_only=True` **would refuse** but that are safe pure-data and may be
   added with `torch.serialization.add_safe_globals` **iff the scan shows exactly them**:
   `omegaconf.dictconfig.DictConfig`, `omegaconf.listconfig.ListConfig`,
   `omegaconf.base.ContainerMetadata`/`Metadata`, `omegaconf.nodes.AnyNode`,
   `argparse.Namespace`, `numpy.(core|_core).multiarray.scalar`, `numpy.dtype`.
4. **Any global outside the safe set ∪ that extra set → STOP, do not load, report.**
   (We only ever need `sd["model"]`; `load_pt` returns that state_dict.)

**`.pickle` datasets (`load_pickle`) — a restricted unpickler, never `pickle.load`:**
`RestrictedUnpickler.find_class` allows exactly the globals a list of sudoku boards
(int-rows, or numpy arrays) needs — `numpy.(core|_core).multiarray._reconstruct`,
`numpy.ndarray`, `numpy.dtype`, the numpy scalar reconstructors, and a curated set of
builtin container/scalar types — and raises on everything else. The eval reads these as
integer sequences (`list(item)`; the sudoku branch never treats items as `str`), so no
richer type is expected; the scan confirms it before loading.

The scanner is safe to run now; the loaders refuse unless `NCM_OPERATOR_GO=1`:

```bash
python3 -I safe_load.py scan <file>          # static global list (no execution)
NCM_OPERATOR_GO=1 python3 -I safe_load.py load-pt     artifacts/ckpt/sudoku/easy/generator.pt
NCM_OPERATOR_GO=1 python3 -I safe_load.py load-pickle artifacts/data/sudoku/easy/puzzles.pickle
```

## 3. Ready-to-run recipe (CPU, no GPU, no network beyond the fetch)

The shipped `evaluate.py` is GPU-only (it exits "no GPU visible" and `eval_shard.py`
hardcodes `.cuda()`). `cpu.patch` rewrites a **scratch copy** (cuda→cpu, and every
`.pt`/`.pickle` load routed through `safe_load.py`); the vendored tree stays
byte-identical (MEASURED, still matches `../UPSTREAM.sha256`). sudoku/easy generation is
**deterministic greedy** (config `generation.temperature: 0.0` → `argmax`), so **no seed
is needed**; thread count does not change the exact-match result. The sudoku `exact`
metric (`eval_merge.py`) is pure-numpy string comparison — **no gpt2/transformers
download** and no second model.

```bash
# 0. (held) fetch + certify — only on the operator's go
NCM_OPERATOR_GO=1 ./download_sudoku_easy.sh      # ~163 MB to ./artifacts, pinned revisions
./verify_sudoku_easy.sh                           # sha256/oid vs the certified rows above

# 1. (held) run on CPU — one command
NCM_OPERATOR_GO=1 ./run_sudoku_easy_cpu.sh
#   internally, with CUDA_VISIBLE_DEVICES='' TOKENIZERS_PARALLELISM=false
#   OMP_NUM_THREADS=$(nproc) PYTHONHASHSEED=0 NCM_ROOT=<workdir>:
#     python -I scripts/eval_shard.py --config config/eval/sudoku-easy.yaml \
#       --checkpoint-dir artifacts/ckpt/sudoku/easy --data-dir artifacts/data/sudoku/easy \
#       --shard 0 --nshards 1 --out eval/sudoku-easy/shard_0.pkl
#     python -I scripts/eval_merge.py --config config/eval/sudoku-easy.yaml \
#       --glob 'eval/sudoku-easy/shard_*.pkl'      # prints: solved %, solved, cell %, valid %
```

Pinned resolve URLs (for a manual fetch; `hf download` with `--revision` is preferred):
```
https://huggingface.co/hazyresearch/ncm-checkpoints/resolve/d342ce8aaea58830eef3b8ad473664673e41f692/sudoku/easy/generator.pt
https://huggingface.co/hazyresearch/ncm-checkpoints/resolve/d342ce8aaea58830eef3b8ad473664673e41f692/sudoku/easy/tokenizer.pt
https://huggingface.co/hazyresearch/ncm-checkpoints/resolve/d342ce8aaea58830eef3b8ad473664673e41f692/sudoku/easy/config.yaml
https://huggingface.co/datasets/hazyresearch/ncm-datasets/resolve/6580ba41a4b0a976dde876fbe84d25327617b0e6/sudoku/easy/puzzles.pickle
https://huggingface.co/datasets/hazyresearch/ncm-datasets/resolve/6580ba41a4b0a976dde876fbe84d25327617b0e6/sudoku/easy/solutions.pickle
```

## 4. CPU torch environments (versions only; installed nothing)

MEASURED 2026-10-18; the run script picks the first that exists (override with `NCM_PY`):

| env | python | torch | numpy |
|---|---|---|---|
| `scratchpad/ci-torch-venv` | 3.13.16 | 2.14.1+cpu | 2.5.4 |
| `scratchpad/torch213` | 3.13.16 | 2.13.0+cpu | 2.5.4 |
| `scratchpad/torchvenv` | — | absent (no `bin/python`) | — |

Both present envs are CPU builds and torch ≥ 2.6, so `weights_only` defaults to `True`
and `add_safe_globals` / `safe_globals` are available. Upstream `requirements.txt`:
`torch, numpy, omegaconf, hydra-core, transformers>=4.51, huggingface_hub[cli], regex,
rouge_score, sacrebleu` (the sudoku `exact` path uses only torch + numpy + omegaconf + hydra).

## 5. The authors' numbers (NAMED — not reproduced here)

- **Sudoku easy solve rate ≈ 99.5%** (NAMED). NCM outperforms AR and diffusion baselines
  across all sudoku difficulties with fewer function evaluations.
- **Tokenizer exact reconstruction ≈ 99.99% of OWT tokens** (NAMED). WMT14 token accuracy
  **98.79%** (NAMED).
- **D3 — exact text from NCM codes + a correction list** is **CONJECTURE**: the idea is to
  pair the codes with the positions the tokenizer gets wrong (≈0.01% for OWT, ≈1.21% for
  WMT14 — the complements of the NAMED accuracies above) to turn the lossy carrier into a
  hash-certifiable one. It stays CONJECTURE until a run measures the real mismatch list;
  that run needs the operator's go (E≠0) and is **not** this sudoku/easy eval.

## 6. Files here

| file | what |
|---|---|
| `README.md` | this doc |
| `safe_load.py` | static pickle scanner + `load_pt` (weights_only=True) + `RestrictedUnpickler` (gated by `NCM_OPERATOR_GO=1`) |
| `download_sudoku_easy.sh` | fetch the 5 pinned files (held; `NCM_OPERATOR_GO=1`) |
| `verify_sudoku_easy.sh` | certify downloads against §1 (safe; hashes only, skips absent) |
| `run_sudoku_easy_cpu.sh` | CPU eval on a patched scratch copy (held; `NCM_OPERATOR_GO=1`) |
| `cpu.patch` | cuda→cpu + safe-load rewrite, applied only to the scratch copy |

Confirmation: preparing this directory **downloaded nothing** (metadata-only HF API
calls) and **ran no model, load, unpickle, training or evaluation**.
