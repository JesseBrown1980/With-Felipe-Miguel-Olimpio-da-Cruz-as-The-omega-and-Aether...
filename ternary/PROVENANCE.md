# ternary — provenance

## 1. Re-exported, not copied: the owner's tribit unit

`Cargo.toml` depends on `../kernel/tribit` by path (`asolaria-tribit = { path = "../kernel/tribit",
version = "0.1.0" }`); `src/lib.rs` re-exports it with `pub use`. No line of it is copied here.

| Item | Value |
|---|---|
| aether path | `kernel/tribit/src/lib.rs` (committed in `2b06855`) |
| upstream | `JesseBrown1980/asolaria-tribit` @ `12921911e3b35987d534d83980b272881a8c4a78` (local `/home/user/asolaria-tribit`), equal at remote `main` `52b712d` |
| git blob | `f83acb31584c887f1502704a3a9bfcf8e619b64d` (aether copy = upstream @1292191 = upstream @52b712d) |
| sha256 | `93c96b97f507d02c054372e992f01696aba50f7e431f7d66921b91ba13b9a7c0` (pinned in `UPSTREAM.sha256`) |

The relayed rule names `tribit/mod.rs`. The upstream README ("Why this repo exists") says the
module "had **no upstream.** Six Rust kernels built on 2026-10-08 reused it verbatim via `#[path]`
... It is published here as the compact core". The `#[path]` target named by those kernels,
`C:\asolaria-acer\asolaria-os\kernel\core\src\tribit\mod.rs` (WIRING-MAP open item 13), is not
in public `asolaria-os@2799c70`; asolaria-tribit `src/lib.rs` is the published form used here.

## 2. Vendored byte-identical (`vendor/`, pinned in `UPSTREAM.sha256`)

| Copy | Source | Upstream path | Git blob | sha256 | Used for |
|---|---|---|---|---|---|
| `vendor/acer-algorithms-of-asolaria-publication-20260723/tools/honest-compressor/trijection/trijection.py` | the owner's ACER seat, delivered by the owner 2026-10-18 (section 2a) | `C:\asolaria-acer\scratch\algorithms-of-asolaria-publication-20260723\tools\honest-compressor\trijection\trijection.py` | `e9cbeb8b73c594557a1be68d8282c29a093fb182` | `c5005b1c9acd6a6cb6d6e3fbd25a283c1455109f0408ee9810b0d5a8151baac6` | `to_balanced_ternary` `:42-48`, `trijection_forward` `:50-57`, `trijection_inverse` `:59-64`, zero-trit count `:83-88`; `measure()` and `__main__` run unchanged by `referee.py --measure` |
| `vendor/acer-algorithms-of-asolaria-publication-20260723/tools/honest-compressor/trijection/trianti.py` | the owner's ACER seat, delivered by the owner 2026-10-18 (section 2b) | `C:\asolaria-acer\scratch\algorithms-of-asolaria-publication-20260723\tools\honest-compressor\trijection\trianti.py` | `353f84325c9a4e557ca314680afb0caaddef238c` | `e7c1a01fd5be6d67a34eb6fc966a0742cca730eaed10899dff72379346229b6c` | the 27-cube symmetry group `N` `:31`, `R` `:32`, `R2` `:33` (`law_negate` / `law_rotate` / `law_rotate2`); `report()` `:49-77` run and quoted by `referee.py --check` |
| `vendor/universe-simulator/books/operator-laws/TRIJECTION-BALANCED-TERNARY.md` | `JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills` @ `3f9f42dab6247c40b30921b253e3f73c9e942ca5` (added in `febd661`, unchanged since) | same | `99ce329ba4d37f7098716d623cb214ef30abbc97` | `c62371bc3f36d444f4326d986a2f0a4fbbe87c37fe9ea09b579d5f2b245975b1` | the law: formulas `:13-18`, cube `:23-25`, measurement rows `:27-49`, trianti `:122-146` |
| `vendor/universe-simulator/players/rime_27fischers.py` | same @ `3f9f42d` | same | `c26228781c7e726b12efa8d18d6c68cc711cfd80` | `275c32d7866226c2c4139fbf9c2a0ed5e9a551072f95f307ae97a07d17220402` | `cube27` `:51-52`, 3-trit loop `:39-44`, 2/3 rule `:92`, centre `:88` |
| `vendor/universe-simulator/players/rime_agents.py` | same @ `3f9f42d` | same | `824b17b0e7207f041732c048c321489b75d76c3f` | `a15f6a5c66f5cb1e33904b43905c9dfdd829f8cebecab4240e0cfd8bd9f62e1c` | 3-trit loop `:46-51` |
| `vendor/the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3/reframe_check.py` | `JesseBrown1980/the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3` @ `5bdc268091caab1df2c43de40a50fbc456642960` (file from `3557f5f`, 2026-08-01) | `reframe_check.py` | `ba82afd127cafa0566894752367b88804203d704` | `1ea5646efcad680bc6c676094ca8cd6242c5bd47f62d26c2e357b59a0194e859` | `base3` `:12-19`, `bal3` `:22-34`, reconstruction `:44` |

Blob ids are `git hash-object` of the copies. For the four repository files they equal
`git ls-files -s` in the source clones (`scratchpad/codec/src/ASOLARIA-UNIVERSE-SIMULATOR-…`
@3f9f42d, `scratchpad/universe/src/the-browns-…` @5bdc268, whose `main` equals `git ls-remote`
of the public repository).

Privacy scan before copying (emails, phone numbers, RFC1918 / LAN addresses, keys, tokens, private
names): no third-party personal data in any of the six. The law names the owner and seats
("Operator: Jesse Daniel Brown. For liris, acer, and the federated Claude clouds.");
`trijection.py:4` names the owner ("Operator: Jesse Daniel Brown. Sealed 2026-07-21.") and `:101`
holds an earlier cloud session's scratchpad path; `trianti.py:4` names the owner ("Operator: Jesse
Daniel Brown. Sealed 2026-07-21. Companion to trijection.py / njection.py.") and holds no path;
`rime_agents.py:25` holds the owner's local corpus path `D:/asolaria-absorb/enwik9`, which the
copied lines do not read. The operator name is published under the owner's 2026-10-18 one-year
authorization (`OWNER-RULES.md` rule 5).

### 2a. `trijection.py`: origin and where else it is

- Origin: the owner's ACER seat,
  `C:\asolaria-acer\scratch\algorithms-of-asolaria-publication-20260723\tools\honest-compressor\trijection\trijection.py`;
  its docstring (`:2-4`): "trijection.py — THE TRIJECTION CODEC (balanced-ternary, center-free).
  Operator: Jesse Daniel Brown. Sealed 2026-07-21." The owner located it and delivered it on
  2026-10-18 (staged at `scratchpad/trijection-original/trijection.py`: 6,443 bytes, sha256 and
  blob as above; the vendored copy is `cmp`-identical to the staged copy). The vendor path
  records that origin; the bytes are never edited here. The file has CRLF line terminators (135
  lines); the sha256 and the blob are of those bytes. aether's `.gitattributes` (`* -text`,
  commit `f36f399`) stores and checks out every file as stored, so a commit keeps blob
  `e9cbeb8b`. The referee and Python read it in text mode (universal newlines).
- Search for the same blob elsewhere (2026-10-18), `git log --all --find-object=e9cbeb8b…`,
  `git cat-file -e e9cbeb8b…`, and `git rev-list --all --objects` path names
  (`trijection.py`, `k_gradient.bin`, `chaos1m.bin`, `code1m.bin`), with lazy fetch off
  (`GIT_NO_LAZY_FETCH=1`), in 240 git directories and 1,598 refs, searched in two passes:
  - First pass (list written 00:47:43 UTC, done 00:48:08): 235 git directories, 1,576 refs: the
    186 clones under `scratchpad/census/src`, the 17 top-level clones under
    `scratchpad/universe/src` that existed then, 31 git directories under `/home/user` (to depth
    4), and the private mirror `scratchpad/asolaria-mirror.git` (132 refs, not shallow, 14,924
    objects).
  - Second pass (in review): the 5 git directories under `scratchpad/universe/src` the first pass
    did not list, 22 refs: four nested clones that existed before it,
    `hf/The-Brown-Light-erdos-Engine-block-powered-by-light`,
    `hf/the-browns-solution-to-erods-o0O-nx3-6-for-1-with-1-3-4bfb2942fa`,
    `qr/dbbh-coms-quant-prism` and `qr/path2-two-shadow-recovery`, and `aoa-map` (created
    00:48:18, after the first pass ended).
  - After the second pass, the git directories on disk under `census/src`, `universe/src` (to
    depth 5), `/home/user` (to depth 4) and the mirror are these 240; no bare repository is among
    them other than the mirror.

  Of the 240, 198 are shallow clones and 189 partial clones (186 `blob:limit=524288`, 3
  `blob:none`; their trees are present, so `--find-object` sees blob ids), so the search covers
  the history fetched into each. Result: no commit on any ref contains blob `e9cbeb8b`; the blob
  is in no object store; no path named `trijection.py`, `k_gradient.bin`, `chaos1m.bin` or
  `code1m.bin`. Positive controls with the same commands: `reframe_check.py` blob `ba82afd1` is
  found at `5bdc268` / `3557f5f` (and at `3557f5f` in the second pass's
  `hf/the-browns-solution-…-4bfb2942fa`), tribit `src/lib.rs` blob `f83acb31` at `52b712d` /
  `9b97b7e`. The file is in none of the 240 git directories on disk; the vendored copy is the
  only one here.

### 2b. `trianti.py`: origin and where else it is

- Origin: the owner's ACER seat,
  `C:\asolaria-acer\scratch\algorithms-of-asolaria-publication-20260723\tools\honest-compressor\trijection\trianti.py`;
  its docstring (`:2-4`): "trianti.py — THE SYMMETRY GROUP OF THE 27-CUBE (trinary inversion &
  anti-inversion). … Operator: Jesse Daniel Brown. Sealed 2026-07-21. Companion to trijection.py /
  njection.py." The owner delivered it on 2026-10-18 in the ACER export
  `honest-compressor-9ebd6119-export-2026-10-18.zip` (212 entries, sha256 `0f02b52d…`), which also
  carried `trijection.py`; `trianti.py` is entry `trijection/trianti.py` of that export, 3,816
  bytes, sha256 `e7c1a01fd5be6d67a34eb6fc966a0742cca730eaed10899dff72379346229b6c`, git blob
  `353f84325c9a4e557ca314680afb0caaddef238c`. The vendored copy is `cmp`-identical to the extracted
  file; the bytes are never edited here. aether's `.gitattributes` (`* -text`) stores and checks out
  the file as stored, so a commit keeps blob `353f8432`.
- Where it was looked for (2026-10-17): the search of section 5 did not find `trianti.py` on this
  container or on any ref of the 240 git directories — only an unrelated `trianti.py`
  (`the-browns-solution-to-erods-…@3557f5f`, blob `3cb39d96`, an Erdős "three trunks" program, a
  different file). The owner's 2026-10-18 delivery supplied the honest-compressor `trianti.py`
  recorded here; its bytes were verified `e7c1a01f` against the export entry before vendoring.
- The same 2026-10-18 export carried `trijection.py` byte-identical to the copy already vendored
  (section 2a): the export entry's sha256 is `c5005b1c…` and it is `cmp`-identical to
  `vendor/…/trijection/trijection.py`. The export does not differ from the vendored original, so
  that file is left unchanged.

## 3. Ported to Rust (line by line)

| Rust | Owner function / lines |
|---|---|
| `trijection::trijection_forward` | `trijection.py:50-57` `trijection_forward` (per-triple body in `trij`) |
| `trijection::trijection_inverse` | `trijection.py:59-64` `trijection_inverse` (per-tuple body in `Trijection::restore`) |
| `trijection::trij` | `trijection.py:55-56` (the forward loop body); the same formulas as law `:13-17` |
| `trijection::Trijection::restore` | `trijection.py:62` (the inverse loop body); law `:16-18` |
| `trijection::zero_trits` | `trijection.py:83-88` (`:84-87` integer counts; `:88` divides in float, the port returns both counts) |
| `trijection::third` | `rime_27fischers.py:92` |
| `balanced::to_balanced_ternary` | `trijection.py:42-48` |
| `balanced::bal3` | `reframe_check.py:22-34` |
| `balanced::recon` | `reframe_check.py:44` |
| `balanced::base3` | `reframe_check.py:12-19` |
| `balanced::low_trits` | `rime_27fischers.py:39-44` (= `rime_agents.py:46-51`; the same loop as `trunk.py:24-36` and `rime_fischer_cluster.py:38-45` with `k` slots) |
| `cube::cell`, `cube::index` | `rime_27fischers.py:51-52`, `:88` |
| `cube::separation` | law `:25`; `trijection.py:25`; `measurements/build_between.py:106-107` (USIM @3f9f42d) |
| `cube::negate`, `cube::rotate` | `trianti.py:31` `N`, `:32` `R` (law `:128`, `:129`); `rotate∘rotate` = `trianti.py:33` `R2` |

What changed in the existing crate with the original in hand (2026-10-18): `trij` and
`Trijection::restore` compute exactly what `trijection.py:55-56` and `:62` compute, so their
arithmetic is unchanged; their citations now name the original (the law's lines are the same
formulas), and `restore` adds in the original's order (`c0 + sa`, was `sa + c0`; same value).
`cube::negate` and `cube::rotate` are unchanged in arithmetic (they already equalled the owner's
`N` and `R`); with `trianti.py` in hand (2026-10-18, section 2b) their citation names it, and
`rotate∘rotate` is recorded as the owner's `R2` (`:33`) — equal on every one of the 27 cells
(the `CUBE` rows carry `N`, `R`, `R2`; `referee.py --check --rust`, `tests/law.rs`).
`trijection_forward`, `trijection_inverse`, `zero_trits` and `to_balanced_ternary` are new and are
built on `trij` / `restore`. `low_trits` (the `rime_*` loop, carry before division) is kept; it
writes the same trits as `to_balanced_ternary` (division before carry) for every value and width
measured (`tests/stream.rs`, widths 1..=10 on `[-29524, 29524]`; referee `TBT_VS_LOW3`).
`bal3` is kept: it is a different convention (variable width), README "Two balanced-ternary
conventions" has the counts.

Python's `//` and `%` floor; for the divisor 3 they equal Rust's `div_euclid` / `rem_euclid`,
which every port uses. Inputs are `i64`/`u64` for the integer functions and bytes for the
stream functions. `SA`/`SB` are `i16`, the width `measure()` serialises them in
(`struct.pack("<h", x)`, `:75-76`); bytes give `-170..=170`. `C0`/`REM` are `u8` (upstream
`bytearray`). The digit `r` in `{-1, 0, +1}` is carried as `Zero::from_digit(r + 1)`, the packing
digit of `kernel/tribit/src/lib.rs:115-128`.

`trijection_inverse` in Rust takes the value ranges `trijection_forward` produces: `C0`/`REM` as
`u8`, `SA`/`SB` as `i16`, `total_len`/`pad` as `usize`. Upstream's `trijection_inverse` (`:59-64`)
also accepts other Python ints in those places; those inputs cannot be written against the Rust
signature. Run from the vendored bytes: `trijection_inverse([-1],[1],[1],[6],3,0)` returns
`b'\x00\x00\x03'` and `trijection_inverse([300],[-100],[-100],[-300],3,0)` returns
`b'\xc8\xc8\xc8'`. A negative `total_len` or `pad` cannot be passed either; the slice end
`total_len - pad` it gives is reached with non-negative values (`(-1, 0)` and `(0, 1)` both give
end `-1`; the same 2 bytes on `([10],[0],[0],[0])`). All 2,078 `INV` argument sets of the referee
lie inside the Rust types.

## 4. The referee (`tools/referee.py`, cold lane)

- `trijection.py` and `trianti.py` are checked against sha256 `c5005b1c…` and `e7c1a01f…` before
  anything runs.
- Owner code, executed from the vendored bytes: the defs `to_balanced_ternary`,
  `trijection_forward`, `trijection_inverse` (only those three are compiled from
  `trijection.py`), `N`, `R`, `R2` (only those three are compiled from `trianti.py:31-33`), `bal3`,
  `base3` (`reframe_check.py`; its loop at `:49-91` is not run), `cube27` (`rime_27fischers.py`; its
  imports are not run); the line blocks `trijection.py:55-56` (with `a, bb, c` bound and
  `C0, SA, SB, REM` bound to lists, for the `i64` rows), `trijection.py:62`, `trijection.py:75-76`,
  `trijection.py:84-87`, `reframe_check.py:44`, `rime_27fischers.py:39-44`, `rime_27fischers.py:92`,
  `rime_agents.py:46-51`, executed with their variables bound. `--check` compares 41 cited lines
  with the exact text it expects, and runs `trianti.py`'s `report()` from the imported module (its
  `__main__` guard is not hit), quoting the counts it prints and checking them against the referee's
  own (`order(N)=2`, `order(R)=3`, `R≠R⁻¹`, the pie closes, the group `{N,R,R²}` fixes `(0,0,0)`).
- `--measure`: the module is imported from the vendored path (top level only: imports and defs)
  and its `__main__` lines `:102-135` are executed with `SC` bound to a given directory; line
  `:101` (the earlier scratchpad path) is the one line not executed. In that namespace `measure`
  is also bound to a wrapper (`referee.py` `recording_measure`) that records each input it
  receives (for the integer counts and `--write-inputs`) and then calls the owner's `measure()`
  unchanged; the as-written run, with no wrapper, prints the same lines (section 6). `measure()`'s `H_bits`
  (`math.log2`), `lz` (`lzma`) and float prints, and the `math.sin` signal (`:123`), are the
  owner's float lane, run unchanged; their printed lines are quoted as the owner's output. The
  referee's own numbers (zero-trit counts, `lz()` byte counts, `n/d`, fixed point) are integers.
- `tools/integer_only.py` (stdlib, CI) checks that the code written here stays integer: by AST,
  `tools/*.py` has no true division, float or complex literal, `float()` / `round()` /
  `complex()` call, float `%`-format or format spec, `**` with a negative literal exponent, or
  import of `math`, `cmath`, `fractions`, `decimal`, `statistics`, `random`, `numpy`; in
  `src/`, `tests/`, `examples/` (comments, strings and char literals blanked) no `f32`/`f64`
  token and no float literal. It does not cover the owner's vendored code, which the referee
  compiles from `vendor/`, nor `**` with a computed exponent (the referee's two are
  `10 ** places` and `10 ** len(part)`, both non-negative).
- The 27-cube symmetry: `law_negate` / `law_rotate` / `law_rotate2` are the owner's `N` / `R` / `R2`,
  compiled from the vendored `trianti.py:31-33` (not written from the law's text). The owner
  delivered `trianti.py` on 2026-10-18 (section 2b); before that these two were written from the
  law's text (`:128`, `:129`), which the owner's `N` / `R` reproduce byte for byte, so the `CUBE`
  rows they produce are unchanged except for the new `R2` column. The earlier `law_trij` /
  `law_restore` were likewise replaced by the owner's lines when `trijection.py` arrived; the TRIJ
  rows they produced are unchanged.
- Test inputs: splitmix64 seeded draws, mirrored in `tests/common/rows.rs`; not owner code.
  Stream digests: SHA-256 of `C0 || SA_b || SB_b || REM` (Python `hashlib`; `tests/common/sha256.rs`,
  test-only, checked on the FIPS 180-4 examples).

## 5. Found and not found: `trijection.py` and its companions

The law cites `trijection.py` for its measurements (`:27`, `:67`) and `nested_cascade.py` (`:70`,
`:97`), `njection.py` (`:99`, `:120`) and `trianti.py` (`:122`, `:146`). `JESSE-LAWS.md:21-24`
(USIM) lists the "Reference implementations (this folder)": `trijection.py · njection.py ·
nested_cascade.py · trianti.py · wave_test.py · trime.py · rime_trace.py · rime_sphere.py ·
rime_fischer.py · rime_run.py · rime_dimension.py · rime_bpc.py`. USIM @3f9f42d carries
`rime_sphere.py`, `rime_fischer.py`, `rime_run.py` and `rime_bpc.py` under `players/`.

- `trijection.py`: not found by the 2026-10-17 search below; delivered by the owner from ACER on
  2026-10-18 (section 2a) and vendored.
- `trianti.py`: not found by the 2026-10-17 search below (only an unrelated `trianti.py`, Erdős
  "three trunks", blob `3cb39d96`); delivered by the owner from ACER on 2026-10-18 in the same
  export as `trijection.py` (section 2b) and vendored.
- `njection.py`, `nested_cascade.py`, `wave_test.py`, `trime.py`, `rime_trace.py`,
  `rime_dimension.py`: in none of USIM's 237 commits and in none of the places below. (These were
  also in the 2026-10-18 ACER export; the gap survey of that export records them, but only
  `trianti.py` is brought into `ternary/` here — the companions the referee needs are
  `trijection.py` and `trianti.py`.)
- `trijection.py`'s own inputs `k_gradient.bin`, `chaos1m.bin`, `code1m.bin` (`:104-107`): not
  present. Searched 2026-10-18 by file name under `scratchpad/`, `/home/user` and `/` (`find
  -xdev`, 183,180 files under the first two), and as path names on every ref of the 240 git
  directories of section 2a: no match. `enwik8` (`:106`) is the public file
  (`scratchpad/data-enwik8/enwik8`, 100,000,000 bytes, sha256 `2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8`).

Where they were looked for (2026-10-17):

| Place | How | Result |
|---|---|---|
| USIM history clone `scratchpad/regen/hist/usim` (237 commits, all refs, not shallow) | every path of every object (`git rev-list --all --objects`) | only `books/operator-laws/TRIJECTION-BALANCED-TERNARY.md`; the law file was added in `febd661` and never changed |
| 240 git directories: every clone under `scratchpad/census/src`, `scratchpad/universe/src`, `scratchpad/regen/hist`, `/home/user` (depth 4), and the private mirror `scratchpad/asolaria-mirror.git` (132 refs) | path names of every object on every ref matching `trijection\|nested_cascade\|njection\|trianti\|honest.compressor\|rime_dimension\|rime_run` | law file; an unrelated `trianti.py` (the-browns-solution-to-erods…@3557f5f, blob 3cb39d96: Erdős "three trunks", `2^n` triples); `FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS` `knowledge/public-dependencies/algorithms/tools/honest-compressor/{rust,sgram}` (an `include!` of `variants/vc65.rs` and `sgram_chain.py`, no `trijection` directory); `players/rime_run.py` in USIM; names containing `injection` (unrelated) |
| the same 240 git directories | path names for `COMPLETE-BUILD-GUIDE\|jesse-laws\|trime\.py\|rime_prism\|wave27\|wave_test\|rime_bpc\|rime_dimension\|rime_trace\|rime_sphere\|rime_fischer\|DEPLOYMENT-INSTRUCTIONS\|rime-space\|\.tar\.gz\|\.tgz` | 23 paths: USIM `books/lineage/JESSE-LAWS-v*.md` and `players/rime_{bpc,sphere,fischer,fischer_cluster,prism_pipeline}.py`, `receipts/operator/rime_fischer_cluster.txt`, and unrelated archives; no `jesse-laws-complete` or `rime-space-*` archive, no `COMPLETE-BUILD-GUIDE.md` |
| the same 240 git directories | content of every locally present blob under 8 MB (48,975 blobs; partial clones hold only fetched blobs) for `trijection\|nested_cascade` | mentions only: USIM books (444 blobs: law books and lineage), `asolaria-stone-to-moss` (2: seat-5 r13 prereg and a boundary note), `hf-asolaria-record-231-canonical` (12: transcripts of panels). No program body |
| public GitHub | `git ls-remote https://github.com/JesseBrown1980/<name>` for `honest-compressor`, `honest_compressor`, `trijection`, `the-trijection`, `rime`, `rime-space`, `rime-space-full-system`, `rime-space-COMPLETE`, `RIME-SPACE-FOR-CLOUD-AGENTS`, `Asolaria-Rime-Reconstruction`, `Asolaria-Rime-Reconstruction-20260722`, `balanced-ternary`, `trianti`, `njection`, `nested-cascade` | none answers (the same command answers for `asolaria-tribit` and the erdos repository); the 212-name owner list `scratchpad/census/gh-all.txt` and the 243 HF names hold none of them |

Where the owner's records say the companions are: `receipts/DENIAL-INVENTORY.txt:28-42` (USIM)
lists, on ACER, `D:/Asolaria-Rime-Reconstruction-20260722/03-sealed-sources/extracted/` with
`jesse-laws-complete.tar-1.gz-8fa6c2a39655/jesse-laws/`,
`rime-space-COMPLETE.tar.gz-a7d2cd9c6895/honest-compressor/trijection/`,
`RIME-SPACE-FOR-CLOUD-AGENTS.tar.gz-f623bfc5dc10/honest-compressor/trijection/` and
`rime-space-full-system.tar.gz-4b41a822284a/honest-compressor/trijection/` (files named there:
`JESSE-LAWS.md`, `rime_dimension.py`, `rime_run.py`). `books/operator-laws/REFEREE-HANDOFF.md:19-22`
names `jesse-laws-complete.tar.gz` (26 KB) "Contains: trijection.py, trime.py, rime_prism.py,
wave27.py". No copy of those archives was found in the places above.

## 6. The law's rows: reproduced and not

Measured 2026-10-18 (Python 3.13.16, rustc 1.81.0). "Reproduced" means the owner's
`trijection.py` printed the law's value; integer counts are computed by the referee from the
owner's integer lines and `lz()` byte counts. The owner's `__main__` was run twice: as written
(an `enwik8` symlink placed at the `:101` path, in a directory created for the run and removed
after; exit 0), and as `referee.py --measure` (`:102-135` with `SC` bound); the printed lines are
identical apart from the input directory in the `skipped` lines.

| Law line | Statement | Here |
|---|---|---|
| `:5`, `:21` | "`restore=OK` on every case (lossless bijection)"; "`(a,b,c) ⟷ (c0, sa, sb, rem)` exactly" | reproduced through the original `trijection_inverse` (`:59-64`, referee): 16,777,216 / 16,777,216 byte triples, every buffer of length 1 and 2, seeded buffers of every length 0..=12 and of 299,999 to 1,048,577 bytes. Through the owner's loop lines `:55-56` / `:62` (referee): 170,814 / 170,814 `TRIJ` rows (`[-27,27]^3` = 166,375, 343 `i64` edge triples, 4,096 seeded `i64` triples). The Rust port equals the referee row for row (458,196 rows, the 170,814 `TRIJ` rows among them). Rust self-round-trips of `trij` / `restore` only (`tests/law.rs`, not run through the owner's lines): 531,441 / 531,441 on `[-40,40]^3`, 343 / 343 `i64` edge triples, 200,000 seeded `i64` triples |
| `:24-25` | "`1 center + 6 faces + 12 edges + 8 corners`, where separation-from-center = count of nonzero trits" (also `trijection.py:23-25`) | reproduced: 1 / 6 / 12 / 8 over `cube27()` |
| `:131` | "`N·N = id`, `R·R·R = id`" on all 27 cells | 27 / 27 and 27 / 27, through the owner's `trianti.py` `N` / `R` executed from the vendored bytes (`R2 = R∘R` matches `R2` 27 / 27) |
| `:131-132` | "`R ≠ R⁻¹`" | `R` and `R²` (owner's `trianti.py` `R` / `R2`) agree on 3 of 27 cells (the cells `R` fixes) and differ on 24 |
| `:136-137` | "R fixes the main diagonal `{(−1,−1,−1), (0,0,0), (+1,+1,+1)}` (orbit sizes {1:3, 3:8} …)" | reproduced exactly (owner's `R`) |
| `:137-139` | "The FULL group {N,R,R²} fixes only `(0,0,0)`" | reproduced: 1 cell, `(0,0,0)` (owner's `N` / `R` / `R2`) |
| `trianti.py:49-77` | the owner's `report()`: `order(N)=2`, `order(R)=3`, `R≠R⁻¹`, the pie closes (`R·R⁻¹=id`), the group fixes `(0,0,0)`, orbit sizes `{1:3, 3:8}` | reproduced: `report()` run from the imported module prints exactly these; the referee's own `order(N)=2`, `order(R)=3` and the counts agree |
| — | `rime_27fischers.py:88-89`: the free centre `(0,0,0)` is glyph 13 | reproduced: 13 |
| `:35` | english order-0 raw 5.0404, trijection 6.6006, no save | reproduced: the owner prints `raw=5.0404  trijection=6.6006  delta=+1.5602  (no save)` on `enwik8[:300000]` (input sha256 `11f09c9f…`) |
| `:40` | english zero-trit 0.602 | reproduced: the owner prints `0.602`; integer 722,674 / 1,200,000 = 361337/600000 |
| `:46` | (B) "order-0 bpc raw = 7.4752 → trijection = 3.8966 (−3.5786) SAVES" | reproduced: the owner prints `raw=7.4752  trijection=3.8966  delta=-3.5786  <-- SAVES` on the aligned-vantage input `__main__` generates (`:122-128`, sha256 `b44651aa…`) |
| `:47` | (B) "lzma bpc raw = 0.1780 → trijection = 0.1188 (−0.0592) SAVES" | reproduced: the owner prints `raw=0.1780  trijection=0.1188  delta=-0.0592  <-- SAVES`; integer `lz()` bytes 6,676 → 3,956 + 172 + 172 + 156 = 4,456 of 300,000; bpc 1669/9375 → 1114/9375, delta −37/625 |
| `:48` | (B) "zero-trit fraction = 0.900" | reproduced: the owner prints `0.900`; integer 1,080,000 / 1,200,000 = 9/10 |
| `:49` | (B) "restore = OK" | reproduced |
| `:33`, `:34`, `:36` | table (A) gradient 5.8638 / 6.9516, chaos (random) 7.9994 / 8.3035, rustcode 4.9768 / 6.6586, no save | not runnable: `k_gradient.bin`, `chaos1m.bin`, `code1m.bin` not present; the owner's program prints `skipped: [Errno 2] No such file or directory` for each |
| `:40` | zero-trit rustcode 0.609, random 0.460 | not runnable (same inputs) |
| — | the control case (`:130-135`, "alignment DESTROYED") | the law states no values for it. The owner prints `order-0 bpc raw=7.4752 trijection=4.5288 delta=-2.9464 <-- SAVES`, `lzma bpc raw=0.3466 trijection=0.5883 delta=+0.2417 (no save)`, zero-trit `0.830`; integer 995,470 / 1,200,000 = 99547/120000, `lz()` bytes 12,996 → 22,060 |
| `:75-97` | nested cascade 27 → 9 → 3 → 1 and its scaling table | not reproduced: `nested_cascade.py` not found |
| `:99-120` | flat N-jection vs nested | not reproduced: `njection.py` not found; the law's text ("1 grand center (mean of ALL N) + N-1 separations") does not fix the integer rounding of the mean, so no port is written |

Of the 25 values of `:33-49` the referee checks, 14 are reproduced, 0 not reproduced, 11 not
runnable.

## 7. Related owner trit code, not brought in here

- `asolaria-tribit@52b712d` `kernel/behcs1024-60d/src/lib.rs:154-177` (blob 7aa1929a)
  `glyph_to_trits` / `trits_to_glyph`: glyph `0..1023` as seven trits `digit - 1`, most
  significant first, carried as `[i8; 7]`. aether's `kernel/behcs1024-60d` is the
  federation-1024 version, which has no such function. A different encoding from `bal3`.
- USIM `crates/asolaria-tribit` (`src/lib.rs`, `src/tribit.rs`): a larger crate around the same
  `Zero` / `TritWord` / prism, with SHA-256, seed and count functions. Not the module the relayed
  rule names; not used.
- `asolaria-stone-to-moss` branch `agent/seat-5/r13-center-origin-trit-geometry-20261015`
  (`experiments/seat5/r13`, e.g. `5df1613`): a seat-written Rust experiment whose prereg states its
  own "Minimal declared test interpretation" of a center-first trijection. Not the owner's
  `trijection.py`.
- PR #124 `experiments/seat1/proxima-rust181/src/lib.rs:11-12` (`pub type Trit=i8;
  pub const TRITS:[Trit;3]=[-1,0,1];`), vendored unchanged by `agents/levels`.
- `trijection/rime_fourpoint.py`: USIM @3f9f42d `books/COMBINED-BOOK-OF-LAWS.md:565-566` (Law 36,
  "The Four-Point Law (the centre is not empty; it is the largest term)") reads "This law
  supersedes the "free center" line inside Law 24", and `:178` amends Law 24's MTP line "direction
  **0** (hold) = accuracy 1.0, "the free center, costs nothing and says nothing."". `:587` names
  its measuring script `trijection/rime_fourpoint.py`, a different file from `trijection.py`; it
  is not on this machine (`agents/levels/PROVENANCE.md` records that search) and was not part of
  the owner's delivery. The book's text names Law 24; it does not name the trijection law or
  `trijection.py`.
