# model/ncm — Next-Concept Modeling (arXiv 2610.14162)

This directory brings the released Next-Concept Modeling (NCM) code and the receipts for its
weights and data into the tree, so later work can build on a pinned, hash-checked copy. Nothing
here was trained, evaluated, installed or unpickled.

Every number in this directory is tagged: **MEASURED** = computed here on 2026-10-18, with the
command stated in `PROVENANCE.md`; **NAMED** = reported by the paper's authors and not reproduced
here; **CONJECTURE** = a derivation that has not passed its run.

## What NCM is

Next-Concept Modeling is a two-stage, coarse-to-fine framework for parallel text generation. A
multiscale residual vector-quantized tokenizer encodes a sequence into a hierarchy of discrete
codes, and a transformer predicts that hierarchy one level at a time, generating all codes within a
level in parallel. Generation therefore takes one forward evaluation per level rather than one per
token.

The upstream README states it this way (quoted, `vendor/ncm/README.md`):

> Next-Concept Modeling (NCM) is a two-stage framework for parallel text generation. A multiscale
> residual VQ tokenizer represents a sequence as a hierarchy of discrete codes, and a transformer
> predicts that hierarchy from coarse to fine. Positions within a level are generated in parallel,
> so generation requires one forward evaluation per level.

The paper abstract (quoted, arXiv 2610.14162v1, *Next-Concept Modeling: Fast, Parallel
Coarse-to-Fine Text Generation*, Kumbong et al.):

> Diffusion language models (DLMs) offer parallel sampling for faster generation than
> autoregressive models, an increasingly important advantage as inference becomes a dominant
> computational workload. However, DLMs degrade quickly with fewer sampling steps, process the full
> sequence at every step, and require many passes over the dataset to reach good quality. We
> introduce Next-Concept Modeling (NCM), a two-stage, coarse-to-fine framework: a multiscale
> residual VQ-VAE encodes text into a hierarchy of discrete codes, and a transformer generates one
> level at a time, predicting all codes within a level in parallel. At matched parameter scales, NCM
> achieves better generative perplexity than the strongest DLM baseline on LM1B while running 21×
> faster. On OpenWebText, NCM is competitive with the strongest DLM while running 10× faster; on
> XSum, it matches the strongest DLM's ROUGE-L while being 31× faster. On the reasoning task of
> Sudoku, NCM outperforms autoregressive and diffusion baselines across all difficulty levels, using
> fewer function evaluations.

The speedups (21× / 10× / 31×) and the reconstruction and accuracy figures are the authors' claims
(**NAMED**); they are not reproduced here. The released repository ships evaluation code only — there
is no training script — so the training budget cannot be reproduced from it.

## Level schedules (MEASURED, recomputed from the vendored `config/eval/*.yaml`)

Each config defines K levels with growing length up to L. "Total codes" is the sum of the level
lengths; "codes per token" is that total divided by L. NCM writes more symbols than the text has:
its speed comes from the small number of sequential passes (K), not from fewer symbols.

| Config | K | Schedule (level lengths) | L | Total codes | Codes/token | Codebook |
|---|---:|---|---:|---:|---:|---:|
| owt | 32 | 1, 4, 9, 16, …, 1024 (the squares k²) | 1024 | 11,440 | 11.172 | 8192 |
| lm1b-small / medium / large | 12 | 1, 8, 16, 24, 32, 40, 52, 64, 76, 92, 108, 128 | 128 | 641 | 5.008 | 8192 |
| tinystories | 12 | 1, 8, 16, 24, 32, 40, 52, 64, 76, 92, 108, 128 | 128 | 641 | 5.008 | 4096 |
| wmt14 | 11 | 1, 4, 8, 14, 20, 26, 32, 40, 48, 56, 64 | 64 | 313 | 4.891 | 4096 |
| xsum | 9 | 4, 6, 10, 14, 20, 26, 32, 40, 48 | 48 | 200 | 4.167 | 4096 |
| sudoku-easy / medium / hard | 12 | 1, 2, 4, 6, 9, 13, 18, 26, 37, 50, 67, 89 | 89 | 322 | 3.618 | 16 |

The full per-config rows are in `manifests/NCM-LEVELS.hbp`. Two config-vs-paper discrepancies were
recorded by the intake and should be checked against the PDF before use (MEASURED against an HTML
reader, not the PDF): the shipped XSum config has K=9 (paper Table 5 says 8), and the shipped OWT
config uses codebook 8192 (paper Table 5 says 4096). See `PROVENANCE.md`.

## What is vendored here

- `vendor/ncm/` — the full `HazyResearch/ncm` repository at commit
  `c70274273f489abc73832b2b98584a8483b6b203` (tip of `main`, the only branch; 5 commits). All 39
  tracked files, written from the git blobs (not copied from the intake) and byte-identical to them
  (**MEASURED**, 39/39 blob parity). Includes the repo's own `LICENSE` and `.gitignore`.
- `manifests/` — the three HBP receipts, byte-identical to the intake copies:
  `hf-ncm-checkpoints.hbp`, `hf-ncm-datasets.hbp`, `NCM-LEVELS.hbp`.
- `UPSTREAM.sha256` — sha256 of every vendored file (39 code files + 3 manifests); run
  `cd model/ncm && sha256sum -c UPSTREAM.sha256`.
- `PROVENANCE.md` — pins, the per-file blob/sha256 table, and every verification command and result.

The `.gitignore` inside `vendor/ncm/` is kept as a plain file. Its patterns apply only below that
directory and match none of the 39 vendored files (**MEASURED**, `git check-ignore`). Note that it
ignores `*.pt`, `*.pickle`, `*.bin`, `artifacts/` and `data/`, so any weight or data download placed
inside `vendor/ncm/` would be hidden from git.

## What is pinned only, not stored

The paper PDF, the weights and the datasets are **not** vendored. They are pinned by id, revision,
byte count and sha256 so any copy can be certified. See `PROVENANCE.md` for the full pins.

- **Paper** — arXiv 2610.14162 **v1**, 1,343,534 bytes, sha256
  `708a029c7f53d4f9f04ca5c93865afc9b3b5414acab3d7d9b887f313d04a5b4d`. Its license is the arXiv
  perpetual **non-exclusive** distribution license (`nonexclusive-distrib/1.0`), **not** a Creative
  Commons license, so it is pinned and not redistributed here. The abstract is quoted above under
  fair quotation.
- **Weights** — `hazyresearch/ncm-checkpoints` at revision
  `d342ce8aaea58830eef3b8ad473664673e41f692`, 35 files, **8.00 GB** (8,002,911,678 bytes). License
  MIT. Every row of `manifests/hf-ncm-checkpoints.hbp` was verified against the Hugging Face API
  (**MEASURED**, 35/35).
- **Data** — `hazyresearch/ncm-datasets` at revision
  `6580ba41a4b0a976dde876fbe84d25327617b0e6`, 30 files, **22.74 GB** (22,740,794,836 bytes). License
  MIT. Every row of `manifests/hf-ncm-datasets.hbp` was verified against the Hugging Face API
  (**MEASURED**, 30/30).
- **OWT weights are absent at the pinned revision.** The checkpoint tree holds only `owt/TODO.md`
  (5 bytes); `owt/tokenizer.pt`, `owt/generator.pt` and `owt/config.yaml` return HTTP 404 on `main`
  (**MEASURED**). The OWT *data* is present in the dataset repo. "Absent in this revision" does not
  mean the weights never existed.

To fetch and certify (only under the operator's direction):

```bash
hf download hazyresearch/ncm-checkpoints --revision d342ce8aaea58830eef3b8ad473664673e41f692 --include "sudoku/*" --local-dir artifacts
# then check each file's sha256 against the matching manifest row
```

## Safety: pickles are untrusted

The checkpoints are `.pt` files and the datasets include `.pickle` files; both are Python pickles,
and unpickling runs arbitrary code. **Load weights only with**
`torch.load(path, weights_only=True, map_location="cpu")`, and open any `.pickle` only inside a
restricted unpickler, never with a plain `pickle.load`, and preferably in a sandbox. Treat both as
untrusted data, not trusted code. Run any Python that touches downloaded files with `python3 -I`.

## License

Upstream code and the Hugging Face repositories are **MIT** (`vendor/ncm/LICENSE`, "Copyright (c)
2025 hermann kumbong"; both HF repos carry `license: mit`). The paper is under the arXiv
non-exclusive distribution license, as noted above.

## Derivation (rq/) and reproduction (repro/)

The Asolaria-side derivations against this method (D1–D3: balanced ternary as the exact-integer case
of residual quantization, a ternary multiscale schedule, and exact text from NCM codes plus a
correction list) are written up under `rq/` and `repro/`. D1 and D2 have now passed their runs and are
**MEASURED**; D3 stays **CONJECTURE** (it needs the released tokenizer, held at E=0).

### rq/ — derivations and their measuring runs

The `rq/` crate (`asolaria-ncm-rq`, Rust 1.81, integer only, `#![forbid(unsafe_code)]`) has landed and
its gates pass (fmt, clippy `-D warnings`, tests, no-float). It confirms **D1** — balanced ternary is
the exact-integer case of greedy residual quantization — over the full K=13 band: 1,594,323 /
1,594,323 exact reconstruction, 0 ties, the invariant held before every level (refute target 2), and
the map a bijection for every K from 1 to 13. It also answers refute targets 1 and 4, including an
exact and non-trivial integer lifting down/up pair for **D2** (coarse level = block floor-means). These
are **MEASURED**; see `rq/README.md`. **D3** (exact text from NCM codes plus a correction list) stays
**CONJECTURE**: it needs the released tokenizer over the test sets, held at E=0.

### repro/ — reproduction of the paper's released numbers

The `repro/` directory has landed with the sudoku/easy reproduction recipe, held at **E=0**: nothing
has been downloaded, loaded, unpickled or evaluated. It certifies the five sudoku/easy files against
the Hugging Face API by metadata only, and ships safe loaders — a static `pickletools` scan, a
restricted unpickler, and `torch.load(weights_only=True, map_location="cpu")` — all gated behind an
explicit operator go. The paper's released numbers (e.g. sudoku-easy ≈ 99.5%) remain **NAMED**, not
reproduced here. See `repro/README.md`.
