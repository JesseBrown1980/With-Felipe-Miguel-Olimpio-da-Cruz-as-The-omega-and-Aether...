# Seat 3 — isolated BEHCS-1024 60D projection

This standalone Rust 1.81 crate carries Federation-1024's own 60-coordinate SHA-256 mapping
and the eight-byte Host8 coordinate-derived handle without pulling in any
surrounding roster, boot hardware identity, ledger, or networking files.

## Immutable source lineage

- Upstream repository: https://github.com/JesseBrown1980/asolaria-federation-1024
- Upstream commit: dc1da1a9cd88b77eb463053312b7c42a7dbe9b33
- Source path: kernel/boot/src/hwinv.rs
- Source file Git blob: d08bc2a9ba6f3b63fec5249f0670d68c8df744d4
- Upstream function: project_60d
- BEHCS-1024 bus-fabric constant blob: 5de1be37a9265586682b68c3d30809f62e381227

The two upstream functions are included **byte-identical**: `src/upstream/hwinv-tuple-cap.rs`
is lines 99–101 of that file (`TUPLE_CAP`) and `src/upstream/hwinv-sha256-project-60d.rs` is
lines 147–262 (`sha256` and `project_60d`). `UPSTREAM.sha256` pins both, and CI re-downloads the
upstream file, checks its Git blob id and compares the two line ranges. `src/lib.rs` only wraps
them: it serializes the 60 glyphs to 120 big-endian bytes, hashes them with upstream's `sha256`
and takes the first eight bytes as Host8, exactly as upstream's `emit_device_pid` does.

The algorithm: four upstream SHA-256 outputs of *tuple + big-endian u32 counter*. Adjacent
digest bytes form big-endian words, each masked to 10 bits; the first 60 become the glyphs.
This algorithm does NOT decode or reconstruct source tuples. A short Host8 identifier may
collide; it is not a digital signature, a custody witness, an instrument attestation, or a
proof of physical 60D structure.

## Upstream behaviour (kept exactly)

Upstream bounds its input by `TUPLE_CAP` = 512 bytes, in its own words: "Input is bounded by
`TUPLE_CAP`" (hwinv.rs:148), and `project_60d` reads `min(len, TUPLE_CAP)` tuple bytes
(hwinv.rs:243-247). This crate runs those lines unchanged, so its output equals upstream's for
every tuple length. The tests pin upstream vectors for 0, 3, 508, 509–512 and longer tuples.
An earlier version of this crate rejected tuples over 508 bytes; that departure from upstream
has been removed (2026-10-17).

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

Reference vectors for empty input, "abc", 508, 509–512 and longer tuples were computed with
`independent_referee.py`, an independent hashlib model of upstream (it never imports the Rust
code). CI runs the referee against the demo, the unit tests, Clippy, the upstream byte check and
the no-float check; it does not modify the original repositories.

This is a software address projection, not lossless 60-dimensional compression
or evidence of a physical quantum, gravity, or optical-memory mechanism.
