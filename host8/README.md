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
