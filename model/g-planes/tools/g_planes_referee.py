#!/usr/bin/env python3
# Stdlib referee for model/g-planes, integer arithmetic only (no float anywhere).
# Mirrors line by line: glsm.mjs:40-76 (transition), gnn-edge-mining.mjs:30-35 (popcount16) and
# gnn-forward-genius.mjs:30-68 (hexHamming, popcount, scoreEnvelope, pathPid), fnns@c4b2458 src/planes/.
# A JavaScript number is its IEEE-754 binary64 bit pattern. Each JS operation is computed as an exact
# rational (fractions.Fraction over ints) and rounded once to the nearest binary64, ties to even;
# a JS comparison of finite doubles is the exact rational comparison.
# Writes tests/fixtures/g-planes-referee.hbp, which tests/referee.rs runs the Rust port against.
#   --check            regenerate and diff against the committed fixture
#   --upstream DIR     also verify the sha256 of the mirrored upstream files under DIR (an fnns clone)
import hashlib
import sys
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURE = ROOT / "tests" / "fixtures" / "g-planes-referee.hbp"

UPSTREAM_SHA256 = {
    "src/planes/glsm.mjs": "45b6f984bfb9e2cc2e792cfbbede0dea9e90e6571c54d2d966d5850af23c848e",
    "src/planes/gnn-edge-mining.mjs": "44a72b29c39677867d11c9d1bea9877d22444a7e30ed4102fc32e20b78f2addd",
    "src/planes/gnn-forward-genius.mjs": "4127bd1126a1709bf8897c7742dd4964f1bcc9ed65036c7683b934b95c24b4ee",
}

# ---- binary64 bit patterns as integers --------------------------------------------------------
SIGN = 1 << 63
FRACTION_BITS = 52
EXPONENT_ALL_ONES = 0x7FF


def is_finite(bits):
    return (bits >> FRACTION_BITS) & EXPONENT_ALL_ONES != EXPONENT_ALL_ONES


def decode(bits):
    # Exact value of a finite binary64 bit pattern.
    biased = (bits >> FRACTION_BITS) & EXPONENT_ALL_ONES
    fraction = bits & ((1 << FRACTION_BITS) - 1)
    if biased == 0:
        significand, exponent = fraction, -1074
    else:
        significand, exponent = fraction | (1 << FRACTION_BITS), biased - 1075
    value = Fraction(significand) * Fraction(2) ** exponent
    return -value if bits & SIGN else value


def pow2_at_most(n, d, e):
    # 2^e <= n/d for positive integers n, d.
    return (d << e) <= n if e >= 0 else d <= (n << -e)


def round_binary64(q):
    # Nearest binary64 to the exact rational q, ties to even; zero is +0, overflow is infinity.
    if q == 0:
        return 0
    sign = SIGN if q < 0 else 0
    n, d = abs(q.numerator), q.denominator
    e = n.bit_length() - d.bit_length()
    if not pow2_at_most(n, d, e):
        e -= 1
    quantum = max(e - FRACTION_BITS, -1074)
    num, den = (n, d << quantum) if quantum >= 0 else (n << -quantum, d)
    m, r = divmod(num, den)
    if 2 * r > den or (2 * r == den and m & 1):
        m += 1
    if m == 1 << (FRACTION_BITS + 1):
        m >>= 1
        quantum += 1
    if m < (1 << FRACTION_BITS):
        return sign | m  # subnormal
    biased = quantum + 1075
    if biased >= EXPONENT_ALL_ONES:
        return sign | (EXPONENT_ALL_ONES << FRACTION_BITS)
    return sign | (biased << FRACTION_BITS) | (m - (1 << FRACTION_BITS))


def decimal_parts(text):
    # A JS decimal literal as (negative, units, digits) with value units / 10^digits.
    q = Fraction(text)
    digits = 0
    while (q * 10**digits).denominator != 1:
        digits += 1
    units = abs(q * 10**digits).numerator
    return q < 0, units, digits


def literal(text):
    # The double JavaScript parses from a numeric literal.
    return round_binary64(Fraction(text))


def js_mul(a, b):
    return round_binary64(decode(a) * decode(b))


def js_add(a, b):
    return round_binary64(decode(a) + decode(b))


assert literal("0.5") == 0x3FE0000000000000
assert literal("0.1") == 0x3FB999999999999A
assert literal("0.3") == 0x3FD3333333333333
assert literal("0.7") == 0x3FE6666666666666
assert round_binary64(Fraction(1, 2**1074)) == 1
assert round_binary64(Fraction(1, 2**1075)) == 0
assert round_binary64(Fraction(3, 2**1076)) == 1
assert round_binary64(Fraction(2) ** 1024) == 0x7FF0000000000000

# ---- glsm.mjs:31-76 ----------------------------------------------------------------------------
LATENT_STATES = ["DESCRIBED", "EDGE_MINED", "PATH_FOUND", "MISTAKE_FLAGGED", "CONVERGED"]
TAU_PATH = literal("0.5")
TAU_GAIN = literal("0.5")


def is_finite_num(x):
    # glsm.mjs:48-50; None is a value whose typeof is not 'number'.
    return x is not None and is_finite(x)


def transition(prev_state, edge_weight, path_confidence, reverse_gain):
    if prev_state not in LATENT_STATES:
        return "DESCRIBED"
    if not is_finite_num(edge_weight) or not is_finite_num(path_confidence) or not is_finite_num(reverse_gain):
        return prev_state
    if prev_state == "CONVERGED":
        return "CONVERGED"
    if prev_state == "DESCRIBED":
        return "EDGE_MINED" if decode(edge_weight) > 0 else "DESCRIBED"
    if prev_state == "EDGE_MINED":
        return "PATH_FOUND" if decode(path_confidence) >= decode(TAU_PATH) else "EDGE_MINED"
    if prev_state == "PATH_FOUND":
        if decode(reverse_gain) < 0:
            return "MISTAKE_FLAGGED"
        if decode(reverse_gain) >= decode(TAU_GAIN):
            return "CONVERGED"
        return "PATH_FOUND"
    if prev_state == "MISTAKE_FLAGGED":
        return "PATH_FOUND" if decode(path_confidence) >= decode(TAU_PATH) else "MISTAKE_FLAGGED"
    return prev_state


# Labelled inputs: None is a non-number; ("bits", n) is a raw pattern; a string is a JS literal.
VALUES = [
    ("nn", None),
    ("nan", ("bits", 0x7FF8000000000000)),
    ("pinf", ("bits", 0x7FF0000000000000)),
    ("ninf", ("bits", 0xFFF0000000000000)),
    ("nzero", ("bits", SIGN)),
    ("zero", "0"),
    ("psub", ("bits", 0x0000000000000001)),
    ("nsub", ("bits", SIGN | 0x0000000000000001)),
    ("below_half", ("bits", 0x3FDFFFFFFFFFFFFF)),
    ("half", "0.5"),
    ("above_half", ("bits", 0x3FE0000000000001)),
    ("one", "1"),
    ("m_one", "-1"),
    ("e_6", "1e-6"),
    ("e_4", "1e-4"),
    ("m_e_4", "-1e-4"),
    ("m4e_5", "-4e-5"),
    ("m386e_7", "-3.86e-5"),
    ("p4999848", "0.4999848"),
    ("p49999", "0.49999"),
    ("p4999", "0.4999"),
    ("p0_1", "0.1"),
    ("p0_7", "0.7"),
    ("p0_8", "0.8"),
    ("p0_9", "0.9"),
    ("m0_3", "-0.3"),
]
CORE = ["nn", "nan", "ninf", "nsub", "nzero", "psub", "below_half", "half"]
BACKGROUNDS = ["half", "zero"]
# glsm.mjs:148-159 selfTest walk: (edge_weight, path_confidence, reverse_gain, expect).
WALK = [
    ("p0_8", "p0_1", "zero", "EDGE_MINED"),
    ("p0_8", "p0_7", "zero", "PATH_FOUND"),
    ("p0_8", "p0_7", "m0_3", "MISTAKE_FLAGGED"),
    ("p0_9", "p0_9", "p0_1", "PATH_FOUND"),
    ("p0_9", "p0_9", "p0_8", "CONVERGED"),
]


def value_bits():
    out = {}
    for label, source in VALUES:
        if source is None:
            out[label] = None
        elif isinstance(source, tuple):
            out[label] = source[1]
        else:
            out[label] = literal(source)
    return out


def jsnum_rows(bits_of):
    rows = []
    for label, source in VALUES:
        if source is None:
            rows.append(f"JSNUM|label={label}|bits=none")
        elif isinstance(source, tuple):
            rows.append(f"JSNUM|label={label}|bits={bits_of[label]:016x}")
        else:
            negative, units, digits = decimal_parts(source)
            sign = "-" if negative else "+"
            rows.append(
                f"JSNUM|label={label}|bits={bits_of[label]:016x}|literal={source}|sign={sign}|units={units}|digits={digits}"
            )
    return rows


def glsm_row(kind, prev, ew, pc, rg, bits_of):
    nxt = transition(prev, bits_of[ew], bits_of[pc], bits_of[rg])
    return f"{kind}|prev={prev}|ew={ew}|pc={pc}|rg={rg}|next={nxt}"


def glsm_rows(bits_of):
    rows = []
    for prev in LATENT_STATES:
        for ew in CORE:
            for pc in CORE:
                for rg in CORE:
                    rows.append(glsm_row("GLSM-T", prev, ew, pc, rg, bits_of))
    labels = [label for label, _ in VALUES]
    for prev in LATENT_STATES:
        for axis in range(3):
            for background in BACKGROUNDS:
                for label in labels:
                    inputs = [background, background, background]
                    inputs[axis] = label
                    rows.append(glsm_row("GLSM-T", prev, *inputs, bits_of))
    return rows


def walk_rows(bits_of):
    rows = []
    state = "DESCRIBED"
    for ew, pc, rg, expect in WALK:
        row = glsm_row("GLSM-WALK", state, ew, pc, rg, bits_of)
        state = transition(state, bits_of[ew], bits_of[pc], bits_of[rg])
        if state != expect:
            raise SystemExit(f"selfTest walk diverges from glsm.mjs:148-159 at {row}")
        rows.append(row)
    return rows


# ---- gnn-edge-mining.mjs:30-35, gnn-forward-genius.mjs:30-68 -----------------------------------
HEX_DIGITS = "0123456789abcdefABCDEF"
MAX_SAFE_INTEGER = 2**53 - 1


def js_code_units(s):
    data = s.encode("utf-16-le", "surrogatepass")
    return [data[i] | (data[i + 1] << 8) for i in range(0, len(data), 2)]


def parse_int_16(unit):
    # parseInt(<one code unit>, 16); None is NaN.
    ch = chr(unit)
    return int(ch, 16) if ch in HEX_DIGITS else None


def to_int32(x):
    return 0 if x is None else x


def popcount(bitstr):
    return sum(1 for unit in js_code_units(bitstr) if unit == ord("1"))


def hex_hamming(a, b):
    ua, ub = js_code_units(a), js_code_units(b)
    if not ua or not ub or len(ua) != len(ub):
        return 0, 0
    bits = 0
    match = 0
    for i in range(len(ua)):
        x = parse_int_16(ua[i])
        y = parse_int_16(ub[i])
        diff = to_int32(x) ^ to_int32(y)
        same = 4
        while diff:
            same -= diff & 1
            diff >>= 1
        match += same
        bits += 4
    return match, bits


def hex_hamming_value(match, bits):
    return 0 if bits == 0 else round_binary64(Fraction(match, bits))


def score_envelope(js_quant, authority_quant, seed_js_quant):
    sim = hex_hamming_value(*hex_hamming(js_quant, seed_js_quant))
    auth_bits = popcount(authority_quant)
    auth = round_binary64(Fraction(auth_bits, 16))
    return js_add(js_mul(literal("0.7"), sim), js_mul(literal("0.3"), auth))


def path_pid(rooms):
    if any(abs(r) > MAX_SAFE_INTEGER for r in rooms):
        return None
    tag = "-".join(str(r) for r in rooms)
    return f"G2-FWD-GENIUS-PATH-{tag}-PID-2026-05-19"


# ---- deterministic inputs (sha256 counter stream) -----------------------------------------------
def byte_stream(tag):
    counter = 0
    while True:
        yield from hashlib.sha256(f"{tag}|{counter}".encode()).digest()
        counter += 1


def pick_string(stream, alphabet, length):
    return "".join(alphabet[next(stream) % len(alphabet)] for _ in range(length))


LOWER_HEX = "0123456789abcdef"
MIXED = list("0123456789abcdefABCDEFgGxz -+1") + ["é", " ", "　", "\U0001F600", "０", "٣"]
BITS_ALPHABET = list("0101010110") + ["é", "\U0001F600", "x"]
EDGE_PAIRS = [
    ("", ""),
    ("", "00"),
    ("0", ""),
    ("fff", "ffff"),
    ("ffff", "ffff"),
    ("0000", "ffff"),
    ("0g", "00"),
    ("é", "00"),
    ("é", "0"),
    ("\U0001F600", "00"),
    ("G", "0"),
    (" ", "0"),
    ("-", "0"),
    ("+", "0"),
    ("A", "a"),
    ("Ff", "fF"),
    ("０", "0"),
    ("٣", "3"),
    ("b6168a849fd8ffec", "7b45831f36730f67"),
]


def hexh_pairs():
    pairs = list(EDGE_PAIRS)
    s = byte_stream("hexh-16")
    for _ in range(300):
        pairs.append((pick_string(s, LOWER_HEX, 16), pick_string(s, LOWER_HEX, 16)))
    s = byte_stream("hexh-mixed")
    for _ in range(200):
        n = next(s) % 13
        m = n if next(s) % 2 else next(s) % 13
        pairs.append((pick_string(s, MIXED, n), pick_string(s, MIXED, m)))
    return pairs


def popc_strings():
    out = ["", "1", "0", "1111111111111111", "0000000000000000", "\U0001F6001"]
    s = byte_stream("popc")
    for _ in range(200):
        out.append(pick_string(s, BITS_ALPHABET, next(s) % 21))
    return out


def score_triples():
    out = [("", "", ""), ("ffff", "1111", "ffff"), ("0000", "", "ffff")]
    s = byte_stream("score")
    for i in range(200):
        js = pick_string(s, LOWER_HEX, 16)
        seed = js if i % 10 == 0 else pick_string(s, LOWER_HEX, 16)
        auth = pick_string(s, "01", 16 if i % 4 else next(s) % 21)
        out.append((js, auth, seed))
    return out


PATH_ROOMS = [
    [],
    [0],
    [1, 2, 3],
    [100, 101, 102, 103, 104, 105, 106],
    [-5, 7],
    [MAX_SAFE_INTEGER],
    [-MAX_SAFE_INTEGER, 1],
    [MAX_SAFE_INTEGER + 1],
    [3, -(MAX_SAFE_INTEGER + 1)],
]


def hx(s):
    return s.encode("utf-8").hex()


def leaf_rows():
    rows = []
    for a, b in hexh_pairs():
        match, bits = hex_hamming(a, b)
        rows.append(f"HEXH|a={hx(a)}|b={hx(b)}|match={match}|bits={bits}|value={hex_hamming_value(match, bits):016x}")
    for text in popc_strings():
        rows.append(f"POPC|s={hx(text)}|n={popcount(text)}")
    for js, auth, seed in score_triples():
        rows.append(f"SCORE|js={hx(js)}|auth={hx(auth)}|seed={hx(seed)}|value={score_envelope(js, auth, seed):016x}")
    for rooms in PATH_ROOMS:
        pid = path_pid(rooms)
        rows.append(f"PATHPID|rooms={','.join(str(r) for r in rooms)}|pid={'none' if pid is None else pid}")
    return rows


def render():
    bits_of = value_bits()
    sections = [jsnum_rows(bits_of), glsm_rows(bits_of), walk_rows(bits_of), leaf_rows()]
    body = [row for section in sections for row in section]
    counts = {}
    for row in body:
        kind = row.split("|", 1)[0]
        counts[kind] = counts.get(kind, 0) + 1
    header = "HBPv1|G-PLANES-REFEREE|rows=" + str(len(body)) + "".join(
        f"|{kind.lower()}={n}" for kind, n in counts.items()
    )
    return header + "\n" + "\n".join(body) + "\n", len(body)


def check_upstream(directory):
    root = Path(directory)
    for rel, expected in UPSTREAM_SHA256.items():
        got = hashlib.sha256((root / rel).read_bytes()).hexdigest()
        if got != expected:
            raise SystemExit(f"upstream sha256 differs for {rel}: {got}")
    print(f"OK upstream sha256: {len(UPSTREAM_SHA256)} files under {root}")


def main():
    args = sys.argv[1:]
    if "--upstream" in args:
        check_upstream(args[args.index("--upstream") + 1])
    text, n = render()
    if "--check" in args:
        if not FIXTURE.exists():
            raise SystemExit(f"missing fixture {FIXTURE}")
        if FIXTURE.read_text(encoding="utf-8") != text:
            raise SystemExit("g-planes-referee.hbp does not match the referee")
        print(f"OK g-planes referee --check: {n} rows")
        return
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(text, encoding="utf-8")
    print(f"wrote {FIXTURE} ({n} rows)")


if __name__ == "__main__":
    main()
