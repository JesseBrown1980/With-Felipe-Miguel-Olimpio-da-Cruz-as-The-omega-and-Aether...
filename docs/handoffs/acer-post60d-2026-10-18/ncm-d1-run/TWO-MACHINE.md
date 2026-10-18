# D1 reproduced byte-for-byte on a second machine (2026-10-18)

ACER built and ran the D1 check (balanced ternary is the exact-integer case of NCM-style
coarse-to-fine residual quantization) on its own machine and delivered this folder, verified
by `sha256sum -c SHA256SUMS` (9/9 OK). The cloud rebuilt ACER's **exact** sources here and
reproduced ACER's pinned result bit-for-bit.

## What was run

- Source: this folder's `d1-ternary-rq/` crate and `tribit/mod.rs`, unchanged except for one line.
- The only edit: the kernel include path. ACER's `src/main.rs` carries
  `#[path = "C:/asolaria-acer/asolaria-os/kernel/core/src/tribit/mod.rs"]` (a Windows path). The
  cloud copy repoints it at the shipped kernel: `#[path = "../tribit/mod.rs"]`. No other byte of the
  crate or the kernel was changed.
- Build: `cargo 1.81.0`, `--release --locked`, the pinned `Cargo.lock` (only dependency `sha2
  =0.10.9`), opt-level 3 (ACER's `[profile.release]`).
- Run: integer only; the crate's clippy lints deny float arithmetic for the whole crate, kernel
  included.

## Result

| field | ACER (Windows) | cloud (Linux) |
|---|---|---|
| `all_levels_pass` | 1 | 1 |
| K13 in-range exact | 1,594,323 / 1,594,323 | 1,594,323 / 1,594,323 |
| ties, all levels | 0 | 0 |
| K13 code-stream bytes | 20,726,199 | 20,726,199 |
| **K13 code-stream sha256** | `3cae23466ec81a87ffa59abe311904a35288077ee6d926bd100e50e666d82f92` | `3cae23466ec81a87ffa59abe311904a35288077ee6d926bd100e50e666d82f92` |
| ns per value | 242 | 231 |
| float used | 0 | 0 |

The full cloud stdout is in `cloud-reproduction.out`. The two hashes are identical, so the two
independent builds produced the same 20,726,199-byte code stream over all 1,594,323 in-range values —
two machines, two operating systems.

## What this settles, and what it does not

- Refute targets 1 and 2 could not be refuted on either machine: no tie ever occurs (`2r = ±3^k` is
  impossible because `3^k` is odd), and the residual invariant holds before every level. Both are
  proven, not only measured — see `model/ncm/rq/README.md`.
- The uncentred failure mode's surviving count `2^(n+1) − 1` (K13: 16,383) is now proven in that same
  README, so the one number ACER's run left unexplained is closed.
- The round trip proves the **addressing** is exact where NCM's trained tokenizer is NAMED 99.99%. It
  does not prove the coarse trits carry the **meaning** NCM's trained coarse codes do; that stays
  CONJECTURE (the 2026-10-08 rung-law caveat). D3 (NCM codes + correction list on the released
  tokenizer) would measure the meaning side and is E≠0 — held for the operator's go.
