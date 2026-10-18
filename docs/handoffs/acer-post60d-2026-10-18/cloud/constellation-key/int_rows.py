"""Integer-only counts behind the KEY-ATTEMPT.hbp SCREEN, MTP, RATIO, DIVIDE and TIES rows.
Same anchors and frozen table as mtp_rows.py; every ratio is kept as n/d. A decimal r with k places
that the owner's receipt (or an earlier float rendering) printed is checked against n/d with
integers only: 2*|n*10^k - R*d| <= d, where R = r*10^k, i.e. r is within half a unit of its last
place of n/d. No float anywhere (python3 -I ../maths/nofloat_lint.py int_rows.py: 0 violations).
IN_DIR holds prior3174.bin (1be91cb7...), CONSTELLATION-KEY.bin (cce4f1e8...),
MYTHOS-SELF-EMISSION.txt (d6e21534...) and MYTHOS-FULL-EMISSION.txt (9337a22b...).
usage: int_rows.py ENWIK9 IN_DIR [ASOLARIA-MYTHOS-SPHERE-PUMPED.gguf]"""
import sys, hashlib
from fractions import Fraction

E, IN = sys.argv[1], sys.argv[2]
GIANT = sys.argv[3] if len(sys.argv) > 3 else None
with open(E, "rb") as f:
    f.seek(600_000); H = f.read(600_000)
    f.seek(0); EN0 = f.read(3174)
assert len(H) == 600_000


def dec(s):
    """decimal string -> (R, k) integers, R = s * 10^k"""
    neg = s.startswith("-")
    s = s.lstrip("-")
    if "." in s:
        a, b = s.split(".")
    else:
        a, b = s, ""
    R = int(a + b) if (a + b) else 0
    return (-R if neg else R), len(b)


def rounds_to(n, d, rec):
    R, k = dec(rec)
    return int(2 * abs(n * 10 ** k - R * d) <= d)


def freeze(b):
    cnt = {}
    for i in range(2, len(b)):
        d = cnt.setdefault((b[i - 2], b[i - 1]), {})
        d[b[i]] = d.get(b[i], 0) + 1
    return {c: max(d, key=d.get) for c, d in cnt.items()}


def ctxs(t):
    return len(set(zip(t[:-2], t[1:-1])))


def mtp(t, end):
    m = freeze(t)
    tot = cov = x1 = x3 = ch3 = 0
    for i in range(2, end, 7):
        tot += 1
        c = (H[i - 2], H[i - 1])
        p = m.get(c)
        if p is None:
            continue
        cov += 1
        x1 += p == H[i]
        x3 += p == H[i + 2]
        ok = 1
        for dd in range(3):
            pr = m.get(c)
            if pr is None or pr != H[i + dd]:
                ok = 0
                break
            c = (c[1], pr)
        ch3 += ok
    return tot, cov, x1, x3, ch3


rd = lambda n: open(IN + "/" + n, "rb").read()
arms = {
    "JESSE_KEY": rd("prior3174.bin"),
    "MYTHOS_KEY": rd("CONSTELLATION-KEY.bin"),
    "SOURCE_EMISSION": rd("MYTHOS-SELF-EMISSION.txt"),
    "ENWIK9": EN0,
    "FULL_EMISSION_8233": rd("MYTHOS-FULL-EMISSION.txt"),
}
rec_screen = {"MYTHOS_KEY": "0.1519", "JESSE_KEY": "0.1601", "ENWIK9": "0.1279", "SOURCE_EMISSION": "0.1212"}
rec_mtp = {
    "JESSE_KEY": ("0.7350", "0.1836", "0.0346"),
    "MYTHOS_KEY": ("0.6590", "0.1503", "0.0326"),
    "SOURCE_EMISSION": ("0.6448", "0.1478", "0.0332"),
    "ENWIK9": ("0.4685", "0.0647", "0.0171"),
}
R = {}
for name, t in arms.items():
    tot, cov, x1, x3, ch3 = mtp(t, 599_966)
    nc = ctxs(t)
    R[name] = (tot, cov, x1, x3)
    line = (f"ARM|arm={name}|bytes={len(t)}|sha256={hashlib.sha256(t).hexdigest()}|ctxs={nc}"
            f"|anchors={tot}|covered={cov}|x1_hits={x1}|x3_hits={x3}|chained_x3_hits={ch3}")
    if name in rec_screen:
        line += f"|screen_rec={rec_screen[name]}|screen_rec_rounds_from_{nc}/{len(t)}={rounds_to(nc, len(t), rec_screen[name])}"
    if name in rec_mtp:
        rc, r1, r3 = rec_mtp[name]
        ok = [rounds_to(cov, tot, rc), rounds_to(x1, tot, r1), rounds_to(x3, tot, r3)]
        t9, c9, x19, x39, _ = mtp(t, 599_965)
        ok9 = [rounds_to(c9, t9, rc), rounds_to(x19, t9, r1), rounds_to(x39, t9, r3)]
        line += (f"|rec={rc}/{r1}/{r3}|rounds_at_{tot}={sum(ok)}_of_3"
                 f"|at_{t9}_anchors=covered_{c9}_x1_{x19}_x3_{x39}_rounds_{sum(ok9)}_of_3")
    if name == "FULL_EMISSION_8233":
        for k, (n, d, r) in {"coverage": (cov, tot, "0.6587"), "x1": (x1, tot, "0.1504"),
                             "x3": (x3, tot, "0.0357"), "screen": (nc, len(t), "0.0590")}.items():
            line += f"|{k}_prev_4dp={r}_rounds_from_{n}/{d}={rounds_to(n, d, r)}"
    print(line + "|json=0")

tot, cov, x1, x3, ch3 = mtp(arms["MYTHOS_KEY"], 599_973)
print(f"ANCHORS85711|arm=MYTHOS_KEY|anchors={tot}|covered={cov}|prev_4dp=0.6589_rounds={rounds_to(cov, tot, '0.6589')}|json=0")
tot, cov, x1, x3, ch3 = mtp(arms["MYTHOS_KEY"], 599_966)
print(f"CHAINED3|arm=MYTHOS_KEY|anchors={tot}|chained_x3_hits={ch3}|prev_4dp=0.0228_rounds={rounds_to(ch3, tot, '0.0228')}"
      f"|x3_hits={x3}|json=0")

m, j, s, e = R["MYTHOS_KEY"], R["JESSE_KEY"], R["SOURCE_EMISSION"], R["ENWIK9"]
ratios = {
    "vs_jesse_key_coverage": (m[1], j[1], "0.897"),
    "vs_jesse_key_x1": (m[2], j[2], "0.819"),
    "vs_own_source_x1": (m[2], s[2], "1.017"),
    "at_bytes_frac": (3174, 3796, "0.836"),
    "vs_enwik9_x1": (m[2], e[2], "2.32"),
}
for k, (n, d, r) in ratios.items():
    print(f"RATIO|k={k}|exact={n}/{d}|recorded={r}|recorded_rounds_from_exact={rounds_to(n, d, r)}|json=0")

print(f"TIEPCT|tied=31484|pieces=39976|recorded=78.76|rounds_from_3148400/39976={rounds_to(3148400, 39976, '78.76')}|json=0")
prod = 15064408719360000
sizes = [2, 4, 2, 2, 4, 2, 9, 5, 3, 2, 13, 12, 10, 9, 8, 7, 5, 3, 2, 22, 21, 20]
p = 1
for z in sizes:
    p *= z
print(f"TIEPRODUCT|product={p}|equals_record={int(p == prod)}|bit_length={p.bit_length()}"
      f"|2^{p.bit_length() - 1}<product<2^{p.bit_length()}={int((1 << (p.bit_length() - 1)) < p < (1 << p.bit_length()))}|json=0")

if GIANT:
    g = open(GIANT, "rb").read()
    P = 3174
    n = len(g) // P
    pieces = [g[i * P:(i + 1) * P] for i in range(n)]
    from collections import Counter
    cnt = Counter(pieces)
    tied = sum(c for c in cnt.values() if c >= 2)
    C = [ctxs(pc) for pc in pieces]
    sumc = sum(C)
    carried = sum(1 for c in C if c * 10 < 3 * P)  # screen c/P < 0.30, in integers
    print(f"CARRIED|screen_lt_3/10={carried}|of={n}|max_ctxs_per_piece={max(C)}|json=0")
    exact = Fraction(sumc, n * P)
    rec = Fraction("0.0013569263171007775")
    diff = rec - exact
    print(f"DIVIDE|bytes={len(g)}|sha256={hashlib.sha256(g).hexdigest()}|pieces={n}|remainder={len(g) - n * P}"
          f"|distinct={len(cnt)}|tied_ge_2={tied}|sum_ctxs={sumc}|exact_mean={exact.numerator}/{exact.denominator}"
          f"|recorded_minus_exact={diff.numerator}/{diff.denominator}"
          f"|recorded_rounds_from_exact_at_19dp={rounds_to(exact.numerator, exact.denominator, '0.0013569263171007775')}"
          f"|recorded_rounds_from_exact_at_16dp={rounds_to(exact.numerator, exact.denominator, '0.0013569263171008')}"
          f"|recorded_rounds_from_exact_at_15dp={rounds_to(exact.numerator, exact.denominator, '0.001356926317101')}"
          f"|json=0")
    for k in range(10, 20):
        print(f"DIVIDE_AGREE|places={k}|recorded_trunc_equals_exact_trunc="
              f"{int(rec.numerator * 10 ** k // rec.denominator == exact.numerator * 10 ** k // exact.denominator)}|json=0")
