# gate/fischer-upstream provenance

The owner's upstream Fischer evaluator, brought in as the primary piped path
(OWNER-RULES 7c: "the owner's upstream Fischer ... is the PRIMARY piped path").

Upstream: `github.com/JesseBrown1980/asolaria-federation-1024` @
`dc1da1a9cd88b77eb463053312b7c42a7dbe9b33` (on-disk mirror read at
`/home/user/asolaria-federation-1024`, `git rev-parse HEAD` == `dc1da1a9`).

## Vendored byte-identical (git blob id == upstream blob id)

| upstream path | git blob id | sha256 |
|---|---|---|
| servers/fischer-eval/Cargo.toml   | e10223738df5c29f60ceff08c5465ce11eab3dae | 555f2d22097073d6c5d894d6e57d4fb6c1bf6bf2ab8c151de9070ee8c1160e8d |
| servers/fischer-eval/src/lib.rs   | d8774234245bd41e4fb5d4f50ca557141e8294c4 | ee0a89ee9e32a764aa23ece56f302fd2526603496f6308e0262c5ad0da798bdb |
| servers/fischer-eval/src/main.rs  | e79c1960517823f4321b1dbb586ca927bca9d4dc | 831621aaece59580cae736c34ff0b6ab7b689b2fd989ce7cebbd7e76aa5b24ee |

The three blob ids and sha256s equal the host8 slice's pins for the same files
(`host8/PROVENANCE.md`, `host8/UPSTREAM.sha256`). sha256 pins live in `UPSTREAM.sha256`.

## Clean-file scan (privacy, OWNER-RULES 5 / build-contract 6)

All three files were scanned before copy for emails, phone numbers, PEM/OPENSSH keys,
RFC1918 hosts, and personal names. No third-party personal data was found. The only IPv4
literal is the loopback default bind `127.0.0.1:5089` (`src/main.rs:13`). Because the files
are clean, the full-file byte-identical path is used; the bounded `include!` line-range
extraction used by `kernel/behcs1024-60d` (for files that carry third-party data) is not
needed here. The owner's own byline appears only in the Node source `fischer-kernel.mjs:11`
and `asolaria-hookwall.mjs:14`, which are read to build the referee and are not vendored.

## How the vendored bytes are built

`Cargo.toml` (this crate) compiles the byte-identical `vendor/.../src/lib.rs` and
`vendor/.../src/main.rs` directly via `[lib] path` / `[[bin]] path`. The crate's `[lib]`
name is `asolaria_server_fischer_eval` so the vendored `main.rs`
(`use asolaria_server_fischer_eval::...`) resolves. The vendored `Cargo.toml` is carried
beside the sources for provenance (sha256-pinned); it is not the active build manifest.
`[workspace] exclude = ["vendor"]` keeps that vendored manifest out of workspace membership.

## spawn_cognition.rs (task instruction: reference, do not duplicate)

`servers/host8-serve/src/spawn_cognition.rs` (blob `37f4a6aac1933a42ee9d3a32c3fabca6cb6fcb64`,
sha256 `6ed13b68771164a4d2833f3b5d006856aacdb446a39c0df2ff8fe34b1e24c3fb`) is already vendored
byte-identical by the host8 slice at
`host8/vendor/federation-1024/servers/host8-serve/src/spawn_cognition.rs`. The fischer-eval
crate (lib.rs + main.rs) has zero dependencies and does not reference spawn_cognition.rs, so
it is **not** duplicated here; the host8 copy is the single reference for anyone who needs it.

## Measured relationship to the Node original and to the AE variant

Measured with `referee/` (`python3 -I referee/ci_check.py`, 2084 cases: the first 2018 generated
lines (18 targeted, 2000 seeded) plus the 68 lines of `gen_cases.tail()`, of which 2 are skipped by
the case-file rule, and the AE binary built from `gate/fischer-eval`). Integer counts only.

### The referee and its layers

`referee/fischer_referee.py` has two layers. The mapping layer is FED's: it mirrors
`main.rs:189-313` (host8 field line -> envelope/score) byte for byte, including the `u16` parse,
ASCII-hex percent escapes over the UTF-8 bytes, and Rust `trim`. The kernel layer is the Node
`fischer-kernel.mjs` + `hilbert.mjs` (bigpickle-rebuild @c592599) with JS semantics. The referee
was checked against the unchanged Node `fischerEval` (cold lane, scratch run, clock fixed): its
Node rows and results equal Node's byte for byte on 11,177 cases (these 2084, three fresh seeds of
3000, 93 targeted lines). In CI it checks itself against four rows from the unchanged Node
(`--pins`; the same rows are pinned in `tests/upstream_rows.rs`).

### pid: the FED host8 mapping substitutes a pid; Node does not

`main.rs:193-195` sets `envelope.pid` to the pid field, else the bh field, else
`BH.FISCHER.HOST8.DEFAULT`. This substitution is FED behaviour with no Node counterpart. The Node
callers pass the envelope through unchanged (`asolaria-hookwall.mjs:67,74` stamps only the pid
argument; `fischer-live.mjs:35-42,77-81`; `fischer-scorer.mjs:59-61`), no bh field is read in any of
those files or in `fischer-kernel.mjs` (grep), and `fischer-kernel.mjs:146` returns `missing_pid`
(BLOCK, cpl 500, `:339-350`) whenever `envelope.pid` is empty. OWNER-RULES 7c records the
upstream behaviour as "absent pid falls back to bh"; measured, that fallback is in FED `main.rs`.

Node decision (verdict, cpl, flags) with `envelope.pid` taken only from a non-empty pid field,
against the two host8 binaries (`measure_ae.py`, data for 7c):

| cases | n | decision equal: upstream / AE | verdict equal: upstream / AE |
|---|---|---|---|
| all 2084 | 2084 | 1005 / 1601 | 1058 / 1706 |
| pid absent | 391 | 49 / 391 | 58 / 391 |
| pid= empty | 403 | 55 / 403 | 65 / 403 |
| bh only | 406 | 50 / 50 | 69 / 69 |
| pid present | 884 | 851 / 757 | 866 / 843 |
| first 2018 lines | 2018 | 973 / 1568 | 1011 / 1658 |

At the `evaluate` function boundary (no host8 mapping), an absent `envelope.pid` gives FED
`BLOCK missing_pid cpl=500` with `pid=UNKNOWN` (`lib.rs:153-158,188-203`), the same decision as
Node; the Node row carries the caller's pid argument instead (pinned with argument `UNKNOWN`).

### Vendored Rust against Node, same FED-mapped inputs

`prove_upstream.py` converts every Rust row to the Node form through three format points and
recomputes `row_hash`; the result equals the referee's FED-port row as an ordered byte string on
2084/2084 cases, every Rust `row_hash` is sha8 of its prefix (2084/2084), and every Rust result
field equals the referee's (2084/2084). The three format points:

- voxel `BH3D:x-y-z` (`lib.rs:662-668`) vs the 3D Hilbert index `BH3D:<index>`
  (`fischer-kernel.mjs:22-33`, `hilbert.mjs`): 2084 cases;
- axis row fields `king_safety_q/center_gain_q/proof_gain_q` (`lib.rs:432-434`) vs
  `king_safety/center_gain/proof_gain` (`fischer-kernel.mjs:262-264`): every row;
- the proof-path flag `proof_gain_q` (`lib.rs:344`) vs `proof_gain` (`fischer-kernel.mjs:186`):
  716 cases.

Four further points where the Node and the FED port give different rows (cases per point; a
case can carry more than one):

| point | FED port | Node | cases | decision differs |
|---|---|---|---|---|
| g4_state names an Object.prototype member (12 names) | modifier 0 (`lib.rs:726-733`) | `GLSM_CPL_MOD[g4_state]` reaches the inherited member, `rawCpl + glsmMod` is a string, cpl=NaN, verdict PROCEED (`mjs:69-75,368-369,373-382`) | 25 | 25 |
| Shannon text above 0.92 and below the binary64 midpoint 0.920000000000000095479180117763462476432323455810546875 | exact text (`lib.rs:496-498,510-543`) | binary64 `> 0.92` (`mjs:203-204`) | 5 | 5 |
| payload length near 65536 with bytes >= 0x80 | UTF-8 bytes (`lib.rs:359`; `main.rs:296-300` makes each input byte one char) | UTF-16 units (`mjs:157-159,199`) | 4 | 4 |
| `\|` CR LF TAB in pid, move, g4_state, composite, prev_hash, ts | written as `_` (`lib.rs:426-443,551-553`) | written raw (`mjs:256-272`) | 9 | 0 |

Node and the vendored Rust agree on the decision in 2050/2084 cases (verdict 2065/2084) and on the
row bytes after the three format conversions in 2041/2084; on the first 2018 lines, which carry
none of the four points, all three counts are 2018/2018. Example: `pid=R.X|verb=tick|target=fabric|
l0_real=1|hbp_path=x|g4_state=constructor|recursive_consent=1` gives FED `HOLD cpl=400` and Node
`PROCEED cpl=NaN`.

### AE variant against this upstream

The AE variant (`gate/fischer-eval`, Claude's secondary) differs from this upstream in two places
(WIRING-MAP R6): the hard floor applied after the G4 modifier (`lib.rs:238-239`), and no default
pid with the bh fallback kept (`main.rs:193` drops only `.or(env.pid)`). Over 2084 cases the row
differs on 932 (1152 identical; verdict 710, cpl 827): `floor_after_modifier` 138,
`no_default_pid` 794 (neither a non-empty pid nor a non-empty bh field), other 0. On the first 2018
lines: 931 (1087 identical; verdict 709, cpl 826), 138 / 793 / 0. In the floor class the AE cpl is
the largest triggered floor and the upstream cpl is below it in 138/138; the largest floor reached
is 400 (`lib.rs:318,329`), so the verdict changes only across 150: PROCEED->HOLD 38,
PROCEED->ANALYZE 1, unchanged 99.
