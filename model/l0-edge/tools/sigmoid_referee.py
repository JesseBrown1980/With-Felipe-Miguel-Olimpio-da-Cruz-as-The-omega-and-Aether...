#!/usr/bin/env python3
"""Stdlib referee for the sigmoid of src/model.rs, in integer arithmetic only (no float, no decimal).

e^(m / 2^s) is bracketed by lower and upper sums of its series in units of 2^-p: each term rounded down and up, and,
once n + 1 >= 2 m / 2^s, the remaining terms bounded by the last upper term (the bracket of src/model.rs
exp_series_bounds). A comparison of 2^24 sigmoid(t) with a rational doubles p until both ends of the bracket fall on
the same side; for t != 0 the value is irrational, so they always do. SIGMOID q24 = floor(2^24 / (1 + e^-t) + 1/2),
t = logit_q48 / 2^48, exactly; LN2_Q62 = floor(2^62 ln 2 + 1/2), exactly.
tools/model_parity.py writes the CONST and SIGMOID rows of tests/fixtures/expected-model.hbp with these functions;
--check regenerates those rows without torch and diffs them with the committed file.
Run: python3 -I tools/sigmoid_referee.py --check
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXPECTED = ROOT / "tests" / "fixtures" / "expected-model.hbp"
FRAC_BITS = 24
LOGIT_BITS = 2 * FRAC_BITS
START_BITS = 128
# src/model.rs TIE_WINDOW_BITS: the boundary rows are logits whose exact 2^24 sigmoid lies within 2^-32 of a half.
TIE_WINDOW_BITS = 32

sys.dont_write_bytecode = True  # no __pycache__ beside tools/


class Lcg:
    # The generator of tools/jsnum_referee.py.
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound


def exp_bounds(m, shift, bits):
    """(low, high) with low <= 2^bits e^(m / 2^shift) <= high, for an integer m >= 0."""
    one = 1 << bits
    low = high = low_term = high_term = one
    n = 1
    while True:
        divisor = n << shift
        low_term = low_term * m // divisor
        high_term = -(-high_term * m // divisor)
        low += low_term
        high += high_term
        # With r = m / ((n + 1) 2^shift) <= 1/2 the terms after n sum to at most term_n (r + r^2 + ...) <= term_n.
        if (n + 1) << shift >= 2 * m and high_term <= 1:
            return low, high + high_term
        n += 1


def exp_compare(m, shift, num, den):
    """Sign (-1, 0, +1) of e^(m / 2^shift) - num / den, for integers m >= 0 and num, den > 0."""
    bits = START_BITS
    while True:
        low, high = exp_bounds(m, shift, bits)
        if low * den > num << bits:
            return 1
        if high * den < num << bits:
            return -1
        if low == high:
            return 0
        bits *= 2


def scaled_sigmoid_bounds(logit_q48, bits):
    """((n0, d0), (n1, d1)) with n0 / d0 <= 2^24 sigmoid(logit_q48 / 2^48) <= n1 / d1."""
    low, high = exp_bounds(abs(logit_q48), LOGIT_BITS, bits)
    one = 1 << bits
    if logit_q48 >= 0:
        # 2^24 E / (E + 1) with E = e^|t|, increasing in E.
        return (low << FRAC_BITS, low + one), (high << FRAC_BITS, high + one)
    # 2^24 / (E + 1), decreasing in E.
    return (one << FRAC_BITS, high + one), (one << FRAC_BITS, low + one)


def sigmoid_compare(logit_q48, num, den):
    """Sign (-1, 0, +1) of 2^24 sigmoid(logit_q48 / 2^48) - num / den, for den > 0."""
    bits = START_BITS
    while True:
        (n0, d0), (n1, d1) = scaled_sigmoid_bounds(logit_q48, bits)
        if n0 * den > num * d0:
            return 1
        if n1 * den < num * d1:
            return -1
        if n0 * d1 == n1 * d0:
            return 0
        bits *= 2


def sigmoid_q24(logit_q48):
    """floor(2^24 sigmoid(logit_q48 / 2^48) + 1/2), exactly."""
    (n0, d0), _ = scaled_sigmoid_bounds(logit_q48, START_BITS)
    q = (2 * n0 + d0) // (2 * d0)
    while sigmoid_compare(logit_q48, 2 * q + 1, 2) >= 0:
        q += 1
    while sigmoid_compare(logit_q48, 2 * q - 1, 2) < 0:
        q -= 1
    return q


def within_tie_window(logit_q48):
    """Whether 2^24 sigmoid(logit_q48 / 2^48) lies within 2^-TIE_WINDOW_BITS of a half."""
    q = sigmoid_q24(logit_q48)
    window = 1 << TIE_WINDOW_BITS
    above_lower_half = ((2 * q - 1) * window + 2, 2 * window)  # q - 1/2 + 2^-32
    below_upper_half = ((2 * q + 1) * window - 2, 2 * window)  # q + 1/2 - 2^-32
    return sigmoid_compare(logit_q48, *above_lower_half) < 0 or sigmoid_compare(logit_q48, *below_upper_half) > 0


def atanh_estimate(num, den, bits):
    # About 2^bits atanh(num / den) for |num / den| <= 1/3; every term rounded down, so only an estimate.
    sign = -1 if num < 0 else 1
    num = abs(num)
    total, k = 0, 0
    power = (num << bits) // den
    while power:
        total += power // (2 * k + 1)
        power = power * num * num // (den * den)
        k += 1
    return sign * total


def ln_estimate(num, den, bits):
    # About 2^bits ln(num / den): num / den = 2^shift x with x in (1/2, 2), ln x = 2 atanh((x - 1) / (x + 1)).
    shift = num.bit_length() - den.bit_length()
    a, b = (num, den << shift) if shift >= 0 else (num << -shift, den)
    return shift * 2 * atanh_estimate(1, 3, bits) + 2 * atanh_estimate(a - b, a + b, bits)


def crossing_q48(k):
    """floor(2^48 ln((k + 1/2) / (2^24 - k - 1/2))): the largest Q48 logit with 2^24 sigmoid below k + 1/2."""
    half = (2 * k + 1, 2)
    c = ln_estimate(2 * k + 1, (1 << (FRAC_BITS + 1)) - 2 * k - 1, 112) >> (112 - LOGIT_BITS)
    while sigmoid_compare(c + 1, *half) < 0:
        c += 1
    while sigmoid_compare(c, *half) >= 0:
        c -= 1
    return c


def ln2_q62():
    """floor(2^62 ln 2 + 1/2): the L with e^((2L - 1) / 2^63) < 2 < e^((2L + 1) / 2^63)."""
    value = (ln_estimate(2, 1, 128) + (1 << 65)) >> 66
    while exp_compare(2 * value + 1, 63, 2, 1) <= 0:
        value += 1
    while exp_compare(2 * value - 1, 63, 2, 1) > 0:
        value -= 1
    return value


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


def boundary_logits(rng):
    # The boundary set of model/l1-prototype/tools/int_referee.py:193-212, in integers: Q48 logits next to
    # ln((k + 1/2) / (2^24 - k - 1/2)) * 2^48, where 2^24 sigmoid crosses k + 1/2, on the integer lattice (the L0
    # logit lattice) and on multiples of 10 (the L1 lattice, kept so both crates test the same logits), with both
    # signs; kept when the exact value lies within 2^-32 of the half (the window src/model.rs decides exactly).
    ks = [rng.below(16000) for _ in range(50)] + [(1 << FRAC_BITS) - 1 - rng.below(16000) for _ in range(50)]
    ks += [rng.below(1 << FRAC_BITS) for _ in range(300)]
    # Four logits from the L1 review's boundary hunt (integer lattice, then multiples of 10).
    kept = [-2903085619798773, 4568357769096465, 2979298638208620, -3016837914596280]
    for k in ks:
        crossing = crossing_q48(k)
        for step in (1, 10):
            base = crossing // step * step
            kept += [v for v in (base, base + step) if within_tie_window(v)]
    kept = list(dict.fromkeys(kept))
    return kept + [-v for v in kept]


def rows():
    """(CONST and SIGMOID rows, header lines, summary) as tools/model_parity.py writes them."""
    boundary = boundary_logits(Lcg(0x2545F4914F6CDD1D))
    logits = sigmoid_logits(Lcg(0x9E3779B97F4A7C15)) + boundary
    out = [f"CONST|name=LN2_Q62|value={ln2_q62()}"]
    out += [f"SIGMOID|logit_q48={v}|q24={sigmoid_q24(v)}" for v in logits]
    header = (
        "# SIGMOID q24 = floor(2^24 / (1 + e^-t) + 1/2), t = logit_q48 / 2^48, exact (tools/sigmoid_referee.py, "
        "integer series brackets)\n"
        f"# the last {len(boundary)} SIGMOID rows are logits whose exact 2^24 / (1 + e^-t) lies within 2^-32 of a half\n"
    )
    return out, header, {"sigmoid": len(logits), "boundary": len(boundary)}


def main():
    args = sys.argv[1:]
    if args != ["--check"]:
        print("usage: sigmoid_referee.py --check", file=sys.stderr)
        return 2
    want, header, summary = rows()
    text = EXPECTED.read_bytes().decode("utf-8")
    got = [line for line in text.split("\n") if line.startswith(("CONST|", "SIGMOID|"))]
    if got != want or header not in text:
        first = next((i for i, (w, g) in enumerate(zip(want, got)) if w != g), min(len(want), len(got)))
        print(f"SIGMOID_REFEREE|check=FAIL|first_diff_row={first + 1}|header={int(header in text)}|json=0")
        return 1
    print(f"SIGMOID_REFEREE|check=PASS|sigmoid={summary['sigmoid']}|boundary={summary['boundary']}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
