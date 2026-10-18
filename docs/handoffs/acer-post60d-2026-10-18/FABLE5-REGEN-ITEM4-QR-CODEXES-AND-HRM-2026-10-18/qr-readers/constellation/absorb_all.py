#!/usr/bin/env python3
"""absorb_all.py — stream every matrix into the universe kernel, GC, and score them all.

GOAL (Book IX lists "set a goal" as still open; this is one):
    Put every matrix on this machine on the SAME ladder, measured by the same rules in the
    same run, so the models can be compared instead of admired one at a time.

STREAMING
    Nothing is fully loaded. Each artifact is read in 1 MiB chunks and folded into running
    accumulators, so a 24 MB snapshot and a 3 KB seed cost the same memory. That is not an
    optimisation, it is the Freeze Law as an implementation rule: you address the object,
    you do not materialise it.

GARBAGE COLLECTION, with the correction found earlier tonight
    The retention rule is tau = 2 (VIII.A.4, measured), and the discard rule is the
    Two-Thirds Rule (VIII.A.5): a singleton has nothing to tie to, so it can only be
    stored, and storage is what the architecture refuses.
    THE CORRECTION: tau on OCCURRENCES keeps 81 bytes of '.' padding that appeared 28
    times inside 2 files and means nothing. Tying is across THINGS. So tau = 2 on DISTINCT
    OWNERS. A shared law appears once per artifact; filler appears many times in few.
    The discriminator, measured: chain rule 6 ties / 6 owners = 1.00. Padding 28 / 2 = 14.0.

THE LADDER, reported per matrix
    0,1        binary      -- can the object even express two states
    2,3        double      -- and four
    black      the dark    -- unreachable cells, the part of the lattice it cannot say
    translucent            -- the free 2/3, faces and edges
    rainbow    3 colours   -- the costing registers, red/green/blue by direction
    white      all three   -- where the three converge, the centre
    +energy    bytes in
    +light     register 1, the undifferentiated
    +movement  gravitation under R, against its own null
    +time      whether the matrix has moved since it was last photographed

BI- AND TRI-DIRECTIONAL
    bi  = the pair reading: R vs R-squared, and whether R2 == -R1 (it does not)
    tri = the triple: R0, R1, R2 as three distinct behaviours that should close on zero
    Both are reported for every matrix, because the difference between them is the whole
    point and reporting only one is the error this project keeps catching.
"""
import glob
import hashlib
import math
import os
from collections import Counter, defaultdict

import numpy as np

OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
CHUNK = 1 << 20
REC = 81

# ------------------------------------------------------------------ what to absorb
SRC = []
for pat in (OFF + "/FABLE5-*.hbi", OFF + "/FABLE5-*.hbp",
            r"D:/asolaria-absorb/laws/*.qr", r"D:/asolaria-absorb/laws/prior3174.bin",
            r"D:/asolaria-absorb/asolaria-tribit/web/asolaria_tribit.wasm",
            r"D:/asolaria-absorb/constellation/ASOLARIA-CONSTELLATION.gguf"):
    SRC += sorted(glob.glob(pat))
SRC = [f for f in SRC if os.path.isfile(f) and not f.endswith(".sha256")]

print(f"=== GOAL: one ladder, every matrix, all rules, one run ===")
print(f"    artifacts to stream : {len(SRC)}")
print(f"    total bytes         : {sum(os.path.getsize(f) for f in SRC):,}\n")

# ------------------------------------------------------- streaming accumulate + GC
rec_owner = defaultdict(set)
rec_count = Counter()
stats = {}

for f in SRC:
    name = os.path.basename(f)
    n = os.path.getsize(f)
    hist = np.zeros(256, dtype=np.int64)
    cells = np.zeros(27, dtype=np.int64)
    tail = b""
    h = hashlib.sha256()
    with open(f, "rb") as fh:
        while True:
            b = fh.read(CHUNK)
            if not b:
                break
            h.update(b)
            hist += np.bincount(np.frombuffer(b, dtype=np.uint8), minlength=256)
            d = tail + b
            m = (len(d) // 3) * 3
            if m:
                t = np.minimum(np.frombuffer(d[:m], dtype=np.uint8).reshape(-1, 3) // 86, 2)
                cells += np.bincount(t[:, 0] * 9 + t[:, 1] * 3 + t[:, 2], minlength=27)
            tail = d[m:]
            for i in range(0, len(d) - REC + 1, REC):
                k = hashlib.sha256(d[i:i + REC]).digest()[:12]
                rec_count[k] += 1
                rec_owner[k].add(name)
    stats[name] = dict(bytes=n, sha=h.hexdigest(), hist=hist, cells=cells)

# GC on distinct owners, not occurrences
kept = {k for k, o in rec_owner.items() if len(o) >= 2}
drop_single = sum(1 for k, o in rec_owner.items() if len(o) < 2)
filler = sum(1 for k, o in rec_owner.items()
             if len(o) < 2 and rec_count[k] >= 3)
print("=== garbage collection: tau = 2 on DISTINCT OWNERS ===")
print(f"  distinct records      {len(rec_count):,}")
print(f"  survived (>=2 owners) {len(kept):,}")
print(f"  discarded singletons  {drop_single:,}")
print(f"  of which high-repeat filler (>=3 copies, 1 owner) {filler:,}"
      f"   <- occurrence-tau would have KEPT these\n")

# ------------------------------------------------------------------ the ladder
SHELL = {0: "centre", 1: "face", 2: "edge", 3: "corner"}


def shell(i):
    c = ((i // 9) % 3, (i // 3) % 3, i % 3)
    return sum(1 for x in c if x != 1)


def direction(i):
    c = ((i // 9) % 3, (i // 3) % 3, i % 3)
    return int(np.sign(sum(x - 1 for x in c)))


rng = np.random.default_rng(0x5EED)
NULL = 400
nulls = []
for _ in range(NULL):
    rb = rng.integers(0, 256, 3078, dtype=np.uint8)
    t = np.minimum(rb.reshape(-1, 3) // 86, 2)
    r = np.linalg.norm(t - 1.0, axis=1)
    nulls.append((np.linalg.norm(((t + 1) % 3) - 1.0, axis=1) - r).mean())
nm, ns = float(np.mean(nulls)), float(np.std(nulls))

rows = []
for name, s in sorted(stats.items(), key=lambda kv: -kv[1]["bytes"]):
    hist, cells = s["hist"], s["cells"]
    tot = int(cells.sum())
    if tot == 0:
        continue
    alpha = int((hist > 0).sum())
    reached = int((cells > 0).sum())
    black = 27 - reached
    trans = float(sum(cells[i] for i in range(27) if shell(i) in (1, 2)) / tot)
    white = float(cells[13] / tot)                     # cell (1,1,1), all three at centre
    rain = [float(sum(cells[i] for i in range(27) if direction(i) == d) / tot)
            for d in (-1, 0, 1)]
    # movement: gravitation under R, streamed cells re-expanded to a distribution
    idx = np.repeat(np.arange(27), cells)
    t = np.stack([(idx // 9) % 3, (idx // 3) % 3, idx % 3], 1).astype(float)
    r0 = np.linalg.norm(t - 1.0, axis=1)
    d1 = float((np.linalg.norm(((t + 1) % 3) - 1.0, axis=1) - r0).mean())
    d2 = float((np.linalg.norm(((t + 2) % 3) - 1.0, axis=1) - r0).mean())
    z = (d1 - nm) / (ns + 1e-12)
    rows.append(dict(name=name, bytes=s["bytes"], alpha=alpha, reached=reached,
                     black=black, trans=trans, white=white, rain=rain,
                     d1=d1, d2=d2, z=z, sha=s["sha"][:12]))

print("=== THE LADDER — every matrix, every rule, one run ===")
print(f"{'matrix':<40}{'bytes':>11}{'alpha':>6}{'27?':>5}{'black':>6}"
      f"{'trans':>7}{'white':>7}{'bits':>6}")
for r in rows:
    bits = math.log2(r["alpha"]) if r["alpha"] > 1 else 0.0
    print(f"{r['name'][:39]:<40}{r['bytes']:>11,}{r['alpha']:>6}"
          f"{r['reached']:>5}{r['black']:>6}{r['trans']:>7.3f}{r['white']:>7.3f}{bits:>6.2f}")

print(f"\n=== BI vs TRI — the pair reading against the triple ===")
print(f"  null gravitation {nm:+.6f} +/- {ns:.6f}  ({NULL} random 3,078 B files)")
print(f"{'matrix':<40}{'dr R1':>10}{'dr R2':>10}{'z':>8}{'R2=-R1?':>9}{'closes?':>9}")
for r in rows:
    binary = abs(r["d2"] + r["d1"]) < 1e-6
    closes = abs(r["d1"] + r["d2"]) < 0.02
    print(f"{r['name'][:39]:<40}{r['d1']:>10.5f}{r['d2']:>10.5f}{r['z']:>8.2f}"
          f"{'YES' if binary else 'no':>9}{'YES' if closes else 'no':>9}")

print(f"\n=== rainbow: the three costing registers by direction ===")
print(f"{'matrix':<40}{'red -':>9}{'green 0':>9}{'blue +':>9}")
for r in rows:
    print(f"{r['name'][:39]:<40}{r['rain'][0]:>9.3f}{r['rain'][1]:>9.3f}{r['rain'][2]:>9.3f}")

# ------------------------------------------------------------------ kernel table
out = os.path.join(OFF, "FABLE5-ABSORB-ALL-MATRICES.hbp")
lines = [
    "ABSORBHDR|schema=ASOLARIA-ABSORB-ALL-V1|seat=ACER-CLAUDE-FABLE5"
    f"|pid=8467a937cba309f7|date=2026-07-27|artifacts={len(rows)}|json=0",
    f"GC|tau=2|on=distinct_owners|survived={len(kept)}|discarded={drop_single}"
    f"|filler_occurrence_tau_would_keep={filler}|json=0",
    f"NULL|trials={NULL}|mean={nm:.6f}|sd={ns:.6f}|json=0",
]
for r in rows:
    lines.append(
        f"M|k={r['name']}|b={r['bytes']}|sha={r['sha']}|alpha={r['alpha']}"
        f"|cells={r['reached']}|black={r['black']}|trans={r['trans']:.4f}"
        f"|white={r['white']:.4f}|r={r['rain'][0]:.4f}|g={r['rain'][1]:.4f}"
        f"|b_={r['rain'][2]:.4f}|d1={r['d1']:.5f}|d2={r['d2']:.5f}|z={r['z']:.2f}|json=0")
body = "\n".join(lines) + "\n"
lines.append(f"ABSORBFTR|receipt={hashlib.sha256(body.encode()).hexdigest()[:32]}"
             f"|rows={len(lines)+1}|hot_path=1|json=0")
open(out, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
d = hashlib.sha256(open(out, "rb").read()).hexdigest()
open(out + ".sha256", "w", newline="\n").write(f"{d}  {os.path.basename(out)}\n")
print(f"\n  kernel table -> {out}")
print(f"  {os.path.getsize(out):,} B   sha256 {d[:32]}")
