#!/usr/bin/env python3
"""Referee for src/jsnum.rs, in integer arithmetic only (no float anywhere).

A JavaScript number is held as its IEEE-754 binary64 bit pattern. Each JS operation is computed exactly on the
rationals the bit patterns stand for and rounded once to the nearest binary64, ties to even, in integers; Math.round
and toFixed are exact on that value. Writes tests/fixtures/jsnum-vectors.hbp (--check diffs it); --grid streams the
extractor's full rounding grids (gnnDataExport.js:58 and :60) for examples/jsnum_grid.rs to compare.
"""
import pathlib
import sys

VECTORS = pathlib.Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "jsnum-vectors.hbp"
# The committed fixture's first line, kept byte for byte from the float version of this referee; the values are the
# same binary64 values, now computed from bit patterns in integers.
HEADER ="# jsnum vectors from tools/jsnum_referee.py (Python binary64 = JavaScript numbers); do not edit\n"
SIGN = 1 << 63
FRACTION_BITS = 52
EXPONENT_ALL_ONES = 0x7FF
MIN_QUANTUM = -1074


def to_binary64(num, den=1):
    """Bit pattern of the binary64 nearest num / den (den > 0), ties to even; +0 for 0, infinity past the range."""
    if num == 0:
        return 0
    sign = SIGN if num < 0 else 0
    num = abs(num)
    e = num.bit_length() - den.bit_length()
    if (den << e if e >= 0 else den) > (num if e >= 0 else num << -e):
        e -= 1  # now 2^e <= num / den < 2^(e + 1)
    quantum = max(e - FRACTION_BITS, MIN_QUANTUM)
    if quantum >= 0:
        den <<= quantum
    else:
        num <<= -quantum
    m, r = divmod(num, den)
    if 2 * r > den or (2 * r == den and m & 1):
        m += 1
    if m == 1 << (FRACTION_BITS + 1):
        m >>= 1
        quantum += 1
    if m < 1 << FRACTION_BITS:
        return sign | m  # subnormal
    biased = quantum - MIN_QUANTUM + 1
    if biased >= EXPONENT_ALL_ONES:
        return sign | (EXPONENT_ALL_ONES << FRACTION_BITS)
    return sign | (biased << FRACTION_BITS) | (m - (1 << FRACTION_BITS))


def decode(bits):
    """(num, den) with num / den the exact value of a finite binary64 bit pattern, den a power of two."""
    biased = (bits >> FRACTION_BITS) & EXPONENT_ALL_ONES
    if biased == EXPONENT_ALL_ONES:
        raise ValueError(f"{bits:016x} is not finite")
    fraction = bits & ((1 << FRACTION_BITS) - 1)
    if biased == 0:
        m, e = fraction, MIN_QUANTUM
    else:
        m, e = fraction | (1 << FRACTION_BITS), biased + MIN_QUANTUM - 1
    if bits & SIGN:
        m = -m
    return (m << e, 1) if e >= 0 else (m, 1 << -e)


def js_add(a, b):
    (an, ad), (bn, bd) = decode(a), decode(b)
    return to_binary64(an * bd + bn * ad, ad * bd)


def js_mul(a, b):
    (an, ad), (bn, bd) = decode(a), decode(b)
    return to_binary64(an * bn, ad * bd)


def js_div(a, b):
    (an, ad), (bn, bd) = decode(a), decode(b)
    if bn == 0:
        raise ZeroDivisionError("JS division by zero is outside this referee")
    num, den = an * bd, ad * bn
    return to_binary64(-num, -den) if den < 0 else to_binary64(num, den)


def js_math_round(x):
    # Math.round: the integer nearest x, ties toward +infinity.
    num, den = decode(x)
    return (2 * num + den) // (2 * den)


def js_to_fixed_units(x, digits):
    # x.toFixed(digits) for 0 <= x < 1e21: n with n / 10^digits nearest x, ties to the larger n.
    num, den = decode(x)
    return (2 * num * 10**digits + den) // (2 * den)


def js_round_ratio_scaled(total, count, scale):
    # Math.round(total / count * scale) on JS numbers holding the integers total, count, scale (gnnDataExport.js:58, :60).
    return js_math_round(js_mul(js_div(to_binary64(total), to_binary64(count)), to_binary64(scale)))


assert to_binary64(1, 10) == 0x3FB999999999999A
assert to_binary64(23 * 100, 40 * 100) == 0x3FE2666666666666
assert js_round_ratio_scaled(23, 40, 100) == 57
assert to_binary64(1, 1 << 1074) == 1
assert to_binary64(1, 1 << 1075) == 0
assert to_binary64(3, 1 << 1076) == 1
assert to_binary64(1 << 1024) == EXPONENT_ALL_ONES << FRACTION_BITS


class Lcg:
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound


def operand(rng):
    kind = rng.below(4)
    if kind == 0:
        return rng.below(10001), 10000
    if kind == 1:
        return rng.below(1000) + 1, rng.below(1000) + 1
    if kind == 2:
        return rng.below(1 << 30) + 1, rng.below(1 << 20) + 1
    return rng.below(22 * 400), rng.below(400) + 1


def vector_rows():
    rng = Lcg(0x2545F4914F6CDD1D)
    rows = []
    for _ in range(4000):
        (an, ad), (bn, bd) = operand(rng), operand(rng)
        a, b = to_binary64(an, ad), to_binary64(bn, bd)
        ab = f"a={an}/{ad}|b={bn}/{bd}"
        product = js_mul(a, b)
        rows.append(f"CASE|op=ratio|{ab}|want={a}")
        rows.append(f"CASE|op=mul|{ab}|want={product}")
        rows.append(f"CASE|op=add|{ab}|want={js_add(a, b)}")
        if bn:
            rows.append(f"CASE|op=div|{ab}|want={js_div(a, b)}")
        num, den = decode(product)
        if num < 10**12 * den:  # a * b < 1e12; 1e12 is a binary64 value, so the exact comparison is JS's
            rows.append(f"CASE|op=round|{ab}|want={js_math_round(product)}")
            rows.append(f"CASE|op=fixed4|{ab}|want={js_to_fixed_units(product, 4)}")
    # Every grid case where the JavaScript result differs from exact rational rounding.
    for t, c, scale in grid():
        js = js_round_ratio_scaled(t, c, scale)
        if js != (2 * t * scale + c) // (2 * c):
            rows.append(f"CASE|op=round|a={t}/{c}|b={scale}/1|want={js}")
    return rows


def grid():
    for c in range(1, 401):
        for t in range(0, 21 * c + 1):
            yield t, c, 100
    for c in range(1, 401):
        for f in range(0, c + 1):
            yield f, c, 1000


def render():
    return HEADER + "\n".join(vector_rows()) + "\n"


def main():
    args = sys.argv[1:]
    if args == ["--grid"]:
        out = sys.stdout
        for t, c, scale in grid():
            out.write(f"{t} {c} {scale} {js_round_ratio_scaled(t, c, scale)}\n")
        return 0
    text = render()
    if args == ["--check"]:
        if VECTORS.read_text(encoding="utf-8") != text:
            print("JSNUM_VECTORS|check=FAIL|json=0")
            return 1
        print(f"JSNUM_VECTORS|check=PASS|rows={text.count(chr(10)) - 1}|json=0")
        return 0
    if args:
        print("usage: jsnum_referee.py [--check | --grid]", file=sys.stderr)
        return 2
    VECTORS.write_text(text, encoding="utf-8")
    print(f"JSNUM_VECTORS|written={VECTORS.name}|rows={text.count(chr(10)) - 1}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
