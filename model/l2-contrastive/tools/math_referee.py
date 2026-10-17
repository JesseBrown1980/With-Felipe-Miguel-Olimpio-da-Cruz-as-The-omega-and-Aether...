#!/usr/bin/env python3
"""Writes tests/fixtures/expected-math.hbp: exact references for the two non-linear steps of src/model.rs.

SIGMOID rows: floor(2^24 / (1 + e^-t) + 1/2), t = logit_q48 / 2^48, Python decimal at 60 digits; for two
classes, softmax(logits)[1] (contrastive_gnn.py:114, 121) is the sigmoid of logits[1] - logits[0].
NORMALIZE rows: F.normalize(v, p=2, dim=1, eps=1e-12) = v / max(||v||_2, eps) (torch/nn/functional.py:6126-6127)
of a Q48 vector, each component floor(2^24 * v_i / max(||v||, eps) + 1/2) in exact integer arithmetic; eps is
the float32 of 1e-12, 9223372 * 2^-63, as the clamp applies it to a float32 norm.
Stdlib only. --check regenerates in memory and diffs.
"""
import math
import pathlib
import sys
from decimal import ROUND_FLOOR, Decimal, localcontext
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXPECTED = ROOT / "tests" / "fixtures" / "expected-math.hbp"
FRAC_BITS = 24
LOGIT_BITS = 48
PROJECTION = 64
EPS_F32 = Fraction(9223372, 1 << 63)
EPS_Q48 = EPS_F32 * (1 << LOGIT_BITS)


class Lcg:
    # The generator of model/l0-edge/tools/jsnum_referee.py.
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound

    def signed(self, bits):
        # A uniform-ish integer in [-2^bits, 2^bits], drawn from 53-bit pieces.
        magnitude = 0
        for _ in range(bits // 53 + 1):
            magnitude = (magnitude << 53) | self.below(1 << 53)
        magnitude %= (1 << bits) + 1
        return -magnitude if self.below(2) else magnitude


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
    for _ in range(300):
        v = 17 * one + rng.below(3 * one // 2)
        logits.append(v if rng.below(2) else -v)
    return logits


def ln2_q62():
    with localcontext() as ctx:
        ctx.prec = 60
        return int((Decimal(2).ln() * (1 << 62) + Decimal("0.5")).to_integral_value(rounding=ROUND_FLOOR))


def round_over_sqrt(numerator, square):
    # floor(numerator / sqrt(square) + 1/2) exactly, square > 0. With a = |2 * numerator| / sqrt(square),
    # m = floor(a) = isqrt(floor(a^2)); the result is (m + 1) // 2 for numerator >= 0, and for numerator < 0
    # it is -(m // 2) when a is an integer, else -((m + 1) // 2).
    twice = 2 * numerator
    quotient, remainder = divmod(twice * twice, square)
    m = math.isqrt(quotient)
    if twice >= 0:
        return (m + 1) // 2
    exact = remainder == 0 and m * m == quotient
    return -(m // 2) if exact else -((m + 1) // 2)


def exact_normalize_q24(v):
    square = sum(c * c for c in v)
    if square < EPS_Q48 * EPS_Q48:
        return [math.floor(Fraction(c * (1 << FRAC_BITS)) / EPS_Q48 + Fraction(1, 2)) for c in v]
    return [round_over_sqrt(c * (1 << FRAC_BITS), square) for c in v]


def normalize_vectors(rng):
    vectors = [[0] * PROJECTION]
    for magnitude in [1, 281, 282, 283, 1 << 40, -(1 << 51), (1 << 51) + 1, 1 << 52, -(1 << 119)]:
        v = [0] * PROJECTION
        v[rng.below(PROJECTION)] = magnitude
        vectors.append(v)
    for scale in [1, 1 << 20, 1 << 45]:
        # 3-4-5 and 5-12-13 directions: |v| is an integer multiple of scale.
        vectors.append([3 * scale, -4 * scale] + [0] * (PROJECTION - 2))
        vectors.append([0] * (PROJECTION - 3) + [-5 * scale, 12 * scale, 0])
    for _ in range(20):
        # Norms around eps (about 281.47 Q48 units).
        vectors.append([rng.signed(6) for _ in range(PROJECTION)])
    for _ in range(50):
        # The range of projection_head outputs: |v| below about 2^-3, in Q48 below 2^45.
        bits = 30 + rng.below(16)
        vectors.append([rng.signed(bits) for _ in range(PROJECTION)])
    for _ in range(30):
        bits = 1 + rng.below(119)
        vectors.append([rng.signed(bits) for _ in range(PROJECTION)])
    for _ in range(10):
        # One large component among small ones.
        v = [rng.signed(20) for _ in range(PROJECTION)]
        v[rng.below(PROJECTION)] = rng.signed(60)
        vectors.append(v)
    return vectors


def render():
    rows = [f"CONST|name=LN2_Q62|value={ln2_q62()}"]
    logits = sigmoid_logits(Lcg(0x9E3779B97F4A7C15))
    rows += [f"SIGMOID|logit_q48={v}|q24={exact_sigmoid_q24(v)}" for v in logits]
    vectors = normalize_vectors(Lcg(0x2545F4914F6CDD1D))
    for v in vectors:
        q24 = exact_normalize_q24(v)
        rows.append(f"NORMALIZE|v_q48={','.join(map(str, v))}|q24={','.join(map(str, q24))}")
    header = (
        "# exact references from tools/math_referee.py (stdlib); do not edit\n"
        "# SIGMOID q24 = floor(2^24 / (1 + e^-t) + 1/2), t = logit_q48 / 2^48, Python decimal at 60 digits\n"
        "# NORMALIZE q24_i = floor(2^24 * v_i / max(sqrt(sum v^2), eps) + 1/2), v in Q48, eps = 9223372 * 2^-63 "
        "(float32 of 1e-12) in Q48, exact integer arithmetic\n"
    )
    summary = f"sigmoid={len(logits)}|normalize={len(vectors)}"
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
