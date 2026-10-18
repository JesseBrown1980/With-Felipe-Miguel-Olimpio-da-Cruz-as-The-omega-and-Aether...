"""Walk the stored key's piece sequence through greedy set cover; report rank and ties per step.

usage: python3 -I walk_greedy.py ENWIK9 EMISSION KEY [HELD_OFF] [VARIANT]
Candidates (asolaria_herself.py:252-255 reading, pool = emission alone):
  lines = [l for l in pool.split(b"\\n") if len(l) > 16]
  windows = pool[i:i+81] for i in range(0, len(pool)-81, 81)
Coverage (asolaria_herself.py:241,258-264): ctx(b) = set(zip(b[:-2], b[1:-1])) & held-out contexts.
Gain = new contexts / len(candidate), compared exactly as fractions.
VARIANT: 'herself' (default) | 'full' (ctx includes the last pair: zip(b[:-1], b[1:]))
"""
import sys
from fractions import Fraction

E, EM, KEYF = sys.argv[1:4]
HOFF = int(sys.argv[4]) if len(sys.argv) > 4 else 600_000
VAR = sys.argv[5] if len(sys.argv) > 5 else "herself"
with open(E, "rb") as f:
    f.seek(HOFF)
    H = f.read(600_000)
pool = open(EM, "rb").read()
key = open(KEYF, "rb").read()
TARGET = 3174


def ctx(b):
    if VAR == "full":
        return set(zip(b[:-1], b[1:])) if len(b) > 1 else set()
    return set(zip(b[:-2], b[1:-1])) if len(b) > 2 else set()


hc = ctx(H) if VAR != "full" else set(zip(H[:-1], H[1:]))
lines = [l for l in pool.split(b"\n") if len(l) > 16]
wins = [pool[i:i + 81] for i in range(0, max(len(pool) - 81, 0), 81)]
cands = []
seen = set()
for c in lines + wins:
    if c not in seen:
        seen.add(c)
        cands.append(c)
CC = [(c, ctx(c) & hc) for c in cands]
CC = [(c, s) for c, s in CC if s]
print(f"held [{HOFF},{HOFF+600000}) contexts {len(hc)}; lines {len(lines)}, windows {len(wins)}, "
      f"distinct cands {len(cands)}, with overlap {len(CC)}")

# stored key -> piece list (greedy longest candidate prefix; parse is unique, see parse_key.py)
pieces, p = [], 0
cset = {c for c, _ in CC} | set(cands)
while p < len(key):
    best = None
    for c in cands:
        if key.startswith(c, p) and (best is None or len(c) > len(best)):
            best = c
    if best is None:
        rest = key[p:]
        best = next(c for c in cands if c.startswith(rest))
        pieces.append((best, len(rest)))
        p = len(key)
    else:
        pieces.append((best, len(best)))
        p += len(best)

have, used = set(), 0
avail = list(CC)
tied_steps = 0
at_max = 0
first_off = None
for step, (pc, plen) in enumerate(pieces):
    gains = []
    for c, s in avail:
        nn = len(s - have)
        if nn > 0:
            gains.append((Fraction(nn, len(c)), c))
    mx = max(g for g, _ in gains)
    tops = [c for g, c in gains if g == mx]
    mine = next((Fraction(len(s - have), len(c)) for c, s in avail if c == pc), None)
    rank = 1 + sum(1 for g, _ in gains if mine is not None and g > mine)
    is_max = mine == mx
    at_max += is_max
    tied_steps += is_max and len(tops) > 1
    if not is_max and first_off is None:
        first_off = step
    kind = "L" if pc in lines else "W"
    off = pool.find(pc)
    print(f"step {step:2d} used={used:4d} piece={kind}@{off:5d} len={plen:3d} gain={mine} "
          f"({float(mine) if mine else 0:.6f}) max={mx} ({float(mx):.6f}) at_max={int(is_max)} "
          f"n_at_max={len(tops)} rank={rank}")
    if not is_max:
        print("        max candidates:", [(pool.find(c), len(c)) for c in tops][:8])
    s = next(s for c, s in avail if c == pc)
    have |= s
    used += plen
    avail = [(c, s2) for c, s2 in avail if c != pc]
print(f"steps {len(pieces)}; at max {at_max}; tied steps (stored piece at max with >1 at max) "
      f"{tied_steps}; first step off max {first_off}")
