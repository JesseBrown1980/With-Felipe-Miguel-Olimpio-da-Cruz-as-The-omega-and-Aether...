# Ternary audit of the stack — for the integrator

Read-only audit, 2026-10-17, aether `main` @ `1d6d3d6` plus the building (untracked) crates on disk.
Status column and cited lines re-checked 2026-10-18 against `main` @ `f966009`. No file outside
`ternary/` was edited.

Rule applied (task text): a value becomes a trit **only where the owner's source itself carries
it as a trit**; upstream semantics never change. "Trit" here means the balanced values
`{-1, 0, +1}` (in the owner's code: Python ints, `np.int8`, a JS `Int8Array`, or Rust `i8`). In
this stack the trit type is the owner's `Zero` (`kernel/tribit`), re-exported as `ternary::Zero`.

Conversions, all lossless for values in `{-1, 0, +1}`:

```rust
let z = ternary::Zero::from_digit((t + 1) as u8);   // i8 / i64 t in {-1, 0, 1} -> Zero
let t = z.direction();                               // Zero -> i8 in {-1, 0, 1}
let d = z.digit();                                   // Zero -> 0..=2 (t + 1)
ternary::balanced::low_trits(v, &mut out);           // = rime_27fischers.py:39-44 / rime_agents.py:46-51
ternary::cube::index([zx, zy, zz]);                  // = (sx+1)*9 + (sy+1)*3 + (sz+1)
```

Scope: `gate/*`, `model/*`, `loop`, `hbp` (+ `hbp/relay`, `hbp/vault-reader`), `host8`, `events`,
`colour`, `search`, `quants/*`, `ledger/*`, `kernel/*`, `pump/*`, `qr/*`, `planes/*`, `agents/*`:
51 crate manifests, 391 `.rs` files, 89,516 lines (outside `target/`, `vendor/`, `upstream/`).
Method: every enum with 2-6 variants listed and read; grep for `Option<bool>`, `signum`, `-> i8`,
`: i8`, `[i8;`, `-1 | 0 | 1`, `{-1,0,+1}`, `balanced`, `ternary`, `trime`, `sign`, `direction`, and
for string literals `pass|hold|block|held|verified|unknown|failed|promoted|mistake|up|down|warn|
fail|proceed|allow|deny|escalate|yes|no|abstain|…`; each hit read with its cited upstream line.
Status (at `f966009`): **C** = committed (the commit is named for files committed after
`1d6d3d6`), **B** = building (untracked), **H** = held for the owner's privacy clearance, not in the
tree. Not in the requested list and not audited: `address/` (appeared untracked during this run), `qprism/*`, `codec/*`, `cli`, `gguf/*`,
`eval`, `time`.

## A. The owner's source carries a trit: these become `ternary::Zero`

| # | Place (aether) | St | Current type | Owner source it ports | Source carries | Replacement |
|---|---|---|---|---|---|---|
| A1 | `agents/levels/src/fischer_agent.rs:37` `trimes` (filled at `:73-85`; `sig` `:39` renders it) | C `f966009`; converted to `Zero` 2026-10-18, committed `3556ecc` (lines cited at `f966009`; now `src/fischer_agent.rs:40`, `:78-79`, `:81-88`) | `[i8; 3]` | USIM@3f9f42d `players/rime_agents.py:46-51` | Python ints in `{-1,0,1}` (`trimes.append(-1)` / `append(r)`) | `[Zero; 3]` via `low_trits(k27, …)`; `sig` from `direction()` |
| A2 | `agents/levels/src/the27.rs:16` `dlog_mod_27 -> (u64, [i64; 3])` (`bal` at `:28-39`), `Node::bal` `:86` | C `f966009`; converted to `Zero` 2026-10-18, committed `3556ecc` (lines cited at `f966009`; now `src/the27.rs:23`, `:36-37`, `:85`) | `[i64; 3]` | USIM `players/rime_27fischers.py:39-45` | Python ints in `{-1,0,1}` | `[Zero; 3]` via `low_trits` |
| A3 | `agents/levels/src/the27.rs:56` `cube27() -> [[i64; 3]; 27]`, `Node::color` `:88` | C `f966009`; converted to `Zero` 2026-10-18, committed `3556ecc` (lines cited at `f966009`; now `src/the27.rs:56-58`, `:87`) | `[[i64; 3]; 27]` | USIM `players/rime_27fischers.py:51-52` (`L=[-1,0,1]`) | tuples of Python ints in `{-1,0,1}` | `ternary::cube::cell(i)` (`[Zero; 3]`) |
| A4 | `agents/levels/src/cluster.rs:46` `to_balanced_base3 -> Vec<i64>`, `Worker::trime_digits` `:76` | C `f966009`; converted to `Zero` 2026-10-18, committed `3556ecc` (lines cited at `f966009`; now `src/cluster.rs:52-56`, `:74`; `x <= i64::MAX`, the input of `low_trits`, panics above) | `Vec<i64>` | USIM `players/rime_fischer_cluster.py:38-45` | Python ints in `{-1,0,1}` | `Vec<Zero>` via `low_trits` with `e` slots |
| A5 | `pump/glyphs-herself/src/herself.rs:252-264` `dir_key` (per-axis `sg(d)`) | C `50db484`; converted to `Zero` 2026-10-18, committed `3556ecc` (lines cited at `50db484`; now `:253-265`) | closure `-> i64`, key `u8` | USIM `measurements/asolaria_herself.py:106-107` `SG = np.sign(Dv).astype(np.int8)`; `KEY3 = (SG+1)…` | `np.int8` in `{-1,0,1}` | per-axis `Zero`, key = `cube::index` (same value) |
| A6 | `pump/glyphs-herself/src/mythos.rs:310-315` `sign_key -> u8` (`0/1/2`), key at `:334` | C `50db484`; converted to `Zero` 2026-10-18, committed `3556ecc` (lines cited at `50db484`; now `:311-319`, key `:336-338`) | `u8` digit | USIM `measurements/pump_glyphs_mythos.py:123-124` (same `np.sign … int8`) | `np.int8` in `{-1,0,1}` | `Zero` (`digit()` gives the same `0/1/2`) |
| A7 | `quants/head8/src/lib.rs:104` `Quant8::triple` (set at `:304-310`) | C `f966009`; converted to `Zero` 2026-10-18, committed `3556ecc` (lines cited at `f966009`; now `:107`, `:307-313`); outputs byte-identical (`quants/head8/PROVENANCE.md`) | `[i8; D]` | ASOLARIA-AS-NEURAL-NETWORK@4cc7624 `tools/behcs/quant-huge-message-benchmark.mjs:62,73` `triple = new Int8Array(D)`; `v > 0.33 ? 1 : (v < -0.33 ? -1 : 0)` | `Int8Array` in `{-1,0,1}` ("Triple ternary code", registry `Q-TRIPLE-TERNARY-v1`) | `[Zero; D]`; `tupleBuffer` (`:81-86`) does not carry `triple`, so no byte output changes |
| A8 | `kernel/tribit-referees/src/trunk.rs:55` `low_digits -> [i8; K]`, `leaves` `:80` | B | `[i8; 320]` | does-2-to-the-n-always-contain-a-digit-2-in-base-3@02299b4 `trunk.py:24-36` | Python ints in `{-1,0,1}` | `[Zero; 320]` (the limb arithmetic stays; only the digit type changes) |
| A9 | `hbp/vault-reader/src/lib.rs:33-49` `enum Trit {Plus, Zero, Minus}`, `Obj::verified` `:60` | C `50db484`; converted to `Zero` 2026-10-18, committed `3556ecc` (lines cited at `50db484`; now `:33-43` `pub use ternary::Zero` + `render_trit`, `verified` `:55`, `PROVENANCE.md:64-75`); outputs byte-identical (`hbp/vault-reader/PROVENANCE.md`) | local 3-variant enum | none: the reader's own rule, labelled so in `hbp/vault-reader/PROVENANCE.md:64-72` | (no owner source) | already a balanced trit (`+1/0/-1`); RULE 0.6 "reuse tribit, never reinvent" → `Zero` (`Plus→Pos`, `Zero→Nil`, `Minus→Neg`; `render_trit` from `direction()`); a type reuse, no upstream semantics involved |

## B. Three-way direction or state; the owner's source does not carry a trit: stays as is

| # | Place (aether) | St | Current type | Owner source it ports | Source carries |
|---|---|---|---|---|---|
| B1 | `gate/hookwall/src/syscall/mod.rs:38` `HookwallVerdict {Proceed, Hold, Block}` | C | Rust enum (verbatim) | federation-1024@dc1da1a9 `kernel/core/src/syscall/mod.rs:38-42` | Rust enum |
| B2 | `gate/hookwall/src/tier_gate/mod.rs:31` `TierGateVerdict {Allow, Deny, Escalate}` | C | Rust enum | federation-1024 `kernel/core/src/tier_gate/mod.rs:31` (comment-only edits, `gate/hookwall/PROVENANCE.md`) | Rust enum |
| B3 | `gate/verdict/src/lib.rs:15` `Severity {Proceed, Hold, Block}` | C | Rust enum, ordered | none: aether Layer-5 composition (`ad39d98`); maps B1/B2 and the Fischer verdict | (no owner source) |
| B4 | `loop/src/gc_runtime.rs:12` `CapStatus {Pass, Warn, Fail}` | C | enum → `"pass"/"warn"/"fail"` | bigpickle-rebuild@c592599 `gc-runtime.mjs:52-55` | JS strings |
| B5 | `quants/cubes/src/gc.rs:30` `CapStatus {Pass, Warn, Fail}` | C `f966009` | enum → strings | after-100B@c59e2e6 `backend/gc-runtime.mjs:52-55` | JS strings |
| B6 | `loop/src/hookwall.rs:19` `Verdict {FarmGem, BlockPreserve, ObserveOnly}` | C | enum → strings | bigpickle `asolaria-hookwall.mjs:27-31` | JS strings |
| B7 | `loop/src/omni_engine_loop.rs:32` `Verdict {Extract, Hold, Gc}` | C | enum → strings | ASOLARIA-AS-NEURAL-NETWORK@4cc7624 `tools/behcs/omni-engine-loop.mjs:32-34` (score `>= 700` / `>= 300` / else) | JS strings |
| B8 | `hbp/src/reader.rs:136-138` `sha_ok`, `hex_ok`, `hbi_ok` (verified / absent / failed) | C | `Option<bool>` | bigpickle `src/hbp-reader.mjs:119` (`null`), `:131`, `:140`, `:150` | JS `null` / `true` / `false` |
| B9 | `ledger/hyperbehcs-daemons/src/vote_quorum.rs:154` `CastVote::vote`, counted `:226-228` (held copy) | H | `&str` `"YES"/"NO"/"ABSTAIN"` | `asolaria-vote-quorum-daemon.py:130-132`, `:231` (held with the port) | Python strings |
| B10 | `planes/gulp-watchers/src/cadence.rs:24` `Intent {Leak, Mask, None}` | B | enum | behcs-256 `packages/cycle-orchestrator/src/gnn-feedback-cadence-adjuster.mjs:46,54-55` (`'leak'` +100, `'mask'` −300, other 0) | JS strings |
| B11 | `planes/gulp-watchers/src/cosign.rs:36` `universal_route_default(opt)` | B | `Option<bool>` → `bool` | `cosign-bridge.mjs:184` (`opts.universalRoute !== false`) | JS `undefined` / `true` / `false` |
| B12 | `colour/src/oil.rs:163-165` negative / centre / positive luma counts; strings `:314-320`, `:412` | C | three `u64` counts; text | FOLLOW@8712368 `codes/double_rainbow_to_gguf.py:299-301` (boolean sums), `:431-438`, `:547` | counts and output text (GGUF / HBP bytes) |
| B13 | `quants/hyperbehcs/src/core.rs:108-119` `achlioptas_weight` (`+√3` / `0` / `−√3`) | C `f966009` | binary64 `Number` | ASI-On-Metal `tools/falcon/omni-acer/lib/hyperbehcs-core.cjs:61-67` | JS float |
| B14 | `model/hrm-mtp/src/rime.rs:86-96` HRM `lvl` (deep / mid / base), `used[lvl]` | C | `usize` index `0..=2` | USIM `players/rime_agents.py:118-126` | Python index `0/1/2`; the "(+,0,-)" of `:130` is printed text only, and the code states no map from `lvl` to a sign |
| B15 | `model/hrm-mtp/src/rime.rs:185-193` MTP "direction 0 / + / −" | C | printed text | USIM `players/rime_agents.py:93-95` | printed text; the code runs a forward and a reversed table, no direction value |
| B16 | `colour/src/binary64.rs:376-384` `sign -> i8` inside `Ord for B64` | C | `i8` | none: comparison helper of the binary64 model (upstream compares numpy floats) | (no owner value) |
| B17 | `kernel/lane/core/src/agent_runtime/mod.rs:56` `AgentClass {VirtualPointer, RealReceiptGated, Ambiguous}` ("agent-class-check 3-state") | B | Rust enum (verbatim) | federation-1024 `kernel/core/src/agent_runtime/mod.rs:56` | Rust enum |
| B18 | `kernel/lane/core/src/syscall/mod.rs:38` `HookwallVerdict` | B | Rust enum (verbatim) | federation-1024 `kernel/core/src/syscall/mod.rs:38` | Rust enum |
| B19 | `ledger/cosign-council/council-serve/src/lane_event.rs:32` `Provenance {Verified, Derived, Mismatch}` | B | Rust enum (vendored) | federation-1024 `servers/council-serve/src/lane_event.rs:32` | Rust enum |
| B20 | `ledger/cosign-council/council-serve/src/stale_branch.rs:69` `conflicting: Option<bool>` | B | `Option<bool>` (vendored) | federation-1024 `servers/council-serve/src/stale_branch.rs:69` | Rust `Option<bool>` |
| B21 | `ledger/cosign-attribution/src/lib.rs:62` `Attribution {Formula, Unidentified, DaemonRowMismatch}` | B | Rust enum | none: Claude's addition (OWNER-RULES 7e) | (no owner source) |

B9: `src/vote_quorum.rs` and the daemon `vendor/acer-hyperbehcs-bin/asolaria-vote-quorum-daemon.py` are
held for the owner's privacy clearance and are not in the tree (`ledger/hyperbehcs-daemons/HELD.sha256`:
`vote_quorum.rs` sha256 `99ed6c25…`, the daemon `9fd9de52…`; `ledger/hyperbehcs-daemons/README.md:8`,
`:11-13`, `PROVENANCE.md` "Vendored and held"). The line numbers in B9 and in D (`vote_quorum.rs:127`)
refer to the held copies. They were checked on 2026-10-18 against the copies in
`scratchpad/HELD-FOR-OWNER/ledger-hyperbehcs-daemons/`, whose sha256 equal those pins: `:127` `Outcome`
(6 variants), `:154` `vote`, `:226-228` the three counts; daemon `:130-132` and `:231`. The 2026-10-17
audit cited the count at `:218-220`, the lines of an earlier `vote_quorum.rs` (sha256 `9cd05d72…`); in
the held copy those lines are two closing braces and a blank line, and the count is at `:226-228`.

B19-B20 (and every other file under `ledger/cosign-council`, `gate/fischer-upstream/vendor`,
`kernel/lane/core`, `gate/hookwall` beyond its logged comment edits) are upstream bytes: they stay
byte-identical whatever their types.

## C. Vendored owner code that already carries a trit (bytes unchanged)

| Place | Type | Note |
|---|---|---|
| `agents/levels/vendor/asolaria-stone-to-moss/experiments/seat1/proxima-rust181/src/lib.rs:11-12` | `pub type Trit=i8; pub const TRITS:[Trit;3]=[-1,0,1];` | committed in `f966009`; PR #124 head `5303c9b2`, vendored byte for byte; a caller converts at its own boundary with `Zero::from_digit((t + 1) as u8)` |

## D. Considered and left out (not a three-way direction or state)

- More than three values: `gate/fischer-eval/src/lib.rs:13` `FischerVerdict` (5), `kernel/lane/core/src/gnn/mod.rs:63`
  `AggregatedVerdict` (5), `planes/gulp-watchers/src/cadence.rs:14` `Verdict` (promote / demote /
  halt / neutral / unknown), `planes/gulp-watchers/src/shannon_lens.rs:62` `Verdict` (5),
  `ledger/cosign-council/council-serve/src/mcp_health.rs:20` `LaneHealth` (4),
  `…/stale_branch.rs:11` `Freshness` (4), `…/stale_branch.rs:35` `RefreshAction` (4),
  `ledger/hyperbehcs-daemons/src/vote_quorum.rs:127` `Outcome` (6; held, see B9), `events/src/risk.rs:7` `Level` (4),
  `model/g-planes/src/lib.rs:68` `Latent` (5), `loop/src/hookwall.rs:38` `FischerVerdict` (4),
  `planes/whiteroom-shannon/src/shannon_boot.rs:93` `GateVerdict` (`granted` + status strings).
- Two values: `gate/observed/src/score.rs:90` and `gate/fischer-eval/src/lib.rs:135` `promoted: bool`,
  `quants/cubes/src/whiteroom.rs:257` `Verdict {Genius, Mistake}`, `quants/slice-time-harness/src/lib.rs:406`
  `Verdict {VerifiedClone, Held}`, `model/hrm-mtp/src/hrm.rs:179` `±1` pull sign (`iter % 2`),
  `quants/cubes/src/ingest.rs:124` `±1` projection sign, the binary64 sign bits
  (`quants/*/src/number.rs`, `gate/observed/src/score.rs:193`). No "promoted / held / mistake" triple
  was found in one value; those words occur in the two-valued items above and in strings.
- Categories, not directions: `HookTier`, `Role`, `Pool`, `Level {Behcs64, Behcs256, Behcs1024}`,
  `BehcsRung`, `ComsMode`, `Evidence`, `ledger/cosign-council/council-serve/src/ptc_dispatch.rs:70`
  `PlanStatus {Ready, Empty, Invalid}`, `hbp/vault-reader/src/lib.rs:571` `Resolve` (carries data),
  JSON/number classes (`JsNum`, `RawJson`, `Val`, `Num`), error enums.
- `qr/qr-read-int/src/extract.rs:142` `Option<bool>`: `None` is arithmetic overflow, read as `false`
  at `:156`, not a third state.
- `model/l2-contrastive/src/model.rs:450`: `signum()` inside a test expectation.
