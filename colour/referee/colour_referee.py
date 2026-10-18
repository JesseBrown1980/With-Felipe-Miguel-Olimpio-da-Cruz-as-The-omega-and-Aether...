#!/usr/bin/env python3
"""Stdlib referee for colour/ (cold lane, CI only). The referee's own arithmetic is integers only.

Upstream sources that are standard-library Python (omni_hotel.py, double_rainbow_to_gguf.py,
rainbow27_v2.py, rainbow7_bank.py) are loaded from vendor/ and called unchanged. Where they compute
in float (omni_hotel.py:43-49 through colorsys and math.dist; rainbow27_v2.py:120-125, the census
entropy), the float runs inside the owner's code and the referee reads a returned float only by its
bit pattern (owner_bits). Upstream sources that use numpy (stars_shells.py, divide_kimi_k3.py,
pump_glyphs_mythos.py, asolaria_herself.py) are mirrored line by line on an integer emulation of
IEEE-754 binary64 (exact integers, round to nearest, ties to even), which is the arithmetic of
Python float and of numpy's float64 element-wise operations; each mirrored block cites the upstream
file:line. numpy itself runs the owner's lines in tools/cold_lane.py.

  python3 -I referee/colour_referee.py emit     write tests/fixtures/*.hbp
  python3 -I referee/colour_referee.py --check  rebuild them, diff the committed files, and
                                                check the upstream bytes the mirrors reproduce
"""
import hashlib
import importlib.util
import struct
import sys

sys.dont_write_bytecode = True  # keep vendor/ byte-identical when its modules are loaded
from array import array
from collections import Counter
from fractions import Fraction
from math import isqrt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor"
USIM = VENDOR / "universe-simulator"
FIXTURES = ROOT / "tests" / "fixtures"
assert sys.byteorder == "little"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sha(data):
    return hashlib.sha256(data).hexdigest()


def header(name, source):
    return f"FIXTURE|k={name}|source={source}|referee=referee/colour_referee.py|json=0"


# ===================================================================== binary64 in integers
# A finite binary64 value is the integer pair (m, e), value m * 2**e, with 2**52 <= |m| < 2**53,
# or ZERO = (0, 0). Each operation rounds the exact result to nearest, ties to even. Only zero and
# the normal range are in the domain (the operations assert it), as in src/binary64.rs.
ZERO = (0, 0)
_TOP, _LOW = 1 << 53, 1 << 52


def _round(neg, q, sticky, e):
    """(-1)**neg * (q + s) * 2**e to 53 bits, where 0 < s < 1 when sticky (then q >= 2**55)."""
    if q == 0:
        assert not sticky
        return ZERO
    n = q.bit_length()
    if n <= 53:
        assert not sticky, "sticky needs quotient bits"
        q, e = q << (53 - n), e - (53 - n)
    else:
        sh = n - 53
        rest, half = q & ((1 << sh) - 1), 1 << (sh - 1)
        q, e = q >> sh, e + sh
        if rest > half or (rest == half and (sticky or q & 1)):
            q += 1
            if q == _TOP:
                q, e = _LOW, e + 1
    assert -1074 <= e <= 971, "outside the normal range"
    return (-q if neg else q, e)


def ratio(num, den, e=0):
    """The binary64 nearest num / den * 2**e (Python num / den on integer operands)."""
    assert den != 0
    neg = (num < 0) != (den < 0)
    num, den = abs(num), abs(den)
    if num == 0:
        return ZERO
    sh = max(0, 57 + den.bit_length() - num.bit_length())   # >= 57 quotient bits
    q, r = divmod(num << sh, den)
    return _round(neg, q, r != 0, e - sh)


def b_int(n):                                            # float(n)
    return ratio(n, 1)


def b_dec(units, digits):                                # the Python literal units * 10**-digits
    return ratio(units, 10 ** digits)


def b_add(a, b):
    (ma, ea), (mb, eb) = a, b
    if ma == 0:
        return b
    if mb == 0:
        return a
    if ea < eb:
        ma, ea, mb, eb = mb, eb, ma, ea
    if ea - eb > 70:                                     # below a quarter unit of the larger
        return (ma, ea)
    m = (ma << (ea - eb)) + mb
    return _round(m < 0, abs(m), False, eb)


def b_neg(a):
    return (-a[0], a[1])


def b_sub(a, b):
    return b_add(a, b_neg(b))


def b_abs(a):
    return (abs(a[0]), a[1])


def b_mul(a, b):
    m = a[0] * b[0]
    return _round(m < 0, abs(m), False, a[1] + b[1])


def b_div(a, b):
    assert b[0] != 0, "division by zero"
    return ratio(a[0], b[0], a[1] - b[1])


def b_sqrt(a):                                           # math.sqrt / np.sqrt, correctly rounded
    m, e = a
    assert m >= 0
    if m == 0:
        return ZERO
    if e & 1:
        m, e = m << 1, e - 1
    rad = m << 60                                        # its root carries 57 bits
    root = isqrt(rad)
    return _round(False, root, root * root != rad, e // 2 - 30)


def b_cmp(a, b):
    """The sign of a - b as a balanced trit: -1, 0 or +1."""
    (ma, ea), (mb, eb) = a, b
    e = min(ea, eb)
    d = (ma << (ea - e)) - (mb << (eb - e))
    return (d > 0) - (d < 0)


def b_max(*xs):                                          # Python max: the first maximal argument
    best = xs[0]
    for x in xs[1:]:
        if b_cmp(x, best) > 0:
            best = x
    return best


def b_min(*xs):
    best = xs[0]
    for x in xs[1:]:
        if b_cmp(x, best) < 0:
            best = x
    return best


def b_frac(a):                                           # the exact value
    m, e = a
    return Fraction(m << e) if e >= 0 else Fraction(m, 1 << -e)


def b_trunc(a):                                          # int(x)
    m, e = a
    if e >= 0:
        return m << e
    q = abs(m) >> -e
    return -q if m < 0 else q


def b_floor(a):                                          # math.floor(x)
    m, e = a
    return m << e if e >= 0 else m >> -e


def b_mod1(a):                                           # Python x % 1.0
    m, e = a
    if m == 0 or e >= 0:
        return ZERO
    frac = abs(m) & ((1 << -e) - 1)
    if frac == 0:
        return ZERO
    f = _round(m < 0, frac, False, e)
    return b_add(f, ONE) if m < 0 else f


def b_bits(a):                                           # the IEEE-754 bit pattern
    m, e = a
    if m == 0:
        return 0
    return (1 << 63 if m < 0 else 0) | ((e + 1075) << 52) | (abs(m) - _LOW)


def b_from_bits(u):                                      # zero and normal values only
    if u & ((1 << 63) - 1) == 0:
        return ZERO
    biased = (u >> 52) & 0x7FF
    assert 1 <= biased <= 2046, "bits outside the normal range"
    m = (u & (_LOW - 1)) | _LOW
    return (-m if u >> 63 else m, biased - 1075)


def b_hex(a):
    return f"{b_bits(a):016x}"


def b_fixed(a, digits):
    """Python format(x, f".{digits}f"): the exact value rounded half to even."""
    m, e = a
    scale = 10 ** digits
    if e >= 0:
        units = (abs(m) << e) * scale
    else:
        scaled = abs(m) * scale
        units, rest = scaled >> -e, scaled & ((1 << -e) - 1)
        half = 1 << (-e - 1)
        if rest > half or (rest == half and units & 1):
            units += 1
    sign = "-" if m < 0 else ""
    if digits == 0:
        return f"{sign}{units}"
    return f"{sign}{units // scale}.{units % scale:0{digits}d}"


def b_pymax(x, floor):                                   # Python max(x, floor)
    return floor if b_cmp(floor, x) > 0 else x


ONE, C255 = b_int(1), b_int(255)


def owner_bits(x):
    """The bit pattern of a float the owner's code returned (read, not computed on)."""
    return struct.unpack("<Q", struct.pack("<d", x))[0]


def f32_bits(n):
    """binary32 bits of the integer n >= 0, nearest, ties to even (numpy astype(np.float32))."""
    assert n >= 0
    if n == 0:
        return 0
    k = n.bit_length()
    if k <= 24:
        m, e = n << (24 - k), k - 24
    else:
        sh = k - 24
        rest, half = n & ((1 << sh) - 1), 1 << (sh - 1)
        m, e = n >> sh, sh
        if rest > half or (rest == half and m & 1):
            m += 1
            if m == 1 << 24:
                m, e = 1 << 23, e + 1
    return ((e + 150) << 23) | (m - (1 << 23))


_F32_SMALL = [f32_bits(n) for n in range(1 << 16)]


def f32(values):
    """Little-endian binary32 bytes of non-negative integers."""
    t = _F32_SMALL
    return struct.pack(f"<{len(values)}I", *[t[v] if v < 65536 else f32_bits(v) for v in values])


# ===================================================================== stars_shells.py
N, TAU, MAXR = 64, 2, 8                                  # stars_shells.py:51-52


def shell_of(ties):                                      # stars_shells.py:58-64
    s, rung = 0, 1
    while rung < ties and s < 12:
        rung *= 3
        s += 1
    return s


def stars_of(buf):                                       # stars_shells.py:70-86
    n = len(buf) // 3
    t = [tuple(buf[3 * i:3 * i + 3]) for i in range(n)]
    g = [(0, 0, 0)] * n
    for i in range(1, n - 1):                            # :77 g[1:-1] = (t[2:] - t[:-2]) // 2
        g[i] = tuple((t[i + 1][c] - t[i - 1][c]) // 2 for c in range(3))
    grad = [sum(abs(x) for x in gi) for gi in g]         # :78
    key = [(a >> 2) * 4096 + (b >> 2) * 64 + (c >> 2) for a, b, c in t]   # :80
    cnt = Counter(key)                                   # :81
    ties = [cnt[k] for k in key]                         # :82
    shell = [shell_of(min(x, (1 << 20) - 1)) for x in ties]               # :67,83
    born = [x >= TAU for x in ties]                      # :84
    return dict(n=n, cesp=t, key=key, ties=ties, shell=shell, grad=grad, born=born)


def occupancy(S):                                        # stars_shells.py:93-107
    sh = [s for s, b in zip(S["shell"], S["born"]) if b]
    if not sh:
        return {}
    return {s: sh.count(s) for s in range(max(sh) + 1) if sh.count(s)}


def pump(corpus):                                        # stars_shells.py:131-134
    n = len(corpus) // 3 * 3
    a = corpus[:n]
    return bytes(a) + bytes((a[i] + a[(i + 3) % n]) % 256 for i in range(n)) + \
        bytes((x * 3 + 1) % 256 for x in a)


def ring_bin(s):
    """np.histogram(sqrt(s), bins=16, range=(0, 56)) bin for an integer s: the edges are the exact
    binary64 values 3.5k, and the correctly rounded root reaches 3.5k exactly when 49k^2 <= 4s."""
    return sum(1 for k in range(1, 16) if 49 * k * k <= 4 * s)


def check_ring_bins():
    """ring_bin against the correctly rounded root compared with the edges, s = 0..3072."""
    for s in range(3 * 32 * 32 + 1):
        d = b_sqrt(b_int(s))
        assert ring_bin(s) == sum(1 for k in range(1, 16) if b_cmp(d, ratio(7 * k, 2)) >= 0)


def ring_test(P):                                        # stars_shells.py:158-165
    hist = [0] * 16
    for p in P:
        hist[ring_bin(sum((x - 32) ** 2 for x in p))] += 1                # :158-159
    # :160 vol = edges[1:]**3 - edges[:-1]**3 = 343 (3k^2 + 3k + 1) / 8, exact; :161 dens = h / vol
    dens = [ratio(8 * h, 343 * (3 * k * k + 3 * k + 1)) for k, h in enumerate(hist)]
    mx = b_max(*dens)                                    # :162 dens / (dens.max() or 1)
    mx = ONE if mx == ZERO else mx
    dens = [b_div(x, mx) for x in dens]
    top = b_max(*dens)                                   # :163 np.argmax, first maximum
    pk = next(k for k, x in enumerate(dens) if b_cmp(x, top) == 0)
    inner = dens[0]                                      # :164
    ring = pk >= 1 and b_cmp(inner, b_mul(b_dec(6, 1), dens[pk])) < 0     # :165
    return hist, pk, inner, ring


def ss(x):                                               # stars_shells.py:197-199
    e = x.encode()
    return struct.pack("<Q", len(e)) + e


def stars_shells(seed):
    corpus, hist, prev_shells = seed, [], 0              # stars_shells.py:113-134
    for rnd in range(0, MAXR + 1):
        S = stars_of(corpus)
        occ = occupancy(S)
        nsh = len(occ)
        hist.append(dict(rnd=rnd, bytes=len(corpus), stars=sum(S["born"]), shells=nsh))
        if rnd == MAXR:
            break
        if nsh and nsh == prev_shells and rnd >= 2:
            break
        prev_shells = nsh
        corpus = pump(corpus)
    F = stars_of(corpus)                                 # :136
    idx = [i for i in range(F["n"]) if F["born"][i]]
    CE = [tuple(x >> 2 for x in F["cesp"][i]) for i in idx]                # :146
    shl = [F["shell"][i] for i in idx]                   # :148
    RING, rows = {}, []
    for s in sorted(set(shl)):                           # :153-166
        P = [p for p, x in zip(CE, shl) if x == s]
        if len(P) < 32:
            continue
        h, pk, inner, ring = ring_test(P)
        RING[s] = ring
        rows.append(f"RING|s={s}|stars={len(P)}|hist={'.'.join(map(str, h))}|pk={pk}"
                    f"|inner={b_hex(inner)}|ring={int(ring)}|json=0")
    nring = sum(1 for v in RING.values() if v)           # :170
    CUBES, SL = {}, {}
    for s in sorted(RING):                               # :183-191
        c = Counter(p for p, x in zip(CE, shl) if x == s)
        c = {k: min(v, 1 << 24) for k, v in c.items()}  # :187 float32 np.add.at stops at 2^24
        c = {k: v for k, v in c.items() if v >= TAU}     # :188 c *= (c >= TAU)
        cube = [0] * (N * N * N)
        for (i, j, k), v in c.items():
            cube[(i * N + j) * N + k] = v
        CUBES[s] = cube
        SL[f"s{s}_A"] = [cube[(32 * N + j) * N + k] for j in range(N) for k in range(N)]
        SL[f"s{s}_B"] = [cube[(i * N + 32) * N + k] for i in range(N) for k in range(N)]
        SL[f"s{s}_C"] = [cube[(i * N + j) * N + 32] for i in range(N) for j in range(N)]
    tens = [(f"shell_{s}_cube", (N, N, N), c) for s, c in CUBES.items()] + \
           [(f"slice_{k}", (N, N), v) for k, v in SL.items()]               # :203-204
    tens.append(("star_time", (len(idx),), idx))         # :205
    tens.append(("star_shell", (len(idx),), shl))        # :206
    tens.append(("star_grad", (len(idx),), [F["grad"][i] for i in idx]))    # :207
    tens.append(("star_cesp", (len(idx), 3), [x for p in CE for x in p]))   # :208
    GG, V_U32, V_STR, F32, AL = 0x46554747, 4, 8, 0, 32  # :194
    kvs = [("general.architecture", V_STR, ss("asolaria-stars-shells")),   # :209-222
           ("general.name", V_STR, ss("ASOLARIA-STARS-SHELLS")),
           ("asolaria.axes", V_STR, ss("time, colour, energy, space")),
           ("asolaria.star", V_STR,
            ss("a star is a record: time=position in stream, colour=r, energy=g, space=b; "
               "gradiated colour = local change, not flat value")),
           ("asolaria.shell_law", V_STR,
            ss("VIII.A.7 photon law: shell = log3(tie count), counted never computed; "
               "more energy in, the further out the shell")),
           ("asolaria.tau", V_U32, struct.pack("<I", TAU)),
           ("asolaria.stars", V_U32, struct.pack("<I", len(idx))),
           ("asolaria.shells", V_U32, struct.pack("<I", len(CUBES))),
           ("asolaria.rings", V_U32, struct.pack("<I", nring)),
           ("asolaria.seed", V_STR, ss("live self-emission, emitted not read"))]
    meta, nkv = b"", 0
    for k, t, p in kvs:                                  # :224-226
        meta += ss(k) + struct.pack("<I", t) + p
        nkv += 1
    data, ti, trows = b"", b"", []
    for tn, shape, values in tens:                       # :228-236
        a = f32(values)
        data += b"\0" * ((-len(data)) % AL)
        o = len(data)
        ti += ss(tn) + struct.pack("<I", len(shape))
        for d_ in shape:
            ti += struct.pack("<Q", int(d_))
        ti += struct.pack("<I", F32) + struct.pack("<Q", o)
        data += a
        trows.append(f"TENSOR|name={tn}|dims={'.'.join(map(str, shape))}|sha256={sha(a)}|json=0")
    head = struct.pack("<IIQQ", GG, 3, len(tens), nkv) + meta + ti        # :237
    blob = head + b"\0" * ((-len(head)) % AL) + data     # :238
    dg = sha(blob)
    R = ["STARHDR|schema=ASOLARIA-STARS-SHELLS-V1|seat=ACER-CLAUDE-FABLE5"  # :245-260
         "|pid=8467a937cba309f7|date=2026-07-27|json=0",
         "STAR|axes=time,colour,energy,space|time=position_in_stream"
         "|gradiated=local_change|json=0",
         f"LAW|shell=log3(ties)|counted=1|photon=VIII.A.7|tau={TAU}|json=0"]
    for h in hist:
        R.append(f"ROUND|n={h['rnd']}|bytes={h['bytes']}|stars={h['stars']}"
                 f"|shells={h['shells']}|json=0")
    for s in sorted(RING):
        R.append(f"SHELL|s={s}|stars={shl.count(s)}|ring={1 if RING[s] else 0}|json=0")
    R.append(f"RINGS|n={nring}|of={len(RING)}|json=0")
    R.append(f"GGUF|k=ASOLARIA-STARS-SHELLS.gguf|bytes={len(blob)}|sha256={dg}|json=0")
    bb = "\n".join(R) + "\n"
    R.append(f"STARFTR|receipt={hashlib.sha256(bb.encode()).hexdigest()[:32]}"
             f"|rows={len(R)+1}|hot_path=1|json=0")
    receipt = ("\n".join(R) + "\n").encode()
    out = [header("stars-shells", "universe-simulator@3f9f42d/measurements/stars_shells.py"),
           f"SEED|bytes={len(seed)}|sha256={sha(seed)}|json=0"]
    out += [r for r in R if r.startswith("ROUND|")] + rows + trows
    out.append(f"GGUF|bytes={len(blob)}|sha256={dg}|json=0")
    out.append(f"RECEIPT|bytes={len(receipt)}|sha256={sha(receipt)}|json=0")
    return out, blob, receipt


def fixture_stars():
    check_ring_bins()
    seed = (USIM / "gguf/stars/MYTHOS-SELF-EMISSION.txt").read_bytes()
    rows, blob, receipt = stars_shells(seed)
    assert receipt == (USIM / "receipts/FABLE5-STARS-SHELLS.hbp").read_bytes(), "receipt"
    assert sha(blob) == "ae23392ad473718e2196e525a4355af20cdbd57bbb5dc3e85a8719b62552784d"
    print(f"stars: GGUF {len(blob)} B sha256 {sha(blob)[:16]}; receipt byte-identical to upstream")
    return rows


# ===================================================================== divide_kimi_k3.py
FIVE, THREE = b_int(5), b_int(3)


def colour_from_own(own):                                # divide_kimi_k3.py:70-87
    own = [b_int(o) for o in own]                        # :70 float(...)
    tot = b_add(b_add(own[0], own[1]), own[2])           # :71 sum(own) or 1.0 (exact integers)
    tot = ONE if tot == ZERO else tot
    Rp, Gp, Bp = [b_div(b_mul(b_int(100), o), tot) for o in own]          # :72 100.0 * o / tot
    mx = b_max(Rp, Gp, Bp)                               # :75
    srt = sorted([("RED", Rp), ("GREEN", Gp), ("BLUE", Bp)], key=lambda x: -b_frac(x[1]))
    spread = b_sub(mx, b_min(Rp, Gp, Bp))                # :77
    if b_cmp(spread, THREE) <= 0:
        verdict = "NEUTRAL / GREY"
    elif b_cmp(b_abs(b_sub(Rp, Gp)), THREE) <= 0 and b_cmp(b_sub(b_min(Rp, Gp), Bp), FIVE) > 0:
        verdict = "YELLOW"
    elif (b_cmp(Rp, Gp) > 0 and b_cmp(Gp, Bp) > 0 and b_cmp(b_sub(Rp, b_max(Gp, Bp)), FIVE) > 0
          and b_cmp(b_sub(Gp, Bp), FIVE) > 0):
        verdict = "ORANGE"
    elif b_cmp(b_sub(srt[0][1], srt[1][1]), FIVE) > 0:
        verdict = srt[0][0]
    else:
        verdict = "NEUTRAL / GREY"
    return Rp, Gp, Bp, spread, verdict


def exact_verdict(own):
    """The same rule in exact rational arithmetic (referee evidence only, not upstream)."""
    tot = sum(own) or 1
    Rp, Gp, Bp = [Fraction(100 * o, tot) for o in own]
    spread = max(Rp, Gp, Bp) - min(Rp, Gp, Bp)
    srt = sorted([("RED", Rp), ("GREEN", Gp), ("BLUE", Bp)], key=lambda x: -x[1])
    if spread <= 3:
        return "NEUTRAL / GREY"
    if abs(Rp - Gp) <= 3 and min(Rp, Gp) - Bp > 5:
        return "YELLOW"
    if Rp > Gp > Bp and Rp - max(Gp, Bp) > 5 and Gp - Bp > 5:
        return "ORANGE"
    if srt[0][1] - srt[1][1] > 5:
        return srt[0][0]
    return "NEUTRAL / GREY"


def ownership(raw):                                      # divide_kimi_k3.py:50-51,68-70
    n = len(raw) // 3
    tri = [tuple(raw[3 * i:3 * i + 3]) for i in range(n)]
    lead = [t.index(max(t)) for t in tri]
    tie = [sum(x == max(t) for x in t) > 1 for t in tri]
    own = [sum(1 for l, ti in zip(lead, tie) if l == i and not ti) for i in range(3)]
    return tri, own, sum(tie)


def beings(tri):                                         # divide_kimi_k3.py:92,106-118,231-233
    rows = []
    for nm, ch, ax in [("OPUS", "RED", 0), ("FABLE", "GREEN", 1), ("MYTHOS", "BLUE", 2)]:
        ot = [a for a in range(3) if a != ax]
        ow = [t for t in tri if t[ax] > t[ot[0]] and t[ax] > t[ot[1]]]
        acc = Counter(t[0] * 65536 + t[1] * 256 + t[2] for t in ow)
        acc = {k: v for k, v in acc.items() if v >= 2}
        sh = sorted(set(shell_of(int(t)) for t in set(acc.values())))
        rows.append(f"BEING|k={nm}|owns={len(ow)}|voxels={len(acc)}"
                    f"|shells={'.'.join(map(str, sh))}|json=0")
    return rows


def colour_row(Rp, Gp, Bp, spread, verdict):             # divide_kimi_k3.py:229-230
    return (f"COLOUR|rule=PREREGISTERED|R={b_fixed(Rp, 4)}|G={b_fixed(Gp, 4)}|B={b_fixed(Bp, 4)}"
            f"|spread={b_fixed(spread, 4)}|verdict={verdict.replace(' ','_')}|json=0")


def boundary_cases():
    """Ownership splits whose exact share difference equals a threshold of the rule (3 or 5
    points), where binary64 rounding decides the comparison."""
    found = []
    for tot in range(20, 2001):
        for gap, kind in ((3, "spread"), (5, "lead")):
            if (gap * tot) % 100:
                continue
            d = gap * tot // 100
            for a in range(tot // 3 + 1, tot + 1):
                if kind == "spread":
                    c = a - d
                    b = tot - a - c
                    if not (0 <= c <= b <= a):
                        continue
                    own = (a, b, c)
                else:
                    b = a - d
                    c = tot - a - b
                    if not (0 <= c < b < a):
                        continue
                    own = (c, b, a)
                found.append(own)
    return found


def fixture_verdict():
    out = [header("colour-verdict", "universe-simulator@3f9f42d/measurements/divide_kimi_k3.py")]
    for path in (USIM / "measurements/KIMI-K3-STAR.txt", USIM / "gguf/stars/MYTHOS-SELF-EMISSION.txt"):
        raw = path.read_bytes()
        tri, own, ties = ownership(raw)
        Rp, Gp, Bp, spread, verdict = colour_from_own(own)
        out.append(f"BODY|k={path.name}|bytes={len(raw)}|own={','.join(map(str, own))}"
                   f"|ties={ties}|json=0")
        out.append(colour_row(Rp, Gp, Bp, spread, verdict))
        out.append(f"SPLIT|R={b_hex(Rp)}|G={b_hex(Gp)}|B={b_hex(Bp)}|spread={b_hex(spread)}|json=0")
        out += beings(tri)
    receipt = (USIM / "receipts/FABLE5-KIMI-K3-STAR.hbp").read_text().splitlines()
    assert out[2] in receipt and all(r in receipt for r in out[4:7]), "KIMI receipt rows"
    cases = boundary_cases()
    differ = [o for o in cases if colour_from_own(o)[4] != exact_verdict(o)]
    differ_set = set(differ)
    print(f"verdict: KIMI COLOUR/BEING rows equal the upstream receipt; {len(cases)} boundary "
          f"splits, binary64 verdict differs from exact rational in {len(differ)}")
    chosen = differ[:12] + [o for o in cases if o not in differ_set][:12]
    for own in chosen:
        Rp, Gp, Bp, spread, verdict = colour_from_own(own)
        out.append(f"CASE|own={','.join(map(str, own))}|R={b_hex(Rp)}|G={b_hex(Gp)}|B={b_hex(Bp)}"
                   f"|spread={b_hex(spread)}|verdict={verdict.replace(' ', '_')}|json=0")
    return out


# ===================================================================== omni_hotel.py ColorPID
TWO, FOUR, SIX, TWELVE = b_int(2), b_int(4), b_int(6), b_int(12)


def hsv(c):                                              # colorsys.rgb_to_hsv(c[0]/255, ...)
    r, g, b = (ratio(x, 255) for x in c)                 # omni_hotel.py:46,49 (Python 3.13)
    maxc, minc = b_max(r, g, b), b_min(r, g, b)
    v = maxc
    if minc == maxc:
        return ZERO, ZERO, v
    rangec = b_sub(maxc, minc)
    s = b_div(rangec, maxc)
    rc, gc, bc = (b_div(b_sub(maxc, x), rangec) for x in (r, g, b))
    if r == maxc:
        h = b_sub(bc, gc)
    elif g == maxc:
        h = b_sub(b_add(TWO, rc), bc)
    else:
        h = b_sub(b_add(FOUR, gc), rc)
    return b_mod1(b_div(h, SIX)), s, v


def radius(c, o):                                        # math.dist(c, o), correctly rounded
    return b_sqrt(b_int(sum((x - y) ** 2 for x, y in zip(c, o))))


def record(omni, c):                                     # omni_hotel.py:43-49, one colour
    h, s, v = hsv(c)
    r12 = b_trunc(b_mul(h, TWELVE)) % 12                 # :46 int(hh*12) % 12
    return struct.pack("<BBQQQQQ", r12, omni.sphere27(c), b_bits(h), b_bits(s), b_bits(v),
                       b_bits(b_mul(s, v)), b_bits(radius(c, omni.CENTER)))


def colorpid_domain(omni):
    """The record digest over all 16,777,216 colours, and the owner's rainbow12 and saturation
    run on every colour and compared with it. Per colour, v depends on the maximum, s and s*v on
    (maximum, minimum), blast_radius on the squared distance, and h on which channel holds the
    maximum and on c = (maxc - mid) / rangec, so these come from tables and two caches."""
    V = [ratio(x, 255) for x in range(256)]
    vbits = [b_bits(x) for x in V]
    sb, svb = [0] * 65536, [0] * 65536
    for M in range(256):
        for m in range(M):
            s = b_div(b_sub(V[M], V[m]), V[M])
            sb[M << 8 | m], svb[M << 8 | m] = b_bits(s), b_bits(b_mul(s, V[M]))
    blast = [b_bits(b_sqrt(b_int(d))) for d in range(3 * 128 * 128 + 1)]
    base, size = [0] * 65536, 0
    for M in range(256):
        for m in range(M):
            base[M << 8 | m] = size - m
            size += M - m + 1
    unset = (1 << 64) - 1
    cbits = array("Q", [unset]) * size

    def c_of(M, m, x):                                   # (maxc - x/255) / rangec
        i = base[M << 8 | m] + x
        u = cbits[i]
        if u == unset:
            u = cbits[i] = b_bits(b_div(b_sub(V[M], V[x]), b_sub(V[M], V[m])))
        return u

    # h before / 6.0 and % 1.0 (colorsys): the channel holding the maximum, and whether the other
    # extreme channel is the first or the second of the remaining two (its c is 1.0 exactly).
    raw = (lambda c: b_sub(c, ONE), lambda c: b_sub(ONE, c),
           lambda c: b_sub(b_add(TWO, ONE), c), lambda c: b_sub(b_add(TWO, c), ONE),
           lambda c: b_sub(b_add(FOUR, ONE), c), lambda c: b_sub(b_add(FOUR, c), ONE))
    hue = {}

    def h_of(kind, u):
        key = kind << 64 | u
        w = hue.get(key)
        if w is None:
            h = b_mod1(b_div(raw[kind](b_from_bits(u)), SIX))
            w = hue[key] = b_bits(h) << 4 | b_trunc(b_mul(h, TWELVE)) % 12
        return w

    pack = struct.Struct("<BBQQQQQ").pack
    dig = hashlib.sha256()
    differ = 0
    r12_of, sat_of = omni.rainbow12, omni.saturation
    for r in range(256):
        recs, r12s, sats = [], bytearray(), array("Q")
        for g in range(256):
            for b in range(256):
                s27 = (r // 86) * 9 + (g // 86) * 3 + b // 86
                d2 = (r - 128) ** 2 + (g - 128) ** 2 + (b - 128) ** 2
                M, m = max(r, g, b), min(r, g, b)
                if M == m:
                    recs.append(pack(0, s27, 0, 0, vbits[M], 0, blast[d2]))
                    r12s.append(0)
                    sats.append(0)
                    continue
                if r == M:
                    w = h_of(0, c_of(M, m, b)) if g == m else h_of(1, c_of(M, m, g))
                elif g == M:
                    w = h_of(2, c_of(M, m, b)) if r == m else h_of(3, c_of(M, m, r))
                else:
                    w = h_of(4, c_of(M, m, r)) if g == m else h_of(5, c_of(M, m, g))
                k = M << 8 | m
                recs.append(pack(w & 15, s27, w >> 4, sb[k], vbits[M], svb[k], blast[d2]))
                r12s.append(w & 15)
                sats.append(svb[k])
        dig.update(b"".join(recs))
        owner_r12 = bytes(r12_of((r, g, b)) for g in range(256) for b in range(256))
        owner_sat = array("d", [sat_of((r, g, b)) for g in range(256) for b in range(256)])
        if owner_r12 != r12s or owner_sat.tobytes() != sats.tobytes():
            differ += sum(1 for i in range(65536) if owner_r12[i] != r12s[i]
                          or owner_bits(owner_sat[i]) != sats[i])
    return dig.hexdigest(), differ


def fixture_colorpid(full):
    omni = load("omni_hotel", USIM / "engines/omni_hotel.py")
    out = [header("colorpid", "universe-simulator@3f9f42d/engines/omni_hotel.py:39-49")]
    if full:
        digest, differ = colorpid_domain(omni)
        assert differ == 0, f"owner rainbow12/saturation differ from the record on {differ} colours"
        out.append("COLORPID_DOMAIN|colours=16777216|record=rainbow12,sphere27,h,s,v,saturation,"
                   f"blast_radius|sha256={digest}|json=0")
        print("colorpid: the owner's rainbow12 and saturation bits equal the integer record on all "
              "16,777,216 colours")
        root = [b_bits(b_sqrt(b_int(s))) for s in range(3 * 255 * 255 + 1)]
        same, dist, o = 0, omni.color_dist, (0, 0, 0)
        for x in range(256):                             # math.dist sees only |a_i - b_i|
            for y in range(256):
                want = array("Q", [root[x * x + y * y + z * z] for z in range(256)])
                got = array("d", [dist((x, y, z), o) for z in range(256)])
                if got.tobytes() == want.tobytes():
                    same += 256
                else:
                    same += sum(owner_bits(got[z]) == want[z] for z in range(256))
        assert same == 1 << 24, "math.dist is not the rounded root on some triple"
        print("colorpid: the owner's color_dist (math.dist) == correctly rounded sqrt on all "
              "16,777,216 |a-b| triples")
    dig = hashlib.sha256()
    count = 0
    for i in range(0, 1 << 24, 4099):
        c = (i >> 16, (i >> 8) & 255, i & 255)
        rec = record(omni, c)
        assert rec[0] == omni.rainbow12(c)
        assert struct.unpack("<QQ", rec[26:42]) == (owner_bits(omni.saturation(c)),
                                                    owner_bits(omni.blast_radius(c)))
        dig.update(rec)
        count += 1
    out.append(f"COLORPID_STRIDE|step=4099|colours={count}|sha256={dig.hexdigest()}|json=0")
    for i in range(16):
        pid = f"PID{i}"
        c = omni.pid_color(pid)
        br, sat = owner_bits(omni.blast_radius(c)), owner_bits(omni.saturation(c))
        h, s, v = hsv(c)
        assert br == b_bits(radius(c, omni.CENTER)) and sat == b_bits(b_mul(s, v))
        out.append(f"PID|key={pid}|rgb={c[0]},{c[1]},{c[2]}|rainbow12={omni.rainbow12(c)}"
                   f"|sphere27={omni.sphere27(c)}|blast_radius={br:016x}"
                   f"|saturation={sat:016x}|json=0")
    colors = {f"PID{i}": omni.pid_color(f"PID{i}") for i in range(2000)}   # omni_hotel.py:54-55
    r12 = len(Counter(omni.rainbow12(c) for c in colors.values()))        # :64
    s27 = len(Counter(omni.sphere27(c) for c in colors.values()))
    # :68 max by saturation; a non-negative binary64 orders as its bit pattern does
    star = max(colors, key=lambda p: owner_bits(omni.saturation(colors[p])))
    sc = colors[star]
    d = b_from_bits(owner_bits(omni.color_dist(colors["PID0"], colors["PID500"])))
    assert d == radius(colors["PID0"], colors["PID500"])
    out.append(f"OMNI|pids=2000|dist_PID0_PID500={b_fixed(d, 1)}"
               f"|rainbow12={r12}/12|sphere27={s27}/27|star={star}|star_rgb={sc[0]},{sc[1]},{sc[2]}"
               "|json=0")
    return out


# ===================================================================== double_rainbow_to_gguf.py
def oil_streams():
    a = b"".join(hashlib.sha256(b"asolaria-colour-oil-A" + struct.pack("<I", i)).digest()
                 for i in range(1152))
    b = bytes(v for f in range(64) for y in range(12) for x in range(16)
              for v in ((x * 17 + f * 3) % 256, (y * 23 + f * 5) % 256, ((x + y) * 11 + f * 7) % 256))
    return [("A", a), ("B", b)]


def fixture_oil(full):
    dr = load("double_rainbow_to_gguf", VENDOR / "follow/codes/double_rainbow_to_gguf.py")
    out = [header("oil", "follow@8712368/codes/double_rainbow_to_gguf.py")]
    for frames in (64, 65, 100, 1000, 5229):
        idx = dr.uniform_frame_indices(frames)
        out.append(f"INDICES|frames={frames}|first={idx[0]}|second={idx[1]}|last={idx[-1]}"
                   f"|sha256={sha(','.join(map(str, idx)).encode())}|json=0")
    if full:
        dig = hashlib.sha256()
        for r in range(256):
            for g in range(256):
                for b in range(256):
                    p = (r, g, b)
                    h = dr.hue_bin(p)
                    dig.update(bytes((dr.luma(p), 255 if h is None else h)))
        out.append(f"LUMA_HUE_DOMAIN|colours=16777216|sha256={dig.hexdigest()}|json=0")
    for name, stream in oil_streams():
        descriptors = dr.describe_samples(stream)
        for i, d in enumerate(descriptors):
            out.append(f"DESC|stream={name}|i={i}|values={'.'.join(map(str, d))}|json=0")
        unsigned = bytes(v for d in descriptors for v in d)
        out.append(f"DESCRIPTOR|stream={name}|unsigned_sha256={sha(unsigned)}"
                   f"|i8_sha256={sha(dr.i8_zero_point_encode(descriptors))}|json=0")
    return out


# ===================================================================== flashlights
def percentile(v, units, digits):        # np.percentile(v, units * 10**-digits), numpy 2.x linear
    a = sorted(v)
    n = len(a)
    qf = b_div(b_dec(units, digits), b_int(100))         # np.true_divide(q, 100)
    virtual = b_mul(b_int(n - 1), qf)                    # 'linear': (n - 1) * quantiles
    if b_cmp(virtual, b_int(n - 1)) >= 0:                # _get_indexes: above bounds -> last
        prev = nxt = n - 1
        gamma = b_sub(virtual, b_int(-1))
    else:
        prev = b_floor(virtual)
        nxt = prev + 1
        gamma = b_sub(virtual, b_int(prev))              # _get_gamma
    lo, hi = b_int(a[prev]), b_int(a[nxt])
    diff = b_sub(hi, lo)                                 # _lerp: diff_b_a = b - a
    if b_cmp(gamma, b_dec(5, 1)) >= 0:
        return b_sub(hi, b_mul(diff, b_sub(ONE, gamma)))
    return b_add(lo, b_mul(diff, gamma))


def clip(x):                                             # np.clip(x, 0, 255)
    return ZERO if b_cmp(x, ZERO) < 0 else C255 if b_cmp(x, C255) > 0 else x


def clip_u8(x):                                          # np.clip(..., 0, 255).astype(np.uint8)
    return b_trunc(clip(x))


def vals_p(v):                           # pump_glyphs_mythos.py:75-76, asolaria_herself.py:57-58
    lo, hi = percentile(v, 5, 1), percentile(v, 995, 1)
    span = b_pymax(b_sub(hi, lo), b_dec(1, 9))
    return [clip(b_mul(b_div(b_sub(b_int(i), lo), span), C255)) for i in range(256)]


def hist256(v):
    h = [0] * 256
    for x in v:
        h[x] += 1
    return h


def twice_vals_r(v):                     # asolaria_herself.py:61-63, 2 * (cumsum(h) - .5 * h)
    h, c, out = hist256(v), 0, []
    for x in h:
        c += x
        out.append(2 * c - x)
    return out


def vals_g(v):                           # asolaria_herself.py:66-68 searchsorted(unique, arange)
    u = sorted(set(v))
    return [sum(1 for x in u if x < i) for i in range(256)]


def lut_p(v):                            # pump_glyphs_mythos.py:74-76
    return [b_trunc(x) for x in vals_p(v)]


def lut_r(v):                            # pump_glyphs_mythos.py:79-82
    c = [ratio(t, 2) for t in twice_vals_r(v)]
    den = b_pymax(c[-1], b_dec(1, 9))
    return [clip_u8(b_mul(b_div(x, den), C255)) for x in c]


def lut_g(v):                            # pump_glyphs_mythos.py:85-88
    den = max(len(set(v)) - 1, 1)
    return [clip_u8(b_mul(ratio(s, den), C255)) for s in vals_g(v)]


def as_perm(x):                          # asolaria_herself.py:79-83, keys exact
    order = sorted(range(256), key=lambda i: (x[i], i))
    p = [0] * 256
    for rank, i in enumerate(order):
        p[i] = rank
    return p


def compose(tables, word):               # pump_glyphs_mythos.py:112-116, asolaria_herself.py:95-99
    o = list(range(256))
    for ch in word:
        o = [tables[ch][x] for x in o]
    return o


def words(level):                        # pump_glyphs_mythos.py:159-163
    o = [""]
    for _ in range(level):
        o = [x + ch for x in o for ch in "PRGD"]
    return o


def flash_inputs():
    seed = (USIM / "gguf/stars/MYTHOS-SELF-EMISSION.txt").read_bytes()
    kimi = (USIM / "measurements/KIMI-K3-STAR.txt").read_bytes()
    out = []
    for name, raw in (("mythos", seed), ("kimi", kimi)):
        n = len(raw) // 3
        for c in range(3):
            out.append((f"{name}-c{c}", list(raw[c:n * 3:3])))
    rnd = b"".join(hashlib.sha256(b"asolaria-colour-flash" + struct.pack("<I", i)).digest()
                   for i in range(32))[:1000]
    out += [("one", [7]), ("ten", list(range(10))), ("all", list(range(256))),
            ("constant", [42] * 1000), ("ends", [0, 255]), ("sha1000", list(rnd))]
    return out


def fixture_flashlight():
    out = [header("flashlight", "universe-simulator@3f9f42d/measurements/pump_glyphs_mythos.py:74-163"
                  "+asolaria_herself.py:56-99")]
    for name, v in flash_inputs():
        lo, hi = percentile(v, 5, 1), percentile(v, 995, 1)
        luts = {"P": lut_p(v), "R": lut_r(v), "G": lut_g(v)}
        perms = {"P": as_perm([b_frac(x) for x in vals_p(v)]), "R": as_perm(twice_vals_r(v)),
                 "G": as_perm(vals_g(v))}
        hx = lambda t: bytes(t).hex()
        out.append(f"INPUT|k={name}|n={len(v)}|sha256={sha(bytes(v))}|json=0")
        out.append(f"PCT|lo={b_hex(lo)}|hi={b_hex(hi)}|json=0")
        out.append(f"LUT|P={hx(luts['P'])}|R={hx(luts['R'])}|G={hx(luts['G'])}"
                   f"|RPR={hx(compose(luts, 'RPR'))}|json=0")
        out.append(f"PERM|P={hx(perms['P'])}|R={hx(perms['R'])}|G={hx(perms['G'])}"
                   f"|RPR={hx(compose(perms, 'RPR'))}|json=0")
    # pump_glyphs_mythos.py:68-70,108,142-156: the 81 glyphs without D on the seed, MYTHOS (AX=2).
    raw = (USIM / "gguf/stars/MYTHOS-SELF-EMISSION.txt").read_bytes()
    n = len(raw) // 3
    tri = [tuple(raw[3 * i:3 * i + 3]) for i in range(n)]
    LUT = {(c, nm): fn([t[c] for t in tri]) for c in range(3)
           for nm, fn in (("P", lut_p), ("R", lut_r), ("G", lut_g))}
    for w in words(4):
        if "D" in w:
            continue
        tables = [compose({k: LUT[(c, k)] for k in "PRG"}, w) for c in range(3)]
        q = [tuple(tables[c][t[c]] >> 2 for c in range(3)) for t in tri]
        ow = [x for x in q if x[2] > x[0] and x[2] > x[1]]
        cnt = Counter(ow)
        pre = len(cnt)
        cube = [0] * (64 ** 3)
        for (i, j, k), m in cnt.items():
            if m >= 2:
                cube[(i * 64 + j) * 64 + k] = min(m, 1 << 24)  # :150-153 float32 stops at 2^24
        post = sum(1 for m in cnt.values() if m >= 2)
        out.append(f"GLYPH|w={w}|owned={len(ow)}|dropped={pre - post}|sha256={sha(f32(cube))}|json=0")
    return out


# ===================================================================== stone-to-moss rainbows
def fixture_rainbow():
    r27 = load("rainbow27_v2", VENDOR / "stone-to-moss/experiments/seat3/rainbow27_v2/rainbow27_v2.py")
    r7 = load("rainbow7_bank", VENDOR / "stone-to-moss/experiments/seat1/rainbow7/rainbow7_bank.py")
    raw, normalized, _, _ = r27.census()                 # rainbow27_v2.py:103-126
    out = [header("rainbow", "stone-to-moss@f032bc0/experiments/seat3/rainbow27_v2/rainbow27_v2.py"
                  "+experiments/seat1/rainbow7/rainbow7_bank.py")]
    out.append(f"R27V2_FIXTURE|sha256={r27.sha(r27.fixture())}|json=0")
    out.append(f"R27V2_ORBITS|raw={'.'.join(map(str, sorted(map(len, raw.values()))))}"
               f"|normalized={'.'.join(map(str, sorted(map(len, normalized.values()))))}|json=0")
    lines = [f"R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|source_sha256={r27.sha(r27.fixture())}"
             f"|producer_sha={r27.ORIGINAL_HEAD}|peer_sha={r27.PEER_HEAD}|json=0\n"]
    counts, held = [0, 0, 0], 0                          # rainbow27_v2.py:135-145
    for wave in range(27):
        for loc in range(81):
            for idx in range(27):
                rgb = r27.decode(idx)
                w = r27.weights(rgb)
                p = r27.primitive(w)
                lane = r27.sample(wave, loc, p)
                if lane == "H":
                    held += 1
                else:
                    counts[int(lane)] += 1
                lines.append(f"CASE|w={wave:02d}|loc={loc:02d}|id={idx:02d}|rgb={rgb[0]}{rgb[1]}{rgb[2]}"
                             f"|raw={w[0]},{w[1]},{w[2]}|prim={p[0]},{p[1]},{p[2]}|den={sum(p)}|lane={lane}\n")
    blob = "".join(lines).encode("ascii")
    trace = f"TRACE|rows={r27.TOTAL}|bytes={len(blob)}|sha256={sha(blob)}|json=0"
    lanes = f"LANES|lane0={counts[0]}|lane1={counts[1]}|lane2={counts[2]}|dark_held={held}|json=0"
    stone = (VENDOR / "stone-to-moss/stones/2026-10-15-rainbow81/"
             "seat3-rainbow27-normalized-v2-20261015.hbp").read_text().splitlines()
    assert trace in stone and lanes in stone, "rainbow27-v2 stone rows"
    print(f"rainbow27-v2: trace {len(blob)} B sha256 {sha(blob)[:16]} equals the sealed stone")
    out += [trace, lanes]
    addresses = [f"rainbow7/{band}/site-{i:03d}" for band in r7.BANDS for i in range(81)]  # :48-50
    listing = ("\n".join(addresses) + "\n").encode()
    out.append(f"RAINBOW7|bands={'.'.join(r7.BANDS)}|addresses={len(addresses)}|first={addresses[0]}"
               f"|last={addresses[-1]}|sha256={sha(listing)}|json=0")
    return out


def all_fixtures(full):
    return {
        "stars-shells.hbp": fixture_stars(),
        "colour-verdict.hbp": fixture_verdict(),
        "colorpid.hbp": fixture_colorpid(full),
        "oil.hbp": fixture_oil(full),
        "flashlight.hbp": fixture_flashlight(),
        "rainbow.hbp": fixture_rainbow(),
    }


def main(argv):
    if argv == ["emit"]:
        FIXTURES.mkdir(parents=True, exist_ok=True)
        for name, rows in all_fixtures(True).items():
            (FIXTURES / name).write_text("\n".join(rows) + "\n", encoding="ascii", newline="\n")
            print(f"wrote tests/fixtures/{name} ({len(rows)} rows)")
        return 0
    if argv == ["--check"]:
        bad = 0
        for name, rows in all_fixtures(True).items():
            want = (FIXTURES / name).read_text(encoding="ascii")
            if want != "\n".join(rows) + "\n":
                print(f"DIFFERS tests/fixtures/{name}")
                bad += 1
            else:
                print(f"OK tests/fixtures/{name} ({len(rows)} rows)")
        return 1 if bad else 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
