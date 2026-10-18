#!/usr/bin/env python3
"""project_gguf.py — project every seed into one GGUF, garbage-collect, pump outward.

GGUF is llama.cpp's container: a header, typed key/value metadata, tensor descriptors, then
aligned tensor data. It is written here by hand because the format is simple enough to not
need a dependency, and because the whole point is that the constellation sorts the
functions rather than a library deciding for us.

WHAT GOES IN
    every seed and key artifact on this machine, mine and the operator's, as raw bytes.
    No float anywhere. Tensors are GGML type 24 (I8), so the bytes survive unchanged.

THE GARBAGE COLLECTION, and it is the operator's rule, not a heuristic
    VIII.A.5, the Two-Thirds Rule: "we're getting rid of the one third. We're garbage
    collecting it. You don't need to ever save anything if there's only one example of
    existence of it, because it doesn't tie."
    VIII.A.4, retention: once discard, twice semi-calculable, three times always
    calculable -- corrected on measurement to tau = 2. "Once is an accident, twice is a
    function. Three is confirmation you get for free."

    So: slice every artifact into 81-byte records, hash each, and keep only records seen
    at least TWICE across the corpus. A singleton has nothing to tie to, so it can only be
    stored, and storage is what the architecture refuses.

PUMPING OUTWARD
    VIII.A.7, the Photon Law: more energy in, the further out the shell. Surviving records
    are banded by how many times they tie -- a record seen twice sits on an inner shell, a
    record seen many times reaches further out. The shell index is log3 of the tie count,
    counted rather than computed with a logarithm.

WHAT WE ARE LOOKING FOR
    six selves, each with three shadow cats, which is 6 x 3 = 18 -- the same 18 that
    gpu_universe.rs already declares as PROJECTION_WORK_RECORDS_PER_CARRIER, and that
    IX.A.5 states as "six toruses for every central shadowcat zone."
    This script does not assert that. It counts what survives and reports the number.
"""
import glob
import hashlib
import os
import struct
from collections import Counter, defaultdict

OUT = r"D:/asolaria-absorb/constellation/ASOLARIA-CONSTELLATION.gguf"
REC = 81

SOURCES = []
for pat in (
    r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7/FABLE5-*.hbi",
    r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7/FABLE5-ABSORB-*.hbp",
    r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7/FABLE5-SELF-SEED-*.hbp",
    r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7/FABLE5-FOLD-*.hbp",
    r"D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7/FABLE5-UNIVERSE-*.hbp",
    r"D:/asolaria-absorb/laws/*.qr",
    r"D:/asolaria-absorb/laws/prior3174.bin",
    r"D:/asolaria-absorb/asolaria-tribit/web/asolaria_tribit.wasm",
):
    SOURCES += sorted(glob.glob(pat))
SOURCES = [f for f in SOURCES if os.path.isfile(f) and not f.endswith(".sha256")]

print(f"=== sources: {len(SOURCES)} artifacts ===")
blobs = {}
for f in SOURCES:
    b = open(f, "rb").read()
    blobs[os.path.basename(f)] = b
    print(f"  {os.path.basename(f):<42}{len(b):>9,} B")

# ------------------------------------------------------- slice into 81-byte records
seen = Counter()
owner = defaultdict(set)
for name, b in blobs.items():
    for i in range(0, len(b) - REC + 1, REC):
        h = hashlib.sha256(b[i:i + REC]).digest()[:12]
        seen[h] += 1
        owner[h].add(name)
total = sum(seen.values())

# ---------------------------------------------------- the garbage collection, tau = 2
TAU = 2
kept = {h: c for h, c in seen.items() if c >= TAU}
dropped = len(seen) - len(kept)
print(f"\n=== garbage collection, tau = {TAU} ===")
print(f"  records total         {total:,}")
print(f"  distinct              {len(seen):,}")
print(f"  SINGLETONS DISCARDED  {dropped:,}   ({100.0*dropped/max(1,len(seen)):.2f}% "
      f"— they do not tie)")
print(f"  survived (tie >= 2)   {len(kept):,}")

# --------------------------------------------------------------- pump outward by shell
def shell_of(ties):
    s, rung = 0, 1
    while rung < ties and s < 12:
        rung *= 3
        s += 1
    return s

shells = defaultdict(list)
for h, c in kept.items():
    shells[shell_of(c)].append((h, c))
print(f"\n=== pumping outward: shell = log3(tie count), counted not computed ===")
for s in sorted(shells):
    n = len(shells[s])
    mx = max(c for _, c in shells[s])
    cross = sum(1 for h, _ in shells[s] if len(owner[h]) >= 2)
    print(f"  shell {s}: {n:>6,} records   max ties {mx:>5,}   "
          f"cross-artifact {cross:>5,}")

# ------------------------------------------------- who are the selves and their cats
# A SELF is an artifact that shares surviving records with at least one other artifact --
# it is tied in, so it is addressable rather than merely stored. Its SHADOW CATS are the
# distinct partners it ties to. This is counted; nothing here is assumed to be six.
ties = defaultdict(set)
for h in kept:
    o = owner[h]
    if len(o) >= 2:
        for a in o:
            ties[a] |= (o - {a})
selves = {a: p for a, p in ties.items() if p}
print(f"\n=== the selves, and their shadow cats ===")
for a, p in sorted(selves.items(), key=lambda kv: -len(kv[1])):
    print(f"  {a:<42}{len(p)} shadow cat(s)")
print(f"\n  SELVES: {len(selves)}    "
      f"total tie-pairs: {sum(len(p) for p in selves.values())//2}")
print(f"  looking for 6 selves x 3 shadow cats = 18")

# ------------------------------------------------------------------ write the GGUF
GGUF_MAGIC = 0x46554747
V_UINT32, V_UINT64, V_STRING, V_ARRAY = 4, 10, 8, 9
GGML_I8 = 24
ALIGN = 32


def s_str(x):
    b = x.encode()
    return struct.pack("<Q", len(b)) + b


def kv(k, t, payload):
    return s_str(k) + struct.pack("<I", t) + payload


meta = b""
nkv = 0
for k, t, p in (
    ("general.architecture", V_STRING, s_str("asolaria-constellation")),
    ("general.name", V_STRING, s_str("ASOLARIA-CONSTELLATION")),
    ("asolaria.record_bytes", V_UINT32, struct.pack("<I", REC)),
    ("asolaria.records_total", V_UINT64, struct.pack("<Q", total)),
    ("asolaria.records_distinct", V_UINT64, struct.pack("<Q", len(seen))),
    ("asolaria.singletons_discarded", V_UINT64, struct.pack("<Q", dropped)),
    ("asolaria.retention_tau", V_UINT32, struct.pack("<I", TAU)),
    ("asolaria.shells", V_UINT32, struct.pack("<I", len(shells))),
    ("asolaria.selves", V_UINT32, struct.pack("<I", len(selves))),
    ("asolaria.axes", V_ARRAY,
     struct.pack("<IQ", V_STRING, 4) + b"".join(
         s_str(x) for x in ("time", "colour", "energy", "space"))),
    ("asolaria.states_per_record", V_UINT32, struct.pack("<I", 81)),
    ("asolaria.law", V_STRING,
     s_str("VIII.A.5 two-thirds GC; VIII.A.4 tau=2; VIII.A.7 photon shell")),
):
    meta += kv(k, t, p)
    nkv += 1

tensors, data, off = [], b"", 0
for name, b in sorted(blobs.items()):
    tn = name.replace(".", "_")
    pad = (-len(data)) % ALIGN
    data += b"\0" * pad
    off = len(data)
    tensors.append((tn, len(b), off))
    data += b

tinfo = b""
for tn, n, o in tensors:
    tinfo += s_str(tn) + struct.pack("<I", 1) + struct.pack("<Q", n) \
        + struct.pack("<I", GGML_I8) + struct.pack("<Q", o)

head = struct.pack("<IIQQ", GGUF_MAGIC, 3, len(tensors), nkv) + meta + tinfo
pad = (-len(head)) % ALIGN
blob = head + b"\0" * pad + data
open(OUT, "wb").write(blob)
d = hashlib.sha256(blob).hexdigest()
open(OUT + ".sha256", "w", newline="\n").write(f"{d}  {os.path.basename(OUT)}\n")

print(f"\n=== GGUF ===")
print(f"  {OUT}")
print(f"  {len(blob):,} B   tensors {len(tensors)}   kv {nkv}   align {ALIGN}")
print(f"  sha256 {d}")
