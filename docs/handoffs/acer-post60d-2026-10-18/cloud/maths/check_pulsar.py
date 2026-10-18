"""Independent exact recheck of SHADOWCAT section 5 (pulsar gear train) and the hbp/hbi sizes.

Usage: python3 -I check_pulsar.py
Inputs are the measured values main.rs uses, written as exact rationals. Every result
is an exact Fraction (square roots and pi are bracketed by integer bounds), then
rounded to the digits the record prints.
"""
import sys
from fractions import Fraction as Q
from math import isqrt

out = []
fails = []
AXES = (2731, 1999, 1723)
CLOSURE = 2731 * 1999 * 1723
YEAR = 36525 * 864  # 365.25 d * 86400 s, as main.rs
PI_LO = Q(3141592653589793, 10 ** 15)
PI_HI = Q(3141592653589794, 10 ** 15)


def say(s=""):
    out.append(s)


def fix(x, k):
    """Exact rational -> decimal string with k places, round half up."""
    assert isinstance(x, (int, Q))
    s = -1 if x < 0 else 1
    y = abs(x) * 10 ** k
    n = (y.numerator * 2 + y.denominator) // (y.denominator * 2)
    t = str(n).rjust(k + 1, "0")
    return ("-" if s < 0 else "") + t[:-k] + "." + t[-k:] if k else ("-" if s < 0 else "") + t


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
    m = fix(x, k)
    if m.startswith("10."):
        m = fix(x / 10, k)
        e += 1
    return "%se%d" % (m, e)


def sqrt_bracket(x, digits=30):
    """Integer bracket of sqrt(x) for rational x >= 0: lo <= sqrt(x) <= hi."""
    assert isinstance(x, Q)
    scale = 10 ** digits
    n = x.numerator * scale * scale
    d = x.denominator
    r = isqrt(n // d)
    return Q(r, scale), Q(r + 1, scale)


def check(label, record, mine):
    ok = record == mine
    say("  %-52s record=%-12s mine=%-12s %s" % (label, record, mine, "MATCH" if ok else "DIFF"))
    if not ok:
        fails.append(label)


def main():
    crab_f = Q(29946, 1000)
    crab_p_ms = Q(33392, 1000)
    crab_fdot = Q(-37, 10 ** 11)
    ms_f = Q(71635, 100)
    ms_p_ms = Q(13959, 10000)

    say("[A] closure and per-axis recurrence = turns / spin frequency (exact rationals)")
    check("three-axis closure (turns)", 9406320487, CLOSURE)
    rec_crab = {2731: "91.1975", 1999: "66.7535", 1723: "57.5369"}
    rec_ms = {2731: "3.8124", 1999: "2.7905", 1723: "2.4052"}
    for a in AXES:
        check("Crab axis %d recurs every (s)" % a, rec_crab[a], fix(Q(a) / crab_f, 4))
    for a in AXES:
        check("J1748-2446ad axis %d recurs every (s)" % a, rec_ms[a], fix(Q(a) / ms_f, 4))
    cs = Q(CLOSURE) / crab_f
    ms = Q(CLOSURE) / ms_f
    check("Crab full closure (s)", "3.1411e8", sci(cs, 4))
    check("Crab full closure (years, 365.25 d)", "9.9535", fix(cs / YEAR, 4))
    check("J1748 full closure (s)", "1.3131e7", sci(ms, 4))
    check("J1748 full closure (years)", "0.4161", fix(ms / YEAR, 4))
    check("J1748 closure in months (record: 'five months')", "5.0", fix(ms / YEAR * 12, 1))
    check("spin ratio 716.35/29.946 (record ~23.9)", "23.9", fix(ms_f / crab_f, 1))
    check("closure-years ratio equals spin ratio exactly", True, (cs / YEAR) / (ms / YEAR) == ms_f / crab_f)

    say("")
    say("[B] the stated periods against 1/f")
    for lbl, rec, mine in (("Crab 1000/f (ms) vs input P = 33.392", "33.392", fix(1000 / crab_f, 3)),
                           ("J1748 1000/f (ms) vs input P = 1.3959", "1.3959", fix(1000 / ms_f, 4))):
        say("  %-52s record=%-12s mine=%-12s %s" % (lbl, rec, mine, "MATCH" if rec == mine else "DIFF (inputs, not a computed claim)"))
    say("    1000/29.946 = %s ms; the f and P pair in main.rs differ in the 4th digit" % fix(1000 / crab_f, 5))
    say("    (consistent with f being 29.9469.. truncated to 29.946); recurrences use f only")

    say("")
    say("[C] Crab surface dipole B = 3.2e19 * sqrt(P * Pdot), Pdot = -fdot / f^2")
    pdot = -crab_fdot / (crab_f * crab_f)
    inside = (crab_p_ms / 1000) * pdot
    lo, hi = sqrt_bracket(inside)
    b_lo, b_hi = Q(32 * 10 ** 18) * lo, Q(32 * 10 ** 18) * hi
    say("    Pdot = %s s/s" % sci(pdot, 4))
    check("B (G), 4 significant digits", "3.756e12", sci(b_lo, 3))
    check("B bracket agrees at 3 decimals", sci(b_lo, 3), sci(b_hi, 3))
    bcr = Q(441 * 10 ** 11)
    check("B / Bcr (Bcr = 4.41e13 G)", "0.0852", fix(b_lo / bcr, 4))
    check("B above 1e12 G", True, b_lo > 10 ** 12)
    check("B below 0.3 Bcr", True, b_hi < Q(3, 10) * bcr)

    say("")
    say("[D] J1748-2446ad equatorial speed at the stated radius bound R < 16 km")
    c = 299792458
    v_lo = 2 * PI_LO * 16000 * ms_f / c
    v_hi = 2 * PI_HI * 16000 * ms_f / c
    check("v/c at R = 16 km (upper bound), 2 decimals", "0.24", fix(v_lo, 2))
    say("    v/c in [%s, %s]; an upper bound, since R < 16 km is a bound" % (fix(v_lo, 6), fix(v_hi, 6)))

    say("")
    say("[E] shadowcat.hbp / .hbi sizes from the format in main.rs (header, TLV, sha trailer)")
    label = "SHADOWCAT/1 LAW34 BROWN-SCHRODINGER"
    recs = [len(label)] + [16] * 3 + [1, 1] + [16] * 2 + [16] * 3 + [16] + [8, 8] + [8] + [8] * 7
    hbp = 4 + 4 + 4 + sum(5 + n for n in recs) + 32
    hbi = 4 + 4 + 13 * len(recs)
    check("records emitted", 22, len(recs))
    check("shadowcat.hbp bytes", 415, hbp)
    check("shadowcat.hbi bytes", 294, hbi)
    say("    note: record section 8 labels tag 0x21 'vertices'; main.rs writes the group order")
    say("    there (60); the value is the same number, the label is not")

    say("")
    say("FAILS: %d %s" % (len(fails), fails))
    print("\n".join(out))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
