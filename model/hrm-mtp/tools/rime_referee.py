#!/usr/bin/env python3
"""Cold-lane referee for the universe simulator's HRM and MTP slice agents.

The referee's own arithmetic is integer only. Floats appear only where the owner's float code runs
unchanged (the vendored rime_agents.py and rime_windunwind.py): their returned binary64 values are
read exactly with float.as_integer_ratio() and compared in integers, and their printed text is
compared as text.

agents:     imports the vendored players/rime_agents.py unchanged, points its module global
            ENWIK8 at the given file (upstream reads the first 600,000 bytes of
            'D:/asolaria-absorb/enwik9'; enwik8 holds the same bytes), runs mtp_agent() and
            hrm_agent(), and compares their printed lines and return values with the output of
            `cargo run --example rime_agents`. The exact HRM bits are recomputed here from the same
            integer counts (rime_agents.py:106-126) with base-2 logarithms in 192-bit fixed point.
windunwind: runs the vendored players/rime_windunwind.py unchanged (numpy required), with
            `open` resolved to the given enwik8 / enwik9 files and a scratch output path, and
            compares each sector's printed MTP+ / MTP- / HRM values and deep share with the
            output of `cargo run --example rime_windunwind`.
synthetic:  runs the same two vendored agents on 600,000 bytes from a fixed 64-bit LCG (no download)
            and writes tests/fixtures/rime-synthetic.hbp, which tests/rime.rs recomputes;
            --check compares instead of writing.
windsynth:  mirrors rime_windunwind.py:28-71 line by line in integers (the sphere, freeze2, the
            bank tables, mtp_bits, hrm_bits) on a synthetic bank and two synthetic sectors from the
            same LCG, because the vendored script reads 27 sectors of 37,037,037 bytes; writes
            tests/fixtures/rime-windunwind-synthetic.hbp, which tests/rime.rs recomputes; --check
            compares instead of writing.

agents and windunwind also compare against the owner's receipts vendored under
vendor/universe-simulator/receipts/operator/. Prints HBP rows; exits 1 on any difference.
"""
import argparse
import contextlib
import hashlib
import io
import os
import re
import sys
import tempfile
from collections import Counter
from pathlib import Path

sys.dont_write_bytecode = True  # importing the vendored players must not write into vendor/
ROOT = Path(__file__).resolve().parent.parent
PLAYERS = ROOT / "vendor" / "universe-simulator" / "players"
RECEIPTS = ROOT / "vendor" / "universe-simulator" / "receipts" / "operator"
FAILURES = []


def check(name, ok, detail=""):
    print(f"CHECK|name={name}|ok={int(bool(ok))}|{detail}|json=0")
    if not ok:
        FAILURES.append(name)


def hbp_rows(text, kind):
    out = []
    for line in text.splitlines():
        if line.startswith(kind + "|"):
            out.append(dict(p.split("=", 1) for p in line.split("|")[1:]))
    return out


# ---- integer helpers -------------------------------------------------------------------------
FRAC = 192


def atanh_fixed(num, den):
    """atanh(num / den) * 2^FRAC for 0 <= num / den <= 1/3, below by at most a few units."""
    z = (num << FRAC) // den
    z2 = (z * z) >> FRAC
    total = term = z
    k = 1
    while term:
        term = (term * z2) >> FRAC
        total += term // (2 * k + 1)
        k += 1
    return total


LN2_FIXED = 2 * atanh_fixed(1, 3)
LOG2_CACHE = {}


def log2_fixed(v):
    """log2(v) * 2^FRAC for an integer v >= 1: v = 2^k * y with 1 <= y < 2, ln y = 2 atanh(z),
    z = (v - 2^k) / (v + 2^k) <= 1/3. Error below 2^-180."""
    if v not in LOG2_CACHE:
        k = v.bit_length() - 1
        ln_y = 2 * atanh_fixed(v - (1 << k), v + (1 << k))
        LOG2_CACHE[v] = (k << FRAC) + (ln_y << FRAC) // LN2_FIXED
    return LOG2_CACHE[v]


def tally_fixed(mult):
    """sum_v c_v * log2(v) * 2^FRAC, and sum_v |c_v| (each term's error is below 2^-180)."""
    return sum(c * log2_fixed(v) for v, c in mult.items() if c), sum(abs(c) for c in mult.values())


def render(num, den, digits, half_even=False):
    """num / den in decimal with `digits` fraction digits (num >= 0), truncated or half to even."""
    scaled, rem = divmod(num * 10 ** digits, den)
    if half_even and (2 * rem > den or (2 * rem == den and scaled & 1)):
        scaled += 1
    whole, frac = divmod(scaled, 10 ** digits)
    return f"{whole}.{frac:0{digits}d}"


def diff_1e20(a_num, a_den, b_num, b_den):
    """floor((a - b) * 10^20) for a = a_num / a_den, b = b_num / b_den."""
    return ((a_num * b_den - b_num * a_den) * 10 ** 20) // (a_den * b_den)


def nearest_binary64(num, den):
    """(m, e): the binary64 m * 2^e nearest num / den (normal range, ties to even)."""
    if num == 0:
        return 0, 0
    k = max(0, den.bit_length() - num.bit_length() + 55)
    q, r = divmod(num << k, den)
    shift = q.bit_length() - 53
    low = q & ((1 << shift) - 1)
    q >>= shift
    half = 1 << (shift - 1)
    if low > half or (low == half and (r or q & 1)):
        q += 1
    return q, shift - k


def binary64_is_ratio(value, num, den):
    """True when the float `value` (upstream's output) is the binary64 nearest num / den:
    a / b == m * 2^e with (a, b) = value.as_integer_ratio()."""
    a, b = value.as_integer_ratio()
    m, e = nearest_binary64(num, den)
    return (a << -e if e < 0 else a) == (m * b if e < 0 else (m * b) << e)


# ---- rime_agents.py --------------------------------------------------------------------------
def exact_hrm_bits(data):
    """rime_agents.py:104-127 with each -log2 term kept as integer multiplicities of log2(v)."""
    train, test = data[:500_000], data[500_000:]
    c2, c1, c0 = {}, {}, {}
    for i in range(2, len(train)):
        b = train[i]
        d2 = c2.setdefault((train[i - 2], train[i - 1]), {}); d2[b] = d2.get(b, 0) + 1
        d1 = c1.setdefault(train[i - 1], {}); d1[b] = d1.get(b, 0) + 1
        c0[b] = c0.get(b, 0) + 1
    t0 = sum(c0.values())
    mult = Counter()
    used = [0, 0, 0]
    for i in range(2, len(test)):
        b = test[i]
        d2 = c2.get((test[i - 2], test[i - 1]))
        d1 = c1.get(test[i - 1])
        if d2 and sum(d2.values()) >= 8:
            d, lvl = d2, 0
        elif d1:
            d, lvl = d1, 1
        else:
            d, lvl = c0, 2
        tot = sum(d.values()) if lvl < 2 else t0
        mult[tot + 256] += 1
        mult[d.get(b, 0) + 1] -= 1
        used[lvl] += 1
    bits, _ = tally_fixed(mult)
    return bits, len(test) - 2, used


def run_agents(path):
    sys.path.insert(0, str(PLAYERS))
    import rime_agents  # the vendored file, unchanged
    rime_agents.ENWIK8 = path
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        mtp = rime_agents.mtp_agent()
        hrm_float = rime_agents.hrm_agent()
    return mtp, hrm_float, buf.getvalue().splitlines()


def agents(args):
    (f1, f3, f27, b1), hrm_float, py_lines = run_agents(args.enwik8)
    rust = Path(args.rust).read_text(encoding="utf-8")
    rust_lines = rust.splitlines()
    for wanted in [l for l in rust_lines if not l.startswith(("MTPAGENT|", "HRMAGENT|"))]:
        check("printed_line_equals_upstream", wanted in py_lines, f"line={wanted.strip()}")
    receipt = (RECEIPTS / "rime_agents.txt").read_text(encoding="utf-8").splitlines()
    for wanted in [l for l in rust_lines if not l.startswith(("MTPAGENT|", "HRMAGENT|"))]:
        check("printed_line_equals_owner_receipt", wanted in receipt, f"line={wanted.strip()}")
    m = hbp_rows(rust, "MTPAGENT")[0]
    for key, value in [("x1", f1), ("x3", f3), ("x27", f27), ("back1", b1)]:
        hits, tot = map(int, m[key].split("/"))
        check(f"mtp_{key}_equals_upstream_float", binary64_is_ratio(value, hits, tot),
              f"rust={hits}/{tot}|upstream={value!r}")
    h = hbp_rows(rust, "HRMAGENT")[0]
    with open(args.enwik8, "rb") as fh:
        data = fh.read(600_000)
    bits, n, used = exact_hrm_bits(data)
    den = n << FRAC
    check("hrm_used_counts", [int(h["deep"]), int(h["mid"]), int(h["base"])] == used, f"used={used}")
    check("hrm_n", int(h["n"]) == n, f"n={n}")
    whole, frac = h["bpc"].split(".")
    rust_diff = diff_1e20(int(whole + frac), 10 ** len(frac), bits, den)
    check("hrm_rust_q64_vs_exact", abs(rust_diff) < 10 ** 6,
          f"rust={h['bpc']}|exact={render(bits, den, 20, True)}|diff_1e-20={rust_diff}")
    a, b = hrm_float.as_integer_ratio()
    up_diff = diff_1e20(a, b, bits, den)
    check("hrm_upstream_float_vs_exact", abs(up_diff) < 10 ** 11,
          f"upstream_float={hrm_float!r}|exact={render(bits, den, 20, True)}|diff_1e-20={up_diff}")
    printed = next(l for l in py_lines if l.startswith("  frozen hierarchical bpc"))
    print(f"FLOATBOUNDARY|agent=hrm_agent|upstream_bits_over_n={hrm_float!r}|exact_bits_over_n={render(bits, den, 20, True)}|"
          f"diff_1e-20={up_diff}|printed_4dp_upstream={printed.rsplit(' ', 1)[1]}|printed_4dp_rust={h['bpc4']}|json=0")


SYNTH_FIXTURE = ROOT / "tests" / "fixtures" / "rime-synthetic.hbp"


def synthetic_bytes(n=600_000, seed=0x2545F4914F6CDD1D, every=997, start=500_000, mask=0xFF):
    """A 19-letter alphabet from a 64-bit LCG; from `start` on every `every`-th byte is any byte
    (any byte & mask)."""
    x = seed
    alpha = b"etaoin shrdlucmfwyp"
    out = bytearray()
    for i in range(n):
        x = (x * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
        out.append((x >> 40) & mask if i >= start and i % every == 0 else alpha[(x >> 33) % len(alpha)])
    return bytes(out)


def nearest_count(value, tot):
    """The integer h with h / tot nearest the float `value` (upstream's output), checked exact."""
    a, b = value.as_integer_ratio()
    h = (2 * a * tot + b) // (2 * b)
    assert binary64_is_ratio(value, h, tot), "upstream value is a ratio over tot"
    return h


def synthetic(args):
    data = synthetic_bytes()
    fd, tmp = tempfile.mkstemp(prefix="rime-synthetic-")
    with os.fdopen(fd, "wb") as fh:
        fh.write(data)
    try:
        (f1, f3, f27, b1), hrm_float, printed = run_agents(tmp)
    finally:
        os.remove(tmp)
    result = [l for l in printed if l.startswith("  direction") or l.startswith("  levels used") or l.startswith("  frozen hierarchical")]
    bits, n, used = exact_hrm_bits(data)
    rows = ["# rime_agents.py mtp_agent() and hrm_agent() on synthetic_bytes() of tools/rime_referee.py, run by that referee; do not edit",
            f"SYNTH|bytes={len(data)}|sha256={hashlib.sha256(data).hexdigest()}"]
    rows += [f"LINE|text={l}" for l in result]
    rows.append("MTPAGENT|" + "|".join(f"{k}={nearest_count(v, 1200)}/1200" for k, v in [("x1", f1), ("x3", f3), ("x27", f27), ("back1", b1)]))
    rows.append(f"HRMAGENT|n={n}|deep={used[0]}|mid={used[1]}|base={used[2]}|bpc_exact={render(bits, n << FRAC, 20, True)}|upstream_float={hrm_float!r}")
    text = "\n".join(rows) + "\n"
    if args.check:
        check("synthetic_fixture_unchanged", SYNTH_FIXTURE.read_text(encoding="utf-8") == text, f"path={SYNTH_FIXTURE}")
    else:
        SYNTH_FIXTURE.write_text(text, encoding="utf-8")
        print(f"WROTE|path={SYNTH_FIXTURE}|json=0")


# ---- rime_windunwind.py ----------------------------------------------------------------------
def windunwind(args):
    import numpy  # noqa: F401  (rime_windunwind.py imports numpy)
    path = PLAYERS / "rime_windunwind.py"
    code = compile(path.read_text(encoding="utf-8"), str(path), "exec")
    scratch = tempfile.mkdtemp(prefix="rime-windunwind-")
    g = {"__name__": "__main__", "__file__": str(path)}

    def redirected_open(name, *a, **k):
        base = g["S"]
        mapping = {f"{base}/enwik8": args.enwik8, f"{base}/enwik9": args.enwik9,
                   f"{base}/rime_windunwind.json": os.path.join(scratch, "rime_windunwind.out")}
        return open(mapping.get(name, name), *a, **k)

    g["open"] = redirected_open
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(code, g)
    os.remove(os.path.join(scratch, "rime_windunwind.out"))
    os.rmdir(scratch)
    printed = buf.getvalue()
    Path(args.upstream_log).write_text(printed, encoding="utf-8") if args.upstream_log else None
    py = {}
    pat = re.compile(r"sector\s+(\d+) \[.*?0-check=(\w+)\s+MTP\+ ([\d.]+)\s+MTP- ([\d.]+)\s+HRM ([\d.]+) \(deep (\d+)%\)")
    for line in printed.splitlines():
        mm = pat.search(line)
        if mm:
            py[int(mm.group(1))] = mm.groups()[1:]
    receipt = {}
    rpat = re.compile(r"sector\s+(\d+) \[.*?0-check=(\w+)\s+MTP\+ ([\d.]+)\s+MTP- ([\d.]+)\s+HRM ([\d.]+)")
    for line in (RECEIPTS / "rime_windunwind.txt").read_text(encoding="utf-8").splitlines():
        mm = rpat.search(line)
        if mm:
            receipt[int(mm.group(1))] = mm.groups()[1:]
    rust = Path(args.rust).read_text(encoding="utf-8")
    diffs = []
    for s in hbp_rows(rust, "SECTOR"):
        d = int(s["d"])
        mine = ("True" if s["exact"] == "1" else "False", s["mtp_fwd_bpc"], s["mtp_bwd_bpc"], s["hrm_bpc"], s["deep_pct"])
        check(f"sector_{d}_equals_upstream_print", py.get(d) == mine, f"rust={'/'.join(mine)}|upstream={'/'.join(py.get(d, ()))}")
        check(f"sector_{d}_equals_owner_receipt", receipt.get(d) == mine[:4],
              f"rust={'/'.join(mine[:4])}|receipt={'/'.join(receipt.get(d, ()))}")
        row = g["rows"][d]
        n = int(s["n"])
        for key, q in [("mtp_fwd_bpc", "mtp_fwd_q64"), ("mtp_bwd_bpc", "mtp_bwd_q64"), ("hrm_bpc", "hrm_q64")]:
            a, b = row[key].as_integer_ratio()
            diff = diff_1e20(a, b, int(s[q]), n << 64)
            diffs.append(diff)
            print(f"FLOATBOUNDARY|sector={d}|value={key}|upstream_float={row[key]!r}|exact_q64={render(int(s[q]), n << 64, 18)}|diff_1e-20={diff}|json=0")
            check(f"sector_{d}_{key}_float_within_1e-9", abs(diff) < 10 ** 11)
    print(f"FLOATBOUNDARY|range|values={len(diffs)}|min_diff_1e-20={min(diffs)}|max_diff_1e-20={max(diffs)}|json=0")
    t = hbp_rows(rust, "TOTAL")[0]
    summary = g["summary"]
    for key, label in [("mtp_fwd", "MTP +"), ("mtp_bwd", "MTP -"), ("hrm", "HRM")]:
        upstream = summary[key + "_bpc"]
        printed4 = re.search(r"the frozen Shannon cost \(" + re.escape(label) + r"\)\s+: ([\d.]+) bpc", printed).group(1)
        r4, full = t[key + "_bpc4"], t[key + "_bpc"]
        whole, frac = full.split(".")
        a, b = upstream.as_integer_ratio()
        check(f"total_{key}_4dp_equals_upstream", printed4 == r4,
              f"rust={r4}|upstream={upstream!r}|rust_15dp={full}|diff_1e-20={diff_1e20(a, b, int(whole + frac), 10 ** len(frac))}")
    check("all_exact_equals_upstream", summary["all_exact"] == (t["all_exact"] == "1"), f"rust={t['all_exact']}")


WIND_FIXTURE = ROOT / "tests" / "fixtures" / "rime-windunwind-synthetic.hbp"
P, N = 103681, 20736


def primitive_root(p):
    """rime_windunwind.py:28-37."""
    fac, n, d = [], p - 1, 2
    while d * d <= n:
        if n % d == 0:
            fac.append(d)
            while n % d == 0: n //= d
        d += 1
    if n > 1: fac.append(n)
    for g in range(2, p):
        if all(pow(g, (p - 1) // q, p) != 1 for q in fac): return g


def windsynth(args):
    """rime_windunwind.py:28-92 on a synthetic bank and sectors; integer counts and exact sums."""
    g = primitive_root(P); W = pow(g, (P - 1) // N, P)                       # :38
    pts = [0] * N; v = 1                                                     # :39-40
    for e in range(N): pts[e] = v; v = v * W % P
    inv = [0] * (P + 1)                                                      # :41
    for e, pt in enumerate(pts): inv[pt] = e
    # Every 7th bank byte is any byte below 128: order-2 counts near the deep threshold of 8, and
    # bytes from 128 up only in the sectors (the floor route).
    bank = synthetic_bytes(200_000, seed=0x9E3779B97F4A7C15, every=7, start=0, mask=0x7F)

    def freeze2(b):                                                          # :46-49
        c = Counter((b[i] << 16) | (b[i + 1] << 8) | b[i + 2] for i in range(len(b) - 2))
        t = Counter()
        for k, cnt in c.items(): t[k >> 8] += cnt
        return c, t
    C2f, T2f = freeze2(bank)                                                 # :50
    C2b, T2b = freeze2(bank[::-1])                                           # :51
    C1 = Counter((bank[i] << 8) | bank[i + 1] for i in range(len(bank) - 1))  # :52
    T1 = Counter()                                                           # :53
    for k, cnt in C1.items(): T1[k >> 8] += cnt
    C0 = Counter(bank); T0 = sum(C0.values())                                # :54

    def mtp_bits(sec, C2, T2):                                               # :57-61
        mult = Counter()
        for i in range(len(sec) - 2):
            c = (sec[i] << 8) | sec[i + 1]
            mult[T2[c] + 256] += 1
            mult[C2[(c << 8) | sec[i + 2]] + 1] -= 1
        return mult, len(sec) - 2

    def hrm_bits(sec):                                                       # :63-71
        mult = Counter(); routed = [0, 0, 0]
        for i in range(len(sec) - 2):
            c2 = (sec[i] << 8) | sec[i + 1]; c1 = sec[i + 1]; n = sec[i + 2]
            if T2f[c2] >= 8:                                                 # deep
                routed[0] += 1; mult[T2f[c2] + 256] += 1; mult[C2f[(c2 << 8) | n] + 1] -= 1
            elif T1[c1] > 0:                                                 # mid
                routed[1] += 1; mult[T1[c1] + 256] += 1; mult[C1[(c1 << 8) | n] + 1] -= 1
            else:                                                            # floor
                routed[2] += 1; mult[T0 + 256] += 1; mult[C0[n] + 1] -= 1
        return mult, len(sec) - 2, routed

    rows = ["# rime_windunwind.py:28-92 mirrored in integers by tools/rime_referee.py windsynth on synthetic_bytes() banks and sectors; do not edit",
            "# *_q64 = floor(2^64 * sum of log2 terms) (exact to 2^-180), *_weight = sum of |multiplicities|; bpc rounded half up from the exact sum",
            f"BANK|bytes={len(bank)}|sha256={hashlib.sha256(bank).hexdigest()}|t0={T0}|g={g}|W={W}|contexts2={len(T2f)}"]
    for d, seed, length in [(0, 0x51ED270B27C1A4E3, 30_000), (26, 0x0123456789ABCDEF, 20_000)]:
        sec = synthetic_bytes(length, seed=seed, every=97, start=0)
        k = [sec[i] + 256 * (i % 3) + 768 * d for i in range(len(sec))]      # :81
        wound = [pts[x] for x in k]                                          # :82
        unwound = [inv[x] for x in wound]                                    # :84
        exact = unwound == k                                                 # :85
        hrm_mult, n, routed = hrm_bits(sec)
        fields = []
        for name, mult in [("mtp_fwd", mtp_bits(sec, C2f, T2f)[0]), ("mtp_bwd", mtp_bits(sec[::-1], C2b, T2b)[0]),
                           ("hrm", hrm_mult)]:
            total, weight = tally_fixed(mult)
            scaled, rem = divmod(total * 10 ** 4, n << FRAC)
            scaled += 1 if 2 * rem >= n << FRAC else 0
            fields.append(f"{name}_bpc4={scaled // 10 ** 4}.{scaled % 10 ** 4:04d}|{name}_bpc={render(total, n << FRAC, 15)}"
                          f"|{name}_q64={total >> (FRAC - 64)}|{name}_weight={weight}")
        rows.append(f"SECTOR|d={d}|bytes={len(sec)}|sha256={hashlib.sha256(sec).hexdigest()}|exact={int(exact)}|n={n}"
                    f"|deep={routed[0]}|mid={routed[1]}|floor={routed[2]}|" + "|".join(fields))
    text = "\n".join(rows) + "\n"
    if args.check:
        check("windsynth_fixture_unchanged", WIND_FIXTURE.read_text(encoding="utf-8") == text, f"path={WIND_FIXTURE}")
    else:
        WIND_FIXTURE.write_text(text, encoding="utf-8")
        print(f"WROTE|path={WIND_FIXTURE}|json=0")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["agents", "windunwind", "synthetic", "windsynth"])
    p.add_argument("--enwik8")
    p.add_argument("--enwik9")
    p.add_argument("--rust", help="output of the matching cargo example")
    p.add_argument("--check", action="store_true", help="synthetic, windsynth: compare with the committed fixture")
    p.add_argument("--upstream-log", help="also write upstream's printed lines here")
    args = p.parse_args()
    {"agents": agents, "windunwind": windunwind, "synthetic": synthetic, "windsynth": windsynth}[args.mode](args)
    print(f"RESULT|failures={len(FAILURES)}|json=0")
    return 1 if FAILURES else 0


if __name__ == "__main__":
    sys.exit(main())
