# quants/cubes — combined-quant slots 21 and 25-28 (cube, word glyph, shard cube, tensor collapse, white room)

The owner's code for five slots of the combined-quant registry
(`vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp` lines 27, 31-34),
reproduced against the owner's recorded receipts. Rust 1.81, `#![forbid(unsafe_code)]`, no float
type, no JSON. Owner Rust is vendored byte-identical; owner JavaScript is ported line by line and a
stdlib Python referee (`tools/referee.py`) mirrors the same lines. `PROVENANCE.md` lists every file,
commit, blob id and sha256.

| slot | registry id (line) | here | upstream |
|---|---|---|---|
| 21 | `Q-CUBE3200-ABSORB-v1` (27) | `qprism`: the owner's Rust, two `include!` line ranges, its six tests run unchanged | Q-PRISM @ b4a21a2 `host8/qprism_cube_host8.rs`; tuple maker `qprism/cube_absorb.py` (cold lane, aether `eval/vendor/qprism-control`) |
| 25 | `Q-WORD-GLYPH-BUCKET8-v1` (31) | `ingest`: port | reductions @ 29307bf `cubes/ingest-google-to-cube.mjs` |
| 26 | `Q-SHARD-CUBE-v1` (32) | `shard`: port of the rotor's shard fold; codecs from `quants/hyperbehcs` (slots 9-12) | Asolaria-hermes-work @ 84f0b20 `room-rotor/hyperbehcs-d-drive-10000-room-rotor.mjs` |
| 27 | `Q-TENSOR-OMNISHANNON-COLLAPSE-v1` (33) | engines located, not brought in (Node CLIs over operator-local state, see below); the document lines are quoted in `tests/registry.rs` | reductions `ASOLARIA-TENSOR-COLLAPSE-EXCAVATION-2026-06-16.md`; engines asolaria-behcs-256 @ 818cc23 `tools/cube/` |
| 28 | `Q-WHITEROOM-GULP-MINT-v1` (34) | `whiteroom` (engine, store, scorer, sector PIDs, Hilbert), `gc` (GC runtime), `consumer` (3×6×6 address): ports | asolaria-whiteroom-engine @ 896518a; after-100B @ c59e2e6 `backend/gc-runtime.mjs`; Shannon stage @ 32f9670 `pipeline/whiteroom-consumer-index.mjs` |

## Receipts reproduced

- **Slot 21.** STAGE2-CUBE-ABSORPTION.md:11 records node PK `handle8 = FNV-1a-64(node_id) =
  5bd9437e2a3fe005` and the row of lines 43-45 (`glyph=gly-stcI`, `feat_sha16=5d8b102753b7fcfb`,
  `tuple_sha16=969d2b5e47e97e3e`). The owner's Python (numpy 2.5.4) on the fixture window of
  Q-PRISM `tests/test_cube_absorb.py:10-13` gives the same `feat_sha16`, `tuple_sha16` and, for the
  node id of `cube_absorb.py@aee7e2c:131`, `handle8` and `glyph`; the vendored Rust `Host8::fnv1a64`
  gives `5bd9437e2a3fe005` for that node id. The b4a21a2 code names the node `qprism_cube:{tuple8}`:
  Rust and Python both give `c1e9c91073156144`, prefix `122.457.65.817.344.324`. The cross-colony
  pair `qprism_cube:7be9d49b3af31036 -> 5edd3a45544437d4` holds in both. On the cube's own 3,200-byte
  tuple the vendored transcode gives the same 2,560 symbols as the Python (stream sha256 `154d6294…`)
  and recovers the tuple byte-identically. 81 prefix/injection pairs agree.
- **Slot 25.** The 12 receipts in reductions `cubes/` (11 Drive ingests, 1 paper): every footer
  sha256 recomputes over its body (referee), and every content address (`cube10[..16] = handle8 =
  sha256_16`), both reduction ratios and all 120 catalog glyphs `g` + `sha256(word)[..8]` recompute
  in Rust; `cloud-cycle-002-receipt.hbp:3-10` (8 ratio rows) recompute. Four receipts carry the
  vendored file's own `INGESTBOUNDARY` row and footer verdict; eight (`cycle=CLOUD-CYCLE-002`,
  verdict `INGEST-NOT-INTEGRATE`) carry other constants than lines 46 and 48 of the vendored file.
- **Slot 26.** The rotor's vector for shard-0000 of the 10,000-room run is `[100, 9, 9, 8, 8, 8, 0,
  4950]`; slots 9-12 with the rotor's seed `HYP-D-10000-ROOM-ROTOR:shard-0000` and target dimension 4
  give the recorded projection `[0.883159333634, 0.00297360045, 0.000174917674, -0.004372941837]`,
  turbo codes and metadata, polar codes and metadata and triple codes of
  `cubes/sample-shard-quant-cube.annotated.json` (reductions @ 29307bf, lines 11-39).
- **Slot 28.** falcon-orbital's triple confirm (`BH.SECTOR.P2.R0000000.7593C541`,
  `BH.SECTOR.P3.R0000007.36AF9CC9`, `BH.SECTOR.P7.R0999999.DBB1CB9C`, primes 2..19) and
  bigpickle-rebuild `src/fabric-sector-cycle.mjs:20` (`BH.SECTOR.P2.R0000000.7593C541 = 0.755838`)
  reproduce; the owner's 11 node tests of `liris-whiteroom-engine.test.mjs` and
  `liris-sector-emitter.test.mjs` are restated as Rust tests and pass.

## Measured, as computed (neutral record)

- Slot 21: Python `host8_from_sha256` hashes a non-hex source (`referenced-on-D` -> `6d1cd41c019f8481`);
  the Rust `Host8::from_sha256_prefix` returns `Err("sha256 hex prefix must have at least 16
  chars")` for it. The Rust `cube_row` carries a subset of the Python `hbp_row` fields; the two
  differ in `selector_axis:glyph-family` (`HG1024_QPRISM_gly-iG0O` vs `HG1024:QPRISM:iG0O`), and the
  Python row adds `node`, `dataset`, `license`, `subject`, `session`, `modality`, `win_start_s`,
  `win_dur_s`, `n_samples`, `feat_sha16`, `tuple_sha16`, `source_sha256` (`tests/qprism.rs`). The doc
  line 10 says "(4/4)", written at 0aa7a4b when the file had four tests; d523819 and 53023b6
  added two, and all six pass here.
- Slot 26: the core packets' fingerprints (`7537cbc978efdf3d`, `d00ff9cd55610664`,
  `2924d8a9cfab3c1d`, `41b742e1c3318458`) differ from the receipt's (`e6f9b1e70d83c377`,
  `aeb89437d368a39c`, `bcedf0fa35ddfb71`, `9083f572b7853c75`); the receipt's metadata carries
  fields the core packets do not (`zeroPoint`, `radiusBits`, `angleBits`, lane objects with bits
  4/8/8). A bounded search (a scratch script, not shipped here) over 209,592 pre-images shaped as
  the four codec packets (JL, Turbo, Polar, Triple: key subsets and orders, with and without the 16
  zero counters, compact and indented) found none of the five recorded fingerprints; no
  payload-shaped pre-image was built, so `payloadFingerprint` `24c347a1008e5e3e` was not searched.
- Slot 28: the default engine's smoke run (`engine:194`) seals 12 mistakes and 0 genius; over the
  owner test's 200 marks (`room:0..199`) 53 genius and 147 mistakes. `DeterministicScorer` is, in the
  owner's words, "the PLACEHOLDER (address-derived sha, ignores work content)" (engine:103).

## Not brought in (evidence in PROVENANCE.md)

`buildQuantizedSubstrateReceipt` (rotor:13-16, `src/behcs/hyperbehcsQuantSubstrate.js`), so the
slot-26 receipt shape and its five fingerprints; the source texts of the 12 ingest receipts, so
their `quant8` values; the slot-27 engines (`omni-shannon-v4-real.js`, `-v3-4d12.js`,
`-v5-deep-cascade.js`, `run-deep-cascade-gated.js`, `omni-shannon.js` in asolaria-behcs-256 @
818cc23 `tools/cube/`), Node CLIs that read operator-local state; GULP/SUPER-GULP frames (`gulp.mjs`, `super_gulp.mjs` import the
absent `../bpi-codec.mjs` and `../quant-bus.mjs`); cube minting (`cube-builder.js`,
`behcs1024-prism-overlay-mint.mjs`: JSON files with timestamps); `L0GnnScorer` (HTTP + JSON to
:4792; aether runs L0 in `model/l0-edge`).

## Run

    sha256sum -c UPSTREAM.sha256
    cargo +1.81.0 fmt --check
    cargo +1.81.0 clippy --locked --all-targets -- -D warnings
    cargo +1.81.0 test --locked                      # 47 tests
    python3 -I -B tools/referee.py --check
    python3 -I -B tools/referee.py --grid 20000 | cargo +1.81.0 run --locked -q --release --example grid
    python3 -I -B tools/qprism_receipts.py --check   # needs numpy
    cargo +1.81.0 run --locked -q --example whiteroom_smoke
    cargo +1.81.0 run --locked -q --example ingest -- <file>
