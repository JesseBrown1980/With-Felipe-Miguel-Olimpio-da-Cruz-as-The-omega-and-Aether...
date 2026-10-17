#!/usr/bin/env python3
"""Referee for src/score.rs: mirrors asolaria-score.mjs shannonSignal (lines 86-95), shaBaseline
(lines 25, 98-101, 145), reverseGain (lines 104-108) and the composite (lines 151-163) with Python
binary64 floats, which are the same values as JavaScript numbers.

Upstream: model/l0-edge/vendor/pipeline/asolaria-score.mjs (git blob b101c0989de3af0ca41db0eac1293c758d7e5296).
Writes tests/fixtures/expected-score.hbp; --check regenerates it in memory and diffs the committed copy.
Math.log2 is mirrored statement by statement from V8's log2: v8/v8 tag 12.4.254.21 (the V8 of Node
v22.22.0) src/base/ieee754.cc:1951-1962 (k_log1p) and 1973-2050 (log2), git blob
e71b63fd7c17711e5dc04d9acc040be0aa0b7c40; Python floats round + - * / as C doubles do without FMA
contraction, which x86-64 baseline code cannot emit. The summary reports how many log2 arguments C
libm's math.log2 gives a different value, and how many Shannon values that changes.
"""
import decimal
import hashlib
import math
import pathlib
import struct
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


def js_to_fixed_units(x, digits):
    # Number.prototype.toFixed(digits), 0 <= x < 1e21: n with n / 10^digits nearest x, ties to the larger n.
    return math.floor(Fraction(x) * 10**digits + Fraction(1, 2))


def js_to_fixed_string(x, digits):
    units = js_to_fixed_units(x, digits)
    return f"{units // 10**digits}.{units % 10**digits:0{digits}d}"


def js_number_from_e4(units):
    # Unary + of a toFixed(4) string: the correctly rounded double, as float() parses it.
    return float(f"{units // 10000}.{units % 10000:04d}")


# ---- shannonSignal, asolaria-score.mjs:86-95 -------------------------------------------------


def shannon_bins(content):
    buf = str(content).encode("utf-8")  # :87  Buffer.from(String(content), 'utf8')
    bins = [0] * 12  # :88  new Array(12).fill(0)
    for b in buf:  # :89  for (const b of buf) bins[b % 12]++
        bins[b % 12] += 1
    return bins


# ---- Math.log2, V8 12.4.254.21 src/base/ieee754.cc:1951-2050 (x > 0, finite) -----------------------


def double_bits(x):
    return struct.unpack("<Q", struct.pack("<d", x))[0]


def double_of(bits):
    return struct.unpack("<d", struct.pack("<Q", bits))[0]


def high_word(x):  # GET_HIGH_WORD into int32_t
    hx = double_bits(x) >> 32
    return hx - (1 << 32) if hx >= 1 << 31 else hx


def low_word(x):
    return double_bits(x) & 0xFFFFFFFF


def set_high_word(x, hx):  # SET_HIGH_WORD
    return double_of(((hx & 0xFFFFFFFF) << 32) | low_word(x))


def set_low_word(x, lx):  # SET_LOW_WORD
    return double_of((double_bits(x) & 0xFFFFFFFF00000000) | lx)


LG1, LG2, LG3, LG4, LG5, LG6, LG7 = (
    double_of(b)
    for b in (
        0x3FE5555555555593,
        0x3FD999999997FA04,
        0x3FD2492494229359,
        0x3FCC71C51D8E78AF,
        0x3FC7466496CB03DE,
        0x3FC39A09D078C69F,
        0x3FC2F112DF3E5244,
    )
)
TWO54 = double_of(0x4350000000000000)
IVLN2HI = double_of(0x3FF7154765200000)
IVLN2LO = double_of(0x3DE705FC2EEFA200)


def k_log1p(f):  # :1951-1962
    s = f / (2.0 + f)
    z = s * s
    w = z * z
    t1 = w * (LG2 + w * (LG4 + w * LG6))
    t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)))
    R = t2 + t1
    hfsq = 0.5 * f * f
    return s * (hfsq + R)


def v8_log2(x):  # :1973-2050; the branches for zero, negative, infinite and NaN x are not reached here
    hx, lx = high_word(x), low_word(x)
    k = 0
    if hx < 0x00100000:
        k -= 54
        x *= TWO54
        hx = high_word(x)
    if hx == 0x3FF00000 and lx == 0:
        return 0.0
    k += (hx >> 20) - 1023
    hx &= 0x000FFFFF
    i = (hx + 0x95F64) & 0x100000
    x = set_high_word(x, hx | (i ^ 0x3FF00000))
    k += i >> 20
    y = float(k)
    f = x - 1.0
    hfsq = 0.5 * f * f
    r = k_log1p(f)
    hi = f - hfsq
    hi = set_low_word(hi, 0)
    lo = (f - hi) - hfsq + r
    val_hi = hi * IVLN2HI
    val_lo = (lo + hi) * IVLN2LO + lo * IVLN2HI
    w = y + val_hi
    val_lo += (y - w) + val_hi
    val_hi = w
    return val_lo + val_hi


def shannon_score_e4(bins, log2=v8_log2):
    total = 0  # :90  bins.reduce((a, c) => a + c, 0) || 1
    for c in bins:
        total = total + c
    total = total or 1
    probs = [c / total for c in bins]  # :91  bins.map((c) => c / total)
    acc = 0  # :92  -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0)
    for p in probs:
        acc = acc + (p * log2(p) if p > 0 else 0)
    entropy = -acc
    efficiency = entropy / log2(12)  # :93  H / Math.log2(12)
    return js_to_fixed_units(efficiency, 4)  # :94  score: +efficiency.toFixed(4)


DEC = decimal.Context(prec=60)
DEC_LN2 = DEC.ln(decimal.Decimal(2))
DEC_XLOG2X = {}


def dec_xlog2x(c):
    if c <= 1:
        return decimal.Decimal(0)
    if c not in DEC_XLOG2X:
        DEC_XLOG2X[c] = DEC.divide(DEC.multiply(decimal.Decimal(c), DEC.ln(decimal.Decimal(c))), DEC_LN2)
    return DEC_XLOG2X[c]


def exact_shannon_e4(bins):
    # The entropy of lines 90-93 in exact arithmetic (60 digits): (n log2 n - sum c log2 c) / (n log2 12).
    with decimal.localcontext(DEC):
        n = sum(bins)
        if n == 0:
            return 0, None
        weighted = sum((dec_xlog2x(c) for c in bins if c > 1), decimal.Decimal(0))
        numerator = DEC.subtract(dec_xlog2x(n), weighted)
        efficiency_e4 = DEC.divide(DEC.multiply(numerator, decimal.Decimal(10000)), DEC.multiply(decimal.Decimal(n), DEC.divide(DEC.ln(decimal.Decimal(12)), DEC_LN2)))
        floor = int(efficiency_e4.to_integral_value(rounding=decimal.ROUND_FLOOR))
        tie_distance = abs(efficiency_e4 - floor - decimal.Decimal("0.5"))
        if tie_distance < decimal.Decimal("1e-45"):
            raise SystemExit(f"exact tie within 60 digits for bins {bins}")
        return int((efficiency_e4 + decimal.Decimal("0.5")).to_integral_value(rounding=decimal.ROUND_FLOOR)), tie_distance


# ---- shaBaseline, asolaria-score.mjs:25, 98-101, 145 -------------------------------------------


def sha16(s):  # :25  createHash('sha256').update(String(s)).digest('hex').slice(0, 16)
    return hashlib.sha256(str(s).encode("utf-8")).hexdigest()[0:16]


def sha_baseline(pid, content):  # :98-101
    h = sha16(f"{pid}|{content}")
    return (int(h[0:4], 16) % 1000) / 1000


def baseline_e4(pid, content):  # :145  +shaBaseline(pid, content).toFixed(4)
    return js_to_fixed_units(sha_baseline(pid, content), 4)


# ---- reverseGain, asolaria-score.mjs:104-108 ----------------------------------------------------


def reverse_gain(score):
    reverse_risk_units = js_to_fixed_units(1 - score, 4)  # :105  +(1 - score).toFixed(4)
    reverse_risk = float(js_to_fixed_string(1 - score, 4))
    promoted = score >= 0.72 and reverse_risk <= 0.28  # :106
    return reverse_risk_units, promoted


# ---- composite, asolaria-score.mjs:151-163 ------------------------------------------------------

WEIGHTS = (("l0", 0.30), ("l4", 0.15), ("g1", 0.10), ("g2", 0.10), ("g3", 0.10), ("shannon", 0.15), ("baseline", 0.10))  # :156
WEIGHT_TWENTIETHS = {"l0": 6, "l4": 3, "g1": 2, "g2": 2, "g3": 2, "shannon": 3, "baseline": 2}
OPTIONAL = ("l0", "l4", "g1", "g2", "g3")


def composite_e4(signals_e4):
    signals = {key: js_number_from_e4(units) for key, units in signals_e4.items()}
    composite = 0  # :154
    total_weight = 0  # :155
    for key, w in WEIGHTS:  # :157  for (const [key, w] of Object.entries(WEIGHTS))
        sig = signals.get(key)  # :158
        if isinstance(sig, float):  # :159  typeof sig === 'number'
            composite += sig * w
            total_weight += w
    if total_weight > 0:  # :162
        composite = composite / total_weight
    return js_to_fixed_units(composite, 4)  # :163  +composite.toFixed(4)


def exact_composite_e4(signals_e4):
    weight = sum(WEIGHT_TWENTIETHS[k] for k in signals_e4)
    return math.floor(Fraction(sum(WEIGHT_TWENTIETHS[k] * v for k, v in signals_e4.items()), weight) + Fraction(1, 2))


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
# does not depend on bin order), keeping 12-bin vectors whose exact e4 is within `tolerance` of a half.
NEAR_TIE_CONFIGS = (
    # (parts per group, group masses, fixed bins, tolerance)
    (6, (160, 160), (), 1e-10),
    (6, (150, 170), (), 1e-10),
    (5, (210, 230), (517, 911), 1e-10),
)


class PartitionWalk:
    def __init__(self, g, wanted=None):
        self.g, self.index, self.values, self.wanted, self.found = g, 0, [], wanted, {}

    def walk(self, parts, mass, cap, base=0.0, prefix=()):
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


def near_tie_bins(rng):
    with decimal.localcontext(DEC):
        found = []
        seen = set()
        k_scale = DEC.divide(decimal.Decimal(10000), DEC.divide(DEC.ln(decimal.Decimal(12)), DEC_LN2))
        for parts, (mass_a, mass_b), fixed, tolerance in NEAR_TIE_CONFIGS:
            n = mass_a + mass_b + sum(fixed)
            exact_g = [DEC.divide(DEC.multiply(k_scale, dec_xlog2x(c)), decimal.Decimal(n)) for c in range(max(mass_a, mass_b) + 1)]
            g = [float(v % 1) for v in exact_g]
            fixed_g = sum((DEC.divide(DEC.multiply(k_scale, dec_xlog2x(c)), decimal.Decimal(n)) for c in fixed), decimal.Decimal(0))
            target = float((DEC.multiply(k_scale, DEC.divide(DEC.ln(decimal.Decimal(n)), DEC_LN2)) - fixed_g - decimal.Decimal("0.5")) % 1)
            xs = [(target - v) % 1.0 for v in partitions(g, parts, mass_a)]
            ys = [v % 1.0 for v in partitions(g, parts, mass_b)]
            y_order = sorted(range(len(ys)), key=ys.__getitem__)
            y_sorted = [ys[j] for j in y_order]
            hits = []
            for i, x in enumerate(xs):
                j = bisect_left(y_sorted, x)
                for k in (j - 1, j):
                    gap = abs(x - y_sorted[k % len(y_sorted)])
                    if min(gap, 1.0 - gap) < tolerance:
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
    differing = libm_differing = 0
    closest = None
    arguments = set()
    for index, bins in enumerate(bins_list):
        want = shannon_score_e4(bins)
        exact, distance = exact_shannon_e4(bins)
        if want != exact:
            differing += 1
        if shannon_score_e4(bins, math.log2) != want:
            libm_differing += 1
        total = sum(bins) or 1
        arguments.update(c / total for c in bins if c > 0)
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
        shannon_closest_tie=f"{closest:.3e}",
        shannon_log2_arguments=len(arguments),
        shannon_libm_log2_ne_v8=sum(1 for x in arguments if math.log2(x) != v8_log2(x)),
        shannon_libm_e4_ne_v8=libm_differing,
    )
    return rows


def log2_rows(summary):
    rng = Lcg(0x4C4F4732)
    xs = [12.0, 0.5, 0.75, 1.0]
    xs += [2.0**-k for k in range(1, 31)]
    xs += [1.0 - j * 2.0**-53 for j in range(1, 9)] + [1.0 + j * 2.0**-52 for j in range(1, 9)]
    for high in (0x3FE6A09B, 0x3FE6A09C, 0x3FF6A09B, 0x3FF6A09C):  # either side of the reduction at :2001
        xs += [double_of(high << 32), double_of((high << 32) | 0xFFFFFFFF)]
    while len(xs) < 4096:
        total = 1 + rng.below(1 << 20)
        xs.append((1 + rng.below(total)) / total)
    rows = [f"LOG2|x={double_bits(x):016x}|want={double_bits(v8_log2(x)):016x}" for x in xs]
    summary.update(log2=len(rows))
    return rows


def baseline_rows(summary):
    for k in range(1000):
        if js_to_fixed_units(k / 1000, 4) != 10 * k:
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
