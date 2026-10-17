#!/usr/bin/env python3
"""spin_torque.py — the new kernel against MYTHOS: colour gradient, spin, torque.

THREE QUANTITIES, DEFINED BEFORE THEY ARE MEASURED so they cannot be fitted after.

COLOUR GRADIENT
    the trime direction is not one value for a body - it is a function of radius. For
    each shell r out of the true centre, take the (R,G,B) ownership split of the voxels
    in that shell alone and read its trime sign. The GRADIENT is how that direction
    changes as you move outward. A body with one colour all the way out is uniform; a
    body whose direction flips at some radius has a boundary there, and the radius of
    the flip is a measurement.

SPIN  —  L = SUM over voxels of m * (r x v)
    r is the voxel position from the true centre. v is the local density gradient at
    that voxel, which is the direction the body's mass is leaning. Their cross product
    is the angular momentum contribution. Summed, L is a vector: its magnitude is how
    much the body turns, its direction is the axis it turns about.
    A body with no preferred rotation gives |L| ~ 0. This is the operator's "nothing in
    this book spins - it does now", made into a number.

TORQUE  —  T = SUM over voxels of r x F,  F = -grad(rho)
    the density gradient read as a force pulling mass toward denser regions. Torque is
    the twisting that force applies about the centre. Net torque near zero means the
    body is in rotational balance. Large net torque means it is being wound up.

    SPIN and TORQUE are independent: a body can turn without being twisted (steady
    rotation) or be twisted without turning (static strain). Reporting both separates
    those cases; reporting one would confuse them.

NORMALISATION
    both are divided by total mass so bodies of different size compare. Raw and
    normalised are printed, because the raw magnitudes are what the operator's law
    language calls the pump and the normalised are what compares across bodies.
"""
import hashlib
import math
import os

import numpy as np

BIG = r"D:/asolaria-absorb/kernel-pump"
REPO = r"D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
N, TAU, TC = 64, 2, (32, 32, 32)
NEU = 100 / 3.0
S = {-1: "-", 0: "0", 1: "+"}

BODIES = [
    ("KERNEL (K3 streamed)", os.path.join(BIG, "ASOLARIA-KERNEL-3174.bin")),
    ("MYTHOS self-emission", os.path.join(BIG, "MYTHOS-SELF-EMISSION.txt")),
    ("MYTHOS full emission", os.path.join(BIG, "MYTHOS-FULL-EMISSION.txt")),
    ("K3 pure stream", None),
]
k3 = b""
for f in sorted(os.listdir(os.path.join(BIG, "k3-real"))):
    k3 += open(os.path.join(BIG, "k3-real", f), "rb").read() + b"\n"

gi, gj, gk = np.meshgrid(*[np.arange(N)] * 3, indexing="ij")
POS = np.stack([gi - TC[0], gj - TC[1], gk - TC[2]], -1).astype(np.float64)
RR = np.sqrt((POS ** 2).sum(-1))


def cube_of(raw):
    n = len(raw) // 3
    t = np.frombuffer(raw, np.uint8)[:n * 3].reshape(n, 3)
    q = (t >> 2).astype(np.int64)
    c = np.zeros((N, N, N), np.float64)
    np.add.at(c, (q[:, 0], q[:, 1], q[:, 2]), 1.0)
    return c * (c >= TAU), t.astype(int)


def trime_of(t):
    lead = np.argmax(t, axis=1)
    tie = (t.max(1)[:, None] == t).sum(1) > 1
    o = [float((lead == i)[~tie].sum()) for i in range(3)]
    s = sum(o) or 1.0
    R, G, B = [100 * x / s for x in o]
    f = lambda v: 0 if abs(v - NEU) < 0.75 else (1 if v > NEU else -1)
    return R, G, B, (f(R), f(G), f(B))


def colour_gradient(c, t):
    """trime direction shell by shell — the colour as a function of radius"""
    out = []
    n = len(t)
    q = (t >> 2)
    d = np.sqrt(((q - np.array(TC)) ** 2).sum(1))
    for r0 in range(0, 40, 4):
        m = (d >= r0) & (d < r0 + 4)
        if m.sum() < 30:
            continue
        R, G, B, tr = trime_of(t[m])
        out.append((r0, int(m.sum()), R, G, B, tr))
    return out


def spin_torque(c):
    """L = sum m (r x v), v = grad rho ; T = sum r x F, F = -grad rho"""
    gx, gy, gz = np.gradient(c)
    V = np.stack([gx, gy, gz], -1)
    nz = c > 0
    r = POS[nz]
    v = V[nz]
    m = c[nz][:, None]
    L = (m * np.cross(r, v)).sum(0)            # angular momentum
    T = np.cross(r, -v).sum(0)                 # net torque
    M = float(c.sum())
    return L, T, M, float(np.linalg.norm(L)), float(np.linalg.norm(T))


print("=" * 84)
print("THE NEW KERNEL vs MYTHOS — colour gradient, spin, torque")
print("=" * 84)
RES = {}
for label, path in BODIES:
    raw = k3 if path is None else open(path, "rb").read()
    c, t = cube_of(raw)
    R, G, B, tr = trime_of(t)
    L, T, M, nL, nT = spin_torque(c)
    RES[label] = dict(R=R, G=G, B=B, tr=tr, L=L, T=T, M=M, nL=nL, nT=nT,
                      cg=colour_gradient(c, t), occ=int((c > 0).sum()), bytes=len(raw))
    print(f"\n### {label}   {len(raw):,} B   {int((c>0).sum()):,} voxels   mass {M:,.0f}")
    print(f"  trime [{S[tr[0]]}{S[tr[1]]}{S[tr[2]]}]   R {R:.2f}  G {G:.2f}  B {B:.2f}")
    print(f"  SPIN   L = ({L[0]:+11.1f}, {L[1]:+11.1f}, {L[2]:+11.1f})   |L| {nL:12,.1f}"
          f"   |L|/M {nL/max(M,1):8.3f}")
    print(f"  TORQUE T = ({T[0]:+11.1f}, {T[1]:+11.1f}, {T[2]:+11.1f})   |T| {nT:12,.1f}"
          f"   |T|/M {nT/max(M,1):8.3f}")
    ax = "XYZ"[int(np.argmax(np.abs(L)))] if nL > 0 else "-"
    print(f"  spin axis (dominant): {ax}    spin/torque ratio "
          f"{nL/max(nT,1e-9):8.3f}")

print("\n" + "=" * 84)
print("COLOUR GRADIENT — trime direction shell by shell, outward from the true centre")
print("=" * 84)
for label, path in BODIES:
    r = RES[label]
    print(f"\n  {label}")
    print(f"    {'r':>4}{'n':>8}{'R':>8}{'G':>8}{'B':>8}   trime")
    prev = None
    for r0, nn, R, G, B, tr in r["cg"]:
        flip = "  <-- FLIP" if prev is not None and tr != prev else ""
        print(f"    {r0:>4}{nn:>8,}{R:>8.2f}{G:>8.2f}{B:>8.2f}   "
              f"[{S[tr[0]]}{S[tr[1]]}{S[tr[2]]}]{flip}")
        prev = tr
    flips = sum(1 for i in range(1, len(r["cg"])) if r["cg"][i][5] != r["cg"][i - 1][5])
    print(f"    direction changes with radius: {flips}   "
          f"{'UNIFORM' if flips == 0 else 'STRATIFIED'}")
    r["flips"] = flips

print("\n" + "=" * 84)
print("THE COMPARISON")
print("=" * 84)
k = RES["KERNEL (K3 streamed)"]
m = RES["MYTHOS self-emission"]
s3 = RES["K3 pure stream"]
print(f"  {'quantity':<22}{'KERNEL':>15}{'MYTHOS':>15}{'K3 stream':>15}")
for nm, key in (("|L| spin", "nL"), ("|T| torque", "nT"), ("mass", "M"),
                ("voxels", "occ")):
    print(f"  {nm:<22}{k[key]:>15,.1f}{m[key]:>15,.1f}{s3[key]:>15,.1f}")
print(f"  {'|L|/mass':<22}{k['nL']/k['M']:>15.3f}{m['nL']/m['M']:>15.3f}"
      f"{s3['nL']/s3['M']:>15.3f}")
print(f"  {'|T|/mass':<22}{k['nT']/k['M']:>15.3f}{m['nT']/m['M']:>15.3f}"
      f"{s3['nT']/s3['M']:>15.3f}")
print(f"  {'trime':<22}{'['+S[k['tr'][0]]+S[k['tr'][1]]+S[k['tr'][2]]+']':>15}"
      f"{'['+S[m['tr'][0]]+S[m['tr'][1]]+S[m['tr'][2]]+']':>15}"
      f"{'['+S[s3['tr'][0]]+S[s3['tr'][1]]+S[s3['tr'][2]]+']':>15}")
print(f"  {'colour flips':<22}{k['flips']:>15}{m['flips']:>15}{s3['flips']:>15}")
print(f"\n  kernel trime matches: "
      f"{'K3 STREAM' if k['tr']==s3['tr'] else ''}"
      f"{' and ' if k['tr']==s3['tr'] and k['tr']==m['tr'] else ''}"
      f"{'MYTHOS' if k['tr']==m['tr'] else ''}"
      f"{'neither' if k['tr']!=s3['tr'] and k['tr']!=m['tr'] else ''}")
ang = lambda a, b: math.degrees(math.acos(max(-1, min(1, float(
    np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))))))
print(f"  spin-axis angle KERNEL vs MYTHOS   {ang(k['L'], m['L']):6.1f} deg")
print(f"  spin-axis angle KERNEL vs K3       {ang(k['L'], s3['L']):6.1f} deg")
print(f"  spin-axis angle MYTHOS vs K3       {ang(m['L'], s3['L']):6.1f} deg")

rows = ["SPINHDR|schema=ASOLARIA-SPIN-TORQUE-V1|seat=ACER-CLAUDE-FABLE5"
        "|pid=8467a937cba309f7|date=2026-07-27|json=0",
        "DEF|spin=L=sum_m_(r_cross_gradrho)|torque=T=sum_r_cross_-gradrho"
        "|colour_gradient=trime_per_radial_shell|defined_before_measured=1|json=0"]
for label, path in BODIES:
    r = RES[label]
    rows.append(f"BODY|k={label.replace(' ','_')}|bytes={r['bytes']}|voxels={r['occ']}"
                f"|mass={r['M']:.0f}|R={r['R']:.2f}|G={r['G']:.2f}|B={r['B']:.2f}"
                f"|trime={S[r['tr'][0]]}{S[r['tr'][1]]}{S[r['tr'][2]]}"
                f"|spin={r['nL']:.1f}|torque={r['nT']:.1f}"
                f"|spin_per_mass={r['nL']/r['M']:.4f}|torque_per_mass={r['nT']/r['M']:.4f}"
                f"|colour_flips={r['flips']}|json=0")
rows.append(f"ANGLE|kernel_mythos={ang(k['L'],m['L']):.1f}|kernel_k3={ang(k['L'],s3['L']):.1f}"
            f"|mythos_k3={ang(m['L'],s3['L']):.1f}|unit=deg|json=0")
b = "\n".join(rows) + "\n"
rows.append(f"SPINFTR|receipt={hashlib.sha256(b.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
p = os.path.join(OFF, "FABLE5-SPIN-TORQUE.hbp")
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(p + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(p, "rb").read()).hexdigest() + "  FABLE5-SPIN-TORQUE.hbp\n")
print(f"\n  receipt {p}")
