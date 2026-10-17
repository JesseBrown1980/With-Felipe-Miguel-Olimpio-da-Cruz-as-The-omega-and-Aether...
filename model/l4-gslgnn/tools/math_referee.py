#!/usr/bin/env python3
"""Writes tests/fixtures/expected-math.hbp: exact references for the scalar steps of src/model.rs and src/lib.rs.

CONST LN2_Q62: floor(ln 2 * 2^62 + 1/2), Python decimal at 60 digits.
CONST SQRT32_F32: the float32 of the Python scalar 32 ** 0.5 (gsl_gnn.py:71, keys.shape[1] == 32), which torch
uses as the divisor of a float32 tensor, as significand * 2^-shift.
SIGMOID rows: floor(2^24 / (1 + e^-t) + 1/2), t = logit_q48 / 2^48, Python decimal at 60 digits; for two classes,
softmax(logits)[1] (gsl_gnn.py:211-214) is the sigmoid of logits[1] - logits[0].
BYTE rows: floor(f * 2^24 + 1/2) for f the float32 of the double byte / 255, the conversion that
asolaria-score.mjs:113 (binary64 division) and gslgnn_inference_server.py:51 (torch.float32) apply.
Stdlib only. --check regenerates in memory and diffs.
"""
import math
import pathlib
import struct
import sys
from decimal import ROUND_FLOOR, Decimal, localcontext
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXPECTED = ROOT / "tests" / "fixtures" / "expected-math.hbp"
FRAC_BITS = 24
LOGIT_BITS = 48


class Lcg:
    # The generator of model/l0-edge/tools/jsnum_referee.py.
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound


def exact_sigmoid_q24(logit_q48):
    with localcontext() as ctx:
        ctx.prec = 60
        t = Decimal(logit_q48) / Decimal(1 << LOGIT_BITS)
        p = Decimal(1) / (Decimal(1) + (-t).exp())
        return int((p * (1 << FRAC_BITS) + Decimal("0.5")).to_integral_value(rounding=ROUND_FLOOR))


def sigmoid_logits(rng):
    one = 1 << LOGIT_BITS
    logits = [0, 1, -1, one, -one, 18 * one, 18 * one + 1, 18 * one - 1]
    logits += [-v for v in logits[5:]]
    logits += [rng.below(40 * one + 1) - 20 * one for _ in range(800)]
    logits += [rng.below(2 * one + 1) - one for _ in range(400)]
    # Around the attention threshold sigmoid(0.5) and the served L4 output (logit near 0.117).
    logits += [one // 2 + rng.below(one // 64 + 1) - one // 128 for _ in range(150)]
    logits += [one * 117 // 1000 + rng.below(one // 64 + 1) - one // 128 for _ in range(150)]
    for _ in range(300):
        v = 17 * one + rng.below(3 * one // 2)
        logits.append(v if rng.below(2) else -v)
    return logits


def ln2_q62():
    with localcontext() as ctx:
        ctx.prec = 60
        return int((Decimal(2).ln() * (1 << 62) + Decimal("0.5")).to_integral_value(rounding=ROUND_FLOOR))


def float32(value):
    return struct.unpack("<f", struct.pack("<f", value))[0]


def sqrt32_f32():
    divisor = Fraction(float32(32 ** 0.5))
    shift = divisor.denominator.bit_length() - 1
    if divisor.denominator != 1 << shift:
        raise SystemExit("MATH_REFEREE|refused=sqrt32")
    return divisor.numerator, shift


def byte_q24(byte):
    value = Fraction(float32(byte / 255))
    return math.floor(value * (1 << FRAC_BITS) + Fraction(1, 2))


def render():
    significand, shift = sqrt32_f32()
    rows = [
        f"CONST|name=LN2_Q62|value={ln2_q62()}",
        f"CONST|name=SQRT32_F32|significand={significand}|shift={shift}",
    ]
    logits = sigmoid_logits(Lcg(0x9E3779B97F4A7C15))
    rows += [f"SIGMOID|logit_q48={v}|q24={exact_sigmoid_q24(v)}" for v in logits]
    rows += [f"BYTE|byte={b}|q24={byte_q24(b)}" for b in range(256)]
    header = (
        "# exact references from tools/math_referee.py (stdlib); do not edit\n"
        "# SQRT32_F32 = float32(32 ** 0.5) = significand * 2^-shift\n"
        "# SIGMOID q24 = floor(2^24 / (1 + e^-t) + 1/2), t = logit_q48 / 2^48, Python decimal at 60 digits\n"
        "# BYTE q24 = floor(float32(byte / 255) * 2^24 + 1/2)\n"
    )
    summary = f"sigmoid={len(logits)}|bytes=256|sqrt32_f32={significand}/2^{shift}"
    return header + "\n".join(rows) + "\n", summary


def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print("usage: math_referee.py [--check]", file=sys.stderr)
        return 2
    text, summary = render()
    if args == ["--check"]:
        if EXPECTED.read_bytes().decode("utf-8") != text:
            print(f"MATH_REFEREE|check=FAIL|file={EXPECTED.name}")
            return 1
        print(f"MATH_REFEREE|check=PASS|{summary}")
        return 0
    EXPECTED.write_bytes(text.encode("utf-8"))
    print(f"MATH_REFEREE|written={EXPECTED.name}|{summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
