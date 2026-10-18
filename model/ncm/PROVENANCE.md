# Provenance: model/ncm

Tags: **MEASURED** = computed here on 2026-10-18 (command and result stated). **NAMED** = reported by
the paper's authors or by the ACER intake and not reproduced here. **CONJECTURE** = a derivation that
has not passed its run. Nothing was trained, evaluated, installed or unpickled for this directory.

## 1. Upstream code: `HazyResearch/ncm`

- Repository: `https://github.com/HazyResearch/ncm`, cloned 2026-10-18 with
  `git -c core.autocrlf=false clone` into `scratchpad/post60d-work/ncm/vendor/ncm` (read-only use).
- Pinned commit: `c70274273f489abc73832b2b98584a8483b6b203` ("update bibtex", committer date
  2026-10-14), tree `0e108d439909caf135d8985636c1925ed7c3dd05` (MEASURED, `git rev-parse HEAD^{tree}`).
- `git ls-remote https://github.com/HazyResearch/ncm.git` (MEASURED): `HEAD` and `refs/heads/main` are
  both `c70274273f48…`, so the pin is the current tip of the only branch. After checkout,
  `git rev-parse HEAD` equals the pinned id.
- `git log --all` (MEASURED), 5 commits, newest first:

  | Commit | Committer date | Subject |
  |---|---|---|
  | `c70274273f489abc73832b2b98584a8483b6b203` | 2026-10-14 | update bibtex |
  | `0d1ff5853fed…` (`0d1ff58`) | 2026-10-14 | add eval configs |
  | `54dc408a92d2…` (`54dc408`) | 2026-10-13 | Merge pull request #1 from iskhare/patch-1 |
  | `c37e7784b1b6…` (`c37e778`) | 2026-10-13 | Update citation and paper links in README |
  | `7034e23457cf…` (`7034e23`) | 2026-10-13 | release ncm |

- Unmerged refs (MEASURED, `git ls-remote`), not on `main` and not vendored, nothing from them is
  used here: `refs/pull/4/head` = `766e7d0043d439174e70cebd10c92d49b4b69d55`,
  `refs/pull/5/head` = `60c947b01510dedac7fe4d4797d9eade0e018d4c`,
  `refs/pull/6/head` = `1281b689a4113cd6d88a380943165b60f9f9a805`. (`refs/pull/1/head` = `c37e778`, the
  merge that is on `main`.) Their contents were not inspected.
- License: MIT, `vendor/ncm/LICENSE`, "Copyright (c) 2025 hermann kumbong". The Hugging Face weight
  and data repositories carry `license: mit` in their cards (MEASURED, `cardData.license` from the
  model and dataset API).
- `.gitattributes`: none in the repository, so no filter or line-ending rule applies to any blob.

### Blob parity (MEASURED)

- `git ls-tree -r HEAD` lists 39 blobs, all mode `100644`; there are no symlinks or submodules.
- Working tree vs blobs in the clone: `git hash-object` on each checked-out file equals its blob id,
  **39/39**.
- The ACER intake's `ncm/` holds the same 39 paths (sorted path lists are equal), and
  `git hash-object --no-filters` on each ACER file equals its blob id: **39/39**.
- The 39 files here were written from git (`git archive HEAD | tar -x`), not copied from ACER, and
  `git hash-object --no-filters` on each vendored file equals its blob id: **39/39**, 877,235 bytes
  in total. Each file's sha256 also equals the ACER intake's `SHA256SUMS` row (**39/39**).
- `.gitignore` is vendored as a plain file. It sits in `vendor/ncm/`, so its patterns apply only
  below that directory. `git check-ignore` over all 39 vendored paths matched **0** (no vendored path
  is ignored). Among its patterns are `*.pt`, `*.pickle`, `*.bin`, `artifacts/` and `data/`, so a
  weight or data download placed inside `vendor/ncm/` would be hidden from git.
- Personal-data scan (MEASURED): the 34 vendored text files (everything outside `assets/`) were
  searched for e-mail addresses, IPv4 addresses, key/secret patterns (`sk-…`, `AKIA…`, `BEGIN …
  PRIVATE KEY`, `api_key=…`) and private home paths (`/home/…`, `/Users/…`); none was found. The five
  `assets/` files are images, identified by `file(1)` and verified by blob id and sha256, not
  otherwise inspected.

| Vendored path | Git blob | sha256 | Bytes |
|---|---|---|---|
| `vendor/ncm/.gitignore` | `a27991525cd79384423c5c74527e2061084d8963` | `770a54c90a14f9cb68b150112c045f29032c7381409dac39d57223c3ed468940` | 3872 |
| `vendor/ncm/LICENSE` | `8c9c7f4ff5fc026b93c55dcce141d142bd3b650c` | `2b379bec6e8f7f362eef851d10a2afc4171b0e96a3525d50350e2cf783f2c441` | 1072 |
| `vendor/ncm/README.md` | `3987e174fdd08e88b1fc37c8a7a5a19801040048` | `45d8951cc4d5146bbae2a930c3b133bfb91756aded6e759bb42f71dd74708aa9` | 14939 |
| `vendor/ncm/assets/coarse_to_fine.gif` | `44d223770bb7df9958c88e34e880602e00523769` | `4de1d58398f5b73a2549e90ad72018ee207356ac94613a88ed8ad379830ffa76` | 354150 |
| `vendor/ncm/assets/ncm_logo.png` | `8a5d6b1bef8fdd57640c21bb76b47bb5f925fa8a` | `fa2ccfac8c7bfe3f4bb7331e226745a97fad74b225980da2d5bb29fb5c8e262b` | 8799 |
| `vendor/ncm/assets/ncm_logo.svg` | `e363ad063f56e4c3f2d3e617e84e1ce202b0b50a` | `dc5b979f899c81bd34026194d4f883e42aa34473cf48c099d8d3d24522fc65dd` | 1333 |
| `vendor/ncm/assets/overview.png` | `660dc0c764dac169792c86ee6cfd5b78108106ca` | `ad9b4e3caf0fdb9254da735790b49bd4818d50d08f948cc5decd23d358505021` | 147459 |
| `vendor/ncm/assets/quality_speed.png` | `15c57213ddb588f74b1cea4a5608498103e3adc5` | `a2e99b83c163dd76e5c57311ef9bfd85d8f7102893214c2eef900f8b318631f5` | 197346 |
| `vendor/ncm/config/eval/lm1b-large.yaml` | `4667606bb5b51920d25e6dc8cf77879450be676c` | `4410e3710360cae162f8be4186a44a0c7c473be674a1ac3d1d940bfe45d5e70c` | 2753 |
| `vendor/ncm/config/eval/lm1b-medium.yaml` | `702222c93354c77984a10ae163efe6d3626bfccc` | `93a42e0923b38f06f186072fdc37c1a2b4db5298c7577755390dd36c651d8142` | 2754 |
| `vendor/ncm/config/eval/lm1b-small.yaml` | `7b8f55d9d966f8a38ab03272fe7ec2b60221bb5b` | `4db04299a87f7eb1627de0abb2f0b257e50e5ea0138edda771ad287cdabd7edf` | 2749 |
| `vendor/ncm/config/eval/owt.yaml` | `8c0d54e33351161a9db81ee0c742ad2af7cb426e` | `854658b904e3faeeae3496aeacdd6536913a445552d721611349f9f7177c29ca` | 3122 |
| `vendor/ncm/config/eval/sudoku-easy.yaml` | `adef40fc50a296bf598ecf6fee092bc571715c34` | `68d74fe310e909ca1892338258a2d7143293e685ec1c4747265d9134013d1605` | 1980 |
| `vendor/ncm/config/eval/sudoku-hard.yaml` | `c21f90e1eb874b09dbefed466c5292bdac756752` | `8d58c49e6fe52e60191e06df4061937d5bb84f97c5ffbcd93ed9830c32f8df2f` | 1980 |
| `vendor/ncm/config/eval/sudoku-medium.yaml` | `02bd6dd8ef5f7dcbe15206fef163d4d880fd9fc6` | `a399820c7adbfd0c6ad6e443a63feb7fe7d35d066fb2981b79440af0b237beec` | 1982 |
| `vendor/ncm/config/eval/tinystories.yaml` | `1e1ea4cc0f2626f056c0005bb117579ff4d46263` | `4009baccad5a159bfc12cd48f3da17c22c4a281b86f71f2fc70b7c1bbb62004b` | 2483 |
| `vendor/ncm/config/eval/wmt14.yaml` | `6826002535d2b9b62298f4e041b929232055b6fa` | `6401af2a14d41c6582c3181a0b683e8970c1eeefe8cf7afaf74f1597da3fcd72` | 2177 |
| `vendor/ncm/config/eval/xsum.yaml` | `0394a34c0dee9e36e60318d61f7de1bd9c7fa489` | `5dee6b7339645a22362f695fbadb27df6e5254db2d3be0bff8516138d95da493` | 2345 |
| `vendor/ncm/evaluate.py` | `fb7ae1cc4569ae6269a0692d62599d2914345573` | `74b6b7781031a8c7e690ae8f7d80b1d82775e51c10ced3c19d47262aac014be0` | 2400 |
| `vendor/ncm/evaluation/__init__.py` | `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |
| `vendor/ncm/evaluation/gen_ppl.py` | `98bd96e4e6eb0a9bfeeecd1f47fd162550ccb412` | `31cde7d31aadc8cd873f7a853e818270e27e4789af4fb573d1821c8a0072ef5f` | 4990 |
| `vendor/ncm/models/__init__.py` | `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |
| `vendor/ncm/models/common.py` | `e1d214a9cfa677c543388990d2f35f1fedb7e30a` | `41b7c2c653d7ba312d583caca878ea3708d83da1a770b0b39651dbfd19754b73` | 9787 |
| `vendor/ncm/models/next_concept.py` | `25ee56d5bbcaa21558768b279490ad21f5a12cb9` | `4a1c483ca3b3522adb5ee754db4917c96ce08a82e992679ad7ed79e8f8c8da9b` | 33154 |
| `vendor/ncm/models/quant.py` | `8262ab80e782ff6e59a60ee59cff58eb0c2ec804` | `5fd16053a826a5a0af580715a79bb03dc3eea49669514969c1086c445e9c9e2b` | 28762 |
| `vendor/ncm/models/vae.py` | `83c4e7c0e190a0a3214d100131d099f15dfd01e2` | `7d393b56813342278def3b053e83ec4ff4e56a492e4ddf2a2441e1c9f78d4317` | 9908 |
| `vendor/ncm/models/vqvae.py` | `2aa3236a1e4b2f9a7bc7945ec592d5b087ec67a5` | `9873af280da08ca39360388f652f993f17ace761a751ffa812caa706f66f592b` | 5838 |
| `vendor/ncm/requirements.txt` | `a32cf29dbf7cf31629b9fdb15d57f48e101f36e2` | `b36eb1319640370b61f529b08299266458f5d2fa50fd8b8634ab10f7733fcf85` | 101 |
| `vendor/ncm/scripts/eval_merge.py` | `ddee0bc716c13a17e2e271bad5dd6749832debc8` | `6452cb5cc06a2355ab7cd16b9809b7144a557418e9041e4617f3c50aef5655fc` | 6901 |
| `vendor/ncm/scripts/eval_shard.py` | `2875b0b20e9873f45b26e2376187e486f73ba272` | `e1eb550123ec76601d1af9c59c2bb7a81d5ca683a662948fcb4d8164dd510c4a` | 7445 |
| `vendor/ncm/tokenization/__init__.py` | `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |
| `vendor/ncm/tokenization/bpe_tokenizer.py` | `6ea79ae0a12d41c047e7cf88fcbd6497eaf79c09` | `5df2bf286b36cdc3c428aaf347c56a98c0abb3da65c8ff734582b1d59959ba2c` | 4553 |
| `vendor/ncm/tokenization/hf_tokenizer.py` | `57c4cbd7da088f69d4d1b58756ba93b64bea51ca` | `76438d8e102a365cb30fd053e47ca138712649c893a06a92b0cc1448b5dcd49d` | 1546 |
| `vendor/ncm/tokenization/sudoku_tokenizer.py` | `62bd205b0ca9f13f5e2bc1aac9675d1822f404ee` | `a76c58f60d759ad3da045d3045a47588d1de16ca12c88472fa7f8262a236975f` | 786 |
| `vendor/ncm/tokenization/tokenizer.py` | `506893336239369bf52bd484fb06c160b39874f7` | `e527d47e4ed8634c673d48a872a07c9cc8828d30988331de2d4bd3b7c21ddcb7` | 1183 |
| `vendor/ncm/tokenization/vqvae_tokenizer.py` | `711866d77c3a6b2ffb5ebd300eeb4689cfa8c4f0` | `8fd909578fd384da49ebf44d1589f414c43860a6a84cb85e2c6659a6b0ff37ee` | 4187 |
| `vendor/ncm/utils/__init__.py` | `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 0 |
| `vendor/ncm/utils/misc.py` | `f98d4875dc7d668e57aff6af278c6df2837814e2` | `7e766c7ee036648f4959323ab671e6a7c5d3e873adb9ed60fbec83497728b452` | 1014 |
| `vendor/ncm/utils/registry.py` | `f7e68e10fb62f1415647b2564ab9015e8cfc395f` | `28ecdf5be072c55e18348e519b5bd079c58dee085561abfb3f4587e5eac7938a` | 1385 |

## 2. The paper: pinned, not vendored

- arXiv `2610.14162`, version `v1` (the only version; submitted 2026-10-09), *Next-Concept Modeling:
  Fast, Parallel Coarse-to-Fine Text Generation*, 9 authors (Kumbong, Khare, Mlauzi, Woen, Ding,
  Buchanan, Arora, Mirhoseini, Ré), primary subject cs.CL, also cs.AI and cs.LG (MEASURED, abstract
  page `https://arxiv.org/abs/2610.14162` fetched 2026-10-18).
- License (MEASURED, the page's `abs-license` link): `http://arxiv.org/licenses/nonexclusive-distrib/1.0/`,
  the arXiv perpetual non-exclusive license to distribute. It grants arXiv the right to distribute
  the paper; it grants no third party a right to redistribute it, and it is **not** CC BY, CC BY-SA
  or CC0. **The PDF is therefore not vendored.** It is pinned here, and the abstract is quoted in
  `README.md` under fair quotation.
- PDF pin (MEASURED): `https://arxiv.org/pdf/2610.14162v1` downloaded 2026-10-18 is **1,343,534
  bytes**, sha256 **`708a029c7f53d4f9f04ca5c93865afc9b3b5414acab3d7d9b887f313d04a5b4d`**. ACER's
  `paper/arxiv-2610.14162v1.pdf` has the same byte count and the same sha256 (identical file). The
  downloaded copy was deleted after the check.

## 3. Hugging Face weights and data: pinned by manifest, not downloaded

The three files in `manifests/` are byte-identical copies of the ACER intake's `manifests/`. Their
sha256 values equal the intake's `SHA256SUMS` rows, and `sha256sum -c SHA256SUMS` in the intake
passes for all 47 members (MEASURED).

| File | sha256 | Bytes |
|---|---|---|
| `manifests/hf-ncm-checkpoints.hbp` | `ffa7b49cafd47ade7a83fa5952b2625f8650486becf442a92b401ff3dff9d0e4` | 5786 |
| `manifests/hf-ncm-datasets.hbp` | `1412c24e08aad4085e8662e42c176cdd1fabde7efd253aed059274cb53dc046e` | 5641 |
| `manifests/NCM-LEVELS.hbp` | `f742d69ede9ba8f5ecdd489f98c1c366191f5c355bb3a7cadad8632946a8c3ef` | 1500 |

Verification against the Hugging Face API, 2026-10-18 (MEASURED). Each tree listing
(`/api/models/…/tree/<rev>?recursive=true` and `/api/datasets/…/tree/<rev>?recursive=true`) was
compared row by row with the manifest: path set equality, `size` = `bytes`, `oid` = `git_oid`, and,
for LFS files, `lfs.oid` = `sha256` (and `lfs.size` = `size`). A row with `sha256=-` must have no LFS
pointer; its `git_oid` must equal the tree `oid`.

| Repository @ revision | Rows | Match | Mismatch | LFS rows | Extra in tree | Missing | Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| `hazyresearch/ncm-checkpoints` @ `d342ce8aaea58830eef3b8ad473664673e41f692` | 35 | **35** | 0 | 18 | 0 | 0 | 8,002,911,678 (8.00 GB) |
| `hazyresearch/ncm-datasets` @ `6580ba41a4b0a976dde876fbe84d25327617b0e6` | 30 | **30** | 0 | 25 | 0 | 0 | 22,740,794,836 (22.74 GB) |

- Both repositories' current `sha` (`/api/models/hazyresearch/ncm-checkpoints` and
  `/api/datasets/hazyresearch/ncm-datasets`) equals the pinned revision. Their `lastModified` values
  are 2026-10-16T03:40:07Z and 2026-10-16T03:39:24Z. Neither is gated or private; both carry
  `license: mit`.
- **OWT weights absent at the pinned revision.** The pinned checkpoint tree has only `owt/TODO.md`
  (5 bytes). `owt/tokenizer.pt`, `owt/generator.pt` and `owt/config.yaml` each return HTTP 404 on
  `…/resolve/main/owt/<file>`; a control, `…/resolve/main/xsum/config.yaml`, returns 307 (MEASURED).
  The OWT *data* is present in the dataset repo (its training token file alone is 18,070,847,356
  bytes). "Absent in this revision" does not mean the weights never existed.
- Config parity (MEASURED): the 9 non-OWT `config.yaml` git blob ids recorded in
  `hf-ncm-checkpoints.hbp` (lm1b small/medium/large, sudoku easy/medium/hard, tinystories, wmt14,
  xsum) equal the git blob ids of the matching `vendor/ncm/config/eval/*.yaml`: **9/9 equal**.
  `owt.yaml` (blob `8c0d54e3…`) has no checkpoint-tree counterpart at the pinned revision.
- Two facts read from the manifests: the three Sudoku `solutions.pickle` rows share one blob
  (sha256 `b52de75f…`, 364,063 bytes), and the two TinyStories BPE pickles appear in both the
  checkpoint and dataset repositories with the same sha256.
- `NCM-LEVELS.hbp` level schedules reproduce in `README.md`; the per-config K, level list, L, code
  total, codes per token and codebook size are consistent with the 10 vendored configs.

## 4. The ACER intake (where the manifests and the PDF pin came from)

- ACER delivered the intake as a directory,
  `scratchpad/acer-regen-2026-10-18/FABLE5-NCM-NEXT-CONCEPT-MODELING-INTAKE-2026-10-18`. No intake
  zip is present on disk, so no intake-zip byte count or sha256 is asserted here.
- The intake has 47 members. `sha256sum -c SHA256SUMS` over it passes **47/47** today (MEASURED);
  `SHA256SUMS` itself has sha256 `855028896743f744a20c54690492f1dcba6219d6021242470e82f8679ef4f7fe`
  (MEASURED).
- `CUBE.hbp` records `files=47` and `merkle_sha256=3c8e30f42a4885ce27ee21f6e391f04a957065a6a798abef145b015ee1f016f9`
  (NAMED, taken from the CUBE header, not recomputed). The office receipt is
  `FABLE5-NCM-INTAKE-2026-10-18.hbp`.
- ACER's numbers re-measured here and found equal: 39/39 blob parity, 5 commits, the HEAD, 35 files /
  8.00 GB, 30 files / 22.74 GB, OWT weights absent, the PDF size and sha256, and the level schedules.
- ACER's derivations D1–D3 stay CONJECTURE here. Their runs belong to `rq/`; the reproduction of the
  paper's released numbers belongs to `repro/` (see `README.md`). Both are written by other agents.

## 5. Re-check

    cd model/ncm && sha256sum -c UPSTREAM.sha256                 # 42 lines: 39 vendored + 3 manifests
    git -c core.autocrlf=false clone https://github.com/HazyResearch/ncm.git /tmp/ncm_check
    git -C /tmp/ncm_check checkout c70274273f489abc73832b2b98584a8483b6b203
    git -C /tmp/ncm_check ls-tree -r HEAD | while read m t oid p; do \
      [ "$(git hash-object --no-filters "vendor/ncm/$p")" = "$oid" ] || echo "MISMATCH $p"; done
