# gate/fischer-upstream

The owner's upstream Fischer evaluator, vendored byte-identical from
`asolaria-federation-1024@dc1da1a9` `servers/fischer-eval` and compiled as the primary
piped path (OWNER-RULES 7c). The anti-blunder evaluator scores a candidate
envelope/spawn/route/write and returns a verdict (PROCEED/HOLD/BLOCK/REFUTE/ANALYZE)
with a centipawn-loss and a FISCHERv1 HBP row; it never self-authorizes and emits
`json=0`.

- `vendor/federation-1024/servers/fischer-eval/` — the three upstream files, byte-identical
  (blob ids and sha256 in `PROVENANCE.md` / `UPSTREAM.sha256`). `src/lib.rs` and `src/main.rs`
  are compiled by this crate's `Cargo.toml` via `[lib] path` / `[[bin]] path`; the vendored
  `Cargo.toml` beside them is carried for provenance only.
- `src/bin/upstream_fixture.rs` — new to aether. Reads host8 field lines and emits each
  `evaluate` result and a fixed-timestamp `render_row`, so the referee can compare rows
  without a live clock. Calls only the vendored upstream surface.
- `tests/upstream_rows.rs` — new to aether. Pins four full rows (clean PROCEED,
  MISTAKE_FLAGGED, REFUTE, missing_pid) as the vendored `render_row` bytes and as the bytes the
  unchanged Node `buildRow` wrote, and converts one into the other through the three
  documented format points.
- `referee/` — the cold verification lane (Python standard library only, integer arithmetic
  only; never on a request path). `fischer_referee.py` runs the Node `fischer-kernel.mjs` and
  `hilbert.mjs` logic line by line behind a mirror of FED's host8 field mapping (`main.rs`),
  and with `--pins` checks itself against four rows from the unchanged Node.
  `gen_cases.py` is the seeded case generator; `prove_upstream.py` pins every Rust row and
  result byte for byte and counts where Node and the FED port differ; `measure_ae.py`
  measures the AE variant (`gate/fischer-eval`) and both binaries against the Node envelope
  pid; `ci_check.py` is the one-shot CI guard.

## Build and verify (Rust 1.81)

From this directory:

```
CARGO_TARGET_DIR=../../../targets/fischer-upstream cargo +1.81.0 test --locked
sha256sum -c UPSTREAM.sha256
python3 -I referee/ci_check.py <upstream-fixture-bin> [<upstream-host8-bin> <ae-host8-bin>]
```

`cargo test --locked` runs 19 tests: 12 vendored lib, 3 vendored bin and the 4 row pins.

spawn_cognition.rs is already vendored by the host8 slice and is not referenced by this
crate, so it is not duplicated here (see `PROVENANCE.md`).
