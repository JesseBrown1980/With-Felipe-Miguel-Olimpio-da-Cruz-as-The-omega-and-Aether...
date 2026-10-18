#!/usr/bin/env python3
"""Stdlib referee for HyperBEHCS quants 9-12 (registry slots Q-JL-ACHLIOPTAS-SEEDED-v1,
Q-TURBO-MINMAX-U8-v1, Q-POLAR-RTHETA-v1, Q-TRIPLE-SPHERICAL-v1).

Mirrors vendor/Asolaria-ASI-On-Metal-Fabric-and-matrix/tools/falcon/omni-acer/lib/hyperbehcs-core.cjs
line by line (cited as core:<line>) and V8's src/base/ieee754.cc (v8 12.4.254.21, the fdlibm port
that Node 22 and 24 run for Math.atan2, Math.acos, Math.sin and Math.cos; cited as ieee754:<line>).

Integer arithmetic only: a JavaScript Number is held as its IEEE-754 binary64 bit pattern in a
Python int, and every + - * / and Math.sqrt is computed exactly on integers and then rounded to
nearest, ties to even (IEEE 754-2019 4.3.1). No Python float is created anywhere in this file.

  python3 -I tools/referee.py            write tests/fixtures/hyperbehcs-quants.hbp
  python3 -I tools/referee.py --check    regenerate in memory and diff against the committed file
  python3 -I tools/referee.py --grid N   print N operation lines per operation for examples/grid.rs
"""

import hashlib
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "hyperbehcs-quants.hbp")
CORE = os.path.join(
    ROOT, "vendor", "Asolaria-ASI-On-Metal-Fabric-and-matrix", "tools", "falcon", "omni-acer", "lib",
    "hyperbehcs-core.cjs")
CORE_SHA256 = "668a938a8b0281694797d64a6ff31921031b9af58fd7afb77a50dd3e0ee31e08"

# ---------------------------------------------------------------------------------------------
# binary64 on integers. A Number is an int in [0, 2^64): sign bit 63, exponent bits 52-62,
# fraction bits 0-51.

SIGN = 1 << 63
ABS = SIGN - 1
EXP = 0x7FF << 52
FRAC = (1 << 52) - 1
HIDDEN = 1 << 52

ZERO = 0
NEG_ZERO = SIGN
INF = 0x7FF0000000000000
NEG_INF = SIGN | INF
NAN = 0x7FF8000000000000  # the quiet NaN the fixture records for NaN inputs
PI = 0x400921FB54442D18  # Math.PI


def is_nan(x):
    return (x & ABS) > INF


def is_inf(x):
    return (x & ABS) == INF


def is_finite(x):
    return (x & EXP) != EXP


def is_zero(x):
    return (x & ABS) == 0


def neg(x):
    """Unary minus: flips the sign bit."""
    return x ^ SIGN


def fabs(x):
    return x & ABS


def decode(x):
    """Finite x -> (sign, m, e) with |x| = m * 2^e."""
    biased = (x >> 52) & 0x7FF
    if biased == 0:
        return x >> 63, x & FRAC, -1074
    return x >> 63, (x & FRAC) | HIDDEN, biased - 1075


def pack(negative, m, e):
    """The binary64 nearest to (-1)^negative * m * 2^e for an integer m >= 0, ties to even."""
    s = SIGN if negative else 0
    if m == 0:
        return s
    shift = m.bit_length() - 53
    if e + shift < -1074:  # subnormal result: the quantum is 2^-1074
        shift = -1074 - e
    if shift > 0:
        q = m >> shift
        rem = m & ((1 << shift) - 1)
        half = 1 << (shift - 1)
        if rem > half or (rem == half and q & 1):
            q += 1
        e += shift
        if q == 1 << 53:
            q >>= 1
            e += 1
    else:
        q = m << -shift
        e += shift
    if q == 0:
        return s
    if q >= HIDDEN:
        biased = e + 1075
        if biased >= 0x7FF:
            return s | INF
        return s | (biased << 52) | (q - HIDDEN)
    return s | q


def pack_ratio(negative, num, den, e):
    """The binary64 nearest to (-1)^negative * num / den * 2^e (num >= 0, den > 0), ties to even.

    The quotient is taken to at least 56 bits and the remainder kept as a sticky bit, which
    rounds exactly as the full quotient does."""
    if num == 0:
        return SIGN if negative else 0
    s = 56 + den.bit_length() - num.bit_length()
    if s >= 0:
        q, r = divmod(num << s, den)
    else:
        q, r = divmod(num, den << -s)
    return pack(negative, (q << 1) | (1 if r else 0), e - s - 1)


def from_int(n):
    """static_cast<double>(n) / Number(n) for an integer n."""
    return pack(n < 0, -n if n < 0 else n, 0)


def dec(text):
    """A decimal literal as JavaScript and C parse it: the nearest binary64, ties to even."""
    negative = text.startswith("-")
    body = text.lstrip("+-").lower()
    mant, _, exp = body.partition("e")
    whole, _, frac = mant.partition(".")
    digits = int(whole + frac)
    e10 = (int(exp) if exp else 0) - len(frac)
    if e10 >= 0:
        return pack(negative, digits * 10 ** e10, 0)
    return pack_ratio(negative, digits, 10 ** -e10, 0)


def add(a, b):
    """a + b."""
    if is_nan(a) or is_nan(b):
        return NAN
    if is_inf(a):
        if is_inf(b) and a != b:
            return NAN
        return a
    if is_inf(b):
        return b
    if is_zero(a) and is_zero(b):
        return a & b  # -0 only when both are -0
    if is_zero(a):
        return b
    if is_zero(b):
        return a
    sa, ma, ea = decode(a)
    sb, mb, eb = decode(b)
    e = min(ea, eb)
    va = ma << (ea - e)
    vb = mb << (eb - e)
    total = (-va if sa else va) + (-vb if sb else vb)
    if total == 0:
        return ZERO
    return pack(total < 0, abs(total), e)


def sub(a, b):
    """a - b, which IEEE 754 defines as a + (-b)."""
    return add(a, neg(b))


def mul(a, b):
    """a * b."""
    if is_nan(a) or is_nan(b):
        return NAN
    s = (a ^ b) & SIGN
    if is_inf(a) or is_inf(b):
        if is_zero(a) or is_zero(b):
            return NAN
        return s | INF
    if is_zero(a) or is_zero(b):
        return s
    _, ma, ea = decode(a)
    _, mb, eb = decode(b)
    return pack(s != 0, ma * mb, ea + eb)


def div(a, b):
    """a / b, including division by a zero of either sign."""
    if is_nan(a) or is_nan(b):
        return NAN
    s = (a ^ b) & SIGN
    if is_inf(a):
        return NAN if is_inf(b) else s | INF
    if is_inf(b):
        return s
    if is_zero(b):
        return NAN if is_zero(a) else s | INF
    if is_zero(a):
        return s
    _, ma, ea = decode(a)
    _, mb, eb = decode(b)
    return pack_ratio(s != 0, ma, mb, ea - eb)


def sqrt(x):
    """Correctly rounded square root, as V8's Float64Sqrt (NaN below zero, -0 for -0)."""
    if is_nan(x):
        return NAN
    if is_zero(x):
        return x
    if x & SIGN:
        return NAN
    if is_inf(x):
        return x
    _, m, e = decode(x)
    if e & 1:
        m <<= 1
        e -= 1
    t = max(0, (112 - m.bit_length()) // 2 + 1)
    big = m << (2 * t)
    r = math.isqrt(big)  # floor of the square root, at least 56 bits
    return pack(False, (r << 1) | (1 if r * r != big else 0), e // 2 - t - 1)


def key(x):
    """A total order key for non-NaN x in which -0 and +0 are equal."""
    return -(x & ABS) if x & SIGN else x


def lt(a, b):
    return not (is_nan(a) or is_nan(b)) and key(a) < key(b)


def gt(a, b):
    return lt(b, a)


def ge(a, b):
    return not (is_nan(a) or is_nan(b)) and key(a) >= key(b)


def eq(a, b):
    """a == b (and a === b) on Numbers: false for NaN, true for -0 and +0."""
    return not (is_nan(a) or is_nan(b)) and key(a) == key(b)


def trunc(x):
    """static_cast<int32_t>(x) for finite x inside the int32 range: truncation toward zero."""
    if not is_finite(x):
        raise ValueError("trunc of a non-finite Number")
    if is_zero(x):
        return 0
    s, m, e = decode(x)
    v = m << e if e >= 0 else m >> -e
    return -v if s else v


def floor(x):
    """Math.floor / C floor."""
    if not is_finite(x) or is_zero(x):
        return x
    s, m, e = decode(x)
    if e >= 0:
        return x
    q = m >> -e
    if s and (m & ((1 << -e) - 1)):
        q += 1
    return pack(s != 0, q, 0)


def ceil(x):
    """Math.ceil(x) = -floor(-x)."""
    return neg(floor(neg(x)))


def scalbn(x, n):
    """C scalbn(x, n): x * 2^n, rounded once."""
    if not is_finite(x) or is_zero(x):
        return x
    s, m, e = decode(x)
    return pack(s != 0, m, e + n)


def pow2(n):
    """2 ** n for an integer n."""
    return pack(False, 1, n)


def poly(z, coeffs):
    """c0 + z*(c1 + z*(c2 + ... + z*c_last)), evaluated innermost first as written in C."""
    r = coeffs[-1]
    for c in reversed(coeffs[:-1]):
        r = add(c, mul(z, r))
    return r


ONE = dec("1")
NEG_ONE = neg(ONE)
HALF = dec("0.5")
TWO = dec("2")
THREE = dec("3")
EIGHT = dec("8")

# ---------------------------------------------------------------------------------------------
# binary64 words (ieee754:52-102)


def i32(u):
    u &= 0xFFFFFFFF
    return u - (1 << 32) if u & 0x80000000 else u


def high_word(x):
    return i32(x >> 32)


def low_word(x):
    return x & 0xFFFFFFFF


def insert_words(hi, lo):
    return ((hi & 0xFFFFFFFF) << 32) | (lo & 0xFFFFFFFF)


def set_low_word(d, lo):
    return (d & 0xFFFFFFFF00000000) | (lo & 0xFFFFFFFF)


# ---------------------------------------------------------------------------------------------
# V8 base::ieee754 (fdlibm) ports


ATANHI = [0x3FDDAC670561BB4F, 0x3FE921FB54442D18, 0x3FEF730BD281F69B, 0x3FF921FB54442D18]
ATANLO = [0x3C7A2B7F222F65E2, 0x3C81A62633145C07, 0x3C7007887AF0CBBD, 0x3C91A62633145C07]
AT = [
    0x3FD555555555550D, 0xBFC999999998EBC4, 0x3FC24924920083FF, 0xBFBC71C6FE231671,
    0x3FB745CDC54C206E, 0xBFB3B0F2AF749A6D, 0x3FB10D66A0D03D51, 0xBFADDE2D52DEFD9A,
    0x3FA97B4B24760DEB, 0xBFA2B4442C6A6C2F, 0x3F90AD3AE322DA11]
HUGE = dec("1.0e300")
TINY = dec("1.0e-300")
ONE_POINT_FIVE = dec("1.5")


def atan(x):
    """ieee754:1116-1200."""
    one = ONE
    hx = high_word(x)
    ix = hx & 0x7FFFFFFF
    if ix >= 0x44100000:  # |x| >= 2^66
        low = low_word(x)
        if ix > 0x7FF00000 or (ix == 0x7FF00000 and low != 0):
            return add(x, x)  # NaN
        if hx > 0:
            return add(ATANHI[3], ATANLO[3])
        return sub(neg(ATANHI[3]), ATANLO[3])
    if ix < 0x3FDC0000:  # |x| < 0.4375
        if ix < 0x3E400000:  # |x| < 2^-27
            if gt(add(HUGE, x), one):
                return x
        id_ = -1
    else:
        x = fabs(x)
        if ix < 0x3FF30000:  # |x| < 1.1875
            if ix < 0x3FE60000:  # 7/16 <= |x| < 11/16
                id_ = 0
                x = div(sub(mul(TWO, x), one), add(TWO, x))
            else:  # 11/16 <= |x| < 19/16
                id_ = 1
                x = div(sub(x, one), add(x, one))
        else:
            if ix < 0x40038000:  # |x| < 2.4375
                id_ = 2
                x = div(sub(x, ONE_POINT_FIVE), add(one, mul(ONE_POINT_FIVE, x)))
            else:  # 2.4375 <= |x| < 2^66
                id_ = 3
                x = div(NEG_ONE, x)
    z = mul(x, x)
    w = mul(z, z)
    s1 = mul(z, poly(w, [AT[0], AT[2], AT[4], AT[6], AT[8], AT[10]]))
    s2 = mul(w, poly(w, [AT[1], AT[3], AT[5], AT[7], AT[9]]))
    if id_ < 0:
        return sub(x, mul(x, add(s1, s2)))
    z = sub(ATANHI[id_], sub(sub(mul(x, add(s1, s2)), ATANLO[id_]), x))
    return neg(z) if hx < 0 else z


def atan2(y, x):
    """ieee754:1228-1319."""
    tiny = TINY
    zero = ZERO
    pi_o_4 = 0x3FE921FB54442D18
    pi_o_2 = 0x3FF921FB54442D18
    pi = 0x400921FB54442D18
    pi_lo = 0x3CA1A62633145C07
    hx = high_word(x)
    lx = low_word(x)
    ix = hx & 0x7FFFFFFF
    hy = high_word(y)
    ly = low_word(y)
    iy = hy & 0x7FFFFFFF
    if (ix | (1 if lx else 0)) > 0x7FF00000 or (iy | (1 if ly else 0)) > 0x7FF00000:
        return add(x, y)  # x or y is NaN
    if (i32(hx - 0x3FF00000) | lx) == 0:
        return atan(y)  # x = 1.0
    m = ((hy >> 31) & 1) | ((hx >> 30) & 2)  # 2*sign(x)+sign(y)
    if (iy | ly) == 0:
        if m in (0, 1):
            return y
        if m == 2:
            return add(pi, tiny)
        return sub(neg(pi), tiny)
    if (ix | lx) == 0:
        return sub(neg(pi_o_2), tiny) if hy < 0 else add(pi_o_2, tiny)
    if ix == 0x7FF00000:
        if iy == 0x7FF00000:
            three_pi_o_4 = mul(THREE, pi_o_4)
            return [add(pi_o_4, tiny), sub(neg(pi_o_4), tiny), add(three_pi_o_4, tiny),
                    sub(mul(neg(THREE), pi_o_4), tiny)][m]
        return [zero, neg(zero), add(pi, tiny), sub(neg(pi), tiny)][m]
    if iy == 0x7FF00000:
        return sub(neg(pi_o_2), tiny) if hy < 0 else add(pi_o_2, tiny)
    k = (iy - ix) >> 20
    if k > 60:  # |y/x| > 2^60
        z = add(pi_o_2, mul(HALF, pi_lo))
        m &= 1
    elif hx < 0 and k < -60:
        z = ZERO  # 0 > |y|/x > -2^-60
    else:
        z = atan(fabs(div(y, x)))
    if m == 0:
        return z
    if m == 1:
        return neg(z)
    if m == 2:
        return sub(pi, sub(z, pi_lo))
    return sub(sub(z, pi_lo), pi)


PS = [0x3FC5555555555555, 0xBFD4D61203EB6F7D, 0x3FC9C1550E884455, 0xBFA48228B5688F3B,
      0x3F49EFE07501B288, 0x3F023DE10DFDF709]  # pS0..pS5
QS = [0xC0033A271C8A2D4B, 0x40002AE59C598AC8, 0xBFE6066C1B8D0159, 0x3FB3B8C5B12E9282]  # qS1..qS4


def acos(x):
    """ieee754:862-921."""
    one = ONE
    pi = 0x400921FB54442D18
    pio2_hi = 0x3FF921FB54442D18
    pio2_lo = 0x3C91A62633145C07
    hx = high_word(x)
    ix = hx & 0x7FFFFFFF
    if ix >= 0x3FF00000:  # |x| >= 1
        lx = low_word(x)
        if ((ix - 0x3FF00000) | lx) == 0:  # |x| == 1
            if hx > 0:
                return ZERO
            return add(pi, mul(TWO, pio2_lo))
        return NAN
    if ix < 0x3FE00000:  # |x| < 0.5
        if ix <= 0x3C600000:
            return add(pio2_hi, pio2_lo)
        z = mul(x, x)
        p = mul(z, poly(z, PS))
        q = poly(z, [one] + QS)
        r = div(p, q)
        return sub(pio2_hi, sub(x, sub(pio2_lo, mul(x, r))))
    if hx < 0:  # x < -0.5
        z = mul(add(one, x), HALF)
        p = mul(z, poly(z, PS))
        q = poly(z, [one] + QS)
        s = sqrt(z)
        r = div(p, q)
        w = sub(mul(r, s), pio2_lo)
        return sub(pi, mul(TWO, add(s, w)))
    z = mul(sub(one, x), HALF)  # x > 0.5
    s = sqrt(z)
    df = set_low_word(s, 0)
    c = div(sub(z, mul(df, df)), add(s, df))
    p = mul(z, poly(z, PS))
    q = poly(z, [one] + QS)
    r = div(p, q)
    w = add(mul(r, s), c)
    return mul(TWO, add(df, w))


TWO_OVER_PI = [
    0xA2F983, 0x6E4E44, 0x1529FC, 0x2757D1, 0xF534DD, 0xC0DB62, 0x95993C,
    0x439041, 0xFE5163, 0xABDEBB, 0xC561B7, 0x246E3A, 0x424DD2, 0xE00649,
    0x2EEA09, 0xD1921C, 0xFE1DEB, 0x1CB129, 0xA73EE8, 0x8235F5, 0x2EBB44,
    0x84E99C, 0x7026B4, 0x5F7E41, 0x3991D6, 0x398353, 0x39F49C, 0x845F8B,
    0xBDF928, 0x3B1FF8, 0x97FFDE, 0x05980F, 0xEF2F11, 0x8B5A0A, 0x6D1F6D,
    0x367ECF, 0x27CB09, 0xB74F46, 0x3F669E, 0x5FEA2D, 0x7527BA, 0xC7EBE5,
    0xF17B3D, 0x0739F7, 0x8A5292, 0xEA6BFB, 0x5FB11F, 0x8D5D08, 0x560330,
    0x46FC7B, 0x6BABF0, 0xCFBC20, 0x9AF436, 0x1DA9E3, 0x91615E, 0xE61B08,
    0x659985, 0x5F14A0, 0x68408D, 0xFFD880, 0x4D7327, 0x310606, 0x1556CA,
    0x73A8C9, 0x60E27B, 0xC08C6B,
]

PIO2 = [
    0x3FF921FB40000000, 0x3E74442D00000000, 0x3CF8469880000000, 0x3B78CC5160000000,
    0x39F01B8380000000, 0x387A252040000000, 0x36E3822280000000, 0x3569F31D00000000]
TWO24 = 0x4170000000000000
TWON24 = 0x3E70000000000000
EIGHTH = dec("0.125")


def kernel_rem_pio2(x, e0, nx, prec):
    """ieee754:443-644 (__kernel_rem_pio2) with ipio2 = two_over_pi; returns (n & 7, y)."""
    init_jk = [2, 3, 4, 6]
    zero = ZERO
    one = ONE
    two24 = TWO24
    twon24 = TWON24
    iq = [0] * 20
    f = [ZERO] * 20
    fq = [ZERO] * 20
    q = [ZERO] * 20
    y = [ZERO, ZERO]
    jk = init_jk[prec]
    jp = jk
    jx = nx - 1
    jv = (e0 - 3) // 24 if e0 >= 3 else -((3 - e0) // 24)  # C division truncates toward zero
    if jv < 0:
        jv = 0
    q0 = e0 - 24 * (jv + 1)
    j = jv - jx
    m = jx + jk
    for i in range(m + 1):
        f[i] = zero if j < 0 else from_int(TWO_OVER_PI[j])
        j += 1
    for i in range(jk + 1):
        fw = ZERO
        for j in range(jx + 1):
            fw = add(fw, mul(x[j], f[jx + i - j]))
        q[i] = fw
    jz = jk
    while True:  # recompute:
        i = 0
        j = jz
        z = q[jz]
        while j > 0:
            fw = from_int(trunc(mul(twon24, z)))
            iq[i] = trunc(sub(z, mul(two24, fw)))
            z = add(q[j - 1], fw)
            i += 1
            j -= 1
        z = scalbn(z, q0)
        z = sub(z, mul(EIGHT, floor(mul(z, EIGHTH))))
        n = trunc(z)
        z = sub(z, from_int(n))
        ih = 0
        if q0 > 0:
            i = iq[jz - 1] >> (24 - q0)
            n += i
            iq[jz - 1] -= i << (24 - q0)
            ih = iq[jz - 1] >> (23 - q0)
        elif q0 == 0:
            ih = iq[jz - 1] >> 23
        elif ge(z, HALF):
            ih = 2
        if ih > 0:
            n += 1
            carry = 0
            for i in range(jz):
                j = iq[i]
                if carry == 0:
                    if j != 0:
                        carry = 1
                        iq[i] = 0x1000000 - j
                else:
                    iq[i] = 0xFFFFFF - j
            if q0 > 0:
                if q0 == 1:
                    iq[jz - 1] &= 0x7FFFFF
                elif q0 == 2:
                    iq[jz - 1] &= 0x3FFFFF
            if ih == 2:
                z = sub(one, z)
                if carry != 0:
                    z = sub(z, scalbn(one, q0))
        if eq(z, zero):
            j = 0
            for i in range(jz - 1, jk - 1, -1):
                j |= iq[i]
            if j == 0:
                k = 1
                while jk >= k and iq[jk - k] == 0:
                    k += 1
                for i in range(jz + 1, jz + k + 1):
                    f[jx + i] = from_int(TWO_OVER_PI[jv + i])
                    fw = ZERO
                    for j in range(jx + 1):
                        fw = add(fw, mul(x[j], f[jx + i - j]))
                    q[i] = fw
                jz += k
                continue
        break
    if eq(z, ZERO):
        jz -= 1
        q0 -= 24
        while iq[jz] == 0:
            jz -= 1
            q0 -= 24
    else:
        z = scalbn(z, -q0)
        if ge(z, two24):
            fw = from_int(trunc(mul(twon24, z)))
            iq[jz] = trunc(sub(z, mul(two24, fw)))
            jz += 1
            q0 += 24
            iq[jz] = trunc(fw)
        else:
            iq[jz] = trunc(z)
    fw = scalbn(one, q0)
    for i in range(jz, -1, -1):
        q[i] = mul(fw, from_int(iq[i]))
        fw = mul(fw, twon24)
    for i in range(jz, -1, -1):
        fw = ZERO
        k = 0
        while k <= jp and k <= jz - i:
            fw = add(fw, mul(PIO2[k], q[i + k]))
            k += 1
        fq[jz - i] = fw
    # prec == 2, the precision __ieee754_rem_pio2 requests (ieee754:263)
    fw = ZERO
    for i in range(jz, -1, -1):
        fw = add(fw, fq[i])
    y[0] = fw if ih == 0 else neg(fw)
    fw = sub(fq[0], fw)
    for i in range(1, jz + 1):
        fw = add(fw, fq[i])
    y[1] = fw if ih == 0 else neg(fw)
    return n & 7, y


NPIO2_HW = [
    0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C,
    0x4025FDBB, 0x402921FB, 0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C,
    0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB, 0x403AB41B, 0x403C463A,
    0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C,
    0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB,
    0x404858EB, 0x404921FB,
]


def rem_pio2(x):
    """ieee754:118-270 (__ieee754_rem_pio2); returns (n, y0, y1)."""
    half = HALF
    invpio2 = 0x3FE45F306DC9C883
    pio2_1 = 0x3FF921FB54400000
    pio2_1t = 0x3DD0B4611A626331
    pio2_2 = 0x3DD0B4611A600000
    pio2_2t = 0x3BA3198A2E037073
    pio2_3 = 0x3BA3198A2E000000
    pio2_3t = 0x397B839A252049C1
    hx = high_word(x)
    ix = hx & 0x7FFFFFFF
    if ix <= 0x3FE921FB:
        return 0, x, ZERO
    if ix < 0x4002D97C:  # |x| < 3pi/4
        if hx > 0:
            z = sub(x, pio2_1)
            if ix != 0x3FF921FB:
                y0 = sub(z, pio2_1t)
                y1 = sub(sub(z, y0), pio2_1t)
            else:
                z = sub(z, pio2_2)
                y0 = sub(z, pio2_2t)
                y1 = sub(sub(z, y0), pio2_2t)
            return 1, y0, y1
        z = add(x, pio2_1)
        if ix != 0x3FF921FB:
            y0 = add(z, pio2_1t)
            y1 = add(sub(z, y0), pio2_1t)
        else:
            z = add(z, pio2_2)
            y0 = add(z, pio2_2t)
            y1 = add(sub(z, y0), pio2_2t)
        return -1, y0, y1
    if ix <= 0x413921FB:  # |x| ~<= 2^19*(pi/2)
        t = fabs(x)
        n = trunc(add(mul(t, invpio2), half))
        fn = from_int(n)
        r = sub(t, mul(fn, pio2_1))
        w = mul(fn, pio2_1t)
        if n < 32 and ix != NPIO2_HW[n - 1]:
            y0 = sub(r, w)
        else:
            j = ix >> 20
            y0 = sub(r, w)
            high = high_word(y0) & 0xFFFFFFFF
            i = j - ((high >> 20) & 0x7FF)
            if i > 16:
                t = r
                w = mul(fn, pio2_2)
                r = sub(t, w)
                w = sub(mul(fn, pio2_2t), sub(sub(t, r), w))
                y0 = sub(r, w)
                high = high_word(y0) & 0xFFFFFFFF
                i = j - ((high >> 20) & 0x7FF)
                if i > 49:
                    t = r
                    w = mul(fn, pio2_3)
                    r = sub(t, w)
                    w = sub(mul(fn, pio2_3t), sub(sub(t, r), w))
                    y0 = sub(r, w)
        y1 = sub(sub(r, y0), w)
        if hx < 0:
            return -n, neg(y0), neg(y1)
        return n, y0, y1
    if ix >= 0x7FF00000:  # inf or NaN
        return 0, sub(x, x), sub(x, x)
    low = low_word(x)
    e0 = (ix >> 20) - 1046  # e0 = ilogb(z) - 23
    z = insert_words(ix - (e0 << 20), low)
    tx = [ZERO, ZERO, ZERO]
    for i in range(2):
        tx[i] = from_int(trunc(z))
        z = mul(sub(z, tx[i]), TWO24)
    tx[2] = z
    nx = 3
    while eq(tx[nx - 1], ZERO):
        nx -= 1
    n, y = kernel_rem_pio2(tx, e0, nx, 2)
    if hx < 0:
        return -n, neg(y[0]), neg(y[1])
    return n, y[0], y[1]


C_COS = [0x3FA555555555554C, 0xBF56C16C16C15177, 0x3EFA01A019CB1590, 0xBE927E4F809C52AD,
         0x3E21EE9EBDB4B1C4, 0xBDA8FAE9BE8838D4]  # C1..C6
S_SIN = [0xBFC5555555555549, 0x3F8111111110F8A6, 0xBF2A01A019C161D5, 0x3EC71DE357B1FE7D,
         0xBE5AE5E68A2B9CEB, 0x3DE5D93A5ACFD57C]  # S1..S6
QX_HIGH = dec("0.28125")


def kernel_cos(x, y):
    """ieee754:305-336."""
    one = ONE
    ix = high_word(x) & 0x7FFFFFFF
    if ix < 0x3E400000:
        if trunc(x) == 0:
            return one
    z = mul(x, x)
    r = mul(z, poly(z, C_COS))
    if ix < 0x3FD33333:
        return sub(one, sub(mul(HALF, z), sub(mul(z, r), mul(x, y))))
    if ix > 0x3FE90000:
        qx = QX_HIGH
    else:
        qx = insert_words(ix - 0x00200000, 0)
    iz = sub(mul(HALF, z), qx)
    a = sub(one, qx)
    return sub(a, sub(iz, sub(mul(z, r), mul(x, y))))


def kernel_sin(x, y, iy):
    """ieee754:673-698."""
    half = HALF
    ix = high_word(x) & 0x7FFFFFFF
    if ix < 0x3E400000:
        if trunc(x) == 0:
            return x
    z = mul(x, x)
    v = mul(z, x)
    r = poly(z, S_SIN[1:])
    if iy == 0:
        return add(x, mul(v, add(S_SIN[0], mul(z, r))))
    return sub(x, sub(sub(mul(z, sub(mul(half, y), mul(v, r))), y), mul(v, S_SIN[0])))


def cos(x):
    """ieee754:1352-1383."""
    ix = high_word(x) & 0x7FFFFFFF
    if ix <= 0x3FE921FB:
        return kernel_cos(x, ZERO)
    if ix >= 0x7FF00000:
        return sub(x, x)
    n, y0, y1 = rem_pio2(x)
    n &= 3
    if n == 0:
        return kernel_cos(y0, y1)
    if n == 1:
        return neg(kernel_sin(y0, y1, 1))
    if n == 2:
        return neg(kernel_cos(y0, y1))
    return kernel_sin(y0, y1, 1)


def sin(x):
    """ieee754:2448-2479."""
    ix = high_word(x) & 0x7FFFFFFF
    if ix <= 0x3FE921FB:
        return kernel_sin(x, ZERO, 0)
    if ix >= 0x7FF00000:
        return sub(x, x)
    n, y0, y1 = rem_pio2(x)
    n &= 3
    if n == 0:
        return kernel_sin(y0, y1, 1)
    if n == 1:
        return kernel_cos(y0, y1)
    if n == 2:
        return neg(kernel_sin(y0, y1, 1))
    return neg(kernel_cos(y0, y1))


# ---------------------------------------------------------------------------------------------
# JavaScript Number semantics

TWO52 = pow2(52)


def js_round(x):
    """Math.round: the integer nearest x, ties toward +Infinity, -0 for -0.5 <= x <= -0."""
    if not is_finite(x) or is_zero(x):
        return x
    if ge(fabs(x), TWO52):  # already an integer
        return x
    f = floor(x)
    r = add(f, ONE) if ge(sub(x, f), HALF) else f
    if is_zero(r) and lt(x, ZERO):
        return NEG_ZERO
    return r


def js_less(a, b):
    """The ordering Math.min/Math.max apply: -0 below +0."""
    if eq(a, b):
        return (a & SIGN) != 0 and (b & SIGN) == 0
    return lt(a, b)


def js_min(values):
    """Math.min(...values)."""
    out = INF
    for v in values:
        if is_nan(v):
            return NAN
        if js_less(v, out):
            out = v
    return out


def js_max(values):
    """Math.max(...values)."""
    out = NEG_INF
    for v in values:
        if is_nan(v):
            return NAN
        if js_less(out, v):
            out = v
    return out


def or_zero(x):
    """`x || 0` on a Number: 0, -0 and NaN become +0."""
    if x is None or is_nan(x) or is_zero(x):
        return ZERO
    return x


def shortest_digits(x):
    """For finite x > 0: (s, p) with x the nearest binary64 to s * 10^p, s having as few digits
    as possible and, among those, s * 10^p nearest to x (the even s on a tie) (ECMA-262
    6.1.6.1.20 step 5 and its note 2)."""
    _, m, e = decode(x)
    num, den = (m << e, 1) if e >= 0 else (m, 1 << -e)

    def at_least_pow10(p):  # x >= 10^p
        return num >= den * 10 ** p if p >= 0 else num * 10 ** -p >= den

    n = (num.bit_length() - den.bit_length()) * 30103 // 100000  # near log10(x); fixed below
    while at_least_pow10(n):
        n += 1
    while not at_least_pow10(n - 1):
        n -= 1  # now 10^(n-1) <= x < 10^n

    def value(s, p):
        return pack(False, s * 10 ** p, 0) if p >= 0 else pack_ratio(False, s, 10 ** -p, 0)

    def best(k):  # the k-significant-digit s that reads back to x, or None
        p = n - k
        big_n, big_d = (num, den * 10 ** p) if p >= 0 else (num * 10 ** -p, den)
        lo, r = divmod(big_n, big_d)
        if r == 0:
            return lo, p
        hi = lo + 1
        ok_lo = value(lo, p) == x
        ok_hi = value(hi, p) == x
        if ok_lo and ok_hi:
            if 2 * r != big_d:
                return (lo, p) if 2 * r < big_d else (hi, p)
            return (lo, p) if lo % 2 == 0 else (hi, p)
        if ok_lo:
            return lo, p
        if ok_hi:
            return hi, p
        return None

    lo_k, hi_k = 1, 17  # 17 significant digits always read back
    while lo_k < hi_k:
        mid = (lo_k + hi_k) // 2
        if best(mid) is None:
            lo_k = mid + 1
        else:
            hi_k = mid
    return best(lo_k)


def number_to_string(x):
    """Number::toString(10) (ECMA-262 6.1.6.1.20)."""
    if is_nan(x):
        return "NaN"
    if is_zero(x):
        return "0"
    if x & SIGN:
        return "-" + number_to_string(neg(x))
    if is_inf(x):
        return "Infinity"
    s, p = shortest_digits(x)
    digits = str(s)
    n = len(digits) + p
    digits = digits.rstrip("0")
    k = len(digits)
    if k <= n <= 21:
        return digits + "0" * (n - k)
    if 0 < n <= 21:
        return digits[:n] + "." + digits[n:]
    if -6 < n <= 0:
        return "0." + "0" * (-n) + digits
    e = n - 1
    sign = "+" if e >= 0 else "-"
    if k == 1:
        return digits + "e" + sign + str(abs(e))
    return digits[0] + "." + digits[1:] + "e" + sign + str(abs(e))


def json_number(x):
    """JSON.stringify(<number>): non-finite values serialise as null."""
    return number_to_string(x) if is_finite(x) else "null"


# ---------------------------------------------------------------------------------------------
# hyperbehcs-core.cjs


ZERO_COUNTERS = [  # core:5-22
    "hardware_mutations", "cpu_affinity_changes", "gpu_kernel_launches", "gpu_driver_mutations",
    "remote_writes", "adb_actions", "scrcpy_actions", "device_file_writes", "route_mutations",
    "provider_calls", "mcp_tool_calls", "process_starts", "executor_executions", "cleanup_actions",
    "runtime_authority_grants", "production_promotions",
]
ZERO_COUNTERS_JSON = "".join(',"%s":0' % k for k in ZERO_COUNTERS)
TWO_PI = mul(PI, TWO)  # Math.PI * 2


def sha256_hex(text):  # core:24-26
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha16(preimage):  # core:28-30 (the preimage is JSON.stringify(value))
    return sha256_hex(preimage)[:16]


def round_places(value, places):  # core:32-36
    if not is_finite(value):
        return ZERO
    factor = from_int(10 ** places)
    return div(js_round(mul(value, factor)), factor)


def finite_number(value, fallback=ZERO):  # core:38-41
    if value is None or not is_finite(value):
        return fallback
    return value


def quant_bits(value, fallback=EIGHT):  # core:43-46
    number = js_round(finite_number(value, fallback))
    return js_min([dec("24"), js_max([ONE, number])])


def to_vector(values):  # core:48-53 (array input)
    return [finite_number(v) for v in values]


def normalize_vector(vector):  # core:55-59
    raw = to_vector(vector)
    total = ZERO
    for value in raw:
        total = add(total, mul(value, value))
    norm = sqrt(total)
    if eq(norm, ZERO):
        return [ZERO for _ in raw]
    return [round_places(div(value, norm), 12) for value in raw]


SQRT3 = sqrt(THREE)


def achlioptas_weight(seed, row, col):  # core:61-67
    digest = sha256_hex("%s|%d|%d" % (seed, row, col))
    bucket = int(digest[:12], 16) % 6
    if bucket == 0:
        return SQRT3
    if bucket == 1:
        return neg(SQRT3)
    return ZERO


def array_json(values):
    return "[" + ",".join(json_number(v) for v in values) + "]"


def johnson_lindenstrauss(vector, opts):  # core:69-90
    source = normalize_vector(vector)
    seed = opts.get("seed") or "hyperbehcs-local-jl"
    td = opts.get("targetDimension")
    if td is None or is_nan(td) or is_zero(td):
        td = ceil(mul(sqrt(from_int(len(source) or 1)), TWO))
    target = js_max([ONE, js_min([from_int(4096), js_round(td)])])
    target_dimension = trunc(target)
    scale = div(ONE, sqrt(target))
    projection = []
    for row in range(target_dimension):
        total = ZERO
        for col in range(len(source)):
            total = add(total, mul(achlioptas_weight(seed, row, col), source[col]))
        projection.append(round_places(mul(total, scale), 12))
    preimage = ('{"algorithm":"johnson-lindenstrauss-achlioptas-sparse.v1","source_dimension":%d,'
                '"target_dimension":%d,"projection":%s%s}') % (
                    len(source), target_dimension, array_json(projection), ZERO_COUNTERS_JSON)
    return {"target_dimension": target_dimension, "projection": projection, "preimage": preimage,
            "fingerprint": sha16(preimage)}


def turbo_quant(vector, opts):  # core:92-115
    raw = to_vector(vector)
    bits = quant_bits(opts.get("bits"), EIGHT)
    max_code = sub(pow2(trunc(bits)), ONE)  # 2 ** bits - 1, bits an integer in 1..24
    mn = js_min(raw) if raw else ZERO
    mx = js_max(raw) if raw else ZERO
    scale = ONE if eq(mx, mn) else div(sub(mx, mn), max_code)
    codes = [ZERO if eq(mx, mn) else js_min([max_code, js_max([ZERO, js_round(div(sub(value, mn), scale))])])
             for value in raw]
    meta = {"bits": bits, "min": round_places(mn, 12), "max": round_places(mx, 12),
            "scale": round_places(scale, 12), "levels": add(max_code, ONE), "maxCode": max_code}
    preimage = ('{"algorithm":"turbo-uniform-quant.v1","dimension":%d,"codes":%s,"metadata":{"bits":%s,'
                '"min":%s,"max":%s,"scale":%s,"levels":%s,"maxCode":%s}%s}') % (
                    len(raw), array_json(codes), json_number(bits), json_number(meta["min"]),
                    json_number(meta["max"]), json_number(meta["scale"]), json_number(meta["levels"]),
                    json_number(max_code), ZERO_COUNTERS_JSON)
    return {"codes": codes, "meta": meta, "preimage": preimage, "fingerprint": sha16(preimage)}


def polar_quant(vector, opts):  # core:117-150
    raw = to_vector(vector)
    bits = quant_bits(opts.get("bits"), EIGHT)
    levels = sub(pow2(trunc(bits)), ONE)
    pairs = []
    radii = []
    for index in range(0, len(raw), 2):
        x = or_zero(raw[index])
        y = or_zero(raw[index + 1] if index + 1 < len(raw) else None)
        radius = sqrt(add(mul(x, x), mul(y, y)))
        angle = add(atan2(y, x), TWO_PI) if lt(atan2(y, x), ZERO) else atan2(y, x)
        pairs.append((radius, angle))
        radii.append(radius)
    max_radius = js_max([ZERO, finite_number(opts.get("maxRadius"), js_max(radii) if radii else ZERO)])
    radius_scale = ONE if eq(max_radius, ZERO) else div(max_radius, levels)
    codes = [[ZERO if eq(max_radius, ZERO) else js_min([levels, js_max([ZERO, js_round(div(radius, radius_scale))])]),
              js_min([levels, js_max([ZERO, js_round(mul(div(angle, TWO_PI), levels))])])]
             for radius, angle in pairs]
    meta = {"bits": bits, "maxRadius": round_places(max_radius, 12),
            "radiusScale": round_places(radius_scale, 12),
            "angleScaleRadians": round_places(div(TWO_PI, levels), 12)}
    codes_json = "[" + ",".join(array_json(c) for c in codes) + "]"
    preimage = ('{"algorithm":"polar-pair-quant.v1","dimension":%d,"codes":%s,"metadata":{"bits":%s,'
                '"maxRadius":%s,"radiusScale":%s,"angleScaleRadians":%s}%s}') % (
                    len(raw), codes_json, json_number(bits), json_number(meta["maxRadius"]),
                    json_number(meta["radiusScale"]), json_number(meta["angleScaleRadians"]),
                    ZERO_COUNTERS_JSON)
    return {"codes": codes, "meta": meta, "preimage": preimage, "fingerprint": sha16(preimage)}


def triple_quant(vector, opts):  # core:152-194
    raw = to_vector(vector)
    bits = quant_bits(opts.get("bits"), EIGHT)
    levels = sub(pow2(trunc(bits)), ONE)
    triples = []
    radii = []
    for index in range(0, len(raw), 3):
        x = or_zero(raw[index])
        y = or_zero(raw[index + 1] if index + 1 < len(raw) else None)
        z = or_zero(raw[index + 2] if index + 2 < len(raw) else None)
        radius = sqrt(add(add(mul(x, x), mul(y, y)), mul(z, z)))
        theta = ZERO if eq(radius, ZERO) else acos(js_min([ONE, js_max([NEG_ONE, div(z, radius)])]))
        phi_raw = atan2(y, x)
        phi = add(phi_raw, TWO_PI) if lt(phi_raw, ZERO) else phi_raw
        triples.append((radius, theta, phi))
        radii.append(radius)
    max_radius = js_max([ZERO, finite_number(opts.get("maxRadius"), js_max(radii) if radii else ZERO)])
    radius_scale = ONE if eq(max_radius, ZERO) else div(max_radius, levels)
    theta_scale = div(PI, levels)
    phi_scale = div(TWO_PI, levels)
    codes = [[ZERO if eq(max_radius, ZERO) else js_min([levels, js_max([ZERO, js_round(div(radius, radius_scale))])]),
              js_min([levels, js_max([ZERO, js_round(mul(div(theta, PI), levels))])]),
              js_min([levels, js_max([ZERO, js_round(mul(div(phi, TWO_PI), levels))])])]
             for radius, theta, phi in triples]
    flat = [c for code in codes for c in code]
    meta = {"bits": bits, "maxRadius": round_places(max_radius, 12),
            "radiusScale": round_places(radius_scale, 12),
            "thetaScaleRadians": round_places(theta_scale, 12),
            "phiScaleRadians": round_places(phi_scale, 12)}
    codes_json = "[" + ",".join(array_json(c) for c in codes) + "]"
    preimage = ('{"algorithm":"triple-spherical-quant.v1","dimension":%d,"codes":%s,"codes_flat":%s,'
                '"lanes":["coarse","medium","fine"],"metadata":{"bits":%s,"maxRadius":%s,"radiusScale":%s,'
                '"thetaScaleRadians":%s,"phiScaleRadians":%s}%s}') % (
                    len(raw), codes_json, array_json(flat), json_number(bits),
                    json_number(meta["maxRadius"]), json_number(meta["radiusScale"]),
                    json_number(meta["thetaScaleRadians"]), json_number(meta["phiScaleRadians"]),
                    ZERO_COUNTERS_JSON)
    return {"dimension": len(raw), "codes": codes, "meta": meta, "preimage": preimage,
            "fingerprint": sha16(preimage)}


def reconstruct_triple(packet):  # core:196-213
    meta = packet["meta"]
    radius_scale = finite_number(meta["radiusScale"], ONE)
    theta_scale = finite_number(meta["thetaScaleRadians"], PI)
    phi_scale = finite_number(meta["phiScaleRadians"], TWO_PI)
    out = []
    for r, t, p in packet["codes"]:
        radius = mul(finite_number(r), radius_scale)
        theta = mul(finite_number(t), theta_scale)
        phi = mul(finite_number(p), phi_scale)
        sin_theta = sin(theta)
        out.append(round_places(mul(mul(radius, sin_theta), cos(phi)), 12))
        out.append(round_places(mul(mul(radius, sin_theta), sin(phi)), 12))
        out.append(round_places(mul(radius, cos(theta)), 12))
    keep = packet["dimension"] or len(packet["codes"]) * 3
    return out[:max(0, keep)]


C128 = from_int(128)


def vector_from_text(text, dimension=1536):  # core:239-249
    source = text or "hyperbehcs-empty-source"
    data = source.encode("utf-8")
    safe_length = max(1, len(data))
    out = []
    for index in range(dimension):
        a = data[(index * 17) % safe_length]
        b = data[(index * 31 + 7) % safe_length]
        c = data[(index * 47 + 13) % safe_length]
        # a, b, c are bytes 0..255, so JavaScript's Number % equals integer % on them.
        value = add(add(div(sub(from_int(a), C128), from_int(32)),
                        div(sub(from_int(b % 29), from_int(14)), from_int(64))),
                    div(sub(from_int(c % 11), from_int(5)), C128))
        out.append(round_places(value, 6))
    return out


# ---------------------------------------------------------------------------------------------
# Fixture cases. Texts are strings that appear in hyperbehcs-core.cjs; the two 1536-wide cases are
# the inputs upstream itself defaults to (core:240 for empty text, core:269 for benchmark({})).

TEXT_CASES = [
    ("default-source", "", 1536),            # core:239-240
    ("benchmark-empty-object", "{}", 1536),  # core:269: JSON.stringify({}) === "{}"
    ("seed-text-1", "hyperbehcs-local-jl", 1),
    ("seed-text-2", "hyperbehcs-local-jl", 2),
    ("seed-text-3", "hyperbehcs-local-jl", 3),
    ("seed-text-4", "hyperbehcs-local-jl", 4),
    ("seed-text-5", "hyperbehcs-local-jl", 5),
    ("runtime-text-7", "C:/HyperBEHCS", 7),
    ("schema-text-64", "hyperbehcs.local_fast_packet.v1", 64),
]


def decs(*texts):
    return [dec(t) for t in texts]


LITERAL_CASES = [
    ("empty", []),
    ("zeros", decs("0", "0", "0", "0")),
    ("signed-zeros", decs("-0", "0", "-0", "-0", "0", "-0")),
    ("constant", decs("1.5", "1.5", "1.5")),
    ("pair-3-4", decs("3", "-4", "-3", "4")),
    ("axes", decs("0", "0", "-1", "0", "0", "1", "-2", "0", "0", "0", "-2", "0")),
    ("non-finite", [NAN, INF, NEG_INF] + decs("2", "-0.5")),
    ("tiny", decs("1e-200", "1e-200", "1e-200", "-1e-200")),
    ("huge", decs("1e200", "-1e200", "1e200", "3e300", "-2e300")),
    ("subnormal", decs("5e-324", "-5e-324", "1e-310")),
]

# Option objects: `None` is an absent property (undefined).
OPTION_SETS = [
    ("defaults", {}),
    ("bits-1", {"bits": dec("1")}),
    ("bits-4", {"bits": dec("4")}),
    ("bits-12", {"bits": dec("12")}),
    ("bits-16", {"bits": dec("16")}),
    ("bits-24", {"bits": dec("24")}),
    ("bits-0", {"bits": dec("0")}),
    ("bits-30", {"bits": dec("30")}),
    ("bits-7.5", {"bits": dec("7.5")}),
    ("bits-nan", {"bits": NAN}),
    ("radius-1", {"maxRadius": dec("1")}),
    ("radius-0", {"maxRadius": dec("0")}),
    ("radius-neg", {"maxRadius": dec("-2")}),
    ("radius-inf", {"maxRadius": INF}),
    ("target-1", {"targetDimension": dec("1")}),
    ("target-5", {"targetDimension": dec("5")}),
    ("target-2.5", {"targetDimension": dec("2.5")}),
    ("target-neg", {"targetDimension": dec("-3")}),
    ("target-5000", {"targetDimension": dec("5000")}),
    ("seed-schema", {"seed": "hyperbehcs.local_cpu_benchmark.v1"}),
    ("mixed", {"bits": dec("10"), "maxRadius": dec("2.5"), "targetDimension": dec("9"), "seed": "C:/HyperBEHCS"}),
]

# Which inputs each option set runs on besides "defaults", which runs on every input.
SWEEP_INPUTS = {"schema-text-64", "pair-3-4", "axes"}
SWEEP_LIMITED = {"target-5000": {"pair-3-4"}}


LIST_LIMIT = 300  # longer lists are recorded as their length and the sha256 of the joined text


def field(name, items):
    text = ",".join(items)
    if len(items) <= LIST_LIMIT:
        return "%s=%s" % (name, text)
    return "%s_count=%d|%s_sha256=%s" % (name, len(items), name, sha256_hex(text))


def hexs(name, values):
    return field(name, ["%016x" % v for v in values])


def strs(name, values):
    return field(name, [number_to_string(v) for v in values])


def tuples(name, codes):
    return field(name, [":".join(number_to_string(c) for c in code) for code in codes])


def opt_field(opts, key_name):
    v = opts.get(key_name)
    if v is None:
        return "-"
    if isinstance(v, str):
        return v.encode("utf-8").hex()
    return "%016x" % v


def case_rows(name, vector, opt_name, opts):
    rows = []
    opt_cols = "opts=%s|opt_bits=%s|opt_max_radius=%s|opt_target_dimension=%s|opt_seed_hex=%s" % (
        opt_name, opt_field(opts, "bits"), opt_field(opts, "maxRadius"),
        opt_field(opts, "targetDimension"), opt_field(opts, "seed"))
    jl = johnson_lindenstrauss(vector, opts)
    rows.append("JL|case=%s|%s|target_dimension_out=%d|%s|fingerprint=%s|preimage_sha256=%s|json=0" % (
        name, opt_cols, jl["target_dimension"], hexs("projection", jl["projection"]), jl["fingerprint"],
        sha256_hex(jl["preimage"])))
    tq = turbo_quant(vector, opts)
    m = tq["meta"]
    rows.append("TURBO|case=%s|%s|%s|min=%016x|max=%016x|scale=%016x|bits_out=%s|levels=%s|max_code=%s"
                "|fingerprint=%s|preimage_sha256=%s|json=0" % (
                    name, opt_cols, strs("codes", tq["codes"]), m["min"], m["max"],
                    m["scale"], number_to_string(m["bits"]), number_to_string(m["levels"]),
                    number_to_string(m["maxCode"]), tq["fingerprint"], sha256_hex(tq["preimage"])))
    pq = polar_quant(vector, opts)
    m = pq["meta"]
    rows.append("POLAR|case=%s|%s|%s|max_radius=%016x|radius_scale=%016x|angle_scale=%016x"
                "|fingerprint=%s|preimage_sha256=%s|json=0" % (
                    name, opt_cols, tuples("codes", pq["codes"]),
                    m["maxRadius"], m["radiusScale"], m["angleScaleRadians"],
                    pq["fingerprint"], sha256_hex(pq["preimage"])))
    tr = triple_quant(vector, opts)
    m = tr["meta"]
    rows.append("TRIPLE|case=%s|%s|%s|max_radius=%016x|radius_scale=%016x|theta_scale=%016x|phi_scale=%016x"
                "|fingerprint=%s|preimage_sha256=%s|json=0" % (
                    name, opt_cols, tuples("codes", tr["codes"]),
                    m["maxRadius"], m["radiusScale"], m["thetaScaleRadians"],
                    m["phiScaleRadians"], tr["fingerprint"], sha256_hex(tr["preimage"])))
    rows.append("RECONSTRUCT|case=%s|opts=%s|%s|json=0" % (name, opt_name, hexs("values", reconstruct_triple(tr))))
    return rows


def build_fixture():
    with open(CORE, "rb") as f:
        core_sha = hashlib.sha256(f.read()).hexdigest()
    if core_sha != CORE_SHA256:
        raise SystemExit("vendored hyperbehcs-core.cjs sha256 %s != %s" % (core_sha, CORE_SHA256))
    rows = ["HYPERBEHCSQUANTS|source=vendor/Asolaria-ASI-On-Metal-Fabric-and-matrix/tools/falcon/omni-acer/lib/"
            "hyperbehcs-core.cjs|sha256=%s|referee=tools/referee.py|slots=9,10,11,12|json=0" % core_sha]
    inputs = []
    for name, text, dim in TEXT_CASES:
        vec = vector_from_text(text, dim)
        rows.append("INPUT|case=%s|kind=text|text_hex=%s|dimension=%d|%s|json=0" % (
            name, text.encode("utf-8").hex(), dim, hexs("values", vec)))
        inputs.append((name, vec))
    for name, vec in LITERAL_CASES:
        rows.append("INPUT|case=%s|kind=values|%s|json=0" % (name, hexs("values", vec)))
        inputs.append((name, vec))
    for name, vec in inputs:
        for opt_name, opts in OPTION_SETS:
            if opt_name != "defaults" and name not in SWEEP_LIMITED.get(opt_name, SWEEP_INPUTS):
                continue
            rows.extend(case_rows(name, vec, opt_name, opts))
    return "\n".join(rows) + "\n"


# ---------------------------------------------------------------------------------------------
# Operation grid for examples/grid.rs: binary64 arithmetic, Math.round, Number::toString and the
# fdlibm functions on random inputs, one line per operation. Inputs are drawn as integers.


def grid(n):
    rng = random.Random(20261017)
    c = {t: dec(t) for t in ("-8", "8", "-1e-6", "1e-6", "-1e-9", "1e-9", "-1000", "1000", "-4", "4",
                             "-1", "1", "0", "7", "-823549", "823549")}
    specials = [ZERO, NEG_ZERO, INF, NEG_INF, NAN, ONE, NEG_ONE, HALF, neg(HALF),
                0x0000000000000001, 0x7FEFFFFFFFFFFFFF]  # ... 5e-324 and the largest finite Number

    def finite():
        while True:
            x = rng.getrandbits(64)
            if is_finite(x):
                return x

    def near(lo, hi):  # lo + (hi - lo) * u, u = k / 2^53 for a random 53-bit k
        return add(lo, mul(sub(hi, lo), pack(False, rng.getrandbits(53), -53)))

    def pick():
        r = rng.randrange(20)
        if r < 5:
            return finite()
        if r < 10:
            return near(c["-8"], c["8"])
        if r < 12:
            return div(from_int(rng.randint(-1000, 1000)), from_int(rng.choice([1, 2, 4, 8, 3, 10])))
        if r < 14:
            return rng.getrandbits(52) | (rng.getrandbits(1) << 63)  # subnormal or zero
        if r < 16:
            return rng.choice(specials)
        e = rng.randint(-60, 60)  # a random significand with exponent e, either sign
        return (rng.getrandbits(1) << 63) | ((1023 + e) << 52) | rng.getrandbits(52)

    def h(x):
        return "nan" if is_nan(x) else "%016x" % x

    out = []
    for _ in range(n):
        a, b = pick(), pick()
        if rng.randrange(10) < 3 and is_finite(a):  # operands with close exponents
            if rng.randrange(2) == 0:
                b = mul(a, add(ONE, near(c["-1e-6"], c["1e-6"])))
            else:
                b = mul(neg(a), add(ONE, near(c["-1e-9"], c["1e-9"])))
        out.append("add|%s|%s|%s" % (h(a), h(b), h(add(a, b))))
        out.append("sub|%s|%s|%s" % (h(a), h(b), h(sub(a, b))))
        out.append("mul|%s|%s|%s" % (h(a), h(b), h(mul(a, b))))
        out.append("div|%s|%s|%s" % (h(a), h(b), h(div(a, b))))
        s = fabs(a) if rng.randrange(10) < 9 else a
        out.append("sqrt|%s|%s" % (h(s), h(sqrt(s))))
        r = a if rng.randrange(2) == 0 else div(from_int(rng.randint(-4000, 4000)), EIGHT)
        out.append("round|%s|%s" % (h(r), h(js_round(r))))
        t = a if rng.randrange(2) == 0 else round_places(near(c["-1000"], c["1000"]), rng.randint(0, 12))
        out.append("str|%s|%s" % (h(t), number_to_string(t)))
        if rng.randrange(10) < 6:
            y, x = near(c["-4"], c["4"]), near(c["-4"], c["4"])
        else:
            y, x = pick(), pick()
        out.append("atan2|%s|%s|%s" % (h(y), h(x), h(atan2(y, x))))
        v = near(c["-1"], c["1"]) if rng.randrange(10) < 8 else pick()
        out.append("acos|%s|%s" % (h(v), h(acos(v))))
        u = rng.randrange(10)
        w = near(c["0"], c["7"]) if u < 6 else (near(c["-823549"], c["823549"]) if u < 8 else pick())
        out.append("sin|%s|%s" % (h(w), h(sin(w))))
        out.append("cos|%s|%s" % (h(w), h(cos(w))))
    return "\n".join(out) + "\n"


def main(argv):
    if len(argv) >= 2 and argv[1] == "--grid":
        sys.stdout.write(grid(int(argv[2]) if len(argv) > 2 else 20000))
        return 0
    text = build_fixture()
    if len(argv) >= 2 and argv[1] == "--check":
        with open(FIXTURE, "r", encoding="utf-8") as f:
            committed = f.read()
        if committed != text:
            print("FIXTURE_CHECK|file=tests/fixtures/hyperbehcs-quants.hbp|status=DIFFERS|json=0")
            return 1
        print("FIXTURE_CHECK|file=tests/fixtures/hyperbehcs-quants.hbp|rows=%d|sha256=%s|status=PASS|json=0" % (
            text.count("\n"), hashlib.sha256(text.encode("utf-8")).hexdigest()))
        return 0
    with open(FIXTURE, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print("FIXTURE_WRITE|file=tests/fixtures/hyperbehcs-quants.hbp|rows=%d|sha256=%s|json=0" % (
        text.count("\n"), hashlib.sha256(text.encode("utf-8")).hexdigest()))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
