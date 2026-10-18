"""Parse the stored key as a concatenation of candidate pieces of the emission (DP, all parses).

usage: python3 -I parse_key.py KEY EMISSION [MINLINE] [WIN] [SEP]
Candidates: lines of the emission (split on \\n) longer than MINLINE (default 16), and
fixed windows emission[i:i+WIN] for i in range(0, len-WIN, WIN) (default WIN 81).
The last piece may be a prefix of a candidate (budget truncation).
"""
import sys

key = open(sys.argv[1], "rb").read()
src = open(sys.argv[2], "rb").read()
MINLINE = int(sys.argv[3]) if len(sys.argv) > 3 else 16
WIN = int(sys.argv[4]) if len(sys.argv) > 4 else 81
SEP = sys.argv[5].encode().decode("unicode_escape").encode("latin1") if len(sys.argv) > 5 else b""

cands = {}
lines = src.split(b"\n")
pos = 0
for li, l in enumerate(lines):
    if len(l) > MINLINE:
        cands.setdefault(l, []).append(("L", li, pos))
    pos += len(l) + 1
for i in range(0, max(len(src) - WIN, 0), WIN):
    cands.setdefault(src[i:i + WIN], []).append(("W", i // WIN, i))
print(f"emission {len(src)} B, lines>{MINLINE}: {sum(1 for l in lines if len(l) > MINLINE)}, "
      f"windows: {len(range(0, max(len(src) - WIN, 0), WIN))}, distinct candidates {len(cands)}")

# DP: ways[p] = list of (prev_p, cand) reaching key position p
N = len(key)
reach = {0: []}
order = [0]
paths = {0: [[]]}
for p in range(N + 1):
    if p not in paths:
        continue
    if p == N:
        continue
    rest = key[p:]
    for c, tags in cands.items():
        if p > 0 and SEP:
            pass
        if rest.startswith(c):
            q = p + len(c)
            if SEP and q < N:
                if not key[q:].startswith(SEP):
                    continue
                q += len(SEP)
            for pp in paths[p]:
                paths.setdefault(q, [])
                if len(paths[q]) < 4:
                    paths[q].append(pp + [(c, tags)])
        elif c.startswith(rest):  # truncated last piece
            for pp in paths[p]:
                paths.setdefault(N, [])
                if len(paths[N]) < 4:
                    paths[N].append(pp + [(rest, tags + [("TRUNC", len(rest), len(c))])])
full = paths.get(N, [])
print("parses found:", len(full))
for k, parse in enumerate(full[:2]):
    print(f"--- parse {k}: {len(parse)} pieces")
    kp = 0
    for j, (c, tags) in enumerate(parse):
        print(f"{j:3d} kpos={kp:5d} len={len(c):3d} {tags} {c[:50]!r}")
        kp += len(c) + (len(SEP) if j < len(parse) - 1 else 0)
