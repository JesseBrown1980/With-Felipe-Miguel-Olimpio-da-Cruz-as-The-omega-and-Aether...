# hbp — provenance

This directory holds the HBP/HBI content and integrity layer: a Rust 1.81 hot-lane port
of three upstream JavaScript units, a stdlib Python referee that reproduces them, and two
vendored upstream components. Every behaviour traces to an upstream file:line below.

## Ported from (upstream JS, verification cold lane)

| upstream file | repo @ commit | git blob id | sha256 | ported to |
|---|---|---|---|---|
| `src/hbp-emitter.mjs` lines 1-111 | JesseBrown1980/bigpickle-rebuild @ c592599c8f3d000b07cd5f4218b7d6b24d49d7d5 | f5a8e3daea7770dd72bccdf1f15e39b127f81dfb | 66766a5f944e1c25831244949e4e4d1340427520225705c3d7901229f7a4540d | `src/hbp.rs` |
| `src/hbp-reader.mjs` lines 118-156 (`verifyHBP`) + 20-40 (`detectFormat`, `parsePipeRow`) | JesseBrown1980/bigpickle-rebuild @ c592599c8f3d000b07cd5f4218b7d6b24d49d7d5 | 27bf471ae6576f91d407baca0fff6d8d56661610 | 8af1efac0be712a7dfb13ba2668ba8033b0bed630f6ab8020e537f117ed16949 | `src/reader.rs` |
| `src/tuple-tag.mjs` line 11 (`TUPLE_DIMS = 47`) | JesseBrown1980/bigpickle-rebuild @ c592599c8f3d000b07cd5f4218b7d6b24d49d7d5 | cf15e268519985b4efcde079ceadf1295e70da8f | 8d2a3976e7bd2096150d11db53965e970fd9f140f1e3c71c2f690d29e1ece8f3 | `src/hbp.rs` (const) |
| `relay-driver/relay-envelope.mjs` lines 1-77 (FIELD_ORDER:32, rowPrefix:40-42, buildRow:44-49) | JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything @ 29307bfedb512235f69bf7c290ee72b2813c7c92 | 5ae8eac90191c01d9eb83db53e9f30ac64c72c09 | 213b5f26318b0761690d2f236d5065c6b7aca9b21828041e60bb3484fabeff96 | `src/relay.rs` |

All four files are public at those commits. The CI job (`ci-snippets/hbp.txt`) fetches each one from
`raw.githubusercontent.com` at the pinned commit and checks both its git blob id and its sha256, so
a drift in the port target fails CI. The referee (`referee/hbp_referee.py`,
`referee/relay_referee.py`) mirrors these lines with the standard library only.

`tests/expected/upstream-js.hbp` holds the outputs of these upstream files measured once on the
cold lane (node v22.22.0, the files above imported read-only, fixtures from `tests/common/mod.rs`
and the variants it builds): per-sidecar sha256 of 8 emitted packets, 19 `verifyHBP` verdicts with
their error strings, 15 `detectFormat` results, 12 `parsePipeRow` results, 3 `rowPrefix` /
`sigPreimage` strings and the 2 RELAY fixture rows. `cargo test` and both referees compare against
these rows, so CI checks Rust == upstream JS and referee == upstream JS without running Node.

## Not ported, recorded

- **Cold JSON egress** — `hbp-emitter.mjs:104-108` (`if (opts.cold === true)` writes
  `${destPath}.cold.json` via `JSON.stringify(envelope, null, 2)`). Per OWNER-RULES rule 3
  (no JSON in the hot lane) this branch is absent from the Rust port and the referee. The
  `.hbp/.hbi/.sha256/.hex` trinity is the whole hot-lane surface.
- **`tryParseValue` / `parseEnvelope` JSON decode** — `hbp-reader.mjs:51-104` calls
  `JSON.parse` on payload/metadata values. That is the cold read-back path; the hot-lane port
  carries `detect_format`, `parse_pipe_row` and `verify_hbp` only.
- **Non-integer numbers** — `Value` has no non-integer number, so an envelope whose payload or
  metadata carries one (upstream callers can pass any JS value, e.g. a job `body`) cannot be produced
  on this lane. `Value::Int` matches `JSON.stringify` for |n| <= 2^53 - 1 only (see HBP.md).
- **The relay chain** — this crate ports `relay-envelope.mjs` only. The upstream suite
  `relay-driver/relay-driver.test.mjs` (blob d692cc074ed76e5676049b830bccc50aa5df4db8, 23 assertions,
  23 PASS when run upstream) imports `relay-driver.mjs`, `relay-envelope.mjs` and
  `relay-carveout.mjs`, and `relay-driver.mjs:7-10` imports `relay-hbp-writer.mjs` and
  `relay-hbi-indexer.mjs`, so it exercises five modules. Of its 23 assertions, `tests/parity.rs`
  here mirrors three (t2 row_hash after a verb change, t4a, t4b). The other four modules are not in
  this crate:

  | upstream file (reductions @ 29307bf) | git blob id |
  |---|---|
  | `relay-driver/relay-driver.mjs` | fa6b5dbccfcaa6915eda5dd3408c3fb854018fef |
  | `relay-driver/relay-carveout.mjs` | bd5e6d0f1572f92c02028326cbe71b062e4e6d16 |
  | `relay-driver/relay-hbp-writer.mjs` | 037432fac0d4240e71e2ec76779d9214fff8a96f |
  | `relay-driver/relay-hbi-indexer.mjs` | 9a0290c76139bbf5ad18f117fe5944bd3c55b8ae |

  They are ported in the sibling crate `hbp/relay` (`hbp-relay`, its own `PROVENANCE.md` and
  `ci-snippets/hbp-relay.txt`), which depends on this crate for the row grammar.

## Vendored

- `vendor/asolaria-hbi-hbp/` — 7 of the 19 files of JesseBrown1980/asolaria-hbi-hbp @ dca3f45,
  byte-identical. Its `PROVENANCE.md` lists every vendored and every excluded path with blob ids.
- `vendor/recall-serve-readonly/` — 2 of the 7 files of asolaria-federation-1024 @ dc1da1a9
  `tools/recall-serve` (`Cargo.toml`, `METRICS-2026-06-23.md`). The engine source `src/main.rs` and
  `src/atlas.html` carry a private third party's name and are not vendored; see its `PROVENANCE.md`.

## Privacy

Every file copied or ported was scanned for third-party personal data (names of private people,
chats, emails, phone numbers, LAN addresses, keys). Two upstream files that carry a private person's
name (`tools/recall-serve/src/main.rs`, `tools/recall-serve/src/atlas.html`) are recorded above by
blob id and are not in this directory. The one `BEGIN OPENSSH PRIVATE KEY` string in the upstream
relay test is a synthetic fixture whose only purpose is to assert the emit-time carve-out rejects
such payloads; it is not a real key and was not copied.
