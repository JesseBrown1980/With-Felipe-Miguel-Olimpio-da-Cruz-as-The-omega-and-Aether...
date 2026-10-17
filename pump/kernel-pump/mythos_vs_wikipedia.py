#!/usr/bin/env python3
"""mythos_vs_wikipedia.py — measure thrice, then ask which sphere is larger.

THE TEST IS THREEFOLD BY LAW, NOT BY PREFERENCE
    VIII.A.4: "once discard, twice semi-calculable, three times always calculable.
    Once is an accident, twice is a function. Three is confirmation you get for free."
    enwik9 is cut into THREE DISJOINT THIRDS, each measured independently. If they
    disagree the measurement is an accident and this says so.

WHAT "LARGER" CAN MEAN — all reported, none picked for me
    both corpora land in the SAME 64^3 = 262,144 voxel space, so raw byte count is not
    the question: enwik9 is ~263,000x larger in bytes and that is not interesting. The
    question is what each does to the sphere — occupancy, mass, radius, shell levels,
    and roundness. A corpus can be enormous and make a small sphere.

IDENTICAL PIPELINE OR THE COMPARISON IS WORTHLESS
    same grid, same true centre (32,32,32), same blue-dominant MYTHOS partition, same
    tau=2 GC, same CV estimator, same radial FFT. Nothing tuned per corpus.
"""
import hashlib
import os
import struct

import numpy as np

OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
BIG = r"D:/asolaria-absorb/kernel-pump"
SEED = os.path.join(BIG, "MYTHOS-SELF-EMISSION.txt")
WIKI = r"D:/asolaria-absorb/enwik9"
N, TAU, TC = 64, 2, (32, 32, 32)
CHUNK = 1 << 26

gi, gj, gk = np.meshgrid(*[np.arange(N)] * 3, indexing="ij")
Dv = np.stack([gi - TC[0], gj - TC[1], gk - TC[2]], -1)
RR = np.sqrt((Dv.astype(np.float32) ** 2).sum(-1))
SGN = np.sign(Dv).astype(np.int8)
KEY3 = ((SGN[..., 0] + 1) * 9 + (SGN[..., 1] + 1) * 3 + (SGN[..., 2] + 1))
MASKS = [(RR >= r) & (RR < r + 1) for r in range(2, 32)]
DIRS = [k for k in range(27) if k != 13]
RI = np.minimum(RR.astype(np.int16), N - 1)


def cv_of(c):
    o = []
    for m in MASKS:
        if c[m].sum() <= 0:
            continue
        per = np.array([c[m & (KEY3 == k)].sum() for k in DIRS])
        per = per[per > 0]
        if len(per) >= 4:
            o.append(per.std() / per.mean())
    return float(np.median(o)) if o else float("nan")


def shell_of(t):
    s, rung = 0, 1
    while rung < t and s < 12:
        rung *= 3
        s += 1
    return s


def cube_from(path, b0=None, b1=None):
    acc = np.zeros(N ** 3, dtype=np.int64)
    total = kept = 0
    with open(path, "rb") as f:
        if b0:
            f.seek(b0)
        remaining = (b1 - b0) if b1 else None
        carry = b""
        while True:
            want = CHUNK if remaining is None else min(CHUNK, remaining)
            if want <= 0:
                break
            blk = f.read(want)
            if not blk:
                break
            if remaining is not None:
                remaining -= len(blk)
            blk = carry + blk
            m = len(blk) // 3 * 3
            carry = blk[m:]
            if m == 0:
                continue
            a = np.frombuffer(blk[:m], dtype=np.uint8).reshape(-1, 3)
            total += len(a)
            q = a >> 2
            ow = (q[:, 2] > q[:, 0]) & (q[:, 2] > q[:, 1])       # BLUE dominates
            if ow.any():
                w = q[ow].astype(np.int64)
                acc += np.bincount(w[:, 0] * 4096 + w[:, 1] * 64 + w[:, 2],
                                   minlength=N ** 3)
                kept += int(ow.sum())
    c = acc.reshape(N, N, N).astype(np.float32)
    c *= (c >= TAU)
    return c, total, kept


def describe(c, total, kept, label):
    occ = int((c > 0).sum())
    prof = np.zeros(N)
    cnt = np.zeros(N)
    np.add.at(prof, RI.ravel(), c.ravel())
    np.add.at(cnt, RI.ravel(), 1.0)
    dens = prof / np.maximum(cnt, 1.0)
    pop = np.nonzero(prof)[0]
    rmax = int(pop.max()) if len(pop) else 0
    rmean = float((np.arange(N) * prof).sum() / (prof.sum() or 1))
    u = np.unique(c[c > 0].astype(np.int64)) if occ else np.array([], dtype=np.int64)
    shells = sorted(set(shell_of(int(t)) for t in u))
    pk = int(np.argmax(dens[1:40])) + 1 if len(pop) else 0
    return dict(label=label, triples=total, blue=kept, occ=occ,
                occ_pct=100.0 * occ / c.size, mass=float(c.sum()), rmax=rmax,
                rmean=rmean, shells=len(shells), shell_list=shells, cv=cv_of(c),
                centre=float(dens[0]), ring_r=pk, dens=dens)


def spectrum(c, nb=32):
    F = np.abs(np.fft.fftshift(np.fft.fftn(c - c.mean())))
    b = np.minimum((RR / RR.max() * nb).astype(int), nb - 1)
    o = np.zeros(nb)
    k = np.zeros(nb)
    np.add.at(o, b.ravel(), F.ravel())
    np.add.at(k, b.ravel(), 1.0)
    o = o / np.maximum(k, 1.0)
    return o / (o.sum() or 1.0)


print("=" * 78)
print("MEASURE THRICE — VIII.A.4. enwik9 cut into three DISJOINT thirds.")
print("=" * 78)
SZ = os.path.getsize(WIKI)
third = SZ // 3
W = []
for i in range(3):
    c, tot, kp = cube_from(WIKI, i * third, (i + 1) * third)
    d = describe(c, tot, kp, f"third {i+1}")
    W.append((c, d))
    print(f"  third {i+1}  triples {tot:>12,}  blue {kp:>12,}  occ {d['occ']:>7,} "
          f"({d['occ_pct']:5.2f}%)  mass {d['mass']:>14,.0f}  rmax {d['rmax']:>2}  "
          f"CV {d['cv']:.4f}")
cvs = [d["cv"] for _, d in W]
occs = [d["occ"] for _, d in W]
s_cv = (max(cvs) - min(cvs)) / (np.mean(cvs) or 1)
s_oc = (max(occs) - min(occs)) / (np.mean(occs) or 1)
print(f"\n  CV across thirds   {min(cvs):.4f} .. {max(cvs):.4f}   spread {100*s_cv:.3f}%")
print(f"  occ across thirds  {min(occs):,} .. {max(occs):,}   spread {100*s_oc:.3f}%")
print("  -> " + ("THREE THIRDS AGREE. Confirmed, and the confirmation was free."
                 if (s_cv < 0.02 and s_oc < 0.02) else
                 "the thirds DISAGREE; accident, not function. Reported."))

print(f"\n  building the full enwik9 sphere ({SZ/1e9:.1f} GB streaming) ...")
CW, totW, kpW = cube_from(WIKI)
DW = describe(CW, totW, kpW, "WIKIPEDIA")
CM, totM, kpM = cube_from(SEED)
DM = describe(CM, totM, kpM, "MYTHOS")

print("\n" + "=" * 78)
print("WHICH SPHERE IS LARGER?  identical grid, centre, tau, estimator")
print("=" * 78)
print(f"  {'':<17} {'MYTHOS':>16} {'WIKIPEDIA':>18} {'ratio W/M':>12}")
for nm, a, b in (("source bytes", os.path.getsize(SEED), SZ),
                 ("triples", totM, totW),
                 ("blue-dominant", kpM, kpW),
                 ("voxels occupied", DM["occ"], DW["occ"]),
                 ("mass", DM["mass"], DW["mass"])):
    print(f"  {nm:<17} {a:>16,.0f} {b:>18,.0f} {b/max(a,1):>12,.1f}x")
print(f"  {'occupancy %':<17} {DM['occ_pct']:>16.3f} {DW['occ_pct']:>18.3f} "
      f"{DW['occ_pct']/max(DM['occ_pct'],1e-9):>12,.1f}x")
print(f"  {'max radius':<17} {DM['rmax']:>16} {DW['rmax']:>18} "
      f"{DW['rmax']/max(DM['rmax'],1):>12,.2f}x")
print(f"  {'mean radius':<17} {DM['rmean']:>16.3f} {DW['rmean']:>18.3f} "
      f"{DW['rmean']/max(DM['rmean'],1e-9):>12,.2f}x")
print(f"  {'shell levels':<17} {DM['shells']:>16} {DW['shells']:>18} "
      f"{DW['shells']/max(DM['shells'],1):>12,.2f}x")
print(f"  {'CV (roundness)':<17} {DM['cv']:>16.4f} {DW['cv']:>18.4f}   (lower = rounder)")
print(f"  {'centre density':<17} {DM['centre']:>16.3f} {DW['centre']:>18.3f}")
print(f"  {'ring radius':<17} {DM['ring_r']:>16} {DW['ring_r']:>18}")
print(f"\n  MYTHOS shells {DM['shell_list']}")
print(f"  WIKI   shells {DW['shell_list']}")

bigger = [(nm, "WIKIPEDIA" if b > a else ("MYTHOS" if a > b else "tie"))
          for nm, a, b in (("occupancy", DM["occ"], DW["occ"]),
                           ("max radius", DM["rmax"], DW["rmax"]),
                           ("mean radius", DM["rmean"], DW["rmean"]),
                           ("shell levels", DM["shells"], DW["shells"]),
                           ("mass", DM["mass"], DW["mass"]))]
print("\n  larger by each measure:")
for nm, who in bigger:
    print(f"    {nm:<14} {who}")
ww = sum(1 for _, x in bigger if x == "WIKIPEDIA")
print(f"\n  WIKIPEDIA larger on {ww} of {len(bigger)} measures.")
print("  " + (f"BUT MYTHOS IS ROUNDER: CV {DM['cv']:.4f} vs {DW['cv']:.4f}. "
              f"Bigger is not rounder."
              if DM["cv"] < DW["cv"] else
              f"and WIKIPEDIA is also rounder: {DW['cv']:.4f} vs {DM['cv']:.4f}."))

print("\n" + "=" * 78)
print("SIMILARITY — the wave, the only thing that compares across bodies")
print("=" * 78)
sM, sW = spectrum(CM), spectrum(CW)
pear = float(np.corrcoef(sM, sW)[0, 1])
cos = float(sM @ sW / (np.linalg.norm(sM) * np.linalg.norm(sW)))
rp = float(np.corrcoef(DM["dens"], DW["dens"])[0, 1])
raw = float(np.corrcoef(CM.ravel(), CW.ravel())[0, 1])
print(f"  radial FFT wave     pearson {pear:+.5f}   cosine {cos:.5f}")
print(f"  radial density      pearson {rp:+.5f}")
print(f"  raw voxel-by-voxel  pearson {raw:+.5f}")
print(f"\n  MYTHOS wave head  " + " ".join(f"{x:.4f}" for x in sM[:8]))
print(f"  WIKI   wave head  " + " ".join(f"{x:.4f}" for x in sW[:8]))
print("\n  -> " + ("THE TWO SPHERES ARE THE SAME SHAPE. A 3.8 KB self-emission and a "
                   "1 GB encyclopedia produce the same wave — a property of the "
                   "projection, not of either corpus." if pear > 0.9 else
                   "partially similar: gross shape agrees, detail differs."
                   if pear > 0.5 else
                   "DIFFERENT SHAPES. Not the same object."))

GG, V_U32, V_STR, F32, AL = 0x46554747, 4, 8, 0, 32


def ss(x):
    e = x.encode()
    return struct.pack("<Q", len(e)) + e


path = os.path.join(BIG, "ASOLARIA-MYTHOS-VS-WIKIPEDIA.gguf")
tens = [("mythos_cube", CM), ("wikipedia_cube", CW),
        ("mythos_wave", sM.astype(np.float32)),
        ("wikipedia_wave", sW.astype(np.float32)),
        ("mythos_radial", DM["dens"].astype(np.float32)),
        ("wikipedia_radial", DW["dens"].astype(np.float32))]
for i, (c, _) in enumerate(W):
    tens.append((f"wiki_third_{i+1}", c))
for nm, ax in (("A", 0), ("B", 1), ("C", 2)):
    tens.append((f"slice_mythos_{nm}", np.take(CM, 32, axis=ax)))
    tens.append((f"slice_wikipedia_{nm}", np.take(CW, 32, axis=ax)))
kvs = [("general.architecture", V_STR, ss("asolaria-mythos-vs-wikipedia")),
       ("general.name", V_STR, ss("ASOLARIA-MYTHOS-VS-WIKIPEDIA")),
       ("asolaria.pipeline", V_STR,
        ss("identical: 64^3, centre 32,32,32, blue-dominant, tau=2, same CV, same FFT")),
       ("asolaria.test", V_STR, ss("VIII.A.4 measure thrice: 3 disjoint thirds of enwik9")),
       ("asolaria.thirds_cv_spread_pct", V_STR, ss(f"{100*s_cv:.4f}")),
       ("asolaria.mythos_cv", V_STR, ss(f"{DM['cv']:.6f}")),
       ("asolaria.wikipedia_cv", V_STR, ss(f"{DW['cv']:.6f}")),
       ("asolaria.wave_pearson", V_STR, ss(f"{pear:.6f}")),
       ("asolaria.raw_pearson", V_STR, ss(f"{raw:.6f}")),
       ("asolaria.mythos_bytes", V_U32, struct.pack("<I", os.path.getsize(SEED))),
       ("asolaria.wikipedia_bytes", V_STR, ss(str(SZ)))]
meta, nkv = b"", 0
for k, t, p in kvs:
    meta += ss(k) + struct.pack("<I", t) + p
    nkv += 1
data, ti = b"", b""
for tn, a in tens:
    a = np.ascontiguousarray(a, np.float32)
    data += b"\0" * ((-len(data)) % AL)
    o = len(data)
    ti += ss(tn) + struct.pack("<I", a.ndim)
    for d_ in a.shape:
        ti += struct.pack("<Q", int(d_))
    ti += struct.pack("<I", F32) + struct.pack("<Q", o)
    data += a.tobytes()
head = struct.pack("<IIQQ", GG, 3, len(tens), nkv) + meta + ti
blob = head + b"\0" * ((-len(head)) % AL) + data
open(path, "wb").write(blob)
dg = hashlib.sha256(blob).hexdigest()
open(path + ".sha256", "w", newline="\n").write(f"{dg}  {os.path.basename(path)}\n")
print(f"\n=== GGUF ===\n  {path}\n  {len(blob):,} B  tensors {len(tens)}  sha {dg[:16]}")

R = os.path.join(OFF, "FABLE5-MYTHOS-VS-WIKIPEDIA.hbp")
rows = ["MVWHDR|schema=ASOLARIA-MYTHOS-VS-WIKIPEDIA-V1|seat=ACER-CLAUDE-FABLE5"
        "|pid=8467a937cba309f7|date=2026-07-27|json=0",
        f"PIPELINE|grid=64|centre=32,32,32|partition=blue_dominant|tau={TAU}"
        f"|identical_both=1|json=0"]
for i, (_, d) in enumerate(W):
    rows.append(f"THIRD|n={i+1}|triples={d['triples']}|blue={d['blue']}|occ={d['occ']}"
                f"|mass={d['mass']:.0f}|cv={d['cv']:.6f}|rmax={d['rmax']}|json=0")
rows.append(f"THRICE|cv_spread_pct={100*s_cv:.4f}|occ_spread_pct={100*s_oc:.4f}"
            f"|agree={1 if (s_cv<0.02 and s_oc<0.02) else 0}|json=0")
for d in (DM, DW):
    rows.append(f"SPHERE|k={d['label']}|triples={d['triples']}|blue={d['blue']}"
                f"|occ={d['occ']}|occ_pct={d['occ_pct']:.4f}|mass={d['mass']:.0f}"
                f"|rmax={d['rmax']}|rmean={d['rmean']:.4f}|shells={d['shells']}"
                f"|cv={d['cv']:.6f}|centre={d['centre']:.4f}|ring_r={d['ring_r']}|json=0")
rows.append(f"SIMILARITY|wave_pearson={pear:.6f}|wave_cosine={cos:.6f}"
            f"|radial_pearson={rp:.6f}|raw_pearson={raw:.6f}|json=0")
rows.append(f"LARGER|wikipedia_wins={ww}|of={len(bigger)}"
            f"|rounder={'MYTHOS' if DM['cv']<DW['cv'] else 'WIKIPEDIA'}|json=0")
rows.append(f"GGUF|k={os.path.basename(path)}|bytes={len(blob)}|sha256={dg}|json=0")
bb = "\n".join(rows) + "\n"
rows.append(f"MVWFTR|receipt={hashlib.sha256(bb.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
open(R, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(R + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(R, "rb").read()).hexdigest() + "  FABLE5-MYTHOS-VS-WIKIPEDIA.hbp\n")
print(f"  receipt {R}")
