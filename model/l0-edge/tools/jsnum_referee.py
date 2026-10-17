#!/usr/bin/env python3
"""Referee for src/jsnum.rs: Python floats are the same IEEE-754 binary64 values as JavaScript numbers.

Writes tests/fixtures/jsnum-vectors.hbp (--check diffs it); --grid streams the extractor's full
rounding grids (gnnDataExport.js:58 and :60) for examples/jsnum_grid.rs to compare.
"""
import math
import pathlib
import struct
import sys
from fractions import Fraction

VECTORS = pathlib.Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "jsnum-vectors.hbp"
HEADER = "# jsnum vectors from tools/jsnum_referee.py (Python binary64 = JavaScript numbers); do not edit\n"


def bits(x):
    return struct.unpack(">Q", struct.pack(">d", x))[0]


def js_math_round(x):
    # Math.round: the integer nearest x, ties toward +infinity.
    return math.floor(Fraction(x) + Fraction(1, 2))


def js_to_fixed_units(x, digits):
    # x.toFixed(digits) for 0 <= x < 1e21: n with n / 10^digits nearest x, ties to the larger n.
    return math.floor(Fraction(x) * 10 ** digits + Fraction(1, 2))


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
        a, b = an / ad, bn / bd
        ab = f"a={an}/{ad}|b={bn}/{bd}"
        rows.append(f"CASE|op=ratio|{ab}|want={bits(a)}")
        rows.append(f"CASE|op=mul|{ab}|want={bits(a * b)}")
        rows.append(f"CASE|op=add|{ab}|want={bits(a + b)}")
        if bn:
            rows.append(f"CASE|op=div|{ab}|want={bits(a / b)}")
        if a * b < 1e12:
            rows.append(f"CASE|op=round|{ab}|want={js_math_round(a * b)}")
            rows.append(f"CASE|op=fixed4|{ab}|want={js_to_fixed_units(a * b, 4)}")
    # Every grid case where the JavaScript result differs from exact rational rounding.
    for t, c, scale in grid():
        js = js_math_round(t / c * scale)
        if js != math.floor(Fraction(t * scale, c) + Fraction(1, 2)):
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
            out.write(f"{t} {c} {scale} {js_math_round(t / c * scale)}\n")
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
