#!/usr/bin/env python3
"""Cold-lane referee for ternary/ (stdlib only; run with python3 -I -B).

What runs here, and whose code it is:

  OWNER CODE, executed from the vendored files (their bytes are pinned in UPSTREAM.sha256; the
  referee also checks trijection.py's and trianti.py's sha256 itself before running them):
    trijection.py:42-48 to_balanced_ternary, :50-57 trijection_forward, :59-64 trijection_inverse
                        (the three defs only, compiled from the vendored file)
    trijection.py:55-56 the forward loop body, executed with a, bb, c bound (TRIJ rows, i64 inputs;
                        C0, SA, SB, REM bound to lists, since upstream's bytearray holds bytes only)
    trijection.py:62    the inverse loop body, executed with c0, sa, sb, rem bound
    trijection.py:75-76 the "<h" serialisation of SA, SB (the stream digests hash these bytes)
    trijection.py:84-87 the zero-trit count of measure(), executed with SA, SB bound
    reframe_check.py:12-19 base3, :22-34 bal3  (the two defs only; the script's loop is not run)
    reframe_check.py:44   the reconstruction line, executed with `bt` bound
    rime_27fischers.py:51-52 cube27            (the def only; the script's imports are not run)
    rime_27fischers.py:39-44 the 3-trit loop, executed with `x` bound
    rime_27fischers.py:92    the 2/3 rule line, executed with `a, b, c` bound
    rime_agents.py:46-51     the 3-trit loop, executed with `k27` bound
    trianti.py:31 N, :32 R, :33 R2  (the three defs only, compiled from the vendored file): the
                        27-cube symmetry group — N negation `t -> -t`, R rotation `(a,b,c)->(c,a,b)`,
                        R2 = R(R) the anti-inversion. law_negate / law_rotate are N / R.
    trianti.py:49-77 report()  run from the imported module (its __main__ guard is not hit): the
                        owner's cube-symmetry counts, quoted by --check and checked against the
                        referee's own counts over the owner's cube27() cells.
  --measure, the owner's float lane run as written: the module is imported from the vendored path
  (its top level: imports and defs), and its __main__ lines 102-135 are executed with SC bound to
  the directory given (line 101, the old cloud scratchpad path, is the one line not executed) and
  with measure bound to recording_measure, which records each input and then calls the owner's
  measure() unchanged (the as-written run, with no wrapper, prints the same lines).
  measure() (H_bits / math.log2, lzma) and the math.sin signal are the owner's code; their printed
  lines are quoted as the owner's output. Every number this file computes itself is an integer.

  TEST INPUTS: splitmix64 seeded draws, mirrored in tests/common/rows.rs; not owner code.
  DIGESTS: hashlib.sha256 of C0 || SA_b || SB_b || REM (tests/common/sha256.rs on the Rust side).

Modes:
  --emit-fixture         write tests/fixtures/vectors.hbp rows to stdout
  --check                verify trijection.py's sha256 and the executed lines, the fixture equals a
                         fresh run, the law's countable statements, restore through the original
                         inverse over every byte triple
  --check --rust FILE    also compare FILE (cargo run --example emit full) row by row
  --measure --sc DIR     run the owner's __main__ cases (lines 102-135) with SC=DIR/; print the
                         owner's output, the integer counts, and each law row reproduced or not
     [--write-inputs DIR]  also write every input measure() received, for `emit measure`
     [--rust-measure FILE] compare FILE (cargo run --example emit measure DIR/*.bin)
"""
import argparse
import ast
import contextlib
import hashlib
import importlib.util
import io
import os
import re
import struct
import sys
import textwrap

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V_USIM = os.path.join(HERE, "vendor", "universe-simulator")
V_ERDOS = os.path.join(HERE, "vendor", "the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3")
V_ACER = os.path.join(HERE, "vendor", "acer-algorithms-of-asolaria-publication-20260723")
LAW = os.path.join(V_USIM, "books", "operator-laws", "TRIJECTION-BALANCED-TERNARY.md")
REFRAME = os.path.join(V_ERDOS, "reframe_check.py")
FISCHERS27 = os.path.join(V_USIM, "players", "rime_27fischers.py")
AGENTS = os.path.join(V_USIM, "players", "rime_agents.py")
TRIJ = os.path.join(V_ACER, "tools", "honest-compressor", "trijection", "trijection.py")
TRIJ_SHA256 = "c5005b1c9acd6a6cb6d6e3fbd25a283c1455109f0408ee9810b0d5a8151baac6"
TRIANTI = os.path.join(V_ACER, "tools", "honest-compressor", "trijection", "trianti.py")
TRIANTI_SHA256 = "e7c1a01fd5be6d67a34eb6fc966a0742cca730eaed10899dff72379346229b6c"
FIXTURE = os.path.join(HERE, "tests", "fixtures", "vectors.hbp")

M64 = (1 << 64) - 1


def read_lines(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read().split("\n")


def line_block(path, first, last):
    """Source lines first..last (1-based, inclusive) of a vendored file, dedented."""
    return textwrap.dedent("\n".join(read_lines(path)[first - 1:last]) + "\n")


def load_defs(path, names):
    """Compile only the named top-level function definitions of a vendored script."""
    with open(path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=path)
    keep = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names]
    found = sorted(n.name for n in keep)
    if found != sorted(names):
        raise SystemExit("REFEREE|missing defs in %s: want %s got %s" % (path, names, found))
    mod = ast.Module(body=keep, type_ignores=[])
    ns = {}
    exec(compile(mod, path, "exec"), ns)
    return ns


def file_sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


if file_sha256(TRIJ) != TRIJ_SHA256:
    raise SystemExit("REFEREE|trijection.py sha256 %s, want %s|FAIL" % (file_sha256(TRIJ), TRIJ_SHA256))

if file_sha256(TRIANTI) != TRIANTI_SHA256:
    raise SystemExit("REFEREE|trianti.py sha256 %s, want %s|FAIL" % (file_sha256(TRIANTI), TRIANTI_SHA256))

# The exact upstream text the referee executes or cites, at the cited lines. --check fails if the
# vendored bytes ever differ from these.
EXPECT_TEXT = [
    (REFRAME, 44, "    recon = sum(x * 3 ** i for i, x in enumerate(bt))"),
    (FISCHERS27, 39, "    bal=[]"),
    (FISCHERS27, 40, "    xx=x"),
    (FISCHERS27, 41, "    for _ in range(3):"),
    (FISCHERS27, 42, "        r=xx%3"),
    (FISCHERS27, 43, "        if r==2: r=-1; xx+=1"),
    (FISCHERS27, 44, "        bal.append(r); xx//=3"),
    (FISCHERS27, 92, "    ctr=(a+b+c)//3; rem=(a+b+c)-3*ctr; c_rev=3*ctr+rem-a-b"),
    (AGENTS, 46, "    trimes = []"),
    (AGENTS, 47, "    kk = k27"),
    (AGENTS, 48, "    for _ in range(3):                          # balanced ternary {-1,0,+1}"),
    (AGENTS, 49, "        r = kk % 3"),
    (AGENTS, 50, "        if r == 2: trimes.append(-1); kk = kk // 3 + 1"),
    (AGENTS, 51, "        else: trimes.append(r); kk //= 3"),
    (LAW, 13, "s   = a + b + c"),
    (LAW, 14, "c0  = s // 3        # the CENTER (centroid) — one value"),
    (LAW, 15, "rem = s % 3         # 2-bit remainder {0,1,2}"),
    (LAW, 16, "sa  = a - c0        # separation of point 1"),
    (LAW, 17, "sb  = b - c0        # separation of point 2"),
    (LAW, 18, "c   = c0 + rem - sa - sb     # the THIRD point is FREE — determined, not stored"),
    (LAW, 24, "center. **3 trits = 3³ = 27 = the cube:** `1 center + 6 faces + 12 edges + 8"),
    (LAW, 128, "| **N** negation `t→−t` | reflect through center (binary-style) | **2** | itself (self-inverse) |"),
    (LAW, 129, "| **R** rotation `(a,b,c)→(c,a,b)` | trinary-native 3-cycle | **3** | **R² = R⁻¹ (distinct!)** |"),
    (LAW, 137, "(orbit sizes {1:3, 3:8} = 3 fixed + 8 full 3-cycles = 27). The FULL group {N,R,R²}"),
    # trijection.py: the defs compiled and the line blocks executed
    (TRIJ, 42, "def to_balanced_ternary(n, digits):"),
    (TRIJ, 50, "def trijection_forward(data):"),
    (TRIJ, 55, "        s = a + bb + c; c0 = s // 3; rem = s % 3"),
    (TRIJ, 56, "        C0.append(c0); SA.append(a - c0); SB.append(bb - c0); REM.append(rem)"),
    (TRIJ, 59, "def trijection_inverse(C0, SA, SB, REM, total_len, pad):"),
    (TRIJ, 62, "        a = c0 + sa; bb = c0 + sb; c = c0 + rem - sa - sb"),
    (TRIJ, 75, '    SA_b = b"".join(struct.pack("<h", x) for x in SA)'),
    (TRIJ, 76, '    SB_b = b"".join(struct.pack("<h", x) for x in SB)'),
    (TRIJ, 84, "    zeros = tot_tr = 0"),
    (TRIJ, 85, "    for x in SA + SB:"),
    (TRIJ, 86, "        for t in to_balanced_ternary(abs(x), 6):"),
    (TRIJ, 87, "            tot_tr += 1; zeros += (t == 0)"),
    # trianti.py: the cells and the three symmetry defs compiled (N, R, R2)
    (TRIANTI, 28, "T = [-1, 0, 1]"),
    (TRIANTI, 29, "CELLS = list(itertools.product(T, repeat=3))            # the 27 base-27 symbols"),
    (TRIANTI, 31, "def N(c):   return tuple(-x for x in c)                 # negation: order-2 inversion"),
    (TRIANTI, 32, "def R(c):   return (c[2], c[0], c[1])                   # rotation: order-3, trinary-native"),
    (TRIANTI, 33, "def R2(c):  return R(R(c))                              # anti-inversion (trianti) = R^-1"),
]

OWNER = load_defs(REFRAME, ["base3", "bal3"])
OWNER.update(load_defs(FISCHERS27, ["cube27"]))
OWNER.update(load_defs(TRIJ, ["to_balanced_ternary", "trijection_forward", "trijection_inverse"]))
OWNER.update(load_defs(TRIANTI, ["N", "R", "R2"]))
RECON_SRC = compile(line_block(REFRAME, 44, 44), REFRAME, "exec")
LOOP27_SRC = compile(line_block(FISCHERS27, 39, 44), FISCHERS27, "exec")
RULE23_SRC = compile(line_block(FISCHERS27, 92, 92), FISCHERS27, "exec")
AGENTS_SRC = compile(line_block(AGENTS, 46, 51), AGENTS, "exec")
FWD_BODY_SRC = compile(line_block(TRIJ, 55, 56), TRIJ, "exec")
INV_BODY_SRC = compile(line_block(TRIJ, 62, 62), TRIJ, "exec")
PACK_SRC = compile(line_block(TRIJ, 75, 76), TRIJ, "exec")
ZT_SRC = compile(line_block(TRIJ, 84, 87), TRIJ, "exec")
FORWARD = OWNER["trijection_forward"]
INVERSE = OWNER["trijection_inverse"]
TBT = OWNER["to_balanced_ternary"]


def owner_recon(bt):
    ns = {"bt": bt}
    exec(RECON_SRC, ns)
    return ns["recon"]


def owner_loop27(x):
    ns = {"x": x}
    exec(LOOP27_SRC, ns)
    return ns["bal"]


def owner_agents(k27):
    ns = {"k27": k27}
    exec(AGENTS_SRC, ns)
    return ns["trimes"]


def owner_rule23(a, b, c):
    ns = {"a": a, "b": b, "c": c}
    exec(RULE23_SRC, ns)
    return ns["ctr"], ns["rem"], ns["c_rev"]


def owner_forward_body(a, b, c):
    """trijection.py:55-56 on one triple."""
    ns = {"a": a, "bb": b, "c": c, "C0": [], "SA": [], "SB": [], "REM": []}
    exec(FWD_BODY_SRC, ns)
    return ns["C0"][0], ns["SA"][0], ns["SB"][0], ns["REM"][0]


def owner_inverse_body(c0, sa, sb, rem):
    """trijection.py:62 on one tuple."""
    ns = {"c0": c0, "sa": sa, "sb": sb, "rem": rem}
    exec(INV_BODY_SRC, ns)
    return ns["a"], ns["bb"], ns["c"]


def owner_pack(SA, SB):
    """trijection.py:75-76: SA_b, SB_b."""
    ns = {"struct": struct, "SA": SA, "SB": SB}
    exec(PACK_SRC, ns)
    return ns["SA_b"], ns["SB_b"]


def owner_zero_trits(SA, SB):
    """trijection.py:84-87: (zeros, tot_tr)."""
    ns = {"to_balanced_ternary": TBT, "SA": SA, "SB": SB}
    exec(ZT_SRC, ns)
    return ns["zeros"], ns["tot_tr"]


# ---- the owner's 27-cube symmetry group, compiled from the vendored trianti.py ----
law_negate = OWNER["N"]                 # trianti.py:31  N negation  t -> -t            (= law :128)
law_rotate = OWNER["R"]                 # trianti.py:32  R rotation  (a,b,c) -> (c,a,b)  (= law :129)
law_rotate2 = OWNER["R2"]               # trianti.py:33  R2 = R(R(c)) anti-inversion     (= law :129 "R²")


# ---- test inputs ----
class SplitMix64:
    def __init__(self, seed):
        self.s = seed & M64

    def next_u64(self):
        self.s = (self.s + 0x9E3779B97F4A7C15) & M64
        z = self.s
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & M64
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & M64
        return z ^ (z >> 31)

    def next_i64(self):
        u = self.next_u64()
        return u - (1 << 64) if u >= (1 << 63) else u


def seeded_bytes(seed, n):
    g = SplitMix64(seed)
    out = bytearray()
    while len(out) < n:
        out += g.next_u64().to_bytes(8, "little")
    return bytes(out[:n])


I64_MIN, I64_MAX = -(1 << 63), (1 << 63) - 1
I64_EDGES = [I64_MIN, I64_MIN + 1, -1, 0, 1, I64_MAX - 1, I64_MAX]
U64_MAX = (1 << 64) - 1
USIZE_MAX = U64_MAX
TBT_EDGES = I64_EDGES + [121, 122, 364, 365, -364, -365, 29524, 29525]
TBT_WIDTHS = [0, 1, 2, 6, 40, 41, 42]

SETS = {
    "full": dict(trij_r=27, trij_seeded=4096, bal_r=29524, bal_seeded=4096, base_n=59048,
                 base_seeded=4096, low_r=1000, low_seeded=1024, third=list(range(27)),
                 stream_per_len=16, stream_exhaustive=True,
                 big=[(5, 299999), (6, 300000), (7, 300001), (8, 1000000), (9, 1048577)],
                 inv_seeded=2048, tbt_r=32768, tbt_seeded=4096, vs_r=29524, bytes=True),
    "fixture": dict(trij_r=3, trij_seeded=256, bal_r=40, bal_seeded=256, base_n=80, base_seeded=256,
                    low_r=40, low_seeded=64, third=[0, 1, 13, 25, 26],
                    stream_per_len=2, stream_exhaustive=False, big=[(5, 1000), (6, 1001), (7, 1002)],
                    inv_seeded=64, tbt_r=40, tbt_seeded=64, vs_r=40, bytes=False),
}


def j(xs):
    return ",".join(str(x) for x in xs)


def in_i64(v):
    return I64_MIN <= v <= I64_MAX


def trij_row(a, b, c):
    c0, sa, sb, rem = owner_forward_body(a, b, c)
    ok = "OK" if owner_inverse_body(c0, sa, sb, rem) == (a, b, c) else "FAIL"
    return "TRIJ|a=%d|b=%d|c=%d|c0=%d|sa=%d|sb=%d|rem=%d|restore=%s" % (a, b, c, c0, sa, sb, rem, ok)


def bal3_row(n):
    bt = OWNER["bal3"](n)
    r = owner_recon(bt)
    return "BAL3|n=%d|trits=%s|recon=%s" % (n, j(bt), r if in_i64(r) else "NONE")


def base3_row(n):
    return "BASE3|n=%d|digits=%s" % (n, j(OWNER["base3"](n)))


def low3_row(x):
    a = owner_loop27(x)
    b = owner_agents(x)
    if a != b:
        raise SystemExit("REFEREE|rime_27fischers.py:39-44 and rime_agents.py:46-51 differ at %d" % x)
    return "LOW3|x=%d|trits=%s" % (x, j(a))


def third_row(a, b, c):
    ctr, rem, c_rev = owner_rule23(a, b, c)
    c0, _, _, rem_t = owner_forward_body(a, b, c)
    if (ctr, rem) != (c0, rem_t):
        raise SystemExit("REFEREE|rime_27fischers.py:92 centre differs from trijection.py:55 at %d,%d,%d" % (a, b, c))
    shown = str(c_rev) if in_i64(c_rev) else "NONE"
    return "THIRD|a=%d|b=%d|c=%d|ctr=%d|rem=%d|c_rev=%s|exact=%s" % (
        a, b, c, ctr, rem, shown, "OK" if c_rev == c else "FAIL")


CUBE = OWNER["cube27"]()


def cube_row(i):
    cell = CUBE[i]
    sep = sum(1 for t in cell if t != 0)                # law :25, trijection.py:25
    # N, R and R2 are the owner's trianti.py:31-33, each over every cell (R2 is the anti-inversion)
    return "CUBE|i=%d|cell=%s|sep=%d|N=%d|R=%d|R2=%d" % (
        i, j(cell), sep, CUBE.index(law_negate(cell)),
        CUBE.index(law_rotate(cell)), CUBE.index(law_rotate2(cell)))


def streams_sha256(C0, SA, SB, REM):
    SA_b, SB_b = owner_pack(SA, SB)
    h = hashlib.sha256()
    h.update(bytes(C0))
    h.update(SA_b)
    h.update(SB_b)
    h.update(bytes(REM))
    return h.hexdigest()


def stream_row(data):
    C0, SA, SB, REM, tot, pad = FORWARD(data)
    zeros, trits = owner_zero_trits(SA, SB)
    ok = "OK" if INVERSE(C0, SA, SB, REM, tot, pad) == bytes(data) else "FAIL"
    return "STREAM|len=%d|data=%s|c0=%s|sa=%s|sb=%s|rem=%s|total_len=%d|pad=%d|zeros=%d|trits=%d|restore=%s" % (
        len(data), j(data), j(C0), j(SA), j(SB), j(REM), tot, pad, zeros, trits, ok)


def stream_big_row(seed, n):
    data = seeded_bytes(seed, n)
    C0, SA, SB, REM, tot, pad = FORWARD(data)
    zeros, trits = owner_zero_trits(SA, SB)
    ok = "OK" if INVERSE(C0, SA, SB, REM, tot, pad) == data else "FAIL"
    return ("STREAM_BIG|seed=%d|len=%d|total_len=%d|pad=%d|sha256=%s|zeros=%d|trits=%d|rem0=%d|rem1=%d|rem2=%d|restore=%s"
            % (seed, n, tot, pad, streams_sha256(C0, SA, SB, REM), zeros, trits,
               REM.count(0), REM.count(1), REM.count(2), ok))


def inv_row(c0, sa, sb, rem, total_len, pad):
    try:
        out = j(INVERSE(bytearray(c0), list(sa), list(sb), bytearray(rem), total_len, pad))
    except ValueError:
        out = "ERR"
    return "INV|c0=%s|sa=%s|sb=%s|rem=%s|total_len=%d|pad=%d|out=%s" % (
        j(c0), j(sa), j(sb), j(rem), total_len, pad, out)


def inv_edges():
    v = [([], [], [], [], 0, 0), ([], [], [], [], 0, 2), ([], [], [], [], 3, 2), ([], [], [], [], 5, 0)]
    for t, p in [(6, 0), (6, 1), (6, 2), (4, 0), (9, 0), (1, 3), (0, 1), (2, 5), (0, 7), (0, 0), (5, 5), (3, 9)]:
        v.append(([10, 20], [1, -1], [0, 2], [0, 1], t, p))
    v += [
        ([10, 20], [1], [0, 2], [0, 1], 6, 0),
        ([10], [1, -1], [0, 2], [0, 1, 2], 6, 0),
        ([255], [1], [0], [0], 3, 0),
        ([0], [-1], [0], [0], 3, 0),
        ([0], [0], [0], [0], 3, 0),
        ([0], [1], [0], [0], 3, 0),
        ([5], [0], [0], [200], 3, 0),
        ([100], [-100], [155], [0], 3, 0),
        ([1, 255], [0, 1], [0, 0], [0, 0], 6, 0),
        ([0], [0], [0], [0], USIZE_MAX, 0),
        ([0], [0], [0], [0], 0, USIZE_MAX),
        ([7, 8, 9], [0, 0, 0], [0, 0, 0], [0, 0, 0], USIZE_MAX, USIZE_MAX),
        ([7, 8, 9], [0, 0, 0], [0, 0, 0], [0, 0, 0], 3, 5),
        ([0], [-32768], [32767], [0], 3, 0),
    ]
    return v


def inv_seeded(count):
    g = SplitMix64(20)
    v = []
    for i in range(count):
        if i % 2 == 0:
            n_c0, n_sa, n_sb, n_rem = (g.next_u64() % 5 for _ in range(4))
            c0 = [g.next_u64() % 256 for _ in range(n_c0)]
            sa = [g.next_u64() % 601 - 300 for _ in range(n_sa)]
            sb = [g.next_u64() % 601 - 300 for _ in range(n_sb)]
            rem = [g.next_u64() % 256 for _ in range(n_rem)]
            total_len = g.next_u64() % 16
            pad = g.next_u64() % 6
            v.append((c0, sa, sb, rem, total_len, pad))
        else:
            n = g.next_u64() % 13
            seed = g.next_u64()
            C0, SA, SB, REM, _, _ = FORWARD(seeded_bytes(seed, n))
            total_len = g.next_u64() % 16
            pad = g.next_u64() % 6
            v.append((list(C0), SA, SB, list(REM), total_len, pad))
    return v


def tbt_row(n, digits):
    return "TBT|n=%d|digits=%d|trits=%s" % (n, digits, j(TBT(n, digits)))


def tbt_vs_bal3_row(digits, r):
    values = list_eq = padded_eq = low_eq = 0
    for n in range(-r, r + 1):
        values += 1
        t = TBT(n, digits)
        b = OWNER["bal3"](n)
        list_eq += t == b
        padded_eq += len(b) <= digits and t == b + [0] * (digits - len(b))
        low_eq += t == (b + [0] * digits)[:digits]
    return "TBT_VS_BAL3|digits=%d|from=%d|to=%d|values=%d|list_equal=%d|padded_equal=%d|low_equal=%d" % (
        digits, -r, r, values, list_eq, padded_eq, low_eq)


def tbt_vs_low3_row(r):
    values = eq = 0
    for n in range(-r, r + 1):
        values += 1
        eq += TBT(n, 3) == owner_loop27(n) == owner_agents(n)
    return "TBT_VS_LOW3|from=%d|to=%d|values=%d|equal=%d" % (-r, r, values, eq)


_BC = bytes(b for b in range(256) for _ in range(256))
_CC = bytes(range(256)) * 256


def byte_triples_of(a):
    buf = bytearray(3 * 65536)
    buf[0::3] = bytes([a]) * 65536
    buf[1::3] = _BC
    buf[2::3] = _CC
    return bytes(buf)


def bytes_chunk(a):
    """Every triple (a, b, c), b, c in 0..=255, through the original forward and inverse."""
    data = byte_triples_of(a)
    C0, SA, SB, REM, tot, pad = FORWARD(data)
    back = INVERSE(C0, SA, SB, REM, tot, pad)
    if back == data:
        ok = 65536
    else:
        ok = sum(1 for i in range(65536) if back[3 * i:3 * i + 3] == data[3 * i:3 * i + 3])
    rems = (REM.count(0), REM.count(1), REM.count(2))
    row = "BYTES|a=%d|n=%d|total_len=%d|pad=%d|sha256=%s|rem0=%d|rem1=%d|rem2=%d|restore_ok=%d" % (
        a, len(data), tot, pad, streams_sha256(C0, SA, SB, REM), rems[0], rems[1], rems[2], ok)
    return row, ok, rems


def bal3_edges():
    v = list(I64_EDGES)
    h = 0
    for _ in range(39):
        h = 3 * h + 1
        v += [h, h + 1, -h, -h - 1]
    return v


def base3_edges():
    v = [0, 1, 2, 3, U64_MAX - 1, U64_MAX]
    p = 1
    for _ in range(40):
        p *= 3
        v += [p - 1, p]
    return v


BYTES_TOTAL = {}


def rows(name):
    s = SETS[name]
    yield "TERNARY_ROWS|set=%s" % name
    r = s["trij_r"]
    for a in range(-r, r + 1):
        for b in range(-r, r + 1):
            for c in range(-r, r + 1):
                yield trij_row(a, b, c)
    for a in I64_EDGES:
        for b in I64_EDGES:
            for c in I64_EDGES:
                yield trij_row(a, b, c)
    g = SplitMix64(1)
    for _ in range(s["trij_seeded"]):
        a = g.next_i64()
        b = g.next_i64()
        c = g.next_i64()
        yield trij_row(a, b, c)
    for n in range(-s["bal_r"], s["bal_r"] + 1):
        yield bal3_row(n)
    for n in bal3_edges():
        yield bal3_row(n)
    g = SplitMix64(2)
    for _ in range(s["bal_seeded"]):
        yield bal3_row(g.next_i64())
    for n in range(0, s["base_n"] + 1):
        yield base3_row(n)
    for n in base3_edges():
        yield base3_row(n)
    g = SplitMix64(3)
    for _ in range(s["base_seeded"]):
        yield base3_row(g.next_u64())
    for x in range(-s["low_r"], s["low_r"] + 1):
        yield low3_row(x)
    g = SplitMix64(4)
    for _ in range(s["low_seeded"]):
        yield low3_row(g.next_i64())
    for a in s["third"]:
        for b in s["third"]:
            for c in s["third"]:
                yield third_row(a, b, c)
    for i in range(27):
        yield cube_row(i)
    for n in range(0, 13):
        yield stream_row(bytes(n))
        yield stream_row(b"\xff" * n)
        for k in range(s["stream_per_len"]):
            yield stream_row(seeded_bytes(1000 + 100 * n + k, n))
    if s["stream_exhaustive"]:
        for a in range(256):
            yield stream_row(bytes([a]))
        for a in range(256):
            for b in range(256):
                yield stream_row(bytes([a, b]))
    for seed, n in s["big"]:
        yield stream_big_row(seed, n)
    for k in inv_edges():
        yield inv_row(*k)
    for k in inv_seeded(s["inv_seeded"]):
        yield inv_row(*k)
    for n in range(-s["tbt_r"], s["tbt_r"] + 1):
        yield tbt_row(n, 6)
    for n in TBT_EDGES:
        for d in TBT_WIDTHS:
            yield tbt_row(n, d)
    g = SplitMix64(30)
    for _ in range(s["tbt_seeded"]):
        yield tbt_row(g.next_i64(), 41)
    yield tbt_vs_bal3_row(3, s["vs_r"])
    yield tbt_vs_bal3_row(6, s["vs_r"])
    yield tbt_vs_low3_row(s["vs_r"])
    if s["bytes"]:
        cases = ok = 0
        rems = [0, 0, 0]
        for a in range(256):
            row, k, r3 = bytes_chunk(a)
            yield row
            cases += 65536
            ok += k
            for i in range(3):
                rems[i] += r3[i]
        row = "TRIJ_BYTES|cases=%d|restore_ok=%d|rem0=%d|rem1=%d|rem2=%d" % (cases, ok, rems[0], rems[1], rems[2])
        BYTES_TOTAL["row"] = row
        yield row


def law_counts():
    """The law's countable statements (:24-25, :131-139) through the owner's trianti.py N/R/R2
    (:31-33), on the owner's cube27() cells."""
    out = []
    by_sep = [0, 0, 0, 0]
    for cell in CUBE:
        by_sep[sum(1 for t in cell if t != 0)] += 1
    out.append(("CUBE_SEPARATION|centre=%d|faces=%d|edges=%d|corners=%d" % tuple(by_sep), by_sep == [1, 6, 12, 8]))
    nn = sum(1 for c in CUBE if law_negate(law_negate(c)) == c)
    rrr = sum(1 for c in CUBE if law_rotate(law_rotate(law_rotate(c))) == c)
    r2_is_rr = sum(1 for c in CUBE if law_rotate2(c) == law_rotate(law_rotate(c)))
    r_eq_r2 = sum(1 for c in CUBE if law_rotate(c) == law_rotate2(c))
    fixed_r = [c for c in CUBE if law_rotate(c) == c]
    seen = set()
    sizes = {}
    for c in CUBE:
        if c in seen:
            continue
        orbit = [c]
        x = law_rotate(c)
        while x != c:
            orbit.append(x)
            x = law_rotate(x)
        seen.update(orbit)
        sizes[len(orbit)] = sizes.get(len(orbit), 0) + 1
    fixed_all = [c for c in CUBE if law_negate(c) == c and law_rotate(c) == c]
    out.append(("TRIANTI|NN_id=%d/27|RRR_id=%d/27|R2_eq_RR=%d/27|R_eq_R2=%d/27|R_fixed=%s|orbits=1:%d,3:%d|group_fixed=%s" % (
        nn, rrr, r2_is_rr, r_eq_r2, ";".join(j(c) for c in fixed_r), sizes.get(1, 0), sizes.get(3, 0),
        ";".join(j(c) for c in fixed_all)),
        nn == 27 and rrr == 27 and r2_is_rr == 27 and r_eq_r2 == 3
        and fixed_r == [(-1, -1, -1), (0, 0, 0), (1, 1, 1)]
        and sizes == {1: 3, 3: 8} and fixed_all == [(0, 0, 0)]))
    centre = CUBE.index((0, 0, 0))
    out.append(("CUBE_CENTRE|glyph=%d" % centre, centre == 13))
    return out


WANT_BYTES = "TRIJ_BYTES|cases=16777216|restore_ok=16777216|rem0=5592406|rem1=5592405|rem2=5592405"


def import_trianti_module():
    spec = importlib.util.spec_from_file_location("trianti", TRIANTI)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)          # top level only: imports, T, CELLS and the defs; __main__ is guarded
    return mod


def trianti_report():
    """Run the owner's trianti.py report() from the vendored module, quote its output, and check
    the counts it prints against the referee's own, computed over the owner's cube27() cells."""
    mod = import_trianti_module()
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        mod.report()
    print("OWNER_OUTPUT|begin|trianti.py report() (owner's cube-symmetry counts, printed by the owner's code)")
    sys.stdout.write(buf.getvalue())
    print("OWNER_OUTPUT|end")
    order_n = mod.order(mod.N)
    order_r = mod.order(mod.R)
    center_fixed = mod.N((0, 0, 0)) == (0, 0, 0) and mod.R((0, 0, 0)) == (0, 0, 0)
    r_ne_anti = any(mod.R(c) != mod.R2(c) for c in mod.CELLS)
    pie = all(mod.R(mod.R2(c)) == c for c in mod.CELLS)
    group_fixed = [c for c in mod.CELLS if mod.N(c) == c and mod.R(c) == c and mod.R2(c) == c]
    ok = (order_n == 2 and order_r == 3 and center_fixed and r_ne_anti and pie
          and group_fixed == [(0, 0, 0)])
    return ("TRIANTI_REPORT|order_N=%d|order_R=%d|center_fixed=%s|R_ne_anti=%s|pie_closes=%s|group_fixed=%s" % (
        order_n, order_r, center_fixed, r_ne_anti, pie, ";".join(j(c) for c in group_fixed)), ok)


def check(rust_path):
    bad = 0
    print("UPSTREAM_SHA256|trijection.py=%s|OK" % TRIJ_SHA256)
    print("UPSTREAM_SHA256|trianti.py=%s|OK" % TRIANTI_SHA256)
    for path, n, text in EXPECT_TEXT:
        got = read_lines(path)[n - 1]
        if got != text:
            print("VERBATIM|FAIL|%s:%d|got=%r" % (os.path.relpath(path, HERE), n, got))
            bad += 1
    print("VERBATIM|lines=%d|fail=%d" % (len(EXPECT_TEXT), bad))
    with open(FIXTURE, "r", encoding="utf-8") as f:
        want = f.read()
    fresh = "".join(r + "\n" for r in rows("fixture"))
    same = fresh == want
    print("FIXTURE|rows=%d|equal=%s" % (fresh.count("\n"), "OK" if same else "FAIL"))
    bad += 0 if same else 1
    for row, ok in law_counts():
        print("%s|%s" % (row, "OK" if ok else "FAIL"))
        bad += 0 if ok else 1
    row, ok = trianti_report()
    print("%s|%s" % (row, "OK" if ok else "FAIL"))
    bad += 0 if ok else 1
    if rust_path:
        n = 0
        first = None
        with open(rust_path, "r", encoding="utf-8") as f:
            got_rows = (line.rstrip("\n") for line in f)
            for want_row in rows("full"):
                got_row = next(got_rows, None)
                n += 1
                if got_row != want_row and first is None:
                    first = (n, want_row, got_row)
            extra = sum(1 for _ in got_rows)
        if first is None and extra == 0:
            print("RUST_STREAM|rows=%d|equal=OK" % n)
        else:
            print("RUST_STREAM|rows=%d|equal=FAIL|extra=%d|first=%r" % (n, extra, first))
            bad += 1
        row = BYTES_TOTAL.get("row", "")
    else:
        cases = ok = 0
        rems = [0, 0, 0]
        for a in range(256):
            _, k, r3 = bytes_chunk(a)
            cases += 65536
            ok += k
            for i in range(3):
                rems[i] += r3[i]
        row = "TRIJ_BYTES|cases=%d|restore_ok=%d|rem0=%d|rem1=%d|rem2=%d" % (cases, ok, rems[0], rems[1], rems[2])
    good = row == WANT_BYTES
    print("%s|via=trijection.py:50-64|%s" % (row, "OK" if good else "FAIL"))
    bad += 0 if good else 1
    print("REFEREE|fail=%d|%s" % (bad, "OK" if bad == 0 else "FAIL"))
    return 0 if bad == 0 else 1


# ---- --measure: the owner's __main__ cases, float lane run as written, plus integer counts ----

# The law's measurement rows (TRIJECTION-BALANCED-TERNARY.md), each with the case name of
# trijection.py's __main__ (:104-107, :129) it belongs to. The law's "random" (:40) is the case
# its table (:34) calls "chaos (random)".
LAW_ROWS = [
    (33, "gradient(correlated)", "order0_raw", "5.8638"),
    (33, "gradient(correlated)", "order0_tri", "6.9516"),
    (33, "gradient(correlated)", "order0_verdict", "no save"),
    (34, "chaos(random)", "order0_raw", "7.9994"),
    (34, "chaos(random)", "order0_tri", "8.3035"),
    (34, "chaos(random)", "order0_verdict", "no save"),
    (35, "english(text)", "order0_raw", "5.0404"),
    (35, "english(text)", "order0_tri", "6.6006"),
    (35, "english(text)", "order0_verdict", "no save"),
    (36, "rustcode", "order0_raw", "4.9768"),
    (36, "rustcode", "order0_tri", "6.6586"),
    (36, "rustcode", "order0_verdict", "no save"),
    (40, "english(text)", "zero_trit", "0.602"),
    (40, "rustcode", "zero_trit", "0.609"),
    (40, "chaos(random)", "zero_trit", "0.460"),
    (46, "aligned-vantages(shared center)", "order0_raw", "7.4752"),
    (46, "aligned-vantages(shared center)", "order0_tri", "3.8966"),
    (46, "aligned-vantages(shared center)", "order0_delta", "−3.5786"),
    (46, "aligned-vantages(shared center)", "order0_verdict", "SAVES"),
    (47, "aligned-vantages(shared center)", "lzma_raw", "0.1780"),
    (47, "aligned-vantages(shared center)", "lzma_tri", "0.1188"),
    (47, "aligned-vantages(shared center)", "lzma_delta", "−0.0592"),
    (47, "aligned-vantages(shared center)", "lzma_verdict", "SAVES"),
    (48, "aligned-vantages(shared center)", "zero_trit", "0.900"),
    (49, "aligned-vantages(shared center)", "restore", "OK"),
]
CASE_FILES = {"gradient(correlated)": "k_gradient.bin", "chaos(random)": "chaos1m.bin",
              "english(text)": "enwik8", "rustcode": "code1m.bin"}
# sha256 of the inputs measure() received, recorded 2026-10-18 on Python 3.13.16 / glibc: the two
# __main__ generates (:122-128 with math.sin, :134; a different libm sin would show here) and
# enwik8[:300000] (enwik8 sha256 2b49720e...).
INPUT_SHA256 = {
    "aligned-vantages(shared center)": "b44651aab687998695c105f5b6230e85edb8c7e26521d4f1831a7f5407a39355",
    "same bytes, alignment DESTROYED (control)": "8b21737b54aa538580bb497e90fedcd87ff95a22c62cf071afba9dc365b90246",
    "english(text)": "11f09c9fa72b74b4fd0c8c1596a3d84d122574db23280b29acd1ded1d8400c2b",
}

RE_HEAD = re.compile(r"^\[(.*)\]  N=([0-9,]+)  restore=(OK|FAIL)$")
RE_O0 = re.compile(r"^   order-0 bpc  raw=(\S+)  trijection=(\S+)  delta=(\S+)  (<-- SAVES|\(no save\))$")
RE_LZ = re.compile(r"^   lzma  bpc    raw=(\S+)  trijection=(\S+)  delta=(\S+)  (<-- SAVES|\(no save\))$")
RE_ZT = re.compile(r"^   balanced-ternary zero-trit fraction of separations = (\S+)  ")
RE_SKIP = re.compile(r"^\[(.*)\] skipped: (.*)$")


def parse_owner_output(text):
    """Strings the owner's measure() printed, per case name (no number is converted)."""
    cases = {}
    cur = None
    for line in text.split("\n"):
        m = RE_HEAD.match(line)
        if m:
            cur = cases.setdefault(m.group(1), {})
            cur["restore"] = m.group(3)
            continue
        m = RE_SKIP.match(line)
        if m:
            cases[m.group(1)] = {"skipped": m.group(2)}
            cur = None
            continue
        if cur is None:
            continue
        for rx, key in ((RE_O0, "order0"), (RE_LZ, "lzma")):
            m = rx.match(line)
            if m:
                cur[key + "_raw"], cur[key + "_tri"], cur[key + "_delta"] = m.group(1), m.group(2), m.group(3)
                cur[key + "_verdict"] = "SAVES" if m.group(4) == "<-- SAVES" else "no save"
        m = RE_ZT.match(line)
        if m:
            cur["zero_trit"] = m.group(1)
    return cases


def gcd(a, b):
    while b:
        a, b = b, a % b
    return a


def frac(n, d):
    """Exact n/d, reduced; the sign on the numerator."""
    if d == 0:
        return "%d/0" % n
    g = gcd(abs(n), d) or 1
    return "%d/%d" % (n // g, d // g)


def fixed(n, d, places):
    """n/d as a fixed-point integer at scale 10^places, rounded half away from zero."""
    m = abs(n)
    q = (2 * m * 10 ** places + d) // (2 * d)
    return -q if n < 0 else q


def decimal_scaled(s):
    """A decimal string of the law, as (integer, 10^places); U+2212 minus read as '-'."""
    s = s.replace("−", "-")
    neg = s.startswith("-")
    s = s.lstrip("+-")
    whole, _, part = s.partition(".")
    v = int(whole + part)
    return (-v if neg else v), 10 ** len(part)


def within_half_unit(num, den, law):
    """|num/den - law| <= 1/2 unit in the law's last decimal place, in integers."""
    v, scale = decimal_scaled(law)
    return abs(2 * scale * num - 2 * v * den) <= den


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") + ".bin"


def import_owner_module():
    spec = importlib.util.spec_from_file_location("trijection", TRIJ)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)          # top level only: __name__ is "trijection"
    return mod


def measure(sc_dir, write_dir, rust_measure):
    bad = 0
    mod = import_owner_module()
    got = []

    def recording_measure(name, data):
        got.append((name, bytes(data)))
        return mod.measure(name, data)

    ns = dict(vars(mod))
    ns["SC"] = os.path.join(os.path.abspath(sc_dir), "")
    ns["measure"] = recording_measure
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(compile(line_block(TRIJ, 102, 135), TRIJ, "exec"), ns)
    owner_text = buf.getvalue()
    print("OWNER_OUTPUT|begin|trijection.py:102-135 with SC=%s (owner float lane, printed by the owner's code)" % ns["SC"])
    sys.stdout.write(owner_text)
    print("OWNER_OUTPUT|end")
    printed = parse_owner_output(owner_text)
    ints = {}
    for name, data in got:
        N = len(data)
        C0, SA, SB, REM, tot, pad = FORWARD(data)
        ok = INVERSE(C0, SA, SB, REM, tot, pad) == data
        SA_b, SB_b = owner_pack(SA, SB)
        lz_raw = mod.lz(data)
        lz_parts = [mod.lz(C0), mod.lz(SA_b), mod.lz(SB_b), mod.lz(REM)]
        lz_tri = sum(lz_parts)
        zeros, trits = owner_zero_trits(SA, SB)
        digest = hashlib.sha256(data).hexdigest()
        ints[name] = dict(N=N, restore="OK" if ok else "FAIL", zeros=zeros, trits=trits,
                          lz_raw=lz_raw, lz_tri=lz_tri,
                          streams=streams_sha256(C0, SA, SB, REM), tot=tot, pad=pad)
        # _e3 / _e4: fixed point at scale 10^3 / 10^4 (the places measure() prints), rounded half
        # away from zero, computed from the integer counts
        print("MEASURE|case=%s|n=%d|input_sha256=%s|total_len=%d|pad=%d|restore=%s|zeros=%d|trits=%d|zero_trit=%s"
              "|zero_trit_e3=%d|lz_raw=%d|lz_c0=%d|lz_sa=%d|lz_sb=%d|lz_rem=%d|lz_tri=%d|lzma_bpc_raw=%s|lzma_bpc_tri=%s"
              "|lzma_bpc_delta=%s|lzma_bpc_raw_e4=%d|lzma_bpc_tri_e4=%d|lzma_bpc_delta_e4=%d|streams_sha256=%s" % (
                  name, N, digest, tot, pad, "OK" if ok else "FAIL", zeros, trits, frac(zeros, trits),
                  fixed(zeros, trits, 3), lz_raw, lz_parts[0], lz_parts[1], lz_parts[2], lz_parts[3], lz_tri,
                  frac(8 * lz_raw, N), frac(8 * lz_tri, N), frac(8 * (lz_tri - lz_raw), N),
                  fixed(8 * lz_raw, N, 4), fixed(8 * lz_tri, N, 4), fixed(8 * (lz_tri - lz_raw), N, 4),
                  ints[name]["streams"]))
        bad += 0 if ok else 1
        want = INPUT_SHA256.get(name)
        if want is not None and want != digest:
            print("MEASURE|case=%s|input_sha256=%s|recorded=%s|FAIL" % (name, digest, want))
            bad += 1
        if write_dir:
            os.makedirs(write_dir, exist_ok=True)
            with open(os.path.join(write_dir, slug(name)), "wb") as f:
                f.write(data)
    law = read_lines(LAW)
    counts = {"reproduced": 0, "not_reproduced": 0, "not_runnable": 0}
    for line_no, case, qty, law_s in LAW_ROWS:
        if law_s not in law[line_no - 1]:
            print("LAW|line=%d|text_missing=%r|FAIL" % (line_no, law_s))
            bad += 1
            continue
        p = printed.get(case, {})
        if case not in printed or "skipped" in p:
            why = p.get("skipped", "case not run")
            print("LAW|line=%d|case=%s|quantity=%s|law=%s|owner_printed=skipped|result=not_runnable|input=%s|%s" % (
                line_no, case, qty, law_s, CASE_FILES.get(case, "?"), why))
            counts["not_runnable"] += 1
            continue
        owner_s = p.get(qty, "?")
        same = owner_s == law_s.replace("−", "-")
        extra = ""
        it = ints.get(case)
        if it and qty == "zero_trit":
            extra = "|integer=%s|law_within_half_unit=%s" % (
                frac(it["zeros"], it["trits"]), "YES" if within_half_unit(it["zeros"], it["trits"], law_s) else "NO")
        elif it and qty in ("lzma_raw", "lzma_tri", "lzma_delta"):
            num = 8 * {"lzma_raw": it["lz_raw"], "lzma_tri": it["lz_tri"],
                       "lzma_delta": it["lz_tri"] - it["lz_raw"]}[qty]
            extra = "|integer=%s|law_within_half_unit=%s" % (
                frac(num, it["N"]), "YES" if within_half_unit(num, it["N"], law_s) else "NO")
        elif it and qty == "restore":
            extra = "|integer_restore=%s" % it["restore"]
        result = "reproduced" if same else "not_reproduced"
        counts[result] += 1
        # a runnable row that does not reproduce, or an integer count the law's decimal does not
        # round from, fails the run (both are printed in full)
        bad += 0 if same and "=NO" not in extra else 1
        print("LAW|line=%d|case=%s|quantity=%s|law=%s|owner_printed=%s|result=%s%s" % (
            line_no, case, qty, law_s, owner_s, result, extra))
    print("LAW_ROWS|rows=%d|reproduced=%d|not_reproduced=%d|not_runnable=%d" % (
        len(LAW_ROWS), counts["reproduced"], counts["not_reproduced"], counts["not_runnable"]))
    if rust_measure:
        want_rows = []
        for name, _ in got:
            it = ints[name]
            want_rows.append("MEASURE_RUST|file=%s|n=%d|total_len=%d|pad=%d|streams_sha256=%s|zeros=%d|trits=%d|restore=%s" % (
                slug(name), it["N"], it["tot"], it["pad"], it["streams"], it["zeros"], it["trits"], it["restore"]))
        with open(rust_measure, "r", encoding="utf-8") as f:
            have = sorted(line.rstrip("\n") for line in f if line.strip())
        same = have == sorted(want_rows)
        print("RUST_MEASURE|rows=%d|equal=%s" % (len(want_rows), "OK" if same else "FAIL"))
        if not same:
            for w in sorted(want_rows):
                if w not in have:
                    print("RUST_MEASURE|want=%s" % w)
            bad += 1
    print("MEASURE_REFEREE|fail=%d|%s" % (bad, "OK" if bad == 0 else "FAIL"))
    return 0 if bad == 0 else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--emit-fixture", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--rust", default=None, help="file written by `cargo run --example emit full`")
    ap.add_argument("--measure", action="store_true")
    ap.add_argument("--sc", default=None, help="directory holding the owner's input file names")
    ap.add_argument("--write-inputs", default=None)
    ap.add_argument("--rust-measure", default=None, help="file written by `cargo run --example emit measure ...`")
    a = ap.parse_args()
    if a.emit_fixture:
        out = sys.stdout
        for r in rows("fixture"):
            out.write(r + "\n")
        return 0
    if a.check:
        return check(a.rust)
    if a.measure:
        if not a.sc:
            ap.error("--measure needs --sc DIR")
        return measure(a.sc, a.write_inputs, a.rust_measure)
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
