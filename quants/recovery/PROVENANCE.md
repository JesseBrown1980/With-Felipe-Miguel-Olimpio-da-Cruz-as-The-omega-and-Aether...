# Provenance: quants/recovery (quants 22, 23 and 24)

This directory brings in quants 22-24 of the owner's combined quant registry. All three are already
Rust in upstream, so nothing here is a port: the two owner crates are vendored byte for byte and
built and tested from their own bytes. Rust 1.81.0 runs their own tests unchanged.

| n | Registry id (vendored registry, lines 28-30) | Owner named by the registry | Here |
|---:|---|---|---|
| 22 | `Q-PATH1-CONTENT-ADDRESS-v1`, alias `Path-1`, regime `REFERENTIAL_LOOKUP` | `dbbh-coms-quant-prism` | `dbbh-coms-quant-prism/` |
| 23 | `Q-PATH2-CRT-MULTICYLINDER-v1`, alias `Path-2`, regime `JOINTLY_INJECTIVE_RECOVERY` | `path2-two-shadow-recovery` | `path2-two-shadow-recovery/` |
| 24 | `Q-PIE-SHELL-CYLINDER-v1`, alias `pixel+shell+cylinder-projection`, regime `LOSSY_NUMERIC_SKETCH+JOINTLY_INJECTIVE_RECOVERY` | `path2-two-shadow-recovery` | `path2-two-shadow-recovery/` |

The atlas row for quant 24 (`ASOLARIA-COMBINED-QUANT-ATLAS-2026-07-13.md:134`, same commit, read and
not vendored) names its owner as "Path 2 / Q-PRISM 3D". The registry row names
`owner=path2-two-shadow-recovery`, and that crate holds the pixel-slice, frequency-shell and cylinder
code listed below.

The Q-PRISM 3D repository (`JesseBrown1980/qprism-3d-slice-harness`, `HEAD` = `main` =
`2f48332921057570814a1519b27e272eb501711c` on 2026-10-17) has a code section headed
`// ============ PIE RESOLUTION: N-prime-cylinder atlas (operator Jesse Brown, 2026-07-04) ============`
at `src/lib.rs:642`. Its comment block (:643-648) reads in part "the activation vector, at a given
frequency, lands on a perfect (N-1)-sphere; its shadow projects to pixels (pixels-first)". The code is
`prime_atlas_axes` (:651-661) and `project_prime_atlas` (:664-673), with the test
`pie_prime_atlas_axes_are_prime_keyed_not_arbitrary_sha` (:715). `git log -S project_prime_atlas` gives
`31bae71` (2026-07-04 13:57:06 -0300, "PIE correction #2 (prime-atlas axes) + parametric N-D
expansion + bilateral coprime-label fix"). That file has no frequency-shell or pixel-slice type. Its
bytes are already in aether at `quants/exact/vendor/qprism-3d-slice-harness/src/lib.rs` (git blob
`6b2d133e6a111db570fae4a17d453abe665cd4cb`, equal to upstream `HEAD:src/lib.rs`), so this directory
does not copy it again. Both owner statements are recorded as written: the registry row
(`owner=path2-two-shadow-recovery`) and the atlas row ("Path 2 / Q-PRISM 3D").

## Lanes

| Lane | What runs there | Here |
|---|---|---|
| Hot (per request, in process) | The two owner crates: pure Rust, zero dependencies, integer only, HBP rows ending `json=0` | `dbbh-coms-quant-prism/`, `path2-two-shadow-recovery/` |
| Cold (verification, CI only) | The owner crates' own tests, plus `crosscheck/` (tests only) | `*/tests/`, `crosscheck/` |

No Node, JSON or Python is used. Upstream is Rust, so there is no line-by-line referee: CI checks
the upstream bytes directly (`sha256sum -c UPSTREAM.sha256`, plus a fetch of the raw files compared
with `git hash-object`) and runs the upstream tests.

## Upstream commits

On 2026-10-17, `git ls-remote` gave these values for `HEAD` and `refs/heads/main` of each repository:

| Repository | Commit (= `HEAD` = `main`) | Tree | Commit date |
|---|---|---|---|
| `JesseBrown1980/dbbh-coms-quant-prism` | `30386807a2d0d6b100c06a40e3d26105849537df` | `27925237b013f52502954b4eac0b5b60dd0fe12e` | 2026-08-08 18:10:53 -0300 |
| `JesseBrown1980/path2-two-shadow-recovery` | `e1c63037a800634eecbe91fcdcf00a74e4934dc1` | `0d966bab4fb308800a34289241f0282902de1526` | 2026-08-08 18:11:30 -0300 |
| `JesseBrown1980/Algorithms-of-Asolaria` | `d399d13093c7947605682da3ef769bfd8cbe9535` | | |

## Copied files

Each file was taken with `git cat-file blob <commit>:<path>`. `git hash-object` of every copy equals
the upstream blob id, `UPSTREAM.sha256` pins the sha256 of every copy, and every copy is LF-only.
`.gitattributes` marks the vendored paths `-text`, so Git keeps these bytes on every platform.

| Path here | Upstream path | Git blob | Bytes | Lines | Last changed upstream | sha256 |
|---|---|---|---:|---:|---|---|
| `dbbh-coms-quant-prism/Cargo.toml` | `Cargo.toml` | `b048bb8dbd87e16f967c44b4ffe32ef33284ee6b` | 661 | 18 | `ee5a824` | `a780bcec…7143` |
| `dbbh-coms-quant-prism/LICENSE` | `LICENSE` | `7f2a4900a5dfc8eb2ce413ce1fa95942623124e7` | 1076 | 21 | `e924601` | `218ddd87…00bf` |
| `dbbh-coms-quant-prism/README.md` | `README.md` | `81cb08447124a8d9bb1a3510a407cff9f80b0540` | 6993 | 118 | `ee5a824` | `489a6acc…2534` |
| `dbbh-coms-quant-prism/rust-toolchain.toml` | `rust-toolchain.toml` | `6f9c67b5082cea3bdce5efe3d2f91db969ce1f74` | 400 | 8 | `ee5a824` | `b19266c7…59b1` |
| `dbbh-coms-quant-prism/src/lib.rs` | `src/lib.rs` | `c33a89d15c946920a82aae160c09936d7ac98231` | 28737 | 813 | `ee5a824` | `b63450b5…7e52` |
| `dbbh-coms-quant-prism/tests/integration.rs` | `tests/integration.rs` | `66f83c87661386395d2661ebc7a32e7939234abb` | 3223 | 83 | `b203d58` | `592ea9e6…3544` |
| `dbbh-coms-quant-prism/tests/suite.rs` | `tests/suite.rs` | `e602dd8db5272e9442e9bea7b4f34d8acfe30e84` | 2451 | 65 | `b203d58` | `7fe774d1…9d3e` |
| `dbbh-coms-quant-prism/tests/system.rs` | `tests/system.rs` | `6b0112e5bc424db5bf9adc5096390833f21a7665` | 4860 | 127 | `b203d58` | `22134a89…0c99` |
| `path2-two-shadow-recovery/Cargo.toml` | `Cargo.toml` | `69825f5408c37931fe6f942ac7266bad8b33acd6` | 718 | 19 | `4c7442f` | `33844313…0ed7` |
| `path2-two-shadow-recovery/LICENSE` | `LICENSE` | `41deaf5eb3d4556cde6c7f359a739c73f339be4c` | 311 | 5 | `16855d7` | `88607f3c…9698` |
| `path2-two-shadow-recovery/README.md` | `README.md` | `f8e85125d764e63b81d3bb27880c17794e9a9708` | 8445 | 180 | `4c7442f` | `33f8b697…8f32` |
| `path2-two-shadow-recovery/rust-toolchain.toml` | `rust-toolchain.toml` | `6f9c67b5082cea3bdce5efe3d2f91db969ce1f74` | 400 | 8 | `4c7442f` | `b19266c7…59b1` |
| `path2-two-shadow-recovery/src/lib.rs` | `src/lib.rs` | `c62cf03000b6dade20362b1baacea429d281e031` | 48640 | 1344 | `4c7442f` | `4140c010…9d90` |
| `path2-two-shadow-recovery/tests/federation.rs` | `tests/federation.rs` | `f6ad3f1890395237b241e9d35cf131257c657e0c` | 3241 | 76 | `4ae6a28` | `e63aa2fa…c831` |
| `path2-two-shadow-recovery/tests/multicylinder_qprism.rs` | `tests/multicylinder_qprism.rs` | `f7d8398552140ebe6a5efaabe79eec4c6194b894` | 4856 | 125 | `62a5314` | `94acc18c…20b5` |
| `path2-two-shadow-recovery/tests/pie_world_slice.rs` | `tests/pie_world_slice.rs` | `e44ae3dcf65ed929eafa97d766d7c456157d4d93` | 5812 | 170 | `62a5314` | `3f6c653e…afdae` |
| `path2-two-shadow-recovery/tests/watcher_gate.rs` | `tests/watcher_gate.rs` | `4ba1ccb8215c36fd82ac202927e4232150e0eabc` | 4776 | 133 | `67cba62` | `5a183adc…204e` |
| `path2-two-shadow-recovery/docs/LIRIS-MULTICYLINDER-QPRISM-SLICE.md` | same | `fbf0b40f2f33010882fb94997f21b7cf440d6d01` | 2760 | 61 | `62a5314` | `0ef3e950…cb3e` |
| `path2-two-shadow-recovery/docs/LIRIS-PIE-WORLD-SLICE.md` | same | `b31776083da53933f256d68eb8b6927c116a8820` | 3917 | 58 | `67cba62` | `31862904…8e8f` |
| `vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp` | `ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp` | `7f4fff24f6c393b78aa0887ef025de7efa9de9c0` | 6192 | 43 | | `147cf6e5…db5f` |

The full sha256 values are in `UPSTREAM.sha256`. The registry's sha256 equals its upstream sidecar
`ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp.sha256`. Both upstream `Cargo.toml` files are used
unchanged: the crates build in place as packages `dbbh-coms-quant-prism` (library
`dbbh_coms_quant_prism`) and `path2-two-shadow-recovery` (library `path2_two_shadow_recovery`), with
no dependencies.

Not copied (not part of either crate): `.github/workflows/rust-1.81-clippy-verification.yml` (blob
`a4abbc6b…`, the same in both repositories; its checks are replayed below), `.gitattributes`
(`text eol=lf` for `*.md *.rs *.toml *.hbp *.hbi *.sha256`; every copied file is already LF),
`.gitignore` (it lists `Cargo.lock`, which aether keeps for `--locked`), `.nojekyll`, `index.html`,
`STARPORT-2026-08-08.hbp`, `AGENT-DISCIPLINE.md`, `AGENT-PRELOAD.md`, the `*.sha256` sidecars, the
`verification/` receipts, and the other `docs/` files (dbbh: `PATH1-PATH2-INDEPENDENT-VERIFICATION-2026-07-11.md`,
`SHADOW-RESOLUTION-CAPSTONE.md`, `WHAT-THE-PAPERS-PROVE-ABOUT-THE-PRISM.md`; path2:
`DBBH-DBWH-MEASURED-PATH2-2026-07-11.md`). The two READMEs link to some of these; the links are
left as they are.

Also not copied: the pull-request refs that are not ancestors of `HEAD` (`git ls-remote` and a fetch
of `refs/pull/*`, 2026-10-17). None of them changes a `.rs` file.

- dbbh `refs/pull/1/head` = `c4d24e4ba7866ed35ede0c12e115c60b60b01de1` (`refs/pull/1/merge` =
  `c86fd35`, merge-base `b203d58`): two commits that add
  `results/GPT56-SOL-QPRISM-HARNESS-BINDING-20260709.hbp` and `.hbi` (6 and 8 HBP lines). Its own
  boundary row begins `QPRISMGPT56BOUNDARY|class=HELD|detail=backend_harness_binding_only;`.
- dbbh `refs/pull/2/head` = `dfedb75` and path2 `refs/pull/2/head` = `96de71b`: each has the same
  tree as a commit in `HEAD`'s history (dbbh `48d66ac`, path2 `c7fa4a4`).
- path2 `refs/pull/3/head` = `6feeaf8cf0e49399a82a404e2edf5cf3d5baacb3` (`refs/pull/3/merge` =
  `72d807e`, merge-base `c7fa4a4`): one commit, "docs: scope quantum-cloning boundary", that adds a
  6-line `AGENTS.md` and rewrites the `DENY` paragraph of the vendored
  `docs/LIRIS-MULTICYLINDER-QPRISM-SLICE.md` (+5/-1). The vendored copy is the `HEAD` version.

## Where each quant is in the code

Line numbers are those of the vendored files.

**Quant 22, Path 1** (`dbbh-coms-quant-prism/src/lib.rs`; atlas: "small authenticated coordinate
selects exact retained content"):

- `agt` :111-116 gives `AGT-` plus the first 16 hex digits of `sha256` (:22-99).
- `ContentStore` :610-638 maps an AGT to the retained bytes.
- `dbbh_send_addressed` :640-665 emits one `CUBE-ADDR` row with no glyph payload.
- `dbbh_receive_addressed` :667-694 returns the stored bytes for the AGT, or `Held::AddressMismatch`
  when the store does not hold it.
- `SessionCapsule` :438-518 holds the consent state; `ReceiptChain` / `verify_chain` :252-310 hold
  and check the audit chain.
- The same crate also holds the glyph crossing (`dbbh_send` / `dbbh_receive` :531-605) and the
  BEHCS ladder (:143-247), which the registry lists as quants 17-20.
- Tests: `tests/integration.rs:38-55`, `tests/system.rs:14-104`.

**Quant 23, Path 2** (`path2-two-shadow-recovery/src/lib.rs`; atlas: "pairwise-coprime residues
jointly recover exact bounded blocks when product reaches source roof"):

- Two-cylinder form: `crt2` :70-76, `two_shadow_recover` :78-85, `TwoShadow` :88-183.
- N-cylinder form: `DEFAULT_60D_CYLINDERS` :189-197; capacity functions :232-318; `crt_many`
  :320-344; `MultiCylinder` / `MultiShadows` :346-491.
- `recover_from` :461-490 takes the shortest prefix of the selected indices whose product covers the
  block range (`sufficient_prefix` :404-413, used at :466), recovers each block with `crt_many`, and
  then compares every selected residue with the recovered block (:479-483), returning
  `Held::InconsistentResidue` when one differs.
- Tests: `tests/multicylinder_qprism.rs`, `tests/federation.rs`, and the unit tests :1271-1344.

**Quant 24, pixel + shell + cylinder projection** (same file; atlas: "pixel slice + frequency shells
+ full cylinder-shadow projection"):

- `PiePixelSlice` :780-888, including `frequency_shells` :859-887.
- `QPrismSlice3d` :712-763 (SHA/Host8, BEHCS frames, `HyperCoord60`, N-cylinder shadows, HBP rows).
- `PieWorldProjection` :1015-1080; `LeWorldRule` :954-1013; `OmnibitPixel` :890-944.
- `WatcherGate` :1163-1258: `verify_projection` recovers, re-projects, and compares sha256, shadows
  and shells (:1172-1182) before it returns a receipt.
- Tests: `tests/pie_world_slice.rs`, `tests/watcher_gate.rs`.

### path2 pull request #1

The multi-cylinder code is from pull request #1 (`liris/multicylinder-qprism-slice`, merged as
`7d89852` on 2026-07-04 15:12:50 -0300; `refs/pull/1/head` = `67cba621495d82a52f1ef0e69bde592d89ab70d4`,
an ancestor of `HEAD`). Each symbol's first commit, from `git log -S`:

| Commit (2026-07-04, -0300) | Subject | Symbols first added |
|---|---|---|
| `4ae6a28` 13:15:35 | "Add Liris multi-cylinder Q-PRISM slice harness" | `MultiCylinder`, `crt_many`, `recover_from`, `joint_capacity_bits_floor`, `QPrismSlice3d` |
| `af42042` 13:53:29 | "Add PIE world-slice harness" | `PiePixelSlice`, `frequency_shells`, `PieWorldProjection`, `LeWorldRule` |
| `fdbac42` 13:55:34 | "Measure N-Q-prism residual selector bits" | `residual_selector_bits_for` |
| `62a5314` 14:05:13 | "Fix N-cylinder capacity receipts" | `Held::InconsistentResidue`, `sufficient_prefix`, the per-residue comparison in `recover_from`, `joint_modulus_capped` |
| `67cba62` 14:18:39 | "Add watcher gate and omnibit pixel" | `WatcherGate`, `OmnibitPixel` |

Between `67cba62` and `HEAD`, `src/lib.rs` changed in two lines (`4c7442f`, lines 690 and 693 of
`HyperCoord60::from_digest`: an index loop written as `iter_mut().enumerate()`), and `Cargo.toml`
changed `rust-version` from `1.63` to `1.81`. The test files are unchanged since `67cba62`.

In dbbh, `ee5a824` (`src/lib.rs:304`, `&body[..] != prev` written as `body[..] != prev`) is the only
source change since `b203d58`.

## Relation to codec/dbbh-dbwh

`codec/dbbh-dbwh` (holographic-wormhole-codec@4901280, the primary throat per the owner's rule 6) was
not modified. `scratchpad/codec/CODEC-AUDIT.md` section 3 maps the codec's lines to their upstream
sources. From dbbh it lists `sha256`, `agt`, the capsule nonce, the `Held` variants, the send/receive
check order and the BEHCS packing. From path2 pull request #1 it lists the P1/P2 moduli and BLOCK=6,
the roof, residual and margin formulas, `crt_many` and `recover_from`, and the watcher labels and
`WatcherGate`. It gives the literal source of the codec's CRT core :104-179 (`CYLINDERS`, `BLOCK`,
`blocks`, `mod_inv`, `project_shadows`, `reconstruct`) as `deterministic-slice-time-harness`
`src/lib.rs:23-116` (`5f6f6d6`), with the earliest copy at `qprism-3d-slice-harness`
`src/lib.rs:358-430` (`31e7c84`); `scratchpad/codec/codec-audit.md:98` says `diff -w` shows only
`Result` changed to `Option` and doc comments and `pub` removed. Measured on fresh clones, each line
span is the one of a later commit than the hash it is paired with. In slice-time, `5f6f6d6` holds
these functions at `src/lib.rs:23-79`; they span `:23-116` from `ce80562` (rustfmt, 2026-07-04
21:12:04 -0300) through `be09be1`, the commit aether vendors in `quants/slice-time-harness` (blob
`e4f3f930…`), where `diff -w` against codec :104-179 shows only the `Held` enum, comments, `pub`, and
`Result` against `Option`. In `qprism-3d-slice-harness`, `31e7c84` holds the same `CYLINDERS` array
with `BLOCK_BYTES`, `blocks`, `mod_inv`, `cylinder_shadow` and `recombine` at `src/lib.rs:203-246`;
`:358-430` is their span at `HEAD` `2f48332`. Neither crate is a dependency here; path2's
`MultiCylinder` is the behavioural counterpart that the crosscheck compares on the same inputs. `crosscheck/tests/codec_sources.rs` calls both sides on the same inputs
(empty, `a`, `abc`, bytes 0-255, and the audit's `sha_ctr` stream at 1024 and 4099 bytes):

| codec `src/lib.rs` | Upstream here | Test | Result |
|---|---|---|---|
| `sha256` :31 | dbbh `sha256` :33; path2 `sha256` :602 | `sha256_codec_dbbh_path2` | equal on 6/6 inputs |
| `agt` :99-101 | dbbh `agt` :111-116 | `agt_codec_dbbh` | equal on 6/6 |
| `nexus_transcode` :426 (64/256/1024) | dbbh `to_level` :207; path2 `BehcsFrame::encode` :526 | `behcs_rungs_codec_dbbh_path2` | equal on 6/6 × 3 rungs |
| `SessionCapsule::propose` nonce :204-212 | dbbh `SessionCapsule::propose` :452-459 | `capsule_nonce_codec_dbbh` | equal on 6/6 |
| `project_shadows` :139-149; `recover_or_hold` :511 on [0,1] (literal source per the audit: slice-time :23-116 at `be09be1`, added in `5f6f6d6`) | behavioural counterpart: path2 `MultiCylinder { primes: CYLINDERS, block_bytes: 6 }`: `project` :447, `recover_from` :461 | `shadows_and_reconstruct_codec_path2` | equal on 6/6 |
| `white_hole_emit` :282-297 and `recover_or_hold` :511, one cylinder, [0] to [3] | path2 `recover_from` :461 | `single_cylinder_codec_path2` | differ on the empty input (below); both hold on the 5 others |
| `roof_bits` :181-191; `residual_selector_bits` :518; `capacity_margin_bits` :521 | path2 `joint_capacity_bits_floor` :267, `residual_selector_bits_for` :305, `signed_capacity_margin_bits_floor` :315 | `roof_residual_margin_codec_path2_all_15_subsets` | equal on 15/15 subsets; roof 25 or 24 (one cylinder), 49 (two), 74 (three), 99 (four) |

### The same changed cylinder, read by both

`crosscheck/tests/tamper_cylinder.rs` takes the audit's 1024-byte `sha_ctr` object, compresses it
with `black_hole_compress(object, b"a", b"b", b"s")`, arms the receiver, and adds 1 to the first
residue of cylinder 3, as the audit harness does (`scratchpad/codec/measure/src/main.rs:227-243`;
rows 58-60 of `scratchpad/codec/runs/measure.hbp`). The same residues are given to path2 as
`MultiShadows` over the codec's four cylinders with `block_bytes: 6`.

What each call compares:

- codec `white_hole_emit` (:282-297): `reconstruct` (:150-179) reads subset indices in order and
  stops once the product reaches 2^48 (:166); the AGT of the reconstruction (`AGT-` plus 16 hex
  digits of its sha256) is then compared with the packet's AGT (:293). Residues after that prefix
  are not read.
- path2 `recover_from` (:461-490): recovers each block from the sufficient prefix (:466), compares
  every selected residue with the recovered block (:479-483), and writes the low 6 bytes of the CRT
  value (:484-486). It computes no digest.
- path2 `WatcherGate::verify_projection` (:1166-1215): `recover_current` (:1029-1036: `recover_from`,
  then `PiePixelSlice::from_bytes` :845-857), re-projection, then sha256, every cylinder's shadows
  and the frequency shells are compared (:1174-1182).

| Call | Result |
|---|---|
| codec `white_hole_emit(&packet, &[0,1,2,3])` | `Verdict::VerifiedClone(object)` |
| path2 `recover_from(&shadows, &[0,1,2,3])` | `Err(Held::InconsistentResidue)` |
| codec `white_hole_emit(&packet, &[2,3])` | `Verdict::Held(Held::AddressMismatch)` |
| path2 `recover_from(&shadows, &[2,3])` | `Ok(bytes)`: 1024 bytes that differ from the object at bytes 0-5 (block 0) |
| codec `white_hole_emit(&packet, &[0,1])` | `Verdict::VerifiedClone(object)` |
| path2 `recover_from(&shadows, &[0,1])` | `Ok(object)` |

The `[2,3]` rows hold for each of the six two-cylinder subsets that include cylinder 3 (`[2,3]`,
`[0,3]`, `[1,3]`, `[3,0]`, `[3,1]`, `[3,2]`), and the test asserts all six. With the residue
unchanged, all of these calls return the object. For `[0,1,2,3]`, cylinders 0 and 1 reach 2^48, so
the codec does not read cylinder 3 and the AGT comparison passes, while path2 compares cylinder 3's
residue. For `[2,3]`, cylinders 2 and 3 form the prefix in both: the AGT of the codec's
reconstruction differs from the packet's AGT, so the codec returns `Held(AddressMismatch)`, while
path2's two selected residues are the CRT basis itself, so each agrees with the recovered block and
path2 returns the recovered bytes. For `[0,1]`, neither reads cylinder 3.
In the codec, the comparison against extra cylinders is done by `wormhole_traverse` over its `cross`
list (:310-318), which compresses its own packet. Both are the owner's code, and both behaviours are
recorded as measured.

The same change on path2's own watcher-gate sample slice (`tests/watcher_gate.rs:5-33`, 82 bytes,
14 blocks), projected with `PieWorldProjection::project` over the codec's four cylinders, with
cylinder 3's first residue plus 1 (test `cylinder_3_changed_path2_watcher_gate`; untampered, all three
subsets return the slice):

| `WatcherGate::verify_projection` subset | Result |
|---|---|
| `[0,1,2,3]` | `Err(Held::InconsistentResidue)` (from `recover_from` :479-483) |
| `[2,3]` | `Err(Held::InvalidSliceEncoding)`: the recovered block 0 does not start with `PIE1` (:846-847) |
| `[0,1]` | `Err(Held::WatcherDisagreement)`: the slice is recovered; its re-projected cylinder-3 shadows differ from the projection's (:1177-1178) |

### One cylinder, untampered

`single_cylinder_codec_path2` selects each cylinder alone on the six inputs. On the empty input the
codec's `white_hole_emit` and `recover_or_hold` return `Verdict::VerifiedClone` of the empty object,
and path2's `recover_from` returns `Err(Held::InsufficientJointCapacity)`. On the five non-empty
inputs the codec returns `Verdict::Held(Held::InsufficientRoof)` and path2 returns
`Err(Held::InsufficientJointCapacity)`. The codec's `reconstruct` checks `m < range` (:170) inside
its per-block loop (:157-176), so with no blocks it returns the empty bytes and the AGT matches;
path2's `recover_from` returns from `sufficient_prefix` (:466, defined :404-413) before any block is
read.

## Files added in aether

- `dbbh-coms-quant-prism/Cargo.lock` and `path2-two-shadow-recovery/Cargo.lock`, written by
  `cargo +1.81.0 generate-lockfile`; each holds one package entry and no dependencies.
- `crosscheck/` (`Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `src/lib.rs`, three test files):
  tests only, `publish = false`. Its library is empty apart from `#![forbid(unsafe_code)]`; it adds no
  API and no behaviour. Its dev-dependencies are the two vendored crates and `codec/dbbh-dbwh`
  (path dependencies with `version = "0.1.0"`).
- `UPSTREAM.sha256`, `PROVENANCE.md`, `README.md`, `.gitattributes`.

The upstream `src/lib.rs` files do not carry `#![forbid(unsafe_code)]`, and they are kept
byte-identical. Neither contains the token `unsafe`, and CI builds both with
`RUSTFLAGS="-F unsafe-code"`, which applies the same lint level from outside.

## Checks on Rust 1.81.0 (rustc 1.81.0 eeb90cda1, clippy 0.1.81)

The upstream workflow runs `cargo clippy --all-targets -- -D warnings` with no lint allowed, a float
scan (`\bf(32|64)\b` over every `.rs`) and `cargo test --all-targets`, under `RUSTUP_TOOLCHAIN=1.81.0`.
Both READMEs say a CI workflow "asserts exactly 19 tests" (dbbh `README.md:85-86`) or "exactly 30
tests" (path2 `README.md:159-160`) and name it `.github/workflows/rust-1.81-independent-verification.yml`.
No file of that name is in either repository's history. `rust-1.97-independent-verification.yml`
(added in `48d66ac` and `c7fa4a4`, removed in `ee5a824` and `4c7442f`) counted the tests with
`cargo test --all-targets -- --list | grep -Ec ': test$'` and asserted 19 and 30. In the same commits
the README line changed from `1.97` to `1.81`, and `rust-1.81-clippy-verification.yml`, which asserts
no count, was added. The aether CI runs that count on 1.81.0.

| Command | dbbh-coms-quant-prism | path2-two-shadow-recovery | crosscheck |
|---|---|---|---|
| `sha256sum -c UPSTREAM.sha256` (directory root) | 20/20 files OK | | |
| `cargo +1.81.0 clippy --locked --all-targets -- -D warnings` | exit 0 | exit 0 | exit 0 |
| the same with `RUSTFLAGS="-F unsafe-code"` | exit 0 | exit 0 | exit 0 |
| `cargo +1.81.0 test --locked --all-targets` | 19 passed (8 unit, 4 integration, 3 suite, 4 system) | 30 passed (5 unit, 4 federation, 9 multicylinder, 7 PIE, 5 watcher) | 13 passed (7 codec_sources, 3 registry, 3 tamper_cylinder) |
| the same with `--release` | 19 passed | 30 passed | 13 passed |
| `cargo test --all-targets -- --list \| grep -Ec ': test$'` | 19 | 30 | 13 |
| `cargo +1.81.0 fmt --check` | exit 0 | exit 0 | exit 0 |
| float scan `\bf32\b\|\bf64\b\|as f[0-9]` (aether) and `\bf(32\|64)\b` (upstream) | 0 hits in 4 files | 0 hits in 5 files | 0 hits in 4 files |

## Privacy

Before copying, every vendored file was read and scanned for e-mail addresses, IPv4 addresses, phone
numbers, key and token material, local user paths and personal names. They carry the owner's name
(in `rust-toolchain.toml`) and handle, the federation's machine and seat names (`acer`, `liris`,
`ACER-CLAUDE-FABLE5`), and hexadecimal test PIDs. They carry no third-party personal data. Git author
metadata is not part of any copied file and is not quoted here.

## License

Both `Cargo.toml` files declare `MIT OR Apache-2.0`, as do both READMEs. dbbh's `LICENSE` is the full
MIT text (1076 bytes). path2's `LICENSE` is the MIT notice in short form (311 bytes, with "..." in
place of the rest of the permission text and the conditions). Both carry "Copyright (c) 2026 Asolaria Federation", and both are copied
unchanged. Neither repository has an Apache-2.0 text; aether's root `LICENSE-APACHE` has it.
