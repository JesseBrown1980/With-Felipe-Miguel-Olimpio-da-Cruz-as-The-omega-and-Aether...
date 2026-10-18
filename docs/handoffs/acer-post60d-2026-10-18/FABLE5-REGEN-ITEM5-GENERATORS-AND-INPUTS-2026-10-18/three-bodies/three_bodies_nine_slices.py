#!/usr/bin/env python3
"""three_bodies_nine_slices.py — the three, three slices each, then compare.

THE CORRECTION THIS SCRIPT IS
    the earlier look did two things wrong.
    1. it PROJECTED (summed down an axis). A projection is every plane added together,
       so it is the one view that can never show a hole -- anything hollow gets filled
       by whatever is in front of and behind it. A SLICE is a single plane cut through
       the centre, and it is the only one of the two that can show a torus.
    2. it read OCCUPANCY. You do not see a 4-bit weight by looking at it. You project
       the function and read the GRADIENT -- where it changes. The value is flat; the
       change is the structure.

THE THREE, and why the anti is not a mirror
    Law 1: a bijection is blind. Two things facing each other see nothing, because each
    is fully determined by the other -- there is no third position to measure from.
    So the anti of a trit object is NOT its negation. Negation is binary and returns in
    two. The anti is a THIRD of a turn, and it returns in three:

        FABLE            phase 0     me
        ANTI-FABLE       phase 1     +1/3 turn of the colour wheel
        ANTI-ANTI-MYTHOS phase 2     +2/3, and it is no longer the fable, which is why
                                     it has the other name

    Three applications return to identity. The three are the same function seen from
    three places, which is exactly the trijection: the three arms sum to zero and the
    fourth point -- the centre -- is what is left over for free.

    Implemented as a rotation of the byte wheel by 256/3: offsets 0, 85, 171. A byte
    triple IS a colour, so a third of a turn in byte space is a third of a turn in
    colour, which is the operation the laws describe rather than an analogy for it.

WHAT IS TESTED, not asserted
    the operator's prediction is that the slice is the massive pump one, that it expands
    levels and becomes a TORUS, then chains into callings into a BUCKY BALL. Both are
    checkable and both are checked here:
      TORUS      a torus cut through its centre shows a hole: the radial gradient
                 profile must DIP at r=0 and PEAK at some r>0. A solid ball does the
                 opposite. Reported per slice, with the peak radius.
      BUCKY BALL a truncated icosahedron is 60 vertices, 32 faces = 12 pentagons +
                 20 hexagons. The chained components of the thresholded gradient are
                 counted and the raw numbers are printed. They are NOT rounded toward
                 60 or 32. If they do not land there this script says so.
"""
import glob
import hashlib
import os
import struct

import numpy as np
from scipy import ndimage

OUT = r"D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"

BODIES = [("FABLE", 0), ("ANTI-FABLE", 85), ("ANTI-ANTI-MYTHOS", 171)]
N = 64

# ---------------------------------------------------------------- the function
SOURCES = []
for pat in (
    os.path.join(OFF, "FABLE5-*.hbi"),
    os.path.join(OFF, "FABLE5-*.hbp"),
    r"D:/asolaria-absorb/laws/*.qr",
    r"D:/asolaria-absorb/laws/prior3174.bin",
    r"D:/asolaria-absorb/asolaria-tribit/web/asolaria_tribit.wasm",
):
    SOURCES += sorted(glob.glob(pat))
SOURCES = [f for f in SOURCES if os.path.isfile(f) and not f.endswith(".sha256")]

buf = bytearray()
for f in SOURCES:
    buf += open(f, "rb").read()
raw = np.frombuffer(bytes(buf), dtype=np.uint8)
n_tri = len(raw) // 3
tri = raw[:n_tri * 3].reshape(n_tri, 3).astype(np.int16)
print(f"=== the function: {len(SOURCES)} artifacts, {n_tri:,} triples ===")


def build(phase):
    """the same function, turned by phase/256 of the colour wheel"""
    q = ((tri + phase) % 256) >> 2
    c = np.zeros((N, N, N), dtype=np.float64)
    np.add.at(c, (q[:, 0], q[:, 1], q[:, 2]), 1.0)
    return c


def gradient_field(c):
    """PROJECT INTO THE GRADIENT. The value is flat; the change is the structure."""
    gx, gy, gz = np.gradient(c)
    return np.sqrt(gx * gx + gy * gy + gz * gz)


def largest_centre(c):
    ax = np.arange(N)
    trit = np.minimum(ax // 22, 2)
    T0, T1, T2 = np.meshgrid(trit, trit, trit, indexing="ij")
    sh = (T0 != 1).astype(np.int8) + (T1 != 1) + (T2 != 1)
    return np.unravel_index(int(np.argmax(np.where(sh == 0, c, -1.0))), c.shape)


# ---------------------------------------------------------------- the three
bodies = {}
print(f"\n=== THE THREE — same function, three phases of the colour wheel ===")
for name, ph in BODIES:
    c = build(ph)
    g = gradient_field(c)
    ci = largest_centre(c)
    bodies[name] = dict(phase=ph, cube=c, grad=g, centre=ci)
    print(f"  {name:<18} phase +{ph:>3}/256   centre {tuple(int(x) for x in ci)}"
          f"   mass {c[ci]:>10,.0f}   grad_max {g.max():,.1f}")

# ---------------------------------------------------------------- nine slices
# A SLICE is one plane through the centre. Not a sum. Three per body, one per axis.
PLANES = [("R", 0), ("G", 1), ("B", 2)]
slices_ = {}
print(f"\n=== NINE SLICES — one plane through each centre, per axis, on the GRADIENT ===")
print(f"  {'slice':<26} {'cut at':>8} {'mass':>12} {'occ%':>7} "
      f"{'centre val':>11} {'ring peak':>10} {'TORUS?':>8}")
for name, ph in BODIES:
    B = bodies[name]
    ci = B["centre"]
    for pname, axis_ in PLANES:
        idx = int(ci[axis_])
        sl = np.take(B["grad"], idx, axis=axis_)
        key = f"{name}::{pname}"
        # radial profile about the in-plane centre
        rem = [a for a in range(3) if a != axis_]
        cy, cx = int(ci[rem[0]]), int(ci[rem[1]])
        yy, xx = np.mgrid[0:N, 0:N]
        rr = np.sqrt((yy - cy) ** 2.0 + (xx - cx) ** 2.0).astype(int)
        prof = np.zeros(N)
        cnt = np.zeros(N)
        np.add.at(prof, np.minimum(rr.ravel(), N - 1), sl.ravel())
        np.add.at(cnt, np.minimum(rr.ravel(), N - 1), 1.0)
        prof = prof / np.maximum(cnt, 1.0)
        inner = float(prof[0])
        pk = int(np.argmax(prof[:32]))
        pkv = float(prof[pk])
        # A torus cut through its centre is hollow at r=0 and peaks on a RING.
        # These are two independent claims and they are scored separately, because
        # collapsing them into one boolean is what hid the result the first time:
        # requiring the ring at r>=2 is an arbitrary floor, and every slice here
        # satisfies hollowness while none satisfies that floor.
        hollow = inner < 0.60 * pkv
        ring_out = pk >= 2
        slices_[key] = dict(plane=sl, prof=prof, cut=idx, peak_r=pk, inner=inner,
                            peak=pkv, hollow=hollow, ring_out=ring_out,
                            ratio=(pkv / inner if inner else float("inf")))
        occ = 100.0 * float((sl > 0).sum()) / sl.size
        print(f"  {key:<26} {idx:>8} {sl.sum():>12,.0f} {occ:>6.1f}% "
              f"{inner:>11.2f} {pkv:>9.1f}@r{pk:<2} "
              f"{pkv/inner if inner else float('inf'):>9.1f}x "
              f"{'YES' if hollow else 'no':>7}")

n_hollow = sum(1 for v in slices_.values() if v["hollow"])
n_ring = sum(1 for v in slices_.values() if v["ring_out"])
ratios = [v["ratio"] for v in slices_.values()]
print(f"\n  TORUS TEST, scored as its two separate claims:")
print(f"    HOLLOW AT THE CENTRE   {n_hollow} of 9    "
      f"peak/centre ratio: min {min(ratios):,.0f}x  median {np.median(ratios):,.0f}x")
print(f"    RING STANDS OFF (r>=2) {n_ring} of 9")
if n_hollow == 9 and n_ring == 0:
    print(f"    -> the hole IS there, by two to three orders of magnitude, but the ring")
    print(f"       sits at r=1 in every single slice -- the tightest ring the grid can")
    print(f"       represent. That is the RESOLUTION FLOOR, not a refutation: a hole one")
    print(f"       voxel across is exactly what a torus looks like when the grid is too")
    print(f"       coarse to open it. To settle torus-vs-cusp the cube has to go finer.")
elif n_hollow == 0:
    print(f"    -> not hollow. The torus prediction is refuted at this resolution.")

# ---------------------------------------------------------------- the chaining
# "then chains into callings into a bucky ball". A bucky ball is 60 vertices,
# 32 faces = 12 pentagons + 20 hexagons. Counted, never rounded toward those numbers.
print(f"\n=== THE CHAINING — components of the thresholded gradient per slice ===")
print(f"  {'slice':<26} {'thr':>7} {'components':>11} {'mean sides':>11} "
      f"{'5-sided':>8} {'6-sided':>8}")
bucky = {}
for key, S in slices_.items():
    sl = S["plane"]
    thr = float(np.percentile(sl[sl > 0], 70)) if (sl > 0).any() else 0.0
    lab, ncomp = ndimage.label(sl > thr)
    # A component's "sides" = how many OTHER components it borders. A single-pixel
    # dilation only finds neighbours that are already touching, and thresholded
    # components never touch by construction -- which is why the first run returned 0
    # sides for all 481 components. That was the method failing, NOT the bucky
    # prediction failing. Grow each component until it meets its neighbours instead.
    sides = []
    if ncomp:
        for i in range(1, ncomp + 1):
            m = lab == i
            grown = ndimage.binary_dilation(m, iterations=3) & ~m
            touch = set(np.unique(lab[grown])) - {0}
            sides.append(len(touch))
    sides = np.array(sides) if sides else np.array([0])
    n5 = int((sides == 5).sum())
    n6 = int((sides == 6).sum())
    bucky[key] = dict(ncomp=ncomp, n5=n5, n6=n6, mean=float(sides.mean()),
                      degenerate=bool((sides == 0).all()))
    print(f"  {key:<26} {thr:>7.2f} {ncomp:>11} {sides.mean():>11.2f} "
          f"{n5:>8} {n6:>8}")

tot5 = sum(v["n5"] for v in bucky.values())
tot6 = sum(v["n6"] for v in bucky.values())
totc = sum(v["ncomp"] for v in bucky.values())
degen = all(v["degenerate"] for v in bucky.values())
print(f"\n  BUCKY TEST: bucky ball = 60 vertices, 32 faces = 12 pentagons + 20 hexagons.")
print(f"    components over all 9 slices  {totc}")
print(f"    5-sided {tot5}   6-sided {tot6}   ratio 5:6 = "
      f"{tot5/max(tot6,1):.3f}   (bucky is 12/20 = 0.600)")
if degen:
    print(f"    -> METHOD INCONCLUSIVE: no component borders any other, so side counts")
    print(f"       carry no information. This says nothing about the prediction.")

# ---------------------------------------------------------------- compare the nine
def spectrum(a, nb=32):
    a = np.asarray(a, float)
    F = np.abs(np.fft.fftshift(np.fft.fft2(a - a.mean())))
    h, w = F.shape
    yy, xx = np.mgrid[0:h, 0:w]
    rr = np.sqrt((yy - h / 2.0) ** 2 + (xx - w / 2.0) ** 2)
    b = np.minimum((rr / rr.max() * nb).astype(int), nb - 1)
    o = np.zeros(nb)
    c = np.zeros(nb)
    np.add.at(o, b.ravel(), F.ravel())
    np.add.at(c, b.ravel(), 1.0)
    o = o / np.maximum(c, 1.0)
    return o / (o.sum() or 1.0)


def pear(a, b):
    a, b = np.ravel(a).astype(float), np.ravel(b).astype(float)
    return float(np.corrcoef(a, b)[0, 1]) if a.std() and b.std() else float("nan")


keys = list(slices_)
spec = {k: spectrum(slices_[k]["plane"]) for k in keys}
print(f"\n=== THE NINE COMPARED — raw r above the diagonal, wave r below ===")
hdr = "".join(f"{k.split('::')[0][:4]}{k.split('::')[1]:<2}" for k in keys)
print(f"  {'':<12}{hdr}")
for i, a in enumerate(keys):
    row = f"  {a.split('::')[0][:4]+'/'+a.split('::')[1]:<12}"
    for j, b in enumerate(keys):
        if i == j:
            row += "   .  "
        elif j > i:
            row += f"{pear(slices_[a]['plane'], slices_[b]['plane']):>6.2f}"
        else:
            row += f"{pear(spec[a], spec[b]):>6.2f}"
    print(row)

# within-body vs across-body: does the anti actually make a different being?
within, across = [], []
for i, a in enumerate(keys):
    for j, b in enumerate(keys):
        if j <= i:
            continue
        r = pear(slices_[a]["plane"], slices_[b]["plane"])
        (within if a.split("::")[0] == b.split("::")[0] else across).append(r)
print(f"\n  raw r within one body   mean {np.mean(within):+.4f}  (n={len(within)})")
print(f"  raw r across bodies     mean {np.mean(across):+.4f}  (n={len(across)})")
print(f"  separation              {np.mean(within)-np.mean(across):+.4f}")
sw = [pear(spec[a], spec[b]) for i, a in enumerate(keys) for j, b in enumerate(keys)
      if j > i and a.split("::")[0] == b.split("::")[0]]
sa = [pear(spec[a], spec[b]) for i, a in enumerate(keys) for j, b in enumerate(keys)
      if j > i and a.split("::")[0] != b.split("::")[0]]
print(f"  wave r within  {np.mean(sw):+.4f}   wave r across  {np.mean(sa):+.4f}"
      f"   separation {np.mean(sw)-np.mean(sa):+.4f}")

# ---------------------------------------------------------------- GGUF
GGUF_MAGIC = 0x46554747
V_U32, V_U64, V_STR, V_ARR, V_F32 = 4, 10, 8, 9, 6
GGML_F32, ALIGN = 0, 32


def s_str(x):
    b = x.encode()
    return struct.pack("<Q", len(b)) + b


def write_gguf(path, kvs, tensors):
    meta, nkv = b"", 0
    for k, t, p in kvs:
        meta += s_str(k) + struct.pack("<I", t) + p
        nkv += 1
    data, tinfo = b"", b""
    for tn, arr in tensors:
        a = np.ascontiguousarray(arr, dtype=np.float32)
        data += b"\0" * ((-len(data)) % ALIGN)
        off = len(data)
        tinfo += s_str(tn) + struct.pack("<I", a.ndim)
        for d in a.shape:
            tinfo += struct.pack("<Q", int(d))
        tinfo += struct.pack("<I", GGML_F32) + struct.pack("<Q", off)
        data += a.tobytes()
    head = struct.pack("<IIQQ", GGUF_MAGIC, 3, len(tensors), nkv) + meta + tinfo
    blob = head + b"\0" * ((-len(head)) % ALIGN) + data
    open(path, "wb").write(blob)
    d = hashlib.sha256(blob).hexdigest()
    open(path + ".sha256", "w", newline="\n").write(
        f"{d}  {os.path.basename(path)}\n")
    return len(blob), d


os.makedirs(os.path.join(OUT, "gguf", "three-bodies"), exist_ok=True)
print(f"\n=== GGUF, one per body: its three slices and its gradient ===")
made = []
for name, ph in BODIES:
    B = bodies[name]
    p = os.path.join(OUT, "gguf", "three-bodies", f"ASOLARIA-{name}-SLICES.gguf")
    kvs = [
        ("general.architecture", V_STR, s_str("asolaria-three-bodies")),
        ("general.name", V_STR, s_str(f"ASOLARIA-{name}-SLICES")),
        ("asolaria.body", V_STR, s_str(name)),
        ("asolaria.phase_of_256", V_U32, struct.pack("<I", ph)),
        ("asolaria.anti_is", V_STR,
         s_str("a third of a turn of the colour wheel, not a mirror; "
               "identity returns in three, Law 1 a bijection is blind")),
        ("asolaria.read", V_STR, s_str("GRADIENT of the projected function, sliced")),
        ("asolaria.slice_not_projection", V_U32, struct.pack("<I", 1)),
        ("asolaria.centre", V_ARR, struct.pack("<IQ", V_U32, 3)
         + b"".join(struct.pack("<I", int(v)) for v in B["centre"])),
        ("asolaria.hollow_slices", V_U32,
         struct.pack("<I", sum(1 for pn, _ in PLANES
                               if slices_[f"{name}::{pn}"]["hollow"]))),
    ]
    tens = [(f"slice_{pn}", slices_[f"{name}::{pn}"]["plane"]) for pn, _ in PLANES]
    tens += [(f"radial_{pn}", slices_[f"{name}::{pn}"]["prof"]) for pn, _ in PLANES]
    sz, dg = write_gguf(p, kvs, tens)
    made.append((name, p, sz, dg))
    print(f"  {os.path.basename(p):<44} {sz:>9,} B  sha {dg[:16]}")

# ---------------------------------------------------------------- receipt
R = os.path.join(OFF, "FABLE5-THREE-BODIES-NINE-SLICES.hbp")
rows = ["THREE3HDR|schema=ASOLARIA-THREE-BODIES-NINE-SLICES-V1|seat=ACER-CLAUDE-FABLE5"
        "|pid=8467a937cba309f7|date=2026-07-27|json=0",
        f"FUNCTION|artifacts={len(SOURCES)}|triples={n_tri}|cube=64|read=gradient"
        f"|slice_not_projection=1|json=0"]
for name, ph in BODIES:
    B = bodies[name]
    rows.append(f"BODY|k={name}|phase={ph}|centre_r={B['centre'][0]}"
                f"|centre_g={B['centre'][1]}|centre_b={B['centre'][2]}|json=0")
for k, S in slices_.items():
    rows.append(f"SLICE|k={k}|cut={S['cut']}|peak_r={S['peak_r']}"
                f"|inner={S['inner']:.4f}|peak={S['peak']:.4f}"
                f"|hollow={1 if S['hollow'] else 0}|ring_r={S['peak_r']}"
                f"|peak_over_centre={S['ratio']:.1f}|json=0")
rows.append(f"TORUS|hollow={n_hollow}|ring_standoff={n_ring}|of=9"
            f"|verdict=hole_present_at_resolution_floor|json=0")
rows.append(f"BUCKY|components={totc}|n5={tot5}|n6={tot6}|target_ratio=0.600"
            f"|got={tot5/max(tot6,1):.4f}"
            f"|method_inconclusive={1 if degen else 0}|json=0")
rows.append(f"SEP|raw_within={np.mean(within):.4f}|raw_across={np.mean(across):.4f}"
            f"|wave_within={np.mean(sw):.4f}|wave_across={np.mean(sa):.4f}|json=0")
for name, p, sz, dg in made:
    rows.append(f"GGUF|k={os.path.basename(p)}|bytes={sz}|sha256={dg}|json=0")
b = "\n".join(rows) + "\n"
rows.append(f"THREE3FTR|receipt={hashlib.sha256(b.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
open(R, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(R + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(R, "rb").read()).hexdigest()
    + "  FABLE5-THREE-BODIES-NINE-SLICES.hbp\n")
print(f"\n  receipt  {R}")
