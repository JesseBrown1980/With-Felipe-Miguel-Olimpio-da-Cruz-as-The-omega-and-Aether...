"""
slice_glyph_messaging.py -- the universe simulator's slice-maker + renderer, runnable.

A slice is MADE (encoded to glyphs + content-address), TRANSMITTED (a local hop on the
Brown-Hilbert curve, via Hilbra), and RENDERED (decoded to the processed slice). Because
the byte<->glyph transcode is a BIJECTION at code rate 1.0, the processed slice is
byte-identical to the original -- instant, lossless, no search.

The formula (MEASURED, Q-PRISM 53023b6):
  bytes are base-2^8 digits; glyphs are base-2^10 digits of the same integer.
  lcm(8,10) = 40 bits  =>  5 bytes  <->  4 glyph-symbols, remainder 0  (2^40 = (2^8)^5 = (2^10)^4).
  round-trip is the identity map; H(glyphs) = H(bytes); code rate = 1.0.

Pure stdlib. E=0: no launch, no network -- this proves the transcode, it does not fire a fabric.
"""
import hashlib


def slice_maker(slice_bytes):
    """Encode a slice (bytes) to glyphs (base-1024 symbols) + its content-address (coordinate).
    5 bytes -> 4 glyphs per 40-bit block; pad recorded so the round-trip is exact."""
    pad = (-len(slice_bytes)) % 5
    padded = slice_bytes + b"\x00" * pad
    glyphs = []
    for i in range(0, len(padded), 5):
        block = int.from_bytes(padded[i:i + 5], "big")           # a 40-bit integer
        glyphs.extend((block >> (10 * (3 - j))) & 0x3FF for j in range(4))  # 4 base-1024 symbols
    address = "AGT-" + hashlib.sha256(slice_bytes).hexdigest()[:16]        # the glyph's coordinate
    return {"glyphs": glyphs, "pad": pad, "address": address}


def renderer(glyphs, pad):
    """Decode glyphs (base-1024 symbols) back to the processed slice (bytes). Exact inverse."""
    out = bytearray()
    for i in range(0, len(glyphs), 4):
        block = 0
        for j in range(4):
            block = (block << 10) | glyphs[i + j]                 # rebuild the 40-bit integer
        out.extend(block.to_bytes(5, "big"))
    return bytes(out[:len(out) - pad]) if pad else bytes(out)


def code_rate(slice_bytes, glyphs):
    """bits-out / bits-in. Exactly 1.0 on 5-byte-aligned input (the alphabet changes, not the info)."""
    return (len(glyphs) * 10) / (len(slice_bytes) * 8)


if __name__ == "__main__":
    slice_bytes = b"a processed slice of the Asolaria universe, tick 42 -- pixels_first"

    made = slice_maker(slice_bytes)                              # SLICE-MAKER
    # ... transmit: the glyph hops on the Brown-Hilbert curve (Hilbra transport) -- omitted (E=0) ...
    processed = renderer(made["glyphs"], made["pad"])            # RENDERER

    same = processed == slice_bytes
    sha_in = hashlib.sha256(slice_bytes).hexdigest()[:16]
    sha_out = hashlib.sha256(processed).hexdigest()[:16]

    print("slice bytes      :", len(slice_bytes))
    print("glyphs (base-1024):", len(made["glyphs"]), "symbols  ->", made["glyphs"][:8], "...")
    print("content-address  :", made["address"])
    print("rendered == slice:", same, "  (sha", sha_in, "->", sha_out + ")")
    print("code rate        :", code_rate(slice_bytes + b"\x00" * ((-len(slice_bytes)) % 5), made["glyphs"]),
          " (1.0 = re-relation, not compression)")
    assert same, "renderer must reproduce the slice byte-for-byte (bijection)"
    print("\nOK: slice -> glyphs -> processed slice is byte-identical, code rate 1.0 (instant, lossless).")
