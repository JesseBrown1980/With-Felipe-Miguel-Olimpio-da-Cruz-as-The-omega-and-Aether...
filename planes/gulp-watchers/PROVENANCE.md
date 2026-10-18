# Provenance — planes/gulp-watchers vendored upstream

Every vendored file reproduces upstream bytes. `UPSTREAM.sha256` carries the sha256 of each vendored
artifact; `sha256sum -c UPSTREAM.sha256` from this crate directory verifies them. Whole files also carry
their upstream git blob id, so `git cat-file blob <id>` in the source repo returns the same bytes. Each file
was scanned before copying for LAN addresses, emails, phone numbers, keys and names of private people.

## asolaria-behcs-256 @ 818cc235a6db815e3b2591339cf9b42aad3e85a0

Whole files (git blob id = upstream blob id):

| vendored path | upstream path | blob id |
|---|---|---|
| packages/cycle-orchestrator/src/gnn-feedback-cadence-adjuster.mjs | same | e440bf8399e67c45852a10d44c1d9b3e10caf2c1 |
| packages/omni-gulp-gc/src/gc.ts | same | a0a5123a9eb35b985471d1787b15f6207048a561 |
| packages/omni-gulp-gc/src/gulp.ts | same | 8275ab3249bb51210592d38844133eb07ac9ab69 |
| packages/super-gulp-tier3-consumer/src/promoter.mjs | same | f35029ba9a0cda9c1e11beb988758adfa865337d |
| packages/super-gulp-tier3-consumer/src/consumer.mjs | same | 078742e04c137b25d1b8326cd344f146bc388946 |
| packages-legacy-import/src/gnnConstructionWatcher.js | same | 85edb73bc7aa9fa67a93faf3246b03a195ecae15 |

Line-range excerpts (sha256 in UPSTREAM.sha256; `sed -n 'A,Bp' <upstream>` reproduces the bytes):

| vendored path | upstream path | lines | holds |
|---|---|---|---|
| packages-legacy-import/src/gnnConstructionWatcher.js.lines-49-134 | packages-legacy-import/src/gnnConstructionWatcher.js | 49–134 | `recordRoutingEdge`, `recordPatternHit`, `predictConstruction` up to :134 |
| tools/cube/omni-shannon-v3-4d12.js.lines-59-68 | tools/cube/omni-shannon-v3-4d12.js | 59–68 | `lensVerdict`'s text and field derivation (:61-64) and the hard-deny check :68 |
| tools/cube/omni-shannon-v3-4d12.js.lines-74-75 | tools/cube/omni-shannon-v3-4d12.js | 74–75 | the hard-deny check :74 and the HALT return :75 |
| tools/cube/omni-shannon-v3-4d12.js.lines-77-136 | tools/cube/omni-shannon-v3-4d12.js | 77–136 | the per-dim scoring and verdict of `lensVerdict` (:77-134) and the first line of `reflect6` |
| tools/cube/omni-shannon-v3-4d12.js.lines-181-214 | tools/cube/omni-shannon-v3-4d12.js | 181–214 | `main`'s candidate loop with the `per_part` write (:198), the tally and the consensus |
| tools/cube/cube-builder.js.lines-1-23 | tools/cube/cube-builder.js | 1–23 | the file header (what the builder emits and its usage) |

The excerpt `gnnConstructionWatcher.js.lines-49-134` predates the whole-file copy and stops inside
`predictConstruction`, which ends at :140; the whole file (no addresses, emails or names) covers :49-140.

`omni-shannon-v3-4d12.js` is not vendored whole. Lines 69–73 hold a hard-deny list that names private people,
and line 234 (the summary `cosign_chain`) names people; neither is copied (BOUNDARIES.md). `votePart`
(:142-159) and `reflect6` after its first line are outside the excerpts; `src/shannon_lens.rs` does not port
them. The dim ids `src/shannon_lens.rs` reproduces are at :44-57, also outside the excerpts.

`cube-builder.js` is not vendored past its header: lines 74 and 107 carry a peer identifier that names a
person. Its row writes (:82-113) are not ported (BOUNDARIES.md).

Files referenced by `packages/super-gulp-tier3-consumer/src/consumer.mjs` / `promoter.mjs` contain Windows
paths and the vantage identifiers `acer` and `Liris` (device/vantage names, not private persons).

### The cadence adjuster's comment and the measurement beside it (OWNER-RULES 7i)

`gnn-feedback-cadence-adjuster.mjs:15-17` reads: "The multipliers were already exact rationals -- 0.8 = 4/5
and 1.25 = 5/4 -- so integers lose nothing: every single step reproduces the float result exactly (verified
over the whole legal cadence range)."

The float version is the earlier file at the same path, private mirror commit 80bf516, blob
971f2452b8308d6ba29f08274929bd79c5b99048. Its step is `current_ms * 0.8` or `current_ms * (1 / 0.8)`, then
`Math.round` and the clamp to [5,000, 60,000] (:11-12, :59-64). The integer step here (:81, :84, ported in
`src/cadence.rs`) rounds up: `floor((ms * 4 + 4) / 5)` and `floor((ms * 5 + 3) / 4)`.

Measured on 2026-10-18 with integer arithmetic only, over every cadence value ms = 5,000..60,000 (55,001
values). The arithmetic uses exact rationals: binary64(0.8) = 3602879701896397/2^52, binary64(1 / 0.8) = 5/4,
each product is rounded to binary64 with ties to even, and `Math.round(x)` = floor(x + 1/2). The next
interval of the round-up step differs from the float version's on these counts:

| step | round-up vs float | round-half-up `floor((2*ms*N + D) / (2*D))` vs float |
|---|---|---|
| speed-up, x 4/5 | 21,500 of 55,001 | 0 of 55,001 |
| slow-down, x 5/4 | 10,750 of 55,001 | 0 of 55,001 |

Owner decision (OWNER-RULES 7i, 2026-10-18): "Int not float." The integer round-up version is the
reference. Neither `asolaria-behcs-256` nor `src/cadence.rs` changes.

## bigpickle-rebuild @ c592599c8f3d000b07cd5f4218b7d6b24d49d7d5

Whole file (git blob id = upstream blob id):

| vendored path | upstream path | blob id |
|---|---|---|
| src/cosign-bridge.mjs | same | 0a7e9831e261e221eb0947045378ad3ed979d816 |

`cosign-bridge.mjs` holds no LAN address (its only IPv4 literal is the loopback `127.0.0.1`, 3 times), no
email or key, and the vantage identifiers `acer` and `Liris`; line 23 holds a 16-hex hop row hash.
`src/cosign.rs` ports :153-189.

Read for the port, not vendored:

| upstream path | blob id | lines read | ported module |
|---|---|---|---|
| src/universal-route.mjs | 876ca02933e95cc6454e11e20b6104baeb9b9a00 | 35–81, 105–178 (defaults, class sets, `dualEmitObservation` rows) | src/route.rs |

`universal-route.mjs` holds no host or address literal. It was left out of `vendor/` because it carries a
collaborator's first name as a fix-series label 10 times: in comments at :39, :50, :56, :61, :73, in the `Error`
text at :127, and in `STATUS.canon_refs` at :219-222. The label is the operator name "Dan" (`Dan-fix #1`,
`dan_hookwall_modernization_…`); the file carries no surname. The port reproduces one of these byte for byte:
the :127 error message that `dualEmitObservation` throws when a `pixel_screenshot` emit has no `backendRowPid`
(:125-129), label included. That message appears in `src/route.rs` (:68), `tools/referee.py` (:691) and 2 rows
of `tests/fixtures/route.hbp`, and in no other file of this crate. The owner's operator-name authorization of
2026-10-18 (OWNER-RULES 5, valid until 2027-10-18) covers this operator's first name and the name-derived
identifiers as they are written in the owner's files. The error text therefore stays as upstream writes it,
and the owner decision this paragraph used to leave open is made. This pass adds no vendored file, so
`universal-route.mjs` is still read, not vendored. Under the same authorization it can be vendored
byte-identical (blob 876ca029…).
