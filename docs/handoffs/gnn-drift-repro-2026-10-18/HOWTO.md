# How to reproduce: GNN P3 score drift and training reproducibility (ACER, 2026-10-18)

Seat ACER-CLAUDE-FABLE5 (pid 8467a937cba309f7). Every number below is in the sealed receipts in this zip (`*.hbp` + `.sha256`).
Tags: MEASURED = ran on ACER. NAMED = relayed from the cloud and not run here. CONJECTURE = not yet run.

## What you need
- Python 3.13, **torch 2.13.0+cpu**, **torch_geometric 2.7.0**, numpy 2.4.3. These are ACER's versions; others change the low-order bits.
- The gnn-sidecar code and corpus from the earlier zips (cube `9859b576`): `models/*.py`, `gslgnn_w9_3_corpus.json`.
- The three retrained checkpoints from the P3 zip: `prototype_model_strat_2026-10-18.pt`, `contrastive_model_strat_2026-10-18.pt`, `gslgnn_w9_3_strat_2026-10-18.pt`.
- **Paths:** each script has ACER's Windows paths in its first lines (`SIDECAR`, `CK`, the corpus path). On another machine, change only those constants.
  Doing that changes the script's file hash, so compare training inputs by the model files plus the corpus *content* hash (step 3), not by the script hash.
- On Windows, run these from Git Bash or WSL, **not PowerShell** (operator rule). Each `VAR=value python ...` line sets the variable for that one run.

## Step 1: is scoring deterministic? (`rescore_determinism.py`)
    python rescore_determinism.py
Expected on ACER (AVX2, MKL): **9/9 `matches_receipt=1`**. With 4 threads and 1 thread, the bytes are identical:
- L1 `38b043191a5e62e2`
- L2 `8bc74ee31839acab`
- L4 `993cb532f9944bbf`

## Step 2: which library's instruction set moves the bits? (`rescore_isa.py`, `isa_diff.py`)
Run one fresh process per variant. Set `ISA_OUT=<dir>` so the scores are saved as `.npy`.

    python rescore_isa.py native
    ATEN_CPU_CAPABILITY=default python rescore_isa.py aten_default
    MKL_ENABLE_INSTRUCTIONS=SSE4_2 python rescore_isa.py mkl_only_down
    ONEDNN_MAX_CPU_ISA=SSE41 python rescore_isa.py onednn_only_down
    ATEN_CPU_CAPABILITY=default MKL_ENABLE_INSTRUCTIONS=SSE4_2 ONEDNN_MAX_CPU_ISA=SSE41 python rescore_isa.py all_forced_down
    python isa_diff.py        # compares native vs all_forced_down

Expected on ACER (MEASURED):

| Variant | L1 | L2 | L4 |
|---|---|---|---|
| native | 38b04319… ✅ | 8bc74ee3… ✅ | 993cb532… ✅ |
| aten_default | ✅ same | ✅ same | ✅ same |
| onednn_only_down | ✅ same | ✅ same | ✅ same |
| mkl_only_down | `bab3c3515120259d` | `5a6ac21cbc18652a` | `56a5278160fdbfe3` |
| all_forced_down | same as mkl_only_down | | |

How big the MKL drift is: 9–27 edges of 315,249, at most 51 ULP, at most 2.3e-10, **0 decisions flipped**, 40/40 benign caught either way.
**So the cause is MKL's instruction-set path.** The cloud's AVX-512 Xeon reproduces ACER's hashes 3/3 with `MKL_ENABLE_INSTRUCTIONS=AVX2 MKL_CBWR=AVX2` (NAMED, relayed).

## Step 3: did both machines train on the same inputs? (`train_inputs.py`, `corpus_identity.py`)
    python train_inputs.py          # sha256 of each model file, the trainer, and PyG's gcn_conv.py
    python3 corpus_identity.py      # stdlib only
Expected:
- **Corpus content sha** `3b76c29d5ae3b55525ed356f41c19f011e42ba0870f44e2524de27786a803af8`. This ignores line endings and whitespace.
  The file bytes are `7e7d0406…` with CRLF (ACER) or `0f123581…` with LF. LF equals the old GSLGNN manifest, so the corpus was never edited.
- Model files (all LF):
  - `prototype_gnn.py` `4edb9439…`
  - `contrastive_gnn.py` `349a30c0…`
  - `gsl_gnn.py` `783b9b50…`
  - `models/__init__.py` `51b739fb…`
- Trainer: `retrain_stratified.py` `c66ca57d…`, but only if unedited. See the paths note above.
- Seed 1792, 300 steps, `split_sha16=27152b521ce28662`.
If any of these differ, the training differs no matter how the CPU is pinned.

## Step 4: is training reproducible? (`retrain_stratified.py`, `retrain_det_wrapper.py`)
**Heavy:** about 2–3 minutes and a lot of RAM per run. One background run on ACER was stopped for low system memory after it had finished.

    python retrain_stratified.py <outdir_a>      # default threads (4 on ACER)
    python retrain_stratified.py <outdir_b>
    python retrain_det_wrapper.py <outdir_c>     # 1 thread + torch.use_deterministic_algorithms(True), runs the trainer unchanged
    python retrain_det_wrapper.py <outdir_d>

Expected on ACER (MEASURED):
- With 4 threads, the checkpoint bytes **differ run to run**. In one re-run, L4 had 21 distinct values against 20. Every count-based result is identical: AUC 1.0 on every split, 6/6 benign caught, 1/47,282 false alarms.
- With the wrapper, the bytes are **identical run to run**:
  - L1 `9166cdbe430e5b55…`
  - L2 `be3ba29f802067e8…`
  - L4 `7a920ac47fe5eb8d…`
- Across machines: the wrapper plus `MKL_ENABLE_INSTRUCTIONS=AVX2 MKL_CBWR=AVX2` should give those same three hashes (CONJECTURE, not yet run).
  If not, the remaining suspect is the torch version (2.14.1 vs 2.13.0) in the backward kernels.

## Raw logs in this zip
- `retrain-rerun-4threads.log`: the second 4-thread retrain, whose bytes differed.
- `retrain-deterministic-x2.log`: both wrapper runs, identical.

## Verify this zip
    sha256sum -c SHA256SUMS
`CUBE.hbp` lists every file with its sha256 and a merkle root.
