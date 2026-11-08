#!/usr/bin/env python3
"""gguf_meta.py - print the header, key/value metadata and tensor descriptors of GGUF files (stdlib only).

Usage: python3 -I gguf_meta.py FILE.gguf [FILE.gguf ...]

Integers only. A float32 (type 6) or float64 (type 12) value is read as its bit pattern and printed
as CPython's repr() prints that value (fewest digits that read back to the same binary64, the
nearest such, the even one on a tie), computed exactly in integers. The output is byte-identical
to the float version of this tool (sha256 289dc0b4...; see README.md).
"""
import struct
import sys


def rd(b, o, f):
    s = struct.calcsize(f); return struct.unpack_from(f, b, o), o + s


def rs(b, o):
    (n,), o = rd(b, o, "<Q"); return b[o:o+n].decode("utf-8", "replace"), o + n


def _cmp_scaled(c, k, y, t):
    """Sign of c*10^k - y*2^t, for integers c, y >= 0 and any integers k, t."""
    left = c * 10 ** max(k, 0) * 2 ** max(-t, 0)
    right = y * 2 ** max(t, 0) * 10 ** max(-k, 0)
    return (left > right) - (left < right)


def shortest_repr(neg, m, q):
    """repr() of the finite non-zero binary64 value (-1)^neg * m * 2^q (m > 0, m * 2^q normalised
    to a binary64 significand of at most 53 bits and an exponent q >= -1074)."""
    shift = max(53 - m.bit_length(), 0)
    if q - shift >= -1074:
        m, q = m << shift, q - shift
    else:
        m, q = m << (q + 1074), -1074
    # rounding interval in units of 2^(q-2): [lo4, hi4] around x4 = 4m, ends included when m is even
    x4, hi4 = 4 * m, 4 * m + 2
    lo4 = 4 * m - 1 if (m == 1 << 52 and q > -1074) else 4 * m - 2
    t = q - 2
    inclusive = m % 2 == 0

    def inside(c, p):
        a, b = _cmp_scaled(c, p, lo4, t), _cmp_scaled(c, p, hi4, t)
        return (a >= 0 and b <= 0) if inclusive else (a > 0 and b < 0)

    n = ((q + m.bit_length() - 1) * 78913 >> 18) + 1  # about log10(x) + 1, corrected below
    while _cmp_scaled(1, n, x4, t) <= 0:               # want 10^(n-1) <= x < 10^n
        n += 1
    while _cmp_scaled(1, n - 1, x4, t) > 0:
        n -= 1
    for k in range(1, 18):
        p = n - k
        num = m * 2 ** max(q, 0) * 10 ** max(-p, 0)  # x / 10^p = num // den, with remainder
        den = 2 ** max(-q, 0) * 10 ** max(p, 0)
        lo = num // den
        best = None
        for c in (lo, lo + 1):
            if not inside(c, p):
                continue
            dist = abs(c * den - num)
            if best is None or dist < best[0] or (dist == best[0] and c % 2 == 0):
                best = (dist, c)
        if best is not None:
            c, decpt = best[1], n
            if c == 10 ** k:
                c, decpt = 10 ** (k - 1), n + 1
            digits = str(c).rstrip("0")
            break
    else:
        raise AssertionError("no 17-digit decimal reads back to this binary64")
    if decpt <= -4 or decpt > 16:
        e = decpt - 1
        text = digits[0] + ("." + digits[1:] if len(digits) > 1 else "")
        text += "e" + ("-" if e < 0 else "+") + "%02d" % abs(e)
    elif decpt <= 0:
        text = "0." + "0" * (-decpt) + digits
    elif decpt >= len(digits):
        text = digits + "0" * (decpt - len(digits)) + ".0"
    else:
        text = digits[:decpt] + "." + digits[decpt:]
    return ("-" if neg else "") + text


def binary_repr(bits, ebits, fbits):
    """repr() of the IEEE-754 value with this bit pattern (ebits exponent bits, fbits fraction bits)."""
    neg = bits >> (ebits + fbits) & 1
    field = bits >> fbits & ((1 << ebits) - 1)
    frac = bits & ((1 << fbits) - 1)
    bias = (1 << (ebits - 1)) - 1
    if field == (1 << ebits) - 1:
        return "nan" if frac else ("-inf" if neg else "inf")
    if field == 0 and frac == 0:
        return "-0.0" if neg else "0.0"
    if field == 0:
        return shortest_repr(neg, frac, 1 - bias - fbits)
    return shortest_repr(neg, frac | 1 << fbits, field - bias - fbits)


class Binary:
    """A float32 or float64 metadata value held as its bit pattern; repr() as CPython's float repr."""

    def __init__(self, bits, ebits, fbits):
        self.text = binary_repr(bits, ebits, fbits)

    def __repr__(self):
        return self.text


SC = {0:"<B",1:"<b",2:"<H",3:"<h",4:"<I",5:"<i",6:"<I",7:"<?",10:"<Q",11:"<q",12:"<Q"}
BINARY = {6: (8, 23), 12: (11, 52)}


def val(b, o, t):
    if t == 8: return rs(b, o)
    if t == 9:
        (et,), o = rd(b, o, "<I"); (n,), o = rd(b, o, "<Q"); out = []
        for _ in range(n):
            v, o = val(b, o, et); out.append(v)
        return out, o
    (v,), o = rd(b, o, SC[t])
    if t in BINARY:
        v = Binary(v, *BINARY[t])
    return v, o


def main(paths):
    for p in paths:
        b = open(p, "rb").read()
        (mg, ver, nt, nk), o = rd(b, 0, "<IIQQ")
        print(f"## {p} bytes={len(b)} ver={ver} tensors={nt} kv={nk}")
        for _ in range(nk):
            k, o = rs(b, o); (t,), o = rd(b, o, "<I"); v, o = val(b, o, t)
            s = repr(v); print(f"  KV {k} = {s[:300]}")
        for _ in range(nt):
            n, o = rs(b, o); (nd,), o = rd(b, o, "<I"); dims = struct.unpack_from("<" + "Q"*nd, b, o); o += 8*nd
            (tt, off), o = rd(b, o, "<IQ")
            if nt <= 40: print(f"  T {n} dims={dims} type={tt} off={off}")


if __name__ == "__main__":
    main(sys.argv[1:])
