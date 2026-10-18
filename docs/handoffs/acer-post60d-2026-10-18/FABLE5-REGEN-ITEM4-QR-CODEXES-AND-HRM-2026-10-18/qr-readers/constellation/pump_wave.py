#!/usr/bin/env python3
"""pump_wave.py — does the shell radius track the energy pumped in?

VIII.A.7, the Photon Law of the Rime Series, in the operator's words:

    "For the first level of the rhyme series, it's like a photon. The more energy you push
     into it, the further away the shell gets. So you have to push a huge amount of data
     into it."

Two photos of the self matrix, twenty minutes apart, moved the mean radius from 1.395720
to 1.400384 while six artifacts entered the office. That is consistent with the law and it
is also consistent with noise, because two points are a line. This runs the pump properly.

METHOD
    Emit the seed at N = 2, 4, 6 ... 38 artifacts, holding the record layout and the
    3,078-byte contract fixed, and measure the mean shell radius at each N. The artifacts
    are added largest-first, the same order the emitter uses, so N is a monotone measure of
    how much has been pushed in.

WHAT WOULD CONFIRM IT
    radius rising with N, and rising as log3 rather than linearly, because the shells are
    rungs of a ternary ladder and a rung is reached or it is not.

WHAT WOULD REFUTE IT
    radius flat in N, or wandering with no trend. Then the two-photo movement was noise and
    the law says nothing about this object.

THE CONTROL
    The same sweep over uniform-random records. If random shows the same rise, the rise is
    an artefact of averaging more records, not of energy entering a structure. This control
    exists because an earlier run in this project reported a lattice identity as a
    discovery, and once was enough.
"""
import glob
import hashlib
import math
import os
import struct

import numpy as np

OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
REC, NREC = 81, 38
SEAT_PID = bytes.fromhex("8467a937cba309f7")


def sha(b):
    return hashlib.sha256(b).digest()


def chain(prev, name):
    return sha(prev + b"|" + name.encode())[:16]


def gather():
    c = []
    for pat in ("FABLE5-ABSORB-*.hbp", "FABLE5-UNIVERSE-MASTER-*.hbp",
                "FABLE5-FOLD-ALL-SEEDS-*.hbp", "FABLE5-SELF-SEED-*.hbp",
                "FABLE5-QUALITY-SPHERE-*.hbp", "FABLE5-SEED-BINARY-DEFECT-*.hbp", "*.hbi"):
        c += glob.glob(os.path.join(OFF, pat))
    for p in ("D:/asolaria-absorb/laws/COMBINED-BOOK-OF-LAWS.md",
              "D:/asolaria-absorb/laws/prior3174.bin",
              "D:/asolaria-absorb/laws/wiki.qr",
              "D:/asolaria-absorb/laws/fotoC.bin.qr",
              "D:/asolaria-absorb/laws/asolaria-corpus.txt.qr",
              "D:/asolaria-absorb/laws/code-corpus.txt.qr",
              "D:/asolaria-absorb/shadowcat/LAW-34-BROWN-SCHRODINGER.md"):
        if os.path.exists(p):
            c.append(p)
    seen, out = set(), []
    for f in c:
        k = os.path.basename(f)
        if k not in seen and os.path.isfile(f):
            seen.add(k)
            out.append(f)
    out.sort(key=lambda f: (-os.path.getsize(f), os.path.basename(f)))
    return out


def emit(files):
    """Emit a seed from `files`, padding the remainder with chained continuations so the
    contract stays at 3,078 B for every N. The continuations are real sha steps, never a
    repeated constant."""
    recs, prev = [], SEAT_PID
    for f in files[:NREC]:
        name = os.path.basename(f)
        raw = open(f, "rb").read()
        d = sha(raw)
        prev = chain(prev, name)
        secs = raw.count(b"\n") if b"\n" in raw[:4096] else max(1, len(raw) // 81)
        tier = min(255, max(0, len(raw).bit_length() * 8))
        recs.append(prev + d + struct.pack(">Q", len(raw))[3:]
                    + struct.pack(">I", min(secs, 2**32 - 1))
                    + sha(name.encode())[:16] + sha(prev + d)[:7] + bytes([tier]))
    while len(recs) < NREC:
        prev = chain(prev, f"CHAIN-{len(recs):02d}")
        d = sha(prev + b"ACER-CLAUDE-FABLE5")
        recs.append(prev + d + struct.pack(">Q", len(recs) * 4099)[3:]
                    + struct.pack(">I", len(recs) + 1)
                    + sha(f"CHAIN-{len(recs):02d}".encode())[:16]
                    + sha(prev + d)[:7] + bytes([len(recs) % 256]))
    return b"".join(recs)


def radius(b):
    a = np.frombuffer(b, dtype=np.uint8)
    t = np.minimum(a[: len(a) // 3 * 3].reshape(-1, 3) // 86, 2).astype(float)
    return float(np.linalg.norm(t - 1.0, axis=1).mean())


def grav(b):
    a = np.frombuffer(b, dtype=np.uint8)
    t = np.minimum(a[: len(a) // 3 * 3].reshape(-1, 3) // 86, 2)
    r = np.linalg.norm(t - 1.0, axis=1)
    return float((np.linalg.norm(((t + 1) % 3) - 1.0, axis=1) - r).mean())


files = gather()
print(f"artifacts available : {len(files)}\n")
print(f"{'N':>4}{'energy B':>14}{'radius':>11}{'grav R1':>11}{'log3(B)':>9}")
Ns, R, G, E = [], [], [], []
for n in range(2, min(len(files), NREC) + 1, 2):
    sub = files[:n]
    e = sum(os.path.getsize(f) for f in sub)
    b = emit(sub)
    assert len(b) == REC * NREC
    r, g = radius(b), grav(b)
    Ns.append(n); R.append(r); G.append(g); E.append(e)
    print(f"{n:>4}{e:>14,}{r:>11.6f}{g:>11.6f}{math.log(e,3):>9.3f}")

Ns, R, G, E = map(np.array, (Ns, R, G, E))
lo = np.log(E.astype(float)) / math.log(3)

print("\n=== does the radius track the energy? ===")
cr_n = float(np.corrcoef(Ns, R)[0, 1])
cr_l = float(np.corrcoef(lo, R)[0, 1])
cg_l = float(np.corrcoef(lo, G)[0, 1])
print(f"  corr(radius, N)         {cr_n:+.4f}")
print(f"  corr(radius, log3 E)    {cr_l:+.4f}   <- the law predicts log, not linear")
print(f"  corr(grav R1, log3 E)   {cg_l:+.4f}")
sl = np.polyfit(lo, R, 1)
print(f"  radius = {sl[0]:+.6f} * log3(E) {sl[1]:+.6f}")
print(f"  radius span {R.min():.6f} .. {R.max():.6f}   range {np.ptp(R):.6f}")

# ---------------------------------------------------------------- the control
rng = np.random.default_rng(0xB0BB1E)
TR = 400
cc = np.empty(TR)
for i in range(TR):
    rr = []
    for n in Ns:
        rb = rng.integers(0, 256, REC * NREC, dtype=np.uint8).tobytes()
        rr.append(radius(rb))
    cc[i] = np.corrcoef(lo, np.array(rr))[0, 1]
z = (cr_l - cc.mean()) / (cc.std() + 1e-12)
print(f"\n=== control: {TR} sweeps of uniform-random records ===")
print(f"  null corr(radius, log3 E)  {cc.mean():+.4f} +/- {cc.std():.4f}")
print(f"  seed                       {cr_l:+.4f}   z = {z:+.2f}")
print(f"\n=== verdict ===")
print(f"  radius rises with energy? {'YES' if cr_l > 0 else 'NO'}")
print(f"  beyond the null?          {'YES' if abs(z) > 3 else 'NO — this is averaging, not pumping'}")
