"""Independent integer recheck: rime axes, never-touch, three-gap table and sweep.

Usage: python3 -I check_axes_gaps.py RUN-2026-07-26.txt THREEGAP-2026-07-26.txt
Integers only. The record files are parsed as text and compared row by row.
"""
import re
import sys

AXES = (2731, 1999, 1723)
CONTROLS = (97, 233, 512, 1000, 4096, 9973)
NS = (12, 20, 32, 60, 90)

out = []
fails = []


def say(s=""):
    out.append(s)


def check(label, record, mine):
    ok = record == mine
    say("  %-58s record=%-14s mine=%-14s %s" % (label, record, mine, "MATCH" if ok else "DIFF"))
    if not ok:
        fails.append(label)
    return ok


def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True


def euclid(a, b):
    while b:
        a, b = b, a % b
    return a


# --- brute force: place points, sort, measure circular gaps -------------------
def gaps_brute(ring, stride, n):
    seen = set()
    k = 0
    pos = 0
    while k < n:
        seen.add(pos)
        pos = (pos + stride) % ring
        k += 1
    pts = sorted(seen)
    g = []
    for i in range(len(pts)):
        nxt = pts[i + 1] if i + 1 < len(pts) else pts[0] + ring
        g.append(nxt - pts[i])
    return g


# --- closed form: three-distance theorem (lengths u, v, u+v with multiplicities)
def gaps_formula(ring, stride, n):
    d = euclid(ring, stride % ring)
    p = ring // d
    q = (stride % ring) // d
    if n >= p:
        return {d: p}
    # n distinct points k*q mod p, k = 0..n-1
    best_u = None
    best_v = None
    for k in range(1, n):
        x = (k * q) % p
        if best_u is None or x < best_u[0]:
            best_u = (x, k)
        y = (p - x) % p
        if best_v is None or y < best_v[0]:
            best_v = (y, k)
    if n == 1:
        return {ring: 1}
    u, k1 = best_u
    v, k2 = best_v
    mult = {}
    for length, count in ((u, n - k1), (v, n - k2), (u + v, k1 + k2 - n)):
        if count > 0:
            mult[length * d] = mult.get(length * d, 0) + count
    return mult


def main():
    run_path, tg_path = sys.argv[1], sys.argv[2]
    run_txt = open(run_path, encoding="utf-8").read()
    tg_txt = open(tg_path, encoding="utf-8").read()

    say("[A] primality and pairwise gcd of the axes (trial division, Euclid)")
    for a in AXES:
        check("is_prime(%d)" % a, True, is_prime(a))
    for i in range(3):
        for j in range(i + 1, 3):
            check("gcd(%d,%d)" % (AXES[i], AXES[j]), 1, euclid(AXES[i], AXES[j]))
    check("3*2731 == 2**13 + 1 (2731 is a Wagstaff prime; not claimed)", True, 3 * 2731 == 2 ** 13 + 1)

    say("")
    say("[B] what coprimality means, checked exhaustively for 2<=p<=400, 1<=q<p")
    say("    lemma: the first p glyphs k*q mod p (k=0..p-1) are all distinct <=> gcd(p,q)=1")
    say("    and the number of distinct positions is p/gcd(p,q)")
    bad = 0
    tested = 0
    for p in range(2, 401):
        for q in range(1, p):
            distinct = len({(k * q) % p for k in range(p)})
            g = euclid(p, q)
            if (distinct == p) != (g == 1) or distinct != p // g:
                bad += 1
            tested += 1
    check("lemma counterexamples over %d (p,q) pairs" % tested, 0, bad)
    say("    torus-link note: the gcd(p,q) components of the (p,q) torus link are the level")
    say("    sets q*x - p*y = c/d (mod 1), c = 0..d-1, which are pairwise disjoint; so on the")
    say("    torus gcd>1 gives several parallel strands that still never touch each other.")
    for i in range(3):
        for j in range(i + 1, 3):
            p, q = AXES[i], AXES[j]
            orbit = len({(k * q) % p for k in range(p)})
            check("orbit of stride %d on ring %d covers ring" % (q, p), p, orbit)

    say("")
    say("[C] lcm / product / hex of the three-axis closure")
    lcm = 1
    for a in AXES:
        lcm = lcm // euclid(lcm, a) * a
    check("lcm(2731,1999,1723)", 9406320487, lcm)
    check("product 2731*1999*1723", 9406320487, 2731 * 1999 * 1723)
    check("0x0230A90F67", 9406320487, int("0230A90F67", 16))

    say("")
    say("[D] the 30-row gap table, row by row against RUN-2026-07-26.txt")
    row_re = re.compile(r"^\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+<=3 OK\s*$", re.M)
    rec_rows = [tuple(int(x) for x in m.groups()) for m in row_re.finditer(run_txt)]
    check("rows found in record", 30, len(rec_rows))
    mine_rows = []
    skipped = 0
    for ring in AXES:
        for stride in AXES:
            if stride % ring == 0:
                skipped += 1
                continue
            for n in NS:
                g = gaps_brute(ring, stride, n)
                distinct = sorted(set(g))
                f = gaps_formula(ring, stride, n)
                if sorted(f) != distinct or sum(f.values()) != len(g):
                    fails.append("formula vs brute %d %d %d" % (ring, stride, n))
                for length, cnt in f.items():
                    if g.count(length) != cnt:
                        fails.append("multiplicity %d %d %d" % (ring, stride, n))
                if sum(g) != ring:
                    fails.append("gaps do not sum to ring %d %d %d" % (ring, stride, n))
                mine_rows.append((ring, stride, n, len(distinct), distinct[0], distinct[-1]))
    matched = 0
    for r, m in zip(rec_rows, mine_rows):
        ok = r == m
        matched += ok
        say("    %5d %5d %3d  record d=%d min=%-4d max=%-4d  mine d=%d min=%-4d max=%-4d  %s"
            % (r[0], r[1], r[2], r[3], r[4], r[5], m[3], m[4], m[5], "1" if ok else "0"))
        if not ok:
            fails.append("gap row %s" % (r,))
    check("rows matching (ring,stride,N,distinct,min,max)", 30, matched)
    check("degenerate pairs skipped (stride % ring == 0)", 3, skipped)
    m = re.search(r"(\d+) rows genuinely tested, (\d+) degenerate", run_txt)
    check("record 'rows tested'", int(m.group(1)), len(mine_rows))
    check("record 'pairs skipped'", int(m.group(2)), skipped)
    three_rows = [x for x in mine_rows if x[3] == 3]
    sumrule = 0
    for ring, stride, n, _, _, _ in three_rows:
        ds = sorted(set(gaps_brute(ring, stride, n)))
        sumrule += ds[2] == ds[0] + ds[1]
    check("3-gap rows in table with max = min + mid", len(three_rows), sumrule)
    check("rows with exactly 2 distinct gaps", 1, sum(1 for x in mine_rows if x[3] == 2))

    say("")
    say("[E] the N = 2..400 sweep, three ways (brute force, closed form) vs THREEGAP-2026-07-26.txt")

    def sweep(rings, strides):
        tot = one = two = three = more = strong = 0
        disagree = 0
        for ring in rings:
            for stride in strides:
                if stride % ring == 0:
                    continue
                for n in range(2, 401):
                    g = sorted(set(gaps_brute(ring, stride, n)))
                    f = sorted(gaps_formula(ring, stride, n))
                    if g != f:
                        disagree += 1
                    tot += 1
                    k = len(g)
                    if k == 1:
                        one += 1
                    elif k == 2:
                        two += 1
                    elif k == 3:
                        three += 1
                        strong += g[2] == g[0] + g[1]
                    else:
                        more += 1
        return tot, one, two, three, more, strong, disagree

    blocks = re.findall(
        r"instances tested\s+(\d+)\s+exactly 1 distinct gap\s+(\d+)\s+exactly 2 distinct gaps\s+(\d+)"
        r"\s+exactly 3 distinct gaps\s+(\d+)\s+MORE than 3\s+(\d+).*?max == min \+ mid:\s+(\d+) / (\d+)",
        tg_txt, re.S)
    check("sweep blocks found in record", 3, len(blocks))
    sets = (("rime x rime", AXES, AXES), ("control x control", CONTROLS, CONTROLS), ("rime x control", AXES, CONTROLS))
    totals = [0, 0, 0]
    for (name, rings, strides), blk in zip(sets, blocks):
        tot, one, two, three, more, strong, disagree = sweep(rings, strides)
        rec = [int(x) for x in blk]
        check(name + " instances", rec[0], tot)
        check(name + " exactly 1", rec[1], one)
        check(name + " exactly 2", rec[2], two)
        check(name + " exactly 3", rec[3], three)
        check(name + " more than 3", rec[4], more)
        check(name + " strong form holds", rec[5], strong)
        check(name + " closed form vs brute force disagreements", 0, disagree)
        totals[0] += tot
        totals[1] += three
        totals[2] += strong
    t = re.search(r"TOTAL instances\s+(\d+)\s+TOTAL 3-gap instances\s+(\d+)\s+TOTAL satisfying max=min\+mid (\d+)", tg_txt)
    check("TOTAL instances", int(t.group(1)), totals[0])
    check("TOTAL 3-gap instances", int(t.group(2)), totals[1])
    check("TOTAL strong form", int(t.group(3)), totals[2])
    non_coprime = sum(1 for r in CONTROLS for s in CONTROLS if s % r and euclid(r, s) > 1)
    say("    control pairs (ring,stride) that are NOT coprime and still obey <=3 gaps: %d" % non_coprime)

    say("")
    say("FAILS: %d %s" % (len(fails), fails[:10]))
    print("\n".join(out))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
