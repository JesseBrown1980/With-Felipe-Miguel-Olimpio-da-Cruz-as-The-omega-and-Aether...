# ledger/hyperbehcs-daemons

The owner's two live HyperBEHCS daemons from the ACER seat, delivered on 2026-10-17, and integer Rust 1.81
ports of their decision logic.

| Daemon | Live process (`model/live-parity/LIVE-DAEMONS-RECEIPT.hbp`) | In this directory |
|---|---|---|
| vote-quorum `:4952` | row 14: pid 7160, `python C:\HyperBEHCS\bin\asolaria-vote-quorum-daemon.py` | `vendor/acer-hyperbehcs-bin/asolaria-vote-quorum-daemon.py`, with its port `src/vote_quorum.rs` (owner decision, 2026-10-18; `PROVENANCE.md`) |
| cosign-chain `:4953` | row 15: pid 1824, `python C:\HyperBEHCS\bin\asolaria-cosign-chain-daemon.py` | `vendor/acer-hyperbehcs-bin/asolaria-cosign-chain-daemon.py` |

Both daemon files are byte-identical to the delivery (`UPSTREAM.sha256`). The vote-quorum file's line 15 and line 46
carry first names of people other than the owner; the owner authorized publishing these operator first names and
`OP-<NAME>` role tokens as written (owner decision, 2026-10-18, "Publish as-is"; OWNER-RULES 5), so the file and its
port `src/vote_quorum.rs` (line 46 as `QUINTUPLE`) are now vendored. Origin, blob ids, the privacy scan and the
owner decision are in `PROVENANCE.md`. Both daemons are Python HTTP and JSON daemons. They stay the cold lane,
unchanged. Neither was run, and no port was bound.

**Lanes.** The hot lane is the `asolaria-hyperbehcs-daemons` library: `no_std` plus `alloc`, no I/O, no clock,
no float, and no JSON parsing. Its `vote_quorum` module is built by default (feature `vote-quorum`, now the default;
owner decision, 2026-10-18); `--no-default-features` builds `cosign_chain`, `pyjson` and `iso_time` only. The cold lane holds the
daemons, `referee/referee.py` and `referee/verify_chain.py`. Both tools are Python stdlib only.

## What is ported (upstream file:line)

| Module | Upstream lines |
|---|---|
| `vote_quorum` (feature `vote-quorum`, default) | vote-quorum `QUINTUPLE`, `AUTHORIZED_CLASSES`, `LAW_WINDOW_END`, `OP_WINDOW_END` (46-49); `QUORUM_RULES` (51-61) and its `.get(class, DEFAULT)` (126); `is_authorized` (118-123), including the `AGT-<class>` and `<class>` prefix rule of line 122; `evaluate_quorum` (125-163) over the cast-vote rows of one vote; the voter-already-cast check (237-238); the outcome-row rule (108-116 and 247) |
| `cosign_chain` | cosign `ANCHOR`, `LAW` (26-27); `sha16` (32); `chain_head` (34-53) as a MAX-scan fold; `append_row` (58-74): next seq, antecedents (62-65), `ts` (66-67) and `appended_by_daemon` (68-69) defaults, and `row_hash` (70-71) |
| `pyjson` | the line 70 pre-image, `json.dumps(row without top-level "row_hash", sort_keys=True, ensure_ascii=False)`, built as text for strings, integers, lists and objects of those. The `Obj` type has Python `dict` semantics: insertion order, and `d[k] = v` replaces in place. `==` follows Python's rules, so `prev_hash not in row["antecedents"]` (line 64) compares objects by content, in any key order, and an integer never equals a string. |
| `iso_time` | the line 31 `ts` text, `%Y-%m-%dT%H:%M:%S.000Z` UTC, for whole unix seconds |

### Integer forms of the four ratio comparisons

Upstream compares with Python true division. The port cross-multiplies in `u128`, with `total = yes + no` also
taken in `u128`, so no sum of two `u64` counts wraps:

| Line | Upstream | Port |
|---|---|---|
| 149 | `yes >= (2 * total) / 3` | `3*yes >= 2*total` |
| 151 | `no > total / 3` | `3*no > total` |
| 157 | `yes > total / 2` | `2*yes > total` |
| 159 | `no >= total / 2` | `2*no >= total` |

The referee takes the four expressions from the vendored lines' own text and evaluates them in Python, together with
the guarded `if`/`elif` outcome of lines 148-163. It compares them with the Rust forms for every `(yes, no)` with
`yes + no <= 10,000`. That is 50,015,001 pairs, and they are equal for all of them (`EXHAUSTIVE` row of
`referee/VOTE-QUORUM.hbp`). This is the only place where float appears: it is upstream's own expressions, run
unchanged. In the compared bytes each branch outcome is a balanced trit stored as trit + 1 (reject -1, pending 0,
pass +1).

Above that range, sampled totals near the thresholds give these results (`BIG` rows):

- equal in every sample up to `2^52`
- `2^52 .. 2^53`: 134 of 10,000 differ
- `2^53 .. 2^54`: 802 of 10,000 differ
- `2^54 .. 2^62`: 7,681 of 10,000 differ

In these ranges the double result of `(2 * total) / 3`, `total / 3` and `total / 2` carries no fraction, or rounds by
more than one unit. The integer forms give the exact rational comparison. Each vote is one ledger row.

Two pairs whose sum exceeds `u64::MAX` (`BIG_EDGE` rows): `(2^64 - 1, 1)` gives the same bits on both sides
(PASS in both branches). `(2^64 - 1, 2^64 - 1)` gives REJECT in both branches in Rust. Upstream gives REJECT and
PENDING there, because the double `total / 2` is `2^64`, so line 159 is false.

### Statements requested: authority windows, `extra`, clock

- `LAW_WINDOW_END = "2026-09-23"` (line 48, comment "quintuple 4mo") and `OP_WINDOW_END = "2026-07-23"` (line 49,
  comment "OP class 2mo") occur only at lines 48, 49 and 200. Line 200 is in the `/api/vote-quorum/quorum-rules`
  answer (lines 197-200). `is_authorized` (118-123) and `evaluate_quorum` (125-163) do not read either name. The
  referee measures this from the vendored file with `tokenize` and `ast` (`WINDOWS` and `READS` rows).
- The `AUTHORIZED_CLASSES` comment "2-month window" (line 47) is not read by any code either.
- `USB_WRITE`'s `"extra": "operator-witness-required"` occurs only at line 54. It is returned by `/submit` (line 225)
  and `/quorum-rules` (line 198). `evaluate_quorum` reads `rule` and `pool` only (line 127).
- `now_iso()` is called at lines 82, 189 and 219 only: the ledger `ts`, the `/health` `ts`, and the `vote_id` seed.
  No authorization or quorum line reads the clock.
- The receipt lists both processes on 2026-10-17 (rows 14-15; row 13 reads
  `NOT_LISTENING|port=4952_now|note=7160_was_vote-quorum`). Both window dates are before that day. No line of
  either daemon compares a date with them. The port carries both constants as upstream defines them and does not
  read them.

### Domain of the hot-lane port

- Values are strings, integers (`i128`), lists and objects of those. Upstream accepts any JSON payload. Rows with
  `true`, `false`, `null` or floats stay in the cold lane. On the owner's live chain (below), 2,135 of the 3,330
  daemon rows hold only these shapes, and 1,195 stay in the cold lane: 1,097 hold a float, 96 a bool and 21 a null
  (a row can hold more than one). None holds an integer outside `i128` or a lone surrogate.
- Python integers are unbounded. `i128` holds seq from `-2^127` to `2^127 - 1`. When the head seq is
  `2^127 - 1`, upstream line 59 gives `2^127`, and `append_row` returns `None`, so that row stays in the cold lane.
- `chain_head` over parsed rows takes `seq` only when it is `Value::Int`. `Head::fold(seq, row_hash)` is the
  lower-level step for a cold-lane loader. Line 49 tests `isinstance(s, int)`, which also holds for JSON
  `true`/`false` (1/0), so a loader mirroring line 49 passes those as 1 and 0.
- Rust strings cannot hold lone surrogates. Upstream line 32 `s.encode()` raises on them, and the append answers 500
  (lines 125-126).
- The caller supplies `now` (`iso_time::now_iso_at`). The caller also keeps the single-writer order that
  upstream's lock gives (lines 29, 57).
- The caller writes the row. `Appended::row` is in the key order of the Python dict that line 73 writes. The
  persisted `.ndjson` line is JSON text, and writing it stays in the cold lane.
- Not ported: line 120. In the HTTP handler, a payload object that has a key `"_parse_error"` is answered 400 and
  not appended.
- `evaluate_quorum` takes `voter_pid` and `vote` as strings. Only the exact strings `"YES"`, `"NO"` and `"ABSTAIN"`
  are counted (lines 130-132).

## Measured (seed 20261017)

The referee executes the vendored lines by range: vote-quorum 30-33, 42-61, 63-64, 66-163 and 165-254; cosign
17-20, 25-32 and 34-74. It replaces only these:

- the `C:/` paths and `mkdir` lines (vote-quorum 35-40, cosign 22-24), with temp paths
- the `datetime` class that `now_iso` reads, with a fixed clock
- the Handler's socket writes (`_send`)

Each daemon is one lane with its own `random.Random(20261017)` and its own receipt. `referee/REFEREE.hbp` holds the
cosign-chain lane. `referee/VOTE-QUORUM.hbp` holds the vote-quorum lane, which now runs on every referee run, the
daemon being vendored (owner decision, 2026-10-18). If the vendored daemon were absent the referee would print one
`HELD` row and leave that receipt uncompared. Both receipts were written in one run with the daemon in place.
Apart from its header and the new `BIG_EDGE` rows, `VOTE-QUORUM.hbp` has the same rows as the earlier single
receipt.

The referee requires the Rust answers to equal the upstream answers in every mode:

| Mode | Cases | Equal |
|---|---|---|
| rules table, sets, windows | 11 rows | yes |
| `is_authorized` (3 pools) | 354 | yes |
| `evaluate_quorum`, `votes_for` given the rows (9 classes and unknown ones; votes YES/NO/ABSTAIN and other strings) | 4,000 (PASS-AUTO 308, PASS-MAJORITY 1,210, PASS-SUPERMAJORITY 118, PASS-UNANIMOUS 80, PENDING 2,056, REJECT 228) | yes |
| exhaustive ratio forms, `yes + no <= 10,000` | 50,015,001 pairs | yes |
| line 247 condition plus `outcome_exists` over an outcomes file | 600 | yes |
| end to end through upstream `Handler.do_POST` (submit, then casts; temp ledgers) | 500 votes, 3,949 casts, 210 answered 409, 252 outcome rows | yes |
| line 31 `ts` text | 3,010 instants, 1970 to 9999 | yes |
| line 70 pre-image and sha16 | 3,000 values (with control characters 1,638; `"` 372; `\` 373; U+007F 355; non-ASCII BMP 1,690; astral 854; U+2028 392; non-ASCII keys 1,110; nested objects 797) | yes |
| `append_row` chains over historic lines (out-of-order and duplicate seq, missing or non-string `row_hash`, string, float, bool and null seq, seq at `2^127 - 2` and `2^127 - 1`, non-object lines, invalid UTF-8, leading-zero and NaN tokens) | 450 chains (50 fixed edges, 400 seeded), 1,499 historic lines (219 skipped by lines 46-52), 1,033 appends: seq, prev, row_hash, pre-image bytes and row key order. 51 appends follow a non-string head `row_hash`. 117 carry an `antecedents` list holding a variant of the head value: an int's decimal text, a decimal string's int, a reordered or changed dict, a list's last element or the list reversed. 19 appends follow head seq `2^127 - 1`, and Rust answers `APPEND_COLD`. | yes |
| `verify_chain.py` on those 450 chains | 835 anchor rows: hash equal 835, seq = head + 1 835; 756 with list antecedents, all holding the head hash; 818 in hot-lane shapes (the other 17 have seq `2^127`) | yes |

Fifteen deliberate mutations of the Rust port were each caught. These were:

- `>=` to `>` in lines 149 and 159
- dropping the `AGT-` rule
- unanimous ignoring NO
- escaping U+007F
- UTF-16 key order
- appending instead of prepending `prev_hash`
- `>=` in the MAX-scan
- keeping `row_hash` in the pre-image
- shifting the leap year
- ignoring `outcome_exists`
- restricting the already-cast check to authorized voters
- an integer equal to its decimal text in `Value` `==` (caught by the referee's chain mode and by
  `tests/cosign_chain.rs`)
- line-64 membership compared only between strings (caught by the referee's chain mode and by
  `tests/cosign_chain.rs`)
- `wrapping_add` in place of the checked next seq (caught by the referee's chain mode and by
  `tests/cosign_chain.rs`)

The first twelve were applied in place, then the source was restored and checked by sha256. The last three were
applied to a copy of this directory, and the copy was compared with the source afterwards.

Upstream behaviour measured on the way, with upstream lines only:

- `SPLITLINES`: `json.dumps(ensure_ascii=False)` (line 86) writes U+0085, U+2028 and U+2029 unescaped.
  `votes_for` (line 100), `all_open_votes` (92) and `outcome_exists` (111) split with `str.splitlines`, which breaks
  at those characters. A cast whose `reason` holds one of them is written to `votes.ndjson` as one row, but
  `votes_for` reads 0 rows from it. A second cast by the same voter is answered 200, not 409. Measured with each of
  the three characters: 2 cast rows written, 1 read, `yes` 1 after the second cast.
- `TAIL2048`: the vote-ledger `last_row_hash` (lines 66-77) reads the last 2,048 bytes. After a 3,374-byte queue row,
  the next row's `antecedents` is `"0000000000000000"`.

## Comparison with federation-1024 cosign-serve / cosign-ledger and ledger/cosign-council

The WIRING-MAP lists federation-1024 @ `dc1da1a9` `servers/cosign-serve` (`:5091`) and `servers/cosign-ledger`
`py_parity` as mirroring this daemon. Those are the sources `ledger/cosign-council` vendors byte-identical
(`py_parity/mod.rs:1-5`; `APPENDED_BY_DAEMON` at `mod.rs:16` equals line 26).

The figures below come from `referee/FED-COMPARE.hbp`. That file runs `ledger/cosign-council`'s
`cosign-council-vectors` (the vendored federation Rust) against the exec'd upstream lines, on the same inputs.

| Topic | Agree | Differ (measured case, code line) |
|---|---|---|
| seq assignment | MAX over integer `seq`, first holder of the maximum kept, next = MAX + 1. Out-of-order or duplicate seq, a missing `row_hash` on the max row (both use `0000000000000000`), string, `9.0` and `1e1` seq, negative seq, array lines, blank lines, CRLF, duplicate `seq` keys (last value wins) and a BOM line all give equal heads. 300 chained appends: seq equal 300. | <ul><li>`row_hash` of the max row an integer or a list: upstream line 51 returns that value; federation `fold_seq_max` gives `0000000000000000` (`chain.rs:39`).</li><li>`seq: true`: line 49 counts it (`isinstance(True, int)`); `parse_u64_token` does not (`json_tok.rs:82-87`).</li><li>`seq: 09`: Python `json.loads` refuses the line; the federation tokenizer reads 9 (`json_tok.rs:202-231`).</li><li>`NaN` elsewhere in the row: Python reads the row; the federation tokenizer refuses it.</li><li>seq above `u64`: Python counts it; federation skips it.</li><li>A row with an invalid UTF-8 byte: line 44 drops the byte (`errors="ignore"`); `resume_from` stops with an error (`resume.rs:13-14`), and `/head` falls back to the shadow head (`routes.rs:44-50`).</li><li>Two rows joined by a lone `\r`: Python's universal newlines read 2 rows; federation reads 1 line and refuses it.</li></ul> |
| antecedents | Absent: `[prev]`. A list without prev: prepend. A list with prev: unchanged. A string or `null`: unchanged (`chain.rs:55-71` against lines 62-65). | A body that writes prev escaped (`"\u0030…"`): Python decodes it, finds prev and leaves the list. Federation compares raw token text (`chain.rs:61-63`) and prepends. |
| `ts`, `appended_by_daemon` | Defaults applied only when the key is absent (`chain.rs:72-77`). | — |
| row_hash (append) | From the same request body, equal when the body is already in `json.dumps(ensure_ascii=False)` form and has only ASCII keys: of 300 such bodies, 157 equal and the 143 that differ all have a non-ASCII key. Also equal: float `1.0`, `true`/`null`, nested key order. | <ul><li>Non-ASCII keys: `py_escape_string` writes U+0080..U+FFFF as `\uXXXX` (`canon.rs:89`) and U+10000 and above as a surrogate pair `\uXXXX\uXXXX` (`canon.rs:95-100`); line 70 writes them raw.</li><li>Body tokens not in that form, such as `"ol\u00e1"`, `"\u007f"`, `"a\/b"` or `1e2`: federation keeps raw scalar tokens (`canon.rs:41`), while Python decodes and re-dumps.</li><li>`json.dumps` default and compact bodies: 129 of 300 equal.</li></ul> |
| row_hash (replay of daemon-written rows, line 73) | py_parity 157 of 300 and vote canon 260 of 300 equal. | <ul><li>py_parity: all 143 that differ have a non-ASCII key.</li><li>vote canon: all 40 that differ have a key written with an escape (control character, `"` or `\`). It sorts keys by their bytes as written (cosign-council README).</li></ul> |
| row key order / line bytes | The persisted line (`canon.rs:30-37`) has the same bytes as line 73 in 12 of the 19 `FED_APPEND_CASE` rows. | <ul><li>A payload carrying `seq` or `row_hash`: federation removes and re-appends them (`chain.rs:51-53, 79-81`); Python keeps their position.</li><li>Non-ASCII keys and non-canonical body tokens (as above).</li></ul> |
| fixture `cosign-serve/fixtures/daemon-row-hash.ndjson` | Row 1: stored `101b6e1b41a4038f` = upstream append. | Row 2 (`"value":"ol\u00e1"`): stored `ff433399335fe8ad`. Upstream lines 55-74 on its payload give `8037232646d39d34`. |

**Vote quorum, by code reading** (federation `servers/vote-quorum/src/lib.rs`, vendored in `ledger/cosign-council`
on the owner decision of 2026-10-18, and not compiled here):

- Its `rule_for` (62-70), `is_authorized` (74-85) and the integer forms (lib.rs:89-90, 123-138) are the same as this
  port's.
- Its `Vote` enum (37-41) has only Yes, No and Abstain, so other vote strings cannot be passed in. Upstream has no path that counts them.
- Its counts are `u32`.

**On the owner's live chain** (`scratchpad/cosign-check/COSIGN_CHAIN.ndjson`, sha256 `39aaa803…`, read in place, counts
only), `verify_chain.py` gives:

- 5,439 lines and 3,575 parsed rows
- 3,399 rows with `row_hash`: 3,336 equal to line 70 and 63 differ. These are the same counts as federation
  cosign-serve `/verify`, which stays the default verifier (OWNER-RULES 7e). This tool is not wired as a default.
- 3,330 rows carry the daemon anchor, and all 3,330 equal line 70.
- 3,329 of them have `seq` = MAX of the lines before them + 1, with that line's `row_hash` in `antecedents`. The
  other one is line 2,030, the first anchored row. It has seq 254, and the lines before it already hold seq 254.
  Its one-entry `antecedents` does not hold that row's hash.
- 2,135 of the 3,330 anchored rows hold only hot-lane shapes. 1,097 hold a float, 96 a bool and 21 a null, and
  none holds an integer outside `i128` or a lone surrogate.
- head seq 3,587

## Not brought in

- The daemons' HTTP handlers are kept as upstream Python (cold lane), by design.
- The operator ledgers `C:/HyperBEHCS/data/vote-quorum/{queue,votes,outcomes}.ndjson` were not delivered. The
  vote-quorum port is checked on ledgers that the upstream handler writes in temp directories.
- Nothing is held any more: `vendor/acer-hyperbehcs-bin/asolaria-vote-quorum-daemon.py` and `src/vote_quorum.rs` were
  vendored on the owner decision of 2026-10-18 (`PROVENANCE.md`, "Owner decision, 2026-10-18"), and `HELD.sha256` was
  removed.

## Commands

```
# default lane (vote-quorum on):
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 fmt -- --check
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked                              # 13 (6 cosign_chain + 7 vote_quorum)
cargo +1.81.0 build --locked
rustfmt +1.81.0 --edition 2021 --check src/vote_quorum.rs
python3 -I referee/referee.py --vectors target/debug/hyperbehcs-daemons-vectors --check   # both receipts
# with ledger/cosign-council built:
python3 -I referee/referee.py --vectors target/debug/hyperbehcs-daemons-vectors \
    --fed-vectors ../cosign-council/target/debug/cosign-council-vectors --check
python3 -I referee/verify_chain.py <chain.ndjson>        # counts and hashes only

# cosign-chain-only lane (vote-quorum off): builds and tests without the vote_quorum module
cargo +1.81.0 clippy --locked --all-targets --no-default-features -- -D warnings
cargo +1.81.0 test --locked --no-default-features        # 6 (cosign_chain)
cargo +1.81.0 build --locked --no-default-features
```
