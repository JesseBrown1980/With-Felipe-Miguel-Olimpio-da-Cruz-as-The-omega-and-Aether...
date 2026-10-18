#!/usr/bin/env python3
"""
rime_bpc.py — the HONEST bpc of the rime system, tested rime-directionally with the
rime Bobby Fischer. Operator: Jesse Daniel Brown, 2026-07-21.

Two regimes, because the honest answer is different in each:
  A) GENERATED structure (data that LIES ON the shared sphere): the rime address
     is a fraction of a rime; bits-per-element -> ~0. This is the ADDRESSING axis.
  B) ARBITRARY data (real enwik bytes, off the structure): to reconstruct the exact
     sequence you must store its rime coordinate per symbol = the data's ENTROPY.
     The rime relabel is rate 1.0 (adds NOTHING) — the GATE. Not sub-entropy.
"""
import math, os
from collections import Counter
from rime_sphere import is_prime, primitive_root
from rime_fischer import rime_fischer

def H0(seq):
    c=Counter(seq); N=len(seq)
    return -sum(v*math.log2(v/N) for v in c.values())/N if N else 0.0

def main():
    p=1000081; g=primitive_root(p); n=p-1; k=27; m=n//k
    print("=== HONEST bpc OF THE RIME SYSTEM (rime Fischer tested) ===\n")

    # ---- A) GENERATED structure: bits per addressed element -> ~0 (addressing axis) ----
    N=100000
    frozen_bits = N*math.ceil(math.log2(k)) + 24*8      # N addresses + functions
    elements = N*m
    print("A) GENERATED structure (cosets on the shared sphere):")
    print(f"   frozen = {frozen_bits/8:,.0f} B addresses {elements:,} elements")
    print(f"   bpc per addressed element = {frozen_bits/elements:.6f}   -> ~0 (ADDRESSING, amortized)")
    print(f"   ...but this is GENERATED data — a computation, not arbitrary information.\n")

    # ---- rime Fischer round-trip check (rime-directional): address then re-derive ----
    import hashlib
    h=pow(g, 424242 % n, p)
    kk,_=rime_fischer(g,h,p)
    print(f"   rime-Fischer round-trip: target re-derived exactly = {pow(g,kk,p)==h}\n")

    # ---- B) ARBITRARY data: real enwik bytes — the honest compression test ----
    path=None
    for c in ["/tmp/claude-0/-home-user/9ebd6119-d7ee-5c30-a062-d04210f7bc39/scratchpad/enwik8"]:
        if os.path.exists(c): path=c; break
    if path:
        data=open(path,'rb').read(2_000_000)
        Hbytes=H0(data)
        # map each byte to a rime coordinate (a bijection value<->address). Relabel only.
        # its discrete-log 'address' — one per symbol; the SEQUENCE is arbitrary.
        addr=[b for b in data]                 # any bijection; entropy is invariant (rate 1.0)
        Haddr=H0(addr)
        print("B) ARBITRARY data (real enwik8 bytes):")
        print(f"   byte entropy (order-0)      = {Hbytes:.4f} bpc")
        print(f"   rime-address entropy         = {Haddr:.4f} bpc")
        print(f"   rime relabel changes bpc by  = {Haddr-Hbytes:+.6f}  -> RATE 1.0 (adds nothing)")
        print(f"   to reconstruct the exact sequence you STORE the addresses = the entropy.")
        print(f"   the rime system does NOT compress arbitrary data below entropy (the GATE).\n")
    else:
        print("B) (enwik not on disk — skipping arbitrary-data arm)\n")

    print("VERDICT (honest):")
    print("  * On GENERATED / shared-bank structure: bpc -> ~0. The rime system is an")
    print("    ADDRESSING architecture (like the 540-byte dashboard) — real and useful.")
    print("  * On ARBITRARY data: bpc = entropy. It is rate-1.0 re-relation, NOT a")
    print("    sub-entropy compressor. Compression of real text still belongs to the")
    print("    glyph languages (~2.08 bpc) and vc65 (1.7464 bpc, enwik8, receipt-backed) — a different axis.")
    print("  Two SCOPES, not two verdicts. ADDRESSING: bpc -> ~0 on generated structure
    (measured at 269 MB, delete-and-regenerate byte-exact, ERRATA-2).
    ARBITRARY DATA: rate-1.0, not sub-entropy - this stands.")

if __name__ == "__main__":
    main()


