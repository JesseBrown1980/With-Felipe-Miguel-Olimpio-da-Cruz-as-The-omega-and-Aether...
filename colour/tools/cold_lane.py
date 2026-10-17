#!/usr/bin/env python3
"""Cold-lane numpy checks for colour/ (verification only; needs numpy, run with -I).

  python -I tools/cold_lane.py regenerate <workdir>
      Runs the vendored upstream generators unmodified with cwd=<workdir> (their hard-coded
      "D:/..." paths resolve relative to it): stars_shells.py, divide_kimi_k3.py and
      pump_glyphs_mythos.py. Checks every output against the sha256 upstream recorded, checks the
      81 glyph cubes without D against tests/fixtures/flashlight.hbp, deletes the large outputs.
      <workdir> must not exist or be an empty directory; anything else is refused (exit 1).

  python -I tools/cold_lane.py parity
      Executes the upstream flashlight function lines verbatim under numpy
      (pump_glyphs_mythos.py:74-104, asolaria_herself.py:56-83) on the referee's inputs and
      compares percentiles, P/R/G tables, bijections and RPR with tests/fixtures/flashlight.hbp;
      checks the D bijection is the identity; measures numpy's exp and np.convolve against plain
      sequential binary64 arithmetic; checks the np.histogram bin rule used by the stars port.
"""
import hashlib
import importlib.util
import math
import os
import shutil
import struct
import subprocess
import sys

sys.dont_write_bytecode = True  # keep vendor/ and referee/ free of bytecode caches
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
USIM = ROOT / "vendor" / "universe-simulator"
FIX = ROOT / "tests" / "fixtures"
SEAT = "D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
BIG = "D:/asolaria-absorb/kernel-pump"
REPO = "D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR"

# Recorded upstream: receipts/FABLE5-STARS-SHELLS.hbp:12, FABLE5-KIMI-K3-STAR.hbp:11,
# FABLE5-DELETE-AND-REGENERATE.hbp:5 (sha_after of the glyph GGUF).
STARS_SHA = "ae23392ad473718e2196e525a4355af20cdbd57bbb5dc3e85a8719b62552784d"
KIMI_SHA = "56d08746a77efd9ea30345ada15bab3fc2c36e09647d1e77156a96b9a4b83a18"
GLYPHS_SHA = "f29d4b9427252b17cc6151cd5f5627d080b5a021f009e46125cef5479db0d299"

failures = []


def check(ok, what):
    print(f"{'OK  ' if ok else 'FAIL'} {what}")
    if not ok:
        failures.append(what)


def sha_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 22), b""):
            h.update(chunk)
    return h.hexdigest()


def run(script, work):
    proc = subprocess.run([sys.executable, "-I", str(script)], cwd=work,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return proc.returncode, proc.stderr.decode("utf-8", "replace").strip().splitlines()


def gguf_tensors(path):
    """name -> (absolute offset, dims, type) for a GGUF v3 file with u32/string metadata."""
    with open(path, "rb") as f:
        head = f.read(1 << 20)
    at = 0

    def take(fmt):
        nonlocal at
        v = struct.unpack_from(fmt, head, at)
        at += struct.calcsize(fmt)
        return v

    def string():
        nonlocal at
        (n,) = take("<Q")
        s = head[at:at + n].decode()
        at += n
        return s

    magic, version, nt, nkv = take("<IIQQ")
    assert magic == 0x46554747 and version == 3
    for _ in range(nkv):
        string()
        (t,) = take("<I")
        if t == 8:
            string()
        elif t == 4:
            take("<I")
        else:
            raise ValueError(t)
    infos = []
    for _ in range(nt):
        name = string()
        (nd,) = take("<I")
        dims = take("<" + "Q" * nd)
        ty, off = take("<IQ")
        infos.append((name, off, dims, ty))
    start = at + (-at) % 32
    return {n: (start + off, dims, ty) for n, off, dims, ty in infos}


def regenerate(work):
    work = Path(work)
    if work.exists() and (not work.is_dir() or any(work.iterdir())):
        sys.exit(f"cold_lane.py: {work} exists and is not an empty directory; give a new path")
    for d in (BIG, SEAT, REPO):
        (work / d).mkdir(parents=True)
    shutil.copy(USIM / "gguf/stars/MYTHOS-SELF-EMISSION.txt", work / BIG)
    shutil.copy(USIM / "measurements/KIMI-K3-STAR.txt", work / BIG)

    rc, err = run(USIM / "measurements/stars_shells.py", work)
    check(rc == 0, f"stars_shells.py exit {rc}")
    g = work / BIG / "ASOLARIA-STARS-SHELLS.gguf"
    check(sha_file(g) == STARS_SHA, f"ASOLARIA-STARS-SHELLS.gguf sha256 {sha_file(g)[:16]}")
    check((work / SEAT / "FABLE5-STARS-SHELLS.hbp").read_bytes()
          == (USIM / "receipts/FABLE5-STARS-SHELLS.hbp").read_bytes(),
          "FABLE5-STARS-SHELLS.hbp byte-identical")

    rc, err = run(USIM / "measurements/divide_kimi_k3.py", work)
    check(rc == 0, f"divide_kimi_k3.py exit {rc}")
    g = work / REPO / "gguf/stars/KIMI-K3-STAR-256.gguf"
    check(sha_file(g) == KIMI_SHA, f"KIMI-K3-STAR-256.gguf ({g.stat().st_size} B) sha256 "
          f"{sha_file(g)[:16]}")
    g.unlink()
    check((work / SEAT / "FABLE5-KIMI-K3-STAR.hbp").read_bytes()
          == (USIM / "receipts/FABLE5-KIMI-K3-STAR.hbp").read_bytes(),
          "FABLE5-KIMI-K3-STAR.hbp byte-identical")

    rc, err = run(USIM / "measurements/pump_glyphs_mythos.py", work)
    # Upstream behaviour: line 366 reads `inner`, which :227-252 assign only when at least 8
    # glyphs are measurable; on this seed none is, so the run ends there after the GGUF is written.
    print(f"     pump_glyphs_mythos.py exit {rc}; last stderr line: {err[-1] if err else ''}")
    g = work / BIG / "ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf"
    check(sha_file(g) == GLYPHS_SHA, f"ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf ({g.stat().st_size} B) "
          f"sha256 {sha_file(g)[:16]}")
    tensors = gguf_tensors(g)
    want = {r.split("|")[1][2:]: r.split("|")[4][7:]
            for r in (FIX / "flashlight.hbp").read_text().splitlines() if r.startswith("GLYPH|")}
    same = 0
    with open(g, "rb") as f:
        for w, digest in want.items():
            off, dims, ty = tensors[f"glyph_{w}"]
            f.seek(off)
            same += hashlib.sha256(f.read(4 * 64 ** 3)).hexdigest() == digest
    check(same == len(want) == 81, f"{same}/81 glyph cubes without D equal the Rust/referee cubes")
    g.unlink()
    for p in (work / BIG).glob("*.sha256"):
        p.unlink()


def upstream_functions(path, first, last):
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)[first - 1:last]
    ns = {"np": np}
    exec(compile("".join(lines), f"{path.name}:{first}-{last}", "exec"), ns)
    return ns


def parity():
    print(f"     numpy {np.__version__}")
    pump = upstream_functions(USIM / "measurements/pump_glyphs_mythos.py", 74, 104)
    herself = upstream_functions(USIM / "measurements/asolaria_herself.py", 56, 83)
    spec = importlib.util.spec_from_file_location("colour_referee", ROOT / "referee/colour_referee.py")
    referee = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(referee)
    rows = (FIX / "flashlight.hbp").read_text().splitlines()
    bits = lambda x: f"{struct.unpack('<Q', struct.pack('<d', float(x)))[0]:016x}"
    identity = bytes(range(256)).hex()
    n_inputs = 0
    for name, v in referee.flash_inputs():
        a = np.array(v, dtype=np.uint8)
        i = rows.index(next(r for r in rows if r.startswith(f"INPUT|k={name}|")))
        pct = f"PCT|lo={bits(np.percentile(a, .5))}|hi={bits(np.percentile(a, 99.5))}|json=0"
        L = {k: pump[f"L_{k.lower()}"](a) for k in "PRG"}
        rpr = L["R"][L["P"][L["R"][np.arange(256)]]]
        lut = (f"LUT|P={L['P'].tobytes().hex()}|R={L['R'].tobytes().hex()}|G={L['G'].tobytes().hex()}"
               f"|RPR={rpr.tobytes().hex()}|json=0")
        P = {k: herself["as_perm"](herself[f"L_{k.lower()}"](a)) for k in "PRGD"}
        prpr = P["R"][P["P"][P["R"][np.arange(256, dtype=np.uint8)]]]
        perm = (f"PERM|P={P['P'].tobytes().hex()}|R={P['R'].tobytes().hex()}|G={P['G'].tobytes().hex()}"
                f"|RPR={prpr.tobytes().hex()}|json=0")
        ok = rows[i + 1] == pct and rows[i + 2] == lut and rows[i + 3] == perm
        check(ok, f"{name}: numpy percentile bits, P/R/G tables, bijections and RPR equal the fixture")
        check(P["D"].tobytes().hex() == identity, f"{name}: numpy as_perm(L_d) is the identity")
        n_inputs += 1
    # D table: numpy exp and np.convolve against plain sequential binary64 arithmetic.
    x = np.arange(-32, 33) / 12.0
    e_np = np.exp(-0.5 * x ** 2)
    e_libm = np.array([math.exp(t) for t in (-0.5 * x ** 2)])
    print(f"     D: numpy exp differs from libm exp on {int((e_np != e_libm).sum())} of 65 kernel "
          f"arguments")
    k = e_np / e_np.sum()
    seed = (USIM / "gguf/stars/MYTHOS-SELF-EMISSION.txt").read_bytes()
    t = np.frombuffer(seed, np.uint8)[:len(seed) // 3 * 3].reshape(-1, 3)
    for c in range(3):
        h = np.bincount(t[:, c], minlength=256).astype(float)
        hs = np.convolve(h, k, mode="same")
        seq = []
        for i in range(256):
            acc = 0.0
            for j in range(65):
                if 0 <= i + j - 32 < 256:
                    acc += h[i + j - 32] * k[::-1][j]
            seq.append(acc)
        lut_np = pump["L_d"](t[:, c])
        cs = np.cumsum(np.array(seq)) - .5 * np.array(seq)
        lut_seq = np.clip(cs / max(cs[-1], 1e-9) * 255, 0, 255).astype(np.uint8)
        print(f"     D: seed channel {c}: np.convolve differs from a sequential sum at "
              f"{int((hs != np.array(seq)).sum())} of 256 positions; uint8 table equal: "
              f"{bool((lut_np == lut_seq).all())}")
    # stars_shells.py:159-160 histogram bins and volumes, against the integer rule of the port.
    edges = np.linspace(0, 56, 17)
    bad = 0
    for s in range(3 * 32 * 32 + 1):
        hist, _ = np.histogram(np.sqrt(np.array([s], dtype=np.int64)), bins=16, range=(0, 56))
        rule = sum(1 for kk in range(1, 16) if 49 * kk * kk <= 4 * s)
        bad += int(np.argmax(hist)) != rule
    check(bad == 0, "np.histogram bin of sqrt(s) == #{k in 1..15 : 49k^2 <= 4s} for s in 0..3072")
    vol = edges[1:] ** 3 - edges[:-1] ** 3
    check(all(vol[kk] * 8 == 343 * (3 * kk * kk + 3 * kk + 1) for kk in range(16)),
          "edges[1:]**3 - edges[:-1]**3 == 42.875 (3k^2+3k+1) exactly")
    print(f"     inputs compared: {n_inputs}")


def main(argv):
    if len(argv) == 2 and argv[0] == "regenerate":
        regenerate(argv[1])
    elif argv == ["parity"]:
        parity()
    else:
        print(__doc__)
        return 2
    print("FAILED: " + "; ".join(failures) if failures else "ALL OK")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
