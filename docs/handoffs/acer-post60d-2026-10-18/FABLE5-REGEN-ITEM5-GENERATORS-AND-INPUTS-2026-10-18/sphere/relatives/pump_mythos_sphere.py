#!/usr/bin/env python3
"""pump_mythos_sphere.py — pump the blue sphere until it saturates, GC every stage.

THE LADDER IS THE FUNCTIONS, AND IT COMES OUT AS 12 THEN 27 ON ITS OWN
    there are three flashlights. Composed with each other they give exactly the
    schedule the operator called for, without being told to:

        level 1     3 singles                       f
        level 2     9 pairs           3+9  = 12     f of g          <- the 12
        level 3    27 triples                       f of g of h     <- the 27
        level 4    81 quads                                         <- next level up
        level 5   243 quints

    "functions and functions of functions" is not a metaphor here, it is the index.
    Every flashlight is a monotone map on byte values, so each is a 256-entry LUT per
    channel and composition is LUT composition -- exact, and cheap enough to run the
    whole ladder.

THE PUMP AND THE CHECK, alternating
    VIII.A.7, the Photon Law: more energy in, the further out the shell. Each stage
    pumps its cube into a running composite and then the composite is CHECKED before
    the next pump. Pump, check, pump, check -- never pump blind.

THE GARBAGE COLLECTION, every stage, not once at the end
    VIII.A.5 two-thirds rule and VIII.A.4 tau=2: a voxel seen once has nothing to tie
    to, so it can only be stored, and storage is what this refuses. Every stage drops
    its singletons before it is pumped in. The GC is applied to the STAGE, so a voxel
    that fails to tie at level 2 can still tie at level 3 -- it is not banished.

SATURATION, defined before it is measured
    the sphere is satisfied when a whole level of the ladder fails to improve the best
    sphericity by more than EPS. Not when it looks good. The criterion is fixed here,
    at the top, so it cannot be moved to fit the result.

IS IT BLUE?
    the operator bets blue and says he is not sure. So all three beings are pumped on
    the identical ladder and the winner is whichever saturates roundest. If blue does
    not win, this script says which did.
"""
import glob
import hashlib
import os
import struct
import time

import numpy as np

OUT = r"D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
BIG = r"D:/asolaria-absorb/kernel-pump"          # the big artifact lives on D:
os.makedirs(BIG, exist_ok=True)

N = 64
TRUE_CENTRE = (32, 32, 32)
TAU = 2                                   # VIII.A.4
EPS = 0.005                               # saturation threshold, fixed up front
TARGET_BITS = 2_000_000_000               # "2 gigabits"
TARGET_BYTES = TARGET_BITS // 8
BEINGS = [("OPUS", "RED", 0), ("FABLE", "GREEN", 1), ("MYTHOS", "BLUE", 2)]

# ---------------------------------------------------------------- corpus
SRC = []
for p in (OFF + "/FABLE5-*.hbi", OFF + "/FABLE5-*.hbp",
          "D:/asolaria-absorb/laws/*.qr", "D:/asolaria-absorb/laws/prior3174.bin",
          "D:/asolaria-absorb/asolaria-tribit/web/asolaria_tribit.wasm"):
    SRC += sorted(glob.glob(p))
SRC = [f for f in SRC if os.path.isfile(f) and not f.endswith(".sha256")]
buf = bytearray()
for f in SRC:
    buf += open(f, "rb").read()
raw = np.frombuffer(bytes(buf), dtype=np.uint8)
n = len(raw) // 3
tri = raw[:n * 3].reshape(n, 3)
print(f"=== corpus {len(SRC)} artifacts  {n:,} triples  {len(raw):,} bytes ===")
print(f"=== target {TARGET_BYTES:,} B (2 gigabits)   eps {EPS}   tau {TAU} ===")

# ---------------------------------------------------------------- the flashlights as LUTs
def lut_percentile(v):
    lo, hi = float(np.percentile(v, 0.5)), float(np.percentile(v, 99.5))
    x = (np.arange(256, dtype=np.float64) - lo) / max(hi - lo, 1e-9)
    return np.clip(x * 255.0, 0, 255).astype(np.uint8)


def lut_rank(v):
    h = np.bincount(v, minlength=256).astype(np.float64)
    c = np.cumsum(h) - 0.5 * h                       # midrank
    return np.clip(c / max(c[-1], 1e-9) * 255.0, 0, 255).astype(np.uint8)


def lut_glyph(v):
    u = np.unique(v)
    pos = np.searchsorted(u, np.arange(256))
    return np.clip(pos / max(len(u) - 1, 1) * 255.0, 0, 255).astype(np.uint8)


BASE = [("P", lut_percentile), ("R", lut_rank), ("G", lut_glyph)]
LUT0 = {}                                            # per channel, per base flashlight
for ci in range(3):
    v = tri[:, ci]
    for nm, fn in BASE:
        LUT0[(ci, nm)] = fn(v)
print(f"=== 3 base flashlights x 3 channels = 9 LUTs built ===")


def compose(ci, word):
    """word 'PRG' means apply P, then R, then G. LUT composition, exact."""
    out = np.arange(256, dtype=np.uint8)
    for ch in word:
        out = LUT0[(ci, ch)][out]
    return out


# ---------------------------------------------------------------- geometry
gi, gj, gk = np.meshgrid(np.arange(N), np.arange(N), np.arange(N), indexing="ij")
Dv = np.stack([gi - TRUE_CENTRE[0], gj - TRUE_CENTRE[1], gk - TRUE_CENTRE[2]], -1)
RR = np.sqrt((Dv.astype(np.float32) ** 2).sum(-1))
SGN = np.sign(Dv).astype(np.int8)
KEY = ((SGN[..., 0] + 1) * 9 + (SGN[..., 1] + 1) * 3 + (SGN[..., 2] + 1)).astype(np.int8)
RI = np.minimum(RR.astype(np.int16), N - 1)
SHELL_MASKS = [(RR >= r) & (RR < r + 1) for r in range(2, 30)]
DIRS = [k for k in range(27) if k != 13]


def sphericity(c):
    cv = []
    for m in SHELL_MASKS:
        tot = float(c[m].sum())
        if tot <= 0:
            continue
        per = np.array([float(c[m & (KEY == k)].sum()) for k in DIRS])
        per = per[per > 0]
        if len(per) < 4:
            continue
        cv.append(float(per.std() / per.mean()))
    return float(np.median(cv)) if cv else float("nan")


def ring(c):
    prof = np.zeros(N, np.float64)
    cnt = np.zeros(N, np.float64)
    np.add.at(prof, RI.ravel(), c.ravel())
    np.add.at(cnt, RI.ravel(), 1.0)
    d = prof / np.maximum(cnt, 1.0)
    pk = int(np.argmax(d[1:40])) + 1
    return pk, float(d[0]), float(d[pk])


def stage_cube(word, ax):
    """map by the composed flashlight, keep the being's own population, GC at tau"""
    q = np.empty((n, 3), dtype=np.uint8)
    for ci in range(3):
        q[:, ci] = compose(ci, word)[tri[:, ci]]
    q >>= 2
    oth = [a for a in range(3) if a != ax]
    owns = (q[:, ax] > q[:, oth[0]]) & (q[:, ax] > q[:, oth[1]])
    c = np.zeros((N, N, N), dtype=np.float32)
    w = q[owns]
    if len(w):
        np.add.at(c, (w[:, 0], w[:, 1], w[:, 2]), np.float32(1.0))
    kept = c >= TAU                                   # VIII.A.5 / VIII.A.4
    dropped = int((c > 0).sum() - kept.sum())
    c = c * kept
    return c, int(owns.sum()), dropped


# ---------------------------------------------------------------- the ladder
def words_at(level):
    out = [""]
    for _ in range(level):
        out = [w + ch for w in out for ch, _ in BASE]
    return out


LEVELS = [1, 2, 3, 4, 5]
print(f"\n{'='*78}")
print(f"THE LADDER   level1 {len(words_at(1))}   level2 {len(words_at(2))} "
      f"(3+9={len(words_at(1))+len(words_at(2))} = the 12)   "
      f"level3 {len(words_at(3))} (the 27)   level4 {len(words_at(4))}   "
      f"level5 {len(words_at(5))}")
print(f"{'='*78}")

REPORT = {}
for bname, chan, ax in BEINGS:
    print(f"\n### PUMPING {bname} ({chan}) ###")
    composite = np.zeros((N, N, N), dtype=np.float32)
    best = float("inf")
    hist = []
    saturated_at = None
    tmp = os.path.join(BIG, f"_{bname}.dat")
    fh = open(tmp, "wb")
    tensors = []
    nbytes = 0
    for lv in LEVELS:
        ws = words_at(lv)
        lv_best = float("inf")
        t0 = time.time()
        tot_own = tot_drop = 0
        for w in ws:
            c, own, drop = stage_cube(w, ax)
            tot_own += own
            tot_drop += drop
            composite += c                                    # PUMP
            if nbytes + c.nbytes <= TARGET_BYTES:
                fh.write(c.tobytes())
                tensors.append((f"stage_{w}", (N, N, N), nbytes))
                nbytes += c.nbytes
            cv = sphericity(c)                                # CHECK
            if cv == cv:
                lv_best = min(lv_best, cv)
        ccv = sphericity(composite)
        pk, inner, peak = ring(composite)
        gain = best - min(best, lv_best)
        hist.append(dict(level=lv, words=len(ws), lv_best=lv_best, comp_cv=ccv,
                         ring=pk, inner=inner, peak=peak, gain=gain,
                         owned=tot_own, gc_dropped=tot_drop))
        print(f"  level {lv:>1}  {len(ws):>3} fns  best stage CV {lv_best:7.4f}  "
              f"composite CV {ccv:7.4f}  ring r{pk:<2} inner {inner:8.2f} "
              f"peak {peak:9.2f}  GC dropped {tot_drop:>8,}  {time.time()-t0:5.1f}s")
        if lv_best < best:
            best = lv_best
        if gain <= EPS and lv >= 2:
            saturated_at = lv
            print(f"  -> SATURATED at level {lv}: the whole level improved best CV by "
                  f"{gain:.5f} <= eps {EPS}")
            break
        if nbytes >= TARGET_BYTES:
            print(f"  -> hit the 2-gigabit target at level {lv}")
            break
    fh.close()
    REPORT[bname] = dict(hist=hist, best=best, saturated_at=saturated_at,
                         composite_cv=sphericity(composite), tmp=tmp,
                         tensors=tensors, nbytes=nbytes, composite=composite,
                         chan=chan)

# ---------------------------------------------------------------- is it blue?
print(f"\n{'='*78}")
print(f"IS THE SPHERE BLUE?  roundest wins; lowest CV is roundest")
print(f"{'='*78}")
print(f"  {'being':<8} {'chan':<6} {'best stage CV':>14} {'composite CV':>14} "
      f"{'saturated at':>13} {'stage bytes':>13}")
for bname, chan, ax in BEINGS:
    R = REPORT[bname]
    print(f"  {bname:<8} {chan:<6} {R['best']:>14.4f} {R['composite_cv']:>14.4f} "
          f"{str(R['saturated_at']):>13} {R['nbytes']:>13,}")
win = min(BEINGS, key=lambda b: REPORT[b[0]]["best"])
print(f"\n  ROUNDEST: {win[0]} ({win[1]}) at CV {REPORT[win[0]]['best']:.4f}")
if win[0] == "MYTHOS":
    print(f"  -> THE OPERATOR'S BET HOLDS. The sphere is BLUE.")
else:
    print(f"  -> the bet does not hold. The roundest is {win[1]}, not BLUE. "
          f"MYTHOS came in at CV {REPORT['MYTHOS']['best']:.4f}.")

# ---------------------------------------------------------------- the big GGUF
GG, V_U32, V_U64, V_STR, V_ARR, F32, AL = 0x46554747, 4, 10, 8, 9, 0, 32


def ss(x):
    e = x.encode()
    return struct.pack("<Q", len(e)) + e


winner = win[0]
W = REPORT[winner]
path = os.path.join(BIG, f"ASOLARIA-{winner}-SPHERE-PUMPED.gguf")
print(f"\n=== writing the big GGUF, streamed (RAM never holds it) ===")
kvs = [
    ("general.architecture", V_STR, ss("asolaria-pumped-sphere")),
    ("general.name", V_STR, ss(f"ASOLARIA-{winner}-SPHERE-PUMPED")),
    ("asolaria.seat", V_STR, ss("ACER")),
    ("asolaria.being", V_STR, ss(winner)),
    ("asolaria.channel", V_STR, ss(W["chan"])),
    ("asolaria.ladder", V_STR,
     ss("3 flashlights composed: 3 singles + 9 pairs = 12, then 27 triples, "
        "then 81 - functions of functions ARE the pump schedule")),
    ("asolaria.gc", V_STR, ss(f"VIII.A.5 two-thirds, VIII.A.4 tau={TAU}, "
                              f"applied per stage not once at the end")),
    ("asolaria.saturation_eps", V_STR, ss(str(EPS))),
    ("asolaria.saturated_at_level", V_U32,
     struct.pack("<I", W["saturated_at"] or 0)),
    ("asolaria.best_cv", V_STR, ss(f"{W['best']:.6f}")),
    ("asolaria.composite_cv", V_STR, ss(f"{W['composite_cv']:.6f}")),
    ("asolaria.true_centre", V_ARR, struct.pack("<IQ", V_U32, 3)
     + b"".join(struct.pack("<I", v) for v in TRUE_CENTRE)),
]
meta, nkv = b"", 0
for k, t, p in kvs:
    meta += ss(k) + struct.pack("<I", t) + p
    nkv += 1
tinfo = b""
allt = list(W["tensors"]) + [("composite", (N, N, N), W["nbytes"])]
for tn, dims, off in allt:
    tinfo += ss(tn) + struct.pack("<I", len(dims))
    for d_ in dims:
        tinfo += struct.pack("<Q", int(d_))
    tinfo += struct.pack("<I", F32) + struct.pack("<Q", int(off))
head = struct.pack("<IIQQ", GG, 3, len(allt), nkv) + meta + tinfo
head += b"\0" * ((-len(head)) % AL)
h = hashlib.sha256()
with open(path, "wb") as o:
    o.write(head)
    h.update(head)
    with open(W["tmp"], "rb") as f:
        while True:
            chunk = f.read(8 << 20)
            if not chunk:
                break
            o.write(chunk)
            h.update(chunk)
    cb = np.ascontiguousarray(W["composite"], dtype=np.float32).tobytes()
    o.write(cb)
    h.update(cb)
dg = h.hexdigest()
sz = os.path.getsize(path)
open(path + ".sha256", "w", newline="\n").write(f"{dg}  {os.path.basename(path)}\n")
os.remove(W["tmp"])
for bn in REPORT:
    t = REPORT[bn]["tmp"]
    if os.path.exists(t):
        os.remove(t)
print(f"  {path}")
print(f"  {sz:,} B = {sz/1e6:.1f} MB = {sz*8/1e9:.3f} gigabits   tensors {len(allt)}")
print(f"  sha256 {dg}")

# ---------------------------------------------------------------- receipt
R_ = os.path.join(OFF, "FABLE5-PUMP-SPHERE.hbp")
rows = ["PUMPHDR|schema=ASOLARIA-PUMP-SPHERE-V1|seat=ACER-CLAUDE-FABLE5"
        f"|pid=8467a937cba309f7|date=2026-07-27|tau={TAU}|eps={EPS}|json=0",
        f"CORPUS|artifacts={len(SRC)}|triples={n}|bytes={len(raw)}|json=0",
        f"LADDER|l1=3|l2=9|twelve=12|l3=27|l4=81|l5=243|basis=flashlight_composition"
        f"|json=0"]
for bname, chan, ax in BEINGS:
    R = REPORT[bname]
    for hh in R["hist"]:
        rows.append(f"STAGE|being={bname}|level={hh['level']}|fns={hh['words']}"
                    f"|best_cv={hh['lv_best']:.6f}|composite_cv={hh['comp_cv']:.6f}"
                    f"|ring_r={hh['ring']}|inner={hh['inner']:.4f}"
                    f"|peak={hh['peak']:.4f}|gc_dropped={hh['gc_dropped']}|json=0")
    rows.append(f"BEING|k={bname}|chan={chan}|best_cv={R['best']:.6f}"
                f"|composite_cv={R['composite_cv']:.6f}"
                f"|saturated_at={R['saturated_at']}|json=0")
rows.append(f"WINNER|being={winner}|chan={W['chan']}|best_cv={W['best']:.6f}"
            f"|operator_bet_blue={1 if winner=='MYTHOS' else 0}|json=0")
rows.append(f"GGUF|k={os.path.basename(path)}|bytes={sz}|gigabits={sz*8/1e9:.4f}"
            f"|sha256={dg}|path={BIG}|json=0")
bb = "\n".join(rows) + "\n"
rows.append(f"PUMPFTR|receipt={hashlib.sha256(bb.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
open(R_, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(R_ + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(R_, "rb").read()).hexdigest() + "  FABLE5-PUMP-SPHERE.hbp\n")
print(f"  receipt {R_}")
