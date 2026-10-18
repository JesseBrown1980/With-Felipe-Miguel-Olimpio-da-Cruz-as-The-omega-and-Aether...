# Provenance: asolaria-qr-read-int

## What this crate ports

The QR decoder inside the owner's colour QR page: the webpack UMD build of jsQR inlined in
`index.html` of `JesseBrown1980/the-colour-qr` @ `1938a9b076b8fc3e81d0a271ca05e84a0e938854`
(index.html:125-10226). That file is vendored byte-identical in this repository at
`qr/colour-qr/vendor/the-colour-qr/index.html` (git blob `8e25c7ebdbe3`, 272,097 B, sha256
`7b9a0830aa01efe770c8b69a4c5712069fba3a82eab7c00ab4dc2392379d573a`; see
`qr/colour-qr/PROVENANCE.md`). This crate vendors no file of its own; `check.sh main` checks the
page against that sha256 before it regenerates the tables from it.

The page names no jsQR version and carries no licence header. jsQR's own repository
(`cozmo/jsQR`) is licensed Apache-2.0, so this port of it is licensed Apache-2.0
(`Cargo.toml`); the licence text is the repository's `LICENSE-APACHE`. README "How the integer
reader follows jsQR" states every change made in the port.

| Rust module | jsQR in index.html |
|---|---|
| `src/bit_matrix.rs` | `BitMatrix`, 207-234 |
| `src/binarize.rs` | `binarize`, `Matrix`, `numBetween`, 509-624 |
| `src/locate.rs` | `locate` and helpers, 9817-10222 |
| `src/extract.rs` | `squareToQuadrilateral`, `quadrilateralToSquare`, `times`, `extract`, 9716-9815 |
| `src/binary64.rs` | the JS number arithmetic those two run (`+ - * /`, `Math.sqrt`, `Math.floor`, `Math.round`, `Math.abs`, comparisons, the `sort` comparator), IEEE-754 binary64 in integers; written for this crate, no upstream file |
| `src/decode.rs` | `decode`, `decodeMatrix` and helpers, 628-942 |
| `src/decode_data.rs` | `decode` (segments), `BitStream`, 944-1222 |
| `src/reed_solomon.rs` | `GenericGF`, `GenericGFPoly`, 239-443; Reed-Solomon `decode`, 8272-8399 |
| `src/lib.rs` (`read`, `scan`) | `jsQR`, `scan`, 446-506 |

## Generated from the page's lines

`examples/gen_tables.rs` reads these lines of the vendored page and writes the two table files;
`--check` (run by `check.sh main`) fails unless the files on disk equal what it writes.

| File | Table | index.html lines | Entries |
|---|---|---|---|
| `src/tables.rs` | `FORMAT_INFO_TABLE` | 652-685 | 32 |
| `src/tables.rs` | `AlphanumericCharacterCodes` | 1012-1018 | 45 |
| `src/tables.rs` | `VERSIONS` | 8407-9712 | 40 |
| `src/shift_jis.rs` | `shiftJISTable` | 1230-8268 | 7,037 (sorted by key; the page lists 0xA1-0xDF after 0x9FFC) |

## Test data

| File | What it is |
|---|---|
| `tests/corpus/mod.rs` | builds the 1,583 page-parity planes in integers from symbols the `qrcode` 0.14.1 crate draws (dev-dependency) |
| `tests/fixtures/JSQR-PAGE.hbp` | the page's own jsQR result on each of those planes, recorded by `tools/jsqr_page.py` in headless Chromium 141.0.7390.37 (Python Playwright 1.56.0), 1,583 rows plus header and summary; every point both as the page's decimal (`String(v)`) and as its binary64 bit pattern (`_bits`) |

No file here holds third-party personal data: the corpus text is generated filler, the README
sentence of the carrier and fixed short strings.
