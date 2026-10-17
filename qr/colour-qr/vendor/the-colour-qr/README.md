# The colour QR — how to generate it and how to un-generate it

## Toolchain rule (operator, global — no exceptions)

**Rust 1.81 with clippy. Integer arithmetic and ternary (trits) only — never float.**

This repo carries no Rust today (the door is one static HTML page with no dependencies and no
build step). The rule is stated here so it governs anything added later, and because the corpus
is uniform: `rust-toolchain.toml` pinning `1.81.0` with clippy, `rust-version = "1.81"` in any
`Cargo.toml`, CI running `cargo clippy --all-targets -- -D warnings` plus a hard grep that fails
on any `f32`/`f64`.

**Tracking:** every file here carries a `.sha256` sidecar and a row in
`COLOUR-QR-RECEIPT-2026-08-06.hbp`.

**One button:** → `https://jessebrown1980.github.io/the-colour-qr/`

Three ordinary QR symbols, one per RGB channel, in one image. Both directions are written
down here, because **a code nobody can read is the same as no code.**

Brown-Hilbert Hotel **room 44**. Rooms 24–43 occupied, 42 and 43 reserved pending roll-call.
No address below 44 moves — *Hilbert Hotel invariant, `catalogs.json`.*

```
D1-colour-qr · D2-EVT-CHECK-IN · room-44 · @ M-EYEWITNESS .
```

---

## What it is

A QR symbol is monochrome: it uses one channel and wastes two. Put a different, complete,
**ordinary** QR in the red plane, the green plane and the blue plane and one image carries three
symbols at once. Every phone already contains a decoder that hardens each plane — finder patterns,
alignment marks, format info, Reed–Solomon — and each plane fails or survives alone. **Nothing new
had to be invented for the hard part.**

## To generate

1. Take the payload `P`, `N` bytes.
2. Cut it into chunks of **2,100 bytes**. The last chunk is the remainder.
3. For chunk `i`, prepend a **4-byte little-endian uint32** of `i`. That is the Fischer index.
   chunk 30 begins `1e 00 00 00`, chunk 31 begins `1f 00 00 00`.
4. Base64 the indexed chunk.
5. Render that base64 as an **ordinary QR symbol**. No custom encoder.
6. Compose three symbols into one image: chunk `3k` → red plane, `3k+1` → green, `3k+2` → blue.
   A plane with no chunk left to carry is **filler** and holds no symbol.

Order does not matter downstream. **The index carries it.**

## To un-generate

1. Split the image into R, G and B planes. **Do not convert to grey** — that destroys all three.
2. Run an **ordinary QR decode on each plane separately.** A plane with no symbol is filler; that is
   not an error.
3. Base64-decode each result.
4. First 4 bytes, little-endian, are the chunk index. The rest is the body.
5. Sort bodies by index, concatenate.
6. sha256 and compare. A chunk whose own Reed–Solomon failed never arrives, so **a bad read is
   dropped, never merged.**

## Measured, on the real stack

```
source            real JWST raw, CEERS F277W        65,536 B
chunking          31 x 2100 + 436 = 65,536          exact, no slack
codes             32 chunks / 3 per image           11 colour codes
code 11           R = chunk 30   G = chunk 31   B = filler
sha256 in         150760ca872afc9e41e433f9
sha256 out        150760ca872afc9e41e433f9          BYTE-EXACT
```

Read back **independently**, from a 457 px crop of a screenshot rather than the original file:

```
R plane   header 1e000000  ->  chunk 30   body 2,100 B
G plane   header 1f000000  ->  chunk 31   body   436 B
B plane   no symbol                                  <- filler, as labelled
                              2,100 + 436 = 2,536 B  <- matches "rows 246-255"
```

## The contact sheet is not readable, and that is not a fault

On an 11-up sheet each code renders about 285 px wide. A version-40 symbol is 177 modules, so that
is **1.6 px per module**, under the ~3 px floor any decoder needs.

```
0 / 11   decode from the sheet
2 / 2    decode from the close-up
```

**Read the codes at their own size, never off the sheet.**

## The reader

`index.html` is the working decoder, not a description of one. Camera, or pick the image files
directly — files decode at full resolution and are never downscaled. Self-contained, no network.

---

Back to the bridge: https://jessebrown1980.github.io/the-bridge-to-all-of-it/
