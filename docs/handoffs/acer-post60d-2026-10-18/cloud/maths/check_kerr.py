"""Independent integer recheck of the Kerr shadow numbers (SHADOWCAT section 6 and verify.rs V2).

Usage: python3 -I check_kerr.py RUN-2026-07-26.txt VERIFY-2026-07-26.txt
Part A: the two closed-form limits, exactly (integer polynomials and fractions).
Part B: the record's tables, recomputed in fixed-point integer arithmetic (scale 10**60)
from the standard Bardeen boundary  xi = (r^2(3-r) - a^2(r+1)) / (a(r-1)),
eta = r^3(4a^2 - r(r-3)^2) / (a^2 (r-1)^2),  alpha = -xi/sin i,
beta^2 = eta + a^2 cos^2 i - xi^2 cot^2 i, M = 1. Photon-orbit radii are roots of
r(r-3)^2 = 4a^2, found by integer bisection (no trigonometry).
"""
import re
import sys
from fractions import Fraction as Q
from math import isqrt

S = 10 ** 60
ONE = S
out = []
fails = []


def say(s=""):
    out.append(s)


def mul(x, y):
    return x * y // S


def div(x, y):
    return x * S // y


def sqr(x):
    return isqrt(x * S)


def fx(n, d=1):
    return n * S // d


def dec(x, k):
    """fixed-point integer -> decimal string, k places, round half up."""
    assert type(x) is int
    sgn = "-" if x < 0 else ""
    y = abs(x)
    unit = S // 10 ** k
    n = (2 * y + unit) // (2 * unit)
    t = str(n).rjust(k + 1, "0")
    return sgn + t[:-k] + "." + t[-k:]


# ---------------------------------------------------------------- part A, exact
def poly_mul(p, q):
    r = [0] * (len(p) + len(q) - 1)
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            r[i + j] += a * b
    return r


def poly_eq(p, q):
    n = max(len(p), len(q))
    return [*p, *[0] * (n - len(p))] == [*q, *[0] * (n - len(q))]


def part_a(verify_txt):
    say("[A1] a = 0 (Schwarzschild): b^2(r) = r^3/(r-2); its minimum over r > 2 is the shadow radius^2")
    # d/dr r^3/(r-2) = r^2 (2r - 6)/(r-2)^2 vanishes at r = 3 only
    b2 = Q(27, 1)
    check("b^2 at r = 3", Q(27), Q(3 ** 3, 3 - 2))
    grid_min = min(Q(n ** 3, 1000 ** 2 * (n - 2000)) for n in range(2001, 6001))
    check("min over r in (2, 6] on a 1/1000 grid is at r = 3", Q(27), grid_min)
    lo = isqrt(27 * 10 ** 18)
    say("    radius = sqrt(27) = 3*sqrt(3) in [%d.%09d, %d.%09d] (integer sqrt bracket)"
        % (lo // 10 ** 9, lo % 10 ** 9, (lo + 1) // 10 ** 9, (lo + 1) % 10 ** 9))
    check("sqrt(27) to 9 places (record 5.196152423)", "5.196152423", dec(sqr(fx(27)), 9))
    check("sqrt(27) to 4 places (record 5.1962)", "5.1962", dec(sqr(fx(27)), 4))
    say("")
    say("[A2] a = M = 1, i = 90: exact polynomial identities")
    # r^2(3-r) - (r+1) = (r-1)(-r^2 + 2r + 1)   (coefficients low -> high)
    lhs = [-1, -1, 3, -1]
    rhs = poly_mul([-1, 1], [1, 2, -1])
    check("r^2(3-r) - (r+1) == (r-1)(-r^2+2r+1)", True, poly_eq(lhs, rhs))
    # 4 - r(r-3)^2 = (r-1)^2 (4-r)
    lhs2 = [4, -9, 6, -1]
    rhs2 = poly_mul(poly_mul([-1, 1], [-1, 1]), [4, -1])
    check("4 - r(r-3)^2 == (r-1)^2 (4-r)", True, poly_eq(lhs2, rhs2))
    say("    so alpha(r) = -xi = r^2 - 2r - 1 and beta^2 = eta = r^3 (4 - r), r in [1, 4]")
    say("    (prograde orbit r = 1, retrograde r = 4: roots of r(r-3)^2 = 4)")
    check("r(r-3)^2 = 4 at r = 1 and r = 4", True, 1 * 4 == 4 and 4 * 1 == 4)
    alpha = lambda r: r * r - 2 * r - 1
    check("alpha(1)", -2, alpha(1))
    check("alpha(4)", 7, alpha(4))
    check("alpha nondecreasing on [1,4] (alpha' = 2r - 2 >= 0)", True,
          all(alpha(Q(k, 100)) <= alpha(Q(k + 1, 100)) for k in range(100, 400)))
    check("width alpha(4) - alpha(1)", 9, alpha(4) - alpha(1))
    check("flat edge: beta^2 at r = 1 (|beta| <= sqrt 3 on alpha = -2)", 3, 1 * (4 - 1))
    check("beta^2 at r = 4", 0, 4 ** 3 * (4 - 4))


def check(label, record, mine):
    ok = record == mine
    say("  %-58s record=%-14s mine=%-14s %s" % (label, str(record), str(mine), "MATCH" if ok else "DIFF"))
    if not ok:
        fails.append(label)
    return ok


# ---------------------------------------------------------------- part B, fixed point
def g_orbit(r, a2):
    t = r - 3 * ONE
    return mul(r, mul(t, t)) - 4 * a2


def bisect(f, lo, hi):
    flo = f(lo)
    while hi - lo > 1:
        mid = (lo + hi) // 2
        fm = f(mid)
        if (fm >= 0) == (flo >= 0):
            lo, flo = mid, fm
        else:
            hi = mid
    return lo


def orbits(a):
    a2 = mul(a, a)
    r0 = bisect(lambda r: g_orbit(r, a2), ONE, 3 * ONE)
    r1 = bisect(lambda r: g_orbit(r, a2), 3 * ONE, 4 * ONE)
    return r0, r1


class View:
    def __init__(self, a, incl):
        self.a = a
        self.a2 = mul(a, a)
        if incl == 90:
            self.s, self.c2, self.cot2 = ONE, 0, 0
        elif incl == 15:
            r2, r3, r6 = sqr(fx(2)), sqr(fx(3)), sqr(fx(6))
            self.s = (r6 - r2) // 4
            self.c2 = (2 * ONE + r3) // 4
            self.cot2 = 7 * ONE + 4 * r3
        else:
            raise ValueError(incl)

    def at(self, r):
        a, a2 = self.a, self.a2
        rr = mul(r, r)
        xi = div(mul(rr, 3 * ONE - r) - mul(a2, r + ONE), mul(a, r - ONE))
        t = r - 3 * ONE
        eta = div(mul(mul(rr, r), 4 * a2 - mul(r, mul(t, t))), mul(a2, mul(r - ONE, r - ONE)))
        alpha = -div(xi, self.s)
        inside = eta + mul(a2, self.c2) - mul(mul(xi, xi), self.cot2)
        return alpha, inside


TOL = 10 ** 30  # |beta^2| below 1e-30 is treated as 0 (endpoint rounding)


def replica(v, r0, r1, n=4000, skip=()):
    pts = []
    for k in range(n + 1):
        if k in skip:
            continue
        r = r0 + (r1 - r0) * k // n
        al, ins = v.at(r)
        if ins < 0:
            if ins > -TOL:
                ins = 0
            else:
                continue
        b = sqr(ins)
        pts.append((al, b))
        pts.append((al, -b))
    amin = min(p[0] for p in pts)
    amax = max(p[0] for p in pts)
    cx = (amin + amax) // 2
    rs = [sqr(mul(x - cx, x - cx) + mul(y, y)) for x, y in pts]
    mean = sum(rs) // len(rs)
    return min(rs), max(rs), mean, div(max(rs) - min(rs), mean), amin, amax


def continuous(v, r0, r1, dense=6000):
    """True alpha extremes and true min/max radius about the true centre."""
    grid = [r0 + (r1 - r0) * k // dense for k in range(dense + 1)]
    vals = [v.at(r) for r in grid]
    ok = [ins >= -TOL for _, ins in vals]
    first = ok.index(True)
    last = len(ok) - 1 - ok[::-1].index(True)
    if first > 0:
        ra = bisect(lambda r: v.at(r)[1], grid[first - 1], grid[first]) + 1
    else:
        ra = r0
    if last < dense:
        rb = bisect(lambda r: v.at(r)[1], grid[last], grid[last + 1])
    else:
        rb = r1
    al_a, al_b = v.at(ra)[0], v.at(rb)[0]
    alphas = [vals[k][0] for k in range(first, last + 1)]
    mono = all(x <= y for x, y in zip(alphas, alphas[1:]))
    cx = (al_a + al_b) // 2

    def d2(r):
        al, ins = v.at(r)
        return mul(al - cx, al - cx) + max(ins, 0)

    sub = [ra] + [r for r in grid if ra < r < rb] + [rb]
    ds = [d2(r) for r in sub]

    def refine(idx, sign):
        lo = sub[max(idx - 1, 0)]
        hi = sub[min(idx + 1, len(sub) - 1)]
        for _ in range(200):
            if hi - lo < 3:
                break
            m1 = lo + (hi - lo) // 3
            m2 = hi - (hi - lo) // 3
            if sign * d2(m1) < sign * d2(m2):
                hi = m2
            else:
                lo = m1
        return d2((lo + hi) // 2)

    imin = ds.index(min(ds))
    imax = ds.index(max(ds))
    dmin = min(min(ds), refine(imin, 1))
    dmax = max(max(ds), refine(imax, -1))
    return sqr(dmin), sqr(dmax), al_a, al_b, mono


def part_b(run_txt, verify_txt):
    say("[B1] tables in RUN-2026-07-26.txt section [6], row by row")
    sec = run_txt.split("[6]")[1]
    tbl = re.findall(r"^\s+(\d\.\d{4})\s+(\d\.\d{4})\s+(\d\.\d{4})\s+(\d\.\d{4})\s+(\d+\.\d{4})%", sec, re.M)
    check("rows found (7 edge-on + 4 at 15 deg)", 11, len(tbl))
    incls = [90] * 7 + [15] * 4
    say("  i  a       | record rmin rmax mean spread% | replica (exact, 4001 samples) | continuous rmin rmax spread% | match")
    for (a_s, rmin_s, rmax_s, mean_s, spr_s), incl in zip(tbl, incls):
        num = int(a_s.replace(".", ""))
        a = fx(num, 10 ** 4) if num else fx(1, 10 ** 6)  # main.rs substitutes 1e-6 for a = 0
        v = View(a, incl)
        r0, r1 = orbits(a)
        rmn, rmx, mean, spr, _, _ = replica(v, r0, r1)
        crmin, crmax, _, _, mono = continuous(v, r0, r1)
        cspr = div(crmax - crmin, mean)
        rep = (dec(rmn, 4), dec(rmx, 4), dec(mean, 4), dec(spr * 100, 4))
        rec = (rmin_s, rmax_s, mean_s, spr_s)
        exact_match = rep == rec
        variant = ""
        if not exact_match and incl == 90:
            for sk, name in (((0,), "first endpoint dropped"), ((4000,), "last endpoint dropped"),
                             ((0, 4000), "both endpoints dropped")):
                q = replica(v, r0, r1, skip=sk)
                if (dec(q[0], 4), dec(q[1], 4), dec(q[2], 4), dec(q[3] * 100, 4)) == rec:
                    variant = name
                    break
        say("  %-2d %-7s | %s %s %s %8s | %s %s %s %8s | %s %s %8s | %s%s%s"
            % (incl, a_s, rmin_s, rmax_s, mean_s, spr_s, rep[0], rep[1], rep[2], rep[3],
               dec(crmin, 4), dec(crmax, 4), dec(cspr * 100, 4),
               "1" if exact_match else "0",
               (" (record = replica with " + variant + ")") if variant else "",
               "" if mono else " alpha-not-monotone"))
        if not exact_match and not variant:
            fails.append("kerr row %s i=%d" % (a_s, incl))
    say("    'continuous' = true extremes of the curve about its true centre; spread uses the")
    say("    replica mean. Section [6]'s second table is computed at i = 15 deg (main.rs:")
    say("    kerr_shadow(a, 15.0, 4000)), not on the spin axis.")

    say("")
    say("[B2] seen exactly on the spin axis (i = 0) the shadow is a circle for every a:")
    say("     radius^2 = eta + a^2 at the orbit with xi = 0, i.e. r^2(3-r) = a^2(r+1)")
    for num in (0, 5000, 9000, 9999):
        a = fx(num, 10 ** 4) if num else fx(1, 10 ** 6)
        r0, r1 = orbits(a)
        a2 = mul(a, a)
        rs = bisect(lambda r: mul(mul(r, r), 3 * ONE - r) - mul(a2, r + ONE), r0, r1)
        v = View(a, 90)
        _, eta = v.at(rs)
        say("     a = %s   r = %s   circle radius = %s M, spread 0" % (dec(a, 4), dec(rs, 6), dec(sqr(eta + a2), 4)))

    say("")
    say("[B3] VERIFY-2026-07-26.txt [V2]")
    a = fx(1, 10 ** 6)
    r0, r1 = orbits(a)
    v = View(a, 90)
    al0, al1 = v.at(r0)[0], v.at(r1)[0]
    dist = sorted([abs(al0), abs(al1)])
    m = re.search(r"computed rmin ([\d.]+)\s+rmax ([\d.]+)\s+max error ([\d.e-]+)", verify_txt)
    off = max(sqr(fx(27)) - dist[0], dist[1] - sqr(fx(27)))
    check("a=1e-6 (used for a=0): rmin from origin, 8 places", m.group(1)[:-1], dec(dist[0], 9)[:-1])
    check("a=1e-6: rmax from origin, 8 places", m.group(2)[:-1], dec(dist[1], 9)[:-1])
    say("    9th place: record %s / %s, exact %s / %s; the 2e-9 gap is f64 cancellation in xi"
        % (m.group(1), m.group(2), dec(dist[0], 9), dec(dist[1], 9)))
    say("    (terms near 9 cancelling to about 1e-5 at a = 1e-6)")
    check("record 'max error 2.00e-6' = |shift| 2a", m.group(3), "2.00e-6" if dec(off, 8) == "0.00000200" else dec(off, 8))
    say("    max |r - sqrt27| = %s ; centre offset (al0+al1)/2 = %s = 2a to %s places"
        % (dec(off, 12), dec((al0 + al1) // 2, 12), 9))
    a = fx(9999999, 10 ** 7)
    r0, r1 = orbits(a)
    v = View(a, 90)
    amin, amax = v.at(r0)[0], v.at(r1)[0]
    m1 = re.search(r"alpha_min ([-+][\d.]+)", verify_txt)
    m2 = re.search(r"alpha_max ([-+][\d.]+)", verify_txt)
    m3 = re.search(r"width ([\d.]+) M", verify_txt)
    say("    a = 0.9999999, i = 90 (verify.rs): exact curve endpoints")
    say("      alpha_min exact %s   record %s" % (dec(amin, 6), m1.group(1)))
    say("      alpha_max exact %s   record %s" % (dec(amax, 6), m2.group(1)))
    say("      width     exact %s   record %s" % (dec(amax - amin, 6), m3.group(1)))
    n = 400000
    step = (r1 - r0) // n
    second = v.at(r0 + (r1 - r0) * 1 // n)[0]
    penult = v.at(r0 + (r1 - r0) * (n - 1) // n)[0]
    say("      sample k=1 alpha %s ; sample k=n-1 alpha %s (one grid step in from each end)"
        % (dec(second, 6), dec(penult, 6)))
    check("record alpha_min equals k=1 sample (endpoint k=0 dropped)", m1.group(1).lstrip("+"), dec(second, 6))
    check("record alpha_max equals k=n-1 sample (endpoint k=n dropped)", m2.group(1).lstrip("+"), dec(penult, 6))
    check("record width equals those two samples", m3.group(1), dec(penult - second, 6))
    say("    how alpha_min approaches -2 as a -> 1 (deviation / sqrt(6(1-a))):")
    for k in range(3, 10):
        a = ONE - fx(1, 10 ** k)
        r0, _ = orbits(a)
        dv = -(View(a, 90).at(r0)[0]) - 2 * ONE
        say("      1-a = 1e-%d   alpha_min + 2 = %s   ratio %s"
            % (k, dec(-dv, 7), dec(div(dv, sqr(fx(6, 10 ** k))), 4)))
    say("    step in r at n = 400000 is %s; the offset from a < 1 dominates the residual"
        % dec(step, 9))


def main():
    run_txt = open(sys.argv[1], encoding="utf-8").read()
    verify_txt = open(sys.argv[2], encoding="utf-8").read()
    part_a(verify_txt)
    say("")
    part_b(run_txt, verify_txt)
    say("")
    say("FAILS: %d %s" % (len(fails), fails))
    print("\n".join(out))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
