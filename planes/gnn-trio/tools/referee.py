#!/usr/bin/env python3
"""Independent stdlib referee for the public G-plane trio.

Mirrors the ported pieces with integer arithmetic only (OWNER-RULES 4) and writes the HBP fixture in
tests/fixtures/ that tests/referee.rs checks the Rust port against. No Python float is used: decimals
and integers are rounded to their IEEE-754 binary64 bit pattern with integer arithmetic, mirroring
asolaria-l0-edge `Dbl`. SHA-256 (hashlib) is a byte function, not a float statistic.

The ported Node lane (omniquant / quant-bus / bpi-codec) cannot be driven here: omniquant needs the
external HyperBEHCS engine, quant-bus imports it, and bpi-codec reads the BEHCS-1024 alphabet file at
import. So the independent oracle is this integer mirror over synthetic inputs.

  python3 -I tools/referee.py            # (re)generate the fixture
  python3 -I tools/referee.py --check    # regenerate in memory, diff against the committed fixture

Every mask token used here is read from data/example-mask-glyphs.txt (the synthetic demo set); no real
identifier appears in this referee or its fixture.
"""

import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIX = os.path.join(ROOT, "tests", "fixtures")
DATA = os.path.join(ROOT, "data", "example-mask-glyphs.txt")

# --- IEEE-754 binary64, integer arithmetic (mirrors l0-edge Dbl) ------------

MANT_BITS = 53


def round_to_double(q, sticky, exp):
    if q == 0:
        return (0, 0)
    length = q.bit_length()
    if length <= MANT_BITS:
        shift = MANT_BITS - length
        return (q << shift, exp - shift)
    shift = length - MANT_BITS
    mant = q >> shift
    rest = q & ((1 << shift) - 1)
    half = 1 << (shift - 1)
    if rest > half or (rest == half and (sticky or (mant & 1) == 1)):
        mant += 1
    exp2 = exp + shift
    if mant == (1 << MANT_BITS):
        mant >>= 1
        exp2 += 1
    return (mant, exp2)


def ratio(num, den, exp=0):
    if num == 0:
        return (0, 0)
    shift = (56 + den.bit_length()) - num.bit_length()
    if shift < 0:
        shift = 0
    scaled = num << shift
    return round_to_double(scaled // den, (scaled % den) != 0, exp - shift)


def bits_nonneg(mant_exp):
    mant, exp2 = mant_exp
    if mant == 0:
        return 0
    biased = exp2 + 52 + 1023
    assert 1 <= biased < 2047, "value outside the normal range"
    return (biased << 52) | (mant & ((1 << 52) - 1))


def decimal_bits(units, digits):
    return bits_nonneg(ratio(units, 10 ** digits))


def int_bits(n):
    mag = bits_nonneg(round_to_double(abs(n), False, 0))
    return mag | (1 << 63) if n < 0 else mag


def hex16(bits):
    return "%016x" % bits


SIGN_BIT = 1 << 63

# --- HBP row text (matches tests/common/mod.rs reader + gulp-watchers esc) ---


def esc(s):
    out = []
    for ch in s:
        u = ord(ch)
        if u < 0x20 or u == 0x7F or ch in "% |=":
            out.append("%%%02X" % u)
        else:
            out.append(ch)
    return "".join(out)


def row(kind, *fields):
    return kind + "".join("|%s=%s" % (k, esc(str(v))) for k, v in fields)


# --- mask set (synthetic demo set, read from the shipped data file) ---------


def load_mask_set(path):
    glyphs = set()
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            t = line.strip()
            if t and not t.startswith("#"):
                glyphs.add(t)
    return glyphs


# --- the four ported pieces -------------------------------------------------


def reverse_gain_bits(units, digits, is_mask):
    bits = decimal_bits(units, digits)
    return bits ^ SIGN_BIT if is_mask else bits


AUTHORITY_FIELDS = [
    "op_jesse", "op_rayssa", "shannon", "hermes", "artemis", "big_pickle",
    "omniflywheel", "omnispindle", "connor", "pi", "opencode", "space_deck",
    "space_agent", "foundation", "quintuple", "fabric",
]


def authority_quant(on_names):
    return "".join("1" if f in on_names else "0" for f in AUTHORITY_FIELDS)


def frame_escape(s):
    return s.replace("\\", "\\\\").replace("|", "\\|")


def encode_frame(tag, fields):
    parts = [tag] + [frame_escape(f) for f in fields]
    body = "|".join(parts)
    sha = hashlib.sha256(body.encode("utf-8")).hexdigest()[:8]
    return body + "|" + sha


# --- fixture generation -----------------------------------------------------


def build():
    mask = load_mask_set(DATA)
    lines = []
    lines.append("# gnn-trio referee fixture — integer mirror over synthetic inputs only.")
    lines.append("# RVGN: G3 reverse-gain sign flip. VEC: omniquant vector_from_envelope.")
    lines.append("# AUTH: quant-bus authority_quant. FRAME: bpi-codec encode_frame.")

    # RVGN — reverse_gain(sign * jl_distance) over synthetic glyphs + supplied demo magnitudes.
    # Three mirror the self_test walk; the rest exercise more of the synthetic set and magnitudes.
    rvgn = [
        ("synthetic-adversary-0001", 25, 1),
        ("synthetic-honest-leak-0001", 25, 1),
        ("synthetic-honest-leak-0002", 712, 3),
        ("example-mask-token-a", 1, 0),
        ("synthetic-mask-01@example.com", 10000, 0),
        ("phone-synthetic-1-555-0101", 333, 2),
        ("example-vpn-profile-synthetic-01", 1, 3),
        ("demo-workspace-profile-synthetic", 65535, 0),
        ("not-in-the-set-honest", 9999, 4),
        ("another-honest-glyph", 2, 0),
    ]
    for glyph, units, digits in rvgn:
        is_mask = glyph in mask
        sign = -1 if is_mask else 1
        score = reverse_gain_bits(units, digits, is_mask)
        lines.append(row(
            "RVGN",
            ("glyph", glyph),
            ("units", units),
            ("digits", digits),
            ("mask", 1 if is_mask else 0),
            ("sign", sign),
            ("score", hex16(score)),
        ))

    # VEC — vector_from_envelope: eight META fields, absent as 0.
    envs = [
        (42, 50042, 7777, 1234, 256, 1, 1715000000000, 99),
        (7, 50007, 7000, 50, 8, 1, 1715000001000, 100),
        (0, 0, 0, 0, 0, 0, 0, 0),
    ]
    for (room_id, port_outer, port_inner, elapsed_ms, stdout_len, ok, ts_ms, job_seq) in envs:
        vals = [room_id, port_outer, port_inner, elapsed_ms, stdout_len, ok, ts_ms, job_seq]
        fields = [
            ("room_id", room_id), ("port_outer", port_outer), ("port_inner", port_inner),
            ("elapsed_ms", elapsed_ms), ("stdout_len", stdout_len), ("ok", ok),
            ("ts_ms", ts_ms), ("job_seq", job_seq),
        ]
        fields += [("b%d" % i, hex16(int_bits(v))) for i, v in enumerate(vals)]
        lines.append(row("VEC", *fields))

    # AUTH — authority_quant bitmask (comma-joined on-names; empty allowed).
    auths = [
        ["op_jesse", "shannon", "hermes"],
        ["quintuple", "fabric"],
        ["connor"],
        ["not-a-field"],
        [],
    ]
    for on in auths:
        lines.append(row("AUTH", ("on", ",".join(on)), ("mask", authority_quant(on))))

    # FRAME — encode_frame. n + f0..f{n-1} + the expected frame string.
    frames = [
        ("RVGN", ["g", "+1", "2.5"]),
        ("FAOR", ["opencode-bp", "42", "rev-abc"]),
        ("T", ["a|b"]),                     # escaped pipe: tests encode escaping
        ("HBP", ["x\\y", "z"]),             # escaped backslash
    ]
    for tag, fields in frames:
        want = encode_frame(tag, fields)
        cols = [("tag", tag), ("n", len(fields))]
        cols += [("f%d" % i, f) for i, f in enumerate(fields)]
        cols.append(("want", want))
        lines.append(row("FRAME", *cols))

    return "\n".join(lines) + "\n"


def main():
    text = build()
    target = os.path.join(FIX, "gnn-trio-referee.hbp")
    if "--check" in sys.argv[1:]:
        with open(target, "r", encoding="utf-8") as fh:
            have = fh.read()
        if have != text:
            sys.stderr.write("referee fixture out of date; run: python3 -I tools/referee.py\n")
            return 1
        sys.stdout.write("fixture up to date\n")
        return 0
    os.makedirs(FIX, exist_ok=True)
    with open(target, "w", encoding="utf-8") as fh:
        fh.write(text)
    sys.stdout.write("wrote %s\n" % target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
