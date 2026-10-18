"""THE TRUNK — Erdos base-3 conjecture, in balanced ternary.

KEY FACT that makes this fast:
carries in the balanced-ternary conversion propagate LOW -> HIGH only, so the
first K balanced digits of v depend ONLY on v mod 3^K. We never build 2^n.
We use pow(2, n, 3**K) and walk K digits. Exact integers throughout.

LEAF 1  lowest_minus(n)  position of the lowest -1 digit (0-indexed)
LEAF 2  minus_count(n)   number of -1 digits in the low K positions
LEAF 3  record setters   n where lowest_minus exceeds every previous n

WHY LEAF 1 IS THE PROOF-RELEVANT ONE:
2^n mod 3^K is periodic in n with period ord_3^K(2) = 2*3^(K-1).
If lowest_minus(n) <= K for all n > 8 and some fixed K, a FINITE check of one
period settles the conjecture. So the growth of lowest_minus is exactly the
obstruction. This program measures that growth.
"""
import sys

K = 320                       # balanced digits computed per n
MOD = 3 ** K


def low_digits(n, k=K):
    """First k balanced-ternary digits of 2^n, LSB first. digits in {-1,0,1}."""
    v = pow(2, n, MOD)
    out = []
    for _ in range(k):
        r = v % 3
        if r == 2:
            out.append(-1)
            v = (v + 1) // 3
        else:
            out.append(r)
            v //= 3
    return out


def leaves(n):
    d = low_digits(n)
    lowest = next((i for i, x in enumerate(d) if x == -1), None)
    return lowest, d.count(-1), d.count(0), d.count(1)


N = int(sys.argv[1]) if len(sys.argv) > 1 else 200000

print("TRUNK|erdos_base3_in_balanced_ternary|K=%d|N=%d|json=0" % (K, N))
print("CONJECTURE|for n>8 the balanced expansion of 2^n contains a -1|json=0")
print()

record = -1
records = []
no_minus = []
min_count_after8 = None
argmin = None
hist = {}

for n in range(N + 1):
    lowest, m, z, p = leaves(n)
    if lowest is None:
        no_minus.append(n)
        continue
    hist[lowest] = hist.get(lowest, 0) + 1
    if lowest > record:
        record = lowest
        records.append((n, lowest, m))
    if n > 8:
        if min_count_after8 is None or m < min_count_after8:
            min_count_after8, argmin = m, n

print("NO_MINUS_ANYWHERE|n=%s|json=0" % no_minus)
print("  (these are the known exceptions; empty beyond n=8 supports the conjecture)")
print()
print("RECORD_SETTERS|n where lowest_minus beats all previous|count=%d|json=0" % len(records))
print("      n          lowest_minus   minus_count_in_low_%d" % K)
for n, lo, m in records:
    print("   %-10d %-14d %d" % (n, lo, m))
print()
print("MIN_MINUS_COUNT|for n>8|value=%s|at_n=%s|json=0" % (min_count_after8, argmin))
print("  (if this never reaches 0, no counterexample was seen in this range)")
print()
print("DISTRIBUTION|lowest_minus position -> how many n|json=0")
for k in sorted(hist)[:20]:
    print("   pos %-4d %8d   (%.4f%%)" % (k, hist[k], 100 * hist[k] / (N + 1)))
tail = sum(v for k, v in hist.items() if k >= 20)
print("   pos>=20  %8d   (%.4f%%)" % (tail, 100 * tail / (N + 1)))
print()
print("PREDICTED|if digits were uniform iid over {-1,0,1}:|json=0")
print("   P(lowest_minus = k) = (2/3)^k * (1/3)")
for k in range(6):
    print("   pos %-4d expected %.4f%%   observed %.4f%%"
          % (k, 100 * (2 / 3) ** k * (1 / 3), 100 * hist.get(k, 0) / (N + 1)))
