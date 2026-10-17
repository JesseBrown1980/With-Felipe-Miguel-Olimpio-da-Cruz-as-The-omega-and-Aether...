# Fischer — deterministic rule-table action gate (Layer 5)

`evaluate(envelope, score, strict)` turns an agent action envelope into a
`cpl` integer and a verdict — PROCEED / HOLD / ANALYZE / BLOCK / REFUTE —
using fixed integer penalties and credits (missing cosign, authority jump,
missing halt path, no replay path, …). `render_row` emits one HBP text row
with a sha256-based row hash. `main.rs` serves it over a small HTTP/1.1
loopback server or a `--eval` / `--once` CLI.

The chess words (`cpl`, `king_safety`, `best_alt`) are metaphor: there is no
move search, no position, no Elo, and nothing is learned. `l0_real`,
`shannon` and `g4_state` are caller-supplied inputs, not measurements.

## Provenance

Upstream `asolaria-federation-1024@dc1da1a9`, `servers/fischer-eval`.
The byte-identical copy is commit `8e15282`; diff it against this tree to see
every change. The upstream repo-root port receipt was not copied.

## Changes from upstream (commit `6c82ce4`)

- **Hard floors are hard.** The caller-supplied `g4_state` credit
  (`CONVERGED` −200) was added after the floor clamp, so a floored HOLD such
  as `missing_cosign` could reach PROCEED. The floor now applies after it.
- **No borrowed pid.** Over HTTP/CLI an absent pid fell back to a default
  `BH.*` pid, so `missing_pid` could never BLOCK and earned a credit. An
  absent pid now blocks with `cpl=500`.
- A test fixture's operator-local drive path became a relative path;
  `src/lib.rs.sha256` was regenerated. `main.rs` has no upstream sidecar.

Each fix has a regression test that fails on the upstream bytes.

## Known limits, closed in the stack by `gate/verdict`

Used alone, Fischer still trusts its caller in ways the stack does not:
case or whitespace variants of refuted verbs (`SELF_AUTHORIZE`) are not
refuted; a whitespace or `UNKNOWN` pid is not treated as missing; unknown
`g4_state` strings count as neutral; `CONVERGED` can lower a BLOCK to HOLD;
and an unsealed write with no replay path can reach PROCEED on caller credits
because that floor (100) sits below HOLD (150). `gate/verdict`'s
tighten-only `input_guard` closes each of these in the composed verdict,
with tests that also pin the raw upstream behaviour.

```sh
cargo test                      # 13 lib + 4 bin, Rust 1.81.0, zero deps
cargo run -- --eval 'pid=BH.X&verb=tick&target=fabric&hbp_path=x'
```
