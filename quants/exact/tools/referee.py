#!/usr/bin/env python3
"""Cold-lane referee for quants/exact (Python standard library only).

Recomputes the exact rungs on the owner's own test inputs from the owner's Python where the
owner wrote Python (Q-PRISM cube_absorb.py, HYPER-BECHS third-seat scripts, HYPER-BECHS
omnievent selector port) and line-by-line mirrors of the vendored Rust everywhere else, then
writes tests/fixtures/exact-lanes.hbp. The Rust tests recompute every row with the vendored code.

  python3 -I tools/referee.py            write tests/fixtures/exact-lanes.hbp
  python3 -I tools/referee.py --check    regenerate in memory and diff against the committed file
  python3 -I tools/referee.py --grid N   print N seeded random cases for examples/grid.rs
"""
import hashlib
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURE = os.path.join(HERE, "..", "tests", "fixtures", "exact-lanes.hbp")

H = "qprism-3d-slice-harness@2f48332"
D = "dbbh-coms-quant-prism@3038680"
Q = "Q-PRISM@b4a21a2"


# ---- Q-PRISM qprism/cube_absorb.py:118-140 (blob 542d6573, unchanged since 53023b6) ----------
def transcode_256_to_1024(data: bytes) -> list:
    bits = nbits = 0
    out = []
    for b in data:
        bits = (bits << 8) | b; nbits += 8
        while nbits >= 10:
            nbits -= 10
            out.append((bits >> nbits) & 0x3FF)
    if nbits:
        out.append((bits << (10 - nbits)) & 0x3FF)
    return out


def transcode_1024_to_256(symbols: list, nbytes: int) -> bytes:
    bits = nbits = 0
    out = bytearray()
    for s in symbols:
        bits = (bits << 10) | (s & 0x3FF); nbits += 10
        while nbits >= 8:
            nbits -= 8
            out.append((bits >> nbits) & 0xFF)
    return bytes(out[:nbytes])


# ---- HYPER-BECHS third-seat-2026-07-12/behcs_ladder_roundtrip.py:25-29 and 35-39 ------------
# (blob d45488aa; numpy column arithmetic written per 5-byte row with Python ints)
def word40_encode(raw: bytes) -> list:
    assert len(raw) % 5 == 0
    g = []
    for k in range(0, len(raw), 5):
        a = raw[k:k + 5]
        v = (a[0] << 32) | (a[1] << 24) | (a[2] << 16) | (a[3] << 8) | a[4]
        g += [(v >> 30) & 0x3FF, (v >> 20) & 0x3FF, (v >> 10) & 0x3FF, v & 0x3FF]
    return g


def word40_decode(g: list) -> bytes:
    b = bytearray()
    for k in range(0, len(g), 4):
        v2 = (g[k] << 30) | (g[k + 1] << 20) | (g[k + 2] << 10) | g[k + 3]
        b += bytes([(v2 >> 32) & 0xFF, (v2 >> 24) & 0xFF, (v2 >> 16) & 0xFF, (v2 >> 8) & 0xFF, v2 & 0xFF])
    return bytes(b)


# ---- HYPER-BECHS third-seat-2026-07-12/gpt-crosscheck/behcs_ladder_framed_v1.py:18-40 -------
# (blob 4c450ed0; same arithmetic, Python ints in place of numpy arrays)
def framed_encode(raw: bytes):
    orig_len = len(raw); padded = raw + (b"\x00" * ((-orig_len) % 5))
    if not padded:
        return (0, [])
    return (orig_len, word40_encode(padded))


def framed_decode(frame) -> bytes:
    orig_len, g = frame
    if len(g) % 4:
        raise ValueError("glyph count must be divisible by four")
    if any(x > 1023 for x in g):
        raise ValueError("glyph outside BEHCS-1024")
    if not g:
        if orig_len:
            raise ValueError("nonzero length with empty glyph stream")
        return b""
    raw = word40_decode(g)
    if orig_len > len(raw):
        raise ValueError("orig_len exceeds padded bytes")
    return raw[:orig_len]


# ---- HYPER-BECHS omni-event-v1/omnievent_catalog47_60d_v1.py:77-92 (blob aecd9160) ---------
# "Exact port of dbbh-coms-quant-prism derive_selector" (its own words, line 78).
def derive_selector(pid_hex: str, content: bytes) -> list:
    pid = bytes.fromhex(pid_hex)
    if len(pid) != 8:
        raise ValueError("PID must be 8 bytes / 16 hex")
    out = []
    counter = 0
    while len(out) < 60:
        digest = hashlib.sha256(pid + counter.to_bytes(4, "big") + content).digest()
        for j in range(0, 32, 2):
            out.append(((digest[j] << 8) | digest[j + 1]) & 0x3FF)
            if len(out) == 60:
                break
        counter += 1
    return out


# ---- mirrors of the vendored Rust (no owner Python exists for these lanes) ------------------
def to_symbols(data: bytes, width: int) -> list:
    # qprism-3d-slice-harness src/lib.rs:126-142 == dbbh-coms-quant-prism src/lib.rs:170-187
    out = []
    acc = n = 0
    mask = (1 << width) - 1
    for b in data:
        acc = ((acc << 8) | b) & 0xFFFFFFFF
        n += 8
        while n >= width:
            n -= width
            out.append((acc >> n) & mask)
    if n > 0:
        out.append(((acc << (width - n)) & 0xFFFFFFFF) & mask)
    return out


def from_symbols(syms: list, width: int, orig_len: int) -> bytes:
    # qprism-3d-slice-harness src/lib.rs:143-156 == dbbh-coms-quant-prism src/lib.rs:190-204
    out = bytearray()
    acc = n = 0
    for s in syms:
        acc = ((acc << width) | (s & ((1 << width) - 1))) & 0xFFFFFFFF
        n += width
        while n >= 8:
            n -= 8
            out.append((acc >> n) & 0xFF)
    return bytes(out[:orig_len])


def binary_encode(data: bytes) -> str:
    # qprism-3d-slice-harness src/lib.rs:213-219 (format!("{:08b}", b) per byte)
    return "".join(format(b, "08b") for b in data)


def binary_decode(text: str) -> bytes:
    # qprism-3d-slice-harness src/lib.rs:262-267
    raw = text.encode("ascii")
    out = bytearray()
    for k in range(0, len(raw), 8):
        a = 0
        for c in raw[k:k + 8]:
            a = ((a << 1) | (c - 0x30)) & 0xFF
        out.append(a)
    return bytes(out)


def hex_encode(data: bytes) -> str:
    # qprism-3d-slice-harness src/lib.rs:103-110 (lower-case nibbles)
    return data.hex()


def hex_decode(text: str) -> bytes:
    # qprism-3d-slice-harness src/lib.rs:111-124
    return bytes.fromhex(text)


def hyper60(data: bytes) -> list:
    # dbbh-coms-quant-prism src/lib.rs:223-232: 1024-glyphs in chunks of 60, last tuple zero-filled
    glyphs = to_symbols(data, 10)
    tuples = []
    for k in range(0, len(glyphs), 60):
        chunk = glyphs[k:k + 60]
        tuples.append(chunk + [0] * (60 - len(chunk)))
    return tuples


def from_hyper60(tuples: list, glyph_count: int, orig_len: int) -> bytes:
    # dbbh-coms-quant-prism src/lib.rs:234-247
    glyphs = [g for t in tuples for g in t][:glyph_count]
    return from_symbols(glyphs, 10, orig_len)


def fed_sha256(data: bytes) -> bytes:
    # hwinv.rs `sha256` hashes data[..min(len, TUPLE_CAP)] (carried file
    # kernel/behcs1024-60d/src/upstream/hwinv-sha256-project-60d.rs:21-27, TUPLE_CAP = 512)
    return hashlib.sha256(data[:512]).digest()


def fed_project_60d(tup: bytes) -> list:
    # asolaria-federation-1024@dc1da1a9 kernel/boot/src/hwinv.rs `project_60d`, carried
    # byte-identical as hwinv-sha256-project-60d.rs:94-116 in aether kernel/behcs1024-60d
    n = min(len(tup), 512)
    sel = []
    counter = 0
    while len(sel) < 60:
        h = fed_sha256(tup[:n] + counter.to_bytes(4, "big"))
        j = 0
        while j + 1 < 32 and len(sel) < 60:
            sel.append(((h[j] << 8) | h[j + 1]) & 0x03FF)
            j += 2
        counter += 1
    return sel


# ---- fixture inputs: every one is an owner test input ---------------------------------------
def generate(gen: str) -> bytes:
    kind, _, arg = gen.partition(":")
    if kind == "hex":
        return bytes.fromhex(arg)
    if kind == "fill":
        b, n = arg.split(":")
        return bytes([int(b, 16)]) * int(n)
    n = int(arg)
    if kind == "affine31x7":   # dbbh-coms-quant-prism tests/integration.rs:23
        return bytes(((i * 31 + 7) & 0xFF) for i in range(n))
    if kind == "knuth13":      # Q-PRISM host8/qprism_cube_host8.rs:268
        return bytes((((i * 2654435761) & 0xFFFFFFFF) >> 13) & 0xFF for i in range(n))
    if kind == "knuth11x17":   # Q-PRISM host8/dbbh_coms_quant_prism.rs:521-523
        return bytes(((((i * 2654435761) & 0xFFFFFFFF) >> 11) ^ ((i * 17) & 0xFFFFFFFF)) & 0xFF for i in range(n))
    raise ValueError(gen)


def lit(s: bytes) -> str:
    return "hex:" + s.hex()


INPUTS = [
    ("h-every-lane", H + ":src/lib.rs:735", lit(b"a frozen slice of the 3D Q-PRISM -- watched at every edge")),
    ("h-omnishannon", H + ":src/lib.rs:757", lit(b"omnishannon at every edge")),
    ("h-run-empty", H + ":src/lib.rs:805", "hex:"),
    ("h-run-x", H + ":src/lib.rs:806", lit(b"x")),
    ("h-run-living", H + ":src/lib.rs:807", lit(b"the living 3D Q-PRISM, every slice byte-identical")),
    ("h-run-ab300", H + ":src/lib.rs:808", "fill:ab:300"),
    ("h-expansion", H + ":src/lib.rs:694", lit(b"operator-authorized expansion: expand as needed and possible")),
    ("h-multicyl", H + ":src/lib.rs:780", lit(b"recombined from cloned cylinder shadows, retained nowhere")),
    ("d-ladder", D + ":src/lib.rs:727", lit(b"Asolaria shadow into the prism -- lossless re-relation, code rate 1.0")),
    ("d-rung-5to4", D + ":src/lib.rs:743", "hex:deadbeef42"),
    ("d-groupoid", D + ":src/lib.rs:752", lit(b"path independent translation across the ladder")),
    ("d-hyper-7x200", D + ":src/lib.rs:765", "fill:07:200"),
    ("d-cube", D + ":src/lib.rs:776", lit(b"a 3D object shadow")),
    ("d-system-ladder", D + ":tests/system.rs:109", lit(b"a backend room slice, re-related across the whole BEHCS ladder losslessly")),
    ("d-authentic", D + ":tests/integration.rs:60", lit(b"authentic slice")),
    ("d-ab10000", D + ":tests/integration.rs:73", "fill:ab:10000"),
] + [
    ("d-affine-%d" % n, D + ":tests/integration.rs:22-23", "affine31x7:%d" % n)
    for n in (0, 1, 4, 5, 6, 39, 40, 60, 200, 999)
] + [
    ("q-cube-tuple-3200", Q + ":host8/qprism_cube_host8.rs:268", "knuth13:3200"),
    ("q-dbbh-payload-4097", Q + ":host8/dbbh_coms_quant_prism.rs:521-523", "knuth11x17:4097"),
]

# (fixture id, PID hex) pairs the owner tests bind a selector to.
SELECTORS = [
    ("d-cube", "8467a937cba309f7"),            # dbbh src/lib.rs:774,777
    ("d-cube", "0000000000000001"),            # dbbh src/lib.rs:775,778
    ("h-expansion", "8467a937cba309f7"),       # harness src/lib.rs:693
    ("h-run-empty", "8467a937cba309f7"),       # harness src/lib.rs:803
    ("h-run-x", "8467a937cba309f7"),
    ("h-run-living", "8467a937cba309f7"),
    ("h-run-ab300", "8467a937cba309f7"),
]


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def be16(syms: list) -> bytes:
    return b"".join(s.to_bytes(2, "big") for s in syms)


def head(syms: list) -> str:
    return ".".join(str(s) for s in syms[:4])


def lane(fid, n, name, syms):
    return "LANE|id=%s|n=%d|lane=%s|count=%d|head=%s|sha256=%s|json=0" % (fid, n, name, len(syms), head(syms), sha(be16(syms)))


def text_lane(fid, n, name, text):
    return "LANE|id=%s|n=%d|lane=%s|count=%d|head=%s|sha256=%s|json=0" % (fid, n, name, len(text), text[:16], sha(text.encode("ascii")))


def rows_for(fid, src, gen):
    data = generate(gen)
    out = ["IN|id=%s|src=%s|gen=%s|len=%d|sha256=%s|json=0" % (fid, src, gen, len(data), sha(data))]
    bits = binary_encode(data)
    hx = hex_encode(data)
    s64 = to_symbols(data, 6)
    s256 = to_symbols(data, 8)
    s1024 = transcode_256_to_1024(data)
    if s1024 != to_symbols(data, 10):
        raise AssertionError("cube_absorb.py transcode and the Rust mirror differ at " + fid)
    frame = framed_encode(data)
    tuples = hyper60(data)
    out.append(text_lane(fid, 13, "binary", bits))
    out.append(text_lane(fid, 14, "hex", hx))
    out.append(lane(fid, 17, "behcs64", s64))
    out.append(lane(fid, 18, "behcs256", s256))
    out.append(lane(fid, 19, "behcs1024", s1024))
    if len(data) % 5 == 0:
        out.append(lane(fid, 19, "word40", word40_encode(data)))
    out.append(lane(fid, 19, "framed40", frame[1]))
    out.append(lane(fid, 20, "hyper60", [g for t in tuples for g in t]))
    out.append(lane(fid, 20, "fed60", fed_project_60d(data)))
    back = {
        "binary": binary_decode(bits),
        "hex": hex_decode(hx),
        "behcs64": from_symbols(s64, 6, len(data)),
        "behcs256": from_symbols(s256, 8, len(data)),
        "behcs1024": transcode_1024_to_256(s1024, len(data)),
        "framed40": framed_decode(frame),
        "hyper60": from_hyper60(tuples, len(s1024), len(data)),
    }
    if len(data) % 5 == 0:
        back["word40"] = word40_decode(word40_encode(data))
    for name, got in back.items():
        if got != data:
            raise AssertionError("decode(encode(x)) != x for %s at %s" % (name, fid))
    out.append("BACK|id=%s|lanes=%s|sha256=%s|json=0" % (fid, "+".join(back), sha(data)))
    return out


def build() -> str:
    lines = ["EXACTLANES|referee=tools/referee.py|inputs=%d|selectors=%d|json=0" % (len(INPUTS), len(SELECTORS))]
    by_id = {}
    for fid, src, gen in INPUTS:
        by_id[fid] = generate(gen)
        lines += rows_for(fid, src, gen)
    for fid, pid in SELECTORS:
        lines.append(lane(fid, 20, "selector60:" + pid, derive_selector(pid, by_id[fid])))
    return "\n".join(lines) + "\n"


def grid(count: int, seed: int) -> None:
    rng = random.Random(seed)
    lengths = list(range(66)) + [rng.randrange(1101) for _ in range(max(0, count - 66))]
    for i, n in enumerate(lengths[:count]):
        data = bytes(rng.randrange(256) for _ in range(n))
        s1024 = transcode_256_to_1024(data)
        frame = framed_encode(data)
        tuples = hyper60(data)
        print("GRID|i=%d|hex=%s|b64=%s|b256=%s|b1024=%s|framed40=%s|hyper60=%s|json=0" % (
            i, data.hex(), sha(be16(to_symbols(data, 6))), sha(be16(to_symbols(data, 8))),
            sha(be16(s1024)), sha(be16(frame[1])), sha(be16([g for t in tuples for g in t]))))


def main(argv) -> int:
    if len(argv) >= 2 and argv[1] == "--grid":
        grid(int(argv[2]), int(argv[3]) if len(argv) > 3 else 20261017)
        return 0
    text = build()
    if len(argv) >= 2 and argv[1] == "--check":
        with open(FIXTURE, "r", encoding="ascii", newline="") as f:
            committed = f.read()
        if committed != text:
            print("REFEREE|status=DIFFERENT|fixture=tests/fixtures/exact-lanes.hbp|json=0")
            return 1
        print("REFEREE|status=PASS|rows=%d|json=0" % text.count("\n"))
        return 0
    os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
    with open(FIXTURE, "w", encoding="ascii", newline="") as f:
        f.write(text)
    print("REFEREE|status=WROTE|rows=%d|json=0" % text.count("\n"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
