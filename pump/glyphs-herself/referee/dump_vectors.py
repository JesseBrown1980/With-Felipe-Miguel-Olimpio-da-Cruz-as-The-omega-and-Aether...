#!/usr/bin/env python3
"""Cold-lane referee for pump/glyphs-herself. It regenerates every file in tests/vectors from

  * the owner's own generator lines, vendored in vendor/ (sha256-pinned by UPSTREAM.sha256) and
    executed unchanged with exec() (only the leading indentation of a function body is removed),
  * full runs of the owner's two generator scripts, unchanged, in a temporary directory, and
  * an integer-only IEEE-754 oracle (exact rationals, round to nearest, ties to even),

then writes them (--write) or compares them byte for byte with the committed files (--check).
Float arithmetic happens only inside the owner's executed lines and scripts. This file computes
with integers only: it stores integer counts into the float32 cubes the owner's `cv_of` takes
(exact below 2^24), and reads float results back as IEEE bit patterns or as the owner's own
`f"{x:.6f}"` strings. Seeded inputs come from splitmix64 (integer).

Run in the owner venv (Python 3.13, numpy 2.5.4) with the OpenBLAS Haswell kernel, because
np.convolve's per-output dot product is summed by the OpenBLAS kernel selected at runtime:

    OPENBLAS_CORETYPE=Haswell python -I referee/dump_vectors.py --check <crate-dir>
"""
import hashlib
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import textwrap
from math import isqrt

import numpy as np

MODE, CRATE = sys.argv[1], os.path.abspath(sys.argv[2])
assert MODE in ("--write", "--check"), "usage: dump_vectors.py --write|--check <crate-dir>"
assert os.environ.get("OPENBLAS_CORETYPE") == "Haswell", "set OPENBLAS_CORETYPE=Haswell"
VENDOR = os.path.join(CRATE, "vendor")
VECTORS = os.path.join(CRATE, "tests", "vectors")
MYTHOS_PY = os.path.join(VENDOR, "pump_glyphs_mythos.py")
HERSELF_PY = os.path.join(VENDOR, "asolaria_herself.py")
SEED = os.path.join(VENDOR, "MYTHOS-SELF-EMISSION.txt")

# ---------------------------------------------------------------- pins
for row in open(os.path.join(CRATE, "UPSTREAM.sha256"), encoding="utf-8"):
    want, name = row.split()
    got = hashlib.sha256(open(os.path.join(CRATE, name), "rb").read()).hexdigest()
    assert got == want, f"{name}: sha256 {got} != pinned {want}"
M_SRC = open(MYTHOS_PY, encoding="utf-8").read().splitlines()
H_SRC = open(HERSELF_PY, encoding="utf-8").read().splitlines()


def lines(src, first, last):
    """Owner lines first..last (1-based, inclusive), common indentation removed."""
    return textwrap.dedent("\n".join(src[first - 1:last]))


def owner_ns(src, ranges, **env):
    ns = {"np": np, **env}
    for a, b in ranges:
        exec(lines(src, a, b), ns)
    return ns


# ---------------------------------------------------------------- splitmix64 (integer)
M64 = (1 << 64) - 1


class SplitMix64:
    def __init__(self, seed):
        self.s = seed & M64

    def next(self):
        self.s = (self.s + 0x9E3779B97F4A7C15) & M64
        z = self.s
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & M64
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & M64
        return z ^ (z >> 31)


ALPHA = b"etaoin shrdlucmfwypvbgkqjxz.,\nETAOIN0123456789"


def text(seed, length):
    r = SplitMix64(seed)
    return bytes(ALPHA[r.next() % len(ALPHA)] for _ in range(length))


def tri2(seed, length):  # sum of two 7-bit draws
    r = SplitMix64(seed)
    return bytes((r.next() % 128) + (r.next() % 128) for _ in range(length))


def tri4(seed, length):  # sum of four 6-bit draws
    r = SplitMix64(seed)
    return bytes(sum(r.next() % 64 for _ in range(4)) for _ in range(length))


def body_bin(seed, size, mode):
    r = SplitMix64(seed)
    if mode == 0:
        return bytes(r.next() & 255 for _ in range(size))
    if mode == 1:
        return bytes(min(r.next() & 255, r.next() & 255) for _ in range(size))
    if mode == 2:
        return bytes(max(r.next() & 255, r.next() & 255) for _ in range(size))
    al = [r.next() & 255 for _ in range(40)]
    return bytes(al[r.next() % 40] for _ in range(size))


def blobs(seed):  # three equal clusters per channel, 80 apart
    r = SplitMix64(seed)
    width = 1 + r.next() % 5
    shape = [1 + r.next() % 39 for _ in range(width)]
    cols = []
    for _ in range(3):
        base = r.next() % (256 - 160 - width)
        vals = []
        for b in range(3):
            for w, cnt in enumerate(shape):
                vals += [base + 80 * b + w] * cnt
        for i in range(len(vals) - 1, 0, -1):
            j = r.next() % (i + 1)
            vals[i], vals[j] = vals[j], vals[i]
        cols.append(vals)
    return bytes(x for t in zip(*cols) for x in t)


def two_level(n, b, hi):  # channel = [0]*(k+1) + [b]*mid + [hi]*m, all three channels equal
    k = ((n - 1) * 5) // 1000
    m = n - ((n - 1) * 995) // 1000
    ch = [0] * (k + 1) + [b] * (n - (k + 1) - m) + [hi] * m
    return bytes(x for v in ch for x in (v, v, v))


# ---------------------------------------------------------------- integer IEEE oracle
def enc(num, den, p, bias, ebits):
    """Round num/den > 0 to a p-bit significand, ties to even; IEEE bits (normal range)."""
    e = num.bit_length() - den.bit_length() - (p - 1)
    while True:
        n2, d2 = (num, den << e) if e >= 0 else (num << -e, den)
        q, r = divmod(n2, d2)
        if q >= 1 << p:
            e += 1
        elif q < 1 << (p - 1):
            e -= 1
        else:
            break
    if 2 * r > d2 or (2 * r == d2 and q & 1):
        q += 1
        if q == 1 << p:
            q >>= 1
            e += 1
    be = e + (p - 1) + bias
    assert 0 < be < (1 << ebits) - 1, "outside the normal range"
    return (be << (p - 1)) | (q - (1 << (p - 1)))


def r64(num, den=1):
    return 0 if num == 0 else enc(num, den, 53, 1023, 11)


def r32(num, den=1):
    return 0 if num == 0 else enc(num, den, 24, 127, 8)


def val64(bits):  # (num, den) of a non-negative normal binary64 (or zero)
    if bits == 0:
        return 0, 1
    e = ((bits >> 52) & 0x7ff) - 1075
    m = (1 << 52) | (bits & ((1 << 52) - 1))
    return (m << e, 1) if e >= 0 else (m, 1 << -e)


def val32(bits):
    if bits == 0:
        return 0, 1
    e = ((bits >> 23) & 0xff) - 150
    m = (1 << 23) | (bits & ((1 << 23) - 1))
    return (m << e, 1) if e >= 0 else (m, 1 << -e)


def rsqrt(num, den, p, rnd):
    """Round sqrt(num/den) to p bits: scale to an integer, take isqrt, settle the rest exactly."""
    k = 2 * p + 4 + den.bit_length() - num.bit_length()
    k += k & 1
    s = (num << k) // den if k >= 0 else num // (den << -k)
    exact = (num << k) == s * den if k >= 0 else num == s * (den << -k)
    q = isqrt(s)
    # sqrt(num/den) = sqrt(s + f) / 2^(k/2) with f in [0,1); q = floor of it; inexact adds a tie-breaker
    inexact = q * q != s or not exact
    m, sh = 4 * q + (2 if inexact else 0), k // 2 + 2
    return rnd(m << -sh, 1) if sh < 0 else rnd(m, 1 << sh)


def rne_int(n, d):  # round-half-even of n/d to an integer
    q, r = divmod(n, d)
    return q + (1 if 2 * r > d or (2 * r == d and q & 1) else 0)


def f32int(v):  # nearest binary32 value of a non-negative integer, as an integer
    if v == 0:
        return 0
    n, d = val32(r32(v))
    return n // d


def rand64(r, lo, hi):
    e = lo + r.next() % (hi - lo)
    return ((e + 1023) << 52) | (r.next() & ((1 << 52) - 1)), e


def rand32(r, lo, hi):
    e = lo + r.next() % (hi - lo)
    return ((e + 127) << 23) | (r.next() & ((1 << 23) - 1)), e


GRID_OPS = ["add", "sub", "mul", "div", "sqrt", "fma", "to_f32_bits", "round_f32", "dec6", "ratio",
            "add32", "absdiff32", "mul32", "div32", "sqrt32", "round_f32_int", "int_to_f32_bits"]
GRID_CASES = 1024


def grid_case(op, r):
    """Operands drawn from r (the same draws the Rust test makes) and the oracle result."""
    if op in ("add", "sub"):
        a, ea = rand64(r, -60, 60)
        eb = ea - r.next() % 141
        b = ((eb + 1023) << 52) | (r.next() & ((1 << 52) - 1))
        if op == "sub" and b > a:
            a, b = b, a
        (na, da), (nb, db) = val64(a), val64(b)
        return r64(na * db + nb * da if op == "add" else na * db - nb * da, da * db)
    if op in ("mul", "div"):
        (a, _), (b, _) = rand64(r, -200, 200), rand64(r, -200, 200)
        (na, da), (nb, db) = val64(a), val64(b)
        return r64(na * nb, da * db) if op == "mul" else r64(na * db, da * nb)
    if op == "sqrt":
        a, _ = rand64(r, -200, 200)
        return rsqrt(*val64(a), 53, r64)
    if op == "fma":
        (a, ea), (b, eb) = rand64(r, -60, 60), rand64(r, -60, 60)
        ec = ea + eb + r.next() % 241 - 120
        c = ((ec + 1023) << 52) | (r.next() & ((1 << 52) - 1))
        if r.next() % 8 == 0:
            c = 0
        (na, da), (nb, db), (nc, dc) = val64(a), val64(b), val64(c)
        return r64(na * nb * dc + nc * da * db, da * db * dc)
    if op in ("to_f32_bits", "round_f32"):
        a, _ = rand64(r, -120, 120)
        b32 = r32(*val64(a))
        return b32 if op == "to_f32_bits" else r64(*val32(b32))
    if op == "dec6":
        a, _ = rand64(r, -30, 30)
        n, d = val64(a)
        return rne_int(n * 10 ** 6, d)
    if op == "ratio":
        num = (r.next() >> (r.next() % 64)) or 1
        den = (r.next() >> (r.next() % 64)) | 1
        return r64(num, den)
    if op in ("add32", "absdiff32"):
        a, ea = rand32(r, -40, 40)
        eb = ea - r.next() % 40
        b = ((eb + 127) << 23) | (r.next() & ((1 << 23) - 1))
        (na, da), (nb, db) = val32(a), val32(b)
        return r32(na * db + nb * da if op == "add32" else abs(na * db - nb * da), da * db)
    if op in ("mul32", "div32"):
        (a, _), (b, _) = rand32(r, -60, 60), rand32(r, -60, 60)
        (na, da), (nb, db) = val32(a), val32(b)
        return r32(na * nb, da * db) if op == "mul32" else r32(na * db, da * nb)
    if op == "sqrt32":
        a, _ = rand32(r, -120, 120)
        return rsqrt(*val32(a), 24, r32)
    if op == "round_f32_int":
        return f32int(r.next() >> (r.next() % 64))
    if op == "int_to_f32_bits":
        return r32(f32int(r.next() >> (r.next() % 64)))
    raise ValueError(op)


def softfloat_grid():
    out = bytearray()
    for i, op in enumerate(GRID_OPS):
        r = SplitMix64(0x5EED0000 + i)
        for _ in range(GRID_CASES):
            out += struct.pack("<Q", grid_case(op, r))
    return bytes(out)


# ---------------------------------------------------------------- owner geometry and cv_of
H_CV = owner_ns(H_SRC, [(35, 35), (103, 110), (113, 122)])
M_CV = owner_ns(M_SRC, [(58, 58), (120, 127), (130, 139)])


def geometry_check():
    """The port's integer binning: isqrt(dx^2+dy^2+dz^2) equals the owner's float32 RR binning
    (RI, every MASKS band) and its 27-direction KEY, voxel by voxel (integer comparison)."""
    g = np.arange(64) - 32
    s = (g[:, None, None] ** 2 + g[None, :, None] ** 2 + g[None, None, :] ** 2).ravel().tolist()
    radial = [isqrt(x) for x in s]
    ri = H_CV["RI"].ravel().tolist()
    assert ri == [min(x, 63) for x in radial], "RI != isqrt"
    for r, m in zip(range(2, 30), H_CV["MASKS"]):
        assert m.ravel().tolist() == [x == r for x in radial], f"MASKS[{r}] != isqrt band"
    sg = [(x > 0) - (x < 0) + 1 for x in range(-32, 32)]
    key = [sg[i] * 9 + sg[j] * 3 + sg[k] for i in range(64) for j in range(64) for k in range(64)]
    assert H_CV["KEY3"].ravel().tolist() == key and M_CV["KEY"].ravel().tolist() == key, "KEY"
    assert M_CV["RI"].ravel().tolist() == ri, "MYTHOS RI"


CV_CASES = [(seed, nnz, maxval) for seed in (1, 2)
            for nnz in (50, 300, 2000, 20000) for maxval in (2, 3, 7, 100, 5000, 1 << 24)]


def cv_cases():
    rows = []
    for seed, nnz, maxval in CV_CASES:
        r = SplitMix64(seed * 1_000_003 + nnz * 7 + maxval)
        flat = np.zeros(64 * 64 * 64, np.float32)
        for _ in range(nnz):
            idx = r.next() % (64 * 64 * 64)
            flat[idx] = 2 + r.next() % (maxval - 1)
        c = flat.reshape(64, 64, 64)
        cv_h, cv_m = H_CV["cv_of"](c), M_CV["cv_of"](c)
        # the float32 bit patterns (NaN is 7fc00000) and the owner's KV formatting
        bits = np.float32(cv_h).tobytes()[::-1].hex()
        assert np.float32(cv_m).tobytes()[::-1].hex() == bits, "the two owner cv_of copies differ"
        six = f"{cv_h:.6f}"
        if six == "nan":
            bits = "nan"
        csum = c.sum().tobytes()[::-1].hex()
        rows.append(f"CVCASE|seed={seed}|nnz={nnz}|maxval={maxval}|cv_bits={bits}|cv6={six}"
                    f"|csum_bits={csum}")
    head = f"HBPv1|PGH-CV-FLOAT32|rows={len(rows)}|source=asolaria_herself.py:113-122+pump_glyphs_mythos.py:130-139"
    return ("\n".join([head] + rows) + "\n").encode()


# ---------------------------------------------------------------- the four colours
M_COL = owner_ns(M_SRC, [(74, 104)])
FNS = [M_COL["L_p"], M_COL["L_r"], M_COL["L_g"], M_COL["L_d"]]
HS_BODY = lines(M_SRC, 99, 102)  # h = ...; k = ...; k /= k.sum(); hs = np.convolve(...)


def channels(seed_bytes):
    raw = np.frombuffer(seed_bytes, dtype=np.uint8)
    n = len(raw) // 3
    tri = raw[:n * 3].reshape(n, 3)
    return [tri[:, c] for c in range(3)]


def luts(seed_bytes):
    return b"".join(f(ch).tobytes() for ch in channels(seed_bytes) for f in FNS)


def hs_bits(seed_bytes):
    out = b""
    for ch in channels(seed_bytes):
        ns = {"np": np, "v": ch}
        exec(HS_BODY, ns)
        out += ns["hs"].tobytes()
    return out


def kernel():
    ns = {"np": np}
    exec(lines(M_SRC, 100, 101), ns)
    return ns["k"].tobytes()


LP_CASES = [(116, 17, 85), (120, 15, 51), (120, 15, 102), (129, 17, 17), (129, 17, 170), (137, 7, 17)]
BLOB_CASES = [20, 74, 170, 195, 246, 682]


def lut_cases():
    out = bytearray()
    seeds = [two_level(*c) for c in LP_CASES] + [blobs(s) for s in BLOB_CASES]
    for sb in seeds:
        out += struct.pack("<I", len(sb)) + sb + luts(sb) + hashlib.sha256(hs_bits(sb)).digest()
    return bytes(out)


# ---------------------------------------------------------------- full generator runs
def run_owner(script, cwd):
    os.makedirs(os.path.join(cwd, "script"), exist_ok=True)
    shutil.copy(script, os.path.join(cwd, "script"))
    p = subprocess.run([sys.executable, "-I", os.path.join("script", os.path.basename(script))],
                       cwd=cwd, capture_output=True, text=True)
    return p.stdout + p.stderr


HERSELF_CASES = {
    "const": lambda: {"key/a.bin": b"A" * 3000},
    "text": lambda: {"key/a.txt": text(101, 40000)},
    "bin202": lambda: {"key/a.bin": body_bin(202, 250000, 2)},
    "bin217": lambda: {"key/a.bin": body_bin(217, 250000, 1)},
    "hidden": lambda: {"key/a.txt": text(102, 60000), "books/.notes.md": text(103, 3000),
                       "books/.drafts/x.md": text(104, 2000), "books/b.md": text(105, 5000)},
    "sat24": lambda: {"key/a.bin": body_bin(106, 900000, 0) + bytes([120, 120, 140]) * 16_777_300},
}


def herself_cases():
    rows = []
    for name, files in HERSELF_CASES.items():
        tmp = tempfile.mkdtemp(prefix="pgh-herself-")
        try:
            repo = os.path.join(tmp, "D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR")
            for rel, data in files().items():
                os.makedirs(os.path.dirname(os.path.join(repo, rel)), exist_ok=True)
                open(os.path.join(repo, rel), "wb").write(data)
            log = run_owner(HERSELF_PY, tmp)
            gp = os.path.join(repo, "gguf", "asolaria", "ASOLARIA-HERSELF.gguf")
            assert os.path.exists(gp), f"herself {name}: no GGUF\n{log[-400:]}"
            blob = open(gp, "rb").read()
            rows.append(f"HERSELFCASE|k={name}|gguf_bytes={len(blob)}"
                        f"|sha256={hashlib.sha256(blob).hexdigest()}")
        finally:
            shutil.rmtree(tmp)
    head = f"HBPv1|PGH-HERSELF-CASES|rows={len(rows)}|source=asolaria_herself.py:1-235 run unchanged"
    return ("\n".join([head] + rows) + "\n").encode()


MYTHOS_CASES = [("pinned", "seed", 0, 0), ("tri2-6-19500", "tri2", 6, 19500),
                ("tri2-3-22290", "tri2", 3, 22290), ("tri4-1-60000", "tri4", 1, 60000),
                ("tri2-3-30000", "tri2", 3, 30000)]


def gguf_head_and_features(path):
    """Integer struct parsing of the owner's GGUF: the head up to the 32-aligned data start, and
    the glyph_features tensor bytes."""
    with open(path, "rb") as f:
        b = f.read(4 << 20)
        _, _, nt, nkv = struct.unpack_from("<IIQQ", b, 0)
        o = 24

        def s():
            nonlocal o
            (n,) = struct.unpack_from("<Q", b, o)
            o += 8 + n
            return b[o - n:o]
        for _ in range(nkv):
            s()
            (t,) = struct.unpack_from("<I", b, o)
            o += 4
            if t == 8:
                s()
            else:
                o += 4
        info = {}
        for _ in range(nt):
            name = s().decode()
            (nd,) = struct.unpack_from("<I", b, o)
            dims = struct.unpack_from("<" + "Q" * nd, b, o + 4)
            o += 4 + 8 * nd
            (_, off) = struct.unpack_from("<IQ", b, o)
            o += 12
            info[name] = (dims, off)
        base = o + ((-o) % 32)
        dims, off = info["glyph_features"]
        f.seek(base + off)
        feats = f.read(dims[0] * dims[1] * 4)
        return b[:base], feats, nt


def mythos_cases():
    rows = []
    for name, fam, seed, length in MYTHOS_CASES:
        sb = open(SEED, "rb").read() if fam == "seed" else (tri2 if fam == "tri2" else tri4)(seed, length)
        tmp = tempfile.mkdtemp(prefix="pgh-mythos-")
        try:
            big = os.path.join(tmp, "D:/asolaria-absorb/kernel-pump")
            os.makedirs(big)
            open(os.path.join(big, "MYTHOS-SELF-EMISSION.txt"), "wb").write(sb)
            log = run_owner(MYTHOS_PY, tmp)
            gp = os.path.join(big, "ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf")
            assert os.path.exists(gp), f"mythos {name}: no GGUF\n{log[-400:]}"
            head, feats, nt = gguf_head_and_features(gp)
            h = hashlib.sha256()
            with open(gp, "rb") as f:
                for chunk in iter(lambda: f.read(8 << 20), b""):
                    h.update(chunk)
            rows.append(f"MYTHOSCASE|k={name}|family={fam}|seed={seed}|len={length}"
                        f"|gguf_bytes={os.path.getsize(gp)}|tensors={nt}|feature_rows={len(feats) // 24}"
                        f"|gguf_sha256={h.hexdigest()}|head_sha256={hashlib.sha256(head).hexdigest()}"
                        f"|features_sha256={hashlib.sha256(feats).hexdigest()}")
        finally:
            shutil.rmtree(tmp)
    head = f"HBPv1|PGH-MYTHOS-CASES|rows={len(rows)}|source=pump_glyphs_mythos.py:1-352 run unchanged"
    return ("\n".join([head] + rows) + "\n").encode()


# ---------------------------------------------------------------- write / check
geometry_check()
print("geometry: isqrt binning == owner RI/MASKS, KEY == owner KEY (262,144 voxels)", flush=True)
BUILDERS = [
    ("mythos_kernel_f64.bin", kernel),
    ("mythos_luts_u8.bin", lambda: luts(open(SEED, "rb").read())),
    ("lut_cases.bin", lut_cases),
    ("softfloat_grid.bin", softfloat_grid),
    ("cv_cases.hbp", cv_cases),
    ("herself_cases.hbp", herself_cases),
    ("mythos_cases.hbp", mythos_cases),
]
os.makedirs(VECTORS, exist_ok=True)
bad = 0
for name, build in BUILDERS:
    data = build()
    path = os.path.join(VECTORS, name)
    if MODE == "--write":
        open(path, "wb").write(data)
        print(f"wrote {name} {len(data)} B sha256 {hashlib.sha256(data).hexdigest()}", flush=True)
    else:
        have = open(path, "rb").read() if os.path.exists(path) else None
        ok = have == data
        bad += not ok
        print(f"{'OK  ' if ok else 'DIFF'} {name} {len(data)} B sha256 {hashlib.sha256(data).hexdigest()}",
              flush=True)
sys.exit(1 if bad else 0)
