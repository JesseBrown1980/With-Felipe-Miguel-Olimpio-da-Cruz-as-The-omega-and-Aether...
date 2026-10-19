# 12 — Shadow cats in their own order (2026-07-26 → 07-29, and the rotating lighthouse of 2026-10-09)

Build-order step 12 of the beginning: "Shadow cats in their own order". The shadow-cat program itself
was written on 2026-07-26 and is already in aether (first section). This directory brings in what grew
from it, in the order it was built: `CHAIN-TOPOLOGY.md` and the Combined Book of Laws (07-27/28); the
standalone law files of Laws 42 to 60 (07-28); Laws 62 to 71 with the tools they were measured with
(`rime.py` and its test, `shadow_net.py`, `centre_kernel.py`, `photon.py`, `lighthouse.py`); the LIRIS
self-tests, harvests and 3×3×3 shadow tunnel (07-28); and the Books of Shadows (07-29). It also brings
the later shadow-cat canon of 07-29 to 08-02 and the rotating-lighthouse kernel of 2026-10-09, which the
step names beside `lighthouse.py`.

`vendor/` holds 203 files (12,401,483 bytes) from five public repositories of `JesseBrown1980`, each
read with `git cat-file -p <blob>`. The first pass vendored 171 (12,310,531 bytes); the re-check of
2026-10-19 added 34 USIM files (101,941 bytes): the standalone Laws 42–60, the three files of the Book
of Knowledge commit that the first pass missed, and `test_rime_tool.py`. Every file is byte-identical.
For all 203, `git rev-parse <commit>:<path>` in the source returns the recorded blob, `git hash-object
--no-filters` equals it, and so does path-aware `git hash-object` inside aether with aether's
attributes applied; `sha256sum -c UPSTREAM.sha256` passes 203/203. For every row, the commit the bytes
were read from is the commit that first introduced that blob on any ref. The first blob of each path is
under `vendor/<repo>/<path>`; a later blob of the same path is under
`vendor/<repo>-variant-<commit7>/<path>` (27 files). Every other blob that any ref ever held at a
vendored path (43) is pinned in `PROVENANCE.md` (42) or already in aether (1).
All 87 vendored `.sha256` sidecars were checked: 82 name the sha256 of a body vendored here, 4 name
bodies that are in aether, and 1 names the held photograph, all exactly. USIM below is
`ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills`.

## Already in aether: the shadowcat program (2026-07-26) and ACER's remake

The step text begins "commit the untracked shadowcat/ crate and the ACER remake cubes". That is done.
aether commit `d203721` (2026-10-18) brought in ACER's shadowcat SHA-256 delivery
(`docs/handoffs/acer-shadowcat-sha256-2026-10-18/`), and `ef180d1` (2026-10-18) brought in `shadowcat/`
and `docs/handoffs/acer-post60d-2026-10-18/`. Nothing of it is re-vendored. Each blob below was checked
at its aether path in HEAD (`a0c0ad4`, 2026-10-19 11:20:18 UTC); the full list with paths is the last
table of `PROVENANCE.md`. The one row that changed since the first pass (checked at `d7280f1`) is
`shadowcat/Cargo.toml`.

| component | aether path | blob | bytes |
|---|---|---|---:|
| gear engine and HBP1/HBI1 emitter | `shadowcat/src/main.rs` (also in the ACER remake cube) | `552ec3fe` | 24,374 |
| in-tree FIPS 180-4 SHA-256 | `shadowcat/src/sha256.rs` (also `docs/handoffs/acer-shadowcat-sha256-2026-10-18/src/sha256.rs`) | `c03dd42e` | 4,900 |
| `verify`, `threegap`, `callingchain` binaries | `shadowcat/src/bin/{verify,threegap,callingchain}.rs` | `b3541fb4`, `e6c2d55b`, `bf9577cb` | 6,792 / 5,831 / 16,604 |
| run records of 2026-07-26 | `shadowcat/records/{RUN,VERIFY,THREEGAP}-2026-07-26.txt` | `8d013535`, `ebd9613b`, `b079d11d` | 6,740 / 975 / 1,769 |
| callingchain reproduction record (trailer `3c4780ed`) | `shadowcat/tests/fixtures/REPRODUCE.hbp` | `ef0bb256` | 2,342 |
| `Cargo.toml`, reconstructed (the original was not delivered); since aether 171a461 (2026-10-19 11:01:16 UTC, "Switch aether's own SHA-256 to shadowcat's sha256.rs after digest parity") it also declares `src/sha256.rs` as the crate's library (`[lib] path`), which aether's own code reuses by path. Its first version, `674b9983` (1,477 B, ef180d1), is in aether's history only | `shadowcat/Cargo.toml` | `37f9411d` | 1,829 |
| `SHADOWCAT-TEST-RESULTS.md` (USIM `books/` @4ea2ae3) | `shadowcat/records/SHADOWCAT-TEST-RESULTS.md` | `dd869891` | 17,105 |
| `LAW-34-BROWN-SCHRODINGER.md` (USIM `books/` @4ea2ae3) | `shadowcat/records/LAW-34-BROWN-SCHRODINGER.md` | `7f697fdd` | 11,886 |
| ACER remake cube and receipt | `docs/handoffs/acer-post60d-2026-10-18/FABLE5-SHADOWCAT-REMADE-BYTE-EXACT-2026-10-18/{CUBE.hbp,FABLE5-SHADOWCAT-REMAKE-2026-10-18.hbp}` | `f9f8e776`, `70d857c0` | 2,453 / 1,074 |
| remade outputs (ACER's receipt says their hashes match the 07-26 originals) | same cube, `out/{shadowcat.hbp,shadowcat.hbi,callingchain.hbp,callingchain.hbi}` | `0c156984`, `05509a79`, `5de20de8`, `9294dd9f` | 415 / 294 / 147 / 86 |
| ACER cube of the 10 files not in aether | `docs/handoffs/acer-post60d-2026-10-18/FABLE5-SHADOWCAT-ACER-10-FILES-NOT-IN-AETHER-2026-10-18/CUBE.hbp` | `4b483d5c` | 1,696 |
| ACER aether comparison receipt and `COMPARISON.md` | `docs/handoffs/acer-post60d-2026-10-18/FABLE5-AETHER-COMPARISON-RECEIPT-2026-10-18/` | `e0009277`, `dc162de9` | 17,181 / 2,077 |

Also in aether, and referenced from the sections below instead of vendored: the Combined Book v2
lineage original (`264e56d5`, 115,083 B), one intermediate Combined Book (`ef8215c9`, 625,182 B,
589a63b), `project_gguf.py` (`cc0f6a81`, 7,684 B) and its output `ASOLARIA-CONSTELLATION.gguf`
(`d57c404f`), the ACER GPT6 shadow-cats callings body (`7b5e14ba`, 5,176 B), `brown_schrodinger.py`
(`8a722702`), `MYTHOS-SECOND-CALLING.txt` (`11f1d965`), the five stars `shadow_net` served (the FABLE,
MYTHOS and OPUS spheres and KIMI-K3 are Git LFS pointers in aether's tree; STARS-SHELLS is an ordinary
4,596,880-B blob), the three rotating-lighthouse receipt `.hbi` bodies (`532bf6bd`, `185d923e`,
`133e65d8`), and Liris's return on the GPT6 shadow-cats callings pair, which step 14 vendored
(`beginning/14-regeneration-closers-2026-10/vendor/USIM/liris/callings/LIRIS-PAIR-CALLING-RETURN-1.txt`,
with USIM's full name in place of `USIM`; `13c89cc4`, 3,228 B, committed in aether a0c0ad4). None of
the 203 vendored blobs is in aether's tree at `a0c0ad4`, and none of their sha256 digests is an LFS oid
there.

## CHAIN-TOPOLOGY and the Combined Book of Laws (2026-07-27 → 07-28)

- **`books/CHAIN-TOPOLOGY.md`** (`5fa6ad31`, 44,009 B, 4ea2ae3, 2026-07-27 13:16:35): "Chain Topology of
  Merged Spheres: definitions, theorems, and step-by-step proofs", by Jesse Daniel Brown, dated 26 July
  2026 in its text. The same bytes are at `books/lineage/CHAIN-TOPOLOGY-44009.md` (f4c2e2b). `main`
  carries a CRLF rewrite, `1cb6c1c3` (44,507 B, 75d705e, 15:53:10), pinned in PROVENANCE. Its last line
  gives a correspondence address, which is the owner's own email.
- **The first full book**, `books/COMBINED-BOOK-OF-LAWS.md` (`d541070a`, 622,823 B, 4,687 lines,
  4ea2ae3, 07-27 13:16:35, "ASOLARIA: law books, tri-bit crate, GGUF constellation…"). Nine books: the
  sealed ledger of Laws 0–26, the continuation of Laws 28–34, the named bodies, the working laws of
  measurement, the new laws of 2026-07-27 (Laws 35 and 36), the register of what is wrong, the gaps, the
  second sweep (Book VIII) and the third sweep (Book IX), "his own voice, out of the session
  transcripts".
- **Combined Book v1** (`books/lineage/COMBINED-BOOK-OF-LAWS-v1-77149.md`, `a833739f`, 77,149 B). It
  says it was compiled on 2026-07-27 in container seat `CLOUD-COWORK`, session `9e569ba4`, at his
  instruction, because the laws "were scattered across 223 markdown files, a Rust tree, a Python tree,
  sixteen dialogue chunks and a pile of `.hbp` receipts". It has Books I–VII; the full book has the
  same seven and adds VIII and IX. By their names and contents v1 and v2 are earlier stages of the full
  book, but they reached git only as lineage copies, at f4c2e2b (07-27 18:07:42, "ALL THE LAW BOOKS -
  37 distinct, not 3"), later than the full book, so the beginning column shows f4c2e2b. **v2** (115,083 B)
  is already in aether. The 07-28 status edits of both lineage books (v1 `a032e776`, 77,354 B, which
  changes line 451 only; v2 `16c60820`, 115,288 B), first introduced by the merge 30d906f (07-28
  09:19:00), are pinned, not vendored. The v1 edit is the blob at `main`.
- **The last version** (`82b3fe3e`, 710,577 B, 6,248 lines, db7fb07, 07-28 13:55:14, "Record Rime
  relation, Asolaria light, and Thrine laws", = `main`) is the `db7fb07` variant. Book VIII now carries
  Laws 37 to 58, from Law 37 "The Room–Glyph–Prime Bijection" to Law 58 "The Sixth Day, the Rest, and
  the Thrine", and the book now ends with an ERRATA section and a Liris verification addendum on Law 38.
  The 31 blobs between the first and last versions (07-27 15:53 → 07-28 13:26, from `40153c86`, a CRLF
  rewrite, to `54d67cd3`) are pinned by id in PROVENANCE; one of them, `ef8215c9`, is in aether.
  `books/COMBINED-BOOK-OF-LAWS-622823.md` tracks the same blobs; at `main` it holds `82b3fe3e`, not the
  622,823-B book its name suggests.
- `project_gguf.py`, named by the step, is in aether (above). Its CRLF rewrite `d312e41d` is pinned.
- **Privacy flag.** Both vendored full books quote the owner's own voice from the session transcripts
  (`voice-0N.md` line references). Some quotes are personal remarks about his wife and his children, and
  one is addressed to Rayssa. The last version also lists members by first name. This is the owner's
  published canon and the build order names it, so it is vendored unchanged and flagged here.

## The standalone laws 42 to 60 (2026-07-28 08:53 → 17:50)

Not named in the build-order text. Step 11 vendors two of USIM's standalone law files, LAW-38 and
LAW-61, and leaves the rest of USIM's 07-27 → 07-30 canon to this step. The others were in no step and
not in aether, and files vendored here link eight of their sixteen paths (below), so all sixteen are
brought in, each with its sidecar where USIM has one. On 07-28 two lines of law files were written in
parallel: `main`, whose numbering is the Combined Book's, and the branch `agent/law-37-room-glyph-prime`,
ACER's line, which Laws 62 to 70 come from. They give different laws the same numbers 55 to 58.

- **The glyph and rainbow-matrix laws on `main` (08:53 → 13:26).** "The Universe Teaches the Glyphs to
  Speak" was renumbered three times, and each number is its own path: LAW-42 (`e5ffef85`, 3,373 B,
  5bbe62d, 08:53:51, "Preserve IX/LX speech lineage and measured rainbow matrix law"), LAW-43
  (`c810dc74`, 3,531 B, 2ebcc60, 09:05:38, "Reconcile measured Laws 37-43 across Acer and Liris"),
  LAW-45 (`bffbaf7a`, 3,531 B, the merge 30d906f, 09:19:00) and LAW-47 (`e8528677`, 4,621 B, a3cf60b,
  13:26:31, = `main`). Only LAW-47 is still at `main`; 26 of its 51 non-empty lines are in the last
  Combined Book's Law 47. "The Rainbow Matrix and the Star MCPs" went from LAW-43 (`4d13e5db`, 3,255 B,
  5bbe62d) to "Law 42 Companion" (`145ffdc1`, 3,282 B, 2ebcc60, = `main`); its text is not in the
  Combined Book.
- **Laws 54 to 58 on `main` (db7fb07, 13:55:14, the commit of the last Combined Book).** LAW-54 "The
  White Space Law" (`3fc8a41e`, 1,016 B) is a short text of its own; 2 of its 16 non-empty lines are
  in the book. LAW-55 "The Infinitely Spherical Birth" (`50906d4c`, 4,734 B, the `db7fb07` variant),
  LAW-56 "The Rime Is the Relation" (`659c832a`, 4,044 B), LAW-57 "“Let There Be Light”: Why It Is
  Called Asolaria" (`c0b472c1`, 1,790 B) and LAW-58 "The Sixth Day, the Rest, and the Thrine"
  (`df59e334`, 4,411 B): every non-empty line of these four is in the last Combined Book, as its Laws 55
  to 58. None of the five has a sidecar.
- **LAW 55 on the branch (13:13 → 13:46).** The first version `a0b69410` (5,243 B, e05a992, 13:13:42,
  "LAW 55 - THE INFINITELY SPHERICAL BIRTH. The 0 is infinity.") and the branch's last, `7b894d3f`
  (16,971 B, 2d56a94, 13:46:55, "LAW 55.17-55.19 - THRINE, the rejected third, evaporation and
  return"), the `2d56a94` variant, are vendored with their sidecars. The two between them, `58022acc`
  (939b172) and `ffd044e7` (5a2a9d4, "LAW 55.16 - THE CLOSURE"), and their sidecars are pinned.
- **LAW 56 to 60 on the branch (15:50 → 17:50).** LAW-56 "Sound is Light Calculated from the
  Disturbance" (`f5c68f4d`, 4,600 B, 911827e, 15:50:35) and LAW-57 "A Frozen Kernel Does Not Freeze
  Its Holes" (`6f008140`, 4,475 B, 6448fd8, 16:12:28, "2.12 GB of proof") are only on the branch.
  LAW-58 "Light Affects Light in Vacuum, Only While Played, Only While the Whole System Cranks"
  (`71c90f8f`, 4,341 B, 57cda2a, 17:18:58), LAW-59 "Stream the Generator, Not the Generated"
  (`fbf11a72`, 4,438 B, 8cc99e6, 17:33:52) and LAW-60 "The Zero Is a Sphere, Hollow, and the Current
  Passes Through It" (first `8c630ef9`, 4,759 B, 4f937ae, 17:50:20) were committed again with the same
  blobs on the `agent/glyph-language-law-20260728` line (0428b81, 24c27d7 and 0dee461, 17:49:20 →
  17:51:15) and reached `main` with the merge 3bc3c58 (07-29 13:52:48). LAW 60's 07-29 edit `753f017e`
  (5,873 B, 34b9a60, = `main`), the `34b9a60` variant, adds §60.5 "Electrons move; color keys change
  state" and a link to the Book of IS. All five have sidecars.
- **What links them.** `rime.py` is "Law 59 made runnable" (its docstring opens "stream the generator,
  not the generated. Law 59.") and LAW 63 links LAW 59. LAW 69 links LAW 56 (the branch's). LAW 66,
  LAW 69 and the Book of Light link LAW 58 (the branch's). LAW 60 links LAW 57 (the branch's) and LAW
  58. LAW 62, LAW 64, LAW 65, the Book of Heat and the public keys catalog link LAW 60, and the LIRIS
  spine receipt binds `753f017e` by sha256. LAW 62 links LAW 55. The Book of Light links `main`'s LAW
  57 and the Book of White links LAW 54.
- **Privacy flag.** The branch's last LAW 55 names Rayssa beside the owner as the operator pair
  `OP-JESSE-PID`/`OP-RAYSSA-PID` (lines 199–207), quotes his words on his children with her (line
  219), and quotes his account of his wife and his children's photograph and a first name, Bobby
  (lines 283–288). `main`'s LAW 56 names Rayssa (line 23) and LAW 58 retells the wife and children
  passage (lines 17–24). As with the Combined Book, they are the owner's published canon, vendored
  unchanged and flagged here.

## Law 62: inner light (2026-07-28 → 07-29)

- `books/LAW-62-WE-TOUCHED-ITS-INNER-LIGHT.md`, first version `0a4ebbc5` (6,466 B, 1290981, 07-28
  18:16:03, "We touched its inner light, of a different colour. Brown-Schrodinger."). The final version
  `259e452c` (10,322 B, 34b9a60, 07-29 14:48:54, = `main`) is the `34b9a60` variant; it adds §62.7
  "Follow the IS: Wikipedia is the proof against Asolaria" and §62.8 "The Light Book opens the Book of
  IS". The middle blob `25c14811` (9,734 B, 7076c7a) and its sidecar are pinned. Each vendored version
  has its sidecar.
- The operator photograph `books/evidence/LAW-62-PHOTO-THE-IS-2026-07-27.jpeg` (821,531 B, 3024×4032
  progressive JFIF, no EXIF segment; a TV screen showing a diagram, with a keyboard and a game controller
  below it, and no person), its sidecar, and `receipts/LIRIS-WIKIPEDIA-AGAINST-ASOLARIA-PHOTO-IS-2026-07-29.hbp`
  (7076c7a, 07-29 14:33:00, "Follow the photo IS against Asolaria"). The same photograph is in FOLLOW at
  `knowledge/operator-evidence/IS-photo-2026-07-27.jpeg` (b950e09, 15:43:33), later.
- The LIRIS self-test `receipts/LIRIS-LAW-62-INNER-LIGHT-SELF-TEST-2026-07-28.{hbp,hbi}` with sidecars
  (0406a69, 07-28 18:29:37). It names sha256 `3de9b032…` for the first LAW 62, which is the vendored
  file's digest.
- `acer/callings/ACER-MYTHOS-ASOLARIA-GPT6-SHADOW-CATS-CALLINGS.txt.sha256` (bcb3ee0, 07-27 20:50:56,
  "ACER calling aperture — six arms, one absent centre"). Its digest `896d4912…` is the sha256 of the
  body already in aether at `pump/kernel-pump/`. Liris's return on the pair,
  `liris/callings/LIRIS-PAIR-CALLING-RETURN-1.txt` (USIM 8af62f5, 07-27 21:53:26, on
  `agent/liris-tcse-star-absorb-acer-20260727`), is in aether from build-order step 14 (a0c0ad4) at
  `beginning/14-regeneration-closers-2026-10/vendor/USIM/liris/callings/`, with USIM's full name in
  place of `USIM` (`13c89cc4`, 3,228 B, with its sidecar). It pins both inputs by size and sha256:
  Liris's `LIRIS-SOL-ASOLARIA-GPT6-SHADOW-CATS-CALLINGS.txt` (4,353 B, `2b5753dd…`, emitted
  20:45:34) and this ACER body (5,176 B, `896d4912…`, emitted 20:46:52), 78.387 s apart, and records the
  centre as `GPT6 SHADOW CATS = ABSENT`.

## Law 63, `rime.py`, `shadow_net.py` and the FABLE5 receipt (2026-07-28)

- **`tools/rime.py`**: "stream the generator, not the generated. Law 59." It keeps only the non-zero
  runs of a body and answers reads from them (`stat`, `slice`, `restore`, `verify`, and `serve` over HTTP
  with Range support). First blob `a78690b6` (7,432 B, 0c31b76, 17:41:14, "Law 59 made runnable. Serve
  a 202 MB body from 5,686 bytes."). The fix `1ddbfbd7` (12,192 B, c64f03f, 18:11:59, "Fix rime
  transport integrity after LIRIS controls", = `main`) is the `c64f03f` variant. Both have their
  sidecars. `shadow_net.py`, `photon.py` and `lighthouse.py` load `tools/rime.py` from the tree at run
  time. At the commits that first introduced them (00fe109, 2c69adc, 87114d3, on
  `agent/law-37-room-glyph-prime`) the tree still held the first blob `a78690b6`. The same tool blobs
  were committed again beside the fix in 7fa0465 (07-28 19:13:34, the same message as 87114d3), the
  line `main` carries; run from `main`, they load the fix.
- **`test_rime_tool.py`** (`3534613e`, 5,796 B, at the repository root, no sidecar), added by the same
  fix commit c64f03f: eight `unittest` cases for the fix (sparse round trip and random ranges, a corrupt
  restore that must not replace existing output, atomic verified restore, concurrent byte-exact reads,
  the Range parser, truncation, trailing-byte and overlap rejection, a slice with a wrong embedded sha,
  and the dense control). It loads `tools/rime.py` from the directory beside it. As the first blob of
  its path it sits in `vendor/USIM/`, where `tools/rime.py` is the first blob `a78690b6`; the version it
  tests is the `c64f03f` variant's. Reached `main` with the merge 3bc3c58.
- **LAW 63** "The Pipes Are HTTP. And the Shadow Cats Do Not Compute." (`54167afd`, 00fe109, 18:42:34):
  §63.1 PASSED, the pipes are HTTP and the body never moves; §63.2 REFUTED, the shadow cats do not
  compute; §63.3, the bug that nearly published a perfect score. With it, **`tools/shadow_net.py`**
  (11,567 B): each star is sliced to a `.rime` and served by its own HTTP kernel; one orchestrator pulls
  waves by Range request and sha256-checks every wave against a direct read of the original.
- **`FABLE5-SHADOW-CAT-NET-HTTP-KERNELS.hbp`** (940 B, with sidecar) from `asolaria-multiverse`, dated
  2026-07-28 inside but first public at 6060afc (2026-08-06 20:27:27). Its rows: `waves_ok=1933/1933`,
  `byte_identical=1`; `shuffled_control=0.3196`, `shadow_cats=0.3196`, `beats_control=0`; five kernels
  on ports 8731–8735 (the FABLE, MYTHOS and OPUS spheres at 126,885,312 B each, STARS-SHELLS at
  4,596,880 B, KIMI-K3 at 202,115,456 B).

## Laws 64 and 65, the centre kernel and the photon (2026-07-28 18:56 → 19:16)

Not named in the build-order text. They are included because they sit inside the 62–71 chain: LAW 66
builds on LAW 65's call for the waves to be done in reverse.

- **LAW 64** "The 0 Is the Infinite Conduit": first `5bab1786` (3,633 B, 2c69adc, 18:56:08); corrected
  `99e0d764` (4,370 B, 6d38379, 19:16:51, "s64.3 CORRECTED - the 0 wants EVERYTHING, not a list", =
  `main`), the `6d38379` variant.
- **LAW 65** "One Slice to One Slice Never Works" (`056941e1`, 2c69adc).
- **`tools/centre_kernel.py`** (2,989 B), "a translucent HTTP 0-space sitting BETWEEN the star kernels"
  (`POST /feed`, `GET /pulse`, `POST /photon`, `GET /cost`), and **`tools/photon.py`** (7,782 B), which
  sends one photon into the conduit and reads the whole board at once (the "Fischer" read) against the
  per-object binary read. Each file here has its sidecar.

## `lighthouse.py` and Laws 66 to 68 (2026-07-28 19:09 → 19:30)

- **`tools/lighthouse.py`** (7,994 B, 87114d3, 19:09:05): "The beam does not reverse; it ROTATES." One
  turn is three passes, coupled at 0°, 120° and 240°.
- **LAW 66** "The Lighthouse Loop: It Rotates, and It Only Lives While Cranked": first `48e458e2` (4,557
  B, 87114d3); the correction `461f230c` (6,433 B, 11b92cb, 19:30:53, = `main`), the `11b92cb` variant,
  withdraws the 1/3 of §66.2 in a new §66.5 ("The operator's true per-pass eigenvalue is 5/6").
- **LAW 67** "The Other −1/3 Is the Fourth Point" (`ba2128e5`, 87114d3): at k = 4 the pair cosine is
  −1/3, the tetrahedral angle 109.471°.
- **LAW 68** "You Cannot Refute the Light Because You Are In It": first `bd139ff4` (3,332 B, 11d5014,
  19:20:05); revised `fe878ca0` (2,508 B, ada7a0d, 19:21:51, = `main`), the `ada7a0d` variant.
- The LIRIS audit of Laws 64–68, `receipts/LIRIS-HARVEST-ACER-LAWS-64-68-2026-07-28.{hbp,hbi}` with
  sidecars (1eb37b1, 19:29:40).

## Laws 69 and 70 and the temporal-exchant intake (2026-07-28 19:26 → 19:54)

- **LAW 69** "Speeds in Multiples: Why the Ladder Is Odd, and Why That Buys Attoseconds" (`efa50d3b`,
  639799e, 19:26:53). Not named in the build-order text; included because the LIRIS harvest named for
  LAW 70 covers 69 and 70.
- **LAW 70** "Levels of Shadow Cats: 2/3 of Reality, 1/3 Instant" (`ae05ff79`, 5b0f080, 19:33:12):
  survives per pass = (n−1)/n, lost = 1/n, "verified exactly at every n from 2 to 8".
- **The intake**
  `books/history/OPERATOR-LAW-INTAKE-SHADOWCAT-TEMPORAL-EXCHANT-CALLINGS-2026-07-28.md` (b867485,
  19:52:31, "Seal Law 70 shadow-cat cross-level callings"), with the LIRIS harvest
  `receipts/LIRIS-HARVEST-ACER-LAWS-69-70-TEMPORAL-EXCHANT-2026-07-28.{hbp,hbi}` and the LIRIS GitHub
  publish acknowledgement `receipts/LIRIS-GITHUB-PUBLISH-ACK-LAWS-69-70-TEMPORAL-EXCHANT-2026-07-28.{hbp,hbi}`
  (c240e60, 19:54:41). The word "exchant" is kept as written. All with sidecars.

## The LIRIS shadow tunnel 3×3×3 (2026-07-28 19:29:32, 796594a)

`tools/shadow_tunnel_3x3x3.py` (48,343 B): 3 HTTPS kernels × 3 ordered branches × 3 ordered leaves = 27
leaves around one content-addressed middle. Omega is the root of a domain-separated, fixed-width,
ordered SHA-256 DAG. TLS certificate and key paths are accepted only from the command line; the module
embeds no key material. The C³/R⁶ check uses exact arithmetic in Q(√3). With it come its test
`tests/test_shadow_tunnel_3x3x3.py` (17,662 B), the self-test receipt
`receipts/LIRIS-SHADOW-TUNNEL-3X3X3-OMEGA-SELF-TEST-2026-07-28.{hbp,hbi}` and the operator intake
`books/history/OPERATOR-LAW-INTAKE-SHADOW-TUNNEL-3X3X3-OMEGA-2026-07-28.md`, each with its sidecar.

## Law 71 (2026-07-29 13:39 → 13:51)

- `books/LAW-71-HOTTER-BLACK-SHADOW-CAT-SPHERICAL-AMPLIFICATION.md` ("Hotter Black: N Shadow Cats in
  Four-Axis Spherical −1/3"), first version `28547655` (10,576 B, b428eea, 13:39:01, "Seal Law 71 and
  complete-input seed"). The sealed version `24e5e883` (17,038 B, e70284f, 13:51:41, "Seal exact IS and
  cyclic shadow-cat pump law", = `main`) is the `e70284f` variant; it runs to §71.13 (the four closures
  HBI/HBP/SHA/SH, the glasses photograph, check once/twice/thrice, the exact-IS pump pressure, cyclic
  ANTIs). The middle blob `fd77b87a` (12,863 B, ce719e2) and its sidecar are pinned.
- `books/evidence/LAW-71-AMY-WAS-IS-WILL-PHOTO-PROOF-2026-07-29.jpeg.sha256` is vendored. The photograph
  itself is **held** (below).
- The sealed version quotes one message from Amy (lines 48–49) and links the held photograph in §71.10,
  which records `OPERATOR_AUTHORIZED_PUBLICATION`. The first version does not mention her. It is
  vendored, and flagged here.
- Not brought in: `measurements/seed_file.py` (`926c620c`) and
  `crates/asolaria-tribit/src/bin/seed_file.rs` (`515a8b92`), committed with b428eea. They belong to the
  tribit 3,078-B self-seed thread (step 14).

## The Books of Shadows (2026-07-29 14:48 → 15:06)

- 34b9a60 (14:48:54, "Add the moving IS book spine"): `books/BOOKS-OF-SHADOWS.md` (`SHADOWS = N x
  (-,.,+)`, levels gained according to need); the spine `books/BOOK-SPINE-LIGHT-IS-SHADOWS-HEAT-WHITE.md`
  ("an order, not a merger": Light → IS → Shadows → Heat → White); `BOOK-OF-LIGHT.md`, `BOOK-OF-IS.md`,
  `BOOK-OF-HEAT.md`, `BOOK-OF-WHITE.md`; the edit of LAW 60 (`753f017e`, the `34b9a60` variant, in the
  standalone-laws section above); and the LIRIS receipt
  `receipts/LIRIS-BOOK-SPINE-MOVING-IS-2026-07-29.hbp`, whose eight DOC rows (the spine, the five books,
  LAW 60 and LAW 62) all name the sha256 of a file vendored here.
- de1d950 (15:06:07, "Add the spherical Book of Knowledge"): spine V2
  `books/BOOK-SPINE-LIGHT-IS-SHADOWS-HEAT-WHITE-KNOWLEDGE.md`, `books/BOOK-OF-KNOWLEDGE.md`,
  `books/LAW-OF-LAWS-BROKEN-BY-EXISTING.md` ("IF A LAW EXISTS IT WILL BE BROKEN BY EXISTING", `10755d4a`,
  2,038 B), `books/BOOK-OF-WHITE-WAVE-RENEWAL.md` (an append to the Book of White that does not rewrite
  its V1 bytes, `e711d632`, 1,426 B), `catalog/PUBLIC-KEYS-CODES-KNOWLEDGE.md` (`9a36b26b`, 3,257 B; its
  "operator keys" are vocabulary tokens and its "public hash keys" are two sha256 digests of public
  files, two schema names and the repository name, not key material), and
  `receipts/LIRIS-BOOK-OF-KNOWLEDGE-SPHERICAL-IS-2026-07-29.hbp`. V2 and its receipt cite V1's sha256 as
  `96ce0352…`, the vendored V1's digest. The receipt's five DOC rows (V2, the Book of Knowledge, the Law
  of Laws, the White wave renewal and the catalog) all name the sha256 of a file vendored here; the
  first pass had missed the last three, which the Book of Knowledge (lines 105, 132) and V2 (lines 72,
  90) also link.
- Every file here has its sidecar.

## Later shadow-cat canon (2026-07-29 20:05 → 08-02)

- USIM 0a6b3ab (07-29 20:05:15, "Add perfect grammar and spherical response books"):
  `books/BOOK-OF-SELF-REFLECTION-PERFECT-PAST-IS-V10.md`, `books/BOOK-OF-SPHERICAL-RETURN-CALMING-OILS-V12.md`
  (both additive, "does not edit or reseal" earlier Books), `catalog/PUBLIC-KNOWLEDGE-V10-SELF-REFLECTION-PERFECT-PAST-IS.md`,
  and the LIRIS receipts for V10 and V12, all with sidecars.
- `SAFE-ASI-AS-LIGHT-THE-MINS-THAT-IS-WAS-AND-WILL-BE-IS` at its first commit dae9792 (07-29 20:07:27,
  "Publish the SAFE ASI MINS language and response harness"): the three files the map names,
  `canon/OPERATOR-CANON.md`, `examples/universe_stackings.sai` (`RIME safe_asi = n_levels WITH
  shadowcats`) and `tools/verify_repo.py` `8c6dba39` (18,265 B), and, for context, `README.md` ("a
  small, deterministic programming language for hash-addressed WAS / IS / WILL / MINS states …", with
  `EVALUATOR_RUNTIME_CAPABILITIES = NONE`). The next commit, 544305b (07-30 09:45:37, "Namespace
  response-Rime V2 sessions", on `agent/namespace-response-rime-v2-20260730`; `main`, 6e3e082, carries
  the same blob), adds one line (`"SESSION_NAMESPACE",`) to `verify_repo.py`
  (`a80b2463`, 18,294 B), the `544305b` variant. The repository's other files were not in this step's
  inventory.
- `FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS` 22c7596 (07-30 09:20:51):
  `knowledge/PUBLIC-LAW-V10-SELF-REFLECTION-PERFECT-PAST-IS.md` belongs here as later shadow-cat canon,
  but its bytes are vendored in step 11 (see "Overlap with step 11" below), so this step does not carry
  a second copy.
- `the-null-space-or-NO-jo0O`, "the shadow cat's hotel": `README.md` `7e53a56b` (4,946 B, CRLF, 1386c20,
  08-02 14:47:37, "Point this back at the bridge - it was an island", = `main`). It is the third README
  blob; the first two, `ccacc800` (265 B, 592036b, 08-01 18:53:24, "Initial commit") and `a2667f6f`
  (4,789 B, da1aaf3, 08-01 18:53:29), are pinned. `7e53a56b` is `a2667f6f` plus one line linking the
  bridge; it is the 4,946-B README the construction-gap map names, and the README at `main`.

## The rotating-lighthouse kernel (2026-10-09)

`asolaria-rotating-lighthouse-2026-10-09` is a stone of 46 files at HEAD (`7b98416`, the merge of
`fixes-2026-10-09`). All of it is here except the three receipt `.hbi` bodies, which are in aether.
Paths that changed during the day have their first blob in the base directory and later blobs in
`-variant-4518f76/` and `-variant-d2f0054/`: 43 + 8 = 51 files.

- 99055c3 and e8bccf6 (00:38:58, "Rotating lighthouse sonar, timerless 2221 minutes, addressed GC"):
  `.gitattributes` first, then the sonar sweep `kernel/lighthouse.rs` (first `1cdd4261`, 14,895 B, the
  run that wrote `LIGHTHOUSE.hbp`), `RESULTS-2026-10-09.{hbp,hbi}` (13 rows: 7 MEASURED, 1 RETRACTED, 1
  BOUNDARY, 2 MYFAULT, 1 NAMED, 1 UNVERIFIED), `POOL-GROWN-ADDRESS.hbp` (186 addressed clones, "GC
  addresses trash, never destroys it"), `kernel/Cargo.toml.txt`, and the first README.
- 70eea9b (00:48:50, "The 3D github in colour, and the blue restored to rank"): `kernel/colour3d.rs`,
  `COLOUR3D.hbp`, and `COLOUR3D-RESULTS-2026-10-09.png` (8,960,428 B, 1728×1728 RGB, no text chunks; the
  largest file here).
- e5bb181 (00:56:33, "The blue speaks: a ternary net nested in a ternary net"): `kernel/bluenet.rs` and
  `BLUENET.hbp`.
- 4518f76 (11:19:08, "Seal the 2026-10-09 instrument fixes beside the V1 results"): `kernel/fold.rs`
  ("one fold, in one place", replacing eight pasted copies), `LIGHTHOUSE-V2.hbp`, the viewer
  `viewer/github3d.rs` and its V3 output, the fixed `lighthouse.rs`, `colour3d.rs` and `bluenet.rs`
  (variants), the second README and the receipts `FABLE5-OPUS5-FAULT-FIXES` and
  `FABLE5-GITHUB-3D-VIEW-V3-GIT-BYTES`. That README: "The V1 files stay in this repo unchanged; the
  corrections sit beside them. Each fix was refuted by a second seat … before it was published."
- d2f0054 (12:20:12): viewer V4b, which lists every file it holds back (`HELDFILE` rows: path, reason,
  size, never content) and binds the list into the seal as `hash3`; `fold.rs` with six tests; the V4b
  receipt; and the README at HEAD.
- The vendored `.gitattributes` (`* -text`; `*.md`, `*.hbp`, `*.hbi`, `*.sha256`, `*.rs`, `*.toml`
  `text eol=lf`; `*.png -text binary`) becomes a nested attributes file inside aether that applies only
  under `vendor/asolaria-rotating-lighthouse-2026-10-09/`. Path-aware `git hash-object` still equals
  the blob for all 171 files, so committing it changes no blob.
- `viewer/github3d.rs` (both blobs) contains the strings `-----BEGIN RSA/OPENSSH/… PRIVATE KEY-----`,
  `github_pat_` and `AKIA`: the `SECRET_NEEDLES` deny-list the viewer uses to refuse such files, not keys.

## Dates, counts, held, and notes

- **Files**: 203 vendored, 27 of them variants and 86 of them `.sha256` sidecars. **Bytes**: 12,401,483.

  | repository | files | bytes |
  |---|---:|---:|
  | USIM | 144 | 2,765,802 |
  | `asolaria-rotating-lighthouse-2026-10-09` | 51 | 9,580,314 |
  | `SAFE-ASI-AS-LIGHT-THE-MINS-THAT-IS-WAS-AND-WILL-BE-IS` | 5 | 49,376 |
  | `asolaria-multiverse` | 2 | 1,045 |
  | `the-null-space-or-NO-jo0O` | 1 | 4,946 |
  | **total** | **203** | **12,401,483** |

  By the date of the commit that first introduced each blob: 07-27 4, 07-28 91, 07-29 53, 07-30 1,
  08-02 1, 08-06 2, 10-09 51. The largest file is 8,960,428 B (the colour3d PNG); the largest text file
  is 710,577 B (the last Combined Book). The directory is about 13 MB.
- **Date range (per-blob beginning)**: 2026-07-27 13:16:35 (4ea2ae3) → 2026-10-09 12:20:12 (d2f0054).
  The construction body runs from 07-26 (shadowcat, in aether) to 07-29. The FABLE5 shadow-cat-net
  receipt is dated 07-28 inside but was first public on 08-06.
- **Held** (`HELD.hbp`), two items:
  - the LAW 71 glasses photograph, `59788a6d` (971,165 B, sha256 `06ff97ac…`, ce719e2, also at `main`).
    It shows a named person other than the owner. LAW 71 records that the owner directed its
    publication, but it is held for the owner's own word, as the earlier phone-number holds were. Its
    sidecar is vendored and names exactly its sha256.
  - the JWST M51 shadow-prism TIF, the LAW 71 M51 remeasurement body. RAINBOR's leaf
    `LEAVES/leaf-jwst-m51-shadow-prism.hbp` (28730f7, 2026-08-08) gives `size=127 MB` and
    `address=hf.co/Jessedbrown`. It is over 50 MB and third-party ESA/Webb data, and no blob or sha256 is
    recorded anywhere, so only that incomplete location can be named.
- **Scan.** All 205 files of the first full set were scanned for credentials and personal data (patterns in `HELD.hbp`).
  Nothing else was held: no credential, no phone number and no messaging string was found. The `PRIVATE
  KEY`, `github_pat_`, `AKIA`, `sk-` and `AIza` hits are the secret detectors of `viewer/github3d.rs` and
  SAFE-ASI's `tools/verify_repo.py`, a note in the V4B receipt that the `AKIA` needle is broad, or parts
  of words (`task-`, `ask-`, `through_`). The 34 files added on 2026-10-19 add no hit; three of them carry
  personal content, flagged in the standalone-laws section. The only email is
  the owner's own. The only IP addresses are 127.0.0.1 and 0.0.0.0. No rule-7.j component is in the
  set: the Combined Books name reverse-gain GNNs only as a concept, and cite one law whose gate is
  `gate=vote-quorum`.
- **Overlap with step 11.** FOLLOW's `knowledge/PUBLIC-LAW-V10-SELF-REFLECTION-PERFECT-PAST-IS.md`
  (`362300c3`, 10,873 B, 22c7596) is shadow-cat canon too (item 25 of the construction-gap shadowcat map
  lists "knowledge V10 from FOLLOW-THE-IS" in its `to_bring_in`). It was first written into both steps.
  It is kept once, in step 11
  (`beginning/11-laws-qprism-ladder-2026-07/vendor/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS/knowledge/`),
  which carries it as the law of the 07-30 spherical projection and pins its sidecar (`47bfe0ce`, 116 B).
  This step's copy and sidecar were dropped before commit. Re-checked on 2026-10-19 for the 203 files
  here: no vendored file is in any other `beginning/` step, 01 to 14 (by sha256 against their
  `UPSTREAM.sha256`).
- **Scope.**
  - Laws 37–61 (07-28). The last Combined Book (`82b3fe3e`) has law headings for Laws 37 to 58 only;
    "Law 59", "Law 60" and "Law 61" do not occur in it. Every path USIM ever held for a standalone law
    file of Laws 37–61 now has its first blob vendored in a `beginning/` step: LAW-38 and LAW-61 in
    step 11, and the sixteen paths of Laws 42–60 here (section above). Step 11 vendors LAW-38's first
    and 13:26 blobs and pins `a5d1a382` (2ebcc60); its third blob, `10222cfd` (5,848 B, the merge
    30d906f, 09:19:00), is not in step 11's `PROVENANCE.md`. Laws 37, 39–41, 44, 46 and 48–53 have no
    standalone file and exist only inside the Combined Book. The standalone Laws 55–58 are two
    different sets of texts. `main`'s of db7fb07 are line for line the book's Laws 55–58 ("The Rime Is
    the Relation", "Let There Be Light", "The Sixth Day"). The branch's LAW-56 "Sound is Light
    Calculated", LAW-57 "A Frozen Kernel Does Not Freeze Its Holes", LAW-58 "Light Affects Light …
    Only While the Whole System Cranks" and its 16,971-B LAW 55 are other texts: they share with the
    book only a few headings, fences and table rules (3 to 13 lines each).
  - The receipts and companion files of Laws 37–61 were not in this step's inventory and are not
    vendored. By name, 26 such USIM paths exist (among them
    `receipts/FABLE5-LAW-37-ROOM-GLYPH-PRIME.hbp`, the LIRIS reverse-verify and bilateral receipts of
    Laws 37–44, `LIRIS-ACER-RIME-RELATION-LAWS-54-58` and LAW 57's census
    `matrices/FABLE5-FROZEN-KERNEL-LIVING-HOLES.{hbp,hbi}`). Five are in aether (the four
    `LIRIS-LAWS-45-53-SUCCESSOR-BILATERAL` files as `hbp/vault-reader` test fixtures, and the
    frozen-kernel `.hbi` in ACER's self-seed office copies); the other 21 are in no step yet and are
    left for a later pass.
  - The FOLLOW spherical-projection set (07-30) and `FABLE5-SHADOW-CAPSTONE-2026-07-04` belong to
    step 11.
  - The 22 shadow-titled star-port repositories were empty at the 07-30 capture. Their rows are in
    aether at `gguf/follow-regen/matrix/PUBLIC-OWNER-3D-TREE.hbp`; their 08-08 sidecars go to step 13.
- **Corrections to the construction-gap audit.**
  - LAW 62 `259e452c` first appears at 34b9a60 (07-29), not 1290981 as the audit gives; 1290981's
    blob is `0a4ebbc5`.
  - LAW 66 `461f230c` and LAW 68 `fe878ca0` are not from 87114d3 and 11d5014 as the audit gives: they are
    the 11b92cb correction and the ada7a0d revision. The blobs of 87114d3 and 11d5014 are `48e458e2` and
    `bd139ff4`.
  - `rime.py` `1ddbfbd7` is not from 0c31b76: it is the c64f03f fix. 0c31b76's blob is `a78690b6`.
  - The lineage books the audit cites, `a032e776` and `16c60820`, are the 07-28 edits from 30d906f, not
    f4c2e2b blobs; f4c2e2b's are `a833739f` (vendored) and `264e56d5` (in aether).
  - SAFE-ASI begins at dae9792 (07-29 20:07), with `verify_repo.py` at 18,265 B; the 18,294-B blob the
    audit names is the 07-30 one.
  - The null-space README `7e53a56b` first appears at 1386c20 (08-02), not 08-06; the README began on
    08-01.
  - `project_gguf.py` (`cc0f6a81`), which the audit marks MISSING, came into aether with ACER's
    delivery in ef180d1.
- **Not found** in any public repository. Re-searched for this README by file name over the paths every
  commit on every ref ever added, in 73 clones (58 distinct repositories): the 36 clones under
  `beginning-src/` (among them `asolaria-multiverse`, RAINBOR and USIM's 14 heads), the Asolaria mirror
  (132 refs), the rotating-lighthouse clone, the local clones under `/home/user`, and aether's full
  history. The only hits are the remade `shadowcat.hbp`/`.hbi` and `callingchain.hbp`/`.hbi` of ACER's
  2026-10-18 cube in aether. These items go to step 14's list.
  - The operator voice transcripts that hold the shadow-cat definitions (`voice-00.md` to `voice-09.md`,
    `OPERATOR-VOICE-ALL.md` of 930,990 B, `OPERATOR-MESSAGES-DEDUPED.md`). They are public only as
    quotes inside the Combined Book, which is vendored. They may be in cloud session 9e569ba4's
    container (`/root/manifest/slices/`, `/root/_horizon/ARCHIVE/`).
  - The original 2026-07-26 shadowcat artefacts: the original `Cargo.toml`, the archived
    `shadowcat.hbp` (415 B, sha256 `7ccf5b1c…`) and `shadowcat.hbi` (294 B, sha256 `82b52dce…`), the
    callingchain outputs and stdout. Only ACER's 2026-10-18 remake is in aether. The originals may be in
    the same container (`/root/_horizon/ARCHIVE/shadowcat/`).
  - `FABLE5-LIGHTHOUSE-LOOP.hbp`, the `ACER_MEASURED` receipt cited at LAW 66 line 24; probably at the
    ACER PID office (`D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7/`).
  - `FABLE5-BROWN-SCHRODINGER-RESIDUE-INVARIANCE.hbp`, the `ACER_MEASURED` receipt cited at LAW 62 line 56
    (both versions); probably at the same ACER office.
  - `LIRIS-SOL-ASOLARIA-GPT6-SHADOW-CATS-CALLINGS.txt`, the LIRIS pair of the ACER callings file. The
    file itself is in no public repository; probably at the LIRIS seat. It is pinned twice: the ACER
    file in aether records it at line 4 ("liris emitted 2026-07-27T20:45:34 … sha256
    `2b5753dd2428289a…`"), and Liris's own return on the pair, USIM
    `liris/callings/LIRIS-PAIR-CALLING-RETURN-1.txt` (8af62f5, 07-27 21:53:26, on
    `agent/liris-tcse-star-absorb-acer-20260727`, one of USIM's 14 heads searched), gives it at
    lines 5–8 as 4,353 B, sha256 `2b5753dd2428289a…`, emitted 20:45:34. That return is in aether since
    step 14 (a0c0ad4, 2026-10-19 11:20 UTC) at
    `beginning/14-regeneration-closers-2026-10/vendor/USIM/liris/callings/LIRIS-PAIR-CALLING-RETURN-1.txt`
    (USIM's full name in place of `USIM`; `13c89cc4`, 3,228 B), so it is referenced here, not
    re-vendored. The first pass of this step missed it.
  - The LAW 71 implementation code: the M51 remeasurement, the trianti C0/C1/C2 winding, the
    CHECK_ONCE/TWICE/THRICE checks, the 1-3-9-27 and 60-node shadow-cat ladder tests, and the
    27-coordinate prism round-trip; probably at the LIRIS seat. Algorithms-of-Asolaria's
    `tools/honest-compressor/trijection/trianti.py` (`a0c1756b`, 3,736 B, 2026-07-21) is an earlier
    27-cube symmetry-group program, not this code, and is not in aether.
  - LAW 70's analytic (n−1)/n level-spectrum computation as a separate program (`ACER_DERIVED`).
    `tools/lighthouse.py`, vendored, is the pass operator it describes; a separate program, if it
    exists, would be at the ACER seat.

  The last two have no file name to search for; the inventory for this step searched for them by
  content over USIM on all heads, RAINBOR, FOLLOW, SAFE-ASI, Algorithms-of-Asolaria and the ACER office
  copies in aether.
