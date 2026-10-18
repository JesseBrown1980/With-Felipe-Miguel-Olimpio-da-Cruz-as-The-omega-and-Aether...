# aether-loop

The ADDRESS / ROUTE / LOOP front half of the Asolaria request path, ported to Rust 1.81 from the Node
request-path modules, with a stdlib Python referee that checks byte-identical HBP rows.

Two crates live here:

- `.` (`aether-loop`) — the ports: PID minter, revolver, Brown-Hilbert room addressing and the HBP room
  descriptor, the project-room router, the dispatcher rows (`row=rotation`, `row=prism_forward`), the
  mock free agent, the hookwall pass library (`stamp_pid`, observation row, three-outcome verdict incl.
  `OBSERVE_ONLY`, `pass`/`pass_chain`, dual-emit, the Fischer ledger append), the free-agent `loop_cycle`
  (`row=project_swap`, `row=prism_in`) and the context `runLoop` builds, the GC runtime, the
  omni-engine never-explode gulp, quant score and extract -> register -> place cycle with its
  live-format `mintPid`, and the Path A `run_primitive_loop`.
- `vendor-pid-mod/` (`asolaria-os-metal-pid-mod`) — the reductions `pid-mod.rs` kernel, vendored
  byte-identical with its own 27 tests. The operator names and paths it carries are published as is by
  the owner's decision of 2026-10-18 (see its `PROVENANCE.md`).

Each source module names its upstream file and lines; see `PROVENANCE.md`. `src/js.rs` holds the
ECMAScript string operations the upstream lines rely on (UTF-16 `slice`/`charCodeAt`, the `trim` set,
`JSON.stringify` of a string).

## What is wired as a seam (other builders' lanes)

- SCORE (`asolaria-score`) and Fischer (`fischer-kernel`): the gate calls them through
  `hookwall::GateLanes` where upstream calls them (`score(pid, content)`, then
  `fischerEval(pid, envelope, sc, { prevHash })`); `pass`, `pass_chain` and `loop_cycle` take the lanes.
  The Path A `run_primitive_loop` calls SCORE through a closure on `(pid, answer_sha16)`.
- Fischer and observation ledger appends: `pass` appends when given a path (`None` under upstream
  `dryRun`).
- Live opencode spawn and the GNN HTTP infer: the lane boundary, not ported.
- Filesystem district build, the `ROOM.hbp` swap marker and the prism append: the integrator's lane;
  the row builders are pure and take the timestamp as a parameter.

## Open integration items

- `dispatchRoom`'s `room_answer` outbox row (room-dispatcher.mjs:162-207), the Path A outbox: no
  directory of the tree emits it yet. On the mock + `skipGnn` path its `gnn_score`, `reverse_risk`,
  `promoted` and `gnn_status` follow from the mock's `k/1000`; `shannon_H` and `shannon_eff` need V8's
  `Math.log2`, which `gate/observed/src/score.rs` ports for the efficiency in e4 (no `H.toFixed(4)`
  accessor there yet).
- Two ports of `pid-minter.mjs` (tuple form), `primes.mjs` and `pid-chain-revolver.mjs` exist in the tree
  (this crate and `model/hrm-mtp`, which also has `preWarm`); the integrator picks one.
- `runLoop`'s per-verdict tally (asolaria-loop.mjs:104-118) is kept by the caller from each
  `CycleOutcome`; `would_rename` becomes upstream's `renamed` once the caller's `ROOM.hbp` append succeeds.

## Scores

The forward-gate score crosses this lane in e4 units (1/10000), the unit of the tree's SCORE lane
(`gate/observed`). The hookwall forward gate threshold is 7200 (upstream `score >= 0.72`); the mock
agent's `k/1000` enters as `10k`. A binary64 score in [0, 1] from another lane enters as the floor of
its product with 10000 after that product is rounded to 53 bits, nearest-even, on the integer mantissa
(the value V8's `Math.floor(score * 10000)` gives, float running in that lane). That is `>= 7200`
exactly when the score's bit pattern is `>= 0x3FE70A3D70A3D70A` (binary64 0.72 =
6485183463413514 / 2^53), as upstream's `score >= 0.72`; the floor of the exact, unrounded product is
7199 at that score (see `src/dispatcher.rs`).

## Build and check

Measured on Rust 1.81.0: 29 tests pass, the referee checks 111 rows with 0 mismatches, and the same 111
rows were equal to the upstream Node modules' own output (a cold-lane check outside this directory).

```bash
# from this directory
cargo +1.81.0 fmt --check
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
cargo +1.81.0 build --locked --example emit_rows
python3 referee/referee_hbp.py --check target/debug/examples/emit_rows

# vendored kernel
cd vendor-pid-mod
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
```
