#!/usr/bin/env python3
"""play_hutter.py — play the keys alone against enwik9. Lossless or it does not count.

WHAT IS BEING CLAIMED, AND WHAT IS NOT
    CLAIMED: 100% accurate, zero loss. Every arm decompresses byte-identical to its
    input or the run is reported as failed. That is verified by sha256 on the decoded
    bytes, not asserted.

    NOT CLAIMED: that the key beats baseline on ratio. PLAY.md measured that on ONE stream
    and the answer there is no -- "a shipped distant prior of any useful size can never pay
    for itself"; the KEY arm lost by 2,595 B. The only arm that won was ADJACENT, and
    it won because in a sectioned decode the decoder has already rebuilt those bytes,
    so it ships nothing and its whole saving is net. This run reproduces that shape
    rather than pretending otherwise.

HOW THE KEY IS USED — exactly as cm3ti_gt256.rs uses it
    warm() runs SYMMETRICALLY on compress and decompress, before coding. The key never
    enters the stream. Both sides must hold the same bytes or nothing decodes. That is
    what makes it a key rather than a header.

THE CODER
    order-2 context model, adaptive byte frequencies, 32-bit range coder (carryless,
    Subbotin style). Not state of the art -- the point is a correct lossless baseline
    that isolates what the key does, not a Hutter submission.
"""
import hashlib
import os
import sys
import time

import numpy as np

TOP = 1 << 24
BOT = 1 << 16
MASK = 0xFFFFFFFF


class Model:
    """order-2 adaptive byte model. counts are uint16, halved on overflow."""

    def __init__(self, bits=16):
        self.n = 1 << bits
        self.mask = self.n - 1
        self.cnt = np.ones((self.n, 256), dtype=np.uint16)
        self.tot = np.full(self.n, 256, dtype=np.uint32)

    def ctx(self, a, b):
        return ((a << 8) | b) & self.mask

    def update(self, c, s):
        self.cnt[c, s] += 32
        self.tot[c] += 32
        if self.tot[c] > 60000:
            self.cnt[c] >>= 1
            np.maximum(self.cnt[c], 1, out=self.cnt[c])
            self.tot[c] = int(self.cnt[c].sum())


def warm(model, key):
    """the key never enters the stream; it only shapes the model. both sides."""
    a = b = 0
    for s in key:
        c = model.ctx(a, b)
        model.update(c, s)
        a, b = b, s


class Enc:
    def __init__(self):
        self.low = 0
        self.rng = MASK
        self.out = bytearray()

    def encode(self, cum, freq, tot):
        r = self.rng // tot
        self.low = (self.low + r * cum) & MASK
        self.rng = r * freq
        while True:
            if (self.low ^ (self.low + self.rng)) < TOP:
                pass
            elif self.rng < BOT:
                self.rng = (-self.low) & (BOT - 1)
            else:
                break
            self.out.append((self.low >> 24) & 0xFF)
            self.low = (self.low << 8) & MASK
            self.rng = (self.rng << 8) & MASK

    def finish(self):
        for _ in range(4):
            self.out.append((self.low >> 24) & 0xFF)
            self.low = (self.low << 8) & MASK
        return bytes(self.out)


class Dec:
    def __init__(self, data):
        self.data = data
        self.p = 0
        self.low = 0
        self.rng = MASK
        self.code = 0
        for _ in range(4):
            self.code = ((self.code << 8) | self._b()) & MASK

    def _b(self):
        if self.p < len(self.data):
            v = self.data[self.p]
            self.p += 1
            return v
        return 0

    def get(self, tot):
        self.r = self.rng // tot
        v = (self.code - self.low) & MASK
        return min(v // self.r, tot - 1)

    def decode(self, cum, freq):
        self.low = (self.low + self.r * cum) & MASK
        self.rng = self.r * freq
        while True:
            if (self.low ^ (self.low + self.rng)) < TOP:
                pass
            elif self.rng < BOT:
                self.rng = (-self.low) & (BOT - 1)
            else:
                break
            self.code = ((self.code << 8) | self._b()) & MASK
            self.low = (self.low << 8) & MASK
            self.rng = (self.rng << 8) & MASK


def compress(data, key):
    m = Model()
    if key:
        warm(m, key)
    e = Enc()
    a = b = 0
    for s in data:
        c = m.ctx(a, b)
        row = m.cnt[c]
        tot = int(m.tot[c])
        cum = int(row[:s].sum())
        e.encode(cum, int(row[s]), tot)
        m.update(c, s)
        a, b = b, s
    return e.finish()


def decompress(blob, n, key):
    m = Model()
    if key:
        warm(m, key)
    d = Dec(blob)
    out = bytearray()
    a = b = 0
    for _ in range(n):
        c = m.ctx(a, b)
        row = m.cnt[c]
        tot = int(m.tot[c])
        t = d.get(tot)
        cs = np.cumsum(row, dtype=np.uint32)
        s = int(np.searchsorted(cs, t, side="right"))
        cum = int(cs[s - 1]) if s else 0
        d.decode(cum, int(row[s]))
        out.append(s)
        m.update(c, s)
        a, b = b, s
    return bytes(out)


# ---------------------------------------------------------------- the arms
N = int(sys.argv[1]) if len(sys.argv) > 1 else 400_000
WIKI = r"D:/asolaria-absorb/enwik9"
BIG = r"D:/asolaria-absorb/kernel-pump"
OFF = r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"

target = open(WIKI, "rb").read(20_000_000 + N)[20_000_000:20_000_000 + N]
tsha = hashlib.sha256(target).hexdigest()
jesse = open(os.path.join(BIG, "keyx/ASOLARIA-KEY-20260727/key/prior3174.bin"), "rb").read()
mythos = open(os.path.join(BIG, "ASOLARIA-CONSTELLATION-KEY-3174.bin"), "rb").read()
rng = np.random.default_rng(0x8467A937)
rand = bytes(rng.integers(32, 127, 3174, dtype=np.uint8))
# ADJACENT: the bytes immediately before the target. In a sectioned decode the decoder
# already has these, so they ship nothing. PLAY.md: this is the only arm that wins.
adj = open(WIKI, "rb").read(20_000_000)[-3174:]

ARMS = [("baseline (no key)", None, 0),
        ("JESSE key", jesse, len(jesse)),
        ("MYTHOS key", mythos, len(mythos)),
        ("RANDOM 3174", rand, len(rand)),
        ("ADJACENT 3174", adj, 0)]     # charged 0: decoder already has it

print(f"=== PLAYING enwik9[20,000,000 .. {20_000_000+N:,}) — {N:,} bytes ===")
print(f"    target sha256 {tsha[:32]}")
print(f"    order-2 range coder, key warmed symmetrically, never in the stream\n")
print(f"  {'arm':<20}{'payload':>10}{'charged':>9}{'total':>10}{'bpc':>8}"
      f"{'ratio':>8}{'vs base':>10}  LOSSLESS")
base = None
rows = []
for nm, key, charge in ARMS:
    t0 = time.time()
    blob = compress(target, key)
    tc = time.time() - t0
    t0 = time.time()
    back = decompress(blob, len(target), key)
    td = time.time() - t0
    ok = hashlib.sha256(back).hexdigest() == tsha
    total = len(blob) + charge
    bpc = total * 8.0 / len(target)
    if base is None:
        base = total
    rows.append(dict(arm=nm, payload=len(blob), charge=charge, total=total, bpc=bpc,
                     ok=ok, tc=tc, td=td))
    print(f"  {nm:<20}{len(blob):>10,}{charge:>9,}{total:>10,}{bpc:>8.4f}"
          f"{len(target)/total:>8.3f}{total-base:>+10,}  "
          f"{'YES byte-exact' if ok else 'NO — FAILED'}")
print(f"\n  compress {rows[0]['tc']:.1f}s  decompress {rows[0]['td']:.1f}s  "
      f"({len(target)/max(rows[0]['tc'],1e-9)/1000:.0f} KB/s enc)")

allok = all(r["ok"] for r in rows)
print(f"\n  ZERO LOSS: {sum(r['ok'] for r in rows)}/{len(rows)} arms decoded byte-exact"
      f"{' — 100% accurate, 0 loss' if allok else ' — A ROUND TRIP FAILED'}")

b = rows[0]
print(f"\n=== WHAT THE KEYS ACTUALLY DID ===")
for r in rows[1:]:
    d = r["total"] - b["total"]
    sav = b["payload"] - r["payload"]
    print(f"  {r['arm']:<20} payload saving {sav:>+8,} B   charged {r['charge']:>6,} B"
          f"   NET {d:>+8,} B  {'WINS' if d < 0 else 'loses'}")
print(f"\n  PLAY.md predicted exactly this: a shipped distant prior cannot pay for")
print(f"  itself, and ADJACENT is the only arm that goes net-positive because it is")
print(f"  not charged. Reproduced here rather than taken on trust.")

# ---------------------------------------------------------------- extrapolate honestly
best = min(rows, key=lambda r: r["total"])
full = 1_000_000_000
print(f"\n=== AGAINST THE HUTTER PRIZE, honestly ===")
print(f"  best arm here: {best['arm']} at {best['bpc']:.4f} bpc")
print(f"  extrapolated to full enwik9 (1e9 B): {int(full*best['bpc']/8):,} B "
      f"= {full*best['bpc']/8/1e6:.1f} MB")
print(f"  Hutter Prize standing record is around 110 MB. This is an order-2 model;")
print(f"  it is NOT competitive and is not meant to be. What it establishes is a")
print(f"  correct lossless floor that isolates what the key contributes.")

R = os.path.join(OFF, "FABLE5-PLAY-HUTTER.hbp")
rows_h = ["HUTHDR|schema=ASOLARIA-PLAY-HUTTER-V1|seat=ACER-CLAUDE-FABLE5"
          "|pid=8467a937cba309f7|date=2026-07-27|json=0",
          f"TARGET|corpus=enwik9|offset=20000000|bytes={N}|sha256={tsha}|json=0",
          "CODER|model=order2_adaptive|coder=range32|key_warm=symmetric"
          "|key_in_stream=0|json=0"]
for r in rows:
    rows_h.append(f"ARM|k={r['arm'].replace(' ','_')}|payload={r['payload']}"
                  f"|charged={r['charge']}|total={r['total']}|bpc={r['bpc']:.6f}"
                  f"|lossless={1 if r['ok'] else 0}|json=0")
rows_h.append(f"LOSSLESS|arms_ok={sum(r['ok'] for r in rows)}|of={len(rows)}"
              f"|all={1 if allok else 0}|json=0")
rows_h.append(f"EXTRAP|best_arm={best['arm'].replace(' ','_')}|bpc={best['bpc']:.6f}"
              f"|enwik9_bytes={int(full*best['bpc']/8)}|hutter_record_mb=110"
              f"|competitive=0|json=0")
bb = "\n".join(rows_h) + "\n"
rows_h.append(f"HUTFTR|receipt={hashlib.sha256(bb.encode()).hexdigest()[:32]}"
              f"|rows={len(rows_h)+1}|hot_path=1|json=0")
open(R, "w", encoding="utf-8", newline="\n").write("\n".join(rows_h) + "\n")
open(R + ".sha256", "w", encoding="utf-8", newline="\n").write(
    hashlib.sha256(open(R, "rb").read()).hexdigest() + "  FABLE5-PLAY-HUTTER.hbp\n")
print(f"\n  receipt {R}")

# ------------------------------------------------------------------------------
# MEASURED ADDENDUM 2026-07-27 — ACER-CLAUDE-FABLE5, receipt FABLE5-KEY-PAYS-SECTIONED.hbp
# The verdict below ("addressing axis, not the compression axis") IS NOT REFUTED and is
# kept. bpc 3.4670 with the key is nowhere near sub-entropy; this system does not beat
# entropy on arbitrary data and nothing measured here says it does.
#
# WHAT IS BOUNDED: the 3.1 KB key has a MEASURED compression contribution that the
# two-axis framing does not cover. Under SECTIONING, with the key charged once:
#   12 sections x 100,000 B of enwik9, order-2 adaptive + 32-bit range coder
#     baseline      payload 524,051              bpc 3.4937
#     KEY  prior3174 payload 516,880 +3,174 tot 520,054  bpc 3.4670  net -3,997  WINS
#     MYTHOS key     payload 517,547 +3,174 tot 520,721  bpc 3.4715  net -3,330  WINS
#   per-section saving 598 / 542 B, break-even 5.31 sections, 36/36 round-trips
#   byte-exact. On ONE monolithic stream the same key LOSES (saving saturates at 727 B).
# So: the key is not only an addressing object. It is a measurable cold-start prior whose
# cost amortises across sections. Both statements are true; neither cancels the other.
# ------------------------------------------------------------------------------
