"""Stdlib referee for the vendored hp_mix.rs (asolaria-cube-cloud@f91bb2c, blob b1839f82).

Mirrors the upstream Rust line by line (u32 wrapping where the Rust uses u32 or wrapping_mul),
runs compress and decompress on the test inputs, and writes tests/fixtures/hp-mix.hbp.
Integers only. `--check` regenerates the fixture in memory and compares it with the committed file.

    python3 -I tools/hp_mix_referee.py           # write tests/fixtures/hp-mix.hbp
    python3 -I tools/hp_mix_referee.py --check   # exit 1 on any difference
"""

import hashlib
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HP_MIX_RS = os.path.join(ROOT, "vendor", "asolaria-cube-cloud", "hutter", "variants", "mix", "hp_mix.rs")
HRM_LICENSE = os.path.join(ROOT, "vendor", "HRM", "LICENSE")
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "hp-mix.hbp")

M32 = 0xFFFF_FFFF

# hp_mix.rs:27-31
SQUASH_T = [
    1, 2, 3, 6, 10, 16, 27, 45, 73, 120, 194, 310, 488, 747, 1101, 1546, 2047,
    2549, 2994, 3348, 3607, 3785, 3901, 3975, 4022, 4050, 4068, 4079, 4085,
    4089, 4092, 4093, 4094,
]


def squash(d):
    # hp_mix.rs:25-37 (Python >> and & on negative ints match i32 arithmetic shift and two's complement)
    if d > 2047:
        return 4095
    if d < -2047:
        return 0
    w = d & 127
    idx = (d >> 7) + 16
    return (SQUASH_T[idx] * (128 - w) + SQUASH_T[idx + 1] * w + 64) >> 7


def build_stretch():
    # hp_mix.rs:39-55
    stretch = [0] * 4096
    pi = 0
    for x in range(-2047, 2048):
        p = squash(x)
        while pi <= p:
            stretch[pi] = x
            pi += 1
    while pi < 4096:
        stretch[pi] = 2047
        pi += 1
    return stretch


# hp_mix.rs:60-67
NIN = 6
O0SIZE = 256
O1SIZE = 1 << 16
HSIZE = 1 << 22
MC = 256
RATE = 4
LR_SHIFT = 12
WCLAMP = 1 << 24

STRETCH = build_stretch()


def hidx(h, node, size):
    # hp_mix.rs:94-97
    x = ((h ^ ((node * 0x9E37_79B1) & M32)) * 0x2545_F491) & M32
    return x & (size - 1)


class Model:
    def __init__(self):
        # hp_mix.rs:100-130
        self.w = [0] * (MC * NIN)
        init = 65536 // 5
        for c in range(MC):
            for i in range(5):
                self.w[c * NIN + i] = init
        self.t = [[2048] * O0SIZE, [2048] * O1SIZE, [2048] * HSIZE, [2048] * HSIZE, [2048] * HSIZE]
        self.c1 = self.c2 = self.c3 = self.c4 = 0
        self.h2 = self.h3 = self.h4 = 0
        self.idx = [0] * 5
        self.st = [0] * NIN
        self.wctx = 0
        self.pr = 2048

    def predict(self, node):
        # hp_mix.rs:133-167
        idx = self.idx
        idx[0] = node & (O0SIZE - 1)
        idx[1] = ((self.c1 << 8) | node) & (O1SIZE - 1)
        idx[2] = hidx(self.h2, node, HSIZE)
        idx[3] = hidx(self.h3, node, HSIZE)
        idx[4] = hidx(self.h4, node, HSIZE)
        t = self.t
        st = self.st
        for k in range(5):
            st[k] = STRETCH[t[k][idx[k]]]
        st[5] = 256
        self.wctx = self.c1 & (MC - 1)
        base = self.wctx * NIN
        w = self.w
        dot = 0
        for i in range(NIN):
            dot += st[i] * w[base + i]
        d = dot >> 16
        if d > 2047:
            d = 2047
        if d < -2047:
            d = -2047
        p = squash(d)
        if p < 1:
            p = 1
        if p > 4094:
            p = 4094
        self.pr = p
        return p

    def update(self, bit):
        # hp_mix.rs:170-207
        target = bit << 12
        t = self.t
        idx = self.idx
        for k in range(5):
            pr = t[k][idx[k]]
            t[k][idx[k]] = pr + ((target - pr) >> RATE)
        err = target - self.pr
        base = self.wctx * NIN
        w = self.w
        st = self.st
        for i in range(NIN):
            nw = w[base + i] + ((st[i] * err) >> LR_SHIFT)
            if nw > WCLAMP:
                nw = WCLAMP
            if nw < -WCLAMP:
                nw = -WCLAMP
            w[base + i] = nw

    def push_byte(self, b):
        # hp_mix.rs:210-227
        self.c4 = self.c3
        self.c3 = self.c2
        self.c2 = self.c1
        self.c1 = b
        self.h2 = ((self.c1 * 0x6B43_A9B5) + (((self.c2 + 1) * 0x9E37_79B1) & M32)) & M32
        self.h3 = (((self.h2 * 0x2545_F491) & M32) + (((self.c3 + 1) * 0x85EB_CA77) & M32)) & M32
        self.h4 = (((self.h3 * 0x2545_F491) & M32) + (((self.c4 + 1) * 0xC2B2_AE35) & M32)) & M32


class Encoder:
    # hp_mix.rs:233-251
    def __init__(self):
        self.x1 = 0
        self.x2 = 0xFFFF_FFFF
        self.out = bytearray()

    def encode(self, bit, p):
        rng = self.x2 - self.x1
        xmid = (self.x1 + (rng >> 12) * p) & M32
        if bit == 1:
            self.x2 = xmid
        else:
            self.x1 = (xmid + 1) & M32
        while (self.x1 ^ self.x2) & 0xFF00_0000 == 0:
            self.out.append(self.x2 >> 24)
            self.x1 = (self.x1 << 8) & M32
            self.x2 = ((self.x2 << 8) | 0xFF) & M32

    def flush(self):
        for _ in range(4):
            self.out.append(self.x1 >> 24)
            self.x1 = (self.x1 << 8) & M32


class Decoder:
    # hp_mix.rs:253-278
    def __init__(self, inp):
        self.x1 = 0
        self.x2 = 0xFFFF_FFFF
        self.x = 0
        self.inp = inp
        self.pos = 0
        for _ in range(4):
            self.x = ((self.x << 8) | self.next()) & M32

    def next(self):
        b = self.inp[self.pos] if self.pos < len(self.inp) else 0
        self.pos += 1
        return b

    def decode(self, p):
        rng = self.x2 - self.x1
        xmid = (self.x1 + (rng >> 12) * p) & M32
        bit = 1 if self.x <= xmid else 0
        if bit == 1:
            self.x2 = xmid
        else:
            self.x1 = (xmid + 1) & M32
        while (self.x1 ^ self.x2) & 0xFF00_0000 == 0:
            self.x1 = (self.x1 << 8) & M32
            self.x2 = ((self.x2 << 8) | 0xFF) & M32
            self.x = ((self.x << 8) | self.next()) & M32
        return bit


def compress(data):
    # hp_mix.rs:283-303
    m = Model()
    e = Encoder()
    archive = bytearray(len(data).to_bytes(8, "little"))
    for byte in data:
        node = 1
        for i in range(7, -1, -1):
            bit = (byte >> i) & 1
            p = m.predict(node)
            e.encode(bit, p)
            m.update(bit)
            node = (node << 1) | bit
        m.push_byte(byte)
    e.flush()
    archive += e.out
    return bytes(archive)


def decompress(archive):
    # hp_mix.rs:305-323
    n = int.from_bytes(archive[0:8], "little")
    m = Model()
    d = Decoder(archive[8:])
    out = bytearray()
    for _ in range(n):
        node = 1
        for _ in range(8):
            p = m.predict(node)
            bit = d.decode(p)
            m.update(bit)
            node = (node << 1) | bit
        byte = node & 0xFF
        out.append(byte)
        m.push_byte(byte)
    return bytes(out)


def pilot_row(mode, n_input, n_archive, roundtrip, dsrc):
    # hp_mix.rs:330-339 (integer ratio_x and bpc, 4 decimal places, truncated)
    total = n_archive + dsrc
    ratio_e4 = (n_input * 10_000) // n_archive if n_archive > 0 else 0
    bpc_e4 = (n_archive * 8 * 10_000) // n_input if n_input > 0 else 0
    return (
        f"PILOT|mode={mode}|input_bytes={n_input}|archive_bytes={n_archive}|decoder_src_bytes={dsrc}"
        f"|total_bytes={total}|ratio_x={ratio_e4 // 10_000}.{ratio_e4 % 10_000:04}"
        f"|bpc={bpc_e4 // 10_000}.{bpc_e4 % 10_000:04}|roundtrip={roundtrip}"
    )


def lcg_bytes(n):
    # Test input generator of this crate (not upstream): 64-bit LCG, top byte of each state.
    x = 0
    out = bytearray()
    for _ in range(n):
        x = (x * 6364136223846793005 + 1442695040888963407) & 0xFFFF_FFFF_FFFF_FFFF
        out.append(x >> 56)
    return bytes(out)


def cases():
    with open(HRM_LICENSE, "rb") as f:
        license_bytes = f.read()
    return [
        ("empty", b""),
        ("one-byte-A", b"A"),
        ("AB-x20", b"AB" * 20),
        ("lcg-65536", lcg_bytes(65536)),
        ("hrm-license", license_bytes),
    ]


def render():
    dsrc = os.path.getsize(HP_MIX_RS)  # hp_mix.rs:325-328 fs::metadata(file!())
    lines = [
        "# hp_mix fixture: written by tools/hp_mix_referee.py (stdlib mirror of hp_mix.rs @ cube-cloud f91bb2c).",
        "# CASE gives each input and the archive the mirror produced; PILOT is the row hp_mix verify prints;",
        "# DECOMPRESS is the row hp_mix decompress prints. Inputs: see cases() in the referee.",
        f"HPMIXFIX|upstream=asolaria-cube-cloud@f91bb2c3f0e1734e72d94542967000556f6c1c5c|path=hutter/variants/mix/hp_mix.rs|decoder_src_bytes={dsrc}|json=0",
    ]
    for name, data in cases():
        arc = compress(data)
        back = decompress(arc)
        if back != data:
            raise SystemExit(f"referee roundtrip failed for {name}")
        lines.append(
            f"CASE|name={name}|input_bytes={len(data)}|input_sha256={hashlib.sha256(data).hexdigest()}"
            f"|archive_bytes={len(arc)}|archive_sha256={hashlib.sha256(arc).hexdigest()}|json=0"
        )
        lines.append(pilot_row("verify", len(data), len(arc), 1, dsrc))
        lines.append(f"DECOMPRESS|archive_bytes={len(arc)}|output_bytes={len(back)}")
    return "\n".join(lines) + "\n"


def main():
    text = render()
    if "--check" in sys.argv[1:]:
        with open(FIXTURE, "r", encoding="utf-8") as f:
            committed = f.read()
        if committed != text:
            sys.stdout.write("hp_mix referee: tests/fixtures/hp-mix.hbp differs from the regenerated text\n")
            sys.exit(1)
        sys.stdout.write("hp_mix referee: fixture OK\n")
        return
    os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
    with open(FIXTURE, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    sys.stdout.write(text)


if __name__ == "__main__":
    main()
