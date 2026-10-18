#!/usr/bin/env python3
"""Deterministic (seeded) generator of Fischer input cases as host8 HBP field lines.

Each line is a `|`-separated `key=value` envelope/score input of the kind the host8
`--eval` route and the upstream-fixture binary both parse. Coverage spans every verb
class, pid presence/prefix, all G4 states, the Shannon 0.92 boundary, payload bloat,
and the hard-floor + negative-modifier combinations that separate the two Fischer
variants. The rows of `tail()` follow the seeded rows, so the first 2018 lines are
unchanged; they cover each place the FED port and the Node kernel give different rows
(fischer_referee.PORT_POINTS), the FED field parsing the referee mirrors, and the case-file
skip rule. Every line stays under the 128 KiB argv limit that measure_ae.py runs into.
Standard library only.
"""

import importlib.util
import os
import random
import sys

_spec = importlib.util.spec_from_file_location(
    "fischer_referee", os.path.join(os.path.dirname(os.path.abspath(__file__)), "fischer_referee.py"))
fr = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fr)

VERBS = [
    "tick", "evaluate", "observe",            # neutral
    "write", "delete", "upsert", "drop", "migrate", "seal",  # write
    "compact", "gc", "drain", "prune", "archive",            # compact
    "spawn", "scale", "mint", "fork", "launch", "bootstrap", # spawn
    "promote", "authorize", "cosign",                        # cosign-required
    "self_authorize", "bypass_hookwall", "recursive_consent",
    "force_promote", "skip_cosign", "delete_evidence",
    "disable_halt", "grant_authority",                       # refuted
    "",                                                      # missing verb
]
G4_STATES = ["DESCRIBED", "EDGE_MINED", "PATH_FOUND", "CONVERGED", "MISTAKE_FLAGGED", "UNKNOWN", "WOBBLE"]
SHANNON = ["0.50", "0.90", "0.92", "0.9200", "0.9201", "0.9205", "0.93", "1", "1.0005", None]
PID_MODES = ["bh_prefixed", "non_bh", "absent", "bh_field", "empty"]


def _binary64(num, den):
    """(n, k) with n / 2**k the binary64 nearest num/den, for 0 < num/den < 1."""
    k = 0
    while (num << k) < (den << 52):
        k += 1
    n = fr.nearest_int_half_even(num << k, den)
    return (n >> 1, k - 1) if n == 1 << 53 else (n, k)


def chance(rng, num, den):
    """`rng.random() < num/den` in integers: CPython random() is ((w1 >> 5) * 2**26 + (w2 >> 6)) / 2**53
    over two 32-bit draws, compared with the binary64 nearest num/den (same draws, same answers)."""
    x = ((rng.getrandbits(32) >> 5) << 26) | (rng.getrandbits(32) >> 6)
    n, k = _binary64(num, den)
    return (x << k) < (n << 53)


def one(rng, i):
    f = []
    mode = rng.choice(PID_MODES)
    if mode == "bh_prefixed":
        f.append("pid=BH.SEED.%06d" % i)
    elif mode == "non_bh":
        f.append("pid=SEED.%06d" % i)
    elif mode == "bh_field":
        f.append("bh=BH.VIA.BH.%06d" % i)
    elif mode == "empty":
        f.append("pid=")
    # "absent": no pid and no bh field at all

    verb = rng.choice(VERBS)
    f.append("verb=%s" % verb)
    f.append("target=%s" % rng.choice(["fabric", "white_room", "ledger"]))

    # proof paths (any present => has_proof_path)
    if chance(rng, 55, 100):
        f.append("hbp_path=ledger/seed-%06d.hbp" % i)
    if chance(rng, 2, 10):
        f.append("sidecar_plan=plan-%06d" % i)
    if chance(rng, 2, 10):
        f.append("ledger_path=ledger/seed-%06d.hbp" % i)

    if chance(rng, 5, 10):
        f.append("halt_path=/halt")
    if chance(rng, 4, 10):
        f.append("cosign=ring:%06d" % i)
    if chance(rng, 25, 100):
        f.append("authority_jump=1")
    if chance(rng, 2, 10):
        f.append("recursive_consent=1")
    if chance(rng, 2, 10):
        f.append("operator_witness_required=1")
    if chance(rng, 5, 10):
        f.append("operator_witness=1")
    if chance(rng, 3, 10):
        f.append("tuple=T%06d" % i)
    if chance(rng, 3, 10):
        f.append("cube_47d=C%06d" % i)
    if chance(rng, 5, 10):
        f.append("l0_real=1")
    if chance(rng, 15, 100):
        f.append("payload_json=1")

    sh = rng.choice(SHANNON)
    if sh is not None:
        f.append("shannon=%s" % sh)
    if chance(rng, 1, 10):
        f.append("shannon_q=%d" % rng.choice([0, 500, 920, 921, 1000]))

    f.append("g4_state=%s" % rng.choice(G4_STATES))
    f.append("composite=%s" % rng.choice(["0", "0.40", "0.85", "0.97"]))
    if chance(rng, 3, 10):
        f.append("strict=1")
    if chance(rng, 8, 100):
        f.append("payload=%s" % ("p" * 70000))  # > 64 KiB bloat
    return "|".join(f)


def targeted():
    # Deterministic rows that force a positive hard floor together with a negative
    # G4 modifier (the exact combination the two variants treat differently), plus
    # the absent-pid row (the main.rs fallback difference).
    rows = []
    for g4 in ["EDGE_MINED", "PATH_FOUND", "CONVERGED"]:
        # missing_cosign floor=150
        rows.append("pid=BH.T.COSIGN|verb=promote|target=fabric|hbp_path=x|l0_real=1|g4_state=%s|composite=0.9" % g4)
        # authority_jump floor=400 (with cosign so it is not refuted)
        rows.append("pid=BH.T.AUTH|verb=write|target=fabric|hbp_path=x|authority_jump=1|cosign=ring|l0_real=1|g4_state=%s|composite=0.9" % g4)
        # missing_halt_path floor=200 (spawn, no halt)
        rows.append("pid=BH.T.HALT|verb=spawn|target=fabric|hbp_path=x|l0_real=1|g4_state=%s|composite=0.9" % g4)
        # no_replay_path floor=100 (no proof paths)
        rows.append("pid=BH.T.REPLAY|verb=observe|target=fabric|l0_real=1|g4_state=%s|composite=0.9" % g4)
        # recursive_consent floor=400
        rows.append("pid=BH.T.RECUR|verb=tick|target=fabric|hbp_path=x|recursive_consent=1|l0_real=1|g4_state=%s|composite=0.9" % g4)
    # absent pid, otherwise clean (host8 fallback difference)
    rows.append("verb=tick|target=fabric|hbp_path=x|l0_real=1|g4_state=UNKNOWN|composite=0.9")
    rows.append("verb=write|target=fabric|hbp_path=x|l0_real=1|g4_state=CONVERGED|composite=0.9")
    rows.append("bh=BH.PRESENT|verb=tick|target=fabric|hbp_path=x|l0_real=1|g4_state=UNKNOWN")
    return rows


def _decimal(num, den_pow):
    s = str(num).rjust(den_pow + 1, "0")
    return s[:-den_pow] + "." + s[-den_pow:]


def tail():
    rows = []
    # g4_state names an inherited Object.prototype member (mjs:368-369; FED lib.rs:726-733).
    for name in fr.OBJECT_PROTOTYPE_NAMES:
        rows.append("pid=BH.ADV|verb=write|target=fabric|authority_jump=1|cosign=ring|g4_state=%s" % name)
        rows.append("pid=R.X|verb=tick|target=fabric|l0_real=1|hbp_path=x|g4_state=%s" % name)
    # Shannon text just above 0.92 (mjs:203-204 binary64; FED lib.rs:496-498,510-543 exact text),
    # including the binary64 midpoint (2M+1)/2^54 and its two neighbours 10^-60 away.
    mid = (2 * fr.F64_092_M + 1) * 5 ** 54
    for t in ["0.92000000000000000001", "0.9200000000000000001", "0.920000000000000001",
              "0.92000000000000001", "0.9200000000000001", _decimal(mid * 10 ** 6 - 1, 60),
              _decimal(mid, 54), _decimal(mid * 10 ** 6 + 1, 60)]:
        rows.append("pid=R.X|verb=tick|target=fabric|l0_real=1|shannon=%s" % t)
    # Payload length (mjs:157-159,199 UTF-16 units; FED lib.rs:359 UTF-8 bytes; main.rs:296-300
    # makes each input byte one char, so a raw two-byte character is two chars of four UTF-8 bytes).
    for n in [16384, 16385, 24576, 32768, 32769]:
        rows.append("pid=R.X|verb=tick|target=fabric|l0_real=1|hbp_path=x|payload=" + "\u00e9" * n)
    rows.append("pid=R.X|verb=tick|target=fabric|l0_real=1|payload=" + "%C3%A9" * 16385)
    # HBP separator/control characters in row values (FED lib.rs:426-443,551-553; mjs:256-272).
    for f in ["pid=BH.ADV%7CX", "pid=BH.ADV%09X", "pid=BH.ADV%0AX", "pid=BH.ADV%0DX",
              "pid=BH.ADV|verb=ti%7Cck", "pid=BH.ADV|g4_state=A%7CB", "pid=BH.ADV|composite=0.9%7Cx",
              "pid=BH.ADV|prev_hash=ab%7Ccd", "pid=BH.ADV|prev_hash=ab%0Dcd"]:
        rows.append(f + "|target=fabric|hbp_path=x")
    # FED field parsing (main.rs:232-313, lib.rs:488-492,510-543) that the referee mirrors.
    for f in ["shannon=0.95|shannon_q=-0", "shannon=0.10|shannon_q=9_30", "shannon=0.10|shannon_q=+930",
              "shannon=0.10|shannon_q=%2B930", "shannon=0.10|shannon_q=%20930", "shannon=%1C0.95",
              "shannon=%A00.95", "shannon=%850.95", "shannon_q=%1C950", "shannon=+.95", "shannon=0.9205"]:
        rows.append("pid=BH.A|verb=tick|target=fabric|" + f)
    for p in ["BH.%+f", "BH.% f", "BH.%e9%E9%zz%4", "BH.\u00e9\u00e9", "BH.\u20ac", "BH.%E2%82%AC"]:
        rows.append("pid=%s|verb=tick|target=fabric" % p)
    # Case-file skip rule (upstream_fixture.rs:35): a comment and a blank line are skipped; a line
    # whose '#' follows a space is evaluated. A ';' in a value checks the stream framing.
    rows += ["# comment line", "", " #pid=BH.B|verb=write|target=fabric|g4_state=constructor",
             "pid=BH.A;B|verb=tick|target=fabric|hbp_path=x"]
    return rows


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 2000
    rng = random.Random(0xF15CE2AB)
    rows = targeted() + [one(rng, i) for i in range(n)] + tail()
    sys.stdout.buffer.write("".join(r + "\n" for r in rows).encode("utf-8"))


if __name__ == "__main__":
    main()
