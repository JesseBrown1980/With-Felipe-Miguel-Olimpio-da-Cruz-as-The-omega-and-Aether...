# asolaria-host8

The Host8 8-byte lane as an in-process library. No HTTP listener, no process launch, no file read:
every function returns a computed value. The launch site (`&fire=1` + EXEC-FREEZE release) stays
upstream and gated.

Contents:

- `src/identity.rs` — host handle8 (FNV-1a `{:016x}`), sha256hex/sha16, the 60D tuple, the
  device-distinct `instance_pid`, the seat parsers and the verb-catalog parse. The upstream lines of
  `host8-serve/src/main.rs` are included byte-identical from `src/upstream/` (69-81, 324-429,
  536-589, 601-615, 619-661), with upstream's own tests for them (1572-1616, 1654-1711).
  `load_verb_catalog`'s file read (main.rs:596-599) stays with the caller: `verb_catalog_from_hbp`
  takes the `verbs.hbp` text.
- `src/rooms.rs` — the C/D room router (`room_id_from_pid`, `room_folder_name`, substrate split),
  carried byte-identical from `agent-runtime/src/rooms.rs`.
- `src/pid_sources.rs` — the two upstream `caller_pid`/`slot`/`syscall_no` lanes, each its own
  function (the Host8 launch-plan lane and the kernel init-table lane).
- `src/bridge.rs` (with `src/bridge/json.rs`, `src/bridge/number.rs`) — the gnn-dispatch-bridge's
  three pure functions, `stable_prediction_id`, `resolve_prediction_pid` and `classify_tier`
  (bridge lines 206-233; the bridge is vendored at `../acer/Asolaria/tools/behcs/`), and
  `golden_rows`, the row emitter of `docs/handoffs/p4-sidecar-lanes-2026-10-18/bridge_golden.mjs`.
  They work on JavaScript values: `JSON.parse`, `JSON.stringify`, `String()` and truthiness, strings
  as UTF-16 code units, numbers as binary64 bits with an integer-only decimal parse and
  `Number::toString`. Nothing here posts to the bus or fires.

The crate is a workspace whose other members are three vendored upstream server crates, compiled
unchanged with their own tests: `agent-runtime` (23 tests), `fischer-eval` (12 lib + 3 bin) and
`gnn-oracle` (14). `asolaria-host8` itself runs 54 unit tests and 4 in `tests/bridge_golden.rs`, one
of which needs the P5 predictions ledger (below). fischer-eval's binary is upstream's loopback HBP
server; it is compiled for its unit tests and never started.

Provenance and sha256 pins: `PROVENANCE.md`, `UPSTREAM.sha256`. Full upstream bytes for the wider
Host8 slice (the serving binary, the kernel envelope/gate modules) are under `vendor/federation-1024/`,
byte-identical, for the integrator.

```
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 fmt --all --check
cargo +1.81.0 clippy --locked --workspace --all-targets -- -D warnings
cargo +1.81.0 test --locked --workspace
```

`examples/instance_pid_bench.rs` times the per-seat mint the :5088 routes run (`tuple60d` then
`resolve_instance_pid`) on one thread, gated on upstream's vector `d125579d9644c37a`, with the bench
harness of `docs/handoffs/nano-speed-native-2026-10-18/native-emit-bench` and a table-hex variant
checked against it:

```
cargo +1.81.0 run --locked --release --example instance_pid_bench -- ../acer/HyperBEHCS/data/catalogs/verbs.hbp
```

Measured 2026-10-18 on the cloud Xeon (SHA extensions, Linux), 73-verb catalog, 1,000,000 mints over
`ts` 1750000000.. : 5.77 µs median as written, 1.44 µs with table hex; built with the served binary's
profile (`opt-level="z"`, LTO, one codegen unit, `panic=abort`), 5.85 µs and 1.69 µs. The two forms
are identical on all 1,000,001 mints, and the PIDs hash to `4fa68d74…` (sha256 over each PID plus
`\n`).

## Bridge parity (P5)

`tests/bridge_golden.rs` emits the rows from the vendored bridge and the P5 predictions ledger and
compares them byte for byte with the P4 golden file (`docs/handoffs/p4-sidecar-lanes-2026-10-18/`,
sha256 `9b8647ff…`). The ledger is vendored at `../acer/Asolaria/data/behcs/gnn-predictions.ndjson`
(PROVENANCE.md); `AETHER_P5_PREDICTIONS` overrides that path, and the test fails, naming the expected
sha256, when the file is not there. All 4,741 lines are identical (`out_sha256=9b8647ff…`).

```
cargo +1.81.0 test --locked --test bridge_golden -- --nocapture
cargo +1.81.0 run --locked --release --example bridge_golden -- \
  ../acer/Asolaria/tools/behcs/gnn-dispatch-bridge.mjs \
  ../acer/Asolaria/data/behcs/gnn-predictions.ndjson <out.hbp>
```

The example takes `--bridge-label=` and `--predictions-label=` for the header's two path labels;
their defaults are the golden's. Unlike node's script, it refuses a missing ledger.

Measured 2026-10-18 on the cloud host with Rust 1.81.0: 4,741 lines compared (header, 4,739 rows,
footer), 4,741 identical; output sha256 `9b8647ff…`, equal to the golden; 4,739 rows, 0 unparseable,
T1 4,739, T2 0, T3 0; footer `rows_sha256=04202c83…`. The release example writes the file in 0.13 s.

`tests/fixtures/bridge-edge.ndjson` is synthetic: 106 non-blank lines with escapes, lone surrogates,
invalid UTF-8, CRLF, blank and falsy lines, non-object predictions, numeric, array and object ids, key
order, and the tier patterns' edge cases. `bridge-edge.golden.hbp` is node's output for it, written by
`tests/fixtures/bridge_golden_args.mjs`, and the emitter matches it byte for byte. A cold-lane
differential that is not committed ran node's emitter and the example on 90,000 random lines (18
seeds) and on 500,000 random binary64 ids; every output file was identical.

This is step (2) of the P4 receipt. Step (3), retiring the node daemon, is the operator's; nothing here
stops, retires or changes it (`retired_now=0`).
