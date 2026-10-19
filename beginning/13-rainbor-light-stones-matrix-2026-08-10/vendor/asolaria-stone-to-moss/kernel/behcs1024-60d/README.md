# Seat 3 — isolated BEHCS-1024 60D projection

This standalone Rust 1.81 crate implements the 60-coordinate SHA-256 mapping
and the eight-byte Host8 coordinate-derived handle without pulling in any
surrounding roster, boot hardware identity, ledger, or networking files.

## Immutable source lineage

- Upstream repository: https://github.com/JesseBrown1980/asolaria-federation-1024
- Upstream commit: dc1da1a9cd88b77eb463053312b7c42a7dbe9b33
- Source path: kernel/boot/src/hwinv.rs
- Source file Git blob: d08bc2a9ba6f3b63fec5249f0670d68c8df744d4
- Upstream function: project_60d
- BEHCS-1024 bus-fabric constant blob: 5de1be37a9265586682b68c3d30809f62e381227

The implementation is independently written from the numeric algorithm:
four 32-byte SHA-256 outputs from *tuple + big-endian u32 counter*. Adjacent
digest bytes form big-endian words, each masked to 10 bits. The first 60
selectors become 120 big-endian bytes; SHA-256 of those bytes yields the
coordinate digest and its first eight bytes form Host8.

This algorithm does NOT decode or reconstruct source tuples. A short Host8
identifier may collide; it is not a digital signature, a custody witness,
an instrument attestation, or a proof of physical 60D structure.

## Correctness boundary

The upstream SHA-256 helper caps its input at 512 bytes. The upstream projection
uses a tuple of at most 512 bytes and *adds a four-byte counter*. For tuple
lengths 509–512 the helper truncates part or all of that counter, making the
four counter blocks equal for ordinary low counter values. This crate uses a
**fail-closed 508-byte maximum** and is faithful to the upstream projection
for tuples in the inclusive interval 0..=508 bytes.

The coordinate SHA-256 must be matched against the original source SHA-256
and source bytes to establish reproducible custody. Information not retained
in the coordinate cannot be recovered by mathematical assertion.

## Build and compare

From this directory:

    cargo +1.81.0 test --locked --all-targets
    cargo +1.81.0 clippy --locked --all-targets -- -D warnings
    cargo +1.81.0 run --locked --bin behcs60-demo -- 616263

The example prints HBP-style text with 60 glyphs, original-input SHA-256,
coordinate SHA-256, and the 16-character Host8 handle. No JSON output.

Reference vectors for empty input, "abc", and the 508-byte safe limit were
computed with an independent Python hashlib SHA-256 construction. The
GitHub Actions verifier checks exact reference vectors, deterministic demo,
Clippy, and content inspection; it does not modify the original repositories.

This is a software address projection, not lossless 60-dimensional compression
or evidence of a physical quantum, gravity, or optical-memory mechanism.
