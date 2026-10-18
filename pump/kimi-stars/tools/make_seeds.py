#!/usr/bin/env python3
"""Writes deterministic synthetic seeds for the cold-lane parity run (tools/parity.sh).

Standard library and integers only. Each seed exercises a branch of the upstream scripts:
GC ties (divide_kimi_k3.py:58-63), all-tie bodies and empty cubes (:70-71, :129-132), counts
above 255 (:177), every radial bin (:133-139), a body with no whole 81-byte record, where
:63-65 raises, and stars_shells.py rounds that run to MAXR.

Usage: python3 -I tools/make_seeds.py <out-dir>
"""
import hashlib
import os
import sys


def stream(label, n):
    out = bytearray()
    i = 0
    while len(out) < n:
        out += hashlib.sha256(f"{label}:{i}".encode()).digest()
        i += 1
    return bytes(out[:n])


def seeds():
    yield "kimi", "random-3110", stream("random-3110", 3110)
    recs = [stream(f"record-{i}", 81) for i in range(12)]
    tied = b"".join(r * (1 + i % 3) for i, r in enumerate(recs)) + stream("tail", 40)
    yield "kimi", "tied-records", tied
    grid = bytearray()
    for r in range(0, 256, 8):
        for g in range(0, 256, 8):
            for b in range(0, 256, 8):
                grid += bytes((r, g, b)) * 2
    yield "kimi", "grid-step8-twice", bytes(grid)
    yield "kimi", "flat-0x80", b"\x80" * 3000
    red = bytearray()
    for i in range(1500):
        red += bytes((200 + i % 50, i % 100, (i * 7) % 100))
    yield "kimi", "red-only", bytes(red)
    pick = stream("dense", 300_000)
    dense = bytearray()
    for i in range(0, len(pick) - 2, 3):
        dense += bytes((130 + pick[i] % 4, 120 + pick[i + 1] % 4, 120 + pick[i + 2] % 4))
    yield "kimi", "dense-clipped", bytes(dense)
    yield "kimi", "short-80", stream("short-80", 80)
    yield "stars", "random-3796", stream("random-3796", 3796)
    yield "stars", "small-30", stream("small-30", 30)
    small_set = stream("stars-dense", 3000)
    yield "stars", "dense-3000", bytes(64 + b % 8 for b in small_set)


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for lane, name, body in seeds():
        path = os.path.join(out, f"{lane}--{name}.bin")
        with open(path, "wb") as f:
            f.write(body)
        print(f"SEED|lane={lane}|k={name}|bytes={len(body)}"
              f"|sha256={hashlib.sha256(body).hexdigest()}|json=0")


if __name__ == "__main__":
    main()
