# qr/qr-read-int: the owner's page's QR reader in integer Rust

This crate (`asolaria-qr-read-int`, lib `qr_read_int`) is the QR decoder that the owner's colour
QR page runs, jsQR (`the-colour-qr` @ `1938a9b` index.html:125-10226), ported to Rust 1.81 with
integer arithmetic only. It is the default un-generate read of `qr/colour-qr`.

Owner decision, 2026-10-17:

> Colour-QR decision: Option 2. Integer-only reader as the default, `rqrr` kept as a labelled
> secondary — same pattern as codec and Fischer. That keeps the repo's own law intact with no
> hidden float in the primary path.

The law it keeps (the-colour-qr README.md:5): "Rust 1.81 with clippy. Integer arithmetic and
ternary (trits) only — never float."

- `#![forbid(unsafe_code)]`, no dependencies. The only dev-dependency is `qrcode` 0.14.1 (no
  default features, no floating point in its source), which draws the test symbols.
- No floating-point type or cast in any of this crate's text files (`check.sh main` greps every
  one of them for the type names and `as f`), and no floating-point literal in any of its Rust
  files (`tests/no_float_literal.rs` reads every token outside comments, strings and character
  literals).
- Where jsQR computes JS numbers (points, distances, scores, the perspective transform), this
  crate holds each as its IEEE-754 binary64 bit pattern in a `u64` and computes every operation
  in integers with JS's rounding (`src/binary64.rs`), so it has the page's values bit for bit.
- Every table (format codes, versions and blocks, alphanumeric characters, Shift JIS) is
  generated from the page's own lines by `examples/gen_tables.rs` (PROVENANCE.md).

## Use

```rust
// One grey plane, row-major, one byte per pixel.
if let Some(code) = qr_read_int::read(width, height, &plane) {
    // code.text: jsQR's `data`; code.bytes: `binaryData`; code.chunks, code.version,
    // code.location (finder and alignment points), code.corners (JS numbers as `Dbl`), ...
}
```

`read` is `jsQR(data, width, height, {inversionAttempts: "attemptBoth"})` as the page calls it
on one plane (index.html:10242). The page hands jsQR `planeData(img, ch)`
(index.html:10230-10235): R = G = B = the plane value `v`. jsQR's grey for that pixel,
`Uint8Clamped(0.2126 v + 0.7152 v + 0.0722 v)` (index.html:545), is `v` for every `v` in
0..=255: the products and sums differ from `v` by less than 2^-40 and the clamp rounds to the
nearest integer. So the plane goes in as jsQR's grey matrix unchanged, and turning an RGBA image
into grey is not part of this crate.

## How the integer reader follows jsQR

| Step | Module | index.html |
|---|---|---|
| 8×8 block black points, 5×5 threshold, binarised and inverted matrices | `binarize` | 534-624 |
| finder (1:1:3:1:1) and alignment (1:1:1) quads from row runs; scores; best group; recentring | `locate` | 9817-10222 |
| perspective transform; one sample per module | `extract` | 9716-9815 |
| version and format information (BCH tables, at most 3 bits off), function-pattern mask, unmasking, codeword order, block de-interleaving, mirror retry | `decode` | 628-942 |
| Reed-Solomon over GF(256), primitive 0x11D, generator base 0: Euclidean algorithm, Chien search, Forney | `reed_solomon` | 239-443, 8272-8399 |
| segments | `decode_data` | 944-1222 |

Every step runs in the page's order with the page's control flow: the plane as binarised, then
inverted; up to two located positions (quad centres, then recentred); for each, the matrix as
read and then mirrored across its diagonal; the first that decodes is the result. A JS throw
outside the `try` around segment decoding ends the whole call with no result, as the page's own
`try { jsQR(...) } catch (e) {}` does (`Thrown`).

### Integer forms of jsQR's doubles

| jsQR computes | Here | Rounding |
|---|---|---|
| grey values and black points in `Uint8ClampedArray` (index.html:545, 568-591) | integer quotients | nearest, ties to even, clamp 0..=255 (`ToUint8Clamp`) |
| `undefined` reads past the end of a flat array (index.html:526-528), `NaN` sums and thresholds | `None` | `NaN` stores 0; `lum <= NaN` is false |
| `lum <= sum / 25` (index.html:613) | `25 lum <= sum` | exact |
| row-run ratios `abs(s - S/7) < S/7` etc. (index.html:10037-10049) | `abs(7s - S) < S` | exact; a double rounds across these bounds only where they are exact |
| quad width ratios `< 1.5`, `> 0.5` (index.html:10063-10064) | `2s < 3w`, `2s > w` | exact |
| every other number in `locate` and `extract`: quad centres, recentred points, `distance`, run lengths, `scoreBlackWhiteRun`, `ratioError`, `sizeError`, scores, `moduleSize`, `Math.round(distance / moduleSize)`, `modulesBetweenFinderPatterns`, the expected alignment position, `squareToQuadrilateral`, the adjoint, `times`, `mappingFunction` (index.html:9723-9813, 9826-10222) | `binary64::Dbl`, the binary64 bit pattern; the page's operations in the page's order | each `+`, `-`, `*`, `/` and `Math.sqrt` computed exactly in integers and rounded once to nearest, ties to even, as JS does; `Math.floor`, `Math.round`, `Math.abs` and comparisons exact, `NaN` and the infinities as IEEE-754 gives them: the page's value bit for bit |
| `Math.pow(v, 2)` (index.html:9826, 9960, 9990-9993, 10130) | `v * v` | as V8 computes it: V8 14.1 `src/numbers/ieee754.cc:35-37` (`math::pow`) and `src/base/ieee754.cc:2738` (fdlibm `pow`) both return `x * x` for an exponent of 2 |
| `sum(values)`, `values.reduce((a, b) => a + b)` (index.html:9827-9829) | left to right | as above |
| `Array.prototype.sort` with `a.score - b.score` (V8, stable) | `sort_by` (stable) on `Dbl::sort_order`: the sign of `a - b`, `NaN` read as 0 (ECMAScript SortCompare) | |

Between integer pixel points (the switch points of a run) the differences, their squares and
their sum are integers below 2^53, exact as JS numbers, so `distance` there is the square root of
the integer sum. The unit tests check `Dbl` against known bit patterns (0.1 + 0.2, 1/3,
`Math.sqrt(2)`, subnormals, overflow, signed zeros); `tests/page_parity.rs` checks every point
the page reports, bit for bit, on 1,583 planes.

### Where the two can differ

**Bounds.** Images wider or taller than `MAX_SIDE` (32,768 px) read as no symbol; jsQR has no
limit.

### Module centres on pixel edges

A symbol drawn at `px` whole pixels per module puts the centre of module `k` at `(k + 1/2) px`.
At an odd `px` that is half a pixel from every pixel edge. At an even `px` (2, 4, 6) it is a
whole number of pixels: every module centre lies exactly on a pixel edge, and `Math.floor` of the
mapped centre picks the pixel on one side or the other. The page's transform is computed in
doubles, and a value whose exact form is a whole number can come out a hair either side of it,
module by module (corners print like `362.99999999999994` and `2.0000000000000013`); the page
reads the pixel the double gives. Of the 6,208 corner coordinates the page reports on the
corpus, 558 (in 361 of its 3,104 corner points) print within 10^-9 of a whole number without
being whole (378 of 3,312 coordinates, in 244 points, on the first 838 planes);
`corner_coordinates_near_whole_numbers` in `tests/page_parity.rs` counts them.

This crate computes the same doubles, so it reads the same pixels. Its earlier form computed
the transform as exact rationals (and the square-root values in Q24 fixed point); an exact floor
always takes the pixel after the edge. Measured on the same corpus, that form gave a different
result from the page on 80 of the 1,583 planes: 78 of the 432 planes whose data-module pixels
are split at the module centre (section 10), `evennoise-057-v06` (4 px, the page reads at the
quad-centre location, that form only at the recentred one) and `nat-px2-1036-v04` (2 px, the page
reads version 4, that form reads nothing). All 80 are drawn at 2 or 4 px; on every other plane
the two forms gave the same result. The binary64 form gives the page's result on all 1,583.

The page's tables are taken as they are. Its `VERSIONS` entry for version 23 lists alignment
centres 6, 30, 54, 74, 102 (index.html:9088); the `qrcode` 0.14.1 encoder and the `rqrr` 0.10.1
decoder list 6, 30, 54, 78, 102. Measured: the page reads no near-full version-23 level-L
symbol drawn by `qrcode` (corpus rows `v23-L-full` and `v23-L-nearfull-px2`, `-px3`, `-px4`:
0 of 4), and reads versions 23 M, Q and H (rows `v23-M-full` and `v23-{M,Q,H}-nearfull-px{2,3,4}`:
10 of 10); this crate gives the same results on every one of these rows. `rqrr` reads the
level-L symbol.

### Segments

Modes 1 numeric, 2 alphanumeric, 4 byte, 8 kanji and 7 ECI are decoded as the page decodes them
(index.html:1075-1162). ECI is recorded as a chunk and does not change how later segments are
read. Every other mode indicator (3 structured append, 5 FNC1 in first position, 9 FNC1 in
second position, and the rest) is read and skipped, and the next 4 bits are read as a mode
(index.html:965-968 lists them as comments only). Mode 0 ends the data. Bits left after the last
segment that are not all 0 make the page's decode return `undefined`, so the symbol is not read.
A byte segment's text is its UTF-8 decoding (`decodeURIComponent`, index.html:1048-1053); bytes
that are not UTF-8 add bytes and no text. A kanji character's text comes from the page's Shift
JIS table, `U+0000` where it has no entry. An alphanumeric index above 44 or a numeric group above
999 throws in the page and reads as no symbol.

## Measured (rust 1.81.0, chromium 141.0.7390.37 headless, this host, 2026-10-18)

**Page parity.** `tests/page_parity.rs` reads the 1,583 planes of `tests/corpus` and compares
them with the page's own results recorded in `tests/fixtures/JSQR-PAGE.hbp`
(`tools/jsqr_page.py`, which hands each plane to the page's `planeData` and `jsQR`):

| corpus section | planes |
|---|---|
| versions 1-10 at every level; 11-40 at one level (two, L and H, where the version is a multiple of 3); 2-4 px | 80 |
| the eight masks | 8 |
| version 23 at levels L and M | 2 |
| segment modes (numeric, alphanumeric, kanji, UTF-8, not UTF-8, ECI 26 and 900, FNC1 first and second, mixed, structured append, mode 6, trailing bits, overflowing groups, counts past the end, corrupt ECI, unmapped kanji, empty) | 21 |
| orientation, inversion, mirror, contrast, illumination ramp, noise, offsets, quiet zones 0-2, flipped modules (versions 5 and 25) | 44 |
| box and nearest resampling to 66-94 % (versions 1, 2, 7, 15, 40) | 60 |
| projective warps (versions 1, 6, 20) | 15 |
| hard planes from a fixed sequence: warp, blur, contrast, ramp, noise (versions 1-10) | 600 |
| no symbol, tiny and one-pixel-wide planes | 8 |
| 9. version 23 at every level, near-full, at 2, 3 and 4 px (the symbols of `tests/symbols.rs`) | 12 |
| 10. even px (2 and 4), versions 2-10 at every level, data modules split at the module centre: the pixels past the centre (along x, along y, or both) take the module's colour and the others the opposite, or the other way round | 432 |
| 11. even px (2, 4, 6), versions 1-12, flipped modules, contrast and noise, from a fixed sequence | 300 |
| 12. one plane of a natural sequence (2 px, version 4, flipped modules, noise): `nat-px2-1036-v04` | 1 |
| **all** | **1,583** (`PAGE_PARITY|planes=1583|page_found=776|int_found=776|equal=1583`) |

Sections 10-12 are the even-pixel planes of the review of this crate (same sequences, names and
plane sha256s). Compared per plane: found or not, version, sha256 of the text and of the bytes,
chunk kinds, and the three finder points, the alignment point and the four corners, each
coordinate as its binary64 bit pattern, all exact. `check.sh page` re-runs the page on a freshly
written corpus and requires the same 1,583 rows: `JSQR_CHECK|planes=1583|equal=1`.

**Sensitivity.** `tools/sensitivity.py` makes each of these changes to a copy of the port, one at
a time, and runs the page-parity test (every change is an exact text replacement listed in the
tool). 10 of 17 change at least one plane's result; 7 change none, so the corpus does not pin
those details and they rest on the line-by-line port:

| change | planes that differ (of 1,583) |
|---|---|
| threshold `lum < t` for `lum <= t` | 3 |
| black point ties rounded up, not to even | 2 |
| `min / 2` rounded up | 1 |
| a `NaN` block stored as 255, not 0 | 162 |
| neighbour black point taken on `<=` | 0 |
| Bresenham error start truncated, not floored | 1 |
| `sizeError` left out of the score | 4 |
| `ratioError` one unit in the last place larger | 0 |
| recentred x rounded down, not to nearest | 2 |
| best group from the top 3 candidates, not 5 | 0 |
| group size term weighted 3/2 (`/ 2 L` for `/ 3 L` in run lengths) | 0 |
| alignment pattern used from 16 modules, not 15 | 0 |
| quad width ratio bound 2.0, not 1.5 | 0 |
| binary64 ties rounded away from zero, not to even | 296 |
| binary64 results truncated toward zero, not rounded to nearest | 595 |
| Euclidean loop stopping one degree early | 19 |
| version information accepted at 2 bits off, not 3 | 0 |

**Colour QR planes** (`qr/colour-qr`, where this is the default reader): all 24 planes of the 8
fixtures read as the page reads them and every payload comes back byte-exact; on the 80
resampled copies the integer reader and the page give the same result on 240 of 240 planes
(`check.sh resample` in `qr/colour-qr`).

**Tests.** `cargo +1.81.0 test --locked`: 20 pass (8 unit, 2 no float literal, 4 page parity,
6 symbols). Clippy `-D warnings` clean with no allowed lints.

## Lanes

- **Hot.** `qr_read_int::read`, in process, integers only, no dependencies.
- **Cold, CI verification only.** `tools/jsqr_page.py` runs the owner's page in headless
  Chromium through Python Playwright and reads and writes HBP rows; the JS it adds only reads
  the page's results and formats them (`String(v)`, and the binary64 bit pattern through a
  `DataView`). `tools/sensitivity.py` applies the "Sensitivity" changes to a copy of the crate
  and runs the page-parity test on each. Their Python is integer-only.

## Run

```bash
cargo +1.81.0 run --example gen_tables -- ../colour-qr/vendor/the-colour-qr/index.html --check
cargo +1.81.0 run --release --example corpus -- <dir>          # write the corpus planes (PGM)
PYTHON=<python with playwright> qr/qr-read-int/check.sh page    # the page re-reads the corpus
qr/qr-read-int/check.sh main                                    # pin, tables, fmt, clippy, tests, no float
python3 qr/qr-read-int/tools/sensitivity.py                     # the "Sensitivity" table
```
