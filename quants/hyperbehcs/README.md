# quants/hyperbehcs

Registry slots 9-12 of the Asolaria combined-quant registry, ported to Rust 1.81 from the owner's
`hyperbehcs-core.cjs` (vendored under `vendor/`) so that every packet field and fingerprint is
bit-identical to what Node v22.22.0 (V8 12.4.254.21) on x86-64 computes from that file. Node on
arm64 (the falcon Termux host) was not measured.

| n | id | function |
|---|---|---|
| 9 | `Q-JL-ACHLIOPTAS-SEEDED-v1` | `johnson_lindenstrauss` |
| 10 | `Q-TURBO-MINMAX-U8-v1` | `turbo_quant` |
| 11 | `Q-POLAR-RTHETA-v1` | `polar_quant` |
| 12 | `Q-TRIPLE-SPHERICAL-v1` | `triple_quant`, `reconstruct_triple` |

```rust
use quant_hyperbehcs::{triple_quant, reconstruct_triple, vector_from_text, Options};

let v = vector_from_text("", 1536);
let packet = triple_quant(&v, &Options::default());
assert_eq!(packet.fingerprint, "348e532f9b1142a7");
let back = reconstruct_triple(&packet);
```

No floating-point type is used: JavaScript Numbers are binary64 bit patterns computed with
integers (`src/number.rs`), and `Math.atan2/acos/sin/cos` follow V8's fdlibm source
(`src/fdlibm.rs`). `PROVENANCE.md` lists sources, line maps and measurements.

Checks:

```sh
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
python3 -I tools/referee.py --check
python3 -I tools/referee.py --grid 20000 | cargo +1.81.0 run --locked -q --release --example grid
```
