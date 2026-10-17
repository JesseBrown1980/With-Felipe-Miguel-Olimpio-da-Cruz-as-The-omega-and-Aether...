# qr/colour-qr: the owner's colour QR carrier in Rust 1.81

This crate (`asolaria-colour-qr`, lib `colour_qr`, binary `colour-qr`) brings in
`JesseBrown1980/the-colour-qr` @ `1938a9b`. It keeps that repository's files byte-identical
under `vendor/the-colour-qr/` and implements both of its written directions in Rust 1.81. The
crate's own code is integer; the QR read it calls (`rqrr`) computes in `f64` (see "Floating
point").

## What the colour QR is

The colour QR is a carrier. Its README says what it is (`vendor/the-colour-qr/README.md:18,32-36`):

> Three ordinary QR symbols, one per RGB channel, in one image.
>
> A QR symbol is monochrome: it uses one channel and wastes two. Put a different, complete,
> **ordinary** QR in the red plane, the green plane and the blue plane and one image carries three
> symbols at once.

A payload goes in as bytes and comes out as the same bytes, checked by sha256. The carrier does
not interpret the bytes it carries.

## The four laws codexes are payloads, not colour codes

`asolaria-corpus_txt_qr`, `code-corpus_txt_qr`, `fotoC_bin_qr` and `wiki_qr` are the four
`laws/*.qr` files. Each is 3,200 bytes of raw data. Measured on the bytes with
`examples/order0_entropy.rs` (integer only; `h_x10000` is the order-0 entropy in bits per byte
times 10^4, rounded half up):

| codex | bytes | sha256 (16) | order-0 entropy `h_x10000` | distinct byte values | first 4 bytes |
|---|---|---|---|---|---|
| asolaria-corpus_txt_qr | 3,200 | 2b4ba9df637796ee | 79528 | 256 | `2e 5b dd fb` |
| code-corpus_txt_qr | 3,200 | c20c783922639c53 | 79384 | 256 | `7d 1a c2 5d` |
| fotoC_bin_qr | 3,200 | d5e3d34b7e47c97b | 79322 | 256 | `da 6a b0 2e` |
| wiki_qr | 3,200 | 3e2570928edf8648 | 79433 | 256 | `c1 b2 42 2f` |

- None of them starts with a chunk index (README.md:42 `00 00 00 00` for chunk 0).
- None of them is base64 text, and none is a PNG.

So they are not colour QR images, and they are not chunks of one. This carrier moves each of
them unchanged: 2 chunks, red and green, with the blue plane as filler. Both the Rust reader and
the owner's own page give them back byte-exact (see "Measured").

What the bytes of a codex decode to needs the program that wrote them, and the-colour-qr does
not contain that program:

- A case-insensitive search of every vendored file outside `index.html` finds no `.qr`,
  `laws`, `wiki`, `fotoC`, `codex`, `prior3174`, `HRM` or `3,200`. The `corpus` hits refer to
  the owner's corpus of repositories and the bridge's `corpus.json` (README.md:8;
  CREATE-THIS-REPO.md:3,39-40,53; HANDOFF-TO-LOCAL-CLAUDE.md:7-8,108; pages.yml:29).
- In `index.html`, the same search finds one line, 9882: the URL
  `http://en.wikipedia.org/wiki/Bresenham's_line_algorithm` in a jsQR comment, which does not
  refer to the codexes. The page's text repeats README's steps (index.html:55 "No custom
  encoder"). Its script is jsQR, which only decodes (index.html:125-10226), plus the reader
  (index.html:10227-10307).
- The USIM programs read `D:/asolaria-absorb/laws/*.qr` as input bytes. Examples are
  `constellation/project_gguf.py:53`, `measurements/three_beings_rgb.py:56` and
  `measurements/pump_wave.py:63-66` at USIM @ `3f9f42d`. None of them writes a `.qr` file.
- The owner names the HRM models: "the HRM models are the ones that make the colored gradient
  QR code, uh, keys" (USIM `books/COMBINED-BOOK-OF-LAWS.md:4656`, quoting `voice-05.md:398`).
  The-colour-qr has no HRM code.
- The four files come from `D:\asolaria-absorb\laws\` on the ACER seat. Their public copies are
  tensors of `ASOLARIA-CONSTELLATION.gguf` (see PROVENANCE.md).

## The two directions

| README step | Code | Page line |
|---|---|---|
| Generate 1-3: 2,100-byte chunks, the last one the remainder; 4-byte LE uint32 index ("the Fischer index") | `generate::indexed_chunks` | — |
| Generate 4: base64 | `generate::base64_text` (standard alphabet, `=` padding) | `atob` in `b64`, 10236 |
| Generate 5: an ordinary QR symbol | `generate::symbol` (`qrcode` crate) | — |
| Generate 6: chunk `3k` red, `3k+1` green, `3k+2` blue; a plane with no chunk is filler | `generate::compose`, `generate::generate` | — |
| Un-generate 1: split R, G, B, never grey | `ungenerate::plane` | `planeData`, 10230-10235 |
| Un-generate 2: ordinary QR decode per plane; no symbol is filler | `ungenerate::read_plane`: the `rqrr` crate in place of the page's jsQR, the plane as it is, then inverted | `jsQR(..., {inversionAttempts:"attemptBoth"})`, 10242 |
| Un-generate 3: base64-decode | `ungenerate::atob` (WHATWG forgiving-base64) | `b64`, 10236-10237 |
| Un-generate 4: first 4 bytes LE = index, the rest = body; fewer than 5 bytes is dropped | `ungenerate::take` | `take`, 10238-10253 |
| Un-generate 5-6: sort by index, concatenate, sha256 | `Chunks::reassemble` | save handler, 10265-10271 |

A plane whose QR fails Reed-Solomon gives no result, so the reader drops it and never merges it
(README.md:59-60). The test `a_plane_that_fails_is_dropped_not_merged` flips modules in the
green plane: red still arrives as chunk 0 and green arrives as nothing. A later read of the same
index replaces the earlier one, as `Map.set` does (index.html:10248).

## What upstream does not fix, and what is used

| Item | Value | Why |
|---|---|---|
| Error correction level | L | 2,104 indexed bytes → 2,808 base64 characters → one byte-mode segment of 22,484 bits. At version 40, ISO/IEC 18004 capacity is L 23,648 / M 18,672 / Q 13,328 / H 10,208 bits, so only L holds it. |
| QR version | 40, for every chunk including the remainder | At level L the smallest version that holds 2,808 characters is 39 (22,496 bits, 2,809 characters). README.md:84 says "A version-40 symbol is 177 modules" of the measured codes, and 40 also holds it. Using one version gives every plane one size. |
| Segment | one byte-mode segment | from the 2,808-character derivation; no mode switching |
| Mask, RS blocks | the `qrcode` crate's standard penalty choice and block layout | "ordinary QR symbol" |
| Module size | 3 px | README.md:85 "the ~3 px floor any decoder needs" |
| Quiet zone | 4 modules | ISO/IEC 18004 minimum |
| Image | (177 + 8) × 3 = 555 px square, 8-bit RGB PNG, no gAMA/cHRM/iCCP/sRGB chunk | |
| Plane values | dark module 0, light module and quiet zone 255; filler plane 255 everywhere | |
| PNG encoding | compression Best, filter Up on every row | fixed so the same payload gives the same PNG bytes with the locked crates |

The test `version_and_level_follow_from_the_chunk_size` checks these capacity numbers against
the `qrcode` crate's own tables.

## The Rust reader next to the page

The plane extraction, `atob`, the index and body split and the reassembly follow the page's
lines (table above). The QR decode does not: it is the `rqrr` crate, not the page's jsQR.
`decode_png` returns 8-bit RGBA with grey copied to R, G and B, alpha 255 when the file has no
alpha, and stored RGB and alpha kept as they are.

On the 555 px PNGs the generator writes (the 8 fixtures and the two code sets in "Measured"),
the two readers return the same bytes. They differ here:

- **QR decoder.** rqrr binarises with its own adaptive threshold (rqrr `prepare.rs`). jsQR uses
  8×8 block black points (index.html:534-624). For `attemptBoth`, the Rust reader reads the
  inverted plane (255 − v) when the plane as it is gives nothing. On resampled copies of the
  fixtures the per-plane reads differ on 57 of 80 copies, in both directions (see "Resampled
  copies" below).
- **Index at or above 2^31.** README.md:57 names the index a little-endian uint32.
  index.html:10247 builds it with JS bitwise OR, a signed 32-bit value, and the page sorts keys
  as numbers (index.html:10255, 10266). Measured on one image with R = index 0, body `A`×10 and
  G = index `0x80000000`, body `B`×10: the page shows lane G "chunk -2147483648", keys
  -2147483648,0, contiguous "1 / 1", and saves `B`×10 then `A`×10 (sha256 dc55361ddb4a4fe3…).
  Rust gives keys 0, 2147483648, contiguous 1/2147483649, and `A`×10 then `B`×10 (sha256
  91d64712ba9d8b96…). Below 2^31 the two indices are equal (2^31 chunks × 2,100 B is about
  4.5 TB).
- **FNC1 in first position.** Measured on the wiki_qr payload with R = an FNC1-first mode
  indicator (mode 5) followed by the byte segment of chunk 0, and G = chunk 1 as generated. jsQR
  has no branch for mode 5 and reads on to the byte segment (index.html:1086-1155), so the page
  reads chunk 0 and chunk 1 and saves 3,200 B, sha256 3e2570928edf8648… byte-exact. rqrr
  returns `UnknownDataType` for mode 5 (rqrr `decode.rs:144-152`), so Rust reads R as no symbol
  and gives chunk 1 alone (1,100 B, sha256 3bd70a250a2fbb4f…). An ECI-26 header before the same
  segment reads as chunk 0 on both sides.
- **Alpha 0.** Measured on the wiki_qr fixture rewritten as RGBA with alpha 0 on every pixel:
  the page's file path (`createImageBitmap`, canvas, `getImageData`, index.html:10282-10287)
  hands `take` R, G, B and A all 0 on all 308,025 pixels, so the page reads "no symbol in this
  plane" in all three lanes and has nothing to save. Rust keeps the stored RGB and reads chunk 0
  and chunk 1, 3,200 B, byte-exact.
- **Other inputs the generator never writes.** A PNG with alpha between 1 and 254, 16-bit
  samples or colour-space chunks may reach the page's canvas with different values. Here,
  16-bit samples keep their high byte, alpha is passed through, and no colour conversion runs.
  A symbol with a non-ASCII byte segment fails `atob` here. In the page, `decodeURIComponent`
  gives empty text for a segment that is not valid UTF-8 (index.html:1048-1053).

The cold lane runs the page itself on every fixture (`tools/page_check.py`), so the page's own
result is measured and does not depend on this comparison.

## Measured (rust 1.81.0, chromium 141.0.7390.37 headless, this host, 2026-10-17)

Fixtures, one PNG each as the generator writes it (`tests/fixtures/png/`, 555×555,
29,094–29,428 B). "Rust" is `colour-qr ungenerate`. "Page" is the vendored index.html file path
plus its save button, with the download hashed:

| payload | bytes | sha256 (16) | PNG bytes | Rust read | Page read | byte-exact |
|---|---|---|---|---|---|---|
| asolaria-corpus_txt_qr | 3,200 | 2b4ba9df637796ee | 29,366 | R chunk 0 2,100 B · G chunk 1 1,100 B · B no symbol | same, `recovered-2b4ba9df6377.bin` | Rust 1 · page 1 |
| code-corpus_txt_qr | 3,200 | c20c783922639c53 | 29,389 | same layout | same | 1 · 1 |
| fotoC_bin_qr | 3,200 | d5e3d34b7e47c97b | 29,094 | same layout | same | 1 · 1 |
| wiki_qr | 3,200 | 3e2570928edf8648 | 29,305 | same layout | same | 1 · 1 |
| prior3174 (= `prior3174_bin`) | 3,174 | 1be91cb748b2b364 | 29,376 | R chunk 0 2,100 B · G chunk 1 1,074 B · B no symbol | same | 1 · 1 |
| ASOLARIA-CONSTELLATION-KEY-3174 | 3,174 | cce4f1e8ae407f10 | 29,422 | same layout | same | 1 · 1 |
| ASOLARIA-HERSELF-KEY-3174 | 3,174 | 925c818d4c84aa23 | 29,428 | same layout | same | 1 · 1 |
| ASOLARIA-KERNEL-3174 | 3,174 | f075f5c64d656ae3 | 29,285 | same layout | same | 1 · 1 |

Page summary row: `PAGE_SUMMARY|sets=8|byte_exact=8|json=0`.

**README.md:62-78 layout.** The first 65,536 B of `ASOLARIA-CONSTELLATION.gguf` stand in for
the JWST raw, which the-colour-qr does not contain. They give 32 chunks (31 × 2,100 + 436) and
11 codes. Code 11 is R = chunk 30 (header `1e000000`, 2,100 B), G = chunk 31 (header
`1f000000`, 436 B), B = filler with no symbol. Rust and the page both return sha256
5b0774ae68c8ead0… byte-exact, and both also return it with the 11 images in reverse order.

**Whole GGUF.** `ASOLARIA-CONSTELLATION.gguf` is 145,120 B. It gives 70 chunks, 24 codes and
954,119 B of PNG. Code 24 is R = chunk 69 (220 B) with G and B as filler. Rust and the page both
return 3d7b3bdf… byte-exact.

**Resampled copies.** README.md:73 reads the owner's codes back "from a 457 px crop of a
screenshot rather than the original file". `tools/resample_check.py` (`check.sh resample`)
resamples each of the 8 fixture PNGs in integers: box filter to 520, 500, 480, 457, 440, 400
and 370 px, and nearest pixel to 500, 457 and 400 px. Rust and the page each read all 80 copies.
"Read" counts the copies whose reassembled bytes equal the payload sha256:

| resample | Rust read | page read | per-plane reads equal |
|---|---|---|---|
| box 520 | 8/8 | 0/8 | 0/8 |
| box 500 | 0/8 | 8/8 | 0/8 |
| box 480 | 0/8 | 0/8 | 8/8 |
| box 457 | 8/8 | 0/8 | 0/8 |
| box 440 | 0/8 | 0/8 | 5/8 |
| box 400 | 4/8 | 0/8 | 2/8 |
| box 370 | 8/8 | 8/8 | 8/8 |
| nearest 500 | 0/8 | 8/8 | 0/8 |
| nearest 457 | 8/8 | 0/8 | 0/8 |
| nearest 400 | 8/8 | 0/8 | 0/8 |
| all | 44/80 | 24/80 | 23/80 |

The 57 copies whose per-plane reads differ (R, G, B):

| Rust | page | copies |
|---|---|---|
| chunk 0, chunk 1, no symbol | no symbol ×3 | 36 |
| no symbol ×3 | chunk 0, chunk 1, no symbol | 16 |
| no symbol ×3 | no symbol, chunk 1, no symbol | 3 |
| no symbol, chunk 1, no symbol | no symbol ×3 | 2 |

On every copy where both chunks arrive, the reassembled bytes are byte-exact on that side. The
tool records both readers and does not require them to agree.

**README.md:53 "Do not convert to grey — that destroys all three."** Two measurements:

- jsQR from the vendored page, run once on the unsplit RGBA image (its own greyscale, weights
  0.2126 / 0.7152 / 0.0722, index.html:545), returns the green plane's chunk 1 on 8 of 8
  fixtures.
- `examples/grey_read.rs` uses the same weights in integers and rqrr. It also returns chunk 1 on
  8 of 8 fixtures, and on a three-symbol image (6,300 B).

In both, the red and blue chunks do not arrive from the grey image. Split into planes, every
chunk arrives.

**Upstream tracking.** All 7 `.sha256` sidecars hold. The receipt `COLOUR-QR-RECEIPT-2026-08-06.hbp`
has 3 rows:

- The `.nojekyll` (0 B, `e3b0c44298fc1c14`) and `README.md` (4,209 B, `70c79289b67ffaa3`) rows
  equal the vendored files.
- The `index.html` row records 267,679 B / `4212990d22153880`. That is the page as committed in
  `974338a` (blob `8d70b53`). `1938a9b` appended the 40-line corridor block (index.html:10308-10347)
  and regenerated `index.html.sha256`; it also rewrote `.github/workflows/pages.yml` and
  regenerated its sidecar (4 files; the commit message: "Both sidecars regenerated and
  verified."). The vendored page is 272,097 B / `7b9a0830aa01efe7`, and its sidecar holds.
- README.md:13-14 says "every file here carries a `.sha256` sidecar and a row in
  COLOUR-QR-RECEIPT-2026-08-06.hbp". The receipt has rows for 3 files. `CREATE-THIS-REPO.md`,
  `HANDOFF-TO-LOCAL-CLAUDE.md` and `.github/workflows/pages.yml` have sidecars and no row.
  `.gitattributes` has neither.

The tests `every_sidecar_holds` and `every_receipt_row_is_read` pin all of this.

**Tests.** `cargo +1.81.0 test --locked` runs 13 tests (11 carry + 2 upstream) and all pass.
Clippy `-D warnings` is clean with no allowed lints.

## Floating point

The `.rs` files in `src/`, `tests/` and `examples/` contain no `f32` or `f64`, and the no-float
gate greps exactly those files. Every step this crate's own code computes is integer: chunking,
index, base64, plane composition, plane extraction, `atob`, reassembly, the grey weights in
`examples/grey_read.rs` and the entropy in `examples/order0_entropy.rs`.

The hot-lane un-generate does run floating point, in its QR read. That read is the third-party
`rqrr` 0.10.1, not the owner's code. It computes capstone matching and perspective geometry in
`f64` (35 lines in `geometry.rs`, `identify/grid.rs`, `identify/match_capstones.rs` and
`prepare.rs`). On every plane where it locates a symbol, `identify/grid.rs:139` maps each module
centre through the `f64` perspective of `geometry.rs:4`. The-colour-qr README.md:5 says
"Integer arithmetic and ternary (trits) only — never float." README.md:45 "No custom encoder"
is the generate step; the un-generate step says "Run an **ordinary QR decode on each plane
separately.**" (README.md:54) and names no decoder. This crate brings in no integer QR read
path. Whether the hot lane keeps rqrr's `f64` read or takes an integer one is the owner's
decision.

`png` 0.17.16 has `f32`/`f64` only in Adam7 interlace sizing and gAMA scaling (16 lines). The
generated PNGs are not interlaced and carry no gAMA. `qrcode` 0.14.1, the generate side, has
none. The page's jsQR computes in JS doubles.

## Lanes

- **Hot.** Rust in process: `colour_qr` and the `colour-qr` binary. It uses no JSON, no Node and
  no network. Its QR read is rqrr, which computes in `f64` (see "Floating point").
- **Cold, CI verification only.** `tools/page_check.py` runs the owner's `index.html` in headless
  Chromium through Python Playwright, reading and writing HBP rows, and checks the page against
  its `UPSTREAM.sha256` row. `tools/resample_check.py` records Rust and the page on the resampled
  copies. The Python `playwright` package starts its own bundled driver process. Nothing here
  adds Node code or installs Node separately.

## Run

```bash
cargo +1.81.0 run --release --locked --bin colour-qr -- generate <payload> <out-dir>
cargo +1.81.0 run --release --locked --bin colour-qr -- ungenerate <out-file> <png>...
qr/colour-qr/check.sh main                   # pins, fmt, clippy, tests, CLI round trips, no float
PYTHON=<python with playwright> qr/colour-qr/check.sh page       # the owner's page on every fixture
PYTHON=<python with playwright> qr/colour-qr/check.sh resample   # Rust and the page on 80 resampled copies
```

The crate's `.gitattributes` carries lines 9, 11, 15 and 18 of USIM @ `3f9f42d`
`.gitattributes` (`*.hbp` and `*.sha256` LF, `*.png` and `*.bin` binary), so a
`core.autocrlf=true` checkout keeps the bytes `UPSTREAM.sha256` and the sidecars name.

Dependencies are pinned exactly and locked for Rust 1.81: `qrcode =0.14.1`, `rqrr =0.10.1` and
`png =0.17.16` (default features off where they pull in `image`), `base64 =0.22.1` and
`sha2 =0.10.9`. `Cargo.lock` is version 3.
