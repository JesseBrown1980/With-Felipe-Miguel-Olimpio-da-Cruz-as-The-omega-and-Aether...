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

The crate is a workspace whose other members are three vendored upstream server crates, compiled
unchanged with their own tests: `agent-runtime` (23 tests), `fischer-eval` (12 lib + 3 bin) and
`gnn-oracle` (14). `asolaria-host8` itself runs 31 tests. fischer-eval's binary is upstream's loopback
HBP server; it is compiled for its unit tests and never started.

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
