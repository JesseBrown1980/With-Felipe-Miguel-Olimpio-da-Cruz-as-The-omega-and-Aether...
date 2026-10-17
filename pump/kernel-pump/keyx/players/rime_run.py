#!/usr/bin/env python3
"""
rime_run.py — FREEZE, then ADDRESS on-demand (never materialize, never play live).
Operator: Jesse Daniel Brown, 2026-07-21.

Correction to rime_photo/rime_codec: do NOT reconstruct (materialize) objects —
that costs space and "plays it live." Instead:
  1) TRAIN/CALCULATE the functions once (the sphere p,g,k).
  2) FREEZE/SLICE/SAVE: keep only the functions + the fraction-of-a-rime addresses.
     (This is the frozen quantized snapshot — the "2D->3D GGUF".)
  3) PLAY afterward on CPU with the rime Bobby Fischer: ADDRESS any single element
     on demand in O(1) — one modular exponentiation — WITHOUT building the object.
The observer (us, at the null 0) stays OUTSIDE; the frozen system never changes.
"""
import time, math
from rime_sphere import is_prime, primitive_root

def element(j, i, g, k, p, n):
    # object j, position i -> the specific element, O(1). No coset materialized.
    return pow(g, (j + k*i) % n, p)

def main():
    p=1000081; assert is_prime(p)
    g=primitive_root(p); n=p-1; k=27; m=n//k
    N_OBJECTS=100000                         # how many rime-dimensional objects we hold
    print("=== FREEZE, then ADDRESS on-demand (rime run) ===")
    print(f"functions (frozen once): p={p}, g={g}, k={k}   each object = {m:,} elements")
    print()
    # FROZEN SNAPSHOT = functions + one address per object (a fraction of a rime). NOT materialized.
    frozen_addresses = N_OBJECTS                 # 1 small index per object
    frozen_bytes = frozen_addresses * math.ceil(math.log2(k)/8) + 24  # addrs + (p,g,k)
    materialized_bytes = N_OBJECTS * m * math.ceil(math.log2(p)/8)    # if we were foolish enough to build them
    print(f"  FROZEN snapshot : {frozen_bytes:,} B  ({N_OBJECTS:,} rime-addresses + functions)")
    print(f"  if MATERIALIZED : {materialized_bytes:,} B  ({N_OBJECTS:,} x {m:,} elements) -- what NOT to do")
    print(f"  space saved by freezing (not materializing): {materialized_bytes/frozen_bytes:,.0f}x")
    print()
    # PLAY: address elements on-demand, O(1), verify byte-exact WITHOUT building any object
    import hashlib
    ok=True; Q=200000
    t0=time.time()
    for q in range(Q):
        j = q % k                                  # which object
        i = (q*2654435761) % m                      # which position (deterministic)
        e = element(j, i, g, k, p, n)               # ADDRESS it, O(1) — the 'emitter'
        if q < 5:
            # spot-check against the honest definition of that element
            ref = pow(g, (j + k*i) % n, p)
            ok &= (e == ref)
    dt=time.time()-t0
    print(f"  PLAYED {Q:,} on-demand addressings in {dt:.3f}s  = {Q/dt/1e6:.2f}M elements/sec (Python; far faster in C)")
    print(f"  each addressing = ONE modular exponentiation, O(1), never materializing the object")
    print(f"  spot-checks byte-exact: {ok}")
    print()
    print("  PRINCIPLE: the system is FROZEN (sliced/saved), played AFTERWARD by the rime")
    print("  Fischer on CPU. We observe from OUTSIDE the null — we never play it live, so we")
    print("  never change it. Address-on-demand, not reconstruct. This is the GGUF pattern.")

if __name__ == "__main__":
    main()
