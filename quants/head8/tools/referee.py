#!/usr/bin/env python3
"""Referee for quants/head8: quant-huge-message-benchmark.mjs mirrored line by line in stdlib Python.

Integer arithmetic only (OWNER-RULES rule 4); no Python float is used. A JavaScript number
(IEEE-754 binary64) is held as its 64-bit pattern in a Python int. Each + - * / takes the exact
value of its operands as integers (m * 2^e), computes the exact result with integer operations
and rounds it once to the nearest binary64, ties to even (IEEE-754 roundTiesToEven, the rounding
JavaScript uses), with signed zeros, subnormals, overflow to Infinity and NaN written out from
IEEE-754. Comparisons, ToInt32, ToUint32, Int8Array/Uint8Array stores and Math.round are written
from the ECMAScript definitions. Decimal literals are parsed exactly (fractions.Fraction, a ratio
of two integers) and rounded the same way. Math.log2 is V8's base::ieee754::log2 (FreeBSD/fdlibm
e_log2.c with k_log1p, src/base/ieee754.cc in V8 12.4 and 13.6) ported statement by statement on
these operations.

Usage:
  python3 -I tools/referee.py            write tests/fixtures/{number-vectors,quant8-expected}.hbp
  python3 -I tools/referee.py --check    regenerate both in memory and diff against the files
  python3 -I tools/referee.py --grid     stream operator cases for examples/number_grid.rs
  python3 -I tools/referee.py --log2-grid  stream the dense Math.log2 grid (same format)
"""
import hashlib
import pathlib
import struct
import sys
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parent.parent
NUMBER_FIXTURE = ROOT / "tests" / "fixtures" / "number-vectors.hbp"
QUANT8_FIXTURE = ROOT / "tests" / "fixtures" / "quant8-expected.hbp"
NUMBER_HEADER = (
    "# binary64 operator vectors from tools/referee.py (JavaScript numbers as bit patterns, each"
    " operation exact in integers then rounded to nearest, ties to even; log2 = V8"
    " base::ieee754::log2; a, b and want are bit patterns, every NaN is nan); do not edit\n"
)
QUANT8_HEADER = (
    "# quant8 outputs from tools/referee.py (stdlib mirror of"
    " quant-huge-message-benchmark.mjs:36-91); do not edit\n"
)

# ---------------------------------------------------------------- binary64 in integers

M32 = 0xFFFFFFFF
M64 = 0xFFFFFFFFFFFFFFFF
SIGN = 1 << 63
MAGNITUDE = SIGN - 1
FRAC = (1 << 52) - 1
HIDDEN = 1 << 52
ZERO = 0x0000000000000000
NEG_ZERO = SIGN
POS_INF = 0x7FF0000000000000
NEG_INF = SIGN | POS_INF
NAN = 0x7FF8000000000000  # the NaN the operations return; every NaN prints as "nan"


def is_nan(x):
    return x & MAGNITUDE > POS_INF


def hexbits(x):
    # Every NaN prints as "nan": JavaScript does not expose a NaN's sign or payload here.
    return "nan" if is_nan(x) else format(x, "016x")


def pack(n, e, sticky=False):
    """The binary64 nearest the exact value n * 2^e (n a nonzero integer), ties to even.

    With sticky, the exact value lies strictly between n * 2^e and (n + sign(n)) * 2^e; the
    callers then give n at least 55 bits, so the rounding below always drops two or more bits.
    """
    if n < 0:
        sign, m = SIGN, -n
    else:
        sign, m = 0, n
    shift = m.bit_length() - 53  # keep 53 significant bits ...
    if shift < -1074 - e:
        shift = -1074 - e  # ... but none below 2^-1074 (subnormals)
    if shift > 0:
        rest = m & ((1 << shift) - 1)
        half = 1 << (shift - 1)
        m >>= shift
        e += shift
        if rest > half or (rest == half and (sticky or m & 1)):
            m += 1
            if m >> 53:
                m >>= 1
                e += 1
    elif sticky:
        raise AssertionError("an inexact value needs at least 55 bits")
    else:
        m <<= -shift  # exact: widen to 53 bits, or to the exponent 2^-1074
        e += shift
    if e == -1074:
        return sign | m  # subnormal or zero (m < 2^52), or exponent field 1 (2^52 <= m < 2^53)
    biased = e + 1075
    if biased >= 0x7FF:
        return sign | POS_INF
    return sign | (biased << 52) | (m & FRAC)


def parts(x):
    """A finite x as (m, e), x = m * 2^e with m a signed integer (0 for both zeros)."""
    biased = (x >> 52) & 0x7FF
    m = x & FRAC
    if biased:
        m |= HIDDEN
        e = biased - 1075
    else:
        e = -1074
    return (-m if x >> 63 else m), e


def from_int(n):
    """The integer n as a Number (rounded once when |n| >= 2^53)."""
    if n == 0:
        return ZERO
    m = -n if n < 0 else n
    length = m.bit_length()
    if length > 53:
        return pack(n, 0)
    return (SIGN if n < 0 else 0) | ((length + 1022) << 52) | ((m << (53 - length)) & FRAC)


def dec(text):
    """The JavaScript (and C) decimal literal `text` as its binary64 value."""
    q = Fraction(text)
    if q == 0:
        return ZERO
    p, d = abs(q.numerator), q.denominator
    k = d.bit_length() - p.bit_length() + 55
    if k >= 0:
        n, r = divmod(p << k, d)
    else:
        n, r = divmod(p, d << -k)
    return pack(-n if q < 0 else n, -k, r != 0)


def pow2(k):
    return pack(1, k)


def add(a, b):
    """a + b."""
    xa = (a >> 52) & 0x7FF
    xb = (b >> 52) & 0x7FF
    if xa == 0x7FF or xb == 0x7FF:  # a or b is NaN or an infinity
        if a & MAGNITUDE > POS_INF or b & MAGNITUDE > POS_INF:
            return NAN
        if xa == 0x7FF:
            if xb == 0x7FF and a != b:
                return NAN  # Infinity + -Infinity
            return a
        return b
    ma = a & FRAC
    mb = b & FRAC
    if xa:
        ma |= HIDDEN
    elif not ma:
        return a & b if not b & MAGNITUDE else b  # -0 + -0 is -0; +0 + -0 is +0
    else:
        xa = 1
    if xb:
        mb |= HIDDEN
    elif not mb:
        return a
    else:
        xb = 1
    # a = ma * 2^(xa - 1075), b = mb * 2^(xb - 1075), signed below; the sum is exact in integers.
    if a >> 63:
        ma = -ma
    if b >> 63:
        mb = -mb
    if xa < xb:
        n = ma + (mb << (xb - xa))
        e = xa - 1075
    else:
        n = (ma << (xa - xb)) + mb
        e = xb - 1075
    if n == 0:
        return ZERO  # x + -x is +0 under round to nearest
    return pack(n, e)


def neg(x):
    """-x."""
    return x ^ SIGN


def sub(a, b):
    """a - b, which IEEE-754 defines as a + (-b)."""
    return add(a, neg(b))


def mul(a, b):
    """a * b."""
    xa = (a >> 52) & 0x7FF
    xb = (b >> 52) & 0x7FF
    sign = (a ^ b) & SIGN
    if xa == 0x7FF or xb == 0x7FF:
        if a & MAGNITUDE > POS_INF or b & MAGNITUDE > POS_INF:
            return NAN
        if not a & MAGNITUDE or not b & MAGNITUDE:
            return NAN  # Infinity * 0
        return sign | POS_INF
    ma = a & FRAC
    mb = b & FRAC
    if xa:
        ma |= HIDDEN
    elif not ma:
        return sign
    else:
        xa = 1
    if xb:
        mb |= HIDDEN
    elif not mb:
        return sign
    else:
        xb = 1
    # (ma * 2^(xa - 1075)) * (mb * 2^(xb - 1075)), exact in integers.
    return pack(-(ma * mb) if sign else ma * mb, xa + xb - 2150)


def div(a, b):
    """a / b (JavaScript: x / +-0 is +-Infinity, 0 / 0 is NaN)."""
    xa = (a >> 52) & 0x7FF
    xb = (b >> 52) & 0x7FF
    sign = (a ^ b) & SIGN
    if xa == 0x7FF or xb == 0x7FF:
        if a & MAGNITUDE > POS_INF or b & MAGNITUDE > POS_INF:
            return NAN
        if xa == 0x7FF:
            return NAN if xb == 0x7FF else sign | POS_INF
        return sign  # finite / Infinity
    ma = a & FRAC
    mb = b & FRAC
    if xa:
        ma |= HIDDEN
    else:
        xa = 1
    if xb:
        mb |= HIDDEN
    else:
        xb = 1
    if not mb:
        return NAN if not ma else sign | POS_INF
    if not ma:
        return sign
    # ma / mb * 2^(xa - xb): a quotient of at least 55 bits and whether a remainder is left.
    k = mb.bit_length() - ma.bit_length() + 55
    n, r = divmod(ma << k, mb)
    return pack(-n if sign else n, xa - xb - k, r != 0)


def order(x):
    # An integer with the order of the numbers (NaN excluded); -0 and +0 both give 0.
    return -(x & MAGNITUDE) if x >> 63 else x


def lt(a, b):
    """a < b (false when either is NaN)."""
    return not (is_nan(a) or is_nan(b)) and order(a) < order(b)


def gt(a, b):
    """a > b."""
    return lt(b, a)


def js_eq(a, b):
    """a === b on numbers: NaN equals nothing, -0 equals +0."""
    return not (is_nan(a) or is_nan(b)) and order(a) == order(b)


def js_abs(x):
    """Math.abs(x)."""
    return NAN if is_nan(x) else x & MAGNITUDE


def to_uint32(x):
    # ECMAScript ToUint32: NaN and infinities give 0; truncate toward zero; modulo 2^32.
    if x & POS_INF == POS_INF:
        return 0
    m, e = parts(x)
    if e >= 32:
        return 0
    if e >= 0:
        n = m << e
    else:
        n = m >> -e if m >= 0 else -((-m) >> -e)  # toward zero
    return n % (1 << 32)


def to_int32(x):
    # ECMAScript ToInt32.
    n = to_uint32(x)
    return n - (1 << 32) if n >= 1 << 31 else n


def to_int8(x):
    # The value an Int8Array element stores (ToInt8).
    n = to_uint32(x) & 0xFF
    return n - 256 if n >= 128 else n


def js_round(x):
    # Math.round: the integral Number closest to x, ties toward +Infinity; -0 for -0.5 <= x < 0.
    if x & POS_INF == POS_INF or x & MAGNITUDE == 0:
        return x  # NaN, infinities and zeros
    m, e = parts(x)
    if e >= 0:
        return x  # already integral
    half = 1 << (-e - 1)
    if m < 0 and -m <= half:
        return NEG_ZERO
    return from_int((m + half) >> -e)  # floor(x + 1/2), exact in integers


# ---------------------------------------------------------------- V8 Math.log2

TWO54 = dec("1.80143985094819840000e16")  # 0x43500000, 0x00000000
IVLN2HI = dec("1.44269504072144627571e00")  # 0x3FF71547, 0x65200000
IVLN2LO = dec("1.67517131648865118353e-10")  # 0x3DE705FC, 0x2EEFA200
LG1 = dec("6.666666666666735130e-01")  # 3FE55555 55555593
LG2 = dec("3.999999999940941908e-01")  # 3FD99999 9997FA04
LG3 = dec("2.857142874366239149e-01")  # 3FD24924 94229359
LG4 = dec("2.222219843214978396e-01")  # 3FCC71C5 1D8E78AF
LG5 = dec("1.818357216161805012e-01")  # 3FC74664 96CB03DE
LG6 = dec("1.531383769920937332e-01")  # 3FC39A09 D078C69F
LG7 = dec("1.479819860511658591e-01")  # 3FC2F112 DF3E5244
LOG2_CONSTANTS = [
    ("two54", TWO54),
    ("ivln2hi", IVLN2HI),
    ("ivln2lo", IVLN2LO),
    ("Lg1", LG1),
    ("Lg2", LG2),
    ("Lg3", LG3),
    ("Lg4", LG4),
    ("Lg5", LG5),
    ("Lg6", LG6),
    ("Lg7", LG7),
]
ONE = dec("1.0")
TWO = dec("2.0")
HALF = dec("0.5")


def high_word(x):
    hi = x >> 32
    return hi - (1 << 32) if hi >= 1 << 31 else hi


def low_word(x):
    return x & M32


def set_high_word(x, hi):
    return ((hi & M32) << 32) | (x & M32)


def set_low_word(x, lo):
    return (x & (M64 ^ M32)) | (lo & M32)


def k_log1p(f):
    s = div(f, add(TWO, f))
    z = mul(s, s)
    w = mul(z, z)
    t1 = mul(w, add(LG2, mul(w, add(LG4, mul(w, LG6)))))
    t2 = mul(z, add(LG1, mul(w, add(LG3, mul(w, add(LG5, mul(w, LG7)))))))
    R = add(t2, t1)
    hfsq = mul(mul(HALF, f), f)
    return mul(s, add(hfsq, R))


def v8_log2(x):
    hx = high_word(x)
    lx = low_word(x)
    k = 0
    if hx < 0x00100000:
        if ((hx & 0x7FFFFFFF) | lx) == 0:
            return NEG_INF
        if hx < 0:
            return NAN
        k -= 54
        x = mul(x, TWO54)
        hx = high_word(x)
    if hx >= 0x7FF00000:
        return add(x, x)
    if hx == 0x3FF00000 and lx == 0:
        return ZERO
    k += (hx >> 20) - 1023
    hx &= 0x000FFFFF
    i = (hx + 0x95F64) & 0x100000
    x = set_high_word(x, hx | (i ^ 0x3FF00000))
    k += i >> 20
    y = from_int(k)
    f = sub(x, ONE)
    hfsq = mul(mul(HALF, f), f)
    r = k_log1p(f)
    hi = sub(f, hfsq)
    hi = set_low_word(hi, 0)
    lo = add(sub(sub(f, hi), hfsq), r)
    val_hi = mul(hi, IVLN2HI)
    val_lo = add(mul(add(lo, hi), IVLN2LO), mul(lo, IVLN2HI))
    w = add(y, val_hi)
    val_lo = add(val_lo, add(sub(y, w), val_hi))
    val_hi = w
    return add(val_lo, val_hi)


# ---------------------------------------------------------------- quant-huge-message-benchmark.mjs

D = 1024  # :18
MAX_FLOOR = dec("1e-12")  # :57
ZETA_FLOOR = dec("1e-9")  # :72
TRIPLE_EDGE = dec("0.33")  # :73
N127 = dec("127")  # :68, :89
N128 = dec("128")  # :75
N16129 = dec("16129")  # :89
HASH_MUL = dec("2654435761")  # :54
FILL_SCALE = dec("2147483648")  # :91


def ppow_table():  # :36-49
    # m stays an integer below D and m % p == 0 before each m /= p, so JavaScript's % and /= are
    # exact integer operations here.
    t = [0] * D

    def is_p(n):
        if n < 2:
            return False
        i = 2
        while i * i <= n:
            if n % i == 0:
                return False
            i += 1
        return True

    for n in range(2, D):
        if is_p(n):
            t[n] = 1
            continue
        p = 2
        while p * p <= n:
            if is_p(p):
                m = n
                k = 0
                while m % p == 0:
                    m //= p
                    k += 1
                if m == 1:
                    t[n] = 5 if k > 3 else k + 1
                    break
            p += 1
    return t


PPOW = ppow_table()


def count_sketch(msg):  # :52-56
    proj = [ZERO] * D
    for i, x in enumerate(msg):
        h = to_uint32(mul(from_int(i), HASH_MUL))
        if h & 0x80000000:
            proj[h & (D - 1)] = add(proj[h & (D - 1)], neg(x))
        else:
            proj[h & (D - 1)] = add(proj[h & (D - 1)], x)
    return proj


def quantize(proj):  # :57-78
    mx = MAX_FLOOR
    for j in range(D):
        a = js_abs(proj[j])
        if gt(a, mx):
            mx = a
    turbo = [0] * D
    signs = [0] * (D >> 3)
    zeta = [0] * D
    triple = [0] * D
    quad = [0] * D
    hist = [0] * 256
    vm_acc = 0  # sums of PPOW entries (at most 5 * 1024): exact integer Numbers
    for j in range(D):
        v = div(proj[j], mx)  # mx >= 1e-12, never zero
        q = js_round(mul(v, N127))
        turbo[j] = to_int8(q)
        if lt(v, ZERO):
            signs[j >> 3] |= 1 << (j & 7)
        a = js_abs(v)
        # The Uint8Array store of an integer Number n keeps n modulo 256.
        zeta[j] = (15 if lt(a, ZETA_FLOOR) else min(15, to_int32(neg(v8_log2(a))))) & 0xFF
        triple[j] = 1 if gt(v, TRIPLE_EDGE) else (-1 if lt(v, neg(TRIPLE_EDGE)) else 0)
        quad[j] = 3 if gt(v, HALF) else 2 if gt(v, ZERO) else 1 if gt(v, neg(HALF)) else 0
        b = to_int32(add(q, N128)) & 255
        hist[b] = (hist[b] + 1) & M32  # Uint32Array element + 1
        if not js_eq(q, ZERO):  # q !== 0: false for -0, true for NaN
            vm_acc += PPOW[j]
    return {
        "turbo": turbo,
        "signs": signs,
        "zeta": zeta,
        "triple": triple,
        "quad": quad,
        "hist": hist,
        "vm_acc": vm_acc,
        "scale": mx,
    }


def quant8(msg):  # :51-79
    return quantize(count_sketch(msg))


def tuple_buffer(q):  # :81-86
    return (
        bytes(t & 0xFF for t in q["turbo"])
        + bytes(q["signs"])
        + bytes(q["zeta"])
        + struct.pack("<256I", *q["hist"])
    )


def dot_raw(a, b):  # :88
    # for (i < a.length) s += a[i] * b[i]: past the end of b, b[i] is undefined and
    # a[i] * undefined is NaN, so s is NaN from there on.
    s = ZERO
    b = iter(b)
    for x in a:
        y = next(b, None)
        if y is None:
            return NAN
        s = add(s, mul(x, y))
    return s


def dot_q(qa, qb):  # :89
    # The turbo dot is a sum of int8 products, |s| <= 1024 * 128 * 128 < 2^53: an exact integer.
    s = 0
    for j in range(D):
        s += qa["turbo"][j] * qb["turbo"][j]
    return div(mul(mul(from_int(s), qa["scale"]), qb["scale"]), N16129)


def fill(n, seed):  # :91, as a generator of the elements
    s = seed & M32  # seed >>> 0 of a non-negative integer seed
    for _ in range(n):
        # s * 1664525 + 1013904223 < 2^53, so both Number operations are exact integers;
        # >>> 0 keeps the low 32 bits.
        s = (s * 1664525 + 1013904223) & M32
        yield sub(div(from_int(s), FILL_SCALE), ONE)


def message_dims(mb):  # :103
    # mb * 1048576 is a multiple of 8 for an integer mb: the Number division is exact.
    return mb * 1048576 // 8


# ---------------------------------------------------------------- deterministic test inputs


class Lcg:
    def __init__(self, seed):
        self.state = seed

    def next64(self):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) & M64
        return self.state

    def below(self, bound):
        return (self.next64() >> 11) % bound


SPECIAL_BITS = [
    0x0000000000000000,  # +0
    0x0000000000000001,  # smallest subnormal
    0x000FFFFFFFFFFFFF,  # largest subnormal
    0x0010000000000000,  # smallest normal
    0x0010000000000001,
    0x3CA0000000000000,  # 2^-53
    0x3FDFFFFFFFFFFFFF,  # 0.49999999999999994
    0x3FE0000000000000,  # 0.5
    0x3FEFFFFFFFFFFFFF,
    0x3FF0000000000000,  # 1
    0x3FF0000000000001,
    0x3FF8000000000000,  # 1.5
    0x4004000000000000,  # 2.5
    0x4330000000000000,  # 2^52
    0x433FFFFFFFFFFFFF,
    0x4340000000000000,  # 2^53
    0x4340000000000001,
    0x41E0000000000000,  # 2^31
    0x41F0000000000000,  # 2^32
    0x7FEFFFFFFFFFFFFF,  # largest finite
    0x7FF0000000000000,  # Infinity
    0x7FF8000000000000,  # NaN
    MAX_FLOOR,
    ZETA_FLOOR,
    TRIPLE_EDGE,
    N127,
]
SPECIALS = sorted({b for s in SPECIAL_BITS for b in (s, s ^ (1 << 63))})


def random_operand(rng, near=None):
    kind = rng.below(6)
    sign = rng.below(2) << 63
    frac = rng.next64() & ((1 << 52) - 1)
    if kind == 0:
        return rng.next64()  # any pattern, NaN and infinities included
    if kind == 1:
        return sign | frac  # subnormal
    if kind == 2 and near is not None:
        # Same or adjacent exponent as `near`, short mantissa: cancellations and exact ties.
        exp = ((near >> 52) & 0x7FF) + rng.below(5) - 2
        exp = min(max(exp, 0), 0x7FE)
        frac &= ~((1 << rng.below(50)) - 1)
        return sign | (exp << 52) | frac
    if kind == 3:
        exp = 1023 - rng.below(40)  # [2^-39, 2): the quant8 value range
        return sign | (exp << 52) | frac
    if kind == 4:
        exp = 1 + rng.below(0x7FE)
        return sign | (exp << 52) | frac
    return sign | ((1023 + rng.below(64)) << 52) | (frac & ~((1 << rng.below(53)) - 1))


def binary_cases(a, b, ops):
    results = {
        "add": lambda: hexbits(add(a, b)),
        "sub": lambda: hexbits(sub(a, b)),
        "mul": lambda: hexbits(mul(a, b)),
        "div": lambda: hexbits(div(a, b)),
        "lt": lambda: str(int(lt(a, b))),
        "eq": lambda: str(int(js_eq(a, b))),
    }
    for op in ops:
        yield op, f"{a:016x}", f"{b:016x}", results[op]()


def unary_cases(a):
    zero = "0000000000000000"
    yield "round", f"{a:016x}", zero, hexbits(js_round(a))
    yield "int32", f"{a:016x}", zero, str(to_int32(a))
    yield "log2", f"{a:016x}", zero, hexbits(v8_log2(a))


def number_rows():
    # The special set is closed under negation, so its a - b rows would repeat a + (-b).
    cases = []
    for a in SPECIALS:
        cases.extend(unary_cases(a))
        for b in SPECIALS:
            cases.extend(binary_cases(a, b, ["add", "mul", "div", "lt", "eq"]))
    rng = Lcg(0x5EED0F4EAD0008)
    for _ in range(500):
        a = random_operand(rng)
        b = random_operand(rng, near=a)
        cases.extend(unary_cases(a))
        cases.extend(binary_cases(a, b, ["add", "sub", "mul", "div", "lt", "eq"]))
    return [f"CASE|op={op}|a={a}|b={b}|want={want}" for op, a, b, want in cases]


def grid_lines(count):
    rng = Lcg(0x6E1D0F4EAD0008)
    for _ in range(count):
        a_bits = random_operand(rng)
        b_bits = random_operand(rng, near=a_bits)
        for case in binary_cases(a_bits, b_bits, ["add", "sub", "mul", "div", "lt"]):
            yield " ".join(case)
        for case in unary_cases(a_bits):
            yield " ".join(case)


def log2_grid_inputs():
    # Every pattern within 4096 ulps of 2^-k for k = 0..34 (the zeta truncation edges of
    # :72), within 4096 ulps of 1e-9, and 2^20 patterns spread over [1e-9, 1].
    for k in range(35):
        center = pow2(-k)
        for d in range(-4096, 4097):
            yield center + d
    for d in range(-4096, 4097):
        yield ZETA_FLOOR + d
    lo, hi = ZETA_FLOOR, ONE
    step = (hi - lo) // (1 << 20)
    for n in range(1 << 20):
        yield lo + n * step + (n % 977)


def log2_grid_lines():
    for a_bits in log2_grid_inputs():
        yield f"log2 {a_bits:016x} 0000000000000000 {hexbits(v8_log2(a_bits))}"


# ---------------------------------------------------------------- quant8 fixture


def constructed_inputs():
    vectors = []
    vectors.append(("empty", []))
    vectors.append(("specials", list(SPECIALS)))
    # Specials sharing buckets: i, i + 1024 and i + 2048 land in the same bucket below 2^53.
    same = [ZERO] * 3072
    picks = [0x7FF0000000000000, 0xFFF0000000000000, 0x7FEFFFFFFFFFFFFF, 0x7FF8000000000000]
    for n, b in enumerate(picks):
        for rep in range(3):
            same[n * 7 + rep * 1024] = b ^ ((rep & 1) << 63)
    same[100] = dec("5")
    same[100 + 1024] = dec("-5")
    vectors.append(("shared-buckets", same))
    below = dec("1e-13")
    vectors.append(("below-floor", [below + n for n in range(2048)]))
    zeta = [ONE]
    for k in range(1, 34):
        p = pow2(-k)
        zeta.extend(p + d for d in (-2, -1, 0, 1, 2))
    zeta.extend(ZETA_FLOOR + d for d in range(-3, 4))
    zeta.extend(TRIPLE_EDGE + d for d in range(-3, 4))
    zeta.extend(HALF + d for d in range(-3, 4))
    zeta.extend([ZERO, NEG_ZERO, 0x0000000000000001, 0x8000000000000001])
    vectors.append(("zeta-edges", zeta))
    ties = [N127] + [add(from_int(n), HALF) for n in range(-130, 130)]
    ties += [add(from_int(n), HALF) + 1 for n in range(-60, 60)]
    vectors.append(("round-edges", ties))
    rng = Lcg(0x0DD50F4EAD0008)
    mixed = []
    for _ in range(3000):
        mixed.append(random_operand(rng))
    vectors.append(("random-patterns", mixed))
    finite = []
    for _ in range(3000):
        sign = rng.below(2) << 63
        finite.append(sign | ((1023 - rng.below(45)) << 52) | (rng.next64() & ((1 << 52) - 1)))
    vectors.append(("random-finite", finite))
    return vectors


BENCH = [(1, 12345), (1, 99999), (8, 12345), (8, 99999), (64, 12345), (64, 99999)]


def channel_fields(q):
    return (
        "turbo=" + bytes(t & 0xFF for t in q["turbo"]).hex()
        + "|signs=" + bytes(q["signs"]).hex()
        + "|zeta=" + bytes(q["zeta"]).hex()
        + "|triple=" + bytes(t & 0xFF for t in q["triple"]).hex()
        + "|quad=" + bytes(q["quad"]).hex()
        + "|hist=" + struct.pack("<256I", *q["hist"]).hex()
        + f"|vm_acc={q['vm_acc']}|scale={hexbits(q['scale'])}"
        + "|tuple_sha256=" + hashlib.sha256(tuple_buffer(q)).hexdigest()
    )


def vector_rows(name, msg_factory, input_row):
    rows = [input_row]
    proj = count_sketch(msg_factory())
    q = quantize(proj)
    rows.append(f"PROJ|name={name}|bits=" + ",".join(hexbits(p) for p in proj))
    rows.append(f"QUANT8|name={name}|" + channel_fields(q))
    return rows, q


def quant8_rows():
    rows = [f"CONST|name={n}|bits={v:016x}" for n, v in LOG2_CONSTANTS]
    for literal in ["1e-12", "1e-9", "0.33", "0.5", "127", "128", "16129"]:
        rows.append(f"CONST|name={literal}|bits={dec(literal):016x}")
    rows.append("PPOW|table=" + "".join(str(t) for t in PPOW))
    for name, msg in constructed_inputs():
        input_row = f"INPUT|name={name}|bits=" + ",".join(f"{x:016x}" for x in msg)
        more, _ = vector_rows(name, lambda m=msg: m, input_row)
        rows.extend(more)
    # fill() of a shorter array is the start of a longer one's (line 91 restarts at seed >>> 0),
    # so each seed's elements are generated once, at the longest length, and sliced.
    longest = max(message_dims(mb) for mb, _ in BENCH)
    filled = {seed: list(fill(longest, seed)) for seed in sorted({seed for _, seed in BENCH})}
    quants = {}
    for mb, seed in BENCH:
        name = f"bench-{mb}mb-seed{seed}"
        dims = message_dims(mb)
        input_row = f"INPUT|name={name}|fill_len={dims}|fill_seed={seed}"
        more, q = vector_rows(name, lambda d=dims, s=seed: filled[s][:d], input_row)
        rows.extend(more)
        quants[(mb, seed)] = q
    for mb in sorted({mb for mb, _ in BENCH}):
        dims = message_dims(mb)
        qa, qb = quants[(mb, 12345)], quants[(mb, 99999)]
        raw = dot_raw(filled[12345][:dims], filled[99999][:dims])
        rows.append(
            f"DOT|a=bench-{mb}mb-seed12345|b=bench-{mb}mb-seed99999"
            f"|dot_q={hexbits(dot_q(qa, qb))}|dot_raw={hexbits(raw)}"
        )
    return rows


def render(header, rows):
    return header + "\n".join(rows) + "\n"


def main(argv):
    if argv == ["--grid"]:
        for line in grid_lines(250_000):
            sys.stdout.write(line + "\n")
        return 0
    if argv == ["--log2-grid"]:
        for line in log2_grid_lines():
            sys.stdout.write(line + "\n")
        return 0
    targets = [
        (NUMBER_FIXTURE, render(NUMBER_HEADER, number_rows())),
        (QUANT8_FIXTURE, render(QUANT8_HEADER, quant8_rows())),
    ]
    if argv == ["--check"]:
        status = 0
        for path, text in targets:
            same = path.exists() and path.read_text(encoding="utf-8") == text
            rows = text.count("\n") - 1
            print(f"REFEREE|file={path.relative_to(ROOT)}|rows={rows}|match={int(same)}|json=0")
            status |= 0 if same else 1
        return status
    if argv:
        print(__doc__, file=sys.stderr)
        return 2
    for path, text in targets:
        path.write_text(text, encoding="utf-8")
        print(f"REFEREE|file={path.relative_to(ROOT)}|rows={text.count(chr(10)) - 1}|written=1|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
