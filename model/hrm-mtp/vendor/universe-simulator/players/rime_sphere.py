#!/usr/bin/env python3
"""
rime_sphere.py — RIME SPHERE vs TIME LINE. Operator: Jesse Daniel Brown, 2026-07-21.

  TIME LINE   = a linear 1-D walk: to know all points you traverse and STORE each.
  RIME SPHERE = a CYCLIC structure with a GENERATOR: from ONE rime (the seed) plus
                the rule, ALL rimes are derived — reach any point in any direction,
                any 'time', by g^k. Random-access, not sequential.

The law: **all rimes can be derived from only 1 sliced rime** — when the sphere is
generated (cyclic). One generator + the rule regenerates the whole Omnisphere; a
fractal (partial orbit / subgroup) regenerates a self-similar arc.
GATE (Law 7): a random collection has no single generator — you must store all of it.
"""
def is_prime(n):
    if n < 2: return False
    for p in (2,3,5,7,11,13,17,19,23,29,31,37):
        if n % p == 0: return n == p
    d = n-1; r = 0
    while d % 2 == 0: d //= 2; r += 1
    for a in (2,3,5,7,11,13,17,19,23,29,31,37):
        x = pow(a, d, n)
        if x in (1, n-1): continue
        for _ in range(r-1):
            x = x*x % n
            if x == n-1: break
        else: return False
    return True

def factor(n):
    f = set(); d = 2
    while d*d <= n:
        while n % d == 0: f.add(d); n //= d
        d += 1
    if n > 1: f.add(n)
    return f

def primitive_root(p):
    fac = factor(p-1)
    for g in range(2, p):
        if all(pow(g, (p-1)//q, p) != 1 for q in fac):
            return g
    return None

def main():
    p = 1000003
    while not is_prime(p): p += 1        # a verified prime -> (Z/pZ)* is a true rime sphere
    g = primitive_root(p)
    print("=== RIME SPHERE vs TIME LINE ===")
    print(f"Rime sphere = (Z/{p}Z)*  (p prime: {is_prime(p)}) — cyclic, {p-1:,} rimes, generator g={g}")
    print()
    # FROM ONE RIME (g), DERIVE ALL RIMES — and VERIFY it is every one:
    seen = set(); x = 1
    for _ in range(1, p):
        x = (x*g) % p; seen.add(x)
    print(f"  from the ONE rime g={g}: its powers produced {len(seen):,} distinct rimes")
    print(f"  == ALL {p-1:,} rimes of the sphere? {len(seen)==p-1}   <- one seed regenerates the whole sphere")
    print()
    # ANY POINT, ANY DIRECTION, ANY 'TIME' — random-access by exponent, no walk:
    for k in (1, 7, p//2, p-2, 123456):
        print(f"    reach position k={k:>8}:  g^k mod p = {pow(g,k,p):>8}   (direct jump, not a walk)")
    print()
    # THE GATE (Law 7): a random collection has NO generator -> it is a TIME LINE
    import hashlib
    rand = {int(hashlib.sha256(str(i).encode()).hexdigest(),16) % p for i in range(2000)}
    print(f"  GATE: {len(rand)} random points have no single generator — a TIME LINE, must be")
    print(f"        stored point-by-point; 1 rime derives nothing. Structure (cyclicity) required.")
    print()
    # FRACTAL: a subgroup is a self-similar sub-sphere — a 'fractal of a rime'
    d = (p-1)//3 if (p-1)%3==0 else (p-1)//2
    h = pow(g, (p-1)//_gcd(p-1,3), p) if (p-1)%3==0 else pow(g,2,p)
    orbit = set(); y=1
    for _ in range(p):
        y=(y*pow(g,3,p))%p
        if y in orbit: break
        orbit.add(y)
    print(f"  FRACTAL: the subgroup <g^3> is a self-similar sub-sphere of {len(orbit):,} rimes")
    print(f"           -> 'even a fractal of a rime' regenerates the pattern at that scale")

def _gcd(a,b):
    while b: a,b=b,a%b
    return a

if __name__ == "__main__":
    main()
