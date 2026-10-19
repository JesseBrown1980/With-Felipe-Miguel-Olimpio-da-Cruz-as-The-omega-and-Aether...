#!/usr/bin/env python3
"""Deterministic E100 addressing-plane and windowed-exactness probe."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from behcs_ladder_v2 import encode_decode_block

E100 = 10 ** 100
BLOCK = 64
SEED = b"ASOLARIA-E100-VIRTUAL-OBJECT-v1"


def virtual_block(block_index: int) -> bytes:
    return hashlib.shake_256(SEED + block_index.to_bytes(48, "big")).digest(BLOCK)


def virtual_window(offset: int, length: int) -> bytes:
    out = bytearray()
    pos = offset
    while len(out) < length:
        block_index, within = divmod(pos, BLOCK)
        b = virtual_block(block_index)
        take = min(length - len(out), BLOCK - within)
        out.extend(b[within : within + take])
        pos += take
    return bytes(out)


def to_base1024(value: int, width: int) -> list[int]:
    if value < 0 or value >= 1024 ** width:
        raise ValueError("value out of address range")
    out = [0] * width
    for i in range(width - 1, -1, -1):
        value, out[i] = divmod(value, 1024)
    return out


def from_base1024(glyphs: list[int]) -> int:
    v = 0
    for g in glyphs:
        if not 0 <= g < 1024:
            raise ValueError("invalid glyph")
        v = v * 1024 + g
    return v


def run(windows: int, window_bytes: int, coordinates: int) -> dict[str, object]:
    for i in range(windows):
        offset = int.from_bytes(hashlib.sha256(f"E100-window-{i}".encode()).digest(), "big") % (E100 - window_bytes)
        raw = virtual_window(offset, window_bytes)
        restored, glyphs = encode_decode_block(raw, final=(len(raw) % 5 != 0))
        if restored != raw:
            raise AssertionError(f"window {i}: ladder mismatch")
        address = to_base1024(offset, 34)
        if from_base1024(address) != offset:
            raise AssertionError(f"window {i}: address mismatch")
        print(f"E100WINDOW|i={i}|offset={offset}|bytes={window_bytes}|sha256={hashlib.sha256(raw).hexdigest()}|glyphs={glyphs}|readback=1|address34=1|json=0")

    for i in range(coordinates):
        value = int.from_bytes(hashlib.sha256(f"E100-coordinate-{i}".encode()).digest() * 2, "big") % E100
        if from_base1024(to_base1024(value, 34)) != value:
            raise AssertionError(f"coordinate {i}: mismatch")

    return {
        "windows": windows,
        "window_bytes": window_bytes,
        "window_readbacks": windows,
        "coordinate_tests": coordinates,
        "coordinate_passes": coordinates,
        "glyphs_for_e100": 34,
        "base1024_34_capacity_digits": len(str(1024 ** 34 - 1)),
        "base1024_60_capacity_digits": len(str(1024 ** 60 - 1)),
        "e100_enumerated": False,
        "claim": "address-coordinate-invariants-and-windowed-exactness-not-enumeration",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--windows", type=int, default=20)
    ap.add_argument("--window-bytes", type=int, default=1_000_000)
    ap.add_argument("--coordinates", type=int, default=100_000)
    ap.add_argument("--json", type=Path)
    args = ap.parse_args()
    r = run(args.windows, args.window_bytes, args.coordinates)
    if args.json:
        args.json.write_text(json.dumps(r, indent=2) + "\n", encoding="utf-8")
    print("E100VERDICT|" + "|".join(f"{k}={v}" for k, v in r.items()) + "|json=0")


if __name__ == "__main__":
    main()
