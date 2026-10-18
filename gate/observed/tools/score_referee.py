#!/usr/bin/env python3
"""Referee for src/score.rs: mirrors asolaria-score.mjs shannonSignal (lines 86-95), shaBaseline
(lines 25, 98-101, 145), reverseGain (lines 104-108) and the composite (lines 151-163). Every
JavaScript number (binary64) is reproduced by an integer emulation of IEEE-754 binary64 (the Dbl /
Binary64 port of src/score.rs): a double is its 64-bit pattern, and +, -, *, / are the same
round-to-nearest-even integer operations the hardware runs, no float anywhere.

Upstream: model/l0-edge/vendor/pipeline/asolaria-score.mjs (git blob b101c0989de3af0ca41db0eac1293c758d7e5296).
Writes tests/fixtures/expected-score.hbp; --check regenerates it in memory and diffs the committed copy.
Math.log2 is mirrored statement by statement from V8's log2: v8/v8 tag 12.4.254.21 (the V8 of Node
v22.22.0) src/base/ieee754.cc:1951-1962 (k_log1p) and 1973-2050 (log2), git blob
e71b63fd7c17711e5dc04d9acc040be0aa0b7c40, over the binary64 emulation (the hardware double path with
no FMA contraction, which x86-64 baseline code cannot emit). The exact arithmetic the referee
compares against (shannon `exact`, near-tie generation) is exact rationals (fractions.Fraction) over a
fixed-point integer log2 held to 512 fractional bits; the closest the entropy comes to a rounding
boundary over every row is reported, so the rounding is shown to be unambiguous.
"""
import hashlib
import pathlib
import sys
from bisect import bisect_left
from fractions import Fraction

CRATE = pathlib.Path(__file__).resolve().parent.parent
FIXTURE = CRATE / "tests" / "fixtures" / "expected-score.hbp"
UPSTREAM = CRATE.parent.parent / "model" / "l0-edge" / "vendor" / "pipeline" / "asolaria-score.mjs"
UPSTREAM_BLOB = "b101c0989de3af0ca41db0eac1293c758d7e5296"

HEADER = """\
# expected-score.hbp from tools/score_referee.py; do not edit
# Mirrors asolaria-score.mjs (git blob b101c098) in Python binary64 = JavaScript numbers; values in e4 units.
# SHANNON want = +shannonSignal(content).score (lines 86-95), exact = the same entropy in exact arithmetic,
#   rounded half up; bins = UTF-8 byte counts by byte % 12, utf8_hex = the content's UTF-8 bytes.
# LOG2 want = Math.log2(x), V8 12.4.254.21 src/base/ieee754.cc:1951-2050; x and want are binary64 bits (hex).
# BASELINE want = +shaBaseline(pid, content).toFixed(4) (lines 98-101, 145); pid_hex / content_hex = UTF-8 bytes.
# COMPOSITE want = +composite.toFixed(4) over the listed signals (lines 154-163); an absent key is an absent signal.
# REVERSE reverseGain(+(composite / 10000)) (lines 104-108): reverse_risk = +(1 - score).toFixed(4), promoted 1 or 0.
"""


# ---- IEEE-754 binary64 in integers (port of src/score.rs Binary64) ---------------------------

SIGN_BIT = 1 << 63
MASK64 = (1 << 64) - 1
FRACTION_BITS = 52
SIGNIFICAND_BITS = 53
MIN_EXPONENT = -1074
EXPONENT_FIELD = 0x7FF
ALIGN_BITS = 74


def _shift_round(magnitude, shift, sticky):
    if shift > 128:
        return 0
    if shift == 128:
        kept, dropped = 0, magnitude
    else:
        kept, dropped = magnitude >> shift, magnitude & ((1 << shift) - 1)
    half = 1 << (shift - 1)
    round_up = dropped > half or (dropped == half and (sticky or kept & 1 == 1))
    return kept + (1 if round_up else 0)


def _round_pack(negative, magnitude, exponent, sticky):
    sign = SIGN_BIT if negative else 0
    if magnitude == 0:
        return sign
    width = magnitude.bit_length()
    right = max(width - SIGNIFICAND_BITS, MIN_EXPONENT - exponent)
    if right > 0:
        significand = _shift_round(magnitude, right, sticky)
        exponent += right
    else:
        left = min(SIGNIFICAND_BITS - width, exponent - MIN_EXPONENT)
        significand = magnitude << left
        exponent -= left
    if significand >> SIGNIFICAND_BITS != 0:
        significand >>= 1
        exponent += 1
    if significand >> FRACTION_BITS == 0:
        return sign | significand
    biased = exponent - MIN_EXPONENT + 1
    if biased >= EXPONENT_FIELD:
        return sign | (EXPONENT_FIELD << FRACTION_BITS)
    return sign | (biased << FRACTION_BITS) | (significand & ((1 << FRACTION_BITS) - 1))


def _parts(bits):
    biased = (bits >> FRACTION_BITS) & EXPONENT_FIELD
    fraction = bits & ((1 << FRACTION_BITS) - 1)
    if biased == 0:
        significand, exponent = fraction, MIN_EXPONENT
    else:
        significand, exponent = fraction | (1 << FRACTION_BITS), biased + MIN_EXPONENT - 1
    return (bits & SIGN_BIT != 0, significand, exponent)


def _order_key(bits):
    # Monotonic unsigned key for comparing finite doubles, with -0.0 folded onto +0.0.
    if bits == SIGN_BIT:
        bits = 0
    return (~bits) & MASK64 if bits & SIGN_BIT else bits | SIGN_BIT


class Dbl:
    """A binary64 value as its 64-bit pattern; arithmetic is the integer round-to-nearest-even."""

    __slots__ = ("bits",)

    def __init__(self, bits):
        self.bits = bits & MASK64

    @staticmethod
    def from_int(n):
        return Dbl(_round_pack(n < 0, abs(n), 0, False))

    @staticmethod
    def from_ratio(numerator, denominator):
        return from_fraction(Fraction(numerator, denominator))

    def is_zero(self):
        return self.bits & ~SIGN_BIT == 0

    def is_positive(self):
        return _order_key(self.bits) > _order_key(0)

    def __neg__(self):
        return Dbl(self.bits ^ SIGN_BIT)

    def __abs__(self):
        return Dbl(self.bits & ~SIGN_BIT)

    def __add__(self, other):
        a = _parts(self.bits)
        b = _parts(other.bits)
        if a[1] == 0 and b[1] == 0:
            return Dbl(SIGN_BIT if (a[0] and b[0]) else 0)
        if a[1] == 0:
            return other
        if b[1] == 0:
            return self
        large, small = (a, b) if a[2] >= b[2] else (b, a)
        gap = large[2] - small[2]
        if gap <= ALIGN_BITS:
            large_m, small_m, exponent, sticky = large[1] << gap, small[1], small[2], False
        else:
            drop = gap - ALIGN_BITS
            kept = 0 if drop >= 64 else small[1] >> drop
            sticky = drop >= 64 or kept << drop != small[1]
            large_m, small_m, exponent = large[1] << ALIGN_BITS, kept, large[2] - ALIGN_BITS
        if large[0] == small[0]:
            return Dbl(_round_pack(large[0], large_m + small_m, exponent, sticky))
        if large_m > small_m:
            return Dbl(_round_pack(large[0], large_m - small_m - (1 if sticky else 0), exponent, sticky))
        if large_m < small_m:
            return Dbl(_round_pack(small[0], small_m - large_m, exponent, False))
        return Dbl(0)

    def __sub__(self, other):
        return self + Dbl(other.bits ^ SIGN_BIT)

    def __mul__(self, other):
        a = _parts(self.bits)
        b = _parts(other.bits)
        return Dbl(_round_pack(a[0] != b[0], a[1] * b[1], a[2] + b[2], False))

    def __truediv__(self, other):
        a = _parts(self.bits)
        b = _parts(other.bits)
        negative = a[0] != b[0]
        if a[1] == 0 or b[1] == 0:
            magnitude = 0 if a[1] == 0 else EXPONENT_FIELD << FRACTION_BITS
            return Dbl((SIGN_BIT if negative else 0) | magnitude)
        normalize = SIGNIFICAND_BITS - a[1].bit_length()
        numerator = (a[1] << normalize) << ALIGN_BITS
        exponent = a[2] - normalize - ALIGN_BITS - b[2]
        return Dbl(_round_pack(negative, numerator // b[1], exponent, numerator % b[1] != 0))

    def __lt__(self, other):
        return _order_key(self.bits) < _order_key(other.bits)

    def __le__(self, other):
        return _order_key(self.bits) <= _order_key(other.bits)

    def __eq__(self, other):
        return _order_key(self.bits) == _order_key(other.bits)

    def __hash__(self):
        return _order_key(self.bits)

    def high_word(self):
        word = (self.bits >> 32) & 0xFFFFFFFF
        return word - (1 << 32) if word >= 1 << 31 else word

    def low_word(self):
        return self.bits & 0xFFFFFFFF

    def with_high_word(self, high):
        return Dbl((self.bits & 0xFFFFFFFF) | ((high & 0xFFFFFFFF) << 32))

    def with_low_word(self, low):
        return Dbl((self.bits & 0xFFFFFFFF00000000) | (low & 0xFFFFFFFF))


ZERO = Dbl(0)
HALF = Dbl(0x3FE0000000000000)
ONE = Dbl(0x3FF0000000000000)
TWO = Dbl(0x4000000000000000)


def to_fraction(x):
    negative, significand, exponent = _parts(x.bits)
    sign = -1 if negative else 1
    if exponent >= 0:
        return Fraction(sign * significand * (1 << exponent))
    return Fraction(sign * significand, 1 << -exponent)


def from_fraction(value):
    """The binary64 nearest `value` (round half to even), via the same integer round-pack."""
    if value == 0:
        return ZERO
    negative = value < 0
    if negative:
        value = -value
    numerator, denominator = value.numerator, value.denominator
    shift = max(0, 60 + denominator.bit_length() - numerator.bit_length())
    scaled = numerator << shift
    return Dbl(_round_pack(negative, scaled // denominator, -shift, scaled % denominator != 0))


# ---- toFixed / unary plus, over the binary64 emulation ---------------------------------------


def js_to_fixed_units(x, digits):
    # Number.prototype.toFixed(digits), 0 <= x < 1e21: n with n / 10^digits nearest x, ties to the larger n.
    value = to_fraction(x) * 10**digits + Fraction(1, 2)
    return value.numerator // value.denominator


def js_to_fixed_string(x, digits):
    units = js_to_fixed_units(x, digits)
    return f"{units // 10**digits}.{units % 10**digits:0{digits}d}"


_E4_DOUBLE = {}


def js_number_from_e4(units):
    # Unary + of a toFixed(4) string: the correctly rounded double, as parsing the decimal gives it.
    cached = _E4_DOUBLE.get(units)
    if cached is None:
        cached = from_fraction(Fraction(units, 10000))
        _E4_DOUBLE[units] = cached
    return cached


# ---- shannonSignal, asolaria-score.mjs:86-95 -------------------------------------------------


def shannon_bins(content):
    buf = str(content).encode("utf-8")  # :87  Buffer.from(String(content), 'utf8')
    bins = [0] * 12  # :88  new Array(12).fill(0)
    for b in buf:  # :89  for (const b of buf) bins[b % 12]++
        bins[b % 12] += 1
    return bins


# ---- Math.log2, V8 12.4.254.21 src/base/ieee754.cc:1951-2050 (x > 0, finite) -----------------------

LG1 = Dbl(0x3FE5555555555593)
LG2 = Dbl(0x3FD999999997FA04)
LG3 = Dbl(0x3FD2492494229359)
LG4 = Dbl(0x3FCC71C51D8E78AF)
LG5 = Dbl(0x3FC7466496CB03DE)
LG6 = Dbl(0x3FC39A09D078C69F)
LG7 = Dbl(0x3FC2F112DF3E5244)
TWO54 = Dbl(0x4350000000000000)
IVLN2HI = Dbl(0x3FF7154765200000)
IVLN2LO = Dbl(0x3DE705FC2EEFA200)


def k_log1p(f):  # :1951-1962
    s = f / (TWO + f)
    z = s * s
    w = z * z
    t1 = w * (LG2 + w * (LG4 + w * LG6))
    t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)))
    R = t2 + t1
    hfsq = HALF * f * f
    return s * (hfsq + R)


_LOG2_DOUBLE = {}


def v8_log2(x):  # :1973-2050; the branches for zero, negative, infinite and NaN x are not reached here
    cached = _LOG2_DOUBLE.get(x.bits)
    if cached is not None:
        return cached
    arg = x
    hx, lx = x.high_word(), x.low_word()
    k = 0
    if hx < 0x00100000:
        k -= 54
        x = x * TWO54
        hx = x.high_word()
    if hx == 0x3FF00000 and lx == 0:
        _LOG2_DOUBLE[arg.bits] = ZERO
        return ZERO
    k += (hx >> 20) - 1023
    hx &= 0x000FFFFF
    i = (hx + 0x95F64) & 0x100000
    x = x.with_high_word(hx | (i ^ 0x3FF00000))
    k += i >> 20
    y = Dbl.from_int(k)
    f = x - ONE
    hfsq = HALF * f * f
    r = k_log1p(f)
    hi = (f - hfsq).with_low_word(0)
    lo = (f - hi) - hfsq + r
    val_hi = hi * IVLN2HI
    val_lo = (lo + hi) * IVLN2LO + lo * IVLN2HI
    w = y + val_hi
    val_lo = val_lo + ((y - w) + val_hi)
    result = val_lo + w
    _LOG2_DOUBLE[arg.bits] = result
    return result


LOG2_12 = v8_log2(Dbl.from_int(12))


def shannon_score_e4(bins):
    total = 0  # :90  bins.reduce((a, c) => a + c, 0) || 1
    for c in bins:
        total = total + c
    total = total or 1
    total_d = Dbl.from_int(total)
    acc = ZERO  # :92  -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0)
    for c in bins:  # :91  probs = bins.map((c) => c / total)
        if c > 0:
            p = Dbl.from_int(c) / total_d
            acc = acc + p * v8_log2(p)
    efficiency = -acc / LOG2_12  # :93  H / Math.log2(12)
    return js_to_fixed_units(efficiency, 4)  # :94  score: +efficiency.toFixed(4)


# ---- the entropy of lines 90-93 in exact arithmetic --------------------------------------------

LOG2_BITS = 512  # fractional bits of the fixed-point log2 (far past the closest rounding tie any row reaches)
_LOG2_FIXED = {}
_XLOG2X = {}


def log2_fixed(n):
    # The nearest integer to log2(n) * 2^LOG2_BITS, for integer n >= 1; pure integer squaring.
    cached = _LOG2_FIXED.get(n)
    if cached is not None:
        return cached
    if n <= 1:
        _LOG2_FIXED[n] = 0
        return 0
    e = n.bit_length() - 1
    working = LOG2_BITS + 80
    m = n << (working - e)  # m / 2^working in [1, 2), exact
    two = 1 << (working + 1)
    frac = 0
    for _ in range(LOG2_BITS + 1):
        m = (m * m) >> working
        frac <<= 1
        if m >= two:
            frac |= 1
            m >>= 1
    result = (e << LOG2_BITS) + ((frac + 1) >> 1)
    _LOG2_FIXED[n] = result
    return result


def xlog2x(c):
    # c * log2(c) as an exact rational (0 for c <= 1), log2 held to LOG2_BITS fractional bits.
    if c <= 1:
        return Fraction(0)
    cached = _XLOG2X.get(c)
    if cached is None:
        cached = Fraction(c * log2_fixed(c), 1 << LOG2_BITS)
        _XLOG2X[c] = cached
    return cached


LOG2_12_EXACT = Fraction(log2_fixed(12), 1 << LOG2_BITS)
TIE_FLOOR = Fraction(1, 10**45)


def exact_shannon_e4(bins):
    # (n log2 n - sum c log2 c) / (n log2 12), scaled by 10^4 and rounded half up, in exact rationals.
    n = sum(bins)
    if n == 0:
        return 0, None
    numerator = Fraction(n * log2_fixed(n), 1 << LOG2_BITS) - sum((xlog2x(c) for c in bins if c > 1), Fraction(0))
    efficiency_e4 = Fraction(10000) * numerator / (n * LOG2_12_EXACT)
    floor = efficiency_e4.numerator // efficiency_e4.denominator
    tie_distance = abs(efficiency_e4 - floor - Fraction(1, 2))
    if tie_distance < TIE_FLOOR:
        raise SystemExit(f"exact tie within {LOG2_BITS} fractional bits for bins {bins}")
    rounded = efficiency_e4 + Fraction(1, 2)
    return rounded.numerator // rounded.denominator, tie_distance


# ---- shaBaseline, asolaria-score.mjs:25, 98-101, 145 -------------------------------------------


def sha16(s):  # :25  createHash('sha256').update(String(s)).digest('hex').slice(0, 16)
    return hashlib.sha256(str(s).encode("utf-8")).hexdigest()[0:16]


def sha_baseline(pid, content):  # :98-101
    h = sha16(f"{pid}|{content}")
    return Dbl.from_int(int(h[0:4], 16) % 1000) / Dbl.from_int(1000)


def baseline_e4(pid, content):  # :145  +shaBaseline(pid, content).toFixed(4)
    return js_to_fixed_units(sha_baseline(pid, content), 4)


# ---- reverseGain, asolaria-score.mjs:104-108 ----------------------------------------------------

PROMOTE_SCORE = from_fraction(Fraction(72, 100))
PROMOTE_RISK = from_fraction(Fraction(28, 100))


def reverse_gain(score):
    reverse_risk_units = js_to_fixed_units(ONE - score, 4)  # :105  +(1 - score).toFixed(4)
    reverse_risk = js_number_from_e4(reverse_risk_units)
    promoted = not score < PROMOTE_SCORE and not PROMOTE_RISK < reverse_risk  # :106  score >= 0.72 && risk <= 0.28
    return reverse_risk_units, promoted


# ---- composite, asolaria-score.mjs:151-163 ------------------------------------------------------

WEIGHTS = (  # :156
    ("l0", from_fraction(Fraction(30, 100))),
    ("l4", from_fraction(Fraction(15, 100))),
    ("g1", from_fraction(Fraction(10, 100))),
    ("g2", from_fraction(Fraction(10, 100))),
    ("g3", from_fraction(Fraction(10, 100))),
    ("shannon", from_fraction(Fraction(15, 100))),
    ("baseline", from_fraction(Fraction(10, 100))),
)
WEIGHT_TWENTIETHS = {"l0": 6, "l4": 3, "g1": 2, "g2": 2, "g3": 2, "shannon": 3, "baseline": 2}
OPTIONAL = ("l0", "l4", "g1", "g2", "g3")


def composite_e4(signals_e4):
    composite = ZERO  # :154
    total_weight = ZERO  # :155
    for key, w in WEIGHTS:  # :157  for (const [key, w] of Object.entries(WEIGHTS))
        if key in signals_e4:  # :159  typeof sig === 'number'
            composite = composite + js_number_from_e4(signals_e4[key]) * w
            total_weight = total_weight + w
    if not total_weight.is_zero():  # :162
        composite = composite / total_weight
    return js_to_fixed_units(composite, 4)  # :163  +composite.toFixed(4)


def exact_composite_e4(signals_e4):
    weight = sum(WEIGHT_TWENTIETHS[k] for k in signals_e4)
    value = Fraction(sum(WEIGHT_TWENTIETHS[k] * v for k, v in signals_e4.items()), weight) + Fraction(1, 2)
    return value.numerator // value.denominator


# ---- inputs ---------------------------------------------------------------------------------------


class Lcg:
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound

    def belows(self, bound, count):
        state, out = self.state, []
        for _ in range(count):
            state = (state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
            out.append((state >> 11) % bound)
        self.state = state
        return out


CHAR_RANGES = (
    # (first code point, last code point, UTF-8 bytes each)
    (0x20, 0x7E, 1),  # printable ASCII
    (0x00, 0x7F, 1),  # all ASCII, control bytes included
    (0x80, 0x7FF, 2),
    (0x800, 0xD7FF, 3),  # below the surrogates
    (0xE000, 0xFFFF, 3),  # above the surrogates
    (0x10000, 0x10FFFF, 4),
)
HEX_DIGITS = "0123456789abcdef"


def random_text(rng, max_bytes):
    kind = rng.below(9)
    target = rng.below(max_bytes + 1)
    if kind < len(CHAR_RANGES):
        lo, hi, width = CHAR_RANGES[kind]
        return "".join([chr(lo + c) for c in rng.belows(hi - lo + 1, target // width)])
    if kind in (6, 7):
        alphabet = [chr(0x20 + c) for c in rng.belows(0x5F, 1 + rng.below(4))] if kind == 6 else HEX_DIGITS
        return "".join([alphabet[i] for i in rng.belows(len(alphabet), target)])
    chars = []
    size = 0
    while True:
        lo, hi, width = CHAR_RANGES[rng.below(len(CHAR_RANGES))]
        if size + width > target:
            return "".join(chars)
        chars.append(chr(lo + rng.below(hi - lo + 1)))
        size += width


def edge_texts():
    texts = ["", "a", "€", "\U0001F600", "0123456789:;", "0123456789:;" * 100, "a" * 2000, "ab" * 1000]
    texts += ["\x00", "\x7f", "|", "%7C", "=", "été", "\U0010FFFF", "﻿", "ࠀ"]
    texts += ["".join(chr(48 + r) * (r + 1) for r in range(12)), "".join(chr(48 + r) * 7 for r in range(11))]
    return texts


# Near-tie search: e4 = K log2 n - sum_c K c log2 c / n with K = 10^4 / log2 12 (lines 90-93 in exact
# arithmetic). Meet in the middle over two groups of bins, each enumerated as partitions (the entropy
# does not depend on bin order), keeping 12-bin vectors whose entropy sum lands within `tolerance` of a
# half as the binary64 emulation of the reduction sees it.
NEAR_TIE_CONFIGS = (
    # (parts per group, group masses, fixed bins, tolerance)
    (6, (160, 160), (), from_fraction(Fraction(1, 10**10))),
    (6, (150, 170), (), from_fraction(Fraction(1, 10**10))),
    (5, (210, 230), (517, 911), from_fraction(Fraction(1, 10**10))),
)


def py_mod_one(x):
    # x % 1.0 with divisor 1.0, exactly as the binary64 remainder plus Python's sign adjustment.
    sign, significand, exponent = _parts(x.bits)
    if significand == 0 or exponent >= 0:
        return ZERO
    e = -exponent
    frac_significand = significand if e >= significand.bit_length() else significand & ((1 << e) - 1)
    if frac_significand == 0:
        return ZERO
    remainder = Dbl(_round_pack(sign, frac_significand, exponent, False))
    return ONE + remainder if sign else remainder


class PartitionWalk:
    def __init__(self, g, wanted=None):
        self.g, self.index, self.values, self.wanted, self.found = g, 0, [], wanted, {}

    def walk(self, parts, mass, cap, base=ZERO, prefix=()):
        g = self.g
        if parts == 2:
            lo, hi = max(0, mass - cap), mass // 2
            if hi < lo:
                return
            if self.wanted is None:
                self.values.extend([base + g[mass - y] + g[y] for y in range(lo, hi + 1)])
            else:
                start = self.index
                for i in self.wanted[bisect_left(self.wanted, start) : bisect_left(self.wanted, start + hi - lo + 1)]:
                    y = lo + i - start
                    self.found[i] = prefix + (mass - y, y)
            self.index += hi - lo + 1
            return
        for x in range(min(cap, mass), -(-mass // parts) - 1, -1):
            self.walk(parts - 1, mass - x, x, base + g[x], prefix + (x,))


def partitions(g, parts, mass, wanted=None):
    walk = PartitionWalk(g, wanted)
    walk.walk(parts, mass, mass)
    return walk.found if wanted is not None else walk.values


def dec_mod_one(value):
    # The remainder value % 1 with the sign of the dividend (as the decimal remainder gives it).
    return value - int(value)


def near_tie_bins(rng):
    found = []
    seen = set()
    k_scale = Fraction(10000) / LOG2_12_EXACT
    for parts, (mass_a, mass_b), fixed, tolerance in NEAR_TIE_CONFIGS:
        n = mass_a + mass_b + sum(fixed)
        exact_g = [k_scale * xlog2x(c) / n for c in range(max(mass_a, mass_b) + 1)]
        g = [from_fraction(dec_mod_one(v)) for v in exact_g]
        fixed_g = sum((k_scale * xlog2x(c) / n for c in fixed), Fraction(0))
        inner = k_scale * Fraction(log2_fixed(n), 1 << LOG2_BITS) - fixed_g - Fraction(1, 2)
        target = from_fraction(dec_mod_one(inner))
        xs = [py_mod_one(target - v) for v in partitions(g, parts, mass_a)]
        ys = [py_mod_one(v) for v in partitions(g, parts, mass_b)]
        y_order = sorted(range(len(ys)), key=ys.__getitem__)
        y_sorted = [ys[j] for j in y_order]
        hits = []
        for i, x in enumerate(xs):
            j = bisect_left(y_sorted, x)
            for k in (j - 1, j):
                yk = y_sorted[k % len(y_sorted)]
                gap = abs(x - yk)
                if (gap if gap < ONE - gap else ONE - gap) < tolerance:
                    hits.append((i, y_order[k % len(y_sorted)]))
        tuples_a = partitions(g, parts, mass_a, sorted({i for i, _ in hits}))
        tuples_b = partitions(g, parts, mass_b, sorted({j for _, j in hits}))
        for i, j in hits:
            bins = list(tuples_a[i]) + list(tuples_b[j]) + list(fixed)
            key = tuple(sorted(bins))
            if key in seen:
                continue
            seen.add(key)
            order = [rng.below(1 << 30) for _ in range(12)]
            found.append([b for _, b in sorted(zip(order, bins))])
    return found


def shannon_rows(summary):
    rng = Lcg(0x5348414E4E4F4E31)
    rows = []
    texts = edge_texts() + [random_text(rng, 120) for _ in range(1500)]
    bins_list = [shannon_bins(t) for t in texts]
    for _ in range(18500):
        bins_list.append(shannon_bins(random_text(rng, 2000)))
    near = near_tie_bins(rng)
    bins_list += near
    differing = 0
    closest = None
    arguments = set()
    for index, bins in enumerate(bins_list):
        want = shannon_score_e4(bins)
        exact, distance = exact_shannon_e4(bins)
        if want != exact:
            differing += 1
        total = sum(bins) or 1
        total_d = Dbl.from_int(total)
        for c in bins:
            if c > 0:
                arguments.add((Dbl.from_int(c) / total_d).bits)
        if distance is not None and (closest is None or distance < closest):
            closest = distance
        if index < len(texts):
            field = "utf8_hex=" + texts[index].encode("utf-8").hex()
        else:
            field = "bins=" + ",".join(map(str, bins))
        rows.append(f"SHANNON|{field}|want={want}|exact={exact}")
    summary.update(
        shannon=len(rows),
        shannon_text=len(texts),
        shannon_near_tie=len(near),
        shannon_want_ne_exact=differing,
        shannon_closest_tie_e_minus_30=(closest.numerator * 10**30) // closest.denominator,
        shannon_log2_arguments=len(arguments),
    )
    return rows


def log2_rows(summary):
    rng = Lcg(0x4C4F4732)
    xs = [Dbl.from_int(12), HALF, from_fraction(Fraction(3, 4)), ONE]
    xs += [from_fraction(Fraction(1, 1 << k)) for k in range(1, 31)]
    xs += [ONE - Dbl.from_int(j) * from_fraction(Fraction(1, 1 << 53)) for j in range(1, 9)]
    xs += [ONE + Dbl.from_int(j) * from_fraction(Fraction(1, 1 << 52)) for j in range(1, 9)]
    for high in (0x3FE6A09B, 0x3FE6A09C, 0x3FF6A09B, 0x3FF6A09C):  # either side of the reduction at :2001
        xs += [Dbl(high << 32), Dbl((high << 32) | 0xFFFFFFFF)]
    while len(xs) < 4096:
        total = 1 + rng.below(1 << 20)
        xs.append(Dbl.from_int(1 + rng.below(total)) / Dbl.from_int(total))
    rows = [f"LOG2|x={x.bits:016x}|want={v8_log2(x).bits:016x}" for x in xs]
    summary.update(log2=len(rows))
    return rows


def baseline_rows(summary):
    for k in range(1000):
        if js_to_fixed_units(Dbl.from_int(k) / Dbl.from_int(1000), 4) != 10 * k:
            raise SystemExit(f"+({k} / 1000).toFixed(4) is not {10 * k} e4 units")
    rng = Lcg(0x42415345)
    pairs = [("", ""), ("", "x"), ("x", ""), ("PID-0001", "hello"), ("a|b", "c|d"), ("€", "\U0001F600")]
    for _ in range(1500):
        pairs.append((random_text(rng, 40), random_text(rng, 64)))
    rows = []
    for pid, content in pairs:
        pid_hex, content_hex = pid.encode("utf-8").hex(), content.encode("utf-8").hex()
        rows.append(f"BASELINE|pid_hex={pid_hex}|content_hex={content_hex}|want={baseline_e4(pid, content)}")
    summary.update(baseline=len(rows))
    return rows


SPECIAL_E4 = (0, 1, 5000, 7199, 7200, 7201, 9999, 10000)


def random_e4(rng):
    if rng.below(8) == 0:
        return SPECIAL_E4[rng.below(len(SPECIAL_E4))]
    return rng.below(10001)


def composite_rows(summary, total):
    rng = Lcg(0x434F4D50)
    sets = []
    for mask in range(32):
        for value in SPECIAL_E4:
            sets.append({**{k: value for i, k in enumerate(OPTIONAL) if mask >> i & 1}, "shannon": value, "baseline": value})
        for _ in range(8):
            sets.append({**{k: random_e4(rng) for i, k in enumerate(OPTIONAL) if mask >> i & 1}, "shannon": random_e4(rng), "baseline": 10 * rng.below(1000)})
    ties = 0
    while ties < 2000:
        # Exact halves need an even weight sum in twentieths, which only patterns with l4 have.
        mask = rng.below(32) | 2
        signals = {**{k: rng.below(10001) for i, k in enumerate(OPTIONAL) if mask >> i & 1}, "shannon": rng.below(10001), "baseline": rng.below(10001)}
        weight = sum(WEIGHT_TWENTIETHS[k] for k in signals)
        weighted = sum(WEIGHT_TWENTIETHS[k] * v for k, v in signals.items())
        steps = [s for s in range(weight) if (weighted + 3 * s) % weight == weight // 2 and signals["shannon"] + s <= 10000]
        if steps:
            signals["shannon"] += steps[0]
            sets.append(signals)
            ties += 1
    while len(sets) < total:
        mask = rng.below(32)
        baseline = 10 * rng.below(1000) if rng.below(2) else random_e4(rng)
        sets.append({**{k: random_e4(rng) for i, k in enumerate(OPTIONAL) if mask >> i & 1}, "shannon": random_e4(rng), "baseline": baseline})
    rows = []
    rounds_unlike_exact = 0
    for signals in sets:
        want = composite_e4(signals)
        if want != exact_composite_e4(signals):
            rounds_unlike_exact += 1
        fields = "|".join(f"{k}={signals[k]}" for k, _ in WEIGHTS if k in signals)
        rows.append(f"COMPOSITE|{fields}|want={want}")
    summary.update(composite=len(rows), composite_exact_half=ties, composite_want_ne_exact=rounds_unlike_exact)
    return rows


def reverse_rows(summary):
    rows = []
    for composite in range(10001):
        risk, promoted = reverse_gain(js_number_from_e4(composite))
        rows.append(f"REVERSE|composite={composite}|reverse_risk={risk}|promoted={int(promoted)}")
    summary.update(reverse=len(rows))
    return rows


def render(summary):
    rows = shannon_rows(summary) + log2_rows(summary) + baseline_rows(summary) + composite_rows(summary, 50000) + reverse_rows(summary)
    return HEADER + "\n".join(rows) + "\n"


def verify_upstream():
    data = UPSTREAM.read_bytes()
    blob = hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()
    if blob != UPSTREAM_BLOB:
        raise SystemExit(f"{UPSTREAM} is blob {blob}, expected {UPSTREAM_BLOB}")


def summary_line(status, summary):
    return "SCORE_REFEREE|" + "|".join([status] + [f"{k}={v}" for k, v in summary.items()] + ["json=0"])


def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print("usage: score_referee.py [--check]", file=sys.stderr)
        return 2
    verify_upstream()
    summary = {}
    text = render(summary)
    if args == ["--check"]:
        if FIXTURE.read_text(encoding="utf-8") != text:
            print(summary_line("check=FAIL", summary))
            return 1
        print(summary_line("check=PASS", summary))
        return 0
    FIXTURE.write_text(text, encoding="utf-8")
    print(summary_line(f"written={FIXTURE.name}", summary))
    return 0


if __name__ == "__main__":
    sys.exit(main())
