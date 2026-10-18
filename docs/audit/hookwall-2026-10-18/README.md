# Hookwall integration audit (2026-10-18)

The owner's objective: trace every GNN from its real input through model execution, output, Hookwall
decision, independent watcher and resulting action; then test whether tampering or failure at any
level propagates upward correctly — to tell apart *having the components*, *having them wired
together*, and *having them independently verified*.

**Answer.** aether has the components. One GNN, L0, is wired into a Hookwall verdict, and that path
is tested end to end — on synthetic events. The benched GNNs (L1, L2, L4) are not connected as
observed, non-voting members: they are disconnected. HRM/MTP and the nested levels have no lane.
There are several Hookwall implementations rather than one fabric, no runtime watcher observes any
GNN output or verdict, and of 54 tamper and failure points run, 11 fail closed.

## Method

1. **Trace** — seven read-only tracers (L0, L1, L2, L3 HRM/MTP, L4, L5+ nested, and the fabric
   itself) followed each level hop by hop with file:line evidence: `input → model_exec → output →
   hookwall_decision → watcher → action`. Each hop got one status:

   | Status | Meaning |
   |---|---|
   | WIRED_TESTED | a Rust call path in aether connects the hop to the next, and an aether test runs it |
   | WIRED_UNTESTED | the call path exists; no test runs it |
   | FIXTURE_ONLY | exercised only with fixtures or recorded rows, not the real source |
   | SEAM | an interface exists (trait, closure, field, row contract); nothing connects a real producer or consumer |
   | UPSTREAM_ONLY | the wiring exists only in vendored upstream (Node/Python), not in aether's Rust |
   | DOC_ONLY | described only in docs, canon or receipts |
   | ABSENT_IN_SCOPE | searched and not found (the search is recorded) |

2. **Verify** — two adversarial verifiers re-checked every claim: one tried to refute each wired
   claim (37 checked: 23 confirmed, 13 downgraded, 1 upgraded), one searched harder for wiring the
   tracers missed (59 checked: 57 confirmed, 2 upgraded). The corrections are applied below.
3. **Probe** — five probers ran every tamper and failure point they could reach, in scratch crates
   depending on aether's crates by path, plus the existing tests that pin the behaviour (54 points:
   52 behaved as traced, 1 differed in detail, 1 needs a live ledger not in the workspace).

`traces.json` and `probes.json` hold the full structured results; `probes/` holds the probe crates,
relocated with relative paths (each builds with `cargo +1.81.0 check --locked --all-targets`).

## Where each level stands

Best status reached per hop, after verification:

| Level | input | model_exec | output | hookwall_decision | watcher (runtime) | action |
|---|---|---|---|---|---|---|
| L0 Edge GNN | FIXTURE_ONLY | WIRED_TESTED | WIRED_TESTED | WIRED_TESTED | none (offline referee in CI only) | WIRED_TESTED (CLI exit code) |
| L1 Prototype | FIXTURE_ONLY | FIXTURE_ONLY | SEAM | ABSENT | ABSENT | ABSENT |
| L2 Contrastive | FIXTURE_ONLY | FIXTURE_ONLY | SEAM | ABSENT | ABSENT | ABSENT |
| L3 HRM / MTP | WIRED_UNTESTED (rime, enwik) | FIXTURE_ONLY | FIXTURE_ONLY | SEAM | none (cold-lane referees only) | DOC_ONLY |
| L4 GSL-GNN | FIXTURE_ONLY | FIXTURE_ONLY | SEAM (`Signals.l4`) | SEAM | none (`live-parity`, 3 recorded rows) | ABSENT |
| L5+ nested (G1–G4, N-Nest) | FIXTURE_ONLY | FIXTURE_ONLY | FIXTURE_ONLY | SEAM | none (eval/ Python only) | SEAM |
| Fabric | FIXTURE_ONLY | — | WIRED_TESTED | WIRED_TESTED (single level) | none | WIRED_TESTED (exit code) |

- **L0** — the one wired path: HBP EVENT rows → `l0_edge::observe_pair` (integer port of the served
  `EdgeLevelGNN` with its own weights) → composite (weight 30/85) → `spawn_gate` (720/280) and Fischer
  (`l0_real`) → `gate/verdict::compose` (strictest of 5 gates) → `asolaria observe` exit 0/3/4.
  Tested end to end (`gate/observed/tests/e2e.rs`, `cli/tests/cli.rs`) on the SYNTHETIC
  `model/l0-edge/tests/fixtures/events.hbp`. Nothing in aether connects the real graph-event source:
  the NDJSON store is not ported and `events/` is used only by its own tests.
- **L1, L2** — integer ports with their own trained weights, parity-tested, run only inside their
  crates' tests. No gate crate depends on them; `Signals`, `VerifiedEnvelope` and the loop's
  `ScoreFields` have no L1/L2 field; the only L1/L2-shaped slot (the hybrid harness) has no caller and
  falls back to a sha256 stub.
- **L3** — the HRM/MTP ports run in their own tests and examples; no Hookwall component consumes
  them, the MTP pre-warm reaches nothing (the loop uses a second revolver without it), and no trained
  HRM checkpoint exists in aether.
- **L4** — `gate/observed` has a "reported, not weighted" slot, `Signals.l4`, and CI pins its weight
  at 0, but `observe()` always sets it to `None` (`gate/observed/src/lib.rs:79`) and depends on no L4
  crate; no row reports it.
- **L5+** — G1/G2/G3/G4, the trio and the hybrid harness are standalone libraries over fixtures. G4's
  consumer in `gate/verdict` is fail-closed, but `g4_state` is hard-coded `UNKNOWN`.

## The fabric

- **Not one fabric.** Eight Hookwall implementations, with no shared verdict type and no call path
  between them: (1) `loop/src/hookwall.rs`, the three-outcome port, fixture lanes only;
  (2) `loop/src/dispatcher.rs:96-121` `hookwall_gate`, scoring the mock self-score; (3) `gate/hookwall`,
  with Ed25519; (4) `gate/verdict` composing (3) with `gate/fischer-eval` and `input_guard` — with
  `gate/observed` and `cli`, the only composed path; (5) `kernel/lane/core`, a kernel copy with
  Phase-1 SHA crypto and a fixed context (always PROCEED); (6) the vendored `host8-serve` and kernel,
  outside the build; (7) `planes/whiteroom-shannon` `hookwall_plane.rs`, the quintuple plane;
  (8) `planes/gulp-watchers` `route.rs` `hookwall_row`, which builds a row and decides nothing.
- **AND-upward** exists as one function over one envelope — strictest of five gates, empty set →
  BLOCK. There is no composition across GNN levels or nesting depth in Rust; the nested AND-upward with
  a parent-recompute watcher exists only in `eval/` (Python, synthetic Q-PRISM controls).
- **Independent watcher** — none on any Rust Hookwall path. The loop writes its own observation row
  and nothing reads it back.
- **Human expansion gate** — six unsigned, disconnected representations (Fischer `operator_witness`
  bool, the `Sovereignty` tier label, the whiteroom quintuple count, vote-quorum string votes, the
  council veto literal, eval's `forced_hold`); aether's Rust performs no E≠0 action.
- **Actions** — the composed fabric yields a CLI exit code; the loop can append ledger rows from
  fixture lanes. The upstream paths that fire (`/summon.hbp?fire=1`, the gnn-dispatch-bridge) bypass
  the gate and are outside aether's build.

## Tamper and failure, run

| Injection | What happens (measured) | Fails closed |
|---|---|---|
| Malformed events | exit 2 with a line number; forged signature over it → BLOCK 4 | yes |
| Any single gate BLOCK; empty gate set; `hookwall_pre` error | composed BLOCK | yes |
| Forged or bit-flipped envelope signature | BLOCK, exit 4 | yes |
| Forged `g4_state` (case, spaces, unknown, a lowering state) | BLOCK via `input_guard`; `CONVERGED` cannot loosen | yes |
| A G4 producer's own start state `DESCRIBED`, or the trio's `""` | BLOCK on every swept envelope — fail-closed, but a contract mismatch | yes |
| Output pipe lost after a verdict | HOLD/BLOCK keep 3/4; PROCEED becomes exit 1 | yes |
| Events file swapped under a valid envelope signature | verdict changes, row still says `signature=verified` | no |
| Risky history (L0 → 1.0) | composite 8281, promoted, all gates PROCEED; clean history HOLDs | no |
| L0 unavailable (no events) | composite re-weights over Shannon + baseline; **PROCEED reached with no GNN input** (payload `0123456789:;`, pid `BH.PROBE.785`, composite 9996) | no |
| L0 constant at 10000 | benign and rogue histories both PROCEED; no spread gate | no |
| One e4 unit at a rounding midpoint | 7200 PROCEED vs 7199 HOLD; only parity tests notice | no |
| `asolaria gate` with caller scores and `l0_real=1` | PROCEED exit 0; `l0_real` lowers Fischer's cpl by 0, 80 or 100 depending on floors, enough to flip HOLD→PROCEED and BLOCK→HOLD | no |
| GATE row edited downstream | undetectable: no hash or signature over the row | no |
| Loop `observe_only` with Fischer BLOCK or REFUTE | `pass=true`; only the row says OBSERVE_ONLY | no |
| Loop SCORE lane `promoted=true` with any composite (0.5, 0.0, −9.9) | FARM_GEM; `decide_verdict` has no composite parameter | no |
| Loop ledger unwritable | verdict unchanged, `observed=false`; a Fischer append failure leaves no signal | no |
| Loop observation row altered | undetected by aether; a 10-line verifier over the existing `row_hash`/`prev_hash` catches it (the data allows it, no code does it) | no |
| Cosign ledger: re-hashed row, deleted row, missing file | `/api/cosign/verify` answers ok 3/3, ok 2/2, ok `checked=0` | no |
| `CosignChain` final row altered | `validate` passes; it never reads the head | no |
| Vote-quorum voter `OP-anything`, or one string three times | counted; voters not de-duplicated | no |
| Whiteroom quintuple with five arbitrary or empty signers | HKG granted | no |
| Kernel lane, any envelope | PROCEED (slot table never reaches BLOCK); its Phase-1 signature is forgeable from the public key | no |
| G1–G3 NaN/∞/missing into G4 | G4 freezes, indistinguishable from a legitimate no-transition | no |

Not reproduced: the live cosign chain's 63 mismatches and 2,036 legacy rows (receipt) need the
owner's live ledger.

## Decisions for the owner

1. **L0's sign.** L0 was trained with label 1 = suspicious (`gnnDataExport.js:74-77`), and the served
   composite adds it as a forward ("genius") signal, so risky histories are promoted. aether reproduces
   the upstream definition exactly (`gate/observed/README.md:75-88`). Keep, invert (`1 − L0`), or bench.
2. **A spread gate for voting.** L0 votes at 0.30 while failing `std > 0.01` on the ACER corpus
   (the recheck receipt's `std` 0.00645, from its float script). Whether "calculates" becomes a
   runtime gate on voting.
3. **An absent GNN may not raise the score.** Today a missing L0 re-weights the composite upward and
   can PROCEED with no GNN input. Fail closed (HOLD when no GNN is observed), or keep the upstream rule.
4. **What the signature covers.** The events that drive L0 are unsigned. Sign them with the envelope,
   or record their digest in the GATE row.
5. **`OBSERVE_ONLY`.** In the loop Hookwall it lets a Fischer BLOCK through. Make it a per-lane
   non-voting mode, or keep it as a gate-wide bypass.
6. **One fabric.** Which Hookwall implementation is canonical, and which become adapters into it.

## What "connected, observed, non-voting" needs

For each benched GNN (L1, L2, L4, then L3 and L5+), the same five steps:

1. a dependency from the gate on the model crate, and a call on the real request (actor, target,
   payload) — not a fixture;
2. a reported, unweighted field in the composed result (as `Signals.l4` is shaped today), with a
   provenance tag: `real`, `absent` or `benched`;
3. the reading, its model digest and its provenance written into a hashed, chained observation row;
4. an independent watcher — a separate process that recomputes the row from its inputs and holds the
   parent on disagreement (the `eval/` pattern, ported to Rust over Hookwall rows);
5. a spread gate that keeps the GNN non-voting until it passes, and promotes it to a weight only by an
   owner decision.

Then the tamper table above becomes the regression suite: each "no" row is a test that should flip to
"yes" as the wiring lands.
