#!/usr/bin/env python3
"""stream_star.py — stream any star's REAL bytes through the corrected path ladder.

REUSABLE. Every star after this is one call. The rules are fixed here so no star gets a
different measurement than another:

  PATHS      3, 5, 7, 9, 11, 13, 17.  Jesse's law; 1 and 2 avoided.
             (base 2 also loses on radix economy: 2.8854 vs base 3's 2.7307, 5.66%.)
  FREE SPACE each path's ownership vector is centred and projected onto the complement
             of the all-ones NULL direction. N channels -> N-1 free dimensions. The null
             component is verified < 1e-15 per star per path, not assumed.
  BODY       the star's OWN bytes only. Config, manifest, source. Never prose about it -
             that mistake changed a trime direction from [+0-] to [+--] on K3 and had to
             be withdrawn.
  GC         VIII.A.5 81-byte records, VIII.A.4 tau=2, reported even when vacuous.
  COMPARE    angle to ASOLARIA, to MYTHOS-second-calling, and to every star already
             streamed. Reported as mean +/- std across the seven paths, because the
             paths provably do NOT converge (37.75 deg mean step) and the STD is where
             the stable relationships show.

usage:  python stream_star.py NAME path/to/bytes [more/paths ...]
"""
import glob
import hashlib
import json
import math
import os
import sys

import numpy as np

BIG = r"D:/asolaria-absorb/kernel-pump"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
PATHS = [3, 5, 7, 9, 11, 13, 17]
REC, TAU = 81, 2
REG = os.path.join(BIG, "_star_registry.json")


def own(raw, N):
    a = np.frombuffer(raw, np.uint8).astype(np.int64)
    m = len(a) // N * N
    if m == 0:
        return np.ones(N)
    t = a[:m].reshape(-1, N)
    lead = np.argmax(t, axis=1)
    tie = (t.max(1)[:, None] == t).sum(1) > 1
    c = np.array([float((lead == i)[~tie].sum()) for i in range(N)])
    return c / (c.sum() or 1) * N


def basis(N):
    o = np.ones(N) / math.sqrt(N)
    U, S, _ = np.linalg.svd(np.eye(N) - np.outer(o, o))
    return U[:, S > 1e-9], o


BAS = {N: basis(N) for N in PATHS}


def coords(raw):
    out, nulls = {}, []
    for N in PATHS:
        B, nd = BAS[N]
        v = own(raw, N) - np.ones(N)
        nulls.append(abs(float(np.dot(v, nd))))
        out[N] = B.T @ v
    return out, max(nulls)


def ang(u, v):
    nu, nv = np.linalg.norm(u), np.linalg.norm(v)
    if nu < 1e-12 or nv < 1e-12:
        return float("nan")
    return math.degrees(math.acos(max(-1, min(1, float(np.dot(u, v) / (nu * nv))))))


def trime3(raw):
    a = np.frombuffer(raw, np.uint8).astype(np.int64)
    n = len(a) // 3
    t = a[:n * 3].reshape(n, 3)
    lead = np.argmax(t, axis=1)
    tie = (t.max(1)[:, None] == t).sum(1) > 1
    o = [float((lead == i)[~tie].sum()) for i in range(3)]
    s = sum(o) or 1
    R, G, B = [100 * x / s for x in o]
    f = lambda v: 0 if abs(v - 100 / 3) < 0.75 else (1 if v > 100 / 3 else -1)
    S = {-1: "-", 0: "0", 1: "+"}
    d = (f(R), f(G), f(B))
    return R, G, B, f"[{S[d[0]]}{S[d[1]]}{S[d[2]]}]"


def gc_of(raw):
    m = len(raw) // REC * REC
    if m == 0:
        return 0, 0
    R = np.frombuffer(raw, np.uint8)[:m].reshape(-1, REC)
    h = [hashlib.blake2b(r.tobytes(), digest_size=8).digest() for r in R]
    from collections import Counter
    c = Counter(h)
    return len(R), sum(1 for x in h if c[x] >= TAU)


# ---- reference bodies, fixed
ASO = open(os.path.join(BIG, "MYTHOS-FULL-EMISSION.txt"), "rb").read()
MY2 = open(os.path.join(BIG, "MYTHOS-SECOND-CALLING.txt"), "rb").read()
REFS = {"ASOLARIA": ASO, "MYTHOS-2nd": MY2}
reg = json.load(open(REG)) if os.path.exists(REG) else {}

name = sys.argv[1]
raw = b""
for p in sys.argv[2:]:
    for f in sorted(glob.glob(p)):
        if os.path.isfile(f):
            raw += open(f, "rb").read() + b"\n"
assert raw, "no bytes"
C, maxnull = coords(raw)
R, G, Bc, tr = trime3(raw)
nrec, ntie = gc_of(raw)

print(f"=== STREAMING STAR: {name} ===")
print(f"  real bytes {len(raw):,}   trime {tr}  R {R:.2f} G {G:.2f} B {Bc:.2f}")
print(f"  max |null component| {maxnull:.2e}  "
      f"{'FREE' if maxnull < 1e-13 else 'NOT NULL — WRONG'}")
print(f"  GC: {nrec} records, tie>={TAU}: {ntie}  "
      f"{'(vacuous)' if ntie == 0 else ''}")
print(f"\n  {'path':>5}{'free':>6}{'norm':>10}   angle to each reference (deg)")
hdr = list(REFS) + [k for k in reg if k != name]
print(f"  {'':>5}{'':>6}{'':>10}   " + "".join(f"{h[:13]:>15}" for h in hdr))
ANG = {h: [] for h in hdr}
for N in PATHS:
    row = ""
    for h in hdr:
        v = coords(REFS[h])[0][N] if h in REFS else np.array(reg[h]["coords"][str(N)])
        a = ang(C[N], v)
        ANG[h].append(a)
        row += f"{a:>15.2f}"
    print(f"  {N:>5}{N-1:>6}{np.linalg.norm(C[N]):>10.4f}   {row}")

print(f"\n  {'reference':<16}{'mean':>9}{'std':>9}   reading")
SUM = {}
for h in hdr:
    v = np.array(ANG[h])
    SUM[h] = (float(v.mean()), float(v.std()))
    rd = ("STABLE relation" if v.std() < 10 else
          "loosely held" if v.std() < 20 else "no stable relation")
    print(f"  {h:<16}{v.mean():>9.2f}{v.std():>9.2f}   {rd}")
best = min(SUM, key=lambda k: SUM[k][1])
print(f"\n  most STABLE relationship (lowest std): {best}  "
      f"{SUM[best][0]:.1f} +/- {SUM[best][1]:.1f} deg")

reg[name] = dict(bytes=len(raw), R=R, G=G, B=Bc, trime=tr, maxnull=maxnull,
                 records=nrec, tied=ntie,
                 coords={str(N): C[N].tolist() for N in PATHS},
                 summary={h: SUM[h] for h in SUM})
json.dump(reg, open(REG, "w"), indent=1)

rows = [f"STARHDR|schema=ASOLARIA-STREAM-STAR-V1|seat=ACER-CLAUDE-FABLE5"
        f"|pid=8467a937cba309f7|date=2026-07-27|star={name}|json=0",
        f"BODY|bytes={len(raw)}|own_bytes_only=1|prose=0|R={R:.3f}|G={G:.3f}"
        f"|B={Bc:.3f}|trime={tr}|json=0",
        f"NULL|max_component={maxnull:.3e}|free={1 if maxnull<1e-13 else 0}|json=0",
        f"GC|records={nrec}|tie_ge_{TAU}={ntie}|vacuous={1 if ntie==0 else 0}|json=0",
        f"PATHS|set=3,5,7,9,11,13,17|avoid=1,2|non_converging=1|json=0"]
for N in PATHS:
    rows.append(f"PATH|N={N}|free={N-1}|norm={np.linalg.norm(C[N]):.5f}"
                + "".join(f"|{h}={ANG[h][PATHS.index(N)]:.3f}" for h in hdr) + "|json=0")
for h in hdr:
    rows.append(f"REL|to={h}|mean={SUM[h][0]:.3f}|std={SUM[h][1]:.3f}|json=0")
rows.append(f"STABLE|most={best}|mean={SUM[best][0]:.3f}|std={SUM[best][1]:.3f}|json=0")
b = "\n".join(rows) + "\n"
rows.append(f"STARFTR|receipt={hashlib.sha256(b.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
p = os.path.join(OFF, f"FABLE5-STAR-{name}.hbp")
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(p + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(p, "rb").read()).hexdigest() + f"  FABLE5-STAR-{name}.hbp\n")
print(f"  receipt {p}")
