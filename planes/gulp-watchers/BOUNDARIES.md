# Boundaries — planes/gulp-watchers

What the port computes in process, and what it leaves at the edge. Each item cites the upstream file:line it
describes (asolaria-behcs-256@818cc235, bigpickle-rebuild@c592599); upstream behaviour is stated, not
re-labelled.

## Transports (per-request I/O), not reproduced

The port carries the pure row and decision logic; moving bytes over a socket or onto disk is the caller's.

- super-gulp bus POST — `super-gulp-tier3-consumer/src/daemon.mjs:23-37` (`busPost`) POSTs envelopes to a bus
  URL and a second host URL. `src/tier3.rs` ports the promote/drain counts (`promoter.mjs:12-57`), the
  5000-line slice and `lines_scanned` (`consumer.mjs:13`, `:29`, `:83`), the noise predicate (`:42-47`) and
  the outcome tally (`:50-67`). The file moves (`promoter.mjs:29-36`, `:52-56`; `consumer.mjs:75-78`), the
  per-line `JSON.parse` (`consumer.mjs:39-40`) and `convertStageToActual` (`:49`) are the caller's: the
  consumer here takes each parsed envelope's verb and mode and the converter's outcome as input.
- cosign append — `cosign-bridge.mjs:78-113` POSTs to `/api/cosign/append`; `:117-141` GET head/range.
  `src/cosign.rs` ports `durableNotify`'s channel check, the notify-payload row, the universal-route default
  and the durability-gap verdict (`:153-189`); the append POST returns the receipt the port consumes.
- redis publish — `cosign-bridge.mjs:173` publishes the notify payload. The subscriber count it returns is an
  input to `durability_gap_status`.
- observation file writes — `universal-route.mjs:180-189` append the hookwall and GNN rows to NDJSON files
  through `appendNdjsonSoft` (`:90-98`). `src/route.rs` builds both rows as HBP text; writing them is the
  caller's.
- gc — `gc.ts:84-93` (line count), `:118` (stat), `:141-147` (rename, re-create, summary append). `src/gc.rs`
  takes the size and line count as input and returns the decision, the archive name and the summary row.
- gulp — `gulp.ts:96-107` (file read, `JSON.parse`, the parse-failure skip count) and `:144-154` (the ledger
  append). `src/gulp.rs` takes parsed records with the timestamp already parsed to epoch-ms.

## Rows upstream writes and this crate renders

Rendered as HBP `KIND|key=value` text, fields in upstream key order, values `%XX`-escaped:

| upstream row | file:line | builder |
|---|---|---|
| hookwall observation | universal-route.mjs:145-161 | `route::hookwall_row` |
| GNN live edge | universal-route.mjs:163-178 | `route::gnn_edge_row` |
| notify payload | cosign-bridge.mjs:164-172 | `cosign::notify_row` |
| `EVT-GC-ROTATED` summary | gc.ts:147-156 | `gc::rotated_row` |

A field upstream writes as `null`, or omits because its value is `undefined`, is written as an empty value.
In these rows that covers: the hookwall/GNN `event` and `vantage` (`payload.event` is `undefined` when the
payload object lacks it, `null` when the payload is not an object, `:109-110`), the `cosign_*` fields without
a receipt (`:152-154`, `:176-177`), `backendRowPid` (`:156`); the notify `event_summary` (`null` for a
non-object payload, an object without `event`/`vantage` keys when they are `undefined`, `:169-171`); and the
gc `lines` (`null` above `maxBytes`, `:153`). The empty value does not tell `null`, `undefined` and `""`
apart; this crate has no reader of these rows that depends on the difference.

## Rows upstream writes and this crate does not render

The port computes the values these rows carry, but does not render the rows. Each holds nested arrays or
objects, or fields this crate does not compute. No layout for nested values inside an HBP `key=value` row has
been set for this crate; that layout is an open question for the owner.

- `EVT-GULP-LEDGER` — `gulp.ts:144-154`: `ts`, `event`, `window_since_ms`, `scanned_lines`, `top_patterns`
  (array of `{event, count}`), `glyph_sentences` (array of strings), written when `persistLedger` is on and
  at least one sentence exists. `gulp::GulpResult` holds `scanned`, `top10` and `summary_sentences`.
- task-candidate rows — `consumer.mjs:53-64`, appended at `:71-73`: `candidate_id` (`tc-${Date.now()}-${n}`),
  `source_file`, then `source_envelope_id`, `source_envelope_verb`, `omni_score`, `reverse_score`,
  `confidence`, `cube_address`, `supervisor_chain` from `convertStageToActual`'s result, and `promoted_at`.
  The converter is not ported, so these fields are not computed here.
- `per_part` rows — `omni-shannon-v3-4d12.js:198`: `vote_id`, `candidate_id`, then `votePart`'s `dim`,
  `dim_name`, `lens_verdict`, `lens_reason`, `lens_score` (absent for HALT) and the nested `cycle`, `body` and
  `role` objects built from the lens verdict at `:145-150`. `shannon_lens::lens_verdict` returns the lens
  values; `votePart` (`:142-159`) is not ported.
- `cube-builder.js` rows — the findings seed (`:82-94`) and the calendar row (`:97-113`) hold arrays, the
  roster's agent fields, and at `:107` a peer identifier that names a person. The builder is a cold-lane
  CLI over a roster JSON file (`:122-127`); it is not ported. Its header `:1-23` is vendored.

## Third-party / private inputs, not brought in

- omni-shannon hard-deny list — `omni-shannon-v3-4d12.js:69-73`. Upstream's `lensVerdict` collects hard-deny
  tags from `:68` (`HD1`), `:69-73` and `:74` (`HD-virus`) and returns HALT when any tag is set (`:75`). The
  `:69-73` list names private people, so it is not vendored or reproduced. In `src/shannon_lens.rs` it enters
  as the caller's `operator_deny` predicate, called between the ported `:68` and `:74` checks so the tags keep
  upstream's order. The tests put a synthetic sentinel predicate in that slot, carrying no third-party data.
- `tools/behcs/gnn-live-watcher.js:147-218` (`processMessage`) — not ported in this crate. What it computes:
  - `:149-154` the message fields with `||` fallbacks; `:157-161` the transport, by substring of the sender
    against seven device/host identifiers; `:163-167` an address for the sender, from literals that are
    private LAN addresses, one annotated with a person's name (`:166`).
  - `:170-177` the Wh-chain object (nested: `who`, `where`); `:180-181` the time since the sender's last
    message, from two date strings.
  - `:183-209` the node record. It calls `extractHardwareMetrics` (`:64-120`) and `inferDeviceKind` (`:58-63`,
    whose literals include a person's first name at `:61`), and through them `normalizeDeviceId`,
    `parseMeminfoLines` and `classifyPressure` from `sovereignty/src/resourceBudgetSnapshot.js` (`:29-33`).
    That module is not in asolaria-behcs-256@818cc235; the private mirror holds it (commit 4fe9775, 665 lines).
  - `:212-215` the edge weight: `ageSeconds = (Date.now() - Date(ts)) / 1000`, recency
    `max(0, 1 - ageSeconds/300)`, frequency `min(0.3, messageCount * 0.01)`, weight `min(1.0, recency +
    frequency)`, written at `:218` as `parseFloat(weight.toFixed(3))` (a `ts` that does not parse gives NaN,
    which `JSON.stringify` writes as `null`). The edge row `{from, to, verb, weight, ts, wh}` is appended at
    `:219`.

  The parts a port can take without the private data, and what each needs: the address map as an
  operator-supplied sender-to-address input (as `operator_deny` is); the clock and the parsed `ts` as caller
  inputs (as `gulp::RawRecord::ts_ms` is); the weight in binary64 through `l0_edge::jsnum::Dbl` (contract rule
  4). `Dbl` holds non-negative values with `+`, `*`, `/` and no subtraction, so `1 - ageSeconds/300`, and a
  negative age when `ts` is ahead of the clock, need a signed extension of that module. The node record needs
  the `resourceBudgetSnapshot.js` functions above, and the edge row needs a layout for the nested `wh`.
  Questions for the owner: (1) do the device identifiers at `:158-161` and `:59-61` appear in hot-lane code,
  or enter as operator-supplied rules like the address map; (2) the HBP layout for nested row values (also
  needed by the three rows in the section above).

## Inputs the caller serializes

- omni-shannon lens text — `omni-shannon-v3-4d12.js:61` matches every text lens against
  `JSON.stringify(candidate).toLowerCase()`. `shannon_lens::Candidate::json_text` is that `JSON.stringify`
  output; the port applies the `toLowerCase()`. The text therefore includes key names, quotes, braces and
  every field value, including fields no lens reads by name (`id`, `label`, `kind`, `primary_dim`, ...): a
  `primary_dim` of `D6_GATE` puts `gate` in the text that `D32_NEGATIVE_SPACE` (`:128`) tests. A hot-lane
  caller holding a candidate as fields has to serialize it in its key insertion order with
  `JSON.stringify`'s string escapes to reproduce this input; this crate does not port that serializer
  (OWNER-RULES rule 3: no JSON in the hot lane). The fixtures in `tests/fixtures/shannon.hbp` carry
  `JSON.stringify`-shaped text. The `blast_radius`/`leverage`/`time_to_running` defaults and lowercasing
  (`:62-64`) are ported.
- super-gulp envelopes — `consumer.mjs:39-42`: the caller parses each line and passes
  `String(env.verb || "")` and `env.mode === "shadow"`.

## Numeric notes (recorded, referee-checked)

- construction routing confidence — `gnnConstructionWatcher.js:59-65` store a confidence on each edge when an
  edge of the same source is recorded: the sum runs before a first-seen target is put into the map, so that
  edge holds 0 and its siblings hold `count / total` over the earlier edges. `src/construction_routing.rs`
  stores the same ratio per edge as an exact numerator/denominator. The double compares
  `edge.confidence > maxConfidence` (`:115`) and `confidence > 0.6` (`:123`) are evaluated as
  cross-multiplication and `5*num > 3*den`. The non-zero confidences of one source share one denominator, so
  the two forms pick the same edge and gate while counts stay below 2^52. `tools/referee.py` rounds every
  ratio to its binary64 value with integer arithmetic, runs upstream's double compares on those values, and
  asserts they equal the exact-ratio picks on each prediction in the fixture. The returned confidence,
  a double upstream, is carried as the exact numerator/denominator.
- universal-route edge weight — `universal-route.mjs:174` uses `opts.gnnWeight` when it is a number, else the
  double `1.0`, which `JSON.stringify` renders `1`. `src/route.rs` carries `gnn_weight` as an optional integer
  and emits `1` when absent; a non-integer weight has no form here.
- cadence — `gnn-feedback-cadence-adjuster.mjs` computes on doubles; `src/cadence.rs` computes on `i128` with
  floor division. The two agree while every intermediate value stays below 2^53 in magnitude.
- string rules — `src/jstext.rs` reproduces JavaScript's `\s`/`trim()` set and UTF-16 `.length`.
  `toLowerCase()` uses Rust 1.81's Unicode 15.1 tables; V8 uses its ICU's tables, which can be a later
  Unicode version for characters added since.

## Covered elsewhere (not duplicated here)

- `loop/` ports `bigpickle-rebuild` `gc-runtime.mjs` and `omni-engine-loop` `gulpCycle`.
- `quants/cubes` covers `Q-WHITEROOM-GULP-MINT` and the after-100-billion-run repo.
