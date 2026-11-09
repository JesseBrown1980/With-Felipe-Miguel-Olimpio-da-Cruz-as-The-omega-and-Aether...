#!/usr/bin/env python3
"""Rule POINTS for PREDICTION-BEC-CANONICAL.hbp (stdlib only; run with python3 -I -B).

No q or t used by a row equals an excluded q or t (BECEXCL EXCL-UNION), and no row value of t n equals a
calibration t n. An integer-pair port of the synthesis checker calc/c12_check_points.py: every rational is
a reduced pair (num, den) with den > 0, parsed from "a/b" and reduced by its own gcd, so the pair is
canonical and sets of pairs compare exactly. Exit 0 when nothing collides, 1 otherwise.
"""
import functools
import re
import sys

RATIONAL = re.compile(r"^\d+(?:/\d+)?$")


def gcd(a, b):
    a, b = abs(a), abs(b)
    while b:
        a, b = b, a % b
    return a


def pair(num, den):
    if den == 0:
        raise ValueError("zero denominator")
    if den < 0:
        num, den = -num, -den
    g = gcd(num, den)
    return (num // g, den // g)


def parse(text):
    text = text.strip()
    if not RATIONAL.match(text):
        raise ValueError("not a rational a/b: %r" % text)
    if "/" in text:
        a, b = text.split("/")
        return pair(int(a), int(b))
    return pair(int(text), 1)


def mul(x, y):
    return pair(x[0] * y[0], x[1] * y[1])


def cmp(x, y):
    left, right = x[0] * y[1], y[0] * x[1]
    return (left > right) - (left < right)


def show(values):
    return "[" + ", ".join("%d/%d" % v for v in sorted(values, key=functools.cmp_to_key(cmp))) + "]"


def fields(rec):
    return dict(p.split("=", 1) for p in rec[1:])


def main(path):
    with open(path, "r", encoding="ascii") as f:
        recs = [line.rstrip("\n").split("|") for line in f]
    excl_q = excl_t = None
    for r in recs:
        if r[0] == "BECEXCL" and fields(r)["id"] == "EXCL-UNION":
            qpart, tpart = fields(r)["points"].split("; t in ")
            excl_q = {parse(x) for x in qpart.split("{")[1].split("}")[0].split(",")}
            excl_t = {parse(x) for x in tpart.split("{")[1].split("}")[0].split(",")}
    if not excl_q or not excl_t:
        print("POINTS|FAIL|no EXCL-UNION record")
        return 1
    row_q, row_t = set(), set()
    for r in recs:
        if r[0] != "BECPOINT":
            continue
        f = fields(r)
        if f["id"] == "CAL":
            continue
        if "q" in f:
            for x in re.findall(r"\d+/\d+", f["q"]):
                row_q.add(parse(x))
        for key in ("points", "point"):
            if key in f:
                if f["id"] in ("TS", "TC"):
                    for x in re.findall(r"(\d+/\d+)", f[key].split(", N =")[0].split("(N =")[0]):
                        row_t.add(parse(x))
                for x in re.findall(r"q = (\d+/\d+)", f[key]):
                    row_q.add(parse(x))
    row_q.discard((1, 1))
    half, seven, nine = (1, 2), (7, 10), (9, 10)
    tn_rows = {mul(t, (n, 1)) for t, n in ((half, 8), (half, 16), (half, 32), (half, 64), (seven, 8), (seven, 16),
                                            (seven, 32), (seven, 64), (nine, 8), (nine, 16), (nine, 32))}
    cal_tn = {mul((5, 7), (15, 1)), mul((5, 7), (32, 1))}
    print("row q:", show(row_q))
    print("row t:", show(row_t))
    print("excluded q:", len(excl_q), "excluded t:", len(excl_t))
    cq, ct, ctn = row_q & excl_q, row_t & excl_t, tn_rows & cal_tn
    print("collisions: q %s, t %s, calibration t n %s" % (show(cq), show(ct), show(ctn)))
    return 1 if (cq or ct or ctn) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
