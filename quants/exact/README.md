# quants/exact — combined-quant slots 13, 14, 17-20 (exact re-representations)

The owner's own Rust for the exact rungs of the combined-quant registry, vendored byte-identical
and built in place, with the owner's own tests run unchanged. Rust 1.81, integer only, zero
third-party crates, no JSON. See `PROVENANCE.md` for every file, commit, blob id and sha256.

| slot | registry id (line) | owner | code here |
|---|---|---|---|
| 13 | `R-BINARY-BYTES-v1` (19) | qprism-3d-slice-harness | `slice_harness::Wavelength::Binary` |
| 14 | `R-HEX-v1` (20) | qprism-3d-slice-harness | `slice_harness::Wavelength::Hex`, `hex` / `unhex` |
| 15 | `R-HBP-v1` (21) | asolaria-hbi-hbp | aether `hbp/` (not in this crate) |
| 16 | `R-HBI-v1` (22) | asolaria-hbi-hbp | aether `hbp/` (not in this crate) |
| 17 | `R-BEHCS64-v1` (23) | dbbh-coms-quant-prism | `dbbh::Level::Behcs64`, harness `Wavelength::Behcs64`, `qprism_dbbh_ladder` width 6 |
| 18 | `R-BEHCS256-v1` (24) | dbbh-coms-quant-prism + asolaria-behcs-256 | `dbbh::Level::Behcs256`, harness `Wavelength::Behcs256`, `qprism_dbbh_ladder` width 8 |
| 19 | `R-BEHCS1024-v1` (25) | dbbh-coms-quant-prism + Q-PRISM | `qprism_transcode` (Q-PRISM 53023b6), `dbbh::Level::Behcs1024`, harness `Wavelength::Behcs1024`, `qprism_dbbh_ladder` width 10 |
| 20 | `R-HYPERBEHCS60D-v1` (26) | HYPER-BECHS--the-third-set + Q-PRISM | reshape `dbbh::to_hyperbehcs` / `from_hyperbehcs`, harness `Wavelength::HyperBehcs`; selectors `dbbh::QPrismCube`, `slice_harness::project_60d`, and `fed60d::project_60d` (aether `kernel/behcs1024-60d`, reused, not copied); Q-PRISM frame `qprism_dbbh_ladder::HyperBehcsFrame` with `qprism_dbbh_ladder::Pid60D` |

Line numbers are of `vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp`.

## MEASURED and CANON, as the owner's documents state them

`tests/status.rs` checks every quoted HBP row against the vendored file, line by line.

- Registry line 35: `TRANSLATE|formula=T_i_j=E_j_after_D_i|inverse=T_j_i_after_T_i_j=id|compose=T_j_k_after_T_i_j=T_i_k|measured=BEHCS256-to-1024|other_43plus_rungs=CANON_UNTIL_RECEIPTED|json=0`
- Lattice (`ASOLARIA-COMBINED-QUANT-LATTICE-2026-07-13.hbp`) status fields:

| lattice line | id | status |
|---|---|---|
| 3 | `LEVEL-GROUPOID` | `CANON+one-rung-MEASURED` |
| 30 | `R-BINARY-BYTE-v1` | `MEASURED_REPO` |
| 31 | `R-HEX-v1` | `MEASURED_REPO` |
| 34 | `R-BEHCS64-v1` | `MEASURED_REPO-in-rust-crates` |
| 35 | `R-BEHCS256-v1` | `MEASURED_REPO` |
| 36 | `R-BEHCS1024-v1` | `MEASURED_REPO+MEASURED_SEAT` (`reference=5bytes-to-4glyphs`, `rate=1.0`) |
| 37 | `R-HYPERBEHCS60D-v1` | `CANON+component-measured` (`capacity_not_materialization=1`) |
| 38 | `R-PRISM-COMB-GROUPOID-v1` | `CANON+one-rung-MEASURED` (`all_pairs_measured=0`) |
| 67 | `E8-E9-FOUR-TEST-v1` (`QRECEIPT`) | `MEASURED_SEAT-RECEIPT-PRESENT` (`tests=E8-rebase+E9-rebase+codec-v0-held+codec-v0.1-restore`) |

- Lattice line 67 in full: `QRECEIPT|id=E8-E9-FOUR-TEST-v1|status=MEASURED_SEAT-RECEIPT-PRESENT|sha256=86d4dc4a07228c39d898afdad5c8e61ab2e2ecc19b5a59effb79f85f1e37c358|tests=E8-rebase+E9-rebase+codec-v0-held+codec-v0.1-restore|json=0`.
  Its `sha256` is the sha256 of the owner's receipt `receipts/E8-E9-THIRD-SEAT-RECEIPT-2026-07-12.md`
  (Algorithms-of-Asolaria @ d399d13, blob 7b0816a2; its `.sha256` sidecar gives the same value),
  whose lines 23-24 give `sha256_black` = `sha256_white` = `2b49720e…24a8`.

- Atlas (`ASOLARIA-COMBINED-QUANT-ATLAS-2026-07-13.md:124-125`, Algorithms-of-Asolaria @ d399d13):
  "The 256↔1024 rung is measured. The root 43+ level groupoid remains canon until each additional
  rung has its own round-trip receipt."
- Lattice text (`ASOLARIA-COMBINED-QUANT-LATTICE-2026-07-13.md`): under "Measured today:"
  (line 420) the lines "BEHCS-256 <-> BEHCS-1024 reference rung" (423) and "E8/E9 external corpus
  5-byte <-> 4-glyph rebase (third-seat receipt supplied)" (424); under "Canon today:" (427) the
  line "43+ level omnidirectional translator groupoid" (430); line 433: "Boundary: most additional
  level pairs remain unmeasured until each has its own exact round-trip."
- `canon/PRISM-COMB-0LOSS-LAW.md:19`: "Class B instance — level transcode 256 ↔ 1024 — MEASURED
  (Q-PRISM commit `53023b6`)"; line 80: "MEASURED: the 256↔1024 transcode (Q-PRISM `53023b6`,
  cross-checked `79e8d63` / `de00aca`)"; lines 82-83: "CANON: the 43+ ladder frame, groupoid
  translators, Brown-Hilbert expansion law, the prism/comb duality framing."; line 84:
  "UNVERIFIED: every unproven rung of the ladder; any fully-materialized expanded-slice runtime."
- `vendor/dbbh-coms-quant-prism/README.md:103-107`: "`MEASURED` — the ladder bijections (each
  round-trip) ..."; "`CANON` — IX-737 (the security architecture); `PRISM-COMB-0LOSS` (the
  `256↔1024` bijection)."
- `vendor/qprism-3d-slice-harness/README.md:55`: "`MEASURED`: the seven lossless wavelength
  round-trips, declared SHA shadow, OmniShannon edge-watch, multi-cylinder no-store recombine,
  60D/N-D selectors, and byte-identical proof-or-Held behavior."
- Q-PRISM `MAP.md:3` @ b4a21a2: "the 256↔1024 level-transcode round-trip lives here (`53023b6` —
  5 bytes ⇄ 4 symbols at lcm(8,10)=40 bits, sha256-identical, Rust==Python; MEASURED), alongside
  the calibrated prism sim (`79e8d63`, `de00aca`)."

Q-PRISM commit contents (`git show --stat`): `53023b6` adds `transcode_256_to_1024` /
`transcode_1024_to_256` and their tests to `host8/qprism_cube_host8.rs`, `qprism/cube_absorb.py`,
`tests/test_cube_absorb.py`, `docs/STAGE2-CUBE-ABSORPTION.md`. `79e8d63` changes `README.md`,
`qprism/physics.py`, `results/sweep-calibrated.log`; `de00aca` changes `README.md`,
`results/coupling-sweep-calibrated.json`, `results/sweep-calibrated.log`. The transcode code is in
`53023b6` only; this crate carries those lines.

## What this crate's tests and examples measure

These are measurements made here. They do not change any owner status above.

- **256↔1024 rung (Q-PRISM 53023b6 fixture).** The 3,200-byte cube tuple of
  `qprism_cube_host8.rs:268` gives 2,560 symbols beginning `2, 951, 460, 1007`, symbol-stream
  sha256 (big-endian u16) `8d454eac…6395`; decoded sha256 `fe28e4a1…f05e` equals the input's. The
  owner's Python (`qprism/cube_absorb.py:118-149`, executed unchanged) gives the same stream and
  `byte_identical=True`. Q-PRISM's own Rust test (`qprism_cube_host8.rs:265-273`) runs unchanged
  in `tests/upstream_qprism.rs`. `DE AD BE EF 42` gives the 4 glyphs `890, 731, 955, 834`.
  Q-PRISM's Python tests (`tests/test_cube_absorb.py`, 11 functions, including the transcode test at
  116-122) were run once in scratch with scipy added: 11 of 11 passed (see `PROVENANCE.md`).
- **E8 corpus.** `examples/rung.rs` on enwik8 (100,000,000 bytes, sha256 `2b49720e…24a8`, the
  value in the owner's E8 receipt): 80,000,000 BEHCS-1024 symbols, `bits_out = bits_in`, all four
  Rust implementations emit the same stream and all four decoders return the input
  (sha256-identical). BEHCS-64: 133,333,334 symbols (4 pad bits), 3 implementations agree and
  round-trip. BEHCS-256: 100,000,000 symbols. HyperBEHCS: 1,333,334 tuples of 60, round-trips.
  The owner's `behcs_ladder_roundtrip.py` on the same file printed `glyphs=80000000`, both sha256
  `2b49720e…24a8`, `info_rate=1.000000`, `READBACK=VERIFIED_CLONE_0_LOSS`.
- **Owner inputs.** `tools/referee.py` (stdlib) writes `tests/fixtures/exact-lanes.hbp`: 28 owner
  test inputs, 245 `LANE` rows (7 of them PID selectors), 302 rows in all. `tests/exact_lanes.rs` recomputes every row with the
  vendored Rust and decodes every exact lane with every decoder: binary, hex, BEHCS-64/256/1024,
  HyperBEHCS reshape.
- **Translator law.** `tests/groupoid.rs` runs `T_i_j = E_j ∘ D_i`, `T_j_i ∘ T_i_j = id` and
  `T_j_k ∘ T_i_j = T_i_k` for all 9 ordered pairs and 27 compositions of {64, 256, 1024} on the 28
  owner inputs, with dbbh `relate` and Q-PRISM's `pack_symbols`/`unpack_symbols` (through this
  crate's `pack`/`unpack` wrappers, `src/lib.rs:38-46`).
- **Framed form.** HYPER-BECHS `behcs_ladder_framed_v1.py` pads to whole 5-byte words and emits
  `4·⌈n/5⌉` glyphs; the vendored packers emit `⌈8n/10⌉`. On every input the framed stream equals
  the packed stream followed by zero glyphs; for `n % 5 = 0` they are identical (the
  `word40` rows, HYPER-BECHS `behcs_ladder_roundtrip.py:25-29`).
- **60D selectors.** dbbh `derive_selector` (via `QPrismCube`), harness `project_60d` and
  `project_nd(…, 60)` and HYPER-BECHS's Python port (`omnievent_catalog47_60d_v1.py:77-92`) agree
  on the 7 owner (PID, content) pairs. These hash `pid ‖ counter ‖ content`. Federation-1024's
  `project_60d` (reused from `kernel/behcs1024-60d`) hashes `tuple ‖ counter` with a 4-byte
  big-endian counter that takes the values 0-3 (`hwinv-sha256-project-60d.rs:94-116`); its `sha256`
  reads at most `TUPLE_CAP` = 512 bytes (lines 21-27). From 509 bytes on, the counter's low byte,
  the only byte that differs between 0 and 3, falls past the 512 hashed bytes, so the four hashes
  are equal and the 60 glyphs repeat with period 16 (measured on the 999-, 3,200-, 4,097- and
  10,000-byte owner inputs, the four inputs of 509 bytes or more). Q-PRISM's `HyperBehcsFrame`
  (`dbbh_coms_quant_prism.rs:354-398`) holds a content address `Agt` (the content's sha256, kept in
  a `ContentStore`) and two `Pid60D` selectors; `Pid60D::derive` (312-340) hashes
  `pid | mode | sha16_hex(agt) | counter` with a 1-byte counter, a different seed from the
  selectors above, so its axes are not compared with theirs. Its own tests (lines 579-625) run
  unchanged in `tests/upstream_qprism.rs`. Selectors are referential: no source is recovered from
  them; `HyperBehcsFrame::recover` is the store lookup by `Agt` (382-384).
- **Grid.** `python3 -I tools/referee.py --grid 2000 | cargo run --release --example grid`: 2,000
  seeded random inputs (every length 0-65, then 0-1,100), 0 differences.

## Run

    cargo +1.81.0 test --locked                    # 40 tests: 13 here, 19 dbbh, 8 harness
    cargo +1.81.0 clippy --locked --workspace --all-targets -- -D warnings
    python3 -I tools/referee.py --check
    python3 -I tools/referee.py --grid 2000 | cargo +1.81.0 run --locked -q --release --example grid
    cargo +1.81.0 run --locked --release --example rung -- <file>
