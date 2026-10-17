# asolaria-qprism-representation

The Q-PRISM **representation** layer (Layer 2 of the Asolaria stack): an exact
2D → 3D orb → signed-2D projection over checked `i128`, with an inverse
cross-check (`recovered_u == u`), its own SHA-256, deterministic pipe-delimited
receipts and a static (script-free) SVG. Integer-only, zero dependencies,
`#![forbid(unsafe_code)]`, Rust 1.81.

```toml
[dependencies]
asolaria-qprism-representation = "0.1"
```

The library keeps its original import name:

```rust
use rust_qprism_181::{run, QprismError};
```

and the binary is `rust-qprism-181` (see `rust-qprism-181/README.md` for its
arguments).

## What it does and does not claim

The 3D stage is a representation of the 2D input tuple, not an information
gain. It reconstructs only the `(u, v)` values it retained, and the receipts
declare `media_bytes_embedded=0` and `raw_contents=0`.

## Provenance

The source under `rust-qprism-181/` is byte-identical to
`JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS@8712368`
`matrix/rust-qprism-181/`, and `PUBLIC-OWNER-2D.hbp` to `matrix/PUBLIC-OWNER-2D.hbp`.
Check with `sha256sum -c UPSTREAM.sha256`. The upstream `Cargo.toml` and
`Cargo.lock` are kept as `UPSTREAM-Cargo.toml` / `UPSTREAM-Cargo.lock` so they
do not form a nested package. This crate's `Cargo.toml` is a new publishing
manifest whose package root sits one level up, so the tests' unchanged
`include_bytes!("../../PUBLIC-OWNER-2D.hbp")` resolves inside the package.

License: MIT.
