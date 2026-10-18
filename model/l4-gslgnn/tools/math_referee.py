#!/usr/bin/env python3
"""Writes tests/fixtures/expected-math.hbp: exact references for the scalar steps of src/model.rs and src/lib.rs.

Integer arithmetic only: no float, no decimal. Each irrational reference is decided from integer lower and upper
bounds at a working precision that doubles until both bounds round to the same integer.
CONST LN2_Q62: floor(ln 2 * 2^62 + 1/2), from ln 2 = sum over k >= 1 of 1 / (k * 2^k).
CONST SQRT32_F32: the float32 of the binary64 32 ** 0.5 (gsl_gnn.py:71, keys.shape[1] == 32), which torch uses as
the divisor of a float32 tensor, as significand * 2^-shift; sqrt from math.isqrt, each rounding nearest-even.
SIGMOID rows: floor(2^24 / (1 + e^-t) + 1/2), t = logit_q48 / 2^48, e^-t bounded by a Taylor series and squarings;
for two classes, softmax(logits)[1] (gsl_gnn.py:211-214) is the sigmoid of logits[1] - logits[0].
BYTE rows: floor(f * 2^24 + 1/2) for f the float32 of the binary64 byte / 255, the conversion that
asolaria-score.mjs:113 (binary64 division) and gslgnn_inference_server.py:51 (torch.float32) apply; both roundings
to nearest, ties to even, done on integers.
Stdlib only. --check regenerates in memory and diffs.
"""
import math
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXPECTED = ROOT / "tests" / "fixtures" / "expected-math.hbp"
FRAC_BITS = 24
LOGIT_BITS = 48
BINARY64_BITS = 53
FLOAT32_BITS = 24
FLOAT32_EXPONENTS = (-126, 127)  # unbiased exponents of the normal float32 values
START_PRECISION = 128
MAX_PRECISION = 1 << 14
HALVINGS = 16  # e^y = (e^(y / 2^16))^(2^16)


class Lcg:
    # The generator of model/l0-edge/tools/jsnum_referee.py.
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound


def ceil_div(num, den):
    return -((-num) // den)


def round_bits(n, sticky, bits):
    # n + f (0 <= f < 1, sticky = f > 0) to `bits` significant bits, nearest, ties to even: (m, shift), m * 2^shift.
    drop = n.bit_length() - bits
    if drop <= 0:
        if sticky:
            raise SystemExit("MATH_REFEREE|refused=rounding|reason=too few bits")
        return n, 0
    m, rest, half = n >> drop, n & ((1 << drop) - 1), 1 << (drop - 1)
    if rest > half or (rest == half and (sticky or m & 1)):
        m += 1
        if m == 1 << bits:
            m, drop = m >> 1, drop + 1
    return m, drop


def ratio_to_float(num, den, bits):
    # num / den (both positive) to `bits` significant bits, nearest, ties to even: (m, e), the value m * 2^e.
    shift = bits + 2 - (num.bit_length() - den.bit_length())
    if shift >= 0:
        quotient, rest = divmod(num << shift, den)
    else:
        quotient, rest = divmod(num, den << -shift)
    m, drop = round_bits(quotient, rest != 0, bits)
    return m, drop - shift


def sqrt_to_float(n, bits):
    # sqrt(n) for an integer n > 0 to `bits` significant bits, nearest, ties to even: (m, e), the value m * 2^e.
    shift = max(0, 2 * (bits + 2) - n.bit_length() + 2)
    shift += shift & 1
    root = math.isqrt(n << shift)
    m, drop = round_bits(root, root * root != n << shift, bits)
    return m, drop - shift // 2


def to_float32(m, e):
    # The float32 of the binary64 m * 2^e (m < 2^53), nearest, ties to even; refuses outside the normal range.
    m, drop = round_bits(m, False, FLOAT32_BITS)
    e += drop
    if not FLOAT32_EXPONENTS[0] <= m.bit_length() - 1 + e <= FLOAT32_EXPONENTS[1]:
        raise SystemExit("MATH_REFEREE|refused=float32_range")
    return m, e


def q24_of(m, e):
    # floor(m * 2^e * 2^24 + 1/2) for m >= 0.
    k = e + FRAC_BITS
    if k >= 0:
        return m << k
    return ((m << 1) + (1 << -k)) >> (1 - k)


def exp_bounds(num, den_bits, precision):
    # (low, high) with low <= e^(num / 2^den_bits) * 2^precision <= high: the Taylor series of e^r for
    # r = num / 2^(den_bits + HALVINGS), |r| < 1/2, with its tail bounded by 2 |r|^k / k!, then HALVINGS squarings.
    r_bits = den_bits + HALVINGS
    if abs(num) >= 1 << (r_bits - 1):
        raise SystemExit("MATH_REFEREE|refused=exp_range")
    one = 1 << precision
    low = high = 0
    k, power, factorial = 0, 1, 1
    while True:
        den = factorial << (r_bits * k)
        low += (power * one) // den
        high += ceil_div(power * one, den)
        k += 1
        power *= num
        factorial *= k
        tail = ceil_div(2 * abs(power) * one, factorial << (r_bits * k))
        if tail <= 1:
            low, high = low - tail, high + tail
            break
    if low <= 0:
        raise SystemExit("MATH_REFEREE|refused=exp_bounds")
    for _ in range(HALVINGS):
        low = (low * low) >> precision
        high = ceil_div(high * high, one)
    return low, high


def exact_sigmoid_q24(logit_q48):
    # q = floor(2^24 / (1 + E) + 1/2), E = e^-t, decreasing in E; decided when both bounds of E give one q.
    precision = START_PRECISION
    while precision <= MAX_PRECISION:
        low, high = exp_bounds(-logit_q48, LOGIT_BITS, precision)
        one = 1 << precision

        def q24(e_scaled):
            return ((one << (FRAC_BITS + 1)) + one + e_scaled) // ((one + e_scaled) << 1)

        if q24(low) == q24(high):
            return q24(low)
        precision <<= 1
    raise SystemExit(f"MATH_REFEREE|refused=undecided|logit_q48={logit_q48}")


def ln2_q62():
    # ln 2 = sum 1 / (k * 2^k); the terms after k = K sum to less than 1 / ((K + 1) * 2^K).
    precision = START_PRECISION
    while precision <= MAX_PRECISION:
        one = 1 << precision
        low = sum(one // (k << k) for k in range(1, precision + 1))
        high = sum(ceil_div(one, k << k) for k in range(1, precision + 1)) + ceil_div(one, (precision + 1) << precision)
        q_low = ((low << 62) + (one >> 1)) >> precision
        q_high = ((high << 62) + (one >> 1)) >> precision
        if q_low == q_high:
            return q_low
        precision <<= 1
    raise SystemExit("MATH_REFEREE|refused=undecided|ln2")


def sqrt32_f32():
    m, e = to_float32(*sqrt_to_float(32, BINARY64_BITS))
    while m % 2 == 0:
        m, e = m >> 1, e + 1
    if e > 0:
        raise SystemExit("MATH_REFEREE|refused=sqrt32")
    return m, -e


def byte_q24(byte):
    if byte == 0:
        return 0
    return q24_of(*to_float32(*ratio_to_float(byte, 255, BINARY64_BITS)))


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
        "# SIGMOID q24 = floor(2^24 / (1 + e^-t) + 1/2), t = logit_q48 / 2^48, decided from integer bounds\n"
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
