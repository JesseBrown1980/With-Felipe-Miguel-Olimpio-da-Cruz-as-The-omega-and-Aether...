# HOWTO: the D1 run (NCM intake), from ACER, 2026-10-18

**Claim:** balanced ternary is the exact-integer case of NCM-style coarse-to-fine residual quantization.
Level k uses the codebook {−3^k, 0, +3^k}. At each level the run picks the nearest entry to the residual and subtracts it, coarsest first.
For |x| ≤ (3^K − 1)/2 the residual ends at exactly 0, with no ties, and the chosen indices are the trits the tribit kernel gives.

## Files
| path | what |
|---|---|
| `d1-ternary-rq/Cargo.toml`, `Cargo.lock`, `src/main.rs` | the crate (sha2 =0.10.9) |
| `tribit/mod.rs` | the canonical kernel it reuses, sha256 `50e4cb85…` (ACER's copy) |
| `D1-RUN.hbp` | the run's output rows |
| `FABLE5-NCM-D1-RUN-2026-10-18.hbp` (+ `.sha256`) | the office receipt |
| `NCM-ASOLARIA-MAP.md` | the map, with the D1 result added beside the claim |

## Rebuild and rerun
1. In `src/main.rs`, point the `#[path = "..."]` line at your copy of `tribit/mod.rs`. It is an absolute Windows path on ACER.
2. Run:

        cargo +1.81 clippy --release -- -D warnings        # must exit 0; float arithmetic is denied crate-wide
        cargo +1.81 run --release > D1-RUN.mine.hbp
        grep -o 'K13_code_stream_sha256=[0-9a-f]*' D1-RUN.mine.hbp
        # expect 3cae23466ec81a87ffa59abe311904a35288077ee6d926bd100e50e666d82f92

The `D1LEVEL` rows must match ACER's, except for the `K13_ns_per_value` timing.
aether's tribit crate has the same API but different bytes. If the hash differs on it, compare the `D1LEVEL` rows first: they test the math, while the hash also depends on the code-stream layout.

## What passing means
- **It shows:** the integer, centred, coarse-to-fine choice is exact and tie-free, and it agrees with tribit three independent ways.
- **It does not show:** that coarse trits carry meaning, the way NCM's learned coarse codes do. That is the 2026-10-08 rung law.
- **What comes next:** D3, NCM codes plus a correction list. It needs the operator's direction, a sandbox for the pickles and ideally a GPU.
