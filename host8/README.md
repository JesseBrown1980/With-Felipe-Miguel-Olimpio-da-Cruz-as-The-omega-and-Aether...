# asolaria-host8

(Not to be confused with the Host8 *rooms* of `docs/handoffs/acer-host8-rooms-guide-2026-10-19/`: 8-byte slots at a
computed place on a drive, positional and collision-free. This crate is the 8-byte host lane and its handle.)

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
`gnn-oracle` (14). `asolaria-host8` itself runs 54 unit tests, 4 in `tests/bridge_golden.rs` (one
of which needs the P5 predictions ledger, below) and 4 in `tests/tuple60d_gaia_loader.rs`. fischer-eval's binary is upstream's loopback HBP
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
`ts` 1750000000.. : `ps_per_op_median` (integer picoseconds, the middle of 3 runs) 5,768,533 ps as
written, 1,444,609 ps with table hex; built with the served binary's profile (`opt-level="z"`, LTO,
one codegen unit, `panic=abort`), 5,853,570 ps and 1,687,945 ps
(`../docs/handoffs/nano-speed-native-2026-10-18/CLOUD-ROWS.hbp:20-25`). The two forms
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
T1 4,739, T2 0, T3 0; footer `rows_sha256=04202c83…`. The release example writes the file in
84,961,523 ns, the middle of 3 runs (71,183,399 to 104,642,924 ns; wall clock as the difference of two
`date +%s%N` readings, measured again on the same 4-CPU cloud host, output sha256 `9b8647ff…` each
time); the first reading that day gave 130 ms, recorded to 10 ms.

`tests/fixtures/bridge-edge.ndjson` is synthetic: 106 non-blank lines with escapes, lone surrogates,
invalid UTF-8, CRLF, blank and falsy lines, non-object predictions, numeric, array and object ids, key
order, and the tier patterns' edge cases. `bridge-edge.golden.hbp` is node's output for it, written by
`tests/fixtures/bridge_golden_args.mjs`, and the emitter matches it byte for byte. A cold-lane
differential that is not committed ran node's emitter and the example on 90,000 random lines (18
seeds) and on 500,000 random binary64 ids; every output file was identical.

This is step (2) of the P4 receipt. Step (3), retiring the node daemon, is the operator's; nothing here
stops, retires or changes it (`retired_now=0`).

## tuple60D parity with gaia-loader.mjs

Upstream says `tuple60d` and `resolve_instance_pid` are "byte-identical to gaia-loader.mjs" and that
the verb catalog loads "exactly the way gaia-loader.mjs does" (main.rs:591, :619, :647).
`tests/tuple60d_gaia_loader.rs` checks those claims against node running gaia-loader.mjs itself:
`docs/handoffs/acer-post60d-2026-10-18/FABLE5-REGEN-ITEM7-60D-CHAIN-2026-10-18/kernel/gaia-loader.mjs`
(16,547 B, sha256 `8b45c724…`, git blob `703cb8e2…`, PROVENANCE.md).

`tests/fixtures/tuple60d_gaia_loader.mjs` wrote `tests/fixtures/tuple60d-gaia-loader.hbp` with node
22.22.0. It loads gaia-loader.mjs from its own bytes (the loader hook checks the sha256), points its two
sibling imports (`runFreeAgent`, `buildReceipt`) at stubs that throw, and appends one line exporting
three of its private functions (`loadVerbCatalog`, `parseSeatRow`, `sha16`). It calls `tuple60D`,
`resolveAgent`, `loadVerbCatalog` (through a `verbs.hbp` it writes to a directory given in argv) and
`parseSeatRow`. It never calls `loadCatalog` or `summon`, so nothing opens a socket or starts a
process. Values in the file are UTF-8 bytes with `[A-Za-z0-9-._~:+@/]` kept and every other byte
written `%XX`.

What the fixture holds (1,057,837 B, 3,608 lines, sha256 `1469f278…`):

- 22 catalogs: the 73-verb `../acer/HyperBEHCS/data/catalogs/verbs.hbp` as node loads it, the empty
  catalog, `["format"]` (upstream's summon test), six odd entries, and 18 generated sizes from 1 to
  1,000,003.
- 2,745 tuple rows, each with its inputs, node's verb, noun, glyph and sha, and resolveAgent's device,
  ts and instance PID:
  - 1,801 seats of the delivered seat book with the 73-verb catalog. The book is
    `docs/handoffs/acer-post60d-2026-10-18/FABLE5-REGEN-ITEM5B-HOST8-SEAT-BOOK-SOURCES-2026-10-18/seat-book/`,
    1,860 seats as host8-serve's `load_seats` builds it. The 59 seats whose names carry a product
    name appear only as `SKIP|handle8=` rows. These rows go through resolveAgent's own disk read of
    `verbs.hbp`.
  - 31 of those seats as gaia-loader reads them from `/seats.hbp` (difference 2 below).
  - 3 rows of upstream's FORMULA-CHIEF vector (glyph `c844dff6b59b40cf`, PID `d125579d9644c37a`).
  - 110 edge rows: typed device and ts values, plus empty, `|` and lone-surrogate inputs on every
    catalog.
  - 800 seeded random rows (seed 2).
- 780 verb-parse rows: `verbs.hbp` (named by its sha256), 29 edge bodies and 750 random bodies.

`cargo +1.81.0 test --locked --test tuple60d_gaia_loader -- --nocapture` recomputes every row and
compares the row it writes with node's, byte for byte:

- All 2,745 tuple rows are identical. In 71 of them resolveAgent throws on an empty handle8, and the
  Rust row writes the same `!throw` marker. 43 rows carry a lone surrogate: node's
  `createHash().update()` encodes it as U+FFFD, the bytes a Rust `&str` holds.
- The 73-verb catalog selects 73 of 73 verbs, and `verb_catalog_from_hbp` gives node's 73 from the
  file (index 15 is `format`).
- 758 of the 780 parse rows are identical. The other 22 rows (22 lines) are difference 1 below, and
  the test asserts that each one is that difference and nothing else.

A cold-lane run that is not committed used the generator in `bulk` mode on 10 seeds (11 to 20). Its
files came from the previous revision of the generator (sha256 `2eff5c23…`); this revision writes
the same rows, and only the header's `generator_sha256` differs. Each seed
had 100,000 random rows, all 1,860 seats in three device/ts passes, and 25,000 parse bodies. Of
1,057,860 tuple rows, all were identical, including 995,560 instance PIDs. Of 250,300 parse rows,
244,845 were identical and 5,455 (5,516 lines) were difference 1. Altering one PID digit in the
fixture made the check fail on that row.

Differences measured (identity.rs is unchanged: the included slices are upstream's bytes):

1. Verb parse. main.rs:605-610 reads only the first `|entry=` of a line. gaia-loader.mjs:95 takes
   the leftmost match of `/\|entry=([^|]+)\|/`. So `X|entry=|entry=a|` gives `a` in node and nothing
   in Rust (the doc comment on `verb_catalog_from_hbp` already says so). The 3 `.hbp` files in aether
   and the local clones with `|entry=` lines have 273 such lines, and none of them has this shape.
2. Seat names through `/seats.hbp`. gaia-loader's `loadCatalog` reads its positions from host8-serve
   `/seats.hbp`, which writes each value through `hbp_escape` (main.rs:670-681): every character
   outside printable ASCII becomes `_`. 31 of the 1,860 seat names have one (`—`, `Λ`, `ν`, `§`,
   `×`). For those seats node's noun, glyph and instance PID come from the escaped name, while
   `/summon.hbp` (main.rs:1025-1027) and this crate use the raw name. The verb is the same, since it
   depends only on handle8. The first is `84b4c6c420426dd7`, "REALMATHPOS — node placement function".
   The test asserts all 31.
3. Device and ts at the call site. resolveAgent hashes `String(device || 'acer')` and
   `String(timestamp)`. For a string or missing device this is upstream's rule (main.rs:998-1005:
   empty becomes `acer`). An empty ts string is hashed as `''` by node, but main.rs:1007-1009
   replaces an empty `ts=` with the clock. `resolve_instance_pid` takes the device and ts strings it
   is given, as upstream's does.
4. Catalog file read (by reading, not run). gaia-loader.mjs:93 decodes `verbs.hbp` with U+FFFD for
   invalid bytes. main.rs:596-599 (`fs::read_to_string`) gets an error on them and loads an empty
   catalog, so every verb becomes `report`. This crate leaves the read to the caller. The vendored
   `verbs.hbp` is valid UTF-8.

gaia-loader's office-files fallback (lines 148-162) keeps only `HOST8SEAT|` rows. The delivered seat
book has none, so only the `:5088` route gives it positions.

To regenerate, from host8/. `<seats.hbp>` is the book as `/seats.hbp` serves it (`HOST8SEATS`
header and `HOST8SEAT` rows, sha256 `b5aa35c9…`). `<seats-raw.tsv>` is name, handle8 and cube_bh per
seat, `%XX`-encoded the same way (sha256 `0bee4390…`). `<left-out>` lists the 59 handle8s.

```
node tests/fixtures/tuple60d_gaia_loader.mjs \
  ../docs/handoffs/acer-post60d-2026-10-18/FABLE5-REGEN-ITEM7-60D-CHAIN-2026-10-18/kernel/gaia-loader.mjs \
  ../acer/HyperBEHCS/data/catalogs/verbs.hbp <seats.hbp> <seats-raw.tsv> <empty dir> \
  tests/fixtures/tuple60d-gaia-loader.hbp fixture 2 800 <left-out>
```
