# ledger/cosign-council

This directory brings in the cosign ledger and the council ledgers of asolaria-federation-1024 @ `dc1da1a9`
as in-process Rust 1.81 libraries. The upstream sources are byte-identical; `PROVENANCE.md` has every blob id
and sha256. Neither HTTP listener (`:5091` cosign-serve, `:5090` council-serve) is compiled here. They are the
process boundary.

**Lane: cold** (OWNER-RULES 3). Upstream's ledger rows are NDJSON. Its hash chain is computed over
JSON text, and the cosign routes answer in JSON. Those formats are kept as they are, because the row hashes are
defined over those bytes. No HBP variant of a hashed row is made. The council routes answer in HBP text rows
(`json=0`), but they read NDJSON ledgers.

| Package (upstream name) | What it is | Upstream sources compiled |
|---|---|---|
| `cosign-ledger` (`asolaria-server-cosign-ledger`) | `CosignChain` (v0.1 stub), module `append` counter, `py_parity`: JSON row tokenizer, canonical bytes, `sha16`, `compute_append`, `fold_seq_max` | all of `src/` |
| `cosign-serve` (`asolaria-server-cosign-serve`) | `CosignServe::open / from_env / handle`: shadow-ledger open and resume, routes `/health`, `/api/cosign/{head,verify,tail,append}`, shadow append | `routes.rs`, `store.rs`, `resume.rs` whole; `main.rs` and `http.rs` by line range |
| `vote-quorum` (`asolaria-server-vote-quorum`) | the council vote-ledger sha-chain canon (`canonical_base`, `recompute`, `stored_row_hash`), the `QUORUM_RULES` / `is_authorized` / `evaluate` table, and the read-only parity-harness bin | `src/canon.rs`, `src/lib.rs`, `src/bin/vote-quorum-parity.rs` (owner decision, 2026-10-18) |
| `council-serve` (`asolaria-server-council-serve`) | `route` and `Shared`: vote-ledger parity, `/api/loop/schedule` (confidence-scheduled verify), lane, policy, branch, mcp, event, recovery and ptc routes; `producer::{schedule_rows, proposal}` | `routes.rs` and 7 modules whole; `main.rs:30-32`; `schedule.rs` from `proposals/verify-schedule` (same blob, not copied) |
| `vectors` | prints HBP rows for the referee | none (glue) |

## Using it in process

```rust
use asolaria_server_cosign_serve::CosignServe;
let serve = CosignServe::open(live_ndjson, shadow_ndjson, /* append_enabled */ true)?;
let (status, body) = serve.handle("POST", "/api/cosign/append", "", payload_json_bytes);

use asolaria_server_council_serve::{producer, route, Shared};
let (status, rows) = producer::schedule_rows(loop_ledger_ndjson, 8, 500); // routes.rs:169
let (status, rows) = route(&Arc::new(Shared { vote_dir }), "GET", "/api/vote-quorum/parity", "");
```

One `CosignServe` (shared, for example through `Arc`) owns a given shadow path per host. Upstream had one
writer per process behind one bind (cosign-serve `main.rs:46-56`; default bind `127.0.0.1:5091`, `main.rs:16`), and the Python
daemon it shadows was written to "stop seq collisions" (daemon docstring, lines 1-5). Each `open` makes its own
`Mutex<Writer>`. Measured with two instances on one empty shadow, 4 threads × 150 `POST /api/cosign/append`:
600 rows in each run, with 24, 39 and 23 rows sharing a `seq` (max `seq` 576, 561, 577). With one shared
instance (two runs): 600 rows, no shared `seq`, max `seq` 600.

The workspace carries no `[profile]` section, so a panic in upstream code unwinds into the caller of `handle`
(`PROVENANCE.md` section 5).

`producer::proposal` is upstream's `parse_proposal` (`routes.rs:207-217`). It is the producer of
`Proposal { score_q, genius_q, risk_q }`, which `confidence_schedule` ranks: `score` is read as per-mille
without float, `genius` falls back to `score`, and `risk` falls back to 0.

## Upstream vectors reproduced

- `cosign-serve/fixtures/daemon-row-hash.ndjson`: 2 rows, stored `row_hash` `101b6e1b41a4038f` and
  `ff433399335fe8ad`. The vendored `parity_replay` test reproduces both. Appending the two fixture payloads
  in process (`POST /api/cosign/append`, `ts` in the payload) reproduces both rows' `seq`, `antecedents` and
  `row_hash`. Then `/api/cosign/verify?source=shadow` answers `checked 2, matched 2`. The shadow rows are
  written by `persisted_line` (`canon.rs:30-37`): insertion order, `", "` and `": "` separators, `row_hash` last.
  The fixture rows are compact and in a different field order. The hash is over `canonical_bytes`, so both
  layouts carry the same `row_hash`.
- The vote-quorum canon gives the same two hashes on the cosign fixture. That agrees with `canon.rs:5-6`:
  "the vote-quorum `append_row` uses the identical recipe".
- Upstream unit tests, all passing: council-serve 125 of 125, cosign-ledger 4 of 4, vote-quorum canon 3 of 3,
  and `parity_replay` 1. Two tests are `#[ignore]` upstream and stay ignored in `test --workspace`. Each was run
  once by hand:
  - `refuses_to_run_without_path_patched_daemon` (`parity_differential.rs`), with
    `ASOLARIA_COSIGN_PATCHED_DAEMON` set to a temp copy of the cosign daemon and the two diff ledgers set to temp
    paths: passes. The test checks only that the daemon copy exists and that neither temp ledger is the live
    path (`parity_differential.rs:6-19`).
  - `full_live_replay_matches_all_daemon_rows` (`parity_replay.rs`), on the live chain: see "Live chain".

## Measured (referee, cold lane, `referee/REFEREE.hbp`)

`referee/referee.py` (Python stdlib) mirrors the vendored Rust line by line. It runs `vectors` over seeded
inputs and requires byte-equal output in every mode:

- 2400 cosign payload lines (2383 parse, 17 refused) through `compute_append`
- 2465 replay rows, then the verify, head, health and append routes and 19 tail queries
  (`n` as `str::parse::<usize>` reads it, `routes.rs:156-159`: `+3`, `+0`, empty, `+`, `-1`, `2^64-1`, `2^64`,
  and others)
- 900 loop-ledger lines under 5 budget and threshold pairs
- 6 vote-ledger directories, 874 rows. One has `votes.ndjson` with a byte that is not UTF-8 and one has it as a
  directory; `/api/vote-quorum/parity` answers 500 with `kind=invalid data` and `kind=is a directory`
  (`routes.rs:77, 100-107`). Some rows carry `\r` and `\t` between tokens (vote `canon.rs:53`).

Result: equal in every mode, and equal with the same inputs under 8 other seeds (1, 7, 13, 2027, 31337, 99991,
424242, 123456789). Ten deliberate mutations of the mirror are each caught: the canon separator, U+007F escaped,
half-up rounding made half-even, the schedule id tie-break removed, `\r` removed from the vote canon's
whitespace, `+` refused in the tail `n`, the `2^64-1` cap on `n` removed, the `invalid data` kind changed,
`fold_seq_max` taking a later equal `seq`, and `\r` kept before `\n` in `BufRead::lines`.

The referee uses integer arithmetic only. Its random draws are integers, and float-shaped JSON number tokens
are literal strings from a fixed list (`FLOAT_TOKENS`). Python floats exist only inside `json.loads` and
`json.dumps` in the measurement below: that is the daemon's own recipe run unchanged (cosign daemon line 88
`json.loads`, line 70 `json.dumps`).

The referee also compares the Rust row hash with Python `json.dumps(row, sort_keys=True, ensure_ascii=...)`
after `json.loads`. That is the recipe vote-quorum `canon.rs:2` quotes as
"`json.dumps({row without "row_hash"}, sort_keys=True, ensure_ascii=False)`". cosign-ledger `canon.rs:90-91`
says printable ASCII up to U+007F is emitted verbatim, "matching python json.dumps(ensure_ascii=False)".
The cosign daemon's own recipe is `ensure_ascii=False` (`asolaria-cosign-chain-daemon.py` line 70).
Every row whose hashes differ is attributed to a token class. The unattributed count is 0 everywhere.

| Ledger canon | Rows written by | Rows | = dumps(ensure_ascii=True) | = dumps(ensure_ascii=False) | What differs |
|---|---|---|---|---|---|
| cosign `py_parity` | `json.dumps` default | 788 | 667 | 131 | vs True: keys containing U+007F (121 rows). `py_escape_string` writes U+007F raw; Python escapes it as `\u007f`. |
| cosign `py_parity` | `json.dumps` compact | 785 | 662 | 134 | vs True: keys containing U+007F (123 rows) |
| cosign `py_parity` | `json.dumps(ensure_ascii=False)` | 791 | 247 | 313 | vs False: key tokens (478 rows). Keys are decoded and rewritten with `\uXXXX` for U+0080..U+FFFF (`canon.rs:77-105`); string values stay as written. |
| vote `canon` | `json.dumps(ensure_ascii=False)` | 291 | 129 | 291 | none vs False |
| vote `canon` | `json.dumps` default, compact, `sort_keys` | 276, 317, 316 | 185, 227, 218 | 114, 150, 146 | vs True: key order only (91, 90, 98 rows). `canon.rs:175` sorts keys by their bytes as written; for keys written as `\uXXXX`, that order is not the order of the decoded keys. |

On the upstream fixture, row 1 equals both settings. Row 2 (`"value":"ol\u00e1"`) equals `ensure_ascii=True`;
`ensure_ascii=False` gives `8037232646d39d34`, against the stored `ff433399335fe8ad`. `ledger/hyperbehcs-daemons`
reports the same `8037232646d39d34` from the daemon's lines 55-74 run on row 2's payload.

## Live chain (cold lane, `referee/LIVE-CHAIN.hbp`)

The owner delivered the live `COSIGN_CHAIN.ndjson` on 2026-10-17 (sha256
`39aaa803ad47d794ec3e3f989fcb8b0ca24aef254451941d50419dfbf2791939`, 1,697,115 bytes, 5,439 lines). It was read in
place, read-only, by `referee.py --live-ledger <path> --check`. That mode prints and pins counts and the
sha256 only; no row is copied, printed or quoted. Measured:

- In-process `/api/cosign/verify`: `checked` 3399, `matched` 3336, `mismatches` 63, `legacy` 2036.
- In-process `/api/cosign/head`: `seq` 3587.
- Per row: 3399 rows carry `row_hash` for the `py_parity` canon, which recomputes 3336 of them. The vote-quorum
  canon (`canon::stored_row_hash`, `canon::recompute`) also finds 3399 and recomputes 3336.
- The mirror equals the Rust output on every line of this replay, including the 19 tail queries.
- Upstream's ignored test `full_live_replay_matches_all_daemon_rows`, run with `ASOLARIA_COSIGN_NDJSON` set to this
  file, passes its precondition and stops at `parity_replay.rs:64`, `assert_eq!(stats.checked, stats.matched)`:
  `ReplayStats { rows: 5435, checked: 3399, matched: 3336, mismatches: 63, legacy: 2036 }`.

For comparison, as written upstream and by the owner: vote-quorum `canon.rs:5-6` states "Proven 3321/3321 vs the
cosign ledger", and OWNER-RULES 7e states "3,336 matched / 63 mismatched on the live chain". The federation boot
manifest records `vote-quorum ... state=BUILT/LIVE parity 187/187`
(`docs/session-2026-07-03-fable5/ASOLARIA-OS-METAL-BOOT-AUTOSTART-MANIFEST-2026-07-03.hbp`, row 10); the vote
ledgers that count was taken over are not on disk, so it cannot be re-measured here.

The private mirror's `COSIGN_CHAIN.ndjson` (@ `6022b69`, 37 rows, 2026-04-18) predates the daemon. On that copy,
the same ignored test stops at its precondition, "ledger must include daemon row_hash rows"
(`parity_replay.rs:60-63`), because no row carries `row_hash`.

## Not brought in (with where it is)

- **The Python cosign daemon** (ACER handoff H1), `C:\HyperBEHCS\bin\asolaria-cosign-chain-daemon.py`. The owner
  delivered it on 2026-10-17 (upload `3a996ffd-asolaria-cosign-chain-daemon.py`; 5,997 bytes, 137 lines, sha256
  `a2c863db85a747f3b5272d72b2dc6215f7dda3470a6290621de1bc70def22ea2`, blob `c1753dcca67cca6c3cb0352c200206a30835d689`).
  `ledger/hyperbehcs-daemons` vendors it byte-identical at
  `vendor/acer-hyperbehcs-bin/asolaria-cosign-chain-daemon.py`, so it is not copied here (each file once in aether).
  Its append recipe is `append_row` (lines 55-74); the row hash is lines 70-73: `json.dumps({row without
  "row_hash"}, sort_keys=True, ensure_ascii=False)`, `sha16` of it, and the row written with
  `json.dumps(row, ensure_ascii=False)`. Its constant `ANCHOR` (line 26) equals `APPENDED_BY_DAEMON`
  (`cosign-ledger/src/py_parity/mod.rs:16`). Upstream cites it at `py_parity/mod.rs:1-5`, cosign-serve
  `Cargo.toml:8`, `tests/parity_differential.rs:4-7`, `main.rs:17` (its ledger `C:/asolaria-acer/COSIGN_CHAIN.ndjson`),
  `host8-serve/src/fable5_descriptors.rs:21` and council-serve `main.rs:5`.
- **The Python vote-quorum daemon (`:4952`)**, `C:\HyperBEHCS\bin\asolaria-vote-quorum-daemon.py`, whose
  `QUORUM_RULES`, `evaluate_quorum` and `append_row` the Rust port mirrors (vote-quorum `lib.rs:1-5`,
  `canon.rs:1-6`; `fable5_descriptors.rs:20`). The owner delivered it on 2026-10-17 (upload
  `201de94d-asolaria-vote-quorum-daemon.py`; 11,786 bytes, 263 lines, sha256
  `9fd9de52e84caf667ccdcee1c37193a4e9197a86f7c951fc04677a65de6db9ae`, blob `bcb542ed0d87a02651b70292fb4596349bead70f`).
  `QUORUM_RULES` is line 51, `append_row` lines 79-87 (`json.dumps(row_dict, sort_keys=True, ensure_ascii=False)`
  at line 83), `is_authorized` line 118 and `evaluate_quorum` line 125. It carries the same operator role tokens as
  the vote-quorum `lib.rs` (lines 15 and 46); on the owner decision of 2026-10-18 `ledger/hyperbehcs-daemons`
  vendored it byte-identical (its `UPSTREAM.sha256`), and it is not copied here (each file once in aether).
- **`sign-gate.js`**. It is cited at federation-1024 `kernel/core/src/sign_gate/mod.rs:3`:
  "Source: `C:/asolaria-behcs-256/src/hookwall/sign-gate.js`", with sha16 `a7c06eca27be3339` and 11693 B (`:4`).
  It is absent from asolaria-behcs-256 @ `818cc23`: no such path and no history. It is also absent from the
  private mirror, from every file on this machine (`find` over `/`, the owner's uploads and the members of the
  three uploaded archives), and from the history of all 717 git directories under `/home/user` and the
  scratchpad (`git log --all -- '*sign-gate*'`).
- **vote-quorum `src/lib.rs` and `src/bin/vote-quorum-parity.rs`** were held for an owner privacy clearance; on the
  owner decision of 2026-10-18 (`PROVENANCE.md` section 7) they are now vendored byte-identical, so the
  `QUORUM_RULES` / `is_authorized` / `evaluate` table and the read-only parity bin are compiled here, alongside the
  canon.
- **The other operator ledgers**: `C:/HyperBEHCS/data/vote-quorum/{queue,votes,outcomes}.ndjson`, and the loop
  ledger named by `ASOLARIA_LOOP_LEDGER` (`routes.rs:117-121`). They are not on disk, and upstream ships no copy
  of them. The live `COSIGN_CHAIN.ndjson` is on disk and measured in place ("Live chain"); it is not copied here.
- **The listeners and the engine-drive thread**, by design (`PROVENANCE.md` section 4).

## Commands

```
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 fmt --all -- --check
cargo +1.81.0 clippy --locked --workspace --all-targets -- -D warnings
cargo +1.81.0 test --locked --workspace
cargo +1.81.0 build --locked -p asolaria-cosign-council-vectors
python3 -I referee/referee.py --vectors target/debug/cosign-council-vectors --check
# with the owner's live chain on disk (read in place; counts and sha256 only):
python3 -I referee/referee.py --vectors target/debug/cosign-council-vectors --live-ledger <COSIGN_CHAIN.ndjson> --check
ASOLARIA_COSIGN_NDJSON=<COSIGN_CHAIN.ndjson> cargo +1.81.0 test --locked -p asolaria-server-cosign-serve \
    --test parity_replay -- --ignored    # stops at parity_replay.rs:64 (see "Live chain")
```
