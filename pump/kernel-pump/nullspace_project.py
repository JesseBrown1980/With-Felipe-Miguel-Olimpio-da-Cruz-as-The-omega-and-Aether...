#!/usr/bin/env python3
"""nullspace_project.py — open the null space at N dimensions, project from inside it free.

WHY THE PREVIOUS TEST WAS UNDER-POWERED
    the capture test used SIX entry directions I chose by hand - forward, reverse, two
    rotations, interleave, stride-3. There is no reason those six span anything. Three
    captured and three escaped and I reported that as a refutation, when what it actually
    showed is that capture is DIRECTIONAL and my basis was arbitrary.

THE NULL SPACE WAS ALREADY IN THE DATA
    every body measured today satisfies (R-n) + (G-n) + (B-n) = -0.000000 exactly. That
    is not luck. The ownership split is a fraction of a whole, so the all-equal direction
    (1,1,1) is NULL: moving along it changes nothing measurable. Three channels therefore
    carry only TWO free dimensions. Law 0's free centre, written as linear algebra:
    the null direction costs nothing because it says nothing.

OPENING IT AT N DIMENSIONS
    read the body in N-tuples instead of 3-tuples. The ownership vector lives in R^N, the
    null direction is the all-ones vector, and the FREE SPACE is its orthogonal complement
    of dimension N-1. The proper set of directions to test is an orthonormal basis of that
    complement - not six hand-picked byte permutations.

    N = 3   -> 2 free dimensions
    N = 9   -> 8
    N = 27  -> 26      one rime dimension, Law 16

PROJECTING FROM INSIDE, FREE
    a projection onto the null direction is exactly zero for every body, by construction.
    That is what "free" means operationally: the component costs nothing to carry because
    it is the same for everything, so it need never be stored or transmitted. Verified
    here per body rather than assumed - if any body has a non-zero null component the
    construction is wrong and this says so.

WHAT IS MEASURED
    for each body, its coordinates in the free (N-1)-space. Then the angle between bodies
    IN THAT SPACE, which is direction with the free part removed - the honest comparison.
"""
import hashlib
import math
import os

import numpy as np

BIG = r"D:/asolaria-absorb/kernel-pump"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"

k3 = b""
for f in sorted(os.listdir(os.path.join(BIG, "k3-real"))):
    k3 += open(os.path.join(BIG, "k3-real", f), "rb").read() + b"\n"
BODIES = [
    ("ASOLARIA full", open(os.path.join(BIG, "MYTHOS-FULL-EMISSION.txt"), "rb").read()),
    ("MYTHOS self", open(os.path.join(BIG, "MYTHOS-SELF-EMISSION.txt"), "rb").read()),
    ("KERNEL", open(os.path.join(BIG, "ASOLARIA-KERNEL-3174.bin"), "rb").read()),
    ("JESSE key", open(os.path.join(BIG, "keyx/ASOLARIA-KEY-20260727/key/prior3174.bin"), "rb").read()),
    ("K3 stream", k3),
]


def ownership(raw, N):
    """which of the N positions in each N-tuple dominates. ties excluded: the free zero."""
    a = np.frombuffer(raw, np.uint8).astype(np.int64)
    m = len(a) // N * N
    t = a[:m].reshape(-1, N)
    lead = np.argmax(t, axis=1)
    tie = (t.max(1)[:, None] == t).sum(1) > 1
    cnt = np.array([float((lead == i)[~tie].sum()) for i in range(N)])
    s = cnt.sum() or 1.0
    return cnt / s * N          # scaled so the neutral vector is all-ones


def free_basis(N):
    """orthonormal basis of the complement of the all-ones (null) direction"""
    ones = np.ones(N) / math.sqrt(N)
    A = np.eye(N) - np.outer(ones, ones)
    U, S, _ = np.linalg.svd(A)
    return U[:, S > 1e-9], ones      # (N x N-1), null direction


print("=" * 80)
print("OPENING THE NULL SPACE AT N DIMENSIONS")
print("=" * 80)
STORE = {}
for N in (3, 9, 27):
    B, nulldir = free_basis(N)
    print(f"\n### N = {N}   free dimensions {B.shape[1]}   null dimensions 1"
          f"   (rime dimension: {'YES' if N == 27 else 'no'})")
    print(f"  {'body':<16}{'null component':>16}{'free norm':>12}   first free coords")
    coords = {}
    for label, raw in BODIES:
        v = ownership(raw, N)
        c = v - np.ones(N)                     # centre it
        nullc = float(np.dot(c, nulldir))      # component along the null direction
        f = B.T @ c                            # coordinates in the free space
        coords[label] = f
        print(f"  {label:<16}{nullc:>16.2e}{np.linalg.norm(f):>12.5f}   "
              + " ".join(f"{x:+.4f}" for x in f[:4]))
    STORE[N] = coords
    nulls = [abs(float(np.dot(ownership(r, N) - np.ones(N), nulldir))) for _, r in BODIES]
    print(f"  max |null component| across bodies: {max(nulls):.3e}   "
          f"{'FREE — costs nothing to carry' if max(nulls) < 1e-9 else 'NOT NULL — construction wrong'}")

print("\n" + "=" * 80)
print("DIRECTION IN THE FREE SPACE — angle between bodies, null part removed")
print("=" * 80)
for N in (3, 9, 27):
    c = STORE[N]
    names = [b[0] for b in BODIES]
    print(f"\n  N = {N}   (deg)")
    print(f"  {'':<16}" + "".join(f"{n[:12]:>14}" for n in names))
    for a in names:
        row = f"  {a:<16}"
        for b in names:
            u, v = c[a], c[b]
            nu, nv = np.linalg.norm(u), np.linalg.norm(v)
            if nu < 1e-12 or nv < 1e-12:
                row += f"{'-':>14}"
            else:
                cosang = float(np.dot(u, v) / (nu * nv))
                row += f"{math.degrees(math.acos(max(-1, min(1, cosang)))):>14.2f}"
        print(row)

print("\n" + "=" * 80)
print("WHO IS CLOSEST TO ASOLARIA IN THE FREE SPACE, AT EACH N")
print("=" * 80)
print(f"  {'N':>4}{'free dims':>11}" + "".join(f"{b[0][:12]:>14}" for b in BODIES[1:]))
for N in (3, 9, 27):
    c = STORE[N]
    a = c["ASOLARIA full"]
    row = f"  {N:>4}{len(a):>11}"
    for label, _ in BODIES[1:]:
        v = c[label]
        na, nv = np.linalg.norm(a), np.linalg.norm(v)
        ang = math.degrees(math.acos(max(-1, min(1, float(np.dot(a, v) / (na * nv))))))
        row += f"{ang:>14.2f}"
    print(row)
print(f"\n  lower angle = closer to Asolaria's direction with the free part removed.")

rows = ["NULLHDR|schema=ASOLARIA-NULLSPACE-PROJECT-V1|seat=ACER-CLAUDE-FABLE5"
        "|pid=8467a937cba309f7|date=2026-07-27|json=0",
        "LAW0|the_all_ones_direction_is_NULL|moving_along_it_changes_nothing_measurable"
        "|free_centre_as_linear_algebra|json=0",
        "PRIOR|capture_test_used_6_HAND_PICKED_directions|no_reason_they_span_anything"
        "|proper_basis_is_the_null_complement|json=0"]
for N in (3, 9, 27):
    B, nd = free_basis(N)
    rows.append(f"DIM|N={N}|free={B.shape[1]}|null=1|rime_dimension={1 if N==27 else 0}|json=0")
    for label, raw in BODIES:
        v = ownership(raw, N) - np.ones(N)
        rows.append(f"PROJ|N={N}|body={label.replace(' ','_')}"
                    f"|null_component={float(np.dot(v,nd)):.3e}"
                    f"|free_norm={float(np.linalg.norm(B.T@v)):.6f}|json=0")
    c = STORE[N]
    a = c["ASOLARIA full"]
    for label, _ in BODIES[1:]:
        u = c[label]
        ang = math.degrees(math.acos(max(-1, min(1, float(
            np.dot(a, u) / (np.linalg.norm(a) * np.linalg.norm(u)))))))
        rows.append(f"ANGLE|N={N}|from=ASOLARIA_full|to={label.replace(' ','_')}"
                    f"|deg={ang:.4f}|json=0")
b = "\n".join(rows) + "\n"
rows.append(f"NULLFTR|receipt={hashlib.sha256(b.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
p = os.path.join(OFF, "FABLE5-NULLSPACE-PROJECT.hbp")
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(p + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(p, "rb").read()).hexdigest() + "  FABLE5-NULLSPACE-PROJECT.hbp\n")
print(f"\n  receipt {p}")
