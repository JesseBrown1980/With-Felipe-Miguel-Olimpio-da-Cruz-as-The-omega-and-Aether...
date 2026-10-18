"""Derive 'chosen precedes every other tied candidate' constraints along the stored key's path.

usage: python3 -I constraints.py ENWIK9 EMISSION KEY OUT_JSON [EXTRA_TAIL]
Also checks that the constraints are acyclic and whether a 52 B tail window would ever
reach the maximum. Writes the tied steps as JSON (candidate indices into cands order).
"""
import sys, json
from fractions import Fraction
E, EM, KEYF, OUT = sys.argv[1:5]
TAIL = len(sys.argv) > 5
with open(E, "rb") as f:
    f.seek(600_000); H = f.read(600_000)
pool = open(EM, "rb").read(); key = open(KEYF, "rb").read()
ctx = lambda b: set(zip(b[:-2], b[1:-1])) if len(b) > 2 else set()
hc = ctx(H)
lines = [l for l in pool.split(b"\n") if len(l) > 16]
rng = range(0, len(pool), 81) if TAIL else range(0, len(pool) - 81, 81)
wins = [pool[i:i + 81] for i in rng]
cands = list(dict.fromkeys(lines + wins))
CC = [(c, ctx(c) & hc) for c in cands]
pieces, p = [], 0
while p < len(key):
    m = [c for c in cands if key.startswith(c, p)]
    if m:
        c = max(m, key=len); pieces.append(c); p += len(c)
    else:
        c = next(c for c in cands if c.startswith(key[p:])); pieces.append(c); p = len(key)
have = set(); avail = list(CC); steps = []; edges = set(); offmax = 0
for st, pc in enumerate(pieces):
    g = {c: Fraction(len(s - have), len(c)) for c, s in avail if len(s - have) > 0}
    mx = max(g.values()); tops = [c for c in g if g[c] == mx]
    if g.get(pc) != mx:
        offmax += 1
    steps.append(dict(step=st, chosen=cands.index(pc), tied=[cands.index(c) for c in tops]))
    for c in tops:
        if c != pc:
            edges.add((cands.index(pc), cands.index(c)))
    s = dict(avail)[pc]; have |= s; avail = [(c, s2) for c, s2 in avail if c != pc]
# acyclicity (Kahn)
nodes = {a for e in edges for a in e}
indeg = {n: 0 for n in nodes}
for a, b in edges: indeg[b] += 1
q = [n for n in nodes if indeg[n] == 0]; seen = 0
adj = {}
for a, b in edges: adj.setdefault(a, []).append(b)
while q:
    n = q.pop(); seen += 1
    for b in adj.get(n, []):
        indeg[b] -= 1
        if indeg[b] == 0: q.append(b)
print(f"cands {len(cands)} (tail window included: {TAIL}); steps {len(pieces)}; off-max steps {offmax}; "
      f"tied steps {sum(1 for s in steps if len(s['tied']) > 1)}; constraint edges {len(edges)}; "
      f"nodes {len(nodes)}; acyclic {seen == len(nodes)}")
json.dump(dict(cands=[c.hex() for c in cands], steps=steps), open(OUT, "w"))
