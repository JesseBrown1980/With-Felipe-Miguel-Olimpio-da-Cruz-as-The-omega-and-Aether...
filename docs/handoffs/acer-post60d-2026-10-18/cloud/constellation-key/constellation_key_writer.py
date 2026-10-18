#!/usr/bin/env python3
"""Hypothesised writer of ASOLARIA-CONSTELLATION-KEY-3174.bin (the original program is not public).

Method recorded in KEY-3174.hbp: greedy set cover on held-out order-2 contexts, budget 3174,
criterion coverage per byte. Definitions are those of asolaria_herself.py:239-291, with the
pool = MYTHOS-FULL-EMISSION.txt alone, no must-keep lines, and the pieces joined with b"".

usage: python3 -I constellation_key_writer.py ENWIK9 EMISSION OUT [--order set|list|file:PATH]
  set   candidates = list({...}) as asolaria_herself.py:254 (order follows the hash secret;
        run with PYTHONHASHSEED=k and -P -s instead of -I to fix it)
  list  candidates in lines-then-windows order (deterministic)
  file  candidates in the order given by a file of candidate indices (lines-then-windows
        numbering), one per line
  ties:i,j,...  lines-then-windows order, but at the n-th step with more than one candidate at
        the maximum take the i-th of them (0-based, in that order) instead of the first
Prints one STEP line per greedy pick with the number of candidates at the maximum.
"""
import hashlib
import sys
from fractions import Fraction

E, EM, OUT = sys.argv[1:4]
ORDER = sys.argv[5] if len(sys.argv) > 5 and sys.argv[4] == "--order" else "set"
TARGET = 3174

HELD = open(E, "rb").read(20_600_000)[600_000:1_200_000]   # enwik9[600000:1200000]
hc = set(zip(HELD[:-2], HELD[1:-1]))
pool = open(EM, "rb").read()
lines = [l for l in pool.split(b"\n") if len(l) > 16]
wins = [pool[i:i + 81] for i in range(0, max(len(pool) - 81, 0), 81)]
TIES = None
if ORDER.startswith("ties:"):
    TIES = [int(x) for x in ORDER[5:].split(",") if x != ""]
    ORDER = "list"
if ORDER == "set":
    cands = list({bytes(x) for x in lines + wins})
elif ORDER == "list":
    cands = list(dict.fromkeys(lines + wins))
elif ORDER.startswith("file:"):
    base = list(dict.fromkeys(lines + wins))
    idx = [int(x) for x in open(ORDER[5:]).read().split()]
    cands = [base[i] for i in idx] + [c for j, c in enumerate(base) if j not in set(idx)]
else:
    raise SystemExit("bad --order")


def ctx(b):
    return set(zip(b[:-2], b[1:-1])) if len(b) > 2 else set()


CC = [(c, ctx(c) & hc) for c in cands]
CC = [(c, s) for c, s in CC if s]
sel, have, used, step = [], set(), 0, 0
while used < TARGET and CC:
    best, bg, nmax, fmax = None, -1, 0, None
    for c, s in CC:
        nn = len(s - have)
        if nn <= 0:
            continue
        g = nn / len(c)
        f = Fraction(nn, len(c))
        if fmax is None or f > fmax:
            fmax, nmax = f, 1
        elif f == fmax:
            nmax += 1
        if g > bg:
            bg, best = g, (c, s)
    if not best:
        break
    if TIES is not None and nmax > 1:
        tops = [(c, s) for c, s in CC if len(s - have) > 0 and Fraction(len(s - have), len(c)) == fmax]
        best = tops[TIES.pop(0)]
    c, s = best
    if used + len(c) > TARGET:
        c = c[:TARGET - used]
    print(f"STEP|n={step}|used={used}|off={pool.find(best[0])}|len={len(c)}|gain={fmax}"
          f"|at_max={nmax}|json=0")
    sel.append(c)
    have |= s
    used += len(c)
    step += 1
    CC = [(x, y) for x, y in CC if x != best[0]]
key = b"".join(sel)[:TARGET]
open(OUT, "wb").write(key)
print(f"KEY|bytes={len(key)}|sha256={hashlib.sha256(key).hexdigest()}|steps={step}|json=0")
