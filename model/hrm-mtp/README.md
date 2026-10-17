# asolaria-hrm-mtp

Integer-only Rust port of the Asolaria prediction triad and the universe simulator's HRM and MTP
slice agents. Crate `asolaria-hrm-mtp`, library `hrm_mtp`, `#![forbid(unsafe_code)]`, Rust 1.81,
no `f32`/`f64`. Dependencies: `asolaria-l0-edge` (path, for `jsnum::Dbl`) and `sha2` 0.10.9.

**Lane.** `src/` is hot lane: integers, HBP text and SHA-256 in process, with no Node, JSON, HTTP
or Python. `tools/` and `vendor/` are cold lane, for verification only. The referees in `tools/`
use integer arithmetic only; floats run only inside the vendored owner code they execute
unchanged. Provenance, the vendor table, the number semantics and every measurement are in
[`PROVENANCE.md`](PROVENANCE.md).

## Modules

| Module | Port of | Public API |
|---|---|---|
| `hilbert` | `hilbert.mjs` (Layer 1) | `hilbert_decode`, `hilbert_encode` |
| `primes` | `primes.mjs` | `primes`, `prime_at`, `sieve_first_n_primes`, `sieve_limit` |
| `zeta` | `zeta-process.mjs` (Layer 2) | `von_mangoldt`, `divisors`, `nu_lambda`, `nu_lambda_table`, `band_weight`, `deterministic_unit`, `von_mangoldt_next`, `predict_k_positions`, `chain_antichain_bound`, `HONEST_GAPS` |
| `hrm` | `hrm-slow-fast.mjs` (Layer 3) | `SHAPES`, `Shape`, `slow_loop_predict_shape`, `fast_loop_refine_position`, `hrm_shaped_prediction`, `HrmArgs`; `fast_loop_tie_margin` (verification only, not upstream) |
| `mtp` | `mtp-heads.mjs` (Layer 4) | `mtp_heads`, `MtpOptions`, `cp_to_bh_coord`, `pre_warm_candidates`, `measure_hit_rate`, `head_seed` |
| `revolver` | `PIDChainRevolver` with `preWarm`, `mintPID` tuple form, `glyphAt` | `PidChainRevolver`, `PreWarmOptions`, `mint_pid_tuple`, `sha16`, `glyph_at`, `LANE_CYCLE` |
| `rime` | `hrm_agent()`, `mtp_agent()` (rime_agents.py) and the sector play of rime_windunwind.py | `HrmTables`, `hrm_agent`, `hrm_agent_lines`, `mtp_agent`, `mtp_agent_lines`, `format_fixed`, `windunwind::{Bank, Sphere, play_sector}` |
| `fdlibm` | JavaScript `Math.log` (V8's fdlibm port) | `log`, `log_int` |
| `trig` | `Math.round` of `Math.sin` / `Math.cos` expressions | `round_sin`, `round_cos`, `NearTie` |
| `sf64` | signed binary64 `+ - * /`, `Math.round`, `Math.ceil`, word access | `Sf64` |
| `log2fx` | exact sums of integer-weighted `log2` | `log2_q64`, `Log2Tally`, `render_q64_ratio`, `round_q64_ratio` |

Errors upstream throws come back as `JsError::Range` / `JsError::Type` with upstream's message.
Arguments outside the domain the port reproduces exactly (PROVENANCE.md, "Ported domain") come
back as `JsError::Domain` from every entry point that returns `Result<_, JsError>`. The functions
that return a plain value assert that domain and panic outside it: `zeta::divisors` and
`zeta::von_mangoldt_next` (`cp >= 2^52`), `zeta::deterministic_unit` and
`zeta::von_mangoldt_next` (`step >= 2^22`), `mtp::head_seed` (`h >= 2^21`), `trig::round_sin` /
`trig::round_cos` (argument outside `0 <= x < 2^14`; a `scale` or `offset` outside their bounds
gives `NearTie`), `fdlibm::log` / `fdlibm::log_int` (non-positive, subnormal or non-finite
arguments), and the `sf64::Sf64` / `log2fx` helpers (the ranges their docs state).

`hrm::fast_loop_tie_margin` is not part of upstream's result: it reports, for verification, how
far each trig `Math.round` argument of a fast-loop run lies from a tie (`tests/referee.rs`
compares it with the referee's).

## Run

```
cargo +1.81.0 test --locked                       # triad fixture, upstream unit tests, synthetic agents and sector play
python3 -I tools/triad_referee.py --check         # stdlib integer mirror of the vendored JavaScript
python3 -I tools/rime_referee.py synthetic --check
python3 -I tools/rime_referee.py windsynth --check
cargo +1.81.0 run --release --example rime_agents -- enwik8
cargo +1.81.0 run --release --example rime_windunwind -- enwik8 enwik9
```

`rime_agents` prints the five result lines of `mtp_agent()` and `hrm_agent()` as upstream prints
them, then `MTPAGENT` and `HRMAGENT` rows with the exact counts. `rime_windunwind` prints a `BANK`
row, one `SECTOR` row per enwik9 sector and a `TOTAL` row. Their outputs on the published enwik8 and
enwik9 are `tests/fixtures/rime-agents-enwik8.hbp` and `tests/fixtures/rime-windunwind-enwik9.hbp`.
