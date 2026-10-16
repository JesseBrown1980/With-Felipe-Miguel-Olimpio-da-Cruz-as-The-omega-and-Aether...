# HyperBEHCS + glyphs: instant slice → processed-slice messaging

The mechanism by which a slice becomes a processed slice with no loss and no search — Asolaria's version of a universe simulator's **slice-maker** and **renderer**. Fact-based; tagged per the root evidence discipline. E=0 — docs + a runnable proof, nothing fires.

## The claim, precisely
A discrete-slice universe must, every tick, **make** a slice (encode it), **transmit** it, and **render** it into the next processed slice — losslessly. Asolaria does this with **HyperBEHCS glyphs**: a slice is transcoded to glyphs, the glyphs *are* the slice's content-address, and rendering is the exact inverse transcode. Because the transcode is a **bijection at code rate 1.0**, the processed slice is reconstructed **byte-identically and immediately** — a deterministic unpack, not a lossy decompress and not a model run. That is what "instant slice to processed slice" means: the glyph already *is* the slice.

## The formula — `MEASURED`
- Bytes are base-`2^8` digits; glyphs are base-`2^10` digits — **of the same integer**.
- Exact packing at `lcm(8, 10) = 40` bits: **5 bytes ↔ 4 glyph-symbols**, remainder 0 (`2^40 = (2^8)^5 = (2^10)^4`).
- Round-trip is the identity map: `decode(encode(slice)) == slice`, sha256-identical (Q-PRISM `53023b6`; Rust == Python symbol-identical).
- Entropy invariant: `H(glyphs) = H(bytes)`; **code rate exactly 1.0**. The alphabet changes, the information does not. Shannon's bound `E[bits] ≥ H(X)` still holds — this is re-relation, not sub-entropy compression.

## Slice-maker → transmit → renderer
```
SLICE (bytes / content)
   |  slice-maker  =  encode to glyphs   (base-2^8 -> base-2^10 ; 5 bytes -> 4 glyphs)
   |                  + mint content-address  pid = sha256(slice)[:N]
   v
GLYPHS  =  the slice as base-1024 symbols, addressed at a coordinate in the 60-D HyperBEHCS tuple
   |  transmit  =  move the glyph on the Brown-Hilbert curve  (local hop; Hilbra = shared-key HBI/HBP sha transport)
   v
GLYPHS received
   |  renderer  =  decode glyphs to bytes  (inverse transcode, exact)
   v
PROCESSED SLICE  ==  original SLICE   (sha256-identical, code rate 1.0)
```

- **Slice-maker** = the forward transcode (bytes → glyphs) plus the content-address. The address is the glyph's *coordinate* — its "where" in the 60-D space (`D# = prime(n)^3`), not just its bytes.
- **Transmit** = moving the glyph across the fabric. Because addresses live on a Brown–Hilbert space-filling curve, "send to a neighbor" is a **local hop** (locality preserved). Secure transport = **Hilbra**, the shared-key HBI/HBP sha layer (the same layer that made `PhaseCorrelation = 1.0` real between two seats).
- **Renderer** = the inverse transcode (glyphs → bytes). Deterministic, exact, immediate — the processed slice equals the original because the map is a bijection.

## Why this is *instant*, and why it matches a simulator
- **Instant:** there is no lossy representation to invert and no network of weights to evaluate — the glyph carries the full slice bijectively, so rendering is unpacking. Cost is the transcode, which is `O(n)` bit-repacking, not a search.
- **Simulator-shaped:** a frame-based simulator makes each frame from the last by a deterministic rule and renders it losslessly. slice → glyph → processed-slice is exactly that: deterministic bijective encode/decode, content-addressed, locality-preserving. The engine cranks the rule (see `HOW-THE-SYSTEMS-FORM-A-UNIVERSE`); the glyph carries the frame; Hilbra moves it; the renderer paints it.

## Runnable proof
`slice_glyph_messaging.py` (added with this doc) implements the 5-bytes↔4-glyphs transcode and demonstrates the full path: make a slice → glyphs + address → transmit → render → assert the processed slice is **sha256-identical** to the original, at **code rate 1.0**. E=0 — pure stdlib, no launch, no network.

## Honest boundary
- `MEASURED`: the transcode identity (code rate 1.0, sha-identical) — the slice-maker/renderer core, proven by round-trip and by the runnable demo.
- `CANON`: the 60-D HyperBEHCS tuple, Brown–Hilbert transport, Hilbra as the secure layer.
- `UNVERIFIED` / operator-vision: that physical spacetime slices are literally rendered this way. Frontier — grounded in the measured core, not upgraded by analogy.
