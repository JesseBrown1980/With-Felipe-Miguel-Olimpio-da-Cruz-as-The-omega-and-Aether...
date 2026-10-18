#!/usr/bin/env python3
"""Line-by-line stdlib mirror of the vendored PR #124 kernel (asolaria-stone-to-moss@5303c9b2,
experiments/seat1/proxima-rust181/src/lib.rs:11-170): the seven levels, depth 1..7 = 3..2187 cells,
each with HRM fast/slow, MTP-1/2/3 (mtp123), Bobby Fischer (independent_fischer), the Shannon
trit counts, the GNN ring sum and the Chariots, then report().

[--check] [OUT_DIR]
    Rebuilds the text of report() here and requires its sha256 to equal the owner's recorded value
    (SEAT1-R3-INDIVIDUAL-MEMORY-10GYR-RESULTS-20261015.md:14, 3,132 B). With OUT_DIR, also requires
    OUT_DIR/ASOLARIA-PROXIMA-RUST181.hbp (written by `cargo run --release -- OUT_DIR` in the vendored
    crate) to equal it byte for byte, and prints one row per level with every value recomputed.
Integers only. Exits 1 on any difference.
"""
import hashlib
import sys
from pathlib import Path

PINNED_SHA256 = "53257ac9d02e7498a8849f0e258750be24cd7092d851739b3edbf90db97f645d"
PINNED_BYTES = 3132
U128 = 1 << 128

TRITS = [-1, 0, 1]                      # lib.rs:12
N = 81                                  # :13
B_PERIOD = 1_118_465                    # :14
D_PERIOD = 512_338                      # :15
YEAR_SCALED = 36_525_000                # :16
IMAGE_SIZE = (11_086, 11_256)           # :17


def gcd(a, b):                          # :21
    while b != 0:
        a, b = b, a % b
    return a


def powmod(base, n, m):                 # :22-29
    assert m > 0
    value = 1 % m
    base %= m
    while n > 0:
        if n % 2 == 1:
            assert value * base < U128, "bounded modular product"
            value = value * base % m
        n //= 2
        if n > 0:
            assert base * base < U128, "bounded modular square"
            base = base * base % m
    return value


def powmod_decimal(base, exp, m):       # :31-39
    assert exp
    value = 1 % m
    for digit in exp.encode("ascii"):
        assert 48 <= digit <= 57
        ten = powmod(value, 10, m)
        nxt = powmod(base, digit - 48, m)
        assert ten * nxt < U128, "bounded product"
        value = ten * nxt % m
    return value


def orbital_phase(power_residue, period):   # :40-45 -> (n, d)
    factor = gcd(YEAR_SCALED, period)
    d = period // factor
    a = YEAR_SCALED // factor
    return ((power_residue % d) * a) % d, d


def phase_e200(period):                 # :50-54
    d = period // gcd(YEAR_SCALED, period)
    return orbital_phase(powmod_decimal(3, "1" + "0" * 200, d), period)


def decimal_pow3(k):                    # :55-65
    digits = [1]
    for _ in range(k):
        carry = 0
        for i, d in enumerate(digits):
            v = d * 3 + carry
            digits[i] = v % 10
            carry = v // 10
        while carry > 0:
            digits.append(carry % 10)
            carry //= 10
    return "".join(chr(48 + d) for d in reversed(digits))


def ordinal(ts):                        # :66-70
    code = 0
    for trit in ts:
        if trit == -1:
            digit = 0
        elif trit == 0:
            digit = 1
        elif trit == 1:
            digit = 2
        else:
            return None
        code = code * 3 + digit
    return code


def decode(o):                          # :71-76
    if o >= 27:
        return None
    ts = [0, 0, 0]
    for i in (2, 1, 0):
        ts[i] = TRITS[o % 3]
        o //= 3
    return ts


def chariot(forward):                   # :77-84
    path = [13]
    for delta in range(1, 14):
        positive, negative = 13 + delta, 13 - delta
        path.extend([positive, negative] if forward else [negative, positive])
    return path


def gf3_step(s, taps):                  # :85-89
    return [(s[(i + N - taps[0]) % N] + s[(i + N - taps[1]) % N] + s[(i + N - taps[2]) % N]) % 3
            for i in range(N)]


def nilpotent_after_81(taps):           # :90-96
    for origin in range(N):
        s = [0] * N
        s[origin] = 1
        for _ in range(N):
            s = gf3_step(s, taps)
        if any(v != 0 for v in s):
            return False
    return True


def mtp123(exponent, period):           # :100-109 -> [(horizon, predicted, referee, pass)]
    d = period // gcd(YEAR_SCALED, period)
    a = powmod(3, exponent, d)
    b = powmod_decimal(3, str(exponent), d)
    out = []
    for h in (1, 3, 9):
        predicted = orbital_phase((a + h) % d, period)
        referee = orbital_phase((b + h) % d, period)
        out.append((h, predicted, referee, predicted == referee))
    return out


def independent_fischer(depth):         # :110-126
    a, b = chariot(True), chariot(False)
    if len(a) != 27 or len(b) != 27:
        return False
    if len(set(a)) != 27:
        return False
    if not all(x + y == 26 for x, y in zip(a, b)):
        return False
    for original in range(27):
        if ordinal(decode(original)) != original:
            return False
    reference = mtp123(depth, B_PERIOD)
    if not all(m[3] for m in reference):
        return False
    pn, pd = reference[0][1]
    forged = ((pn + 1) % pd, pd)
    if forged == reference[0][2]:
        return False
    if ordinal(decode(0)) == 1:
        return False
    return True


def sign(v):
    return (v > 0) - (v < 0)


def level(depth):                       # :133-149
    assert 1 <= depth <= 7
    cells = 3 ** depth
    ts = [TRITS[(i + i // 3 + i // 9) % 3] for i in range(cells)]
    counts = [0, 0, 0]
    for t in ts:
        counts[t + 1] += 1
    hrm_fast = sum(ts)
    hrm_slow = sum(sign(sum(ts[j:j + 3])) for j in range(0, cells, 3))
    gnn = sum(ts[i] * ts[(i + 1) % cells] for i in range(cells))
    mtp_pass = sum(1 for m in mtp123(depth, B_PERIOD) + mtp123(depth, D_PERIOD) if m[3])
    return dict(depth=depth, cells=cells, counts=counts, hrm_fast=hrm_fast, hrm_slow=hrm_slow,
                gnn=gnn, mtp_pass=mtp_pass, fischer=independent_fischer(depth),
                chariot_forward=len(chariot(True)), chariot_backward=len(chariot(False)))


def rust_bool(b):
    return "true" if b else "false"


def report():                           # :150-170
    lines = [
        "HBP1|schema=ASOLARIA-PROXIMA-RUST181-R1|field=GF3|trits=-1,0,+1|float_used=0|scope=COMPUTATIONAL_ONLY|json=0",
        "CONSTELLATION|verified_planetary_objects=star,b,d|candidate_c=EXCLUDED|star_field_pixels_not_loaded=TRUE|json=0",
        f"IMAGE|width={IMAGE_SIZE[0]}|height={IMAGE_SIZE[1]}|pixel_sites={IMAGE_SIZE[0] * IMAGE_SIZE[1]}|source_bands=B,R,I|calibrated_seven_wavelengths=NO|json=0",
        "SOURCE|learning_contract=Asolaria_July03_HRM_MTP_Fischer_Shannon_GNN_GULP|chariots=seat5_r13|neural_contract=ASOLARIA_AS_NEURAL_NETWORK|raw_photon_capture=NO|json=0",
    ]
    levels = []
    for depth in range(1, 8):
        lv = level(depth)
        levels.append(lv)
        lines.append(
            f"LEVEL|depth={lv['depth']}|nodes={lv['cells']}|wave_years={decimal_pow3(depth)}|HRM_fast={lv['hrm_fast']}|HRM_slow={lv['hrm_slow']}"
            f"|MTP1=PASS|MTP2=PASS|MTP3=PASS|MTP_checks={lv['mtp_pass']}|BobbyFischer={'PASS' if lv['fischer'] else 'FAIL'}"
            f"|Shannon_negative={lv['counts'][0]}|Shannon_zero={lv['counts'][1]}|Shannon_positive={lv['counts'][2]}|GNN_cycle={lv['gnn']}"
            f"|GULP_note=NOTE-level-{depth}-HRM-MTP123-Fischer-Shannon-GNN|ChariotForward={lv['chariot_forward']}"
            f"|ChariotReverse={lv['chariot_backward']}|rainbow=SYMBOLIC_NOT_CALIBRATED|json=0")
    lines.append(f"GF3|original_taps_013_81_nilpotent={rust_bool(nilpotent_after_81([0, 1, 3]))}"
                 f"|original_taps_047_81_nilpotent={rust_bool(nilpotent_after_81([0, 4, 7]))}"
                 "|invertible_expanded_phase_distinct=TRUE|json=0")
    b, d = phase_e200(B_PERIOD), phase_e200(D_PERIOD)
    lines.append(f"E200|horizon=3^(10^200)|b_phase={b[0]}/{b[1]}|d_phase={d[0]}/{d[1]}|symbolic_exponent_no_full_run=TRUE|json=0")
    lines.append("BOUNDARY|HTTP0=static_local_html|no_network_required=TRUE|no_physical_image_pixels_loaded=TRUE|no_genuine_spectrometer=TRUE|no_measured_life_or_consciousness=TRUE|json=0")
    return "\n".join(lines) + "\n", levels


def main():
    args = [a for a in sys.argv[1:] if a != "--check"]
    text, levels = report()
    data = text.encode("ascii")
    sha = hashlib.sha256(data).hexdigest()
    failures = []
    ok = sha == PINNED_SHA256 and len(data) == PINNED_BYTES
    print(f"CHECK|name=mirror_vs_pinned|ok={int(ok)}|sha256={sha}|bytes={len(data)}|json=0")
    if not ok:
        failures.append("mirror_vs_pinned")
    for lv in levels:
        print(f"LEVELMIRROR|depth={lv['depth']}|cells={lv['cells']}|HRM_fast={lv['hrm_fast']}|HRM_slow={lv['hrm_slow']}"
              f"|MTP_checks={lv['mtp_pass']}|BobbyFischer={int(lv['fischer'])}|counts={lv['counts'][0]},{lv['counts'][1]},{lv['counts'][2]}"
              f"|GNN_cycle={lv['gnn']}|json=0")
    if args:
        rust = (Path(args[0]) / "ASOLARIA-PROXIMA-RUST181.hbp").read_bytes()
        same = rust == data
        print(f"CHECK|name=rust_vs_mirror|ok={int(same)}|sha256={hashlib.sha256(rust).hexdigest()}|bytes={len(rust)}|json=0")
        if not same:
            failures.append("rust_vs_mirror")
    print(f"RESULT|failures={len(failures)}|json=0")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
