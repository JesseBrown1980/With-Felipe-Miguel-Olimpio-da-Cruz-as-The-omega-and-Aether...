"""MTP rows as pinned: held-out enwik9[600000:1200000]; order-2 top-1 table frozen on the arm alone
(play_the_key.py freeze(): first-seen byte wins count ties); anchors i = 2, 9, ..., 599965 (85,710);
coverage = anchors whose context (h[i-2],h[i-1]) is in the table; x1 = prediction == h[i];
x3 = the same prediction == h[i+2]; all over all anchors. screen = distinct zip(b[:-2],b[1:-1]) / len(b).
usage: mtp_rows.py ENWIK9 NAME=FILE|NAME=enwik9:OFF:LEN ..."""
import sys, hashlib
E = sys.argv[1]
with open(E, "rb") as f:
    f.seek(600_000); H = f.read(600_000)
def freeze(b):
    cnt = {}
    for i in range(2, len(b)):
        d = cnt.setdefault((b[i - 2], b[i - 1]), {}); d[b[i]] = d.get(b[i], 0) + 1
    return {c: max(d, key=d.get) for c, d in cnt.items()}
for spec in sys.argv[2:]:
    name, src = spec.split("=", 1)
    if src.startswith("enwik9:"):
        _, o, l = src.split(":")
        with open(E, "rb") as f:
            f.seek(int(o)); t = f.read(int(l))
    else:
        t = open(src, "rb").read()
    m = freeze(t); tot = cov = x1 = x3 = 0
    for i in range(2, 599_966, 7):
        tot += 1; p = m.get((H[i - 2], H[i - 1]))
        if p is None: continue
        cov += 1; x1 += p == H[i]; x3 += p == H[i + 2]
    nc = len(set(zip(t[:-2], t[1:-1])))
    print(f"MTPROW|arm={name}|bytes={len(t)}|sha256={hashlib.sha256(t).hexdigest()}|ctxs={nc}|screen={nc/len(t):.4f}"
          f"|anchors={tot}|covered={cov}|coverage={cov/tot:.4f}|x1_hits={x1}|x1={x1/tot:.4f}|x3_hits={x3}|x3={x3/tot:.4f}|json=0")
