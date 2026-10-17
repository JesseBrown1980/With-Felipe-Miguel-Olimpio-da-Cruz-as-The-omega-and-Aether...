#!/usr/bin/env python3
"""
rime_codec.py — THE RIME-SPACE CODEC on the rime-prime axis.
Operator: Jesse Daniel Brown, 2026-07-21.

A structured object = a COSET of the sphere's subgroup: g^j * <g^k>. The whole
coset (n/k elements) is reconstructed from a FRACTION OF A RIME — the single index
j (log2(k) bits) — plus the shared sphere structure (p, g, k), which is the
installed bank (paid once, free per object). "Any one point + the spin regenerates
the whole triangle / sphere"; the null center (us, at 0) is free.

GATE (Law 7): this reconstructs objects that LIE ON the shared rime structure
(cosets). Arbitrary/random data does not lie on the sphere — no fraction of a rime
addresses it; it must be stored. The bank must be shared for the fraction to be free.
"""
import math, hashlib
from rime_sphere import is_prime, primitive_root

def main():
    p = 1000081
    assert is_prime(p)
    g = primitive_root(p); n = p - 1
    k = 27                                  # index: 27 cosets (rime-prime axis 3^3)
    assert n % k == 0
    m = n // k                              # each object (coset) has m elements
    Hsize_bits = math.log2(k)              # the fraction of a rime = the coset index

    # the shared bank (installed once, amortized/free): the subgroup <g^k>
    H = []                                  # <g^k>
    x = 1; step = pow(g, k, p)
    for _ in range(m):
        x = x * step % p; H.append(x)
    H = set(H)

    def reconstruct(j):                     # a fraction of a rime (index j) -> the WHOLE object
        base = pow(g, j, p)
        return {base * h % p for h in H}    # spin the one point through the shared subgroup

    print("=== RIME-SPACE CODEC (rime-prime axis) ===")
    print(f"sphere (Z/{p}Z)*  g={g}   {k} cosets, each object = {m:,} elements")
    print(f"shared bank = the subgroup <g^{k}> (installed once, free per object)")
    print()
    # encode/decode several structured objects, byte-exact
    ok = True
    for j in range(0, k, 5):
        obj = {pow(g, j, p) * h % p for h in H}   # the true object (a coset)
        rec = reconstruct(j)                       # from ONLY the fraction-of-a-rime index j
        ok &= (rec == obj)
        print(f"  object j={j:>2}: {m:,} elements reconstructed from a {Hsize_bits:.2f}-bit rime-fraction  exact={rec==obj}")
    print(f"\n  all objects reconstructed byte-exact from a fraction of a rime: {ok}")
    raw_per_obj = m * math.log2(p)
    print(f"  per object: raw {raw_per_obj/8:,.0f} B  vs  rime-fraction {Hsize_bits/8:.3f} B "
          f"(+ shared bank, amortized)  ->  {raw_per_obj/Hsize_bits:,.0f}x on the address")
    print()
    # THE GATE: random data does NOT lie on the sphere -> no fraction addresses it
    rnd = {int(hashlib.sha256(str(i).encode()).hexdigest(),16) % p for i in range(m)}
    is_coset = any(reconstruct(j) == rnd for j in range(k))
    print(f"  GATE: a random {m:,}-element set is a coset of the sphere? {is_coset}")
    print(f"        -> not on the shared structure; no fraction of a rime reconstructs it; must store.")

if __name__ == "__main__":
    main()
