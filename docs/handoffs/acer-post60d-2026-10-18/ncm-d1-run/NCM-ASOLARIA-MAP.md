# NCM (arXiv 2610.14162) against Asolaria: what was measured, what is derived, what would test it

Intake by ACER-CLAUDE-FABLE5, 2026-10-18. Every claim carries a tag:
- **MEASURED**: read or computed from bytes today, with the receipt row named.
- **NAMED**: reported by the paper's authors and not reproduced here.
- **CONJECTURE**: my own derivation. It stays a conjecture until the named run passes.

Nothing was trained, evaluated or installed. The intake fetched, hashed and read files only (E=0).

## 1. What arrived (MEASURED)

- **Paper:** *Next-Concept Modeling: Fast, Parallel Coarse-to-Fine Text Generation*, Kumbong et al. (Hazy Research / Stanford), arXiv 2610.14162v1, dated 2026-10-09.
  The PDF is 1,343,534 B, sha256 `708a029c7f53d4f9…`.
- **Code:** `github.com/HazyResearch/ncm`, MIT, HEAD `c70274273f489abc73832b2b98584a8483b6b203`. It has 5 commits and 39 files.
  All 39 working files equal their git blobs (`BLOBPARITY`, 39/39).
- **Weights:** `hazyresearch/ncm-checkpoints`, pinned at revision `d342ce8a…`. 35 files, 8.00 GB in total.
- **Data:** `hazyresearch/ncm-datasets`, pinned at revision `6580ba41…`. 30 files, 22.74 GB in total.
  Both manifests are shipped as HBP rows. Each row carries the file's LFS sha256, so any download can be certified.
- **Configs:** the 5 shipped `config.yaml` files I fetched (xsum, wmt14, tinystories, lm1b-small, sudoku-hard) are byte-identical to the repo's `config/eval/*.yaml` (`CFGPARITY2`, 5/5).
  At first they looked different. That was only because Git on ACER rewrites line endings at checkout (`core.autocrlf=true`); see section 6.

## 2. How the method works (MEASURED from `models/quant.py`)

1. **Tokenizer:** an encoder maps tokens to a float latent `z` with d=384.
2. **Level loop, coarse to fine.** For each level k, with length ℓ_k growing up to L:
   1. area-pool the current residual down to ℓ_k positions;
   2. pick the nearest codebook vector (float L2 `argmin`);
   3. linearly upsample it back to L, then pass it through a small residual conv (`Phi`, ratio 0.5);
   4. add it to the reconstruction `z_hat` and subtract it from the residual.
3. **Codebooks:** updated by EMA, not by gradients. Nested ("fine-level") dropout trains the coarse levels to carry meaning on their own.
4. **Generator:** a transformer predicts level 1, then level 2 given level 1, and so on. All positions within a level are sampled in parallel, so generation takes **one forward pass per level**.

## 3. The level schedules and the right grain (MEASURED, `NCM-LEVELS.hbp`)

| config | K (levels) | schedule | L | total codes | codes per token |
|---|---|---|---|---|---|
| owt | 32 | 1, 4, 9, 16, …, 1024 (the squares k²) | 1024 | 11,440 | 11.17 |
| lm1b / tinystories | 12 | 1, 8, 16, …, 128 | 128 | 641 | 5.01 |
| wmt14 | 11 | 1, 4, 8, …, 64 | 64 | 313 | 4.89 |
| xsum | 9 | 4, 6, 10, …, 48 | 48 | 200 | 4.17 |
| sudoku | 12 | 1, 2, 4, 6, 9, …, 89 | 89 | 322 | 3.62 |

**Grain and direction:** NCM writes **more** symbols than the text has, between 3.6× and 11.2× more.
Its speed comes from **sequential depth**: K passes (32 for OWT) instead of L (1,024) for autoregressive decoding, or many passes for diffusion.
It does not come from fewer symbols. **Steps are not symbols**, the same law as "count is not range" and "addressing is not compression".

The paper's speedups (21× LM1B, 10× OWT, 31× XSum, against the strongest diffusion model) are **NAMED**. They are wall-clock and NFE comparisons at matched quality.

## 4. Derivations against the Asolaria kernel (CONJECTURE until the runs pass)

### D1. Balanced ternary is the exact-integer case of residual quantization
**Claim.** Take an integer x with |x| ≤ (3^K − 1)/2. Run coarse-to-fine residual quantization with:
- one dimension;
- level k (from k = K−1 down to 0) using the codebook {−3^k, 0, +3^k};
- nearest-code choice at each level.

Then the residual is exactly 0 after K levels, and the chosen indices are exactly the balanced-ternary trits of x.

**Steps:**
1. Invariant: before level k, |r| ≤ (3^(k+1) − 1)/2.
2. Choose t = round(r / 3^k), which lies in {−1, 0, +1}.
3. 3^k is odd and r is an integer, so r / 3^k is never exactly ±½. There are no ties, so the choice is unique.
4. The new residual satisfies |r − t·3^k| ≤ (3^k − 1)/2, so the invariant holds at the next level.
5. At k = 0 the bound is (3^0 − 1)/2 = 0, so the residual is 0. QED.

**Where it can fail:**
- **(a) Uncentred digits.** With digits {0, 1, 2}, greedy nearest-code is not digit extraction. The centring on the ground point is load-bearing: 3 trits hold 27 states but span only −13..13.
- **(b) Float.** NCM's float `argmin` can flip near ties and its EMA codebooks drift. The integer form has neither problem.
- **(c) Out of range.** Above (3^K − 1)/2 the final residual is not 0.

**What D1 gives.** NCM reconstructs 99.99% of OWT tokens (NAMED). The integer ternary form reconstructs 100% by construction, so `unprism(prism(x)) == x` style integrity is available.

**Run that measures it:** a Rust 1.81 crate that reuses `tribit/mod.rs` via `#[path]`, integer only. It enumerates every x in ±(3^13 − 1)/2, which is 1,594,323 values, and checks three things:
1. the greedy residual codes equal tribit's trits;
2. the residual is 0;
3. it counts the failures at x = ±797,162, just out of range.

**Expected:** 1,594,323/1,594,323 exact in range, and nonzero residual out of range. `cargo +1.81 clippy --release -- -D warnings` must exit 0.

**D1 result, run 2026-10-18 on the operator's direction (added beside; the text above is unchanged): MEASURED for K = 1..13, exhaustive.**
- **Gate:** crate `d1-ternary-rq`, built with Rust 1.81. `cargo +1.81 clippy --release -- -D warnings` exits 0, with `clippy::float_arithmetic` denied across the whole crate, the tribit module included. Neither file names a float type.
- **Exactness:** in range, every value at every K came back exact, with residual 0 and all three tribit cross-checks agreeing (unpack, pack, signed re-sum). For K=13 that is **1,594,323/1,594,323**, with **0 ties** anywhere.
- **The controls failed where they should:**
  - out of range: nonzero residual 1,594,322/1,594,322;
  - centred codebook on the uncentred range: exact only for 0..H, 797,162/1,594,323 (count is not range; K=3 gives 14/27, which is the −13..13 law);
  - corrupted codes: rejected 5/5;
  - forced ties: detected 3/3.
- **Hash:** the K=13 code stream (20,726,199 B) has sha256 `3cae23466ec81a87…`. It came out the same on two runs.
- **A pattern the run turned up:** with *uncentred* digits {0, s, 2s}, greedy coarse-to-fine keeps exactly **2^(K+1) − 1** values at every K from 1 to 13. For K=13 that is 16,383 of 1,594,323.
  So without the centring, the ternary capacity collapses to a binary-sized set. The count is MEASURED; the explanation is CONJECTURE.
- **Scope:** this proves the addressing is exact. It does not prove that coarse trits carry meaning.

### D2. A ternary multiscale schedule on the 27-cube
**Proposal.** Use levels 1, 3, 9, 27, so L = 27 = 3³.
- **Down:** the exact integer sum over each block of 3. Carry the remainder and never take the mean, so there is no division.
- **Up:** repeat the value.

That gives 40 codes for 27 positions (1.48 per position), again an expansion.

**Caveat (2026-10-08 rung law).** Exactness here is trivial: the last level has full length, and any finest codebook that covers the residual range absorbs everything.
An exact round trip proves the *addressing*. It does **not** prove that the coarse levels carry *meaning*. In NCM, meaning comes from training with nested dropout, and the authors show it only qualitatively in Appendix H (NAMED).
In Asolaria, axis meaning is assigned, not learned. So no arithmetic round trip can transfer NCM's "concepts" onto D1..D3. This was the error I made on 2026-10-08; do not repeat it.

**Run that measures it:** the same crate with the 1/3/9/27 schedule over random and exhaustive small inputs.
Report three things:
1. exact rate;
2. the per-level residual ranges;
3. how often the coarse levels alone already reproduce the block sums.

### D3. Exact text from NCM codes plus a correction list
**Claim.** NCM codes plus a list of the positions the tokenizer gets wrong, with their true tokens, give an exact round trip. That turns a lossy carrier into a hash-certifiable one: integers with the remainder carried.

**Size:** about 0.01% of positions for OWT (NAMED), and 1.21% for WMT14 (NAMED: 98.79% accuracy).

**Run:** the released tokenizer over the released test sets, counting mismatches. This needs the operator's direction (E=0), a sandbox (section 5) and preferably a GPU.

## 5. Safety and integrity notes (MEASURED)
- **Pickles.** The checkpoints are `.pt` files and the datasets are `.pickle` files; both are Python pickles. Unpickling runs code.
  Load weights only with `torch.load(..., weights_only=True)`, and open datasets only in a sandbox. Treat both as **untrusted data**, not trusted code.
- **Training code is not released.** The repo has evaluation only (`evaluate.py`, `scripts/eval_shard.py`, `scripts/eval_merge.py`).
  The paper's training budget (13.36B token positions on LM1B, NAMED) can't be reproduced from this repo.
- **The OWT weights are not on Hugging Face.** The README links `owt/tokenizer.pt` and `owt/generator.pt`, but the pinned tree holds only `owt/TODO.md` (5 B).
  That means not in this revision; it does not mean they never existed.
- **Paper vs shipped configs.** I read Table 5 through a page reader, so check these two against the PDF before relying on them:
  - **XSum:** the shipped config has K=9 levels (4, 6, …, 48). Table 5 says K=8.
  - **OWT:** the repo config has codebook 8,192. Table 5 says 4,096.

## 6. Mistake avoided, recorded beside
A first comparison said the shipped configs differed from the repo, 0 out of 5 identical. The cause was CRLF: `core.autocrlf=true` on ACER added 113 to 146 CR bytes per file.
With the CRs removed, and against the git blob, all 5 are identical. The repo was then re-cloned with `core.autocrlf=false`, and all 39 files were proven equal to their blobs.
**Ship blob bytes, never Windows working-tree bytes.**

## 7. For opus55 to refute (not declared true)
1. D1's no-tie step: is r / 3^k = ±½ really impossible for every integer r? (It rests on 3^k being odd.)
2. D1's invariant at the top level: for |x| ≤ (3^K − 1)/2, does |r| ≤ (3^K − 1)/2 hold before level K−1?
3. Section 3's grain: is "codes per token" the right comparison, or does the block-diagonal attention make the per-level cost scale with ℓ_k rather than with L?
4. D2: is any integer down/up pair that is exact *and* non-trivial (coarse levels informative) even possible without learning?
5. Section 5: re-read Table 5 from the PDF itself, not the HTML reader.
