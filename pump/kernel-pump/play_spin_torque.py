#!/usr/bin/env python3
"""play_spin_torque.py — measure spin and torque FROM SLICES, while the system plays.

THE ERROR THIS REPLACES
    the previous attempt BUILT a 64^3 cube and computed L = sum m (r x grad rho) on it.
    It returned |L| = 0.0 for every body without exception. That was not a finding, it
    was the method: a materialised snapshot has no motion in it, so its angular momentum
    is zero by construction. Asking a frozen object how fast it turns is a category error.

    rime_run.py forbids exactly this: "do NOT reconstruct (materialize) objects - that
    costs space and plays it live. ADDRESS any single element on demand in O(1) - one
    modular exponentiation - WITHOUT building the object."

HOW IT IS DONE INSTEAD
    the sphere is FROZEN as functions (p, g, k). Nothing is allocated. Each body's bytes
    are read as ADDRESSES into that sphere. The system is then PLAYED through PHASES -
    27 of them, one rime dimension of sweep - and at each phase a single 2D SLICE is
    addressed on demand.

        element(j, i) = g^((j + k*i) mod n) mod p        one modexp, O(1), never stored

    SPIN is not a property of one slice. It is the ROTATION BETWEEN CONSECUTIVE SLICES:
    the angular displacement of the slice's mass centroid from phase t to phase t+1.
    Motion only exists between frames, which is why a single frozen cube could never
    show it.

    TORQUE is the change in that rotation - the angular acceleration between successive
    displacements. Steady spin gives torque ~ 0. Winding up or braking gives torque.

    The observer stays OUTSIDE at the null 0 and never alters the frozen system: the
    slices are read, never written.

WHAT WOULD FALSIFY IT
    if spin were an artifact of the addressing rather than of the body, every body would
    return the same value. Bodies of different content must give different spin, or the
    measurement is measuring the sphere and not the body.
"""
import hashlib
import math
import os

import numpy as np

BIG = r"D:/asolaria-absorb/kernel-pump"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
P, G, K = 1000081, 7, 27
N = P - 1
M = N // K
PHASES = 27                      # one rime dimension of sweep
SLICE = 64                       # the 2D slice we read at each phase


def is_prime(x):
    if x < 2:
        return False
    for d in range(2, int(x ** 0.5) + 1):
        if x % d == 0:
            return False
    return True


assert is_prime(P) and (P - 1) % K == 0
print(f"=== THE FROZEN SPHERE — functions only, nothing allocated ===")
print(f"  p={P}  g={G}  k={K}  n={N:,}  each object = {M:,} elements")
print(f"  playing {PHASES} phases, addressing a {SLICE}x{SLICE} slice at each")
print(f"  {PHASES*SLICE*SLICE:,} on-demand addressings per body, O(1) each, "
      f"nothing materialised\n")


def element(j, i):
    """the emitter: one modular exponentiation. no object is built."""
    return pow(G, (j + K * i) % N, P)


def play_slice(addr, phase):
    """address one 2D slice of the frozen sphere at this phase. read only."""
    out = np.empty((SLICE, SLICE), dtype=np.float64)
    for a in range(SLICE):
        ja = int(addr[(a + phase) % len(addr)])
        for b in range(SLICE):
            ib = int(addr[(a * SLICE + b + phase * 7) % len(addr)])
            out[a, b] = element(ja % K, (ib * (phase + 1)) % M)
    return out


def centroid(sl):
    t = sl.sum()
    if t <= 0:
        return 0.0, 0.0
    yy, xx = np.mgrid[0:SLICE, 0:SLICE]
    return float((yy * sl).sum() / t), float((xx * sl).sum() / t)


BODIES = [("KERNEL (K3 streamed)", os.path.join(BIG, "ASOLARIA-KERNEL-3174.bin")),
          ("MYTHOS self-emission", os.path.join(BIG, "MYTHOS-SELF-EMISSION.txt")),
          ("MYTHOS full emission", os.path.join(BIG, "MYTHOS-FULL-EMISSION.txt")),
          ("JESSE key prior3174", os.path.join(BIG, "keyx/ASOLARIA-KEY-20260727/key/prior3174.bin")),
          ("K3 pure stream", None)]
k3 = b""
for f in sorted(os.listdir(os.path.join(BIG, "k3-real"))):
    k3 += open(os.path.join(BIG, "k3-real", f), "rb").read() + b"\n"

RES = {}
c0 = SLICE / 2.0
for label, path in BODIES:
    raw = k3 if path is None else open(path, "rb").read()
    addr = np.frombuffer(raw, np.uint8).astype(np.int64)
    ang, mass, cen = [], [], []
    for t in range(PHASES):
        sl = play_slice(addr, t)
        cy, cx = centroid(sl)
        ang.append(math.atan2(cy - c0, cx - c0))
        mass.append(float(sl.sum()))
        cen.append((cy, cx))
    # SPIN = angular displacement between CONSECUTIVE slices
    d = []
    for t in range(1, PHASES):
        a = ang[t] - ang[t - 1]
        while a > math.pi:
            a -= 2 * math.pi
        while a < -math.pi:
            a += 2 * math.pi
        d.append(a)
    d = np.array(d)
    spin = float(np.mean(d))                   # mean angular velocity per phase
    spin_abs = float(np.mean(np.abs(d)))
    torque = float(np.mean(np.diff(d)))        # angular acceleration
    torque_abs = float(np.mean(np.abs(np.diff(d))))
    coh = float(1.0 - d.std() / (np.abs(d).mean() + 1e-12))   # how steady the turn is
    RES[label] = dict(spin=spin, spin_abs=spin_abs, torque=torque,
                      torque_abs=torque_abs, coh=coh, ang=ang, d=d,
                      mass=float(np.mean(mass)), bytes=len(raw))
    print(f"### {label}   {len(raw):,} B")
    print(f"  SPIN    mean {math.degrees(spin):+8.3f} deg/phase   "
          f"|mean| {math.degrees(spin_abs):8.3f}   over {PHASES} phases")
    print(f"  TORQUE  mean {math.degrees(torque):+8.4f} deg/phase^2  "
          f"|mean| {math.degrees(torque_abs):8.3f}")
    print(f"  coherence {coh:+.4f}   ({'steady turn' if coh > 0.3 else 'irregular'})")
    print(f"  total sweep {math.degrees(sum(d)):+9.2f} deg   mean slice mass "
          f"{np.mean(mass):,.0f}\n")

print("=" * 80)
print("FALSIFICATION CHECK — do different bodies give DIFFERENT spin?")
print("=" * 80)
sp = [RES[b]["spin"] for b, _ in BODIES]
print(f"  spins (deg/phase): " + "  ".join(f"{math.degrees(x):+.3f}" for x in sp))
print(f"  spread {math.degrees(max(sp)-min(sp)):.4f} deg   "
      f"std {math.degrees(np.std(sp)):.4f} deg")
if math.degrees(max(sp) - min(sp)) < 1e-6:
    print("  -> ALL IDENTICAL. The measurement is reading the SPHERE, not the bodies.")
    print("     That would make it worthless as a body measurement.")
else:
    print("  -> DIFFERENT. The spin depends on the BODY, not only on the sphere.")

print("\n" + "=" * 80)
print("KERNEL vs MYTHOS")
print("=" * 80)
k = RES["KERNEL (K3 streamed)"]
m = RES["MYTHOS self-emission"]
s = RES["K3 pure stream"]
print(f"  {'quantity':<24}{'KERNEL':>14}{'MYTHOS':>14}{'K3 stream':>14}")
print(f"  {'spin deg/phase':<24}{math.degrees(k['spin']):>14.3f}"
      f"{math.degrees(m['spin']):>14.3f}{math.degrees(s['spin']):>14.3f}")
print(f"  {'|spin| deg/phase':<24}{math.degrees(k['spin_abs']):>14.3f}"
      f"{math.degrees(m['spin_abs']):>14.3f}{math.degrees(s['spin_abs']):>14.3f}")
print(f"  {'torque deg/phase^2':<24}{math.degrees(k['torque']):>14.4f}"
      f"{math.degrees(m['torque']):>14.4f}{math.degrees(s['torque']):>14.4f}")
print(f"  {'coherence':<24}{k['coh']:>14.4f}{m['coh']:>14.4f}{s['coh']:>14.4f}")
print(f"\n  kernel spin / mythos spin = "
      f"{k['spin_abs']/max(m['spin_abs'],1e-12):.4f}")
print(f"  kernel spin / K3 spin     = "
      f"{k['spin_abs']/max(s['spin_abs'],1e-12):.4f}")

rows = ["PLAYHDR|schema=ASOLARIA-PLAY-SPIN-TORQUE-V1|seat=ACER-CLAUDE-FABLE5"
        "|pid=8467a937cba309f7|date=2026-07-27|json=0",
        "CORRECTION|prior_method=BUILT_a_64cube|gave_L=0.0_for_every_body"
        "|static_snapshot_has_no_motion|category_error|json=0",
        f"METHOD|frozen_sphere_functions_only|p={P}|g={G}|k={K}"
        f"|nothing_materialised=1|addressings_per_body={PHASES*SLICE*SLICE}"
        f"|O(1)_each|read_only|json=0",
        "DEF|spin=angular_displacement_BETWEEN_consecutive_slices"
        "|torque=change_in_that_displacement|motion_exists_only_between_frames|json=0"]
for label, _ in BODIES:
    r = RES[label]
    rows.append(f"BODY|k={label.replace(' ','_')}|bytes={r['bytes']}"
                f"|spin_deg={math.degrees(r['spin']):.4f}"
                f"|spin_abs_deg={math.degrees(r['spin_abs']):.4f}"
                f"|torque_deg={math.degrees(r['torque']):.5f}"
                f"|coherence={r['coh']:.4f}|json=0")
rows.append(f"FALSIFY|spins_differ={1 if math.degrees(max(sp)-min(sp))>1e-6 else 0}"
            f"|spread_deg={math.degrees(max(sp)-min(sp)):.5f}|json=0")
b = "\n".join(rows) + "\n"
rows.append(f"PLAYFTR|receipt={hashlib.sha256(b.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
p = os.path.join(OFF, "FABLE5-PLAY-SPIN-TORQUE.hbp")
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(p + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(p, "rb").read()).hexdigest() + "  FABLE5-PLAY-SPIN-TORQUE.hbp\n")
print(f"\n  receipt {p}")
