# ledger/cosign-attribution

**Claude's addition.** Claude wrote this fresh for aether. It is not upstream code. It is a separate,
labelled report printed beside the default cosign verifier, and it is never the default path. It follows
the same pattern as the secondary throat (`qprism/recovery/throat`) and Claude's Fischer variant
(`gate/fischer-eval`).

Owner decision, 2026-10-17: "Option B — add it. Keep the default verifier unchanged (Option A numbers
never change), and add the attribution report as a clearly-labelled separate output. Same pattern as the
codec and Fischer." Recorded in OWNER-RULES 7e: "Federation-1024 cosign-serve /verify stays the default and
its counts never change (3,336 matched / 63 mismatched on the live chain); the per-row writer-formula
attribution is a separate, clearly-labelled report (Claude's addition, ledger/cosign-attribution)."

**Lane: cold.** The cosign ledger rows are upstream NDJSON. The output is HBP text (`json=0`).

## The default verifier is unchanged

The default verifier is Federation-1024's cosign-serve verify: federation-1024 @ `dc1da1a9`
`servers/cosign-serve/src/routes.rs:99-152`, over py_parity `parse_line`, `canonical_bytes` and `sha16`.
It is in aether at `ledger/cosign-council` and was not edited. This crate depends on
`ledger/cosign-council/cosign-ledger` by path (`version = "0.1.0"`) and reuses `parse_line`, `RawJson`,
`PyRow`, `py_escape_string`, `sha16`, `canonical_bytes` and `APPENDED_BY_DAEMON`.

`DEPENDS.sha256` pins the six default-verifier sources the counts rest on: `routes.rs`, and cosign-ledger
`lib.rs`, `py_parity/{mod,json_tok,canon,chain}.rs`. Each sha256 equals the one in `ledger/cosign-council/UPSTREAM.sha256`,
and each blob id equals `git rev-parse dc1da1a9:<path>` in federation-1024 (`PROVENANCE.md`). If any of those
files changes, CI fails.

The `DEFAULT` row comes from the same loop as `routes.rs:120-142`. It reads `BufRead::lines` and stops at
the first error, as `map_while(Result::ok)` does. It skips lines that are blank under `str::trim`. A line
`parse_line` refuses, or one without a string `row_hash`, counts as `legacy`. Otherwise the line is
`checked`, and it is `matched` when `sha16(canonical_bytes(row))` equals the stored hash; if not, it counts
under `mismatches`. An unreadable file gives zeros (`routes.rs:114-119`).

The tests compare that row with cosign-serve's own `GET /api/cosign/verify` (in process, append disabled)
on every synthetic file, including an empty file, a missing file, and a file that stops at invalid UTF-8. On
the owner's live chain, the in-process route gives the same four numbers.

## Output

```
cosign-attribution <chain.ndjson>

DEFAULT|verifier=federation-1024@dc1da1a9 servers/cosign-serve/src/routes.rs:99-152|checked=..|matched=..|mismatches=..|legacy=..|json=0
ATTRIBUTION|label=Claude's addition, not upstream, not the default verifier|file_opened=1|lines_read=..|read_stopped=0|blank=..|legacy_parse=..|legacy_no_hash=..|json=0
ATTRIB|line=<n>|seq=<n|none>|formula=<name>|json=0                      one per row the default counts under mismatches
ATTRIB_UNIDENTIFIED|line=<n>|row_hash_len=..|row_hash_lower_hex=0|1|full_sha256_formula=<name|none|->|json=0
ATTRIB_DAEMON_ROW|line=<n>|value_is_daemon_anchor=0|1|sha16_formula=<name|none>|json=0
ATTRIBUTION|label=...|mismatches=..|sorted_compact_kept=..|original_compact_kept=..|sorted_compact_escaped=..|original_compact_escaped=..|unidentified=..|daemon_row_mismatch=..|json=0
```

`formula` is one of `sorted_compact_kept`, `original_compact_kept`, `sorted_compact_escaped`,
`original_compact_escaped`, `unidentified` or `daemon_row_mismatch`. All values are integers or names. No
row content is printed. The label is carried by the two `ATTRIBUTION` rows; the other rows have no
label field.

The build task specified the output as the `ATTRIB` rows plus integer totals. The line counts on the
first `ATTRIBUTION` row and the `ATTRIB_UNIDENTIFIED` and `ATTRIB_DAEMON_ROW` evidence rows are Claude's
additions beyond that. They are kept until the owner decides; they are what accounts for the receipt
counts below.

## The four writer formulas

Each formula is the sha16 (the first 16 hex digits of sha256, `canon.rs:8-17`) of the row without its
top-level `row_hash`. The row is written in Python `json.dumps(row, separators=(",", ":"), sort_keys=S,
ensure_ascii=A)` form:

| formula | keys | strings |
|---|---|---|
| `sorted_compact_kept` | sorted (code point order, every object level) | non-ASCII kept (`json.encoder.encode_basestring`) |
| `original_compact_kept` | order of first appearance in the line | non-ASCII kept |
| `sorted_compact_escaped` | sorted | non-ASCII escaped as Python `ensure_ascii=True` (`encode_basestring_ascii`): `\uXXXX`, a surrogate pair above U+FFFF |
| `original_compact_escaped` | order of first appearance | non-ASCII escaped |

Rules, in the order they apply:

1. Only rows the default counts under `mismatches` are attributed.
2. A row with a top-level `appended_by_daemon` key is `daemon_row_mismatch`, and no formula is tried. An
   `ATTRIB_DAEMON_ROW` row says whether the value is the daemon's constant (`py_parity/mod.rs:16`). It also
   names the first formula whose sha16 equals the stored `row_hash`, as evidence only.
3. A `row_hash` that is not 16 lowercase hex is `unidentified`.
4. Otherwise the formulas are tried in the order above, and the first whose sha16 equals the stored
   `row_hash` is reported. An ASCII-only row with sorted keys gives the same bytes under all four, so it is
   reported as `sorted_compact_kept`.
5. Every number, `true`, `false` and `null` token is written exactly as the line stores it (`RawJson`
   keeps the token). No number is re-formatted, so `1.50`, `1E+2`, `-0` and `2.0e-3` stay as written.
6. Strings and keys are decoded as CPython's json scanner decodes them. A `\uD8xx\uDCxx` escape pair is one
   code point; any other surrogate escape stays an unpaired surrogate. They are then written as
   `encode_basestring` or `encode_basestring_ascii` writes them. The escaped form goes through py_parity's
   `py_escape_string` (`canon.rs:77-105`), which writes U+007F as it is (`canon.rs:90-94`), so that one
   character is rewritten to Python's `\u007f`. The kept form of an unpaired surrogate does not exist,
   because `str.encode("utf-8")` refuses it.
7. The row is the `PyRow` that py_parity `parse_line` reads. Nothing else reads the line, and Python's
   `json.loads` is not run on it. So the line is trimmed by Rust `str::trim` (Unicode White_Space,
   `json_tok.rs:27`): a line with a leading U+00A0 is read, though `json.loads` refuses it. A duplicate key
   keeps its first position and its last value (`json_tok.rs:151-155`), so the value it replaced is not
   read. Every number token is written as stored, including tokens outside Python's json grammar such
   as `01` (`json_tok.rs:202-220`). Keys come decoded in the `PyRow`. Value strings, which py_parity
   keeps as raw tokens, are decoded here as rule 6 says, because py_parity's own decoder is not exported
   and refuses unpaired surrogate escapes (`json_tok.rs:253-293`, `:272-283`).
   A value string with an escape CPython's scanner refuses, such as `\q`, is kept by py_parity in the
   raw token (`json_tok.rs:233-251`). It has no decoded form, so no formula is computed and the row is
   `unidentified`. Nesting depth is not limited here (see "Nesting depth").
8. An `unidentified` row with a `row_hash` of 64 lowercase hex gets `full_sha256_formula`: the first
   formula whose full 64-hex sha256 equals it, or `none`. For any other `row_hash` it is `-`.
   This is evidence only. It changes neither the attribution nor the totals.

### Nesting depth

py_parity's parser recurses once per nesting level, and so does the writer here. Measured with the
debug build on an 8 MiB main-thread stack, from a shell: a row nested 13,409 deep is attributed. At
13,410 the binary aborts on stack overflow (exit 134). Started by the referee, the same 13,409-deep file
aborts, so the boundary moves by a few levels with the process environment. On the same files,
cosign-serve's own verify route, called in process, aborts at 13,409. `parse_line` followed by
`canonical_bytes` alone aborts at 13,412. Both were measured with a scratch probe that is not in this
repository. The deepest row in the live chain is 4 levels, counting the top-level object as 1.

## Measured on the owner's live chain (private; counts only)

`scratchpad/cosign-check/COSIGN_CHAIN.ndjson`: 5,439 lines, 1,697,115 bytes, sha256 `39aaa803ad47d794ec3e3f989fcb8b0ca24aef254451941d50419dfbf2791939`.
The file was read in place. It is not copied into this repository, and no row of it is quoted here.

| | this crate | cloud receipt `COSIGN-VERIFY-RECEIPT.hbp` |
|---|---|---|
| DEFAULT checked / matched / mismatches / legacy | 3399 / 3336 / 63 / 2036 | 3399 / 3336 / 63 / 1859 + 177 |
| legacy_parse / legacy_no_hash / blank | 1859 / 177 / 4 | 1859 / 177 / 4 |
| `sorted_compact_kept` | 10 | 28 |
| `original_compact_kept` | 0 | 26 |
| `sorted_compact_escaped` | 0 | 3 |
| `original_compact_escaped` | 0 | 1 |
| `unidentified` | 52 | 5 (row_hash lengths 64, 64, 25, 17, 41) |
| `daemon_row_mismatch` | 1 | 0 (`CAUSE` row: `appended_by_daemon=0`) |

The DEFAULT counts are equal. cosign-serve's own `/api/cosign/verify`, run in process on the same file,
answers `checked 3399, matched 3336, mismatches 63, legacy 2036`.

The attribution counts differ from the receipt. The evidence rows give the cause:

- **47 rows carry a `row_hash` of 64 lowercase hex.** These rows reach rule 3, so this crate reports them
  `unidentified`. Each one's `full_sha256_formula`, the full sha256 of the same compact bytes, names:
  `sorted_compact_kept` 18, `original_compact_kept` 25, `sorted_compact_escaped` 3,
  `original_compact_escaped` 1. The receipt counts these 47 rows under those formulas. Its `CAUSE` rows
  label them "sha16". Two more 64-hex rows match no formula (`full_sha256_formula=none`).
- **One row carries an `appended_by_daemon` key** whose value is not the daemon's constant
  (`value_is_daemon_anchor=0`). Rule 2 reports it as `daemon_row_mismatch`. Its sha16 equals
  `original_compact_kept` (`ATTRIB_DAEMON_ROW`). The receipt counts it under `original_compact_kept`, and
  its `CAUSE` row says `appended_by_daemon=0`. The cloud's own per-row output
  (`scratchpad/cosign-check/compare.out`) flags that row `daemon_row=1`.

Under the receipt's reading, with the 64-hex rows taken by their full sha256 and the daemon-key row
counted under its formula, the evidence rows reproduce every receipt count:

- `sorted_compact_kept`: 10 + 18 = 28
- `original_compact_kept`: 0 + 25 + 1 = 26
- `sorted_compact_escaped`: 0 + 3 = 3
- `original_compact_escaped`: 0 + 1 = 1
- `unidentified`: 52 − 47 = 5, with lengths 64, 64, 25, 17, 41

This crate keeps the rules as specified above and does not adjust them to the receipt.

The Rust output and the referee's output on the live chain are byte-equal. On the 2,460 live rows whose
numbers are all integer tokens, the formula encoder equals Python's `json.dumps(..., separators=(",", ":"))`
in 9,840 of 9,840 forms.

## Referee (cold lane, `referee/referee.py`, Python stdlib: json + hashlib)

- **DEFAULT counts:** a line-by-line mirror of the vendored `json_tok.rs`, `canon.rs` and
  `routes.rs:120-142`.
- **Attribution:** done over the row the mirror read, with Python's own json module. Each string token
  is decoded by `json.loads` of that token (CPython's scanner), and every other token is kept as stored.
  The forms are written with `json.encoder.encode_basestring(_ascii)`, with sha256 from `hashlib`. The
  referee requires the Rust binary's output to equal its own byte for byte.
- **Depth:** the mirror recurses once per nesting level, as `json_tok.rs` does. The referee raises
  Python's recursion limit to 100,000 and avoids C-level recursion, so it reads every depth the binary
  reads.

`referee/REFEREE.hbp` pins the results (seed 20261017):

- Fixtures, each Rust == referee:
  - a 6,000-line synthetic chain (5,417 checked, 4,216 attributed)
  - a file that stops at invalid UTF-8
  - a file ending in `\r`
  - an empty file and a missing file
  - a hand-built `tokens` file: `01`, `-01` and `00.5` written as stored; replaced duplicate values; a
    `\q` value; a line trimmed of U+00A0 and U+3000
  - a hand-built `deep` file, with rows nested 600, 1,000, 2,000, 3,000 and 4,000 deep

  The generated rows
  cover all four formulas, the 64-hex full sha256, uppercase hex, non-hex hashes, `row_hash` stored with
  escapes, `appended_by_daemon` with the constant or another value, and non-ASCII and astral keys and
  values. They also cover U+007F, control characters, `\/`, unpaired surrogates, numbers with exponents and
  trailing zeros, leading-zero numbers, invalid escapes, duplicate keys, nested arrays and objects, and CRLF.
- `DUMPS`: the encoder equals `json.dumps` in 9,036 of 9,036 forms (integer-only rows).
- `MUTATION`: eight deliberate changes to the referee are each caught by the fixtures:
  - U+007F left raw in the escaped form
  - numbers re-formatted
  - escaped forms tried first
  - UTF-16 key order
  - the daemon key ignored
  - surrogatepass kept form
  - digest compared at the stored length
  - a formula only for a line CPython's `json.loads` reads

`tests/synthetic.rs` holds 33 hand-built rows. Each stored `row_hash` is py_parity `sha16`, or the full
sha256, of hand-written expected bytes, never of this crate's own serializer.

## Not brought in

- **The writer code behind the 63 rows' `row_hash` values.** The only code found that writes `row_hash`
  into `COSIGN_CHAIN.ndjson` rows is the Python single-writer daemon,
  `asolaria-cosign-chain-daemon.py:70-71`: `json.dumps(..., sort_keys=True, ensure_ascii=False)` with the
  default separators, which is the default verifier's recipe. Its rows carry `appended_by_daemon`. It is
  vendored by `ledger/hyperbehcs-daemons`; see `PROVENANCE.md`. No code that writes compact-separator or
  full-sha256 `row_hash` values was found in any of these:
  - federation-1024 @ `dc1da1a9`
  - asolaria-behcs-256 @ `818cc235`
  - asolaria-stone-to-moss @ `f032bc06`
  - bigpickle-rebuild @ `c592599c`
  - Shannon-and-the-gnns-stage @ `32f9670a`
  - the codec sources
  - all 92 refs of the private mirror (`git grep row_hash` over `*.py *.mjs *.js *.cjs *.ps1 *.ts`)

  The four formulas are therefore descriptions measured on the chain and written here. They are not ported
  writer code.

## Commands

```
sha256sum -c DEPENDS.sha256
cargo +1.81.0 fmt --all -- --check
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
cargo +1.81.0 build --locked
python3 -I referee/referee.py --bin target/debug/cosign-attribution --check
python3 -I referee/referee.py --bin target/debug/cosign-attribution --chain <private COSIGN_CHAIN.ndjson>   # counts only
```
