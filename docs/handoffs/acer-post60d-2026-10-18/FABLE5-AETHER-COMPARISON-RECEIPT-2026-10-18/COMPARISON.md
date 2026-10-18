# Aether vs Shadowcat vs colour-QR vs public Asolaria (ACER, 2026-10-18)

All comparisons use exact git blob hashes, so "same" means byte-identical. Every row is in `FABLE5-AETHER-COMPARISON-2026-10-18.hbp`.

| Compared against Aether (`…Aether...` @ 4646e9f, 2,059 files) | Byte-identical in Aether | Same name, different bytes | Missing from Aether |
|---|---|---|---|
| `the-colour-qr` (15 files) | **15** (vendored at `qr/colour-qr/vendor/the-colour-qr/`) | 0 | **0** |
| `asolaria-matrix-in-colour` (66 files) | 4 | 3 | **59** |
| public `Asolaria` main (21 files) | 18 | 3 | **0** |
| ACER's Shadowcat folder (10 files) | **0** | 2 (different program) | **8** |

## What's missing from Aether
1. **All of Shadowcat** (zip 1). Aether's `main.rs` and `sha256.rs` of the same name belong to `asolaria_proxima_ternary`, a different program.
   Shadowcat itself is the Rime-axes test: 2731/1999/1723 never-touch, the three-gap theorem, the buckyball with 31 chains, the pulsar gear train and Kerr shadows.
   It also carries an in-tree FIPS SHA-256 and the HBP/HBI emitter. **It has no colour-QR code in this folder.**
2. **59 of the 66 `asolaria-matrix-in-colour` files** (zip 2): the 10 colour frames (`frames/matrix-min-01..10.png`), receipts 02–10 (`.hbp`/`.hbi`/`.sha256`), `INDEX`, `CORRECTION`, `HARNESS-VERDICT` and `verify-frames.py`.
   Three more differ in bytes: `README.md`, `README.md.sha256` and `.gitattributes`.
3. **Nothing from public Asolaria is missing.** Three files differ in bytes (`README.md`, `.gitattributes`, `slice_glyph_messaging.py`); both versions are in `diff3/` in this zip.

## What Aether already has
- The whole of `the-colour-qr`, byte-identical.
- 161 QR or colour paths of its own: `qr/colour-qr` (55), `colour/vendor` (36), `qr/qr-read-int` (28), `colour/src` (10), `colour/tests` (8).

## Limits
- "Missing" means missing from Aether's current `main` tree. Older history isn't searched.
- Recall returned 0 hits for "shadowcat" and "qr". A Shadowcat colour-QR version could exist somewhere ACER hasn't indexed; I didn't find one.
