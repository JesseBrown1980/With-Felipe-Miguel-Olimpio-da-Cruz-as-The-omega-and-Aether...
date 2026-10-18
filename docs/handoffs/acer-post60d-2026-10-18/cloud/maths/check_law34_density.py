"""Independent exact recheck of the computable statements in LAW-34 and callingchain.rs section 3.

Usage: python3 -I check_law34_density.py
Integers and fractions only; pi is bracketed by two rationals.
"""
import sys
from fractions import Fraction as Q
from math import isqrt

out = []
fails = []
PI_LO = Q(3141592653589793, 10 ** 15)
PI_HI = Q(3141592653589794, 10 ** 15)
C = 299792458
G = Q(667430, 10 ** 16)
MSUN = Q(198847, 1) * 10 ** 25


def say(s=""):
    out.append(s)


def check(label, record, mine):
    ok = record == mine
    say("  %-58s record=%-14s mine=%-14s %s" % (label, str(record), str(mine), "MATCH" if ok else "DIFF"))
    if not ok:
        fails.append(label)


def sci(x, k):
    assert isinstance(x, (int, Q))
    x = Q(x)
    e = 0
    while abs(x) >= 10:
        x /= 10
        e += 1
    while abs(x) < 1:
        x *= 10
        e -= 1
    y = abs(x) * 10 ** k
    n = (2 * y.numerator + y.denominator) // (2 * y.denominator)
    t = str(n)
    if len(t) > k + 1:
        t = t[:-1]
        e += 1
    return "%s%s.%se%d" % ("-" if x < 0 else "", t[0], t[1:], e)


def sqrt_lo(x, digits=30):
    assert isinstance(x, Q)
    sc = 10 ** digits
    return Q(isqrt(x.numerator * sc * sc // x.denominator), sc)


def rho(m_kg, pi):
    return Q(3) * C ** 6 / (32 * pi * G ** 3 * m_kg * m_kg)


def main():
    say("[A] LAW-34 section 5 ladder: width x4, index +3, index = 3*(log4 width - 3)")
    ladder = [(256, 3, 4), (1024, 6, 5), (4096, 9, 6), (16384, 12, 7), (65536, 15, 8)]
    for width, idx, power in ladder:
        k = 0
        w = width
        while w % 4 == 0:
            w //= 4
            k += 1
        ok = w == 1 and k == power and 3 * (k - 3) == idx
        check("%d = 4^%d, index %d" % (width, power, idx), True, ok)
    check("successive widths x4", True, all(b[0] == 4 * a[0] for a, b in zip(ladder, ladder[1:])))
    check("successive indices +3", True, all(b[1] == a[1] + 3 for a, b in zip(ladder, ladder[1:])))
    exps = []
    for n in (3, 27, 2187, 6561):
        k = 0
        while n % 3 == 0:
            n //= 3
            k += 1
        exps.append(k)
    say("    the '3 / 27 / 2187 / 6561 ladder' is 3^%s: exponents %s, steps %s"
        % (exps, exps, [b - a for a, b in zip(exps, exps[1:])]))
    say("    no 3-6-9 step pattern appears in those exponents; the 'same spine' claim is a naming")

    say("")
    say("[B] LAW-34 section 3: Mandelstam s + t + u = sum of the four masses squared")
    seed = 20261018

    def rnd():
        nonlocal seed
        seed = (seed * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (seed >> 33) % 2001 - 1000

    def dot(p, q):
        return p[0] * q[0] - p[1] * q[1] - p[2] * q[2] - p[3] * q[3]
    bad = 0
    for _ in range(2000):
        p1 = [rnd() for _ in range(4)]
        p2 = [rnd() for _ in range(4)]
        p3 = [rnd() for _ in range(4)]
        p4 = [a + b - c for a, b, c in zip(p1, p2, p3)]
        add = lambda x, y: [a + b for a, b in zip(x, y)]
        sub = lambda x, y: [a - b for a, b in zip(x, y)]
        s = dot(add(p1, p2), add(p1, p2))
        t = dot(sub(p1, p3), sub(p1, p3))
        u = dot(sub(p1, p4), sub(p1, p4))
        if s + t + u != dot(p1, p1) + dot(p2, p2) + dot(p3, p3) + dot(p4, p4):
            bad += 1
    check("identity failures over 2000 integer momentum sets", 0, bad)
    say("    independent invariants with fixed masses, n external momenta: n(n-3)/2 ->")
    say("    2->2 (n=4): %d ; 2->3 (n=5): %d. 'Two coordinates exhaust it' holds for 2->2 only" % (4 * 1 // 2, 5 * 2 // 2))

    say("")
    say("[C] callingchain.rs section 3: mean density inside r_s, rho = 3 c^6 / (32 pi G^3 M^2)")
    m = Q(7) * MSUN
    vol_over_pi = Q(4, 3) * (2 * G * m / C ** 2) ** 3
    check("M / ((4/3) pi r_s^3) == 3c^6/(32 pi G^3 M^2) (pi factored out)", True,
          m / vol_over_pi == Q(3) * C ** 6 / (32 * G ** 3 * m * m))
    check("rho(2M) == rho(M) / 4 exactly", True, rho(2 * m, PI_LO) * 4 == rho(m, PI_LO))
    objs = [("stellar-mass BH", Q(10)), ("Cygnus X-1 class", Q(21)), ("GW150914 remnant", Q(62)),
            ("intermediate-mass", Q(10 ** 5)), ("Sgr A*", Q(4297) * 10 ** 3), ("M87*", Q(65) * 10 ** 8)]
    for name, msun in objs:
        mk = msun * MSUN
        rs_km = 2 * G * mk / C ** 2 / 1000
        lo, hi = rho(mk, PI_HI), rho(mk, PI_LO)
        say("    %-18s M = %-9s Msun  r_s = %s km  rho in [%s, %s] kg/m^3"
            % (name, sci(msun, 3), sci(rs_km, 4), sci(lo, 4), sci(hi, 4)))
    m87 = rho(Q(65) * 10 ** 8 * MSUN, PI_LO)
    check("M87* mean density below air at sea level (1.225 kg/m^3)", True, m87 < Q(1225, 1000))
    for name, dens in (("nuclear saturation 2.3e17", Q(23) * 10 ** 16), ("the Sun 1408", Q(1408)),
                       ("water 1000", Q(1000)), ("air 1.225", Q(1225, 1000)), ("molecular cloud 1e-18", Q(1, 10 ** 18))):
        mass2 = Q(3) * C ** 6 / (32 * PI_LO * G ** 3 * dens)
        msun = sqrt_lo(mass2) / MSUN
        say("    a BH of mean density %-24s weighs %s Msun" % (name, sci(msun, 4)))
        if name.startswith("water"):
            check("water-density BH lies in the supermassive range 1e6..1e10 Msun", True, 10 ** 6 < msun < 10 ** 10)
    say("    note: (4/3) pi r_s^3 is a coordinate convention, as the source says ('Euclidean ball');")
    say("    the 1/M^2 law is exact for that definition")

    say("")
    say("FAILS: %d %s" % (len(fails), fails))
    print("\n".join(out))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
