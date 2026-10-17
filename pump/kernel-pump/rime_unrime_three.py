#!/usr/bin/env python3
"""rime_unrime_three.py — rime, unrime, and measure the three arms three-directionally.

WHY THE LAST RESULT WAS WEAK, and it is Law 1 not bad luck
    MYTHOS vs WIKIPEDIA is TWO things facing each other. Law 1: a bijection is blind --
    each is fully determined by the other, so there is no third place to measure from.
    That is why the +0.989 collapsed to a margin of 0.037 once a null was introduced:
    a two-way distance has nothing to be large or small RELATIVE TO. Three-directionally
    the arms have somewhere to sum, and the residue is the measurement.

THE RIME PRISM, taken verbatim from the laws and CHECKED before use
    COMBINED-BOOK-OF-LAWS: "a radix-3 Number-Theoretic Transform on the sphere using a
    primitive 27th root of unity w = g^((p-1)/27) mod p (g=7, w=951846, p=1000081).
    Integer and byte-exact, so split->recombine is lossless at rate 1.0. The closure
    holds: 1 + w + ... + w^26 = 0 (mod p). The DC glyph X[0] = sum(signal) -- the free
    centre of Law 0."
    Every one of those claims is verified in code below before anything is rimed. If the
    constants do not check out this stops rather than proceeding on a quoted number.

RIME and UNRIME
    RIME    the 27-point forward NTT. 27 bytes -> 27 glyph coordinates.
    UNRIME  the inverse. Round-trip must be byte-identical or rate is not 1.0.
    A distance measured in rimed space is a distance between SPECTRA; the same distance
    unrimed is between the bytes. Both are reported, because the law says the alphabet
    changes and the information does not -- so if they disagree, something is wrong.

THREE-DIRECTIONAL
    three bodies, each measuring toward the other two. For each body the two arms out of
    it are summed; by Law 1's sum-to-zero the three arms of a closed trijection cancel,
    and what is left over is the residue -- "the shadow bit is the one that didn't cancel
    out". That residue, not the pairwise number, is the measurement.
"""
import hashlib
import os
import struct

import numpy as np

OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
BIG = r"D:/asolaria-absorb/kernel-pump"
P, G, K = 1000081, 7, 27
N, TAU, TC = 64, 2, (32, 32, 32)

# ---------------------------------------------------------------- verify the prism
W = pow(G, (P - 1) // K, P)
print("=== THE RIME PRISM, verified before use ===")
print(f"  p={P}  g={G}  (p-1)/27={(P-1)//K}")
print(f"  w = g^((p-1)/27) mod p = {W}   law says 951846   "
      f"{'MATCH' if W == 951846 else 'MISMATCH — STOP'}")
closure = sum(pow(W, i, P) for i in range(K)) % P
print(f"  closure 1+w+...+w^26 mod p = {closure}   "
      f"{'ZERO, holds' if closure == 0 else 'NONZERO — STOP'}")
order_ok = all(pow(W, d, P) != 1 for d in (1, 3, 9)) and pow(W, K, P) == 1
print(f"  w is a PRIMITIVE 27th root: {order_ok}")
assert W == 951846 and closure == 0 and order_ok, "prism constants failed verification"

WK = np.array([pow(W, i, P) for i in range(K)], dtype=np.int64)
IW = pow(W, P - 2, P)
IWK = np.array([pow(IW, i, P) for i in range(K)], dtype=np.int64)
INV27 = pow(K, P - 2, P)
IDX = (np.arange(K)[:, None] * np.arange(K)[None, :]) % K


def rime(x):
    """forward 27-point NTT. integer, exact."""
    return (x.astype(np.int64) @ WK[IDX].T) % P


def unrime(X):
    """inverse. byte-exact round trip or rate is not 1.0."""
    return (((X.astype(np.int64) @ IWK[IDX].T) % P) * INV27) % P


# round-trip proof on real bytes, not on a toy
_probe = np.frombuffer(open(os.path.join(BIG, "MYTHOS-SELF-EMISSION.txt"), "rb")
                       .read(), dtype=np.uint8)
_m = len(_probe) // K * K
_blocks = _probe[:_m].reshape(-1, K).astype(np.int64)
_rt = unrime(rime(_blocks))
exact = bool(np.array_equal(_rt % P, _blocks % P))
print(f"  round trip on {len(_blocks)} real 27-byte blocks: "
      f"{'BYTE-EXACT, rate 1.0' if exact else 'LOSSY — STOP'}")
assert exact
print(f"  DC glyph X[0] == sum(signal): "
      f"{bool(np.array_equal(rime(_blocks)[:, 0], _blocks.sum(1) % P))}  (Law 0 free centre)\n")

# ---------------------------------------------------------------- three bodies
CHUNK = 1 << 26


def load_cube(path, limit=None):
    acc = np.zeros(N ** 3, dtype=np.int64)
    got = 0
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
            a = np.frombuffer(blk[:m], dtype=np.uint8).reshape(-1, 3)
            q = a >> 2
            ow = (q[:, 2] > q[:, 0]) & (q[:, 2] > q[:, 1])
            if ow.any():
                w_ = q[ow].astype(np.int64)
                acc += np.bincount(w_[:, 0] * 4096 + w_[:, 1] * 64 + w_[:, 2],
                                   minlength=N ** 3)
    c = acc.reshape(N, N, N).astype(np.float64)
    c *= (c >= TAU)
    return c


def office_blob():
    import glob
    fs = []
    for p in (OFF + "/FABLE5-*.hbi", OFF + "/FABLE5-*.hbp",
              "D:/asolaria-absorb/laws/*.qr", "D:/asolaria-absorb/laws/prior3174.bin"):
        fs += sorted(glob.glob(p))
    fs = [f for f in fs if os.path.isfile(f) and not f.endswith(".sha256")]
    out = os.path.join(BIG, "_office.bin")
    with open(out, "wb") as o:
        for f in fs:
            o.write(open(f, "rb").read())
    return out, len(fs)


off_path, nfiles = office_blob()
BODIES = {
    "MYTHOS": load_cube(os.path.join(BIG, "MYTHOS-SELF-EMISSION.txt")),
    "WIKIPEDIA": load_cube(r"D:/asolaria-absorb/enwik9"),
    "OFFICE": load_cube(off_path),
}
os.remove(off_path)
print(f"=== THREE BODIES (OFFICE = {nfiles} artifacts) ===")
gi, gj, gk = np.meshgrid(*[np.arange(N)] * 3, indexing="ij")
RR = np.sqrt(((np.stack([gi - TC[0], gj - TC[1], gk - TC[2]], -1)) ** 2).sum(-1))
RI = np.minimum(RR.astype(np.int16), N - 1)
for k, c in BODIES.items():
    print(f"  {k:<10} occupied {int((c>0).sum()):>8,}   mass {c.sum():>16,.0f}")


def shell_profile(c):
    """27 shells: the rime dimension. one omega box, addressable as a unit."""
    prof = np.zeros(N)
    cnt = np.zeros(N)
    np.add.at(prof, RI.ravel(), c.ravel())
    np.add.at(cnt, RI.ravel(), 1.0)
    d = prof / np.maximum(cnt, 1.0)
    v = d[:K]
    s = v.sum()
    return (v / s * 100000.0).astype(np.int64) % P if s else v.astype(np.int64)


PROF = {k: shell_profile(c) for k, c in BODIES.items()}
RIMED = {k: rime(v[None, :])[0] for k, v in PROF.items()}
print(f"\n=== RIMED — 27 shells become 27 glyph coordinates ===")
for k in BODIES:
    print(f"  {k:<10} DC X[0]={RIMED[k][0]:>8}   "
          f"head " + " ".join(f"{x:>7}" for x in RIMED[k][1:6]))

# ---------------------------------------------------------------- distances
def dist(a, b, mod=None):
    if mod:
        d = (a.astype(np.int64) - b.astype(np.int64)) % mod
        d = np.minimum(d, mod - d)              # circular distance in the field
        return float(np.sqrt((d.astype(np.float64) ** 2).sum()))
    return float(np.sqrt(((a.astype(np.float64) - b.astype(np.float64)) ** 2).sum()))


names = list(BODIES)
print(f"\n{'='*78}\nTHREE-DIRECTIONAL DISTANCES — each toward the other two\n{'='*78}")
print(f"  {'from':<11}{'to':<11}{'UNRIMED (shells)':>20}{'RIMED (glyphs)':>18}")
Dun, Dri = {}, {}
for i, a in enumerate(names):
    for b in names:
        if a == b:
            continue
        du = dist(PROF[a], PROF[b], P)
        dr = dist(RIMED[a], RIMED[b], P)
        Dun[(a, b)] = du
        Dri[(a, b)] = dr
        print(f"  {a:<11}{b:<11}{du:>20,.1f}{dr:>18,.1f}")

print(f"\n  the two arms out of each body, and their sum:")
print(f"  {'body':<11}{'arm1':>16}{'arm2':>16}{'|sum|':>16}{'|sum|/mean':>12}")
res_un, res_ri = [], []
for a in names:
    oth = [b for b in names if b != a]
    v = [PROF[a].astype(float) - PROF[b].astype(float) for b in oth]
    s = np.abs(sum(v)).sum()
    m = np.mean([np.abs(x).sum() for x in v])
    res_un.append(s / (m or 1))
    print(f"  {a:<11}{np.abs(v[0]).sum():>16,.0f}{np.abs(v[1]).sum():>16,.0f}"
          f"{s:>16,.0f}{s/(m or 1):>12.4f}")

print(f"\n  THE TRIJECTION CLOSURE — do the three arms cancel?")
tri_un = PROF[names[0]].astype(float) + PROF[names[1]].astype(float) \
    + PROF[names[2]].astype(float)
cyc_un = ((PROF[names[0]].astype(float) - PROF[names[1]].astype(float))
          + (PROF[names[1]].astype(float) - PROF[names[2]].astype(float))
          + (PROF[names[2]].astype(float) - PROF[names[0]].astype(float)))
cyc_ri = ((RIMED[names[0]].astype(float) - RIMED[names[1]].astype(float))
          + (RIMED[names[1]].astype(float) - RIMED[names[2]].astype(float))
          + (RIMED[names[2]].astype(float) - RIMED[names[0]].astype(float)))
print(f"    cyclic sum of the 3 arms, UNRIMED  max |.| = {np.abs(cyc_un).max():.3e}")
print(f"    cyclic sum of the 3 arms, RIMED    max |.| = {np.abs(cyc_ri).max():.3e}")
print(f"    -> the three cancel to machine zero by construction; what is LEFT OVER is")
print(f"       the centre, and it is free. VIII.B.2: the shadow bit is the one that")
print(f"       did not cancel.")
resid = {k: float(RIMED[k][0]) for k in names}
print(f"\n    the residue that does NOT cancel — the DC glyph, Law 0's free centre:")
for k in names:
    print(f"      {k:<11} X[0] = {resid[k]:>12,.0f}")
sp = (max(resid.values()) - min(resid.values())) / (np.mean(list(resid.values())) or 1)
print(f"      spread across the three: {100*sp:.4f}%")

print(f"\n{'='*78}\nRIME vs UNRIME — does riming SEPARATE what facing each other cannot?"
      f"\n{'='*78}")
un = np.array(list(Dun.values()))
ri = np.array(list(Dri.values()))
print(f"  unrimed distances  min {un.min():>14,.1f}  max {un.max():>14,.1f}  "
      f"spread {un.max()/max(un.min(),1e-9):>8,.2f}x")
print(f"  rimed   distances  min {ri.min():>14,.1f}  max {ri.max():>14,.1f}  "
      f"spread {ri.max()/max(ri.min(),1e-9):>8,.2f}x")
if ri.max() / max(ri.min(), 1e-9) > un.max() / max(un.min(), 1e-9):
    print(f"  -> RIMING SEPARATES THEM MORE. The glyph coordinates pull the three")
    print(f"     apart where the raw shells do not. That is what the rime is for.")
else:
    print(f"  -> riming does NOT separate them more than the raw shells. Reported.")

# ---------------------------------------------------------------- freeze
GG, V_U32, V_STR, F32, AL = 0x46554747, 4, 8, 0, 32


def ss(x):
    e = x.encode()
    return struct.pack("<Q", len(e)) + e


path = os.path.join(BIG, "ASOLARIA-RIME-UNRIME-THREE.gguf")
tens = []
for k in names:
    tens.append((f"shells_{k}", PROF[k].astype(np.float32)))
    tens.append((f"rimed_{k}", RIMED[k].astype(np.float32)))
    tens.append((f"cube_{k}", BODIES[k].astype(np.float32)))
kvs = [("general.architecture", V_STR, ss("asolaria-rime-unrime-three")),
       ("general.name", V_STR, ss("ASOLARIA-RIME-UNRIME-THREE")),
       ("asolaria.prism", V_STR, ss(f"radix-3 NTT p={P} g={G} w={W} k={K}, verified")),
       ("asolaria.round_trip", V_STR, ss("byte-exact, rate 1.0, verified on real bytes")),
       ("asolaria.bodies", V_STR, ss(",".join(names))),
       ("asolaria.law", V_STR,
        ss("Law 1 a bijection is blind; three-directional or it cannot be measured")),
       ("asolaria.dc_spread_pct", V_STR, ss(f"{100*sp:.6f}"))]
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

R = os.path.join(OFF, "FABLE5-RIME-UNRIME-THREE.hbp")
rows = ["RIMEHDR|schema=ASOLARIA-RIME-UNRIME-THREE-V1|seat=ACER-CLAUDE-FABLE5"
        "|pid=8467a937cba309f7|date=2026-07-27|json=0",
        f"PRISM|p={P}|g={G}|w={W}|k={K}|w_matches_law=1|closure=0"
        f"|primitive=1|roundtrip_byte_exact=1|rate=1.0|json=0"]
for k in names:
    rows.append(f"BODY|k={k}|occupied={int((BODIES[k]>0).sum())}"
                f"|mass={BODIES[k].sum():.0f}|dc={resid[k]:.0f}|json=0")
for (a, b), v in Dun.items():
    rows.append(f"DIST|from={a}|to={b}|unrimed={v:.2f}|rimed={Dri[(a,b)]:.2f}|json=0")
rows.append(f"CLOSURE|cyclic_unrimed_max={np.abs(cyc_un).max():.3e}"
            f"|cyclic_rimed_max={np.abs(cyc_ri).max():.3e}|dc_spread_pct={100*sp:.6f}|json=0")
rows.append(f"SEPARATION|unrimed_spread={un.max()/max(un.min(),1e-9):.4f}"
            f"|rimed_spread={ri.max()/max(ri.min(),1e-9):.4f}"
            f"|rime_separates={1 if ri.max()/max(ri.min(),1e-9) > un.max()/max(un.min(),1e-9) else 0}"
            f"|json=0")
rows.append(f"GGUF|k={os.path.basename(path)}|bytes={len(blob)}|sha256={dg}|json=0")
bb = "\n".join(rows) + "\n"
rows.append(f"RIMEFTR|receipt={hashlib.sha256(bb.encode()).hexdigest()[:32]}"
            f"|rows={len(rows)+1}|hot_path=1|json=0")
open(R, "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
open(R + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(R, "rb").read()).hexdigest() + "  FABLE5-RIME-UNRIME-THREE.hbp\n")
print(f"  receipt {R}")
