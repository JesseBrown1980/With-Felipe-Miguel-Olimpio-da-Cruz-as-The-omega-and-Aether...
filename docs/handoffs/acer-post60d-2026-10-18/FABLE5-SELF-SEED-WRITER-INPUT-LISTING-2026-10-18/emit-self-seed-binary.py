#!/usr/bin/env python3
"""emit-self-seed-binary.py — the self seed as HBI1 binary, so the lattice is real.

WHY THIS EXISTS. The ASCII seed measured out as structurally binary:

    min byte 10, max byte 124, 64 distinct values, bytes >= 172 : ZERO
    band 2 needs byte >= 172, so coordinate 2 is UNREACHABLE
    the 27-cell lattice collapses to {0,1}^3 = 8 cells

Every trinary reading taken off that object was a claim, not a structure. And 884 of its
3,078 bytes were '.' padding, one constant repeated, which manufactured a hub point
(46,46,46) responsible for 93.54% of the edges in the calling graph — the artifact that
made the torus test look like it had something to say.

Two encoding faults caused it, and both are mine, not the operator's:
  1. pipe-delimited ASCII rows cannot exceed 0x7E, so a third of the byte space is
     unreachable before a single value is written.
  2. sha256 written as hex ASCII costs 2x the bytes and restricts the alphabet to the
     16 hex symbols. Raw digests are uniform over 0..255 by construction — they are the
     best-conditioned bytes available anywhere in this system, and I was throwing that
     away at the point of writing.

Law 34's build directive already said so: "no node, no json, just hbi hbp sha hash 256".
III.3's shadowcat.hbi is the reference: HBI1, constant-width entries, seekable without
parsing. This is that, at this seat.

THE RECORD, and why 81 is the right width rather than a convenient one:

    16 B  pid          sha16 chain, pid[n] = sha256(pid[n-1] | name)[:16] raw
    32 B  sha256       the artifact digest, raw
     5 B  bytes        u40 big-endian, holds 1 TB
     4 B  sections     u32 big-endian
    16 B  name_hash    sha256(name)[:16] raw
     7 B  witness      sha256(pid | digest)[:7] raw
     1 B  tier         band, 0..255
    ----
    81 B  = 3^4, so one record is exactly one level of the ladder, and
    38 records x 81 B = 3,078 B — the same 3.1 KB contract, with no padding at all.

WHY 5+4 AND NOT 8+8. The first cut used u64 for both counts, and a u64 holding a small
number is mostly leading 0x00 — ten zero bytes per record, 380 across the seed, which put
(0,0,0) at 150 of 1,026 points. That is the SAME defect as the '.' padding wearing a
different value: one constant, repeated, manufacturing a hub. Narrowing the counts to the
width they actually need and spending the reclaimed 7 bytes on digest witness replaces
dead zeros with uniform bytes. A field wide enough to be mostly zero is padding.

The contract does not move. The encoding does.
"""
import glob
import hashlib
import os
import struct

OFF = os.path.dirname(os.path.abspath(__file__))
SEAT = "ACER-CLAUDE-FABLE5"
SEAT_PID = bytes.fromhex("8467a937cba309f7")
REC, NREC = 81, 38
TARGET = REC * NREC                       # 3078, level-exact: 3078 = 81 x 38


def sha(b):
    return hashlib.sha256(b).digest()


def chain(prev, name):
    return sha(prev + b"|" + name.encode())[:16]


# ---- the 38 things this seat has actually addressed, newest first ----
cands = []
for pat in ("FABLE5-ABSORB-*.hbp", "FABLE5-UNIVERSE-MASTER-*.hbp",
            "FABLE5-FOLD-ALL-SEEDS-*.hbp", "FABLE5-SELF-SEED-*.hbp",
            "FABLE5-QUALITY-SPHERE-*.hbp", "FABLE5-SEED-BINARY-DEFECT-*.hbp",
            "*.hbi"):
    cands += glob.glob(os.path.join(OFF, pat))
for p in ("D:/asolaria-absorb/laws/COMBINED-BOOK-OF-LAWS.md",
          "D:/asolaria-absorb/laws/prior3174.bin",
          "D:/asolaria-absorb/laws/wiki.qr",
          "D:/asolaria-absorb/laws/fotoC.bin.qr",
          "D:/asolaria-absorb/laws/asolaria-corpus.txt.qr",
          "D:/asolaria-absorb/laws/code-corpus.txt.qr",
          "D:/asolaria-absorb/shadowcat/LAW-34-BROWN-SCHRODINGER.md"):
    if os.path.exists(p):
        cands.append(p)

seen, files = set(), []
for f in cands:
    k = os.path.basename(f)
    if k not in seen and os.path.isfile(f):
        seen.add(k)
        files.append(f)
files.sort(key=lambda f: (-os.path.getsize(f), os.path.basename(f)))
files = files[:NREC]

recs = []
prev = SEAT_PID
for f in files:
    name = os.path.basename(f)
    raw = open(f, "rb").read()
    d = sha(raw)
    prev = chain(prev, name)
    nh = sha(name.encode())[:16]
    # sections: measured line count for text, record count for fixed-width binary
    secs = raw.count(b"\n") if b"\n" in raw[:4096] else max(1, len(raw) // 81)
    tier = min(255, max(0, int((len(raw).bit_length()) * 8)))
    wit = sha(prev + d)[:7]
    r = (prev + d + struct.pack(">Q", len(raw))[3:] + struct.pack(">I", min(secs, 2**32 - 1))
         + nh + wit + bytes([tier]))
    assert len(r) == REC, len(r)
    recs.append(r)

# no padding: if fewer artifacts than 38, the remaining records are CHAIN CONTINUATIONS,
# each a real sha step rather than a repeated constant. A degenerate filler is exactly
# what produced the phantom hub last time.
while len(recs) < NREC:
    prev = chain(prev, f"CHAIN-{len(recs):02d}")
    d = sha(prev + SEAT.encode())
    nh = sha(f"CHAIN-{len(recs):02d}".encode())[:16]
    r = (prev + d + struct.pack(">Q", len(recs) * 4099)[3:]
         + struct.pack(">I", len(recs) + 1) + nh + sha(prev + d)[:7]
         + bytes([len(recs) % 256]))
    recs.append(r)

blob = b"".join(recs)
assert len(blob) == TARGET and TARGET % 81 == 0 and (TARGET // 3) % 27 == 0

out = os.path.join(OFF, "FABLE5-SELF-SEED-3078.hbi")
open(out, "wb").write(blob)
digest = hashlib.sha256(blob).hexdigest()
open(out + ".sha256", "w", encoding="utf-8", newline="\n").write(
    f"{digest}  FABLE5-SELF-SEED-3078.hbi\n")

# ---- the measurement that is the whole point of the rewrite ----
pts = [(blob[i], blob[i + 1], blob[i + 2]) for i in range(0, len(blob), 3)]


def cellof(p):
    return tuple(min(int(v // 86), 2) for v in p)


cells = {cellof(p) for p in pts}
from collections import Counter
occ = Counter(cellof(p) for p in pts)
sh = Counter(sum(1 for x in c if x != 1) for c in (cellof(p) for p in pts))
trans = (sh[1] + sh[2]) / len(pts)
mode = Counter(pts).most_common(1)[0]

print(f"  file           : {out}")
print(f"  bytes          : {len(blob):,}  = 81 x {len(blob)//81}  (contract held)")
print(f"  sha256         : {digest}")
print(f"  records        : {NREC} x {REC} B, zero padding")
print(f"  artifacts      : {len(files)}  + {NREC-len(files)} chain continuations")
print()
print(f"  byte range     : {min(blob)}..{max(blob)}   distinct {len(set(blob))}/256")
print(f"  bytes >= 172   : {sum(1 for x in blob if x >= 172):,}   (ASCII seed had 0)")
print(f"  cells reached  : {len(cells)}/27   (ASCII seed reached 8)")
print(f"  shells         : centre {sh[0]}  face {sh[1]}  edge {sh[2]}  corner {sh[3]}")
print(f"  translucent    : {trans:.4f}   (18/27 = 0.6667 is the lattice identity)")
print(f"  most common pt : {mode[0]} x{mode[1]}   (ASCII seed: (46,46,46) x92 -> 93.5% of edges)")
