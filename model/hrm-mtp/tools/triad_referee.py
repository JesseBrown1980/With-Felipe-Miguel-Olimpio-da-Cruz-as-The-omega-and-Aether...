#!/usr/bin/env python3
"""Cold-lane referee for the triad port: a stdlib Python mirror of the vendored JavaScript, in
integer arithmetic only.

Every JavaScript number is held as its IEEE-754 binary64 bit pattern (a Python int), and each
upstream + - * / is the exact integer result rounded to nearest, ties to even, as ECMAScript
specifies; no Python float is used. Each upstream line is mirrored with the same operations in
the same order:

  vendor/bigpickle-rebuild/src/hilbert.mjs        -> hilbert_decode / hilbert_encode
  vendor/bigpickle-rebuild/src/primes.mjs         -> sieve_first_n_primes
  vendor/bigpickle-rebuild/src/zeta-process.mjs   -> von_mangoldt ... predict_k_positions
  vendor/bigpickle-rebuild/src/mtp-heads.mjs      -> mtp_heads, pre_warm_candidates, measure_hit_rate
  vendor/bigpickle-rebuild/src/hrm-slow-fast.mjs  -> slow_loop_predict_shape ... hrm_shaped_prediction
  vendor/bigpickle-rebuild/src/pid-chain-revolver.mjs, pid-minter.mjs, behcs.mjs -> Revolver

Math.log is V8's fdlibm port (V8 12.4.254.21 src/base/ieee754.cc:1638-1717), mirrored in v8_log
below on the integer binary64 operations. Math.sin / Math.cos are implementation-approximated, so
sine and cosine of the exact double argument are evaluated in fixed point with 288 fraction bits
(Machin's pi, Taylor series), and every Math.round of `offset + scale * sin` is checked to lie at
least 2^-40 from a tie with |scale| <= 48 and, for a nonzero sine, |offset| < 2^10: the bounds
under which every engine whose sine is within 2^-46 of the true value rounds to the same integer.

Writes tests/fixtures/triad.hbp; --check regenerates it in memory and compares bytes.
"""
import hashlib
import math
import sys
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURE = ROOT / "tests" / "fixtures" / "triad.hbp"


# ---- binary64 on integers (round to nearest, ties to even) ----------------------------------
SIGN = 1 << 63


def unpack(b):
    """(negative, m, e) with value (-1)^negative * m * 2^e; zero gives m = 0, e = 0."""
    neg = b >> 63
    biased = (b >> 52) & 0x7FF
    frac = b & ((1 << 52) - 1)
    assert biased != 0x7FF, "infinite or NaN value outside the mirrored domain"
    if biased == 0:
        return (neg, frac, -1074) if frac else (neg, 0, 0)
    return neg, frac | (1 << 52), biased - 1075


def pack(neg, m, e, sticky=False):
    """The binary64 nearest (-1)^neg * (m + s) * 2^e, 0 <= s < 1 nonzero exactly when sticky."""
    if m == 0:
        assert not sticky
        return neg << 63
    lsb = max(e + m.bit_length() - 53, -1074)
    shift = lsb - e
    if shift > 0:
        low = m & ((1 << shift) - 1)
        m >>= shift
        half = 1 << (shift - 1)
        if low > half or (low == half and (sticky or m & 1)):
            m += 1
    else:
        assert not sticky, "rounding needs more quotient bits"
        m <<= -shift
    e = lsb
    if m == 1 << 53:
        m >>= 1
        e += 1
    if m >= 1 << 52:
        biased = e + 1075
        assert biased < 0x7FF, "overflow outside the mirrored domain"
        return (neg << 63) | (biased << 52) | (m - (1 << 52))
    return (neg << 63) | m


def ratio(num, den):
    """The binary64 nearest num / den (integers, den > 0)."""
    neg = 1 if num < 0 else 0
    num = abs(num)
    if num == 0:
        return 0
    k = max(0, den.bit_length() - num.bit_length() + 55)
    q, r = divmod(num << k, den)
    return pack(neg, q, -k, r != 0)


def from_int(n):
    return ratio(n, 1)


def from_decimal(text):
    """The binary64 nearest a decimal literal such as 6.93147180369123816490e-01."""
    mant, _, exp = text.lower().partition("e")
    whole, _, frac = mant.partition(".")
    num = int(whole + frac)
    exp10 = int(exp or "0") - len(frac)
    return ratio(num * 10 ** exp10, 1) if exp10 >= 0 else ratio(num, 10 ** -exp10)


def add(a, b):
    na, ma, ea = unpack(a)
    nb, mb, eb = unpack(b)
    if ma == 0:
        return b if mb else (na & nb) << 63
    if mb == 0:
        return a
    e = min(ea, eb)
    v = (-ma if na else ma) << (ea - e)
    v += (-mb if nb else mb) << (eb - e)
    if v == 0:
        return 0
    return pack(1 if v < 0 else 0, abs(v), e)


def neg(a):
    return a ^ SIGN


def sub(a, b):
    return add(a, neg(b))


def mul(a, b):
    na, ma, ea = unpack(a)
    nb, mb, eb = unpack(b)
    if ma == 0 or mb == 0:
        return (na ^ nb) << 63
    return pack(na ^ nb, ma * mb, ea + eb)


def div(a, b):
    na, ma, ea = unpack(a)
    nb, mb, eb = unpack(b)
    assert mb != 0, "division by zero outside the mirrored domain"
    if ma == 0:
        return (na ^ nb) << 63
    k = max(0, mb.bit_length() - ma.bit_length() + 55)
    q, r = divmod(ma << k, mb)
    return pack(na ^ nb, q, ea - eb - k, r != 0)


def signed(a):
    """(v, e) with value v * 2^e."""
    n, m, e = unpack(a)
    return (-m if n else m), e


def le(a, b):
    (va, ea), (vb, eb) = signed(a), signed(b)
    e = min(ea, eb)
    return va << (ea - e) <= vb << (eb - e)


def is_zero(a):
    return a & ~SIGN == 0


def floor_int(a):
    v, e = signed(a)
    return v << e if e >= 0 else v >> -e


def js_round(a):
    """Math.round: the nearest integer, ties toward +infinity."""
    v, e = signed(a)
    if e >= 0:
        return v << e
    r = v >> -e
    return r + 1 if 2 * (v - (r << -e)) >= 1 << -e else r


def js_ceil(a):
    v, e = signed(a)
    if e >= 0:
        return v << e
    r = v >> -e
    return r + 1 if v - (r << -e) else r


def bits(a):
    return "%016x" % a


ZERO, ONE, TWO = 0, from_int(1), from_int(2)
HALF = ratio(1, 2)


# ---- V8 Math.log (ieee754.cc:1638-1717) ------------------------------------------------------
LN2_HI = from_decimal("6.93147180369123816490e-01")
LN2_LO = from_decimal("1.90821492927058770002e-10")
TWO54 = from_decimal("1.80143985094819840000e+16")
LG1 = from_decimal("6.666666666666735130e-01")
LG2 = from_decimal("3.999999999940941908e-01")
LG3 = from_decimal("2.857142874366239149e-01")
LG4 = from_decimal("2.222219843214978396e-01")
LG5 = from_decimal("1.818357216161805012e-01")
LG6 = from_decimal("1.531383769920937332e-01")
LG7 = from_decimal("1.479819860511658591e-01")
THIRD = from_decimal("0.33333333333333333")


def words(x):
    hx = x >> 32
    if hx >= 1 << 31:
        hx -= 1 << 32
    return hx, x & 0xFFFFFFFF


def set_high_word(x, hi):
    return ((hi & 0xFFFFFFFF) << 32) | (x & 0xFFFFFFFF)


@lru_cache(maxsize=None)
def v8_log(x):
    hx, lx = words(x)
    k = 0
    if hx < 0x00100000:
        assert ((hx & 0x7FFFFFFF) | lx) != 0 and hx >= 0, "log of zero or a negative value"
        k -= 54
        x = mul(x, TWO54)
        hx, _ = words(x)
    assert hx < 0x7FF00000, "log of an infinite or NaN value"
    k += (hx >> 20) - 1023
    hx &= 0x000FFFFF
    i = (hx + 0x95F64) & 0x100000
    x = set_high_word(x, hx | (i ^ 0x3FF00000))
    k += i >> 20
    f = sub(x, ONE)
    if (0x000FFFFF & (2 + hx)) < 3:
        if is_zero(f):
            if k == 0:
                return ZERO
            dk = from_int(k)
            return add(mul(dk, LN2_HI), mul(dk, LN2_LO))
        R = mul(mul(f, f), sub(HALF, mul(THIRD, f)))
        if k == 0:
            return sub(f, R)
        dk = from_int(k)
        return sub(mul(dk, LN2_HI), sub(sub(R, mul(dk, LN2_LO)), f))
    s = div(f, add(TWO, f))
    dk = from_int(k)
    z = mul(s, s)
    i = hx - 0x6147A
    w = mul(z, z)
    j = 0x6B851 - hx
    t1 = mul(w, add(LG2, mul(w, add(LG4, mul(w, LG6)))))
    t2 = mul(z, add(LG1, mul(w, add(LG3, mul(w, add(LG5, mul(w, LG7)))))))
    i |= j
    R = add(t2, t1)
    if i > 0:
        hfsq = mul(mul(HALF, f), f)
        if k == 0:
            return sub(f, sub(hfsq, mul(s, add(hfsq, R))))
        return sub(mul(dk, LN2_HI), sub(sub(hfsq, add(mul(s, add(hfsq, R)), mul(dk, LN2_LO))), f))
    if k == 0:
        return sub(f, mul(s, sub(f, R)))
    return sub(mul(dk, LN2_HI), sub(sub(mul(s, sub(f, R)), mul(dk, LN2_LO)), f))


def log_int(n):
    return v8_log(from_int(n))


# ---- Math.sin / Math.cos of an exact double, in fixed point ----------------------------------
TRIG_FRAC = 288


def machin_pi(frac_bits):
    """floor-ish pi * 2^frac_bits from Machin's formula, 64 guard bits."""
    b = frac_bits + 64

    def arctan_inv(x):
        total = term = (1 << b) // x
        x2, n, sign = x * x, 1, -1
        while term:
            term //= x2
            total += sign * (term // (2 * n + 1))
            sign, n = -sign, n + 1
        return total
    return (4 * (4 * arctan_inv(5) - arctan_inv(239))) >> 64


PI_TRIG = machin_pi(TRIG_FRAC)


@lru_cache(maxsize=None)
def sin_cos_fixed(x):
    """(sin x, cos x) * 2^TRIG_FRAC for a non-negative double x below 2^14, error below 2^-260."""
    n, m, e = unpack(x)
    assert n == 0 and TRIG_FRAC + e >= 0, "non-negative argument with an exact fixed-point form"
    one = 1 << TRIG_FRAC
    if m == 0:
        return 0, one
    fixed = m << (TRIG_FRAC + e)
    assert fixed < 1 << (TRIG_FRAC + 14), "argument below 2^14"
    quadrant, r = divmod(fixed, PI_TRIG >> 1)
    r2 = (r * r) >> TRIG_FRAC
    sin = sin_term = r
    cos = cos_term = one
    k = 1
    while sin_term or cos_term:
        sin_term = ((sin_term * r2) >> TRIG_FRAC) // ((2 * k) * (2 * k + 1))
        cos_term = ((cos_term * r2) >> TRIG_FRAC) // ((2 * k - 1) * (2 * k))
        if k % 2:
            sin, cos = sin - sin_term, cos - cos_term
        else:
            sin, cos = sin + sin_term, cos + cos_term
        k += 1
    return [(sin, cos), (cos, -sin), (-sin, -cos), (-cos, sin)][quadrant % 4]


TIES = {}
TIE_SWEEP = ["rows"]


def checked_round(offset, scale, t):
    """Math.round(offset + scale * t) for t = sin or cos * 2^TRIG_FRAC, with the tie checks."""
    one = 1 << TRIG_FRAC
    assert abs(scale) <= 48 and (t == 0 or abs(offset) < 1 << 10), "outside the engine-exact bounds"
    shifted = scale * t + (one >> 1)
    rounded = shifted >> TRIG_FRAC
    frac = shifted - (rounded << TRIG_FRAC)
    margin = min(frac, one - frac)
    assert margin > (1 << (TRIG_FRAC - 40)) + (1 << (TRIG_FRAC - 250)), "Math.round argument within 2^-40 of a tie"
    tally = TIES.setdefault(TIE_SWEEP[0], [0, None])
    tally[0] += 1
    m112 = margin >> (TRIG_FRAC - 112)
    tally[1] = m112 if tally[1] is None else min(tally[1], m112)
    return offset + rounded


# ---- primes.mjs ------------------------------------------------------------------------------
def sieve_limit(n):
    N = from_int(n)
    ln = v8_log(N)
    return max(20, js_ceil(add(mul(N, add(ln, v8_log(ln if not is_zero(ln) else ONE))), N)))


def sieve_first_n_primes(n):
    out = []
    limit = sieve_limit(n)
    composite = bytearray(limit + 1)
    for i in range(2, limit + 1):
        if not composite[i]:
            out.append(i)
            if len(out) == n:
                break
            for j in range(i * i, limit + 1, i):
                composite[j] = 1
    return out


PRIMES = sieve_first_n_primes(1000)
PRIME_SET = set(PRIMES)


# ---- zeta-process.mjs ------------------------------------------------------------------------
def u32(x):
    return x & 0xFFFFFFFF


def imul(a, b):
    return u32(u32(a) * u32(b))


def von_mangoldt(n):
    if n < 2:
        return ZERO
    if n in PRIME_SET:
        return log_int(n)
    for p in PRIMES:
        if p > n:
            break
        if n % p != 0:
            continue
        m = n
        while m % p == 0:
            m = m // p
        return log_int(p) if m == 1 else ZERO
    return ZERO


def divisors(n):
    # Math.floor(Math.sqrt(n)) is the integer square root for n below 2^52.
    if n < 1:
        return []
    out = []
    root = math.isqrt(n)
    for d in range(1, root + 1):
        if n % d == 0:
            out.append(d)
            if d != n // d:
                out.append(n // d)
    return sorted(out)


def nu_lambda(cp):
    if cp < 2:
        return ZERO
    x = from_int(cp)
    return div(ONE, mul(x, v8_log(x)))


def band_weight(cp_start, cp_end):
    s = ZERO
    for cp in range(cp_start, cp_end + 1):
        s = add(s, nu_lambda(cp))
    return s


def deterministic_unit(seed, step):
    """The double a / 2^32 (exact: a has at most 32 bits)."""
    a = u32(u32(seed) + u32(step) * 0x6D2B79F5)
    a = imul(a ^ (a >> 15), a | 1)
    a = u32(a ^ u32(a + imul(a ^ (a >> 7), a | 61)))
    return ratio(u32(a ^ (a >> 14)), 1 << 32)


@lru_cache(maxsize=None)
def weights_of(cp):
    """divs, weights and totalWeight of vonMangoldtNext(cp) (zeta-process.mjs:94-99); they depend
    on cp alone."""
    divs = [q for q in divisors(cp) if q > 1]
    weights = [div(von_mangoldt(q), log_int(cp)) for q in divs]
    total = ZERO
    for w in weights:
        total = add(total, w)
    return divs, weights, total


def von_mangoldt_next(cp, seed=0, step=0):
    if cp < 2:
        return dict(next=2, divisor=1, weight=ZERO, reason="cp < 2 → reset to 2")
    seed = u32(seed)
    step = u32(step)
    divs, weights, total = weights_of(cp)
    if not divs:
        return dict(next=cp, divisor=1, weight=ZERO, reason="no proper divisor")
    if is_zero(total):
        return dict(next=cp, divisor=1, weight=ZERO, reason="all weights zero (cp not prime-power-rich)")
    u = mul(deterministic_unit(seed ^ u32(cp), step), total)
    acc = ZERO
    for i, w in enumerate(weights):
        acc = add(acc, w)
        if le(u, acc):
            q = divs[i]
            return dict(next=max(2, js_round(div(from_int(cp), from_int(q)))), divisor=q, weight=w,
                        reason=f"Λ({q})/log({cp})")
    q = divs[-1]
    return dict(next=max(2, js_round(div(from_int(cp), from_int(q)))), divisor=q, weight=weights[-1],
                reason="tail-pick")


def predict_k_positions(cp0, k, seed=0):
    trajectory = []
    current = cp0
    for step in range(k):
        sample = von_mangoldt_next(current, seed, step)
        trajectory.append(dict(step=step, frm=current, **sample))
        current = sample["next"]
    return dict(cp_start=cp0, k=k, trajectory=trajectory, final_cp=current, seed=seed)


# ---- hilbert.mjs -----------------------------------------------------------------------------
def i32(x):
    x &= 0xFFFFFFFF
    return x - (1 << 32) if x >= 1 << 31 else x


def rotate_2d(n, x, y, rx, ry):
    if ry == 0:
        if rx == 1:
            x = n - 1 - x
            y = n - 1 - y
        return y, x
    return x, y


def encode_2d(x, y, side_len):
    d = 0
    s = side_len >> 1
    while s > 0:
        rx = 1 if (i32(x) & s) > 0 else 0
        ry = 1 if (i32(y) & s) > 0 else 0
        d += s * s * ((3 * rx) ^ ry)
        x, y = rotate_2d(s, x, y, rx, ry)
        s >>= 1
    return d


def decode_2d(d, side_len):
    x = y = 0
    t = i32(d)
    s = 1
    while s < side_len:
        rx = 1 & (t >> 1)
        ry = 1 & (t ^ rx)
        x, y = rotate_2d(s, x, y, rx, ry)
        x += s * rx
        y += s * ry
        t >>= 2
        s <<= 1
    return [x, y]


def index_to_transpose(h, n, b):
    X = [0] * n
    total_bits = b * n
    for d in range(b):
        for j in range(n):
            from_lsb = total_bits - 1 - (d * n + j)
            bit = (h >> from_lsb) & 1
            X[j] |= bit << (b - 1 - d)
    return X


def transpose_to_index(X, n, b):
    h = 0
    for d in range(b):
        for j in range(n):
            bit = (i32(X[j]) >> (b - 1 - d)) & 1
            h = (h << 1) | bit
    return h


def transpose_to_axes(X, n, b):
    for i in range(n - 1, 0, -1):
        X[i] ^= X[i - 1]
    N = 2 << (b - 1)
    Q = 2
    while Q != N:
        P = Q - 1
        for i in range(n - 1, -1, -1):
            if X[i] & Q:
                X[0] ^= P
            else:
                t = (X[0] ^ X[i]) & P
                X[0] ^= t
                X[i] ^= t
        Q <<= 1


def axes_to_transpose(X, n, b):
    M = 1 << (b - 1)
    Q = M
    while Q > 1:
        P = Q - 1
        for i in range(n):
            if i32(X[i]) & Q:
                X[0] = i32(X[0]) ^ P
            else:
                t = (i32(X[0]) ^ i32(X[i])) & P
                X[0] = i32(X[0]) ^ t
                X[i] = i32(X[i]) ^ t
        Q >>= 1
    for i in range(1, n):
        X[i] = i32(X[i]) ^ i32(X[i - 1])


def hilbert_decode(index, dimensions, bits_):
    if dimensions == 2:
        return decode_2d(index, 1 << bits_)
    X = index_to_transpose(index, dimensions, bits_)
    transpose_to_axes(X, dimensions, bits_)
    return X


def hilbert_encode(coord, dimensions, bits_):
    if dimensions == 2:
        return encode_2d(coord[0], coord[1], 1 << bits_)
    X = list(coord)
    axes_to_transpose(X, dimensions, bits_)
    return transpose_to_index(X, dimensions, bits_)


# ---- mtp-heads.mjs ---------------------------------------------------------------------------
def head_seed(seed, h):
    return u32(seed ^ u32(h * 0x9E3779B1))


def cp_to_bh_coord(cp, dim=3, bits_=4):
    max_idx = i32(1 << ((bits_ * dim) & 31)) - 1
    idx = max(0, min(max_idx, cp))
    return hilbert_decode(idx, dim, bits_)


def mtp_heads(cp0, k=4, depth=1, seed=0):
    if k < 1:
        raise RangeError("mtpHeads: k must be >= 1")
    if depth < 1:
        raise RangeError("mtpHeads: depth must be >= 1")
    heads = []
    for h in range(k):
        hs = head_seed(seed, h)
        trajectory = predict_k_positions(cp0, depth, hs)
        final_cp = trajectory["final_cp"]
        heads.append(dict(head_index=h, head_seed=hs, depth=depth, cp_predicted=final_cp,
                          bh_coord_predicted=cp_to_bh_coord(final_cp), trajectory=trajectory["trajectory"]))
    return dict(cp_start=cp0, k=k, depth=depth, seed=seed, heads=heads)


def pre_warm_candidates(cp0, k=4, depth=1, seed=0, prof_pid=""):
    prediction = mtp_heads(cp0, k, depth, seed)
    return dict(prof_pid=prof_pid, candidates=[
        dict(head_index=h["head_index"], cp=h["cp_predicted"], bh_coord=h["bh_coord_predicted"], depth=depth)
        for h in prediction["heads"]])


def measure_hit_rate(predicted, actual):
    pred_set = {",".join(map(str, p)) for p in predicted}
    hits = sum(1 for a in actual if ",".join(map(str, a)) in pred_set)
    return dict(hit_rate=ratio(hits, len(actual)) if actual else ZERO, hits=hits, total=len(actual),
                predicted_set_size=len(pred_set))


# ---- hrm-slow-fast.mjs -----------------------------------------------------------------------
SHAPES = ["linear", "branch", "spiral", "fold", "cascade", "ring", "star", "fractal"]
C07, C04, C01 = from_decimal("0.7"), from_decimal("0.4"), from_decimal("0.1")
MATH_PI = ratio(machin_pi(200), 1 << 200)


def shape_record(shape, cp):
    return dict(
        shape=shape,
        branching_factor=4 if shape == "star" else 2 if shape == "branch" else 1,
        axis_bias="helm" if 384 <= cp <= 479 else
                  "vector" if 480 <= cp <= 575 else
                  "rook" if 576 <= cp <= 703 else
                  "forge" if 704 <= cp <= 799 else
                  "falcon" if 800 <= cp <= 895 else
                  "livefree" if 896 <= cp <= 1023 else
                  "gaia" if 256 <= cp <= 383 else "cube_cubed_sealer")


def slow_loop_predict_shape(envelope_type, current_cp, history=()):
    t = (envelope_type or "").lower()
    if "cascade" in t or "fanout" in t: return shape_record("cascade", current_cp)
    if "bilateral" in t or "mirror" in t: return shape_record("linear", current_cp)
    if "wave-spawn" in t or "star" in t: return shape_record("star", current_cp)
    if "bus-relay" in t or "edge" in t: return shape_record("linear", current_cp)
    if "revolver" in t or "rotation" in t: return shape_record("ring", current_cp)
    if "cube-of-cubes" in t or "recursion" in t: return shape_record("fold", current_cp)
    if "wave-nesting" in t or "fractal" in t: return shape_record("fractal", current_cp)
    if "branch" in t or "fork" in t: return shape_record("branch", current_cp)
    if len(history) >= 3:
        recent = [h if h is not None else [0, 0, 0] for h in history[-3:]]
        same = lambda a: all((c[a] if len(c) > a else None) == (recent[0][a] if len(recent[0]) > a else None) for c in recent)
        if same(0) or same(1):
            return shape_record("linear", current_cp)
    return shape_record("linear", current_cp)


def apply_shape_pull(c, shape, it, total):
    C, IT = from_int(c), from_int(it)
    t = div(IT, from_int(total)) if total > 0 else ZERO
    sign = lambda positive: from_int(1 if positive else -1)
    if shape == "linear": target = c
    elif shape == "branch": target = c + js_round(mul(mul(from_int(64), t), sign(it % 2 == 0)))
    elif shape == "spiral": target = c + checked_round(0, 32, sin_cos_fixed(mul(IT, C07))[0])
    elif shape == "fold": target = c + checked_round(0, 48, sin_cos_fixed(mul(IT, C04))[1])
    elif shape == "cascade": target = js_round(mul(C, sub(ONE, mul(t, C01))))
    elif shape == "ring": target = checked_round(c, 16, sin_cos_fixed(div(mul(IT, MATH_PI), from_int(4)))[0])
    elif shape == "star": target = c + js_round(mul(mul(from_int(96), sign(it % 4 == 0)), t))
    elif shape == "fractal": target = js_round(div(C, add(ONE, mul(C01, t))))
    else: target = c
    return max(2, min(1023, target))


def fast_loop_refine_position(shape, current_cp, iterations=15, seed=0):
    cp = current_cp
    path = []
    for i in range(iterations):
        candidate = von_mangoldt_next(cp, seed, i)
        cp = apply_shape_pull(candidate["next"], shape, i, iterations)
        path.append((i, cp, candidate["divisor"]))
    return dict(shape=shape, iterations=iterations, final_cp=cp, path=path)


def hrm_shaped_prediction(envelope_type, current_cp, history=(), k=4, fast_iters=15, seed=0):
    shape = slow_loop_predict_shape(envelope_type, current_cp, history)
    heads = []
    for h in range(k):
        hs = head_seed(seed, h)
        refined = fast_loop_refine_position(shape["shape"], current_cp, fast_iters, hs)
        bh = hilbert_decode(min(4095, max(0, refined["final_cp"])), 3, 4)
        heads.append(dict(head_index=h, head_seed=hs, cp_predicted=refined["final_cp"], bh_coord_predicted=bh))
    return dict(shape=shape["shape"], shape_params=shape, cp_start=current_cp, k=k, heads=heads)


# ---- pid-minter.mjs, behcs.mjs, pid-chain-revolver.mjs ---------------------------------------
LANE_CYCLE = ["nervous", "circulatory", "skeletal", "muscular", "immune", "memory", "lymphatic"]


class RangeError(Exception):
    pass


def sha16(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


def quote_json_string(s):
    """ECMAScript QuoteJSONString, as JSON.stringify(lane) writes a string (pid-minter.mjs:40)."""
    short = {0x08: "\\b", 0x09: "\\t", 0x0A: "\\n", 0x0C: "\\f", 0x0D: "\\r", 0x22: '\\"', 0x5C: "\\\\"}
    out = []
    for ch in s:
        c = ord(ch)
        out.append(short[c] if c in short else "\\u%04x" % c if c < 0x20 else ch)
    return '"' + "".join(out) + '"'


def mint_pid(actor, device, lane, prime, alphabet=256):
    if alphabet not in (256, 1024):
        raise RangeError(f"mintPID: alphabet must be 256 or 1024 (got {alphabet})")
    if not 0 <= actor < alphabet:
        raise RangeError(f"mintPID: actor must be integer in [0, {alphabet}) (got {actor})")
    if lane not in LANE_CYCLE:
        raise RangeError(f"mintPID: lane must be one of {', '.join(LANE_CYCLE)} (got {quote_json_string(lane)})")
    glyph = "cp%04x" % actor
    return sha16(f"{glyph}|{device}|{lane}|{prime}")


class Revolver:
    def __init__(self, anchor, alphabet=256):
        self.anchor, self.counter, self.alphabet = anchor, 0, alphabet

    def next(self):
        i = self.counter
        # i % 0 is NaN upstream; mintPID's alphabet check throws before NaN is used.
        actor = i % self.alphabet if self.alphabet else None
        pid = mint_pid(actor, self.anchor, LANE_CYCLE[i % 7], PRIMES[i % 1000], self.alphabet)
        self.counter += 1
        return pid

    def pre_warm(self, k=4, depth=1, seed=0, cp0=None):
        cp0 = max(2, cp0 if cp0 is not None else self.counter % 1024)
        mtp = pre_warm_candidates(cp0, k, depth, seed, self.anchor)
        out = []
        for c in mtp["candidates"]:
            actor = c["cp"] % self.alphabet if self.alphabet else None
            lane = LANE_CYCLE[c["cp"] % 7]
            prime = PRIMES[c["cp"] % 1000]
            out.append(dict(head_index=c["head_index"], cp_predicted=c["cp"], bh_coord_predicted=c["bh_coord"],
                            speculative_pid=mint_pid(actor, self.anchor, lane, prime, self.alphabet),
                            actor=actor, lane=lane, prime=prime))
        return dict(anchor=self.anchor, counter_at_prewarm=self.counter, cp0=cp0, k=k, candidates=out)


# ---- fixture rows ----------------------------------------------------------------------------
def coords(c):
    return ",".join(map(str, c))


def sweep(name, domain, lines):
    body = "".join(line + "\n" for line in lines)
    return f"SWEEP|name={name}|domain={domain}|rows={len(lines)}|sha256={hashlib.sha256(body.encode('utf-8')).hexdigest()}"


def lcg_stream(seed):
    x = seed
    while True:
        x = (x * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
        yield x >> 32


NEXT_SEEDS = [0, 1, 7, 42, 99, 0x12345, 0x98765, 2654435761, 1013904226, 3668339987]
UNIT_SEEDS = [0, 1, 500, 0xFFFFFFFF, 0x12345, 2654435761]
ENVELOPES = ["cascade-fanout", "bilateral-mirror", "wave-spawn", "bus-relay", "revolver-rotation",
             "cube-of-cubes", "wave-nesting", "fork-branch", "edge", "default", "totally-unknown-type",
             "x", "no-match", "STAR", "Revolver", ""]
LARGE_CPS = [32767, 32768, 32771, 65537, 100003, 131071, 999983, 1048576, 4294967311]
SIGNED_SHAPES = [(2, 4), (2, 15), (3, 1), (3, 4), (3, 10), (4, 4), (5, 6), (6, 5), (31, 1)]
ERR_LANES = ['a"b', "x\\y", "tab\there", "nl\nx", "c\x01d", "e\x1bf", "bs\bff\fcr\r", "é😀"]


def rows():
    out = []
    add_row = out.append
    add_row("# Triad referee rows from tools/triad_referee.py (stdlib integer Python mirror of the vendored JavaScript); do not edit")
    add_row("# SWEEP rows: sha256 over the newline-terminated rows each sweep defines in tools/triad_referee.py and tests/referee.rs")
    add_row("# TIES rows: trig Math.round calls per sweep and the smallest exact distance from a tie, floor(distance * 2^112)")
    for name, value in [("0.7", C07), ("0.4", C04), ("0.1", C01), ("Math.PI", MATH_PI)]:
        add_row(f"CONST|name={name}|bits={bits(value)}")
    add_row(f"CONST|name=HALF_PI_Q112|hex={machin_pi(112) >> 1:x}")
    add_row(f"PRIMES|limit={sieve_limit(1000)}|count={len(PRIMES)}|first={PRIMES[0]}|last={PRIMES[-1]}|sha256={hashlib.sha256(','.join(map(str, PRIMES)).encode()).hexdigest()}")
    for n in [1, 2, 3, 7, 10, 500, 1000, 1023, 4095, 7919, 1 << 20, (1 << 52) - 1]:
        add_row(f"LOG|n={n}|bits={bits(log_int(n))}")
    add_row(sweep("math_log", "n=1..65536", [f"{n}:{bits(log_int(n))}" for n in range(1, 65537)]))
    add_row(sweep("von_mangoldt", "n=0..8192", [f"{n}:{bits(von_mangoldt(n))}" for n in range(0, 8193)]))
    add_row(sweep("nu_lambda", "cp=0..2048", [f"{cp}:{bits(nu_lambda(cp))}" for cp in range(0, 2049)]))
    for a, b in [(2, 10), (2, 1023), (50, 900)]:
        add_row(f"BAND|start={a}|end={b}|bits={bits(band_weight(a, b))}")
    for n in [1, 3, 7, 1024]:
        add_row(f"BOUND|n={n}|bits={bits(ratio(1, n))}")
    add_row(sweep("deterministic_unit", "seed=" + ",".join(map(str, UNIT_SEEDS)) + ";step=0..255",
                  [f"{s}:{st}:{bits(deterministic_unit(s, st))}" for s in UNIT_SEEDS for st in range(256)]))
    for cp, seed, step in [(500, 0, 0), (500, 42, 0), (2, 0, 0), (1, 0, 0), (7927, 0, 0), (1023, 2654435761, 3)]:
        r = von_mangoldt_next(cp, seed, step)
        add_row(f"NEXT|cp={cp}|seed={seed}|step={step}|next={r['next']}|divisor={r['divisor']}|weight={bits(r['weight'])}|reason={r['reason']}")
    next_rows = []
    for cp in range(0, 1101):
        for seed in NEXT_SEEDS:
            for step in range(15):
                r = von_mangoldt_next(cp, seed, step)
                next_rows.append(f"{cp}:{seed}:{step}:{r['next']}:{r['divisor']}:{bits(r['weight'])}:{r['reason']}")
    add_row(sweep("von_mangoldt_next", "cp=0..1100;seed=" + ",".join(map(str, NEXT_SEEDS)) + ";step=0..14", next_rows))
    traj = []
    for cp0 in range(0, 1101):
        for k in range(1, 7):
            for seed in [0, 7, 13]:
                r = predict_k_positions(cp0, k, seed)
                traj.append(f"{cp0}:{k}:{seed}:" + ",".join(str(s["next"]) for s in r["trajectory"]))
    add_row(sweep("predict_k_positions", "cp0=0..1100;k=1..6;seed=0,7,13", traj))
    hil = [f"3:4:{i}:{coords(hilbert_decode(i, 3, 4))}" for i in range(4096)]
    for dims, b in [(2, 1), (2, 4), (2, 8), (3, 1), (3, 3), (4, 3), (5, 2), (6, 5), (2, 15), (3, 10)]:
        top = min(1 << (dims * b), 4096)
        for i in range(top):
            c = hilbert_decode(i, dims, b)
            hil.append(f"{dims}:{b}:{i}:{coords(c)}:{hilbert_encode(c, dims, b)}")
    add_row(sweep("hilbert", "decode(+encode) 3x4 all; 2x1,2x4,2x8,3x1,3x3,4x3,5x2,6x5,2x15,3x10 first 4096", hil))
    for dims, b, c in [(3, 4, [-1, 0, 0]), (2, 4, [0, -5]), (4, 4, [3, -2, 7, 1]), (2, 15, [-(1 << 31), (1 << 31) - 1]),
                       (3, 10, [-1, -1, -1])]:
        add_row(f"HENC|dims={dims}|bits={b}|coord={coords(c)}|index={hilbert_encode(c, dims, b)}")
    rng = lcg_stream(0x5EED)
    signed_rows = []
    for dims, b in SIGNED_SHAPES:
        for _ in range(256):
            c = [i32(next(rng)) >> (next(rng) % 32) for _ in range(dims)]
            signed_rows.append(f"{dims}:{b}:{coords(c)}:{hilbert_encode(c, dims, b)}")
    add_row(sweep("hilbert_signed", "encode int32 coords from tools/triad_referee.py lcg_stream(0x5EED); "
                  + ",".join(f"{d}x{b}" for d, b in SIGNED_SHAPES) + "; 256 each", signed_rows))
    mtp = []
    for cp0 in range(0, 1101):
        for depth in range(1, 5):
            for seed in [0, 99]:
                r = mtp_heads(cp0, 4, depth, seed)
                mtp.append(f"{cp0}:{depth}:{seed}:" + ";".join(f"{h['head_seed']}/{h['cp_predicted']}/{coords(h['bh_coord_predicted'])}" for h in r["heads"]))
    add_row(sweep("mtp_heads", "cp0=0..1100;k=4;depth=1..4;seed=0,99", mtp))
    r = mtp_heads(500, 4, 1, 0)
    for h in r["heads"]:
        add_row(f"MTP|cp0=500|k=4|depth=1|seed=0|head={h['head_index']}|head_seed={h['head_seed']}|cp={h['cp_predicted']}|bh={coords(h['bh_coord_predicted'])}|divisor={h['trajectory'][0]['divisor']}")
    for pred, act in [([[1, 2, 3], [4, 5, 6]], [[1, 2, 3], [4, 5, 6]]), ([[1, 2, 3]], [[1, 2, 3], [9, 9, 9]]),
                      ([[1, 1, 1]], [[2, 2, 2]]), ([[1, 2, 3]], []), ([[1, 2, 3], [1, 2, 3]], [[1, 2, 3]] * 3)]:
        h = measure_hit_rate(pred, act)
        add_row(f"HIT|predicted={';'.join(map(coords, pred))}|actual={';'.join(map(coords, act))}|hits={h['hits']}|total={h['total']}|set={h['predicted_set_size']}|rate={bits(h['hit_rate'])}")
    for env in ENVELOPES:
        for cp in [2, 300, 400, 500, 600, 750, 850, 950, 1023, 5000]:
            s = slow_loop_predict_shape(env, cp)
            add_row(f"SLOW|envelope={env}|cp={cp}|shape={s['shape']}|branching={s['branching_factor']}|axis={s['axis_bias']}")
    TIE_SWEEP[0] = "fast_loop"
    fast = []
    for shape in SHAPES:
        for cp in range(2, 1024):
            for h in range(4):
                for iters in [1, 3, 5, 15]:
                    r = fast_loop_refine_position(shape, cp, iters, head_seed(0, h))
                    fast.append(f"{shape}:{cp}:{iters}:{head_seed(0, h)}:{r['final_cp']}:" + ",".join(f"{c}/{d}" for _, c, d in r["path"]))
    add_row(sweep("fast_loop", "shape=all;cp=2..1023;seed=head seeds 0..3 of 0;iterations=1,3,5,15", fast))
    TIE_SWEEP[0] = "fast_loop_long"
    long = []
    for shape in ["spiral", "fold", "ring"]:
        for cp in [2, 50, 500, 1023, 6000]:
            for seed in [0, 5]:
                r = fast_loop_refine_position(shape, cp, 400, seed)
                long.append(f"{shape}:{cp}:400:{seed}:{r['final_cp']}:" + ",".join(f"{c}/{d}" for _, c, d in r["path"]))
    add_row(sweep("fast_loop_long", "shape=spiral,fold,ring;cp=2,50,500,1023,6000;seed=0,5;iterations=400", long))
    TIE_SWEEP[0] = "fast_loop_large_cp"
    large = []
    for shape in SHAPES:
        for cp in LARGE_CPS:
            for h in range(4):
                for iters in [1, 2, 15]:
                    r = fast_loop_refine_position(shape, cp, iters, head_seed(0, h))
                    large.append(f"{shape}:{cp}:{iters}:{head_seed(0, h)}:{r['final_cp']}:" + ",".join(f"{c}/{d}" for _, c, d in r["path"]))
    add_row(sweep("fast_loop_large_cp", "shape=all;cp=" + ",".join(map(str, LARGE_CPS)) + ";seed=head seeds 0..3 of 0;iterations=1,2,15", large))
    TIE_SWEEP[0] = "hrm_rows"
    cases = [("cascade-fanout", 500, 4, 5, 0), ("revolver", 600, 3, 4, 11), ("wave-nesting", 500, 2, 3, 0),
             ("default", 2, 4, 15, 0), ("cascade-fanout", 500, 4, 15, 0), ("fork-branch", 777, 4, 15, 9),
             ("cube-of-cubes", 321, 4, 15, 0), ("wave-spawn", 900, 4, 15, 0), ("revolver", 100003, 4, 1, 0),
             ("revolver", 100003, 4, 15, 0), ("revolver", 65537, 2, 2, 7)]
    for env, cp, k, iters, seed in cases:
        r = hrm_shaped_prediction(env, cp, (), k, iters, seed)
        heads = ";".join(f"{h['head_seed']}/{h['cp_predicted']}/{coords(h['bh_coord_predicted'])}" for h in r["heads"])
        add_row(f"HRM|envelope={env}|cp={cp}|k={k}|fast_iters={iters}|seed={seed}|shape={r['shape']}|axis={r['shape_params']['axis_bias']}|heads={heads}")
    for name in ["fast_loop", "fast_loop_long", "fast_loop_large_cp", "hrm_rows"]:
        count, least = TIES[name]
        add_row(f"TIES|sweep={name}|checked={count}|min_margin_q112={least}")
    rev = Revolver("TEST-ACER")
    for _ in range(10):
        add_row(f"NEXTPID|anchor=TEST-ACER|counter={rev.counter}|pid={rev.next()}")
    for anchor, cp0, k, depth, seed in [("TEST-ACER", 500, 4, 1, 0), ("TEST-ACER", 500, 4, 2, 0), ("LIVE-TRIAD-TEST", 500, 4, 1, 0),
                                        ("TEST-ACER", None, 4, 1, 0), ("TEST-ACER", 900, 6, 1, 3)]:
        rv = Revolver(anchor)
        rv.counter = 2
        w = rv.pre_warm(k, depth, seed, cp0)
        cands = ";".join(f"{c['cp_predicted']}/{coords(c['bh_coord_predicted'])}/{c['speculative_pid']}/{c['actor']}/{c['lane']}/{c['prime']}" for c in w["candidates"])
        add_row(f"PREWARM|anchor={anchor}|counter=2|cp0_opt={'' if cp0 is None else cp0}|k={k}|depth={depth}|seed={seed}|cp0={w['cp0']}|candidates={cands}")
    for alphabet in [0, -5, 512]:
        for call, run in [("next", lambda rv: rv.next()), ("preWarm", lambda rv: rv.pre_warm(4, 1, 0, 500)),
                          ("preWarm_k0", lambda rv: rv.pre_warm(0, 1, 0, 500))]:
            rv = Revolver("A", alphabet)
            try:
                run(rv)
                raise AssertionError("upstream throws here")
            except RangeError as e:
                add_row(f"ERR|call={call}|alphabet={alphabet}|error=RangeError|message={e}|counter={rv.counter}")
    for lane in ERR_LANES:
        try:
            mint_pid(1, "d", lane, 2)
            raise AssertionError("upstream throws here")
        except RangeError as e:
            add_row(f"ERR|call=mintPID|lane_utf8_hex={lane.encode('utf-8').hex()}|error=RangeError|message={e}")
    return "\n".join(out) + "\n"


def main():
    text = rows()
    n = text.count(chr(10))
    ties = ", ".join(f"{k} {v[0]} checked, min {v[1]} / 2^112" for k, v in TIES.items())
    if "--check" in sys.argv[1:]:
        if FIXTURE.read_text(encoding="utf-8") != text:
            print(f"DIFFERS {FIXTURE}")
            return 1
        print(f"OK {FIXTURE} ({n} rows; Math.round ties: {ties})")
        return 0
    FIXTURE.write_text(text, encoding="utf-8")
    print(f"wrote {FIXTURE} ({n} rows; Math.round ties: {ties})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
