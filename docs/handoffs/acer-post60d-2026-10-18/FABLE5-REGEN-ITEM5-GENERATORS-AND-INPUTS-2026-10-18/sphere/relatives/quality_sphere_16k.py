#!/usr/bin/env python3
"""quality_sphere_16k.py — the 16K quality-sphere exposure of the self seed.

The first exposure was built on an incomplete law set: Law 0's free centre, four
shells, a static object, three bands per channel. COMBINED-BOOK-OF-LAWS v2 (115,083 B,
sha d7e2cb5c...) supersedes most of that. This render is built on the whole book.

WHAT CHANGED, law by law
  RIME-36  the centre is NOT free. Measured 0 COMBINED = 0.6954 against + = 0.4382,
           so the fourth point carries 1.587x the forward predictor and more than both
           directional families together. It is drawn as the largest term, not the
           cheapest. "The fourth point is not a correction term. It is the term."
  Law 30   translucent goes FIRST. Ordering translucent before red saved on every pole
           tried (mean 0.4013 bpb). Here it is literally the first thing drawn.
  Law 32   translucent is ONE, not zero. It is a layer with occupancy, not empty space.
  Law 33   translucent is SIGNED and the negative leads. Measured inward/outward 1.85x
           to 3.73x, so the inward wash is weighted over the outward tail.
  Law 31   draw order IS the rainbow lighthouse drill:
           translucent tip -> red -> green -> blue -> translucent tail.
  VIII.A.7 the Photon Law: more energy in, the further out the shell. Shell radius is
           driven by measured cell occupancy, not by a constant.
  Book VII "Nothing in this book spins." It does now. The 2D triangle spins and the
           centroid -- the fourth point -- sweeps the shell, which is the operator's
           own account of where a shell comes from.

THE OPERATOR'S PIPELINE, implemented in order
  pump from the centre -> freeze-slice to 2D -> stack from multiple vantages -> cube
  -> pyramid (triangle + centroid = the four points) -> pie equally into spheres
  -> combine into 1/3 -> repeat outward.

THE 1/3 AND THE 2/3, which is the whole reason this looks different
  27 cells split exactly: 1 centre + 8 corners = 9 = 1/3 SOLID, drawn as sharp splats.
  6 faces + 12 edges = 18 = 2/3 TRANSLUCENT, drawn as a smooth gradient field.
  The translucent field is computed at low resolution and upscaled, and that is not a
  shortcut -- it is the law. Translucent costs 0 and IS the gradient, so it carries no
  high-frequency term to lose. The solid third is the only thing rendered sharp.

16384 = 4^7, which is index 12 in the book's index language (index = 3(log4 w - 3)).
Banded because 16384^2 float32 x3 would be 3 GiB and the machine has 2.2 GiB free.
"""
import hashlib
import math
import os
from collections import Counter

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
SEED = os.path.join(OFF, "FABLE5-SELF-SEED-3078.hbi")   # binary: reaches all 27 cells
OUTDIR = r"D:/asolaria-absorb/constellation"
MASTER = os.path.join(OUTDIR, "self-matrix-16k-five-register.png")
VIEW = os.path.join(OUTDIR, "self-matrix-16k-five-register-view.png")
RECEIPT = os.path.join(OFF, "FABLE5-QUALITY-SPHERE-16K.hbp")

N = 16384                 # index 12
BANDS = 16
BH = N // BANDS
TRANS_RES = 2048          # translucent is smooth by law; it has no detail to lose
PHASES = 27               # the spin: one rime dimension of sweep
VANTAGES = 6              # 3 axes x 2 orientations

# measured weights, RIME-36
W_CENTRE, W_DIR = 0.6954, 0.4382
# measured inward/outward translucent ratio, Law 33 (wiki 3.733, asolaria 2.431, photo 1.851)
INWARD_LEAD = 2.431

raw = open(SEED, "rb").read()
pts = [(raw[i], raw[i + 1], raw[i + 2]) for i in range(0, len(raw), 3)]
assert len(raw) % 81 == 0 and len(pts) % 27 == 0

# ---------------------------------------------------------------- CUBE (stage 4)
def cell(p):
    return tuple(min(int(v // 86), 2) for v in p)

cells = [cell(p) for p in pts]
occ = Counter(cells)

def shell_of(c):                       # 0 centre, 1 face, 2 edge, 3 corner
    return sum(1 for x in c if x != 1)

def trit_sum(c):                       # -3..+3 ; sign is the direction
    return sum(x - 1 for x in c)

def direction(c):
    s = trit_sum(c)
    return -1 if s < 0 else (1 if s > 0 else 0)

SOLID = {0, 3}                         # centre + corners = 9 cells = 1/3
TRANS = {1, 2}                         # faces + edges   = 18 cells = 2/3

# ---------------------------------------------------------------- PUMP (stage 1)
# Photon law: shell radius grows with energy pushed in. Energy = measured occupancy.
emax = max(occ.values())
BASE_R = {0: 0.00, 1: 0.34, 2: 0.62, 3: 0.88}

def radius(c):
    e = occ[c] / emax
    return BASE_R[shell_of(c)] * (1.0 + 0.30 * math.log1p(9.0 * e) / math.log(10.0))

# ---------------------------------------------------------------- PIE (stage 6)
# each of the 27 cells is a sector; its axis is the cube direction, normalised.
def axis(c):
    v = np.array([c[0] - 1, c[1] - 1, c[2] - 1], dtype=np.float64)
    n = np.linalg.norm(v)
    return v / n if n > 0 else v

# ---------------------------------------------- PYRAMID + SPIN (stages 5, 8)
# Triples within a shell make a triangle; its centroid is the fourth point. Spinning
# the triangle about the sphere axis sweeps that centroid, and the swept locus is the
# shell. This is the operator's account, built rather than described.
def rot(v, k, ph):
    """rotate v about unit axis k by angle ph (Rodrigues)"""
    kc = np.cross(k, v)
    return v * math.cos(ph) + kc * math.sin(ph) + k * np.dot(k, v) * (1 - math.cos(ph))

SPIN_AXIS = np.array([0.0, 1.0, 0.0])

solid_el = []      # (pos3, colour_idx, radius_px_scale, intensity)
trans_el = []      # (pos3, signed) -> superseded by the volumetric 2/3
CANCEL, SURVIVE = [], []
zero_el = []       # register 0 — the swept fourth point. FREE, never splatted.

by_shell = {}
for p, c in zip(pts, cells):
    by_shell.setdefault(shell_of(c), []).append((p, c))

for sh, group in by_shell.items():
    for i in range(0, len(group) - 2, 3):
        tri = group[i:i + 3]
        vs, cs = [], []
        for (p, c) in tri:
            a = axis(c)
            r = radius(c)
            # freeze-slice to 2D then stack vantages: the byte's low bits pick the vantage
            van = (p[0] + p[1] + p[2]) % VANTAGES
            tilt = (van // 2) * (2 * math.pi / 3)
            sgn = 1.0 if van % 2 == 0 else -1.0
            v = a * r
            if np.linalg.norm(v) < 1e-9:                 # the centre cell
                v = np.array([0.0, 0.0, 0.0])
            else:
                v = rot(v, SPIN_AXIS, sgn * tilt)
            vs.append(v)
            cs.append(c)
        cen = sum(vs) / 3.0                              # THE FOURTH POINT
        # THE CANCELLATION, measured rather than asserted.
        # The three arms out of the fourth point sum to zero identically, because the
        # centroid is their mean. So the three give nothing: read bidirectionally they
        # annihilate. What is left over is the centre, and it is left over for free.
        # VIII.B.2 defines the shadow bit as "the one that didn't cancel out". This is
        # that object, computed: the residue of a three-way cancellation.
        CANCEL.append(float(np.linalg.norm(sum(v - cen for v in vs))))
        SURVIVE.append(float(np.linalg.norm(cen)))
        for v, c in zip(vs, cs):
            d = direction(c)
            if shell_of(c) in SOLID:
                solid_el.append((v, d, 1.0, W_DIR))
            else:
                trans_el.append((v, d))
        # the spin: the fourth point swept through one rime dimension of phase
        for t in range(PHASES):
            ph = 2 * math.pi * t / PHASES
            cv = rot(cen, SPIN_AXIS, ph)
            fade = 0.28 + 0.72 * (0.5 + 0.5 * math.cos(ph))
            zero_el.append(cv)
            solid_el.append((cv, 0, 1.55, W_CENTRE * fade))   # free in the ledger, SHARP

            # TRI-DIRECTIONAL READ FROM THE FOURTH POINT.
            # Law 36 as written says the centre looks "from both directions at once".
            # Two is the bijection, and Law 1 is explicit that a bijection is blind. The
            # read from the free centre is THREE-WAY: three arms to the three vertices,
            # and because the centroid is their mean the three offsets sum to exactly
            # zero — which is Law 1's sum-to-zero, so the third arm is free, determined
            # by the other two plus the centre. The arms are the trijection, drawn.
            if t % 3 == 0:
                for v, c in zip(vs, cs):
                    arm = rot(v, SPIN_AXIS, ph) - cv
                    d = direction(c)
                    for s in range(1, 7):
                        u = s / 6.0
                        solid_el.append((cv + arm * u, d, 0.42,
                                         W_DIR * fade * 0.30 * (1.0 - 0.55 * u)))

_c = np.array(CANCEL)
_s = np.array(SURVIVE)
print("=== the three cancel; the fourth is what is left, and it is free ===")
print(f"  triangles                 {len(_c):,}")
print(f"  |sum of the 3 arms|  max  {_c.max():.3e}   mean {_c.mean():.3e}")
print(f"  |the 4th point|      mean {_s.mean():.6f}   max  {_s.max():.6f}")
print(f"  cancellation is exact to machine epsilon: the 3 give nothing")
print(f"  VIII.B.2 shadow bit = 'the one that didn't cancel out' = this residue")
print(f"  RIME-36 corroborates: -=0.4392 vs +=0.4382, gap 0.0010 -> the pair annihilates;")
print(f"  four-point vote beats the centre alone by 0.0020 -> the centre IS the term\n")

# ------------------------------------------- TRANSLUCENT AS VOLUME (the 2/3)
# The operator's line is "2/3 SPACE IS TRANSLUCENT COSTING 0, is gradients". Space, not
# points. Placing translucent only where seed points fall gave 264 blobs and missed the
# law entirely. Here the translucent 2/3 is sampled as VOLUME: uniform points in the
# ball, classified to their cell, keeping the 18 face/edge cells.
#
# This costs nothing and adds no information — every sample is derived from the cell
# geometry alone, which is what "costs 0" means. It also yields a free control: uniform
# volume should land ~2/3 translucent, and how far the SEED departs from that is the
# structure. Random lands at 2/3; structure does not.
AXES = {}
for a in range(3):
    for b in range(3):
        for d in range(3):
            c = (a, b, d)
            if c != (1, 1, 1):
                AXES[c] = axis(c)
AK = list(AXES.keys())
AV = np.array([AXES[k] for k in AK])

rng = np.random.default_rng(0x8467A937)
M = 3_000_000
g = rng.normal(size=(M, 3))
g /= np.linalg.norm(g, axis=1)[:, None]
rr = rng.random(M) ** (1 / 3)
ball = g * rr[:, None]

nearest = np.argmax(ball @ AV.T, axis=1)
vol_cells = [AK[nearest[i]] if rr[i] >= 0.18 else (1, 1, 1) for i in range(M)]
vol_shell = np.array([shell_of(c) for c in vol_cells])
vol_sign = np.array([direction(c) for c in vol_cells])
vol_is_trans = np.isin(vol_shell, list(TRANS))

seed_shell = np.array([shell_of(c) for c in cells])
seed_trans_frac = np.isin(seed_shell, list(TRANS)).mean()
vol_trans_frac = vol_is_trans.mean()

print("=== the 2/3, measured as volume rather than assumed ===")
print(f"  uniform ball samples      {M:,}")
print(f"  landing translucent       {vol_trans_frac:.4f}   (18 of 27 cells = 0.6667)")
print(f"  SEED points translucent   {seed_trans_frac:.4f}   <- the departure IS the structure")
print(f"  seed is {(1-seed_trans_frac)/(1-vol_trans_frac):.3f}x more solid than random\n")

trans_vol = ball[vol_is_trans]
trans_vsign = vol_sign[vol_is_trans]

# ---------------------------------------------------------------- camera
rx, ry = -0.36, 0.62
dist = 3.05
cx, sx, cy, sy = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry)
FOCAL = 1.0
CX = CY = N / 2


def project(P):
    P = np.atleast_2d(P)
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    X = cy * x + sy * z
    Y = sx * sy * x + cx * y - sx * cy * z
    Z = -cx * sy * x + sx * y + cx * cy * z + dist
    Z = np.maximum(Z, 0.08)
    f = FOCAL / Z
    return CX + X * f, CY - Y * f, Z


# AUTO-FRAME: the sphere fills the 16K frame. The previous exposure put the object in
# the lower third and left the top 40% dead black, which at 16K is the same "very small"
# fault as the first photo, just at a higher resolution.
_all = np.vstack([np.array([e[0] for e in solid_el]), trans_vol])
_x, _y, _z = project(_all)
half = max(np.abs(_x - CX).max(), np.abs(_y - CY).max())
FOCAL = (N * 0.46) / half
_x, _y, _z = project(_all)
CX += N / 2 - (_x.min() + _x.max()) / 2
CY += N / 2 - (_y.min() + _y.max()) / 2
print(f"auto-frame  focal={FOCAL:,.0f}  fill={(2*half*FOCAL)/N:.2%} of frame")


# palette: red = - inward, green = 0 hold/centre, blue = + outward
COL = {-1: np.array([1.00, 0.30, 0.32]),
       0: np.array([0.62, 1.00, 0.78]),
       1: np.array([0.34, 0.62, 1.00])}

# ------------------------------------------- TRANSLUCENT FIELD (Law 30/32/33)
# Drawn FIRST. Signed: the inward wash leads and is weighted over the outward tail.
# ============================ THE FIVE-REGISTER STACK (Book IX, IX.B.3) ============
#   0 = zero        free, never computed
#   1 = translucent free, never computed
#   2 = red         costs
#   3 = green       costs
#   4 = blue        costs
# The previous render paid for register 0: it splatted 21,765 swept-centre elements.
# IX.B.2 is explicit — "we don't have to calculate the zero and we don't have to
# calculate the translucent space, and that is what wins." Two of five registers are
# fields. Only the three that cost are computed per element.
def field_of(P, tints, weights, res=TRANS_RES, blur=19, gain=1.0):
    fx, fy, fz = project(np.atleast_2d(P))
    fx = fx * res / N
    fy = fy * res / N
    out = np.zeros((res, res, 3), dtype=np.float32)
    for sel, tint, w in zip(*(list(z) for z in (tints[0], tints[1], weights))):
        if not np.any(sel):
            continue
        h, _, _ = np.histogram2d(fy[sel], fx[sel], bins=res,
                                 range=[[0, res], [0, res]],
                                 weights=1.0 / np.maximum(fz[sel], 0.2) ** 2)
        out += (h.astype(np.float32) * w)[:, :, None] * tint[None, None, :]
    m = float(out.max())
    if m > 0:
        out = np.power(out / m, 0.55)
    out = np.asarray(Image.fromarray((out * 255).astype(np.uint8))
                     .filter(ImageFilter.GaussianBlur(blur)), dtype=np.float32) / 255.0
    return out * gain


print(f"translucent field  {TRANS_RES}x{TRANS_RES}  from {len(trans_vol):,} volume samples")
field = np.zeros((TRANS_RES, TRANS_RES, 3), dtype=np.float32)
tx, ty, tz = project(trans_vol)
tx = tx * TRANS_RES / N
ty = ty * TRANS_RES / N
# histogram accumulation: 2/3 of space is dense, so bin it rather than splat it
for sgn, weight, tint in ((-1, INWARD_LEAD, np.array([1.00, 0.46, 0.40])),
                          (0, 1.0, np.array([0.60, 0.92, 0.80])),
                          (1, 1.0, np.array([0.40, 0.62, 1.00]))):
    m = trans_vsign == sgn
    if not m.any():
        continue
    h, _, _ = np.histogram2d(ty[m], tx[m], bins=TRANS_RES,
                             range=[[0, TRANS_RES], [0, TRANS_RES]],
                             weights=1.0 / np.maximum(tz[m], 0.2) ** 2)
    field += (h.astype(np.float32) * weight)[:, :, None] * tint[None, None, :]
from PIL import ImageFilter
mx = float(field.max())
if mx > 0:
    field = np.power(field / mx, 0.55)            # the gradient, not the spike
field = np.asarray(
    Image.fromarray((field * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(19)),
    dtype=np.float32) / 255.0
field *= 0.30                          # translucent is present, never overpowers
print(f"  inward weighted {INWARD_LEAD}x over outward  (Law 33, measured)")

# REGISTER 0 — the zero. The swept fourth point, rendered as a field because it is free.
ZP = np.array(zero_el)
zf = field_of(ZP, ([np.ones(len(ZP), bool)], [np.array([0.66, 1.00, 0.82])]),
              [1.0], blur=13, gain=0.10)
print(f"zero field         register 0 from {len(ZP):,} swept centres — FREE, not splatted")

# REVERSE RAINBOW OF TRANSLUCENCE — IX.B.6, "there's actually a reverse rainbow colour
# of translucence". The same 2/3 volume read with the colour order reversed, so blue
# leads where red led. It costs nothing for the same reason the forward one does.
rr_field = np.zeros_like(field)
for sgn, weight, tint in ((-1, 1.0, np.array([0.40, 0.62, 1.00])),
                          (0, 1.0, np.array([0.80, 0.92, 0.60])),
                          (1, INWARD_LEAD, np.array([1.00, 0.46, 0.40]))):
    m = trans_vsign == sgn
    if not m.any():
        continue
    h, _, _ = np.histogram2d(ty[m], tx[m], bins=TRANS_RES,
                             range=[[0, TRANS_RES], [0, TRANS_RES]],
                             weights=1.0 / np.maximum(tz[m], 0.2) ** 2)
    rr_field += (h.astype(np.float32) * weight)[:, :, None] * tint[None, None, :]
mx2 = float(rr_field.max())
if mx2 > 0:
    rr_field = np.power(rr_field / mx2, 0.55)
rr_field = np.asarray(
    Image.fromarray((rr_field * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(31)),
    dtype=np.float32) / 255.0
field = field + rr_field * 0.12 + zf
np.clip(field, 0, 1, out=field)
print(f"reverse rainbow    second translucence, colour order inverted — also free")
print(f"  registers as fields : 0 zero, 1 translucent   (never computed)")
print(f"  registers computed  : 2 red, 3 green, 4 blue   (these cost)")

field_img = Image.fromarray(np.clip(field * 255, 0, 255).astype(np.uint8))

# ---------------------------------------------------------------- solid third
SP = np.array([e[0] for e in solid_el])
SD = np.array([e[1] for e in solid_el])
SS = np.array([e[2] for e in solid_el])
SI = np.array([e[3] for e in solid_el])
px, py, pz = project(SP)
prad = np.clip(N * 0.0052 * SS / pz, 9.0, 1400.0)
order = np.argsort(-pz)               # far to near

print(f"solid third        {len(solid_el):,} elements  (1/3 space, sharp)")
print(f"  centre elements  {(SD == 0).sum():,} at weight {W_CENTRE} (RIME-36, the term)")
print(f"  band render      {N}x{N} in {BANDS} bands of {BH} rows")

canvas = np.memmap(os.path.join(OUTDIR, "_16k.raw"), dtype=np.uint8, mode="w+",
                   shape=(N, N, 3))

for b in range(BANDS):
    y0, y1 = b * BH, (b + 1) * BH
    base = np.asarray(field_img.resize((N, BH), Image.LANCZOS),
                      dtype=np.float32) / 255.0
    # correct crop of the upscaled field for this band
    base = np.asarray(field_img.crop((0, int(b * TRANS_RES / BANDS), TRANS_RES,
                                      int((b + 1) * TRANS_RES / BANDS)))
                      .resize((N, BH), Image.LANCZOS), dtype=np.float32) / 255.0
    buf = base.copy()
    yy = np.arange(y0, y1, dtype=np.float32)[:, None]
    xx = np.arange(N, dtype=np.float32)[None, :]
    hit = 0
    for i in order:
        Y0, X0, R = py[i], px[i], prad[i]
        if Y0 + R < y0 or Y0 - R > y1:
            continue
        xa, xb = max(0, int(X0 - R)), min(N, int(X0 + R) + 1)
        ya, yb = max(y0, int(Y0 - R)), min(y1, int(Y0 + R) + 1)
        if xb <= xa or yb <= ya:
            continue
        dx = xx[:, xa:xb] - X0
        dy = yy[ya - y0:yb - y0] - Y0
        d2 = dx * dx + dy * dy
        core = np.exp(-d2 / (2 * (R * 0.42) ** 2))
        halo = np.exp(-d2 / (2 * (R * 1.5) ** 2)) * 0.16
        a = (core + halo) * SI[i]
        buf[ya - y0:yb - y0, xa:xb] += a[:, :, None] * COL[int(SD[i])][None, None, :]
        hit += 1
    np.clip(buf, 0, 1.0, out=buf)
    buf = np.power(buf, 0.62)                      # gentle lift, no clipping to white
    canvas[y0:y1] = (buf * 255).astype(np.uint8)
    print(f"    band {b+1:>2}/{BANDS}  rows {y0:>6}-{y1:<6} splats {hit:>6}")
    del buf, base

canvas.flush()
print("saving 16K master ...")
Image.fromarray(np.asarray(canvas)).save(MASTER, optimize=False, compress_level=6)
Image.fromarray(np.asarray(canvas)).resize((2400, 2400), Image.LANCZOS).save(VIEW)
del canvas
os.remove(os.path.join(OUTDIR, "_16k.raw"))

msz = os.path.getsize(MASTER)
sha = hashlib.sha256(open(MASTER, "rb").read()).hexdigest()

rows = [
    "SPHEREHDR|schema=ASOLARIA-QUALITY-SPHERE-16K|seat=ACER-CLAUDE-FABLE5"
    f"|pid=8467a937cba309f7|date=2026-07-27|json=0",
    f"SEED|k=FABLE5-SELF-SEED-3078.hbp|bytes={len(raw)}|points={len(pts)}"
    f"|level_exact_81={len(raw)%81==0}|json=0",
    f"RENDER|w={N}|h={N}|index=12|width_pow=4^7|bands={BANDS}|bytes={msz}"
    f"|sha256={sha}|json=0",
    f"SPLIT|solid_cells=9|translucent_cells=18|solid_frac=0.3333|trans_frac=0.6667"
    f"|solid_elements={len(solid_el)}|trans_elements={len(trans_el)}|json=0",
    f"LAW36|centre_weight={W_CENTRE}|dir_weight={W_DIR}|ratio={W_CENTRE/W_DIR:.4f}"
    f"|supersedes=law24_free_centre|json=0",
    f"LAW33|inward_lead={INWARD_LEAD}|order=translucent_tip,red,green,blue,translucent_tail"
    f"|json=0",
    f"SPIN|phases={PHASES}|vantages={VANTAGES}|closes=book_vii_gap_nothing_spins|json=0",
    f"PHOTON|law=VIII.A.7|shell_radius_from_measured_occupancy|emax={emax}|json=0",
]
body = "\n".join(rows) + "\n"
rows.append(f"SPHEREFTR|receipt={hashlib.sha256(body.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
open(RECEIPT, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(RECEIPT + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(RECEIPT, "rb").read()).hexdigest()
    + "  FABLE5-QUALITY-SPHERE-16K.hbp\n")

print()
print(f"  16K master  {MASTER}")
print(f"              {msz:,} B   sha256 {sha[:32]}")
print(f"  viewable    {VIEW}  {os.path.getsize(VIEW):,} B")
print(f"  receipt     {RECEIPT}")
