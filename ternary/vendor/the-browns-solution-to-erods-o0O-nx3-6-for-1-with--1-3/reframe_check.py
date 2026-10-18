"""Verify the balanced-ternary reformulation of Erdos's base-3 conjecture.

CLAIM:  2^n contains a digit 2 in standard base 3
   <=>  the balanced-ternary expansion of 2^n contains a -1
   <=>  2^n is NOT a sum of distinct powers of 3

If those are equivalent for every n we test, the reframe is exact and the
conjecture can be restated inside the balanced-ternary carrier.
"""


def base3(n):
    if n == 0:
        return [0]
    d = []
    while n:
        d.append(n % 3)
        n //= 3
    return d                      # LSB first


def bal3(n):
    """Balanced ternary, digits in {-1,0,1}, LSB first. Exact integers only."""
    if n == 0:
        return [0]
    d = []
    while n:
        r = n % 3
        if r == 2:
            r = -1
            n += 1                # the carry
        d.append(r)
        n //= 3
    return d


def check(n):
    v = 2 ** n
    b3 = base3(v)
    bt = bal3(v)
    has2 = 2 in b3
    hasM = -1 in bt
    # reconstruct to prove the balanced expansion is faithful
    recon = sum(x * 3 ** i for i, x in enumerate(bt))
    sum_distinct_pow3 = all(x in (0, 1) for x in b3)
    return has2, hasM, recon == v, sum_distinct_pow3


N = 4000
agree = 0
disagree = []
bad_recon = []
no_two = []

for n in range(N + 1):
    has2, hasM, ok, sdp = check(n)
    if not ok:
        bad_recon.append(n)
    if has2 == hasM:
        agree += 1
    else:
        disagree.append(n)
    if not has2:
        no_two.append(n)
    # third equivalence
    if (not has2) != sdp:
        disagree.append(("sdp", n))

print("RANGE|n=0..%d|json=0" % N)
print("RECONSTRUCTION|balanced_expansion_faithful=%s|failures=%d|json=0"
      % (not bad_recon, len(bad_recon)))
print("EQUIVALENCE|has_digit_2  <=>  has_-1|agree=%d|disagree=%d|json=0"
      % (agree, len(disagree)))
print("EQUIVALENCE|no_digit_2   <=>  sum_of_distinct_powers_of_3|violations=%d|json=0"
      % len([d for d in disagree if isinstance(d, tuple)]))
print()
print("EXCEPTIONS|n_with_NO_digit_2|%s|json=0" % no_two)
print()
print("=== the exceptions, shown ===")
for n in no_two:
    v = 2 ** n
    b3 = "".join(str(x) for x in reversed(base3(v)))
    bt = "".join({-1: "T", 0: "0", 1: "1"}[x] for x in reversed(bal3(v)))
    print("  n=%-2d  2^n=%-8d  base3=%-12s  bal3=%-12s" % (n, v, b3, bt))
print()
print("=== first few WITH a digit 2, for contrast ===")
for n in (1, 3, 4, 5, 9, 10):
    v = 2 ** n
    b3 = "".join(str(x) for x in reversed(base3(v)))
    bt = "".join({-1: "T", 0: "0", 1: "1"}[x] for x in reversed(bal3(v)))
    print("  n=%-2d  2^n=%-8d  base3=%-12s  bal3=%-12s" % (n, v, b3, bt))
