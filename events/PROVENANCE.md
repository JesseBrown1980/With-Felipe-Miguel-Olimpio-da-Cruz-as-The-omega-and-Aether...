# Provenance: asolaria-events

This crate ports the Asolaria graph-event producer into integer-only Rust: the edge-risk score
(`edgeRiskEngine.js`) and the event/manifest builders (`graphRuntimeStore.js`). Graph events
(`buildGraphEvent`) become the HBP EVENT row that `l0_edge::event` (model/l0-edge/src/event.rs)
parses. Action manifests (`buildActionManifest`) are ported with their score but have no EVENT row:
the consumer reads only `graph-runtime-events.ndjson` (`gnnDataExport.js:12`, `loadEvents` :14-22),
while manifests are appended to `graph-runtime-manifests.ndjson` (`graphRuntimeStore.js:8`, `:206`),
which `graphRuntimeQuery.js:847` and `lirisNamedSurfaceRegistry.js:971` read. This file records
where every upstream byte came from, what was ported, what was not, and the measured agreement.

## Lanes

| Lane | What runs there | Here |
|---|---|---|
| Hot (per request, in process) | Rust only: normalize the actor/target/policy/context, compute the score, render the EVENT row. HBP text and integers; no Node, V8, JSON, HTTP or Python. | `src/` |
| Cold (verification only; its CI job is not yet merged, see Measured) | A stdlib-only Python referee that mirrors the upstream JS line by line and writes the expected rows. | `tools/events_referee.py` |

The vendored `.js` files are kept as pinned bytes; nothing in this crate executes them. A Node run
outside this crate ran them unchanged (Measured, below); the port and referee reproduce their output.

## Vendored upstream files

Byte-identical to upstream. `git hash-object <file>` gives the blob id below; `sha256sum -c
UPSTREAM.sha256` checks the bytes (2/2 OK). It is not yet run by CI: see the CI bullet under Measured.

| Vendored path | Upstream repository @ commit | Upstream path | Git blob | sha256 |
|---|---|---|---|---|
| `vendor/legacy/edgeRiskEngine.js` | `JesseBrown1980/asolaria-behcs-256` @ `818cc235a6db815e3b2591339cf9b42aad3e85a0` | `packages-legacy-import/src/edgeRiskEngine.js` | `a1867fac99d90ec6ea2aebe069edd6b9749591be` | `ab63cea1bc9f7084f2097bc104d56872fb37f01683330054e59ac2ca08f87d14` |
| `vendor/legacy/graphRuntimeStore.js` | `JesseBrown1980/asolaria-behcs-256` @ `818cc235a6db815e3b2591339cf9b42aad3e85a0` | `packages-legacy-import/src/graphRuntimeStore.js` | `db4dd2d22c0158726833f8395fc285a5f94f39d8` | `277fce44b739b624681d337bbc4917ebaea77c303eea6f5095516ee383b6d5c2` |

Privacy scan (owner rule 5): both files are control-flow and constant string/term lists; they carry
no third-party personal data (no names of private people, phone numbers, emails, chats, LAN
addresses or keys). The only identifier is the project/orchestrator name `asolaria`. Both are clean
and vendored.

## What is ported

| Rust | Upstream `file:line` | Computes |
|---|---|---|
| `risk::score_edge_risk` | `edgeRiskEngine.js:38-144` | the integer risk score |
| `risk::map_score_to_level` | `edgeRiskEngine.js:31-36` | `low/medium/high/critical` |
| `risk::normalize_domain` | `edgeRiskEngine.js:13-19` | domain class |
| `risk::normalize_criticality` | `edgeRiskEngine.js:21-29` | criticality class |
| `text::clean_text` / `clean_lower` | `edgeRiskEngine.js:1-7`, `graphRuntimeStore.js:16-18` | `String(v||"").replace(/\r/g," ").trim()` and its lowercase |
| `text::clip_text` | `graphRuntimeStore.js:20-24` | UTF-16-length clip with `...` |
| `text::slug` / `replace_units` | `graphRuntimeStore.js:40,57,102-104,148-149` | `.replace(/[^a-z0-9_:-]/g,"_")` (and the key class), one `_` per UTF-16 code unit |
| `node::normalize_node_ref` | `graphRuntimeStore.js:38-51` | actor/target `id`,`type`,… |
| `flat::normalize_policy` | `graphRuntimeStore.js:81-98` | `approvalState`,`mode`,`autonomous` |
| `flat::normalize_flat` / `js_object_entries` | `graphRuntimeStore.js:53-79` (string branch) | `Object.entries(source).slice(0,20)`, `out[safeKey] =`; `context.tool`,`routeAction`,`mode` |
| `event::build_graph_event` | `graphRuntimeStore.js:100-144` | the graph event's row fields |
| `event::build_action_manifest` | `graphRuntimeStore.js:146-185` | the manifest's fields and score (no EVENT row) |
| `event::render_event_row` | row shape `l0_edge::event` reads (`model/l0-edge/src/event.rs:94-216`) | `EVENT\|actor=\|actor_type=\|target=\|target_type=\|risk=\|status=` for a graph event |

The EVENT row carries exactly the fields the downstream consumer reads: `event.actor?.id`,
`event.actor?.type`, `event.target?.id`, `event.target?.type`, `Number(event.risk?.score||0)` and
`event.status` (`gnnDataExport.js:29-49`, cited by `model/l0-edge/src/event.rs:1-21`).

## How the JavaScript string and object rules are reproduced

- `.replace(/[^a-z0-9_:-]/g, "_")` and the key rule `/[^a-zA-Z0-9_:-]/g` have no `u` flag, so V8
  matches each UTF-16 code unit: a non-BMP char becomes `__`. `text::replace_units` writes one `_` per
  code unit. Measured under Node 22.22.0: action `browser\u{1F600}task` → slug `browser__task`,
  risk 0 (not the high-risk term `browser_task`); type `\u{1F600}` → `actor_type=__`.
- `context` is an object. `Object.entries` lists array-index keys (canonical decimal below 2^32 - 1)
  first in ascending order, then the other keys in assignment order, and `out[safeKey] =` keeps a
  key's first position with the last value. `flat::js_object_entries` applies both rules before the
  20-key window and to `out`. Measured under Node 22.22.0: keys `"9"`, `"0"`, `"4294967294"` are
  listed first; `"4294967295"`, `"01"`, `"00"`, `"-1"`, `"1.5"`, `"1e3"`, `"+1"`, `" 9"`, `"9 "`
  are not; context `[("tool","plain"),(" tool","deploy")]` gives risk 6.
- `str.slice` and `clipText` count UTF-16 code units. A clip that ends inside a surrogate pair leaves
  a lone high surrogate in JavaScript. HBP rows are UTF-8, which cannot carry a lone surrogate; the
  port writes U+FFFD in its place, the char Node's UTF-8 encoder writes for it, so position, length
  and `trim` are as in JavaScript. Which high surrogate it was is not kept: two strings that differ
  only there become equal. Measured: ids that differ only there give the same `actor=` value, and
  domains `"d"*36 + U+1F600 + "xyz"` / `"d"*36 + U+1D400 + "xyz"` give JS risk 4 (cross-domain),
  referee risk 4, port risk 0. Domains cut at the same high surrogate (U+1F600 / U+1F680, both
  U+D83D) agree. The referee keeps the lone surrogate internally (`surrogatepass`) and writes U+FFFD
  only when rendering a row.
- `String.prototype.toLowerCase`: the port uses Rust 1.81's Unicode 15.1.0 case tables and the
  referee CPython 3.13.16's (Unicode 15.1.0). Node 22.22.0 reports Unicode 16.0 / ICU 77.1, where
  U+A7CB lowercases to U+0264 and U+A7CC to U+A7CD; Unicode 15.1 has no lowercase for them. Measured:
  status `"\u{A7CB}"` → JS `status=ɤ`, port and referee `status=Ɤ`. Results equal V8's wherever the
  two table versions agree.
- `.trim()` removes the ECMAScript WhiteSpace and LineTerminator set (`text::js_trim`); U+0085,
  U+180E, U+200B and U+001C are not in it and are kept.

## What is not brought in (with evidence)

- `graphRuntimeStore.js` NDJSON store: `appendGraphEvent`/`appendActionManifest`/`appendLine`
  (`:187-213`) write JSON lines to `graph-runtime-events.ndjson` / `graph-runtime-manifests.ndjson`
  via `fs`. Not ported: the owner rule bars Node, `fs` and JSON in new code; the Rust producer writes
  the HBP EVENT row for graph events instead.
- `normalizeFlatObject` number / boolean / array / `JSON.stringify(object)` branches
  (`graphRuntimeStore.js:66-76`): not ported, and the input type carries string values only. Only
  `context.tool`/`routeAction`/`mode` reach the row, and `JSON.stringify` is barred by the no-JSON
  rule. In the callers inspected, numeric values (`spawnGraphEvent.js:44-51`, `symphonyConnector.js:102`
  `port: Number(...)`) sit under other keys and those contexts have fewer than 20 keys, so they do not
  change the row. The string branch (`:62-64`) is ported.
- `toIsoDate` (`graphRuntimeStore.js:30-36`) and `makeId` (`:26-28`): these set `event.at` and
  `event.id`, which the EVENT-row parser (`model/l0-edge/src/event.rs`) does not read. Not ported
  for this row; `makeId` is also non-deterministic (`:27`: `Date.now()`, and `Math.random()`, a float64).
- `event.subject` (`graphRuntimeStore.js:106`): normalized but not part of the EVENT row and not an
  input to the score; it is computed for completeness but not emitted.
- `evaluateDriftCreation` (`graphRuntimeStore.js:216-234`): unrelated to the event/manifest row.

## Boundary producers (callers; not ported here)

These call `appendGraphEvent`/`appendActionManifest` with string-valued context entries except where
noted above. They are the event sources at the system boundary; porting them is out of scope for
this crate.

- `packages-legacy-import/src/gateway/toolAuthority.js:2` (import), `:293` (`tool_invoked`, status
  `ok`), `:333` (`tool_failed`, status `failed`): actor `gateway_actor`/invoker, target
  `gateway_tool`/tool, `context.tool`+`mode`, `policy.approvalState`/`mode`/`autonomous`; also
  `:256` `appendActionManifest` (a manifest, so no EVENT row).
- `packages-legacy-import/src/instantAgentSpawner.js:19` (import): `:172` (`instant_agent_process`,
  actor `instant_agent`, target `message`), `:219` (`instant_agent_complete`, actor `instant_agent`,
  no target: falls back to type `target` with no id), `:504` (`construction_energy_transfer`, actor
  and target `construction`); `domain: "simulation"`.
- `packages-legacy-import/src/brainOrchestrator.js:11` (import), `:203` (`recordProviderEvent`,
  category `provider`): actor `orchestrator`/`asolaria`, target `provider`/provider-id.
- `packages-legacy-import/src/spawnGraphEvent.js:32` (`emitSpawnGraphEvent`, `agent_spawned`): actor
  `orchestrator`/`asolaria`, target `agent`, `policy.autonomous: true`, `approvalState:
  identity_pending`, numeric context values (`:44-51`). (The task's `spawnGraphEven*` resolves to
  `spawnGraphEvent.js`, whose `:1` defines `emitSpawnGraphEvent`. `git grep` over the whole
  behcs-256@818cc235 tree (1521 paths): no `function spawnGraphEvent`; the name `spawnGraphEvent`
  appears only as the module path `./spawnGraphEvent` (`spawnContextBuilder.js:36`).)

Further callers in the same tree, for reference: `gateway/toolApprovalStore.js`,
`shannonExecutionHandoffStore.js`, `shannonWorkerStageStore.js`, `taskLedgerStore.js`,
`guardianApprovalStore.js`, `securityEngagementStore.js`, `connectors/{abacus,symphony,hooks}Connector.js`,
`gnnConstructionWatcher.js`, `spawnContextBuilder.js`.

## Measured

- Corpus (`tools/events_referee.py`, integer LCG): 800 cases. Cases 1-400 are generated by their own
  LCG (seed `0x5345564E54`) and cases 401-800 by a second one (seed `0x4556454E5432`), so the first 400
  data rows of each fixture do not depend on cases 401-800 (measured: the referee run with 0 extra
  cases writes exactly the first 400 data rows of all three fixtures). Those 400 graph-event rows were
  reported unchanged from the earlier 400-case corpus when cases 401-800 were added; that earlier
  fixture is not in this repository's history (`events/` has one commit, 85faeb1) and not on this
  container, so that comparison is not re-measured here. Cases 401-800 add 80 each of: non-BMP chars in
  action/category/component/status/types/ids; a clip that cuts a surrogate pair (ids, status,
  component, action at 64 and 72, category, criticality, domains); raw context keys that collide after
  `clipText` and the key rule; array-index keys; contexts past the 20-key window. 42 of the 800 EVENT
  rows and 42 of the 800 MANIFEST records carry U+FFFD from a cut pair. Where both domains are cut, the
  corpus cuts them at the same high surrogate (`SAME_HIGH`, `tools/events_referee.py:462,510-512`), so
  the 800/800 results below do not reach the class in the UTF-16 section above where two domains are cut
  at different high surrogates (re-measured: JS risk 4, referee risk 4, port risk 0 for
  `"d"*36 + U+1F600 + "xyz"` / `"d"*36 + U+1D400 + "xyz"`; all three 0 for U+1F600 / U+1F680).
- `cargo +1.81.0 test --locked`: 5 passed, 0 failed. `tests/parity.rs`:
  - `rows_match_referee_and_parse_back`: 800 cases → 800 EVENT rows (`buildGraphEvent` only), each
    equal to the referee's row; `l0_edge::event::parse_events` reads all 800 back with the same
    actor/actor_type/target/target_type/risk/status (800/800 field-exact).
  - `manifests_match_referee`: 800 `buildActionManifest` results, compared as a test-only `MANIFEST`
    record (component, action, status, actor/target id and type, risk, level) against
    `tests/fixtures/expected-manifests.hbp`: 800/800 equal. Not an EVENT row and not fed to
    `l0_edge`.
  - `rows_measured_from_the_vendored_js`: the five rows above (non-BMP action and type, colliding
    `tool` keys, array-index key `"9"`, 120-unit clip through U+1F600), as the vendored JS printed them.
    The inputs are written inline in the test; re-measured under Node 22.22.0: 5/5 rows byte-equal.
  - `producer_fields_reach_the_consumer`: a built row re-parsed by `l0_edge` yields the same
    actor/actor_type/target/target_type/risk/status.
  - `hand_computed_vector`: `deploy`+critical-high+approved+autonomous+failed → score 11,
    `EVENT|actor=asolaria|actor_type=orchestrator|target=openai|target_type=provider|risk=11|status=failed`.
- `python3 -I tools/events_referee.py --check`:
  `EVENTS_REFEREE|cases=800|event_rows=800|manifest_rows=800|drift=0`.
- Against the vendored JS (a verification run outside this crate; its Node harness is not in this
  repository at 9201291): Node 22.22.0 running the two vendored files unchanged over
  `tests/fixtures/events-input.hbp`, printing UTF-8. Float runs in that lane, inside the owner's JS:
  every JS Number is an IEEE-754 float64 (the scores it computes hold integer values), and `makeId`
  (`graphRuntimeStore.js:27`) calls `Math.random()` in all 1600 builder calls, since no input carries
  an `id`. The compared fields are strings and integer scores; the Rust port and the Python referee
  contain no float. Results: 800/800 graph-event rows equal `expected-events.hbp` byte for byte;
  800/800 manifests equal `expected-manifests.hbp` on the full record (component, action, status,
  actor, actor_type, target, target_type, risk, level); risk equal in 800/800 events and 800/800
  manifests. 84 of the 1600 JS results hold a lone surrogate in a printed field (42 events, 42
  manifests; printed as U+FFFD). 140 of the 1600 hold one somewhere in the result (70 events, 70
  manifests); the other 56 (28 events, 28 manifests) hold it only in fields that are not printed.
  Per field, the same counts in events and in manifests: `actor.domain` 44, `risk.actorDomain` 44,
  `target.domain` 38, `risk.targetDomain` 38, `status` 19, `target.criticality` 18, `target.id` 15,
  `actor.id` 14.
- `cargo +1.81.0 fmt --check`: clean. `cargo +1.81.0 clippy --locked --all-targets -- -D warnings`:
  clean.
- no-float grep (`\bf32\b|\bf64\b|as f[0-9]`) over `src/` and `tests/`: 0 matches. That pattern does
  not cover Python, so `tools/` is scanned separately.
- `tools/events_referee.py`, token and AST scan: 137 NUMBER tokens, 0 float literals; 88 binary
  operations, of which 5 are `/` (all `pathlib` path joins, `:13-16`), 1 is `//` (`:56`, `utf16_len`)
  and 0 are `**`; 0 float or complex constants; no `float`, `round`, `pow`, `math`, `statistics`,
  `decimal`, `fractions` or `numpy` name; imports `pathlib` and `sys` only. Integer only.
- CI, at 9201291: no job in `scripts/check-all.sh` (15 jobs) or `.github/workflows/gate.yml` runs
  anything for `events/` (`events-producer`, `cd events`, `working-directory: events`,
  `events_referee`: 0 matching lines). The crate's CI lines (the sha256 and upstream-blob checks,
  cargo fmt/clippy/test, the referee `--check`, the no-float grep) are drafted in an integration
  snippet outside this repository and are not yet merged; every check above was run by hand.
