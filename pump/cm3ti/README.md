# cm3ti

Vendored, byte-identical copies of the owner's `cm3ti` integer-deterministic context-mixing
compressor family (the `rust/` tree of the honest-compressor tool, ACER export 2026-10-18, cloud
session 9ebd6119), built as one crate with one binary per source file. Rust 1.81.0, std-only, zero
third-party dependencies. Upstream paths, sizes, git blob ids and sha256 for every vendored file are
in `PROVENANCE.md`; the sha256 pins are in `UPSTREAM.sha256`.

## What is here

- `rust/*.rs`, `rust/variants/*.rs` — 31 compressors, byte-identical to the owner's export.
- `rust/RUN-ENWIK9.md`, `rust/variants/RECEIPT-RAINBOW.md` — the owner's receipts, byte-identical.
- 30 of the 31 are integer-deterministic and each is a `[[bin]]`. `rust/cm3t.rs` is the owner's
  **float** reference: vendored but **not** built here (see below).

`cm3ti.rs` is the base — lpaq-style integer stretch/squash tables and a fixed-point mixer, 16-bit
probability. Every other integer file is a small delta off it, adding a content-keyed second mixer
("sector"/"wheel"), a three-mixer stack, a generalized ladder (`cm3ti_rbladder`, `RB_MODE`),
larger match tables (`tb*`, `vc*` `TBITS` 26/27/28), or a gated URL/path field (`vc*`). The groups
and what each binary computes are in `PROVENANCE.md`.

Each binary is run as `<bin> <file> <k>` and prints a line ending
`payload=<B> ... restore=OK comp_sha=<16 hex>`, with a built-in SHA-256 restore gate (lossless or
the run is invalid). Nine variants `fs::metadata` a sibling `.rs` at runtime for a display field
only (it never affects `payload`/`comp_sha`), so the `rust/`+`rust/variants/` layout is kept intact.

## The float reference is not in the hot lane

`rust/cm3t.rs` uses f64 throughout (mixer, APM, rate ramp) and its output is not reproducible across
platforms or languages (the owner records a 13-byte Rust-vs-Python drift at `RESULTS.md:188`). It is
kept vendored byte-identical for provenance but has no `[[bin]]`, so it is not built or run here. The
30 built binaries are integer on the compressed path (proven by byte-exact `comp_sha`); the only
float in them is the owner's display/timer lines, which never touch the compressed bytes
(`PROVENANCE.md`, "Float inside the 30 integer binaries").

## Build and check

```
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 clippy --locked --all-targets -- -D warnings \
  -A clippy::unnecessary_cast -A clippy::suspicious_else_formatting \
  -A clippy::manual_clamp -A clippy::needless_range_loop \
  -A clippy::identity_op -A unused_variables
cargo +1.81.0 build --locked --release
scripts/check.sh <path-to-enwik8>
```

`scripts/check.sh` takes the first 1,000,000 bytes of the public `enwik8`
(`http://mattmahoney.net/dc/enwik8.zip`), checks that slice's sha256, then re-runs the owner's
recorded 1 MB k=7 anchors and compares them byte-exact to the recorded numbers (file:line):

- `cm3ti` — `comp_sha` begins `101c86ae`, identical across two runs (`RESULTS.md:333`).
- `cm3ti_sector` — `payload=242020` (`RESULTS-cloud-seat.md:106`), `comp_sha 251c0b44` (`RESULTS.md:459`).
- `cm3ti_rainbow12` — `payload=239869`, `comp_sha=53ad10066c34ac66` (`RESULTS.md:634`).
- `v6_even` — `payload=239869`, `comp_sha=53ad10066c34ac66` (`RESULTS.md:634`, `RESULTS-cloud-seat.md:67-68`).

`bpc` is not compared (it folds in the on-disk `.rs` size, which the owner's source has grown since
measurement); `payload` and `comp_sha` are input-only and match exactly.

The six clippy allows are named so the vendored bytes stay unedited; every other warning denies. The
`unused_variables` (`vc65.rs:149-150`) also appears on a plain `cargo build`. See `PROVENANCE.md` for
the sites and counts.

## License

`MIT OR Apache-2.0` by the owner's grant of 2026-10-18 (see `PROVENANCE.md`); `publish = false`
until the crates.io pass.
