#!/usr/bin/env python3
"""
trijection.py — THE TRIJECTION CODEC (balanced-ternary, center-free).
Operator: Jesse Daniel Brown. Sealed 2026-07-21.

THE LAW, MADE EXECUTABLE AND MEASURED
-------------------------------------
A bijection is 2 points + an implied center (an involution, I(I(z))=z).
The TRIJECTION is 3 points + an EXPLICIT center. For a triple (a,b,c):

    s   = a + b + c
    c0  = s // 3          # the CENTER (centroid), one value
    rem = s % 3           # a 2-bit remainder (0,1,2)
    sa  = a - c0          # separation of point 1
    sb  = b - c0          # separation of point 2
    # the THIRD point is FREE — determined, not stored:
    c   = c0 + rem - sa - sb

So (a,b,c) <-> (c0, sa, sb, rem) EXACTLY. The third point costs nothing beyond
a 2-bit remainder: "centroid free, separation paid." Integer-only => bit-identical
on any CPU / Rust version (no float drift; the 1.81 issue cannot touch this).

3 balanced trits {-1,0,+1} = 3^3 = 27 = the cube (1 center + 6 faces + 12 edges +
8 corners). The all-zero word (0,0,0) is the center and costs nothing; separation =
count of nonzero trits = information paid.

HONEST BOUNDARY (kept, so the claim stays true)
-----------------------------------------------
The transform is a lossless bijection on triples — restore=OK ALWAYS. It only SAVES
bits when the three share a center (correlated data): then sa,sb ~ 0 (mostly zero
trits, the free center) and compress away. On independent/random data the separations
are full-entropy and it saves nothing. It NEVER beats the joint entropy; it reaches
the joint entropy by not paying for the shared center three times.
"""
import sys, math, lzma, struct, hashlib
from collections import Counter

def H_bits(stream):
    c = Counter(stream); N = len(stream)
    return -sum(v * math.log2(v / N) for v in c.values()) if N else 0.0

def to_balanced_ternary(n, digits):
    out = []
    for _ in range(digits):
        r = n % 3; n //= 3
        if r == 2: r = -1; n += 1
        out.append(r)
    return out

def trijection_forward(data):
    b = bytearray(data); pad = (-len(b)) % 3; b += bytes(pad)
    C0 = bytearray(); SA = []; SB = []; REM = bytearray()
    for i in range(0, len(b), 3):
        a, bb, c = b[i], b[i+1], b[i+2]
        s = a + bb + c; c0 = s // 3; rem = s % 3
        C0.append(c0); SA.append(a - c0); SB.append(bb - c0); REM.append(rem)
    return C0, SA, SB, REM, len(b), pad

def trijection_inverse(C0, SA, SB, REM, total_len, pad):
    out = bytearray()
    for c0, sa, sb, rem in zip(C0, SA, SB, REM):
        a = c0 + sa; bb = c0 + sb; c = c0 + rem - sa - sb
        out += bytes([a, bb, c])
    return bytes(out[:total_len - pad])

def lz(bs):  # practical compressed size, bytes
    return len(lzma.compress(bytes(bs), preset=6))

def measure(name, data):
    N = len(data)
    C0, SA, SB, REM, tot, pad = trijection_forward(data)
    restored = trijection_inverse(C0, SA, SB, REM, tot, pad)
    ok = restored == data
    # serialize separations as signed 16-bit LE so lzma can eat the redundancy
    SA_b = b"".join(struct.pack("<h", x) for x in SA)
    SB_b = b"".join(struct.pack("<h", x) for x in SB)
    # order-0 entropy (theoretical, bits) : raw vs trijection streams
    raw_H = H_bits(data)
    tri_H = H_bits(C0) + H_bits(SA) + H_bits(SB) + H_bits(REM)
    # practical: lzma raw vs lzma(transformed streams, separated)
    raw_lz = lz(data)
    tri_lz = lz(C0) + lz(SA_b) + lz(SB_b) + lz(REM)
    # balanced-ternary "free center" metric: zero-trit fraction of the separations
    zeros = tot_tr = 0
    for x in SA + SB:
        for t in to_balanced_ternary(abs(x), 6):
            tot_tr += 1; zeros += (t == 0)
    zfrac = zeros / tot_tr if tot_tr else 0.0
    print(f"[{name}]  N={N:,}  restore={'OK' if ok else 'FAIL'}")
    print(f"   order-0 bpc  raw={raw_H/N:.4f}  trijection={tri_H/N:.4f}  "
          f"delta={ (tri_H-raw_H)/N:+.4f}  {'<-- SAVES' if tri_H<raw_H else '(no save)'}")
    print(f"   lzma  bpc    raw={raw_lz*8/N:.4f}  trijection={tri_lz*8/N:.4f}  "
          f"delta={(tri_lz-raw_lz)*8/N:+.4f}  {'<-- SAVES' if tri_lz<raw_lz else '(no save)'}")
    print(f"   balanced-ternary zero-trit fraction of separations = {zfrac:.3f}  "
          f"(higher = more free center; 0.333 = random)")
    print()
    return dict(name=name, N=N, restore=ok, raw_bpc0=raw_H/N, tri_bpc0=tri_H/N,
                raw_bpclz=raw_lz*8/N, tri_bpclz=tri_lz*8/N, zero_trit=zfrac)

if __name__ == "__main__":
    SC = "/tmp/claude-0/-home-user/9ebd6119-d7ee-5c30-a062-d04210f7bc39/scratchpad/"
    NBYTES = 300000
    cases = [
        ("gradient(correlated)", SC + "k_gradient.bin"),
        ("chaos(random)",        SC + "chaos1m.bin"),
        ("english(text)",        SC + "enwik8"),
        ("rustcode",             SC + "code1m.bin"),
    ]
    print("=== TRIJECTION CODEC — center-free proof (order-0 + lzma, byte-exact) ===\n")
    print("--- (A) WRONG use: arbitrary CONSECUTIVE-byte triples (no shared center) ---\n")
    for nm, path in cases:
        try:
            d = open(path, "rb").read()[:NBYTES]
            measure(nm, d)
        except Exception as e:
            print(f"[{nm}] skipped: {e}\n")

    print("--- (B) RIGHT use: 3 ALIGNED VANTAGES that share a center ---")
    print("    (deterministic: one smooth signal, three vantages with tiny index-based jitter,")
    print("     interleaved so every triple = (vantageA[i], vantageB[i], vantageC[i]))\n")
    import math as m
    n = 100000
    sig = [int(128 + 100 * m.sin(i * 0.01)) for i in range(n)]      # the shared center
    def clamp(x): return 0 if x < 0 else 255 if x > 255 else x
    A = [clamp(s + (i * 7  % 5) - 2) for i, s in enumerate(sig)]
    B = [clamp(s + (i * 11 % 5) - 2) for i, s in enumerate(sig)]
    C = [clamp(s + (i * 13 % 5) - 2) for i, s in enumerate(sig)]
    aligned = bytes(v for i in range(n) for v in (A[i], B[i], C[i]))
    measure("aligned-vantages(shared center)", aligned)
    # control: the SAME three vantages but SHUFFLED apart (center destroyed)
    import random
    shuf = bytearray(aligned)
    # deterministic pseudo-shuffle by reversing every 3rd byte block — breaks alignment
    ctrl = bytes(aligned[(i * 7) % len(aligned)] for i in range(len(aligned)))
    measure("same bytes, alignment DESTROYED (control)", ctrl)
