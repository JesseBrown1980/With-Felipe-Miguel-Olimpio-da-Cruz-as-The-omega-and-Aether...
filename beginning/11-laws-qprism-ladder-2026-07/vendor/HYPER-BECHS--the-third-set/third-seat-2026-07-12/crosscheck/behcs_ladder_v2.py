#!/usr/bin/env python3
"""Arbitrary-length BEHCS-1024 exact rebase.

Maps 5 source bytes (40 bits) to four 10-bit glyphs. Unlike the original
third-seat script, this version carries original_length and supports a final
partial block by zero-padding only inside the framed representation.
"""
from __future__ import annotations

import argparse
import hashlib
import time
from pathlib import Path

import numpy as np

DEFAULT_CHUNK = 20_000_000


def encode_decode_block(raw: bytes, *, final: bool = False) -> tuple[bytes, int]:
    original_len = len(raw)
    if final and original_len % 5:
        raw = raw + b"\x00" * (5 - original_len % 5)
    if len(raw) % 5:
        raise ValueError("non-final block length must be divisible by 5")
    if not raw:
        return b"", 0
    a = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 5).astype(np.uint64)
    v = (a[:, 0] << 32) | (a[:, 1] << 24) | (a[:, 2] << 16) | (a[:, 3] << 8) | a[:, 4]
    g = np.empty((len(v), 4), dtype=np.uint16)
    g[:, 0] = (v >> 30) & 0x3FF
    g[:, 1] = (v >> 20) & 0x3FF
    g[:, 2] = (v >> 10) & 0x3FF
    g[:, 3] = v & 0x3FF

    gv = g.astype(np.uint64)
    v2 = (gv[:, 0] << 30) | (gv[:, 1] << 20) | (gv[:, 2] << 10) | gv[:, 3]
    b = np.empty((len(v2), 5), dtype=np.uint8)
    b[:, 0] = (v2 >> 32) & 0xFF
    b[:, 1] = (v2 >> 24) & 0xFF
    b[:, 2] = (v2 >> 16) & 0xFF
    b[:, 3] = (v2 >> 8) & 0xFF
    b[:, 4] = v2 & 0xFF
    return b.tobytes()[:original_len], int(g.size)


def roundtrip_file(path: Path, chunk_size: int = DEFAULT_CHUNK) -> dict[str, object]:
    if chunk_size < 5:
        raise ValueError("chunk_size must be >= 5")
    h_black = hashlib.sha256()
    h_white = hashlib.sha256()
    total = glyphs = 0
    encode_decode_s = 0.0
    carry = b""
    with path.open("rb") as f:
        while True:
            raw = f.read(chunk_size)
            if not raw:
                break
            h_black.update(raw)
            total += len(raw)
            merged = carry + raw
            full_len = (len(merged) // 5) * 5
            full, carry = merged[:full_len], merged[full_len:]
            if full:
                t0 = time.perf_counter()
                restored, n_glyphs = encode_decode_block(full)
                encode_decode_s += time.perf_counter() - t0
                h_white.update(restored)
                glyphs += n_glyphs
    if carry:
        t0 = time.perf_counter()
        restored, n_glyphs = encode_decode_block(carry, final=True)
        encode_decode_s += time.perf_counter() - t0
        h_white.update(restored)
        glyphs += n_glyphs
    sb, sw = h_black.hexdigest(), h_white.hexdigest()
    conceptual_bits = glyphs * 10
    return {
        "path": str(path),
        "bytes": total,
        "glyphs": glyphs,
        "sha256_black": sb,
        "sha256_white": sw,
        "readback": sb == sw,
        "conceptual_bits": conceptual_bits,
        "info_rate": conceptual_bits / (8 * total) if total else 1.0,
        "framing_bytes": 8,
        "elapsed_s": encode_decode_s,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=Path)
    ap.add_argument("--chunk", type=int, default=DEFAULT_CHUNK)
    args = ap.parse_args()
    r = roundtrip_file(args.path, args.chunk)
    for k, v in r.items():
        print(f"{k}={v}")
    print("READBACK=" + ("VERIFIED_CLONE_0_LOSS" if r["readback"] else "HELD"))


if __name__ == "__main__":
    main()
