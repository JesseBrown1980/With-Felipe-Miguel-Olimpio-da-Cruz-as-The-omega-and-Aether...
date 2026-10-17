#!/usr/bin/env python3
"""Stdlib referee for the three scripts vendored in vendor/scratch/.

Upstream: JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything @ 29307bf,
01-rebuild/_scratch/{sidon-cross-fix,distance-probe,sidon-probe}.mjs. Each function below mirrors the
cited JavaScript lines. BigInt values are Python ints. The scripts' Number values are all integers
below 2**53 (asserted in check_bounds), where JavaScript +, -, *, %, Math.abs and Math.max are exact,
so they are Python ints as well.

  python3 -I tools/ste_referee.py --stdout sidon-cross-fix|distance-probe|sidon-probe
  python3 -I tools/ste_referee.py --write    rewrite tests/fixtures/*.hbp
  python3 -I tools/ste_referee.py --check    regenerate in memory, diff the committed fixtures, and
                                             compare the outputs with the records in vendor/records/
"""

import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CRATE = os.path.dirname(HERE)
FIXTURES = os.path.join(CRATE, "tests", "fixtures")
RECORDS = os.path.join(CRATE, "vendor", "records")
JS_SAFE = 2**53


# ---- shared by sidon-cross-fix.mjs:1-2 and sidon-probe.mjs:6-7 (identical text) ----

def is_prime(n):
    if n < 2:
        return False
    f = 2
    while f * f <= n:
        if n % f == 0:
            return False
        f += 1
    return True


def erdos_turan(p):
    a = []
    for k in range(p):
        a.append(2 * p * k + ((k * k) % p))
    return a


# ---- sidon-cross-fix.mjs ----

def babs(x):  # :3
    return -x if x < 0 else x


def dist_multiset(arr):  # :4-8
    seen = set()
    coll = 0
    tot = 0
    min_d = None
    max_d = 0
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            d = babs(arr[i] - arr[j])
            tot += 1
            if min_d is None or d < min_d:
                min_d = d
            if d > max_d:
                max_d = d
            if d in seen:
                coll += 1
            else:
                seen.add(d)
    return {"tot": tot, "distinct": len(seen), "coll": coll, "minD": min_d, "maxD": max_d}


CROSS_FIX_PRIMES = [p for p in [13, 17, 23, 31, 41, 47, 73, 79, 83, 89, 131] if is_prime(p)]  # :10
GUARD = 1 << 40  # :13


def cross_fix_towers():  # :11-18
    towers = []
    for p in CROSS_FIX_PRIMES:
        w = p**3
        s = erdos_turan(p)
        scaled = [x * w for x in s]
        max_intra = scaled[-1] - scaled[0]
        towers.append({"p": p, "W": w, "S": s, "scaled": scaled, "maxIntra": max_intra})
    acc = 0
    points = []
    for tw in towers:
        tw["anchor"] = acc
        for x in tw["scaled"]:
            points.append(acc + x)
        acc = acc + tw["maxIntra"] + GUARD * tw["W"]
    return towers, points


def js_str(v):
    return "null" if v is None else str(v)


def cross_fix_stdout():  # :19-24
    towers, points = cross_fix_towers()
    r = dist_multiset(points)
    out = [
        f"CROSS-FIX towers={len(towers)} points={len(points)} pairs={r['tot']} "
        f"distinct_dist={r['distinct']} collisions={r['coll']}",
        f"min_dist={js_str(r['minD'])} max_dist={js_str(r['maxD'])}",
    ]
    for tw in towers:
        rr = dist_multiset(tw["scaled"])
        if rr["coll"] != 0:
            out.append(f"INTRA FAIL p={tw['p']} coll={rr['coll']}")
    out.append("INTRA all towers zero-collision: OK")
    return out


# ---- distance-probe.mjs ----

SECTORS, WIDTH = 113, 1024  # :7


def sha256_hex(t):  # :5
    return hashlib.sha256(str(t).encode("utf-8")).hexdigest()


def u32(h):  # :6
    return int(h[0:8], 16)


def reg(name):  # :8-9
    h = sha256_hex(str(name).upper())
    s = u32(h)
    return {"sector": s % SECTORS, "lane": s % 3, "glyph": s % WIDTH, "u32": s}


def bh_index_linear(r):  # :10
    return r["sector"] * (WIDTH * 3) + r["lane"] * WIDTH + r["glyph"]


PROBE_PRIMES = [13, 17, 23, 31, 41, 47, 73, 79, 83, 89, 131]  # :12
CUBES = [p**3 for p in PROBE_PRIMES]  # :13


def bh_index_sidon(r):  # :14-19
    c = CUBES
    return r["sector"] * c[0] + r["lane"] * c[3] + r["glyph"] * c[6]


def probe(fn, label, n):  # :20-30
    idx = [fn(reg(f"POS-{i}")) for i in range(n)]
    dists = set()
    collide = 0
    total = 0
    for i in range(len(idx)):
        for j in range(i + 1, len(idx)):
            d = abs(idx[i] - idx[j])
            total += 1
            if d in dists:
                collide += 1
            else:
                dists.add(d)
    uniq_idx = len(set(idx))
    return (f"{label} N={n} uniq_index={uniq_idx}/{n} pairwise_distances total={total} "
            f"distinct={len(dists)} collisions={collide}")


def distance_probe_stdout():  # :31
    out = []
    for n in [64, 128, 256]:
        out.append(probe(bh_index_linear, "LINEAR ", n))
        out.append(probe(bh_index_sidon, "SIDON  ", n))
    return out


# ---- sidon-probe.mjs ----

def all_distinct_distances(arr):  # :8-14
    seen = set()
    coll = 0
    tot = 0
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            d = abs(arr[i] - arr[j])
            tot += 1
            if d in seen:
                coll += 1
            else:
                seen.add(d)
    return {"tot": tot, "distinct": len(seen), "coll": coll}


SINGLE_TOWER_PRIMES = [13, 17, 23, 31, 131]  # :16
SIDON_PROBE_PRIMES = [p for p in [13, 17, 23, 31, 41, 47, 73, 79, 83, 89, 131] if is_prime(p)]  # :24
BIG = 1000003  # :29


def sidon_probe_towers():  # :25-31
    towers = []
    for p in SIDON_PROBE_PRIMES:
        s = erdos_turan(p)
        span = max(s)
        towers.append({"p": p, "s": s, "span": span})
    acc = 0
    points = []
    for t in towers:
        t["anchor"] = acc
        acc += (t["span"] + 1) * BIG
        for x in t["s"]:
            points.append(t["anchor"] + x * BIG)
    return towers, points


def sidon_probe_stdout():  # :16-19, :32-33
    out = []
    for p in SINGLE_TOWER_PRIMES:
        s = erdos_turan(p)
        r = all_distinct_distances(s)
        out.append(f"SIDON-TOWER p={p} points={p} pairs={r['tot']} distinct_dist={r['distinct']} "
                   f"collisions={r['coll']}")
    _, points = sidon_probe_towers()
    rr = all_distinct_distances(points)
    out.append(f"CROSS-TOWER total_points={len(points)} pairs={rr['tot']} distinct_dist={rr['distinct']} "
               f"collisions={rr['coll']}")
    return out


SCRIPTS = {
    "sidon-cross-fix": cross_fix_stdout,
    "distance-probe": distance_probe_stdout,
    "sidon-probe": sidon_probe_stdout,
}


# ---- the JavaScript Number values stay integers below 2**53 ----

def check_bounds():
    numbers = []
    for p in CROSS_FIX_PRIMES + SIDON_PROBE_PRIMES + SINGLE_TOWER_PRIMES:
        numbers += [p, p * p, 2 * p * (p - 1), (p - 1) * (p - 1)]
        numbers += erdos_turan(p)
    numbers += CUBES
    for i in range(256):
        r = reg(f"POS-{i}")
        numbers += [r["u32"], bh_index_linear(r), r["sector"] * CUBES[0], r["lane"] * CUBES[3],
                    r["glyph"] * CUBES[6], bh_index_sidon(r)]
    towers, points = sidon_probe_towers()
    acc = 0
    for t in towers:
        acc += (t["span"] + 1) * BIG
        numbers += [t["span"], t["anchor"], acc] + [x * BIG for x in t["s"]]
    numbers += points
    bad = [v for v in numbers if not (0 <= v < JS_SAFE)]
    if bad:
        raise SystemExit(f"FAIL a JavaScript Number value leaves 0..2**53: {bad[:3]}")
    return len(numbers), max(numbers)


# ---- fixtures (HBP text) ----

def fixture_texts():
    out = {}
    lines = ["# expected stdout of vendor/scratch/*.mjs (console.log lines), from tools/ste_referee.py; do not edit"]
    for script, fn in SCRIPTS.items():
        for n, text in enumerate(fn(), 1):
            lines.append(f"OUT|script={script}|line={n}|text={text}")
    out["expected-stdout.hbp"] = "\n".join(lines) + "\n"

    towers, points = cross_fix_towers()
    lines = ["# sidon-cross-fix.mjs:11-18 towers and the 627 embedded points, from tools/ste_referee.py; do not edit",
             "# phi = anchor + sidon * p^3; GUARD = 2^40"]
    i = 0
    for t, tw in enumerate(towers):
        lines.append(f"TOWER|t={t}|p={tw['p']}|w={tw['W']}|anchor={tw['anchor']}|max_intra={tw['maxIntra']}")
        for k, s in enumerate(tw["S"]):
            lines.append(f"POINT|i={i}|t={t}|k={k}|sidon={s}|phi={points[i]}")
            i += 1
    out["expected-cross-fix-points.hbp"] = "\n".join(lines) + "\n"

    lines = ["# distance-probe.mjs:8-19 registrations of POS-0..POS-255, from tools/ste_referee.py; do not edit",
             "# u32 = parseInt(sha256(UPPERCASE name)[0:8], 16)"]
    for i in range(256):
        name = f"POS-{i}"
        r = reg(name)
        lines.append(f"NODE|name={name}|u32={r['u32']}|sector={r['sector']}|lane={r['lane']}|glyph={r['glyph']}"
                     f"|linear={bh_index_linear(r)}|sidon={bh_index_sidon(r)}")
    out["expected-probe-nodes.hbp"] = "\n".join(lines) + "\n"

    towers, points = sidon_probe_towers()
    lines = ["# sidon-probe.mjs:24-31 towers and points, from tools/ste_referee.py; do not edit",
             "# point = anchor + sidon * BIG; BIG = 1000003"]
    i = 0
    for t, tw in enumerate(towers):
        lines.append(f"TOWER|t={t}|p={tw['p']}|span={tw['span']}|anchor={tw['anchor']}")
        for k, s in enumerate(tw["s"]):
            lines.append(f"POINT|i={i}|t={t}|k={k}|sidon={s}|point={points[i]}")
            i += 1
    out["expected-sidon-probe-points.hbp"] = "\n".join(lines) + "\n"
    return out


# ---- comparison with the recorded values (vendor/records/: byte-identical line extracts) ----

def read_record(name):
    with open(os.path.join(RECORDS, name), "r", encoding="utf-8", newline="") as fh:
        return fh.read().split("\n")[:-1]


def check_records(stdout):
    # The documents separate fields with runs of spaces; the scripts print one space.
    fields = lambda s: s.split()
    fails = []
    cross = stdout["sidon-cross-fix"]
    for rec in ["F02-builder-185-187.txt", "REBUILD-REPORT-175-176.txt", "S1-145-146.txt"]:
        lines = read_record(rec)
        for n, line in enumerate(lines):
            if fields(line) != fields(cross[n]):
                fails.append(f"{rec} line {n + 1}: recorded {line!r}, computed {cross[n]!r}")
    linear = [l for l in stdout["distance-probe"] if l.startswith("LINEAR")]
    for n, line in enumerate(read_record("F02-builder-123-125.txt")):
        if fields(line) != fields(linear[n]):
            fails.append(f"F02-builder-123-125.txt line {n + 1}: recorded {line!r}, computed {linear[n]!r}")
    sidon256 = [l for l in stdout["distance-probe"] if l.startswith("SIDON") and " N=256 " in l][0]
    note = read_record("F02-builder-131.txt")[0]
    if not (sidon256.endswith(" collisions=896") and "(896 at N=256)" in note):
        fails.append(f"F02-builder-131.txt: recorded {note!r}, computed {sidon256!r}")
    return fails


def main(argv):
    if len(argv) == 2 and argv[0] == "--stdout" and argv[1] in SCRIPTS:
        sys.stdout.write("\n".join(SCRIPTS[argv[1]]()) + "\n")
        return 0
    if argv == ["--write"]:
        check_bounds()
        for name, text in fixture_texts().items():
            with open(os.path.join(FIXTURES, name), "w", encoding="utf-8", newline="") as fh:
                fh.write(text)
            print(f"wrote tests/fixtures/{name}")
        return 0
    if argv == ["--check"]:
        count, top = check_bounds()
        print(f"OK bounds: {count} JavaScript Number values, all integers in 0..2**53 (max {top})")
        fails = 0
        for name, text in fixture_texts().items():
            with open(os.path.join(FIXTURES, name), "r", encoding="utf-8", newline="") as fh:
                committed = fh.read()
            if committed == text:
                print(f"OK tests/fixtures/{name} ({text.count(chr(10))} lines)")
            else:
                print(f"FAIL tests/fixtures/{name} differs from the referee")
                fails += 1
        stdout = {k: fn() for k, fn in SCRIPTS.items()}
        record_fails = check_records(stdout)
        for f in record_fails:
            print(f"FAIL {f}")
        if not record_fails:
            print("OK vendor/records: F02-builder:123-125,131,185-187, REBUILD-REPORT:175-176, S1:145-146 "
                  "equal the computed lines field by field")
        fails += len(record_fails)
        return 1 if fails else 0
    sys.stderr.write(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
