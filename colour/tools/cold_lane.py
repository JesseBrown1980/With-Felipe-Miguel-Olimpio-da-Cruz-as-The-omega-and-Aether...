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
      checks the D bijection is the identity; counts where numpy's exp and np.convolve in the D
      lines (pump_glyphs_mythos.py:99-102, run verbatim) differ from the correctly rounded exp
      and from a sequential binary64 sum, both computed in integers; checks the np.histogram bin
      rule and volumes of stars_shells.py:158-160 (run verbatim) against the integer rule.

  python -I tools/cold_lane.py others <USIM clone at 3f9f42d>
      The same flashlight lines in four generators that are not vendored here
      (emit_full_ggufs.py:39-54, pump_mythos_sphere.py:78-93, pump_unlimited.py:100-128,
      mythos_pump_full.py:85-108; git blob ids checked), run verbatim on 800 arrays (8 named
      distributions x 100, n = 1..5000, bytes from SHA-256), against the vendored
      pump_glyphs_mythos.py / asolaria_herself.py lines and the referee's integer lane.

Float runs only inside numpy and the owner's code: the generators, the upstream lines executed
verbatim, and np.exp's argument expression read from pump_glyphs_mythos.py:100. This file reads
their float64 results by bit pattern and computes its comparisons in integers (the referee's
binary64 emulation, and an integer series for exp).
"""
import hashlib
import importlib.util
import os
import shutil
import struct
import subprocess
import sys

sys.dont_write_bytecode = True  # keep vendor/ and referee/ free of bytecode caches
from fractions import Fraction
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


def upstream_lines(path, first, last):
    return path.read_text(encoding="utf-8").splitlines(keepends=True)[first - 1:last]


def upstream_functions(path, first, last):
    ns = {"np": np}
    exec(compile("".join(upstream_lines(path, first, last)), f"{path.name}:{first}-{last}",
                 "exec"), ns)
    return ns


def upstream_body(path, first, last, params, result):
    """Lines first..last, verbatim, as the body of `def body(params): ... return result` (the
    lines sit one level deep upstream, inside a function or a loop)."""
    lines = upstream_lines(path, first, last)
    assert all(x.startswith("    ") or not x.strip() for x in lines)
    src = f"def body({params}):\n" + "".join(lines) + f"    return {result}\n"
    ns = {"np": np}
    exec(compile(src, f"{path.name}:{first}-{last}", "exec"), ns)
    return ns["body"]


def u64(a):
    """The bit patterns of a float64 array, as Python integers."""
    return [int(x) for x in np.ascontiguousarray(a, dtype=np.float64).view(np.uint64)]


def exp_bits(t, B):
    """binary64 bits of the correctly rounded exp(t) for a binary64 t in [-4, 0]: the Taylor series
    in fixed point with 2**-400 units and a running error bound; the result is returned only when
    both ends of the bound round to the same binary64."""
    m, e = t
    if m == 0:
        return B.b_bits(B.ONE)
    assert m < 0 and e < 0 and -m <= 4 << -e
    P = 400
    term, total, n, term_err, err = 1 << P, 1 << P, 0, 0, 0
    while term:
        n += 1
        den = n << -e
        term = term * -m // den                          # |t|^n / n!, truncated
        term_err = 1 + -(-term_err * -m // den)          # its error, in units, rounded up
        total += -term if n & 1 else term
        err += term_err
    err += 2 * (1 + term_err)                            # the terms after the last non-zero one
    lo, hi = B.ratio(total - err, 1 << P), B.ratio(total + err, 1 << P)
    assert lo == hi, "precision too low for this argument"
    return B.b_bits(lo)


def parity():
    print(f"     numpy {np.__version__}")
    pump = upstream_functions(USIM / "measurements/pump_glyphs_mythos.py", 74, 104)
    herself = upstream_functions(USIM / "measurements/asolaria_herself.py", 56, 83)
    pct_of = upstream_body(USIM / "measurements/pump_glyphs_mythos.py", 75, 75, "v", "lo, hi")
    spec = importlib.util.spec_from_file_location("colour_referee", ROOT / "referee/colour_referee.py")
    referee = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(referee)
    B = referee
    rows = (FIX / "flashlight.hbp").read_text().splitlines()
    bits = lambda x: f"{u64(np.float64(x))[0]:016x}"
    identity = bytes(range(256)).hex()
    n_inputs = 0
    for name, v in referee.flash_inputs():
        a = np.array(v, dtype=np.uint8)
        i = rows.index(next(r for r in rows if r.startswith(f"INPUT|k={name}|")))
        lo, hi = pct_of(a)
        pct = f"PCT|lo={bits(lo)}|hi={bits(hi)}|json=0"
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
    # D table (pump_glyphs_mythos.py:99-102, verbatim): numpy's exp and np.convolve, read by bit
    # pattern, against the correctly rounded exp and a sequential binary64 sum, both in integers.
    src = USIM / "measurements/pump_glyphs_mythos.py"
    line = upstream_lines(src, 100, 100)[0]
    arg_text = line[line.index("np.exp(") + 7:line.rindex(")")]
    arg_np = u64(eval(compile(arg_text, f"{src.name}:100 (np.exp argument)", "eval"), {"np": np}))
    arg = [B.b_from_bits(u) for u in arg_np]             # j = 0 gives -0.0, read as zero
    half = B.b_dec(-5, 1)
    want = [B.b_mul(half, B.b_mul(x, x)) for x in (B.ratio(j, 12) for j in range(-32, 33))]
    check(arg == want, "np.exp's 65 arguments on :100 == -0.5 * (j/12)^2 in binary64, j = -32..32")
    e_np = u64(upstream_body(src, 100, 100, "", "k")())
    print(f"     D: numpy exp differs from the correctly rounded exp on "
          f"{sum(1 for x, u in zip(arg, e_np) if exp_bits(x, B) != u)} of 65 kernel arguments")
    d_lines = upstream_body(src, 99, 102, "v", "h, k, hs")
    seed = (USIM / "gguf/stars/MYTHOS-SELF-EMISSION.txt").read_bytes()
    t = np.frombuffer(seed, np.uint8)[:len(seed) // 3 * 3].reshape(-1, 3)
    for c in range(3):
        h, k, hs = (list(map(B.b_from_bits, u64(x))) for x in d_lines(t[:, c]))
        krev = k[::-1]
        seq = []
        for i in range(256):
            acc = B.ZERO
            for j in range(65):
                if 0 <= i + j - 32 < 256:
                    acc = B.b_add(acc, B.b_mul(h[i + j - 32], krev[j]))
            seq.append(acc)
        lut_np = pump["L_d"](t[:, c])
        cum, cs = B.ZERO, []                             # np.cumsum(seq) - .5 * seq
        for x in seq:
            cum = B.b_add(cum, x)
            cs.append(B.b_sub(cum, B.b_mul(B.b_dec(5, 1), x)))
        den = B.b_pymax(cs[-1], B.b_dec(1, 9))
        lut_seq = bytes(B.clip_u8(B.b_mul(B.b_div(x, den), B.C255)) for x in cs)
        print(f"     D: seed channel {c}: np.convolve differs from a sequential sum at "
              f"{sum(1 for x, y in zip(hs, seq) if x != y)} of 256 positions; uint8 table equal: "
              f"{lut_np.tobytes() == lut_seq}")
    # stars_shells.py:158-160 verbatim (cen from :149) on one point of the 64-cube for each
    # reachable squared radius s, against the integer rule of the port; the volumes by bits.
    stars = USIM / "measurements/stars_shells.py"
    cen = upstream_functions(stars, 149, 149)["cen"]
    ring_lines = upstream_body(stars, 158, 160, "P, cen", "hist_, edges, vol")
    point = {}
    for p in ((x, y, z) for x in range(64) for y in range(64) for z in range(64)):
        point.setdefault(sum((q - 32) ** 2 for q in p), p)
    bad = 0
    for s, p in sorted(point.items()):
        hist_, edges, vol = ring_lines(np.array([p], dtype=np.int64), cen)
        bad += int(np.argmax(hist_)) != referee.ring_bin(s)
    check(bad == 0, f"np.histogram bin of :158-159 == #{{k in 1..15 : 49k^2 <= 4s}} on "
          f"{len(point)} squared radii (all reachable in the 64-cube, max {max(point)})")
    exact = [B.b_frac(B.b_from_bits(u)) for u in u64(edges)], [B.b_frac(B.b_from_bits(u)) * 8
                                                                for u in u64(vol)]
    check(exact == ([Fraction(7 * k, 2) for k in range(17)],
                    [343 * (3 * k * k + 3 * k + 1) for k in range(16)]),
          ":159 edges == 7k/2 and :160 vol == 343 (3k^2+3k+1) / 8, exactly, by bit pattern")
    print(f"     inputs compared: {n_inputs}")


# The flashlight lines of four more USIM generators at 3f9f42d: path -> (git blob id, lines).
OTHERS = {
    "measurements/emit_full_ggufs.py": ("d40a102d49542f422e5e0afafbaf37f9fdb2dc3a", 39, 54),
    "measurements/pump_mythos_sphere.py": ("86d843f004ddd40e78b207e8f2dcfd28fb7bf604", 78, 93),
    "measurements/pump_unlimited.py": ("79469f4f7c9cccd888d488e0c89754d333b25959", 100, 128),
    "measurements/mythos_pump_full.py": ("a721c67ebd86467bfb52e05dd2a7ef5b36d8e48c", 85, 108),
}
DISTRIBUTIONS = ("uniform", "constant", "two-values", "band-8", "triangle", "low-skew", "ramp",
                 "spikes")


def other_arrays():
    """100 arrays of each distribution. Array i has n = 1 (i = 0), 5000 (i = 1), else 1 plus the
    first 4 bytes of head = sha256(name|i) mod 5000; u, v, w are the bytes of sha256(head|j),
    j = 0, 1, ..., taken in turn."""
    for name in DISTRIBUTIONS:
        for i in range(100):
            head = hashlib.sha256(f"asolaria-colour-others|{name}|{i}".encode()).digest()
            n = 1 if i == 0 else 5000 if i == 1 else 1 + int.from_bytes(head[:4], "little") % 5000
            raw = b"".join(hashlib.sha256(head + struct.pack("<I", j)).digest()
                           for j in range((3 * n + 31) // 32))
            u, v, w = raw[0:3 * n:3], raw[1:3 * n:3], raw[2:3 * n:3]
            a0, a1 = head[4], head[5]
            if name == "uniform":
                x = list(u)
            elif name == "constant":
                x = [a0] * n
            elif name == "two-values":
                x = [a0 if b < 128 else a1 for b in u]
            elif name == "band-8":
                x = [(a0 + b % 8) % 256 for b in u]
            elif name == "triangle":
                x = [(b + c) // 2 for b, c in zip(u, v)]
            elif name == "low-skew":
                x = [min(t) for t in zip(u, v, w)]
            elif name == "ramp":
                x = [(a0 + k * (1 + a1 % 7)) % 256 for k in range(n)]
            else:
                x = [255 if b < 8 else c % 4 for b, c in zip(u, v)]
            yield f"{name}-{i}", x


def others(clone):
    clone = Path(clone)
    print(f"     numpy {np.__version__}")
    for rel, (blob, _, _) in OTHERS.items():
        data = (clone / rel).read_bytes()
        got = hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()
        check(got == blob, f"{rel} git blob {got[:12]} (3f9f42d: {blob[:12]})")
    if failures:
        return
    spec = importlib.util.spec_from_file_location("colour_referee",
                                                  ROOT / "referee/colour_referee.py")
    B = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(B)
    pump = upstream_functions(USIM / "measurements/pump_glyphs_mythos.py", 74, 104)
    herself = upstream_functions(USIM / "measurements/asolaria_herself.py", 56, 83)
    full = upstream_functions(clone / "measurements/emit_full_ggufs.py", 39, 54)
    sphere = upstream_functions(clone / "measurements/pump_mythos_sphere.py", 78, 93)
    unl = upstream_body(clone / "measurements/pump_unlimited.py", 100, 128, "",
                        "dict(L_p=L_p, L_r=L_r, L_g=L_g, L_d=L_d, as_perm=as_perm)")()
    mpf = upstream_body(clone / "measurements/mythos_pump_full.py", 85, 108, "",
                        "dict(L_p=L_p, L_r=L_r, L_g=L_g, L_d=L_d, as_perm=as_perm)")()
    identity = list(range(256))
    same = dict(tables=0, unl_perms=0, unl_d=0, mpf_values=0, mpf_perms=0, integer=0)
    count = 0
    for _, x in other_arrays():
        a = np.array(x, dtype=np.uint8)
        ref = [pump[f"L_{k}"](a).tobytes() for k in "prg"]
        tables = [[full[f"L_{k}"](a).tobytes() for k in "prg"],
                  [sphere[f](a).tobytes() for f in ("lut_percentile", "lut_rank", "lut_glyph")],
                  [unl[f"L_{k}"](a).tobytes() for k in "prg"]]
        same["tables"] += all(t == ref for t in tables)
        ints = [bytes(B.lut_p(x)), bytes(B.lut_r(x)), bytes(B.lut_g(x))]
        same["integer"] += ref == ints
        same["unl_perms"] += all(unl["as_perm"](unl[f"L_{k}"](a)).tolist()
                                 == B.as_perm(list(t)) for k, t in zip("prg", ints))
        same["unl_d"] += unl["as_perm"](unl["L_d"](a)).tolist() == identity
        values = {k: u64(mpf[f"L_{k}"](a)) for k in "prgd"}
        want = {k: u64(herself[f"L_{k}"](a)) for k in "prgd"}
        exact = {"p": [B.b_bits(y) for y in B.vals_p(x)],
                 "r": [B.b_bits(B.ratio(t, 2)) for t in B.twice_vals_r(x)],
                 "g": [B.b_bits(B.b_int(g)) for g in B.vals_g(x)]}
        same["mpf_values"] += values == want and all(values[k] == exact[k] for k in "prg")
        perms = {k: mpf["as_perm"](mpf[f"L_{k}"](a)).tolist() for k in "prgd"}
        same["mpf_perms"] += (all(perms[k] == herself["as_perm"](herself[f"L_{k}"](a)).tolist()
                                  for k in "prgd")
                              and perms["p"] == B.as_perm([B.b_frac(y) for y in B.vals_p(x)])
                              and perms["r"] == B.as_perm(B.twice_vals_r(x))
                              and perms["g"] == B.as_perm(B.vals_g(x)))
        count += 1
    for what, n in (
            ("tables", "P/R/G tables of the three scripts == pump_glyphs_mythos.py:74-88"),
            ("integer", "pump_glyphs_mythos.py P/R/G tables == the referee's integer tables"),
            ("unl_perms", "pump_unlimited.py P/R/G bijections == as_perm of the integer tables"),
            ("unl_d", "pump_unlimited.py D bijection is the identity"),
            ("mpf_values", "mythos_pump_full.py P/R/G/D values == asolaria_herself.py:56-76 bit "
                           "for bit, P/R/G == the integer values"),
            ("mpf_perms", "mythos_pump_full.py bijections == asolaria_herself.py's and the integer "
                          "P/R/G bijections")):
        check(same[what] == count == 800, f"{same[what]}/{count} arrays: {n}")


def main(argv):
    if len(argv) == 2 and argv[0] == "regenerate":
        regenerate(argv[1])
    elif argv == ["parity"]:
        parity()
    elif len(argv) == 2 and argv[0] == "others":
        others(argv[1])
    else:
        print(__doc__)
        return 2
    print("FAILED: " + "; ".join(failures) if failures else "ALL OK")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
