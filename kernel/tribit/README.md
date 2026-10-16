# asolaria-tribit

The compact core, standalone. Balanced-ternary primitives with **zero dependencies**, `no_std`,
**integer only — no float anywhere**.

```toml
[toolchain]
channel = "1.81.0"
```

## Why this repo exists

This module had **no upstream.** Six Rust kernels built on 2026-10-08 reused it verbatim via
`#[path]`, so the thing the work rested on had no repository, no CI and no sidecar. It is published
here as the compact core — just the module and its gate, nothing else.

## What is in it

- **Three zeros.** `Zero::{Neg, Nil, Pos}` all have magnitude zero; the information is not in the
  value but in *which* zero — the direction of travel through it. `rotate`/`anti_rotate` turn them
  in an order-3 orbit: R³ = identity, and **R ≠ R²**, which is exactly what makes trinary not binary.
- **The register hose.** Five registers (zero, translucent, red, green, blue). Registers 0 and 1 are
  **free and never computed** — *"Translucent is One, Not Zero."* Traversal is fixed:
  translucent → red → green → blue → translucent.
- **The rime prism.** An exact 27-point Number-Theoretic Transform over `Z/1000081Z` with
  `W = 951846` a primitive 27th root of unity. `prism` → `unprism` round-trips **exactly**, because
  the arithmetic is integer and 27 is invertible mod P. `X[0]` is the DC glyph: the sum, the free centre.
- **`TritWord`** — 80 trits packed into one `u128`, because `3^80 < 2^128 <= 3^81` makes 80 the exact ceiling.
- **`pump_shell`** — energy counted in rungs of the 3-ladder. Grows as log₃ and never linearly; **no
  logarithm is taken, the rungs are counted.**

## The carrier correction (2026-10-08)

`Carrier::zero_states()` now reports **reachability** — what `zero_at()` can actually return — not
variants of the `Zero` type. Those are different quantities and only the second is three.

Measured exhaustively over `steps_per_cycle` in `1..=64` and every phase in each cycle:

| | |
|---|---|
| `Some(Zero::Nil)` from AC | **0 occurrences** |
| reachable sets | `{Pos}` and `{Neg, Pos}` |
| rows where `zero_states()` disagreed with `zero_at()` | **63 of 64 → 0** |

`zero_at` documents `None` as *"carrying magnitude, not at a crossing"*, the opposite of `Nil`'s
*"the line is dead"* — so `None` cannot stand in for `Nil`.

**The three zeros are not lost by this.** The type carries all three and the order-3 orbit exercises
all three. The system measures them in the **rainbow lane**, not the carrier lane: RAINBOR's three
waves (`path1.path2.path3` = NN · GNN · FNN, each an HTTP-0 portal acting as itself), where the anti
is order-3 at **192 of 192**, and the free fourth zero is the point at which the three waves agree.
**The carrier was the wrong instrument, not a broken law.** The original law text and waveform
diagram are kept in the source header with the correction recorded **beside** it, never over it.

`zero_states_equals_what_zero_at_can_reach` asserts the accessor against the behaviour exhaustively,
so it cannot drift again.

## The gate

`.github/workflows/gate.yml` runs on every push and PR:

1. `cargo +1.81 fmt --all -- --check`
2. `cargo +1.81 clippy --all-targets -- -D warnings`
3. `cargo +1.81 test --all` — and **fails if fewer than 8 tests actually ran.** A check that did not
   run is not a check that passed. This repo's first rehearsal ran **zero** tests because `#![no_std]`
   at the crate root blocks the test harness; the gate would have caught it as `NOT_MEASURED`.
4. a grep for `f32`/`f64` in the source — integer only is the law, so it is measured.

Local rehearsal before the first push: fmt clean, clippy **0 diagnostics**, **11 tests passed**,
`float_used=0`. Read CI for the authoritative result.

## Harness

`.gitattributes` is in the first commit: `* -text` by default, sources and receipts pinned
`text eol=lf`. A seal that warps is not a seal — **GIMEL is `blob == working == sidecar`**.

Seat **ACER-CLAUDE-FABLE5** · pid `8467a937cba309f7` · owner **OP-JESSE** · `E=0`
