#!/usr/bin/env python3
"""
trianti.py — THE SYMMETRY GROUP OF THE 27-CUBE (trinary inversion & anti-inversion).
Operator: Jesse Daniel Brown. Sealed 2026-07-21. Companion to trijection.py / njection.py.

27 = 3^3, so one base-27 digit = 3 balanced trits: cells (t1,t2,t3) in {-1,0,+1}^3.

Two inversions, differing in ORDER:
  * NEGATION  N : t -> -t          (reflect through center)  -- ORDER 2, self-inverse
                  (the binary-style inversion: its own anti-inversion, N.N = id)
  * ROTATION  R : (a,b,c)->(c,a,b) (3-cycle of the axes)     -- ORDER 3
                  ANTI-inversion R^-1 = R^2 (counter-rotation), and R != R^-1.
                  R^0, R^1, R^2 = 1/3 + 1/3 + 1/3 -> close to unity (the "pie" = 1).
                  This is "trianti pie": R^2 completes the pie back to whole.

THE FIXED POINT: the center (0,0,0) is fixed by N, R, and R^2 alike. The free center
is the fixed point of the ENTIRE symmetry group -- which is exactly why it costs nothing:
it does not move under inversion OR anti-inversion.

HONEST LINE: N, R, R^2 are lossless PERMUTATIONS of the 27 cells (bijective symmetries,
rate 1.0 -- re-relation, not sub-entropy compression). They give the trijection its
STRUCTURE (order-3 with a distinct anti), not a reduction below entropy. The pie closing
to 1 is the GROUP closing, not information vanishing. But order-3-with-a-distinct-anti is
precisely what a 2-machine bijection cannot provide.
"""
import itertools

T = [-1, 0, 1]
CELLS = list(itertools.product(T, repeat=3))            # the 27 base-27 symbols

def N(c):   return tuple(-x for x in c)                 # negation: order-2 inversion
def R(c):   return (c[2], c[0], c[1])                   # rotation: order-3, trinary-native
def R2(c):  return R(R(c))                              # anti-inversion (trianti) = R^-1
def compose(f, g): return lambda c: f(g(c))

def order(op):
    for k in range(1, 13):
        f = CELLS
        cur = {c: c for c in CELLS}
        # apply op k times
        x = list(CELLS)
        y = [c for c in CELLS]
        for _ in range(k):
            y = [op(c) for c in y]
        if all(a == b for a, b in zip(y, CELLS)):
            return k
    return None

def report():
    print(f"trinary equivalent of 27-nary: 27 = 3^3 -> 3 balanced trits; {len(CELLS)} cells")
    print()
    print(f"NEGATION N (binary-style inversion, reflect through center):")
    print(f"   order(N)        = {order(N)}   (=2 -> self-inverse; its own anti-inversion)")
    print(f"   center fixed    = {N((0,0,0))==(0,0,0)}")
    print()
    print(f"ROTATION R (trinary-native 3-cycle inversion):")
    print(f"   order(R)        = {order(R)}   (=3)")
    print(f"   R != R^-1       = {any(R(c)!=R2(c) for c in CELLS)}   <- differs from binary")
    print(f"   ANTI = R^2 = R^-1 (trianti); R.R^-1 = id (pie closes to 1): "
          f"{all(R(R2(c))==c for c in CELLS)}")
    print(f"   center fixed    = {R((0,0,0))==(0,0,0)}")
    print()
    fixed_all = [c for c in CELLS if N(c)==c and R(c)==c and R2(c)==c]
    print(f"FIXED POINT of the whole group {{N, R, R^2}}: {fixed_all}  "
          f"<- the free center is invariant")
    # the pie: R^0, R^1, R^2 partition each non-center orbit into thirds
    print()
    print("the pie (R^0 + R^1 + R^2 -> unity): rotation orbits partition the 26 non-center")
    seen=set(); orbits=[]
    for c in CELLS:
        if c in seen: continue
        orb=[c, R(c), R2(c)]
        for o in orb: seen.add(o)
        orbits.append(tuple(sorted(set(orb))))
    from collections import Counter
    sizes=Counter(len(set(o)) for o in orbits)
    print(f"   orbit sizes: {dict(sizes)}  (size-1 = the fixed center; size-3 = full 3-cycles)")

if __name__ == "__main__":
    report()
