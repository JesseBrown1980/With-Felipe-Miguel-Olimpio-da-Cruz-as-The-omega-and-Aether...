"""DOES THE CLOSURE COMPOSE?  depth 1 -> 27 -> 81.

The architecture is verified at level 1: three arms sum to zero, the centre is
free. Everything above level 1 depends on ONE question:

    when you nest 27 of these, does the centre stay free,
    or does a residual accumulate per level?

If a residual accumulates, the ladder breaks at some depth and the whole 3^n
architecture is unsound above that point. Better we find it than someone else.

THE TEST
  build a ternary tree of depth D. every node has three children.
  arms of a sibling triple (a,b,c):   2a-b-c , 2b-a-c , 2c-a-b
  shift the CENTRE at any level by t and measure the change in the arms
  at every other level.

  exact integers  -> expect 0 drift at every depth
  float64         -> measure the depth at which it stops being 0, and by how much

This is run twice, in two arithmetics, and the answer is a number, not an opinion.
"""
from fractions import Fraction
import sys

MAXD_FULL = 13          # full enumeration to here (3^13 = 1,594,323 leaves)
DEPTHS = [1, 3, 9, 27, 81]


def arms(a, b, c):
    return (2 * a - b - c, 2 * b - a - c, 2 * c - a - b)


# ---------------------------------------------------------------- exact ints
def nest_int(D, seed=20260801):
    """Build depth-D tree of integers, roll up, check closure at every level."""
    s = seed
    def rnd():
        nonlocal s
        s = (s * 1103515245 + 12345) & 0x7FFFFFFF
        return s % 2001 - 1000
    level = [rnd() for _ in range(3 ** D)]
    bad = 0
    for k in range(D):
        nxt, n = [], len(level)
        for i in range(0, n, 3):
            a, b, c = level[i], level[i + 1], level[i + 2]
            A = arms(a, b, c)
            if sum(A) != 0:
                bad += 1
            nxt.append(a + b + c)          # parent = the sum; centre is free
        level = nxt
    return bad, level[0]


# ------------------------------------------- the decisive one: is 0 still free
def free_centre_int(D, shift):
    """Shift the centre at EVERY level by `shift`. Arms must not move at all."""
    s = 20260801
    def rnd():
        nonlocal s
        s = (s * 1103515245 + 12345) & 0x7FFFFFFF
        return s % 2001 - 1000
    base = [rnd() for _ in range(3 ** D)]
    moved = 0
    lvl_a, lvl_b = list(base), [x + shift for x in base]
    for k in range(D):
        na, nb = [], []
        for i in range(0, len(lvl_a), 3):
            A = arms(lvl_a[i], lvl_a[i + 1], lvl_a[i + 2])
            B = arms(lvl_b[i], lvl_b[i + 1], lvl_b[i + 2])
            if A != B:
                moved += 1
            na.append(sum(lvl_a[i:i + 3]))
            nb.append(sum(lvl_b[i:i + 3]))
        lvl_a, lvl_b = na, [x + shift for x in nb]   # re-shift the centre each level
    return moved


def free_centre_float(D, shift):
    s = 20260801
    def rnd():
        nonlocal s
        s = (s * 1103515245 + 12345) & 0x7FFFFFFF
        return float(s % 2001 - 1000) + 0.1          # a value float cannot hold exactly
    base = [rnd() for _ in range(3 ** D)]
    moved, worst = 0, 0.0
    lvl_a, lvl_b = list(base), [x + shift for x in base]
    for k in range(D):
        na, nb = [], []
        for i in range(0, len(lvl_a), 3):
            A = arms(lvl_a[i], lvl_a[i + 1], lvl_a[i + 2])
            B = arms(lvl_b[i], lvl_b[i + 1], lvl_b[i + 2])
            for x, y in zip(A, B):
                d = abs(x - y)
                if d > 0:
                    moved += 1
                    worst = max(worst, d)
            na.append(sum(lvl_a[i:i + 3]))
            nb.append(sum(lvl_b[i:i + 3]))
        lvl_a, lvl_b = na, [x + shift for x in nb]
    return moved, worst


print("COMPOSE|does the closure survive nesting|json=0")
print()
print("=== 1. closure at every level, exact integers ===")
print(" depth   leaves        levels_checked   sum_ne_zero")
for D in range(1, MAXD_FULL + 1):
    bad, root = nest_int(D)
    print("  %-6d %-13d %-16d %d" % (D, 3 ** D, D, bad))

print()
print("=== 2. THE DECISIVE TEST: is the centre still free at depth? ===")
print("   shift the centre at EVERY level; arms must not move.")
print()
print(" depth   arithmetic   arm_changes   worst_|delta|")
for D in (1, 3, 6, 9, 12):
    m = free_centre_int(D, 7919)
    print("  %-6d %-12s %-13d %s" % (D, "int", m, "0 exactly"))
for D in (1, 3, 6, 9, 12):
    m, w = free_centre_float(D, 7919.0)
    print("  %-6d %-12s %-13d %.6e" % (D, "float64", m, w))

print()
print("=== 3. depth 27 and 81 — single path, exact rationals ===")
print("   full enumeration is impossible (3^27 = 7.6e12 leaves), so we walk one")
print("   path to the requested depth and carry the residual exactly.")
print()
print(" depth   arithmetic   residual_at_root")
for D in DEPTHS:
    # exact: carry a Fraction down D levels, shifting the centre each time
    a, b, c = Fraction(11), Fraction(-4), Fraction(93)
    resid = Fraction(0)
    for k in range(D):
        A = arms(a, b, c)
        resid += sum(A)
        t = Fraction(7919)
        a, b, c = a + t, b + t, c + t          # shift the centre
        A2 = arms(a, b, c)
        resid += sum(x - y for x, y in zip(A2, A))   # must be 0 if centre is free
        a, b, c = A2[0] + 1, A2[1] + 2, A2[2] + 3
    print("  %-6d %-12s %s" % (D, "exact", resid))

for D in DEPTHS:
    a, b, c = 11.1, -4.1, 93.1
    resid = 0.0
    for k in range(D):
        A = arms(a, b, c)
        resid += sum(A)
        t = 7919.0
        a, b, c = a + t, b + t, c + t
        A2 = arms(a, b, c)
        resid += sum(x - y for x, y in zip(A2, A))
        a, b, c = A2[0] + 1, A2[1] + 2, A2[2] + 3
    print("  %-6d %-12s %.6e" % (D, "float64", resid))
