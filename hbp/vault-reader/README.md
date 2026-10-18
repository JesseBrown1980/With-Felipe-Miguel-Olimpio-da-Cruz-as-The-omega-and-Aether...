# hbp/vault-reader — read-only HBI/HBP vault reader

`vault-read <root>` walks a directory tree, pairs every `X.hbi` with its sidecars, resolves the
pointer rows that the owner's public `.hbi` files and public writers carry, recomputes what each
row declares, and prints one HBP row per object plus integer totals. Rust 1.81, integer
arithmetic only, no JSON, no float. Files are opened read-only; nothing is written inside
`<root>` (`tests/fixtures.rs` checks it). Each row is written as soon as it is produced and
only integer counts are kept for the totals (on a read error the run stops with exit status 1
after the rows already written).

```
VAULTOBJ|path=<object>|kind=<kind>|bytes=<n>|sha256=<measured>|pointer=<where declared>|verified=<+1|0|-1>|reason=<tokens>|json=0
VAULTKIND|kind=<kind>|objects=|verified=|failed=|unresolved=|json=0
VAULTREASON|reason=<trit>:<token>|count=|json=0
VAULTTOTAL|hbi=|files=|objects=|verified=|failed=|unresolved=|json=0
```

`verified` is a balanced trit: `+1` every declared check recomputed equal; `-1` a declared check
differs on bytes that are present; `0` unresolved — the target is absent, outside the root,
shorter than declared (a byte range, or an index's extent, that runs past the end of its target
reads `0` with `bytes_short`/`bytes_absent` even when every check on the present bytes is
equal), or zero-filled (a differing digest over absent or all-zero bytes is reported as `0`
with the measured sha256, never as content), or the row declares nothing to check. Zero-filled
means every byte of the target or range is `0x00`: a target that is only partly zero-filled is
read as content, so a differing digest over it gives `-1` (`tests/cases` `partly-zero`; which
partial zero regions should read `0` is not decided here, see "Not decided"). Rows are rendered
by the vendored `encode_row` and parsed by the vendored `parse_row`.

In the code the trit is the owner's `Zero` (`Pos` = `+1`, `Nil` = `0`, `Neg` = `-1`) from
`kernel/tribit` (asolaria-tribit@1292191), re-exported by `ternary` (crate `asolaria-ternary`,
path dependency `../../ternary`) and by this crate as `vault_reader::Zero`. `render_trit` writes
`Zero::direction()` as `+1`, `0` or `-1`. Owner rule relayed from the ACER seat: "reuse
tribit/mod.rs, never reinvent" (`PROVENANCE.md`, "Trits as the owner's `Zero`").

## What is checked, and where each rule comes from

| object (`kind`) | rule | upstream |
|---|---|---|
| `hbi`, `hbp` (the pair `X.hbi`/`X.hbp`) | sidecar `X.<ext>.sha256`: exact `"<sha>  <name>\n"`, else Python `strip().split()` (its whitespace set, `\x1c`-`\x1f` and U+00A0 included) = 2 fields with hash equal and name equal (`sidecar_named`), or name equal after leading `*` are stripped (`sidecar_named_star`, the `sha256sum` binary-mode marker); `<name>` is the file's own name, so a name that is not UTF-8 equals no sidecar text | FOLLOW `tests/verify_public_repo.py:526-530`, `:3938`, `:3961-3978`; omnibit `scripts/verify_receipt_privacy.py:35-44` (`items[1].lstrip("*")`) |
| `hbi`, `hbp` | footer `<TAG>FTR\|body_sha256=\|rows=`: body = rows before the footer joined by `\n` plus `\n`; rows = all rows; LF-only bytes | `verify_public_repo.py:377-401`; writer e.g. `matrix/collect_public_folder_inventory.py:1090-1093` |
| `hbi`, `hbp` | footer `<TAG>FTR\|receipt=\|rows=`: `receipt = sha256(body)[:32]` (a 64-hex receipt is the whole digest) | simulator `constellation/absorb_all.py:194-196`, `quality_sphere_16k.py:449-451`, `three_body_collider.py:181-183` |
| `trinity` | BigPickle `X.hbp` + `X.sha256` + `X.hex` + `!HBI-v0` `X.hbi`: aether `hbp::reader::verify_hbp` (`hbp/src/reader.rs` pinned in `DEPENDS.sha256`). Run on walked files only: `X.hbp` must be in the walk, and `X.sha256`/`X.hex`, which `verify_hbp` opens by name, must be walked files whenever that name exists (`sidecar_not_walked` otherwise). The `.hbi` comparison counts when `X.hbi` starts `!HBI-v0` or carries `sha256=` followed by hex or `bytes=` followed by a digit; otherwise it is recorded `trinity_hbi_not_declared` and not counted | `bigpickle-rebuild/src/hbp-reader.mjs:118-156`, emitter `hbp-emitter.mjs:65-111` |
| `file` | whole-file pointer: a path key (`file`, `path`, `artifact`, `name`, `target`, `source`, `<p>_file`, `<p>_path`) with at least one sibling `bytes`/`sha256` (bare) or `<p>_bytes`/`<p>_sha256`/`<p>_rows`; bare form also `cr=` (count of CR bytes) and `terminal_lf=` | rows `GRADIENTAUDITIDX\|hbp_file=\|hbp_bytes=\|hbp_sha256=\|hbp_rows=` (`verify_public_repo.py:1522-1533`), `ARTIFACT\|file=`, `HBP\|path=`, `ROOT\|path=\|bytes=\|sha256=\|cr=\|terminal_lf=`, `QPRISM\|hbp_path=\|hbp_sha256=` (`:1943-1946`), `RGBINDEXHDR\|target=\|target_bytes=\|target_rows=\|target_sha256=`, `FABLE5HBIHDR\|source=\|source_sha256=`; `ARTIFACT\|name=\|sha256=` (stone-to-moss `tools/seal_quantum_gravity_81.py:89-97`, `experiments/integration/seat1/upstream_bridge.py:338-348`, `experiments/seat1/recurrence/seat1_recurrence_72.py:262-268`) |
| `file` | in `X.hbi`, `HBP\|bytes=\|sha256=` and `JSON\|bytes=\|sha256=` with no path key describe `X.hbp` and `X.json` (bytes only; nothing is parsed) | stone-to-moss `experiments/seat3/verify_lightbank_memory.py:75-85`, `verify_opto_toy.py:54-65`, `verify_autonomous_universe.py:48-59`, `verify_room03_fourstate.py:110-121`, `rainbow27_v2/rainbow27_v2.py:149-179` |
| `range` | byte-offset pointer into the current anchor (the first file pointer of the most recent row that declares one and is not itself a range row): `INDEX\|byte_start=\|byte_end_exclusive=\|bytes=\|sha256=\|includes_lf=\|tag=`; `RANGE\|offset=\|length=\|sha256=\|first_row=\|last_row=`; `BODYREF\|offset=\|length=\|sha256=\|row=`; `FABLE5HBIROW\|offset=\|len=\|row_sha256=\|kind=`. Row bounds are checked when the anchor declares `range_length_includes_terminal_lf` (and `offset_basis=zero_based_utf8_bytes`) | corpus rows (no public writer: `corpus/WRITERS.hbp`) |
| `range` | `IDX\|pid=AGT-<sha16>\|off=\|len=` into the paired `X.hbp`; `pid` recomputed with `agt` | vendored `asolaria-hbi-hbp` `src/lib.rs:107-111`, `:194-210` |
| `range` | `HBIROW\|row=\|off=\|len=\|sha256=[\|hex=]` (or `offset=`) into the paired `X.hbp`; slice length, `sha256`, and `hex` = `slice.hex()` against the lowercased declared value | omnibit `scripts/verify_receipt_privacy.py:73-117`; writer of the `offset=` form `tools/movable-flashlight/hbp.py:91-135` |
| `range` | hex rows `HBI\|row=\|sha256=\|hex=`, one per row of the paired `X.hbp` (Rust `str::lines()`): `hex` = lowercase hex of row `row`, `sha256` = its digest, and the declared hex decodes to bytes whose digest is the declared `sha256` (`hex_sha256`) | writers FOLLOW `tournament/public-dependencies/gitram/pais_path3_bridge.rs:674-677` (`hbi_for`), asolaria-rotating-lighthouse `viewer/github3d.rs:444-458` |
| `index` | `FOOTER\|indexed_rows=\|indexed_bytes=\|coverage=EXACT`; `<X>INDEXFTR\|range_count=\|bodyref_count=\|covered_bytes=\|coverage_exact=`; `<X>HBIFTR\|rows=` (and the header's `rows=`) over the anchor's ranges | corpus rows |
| `index` | the `HBIROW` byte rows of one `.hbi`: `row` = position (`row_sequence`); offsets contiguous from 0 and ending at the `.hbp` length (`coverage`) | omnibit `verify_receipt_privacy.py:83-117` |
| `index` | movable-flashlight `HBIFTR\|indexed_bytes=\|complete=` with header `HBIHDR\|row_count=`: `indexed_bytes` = sum of row lengths, `complete` = that sum equals the `.hbp` length, `row_count` = number of rows = `len(data.splitlines())` | `hbp.py:97-128` (writer), `:139-163` (verifier) |
| `index` | the hex rows of one `.hbi`: numbered 1..n in order (`row_sequence`), one per `.hbp` row (`rows`) | `pais_path3_bridge.rs:674-677` |
| `chain` | `HBIROW\|kind=emitter\|seed=..\|chain=pid[n]=sha16(pid[n-1]\|name)` over the `EMIT` rows after it; `seed=sha16(EMITTER-SEED\|<x>)` evaluated as written | `asolaria-office-service/fable5-office-render/bigpickle-map-and-ramp.py:3,8-9,13-17` |
| `chain` | receipt rows `<row>\|prev_event_hash=<64>\|event_hash=<64>`: vendored `verify_chain` | vendored `src/lib.rs:217-272` |
| `center` | `.hbi` `CENTER\|..\|hbi=\|hbp=\|sha=\|sh=\|hash=` equal to the paired `.hbp` CENTER; `algorithm=SHA256_UTF8_DOMAIN_NUL_MEMBER_V1\|domain=D` recomputed `sha256(D + "\0" + MEMBER)`; `sha_equals_hash=0` | `verify_public_repo.py:1790-1799`, `:1948-1969` |

Path values resolve against the `.hbi` directory, then `<root>` (the two public conventions:
stone-to-moss `name=` and FOLLOW `hbp_file=hbp_path.name` in the `.hbi` directory,
`verify_public_repo.py:1522-1533`; `ROOT / ..._path`, `:1943-1946`), then each directory between
them, nearest first. The last step is Claude's addition, not an upstream rule: it finds paths
written from a repository root that sits below `<root>`, as when a vault holds several trees
(`tests/fixtures/tamper` and `tests/cases` `resolve-nested` depend on it); a same-named file in
the `.hbi` directory or at `<root>` binds first (`resolve-parent`). Absolute
paths, `\`, a colon in the first component (`C:`, `https:`), `~` and `..` are reported
`path_not_under_root`. The paired `X.hbp` (and `X.json`) is looked up in the walk by its own
name, whatever its directory is called. Directories named `.git` and symbolic links are not
entered. File names are keyed by their bytes: UTF-8 names as written with `\` doubled, and each
byte that is not UTF-8 as `\xHH`, so distinct names stay distinct (`nonutf8-names`). `.hbi` and
paired `.hbp` files are read whole (largest paired `.hbp` read: 14,686,931 bytes in the three
trees, 40,907,527 bytes in asolaria-stone-to-moss, whose largest `.hbi` is 101,440,927 bytes);
pointer targets of any size are streamed (1 MiB chunks) with a streaming form of the vendored
SHA-256 (`src/sha.rs`, checked against the vendored `sha256_hex` in `tests/sha.rs`); a declared
`hex=` over a range is compared while streaming. Byte-range ends and sums are computed in
`u128`, so offsets near 2^64 render and compare as the referee's unbounded integers do.
Memory therefore follows the largest single `.hbi` and its `.hbp`, not the number of objects:
on asolaria-stone-to-moss (1,088,874 objects) peak resident memory measured 495,884 to 496,060 KB
(three runs), against 1,201,528 to 1,201,628 KB for the build that kept every row until the end
(two runs; `getrusage` of the child process).

## Measured on the public corpus (every `.hbi` in the three trees)

Remote `HEAD` of all three repositories equals the pinned commit (`git ls-remote`, 2026-10-17).

| tree @ commit | `.hbi` | files | objects | +1 | -1 | 0 |
|---|---|---|---|---|---|---|
| FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS @ 8712368 | 13 | 252 | 49 | 48 | 0 | 1 |
| ASOLARIA-UNIVERSE-SIMULATOR-…-drills @ 3f9f42d | 88 | 943 | 883 | 872 | 6 | 5 |
| ASOLARIA-AS-NEURAL-NETWORK @ 4cc7624 | 7 | 641 | 14 | 14 | 0 | 0 |
| total | 108 | | 946 | 934 | 6 | 6 |

Rust output == stdlib Python referee output, byte for byte, on all three trees
(`corpus/VAULT-*.hbp`). By kind: 108 `hbi` +1; 105 `hbp` +1 and 3 absent; 635 byte ranges +1
(457 `INDEX`, 159 `FABLE5HBIROW`, 10 `RANGE`, 9 `BODYREF`); 55 whole-file pointers +1, 5 -1, 3
unresolved; 21 index aggregates +1; 8 emitter chains +1, 1 -1; 2 CENTER rows +1. Sidecars: 69
exact form, 143 named form, 1 named form with `*`. Footers: 18 `body_sha256`, 18 `receipt`.

What the -1 and 0 rows record, stated from the files and the repository history:

- `receipts/LIRIS-LAWS-37-43-BILATERAL-RECONCILIATION-2026-07-28.hbi` lines 6, 7, 8, 11, 12
  (`INDEX|n|kind|path|sha256`): the files at those paths in the tree at 3f9f42d have other
  bytes than the declared sha256. Each declared value equals the bytes of that path at commit
  2ebcc60 ("Reconcile measured Laws 37-43 across Acer and Liris", the commit that added this
  index); for `books/THE-IDEA.md` the same bytes were committed at 5bbe62d. Line 10
  (`books/LAW-43-THE-UNIVERSE-TEACHES-THE-GLYPHS-TO-SPEAK.md`): present with the declared sha256
  at 2ebcc60; not in the tree from merge 30d906f ("Merge Acer Laws 43-44 for bilateral
  reconciliation") onward, so absent at 3f9f42d (0).
- `matrices/FABLE5-SELF-PRISM-CUBES-2026-07-02.hbi:4` declares `chain=pid[n]=sha16(pid[n-1]|name)`;
  with the `name` field the 46 `EMIT` rows give 0/46 equal links. Recomputed with
  `<family>:<name>` in place of `name`, 46/46 links are equal (measured, not a reader rule).
- `matrices/FABLE5-SOVLINUX-USB-RETURN-READONLY-SCAN-2026-07-08.hbi:3` points to an absolute
  `C:/` path (outside the root): 0.
- `receipts/LIRIS-REVERSE-VERIFY-ACER-LAWS-37-42-2026-07-28.hbi:4` path carries `@59d02f7` (a
  revision suffix): no such file in the tree: 0.
- No `.hbp` next to `matrix/TIMED-86400-FLOWes-X3-X3-RUNNING.hbi` (FOLLOW),
  `receipts/FABLE5-SELF-SEED-3078.hbi` and
  `receipts/LIRIS-WORDPRESS-PUBLIC-CORPUS-READ-LEDGER-33-OF-33-2026-07-28.hbi`: 0 (`hbp_absent`).
- `matrices/FABLE5-SELF-PRISM-CUBES-2026-07-02.hbp.sha256` reads `<sha> *<name>`; under the
  FOLLOW rule the name field differs, under the omnibit rule it names the file; the hash equals
  the file's sha256: `+1` with `sidecar_named_star`.

## Further public trees (not part of the three-tree corpus)

The same binary and referee on 11 more of the owner's public repositories on disk (read-only;
`corpus/CORPUS.hbp` `EXTRA` rows pin commits and result sha256). Rust == referee on all 11.

| repo @ commit | `.hbi` | objects | +1 | -1 | 0 |
|---|---|---|---|---|---|
| asolaria-stone-to-moss @ f032bc0 | 22 | 1,088,874 | 1,088,874 | 0 | 0 |
| asolaria-civilisation-matrix @ ebb45ad | 2 | 8,886 | 8,886 | 0 | 0 |
| asolaria-omega-omnibit-tournament @ dad4647 | 5 | 1,157 | 1,151 | 0 | 6 |
| asolaria-rotating-lighthouse-2026-10-09 @ 7b98416 | 6 | 748 | 748 | 0 | 0 |
| asolaria-quantum-universe-alive @ a72ea0e | 10 | 460 | 460 | 0 | 0 |
| asolaria-matrix-in-colour @ 7035def | 13 | 108 | 108 | 0 | 0 |
| asolaria-civilisation-scoreboard @ 0dbf4f2 | 1 | 24 | 24 | 0 | 0 |
| asolaria-federation-1024 @ dc1da1a | 9 | 20 | 19 | 0 | 1 |
| LIGHT---lIFEds6-7 @ 3274719 | 2 | 7 | 6 | 0 | 1 |
| THE-STAR-PORTS @ 76f77ad | 1 | 2 | 2 | 0 | 0 |
| analysis-of-cubes @ 1382d96 | 1 | 2 | 0 | 2 | 0 |

These exercise the hex rows (1,098,934 objects in six repositories, all `+1`), the `HBIROW` byte rows and
their aggregates, the movable-flashlight footer, the `name=` pointers and the `*` sidecars. What
the non-`+1` rows record: omnibit — 6 `.hbi`/`.hbp` objects with no sidecar and no footer
(`no_check_declared`); federation-1024 — one `.hbi` has no `.hbp`. In two `kernel/docs/receipts/`
pairs `X.sha256` holds two lines `<sha> *X.hbp` / `<sha> *X.hbi`; the BigPickle `verifyHBP` rule
reads its first hash (equal: `+1`); `X.hbi` holds `HBI_INDEX|packet=` and `IDX|key=|val=` rows
and declares no `sha256=`/`bytes=`, so its comparison is recorded `trinity_hbi_not_declared`
(before that rule these two read `-1` `trinity_hbi_differs`; the second line of `X.sha256` is
not read by `verifyHBP`, and `sha256sum -c` with the `*` removed reports OK for both files);
analysis-of-cubes — both sidecars begin with the bytes `EF BB BF` and name
`contracts/ANALYSIS-OF-CUBES.hbi` / `.hbp` (with the directory); the 64 hex after those three
bytes equal the files' sha256; LIGHT — `BOOK-OF-LIGHT.hbi` has no `.hbp`. The asolaria-stone-to-moss
remote `HEAD` is cc15b76 (it and f032bc0 have diverged: 25 and 2 commits); f032bc0 is still served by GitHub.

## Writers of the corpus `.hbi` files

`corpus/WRITERS.hbp`: one `HBIWRITER` row per corpus `.hbi` (header tag, writer, evidence,
reader, declared `tool=`/`emitter=`, adding commit). Searched: the 186 public repositories
cloned at `census/src` (726 code files) and the full history (all refs, code files) of the
three trees. 6 files are regenerated byte for byte by their public writer
(`regenerated_bytes`: FOLLOW `PUBLIC-FOLDER-3D-TREE`, `PUBLIC-OWNER-3D-TREE` (writer at
22c7596), `PUBLIC-OWNER-3D-MEDIA-TREE`, both `TIMED-CHIRAL-MONITOR`; simulator
`FABLE5-BIGPICKLE-MAP-2026-07-04` with its `.hbp`, by asolaria-office-service
`bigpickle-map-and-ramp.py:7-58`); 3 have a public line that emits their header
(`emits_header`: `rust-qprism-181` `folders.rs`, `outward.rs`, `finalize_timed_86400_flowes_x3x3.py`);
99 have no writer in the searched public code (all 87 other simulator files, the 7 ANNN
`tools/behcs/*.hbi`, which name a `tool=*.mjs` that does not write them, and 5 FOLLOW files,
4 of them read by `verify_public_repo.py`; `knowledge/LIRIS-SH-PRELIGHT-PUBLIC-POINTER-2026-08-04.hbi`
has no public reader either). The simulator scripts read `FABLE5-*.hbi` from
the operator-disk office folder (`constellation/project_gguf.py:48`). `corpus/SHAPES-*.hbp`
list every row shape with its first `file:line`, its file count and the writers of those files.

## Not checked, and why (no rule in the public code)

- `HBIHDR|family|seat|seed|stamp` + `EMIT|..|pid=` (22 files, 152 rows): `pid = sha16(seed|name)`
  holds on 134/152 rows by measurement, but no row or public writer states that rule.
- `EMIT` rows in 32 files with no declaring `HBIROW` row (251 rows; 81 consecutive links satisfy
  `pid[n]=sha16(pid[n-1]|name)`); the one public writer (`bigpickle-map-and-ramp.py:8`) seeds
  from `sha16("EMITTER-SEED|8467a937cba309f7|bigpickle-map")`, which the `.hbi` does not carry.
- Hash-only fields (`source_hbp_sha256=`, `SOURCE|sha256=`, `HASH|value=`, `CENTER` hashes
  without a paired CENTER, `WPCORPUSPOST` content hashes): no path to dereference. Rows binding a
  file only through a writer's hard-coded name (stone-to-moss `STICK|bytes=|sha256=` for
  `lightbank.lbk`, `verify_lightbank_memory.py:75-82`) are not resolved.
- `POINTER|repo=|commit=|path=|raw_url=`, `TARGET|repo=|commit=`, `SOURCE|repo=|commit=|relative=|sha256=`:
  cross-repository pointers; the reader reads only `<root>`.
- `CENTER|algorithm=SHA256_DOMAIN_UTF8_V1` member hashes: no recipe for CENTER members in the
  public code (`verify_public_repo.py:1689-1703` checks shape and distinctness only); reported
  as `algorithm_not_recomputed`.
- `HBIHDR|schema=ASOLARIA-HBI-ROW-INDEX-V1|source=|bytes=` (omnibit): `bytes` is not prefixed
  `source_`; the paired `.hbp` length is checked by the `HBIROW` coverage instead.
- BEHCS-64/256/1024 payloads: no `.hbi` row, `.hbp` row or sidecar read here carries a BEHCS
  symbol payload (symbols that decode to bytes). The words occur as names (`name=hyperbehcs`,
  `name=behcs-rungs`), a ladder list (`measured=64,256,1024`), a label
  (`glyph=BH1024:SEAT-FABLE5`), a mode value (`QEMUBOOT|..|behcs=1024`), and glyph indices:
  23 rows declare `glyph_1024=` or `glyph1024=` (with `glyph_5`/`glyph5`, and on 16 of them
  `behcs_glyph=BH1024:<NAME>:<PID12>`) — simulator `matrices/BOOT-AUTOSTART-MANIFEST-2026-07-03.hbp`
  (16 `BOOTHOST` rows, no `.hbi`) and `matrices/FABLE5-ABSORB-PLANB-CP907-2026-07-26.hbp`
  (2 `SUPERVISOR` rows; paired with an `.hbi`, so read here), ANNN
  `docs/LIRIS-SLICE-ENGINE-LAW-2026-06-13.hbp` (3 `PIDDIV` rows),
  `docs/ACER-PID-OFFICE-713-QUINTET-DELTA-8BYTE-AGENT-UPGRADE-2026-06-13.hbp` (1) and
  `docs/LIRIS-BILATERAL-FABRIC-READBACK-2026-06-13.hbp` (1), these three with no `.hbi`. The
  public derivation is ANNN `tools/behcs/github-pid-register.mjs:42-62` (`mintPid`: NAME
  upper-cased with each non-`[A-Z0-9]` run as `-`, `seed = u32(sha256(NAME)[0:8])`,
  `glyph_1024 = seed % 1024`), whose line 84 writes the `PIDDIV` row form. Measured on the 23
  rows: with NAME taken from the `pid` (`<ROLE>-<NAME>-PID-H…`) 3/3 `PIDDIV` rows are equal
  (their `H5AA` base, `lane_mod3`, `quad_mod4` and `glyph_5` too); with NAME from `name=` 0/18,
  from the `behcs_glyph` name 0/16, from `k=` 0/2; `u32(pid[0:8]) % 1024` 2/20 (the two
  `SUPERVISOR` rows), `u32(pid[8:16]) % 1024` 0/20, `hilbert % 1024` 0/4,
  `u32(sha16[0:8]) % 1024` 0/2. No `.hbi` row declares these indices, so the reader does not
  check them. The one public BEHCS-1024
  `.hbi` found (asolaria-stone-to-moss @ cc15b76 `experiments/behcs1024-60d/BEHCS1024-60D-LINK.hbi`,
  read from GitHub) declares the algorithm (`DATA|algorithm=BEHCS1024-60D-LEGACY-SHA256|glyph_count=60|alphabet=1024`),
  a 7-trit bijection claim and a cross-repository source pin, and carries no payload; its pair
  reads `+1` on sidecars. The owner's 256<->1024 round trip (`Q-PRISM qprism/cube_absorb.py:118-149`,
  `roundtrip_proof`; Rust `host8/qprism_cube_host8.rs:101-128`, carried by aether `quants/exact`)
  therefore has no row form to bind to. The hex round trip is checked wherever it is declared:
  the BigPickle `X.hex` sidecar (`trinity`), `HBI|row=|sha256=|hex=` rows and `HBIROW|..|hex=` rows.

## Not decided (needs an owner rule)

- Partly zero-filled targets. The reader reads `0` (`bytes_zero_filled`) only when every byte
  of the target or range is `0x00`; a target with a zero-filled region inside other bytes is
  read as content, and a differing digest over it gives `-1` (`tests/cases` `partly-zero`:
  512 bytes, the last 256 zero, `-1 sha256_differs`; `wholly-zero`: `0
  bytes_zero_filled+sha256_differs`). Which zero regions should read `0` (any all-zero block of
  some size, a zero tail, ...) is a choice the public code does not make; it is left to the owner.
- A sums-list `X.sha256` (one `<sha> *<name>` line per file): `verifyHBP` reads only its first
  hash; the other lines are not checked.

## Throughput (release build, this machine)

Timings depend on machine load: this machine has 4 CPUs shared with other jobs, and the
1-minute load average is given with each figure. Streaming SHA-256 of one 268,435,456-byte
pointer target through `vault-read`: 1,646, 1,735 and 1,856 ms (load 10.1-10.2; peak resident
memory 14,976 KB); `sha256sum` (coreutils) on the same file: 237 to 266 ms.
asolaria-stone-to-moss (1,088,800 hex rows; its 80 `.hbi` and `.hbp` files total 748,503,753
bytes): Rust 24,265, 26,703 and 36,053 ms (load 9.6-12.3); referee 292,253 ms (one complete
run, load 9.9-13.9; earlier runs 256,570 to 341,164 ms). The three-tree corpus (three runs
each, load 10.6): FOLLOW 662 to 711 ms, simulator 54 to 82 ms, ANNN 4 to 10 ms.

## Files

- `src/lib.rs` reader; `src/sha.rs` streaming SHA-256 (vendored lines); `src/text.rs` Python
  `splitlines` / `strip().split()` / `strict_uint` semantics; `src/bin/vault-read.rs` CLI.
- `DEPENDS.sha256`: the sha256 of the aether `hbp/src/reader.rs` whose `verify_hbp` the trinity
  check calls (`sha256sum -c DEPENDS.sha256`; also checked by `cargo test`), so an edit there is
  seen before it changes a result.
- `referee/vault_referee.py` stdlib referee (`python3 -I -B referee/vault_referee.py <root>` or `--check`).
- `tests/fixtures/public-*`: 76 public files copied byte-identical from six repositories
  (`FIXTURES-PROVENANCE.hbp`, `UPSTREAM.sha256`); `tests/fixtures/codec` and
  `tests/fixtures/tamper`: written by `tests/common/gen.rs` from the owner's code (`write_hbp`,
  `ReceiptChain`, `IdxPointer`, `agt`; `hbi_for` copied from `pais_path3_bridge.rs:97-104,674-677`;
  `write_hbp_hbi` ported from `hbp.py:29-50,76-79,91-135`, equal byte for byte to the owner's
  Python output on these rows) and from the public fixtures with one stated change each;
  `tests/cases/CASES.hbp`: 23 edge-case trees as `CASEFILE`/`CASELINK` rows (hex paths and
  bytes, written by `gen.rs` `cases_spec`), built at test time by both readers because names
  that are not UTF-8 and symbolic links do not survive every checkout (Linux only; elsewhere the
  case check is skipped); `tests/expected/*.hbp` and `tests/expected/cases.hbp`.
- `examples/gen_fixtures.rs` regenerates `codec/` and `tamper/` (and, given a third path,
  `CASES.hbp`); `examples/row_shapes.rs` lists
  every `.hbi` row shape (`corpus/SHAPES-*.hbp`, with `corpus/WRITERS.hbp`).
- `corpus/VAULT-*.hbp` reader output on the three trees; `corpus/WRITERS.hbp` writers;
  `corpus/CORPUS.hbp` pins.

## Run

    cargo +1.81.0 test --locked
    cargo +1.81.0 clippy --locked --all-targets -- -D warnings
    python3 -I -B referee/vault_referee.py --check
    sha256sum -c UPSTREAM.sha256
    sha256sum -c DEPENDS.sha256
    cargo +1.81.0 run --release --locked --bin vault-read -- <root>
    cargo +1.81.0 run --release --locked --example row_shapes -- <root> corpus/WRITERS.hbp <FOLLOW|SIMULATOR|ANNN>
