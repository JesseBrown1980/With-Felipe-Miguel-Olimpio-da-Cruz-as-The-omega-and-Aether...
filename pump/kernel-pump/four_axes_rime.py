#!/usr/bin/env python3
"""four_axes_rime.py — time, colour, energy AND space. Rimed separately, per axis.

THE GAP THIS CLOSES, stated plainly
    every GGUF this seat wrote today carries asolaria.axes = "time, colour, energy,
    space". The rime run used ONE of them. The object rimed was the radial shell
    profile -- distance from the centre of the cube -- which is pure SPACE. And the cube
    itself was built by mapping (r,g,b) -> (x,y,z), so COLOUR and SPACE were the same
    three numbers wearing two names. TIME was dropped entirely, for the second time
    today, after being identified as the fourth axis and then discarded again.

    One axis of four, reported as if it were the whole frame.

THE FOUR, MADE GENUINELY INDEPENDENT
    from a byte triple (r,g,b) at stream position t:

      TIME    t            where in the emission it happened. Nothing to do with value.
      ENERGY  r+g+b        the magnitude. How much was there.
      COLOUR  hue angle    atan2(sqrt3*(g-b), 2r-g-b). Direction in the chroma plane,
                           independent of magnitude by construction -- scaling (r,g,b)
                           leaves hue unchanged, which is exactly what makes it not
                           energy and not space.
      SPACE   radial shell distance from (32,32,32) in the 64^3 cube.

    Each is binned to 27 -- one rime dimension, Law 16 -- and rimed with the verified
    prism (p=1000081, g=7, w=951846, k=27).

WHAT THIS CAN SHOW THAT THE LAST RUN COULD NOT
    which AXIS separates the three bodies. If MYTHOS, WIKIPEDIA and OFFICE differ on
    time but not on colour, that is a fact about what they are, and a single-axis run
    cannot even ask it.
"""
import glob
import hashlib
import os
import struct

import numpy as np

OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
BIG = r"D:/asolaria-absorb/kernel-pump"
P, G, K = 1000081, 7, 27
N, TC = 64, (32, 32, 32)
CHUNK = 1 << 26
LIMIT = 300_000_000          # cap enwik9 read so all three are comparable in cost

W = pow(G, (P - 1) // K, P)
assert W == 951846 and sum(pow(W, i, P) for i in range(K)) % P == 0
WK = np.array([pow(W, i, P) for i in range(K)], dtype=np.int64)
IDX = (np.arange(K)[:, None] * np.arange(K)[None, :]) % K


def rime(v):
    return (v.astype(np.int64) @ WK[IDX].T) % P


def axes_of(path, limit=None):
    """four independent 27-histograms: time, colour, energy, space"""
    H = {k: np.zeros(K, dtype=np.int64) for k in ("time", "colour", "energy", "space")}
    got = 0
    pos = 0
    total_est = min(os.path.getsize(path), limit or os.path.getsize(path))
    with open(path, "rb") as f:
        carry = b""
        while True:
            want = CHUNK if limit is None else min(CHUNK, limit - got)
            if want <= 0:
                break
            blk = f.read(want)
            if not blk:
                break
            got += len(blk)
            blk = carry + blk
            m = len(blk) // 3 * 3
            carry = blk[m:]
            if m == 0:
                continue
            a = np.frombuffer(blk[:m], dtype=np.uint8).reshape(-1, 3).astype(np.float64)
            n = len(a)
            r, g, b = a[:, 0], a[:, 1], a[:, 2]

            # TIME — where in the stream. independent of every value.
            t = (np.arange(pos, pos + n) / max(total_est / 3.0, 1.0) * K).astype(int)
            H["time"] += np.bincount(np.clip(t, 0, K - 1), minlength=K)
            pos += n

            # ENERGY — magnitude.
            e = ((r + g + b) / 766.0 * K).astype(int)
            H["energy"] += np.bincount(np.clip(e, 0, K - 1), minlength=K)

            # COLOUR — hue angle. scale-invariant, so not energy.
            hue = np.arctan2(np.sqrt(3.0) * (g - b), 2.0 * r - g - b)
            c = ((hue + np.pi) / (2 * np.pi) * K).astype(int)
            H["colour"] += np.bincount(np.clip(c, 0, K - 1), minlength=K)

            # SPACE — radial position in the cube.
            q = (a / 4.0).astype(np.int64)
            d = np.sqrt(((q - np.array(TC)) ** 2).sum(1))
            s = (d / 56.0 * K).astype(int)
            H["space"] += np.bincount(np.clip(s, 0, K - 1), minlength=K)
    return H


def norm27(h):
    s = h.sum()
    return (h / s * 100000.0).astype(np.int64) % P if s else h


def office_blob():
    fs = []
    for p in (OFF + "/FABLE5-*.hbi", OFF + "/FABLE5-*.hbp",
              "D:/asolaria-absorb/laws/*.qr", "D:/asolaria-absorb/laws/prior3174.bin"):
        fs += sorted(glob.glob(p))
    fs = [f for f in fs if os.path.isfile(f) and not f.endswith(".sha256")]
    out = os.path.join(BIG, "_off4.bin")
    with open(out, "wb") as o:
        for f in fs:
            o.write(open(f, "rb").read())
    return out, len(fs)


ob, nf = office_blob()
SRC = {"MYTHOS": (os.path.join(BIG, "MYTHOS-SELF-EMISSION.txt"), None),
       "WIKIPEDIA": (r"D:/asolaria-absorb/enwik9", LIMIT),
       "OFFICE": (ob, None)}
AX = {}
print("=== FOUR AXES, built independently ===")
for k, (p, lim) in SRC.items():
    AX[k] = axes_of(p, lim)
    print(f"  {k:<10} bytes {os.path.getsize(p) if lim is None else lim:>12,}  "
          + "  ".join(f"{a}:{int(AX[k][a].sum()):>10,}" for a in
                      ("time", "colour", "energy", "space")))
os.remove(ob)

names = list(SRC)
AXES = ("time", "colour", "energy", "space")
PROF = {k: {a: norm27(AX[k][a]) for a in AXES} for k in names}
RIM = {k: {a: rime(PROF[k][a][None, :])[0] for a in AXES} for k in names}


def dist(a, b):
    d = (a.astype(np.int64) - b.astype(np.int64)) % P
    d = np.minimum(d, P - d)
    return float(np.sqrt((d.astype(np.float64) ** 2).sum()))


print(f"\n{'='*78}")
print("THREE-DIRECTIONAL DISTANCE, PER AXIS — which axis separates the three?")
print(f"{'='*78}")
print(f"  {'axis':<9}{'pair':<24}{'UNRIMED':>16}{'RIMED':>16}")
SEP = {}
for a in AXES:
    du, dr = [], []
    for i in range(3):
        for j in range(i + 1, 3):
            x, y = names[i], names[j]
            u = dist(PROF[x][a], PROF[y][a])
            r_ = dist(RIM[x][a], RIM[y][a])
            du.append(u)
            dr.append(r_)
            print(f"  {a:<9}{x[:4]+'<->'+y[:4]:<24}{u:>16,.1f}{r_:>16,.1f}")
    SEP[a] = dict(un_mean=float(np.mean(du)), un_spread=max(du) / max(min(du), 1e-9),
                  ri_mean=float(np.mean(dr)), ri_spread=max(dr) / max(min(dr), 1e-9))
    print()

print(f"{'='*78}\nWHICH AXIS CARRIES THE DIFFERENCE\n{'='*78}")
print(f"  {'axis':<9}{'unrimed mean':>16}{'spread':>10}{'rimed mean':>16}{'spread':>10}")
for a in AXES:
    s = SEP[a]
    print(f"  {a:<9}{s['un_mean']:>16,.1f}{s['un_spread']:>10.2f}x"
          f"{s['ri_mean']:>16,.1f}{s['ri_spread']:>10.2f}x")
order = sorted(AXES, key=lambda a: -SEP[a]["un_mean"])
print(f"\n  axes ranked by how far apart they hold the three bodies (unrimed):")
for i, a in enumerate(order):
    print(f"    {i+1}. {a:<8} mean distance {SEP[a]['un_mean']:>14,.1f}")
print(f"\n  -> {order[0].upper()} separates the three most; {order[-1].upper()} least.")
sp_un = np.mean([SEP[a]["un_spread"] for a in AXES])
sp_ri = np.mean([SEP[a]["ri_spread"] for a in AXES])
print(f"  mean spread unrimed {sp_un:.2f}x   rimed {sp_ri:.2f}x   -> riming "
      f"{'EQUALISES' if sp_ri < sp_un else 'SEPARATES'} on the four axes too")

print(f"\n  the single-axis run I reported before used SPACE only. On space the three")
print(f"  sit at mean {SEP['space']['un_mean']:,.1f}; on {order[0]} they sit at "
      f"{SEP[order[0]]['un_mean']:,.1f}.")
if SEP[order[0]]["un_mean"] > 1.5 * SEP["space"]["un_mean"]:
    print(f"  That is {SEP[order[0]]['un_mean']/max(SEP['space']['un_mean'],1e-9):.1f}x "
          f"more separation than the axis I actually measured. The space-only result "
          f"understated the difference between these bodies.")

GG, V_U32, V_STR, F32, AL = 0x46554747, 4, 8, 0, 32


def ss(x):
    e = x.encode()
    return struct.pack("<Q", len(e)) + e


path = os.path.join(BIG, "ASOLARIA-FOUR-AXES-RIME.gguf")
tens = []
for k in names:
    for a in AXES:
        tens.append((f"{k}_{a}", PROF[k][a].astype(np.float32)))
        tens.append((f"{k}_{a}_rimed", RIM[k][a].astype(np.float32)))
kvs = [("general.architecture", V_STR, ss("asolaria-four-axes-rime")),
       ("general.name", V_STR, ss("ASOLARIA-FOUR-AXES-RIME")),
       ("asolaria.axes", V_STR, ss("time, colour, energy, space — all four, independent")),
       ("asolaria.time", V_STR, ss("stream position, independent of value")),
       ("asolaria.energy", V_STR, ss("r+g+b magnitude")),
       ("asolaria.colour", V_STR, ss("hue angle atan2(sqrt3(g-b), 2r-g-b), scale-invariant")),
       ("asolaria.space", V_STR, ss("radial distance from (32,32,32) in the 64^3 cube")),
       ("asolaria.prism", V_STR, ss(f"p={P} g={G} w={W} k={K} verified")),
       ("asolaria.most_separating_axis", V_STR, ss(order[0])),
       ("asolaria.least_separating_axis", V_STR, ss(order[-1]))]
meta, nkv = b"", 0
for k, t, p in kvs:
    meta += ss(k) + struct.pack("<I", t) + p
    nkv += 1
data, ti = b"", b""
for tn, arr in tens:
    arr = np.ascontiguousarray(arr, np.float32)
    data += b"\0" * ((-len(data)) % AL)
    o = len(data)
    ti += ss(tn) + struct.pack("<I", arr.ndim)
    for d_ in arr.shape:
        ti += struct.pack("<Q", int(d_))
    ti += struct.pack("<I", F32) + struct.pack("<Q", o)
    data += arr.tobytes()
head = struct.pack("<IIQQ", GG, 3, len(tens), nkv) + meta + ti
blob = head + b"\0" * ((-len(head)) % AL) + data
open(path, "wb").write(blob)
dg = hashlib.sha256(blob).hexdigest()
open(path + ".sha256", "w", newline="\n").write(f"{dg}  {os.path.basename(path)}\n")
print(f"\n=== GGUF ===\n  {path}\n  {len(blob):,} B  tensors {len(tens)}  sha {dg[:16]}")

R = os.path.join(OFF, "FABLE5-FOUR-AXES-RIME.hbp")
rows = ["AX4HDR|schema=ASOLARIA-FOUR-AXES-RIME-V1|seat=ACER-CLAUDE-FABLE5"
        "|pid=8467a937cba309f7|date=2026-07-27|json=0",
        "GAP|prior_run_used=space_only|colour_was_conflated_with_space=1"
        "|time_dropped=1|json=0",
        f"PRISM|p={P}|g={G}|w={W}|k={K}|verified=1|json=0"]
for a in AXES:
    s = SEP[a]
    rows.append(f"AXIS|k={a}|un_mean={s['un_mean']:.2f}|un_spread={s['un_spread']:.4f}"
                f"|ri_mean={s['ri_mean']:.2f}|ri_spread={s['ri_spread']:.4f}|json=0")
for a in AXES:
    for i in range(3):
        for j in range(i + 1, 3):
            x, y = names[i], names[j]
            rows.append(f"PAIR|axis={a}|a={x}|b={y}|unrimed={dist(PROF[x][a],PROF[y][a]):.2f}"
                        f"|rimed={dist(RIM[x][a],RIM[y][a]):.2f}|json=0")
rows.append(f"RANK|most={order[0]}|least={order[-1]}|order={'>'.join(order)}|json=0")
rows.append(f"GGUF|k={os.path.basename(path)}|bytes={len(blob)}|sha256={dg}|json=0")
bb = "\n".join(rows) + "\n"
rows.append(f"AX4FTR|receipt={hashlib.sha256(bb.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
open(R, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(R + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(R, "rb").read()).hexdigest() + "  FABLE5-FOUR-AXES-RIME.hbp\n")
print(f"  receipt {R}")
