# quants/exact — provenance

Every rung here is the owner's Rust, copied with `git cat-file blob <commit>:<path>`; `git
hash-object` of each copy equals the upstream blob id and `UPSTREAM.sha256` pins its sha256
(`sha256sum -c UPSTREAM.sha256`). All five upstream commits were the remote `HEAD` on 2026-10-17
(`git ls-remote`), and every file below was re-downloaded from `raw.githubusercontent.com` at its
commit and compared byte for byte (16 whole files, 4 line ranges: equal). No rung is re-implemented.

## Vendored whole files

| here (under `vendor/`) | repo @ commit | blob | sha256 | bytes |
|---|---|---|---|---|
| `qprism-3d-slice-harness/Cargo.toml` | qprism-3d-slice-harness @ 2f48332921057570814a1519b27e272eb501711c | 0d1cc987342eb0eb38772e2fb82527d9de2c6c3a | 8f9ba6a246ecd8428256639c571dd9d6b686b0935fbbb90ea38fd8d69a3fcd05 | 733 |
| `qprism-3d-slice-harness/src/lib.rs` | same | 6b2d133e6a111db570fae4a17d453abe665cd4cb | b848b1ee408cd847b0977d5fb1b1d84025e78e8531a3677f08ef6003a445472f | 31648 |
| `qprism-3d-slice-harness/LICENSE` | same | ab098eef16c87ea8421d716d800363014b3c6cf0 | c6ba696a25a8e8d3ce2d5f8ff5dbb5379b3d9c703a11c937a155215ba90c5a28 | 214 |
| `qprism-3d-slice-harness/README.md` | same | c3b748efaae31369a9a9cd9501f7b92a34f3c3e7 | c78af52dbe286a1abf287501b5cef36c9d90d9909f135954c8bfc7d75d87726f | 4599 |
| `qprism-3d-slice-harness/rust-toolchain.toml` | same | 6f9c67b5082cea3bdce5efe3d2f91db969ce1f74 | b19266c79d308cd1f288d0d59fd26573964c03ecccdebb8587d1584b03e259b1 | 400 |
| `dbbh-coms-quant-prism/Cargo.toml` | dbbh-coms-quant-prism @ 30386807a2d0d6b100c06a40e3d26105849537df | b048bb8dbd87e16f967c44b4ffe32ef33284ee6b | a780bcecd7fd10da8b1b47778eb944cb17bfac9236f1ea68469a804ce1eb7143 | 661 |
| `dbbh-coms-quant-prism/src/lib.rs` | same | c33a89d15c946920a82aae160c09936d7ac98231 | b63450b5561fa33d27cfc20c3008175d6c4ab5d68dbfc5861f9abad32bfe7e52 | 28737 |
| `dbbh-coms-quant-prism/tests/integration.rs` | same | 66f83c87661386395d2661ebc7a32e7939234abb | 592ea9e6d66916fbf3a81fe846711a1e409bdb3a6c677f6cef92ca01c3183544 | 3223 |
| `dbbh-coms-quant-prism/tests/suite.rs` | same | e602dd8db5272e9442e9bea7b4f34d8acfe30e84 | 7fe774d1772d625a81d0100ea8ea683377d1665c64a8c784e6768e0f6fed9d3e | 2451 |
| `dbbh-coms-quant-prism/tests/system.rs` | same | 6b0112e5bc424db5bf9adc5096390833f21a7665 | 22134a8953698ae8625ab3657930bcfbd0113dbe61a40697cf1d2243f2550c99 | 4860 |
| `dbbh-coms-quant-prism/LICENSE` | same | 7f2a4900a5dfc8eb2ce413ce1fa95942623124e7 | 218ddd87cddc393792f88ccc474e73ef37fa3659402859e2acbbdfa07d9900bf | 1076 |
| `dbbh-coms-quant-prism/README.md` | same | 81cb08447124a8d9bb1a3510a407cff9f80b0540 | 489a6acce17a87a1d98fc07672f021dee2cdaf10218a47a8b26350e7d8c92534 | 6993 |
| `dbbh-coms-quant-prism/rust-toolchain.toml` | same | 6f9c67b5082cea3bdce5efe3d2f91db969ce1f74 | b19266c79d308cd1f288d0d59fd26573964c03ecccdebb8587d1584b03e259b1 | 400 |
| `Q-PRISM-…-control/LICENSE` | Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control @ b4a21a25381d6920b7aab92c94c3c3e1420fc9e4 | f6c7ab6bc8dc9a092fbe5cb827e356923d72c6d5 | e994f1997f8afa963389779b6c51a2cc3ac01edbc78a90915b6c43097ec68809 | 1075 |
| `Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp` | Algorithms-of-Asolaria @ d399d13093c7947605682da3ef769bfd8cbe9535 | 7f4fff24f6c393b78aa0887ef025de7efa9de9c0 | 147cf6e56a6b0a49e8bb29dd9dea65bcd1b7865796b9266511c637609abcdb5f | 6192 |
| `Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-LATTICE-2026-07-13.hbp` | same | 217eed77bb047c67cf01bf1a5b72b7cecaaf42d2 | 03b1672653c2a6de01905232ca2fa785607dcc7c8699eb153f8f3ac2986b9f82 | 10574 |

The two crates build in place from their own unchanged `Cargo.toml` as workspace members
(`qprism_3d_slice_harness`, `dbbh_coms_quant_prism`); `cargo test` runs their own 8 and 19 tests.
The two registry sha256 values equal the repository's own `.hbp.sha256` sidecars. Quants `head8`
and `hyperbehcs` carry the same registry blob; the integrator may keep one copy.

## Vendored line ranges (Q-PRISM @ b4a21a2)

| here | upstream file (blob) | lines | sha256 of the range |
|---|---|---|---|
| `host8/qprism_cube_host8.rs.lines-101-128` | `host8/qprism_cube_host8.rs` (992ffd793f6c98f4f03b33ff0d1154b52d0174b0) | 101-128 | 6815163d8a3180394ed1d3746a61bf50a53a8f1cb798bc706e836858a6eba87b |
| `host8/qprism_cube_host8.rs.lines-265-273` | same | 265-273 | a3ed37f5ccba7de31a31f77a6c489c73cf9638ca01d879940839864bb527383c |
| `host8/dbbh_coms_quant_prism.rs.lines-16-514` | `host8/dbbh_coms_quant_prism.rs` (d4a4bea3b45984e694a3b77f0d3d055b197e1222) | 16-514 | 8c4e2c74b68db348b770ecee411f57382da7f3cdab683b63d8078679352c3135 |
| `host8/dbbh_coms_quant_prism.rs.lines-520-625` | same | 520-625 | 8dc96169df204c8a0eee3485cd0e0ffa2e8e39d02dae3313e5507d6f8043ad64 |

`qprism_cube_host8.rs` has the same blob at `53023b6` (the commit that added lines 101-128 and the
test at 265-273) and at `b4a21a2`; `dbbh_coms_quant_prism.rs` has the same blob since `4152f20`.
Lines 101-128 are `mask`, `transcode_256_to_1024`, `transcode_1024_to_256`; 265-273 is the test
`roundtrip_lossless_transcode_comb_coherence`. Lines 16-514 of `dbbh_coms_quant_prism.rs` are all of
its code below the module header: `LinkMode`, `BehcsRung`, `SymbolFrame` with `pack_symbols` /
`unpack_symbols` (101-137), `sha256`, `ContentStore`, `Pid60D` (306-352), `HyperBehcsFrame`
(354-398), `DoubleBinaryCapsule`, `DbbhPacket`, `prepare_packet` and `audit_replay_row`; 520-625
are the start of its `tests` module, the helpers `payload` / `assert_tuple_row` and five tests
(`unit_sha256_known_answer_tests`, `unit_behcs_64_256_1024_each_roundtrips`,
`suite_ladder_groupoid_pairwise_roundtrips`, `unit_hyperbehcs_is_store_backed_lossless_reference`,
`integration_double_binary_gate_requires_both_sides_and_supports_modes`). `src/lib.rs` and
`tests/upstream_qprism.rs` take the ranges with `include!`, the way aether `kernel/behcs1024-60d`
takes its upstream line ranges; the five tests run in a module that imports
`quant_exact::qprism_dbbh_ladder::*` in place of upstream's `use super::*` (line 518).
`qprism_dbbh_ladder::{pack, unpack}` (`src/lib.rs:38-46`, written here) call the two private
upstream functions as upstream `SymbolFrame::encode`/`decode` do (lines 77, 82). Not carried from
`dbbh_coms_quant_prism.rs`: lines 1-13 (the `//!` module header) and 14 (`#![allow(dead_code)]`),
which `include!` cannot take as inner attributes (rustc E0753); 515-519 (`#[cfg(test)] mod tests {` and
`use super::*;`); and 626-661, the sixth test `system_address_only_crossing_reconstructs_only_from_retained_store`
(627-660) with the module's closing brace, because line 633 carries a personal first name (see
Privacy). From `qprism_cube_host8.rs` (296 lines) only the transcode lines and their test are
carried here. Aether `quants/cubes` carries its lines 20-49 and 55-296, which contain both ranges;
lines 1-19 are the `//!` header and `#![allow(dead_code)]`, and the comment at 50-54 carries a
co-author's name at line 53.

## Reused, not copied

`asolaria-behcs1024-60d` (aether `kernel/behcs1024-60d`, Federation-1024 @ dc1da1a9 `project_60d`)
is a path dependency, re-exported as `quant_exact::fed60d`.

## Referee sources (cold lane; mirrored, not vendored)

`tools/referee.py` uses only the Python standard library. Where the owner wrote Python it copies
the owner's lines; elsewhere it mirrors the vendored Rust line by line:

| referee function | source (blob) | lines |
|---|---|---|
| `transcode_256_to_1024`, `transcode_1024_to_256` | Q-PRISM `qprism/cube_absorb.py` (542d6573134911ce41a43613e6c027ce906362fe, same at 53023b6) | 118-140 |
| `word40_encode`, `word40_decode` | HYPER-BECHS--the-third-set @ 83a8a1e `third-seat-2026-07-12/behcs_ladder_roundtrip.py` (d45488aa8b8348c88253c497927ecb1d259f7ca8) | 25-29, 35-39 (numpy columns as ints) |
| `framed_encode`, `framed_decode` | same repo `third-seat-2026-07-12/gpt-crosscheck/behcs_ladder_framed_v1.py` (4c450ed0ecf7d0adf335b1e077f3123138aa8cc0) | 18-40 (numpy as ints) |
| `derive_selector` | same repo `omni-event-v1/omnievent_catalog47_60d_v1.py` (aecd916096b60aef2256a3929133ae9506f21fe5) | 77-92 |
| `to_symbols`, `from_symbols` | harness `src/lib.rs` 126-156 = dbbh `src/lib.rs` 170-204 | — |
| `binary_*`, `hex_*` | harness `src/lib.rs` 103-124, 213-219, 262-267 | — |
| `hyper60`, `from_hyper60` | dbbh `src/lib.rs` 223-247 | — |
| `fed_sha256`, `fed_project_60d` | `kernel/behcs1024-60d/src/upstream/hwinv-sha256-project-60d.rs` 21-27, 94-116 | — |

Cross-checks run once in the cold lane (scratch, not committed): the owner's
`cube_absorb.py` functions at lines 118-149, loaded unchanged from the file, give the same 2,560
symbols (stream sha256 `8d454eac…6395`) and `byte_identical=True` on the 53023b6 tuple; the owner's
`behcs_ladder_roundtrip.py` on enwik8 printed `glyphs=80000000`, `sha256_black` = `sha256_white`
= `2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8`, `info_rate=1.000000`,
`READBACK=VERIFIED_CLONE_0_LOSS` (numpy 2.5.4, Python 3.13.16; the script's own wall times vary by
run: it printed `encode_s=9.0 decode_s=6.0` in the first run and `encode_s=8.7 decode_s=2.6` on the
re-run of 2026-10-17, with every other printed value the same); the
owner's `behcs_ladder_framed_v1.py --property` printed `cases=276|max_len=8138|status=PASS`.

## Privacy

Before copying, every file was scanned for e-mail addresses, phone numbers, IP addresses, keys,
tokens and personal names. Names found in the copied files: the owner's own name and handle, and
the owner's seat and device labels (`acer`, `liris`, `ACER-CLAUDE-FABLE5`). The full
`host8/dbbh_coms_quant_prism.rs` has a PID label containing a personal first name (line 633), and
the full `host8/qprism_cube_host8.rs` has a citation with a co-author's name (line 53); neither
whole file is copied, only the line ranges above, which contain no personal names; their only
labels are the device PIDs `PID-AI-ACER-60D` and `PID-HW-QPRISM-60D` (`dbbh_coms_quant_prism.rs:586-587`)
and the placeholders `PID-SRC-60D` / `PID-DST-60D` (611). No file from the private mirror was used.

## Not copied

- qprism-3d-slice-harness: `adversarial_crt.rs` (root file, not part of the crate), `docs/`,
  `verification/`, `index.html`, `STARPORT-2026-08-08.hbp`, sidecars, `.github/`.
- dbbh-coms-quant-prism: `docs/`, `verification/`, `index.html`, `STARPORT-2026-08-08.hbp`,
  sidecars, `.github/`.
- Q-PRISM: everything except the four line ranges and `LICENSE` (see Privacy).

## Not brought in, with evidence

- **asolaria-behcs-256 BEHCS-256 glyph alphabet** (slot 18 names `asolaria-behcs-256` as co-owner).
  Upstream @ 818cc235: `tools/behcs/codex-bridge.js:50-60` `encodeGlyph` (little-endian base-256
  digits of a 64-bit value, width `canonical_width` = 8) and `:63-67` `hilbertAddress` (first 8
  bytes of sha256(String(key)), big-endian, then `encodeGlyph`); the 256 glyphs are in
  `data/behcs/codex/alphabet.json` (blob 8d4a3298576ce2c9d4a1683ffab667c8a743fc42; 256 distinct
  one-character glyphs). The repository has the encoder only: a search of its .js/.mjs/.ts/.cjs
  for `decodeGlyph|glyphToValue|fromGlyph|glyphs.indexOf` finds only `tools/crypto/crypto-capsule.js:154-161`,
  which decodes an `hg256a:` hex transport of glyph strings. The alphabet exists only as JSON, and
  the build contract allows no JSON file or JSON parsing in new work, so carrying it needs the 256
  glyphs restated as an HBP data file; that is left to the integrator. Two of the 256 glyphs are
  the HBP separators: value 80 is `=` and value 91 is `|`. The owner's Python port is
  HYPER-BECHS `omni-event-v1/omnievent_catalog47_60d_v1.py:65-74`. Measured once in scratch with
  that algorithm: `hilbertAddress("falcon")` = `⁂←α.Vυ(∞`, the value `codex-bridge.js:11` states.
  Slot 18's byte rung (8-bit symbols equal to the bytes) is carried here by dbbh and the harness.
- **HYPER-BECHS--the-third-set** (slot 20 co-owner) holds Python, not Rust, for these rungs: the E8
  ladder, the framed ladder and the selector port, used above as referee sources.
- **Q-PRISM Python tests in CI.** `tests/test_cube_absorb.py` (blob f8099ab14e678afebc1d886e1161b2f6e5474cae,
  same at 53023b6) imports the `qprism` package, whose `__init__.py:9-10` imports `physics.py:27`
  and `harness.py:22`, which import `scipy`. The CI job here installs no scipy and no pytest, so
  CI does not run these tests; the reason is the CI environment, not the code. Measured once in
  scratch: scipy 1.18.1 installed with `pip install --no-deps --target <scratch>/scipy-site scipy`
  into the torch venv's interpreter (Python 3.13.16, numpy 2.5.4), the Q-PRISM checkout @ b4a21a2
  and that directory put on `sys.path`, and every `test_*` function of the file called directly
  (pytest is not installed): `passed=11|total=11`, including
  `test_roundtrip_lossless_transcode_comb_coherence` (116-122), the count the `53023b6` commit
  message states ("Python 11/11"). `roundtrip_proof(absorb_window(_fixture_window(), subject="S5").tuple)`
  gave `orig_bytes=3200`, `symbols_1024=2560`, `byte_identical=True`, orig and recovered sha256
  `969d2b5e…585a`. This is the owner's float code (numpy, scipy) run unchanged; the scratch
  install was deleted afterwards.
- **Q-PRISM `dbbh_coms_quant_prism.rs` test 627-660**
  (`system_address_only_crossing_reconstructs_only_from_retained_store`): not carried, because line
  633 carries a personal first name (Privacy). Every item it calls (`DoubleBinaryCapsule`,
  `prepare_packet`, `DbbhPacket::hbp_row` / `hbi_row` / `recover`, `ContentStore::insert_exact`,
  `audit_replay_row`, the private `hex_lower`) is in the carried lines 16-514. It was run once in
  scratch on the whole upstream file with the command at its line 10 (`rustc +1.81.0 --test`):
  6 passed of 6.
- **E9 corpus.** Not re-run: `enwik9.zip` is on disk, unpacking needs about 1 GB and the container
  had about 2.5 GB free. `examples/rung.rs` takes any file.
- **Further ladder rungs.** The owner documents state the 43+ level ladder as CANON; these
  repositories hold no code for rungs beyond 6/8/10-bit symbols and the 60D reshape.

## Lints and formatting

- `cargo clippy --workspace --all-targets -- -D warnings` passes on all three members. No `-A` flag
  is passed; the vendored crates and `src/` carry no `allow` attribute; the one `allow` in files
  written here is `#![allow(dead_code)]` in the shared test helper `tests/common/mod.rs:3`, because
  `tests/groupoid.rs` uses only `inputs()` from it. The upstream crates' own CI runs the same
  command (`.github/workflows/rust-1.81-clippy-verification.yml`). Q-PRISM's CI finds no `Cargo.toml` and records clippy as
  `NOT_MEASURED`; the carried ranges are clippy-clean. (Clippy reports `format_collect` at
  `qprism_cube_host8.rs:25`, outside the carried ranges.)
- `cargo fmt -p asolaria-quant-exact -p qprism-3d-slice-harness -p dbbh-coms-quant-prism --check`
  is clean; the two upstream crates were already rustfmt-formatted. The Q-PRISM ranges enter via
  `include!`, which rustfmt does not reformat, so their upstream layout is kept. `cargo fmt --all`
  also walks the path dependency `kernel/behcs1024-60d`, whose `src/lib.rs` test block is not in
  rustfmt layout (for example line 86), so CI here names the three packages.
- Cargo prints "profiles for the non root package will be ignored" for the two vendored manifests;
  the root `Cargo.toml` restates their identical `[profile.release]`.

## Files added here

`Cargo.toml`, `Cargo.lock` (4 packages, no third-party crates), `rust-toolchain.toml`,
`.gitattributes`, `UPSTREAM.sha256`, `README.md`, `PROVENANCE.md`, `src/lib.rs` (re-exports, the
two `include!` modules and the `pack`/`unpack` wrappers), `tests/{common/mod.rs, exact_lanes.rs, groupoid.rs, status.rs,
upstream_qprism.rs}`, `tests/fixtures/exact-lanes.hbp` (written by the referee), `tools/referee.py`,
`examples/{grid.rs, rung.rs}`.

## License

qprism-3d-slice-harness and dbbh-coms-quant-prism: `MIT OR Apache-2.0` (their `Cargo.toml` line
6) with an MIT `LICENSE`. Q-PRISM: MIT `LICENSE`. This crate: `MIT OR Apache-2.0`.
