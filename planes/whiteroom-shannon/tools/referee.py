#!/usr/bin/env python3
"""Stdlib referee for planes/whiteroom-shannon: mirrors the upstream JavaScript line by line and writes
the HBP fixtures under tests/fixtures/; --check regenerates them in memory and diffs the committed copies.

Integer arithmetic only (OWNER-RULES rule 4): a JavaScript number (IEEE-754 binary64) is held exactly as
a Fraction of two Python integers, or as one of the names NaN / Infinity / -Infinity / -0, and every
JavaScript operation the upstream lines perform (+, /, * 1024, Number(s), float32 rounding of the
servers' tensors) is rounded to the nearest binary64 (or binary32) value, ties to even, by integer
division and comparison. No Python float is used.

Upstream (file:line cited at each function):
  WR   asolaria-whiteroom-engine@896518a  liris-whiteroom-engine.mjs (blob 8bf9fa4a)
  SH   Shannon-and-the-gnns-stage@32f9670 pipeline/hookwall.mjs (blob 5d300345),
       pipeline/shannon-boot.mjs (blob 6ae92778), pipeline/whiteroom-consumer-index.mjs (blob e572da93)
  BP   bigpickle-rebuild@c592599          src/fabric-thinker-gnn.mjs (blob 423bd2e6),
       src/fabric-thinker.mjs (blob 71dd564d), src/hilbert.mjs (blob 1a22e1b6)
  B256 asolaria-behcs-256@818cc23         src/gnn/hybrid-harness.js (blob 14863cbf)
JavaScript language operations the upstream lines rely on (ToNumber, String(x), JSON string quoting,
int32 bit operators, toFixed, Math.round) are written out from ECMA-262 here, independently of the
Rust port. Three upstream values carry third-party data and are never used: hookwall.mjs:45 (the
grant authority object), shannon-boot.mjs:118 (approvedBy) and :155 (cosign); the fixtures use the
neutral stand-ins named in their headers instead.
Run: python3 -I -B tools/referee.py [--check]
"""
import hashlib
import pathlib
import re
import sys
from fractions import Fraction

CRATE = pathlib.Path(__file__).resolve().parent.parent
FIXTURES = CRATE / "tests" / "fixtures"

# ---- binary64 (and binary32) in integers --------------------------------------------------------

NAN, POS_INF, NEG_INF, NEG_ZERO = "NaN", "Infinity", "-Infinity", "-0"
TWO = Fraction(2)


def floor_log2(a):
    """e with 2^e <= a < 2^(e+1), for a Fraction a > 0."""
    n, d = a.numerator, a.denominator
    e = n.bit_length() - d.bit_length()
    if (n < d << e) if e >= 0 else (n << -e < d):
        e -= 1
    return e


def rnd(q, mant_bits=53, emin=-1074, emax=1024):
    """The binary64 value nearest the Fraction q, ties to even (IEEE-754 roundTiesToEven), as a Fraction,
    or POS_INF / NEG_INF past the overflow threshold. mant_bits=24, emin=-149, emax=128 give binary32."""
    if q == 0:
        return Fraction(0)
    neg = q < 0
    a = -q if neg else q
    sh = max(floor_log2(a) - (mant_bits - 1), emin)
    n, d = a.numerator, a.denominator
    if sh >= 0:
        d <<= sh
    else:
        n <<= -sh
    m, r = divmod(n, d)
    if 2 * r > d or (2 * r == d and m & 1):
        m += 1
    v = m * TWO ** sh
    if v >= TWO ** emax:
        return NEG_INF if neg else POS_INF
    return -v if neg else v


def rnd32(q):
    """C's (float)x of a double x: the binary32 value nearest q, ties to even."""
    return rnd(q, 24, -149, 128)


def dec(text):
    """The JavaScript (and Python) literal `text` as its binary64 value."""
    return rnd(Fraction(text))


def finite(v):
    """The exact value of a finite number (-0 is 0); None for NaN and the infinities."""
    if v == NEG_ZERO:
        return Fraction(0)
    return v if isinstance(v, Fraction) else None


def add(a, b):
    return rnd(a + b)


def div(a, b):
    return rnd(Fraction(a) / Fraction(b))


def js_number_to_string(v):
    """Number::toString(x) (ECMA-262 6.1.6.1.20): the fewest significant digits k whose decimal
    s * 10^(n-k) rounds back to x, the closest such s, the even one on a tie."""
    if v == NAN:
        return "NaN"
    if v == POS_INF:
        return "Infinity"
    if v == NEG_INF:
        return "-Infinity"
    x = finite(v)
    if x == 0:
        return "0"
    if x < 0:
        return "-" + js_number_to_string(-x)
    n = 1  # 10^(n-1) <= x < 10^n
    while Fraction(10) ** n <= x:
        n += 1
    while Fraction(10) ** (n - 1) > x:
        n -= 1
    for k in range(1, 18):
        scaled = x * Fraction(10) ** (k - n)
        lo = scaled.numerator // scaled.denominator
        best = None
        for cand in (lo, lo + 1):
            if rnd(cand * Fraction(10) ** (n - k)) != x:
                continue
            dist = abs(cand - scaled)
            if best is None or dist < best[0] or (dist == best[0] and cand % 2 == 0):
                best = (dist, cand)
        if best is not None:
            s, nn = best[1], n
            if s == 10 ** k:
                s, nn = 10 ** (k - 1), n + 1
            digits = str(s).rstrip("0")
            break
    else:
        raise AssertionError("no round-trip decimal within 17 digits")
    return number_layout(digits, nn)


def number_layout(s, n):
    """Number::toString steps 6-12 for the significant digits s (no trailing zeros) of a decimal with
    10^(n-1) <= value < 10^n."""
    k = len(s)
    if k <= n <= 21:
        return s + "0" * (n - k)
    if 0 < n <= 21:
        return s[:n] + "." + s[n:]
    if -6 < n <= 0:
        return "0." + "0" * (-n) + s
    e = n - 1
    sign = "+" if e >= 0 else "-"
    if k == 1:
        return f"{s}e{sign}{abs(e)}"
    return f"{s[0]}.{s[1:]}e{sign}{abs(e)}"


def bits(v):
    """The IEEE-754 binary64 bit pattern of a number, 16 hex digits."""
    if v == NAN:
        return "7ff8000000000000"
    if v in (POS_INF, NEG_INF):
        return ("f" if v == NEG_INF else "7") + "ff0000000000000"
    if v == NEG_ZERO:
        return "8000000000000000"
    x = Fraction(v)
    if x == 0:
        return "0" * 16
    sign = 1 if x < 0 else 0
    a = -x if sign else x
    e = floor_log2(a)
    if e < -1022:
        field, m = 0, a / TWO ** -1074
    else:
        field, m = e + 1023, a / TWO ** (e - 52) - 2 ** 52
    assert m.denominator == 1, "not a binary64 value"
    return "%016x" % ((sign << 63) | (field << 52) | m.numerator)


# ---- JavaScript values ------------------------------------------------------------------------


class Undefined:
    def __repr__(self):
        return "undefined"


UNDEF = Undefined()


class Num:
    """A JavaScript number: a binary64 Fraction, or NaN / Infinity / -Infinity / -0."""

    def __init__(self, v):
        if isinstance(v, int) and not isinstance(v, bool):
            v = Fraction(v)
        assert v in (NAN, POS_INF, NEG_INF, NEG_ZERO) or (isinstance(v, Fraction) and rnd(v) == v), v
        self.x = v

    def __eq__(self, other):
        # SameValueZero: NaN equals NaN, -0 equals 0.
        if not isinstance(other, Num):
            return False
        a, b = finite(self.x), finite(other.x)
        return a == b if a is not None and b is not None else self.x == other.x

    def __hash__(self):
        return 0


def is_num(v):
    return isinstance(v, Num)


def truthy(v):
    if v is UNDEF or v is None:
        return False
    if isinstance(v, bool):
        return v
    if is_num(v):
        return not (finite(v.x) == 0 or v.x == NAN)
    if isinstance(v, str):
        return len(v) > 0
    return True


def get(v, key):
    # v.key / v?.key for the non-index, non-length names the planes read.
    if isinstance(v, dict):
        return v.get(key, UNDEF)
    return UNDEF


def js_or(*values):
    for v in values[:-1]:
        if truthy(v):
            return v
    return values[-1]


def nullish(v):
    return v is UNDEF or v is None


def to_js_string(v):
    if v is UNDEF:
        return "undefined"
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if is_num(v):
        return js_number_to_string(v.x)
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return ",".join("" if nullish(item) else to_js_string(item) for item in v)
    return "[object Object]"


def same_value_zero(a, b):
    if isinstance(a, (list, dict)) or isinstance(b, (list, dict)):
        return False
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if is_num(a) and is_num(b):
        return a == b
    if a is UNDEF or b is UNDEF:
        return a is b
    if a is None or b is None:
        return a is b
    return type(a) is type(b) and a == b


JS_SPACE = set("\t\n\x0b\x0c\r \xa0     　﻿") | {chr(c) for c in range(0x2000, 0x200B)}
DECIMAL_LITERAL = re.compile(r"[+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?")
RADIX_DIGITS = {16: "0123456789abcdefABCDEF", 8: "01234567", 2: "01"}
BIG_EXP = 4000


def string_to_number_exact(s):
    """StringToNumber (ECMA-262 7.1.4.1.1) before rounding: Fraction, 'nan', ('inf', neg) or ('huge', neg) / ('tiny', neg)."""
    i, j = 0, len(s)
    while i < j and s[i] in JS_SPACE:
        i += 1
    while j > i and s[j - 1] in JS_SPACE:
        j -= 1
    t = s[i:j]
    if t == "":
        return Fraction(0)
    prefix = t[:2].lower()
    if prefix in ("0x", "0o", "0b"):
        radix = {"0x": 16, "0o": 8, "0b": 2}[prefix]
        rest = t[2:]
        if rest and all(ch in RADIX_DIGITS[radix] for ch in rest):
            return Fraction(int(rest, radix))
        return "nan"
    neg = t.startswith("-")
    body = t[1:] if t[:1] in "+-" else t
    if body == "Infinity":
        return ("inf", neg)
    if not DECIMAL_LITERAL.fullmatch(t) or t[:1] in "+-" and not body:
        return "nan"
    mant, _, exp = body.replace("E", "e").partition("e")
    exp = int(exp) if exp else 0
    ip, _, fp = mant.partition(".")
    digits = int((ip + fp) or "0")
    e10 = exp - len(fp)
    if digits == 0:
        return Fraction(0)
    if e10 > BIG_EXP:
        return ("huge", neg)
    if e10 < -BIG_EXP:
        return ("tiny", neg)
    value = Fraction(digits) * Fraction(10) ** e10
    return -value if neg else value


def to_number_exact(v):
    if v is UNDEF:
        return "nan"
    if v is None:
        return Fraction(0)
    if isinstance(v, bool):
        return Fraction(int(v))
    if is_num(v):
        if v.x == NAN:
            return "nan"
        if v.x in (POS_INF, NEG_INF):
            return ("inf", v.x == NEG_INF)
        return finite(v.x)
    if isinstance(v, str):
        return string_to_number_exact(v)
    return string_to_number_exact(to_js_string(v))


def to_double(exact):
    """Round an exact ToNumber value to binary64, as StringToNumber does."""
    if exact == "nan":
        return NAN
    if isinstance(exact, tuple):
        kind, neg = exact
        if kind in ("inf", "huge"):
            return NEG_INF if neg else POS_INF
        return NEG_ZERO if neg else Fraction(0)
    return rnd(exact)


def js_le_one(v):
    x = to_double(to_number_exact(v))  # tier <= 1 (shannon-boot.mjs:74): NaN gives false
    if x == NAN:
        return False
    if x in (POS_INF, NEG_INF):
        return x == NEG_INF
    return finite(x) <= 1


def number_or_zero(v):
    """Number(v) || 0 (hookwall.mjs:20, :42): the binary64 value Number(v) rounds to, 0 for NaN and -0; as an
    integer, or None (refused, outside the port's domain) when it is not an integer of magnitude <= 2^53."""
    js = to_double(to_number_exact(v))
    js = js if (js != NAN and finite(js) != 0) else Fraction(0)  # || 0
    x = finite(js)
    if x is None or x.denominator != 1 or abs(x) > 2**53:
        return None, js  # Infinity, a non-integer, or an integer above 2^53
    return int(x), js


def js_greater(a, b):
    """a > b for two strings (UTF-16 code units) or two numbers; None otherwise (outside the port)."""
    if isinstance(a, str) and isinstance(b, str):
        return a.encode("utf-16-be") > b.encode("utf-16-be")
    if is_num(a) and is_num(b):
        if NAN in (a.x, b.x):
            return False
        rank = lambda x: (0, 0) if x == NEG_INF else (2, 0) if x == POS_INF else (1, finite(x))  # noqa: E731
        return rank(a.x) > rank(b.x)
    return None


def quote_json_string(s):
    # QuoteJSONString (ECMA-262 25.5.2.3); the model has no unpaired surrogates.
    out = ['"']
    for ch in s:
        c = ord(ch)
        if ch == "\b":
            out.append("\\b")
        elif ch == "\t":
            out.append("\\t")
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\f":
            out.append("\\f")
        elif ch == "\r":
            out.append("\\r")
        elif ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif c < 0x20:
            out.append("\\u%04x" % c)
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def json_number(x):
    return js_number_to_string(x) if finite(x) is not None else "null"


# ---- value tokens (the fixture encoding of a JavaScript value; aether-defined, not JSON) --------


def esc(s):
    # %XX (uppercase hex) for % space | = and code points below 0x20 and 0x7F; everything else literal.
    return "".join("%%%02X" % ord(ch) if ord(ch) < 0x20 or ord(ch) == 0x7F or ch in "% |=" else ch for ch in s)


def tok(v):
    if v is UNDEF:
        return "u"
    if v is None:
        return "n"
    if isinstance(v, bool):
        return "t" if v else "f"
    if is_num(v):
        return "#" + js_number_to_string(v.x)
    if isinstance(v, str):
        return "'" + esc(v)
    if isinstance(v, list):
        return " ".join(["["] + [tok(x) for x in v] + ["]"])
    parts = ["{"]
    for k, x in v.items():
        parts.append("'" + esc(k))
        parts.append(tok(x))
    parts.append("}")
    return " ".join(parts)


def js_to_fixed(x, digits):
    # Number.prototype.toFixed for 0 <= x < 1e21: n / 10^digits nearest x, the larger n on a tie.
    q = Fraction(x) * 10**digits + Fraction(1, 2)
    n = q.numerator // q.denominator
    if digits == 0:
        return str(n)
    return f"{n // 10**digits}.{n % 10**digits:0{digits}d}"


def js_round(x):
    q = Fraction(x) + Fraction(1, 2)
    return q.numerator // q.denominator


def sha256hex(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


class Lcg:
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound

    def pick(self, items):
        return items[self.below(len(items))]


TEXT_POOL = "aZ09 |=%\t\n\r\"\\/é€😀 \x00\x1f\x7f.-_:"


def random_text(rng, max_len):
    return "".join(rng.pick(TEXT_POOL) for _ in range(rng.below(max_len + 1)))


NUM_POOL = tuple(dec(t) for t in ("0", "1", "-1", "2", "0.5", "0.1", "0.72", "1e21", "1e-7", "1.5e-7", "123456789.125",
                                    "-42", "1e300", "5e-324", "9007199254740992", "9007199254740994", "0.000001", "1e20",
                                    "3", "1.0000000000000002"))
NUM_POOL = NUM_POOL[:1] + (NEG_ZERO,) + NUM_POOL[1:] + (NAN, POS_INF)


def random_value(rng, depth):
    kind = rng.below(9 if depth > 0 else 6)
    if kind == 0:
        return UNDEF
    if kind == 1:
        return None
    if kind == 2:
        return rng.below(2) == 1
    if kind == 3:
        return Num(rng.pick(NUM_POOL)) if rng.below(2) else Num(rng.below(2000) - 1000)
    if kind in (4, 5):
        return random_text(rng, 6)
    if kind in (6, 7):
        return [random_value(rng, depth - 1) for _ in range(rng.below(4))]
    obj = {}
    for _ in range(rng.below(4)):
        obj[random_text(rng, 3)] = random_value(rng, depth - 1)
    return obj


def write_rows(header, rows):
    return header + "".join(r + "\n" for r in rows)


def row(kind, **fields):
    return kind + "".join(f"|{k}={v}" for k, v in fields.items())


# ---- JS language vectors ------------------------------------------------------------------------

NUMBER_STRINGS = ("", " ", "1", " 1 ", " 1 ", "﻿2", "1.", ".5", "+.5", "-.5", "1e0", "1E1", "1e+0", "1.e1",
                  "0x10", "0X1f", "0x", "0xg", "-0x1", "+0x1", "0o17", "0b101", "0b2", "0o8", "Infinity", "-Infinity",
                  "+Infinity", "infinity", "NaN", "1_0", "١", "1e400", "-1e400", "1e-400", "1e99999", "abc", "1 2",
                  "9007199254740992", "9007199254740993", "-9007199254740992", "1.0000000000000001110223024625156540423631668090820312",
                  "1.00000000000000011102230246251565404236316680908203125",
                  "1.00000000000000011102230246251565404236316680908203126", "0.99999999999999994448884876874217297881841659545898437",
                  "2", "1.5", "-1", "0", "-0", "00012", "12e-1", "120e-1", "1e16", "1.25e2",
                  # Number(v) rounds to binary64 before || 0 (2^52 + 1/2 and 2^53 + 1 are ties, to even):
                  "0.99999999999999999", "1.0000000000000001", "4503599627370495.5", "4503599627370496.5",
                  "4503599627370497.5", "-9007199254740993", "9007199254740993.0000000001", "9007199254740995",
                  "0x20000000000001", "123456789012345678e-2", "10000000000000000e-16", "-2e-400",
                  "2.4703282292062327e-324", "2.4703282292062328e-324", "1." + "0" * 900 + "1", "0." + "9" * 900)


def text_is_string_of_its_value(text):
    """text (a decimal literal) equals String(x) of the binary64 value x it rounds to."""
    return js_number_to_string(rnd(Fraction(text))) == text


def number_text_candidates(x):
    """String(x) of a binary64 x > 0, and nearby texts in the same layout: the nearest 17-digit decimal,
    the last digit of String(x) one up and one down, and String(x) extended to 17 digits with a final 1."""
    shortest = js_number_to_string(x)
    mant, _, exp = shortest.partition("e")
    whole, _, frac = mant.partition(".")
    digits = (whole + frac).lstrip("0")
    p = (int(exp) if exp else 0) - len(frac)  # x printed = int(digits) * 10^p
    n = 1  # 10^(n-1) <= x < 10^n
    while Fraction(10) ** n <= x:
        n += 1
    while Fraction(10) ** (n - 1) > x:
        n -= 1
    scaled = x * Fraction(10) ** (17 - n) + Fraction(1, 2)
    nearest17 = scaled.numerator // scaled.denominator
    s = int(digits)
    out = [(s, p), (nearest17, n - 17), (s + 1, p), (s - 1, p)]
    if len(digits) < 17:
        out.append((s * 10 ** (17 - len(digits)) + 1, p - (17 - len(digits))))
    texts = []
    for sig, e10 in out:
        if sig <= 0:
            continue
        sig_digits = str(sig)
        text = number_layout(sig_digits.rstrip("0"), len(sig_digits) + e10)
        if text not in texts:
            texts.append(text)
    return texts


def js_vectors():
    rng = Lcg(0x5EED_0001)
    values = [Num(x) for x in NUM_POOL] + list(NUMBER_STRINGS) + [UNDEF, None, True, False, [], [Num(1)], [Num(1), Num(2)],
                                                                  ["2"], [None], {}, {"a": Num(1)}, [[Num(1)]]]
    values += [random_value(rng, 2) for _ in range(300)]
    rows = []
    for v in values:
        port, js = number_or_zero(v)
        if port is not None:
            assert Fraction(port) == js, (v, port, js)
        rows.append(row("VALUE", v=tok(v), truthy=int(truthy(v)), le_one=int(js_le_one(v)),
                        number_or_zero="refused" if port is None else str(port), string=esc(to_js_string(v))))
    for _ in range(400):
        a, b = random_value(rng, 0), random_value(rng, 0)
        g = js_greater(a, b)
        rows.append(row("GREATER", a=tok(a), b=tok(b), result="refused" if g is None else str(int(g))))
    for a, b in (("｡", "\U0001f600"), ("a", "B"), ("2026-10-17T00:00:01.000Z", "2026-10-17T00:00:00.999Z"), ("", "")):
        rows.append(row("GREATER", a=tok(a), b=tok(b), result=str(int(js_greater(a, b)))))
    for _ in range(200):
        s = random_text(rng, 8)
        rows.append(row("QUOTE", s=tok(s), quoted=esc(quote_json_string(s))))
    for x in list(NUM_POOL) + [Fraction(rng.below(1 << 53), 1 << rng.below(80)) for _ in range(300)]:
        rows.append(row("NUMTEXT", bits=bits(x), text=js_number_to_string(x)))
    text_rng = Lcg(0x5EED_0009)
    xs = [abs(finite(x)) for x in NUM_POOL if finite(x)]
    for _ in range(120):
        kind = text_rng.below(3)
        if kind == 0:
            x = rnd(Fraction(text_rng.below(1 << 53) + 1, 1 << text_rng.below(80)))
        elif kind == 1:
            x = dec(f"{text_rng.below(10 ** (1 + text_rng.below(9))) + 1}e{text_rng.below(61) - 30}")
        else:
            x = rnd(Fraction(text_rng.below(1 << 53) + 1) * TWO ** (text_rng.below(2100) - 1126))
        if finite(x):
            xs.append(x)
    texts = ["0.10000000000000001", "12345678901234567", "1.0000000000000001", "9007199254740993", "4e-324",
             "5e-324", "1.7976931348623157e+308", "1.7976931348623158e+308", "2.2250738585072014e-308",
             "2.225073858507201e-308", "-0.30000000000000004", "0.30000000000000003", "9007199254740992"]
    for x in xs:
        sign = "-" if text_rng.below(4) == 0 else ""
        texts += [sign + t for t in number_text_candidates(x)]
    for t in texts:
        rows.append(row("FROMTEXT", text=esc(t), canonical=int(text_is_string_of_its_value(t))))
    header = ("# jsvalue.hbp from tools/referee.py; do not edit\n"
              "# ECMA-262 operations the upstream lines apply, written out in Python (not from the Rust port).\n"
              "# VALUE: v is a value token; truthy = !!v; le_one = (v <= 1) after ToNumber and binary64 rounding;\n"
              "#   number_or_zero = Number(v) || 0 (ToNumber rounds to binary64) where it is an integer of magnitude\n"
              "#   <= 2^53, else 'refused' (the port's domain); string = String(v), escaped. GREATER: a > b for two\n"
              "#   strings or two numbers, else 'refused'. QUOTE: JSON.stringify of a string. NUMTEXT: String(x) of\n"
              "#   the binary64 with these bits. FROMTEXT: a decimal laid out as String(x) lays out; canonical = 1\n"
              "#   when it is String(x) of the binary64 value x it rounds to.\n"
              "# Value tokens: u n t f #<String(x)> '<escaped string> [ ... ] { '<key> <value> ... }, separated by\n"
              "#   spaces; escapes are %XX for % space | = and bytes below 0x20 and 0x7F.\n")
    return write_rows(header, rows)


# ---- WR liris-whiteroom-engine.mjs --------------------------------------------------------------


def wr_l0_graph_bytes(pid, mark):
    # :113-119: b(i) = parseInt(h.slice(2i, 2i + 2), 16) / 255 for i in 0..15
    h = sha256hex(pid + "|" + str(mark))
    return h[0:30]


def wr_mean(scores):
    # :125-126
    if not scores:
        return Fraction(0)
    acc = Fraction(0)
    for c in scores:
        acc = add(acc, c)
    return div(acc, len(scores))


def wr_bh_pid_emitter(seed, count):
    # :22-37 (ported in quants/cubes; mirrored here only to make the seal rows' inputs)
    out = []
    for counter in range(count):
        pid = f"BH.WR.{seed}.{counter}"
        coord64 = sha256hex(pid)
        b = lambda i: int(coord64[2 * i:2 * i + 2], 16)  # noqa: E731
        cp = int(coord64[0:3], 16) % 1024
        out.append({"pid": pid, "coord64": coord64, "cp": cp, "port3": f"{4096 + b(0)}.{b(1)}.{b(2)}"})
    return out


def wr_seal_row(rec, store_kind, scorer_name):
    # :144-146
    mark = re.sub(r"[|\r\n]", "_", str(rec["mark"]))
    return (f"WHITEROOM|pid={rec['pid']}|port3={rec['port3']}|cp={rec['cp']}|mark={mark}"
            f"|score={js_to_fixed(rec['score'], 6)}|verdict={rec['verdict']}|store={store_kind}|scorer={scorer_name}|json=0")


def wr_spin(addresses, marks, scores, store_kind, scorer_name, threshold=dec("0.72")):
    # tick (:163-175) order: score, verdict (:167), seal (:143-149) with the chain from "0" * 16 (:141).
    # The engine and the seal are ported in quants/cubes; these rows check them with L0-scorer scores.
    prev = "0" * 16
    sealed = []
    for a, mark, score in zip(addresses, marks, scores):
        verdict = "genius" if score >= threshold else "mistake"
        r = wr_seal_row({"pid": a["pid"], "port3": a["port3"], "cp": a["cp"], "mark": mark, "score": score,
                         "verdict": verdict}, store_kind, scorer_name)
        rh = sha256hex(r + prev)[0:16]
        sealed.append((a, mark, score, verdict, r + f"|row_hash={rh}"))
        prev = rh
    return sealed


def whiteroom_fixture():
    rng = Lcg(0x5EED_0002)
    rows = []
    for i in range(200):
        pid, mark = random_text(rng, 10), random_text(rng, 12)
        rows.append(row("L0REQ", pid=tok(pid), mark=tok(mark), bytes=wr_l0_graph_bytes(pid, mark)))
    for i in range(12):
        pid, mark = f"BH.WR.liris-whiteroom.{i}", f"bigpickle:room:{i}:work"
        rows.append(row("L0REQ", pid=tok(pid), mark=tok(mark), bytes=wr_l0_graph_bytes(pid, mark)))
    for n in range(0, 6):
        scores = [Fraction(rng.below(1 << 24), 1 << 24) for _ in range(n)]
        rows.append(row("MEAN", scores=",".join(bits(s) for s in scores), bits=bits(wr_mean(scores))))
    # Q24 scores around the 0.72 threshold and toFixed(6) midpoints, as the in-process L0 scorer yields them.
    t = dec("0.72") * (1 << 24)  # exact: a power-of-two scaling
    q_threshold = -((-t.numerator) // t.denominator)  # Math.ceil
    q24s = [q_threshold - 2, q_threshold - 1, q_threshold, q_threshold + 1, 0, 1 << 24, 1 << 23]
    q24s += [rng.below((1 << 24) + 1) for _ in range(40)]
    addresses = wr_bh_pid_emitter("t", len(q24s))
    marks = [random_text(rng, 10) for _ in q24s]
    scores = [Fraction(q, 1 << 24) for q in q24s]
    for a, mark, score, verdict, sealed in wr_spin(addresses, marks, scores, "memory", "L0-gnn-:4792"):
        rows.append(row("SEAL", chain="q24", pid=tok(a["pid"]), port3=a["port3"], cp=a["cp"], mark=tok(mark),
                        score=bits(score), verdict=verdict, store="memory", scorer="L0-gnn-:4792", sealed=esc(sealed)))
    header = ("# whiteroom.hbp from tools/referee.py; do not edit\n"
              "# Mirrors asolaria-whiteroom-engine@896518a liris-whiteroom-engine.mjs (blob 8bf9fa4a) in Python binary64.\n"
              "# L0REQ: the 15 sha bytes L0GnnScorer posts (:113-119), hex (the last 12 rows are the smoke run's rooms).\n"
              "# MEAN: the mean of a scores list (:125-126), bits = IEEE-754 bits. SEAL: _seal rows (:143-149) chained from\n"
              "#   16 zeros, with scores k / 2^24 (the in-process L0 scorer's output grid) and scorer L0-gnn-:4792, as the\n"
              "#   quants/cubes engine seals them; pid/port3/cp come from BHPidEmitter (:22-37) with seed t.\n")
    return write_rows(header, rows)


# ---- BP hilbert.mjs (hilbertEncode as fabric-thinker calls it; the Rust side is model/hrm-mtp) --------


def i32(x):
    x &= 0xFFFFFFFF
    return x - (1 << 32) if x & 0x80000000 else x


def hilbert_encode(coord, dimensions, bits_):
    # :144-155 with validateOpts (:13-25)
    if dimensions < 2:
        return "Dimensions"
    if bits_ < 1:
        return "Bits"
    if len(coord) != dimensions:
        return "CoordLength"
    if dimensions == 2:
        return encode_2d(coord[0], coord[1], i32(1 << (bits_ & 31)))
    x = list(coord)
    axes_to_transpose(x, dimensions, bits_)
    return transpose_to_index(x, dimensions, bits_)


def rotate_2d(n, x, y, rx, ry):
    # :29-38
    if ry == 0:
        if rx == 1:
            x = n - 1 - x
            y = n - 1 - y
        return y, x
    return x, y


def encode_2d(x, y, side_len):
    # :40-49
    d = 0
    s = i32(side_len) >> 1
    while s > 0:
        rx = 1 if i32(i32(x) & s) > 0 else 0
        ry = 1 if i32(i32(y) & s) > 0 else 0
        d += s * s * ((3 * rx) ^ ry)
        x, y = rotate_2d(s, x, y, rx, ry)
        s >>= 1
    return d


def transpose_to_index(x, n, b):
    # :82-91
    h = 0
    for d in range(b):
        for j in range(n):
            bit = (i32(x[j]) >> ((b - 1 - d) & 31)) & 1
            h = i32(i32(h << 1) | bit)
    return h


def axes_to_transpose(x, n, b):
    # :112-127
    m = i32(1 << ((b - 1) & 31))
    q = m
    while q > 1:
        p = q - 1
        for i in range(n):
            if i32(x[i] & q):
                x[0] = i32(x[0] ^ p)
            else:
                t = i32((x[0] ^ x[i]) & p)
                x[0] = i32(x[0] ^ t)
                x[i] = i32(x[i] ^ t)
        q >>= 1
    for i in range(1, n):
        x[i] = i32(x[i] ^ x[i - 1])


# ---- BP fabric-thinker.mjs / fabric-thinker-gnn.mjs --------------------------------------------


def ft_pid_query_to_graph(pid, query):
    # fabric-thinker-gnn.mjs:31-51
    pid_hash = hashlib.sha256(str(pid).encode()).digest()
    query_hash = hashlib.sha256(str(query).encode()).digest()
    edge_hash = hashlib.sha256((str(pid) + "|" + str(query)).encode()).digest()
    return {"nodes": pid_hash[:6].hex() + query_hash[:6].hex(), "edge": edge_hash[:3].hex(),
            "pid_hash_sha8": pid_hash.hex()[0:8], "query_hash_sha8": query_hash.hex()[0:8],
            "edge_hash_sha8": edge_hash.hex()[0:8]}


def ft_descriptor_infer(pid, query, ts_iso):
    # fabric-thinker.mjs:75-105
    if not isinstance(pid, str) or not pid:
        raise TypeError("fabric-thinker.descriptorInfer: pid must be non-empty string")
    seed = hashlib.sha256(f"{pid}|{query}".encode()).digest()
    confidence = div(int.from_bytes(seed[0:4], "big"), 0xFFFFFFFF)
    cp = 2 + (int.from_bytes(seed[4:6], "big") % 1022)
    bh3d = hilbert_encode([(cp >> 0) & 0xF, (cp >> 4) & 0xF, (cp >> 8) & 0x3], 3, 4)
    return {"pid": pid, "query_sha8": hashlib.sha256(query.encode()).hexdigest()[0:8], "confidence": confidence,
            "cp": cp, "bh_3d_idx": bh3d, "verdict_glyph": seed.hex()[0:16],
            "path": "HIT" if confidence >= Fraction(1, 2) else "FALLBACK", "ts_iso": ts_iso}


class Rejected(Exception):
    pass


def ft_real_infer(pid, query, reply, ts_iso, fallback=True):
    # fabric-thinker-gnn.mjs:90-154; reply = ("unreachable", message) | ("answered", ok, scores)
    stub = ft_descriptor_infer(pid, query, ts_iso)
    graph = ft_pid_query_to_graph(pid, query)
    gnn_result, gnn_error = None, None
    if reply[0] == "unreachable":
        gnn_error = reply[1]
        if not fallback:
            raise Rejected(reply[1])
    else:
        gnn_result = reply
    if gnn_result is not None and gnn_result[1]:
        scores = gnn_result[2]
        if scores[0] == "number":
            score = scores[1]
        elif scores[0] == "array":
            score = scores[1][0] if scores[1] else UNDEF
        else:
            score = Fraction(1, 2)
        if score is UNDEF:
            cp = NAN
            coords = [0, 0, 0]  # (NaN >> 0) & 0xf === 0
        else:
            cp = max(2, min(1023, js_round(rnd(score * 1024))))
            coords = [(cp >> 0) & 0xF, (cp >> 4) & 0xF, (cp >> 8) & 0x3]
        return {"algorithm": "fabric-thinker-gnn-real.v1", "pid": pid, "query_sha8": stub["query_sha8"],
                "gnn_score": score, "cp": cp, "bh_3d_idx": hilbert_encode(coords, 3, 4),
                "verdict_glyph": stub["verdict_glyph"], "path": "FALLBACK", "gnn_real": True,
                "graph_sig": graph["edge_hash_sha8"], "ts_iso": ts_iso}
    out = dict(stub)
    out.update({"algorithm": "fabric-thinker-gnn-fallback-to-sha.v1", "gnn_real": False, "gnn_error": gnn_error,
                "fallback_to_sha_stub": True})
    return out


def ft_ensemble(pid, query, l0_reply, l4_reply, ts_iso, fallback=True):
    # fabric-thinker-gnn.mjs:167-184
    results = []
    for reply in (l0_reply, l4_reply):
        try:
            results.append(ft_real_infer(pid, query, reply, ts_iso, fallback))
        except (TypeError, Rejected):
            results.append({"gnn_real": False, "score": 0})

    def voter(r):
        if isinstance(r.get("gnn_score"), Fraction):  # typeof === 'number'
            return r["gnn_score"]
        if isinstance(r.get("score"), int) and not isinstance(r.get("score"), bool):
            return Fraction(r["score"])
        return Fraction(0)

    l0, l4 = voter(results[0]), voter(results[1])
    return {"l0": l0, "l4": l4, "ensemble": div(add(l0, l4), 2),
            "gnn_real": results[0].get("gnn_real") is True or results[1].get("gnn_real") is True}


# float32(0.5291566), a value in the L4 v2 output region (the probe in WIRING-MAP "Measurement made for this map"
# reports 0.529156..0.529158 on every input): the double literal rounded to binary32, as struct-packing it would.
L4_REGION = rnd32(dec("0.5291566"))


def reply_token(reply):
    if reply[0] == "unreachable":
        return "unreachable:" + esc(reply[1])
    ok, scores = reply[1], reply[2]
    if scores[0] == "number":
        s = "number:" + bits(scores[1])
    elif scores[0] == "array":
        s = "array:" + ",".join(bits(x) for x in scores[1])
    else:
        s = "other"
    return f"answered:{int(ok)}:{s}"


def random_reply(rng):
    kind = rng.below(10)
    if kind == 0:
        return ("unreachable", rng.pick(["connect ECONNREFUSED 127.0.0.1:4793", "infer timeout", "Error"]))
    if kind == 1:
        return ("answered", False, ("other",))
    if kind == 2:
        return ("answered", True, ("array", []))
    if kind == 3:
        return ("answered", True, ("other",))
    if kind == 4:
        return ("answered", True, ("number", Fraction(rng.below(1 << 24), 1 << 24)))
    n = 1 + rng.below(3)
    # Float32 values as the servers' .tolist() gives them, and the L4 v2 constant output region.
    vals = [rnd32(Fraction(rng.below(1 << 30), 1 << 30)) for _ in range(n)]
    if kind == 5:
        vals[0] = L4_REGION
    if kind == 6:
        vals[0] = Fraction(2 * rng.below(1024) + 1, 2048)  # score * 1024 on a .5 tie
    return ("answered", True, ("array", vals))


def fabric_fixture():
    rng = Lcg(0x5EED_0004)
    rows = []
    ts = "2026-10-17T00:00:00.000Z"
    for i in range(300):
        pid = random_text(rng, 10) if i % 50 else ""
        query = random_text(rng, 14)
        g = ft_pid_query_to_graph(pid, query)
        rows.append(row("GRAPH", pid=tok(pid), query=tok(query), nodes=g["nodes"], edge=g["edge"],
                        pid_sha8=g["pid_hash_sha8"], query_sha8=g["query_hash_sha8"], edge_sha8=g["edge_hash_sha8"]))
        try:
            d = ft_descriptor_infer(pid, query, ts)
            rows.append(row("DESC", pid=tok(pid), query=tok(query), confidence=bits(d["confidence"]), cp=d["cp"],
                            bh3d=d["bh_3d_idx"], glyph=d["verdict_glyph"], query_sha8=d["query_sha8"], path=d["path"]))
        except TypeError:
            rows.append(row("DESC", pid=tok(pid), query=tok(query), error="PidNotNonEmptyString"))
        reply = random_reply(rng)
        fallback = rng.below(4) != 0
        try:
            r = ft_real_infer(pid, query, reply, ts, fallback)
            if r["gnn_real"]:
                score = r["gnn_score"]
                rows.append(row("REAL", pid=tok(pid), query=tok(query), reply=reply_token(reply), fallback=int(fallback),
                                result="real", gnn_score="-" if score is UNDEF else bits(score),
                                cp="NaN" if r["cp"] == NAN else r["cp"], bh3d=r["bh_3d_idx"],
                                glyph=r["verdict_glyph"], query_sha8=r["query_sha8"], graph_sig=r["graph_sig"]))
            else:
                rows.append(row("REAL", pid=tok(pid), query=tok(query), reply=reply_token(reply), fallback=int(fallback),
                                result="fallback", gnn_error="-" if r["gnn_error"] is None else esc(r["gnn_error"]),
                                confidence=bits(r["confidence"]), cp=r["cp"], path=r["path"]))
        except TypeError:
            rows.append(row("REAL", pid=tok(pid), query=tok(query), reply=reply_token(reply), fallback=int(fallback),
                            result="reject", error="PidNotNonEmptyString"))
        except Rejected as e:
            rows.append(row("REAL", pid=tok(pid), query=tok(query), reply=reply_token(reply), fallback=int(fallback),
                            result="reject", error="Unreachable:" + esc(str(e))))
        l0_reply, l4_reply = random_reply(rng), random_reply(rng)
        e = ft_ensemble(pid, query, l0_reply, l4_reply, ts, fallback)
        rows.append(row("ENS", pid=tok(pid), query=tok(query), l0=reply_token(l0_reply), l4=reply_token(l4_reply),
                        fallback=int(fallback), l0_score=bits(e["l0"]), l4_score=bits(e["l4"]),
                        ensemble=bits(e["ensemble"]), gnn_real=int(e["gnn_real"])))
    header = ("# fabric-thinker.hbp from tools/referee.py; do not edit\n"
              "# Mirrors bigpickle-rebuild@c592599 src/fabric-thinker-gnn.mjs (blob 423bd2e6) and src/fabric-thinker.mjs\n"
              "#   (blob 71dd564d) in Python binary64; ts_iso = 2026-10-17T00:00:00.000Z.\n"
              "# GRAPH: pidQueryToGraph (:31-51) bytes and sha8 fields. DESC: descriptorInfer (fabric-thinker.mjs:75-105).\n"
              "# REAL: realInfer (:90-154) with the server reply given: unreachable:<message> or answered:<ok>:<scores>,\n"
              "#   scores number:<bits> | array:<bits,...> | other. ENS: realInferEnsemble (:167-184) with both replies given.\n"
              "# Replies hold float32 values as the servers' .tolist() returns them (inference_server.py:24-25).\n")
    return write_rows(header, rows)


# ---- B256 hybrid-harness.js --------------------------------------------------------------------


def hh_shard_plan(n, shard_size=1_000_000):
    # :7-16
    q = div(n, shard_size)
    k = -((-q.numerator) // q.denominator)  # Math.ceil
    shards = []
    for i in range(k):
        start = i * shard_size
        end = min(n, start + shard_size)
        shards.append({"id": f"shard-{i}", "start": start, "end": end})
    return {"K": k, "shard_size": shard_size, "shards": shards}


def hh_default_scorer(agent_id):
    # :20-23
    h = hashlib.sha256(str(agent_id).encode()).digest()
    return div(h[0], 255)


def hh_run_shard(shard, scorers):
    # :18-43
    get_s = lambda name: scorers.get(name) or hh_default_scorer  # noqa: E731
    omni, reverse, gsl, contrastive, prototype = (get_s(n) for n in ("omni", "reverse", "gsl", "contrastive", "prototype"))
    sum_lcr, count = Fraction(0), 0
    shard_hash = hashlib.sha256()
    for agent_id in range(shard["start"], shard["end"]):
        o, r, g, c, p = omni(agent_id), reverse(agent_id), gsl(agent_id), contrastive(agent_id), prototype(agent_id)
        lcr = div(add(add(add(add(o, r), g), c), p), 5)
        sum_lcr = add(sum_lcr, lcr)
        count += 1
        shard_hash.update(f"{agent_id}:{js_to_fixed(lcr, 6)}".encode())
    return {"shard_id": shard["id"], "agents": count, "mean_LCR": div(sum_lcr, count) if count else Fraction(0),
            "shard_sha256": shard_hash.hexdigest()}


def hh_run_fanout(n, shard_size=1_000_000, scorers=None, max_shards_run=None):
    # :45-58
    plan = hh_shard_plan(n, shard_size)
    shards_to_run = plan["shards"][0:max_shards_run] if max_shards_run else plan["shards"]
    results = [hh_run_shard(s, scorers or {}) for s in shards_to_run]
    composite = hashlib.sha256()
    for r in results:
        composite.update(r["shard_sha256"].encode())
    total = Fraction(0)
    for r in results:
        total = add(total, r["mean_LCR"])
    return {"N": n, "planned": plan["K"], "executed": len(results), "mean_LCR": div(total, max(1, len(results))),
            "composite_sha256": composite.hexdigest(), "shards": results}


# Custom scorer sets (fixture inputs; the Rust test builds the same closures).
CUSTOM_SCORERS = {
    "default": {},
    "constants": {"omni": lambda i: dec("0.1"), "reverse": lambda i: dec("0.2"), "gsl": lambda i: dec("0.3"),
                  "contrastive": lambda i: dec("0.7"), "prototype": lambda i: dec("0.9")},
    "ratios": {"omni": lambda i: div(i % 7, 7), "gsl": lambda i: div(i % 1000, 1000), "prototype": lambda i: div(1, i + 3)},
    "l4_constant": {"gsl": lambda i: L4_REGION},
}


def harness_fixture():
    rows = []
    for n, size in ((0, 5), (1, 1), (10, 3), (10, 10), (11, 10), (7, 1_000_000), (2_500_000, 1_000_000), (97, 13)):
        p = hh_shard_plan(n, size)
        rows.append(row("PLAN", n=n, shard_size=size, k=p["K"],
                        shards=",".join(f"{s['start']}-{s['end']}" for s in p["shards"]) or "-"))
    for i in range(300):
        rows.append(row("DEFAULT", id=i, bits=bits(hh_default_scorer(i))))
    rows.append(row("CONST", name="l4_region", bits=bits(L4_REGION)))
    for name, scorers in CUSTOM_SCORERS.items():
        for n, size, max_run in ((0, 5, None), (1, 1, None), (37, 10, None), (37, 10, 2), (37, 10, 0), (37, 10, 99),
                                 (250, 64, None), (1000, 1_000_000, None)):
            f = hh_run_fanout(n, size, scorers, max_run)
            rows.append(row("FANOUT", scorers=name, n=n, shard_size=size, max="-" if max_run is None else max_run,
                            planned=f["planned"], executed=f["executed"], mean=bits(f["mean_LCR"]),
                            composite=f["composite_sha256"],
                            shards=";".join(f"{s['shard_id']}:{s['agents']}:{bits(s['mean_LCR'])}:{s['shard_sha256']}"
                                            for s in f["shards"]) or "-"))
    header = ("# hybrid-harness.hbp from tools/referee.py; do not edit\n"
              "# Mirrors asolaria-behcs-256@818cc23 src/gnn/hybrid-harness.js (blob 14863cbf) in Python binary64.\n"
              "# PLAN: shardPlan (:7-16). DEFAULT: default_scorer (:20-23). FANOUT: runFanout (:45-58) over runShard (:18-43);\n"
              "#   shards = id:agents:mean bits:sha256 per executed shard. Scorer sets: default (all five default),\n"
              "#   constants (0.1, 0.2, 0.3, 0.7, 0.9), ratios (omni (i % 7) / 7, gsl (i % 1000) / 1000, prototype 1 / (i + 3)),\n"
              "#   l4_constant (gsl = float32 0.5291566, the L4 v2 output region; others default). CONST l4_region = its bits.\n")
    return write_rows(header, rows)


# ---- SH pipeline/hookwall.mjs ------------------------------------------------------------------


def standin_enrich(env):
    """Test stand-in for quant-bus.mjs enrichEnvelope (not on this container when this crate was built);
    the Rust test implements the same."""
    triple = "" if env["room_id"] % 3 == 0 else f"T{env['room_id']}:{env['granted']}"
    authority = ("A" + env["intent_sha16"][0:4]) if env["quintuple_authority"] else UNDEF
    return {"intent_sha16": env["intent_sha16"], "triple_quant": triple, "authority_quant": authority}


class HookwallPlane:
    # module state :9-11
    def __init__(self):
        self.requests = self.denials = self.grants = 0

    def intent_sha16(self, intent):
        # :13-15
        return sha256hex(to_js_string(intent))[0:16]

    def request_live(self, room_id, intent):
        # :17-30
        number, _ = number_or_zero(room_id)
        if number is None:
            return "refused"
        self.requests += 1
        self.denials += 1
        env = standin_enrich({"room_id": number, "intent_sha16": self.intent_sha16(intent), "granted": 0,
                              "quintuple_authority": False})
        return (False, "HKW", [room_id, env["intent_sha16"], Num(0), "default_deny_quintuple_required",
                               js_or(env["triple_quant"], ""), js_or(env["authority_quant"], "")])

    def grant_live(self, room_id, intent, quintuple_auth):
        # :32-56
        number, _ = number_or_zero(room_id)
        if number is None:
            return "refused"
        self.requests += 1
        signers = UNDEF if nullish(quintuple_auth) else get(quintuple_auth, "signers")
        window_ok = UNDEF if nullish(quintuple_auth) else get(quintuple_auth, "window_ok")
        ok = isinstance(signers, list) and len(signers) >= 5 and window_ok is True
        if not ok:
            self.denials += 1
            return self.request_live(room_id, intent)
        self.grants += 1
        env = standin_enrich({"room_id": number, "intent_sha16": self.intent_sha16(intent), "granted": 1,
                              "quintuple_authority": True})
        return (True, "HKG", [room_id, env["intent_sha16"], Num(1), Num(len(signers)),
                              js_or(env["triple_quant"], ""), js_or(env["authority_quant"], "")])

    def fire_hookwall(self, t):
        # :81-87
        room_id = get(t, "room_id") if truthy(t) else t
        room_id = Num(0) if nullish(room_id) else room_id
        intent = js_or(get(t, "intent"), get(t, "kind")) if truthy(t) else t
        intent = js_or(intent, "unspecified")
        auth = get(t, "quintupleAuth") if truthy(t) else t
        if truthy(auth):
            return self.grant_live(room_id, intent, auth)
        return self.request_live(room_id, intent)


def random_room(rng):
    return rng.pick([UNDEF, None, Num(0), Num(3), Num(7), Num(-4), Num(Fraction(3, 2)), Num(2**53), Num(2**53 + 2), "12",
                     " 0x10 ", "", "abc", "1e3", "1.5", True, False, [Num(5)], {}, Num(NAN)])


def random_auth(rng):
    signers = [rng.pick(["a", "b", Num(1), None]) for _ in range(rng.below(8))]
    kind = rng.below(6)
    if kind == 0:
        return UNDEF
    if kind == 1:
        return None
    if kind == 2:
        return {"signers": signers, "window_ok": rng.pick([True, False, "true", Num(1), UNDEF])}
    if kind == 3:
        return {"signers": signers, "window_ok": True}
    if kind == 4:
        return {"signers": "abcde", "window_ok": True}
    return rng.pick([Num(1), "x", [], True])


def hookwall_fixture():
    rng = Lcg(0x5EED_0005)
    rows = []

    def emit(step, call, args, result, plane):
        if result == "refused":
            out = {"result": "refused"}
        else:
            granted, tag, fields = result
            out = {"granted": int(granted), "tag": tag, "fields": tok(fields)}
        rows.append(row("HW", step=step, call=call, **args, **out, requests=plane.requests, denials=plane.denials,
                        grants=plane.grants))

    plane = HookwallPlane()
    # selfTest (:68-77)
    r0 = plane.request_live(Num(0), "test_intent")
    emit(0, "request", {"room": tok(Num(0)), "intent": tok("test_intent")}, r0, plane)
    auth = {"signers": ["a", "b", "c", "d", "e"], "window_ok": True}
    r1 = plane.grant_live(Num(0), "test_intent", auth)
    emit(1, "grant", {"room": tok(Num(0)), "intent": tok("test_intent"), "auth": tok(auth)}, r1, plane)
    for step in range(2, 400):
        kind = rng.below(3)
        room = random_room(rng)
        intent = rng.pick([UNDEF, None, "", "live", random_text(rng, 6), Num(42), [Num(1), "x"], {"a": Num(1)}])
        if kind == 0:
            emit(step, "request", {"room": tok(room), "intent": tok(intent)}, plane.request_live(room, intent), plane)
        elif kind == 1:
            auth = random_auth(rng)
            emit(step, "grant", {"room": tok(room), "intent": tok(intent), "auth": tok(auth)},
                 plane.grant_live(room, intent, auth), plane)
        else:
            if rng.below(5) == 0:
                t = rng.pick([UNDEF, None, Num(0), "", False, "x", Num(3), []])
            else:
                t = {}
                for key in ("room_id", "intent", "kind", "quintupleAuth"):
                    if rng.below(2):
                        t[key] = {"room_id": random_room, "quintupleAuth": random_auth}.get(
                            key, lambda r: r.pick([UNDEF, "", "k", random_text(r, 4), Num(0)]))(rng)
            emit(step, "fire", {"tuple": tok(t)}, plane.fire_hookwall(t), plane)
    header = ("# hookwall.hbp from tools/referee.py; do not edit\n"
              "# Mirrors Shannon-and-the-gnns-stage@32f9670 pipeline/hookwall.mjs (blob 5d300345) on one plane's counters,\n"
              "#   step by step (steps 0-1 are selfTest :68-77). fields = the encodeFrame arguments as value tokens.\n"
              "# enrichEnvelope (quant-bus.mjs, not on disk) is the TEST STAND-IN standin_enrich: intent_sha16 passed\n"
              "#   through, triple_quant '' when room_id % 3 == 0 else 'T<room_id>:<granted>', authority_quant\n"
              "#   'A' + intent_sha16[0:4] on a grant else undefined. The grant authority object (:45) is not used.\n"
              "# result=refused: Number(roomId) || 0 is not an integer of magnitude <= 2^53 (outside the port's domain).\n")
    return write_rows(header, rows)


# ---- SH pipeline/shannon-boot.mjs --------------------------------------------------------------

SHANNON_PID_CANON = "AGT-SHANNON-PID-HD16C-A04-W1024-P01-N00001"  # :30
RULE_ANCHORS = ["LX-328", "LX-329", "LX-331", "LX-332", "LX-333"]  # :31
APPROVED_BY_STANDIN = "OPERATOR-SUPPLIED-APPROVER"  # stands in for :118
COSIGN_STANDIN = "OPERATOR-SUPPLIED-COSIGN"  # stands in for :155


class ShannonGate:
    def __init__(self):
        self.registered = None
        self.listeners = 0

    def boot(self, source, loaded_at):
        # :38-65; source = ("not_found", path) | ("parse_error", message) | ("doc", fields)
        if source[0] == "not_found":
            return {"ok": False, "reason": f"profile_not_found:{source[1]}"}
        if source[0] == "parse_error":
            return {"ok": False, "reason": f"profile_parse_error:{source[1]}"}
        doc = source[1]
        if doc.get("agent_pid_current") != SHANNON_PID_CANON:
            shown = doc.get("agent_pid_current", "undefined")
            return {"ok": False, "reason": f"pid_mismatch:{shown}!={SHANNON_PID_CANON}"}
        self.registered = {"role": doc.get("role"), "supervisor_pid": doc.get("supervisor_pid"),
                           "prof_pid": doc.get("prof_pid"), "agent_pid": doc["agent_pid_current"],
                           "brown_hilbert_hash": doc.get("bhh") or "H421B85FD07C14FB4", "loadedAt": loaded_at}
        self.listeners += 1
        return {"ok": True, "profile": dict(self.registered)}

    def check(self, action, tier=UNDEF, approval=UNDEF):
        # :69-101
        if tier is UNDEF:
            tier = Num(1)
        if approval is UNDEF:
            approval = {}
        if not self.registered:
            return {"granted": False, "reason": "gate_not_booted", "ruleAnchors": []}
        if not truthy(action):
            return {"granted": False, "reason": "action_required", "ruleAnchors": ["LX-328"]}
        if js_le_one(tier):
            return {"granted": True, "status": "dry_run_ready", "approvalState": "dry_run_only", "reason": "",
                    "ruleAnchors": ["LX-328"]}
        if approval is None:
            raise TypeError("Cannot read properties of null (reading 'mode')")
        if get(approval, "mode") != "approved_run":
            return {"granted": False, "status": "blocked", "approvalState": "leader_required",
                    "reason": "mode_not_approved_run", "ruleAnchors": ["LX-329"]}
        if not truthy(get(approval, "explicitApproval")):
            return {"granted": False, "status": "blocked", "approvalState": "leader_required",
                    "reason": "execution_approval_required", "ruleAnchors": ["LX-331"]}
        if get(approval, "authorityMode") != "asolaria_primary":
            return {"granted": False, "status": "blocked", "approvalState": "leader_required",
                    "reason": "authority_mode_not_asolaria_primary", "ruleAnchors": ["LX-332"]}
        if not truthy(get(approval, "approvedBy")) or not truthy(get(approval, "approvalRef")):
            return {"granted": False, "status": "blocked", "approvalState": "leader_required",
                    "reason": "execution_approval_reference_required", "ruleAnchors": ["LX-333"]}
        return {"granted": True, "status": "approved_ready", "approvalState": "leader_approved", "reason": "",
                "ruleAnchors": RULE_ANCHORS}

    def self_test(self, source, loaded_at, approved_by):
        # :104-130
        results = []
        boot = self.boot(source, loaded_at)
        results.append(("boot", boot["ok"] is True, (boot.get("profile") or {}).get("agent_pid") or boot.get("reason")))
        t1 = self.check("shannon:status", Num(1))
        results.append(("LX-328-baseline", t1["granted"] is True and t1.get("status") == "dry_run_ready",
                        t1["reason"] or t1.get("status")))
        happy = {"mode": "approved_run", "explicitApproval": True, "authorityMode": "asolaria_primary",
                 "approvedBy": approved_by, "approvalRef": "ASOLARIA-FEDERATION-REMAKE-1024-PID-2026-05-11"}
        t2 = self.check("usb_raw_io.write", Num(2), happy)
        results.append(("tier-2-happy", t2["granted"] is True and t2.get("status") == "approved_ready",
                        t2["reason"] or t2.get("status")))
        blocked = self.check("usb_raw_io.write", Num(2), dict(happy, approvalRef=""))
        results.append(("LX-333-blocked", blocked["granted"] is False and blocked["reason"] == "execution_approval_reference_required",
                        blocked["reason"]))
        return all(r[1] for r in results), results


def fixture_row(anchor, prev_hash, cosign):
    # :138-166
    parts = ["HBPv1", "layer=fixture-restoration", f"pid={anchor}", "prof=shannon-gate-boot-fixture",
             "supervisor=nereus-cp76", "tuple=fixture:shannon:gate:boot", "triple_quant=unspecified",
             "polar_quant=unspecified", "js_quant=unspecified", "turbo_quant=unspecified",
             "json=0", "runtime=0", "promote=1", "status=FIXTURE_RESTORED",
             f"antecedents=DAN-HOOKS-LINEAGE-CANON-PID-2026-05-19,{SHANNON_PID_CANON},LX-328,LX-329,LX-331,LX-332,LX-333,seq191-shannon-r1-boot",
             "chain_id=COHORT-R-FIXTURE-RESTORATION", "sequence=191", f"prev_hash={prev_hash}",
             "cohort=R", "phase=R1", "fixture_class=real-free", "describe_only=1",
             f"cosign={cosign}", "rule_anchors=LX-328|LX-329|LX-331|LX-332|LX-333",
             "endpoint=0", "provider=0", "mcp=0", "usb_write=0", "device_write=0", "dispatch=0", "route=0", "shell=0", "terminal=0",
             "file_write=1", "memory_write=0", "tool_execute=0", "skill_execute=0", "mcp_execute=0", "webmcp_execute=0",
             "provider_call=0", "endpoint_open=0", "browser_control=0", "keyboard_control=0", "screenshot_capture=0",
             "network_call=0", "webhook_open=0", "cron_create=0", "device_read=0", "usb_read=0",
             "private_surface_export=0", "hidden_surface_export=0", "restricted_surface_export=0", "secret_surface_export=0",
             "repo_publish=0", "package_release=0"]
    body = "|".join(parts)
    return body, hashlib.sha256(body.encode()).hexdigest()


def verdict_fields(v):
    return {"granted": int(v["granted"]), "status": v.get("status", "-"), "approval_state": v.get("approvalState", "-"),
            "reason": v["reason"] or "-", "anchors": ",".join(v["ruleAnchors"]) or "-"}


def source_token(source):
    if source[0] == "doc":
        d = source[1]
        return "doc:" + ",".join(f"{k}~{esc(d[k])}" for k in ("agent_pid_current", "role", "supervisor_pid", "prof_pid", "bhh")
                                 if k in d)
    return f"{source[0]}:{esc(source[1])}"


def random_approval(rng):
    kind = rng.below(8)
    if kind == 0:
        return UNDEF
    if kind == 1:
        return None
    if kind == 2:
        return rng.pick(["approved_run", Num(0), True, [], ""])
    a = {}
    for key, choices in (("mode", ["approved_run", "dry_run", UNDEF, ""]),
                         ("explicitApproval", [True, False, Num(1), Num(0), "yes", "", UNDEF]),
                         ("authorityMode", ["asolaria_primary", "other", UNDEF]),
                         ("approvedBy", [APPROVED_BY_STANDIN, "", UNDEF, Num(7)]),
                         ("approvalRef", ["REF-1", "", UNDEF, None])):
        v = rng.pick(choices if kind < 6 else choices[:1])
        if v is not UNDEF:
            a[key] = v
    return a


def shannon_fixture():
    rng = Lcg(0x5EED_0006)
    rows = []
    sources = [("not_found", "/operator/profiles/shannon.profile.json"), ("parse_error", "Unexpected token } in JSON at position 7"),
               ("doc", {}), ("doc", {"agent_pid_current": "AGT-OTHER"}),
               ("doc", {"agent_pid_current": SHANNON_PID_CANON, "role": "shannon", "supervisor_pid": "SUP-1", "prof_pid": "PROF-1"}),
               ("doc", {"agent_pid_current": SHANNON_PID_CANON, "bhh": "HFFFFFFFFFFFFFFFF"}),
               ("doc", {"agent_pid_current": SHANNON_PID_CANON, "bhh": ""})]
    # Gate state machine: checks before boot, failed boots, boots, bus emits.
    gate = ShannonGate()
    tiers = [UNDEF, None, Num(0), Num(1), Num(2), Num(Fraction(3, 2)), "1", "2", " 1 ", "0x1", "abc", "", True, [Num(2)], [], {},
             Num(NAN), Num(NEG_INF), "1.00000000000000011102230246251565404236316680908203125",
             "1.00000000000000011102230246251565404236316680908203126"]
    actions = [UNDEF, None, "", "shannon:status", "usb_raw_io.write", Num(0), Num(1), [], {}]
    step = 0

    def check_row(kind, action, tier, approval):
        nonlocal step
        try:
            v = gate.check(action, tier, approval)
            out = verdict_fields(v)
        except TypeError:
            out = {"error": "ApprovalIsNull"}
        rows.append(row(kind, step=step, action=tok(action), tier=tok(tier), approval=tok(approval), **out))
        step += 1

    for _ in range(20):
        check_row("CHECK", rng.pick(actions), rng.pick(tiers), random_approval(rng))
    for source in sources:
        b = gate.boot(source, "2026-10-17T00:00:00.000Z")
        rows.append(row("BOOT", step=step, source=source_token(source), ok=int(b["ok"]),
                        reason=esc(b.get("reason", "-")),
                        bhh=b["profile"]["brown_hilbert_hash"] if b["ok"] else "-", listeners=gate.listeners))
        step += 1
        for _ in range(40):
            check_row("CHECK", rng.pick(actions), rng.pick(tiers), random_approval(rng))
    for _ in range(60):
        req = rng.pick([UNDEF, None, Num(1), "x"]) if rng.below(5) == 0 else {
            k: v for k, v in (("action", rng.pick(actions)), ("tier", rng.pick(tiers)), ("approval", random_approval(rng)))
            if rng.below(4)}
        try:
            verdicts = [gate.check(get(req, "action"), get(req, "tier"), get(req, "approval")) for _ in range(gate.listeners)]
            first = verdict_fields(verdicts[0]) if verdicts else {}
            rows.append(row("BUS", step=step, req=tok(req), count=len(verdicts), **first))
        except TypeError:
            rows.append(row("BUS", step=step, req=tok(req), error="ApprovalIsNull"))
        step += 1
    for source in sources:
        for approved_by in (APPROVED_BY_STANDIN, ""):
            all_green, results = ShannonGate().self_test(source, "2026-10-17T00:00:00.000Z", approved_by)
            rows.append(row("SELFTEST", source=source_token(source), approved_by=tok(approved_by), all_green=int(all_green),
                            results=";".join(f"{n}:{int(ok)}:{esc(str(d))}" for n, ok, d in results)))
    for anchor, prev in (("FIXTURE-RESTORED-SHANNON-R1-PID-2026-05-19", "seq190-multitrack-rollup"), ("A", ""), ("x|y", "p=q")):
        body, row_hash = fixture_row(anchor, prev, COSIGN_STANDIN)
        rows.append(row("FIXTURE", anchor=esc(anchor), prev_hash=esc(prev), cosign=COSIGN_STANDIN, body=esc(body), row_hash=row_hash))
    header = ("# shannon-boot.hbp from tools/referee.py; do not edit\n"
              "# Mirrors Shannon-and-the-gnns-stage@32f9670 pipeline/shannon-boot.mjs (blob 6ae92778) on one gate's state.\n"
              "# CHECK: checkShannonGate(action, tier, approval) (:69-101), u = argument omitted. BOOT: bootShannon (:38-65) with\n"
              "#   the profile outcome given (not_found:<path> | parse_error:<message> | doc:<field>~<value>,...; bhh =\n"
              "#   resume_packet.last_rotation.brown_hilbert_hash); listeners = shannon:gate:check listeners after the boot.\n"
              "# BUS: emit('shannon:gate:check', req) (:60-63): one verdict per listener (first shown), or the TypeError.\n"
              "# SELFTEST: selfTest (:104-130) on a fresh gate. FIXTURE: emitFixtureRestored's row and row_hash (:138-166).\n"
              f"# Stand-ins (not upstream values): approvedBy {APPROVED_BY_STANDIN} for :118; cosign {COSIGN_STANDIN} for :155.\n")
    return write_rows(header, rows)


# ---- SH pipeline/whiteroom-consumer-index.mjs --------------------------------------------------


def wc_is_whiteroom(env):
    # :27-49
    if not truthy(env) or not isinstance(env, (list, dict)):
        return False
    verb = js_or(get(env, "verb"), get(env, "v"), "")
    body = js_or(get(env, "body"), get(env, "payload"), {})
    if isinstance(verb, str):
        if verb == "EVT-WHITEROOM-DIGESTED" or verb.startswith("EVT-WHITEROOM-DIGESTED-"):
            return False
        if verb == "EVT-WHITEROOM-CONSUMER-ONLINE":
            return False
        if verb == "EVT-WAVE-MUSCULO-ACER-MIRROR-ONLINE":
            return False
    if truthy(body) and isinstance(body, (list, dict)):
        if get(body, "source") == "consumer" and isinstance(get(body, "source"), str):
            return False
        tags = get(body, "tags")
        if isinstance(tags, list) and any(isinstance(t, str) and t == "source:consumer" for t in tags):
            return False
    if isinstance(verb, str) and verb.startswith("EVT-WHITEROOM-"):
        return True
    if truthy(body) and isinstance(body, (list, dict)):
        if isinstance(get(body, "room"), str) and get(body, "room") == "whiteroom":
            return True
        tags = get(body, "tags")
        if isinstance(tags, list) and any(isinstance(t, str) and t == "room:whiteroom" for t in tags):
            return True
    return False


def wc_stable_stringify(v):
    # :104-110
    if v is None or v is UNDEF:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if is_num(v):
        return json_number(v.x)
    if isinstance(v, str):
        return quote_json_string(v)
    if isinstance(v, list):
        return "[" + ",".join(wc_stable_stringify(x) for x in v) + "]"
    keys = sorted(v.keys(), key=lambda k: k.encode("utf-16-be"))
    return "{" + ",".join(quote_json_string(k) + ":" + wc_stable_stringify(v[k]) for k in keys) + "}"


def wc_derive_cube_address(payload):
    # :60-67
    pattern_sha = sha256hex(wc_stable_stringify(payload))
    return pattern_sha, [int(pattern_sha[0:3], 16) % 3, int(pattern_sha[3:4], 16) % 6, int(pattern_sha[4:5], 16) % 6]


def wc_build(env, now_iso):
    # :72-102
    body = js_or(get(env, "body"), get(env, "payload"), {})
    pattern = get(body, "pattern")
    pattern = get(body, "payload") if nullish(pattern) else pattern
    pattern = body if nullish(pattern) else pattern
    pattern_sha, cube = wc_derive_cube_address(pattern)
    source_id = js_or(get(env, "id"), get(env, "event_id"), get(env, "envelope_id"), get(env, "_id"), None)
    return {"proof": pattern_sha[0:16], "pattern_sha": pattern_sha, "cube": cube, "now": now_iso, "source_id": source_id,
            "source_verb": js_or(get(env, "verb"), None)}


def wc_tick(state, messages, send_results, now_sequence):
    # :176-208 (send_results[i] answers the i-th _send; now_sequence[i] the i-th buildDigestionEnvelope)
    if not isinstance(messages, list) or len(messages) == 0:
        return 0
    stamps = [js_or(get(e, "ts"), get(e, "received_at")) for e in messages if wc_is_whiteroom(e)]
    stamps = [s for s in stamps if truthy(s)]
    if stamps:
        kinds = {type(s) for s in stamps} | ({type(state["last_ts"])} if truthy(state["last_ts"]) else set())
        if not kinds <= {str} and not kinds <= {Num} or len(kinds) != 1:
            return "refused"
    processed = []
    for pid in state["processed_ids"]:
        if not any(same_value_zero(p, pid) for p in processed):
            processed.append(pid)
    digested = 0
    sends = iter(send_results)
    nows = iter(now_sequence)
    for env in messages:
        if not wc_is_whiteroom(env):
            continue
        id_ = js_or(get(env, "id"), get(env, "event_id"), get(env, "envelope_id"), get(env, "_id"), None)
        if truthy(id_) and any(same_value_zero(p, id_) for p in processed):
            continue
        wc_build(env, next(nows))
        ok = next(sends)
        if ok:
            digested += 1
            if truthy(id_):
                processed.append(id_)
                if len(processed) > 2000:
                    del processed[0:len(processed) - 2000]
            ts = js_or(get(env, "ts"), get(env, "received_at"))
            if truthy(ts) and (not truthy(state["last_ts"]) or js_greater(ts, state["last_ts"])):
                state["last_ts"] = ts
            state["digested_count"] = (state["digested_count"] or 0) + 1
    if digested > 0:
        state["processed_ids"] = processed
    return digested


VERBS = ["EVT-WHITEROOM-PATTERN", "EVT-WHITEROOM-DIGESTED", "EVT-WHITEROOM-DIGESTED-X", "EVT-WHITEROOM-CONSUMER-ONLINE",
         "EVT-WAVE-MUSCULO-ACER-MIRROR-ONLINE", "EVT-OTHER", "", "EVT-WHITEROOM-", Num(1), None]


def random_envelope(rng, ts_kind="str"):
    if rng.below(12) == 0:
        return rng.pick([UNDEF, None, "EVT-WHITEROOM-X", Num(5), [], ["x"], True])
    env = {}
    if rng.below(3):
        env[rng.pick(["verb", "v"])] = rng.pick(VERBS)
    if rng.below(4):
        kind = rng.below(6)
        if kind == 0:
            body = rng.pick(["text", Num(3), [], None, ""])
        else:
            body = {}
            if rng.below(2):
                body["room"] = rng.pick(["whiteroom", "other", Num(1)])
            if rng.below(2):
                body["tags"] = rng.pick([["room:whiteroom"], ["source:consumer", "room:whiteroom"], ["x"], "room:whiteroom", []])
            if rng.below(3) == 0:
                body["source"] = rng.pick(["consumer", "producer"])
            if rng.below(2):
                body[rng.pick(["pattern", "payload"])] = random_value(rng, 2)
            if rng.below(3) == 0:
                body["other"] = random_value(rng, 1)
        env[rng.pick(["body", "payload"])] = body
    if rng.below(3):
        env[rng.pick(["id", "event_id", "envelope_id", "_id"])] = rng.pick(
            [f"e{rng.below(12)}", f"e{rng.below(12)}", Num(rng.below(4)), "", {}, True])
    if rng.below(3):
        if ts_kind == "str":
            env[rng.pick(["ts", "received_at"])] = rng.pick(["", f"2026-10-17T00:00:{rng.below(60):02d}.000Z", "2026-10-1"])
        else:
            env[rng.pick(["ts", "received_at"])] = Num(rng.below(5) * 1000)
    return env


def consumer_fixture():
    rng = Lcg(0x5EED_0007)
    rows = []
    for _ in range(400):
        env = random_envelope(rng)
        rows.append(row("ISWR", env=tok(env), result=int(wc_is_whiteroom(env))))
    for _ in range(300):
        v = random_value(rng, 3)
        pre = wc_stable_stringify(v)
        sha, cube = wc_derive_cube_address(v)
        rows.append(row("CUBE", payload=tok(v), preimage_sha256=sha, preimage_len=len(pre.encode()), cube=",".join(map(str, cube))))
    for _ in range(200):
        env = random_envelope(rng)
        b = wc_build(env, "2026-10-17T12:00:00.000Z")
        rows.append(row("BUILD", env=tok(env), proof=b["proof"], pattern_sha=b["pattern_sha"], cube=",".join(map(str, b["cube"])),
                        source_id=tok(b["source_id"]), source_verb=tok(b["source_verb"])))
    for data in ({"messages": [], "items": [Num(1)]}, {"messages": [Num(1)]}, {"envelopes": "x"}, {"items": [Num(2)]}, {}, {"messages": "", "envelopes": Num(0)}):
        rows.append(row("POLL", data=tok(data), messages=tok(js_or(get(data, "messages"), get(data, "envelopes"), get(data, "items"), []))))
    scenario = 0
    for ts_kind in ("str", "num", "mixed"):
        for _ in range(40):
            state = {"last_ts": rng.pick([None, "", "2026-10-17T00:00:30.000Z"]) if ts_kind != "num" else rng.pick([None, Num(0), Num(1500)]),
                     "processed_ids": [rng.pick(["e1", "e2", Num(1), {}, "e1"]) for _ in range(rng.below(4))], "digested_count": rng.below(3)}
            for _tick in range(3):
                if ts_kind == "mixed":
                    messages = [random_envelope(rng, rng.pick(["str", "num"])) for _ in range(rng.below(6))]
                else:
                    messages = [random_envelope(rng, ts_kind) for _ in range(rng.below(8))]
                if rng.below(10) == 0:
                    messages = rng.pick([UNDEF, "x", Num(3)])
                sends = [rng.below(4) != 0 for _ in range(len(messages) if isinstance(messages, list) else 0)]
                nows = [f"2026-10-17T01:00:{i:02d}.000Z" for i in range(len(sends))]
                before = tok([state["last_ts"], state["processed_ids"], Num(state["digested_count"])])
                result = wc_tick(state, messages, sends, nows)
                after = tok([state["last_ts"], state["processed_ids"], Num(state["digested_count"])])
                rows.append(row("TICK", scenario=scenario, before=before, messages=tok(messages),
                                sends="".join(str(int(s)) for s in sends) or "-", result=result, after=after))
            scenario += 1
    # The processed-id window (:191-196): 1999 ids, then three new ones.
    state = {"last_ts": None, "processed_ids": [f"p{i}" for i in range(1999)], "digested_count": 0}
    messages = [{"id": f"n{i}", "body": {"room": "whiteroom"}} for i in range(3)]
    before = tok([state["last_ts"], state["processed_ids"], Num(state["digested_count"])])
    result = wc_tick(state, messages, [True] * 3, ["t"] * 3)
    after = tok([state["last_ts"], state["processed_ids"], Num(state["digested_count"])])
    rows.append(row("TICK", scenario=scenario, before=before, messages=tok(messages), sends="111", result=result, after=after))
    header = ("# whiteroom-consumer.hbp from tools/referee.py; do not edit\n"
              "# Mirrors Shannon-and-the-gnns-stage@32f9670 pipeline/whiteroom-consumer-index.mjs (blob e572da93).\n"
              "# ISWR: isWhiteroomEnvelope (:27-49). CUBE: deriveCubeAddress (:60-67): sha256 and byte length of the\n"
              "#   stableStringify pre-image (:104-110; the pre-image itself is not stored), cube [layer, axis1, axis2].\n"
              "# BUILD: buildDigestionEnvelope (:72-102) at nowIso 2026-10-17T12:00:00.000Z. POLL: the message list of :215.\n"
              "# TICK: _tick (:176-208); before/after = [last_ts, processed_ids, digested_count]; sends = the _send result per\n"
              "#   send; result = digested count, or 'refused' when the truthy timestamps compared are not all strings or all\n"
              "#   numbers (outside the port's domain; nothing sent or changed). nowIso of the i-th build is 2026-10-17T01:00:<i>.000Z.\n")
    return write_rows(header, rows)


# ---- main ---------------------------------------------------------------------------------------

FILES = {
    "jsvalue.hbp": js_vectors,
    "whiteroom.hbp": whiteroom_fixture,
    "fabric-thinker.hbp": fabric_fixture,
    "hybrid-harness.hbp": harness_fixture,
    "hookwall.hbp": hookwall_fixture,
    "shannon-boot.hbp": shannon_fixture,
    "whiteroom-consumer.hbp": consumer_fixture,
}


def main():
    check = "--check" in sys.argv[1:]
    status = 0
    for name, build in FILES.items():
        text = build()
        path = FIXTURES / name
        if check:
            committed = path.read_text(encoding="utf-8") if path.exists() else None
            if committed != text:
                print(f"DIFF {path.relative_to(CRATE)}")
                status = 1
            else:
                print(f"OK {path.relative_to(CRATE)} ({text.count(chr(10))} lines)")
        else:
            path.write_text(text, encoding="utf-8")
            print(f"WROTE {path.relative_to(CRATE)} ({text.count(chr(10))} lines)")
    return status


if __name__ == "__main__":
    sys.exit(main())
