# asolaria-omega-operator-catalog

The Omega operator catalog used by Q-PRISM recovery Path 3: 40 length-preserving
byte permutations (sector, lens, tri-12, pi-20 face operators and more), each
with an exact computed inverse, tested to round-trip every length from 0 to 1024.
Integer-only, zero dependencies, Rust 1.81.

```toml
[dependencies]
asolaria-omega-operator-catalog = "0.1"
```

```rust
use omega_operator_catalog::{apply_symbols, OPERATOR_COUNT};
```

`omega_operator_catalog.rs` is byte-identical to
`JesseBrown1980/asolaria-omega-omnibit-tournament@dad4647`
`reference/omega-operator-catalog-v0/` and to the copy bundled inside
`asolaria-qprism-recovery` (`sha256sum -c UPSTREAM.sha256`).

License: MIT.
