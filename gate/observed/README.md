# asolaria-observed

Gate inputs computed from observed graph events. `observe(events, policy)` scores the request's
`actor -> target` edge with the trained L0 EdgeLevelGNN (`model/l0-edge`), computes the
asolaria-score signals, composite and reverse gain with the `asolaria-score.mjs` formulas (L0 e4
agreement with torch as measured in [`model/l0-edge/README.md`](../../model/l0-edge/README.md#the-forward)),
and builds the `VerifiedEnvelope` the tighten-only verdict (`gate/verdict`) reads. No score-like value comes from
the caller. Crate `asolaria-observed`, `#![forbid(unsafe_code)]`, Rust 1.81, no `f32`/`f64`.

**Lane.** Hot lane: everything in `src/` runs per request, in process, on integers, HBP text and
SHA-256 (`sha2` for the baseline, shadowcat's `sha256.rs` for the observation chain), with no Python, torch, Node, JSON or HTTP. `tools/score_referee.py` is the cold
lane: a stdlib Python mirror of `asolaria-score.mjs`, on integers (an integer emulation of binary64:
a double is its 64-bit pattern, `+ - * /` the round-to-nearest-even integer operations), that CI uses
to regenerate the expected fixture.

## API

| Item | What it is |
|---|---|
| `PolicyInputs` | Every non-GNN policy input: slot, syscall number, caller pid, hook tier, caller and target tiers, event tags, the Fischer request envelope, Fischer strict mode. It has no score, l0, Shannon, composite, g4 or forward/reverse field. |
| `observe(events, policy) -> Observed` | The L0 reading, the signals, the composite, the reverse gain and the gate envelope. |
| `observe_and_compose(events, policy) -> (Observed, Composed)` | `observe`, then `asolaria_verdict::compose` over its envelope. |
| `L0Reading { score_q24, score_e4 }` | The sigmoid output in Q24 and `+l0.toFixed(4)` (asolaria-score.mjs:122) in e4 units. |
| `Observed.benched` | The L1, L2 and L4 readings (`bench::BenchReading`: level, provenance `Real` or `Absent`, Q24 score): reported, never weighted. |
| `bench::{read_benched, Level, Provenance}` | L1 and L2 on the request edge's two nodes, the six features L0 reads; L4 on pid and payload. `Level::voting()` is true for L0 only. |
| `bench::{observation_rows, watch, RowInputs, Watch, GENESIS}` | The chain the CLI writes with `observe --rows`, and the watcher that recomputes it (`cli/README.md`, "The observation chain and `watch`"). |
| `score::{shannon_e4, sha_baseline_e4, composite_e4, reverse_gain, forward_score_q, reverse_risk_q, Signals, ReverseGain}` | The asolaria-score.mjs signals and gates in e4 units (1/10000). |

## What `observe` computes

| Gate input | Computed as | Upstream |
|---|---|---|
| L0 reading | `l0_edge::observe_pair(events, actor, target)`: node features of the request's actor (node 0) and target (node 1) from the events, edge `[[0, 1]]`; `None` when either id never appears | asolaria-score.mjs:121-122; inference_server.py:24 |
| `signals.l0` | the reading's e4 value, when present | asolaria-score.mjs:122 |
| `signals.l4` | the L4 reading's e4 value: `l4_gslgnn::score_request(pid, payload)` over `[node(sha16(pid)), node(sha16(content))]` and edge `[[0, 1]]`; reported, not in the weights | asolaria-score.mjs:112-113, 126-128 |
| `signals.g1`, `g2`, `g3` | absent: `observe` sets them to `None`; this crate calls no :4949 fabric service | asolaria-score.mjs:130-138 |
| L1, L2 readings (`Observed.benched`) | `l1_prototype::model::pair_output` and `l2_contrastive::edge_output` on the actor and target nodes L0 reads; `Absent` when either id never appears; reported, never weighted | prototype_inference_server.py, contrastive trainer `train_contrastive.py:25-36` |
| `signals.shannon` | `shannon_e4(payload)` | asolaria-score.mjs:86-95, 141 |
| `signals.baseline` | `sha_baseline_e4(pid, payload)` | asolaria-score.mjs:98-101, 145 |
| composite | `composite_e4(signals)`: weights `l0 .30, g1 .10, g2 .10, g3 .10, shannon .15, baseline .10` over the present signals, in that order, divided by their summed weight, `toFixed(4)`; binary64 throughout, via `l0_edge::jsnum`. `l4` is a reported signal with no weight (the owner's 2026-10-18 edit; before it, `l4 .15`) | served asolaria-score.mjs:151-164 (`vendor/acer-scorer-2026-10-18/`) |
| reverse gain | `reverse_risk = +(1 - composite).toFixed(4)`, `promoted = composite >= 0.72 && reverse_risk <= 0.28` | asolaria-score.mjs:104-108 |
| spawn gate `forward_score_q` | `composite_e4 / 10`, rounded down | |
| spawn gate `reverse_risk_q` | `reverse_risk_e4 / 10`, rounded up | |
| Fischer `composite` | JavaScript `String` of the composite (`0.85`, `1`, `0`) | |
| Fischer `l0_real` | the L0 reading is present | asolaria-score.mjs:173 |
| Fischer `shannon_q`, `shannon_above` | `shannon_e4 / 10` and `shannon_e4 % 10 != 0` | |
| Fischer `g4_state` | `UNKNOWN` (src/lib.rs:93): G4 comes from the :4949 fabric, which `observe` does not query | bigpickle-rebuild@c592599 src/fischer-kernel.mjs:253 default |

The spawn gate PROCEEDs on `forward_score_q >= 720 && reverse_risk_q <= 280`; with the two
roundings above that holds exactly when `reverseGain(composite).promoted` holds at four decimals,
for every composite 0..=10000 (`tests/score.rs`). Every other envelope field comes from
`PolicyInputs` unchanged.

Cited upstream, not vendored (read at `JesseBrown1980/bigpickle-rebuild` @
`c592599c8f3d000b07cd5f4218b7d6b24d49d7d5`): `src/fischer-kernel.mjs` (blob
`72ab2e6a3015eefed8f68b7091dd126f716a163e`) and `src/asolaria-hookwall.mjs` (blob
`f51d86384e2559ccd36180a9b59990c4f51f0cdf`; the same blob is at `Shannon-and-the-gnns-stage` @
`32f9670` `pipeline/asolaria-hookwall.mjs`, and `loop/PROVENANCE.md` pins it too).

When the request carries a pid, the pid and the payload string are scored as
bigpickle-rebuild@c592599 src/asolaria-hookwall.mjs:67-71 scores a string payload
(`content = envelope.payload`, line 70; `score(pid, content)`, line 71). The CLI refuses an
envelope without `payload`: for a non-string payload line 70 scores
`JSON.stringify(envelope.payload ?? envelope.verb ?? '')`. For a request without a pid,
asolaria-hookwall.mjs:67 scores `stampPid(envelope)` (lines 34-37, which hash `JSON.stringify` of
the payload); `observe` scores the empty string, so the baseline, composite and reverse gain it
reports for such a request are not the values upstream computes. Upstream and `observe` both
BLOCK it: Fischer flags `missing_pid` on the envelope's own pid (fischer-kernel.mjs:146) and the
input guard BLOCKs it. Example: `cli/examples/observe-envelope.hbp` without its pid line gives
baseline 1070 and composite 1866 here; upstream stamps `BH.HOOKWALL.C6686A5047EB9973`, giving
5130 and 2604.

## Measured on the fixtures

`tests/e2e.rs` runs the SYNTHETIC events of `model/l0-edge/tests/fixtures/events.hbp` with
gate/verdict's clean request (pid `BH.VERDICT.TEST000000000001`, verb `tick`, payload
`heartbeat`), changing only `actor -> target`. Shannon is 6129 and the baseline 6350 for all of
them.

| `actor -> target` | L0 Q24 / e4 | composite | reverse risk | promoted | per gate (hookwall, spawn, tier, Fischer, input guard) | verdict |
|---|---|---|---|---|---|---|
| `agent:benign -> svc:ledger` | 0 / 0 | 2826 | 7174 | no | P, H, P, P, P | HOLD |
| `agent:rogue -> svc:vault` | 16777206 / 10000 | 8281 | 1719 | yes | P, P, P, P, P | PROCEED |
| `agent:ghost -> svc:ledger` (never observed) | none | 6217 | 3783 | no | P, H, P, P, P | HOLD |

With the L0 reading, Fischer's flags include `gnn_observable` and its center gain is 900; without
it, 700. On a request with no replay path and an operator witness required but absent, Fischer's
cpl is 240 with the L0 reading and 340 without (+100). The model was trained on the
`gnnDataExport.js` edge label, which is 1 for risk >= 6, status blocked or denied, or an action
containing blocked or denied (gnnDataExport.js:74-77), and asolaria-score adds L0 to the composite
as a forward signal with
weight 0.30; on these events the agent:rogue request is promoted and the agent:benign request is
held. These are the upstream definitions, reproduced.

Other measurements:

- Composite: for all 174 fixture pairs it equals the upstream expression
  `((0 + l0 * .30) + s * .15 + b * .10) / ((.30 + .15) + .10)` in binary64, where the summed
  weight is `0x3FE1999999999999`, exactly 4953959590107545/2^53 (JavaScript prints it as
  `0.5499999999999999`, the shortest decimal that rounds to it). Against the referee, 50,000 signal
  sets over the 32 present/absent patterns of `l0`, `l4`, `g1`, `g2`, `g3`, with `shannon` and
  `baseline` always present (25,010 of the sets carry `l4`, which has no weight): all equal. The
  binary64 composite equals the half-up rounding of the exact rational weighted mean in all
  50,000, and none of the 50,000 is an exact `toFixed(4)` half: with `l4` unweighted, every summed
  weight is an odd number of twentieths (shannon 3 + baseline 2 + even optional weights), so an
  exact half cannot occur. With the pre-edit weights (`l4 .15`), the referee at commit ba67ff8
  built 2,000 exact-half sets, and its binary64 composite rounded unlike the exact value on 1,337
  of its 50,000.
- Shannon: computed in binary64 as asolaria-score.mjs:86-95 computes it, with `Math.log2` ported
  from V8 12.4.254.21 `src/base/ieee754.cc:1951-2050` (`k_log1p`, `log2`), assuming no FMA
  contraction, which x86-64 baseline code cannot emit. Over 20,247 inputs (lengths 0 to 2000,
  multi-byte UTF-8, near-tie searches) it equals the referee's integer binary64 mirror of the
  JavaScript in all 20,247; `log2` equals the referee's mirror of V8's bit for bit on 4,096
  arguments. The JavaScript value equals the exact-arithmetic rounding — exact rationals
  (fractions.Fraction) over a fixed-point integer log2 held to 512 fractional bits — in 20,242 of
  the 20,247. Over the 20,202 non-empty inputs (the other 45 are empty: score 0, no
  `p * log2(p)` term), the closest the exact efficiency H / log2(12), times 10^4, comes to a
  half-integer (a `toFixed(4)` rounding half) is 166,661,281,510,894,334 x 10^-30, rounded down
  (in e4 units; in units of the efficiency it is x 10^-34), so the rounding is unambiguous. Those
  inputs pass 59,076 distinct `c / total` arguments to `Math.log2`. The host C library's `log2`
  against the V8 port, as measured by the retired float referee (commit cbdd721, the parent of
  ba67ff8: `tools/score_referee.py` calling Python's `math.log2`, glibc 2.39 here) on these same
  20,247 rows (its SHANNON rows are byte-identical to the current ones): it gives a different
  value from V8's for 202 of the 59,076 arguments and changes 0 of the 20,247 Shannon values. The
  integer referee does not recompute this; a re-run needs either that float call or an integer
  port of the host library's `log2` onto the binary64 emulation, as V8's `log2` is ported here.
- Baseline and reverse gain: 1,506 baselines and all 10,001 reverse gains equal.
- Chain: for the 174 fixture pairs, `observe`'s L0 reading equals `score_pair` of the torch-fed
  inputs, and its e4 value equals `+score.toFixed(4)` of the torch float32 output, for torch fed
  the Q24 inputs and for torch fed the float32 inputs of `train_baseline.build_node_features`.
- L0 e4 at rounding midpoints: over 100,000 fixed-seed request pairs the L0 e4 value differs by
  one unit from `+score.toFixed(4)` of the torch float32 output in 34 (Q24 inputs) and 38
  (`build_node_features` inputs), each at a `toFixed(4)` rounding midpoint
  (`model/l0-edge/README.md`). The composite then differs by one e4 unit: events giving the
  request pair the features of the REQUEST case `e4_midpoint`, with payload `heartbeat` and pid
  `BH.VERDICT.FLIP0000000001882`, give L0 9998, composite 7200, promoted and PROCEED here; torch's
  score gives L0 9997, composite 7199 and no promotion (`tests/e2e.rs`).

## Checks

From `gate/observed/`, as CI's `observed` job runs them:

```sh
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
python3 -I tools/score_referee.py --check
```

`asolaria observe` (in `cli/`) runs this crate from the shell over an events file and an envelope
without score keys.

## License

MIT OR Apache-2.0.
