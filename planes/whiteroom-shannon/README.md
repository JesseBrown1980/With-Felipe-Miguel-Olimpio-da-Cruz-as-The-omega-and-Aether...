# planes/whiteroom-shannon

This crate holds the white-room and Shannon-stage planes of the Asolaria pipeline. They are ported
from the owner's JavaScript to a Rust 1.81 library that runs in process: integers, SHA-256 and HBP text,
with no JSON, HTTP, Node or float.

Nothing in the upstream request path calls these planes. The order "hookwall -> gnn -> shannon ->
gulp -> whiteroom" comes from docs only (WIRING-MAP section d item 11). The planes are therefore
libraries, with their own tests, until the integrator wires them. The crate is `asolaria-whiteroom-shannon`
and its library is `whiteroom_shannon`.

| module | upstream | what it computes |
|---|---|---|
| `whiteroom` | WR liris-whiteroom-engine.mjs:110-128, 191 | `L0GnnScorer`: SHA-256 of `pid + "\|" + mark`, nodes `[b0..b5] / 255` and `[b6..b11] / 255`, the L0 score, and the mean of the reply's scores (0 for none). It also holds `SmokeScorer`, the line-191 choice `useL0 ? L0GnnScorer : DeterministicScorer`. Both implement the `quant_cubes::whiteroom::Scorer` interface, so the quants/cubes engine runs them. That engine owns the verdict `score >= 0.72` (:167) and the sealed HBP row (:143-161). |
| `hookwall_plane` | SH pipeline/hookwall.mjs:9-87 | The default-deny live gate: `requestLive`, `grantLive` (at least 5 signers and `window_ok === true`), `fireHookwall`, `selfTest`, the request / denial / grant counters, and the `HKW` / `HKG` `encodeFrame` arguments. |
| `shannon_boot` | SH pipeline/shannon-boot.mjs:30-170 | `bootShannon`, the `shannon:gate:check` listener, `checkShannonGate` (LX-328/329/331/332/333), `selfTest`, and the `emitFixtureRestored` HBPv1 row with `row_hash = sha256(body)`. |
| `whiteroom_consumer` | SH pipeline/whiteroom-consumer-index.mjs:14-215 | `isWhiteroomEnvelope`, `stableStringify` (used as the hash pre-image only), `deriveCubeAddress` (through `quant_cubes::consumer`), `buildDigestionEnvelope`, the poll reply's message list, and the `_tick` digest loop. |
| `fabric_thinker` | BP src/fabric-thinker-gnn.mjs:27-184, src/fabric-thinker.mjs:75-105 | `pidQueryToGraph`, `descriptorInfer`, `realInfer`, and `realInferEnsemble` (L0 and L4, arithmetic mean). `hilbertEncode` comes from `model/hrm-mtp`. |
| `hybrid_harness` | B256 src/gnn/hybrid-harness.js:7-58 | `shardPlan`, `runShard` (mean of 5 scorers, SHA-256 over `${id}:${lcr.toFixed(6)}`), and `runFanout`. Nothing on disk imports the upstream file, so the five scorers are caller inputs. |
| `l0_request` | (glue) | Turns a two-node sha graph into the Q24 score of `l0_edge::model::score_pair`. This is the in-process stand-in for the POST to :4792. |
| `jsvalue`, `jsnum_ext`, `sha` | ECMA-262 | JavaScript values and the language operations the lines above apply: truthiness, `String(v)`, `Number(v)`, `a > b`, `JSON.stringify` of a string, `Math.ceil`, and Q24 to binary64. `jsvalue::binary64` rounds an exact decimal to binary64 (ties to even, as ToNumber does) and prints `Number::toString` of the result, in integers; `JsNumber::from_text` accepts a text only when it is `String(x)` of the value it rounds to. |

## The L0 and L4 servers

Upstream POSTs JSON to the L0 server on 127.0.0.1:4792 (liris-whiteroom-engine.mjs:121-124 and
fabric-thinker-gnn.mjs:55-82,103-107). Here the same graph runs in process through `model/l0-edge`,
the Q24 port of that server's model with the trained `baseline_model.pt`. Upstream's own note on this
scorer (liris-whiteroom-engine.mjs:10-11): "L0's score is a real model output but semantically
meaningful only for neurotech-shaped graphs — the WIRING is real, the MEANING is domain-bound."

L4 (:4793) is not ported (INTEGRATION-CONTRACT section 0). `real_infer_ensemble` therefore takes the
L4 server's reply as an argument, a `GnnReply` with `ok`, `scores` or the request error. Neither
server on disk replies with `final_verdict`, `allow`, `cascade_depth`, `layers` or `elapsed_ms`: the
L0 server replies `{scores, ok}` (inference_server.py:25), and the L4 server replies `{scores, ok,
model, checkpoint, checkpoint_sha256_first16, disclosure}` (gslgnn_inference_server.py:55-62), whose
last four fields `realInfer` does not read. `realInfer`'s `gnn_verdict` .. `gnn_elapsed_ms` are
therefore absent, and its `path` is `'FALLBACK'` (`allow` absent, :138).

## Measured (2026-10-18, rust 1.81.0, python 3.13, torch 2.14.1+cpu, torch_geometric 2.8.1)

- `cargo test --locked` passes 54 tests: 22 unit tests and 32 integration tests over 8 fixtures.
  `cargo clippy --all-targets -D warnings` is clean with no `-A` flag; one `#![allow(dead_code)]`
  sits in the shared test helper `tests/common/mod.rs`, because each test target uses only some of
  its fixture readers. `cargo fmt --check` is clean.
- `tools/referee.py --check` regenerates all 7 referee fixtures and reports 7/7 OK. The referee uses
  integer arithmetic only (exact `Fraction` with binary64 rounding by integer division).
- In-process L0 against the server's own model (`tools/l0_parity.py`, `tests/l0_torch.rs`; one request
  at a time, each counted in integers). Inputs: 2000 white-room requests and 2000 fabric-thinker
  requests, pid `BH.WR.liris-whiteroom.<i>`, mark/query `bigpickle:room:<i>:work`. The torch side
  runs with the kernel settings `tools/l0_parity.py` sets before torch loads (`KERNEL_ENV`, as
  `model/l0-edge/tools/model_parity.py`): `ATEN_CPU_CAPABILITY=default`, `MKL_CBWR=COMPATIBLE`,
  `OMP_NUM_THREADS=1`, `MKL_NUM_THREADS=1`. The table and the counts pinned in `tests/l0_torch.rs`
  hold for these settings.

  | requests | largest Q24 difference | rows with any difference | genius verdict at 0.72 (Rust / torch / differing) | `score.toFixed(6)` differs | fabric `cp` differs |
  |---|---|---|---|---|---|
  | white-room, 2000 | 9 units (9 / 2^24) | 1051 | 1651 / 1651 / 0 | 66 (first: i=11, 0.965410 vs 0.965409) | 0 |
  | fabric-thinker, 2000 | 9 units | 1045 | 1658 / 1658 / 0 | 64 (first: i=2, 0.969819 vs 0.969818) | 0 |

  `inference_server.py` as served sets none of these variables, so its float32 bits depend on the
  kernels torch selects for the CPU. Measured once here (Intel Xeon @ 2.10GHz, torch's default
  capability AVX512, 4 threads; `tools/l0_parity.py` run with its `os.environ.update(KERNEL_ENV)` line
  removed; not pinned): 314 of the 2000 white-room and 299 of the 2000 fabric-thinker float32
  outputs differ from the `KERNEL_ENV` bits. Against those outputs, in the table's columns, the Rust
  scores give 9 units / 1028 / 1651 / 1651 / 0 / 66 / 0 for white-room and 10 units / 1045 /
  1658 / 1658 / 0 / 69 / 0 for fabric-thinker. The smoke-run comparison below holds with both
  settings.

- The white-room smoke run with `--l0` (liris-whiteroom-engine.mjs:185-199;
  `cargo run --example whiteroom_smoke -- --l0`) gives 12 ticks: genius=10, mistake=2, live=10,
  compacted=2. The two mistakes are room 5 (0.448405) and room 8 (0.003075). With the server model's
  float32 scores, the same engine seals rooms 0-10 identically. Room 11 shows `score=0.965410` in
  process and `score=0.965409` from torch, so its sealed row and `row_hash` differ. Both runs give 10
  genius rooms.
- Without `--l0`, the example prints the deterministic smoke run, byte-identical to
  `quants/cubes examples/whiteroom_smoke`: genius=0, mistake=12.

## Inputs the operator supplies (not on disk, or third-party)

- `enrichEnvelope` (`../quant-bus.mjs`) and `encodeFrame` (`../bpi-codec.mjs`) are on no disk
  (WIRING-MAP section d item 2). The hookwall plane takes a `QuantBus` implementation and returns the
  `encodeFrame` argument list (`FrameArgs`), not an encoded frame. The tests use a stand-in, named as
  one in `tests/hookwall_plane.rs`.
- hookwall.mjs:45, the grant `authority` object, carries third-party data. `EnvelopeIn::quintuple_authority`
  marks the grant, and the operator's `QuantBus` supplies the object.
- shannon-boot.mjs:118 (`approvedBy`) and :155 (`cosign=`) carry third-party data. They are arguments
  of `ShannonGate::self_test` and `fixture_restored_row` / `emit_fixture_restored`. The fixtures use
  `OPERATOR-SUPPLIED-APPROVER` / `OPERATOR-SUPPLIED-COSIGN`, so their `row_hash` values are not the
  ones upstream's default call writes. No upstream receipt of that row was found on disk to pin
  against.
- The Shannon profile file is JSON (shannon-boot.mjs:38-45). Reading and parsing it is the caller's
  job; `ProfileSource` carries the outcome (not found, parse error message, or the five fields read;
  a `null` document is outside the domain, below).
  The caller also supplies the clocks (`new Date().toISOString()`), file paths, the consumer's HTTP
  poll/send results and its JSON state file, and the L4 reply.
- A JavaScript number reaches the planes as `String(x)` (`JsNumber::from_text`, which refuses any
  other text); a caller that decodes JSON numbers passes `String(x)` of the binary64 value.

## Domain of the port (refused rather than approximated)

- `Number(roomId) || 0` must be an integer of magnitude at most 2^53. This is the binary64 value
  `Number` rounds to, so `"9007199254740993"` gives 2^53 and `"1e-400"` gives 0, as upstream.
  Otherwise `request_live` / `grant_live` return `DomainError::NotSafeInteger`, with the counters
  unchanged.
- `_tick` compares `ts > last_ts` for two strings or two numbers. If the truthy timestamps of a tick's
  white-room envelopes and the current `last_ts` are not all strings or all numbers, the tick is
  refused before anything is sent or changed. The rule covers every white-room envelope of the
  tick, including those upstream skips as already processed or whose send fails, whose `ts`
  upstream never compares. The referee's 361 tick rows include 5 refusals.
- A profile file whose JSON is `null`: upstream `bootShannon` reads `doc.agent_pid_current` of
  `null` (shannon-boot.mjs:47) and throws a TypeError instead of returning `{ ok: false }`.
  `ProfileSource` has no outcome for it, so the caller handles that file; mapping it to an empty
  `ProfileDoc` would give `pid_mismatch:undefined` instead of the throw. Profile fields that hold
  JSON types other than strings are outside the domain too (`ProfileDoc`).
- Scores are non-negative finite binary64 values (`l0_edge::jsnum::Dbl`). Hybrid-harness scores must
  be below 2^53 (the domain of `to_fixed6`).
- JavaScript strings with unpaired surrogates are outside `JsValue`.

## Not brought in (each would need code that is not on disk)

- `quant-bus.mjs`, `bpi-codec.mjs` and the bus (`bus.register`) behind hookwall.mjs `wire(bus)`
  (:94-97). None of them is on disk.
- `../omniquant.mjs`, `../quant-bus.mjs` and the :4949 handler (WIRING-MAP section d items 1-2).
- The L4 GSLGNN forward. It is not ported (INTEGRATION-CONTRACT section 0), so its reply is an input.
- These are I/O edges, which the caller holds:
  - the HTTP transport (`postInfer`, `checkReady`, `_pollInbox`, `_send`)
  - the timer (`start` / `stop`)
  - `loadState` / `saveState` (JSON files)
  - the shannon-boot entry shim (:172-178), which prints `JSON.stringify` output
- fabric-thinker.mjs functions other than `descriptorInfer`, namely `parsePidIndex`, `loadPidIndex`
  (JSON), `thinkBatch` and `fireBatch` (redis). They lie outside fabric-thinker-gnn.mjs:27-184. The
  file is vendored whole because `realInfer` composes `descriptorInfer`.
- The `STATUS` object of fabric-thinker-gnn.mjs:216-226. It is descriptive and computes nothing.
- Upstream's claim "L0 alone gives 99.13% on test graphs" (fabric-thinker-gnn.mjs:14) is not measured
  here, and no evaluation code for it is on disk (WIRING-MAP section d item 16).

The FED gnn-oracle white-room STORE verdict (`whiteroom_verdict`, servers/gnn-oracle/src/lib.rs:402-418)
is a per-mille Rust counterpart: KEEP at `score_q >= 720`, COMPACT below. It is vendored by `host8/`
and is not duplicated or linked here. The emitters, stores, engine, deterministic scorer, seal and
cube address of Q-WHITEROOM-GULP-MINT are `quants/cubes`.

## Commands (from planes/whiteroom-shannon)

```
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 fmt --check
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
python3 -I -B tools/referee.py --check
cargo +1.81.0 run --locked -q --example whiteroom_smoke -- --l0
<python with torch 2.14.1+cpu and torch_geometric 2.8.1> -I -B tools/l0_parity.py --check
```

## Fixtures

| file | written by | rows |
|---|---|---|
| `tests/fixtures/jsvalue.hbp` | `tools/referee.py` | VALUE 405, GREATER 404, QUOTE 200, NUMTEXT 323, FROMTEXT 553 (315 `String(x)` texts, 238 not) |
| `tests/fixtures/whiteroom.hbp` | `tools/referee.py` | L0REQ 212, MEAN 6, SEAL 47 |
| `tests/fixtures/fabric-thinker.hbp` | `tools/referee.py` | GRAPH, DESC, REAL, ENS: 300 each |
| `tests/fixtures/hybrid-harness.hbp` | `tools/referee.py` | PLAN 8, DEFAULT 300, CONST 1, FANOUT 32 |
| `tests/fixtures/hookwall.hbp` | `tools/referee.py` | HW 400 |
| `tests/fixtures/shannon-boot.hbp` | `tools/referee.py` | CHECK 300, BOOT 7, BUS 60, SELFTEST 14, FIXTURE 3 |
| `tests/fixtures/whiteroom-consumer.hbp` | `tools/referee.py` | ISWR 400, CUBE 300, BUILD 200, POLL 6, TICK 361 |
| `tests/fixtures/l0-torch.hbp` | `tools/l0_parity.py` (torch, cold lane) | WR 2000, FT 2000 |

Provenance of every vendored and referenced upstream file is in `PROVENANCE.md`.
