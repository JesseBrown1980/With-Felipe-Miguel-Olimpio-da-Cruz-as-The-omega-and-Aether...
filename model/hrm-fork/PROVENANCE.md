# Provenance: model/hrm-fork

Tags: **CODE** = what the code computes (repo@commit:path:line). **DOC** = an owner document,
quoted. **MEASURED** = a run or search made for this directory on 2026-10-17 (command and result
stated). Everything we wrote here uses integer arithmetic only.

## 1. Vendored upstream files

Every file under `vendor/` is byte-identical to its upstream: `git hash-object` equals the upstream
blob id, and `sha256sum -c UPSTREAM.sha256` checks the bytes. Each file was read in full and scanned
for personal data (names of private people, phone numbers, e-mail addresses, chats, LAN addresses,
keys, private paths) before copying; none was found. The receipt and workflows carry the owner's seat
PID `8467a937cba309f7` and seat name `ACER-CLAUDE-FABLE5`, which are the owner's identifiers.

Upstreams (both cloned 2026-10-17 with `GIT_LFS_SKIP_SMUDGE=1` into `scratchpad/universe/src/`):

- **HRM** = `https://github.com/JesseBrown1980/HRM` @ `74ecc8b5b53b145f83580690217a9009d175b8b4`
  (`git ls-remote`: `refs/heads/main` = this commit; it is also HEAD of the Hugging Face mirror
  `Jessedbrown/HRM`). History: upstream `sapientinc/HRM` through `ac15626f8db096a63c775b84c9dc868776a6feda`
  plus six owner commits of 2026-08-08 ("star port …") that add only `.nojekyll(.sha256)`,
  `STARPORT-2026-08-08.hbp(.sha256)` and `index.html(.sha256)` (`git diff --stat ac15626 HEAD`: 6 files,
  +49 lines). Every vendored HRM file is therefore the Sapient upstream file at `ac15626f`. License:
  Apache-2.0 (`vendor/HRM/LICENSE`).
- **CC** = `https://github.com/JesseBrown1980/asolaria-cube-cloud` @ `f91bb2c3f0e1734e72d94542967000556f6c1c5c`
  (`git ls-remote`: `refs/heads/main` = this commit). CC has no license file at `f91bb2c` (`git ls-files`,
  61 files: no `LICENSE`, `COPYING` or `NOTICE`, and no SPDX line). The package `license` field in
  `Cargo.toml` follows the aether convention (`MIT OR Apache-2.0`, as in `model/hrm-mtp` and
  `model/l0-edge`); `vendor/HRM` stays Apache-2.0 (`vendor/HRM/LICENSE`). The license of `hp_mix.rs` is
  the owner's to confirm.

| Vendored path | Upstream | Git blob | sha256 | Bytes |
|---|---|---|---|---|
| `vendor/HRM/LICENSE` | HRM `LICENSE` | `7a4a3ea2424c09fbe48d455aed1eaa94d9124835` | `58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd` | 11357 |
| `vendor/HRM/config/arch/hrm_v1.yaml` | HRM `config/arch/hrm_v1.yaml` | `a5646b89049842da5eb4e55df01cb04515c0f1f9` | `ddeca4b59e917389e6d00f9c0385a9403c6e16333b5d20f364bfb0b4d6d98e09` | 349 |
| `vendor/HRM/config/cfg_pretrain.yaml` | HRM `config/cfg_pretrain.yaml` | `51c55a07142cc5d2732cb2d84e069a58872dd068` | `0505b9fab8384cda1571470be13fb6c9c98cb44362b3f7575ee40c81b3ae8235` | 492 |
| `vendor/HRM/dataset/common.py` | HRM `dataset/common.py` (imported by `puzzle_dataset.py:11`) | `7bc51c6fe5ff85256d3a766a84714fefd7dc148d` | `f2b1f917726e0835c7db2ca7d108c7609ea4e72ef66f017ea5e2e78c75f98201` | 1381 |
| `vendor/HRM/evaluate.py` | HRM `evaluate.py` | `71ee7530ae8967a61ff94daa2ace2ecf8f130961` | `84b9f625e783baae57e500dfc4bb7e7746f57a1a9de153068eec065e6d256480` | 2490 |
| `vendor/HRM/models/common.py` | HRM `models/common.py` | `1a045051f26cd2ecf25b5d16a11cb609de7df0e4` | `fa749ad9b68ac0852f9cda157baa3a9c2ff8abaee973751b32b7cd010a4cf859` | 1216 |
| `vendor/HRM/models/hrm/hrm_act_v1.py` | HRM `models/hrm/hrm_act_v1.py` | `e91c7d1a047b9f9735fa8253daa4b8effa23f011` | `b9c5195fc14c6f451569434905cd16849d6c56ff7723f5844604b48065ebfd39` | 12161 |
| `vendor/HRM/models/layers.py` | HRM `models/layers.py` | `03947444ddeced7d414b9a58e98f4276b70ddfe3` | `43a990635a8e9b04d9459f3715f66dd67ff53d2b0d8c354fb7c9bbde0f1cf561` | 5654 |
| `vendor/HRM/models/losses.py` | HRM `models/losses.py` | `b3118e728365cc2824646a156a35d79f6dcca9c1` | `f27e777cf5dcc7d9d78e57c92e521ab02808f4976e988bf253a79fd597e35257` | 3804 |
| `vendor/HRM/models/sparse_embedding.py` | HRM `models/sparse_embedding.py` | `c701524b9fea4b408b6e8c9f8af5f58e815fcc86` | `e827a577d2f8bc1e2e56ef0b5151a269a424fc33c8da38cfc63f6ea6f5814ec6` | 4366 |
| `vendor/HRM/pretrain.py` | HRM `pretrain.py` | `245cb5c7e3c1a1fb49cd53d4e35dcd4fdd7a8749` | `2190b9fd82f817f57278071192df9de93be107dc488bf1977b1b009b220070ab` | 15607 |
| `vendor/HRM/puzzle_dataset.py` | HRM `puzzle_dataset.py` | `2782403c39e5daca3ff192dbdd1159dea24fcfe1` | `de7ecb74019d6cd33f043bc12514c7094aea5584bd0f5bf15bfc955a87e09684` | 7980 |
| `vendor/HRM/requirements.txt` | HRM `requirements.txt` | `8c90d6f65cdfcb130b4e442221850267bb000393` | `8af89825fd7f4ab6beb46ff8e6e27933ba4864287bc761abf3cf1fb02fe8f349` | 100 |
| `vendor/HRM/utils/functions.py` | HRM `utils/functions.py` | `b12363606c41692e19b60f33098605e147adc7f0` | `a7c54723be9ade0317afd1fe42d42da5e7a33e1b5cffbf9bdfc66f3791a3caef` | 516 |
| `vendor/asolaria-cube-cloud/hutter/variants/mix/hp_mix.rs` | CC `hutter/variants/mix/hp_mix.rs` | `b1839f8224a15abbfdb357e2053466f0a4e9768f` | `17101e3154171c0df8aa153ca791a3baf19033d7c4f591790652d17a6da54140` | 13074 |
| `vendor/asolaria-cube-cloud/hutter/variants/mix/hp_mix.rs.sha256` | CC same path (upstream's own pin of hp_mix.rs) | `6b0c53acf4e2f0174eecd3c1ef4def0faa89b7fd` | `31ba2b496f4f219adeddc39987d84bd3744721ab91301b6e954186bcce9124ac` | 76 |
| `vendor/asolaria-cube-cloud/.github/workflows/hutter-tournament.yml` | CC same path (hp_mix's enwik8 test) | `d09733f3d6c413624021128f9dcb5616a328dfe6` | `35eb544a3c54e13e5a3d323b93a584bb545110c7a82c5a05d19f6d21c71bb6e5` | 5604 |
| `vendor/asolaria-cube-cloud/.github/workflows/enwik9-two-system.yml` | CC same path (hp_mix's enwik9 test) | `2f742399c2f73a1d74b952064b7222db00ef62fe` | `b0348298946d8cd6be8fda9eeb42aa79732005b8eff62bff6b1a3893ad213d3b` | 3234 |
| `vendor/asolaria-cube-cloud/.github/workflows/rust-1.81-clippy-verification.yml` | CC same path (toolchain rule; names hp_mix.rs line 6) | `69ae6609ed09fe89b5c1decf15837bd54ff20046` | `2c0f8324ac88cf5d2fcf7cb8395080c22451882da5a75f392981be9f25daf831` | 9129 |
| `vendor/asolaria-cube-cloud/results/FABLE5-HUTTER-PRETEST-ARC-2026-07-17.hbp` | CC same path (the receipt) | `381947d76566bd60751a28d3a663dd6b8405ed47` | `217ae196a616deca1a7ea710c432ffbd411c495c6bc767fa42682084420c329d` | 1954 |
| `vendor/asolaria-cube-cloud/results/FABLE5-HUTTER-PRETEST-ARC-2026-07-17.hbp.sha256` | CC same path | `3ad829360101407d0f72398bcf5e39c2bdae9f6e` | `8fcfe45823d45885df7735a3964a16d2f4e446e95272e967d3e4579efd9fd6d0` | 107 |

The workflow files sit under `vendor/`, so GitHub does not run them; they are the upstream test
recipe that `tests/hp_mix.rs` and the CI snippet follow. The upstream sidecars check as given
(`sha256sum -c hp_mix.rs.sha256`, `sha256sum -c FABLE5-HUTTER-PRETEST-ARC-2026-07-17.hbp.sha256`: OK),
and the receipt's footer `receipt_sha256=6791c7d3…` equals the sha256 of its rows 1-14 (test
`receipt_footer_seals_rows_1_to_14`).

Cited, not vendored: HRM `README.md` (upstream description; quoted in section 3), the HRM dataset
builders and notebooks (`dataset/build_*.py`, `arc_eval.ipynb`, `puzzle_visualizer.html`), the three
ARC submodules (third-party data), and CC `hutter/variants/dir/build_test.sh` (it reads paths on the
owner's machine; it tests `hp_dir`, not `hp_mix`).

### hp_mix.rs: the blob the receipt measured

`git log -- hutter/variants/mix/` in CC: `7e6c865` (2026-07-16, blob `d748c294…`, 12,918 bytes), then
`c0d8fc5` / `00f3802` (2026-08-06, "toolchain rule: Rust 1.81 + clippy, integer/ternary only"), giving
blob `b1839f82…` (13,074 bytes) at `f91bb2c`. `git diff 7e6c865 f91bb2c` touches only `report()`
(hp_mix.rs:333-337): the `ratio_x` / `bpc` print moved from `f64` `{:.4}` to integer `×10⁴`, truncated.
The model, coder, compress and decompress lines are the same bytes. The receipt row
`E8|variant=mix|…|decoder_src=12918` records the size of the `7e6c865` blob (the workflow computes
`dec=$(wc -c < hp_mix.rs)`, hutter-tournament.yml:81). The vendored file is the `f91bb2c` blob, as the
task names it; built from this directory it prints `decoder_src_bytes=13074`.

## 2. Trained HRM weights: what was searched (MEASURED, 2026-10-17)

Result: **no trained HRM checkpoint of the owner is present in any place listed below**, and the
gnn-sidecar cube `9859b576` manifest likewise records no HRM checkpoint on ACER (`docs/handoffs`).
Nothing is pinned and nothing is ported.

| Where | How | Result |
|---|---|---|
| GitHub repos of JesseBrown1980 named or described as HRM | GitHub search `user:JesseBrown1980 fork:true HRM in:name`, `… fork:true hrm`, `… fork:true "hierarchical reasoning"` | 1 repo each time: `JesseBrown1980/HRM` (fork, created 2026-05-16). The census list of 212 public repos (`scratchpad/census/gh-all.txt`) has the same single `HRM` entry. `git ls-remote` on `Asolaria-HRM`, `asolaria-hrm`, `HRM-checkpoint`, `HRM-weights`, `Asolaria-HRM-weights` under JesseBrown1980: no public repo (the server asks for credentials). |
| `JesseBrown1980/HRM`, all refs, full history | `git fetch '+refs/*:refs/remote-all/*'`; `git log --all --name-only`; every blob under 300 bytes read for an LFS header | Refs: `heads/main` 74ecc8b, `pull/1/head` b9f00c7 (a third-party PR changing one line of `dataset/build_maze_dataset.py`); no tags. 90 objects; no path matching `step_*`, `*.pt`, `*.pth`, `*.safetensors`, `*.ckpt`, `*.bin`, `*.onnx`, `*.npz`, `*.npy`, `*.h5`, `*.pkl`, nor named `checkpoint*` (the extension-less name of the Sapient checkpoints below) or `all_config.yaml` (re-checked 2026-10-18: 35 distinct paths over all refs, 0 such names; the only extension-less paths are `LICENSE` and the three submodule entries); 0 LFS pointers; largest blob 99,852 bytes (`assets/hrm.png`). The repo-scoped releases API is not reachable from this session (policy 403); with no tags there is no published release. GitHub code search does not index forks, so it was not used as evidence for this repo. |
| Hugging Face `Jessedbrown` | `api/models?author=Jessedbrown&limit=1000`, `api/datasets?…`, `api/spaces?…`; then `api/<kind>/<id>/refs` and `api/<kind>/<id>/tree/<branch>?recursive=true` (cursor-paged) for every branch of every repo | 213 models, 7 datasets, 1 space; 425 branch trees; 49,694 path entries. Weight-like paths (same patterns as above): 58 distinct, none HRM: the only `.pt` is `services/gnn-sidecar/baseline_model.pt` (the L0 EdgeLevelGNN), the rest are `.gguf` files and `corpus.bin` / fixture `.bin` files. No `step_*` path. Re-scan of the saved trees on 2026-10-18 for the names the Sapient checkpoints use: 0 paths named `checkpoint*` or `all_config.yaml`; the 858 LFS files are, by extension, `.jpg` 769, `.gguf` 37, `.jpeg` 29, `.png` 19, `.wav` 2, `.bin` 1, `.html` 1, and none is extension-less. |
| Hugging Face `Jessedbrown/HRM` | `refs`, `tree/main?recursive=true&expand=true`, `commits/main` | One branch `main` = `74ecc8b5…`; 16 commits, the same ids as GitHub `main`; 32 files + 3 submodule entries, the same paths as GitHub HEAD; 0 LFS files; no weights. |
| Hugging Face `JesseBrown1980` | `api/users/jessebrown1980/overview` and the three author listings | The account exists ("Jesse Daniel Brown"); `numModels 0`, `numDatasets 0`, `numSpaces 0`. |
| This container | `find / -xdev` for `step_*`, `*.pt`, `*.pth`, `*.safetensors`, `*.ckpt` (outside virtualenvs), and `*hrm*` with weight extensions | Only the L0 / L1 / L2 / L4 GNN checkpoints and their copies; nothing HRM. Re-checked 2026-10-18: no file named `checkpoint`, `checkpoint.*` or `all_config.yaml` at any size; `*hrm*` files over 1 MB are only `libhrm_mtp-*.rlib` build outputs of `model/hrm-mtp`; `step_*` files are only two Python sources of the Google Cloud SDK. |

Not reachable from here: the ACER checkout `D:/Asolaria-HRM` (HEAD `ac15626f`, per `hrm-slow-fast.mjs:5`),
requested in the ACER handoff, item C.

Third-party checkpoints exist that the fork's README names (README.md:84-90): Hugging Face
`sapientinc/HRM-checkpoint-ARC-2` (`checkpoint`, 2,250,983,821 bytes, LFS sha256 `58719e51da6cd7712eb4197f908fbfdc88403ee48c42a3a92bab9f9c968df64d`),
`sapientinc/HRM-checkpoint-sudoku-extreme` (109,123,938 bytes, `0befd4a9f33a090d46df00728160ddbd69b81bcfdb8064ccfde0c867dd3836b9`),
`sapientinc/HRM-checkpoint-maze-30x30-hard` (109,103,458 bytes, `6a9d5e9e7112ef6e164611dfc9c6a7825a968d766d0a0a8c4b3645f6c0507abe`),
each with an `all_config.yaml` (MEASURED: `api/models/sapientinc/<repo>/tree/main`). They were trained by
Sapient, not by the owner; they were not downloaded, pinned or ported. Whether they stand in for the
owner's HRM is an owner decision (OWNER-RULES 2 names the owner's own trained checkpoints).

### What a Rust port would need, once a checkpoint exists (CODE)

- **The checkpoint**: `torch.save(train_state.model.state_dict(), <checkpoint_path>/step_<N>)`
  (pretrain.py:190-196), a file named `step_<N>` with no extension, plus `all_config.yaml` in the same
  directory (pretrain.py:350-353; evaluate.py:34 reads it). The saved module is
  `ACTLossHead(HierarchicalReasoningModel_ACTV1)` (pretrain.py:121-126), compiled with `torch.compile`
  unless `DISABLE_COMPILE` is set (pretrain.py:127-128), so keys carry `_orig_mod.model.inner.` or
  `model.inner.` (evaluate.py:47-50 strips `_orig_mod.`). Read it with a restricted unpickler, pinned by
  sha256, as `model/l0-edge/tools/quantize.py` does.
- **The dataset metadata** that sizes the model: `vocab_size`, `seq_len`, `num_puzzle_identifiers`
  (pretrain.py:114-116, from the training data directory via `puzzle_dataset.py`).
- **Tensors** (hrm_v1.yaml: hidden 512, heads 8, head_dim 64, expansion 4, H_layers 4, L_layers 4,
  puzzle_emb_ndim 512): per block `self_attn.qkv_proj.weight` [1536, 512], `self_attn.o_proj.weight`
  [512, 512], `mlp.gate_up_proj.weight` [3072, 512], `mlp.down_proj.weight` [512, 1536]
  (layers.py:109-110,141-144; inter = 256·⌈round(4·512·2/3)/256⌉ = 1536), 3,407,872 weights per block,
  27,262,976 over the 8 blocks of `H_level` and `L_level`; `embed_tokens.embedding_weight` [vocab, 512],
  `lm_head.weight` [vocab, 512], `q_head.weight` [2, 512] + `q_head.bias` [2], buffers `H_init` [512],
  `L_init` [512], `puzzle_emb.weights` [num_puzzle_identifiers, 512] (hrm_act_v1.py:112-138;
  sparse_embedding.py:18-20). RoPE cos/sin are non-persistent and recomputed (layers.py:85-92).
- **Sequence layout**: `puzzle_emb_len` = ⌈puzzle_emb_ndim / hidden⌉ = ⌈512/512⌉ = 1 (hrm_act_v1.py:116);
  the puzzle embedding is placed before the token embeddings (line 158), so the carries are
  [batch, puzzle_emb_len + seq_len, 512] (lines 168-171); the logits drop the first `puzzle_emb_len`
  positions, `lm_head(z_H)[:, puzzle_emb_len:]` (line 208), and the Q-head reads position 0 (line 211).
- **Numerics to reproduce**: forward dtype bfloat16 (hrm_act_v1.py:57,106; weights cast to the input
  dtype, layers.py:59), RMSNorm in float32 with `rsqrt` (layers.py:151-157), RoPE in float32
  (layers.py:30-40,85-92), non-causal attention through `flash_attn_func` (layers.py:7-11,130), SiLU
  gating (layers.py:146-148), embedding scale √512 (hrm_act_v1.py:109,166), and at evaluation 16 ACT
  steps per batch with no early halt (hrm_act_v1.py:259-268: outside training `halted = steps >= 16`).
  A parity referee would run the vendored code; `flash_attn` is CUDA-only.

MEASURED: the vendored code does not import in the estate's torch environment
(`scratchpad/torchvenv/v/bin/python -I -B`, torch 2.14.1+cpu): `models.hrm.hrm_act_v1` →
`ModuleNotFoundError: No module named 'pydantic'`; `models.layers` → `No module named 'flash_attn'`;
`models.losses` and `models.common` import. Nothing was trained or run.

## 3. What the documents say HRM does (DOC, quoted)

- bigpickle-rebuild @ `c592599c` `src/hrm-slow-fast.mjs:1-2`: "HRM — Hierarchical Reasoning Model:
  slow-loop shape + fast-loop position. / Layer 3 of the prediction-capable federation stack."
  Lines 7-9: "Two recurrent modules: / Slow module (high-level, few iterations) — predicts trajectory
  SHAPE/FORM / Fast module (low-level, many iterations per slow step) — refines position". Lines 14-15:
  "This file is the DETERMINISTIC stub. Full HRM (trained model) lives at / D:/Asolaria-HRM/." Line 18:
  "Pure functions. No model load at this layer." Line 40: "When the HRM model is trained + wired
  (D:/Asolaria-HRM), this swaps in."
- what-is-asolaria (reductions) @ `29307bfe` `canon/HRM-MTP-THOUGHT-GEOMETRY-INTEGRATION.md`
  (sha256 `4409f055…`): line 7 "**Layer 4 = HRM inside the LLMs**"; line 27 "the real Sapient
  `sapientinc/HRM` fork is cloned with a CPU-torch venv (`pretrain.py`, `evaluate.py`,
  `config/cfg_pretrain.yaml` present) — but **zero `.pt`/`.ckpt`/`.safetensors` weights on disk →
  training was never run.**"; line 31 "Run `pretrain.py` → produce an HRM checkpoint → swap it in where
  the stub marks it"; line 33 "**HRM = the control layer** (slow plans the shape, fast executes)".
- ASOLARIA-AS-NEURAL-NETWORK @ `4cc7624f` `canon/laws/LAW-ASOLARIA-NEURAL-NETWORK.md:36`: "**HRM inside
  the LLMs** — hierarchical reasoning recurrence in the model layer (HRM = Sapient two-timescale
  recurrence, the academic cousin of LAW-RECURRENCE-IS-MIND)."
- Universe simulator @ `3f9f42da` `books/operator-laws/JESSE-LAWS.md:499-505`: "## Law 25 — The HRM
  Slice Agent (two rates: slow picks the level, fast predicts) / *Frame (Jesse):* HRM +,0,− at 3, 27,
  rime. / … the slow module routes each symbol to a level (deep context / mid / base floor; the halt is
  the 0), the fast module predicts inside it. Measured: 99% routed deep, hierarchical bpc = 3.5328,
  bounded memory. (The HRM pattern proper — nested planner/worker recurrence — is this same two-rate
  freeze, scaled.)" (that agent is brought in by `model/hrm-mtp`).
- bigpickle-rebuild `seal-hrm-gpu-ok-cosign-2026-05-26.mjs:18,25-29`: `gate: 'HRM_GPU_OK'`,
  `brain_load_pairing: 'HRM_descriptor_+_frozen_Gemma_TOGETHER'`, `hrm_descriptor_state:
  'hrm_source_installed_d_drive_absorbed_descriptor_only_2026-05-16_fingerprint_8e636c1ff47c183f'`,
  `cpu_smoke_proven: 'tiny_58850_param_HRM_solved_5x5_maze_path_length_12_fingerprint_75c4e452d225df9f'`.
  No artifact with either fingerprint was found (`scratchpad/universe/hrm.md` §4).
- The owner's live cosign chain (`scratchpad/cosign-check/COSIGN_CHAIN.ndjson`, delivered by the owner
  2026-10-17, sha256 `39aaa803…`, read in place, not copied; only these fields are quoted): seq 252
  (2026-05-24): `official_checkpoint_present: false`, `cpu_smoke_proof_present: true`,
  `hrm_root: "D:/Asolaria-HRM"`; seq 3363 (2026-05-26, gate `HRM_GPU_OK`):
  `gates_still_pending_install_actions` includes `dataset_or_checkpoint_ready_via_descriptor_carry_replay`.
  The fingerprint `75c4e452d225df9f` occurs in four rows (seq 231, 232, 252, 3363) as a reference; seq 231
  names it for a file under `D:/Asolaria-HRM/`. `8e636c1ff47c183f` occurs only in seq 3363.
- The fork's README (Sapient's text) @ `74ecc8b5` `README.md:7`: "two interdependent recurrent modules:
  a high-level module responsible for slow, abstract planning, and a low-level module handling rapid,
  detailed computations. With only 27 million parameters …"

### What the vendored HRM code computes (CODE, `models/hrm/hrm_act_v1.py`)

Input tokens and a puzzle id are embedded (lines 146-166). Two stacks of 4 post-norm transformer
blocks, `H_level` and `L_level` (lines 60-99, 133-134), keep carries `z_H`, `z_L` (lines 15-18). Per
call, without gradient, for `H_cycles` = 2 outer steps the L stack runs `L_cycles` = 2 times on
`z_L + (z_H + input)` and the H stack then runs once on `z_H + z_L`, leaving out the last L and H
update (lines 189-198); one more L update and H update then run with gradient (lines 202-204). Outputs:
`lm_head(z_H)` logits for the `seq_len` input positions (the first `puzzle_emb_len` = 1 position, the
puzzle embedding, is dropped, line 208) and Q-head `(q_halt, q_continue)` from `z_H[:, 0]`, the puzzle
position (lines 206-213).
The ACT wrapper repeats this up to `halt_max_steps` = 16; in training it halts a sequence when
`q_halt > q_continue` with exploration and builds a target Q from a second inner pass (lines 240-283);
the loss is stable-max cross-entropy plus 0.5·(Q-halt + Q-continue BCE) (losses.py:24-31,40-101).
The model is a trained-weights network: its output is defined only together with a checkpoint.

## 4. hp_mix (CODE, `vendor/asolaria-cube-cloud/hutter/variants/mix/hp_mix.rs`)

DOC: the file header (lines 1-7) "dep-free lossless codec, Hutter pre-test variant key="mix" …
logistic context mixing (lpaq-lite) over order-0..4 byte contexts + a bias input, mixed with an integer
(16.16 fixed-point) neural mixer whose weights are selected by the previous byte. Fully deterministic
(no RNG, no f64)". The owner's workflow labels it `class=GENERIC_CONTROL_CEILING|note=NOT_the_Omega_per_layer_Asolaria_stack`
(hutter-tournament.yml:88); the receipt row 5 carries `note=GENERIC_CONTROL_CEILING`. No commit of
asolaria-cube-cloud contains the string `hrm` (MEASURED, `git grep -i hrm $(git rev-list --all)`: 0
files); hp_mix and the HRM fork share a row of the wiring map, not code.

What it computes: each byte is coded as 8 binary decisions, high bit first, with `node` = 1 followed
by the bits seen so far (lines 289-297). Five 12-bit probability tables, all starting at 2048: order 0
indexed by `node` (256 entries), order 1 by previous byte and `node` (65,536), orders 2-4 by
multiplicative hashes of the previous 2, 3, 4 bytes and `node` (4,194,304 entries each) (lines 60-67,
93-97, 133-144, 210-227). The five probabilities go through `stretch` (inverse of the 33-point
`squash` table, lines 24-55) and, with a constant bias input 256, into a 6-weight dot product whose
weight set (16.16 fixed point; 256 sets chosen by the previous byte; context weights start at
65536/5 = 13107, bias weight at 0) gives `d = dot >> 16`, clamped to ±2047, and `p = squash(d)`
clamped to [1, 4094] (lines 100-109, 146-166). After each bit, each of the five table entries `t`
read for it moves by `(4096·bit − t) >> 4` (lines 171-197), and each mixer weight by
`(input · (4096·bit − p)) >> 12`, where `p` is the mixer output, clamped to ±2²⁴ (lines 198-206).
A 32-bit binary arithmetic coder (lines 233-278) codes the bit with `p`; the archive
is the 8-byte little-endian input length plus the coder bytes (lines 283-303). `decompress` runs the
same predict/update path (lines 305-323). The report row prints `ratio_x` and `bpc` as integers ×10⁴,
truncated (lines 330-338), and `decoder_src_bytes` = the size of the source file named by `file!()`
(lines 325-328).

Build: Cargo builds the vendored file unchanged as the `hp_mix` binary (`Cargo.toml` `[[bin]]`).
`unsafe_code = "forbid"` is set in `[lints.rust]`. Clippy 1.81 reports two lints on the file, allowed
by name in `[lints.clippy]`: `unnecessary_cast` (line 104) and `manual_clamp` (lines 160-164, 203-204).
Upstream builds with `rustc --edition=2021 -O` (hutter-tournament.yml:71); its own clippy workflow
needs a `Cargo.toml`, which the repository does not have (rust-1.81-clippy-verification.yml:47-86).
The vendored file has no `#[test]`; its upstream tests are the workflows above and `verify` mode
(lines 345-353). Its float rule (rust-1.81-clippy-verification.yml:88-136, whole-line comments
stripped) finds no `f32`/`f64` in it.

## 5. Measurements (MEASURED, this container, 2026-10-17, Rust 1.81.0, release build)

enwik data reused from `scratchpad/data-hrm-mtp/` (fetched there by the `model/hrm-mtp` build, not
downloaded again): `enwik8` sha256 `2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8`
(100,000,000 bytes), `enwik9.zip` sha256 `99cdb5ac84392252d3f0912ccedd195bc95bd80cbef3b0cdf2eee4ad9a3b7a51`
(member `enwik9`, 1,000,000,000 bytes). enwik9 was streamed (`unzip -p … | hp_mix compress /dev/stdin …`),
its archive held in `/dev/shm`, and the decompressed stream hashed through a pipe, so no 1 GB file was
written to disk.

Recipe = hutter-tournament.yml:75-79 / enwik9-two-system.yml:66-69: `hp_mix compress`, then
`hp_mix decompress` as a separate run, then sha256 of input and output.

| Corpus | Input sha256 | Archive bytes | Archive sha256 | Restored sha256 = input | Wall time (s), compress / decompress |
|---|---|---|---|---|---|
| enwik8 (100,000,000 B) | `2b49720e…24a8` | **26,421,998** | `4c1068e16725d8f308a9c1d13b5f44c3df0899e4ca56807e018b934e5bef666d` | yes | 54 / 90 |
| enwik9 (1,000,000,000 B) | `159b8535…44bc` | **236,419,493** | `97b87aa63f5b6310be50247e78ba6014ee80d588dc9a6e8b47db845042746eea` | yes | 775 / 1201 |

Rows hp_mix printed, then the receipt's rows (vendored `results/FABLE5-HUTTER-PRETEST-ARC-2026-07-17.hbp:5,7`):

```
PILOT|mode=compress|input_bytes=100000000|archive_bytes=26421998|decoder_src_bytes=13074|total_bytes=26435072|ratio_x=3.7847|bpc=2.1137|roundtrip=0
DECOMPRESS|archive_bytes=26421998|output_bytes=100000000
PILOT|mode=compress|input_bytes=1000000000|archive_bytes=236419493|decoder_src_bytes=13074|total_bytes=236432567|ratio_x=4.2297|bpc=1.8913|roundtrip=0
DECOMPRESS|archive_bytes=236419493|output_bytes=1000000000

E8|variant=mix|archive_bytes=26421998|decoder_src=12918|bpc=2.1138|roundtrip_exact=1|note=GENERIC_CONTROL_CEILING|json=0
E9|system=mix|archive_bytes=236419493|bpc=1.8914|roundtrip_exact=1|sha=159b85351e5f76e6...|json=0
```

Both archive sizes equal the receipt's mix rows exactly, and both restore byte-exact. The rows are
committed in `tests/fixtures/hp-mix-enwik.hbp`. Wall times were taken with `date +%s` on a 4-core
container shared with other jobs (load average about 9: host context, as a whole number), so they
are not speed figures for hp_mix.
`decoder_src` in the receipt (12,918) is the size of the `7e6c865` blob (section 1); this build prints
13,074, the size of the vendored `f91bb2c` blob.

The `bpc` field differs in the fourth decimal between the receipt and hp_mix@f91bb2c for the same
archive size: the receipt value comes from `python3 -c "print(f'{$arch*8/1e8:.4f}')"`
(hutter-tournament.yml:83; enwik9-two-system.yml:72 with `1e9`), which rounds; hp_mix.rs:334 at
`f91bb2c` truncates. In integers: enwik8 26,421,998·8·10⁴ / 10⁸ = 21137 remainder 59,840,000 of
100,000,000, so truncation gives 2.1137 and rounding gives 2.1138; enwik9 236,419,493·8·10⁴ / 10⁹ =
18913 remainder 559,440,000 of 1,000,000,000, giving 1.8913 and 1.8914. Test
`measured_enwik_archives_match_the_receipt_mix_rows` checks both with integer arithmetic.

Small inputs (`tests/fixtures/hp-mix.hbp`, written by `tools/hp_mix_referee.py`, a stdlib mirror of
hp_mix.rs; `python3 -I tools/hp_mix_referee.py` took 11 s): empty → 12 archive bytes; `A` → 12;
`AB`×20 → 29; 65,536 LCG bytes → 65,663; `vendor/HRM/LICENSE` (11,357 bytes) → 4,520 (bpc 3.1839).
The binary's `verify`, `compress` and `decompress` rows and archive sha256 equal the referee's for all
five (`cargo test`).
