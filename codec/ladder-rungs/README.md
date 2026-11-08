# asolaria-ladder-rungs

Tests only. The metatag ladder round trips of the owner's DBBH -> DBWH codec
(`holographic-wormhole-codec` @ `4901280`, vendored unchanged in [`../dbbh-dbwh/`](../dbbh-dbwh/)).
Rust 1.81, integer arithmetic only, no code exported. Its one dependency is the codec, by path
(dev-dependency).

## Why this crate exists

On 2026-10-18 commits `231a050` and `1e20fa5` added the two ladder tests to the vendored
`src/lib.rs` and a section to the vendored `README.md`. From then on `sha256sum -c UPSTREAM.sha256`
in `../dbbh-dbwh/` failed on both files (MEASURED at `7c4711f`: 3 OK, 2 FAILED). On 2026-11-08 the
two files were restored to the upstream blobs (`237c82a2…`, `749f30d9…`) and the tests moved here.
The test bodies are unchanged apart from rustfmt line wrapping.

## How the tests reach the codec's private functions

The codec keeps `to_symbols`, `from_symbols` and `hex` private, and its public API
(`nexus_transcode`, `nexus_untranscode`) reaches only the widths of its four named rungs: 6, 8 and 10.
[`src/upstream/hex.rs`](src/upstream/hex.rs) and [`src/upstream/symbols.rs`](src/upstream/symbols.rs)
are byte-identical extracts of the codec's `src/lib.rs`, lines 92-98 and 394-424, CRLF line endings
as upstream (`src/upstream/.gitattributes` marks them `-text`). The test module compiles them with
`include!`. So the width 1..16 sweep runs the codec's own lines compiled in this crate, not the
codec crate's compiled object. Two guard tests tie the two together.

## Tests (4)

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
(aether-written, 2026-10-18). It stays in `../dbbh-dbwh/`, unchanged, because `aether-universe`
(committed from ACER, `65aa4d4`) cites that path and its line 16 (`src/sources.rs:21,191`,
`tests/secrets.rs:257`), and a test there asserts the path exists. Its line 6 names the place the
tests were in when it was written. `UPSTREAM.sha256` does not list it.

MEASURED on 2026-11-08 (cloud seat, Rust 1.81.0; `check.sh`):

- Before the move, in `../dbbh-dbwh/` at `7c4711f`: `cargo +1.81.0 test --locked metatag_ladder`
  ran 2 tests, 2 passed.
- After the move, here: 4 tests, 4 passed; the 2 ladder tests printed the same 18 rows, byte for
  byte, and those rows equal lines 7-24 of the receipt: 1,372,688 round trips for widths 1..16 and
  4,530,752 for widths 1..64, 0 failures, `receipt_sha256=ed2bc694…`.

The seed repository (`Metatagging-data-for-a-Quantum-universe`) proved the 256↔1024 rung (width 10);
it is in the sweep. MEASURED here: widths 1..64. Wider widths are argued from the construction (a
reversible regrouping of the bit stream for any width), not measured: UNVERIFIED. The 43+
Brown-Hilbert dimensional catalog is a different structure; its 60-D tuple (`kernel/behcs1024-60d`)
is a one-way SHA-256 projection, not a ladder rung.

## Run

```sh
./check.sh   # extracts, fmt, clippy -D warnings, the 4 tests, no float, rows = receipt lines 7-24
```

License: MIT OR Apache-2.0, as the codec.
