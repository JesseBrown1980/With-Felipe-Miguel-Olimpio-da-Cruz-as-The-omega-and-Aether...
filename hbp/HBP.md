# HBP/HBI content and integrity layer

A Rust 1.81 hot-lane port of the HBP packet trinity emitter, its verifier, and the RELAY row
envelope. "Measured parity" below lists what was compared with the upstream JavaScript, on which
inputs, and the input classes where the outputs differ. See `PROVENANCE.md` for sources and blob ids.

## What the code computes

### `hbp.rs` — `serialize_envelope`, `write_hbp` (ports `hbp-emitter.mjs:16-111`)

`serialize_envelope` renders an envelope as newline-joined text:

```
!HBP-v0 <type>
type=<type>
[tuple]            # present only when tuple_tag is set
D1=<v1> … D47=<v47> # TUPLE_DIMS = 47 (tuple-tag.mjs:11); missing entries render empty
[payload]          # present only when payload is set and not Null (`payload != null`, :43)
<payload>          # a String passes through; any other Value is canonical_stringify'd
[metadata]         # present only when metadata is set
<k>=<v>            # keys sorted; String value passes through, else canonical_stringify
!HBP-v0 end
```

`canonical_stringify` (`hbp-emitter.mjs:16-26`) is deterministic JS-JSON over sorted keys, used
for non-string payload/metadata values; strings render with the V8 escape set. Keys (metadata and
every object) are ordered as `Object.keys(..).sort()` orders them: by UTF-16 code units, which
differs from code-point order when one key has a character in U+E000..U+FFFF and another an astral
character. Numbers are integers only (operator rule: no float in this lane); `Value::Int` renders
as `JSON.stringify` renders the same JS Number for |n| <= 2^53 - 1.

`write_hbp` computes `sha = sha256_hex(body_bytes)` and writes four sidecars next to `<dest>`:

| sidecar | content |
|---|---|
| `<dest>.hbp` | the envelope body, no trailing newline |
| `<dest>.sha256` | `"<sha>␠␠<basename>.hbp\n"` (two spaces) |
| `<dest>.hex` | body bytes as hex, wrapped at 64 chars/line, `\n`-joined, trailing `\n` |
| `<dest>.hbi` | `!HBI-v0 / packet= / bytes= / sha256= / type=`, `\n`-joined, trailing `\n` |

### `reader.rs` — `verify_hbp` (ports `hbp-reader.mjs:118-156`), `detect_format`, `parse_pipe_row`

`verify_hbp` recomputes sha256 over the `.hbp` bytes and checks each present sidecar against it,
with the JS string rules the upstream lines use:

- a sidecar is present when the path exists (`existsSync`); it is read and decoded as UTF-8 with
  U+FFFD for invalid bytes (`readFileSync(p, 'utf8')`), so a non-UTF-8 sidecar is checked, not skipped;
- `.sha256`: `trim()` then the first `\s+`-separated token, with the ECMAScript whitespace set
  (includes U+FEFF, excludes U+0085); the error string carries the first 16 UTF-16 code units of
  the declared value (`slice(0, 16)`);
- `.hex`: `\s` removed, then `Buffer.from(hex, 'hex')`: pairs of UTF-16 code units, each read by
  its low byte, decoding stops at the first pair that is not two hex digits and an odd trailing
  unit is dropped; the decoded bytes must equal the `.hbp` bytes;
- `.hbi`: the leftmost `sha256=([0-9a-f]+)` and `bytes=(\d+)` (ASCII digits) regex matches.

Each result field is `None` when its sidecar is absent, mirroring the JS `null`. On the
`hbp missing` return the JS result has no `ok` property (`undefined`); `VerifyResult.ok` is `false`.

`detect_format` takes the first 64 UTF-16 code units and treats `^` in `/^HBPv1\|/m` as the start
of the head or the position after `\n`, `\r`, U+2028 or U+2029. `parse_pipe_row` returns the
entries of the JS object the upstream builds, in `Object.entries` order: a repeated key keeps its
first position and takes the last value, a `__proto__` key is not stored, and array-index keys
(`"0"`..`"4294967294"`) come first in ascending order.

### `relay.rs` — RELAY row (ports `relay-envelope.mjs:1-77`)

`build_row` renders one pipe row in the fixed `FIELD_ORDER` (13 fields), each value passed
through the injection guard `clean` (`relay-envelope.mjs:24-29`: rejects `|`, `{`, `}`, C0
controls, DEL, U+2028/U+2029), with `row_hash = sha16(prefix)` appended. `row_prefix` renders an
absent field as `undefined` (`String(undefined)` in `clean`); `sig_preimage` renders it as the
empty string (`Array.prototype.join`). `parse_row` enforces the header, field count and field
order and rejects control/separator characters. `row_hash_ok` recomputes the hash. Verbs classify
READ / CONTROL / ACTION, unknown → ACTION (`relay-envelope.mjs:13-17`).

## Cold lane — present upstream, not in this port

`hbp-emitter.mjs:104-108` writes `<dest>.cold.json` via `JSON.stringify(envelope, null, 2)` when
`opts.cold === true`. This port omits that branch (OWNER-RULES rule 3: no JSON in the hot lane).
The cold JSON file is the only emitter output not reproduced.

## Measured parity

Measured 2026-10-17 against the upstream files imported read-only under node v22.22.0.

In CI (`cargo test` and both referees compare with `tests/expected/upstream-js.hbp`):

| what | count | result |
|---|---|---|
| trinity packets (fix1-3, sortkeys, nullpayload, base, `x-bytes=v`, `x-sha256=q`) | 8 packets, 32 files | Rust == JS == referee, byte-identical |
| `verifyHBP` verdicts + error strings (18 sidecar variants v00-v17, one missing path) | 19 | Rust == JS == referee |
| `detectFormat` | 15 | Rust == JS == referee |
| `parsePipeRow` (tag + entries) | 12 | Rust == JS == referee |
| `rowPrefix` / `sigPreimage` strings | 3 | Rust == JS == referee |
| RELAY fixture rows (row_hash d8a4dc45208837a3, 4f1aa55ee8e760e3) | 2 | Rust == JS == referee |
| fixture tree (32 trinity + 71 variant files + relay rows) | 104 files | Rust == referee |

The variants cover each sidecar class: hex with an odd trailing nibble, trailing non-hex, a BOM,
non-UTF-8 bytes, a code unit whose low byte is a hex digit (U+0132), and an absent `.hex`; `.sha256`
with invalid UTF-8, a BOM, a U+0085 separator, an astral declared value and an empty file; `.hbi`
with uppercase hex after the sha, binary content, a decoy `sha256=` line, Arabic-Indic digits after
`bytes=`, and packet names containing `bytes=` / `sha256=`.

Cold lane, not in CI (seeded generators and outputs kept with the measurement, not in this repo):

| what | inputs | result |
|---|---|---|
| emitter fuzz, integer domain |n| <= 2^53 - 1 | 7 case files × 2000 envelopes (3 ASCII-key, 4 mixed-key incl. U+FF61 / astral keys) | 14000/14000 envelopes and 56000/56000 files JS == Rust == referee |
| `verifyHBP` sidecar-mutation fuzz (seed 31337) | 6000 packets (1872 ok, 4128 not ok) | 6000/6000 verdict rows JS == Rust == referee |
| RELAY build/parse fuzz (seeds 11, 22, 33) | 9000 cases | 9000/9000 JS == Rust |
| UTF-8 lossy decode | 5000 byte strings | 5000/5000 Node == Rust == Python |

Input classes where the outputs differ from the upstream:

- Integers with |n| > 2^53 - 1. JS stores a rounded double and prints exponent form from 1e21:
  case `{payload: {n: 1e21}, metadata: {m: 123456789012345678901234}}` gives JS
  `{"n":1e+21}` / `m=1.2345678901234569e+23` (`.hbp` sha256 31db3825…, 98 bytes) and Rust and the
  referee `{"n":1000000000000000000000}` / `m=123456789012345678901234` (328b270a…, 117 bytes).
- Non-integer numbers cannot be expressed in `Value`.
- A path that exists but cannot be read (a directory, no permission): `readFileSync` throws in the
  upstream; the port returns `hbp missing` for the `.hbp` and treats such a sidecar as absent.
- JS strings holding a lone surrogate have no Rust `String` form.

## Verification

- `cargo +1.81.0 test --locked` — 18 tests pass (`tests/parity.rs`, fixtures in `tests/common/mod.rs`).
- `cargo +1.81.0 run --example emit_fixtures -- <out>` writes the fixture tree;
  `referee/hbp_referee.py emit|check|expect` and `referee/relay_referee.py build|selftest|expect`
  (stdlib only, run `-I`) reproduce it and compare with the upstream-JS rows: `check` 104/104 files,
  `expect` 88 OK / 0 FAIL, relay `selftest` 6 OK / 0 FAIL, relay `expect` 4 OK / 0 FAIL.
