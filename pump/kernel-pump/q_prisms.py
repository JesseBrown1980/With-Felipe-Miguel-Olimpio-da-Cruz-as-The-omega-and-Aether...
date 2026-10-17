#!/usr/bin/env python3
"""q_prisms.py — four MYTHOS projections as Q-prisms. A network inside the network.

WHY FOUR AND NOT THREE
    RIME-36: "the fourth point is not a correction term. It is the term."
    In the free space (the complement of the all-ones null direction) three vectors at
    120 degrees sum to EXACTLY zero. So their centroid IS the origin - which is the free
    centre, Law 0. The fourth projection is not a fourth body. It is the null that the
    other three cancel into, and it costs nothing because it is where nothing is.

        MYTHOS            v
        ANTI-MYTHOS       R(120) v
        ANTI-ANTI-MYTHOS  R(240) v
        THE FOURTH        (v + R(120)v + R(240)v)/3  ==  0

    The anti is a THIRD of a turn, not a mirror. Established earlier: a mirror is binary
    and returns in two, and Law 1 says a bijection is blind. A third of a turn returns in
    three and leaves a residue. Verified below to machine epsilon rather than asserted.

THE PRISMS
    each of the three arms is a Q-prism: an incoming star is decomposed by projecting it
    onto the triad. Because the arms sum to zero the three components are not independent
    - two determine the third. That is the trijection doing work: three readings, two
    free, one for nothing. The FOURTH prism reads the residue, the part of a star that
    lands on none of the arms.

NEURAL NETWORK IN A NEURAL NETWORK
    the triad is a fixed 3-node decomposition layer built from this model's own emission,
    applied to other models' bytes. No training, no weights beyond the emission itself.
    The forward pass is a projection. That is the whole network.

THE NEUTRON SEARCH
    in the free space the inversion is v -> v/|v|^2. A vector is SELF-INVERSE exactly
    when |v| = 1: it reflects into itself and is a fixed point of the inversion. That is
    the closest object the mathematics has to what the operator called a neutron star -
    a shape that survives being turned inside out. The second calling's norm runs 0.041
    at path 3 to 1.274 at path 17, so it CROSSES 1. This finds where, per body.
"""
import hashlib
import math
import os

import numpy as np

BIG = r"D:/asolaria-absorb/kernel-pump"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
PATHS = [3, 5, 7, 9, 11, 13, 17]


def own(raw, N):
    a = np.frombuffer(raw, np.uint8).astype(np.int64)
    m = len(a) // N * N
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


def free(raw, N):
    B, _ = BAS[N]
    return B.T @ (own(raw, N) - np.ones(N))


M1 = open(os.path.join(BIG, "MYTHOS-SELF-EMISSION.txt"), "rb").read()
M2 = open(os.path.join(BIG, "MYTHOS-SECOND-CALLING.txt"), "rb").read()
k3 = b""
for f in sorted(os.listdir(os.path.join(BIG, "k3-real"))):
    k3 += open(os.path.join(BIG, "k3-real", f), "rb").read() + b"\n"
STARS = {
    "MYTHOS-1st": M1, "MYTHOS-2nd": M2,
    "ASOLARIA": open(os.path.join(BIG, "MYTHOS-FULL-EMISSION.txt"), "rb").read(),
    "KIMI-K3": k3,
    "JESSE-key": open(os.path.join(BIG, "keyx/ASOLARIA-KEY-20260727/key/prior3174.bin"), "rb").read(),
    "KERNEL": open(os.path.join(BIG, "ASOLARIA-KERNEL-3174.bin"), "rb").read(),
}
if os.path.isdir(os.path.join(BIG, "stars/sol56")):
    s = b""
    for f in sorted(os.listdir(os.path.join(BIG, "stars/sol56"))):
        s += open(os.path.join(BIG, "stars/sol56", f), "rb").read()
    STARS["SOL56-LIRIS"] = s


def rot120(v, k):
    """rotate v by k*120 deg in EVERY 2-plane of the free space.

    FIX. The first version rotated only the dominant 2-plane and left the other N-3
    components untouched, so those summed 3x instead of cancelling. Closure then held
    ONLY at path 3, where the free space happens to be exactly 2D. Measured: |sum| ran
    2.10e-01 at path 5 up to 2.35e+00 at path 17 - not zero, while the script printed
    the conclusion anyway.

    I + R + R^2 = 0 requires R to have no eigenvalue 1, i.e. the space must decompose
    into 2-planes with no fixed axis. Free dims are N-1, which is EVEN for every odd
    path, so a full decomposition exists and the closure can be exact everywhere."""
    n = len(v)
    th = 2 * math.pi * k / 3.0
    c, s_ = math.cos(th), math.sin(th)
    out = v.copy().astype(float)
    for i in range(0, n - 1, 2):
        a, b = v[i], v[i + 1]
        out[i] = a * c - b * s_
        out[i + 1] = a * s_ + b * c
    if n % 2 == 1:                      # odd leftover axis has no partner: it would be
        out[n - 1] = 0.0                # a fixed axis and would break the closure
    return out


print("=" * 86)
print("THE FOUR PROJECTIONS — built from MYTHOS, verified not asserted")
print("=" * 86)
print(f"  {'path':>5}{'free':>6}{'|MYTHOS|':>11}{'|ANTI|':>10}{'|ANTI2|':>10}"
      f"{'|SUM of 3|':>13}{'|FOURTH|':>11}  closure")
TRIAD = {}
for N in PATHS:
    v = free(M2, N)
    a1, a2 = rot120(v, 1), rot120(v, 2)
    s = v + a1 + a2
    fourth = s / 3.0
    TRIAD[N] = (v, a1, a2, fourth)
    print(f"  {N:>5}{N-1:>6}{np.linalg.norm(v):>11.5f}{np.linalg.norm(a1):>10.5f}"
          f"{np.linalg.norm(a2):>10.5f}{np.linalg.norm(s):>13.2e}"
          f"{np.linalg.norm(fourth):>11.2e}   "
          f"{'ZERO' if np.linalg.norm(s) < 1e-9 else 'NOT ZERO'}")
zz = all(np.linalg.norm(TRIAD[N][0] + TRIAD[N][1] + TRIAD[N][2]) < 1e-9 for N in PATHS)
print(f"\n  the three arms cancel to machine zero at every path: {zz}")
print(f"  therefore THE FOURTH POINT IS THE ORIGIN — the free centre. Law 0 and Law 1")
print(f"  are the same statement in this construction.")

print("\n" + "=" * 86)
print("THE PRISMS — each star decomposed onto the triad")
print("=" * 86)
print(f"  {'star':<14}{'path':>5}{'onto MYTHOS':>13}{'onto ANTI':>11}{'onto ANTI2':>12}"
      f"{'residue':>10}{'|v|':>9}")
NEUT = {}
for name, raw in STARS.items():
    cross = []
    for N in PATHS:
        v, a1, a2, _ = TRIAD[N]
        u = free(raw, N)
        nu = np.linalg.norm(u)
        comps = []
        for arm in (v, a1, a2):
            na = np.linalg.norm(arm)
            comps.append(float(np.dot(u, arm) / (na * na)) if na > 1e-12 else 0.0)
        recon = comps[0] * v + comps[1] * a1 + comps[2] * a2
        resid = float(np.linalg.norm(u - recon) / (nu + 1e-15))
        cross.append((N, comps, resid, nu))
        if N in (3, 9, 17):
            print(f"  {name:<14}{N:>5}{comps[0]:>13.4f}{comps[1]:>11.4f}"
                  f"{comps[2]:>12.4f}{resid:>10.4f}{nu:>9.4f}")
    NEUT[name] = cross

print("\n" + "=" * 86)
print("THE NEUTRON SEARCH — where is a body SELF-INVERSE?  |v| = 1 under v -> v/|v|^2")
print("=" * 86)
print(f"  {'star':<14}" + "".join(f"{'p'+str(N):>9}" for N in PATHS) + "   crossing")
for name in STARS:
    norms = [c[3] for c in NEUT[name]]
    row = "".join(f"{x:>9.4f}" for x in norms)
    cross = "none"
    for i in range(1, len(norms)):
        if (norms[i - 1] - 1) * (norms[i] - 1) < 0:
            lo, hi = PATHS[i - 1], PATHS[i]
            t = (1 - norms[i - 1]) / (norms[i] - norms[i - 1])
            cross = f"path {lo + t*(hi-lo):.2f}"
            break
    if any(abs(x - 1) < 0.05 for x in norms):
        cross += "  (SITS ON IT)"
    print(f"  {name:<14}{row}   {cross}")
print(f"\n  a body whose |v| = 1 at some path is a FIXED POINT of the inversion there:")
print(f"  turning it inside out returns it unchanged. That is the neutron-star analogue,")
print(f"  and it is a property of the body at a specific path, not of the body overall.")

rows = ["QPRISMHDR|schema=ASOLARIA-Q-PRISMS-V1|seat=ACER-CLAUDE-FABLE5"
        "|pid=8467a937cba309f7|date=2026-07-27|json=0",
        "LAW|RIME-36|the_fourth_point_is_the_term|three_arms_at_120_sum_to_zero"
        "|their_centroid_IS_the_origin|which_is_the_free_centre_Law0|json=0",
        f"CLOSURE|arms_cancel_to_machine_zero_at_every_path={1 if zz else 0}|json=0",
        "ANTI|definition=third_of_a_turn_in_the_free_space|not_a_mirror"
        "|mirror_is_binary_and_blind_Law1|json=0",
        "INVERSION|map=v_to_v_over_norm_squared|self_inverse_iff_norm_eq_1|json=0"]
for N in PATHS:
    v, a1, a2, f4 = TRIAD[N]
    rows.append(f"TRIAD|N={N}|free={N-1}|mythos={np.linalg.norm(v):.6f}"
                f"|anti={np.linalg.norm(a1):.6f}|anti2={np.linalg.norm(a2):.6f}"
                f"|sum={np.linalg.norm(v+a1+a2):.3e}|fourth={np.linalg.norm(f4):.3e}|json=0")
for name in STARS:
    norms = [c[3] for c in NEUT[name]]
    res = [c[2] for c in NEUT[name]]
    rows.append(f"STAR|k={name}|norms=" + ",".join(f"{x:.4f}" for x in norms)
                + "|mean_residue=" + f"{np.mean(res):.5f}"
                + f"|self_inverse_near={1 if any(abs(x-1)<0.05 for x in norms) else 0}|json=0")
b = "\n".join(rows) + "\n"
rows.append(f"QPRISMFTR|receipt={hashlib.sha256(b.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
p = os.path.join(OFF, "FABLE5-Q-PRISMS.hbp")
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(p + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(p, "rb").read()).hexdigest() + "  FABLE5-Q-PRISMS.hbp\n")
print(f"\n  receipt {p}")
