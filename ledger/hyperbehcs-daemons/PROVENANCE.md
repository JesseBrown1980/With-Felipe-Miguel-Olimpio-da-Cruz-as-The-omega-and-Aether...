# ledger/hyperbehcs-daemons provenance

## Origin

These are the owner's daemons from the ACER seat (FABLE-5 room), `C:\HyperBEHCS\bin\`. The owner delivered both
files to this session on 2026-10-17 as uploads (`201de94d-asolaria-vote-quorum-daemon.py` and
`3a996ffd-asolaria-cosign-chain-daemon.py`, 21:20:47 UTC). They were staged unchanged at
`scratchpad/hyperbehcs-daemons/`. `cmp` shows the staged copies, the uploads and the vendored or held copies are
equal.

Two later uploads from the owner on the same day hold the same bytes:

| Upload (UTC) | Rows | Bytes, sha256 |
|---|---|---|
| `ba8796a2-HYPERBEHCS-CODE-INVENTORY.hbp` (22:00:38) | row 8 `HBEHCS-CODE\|path=C:\HyperBEHCS\bin\asolaria-cosign-chain-daemon.py`; row 20 the same for `asolaria-vote-quorum-daemon.py` | 5,997 `a2c863db…` and 11,786 `9fd9de52…`, as listed in those rows |
| `382a059b-hyperbehcs-code-2026-10-17.zip` (22:14:02) | archive members `asolaria-cosign-chain-daemon.py` and `asolaria-vote-quorum-daemon.py` (both dated 2026-07-10 15:02 in the archive) | 5,997 `a2c863db…` and 11,786 `9fd9de52…`; git blob ids `c1753dcc…` and `bcb542ed…` |

Both sha256 values equal the ones in the table under "Vendored" below.

The live processes are recorded in `model/live-parity/LIVE-DAEMONS-RECEIPT.hbp`
(sha256 `6cca3495f0faa34b9065702415861826a5aacd40cfa63bb916950900ccc81c32`), quoted as written:

```
13 NOT_LISTENING|port=4952_now|note=7160_was_vote-quorum|json=0
14 PORT|port=4952|pid=7160|exe=python.exe|cmdline=python C:\HyperBEHCS\bin\asolaria-vote-quorum-daemon.py|role=vote-quorum|src=C:\HyperBEHCS\bin\asolaria-vote-quorum-daemon.py|json=0
15 PORT|port=4953|pid=1824|exe=python.exe|cmdline=python C:\HyperBEHCS\bin\asolaria-cosign-chain-daemon.py|role=cosign-chain|src=C:\HyperBEHCS\bin\asolaria-cosign-chain-daemon.py|json=0
32 SOURCE_COPY_BLOCKED|classifier=Data_Exfiltration|attempted=bulk_copy_from_daemon_src_dirs|blocked_dirs=4949/4950/4947/4953|individual_file_reads_possible_via_Read_tool|json=0
```

**Not in any repository on disk.** Neither blob id below exists, and neither file name appears in any commit, in:

- the private mirror `scratchpad/asolaria-mirror.git` (all refs)
- asolaria-federation-1024 @ `dc1da1a9` (all refs)
- asolaria-behcs-256 (all refs)
- asolaria-aether history

Measured with `git cat-file -e <blob>` and `git log --all -- '*asolaria-*-daemon.py'`.

Federation-1024 cites the cosign daemon at these places:

- `servers/cosign-ledger/src/py_parity/mod.rs:1-5,16`
- `servers/cosign-serve/tests/parity_differential.rs:4-7`
- `servers/host8-serve/src/fable5_descriptors.rs:20-21`

`ledger/cosign-council/README.md` ("Not brought in") lists both daemons as not on disk before this delivery.

## Vendored

| Copy | Where | Bytes | Lines (`wc -l`) | git blob id | sha256 |
|---|---|---|---|---|---|
| `vendor/acer-hyperbehcs-bin/asolaria-cosign-chain-daemon.py` | vendored | 5,997 | 137 | `c1753dcca67cca6c3cb0352c200206a30835d689` | `a2c863db85a747f3b5272d72b2dc6215f7dda3470a6290621de1bc70def22ea2` |
| `vendor/acer-hyperbehcs-bin/asolaria-vote-quorum-daemon.py` | vendored (owner decision, 2026-10-18) | 11,786 | 263 | `bcb542ed0d87a02651b70292fb4596349bead70f` | `9fd9de52e84caf667ccdcee1c37193a4e9197a86f7c951fc04677a65de6db9ae` |
| `src/vote_quorum.rs` (the Rust port of vote-quorum lines 46-163, 237-238, 247) | vendored (owner decision, 2026-10-18) | 9,900 | — | `68c051a8f95a72d9eceafef8f6c4d14bcff3f498` | `99ed6c2528f3b2544edf028390a0cbd79f61a590cfab30462ecf10b9da94c25d` |

Each daemon file is UTF-8 with LF line ends, and its last byte is `\n`. `wc -l` counts 137 and 263
newline-terminated lines. The task text says 138 and 264. Every line number cited in this directory refers to the
content as delivered, and the sha256 values equal the task's.

`UPSTREAM.sha256` pins both vendored daemon files. `src/vote_quorum.rs` is this directory's own port (its bytes are
held by `fmt`/`clippy`/`test` and git, not by a vendored-upstream pin). `HELD.sha256` was removed once nothing is
held any more (owner decision below); the git blob id and sha256 above still pin the restored bytes, and
`sha256sum -c UPSTREAM.sha256` now verifies 2/2. The referee and `verify_chain.py` refuse to run when the bytes of a
present file differ.

## Line ranges executed by the referee (never imported)

The module top levels create directories under `C:/` (cosign lines 22-24, vote-quorum lines 35-40), so the
modules are not imported. The referee compiles these ranges from the delivered bytes, padded so that tracebacks
keep the upstream line numbers. The vote-quorum ranges run on every run, now that the daemon is vendored (owner
decision below).

| File | Ranges | sha16 of each range's text |
|---|---|---|
| vote-quorum | 30-33, 42-61, 63-64, 66-163, 165-254 | `ed6802e9388e67d4`, `a904686ab52d4069`, `fec75d5030b8bfe5`, `12855fb7087e6160`, `28c48ba3b456427f` |
| cosign-chain | 17-20, 25-32, 34-74 | `fe14b6a3748070dd`, `f2dbbf0151758c79`, `8de20aa0fc31061d` |

The referee supplies these in the namespace:

- temp paths in place of lines 22 and 35-40
- a fixed clock bound to the name `datetime`, which `now_iso` (cosign 31, vote-quorum 63) reads at call time
- in `mode_eval`, `votes_for` returning the given rows
- `Handler._send` recording the reply instead of writing to a socket

`verify_chain.py` executes cosign 17-20, 25-32 and 34-53, and evaluates the right-hand side of line 70.

## Privacy scan (OWNER-RULES 5, build contract 6)

Before copying, both files were scanned with regexes for emails, phone numbers, IPv4 addresses, PEM and OpenSSH keys,
token, password, secret and api-key strings, user-directory paths and URLs. Every capitalised word was also listed.

- **cosign-chain: clean, vendored.** The only IPv4 literal is the bind `0.0.0.0` (line 131). The digit runs are
  dates and the `0000000000000000` genesis hash. The paths are operator-machine ledger locations
  (`C:/asolaria-acer/`, `C:/HyperBEHCS/`). `OP-JESSE` (line 7) is the owner's own role token.
- **vote-quorum: carries operator first names. Vendored (owner decision, 2026-10-18; see below).**
  - Line 15 (docstring) names the quintuple in plain words: the owner and four other people, first names only.
  - Line 46 `QUINTUPLE` holds the five `OP-<FIRSTNAME>` role tokens.
  - There are no other personal data. The bind is `0.0.0.0` (lines 258-259). `099721086217` (line 109) is part of
    a vote id hash.
  - The same five `OP-` tokens are in the owner's public repository federation-1024 @ `dc1da1a9`,
    `servers/vote-quorum/src/lib.rs:17` (`gh api repos/JesseBrown1980/asolaria-federation-1024` gives
    `visibility: public`; the token sets are equal). The plain-word list of line 15 is not in that repository.
    `loop/vendor-pid-mod/src/pid-mod.rs`, committed in asolaria-aether, carries the same kind of tokens and flags
    them.
- **The owner's live chain** `scratchpad/cosign-check/COSIGN_CHAIN.ndjson` was read in place by `verify_chain.py`.
  Only counts are reported (README). Nothing from it is copied or quoted.

## Owner decision, 2026-10-18 (what is now vendored)

Before this decision, the vote-quorum daemon (`asolaria-vote-quorum-daemon.py`, line 15 and line 46) and its port
`src/vote_quorum.rs` (`QUINTUPLE`) were held outside the repository for the owner's privacy clearance, because they
carry operator first names of people other than the owner. `ledger/cosign-council` held the same tokens the same way
(its `PROVENANCE.md` section 7), so the owner made one decision for both directories.

Owner decision, 2026-10-18: "Publish as-is" (the operator first names on vote-quorum daemon line 15 and the
`OP-<NAME>` role tokens; one answer covers `ledger/hyperbehcs-daemons`, `ledger/cosign-council` and
`loop/vendor-pid-mod`). The operator-name authorization it rests on is recorded verbatim in OWNER-RULES 5 (owner,
2026-10-18): "Rayssa chiqueto. Jesse Daniel Brown, amy slanikov, Dan Edens, felipe Smith. All authorize for 1 year."
As applied, the five operators' first names and `OP-<NAME>` role tokens may be published as they already appear in
the owner's files, valid until 2027-10-18; no surname the files do not already carry is added, and no other private
data is covered.

What is now vendored (both as delivered, byte-identical):

- `vendor/acer-hyperbehcs-bin/asolaria-vote-quorum-daemon.py` (added back to `UPSTREAM.sha256`;
  `sha256sum -c UPSTREAM.sha256` = 2/2 OK).
- `src/vote_quorum.rs`, this directory's own port (git blob `68c051a8…`, sha256 `99ed6c25…`).

The `vote-quorum` Cargo feature is kept and is now `default = ["vote-quorum"]` in `Cargo.toml`, so the library,
`src/bin/hyperbehcs-daemons-vectors.rs` and `tests/vote_quorum.rs` compile the vote-quorum lane by default. The
feature gate is kept so the cosign-chain-only lane still builds with `--no-default-features`; in that lane the
referee prints `HELD|file=asolaria-vote-quorum-daemon.py|…` only when the vendored daemon is also absent, which it no
longer is. `HELD.sha256` was removed (nothing is held any more); the sidecar copy left in
`scratchpad/HELD-FOR-OWNER/ledger-hyperbehcs-daemons` is untouched.

Measured after restoring (rust 1.81.0, python 3.13.16):

- `sha256sum -c HELD.sha256` (the copy): 2/2 OK; git blob ids `bcb542ed…` (daemon) and `68c051a8…` (port) match.
- `rustfmt +1.81.0 --edition 2021 --check src/vote_quorum.rs`: clean.
- `--no-default-features`: `fmt --check` clean, clippy clean, `test` 6 passed (cosign_chain), build clean.
- default (vote-quorum on): clippy clean, `test` 13 passed (6 cosign_chain + 7 vote_quorum), build clean.
- `referee.py --check`: PASS on both receipts; `REFEREE.hbp` sha256 `21be7902…`, `VOTE-QUORUM.hbp` sha256
  `9e854186…` (the exhaustive mode compares 50,015,001 (yes, no) pairs).

`ledger/cosign-council` restored its two held files under the same decision (its `PROVENANCE.md` section 7).
