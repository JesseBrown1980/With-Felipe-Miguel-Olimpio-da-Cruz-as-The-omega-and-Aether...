# asolaria-ladder-rungs

Tests only. The metatag ladder round trips of the owner's DBBH -> DBWH codec
(`holographic-wormhole-codec` @ `4901280`, vendored unchanged in [`../dbbh-dbwh/`](../dbbh-dbwh/)).
Rust 1.81, integer arithmetic only, no code exported. Its one dependency is the codec, by path
(dev-dependency). (MEASURED 2026-11-08: `check.sh` passes with rustc 1.81.0, its no-float grep
included; `src/lib.rs` holds one `#[cfg(test)]` module; `Cargo.lock` lists the codec and nothing
else.)

## Why this crate exists

On 2026-10-18 commits `231a050` and `1e20fa5` added the two ladder tests to the vendored
`src/lib.rs` and a section to the vendored `README.md` (MEASURED: `git show --stat`). From then on
`sha256sum -c UPSTREAM.sha256` in `../dbbh-dbwh/` failed on both files (MEASURED at `7c4711f`: 3 OK,
2 FAILED). On 2026-11-08 the two files were restored to the upstream blobs (`237c82a2…`,
`749f30d9…`) and the tests moved here (MEASURED 2026-11-08: `git hash-object`; `sha256sum -c` 5 OK).
The test bodies are unchanged apart from whitespace (MEASURED 2026-11-08: with all whitespace
removed, the 206 lines that commit `701083b` took out of the vendored `src/lib.rs` and lines 63-278
of `src/lib.rs` here are the same 5,043 bytes).

## How the tests reach the codec's private functions

The codec keeps `to_symbols`, `from_symbols` and `hex` private, and its public API
(`nexus_transcode`, `nexus_untranscode`) reaches only the widths of its four named rungs: 6, 8 and 10
(MEASURED 2026-11-08: `../dbbh-dbwh/src/lib.rs` lines 92, 394 and 411 declare the three without
`pub`; `BehcsRung::width` gives 6, 8, 10 and 10).
[`src/upstream/hex.rs`](src/upstream/hex.rs) and [`src/upstream/symbols.rs`](src/upstream/symbols.rs)
are byte-identical extracts of the codec's `src/lib.rs`, lines 92-98 and 394-424, CRLF line endings
as upstream (`src/upstream/.gitattributes` marks them `-text`). The test module compiles them with
`include!` (`src/lib.rs` lines 14-15). So the width 1..16 sweep runs the codec's own lines compiled
in this crate, not the codec crate's compiled object. Two guard tests tie the two together. (MEASURED
2026-11-08: `check.sh` compares the extracts with those lines using `cmp`, and both guard tests pass.)

## Tests (4)

MEASURED 2026-11-08 (`check.sh`, rustc 1.81.0): `--list` gives these 4 tests and all 4 pass. The
counts below are asserted by the tests or printed in their rows: `tested=85793` for each width,
`total_tested=1372688` (16 × 85,793) and `4530752` (64 × 70,793, which is 65,793 + 5,000), and
`checked == 4 * (1 + 256 + 65_536)`.

- `tests::metatag_ladder_rungs_are_lossless_every_width`: widths 1..16 (alphabets 2..65536), byte to
  symbol and back, over every 0-, 1- and 2-byte input plus 20,000 seeded integer-random inputs per
  width (85,793 per width); the four named rungs crossed in a row; one `RUNG` row per width and a
  `LADDER` row with `receipt_sha256`, the SHA-256 of the 16 `RUNG` rows.
- `tests::metatag_ladder_keeps_going_past_16`: the same transform over `u64` symbols and a `u128`
  accumulator (aether's own code, not the codec's), widths 1..64, 5,000 seeded inputs per width; one
  `WIDE-LADDER` row.
- `tests::upstream_extracts_are_the_vendored_lines`: the two extracts equal those lines of
  `../dbbh-dbwh/src/lib.rs`, byte for byte.
- `tests::upstream_extracts_agree_with_the_public_nexus_api`: at widths 6, 8 and 10 the extracts give
  the same symbols and bytes as the compiled codec's `nexus_transcode` and `nexus_untranscode`, over
  every 0-, 1- and 2-byte input (4 × 65,793 inputs).

## Receipt

The rows are recorded in [`../dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp`](../dbbh-dbwh/RECEIPT-LADDER-RUNGS.hbp)
(aether-written, 2026-10-18, commit `231a050`). It stays in `../dbbh-dbwh/`, unchanged, because
`aether-universe` (committed from ACER: `65aa4d4` and `012c84c`, author `acer`) cites that path and its
line 16 (`src/sources.rs:21,191`, `tests/secrets.rs:257`), and a test there (`src/sources.rs:310-320`)
asserts the path exists. Its line 6 names the place the tests were in when it was written: run there
now, `cargo +1.81.0 test metatag_ladder` runs 0 tests (9 filtered out). `UPSTREAM.sha256` does not
list it. (MEASURED 2026-11-08: `git log`, `git grep RECEIPT-LADDER-RUNGS -- aether-universe`, that
run, and `grep -c RECEIPT ../dbbh-dbwh/UPSTREAM.sha256` = 0.)

MEASURED on 2026-11-08 (cloud seat, Rust 1.81.0; `check.sh`):

- Before the move, in `../dbbh-dbwh/` at `7c4711f`: `cargo +1.81.0 test --locked metatag_ladder`
  ran 2 tests, 2 passed.
- After the move, here: 4 tests, 4 passed; the 2 ladder tests printed the same 18 rows, byte for
  byte, and those rows equal lines 7-24 of the receipt: 1,372,688 round trips for widths 1..16 and
  4,530,752 for widths 1..64, 0 failures, `receipt_sha256=ed2bc694…`.

UNVERIFIED here: the seed repository (`Metatagging-data-for-a-Quantum-universe`) proved the
256↔1024 rung (width 10). This is carried over from the README section that `231a050` added; that
repository was not re-read for this crate. MEASURED: width 10 is in the sweep (receipt line 16).
MEASURED here: widths 1..64. Wider widths are argued from the construction (a reversible regrouping
of the bit stream for any width), not measured: UNVERIFIED. UNVERIFIED here: the 43+ Brown-Hilbert
dimensional catalog is a different structure, and its 60-D tuple (`kernel/behcs1024-60d`) is a
one-way SHA-256 projection, not a ladder rung; that kernel's own `README.md` (line 25) says it "does
NOT decode or reconstruct source tuples".

## Run

```sh
./check.sh   # extracts, fmt, clippy -D warnings, the 4 tests, no float, rows = receipt lines 7-24
```

License: MIT OR Apache-2.0, as the codec.
