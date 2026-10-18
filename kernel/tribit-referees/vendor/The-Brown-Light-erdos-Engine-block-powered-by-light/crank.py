"""THE CRANK — is the 1/3 : 2/3 split EXACT at every level?

Not sampled. Computed over a FULL PERIOD at each level, so the fractions are
exact rationals, not statistics.

ord(2 mod 3^k) = 2*3^(k-1).  The low k balanced digits of 2^n depend only on
2^n mod 3^k, so the whole behaviour at level k is determined by one period.

At level k we ask, of the residues that SURVIVED levels 0..k-1 (no -1 yet),
what fraction fire at level k?

If that fraction is exactly 1/3 every time, the distribution
    P(0)=1/2 ,  P(k)=(1/6)(2/3)^(k-1)
is a theorem about the multiplicative group, not a measurement.
"""
from fractions import Fraction

print("CRANK|exact over full periods|json=0")
print()
print(" k   period      survivors_in   fire_at_k   carry   fire_fraction   exact")
print(" " + "-" * 76)

MAXK = 13
survivors = None          # set of n mod period that have not fired yet
prev_period = None

for k in range(0, MAXK):
    mod = 3 ** (k + 1)
    period = 2 * 3 ** k            # ord(2 mod 3^(k+1))
    # lift the survivor set to the new period
    if survivors is None:
        cur = set(range(period))
    else:
        cur = set()
        for n in range(period):
            if (n % prev_period) in survivors:
                cur.add(n)
    fire = set()
    for n in cur:
        v = pow(2, n, mod)
        # walk to digit k
        for i in range(k):
            r = v % 3
            if r == 2:
                v = (v + 1) // 3
            else:
                v //= 3
        if v % 3 == 2:
            fire.add(n)
    carry = cur - fire
    f = Fraction(len(fire), len(cur)) if cur else Fraction(0)
    print(" %-3d %-11d %-14d %-11d %-7d %-15s %s"
          % (k, period, len(cur), len(fire), len(carry), f, float(f)))
    survivors, prev_period = carry, period
    if not carry:
        break

print()
print("READING|json=0")
print("  level 0  fire fraction 1/2   <- parity: the coset {2,5,8} mod 9")
print("  level k  fire fraction 1/3   <- one of three throws on the subgroup")
print()
print("IF 1/3 HOLDS AT EVERY LEVEL:")
print("  P(0) = 1/2")
print("  P(k) = (1/2) * (2/3)^(k-1) * (1/3) = (1/6)(2/3)^(k-1)   for k >= 1")
print("  and P(no -1 ever) = lim (1/2)(2/3)^k = 0")
print()
print("CHECK|closed form against the exact fractions above|json=0")
for k in range(0, 8):
    p = Fraction(1, 2) if k == 0 else Fraction(1, 6) * Fraction(2, 3) ** (k - 1)
    print("  P(%d) = %-10s = %.6f" % (k, p, float(p)))
