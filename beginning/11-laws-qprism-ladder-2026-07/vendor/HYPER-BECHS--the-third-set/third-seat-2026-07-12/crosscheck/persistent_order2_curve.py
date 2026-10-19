#!/usr/bin/env python3
"""Fully gated persistent-prior curve using Asolaria codec v0.1 mechanics.

Each read is a separate carryless-range-coded frame, but encoder and decoder
retain the same order-2 frequency table across frames. Every frame is restored
and SHA-checked. This measures conditional sequential compression, not a
standalone random-access archive: a fresh decoder must replay prior frames or
receive a serialized model snapshot.
"""
from __future__ import annotations

import argparse
import bz2
import gzip
import hashlib
import json
import lzma
import time
from pathlib import Path

import numpy as np

TOP = 1 << 24
BOT = 1 << 16
MASK = 0xFFFFFFFF


def make_model() -> np.ndarray:
    return np.ones((65536, 256), dtype=np.uint32)


def compress_frame(data: bytes, freq: np.ndarray) -> bytes:
    low, rng = 0, MASK
    out = bytearray()
    ctx = 0
    for byte in data:
        f = freq[ctx]
        tot = int(f.sum())
        c = int(f[:byte].sum())
        fr = int(f[byte])
        r = rng // tot
        if r == 0:
            raise ArithmeticError("range underflow: model total exceeds coder precision")
        low = (low + c * r) & MASK
        rng = fr * r
        while True:
            if (low ^ (low + rng)) & MASK < TOP:
                pass
            elif rng < BOT:
                rng = (-low) & (BOT - 1)
            else:
                break
            out.append((low >> 24) & 0xFF)
            low = (low << 8) & MASK
            rng = (rng << 8) & MASK
        f[byte] += 32
        if tot > 60000:
            freq[ctx] = (f >> 1) | 1
        ctx = ((ctx << 8) | byte) & 0xFFFF
    for _ in range(4):
        out.append((low >> 24) & 0xFF)
        low = (low << 8) & MASK
    return bytes(out)


def decompress_frame(comp: bytes, n: int, freq: np.ndarray) -> bytes:
    low, rng = 0, MASK
    code = int.from_bytes(comp[:4].ljust(4, b"\0"), "big")
    pos = 4
    out = bytearray()
    ctx = 0
    for _ in range(n):
        f = freq[ctx]
        tot = int(f.sum())
        r = rng // tot
        if r == 0:
            raise ArithmeticError("range underflow: model total exceeds coder precision")
        target = min(((code - low) & MASK) // r, tot - 1)
        cum = np.cumsum(f)
        byte = int(np.searchsorted(cum, target, side="right"))
        c = int(cum[byte - 1]) if byte > 0 else 0
        fr = int(f[byte])
        low = (low + c * r) & MASK
        rng = fr * r
        while True:
            if (low ^ (low + rng)) & MASK < TOP:
                pass
            elif rng < BOT:
                rng = (-low) & (BOT - 1)
            else:
                break
            code = ((code << 8) | (comp[pos] if pos < len(comp) else 0)) & MASK
            pos += 1
            low = (low << 8) & MASK
            rng = (rng << 8) & MASK
        f[byte] += 32
        if tot > 60000:
            freq[ctx] = (f >> 1) | 1
        out.append(byte)
        ctx = ((ctx << 8) | byte) & 0xFFFF
    return bytes(out)


def zstd_compress(data: bytes, level: int = 19) -> bytes | None:
    try:
        import zstandard as zstd  # type: ignore
        return zstd.ZstdCompressor(level=level).compress(data)
    except Exception:
        import subprocess
        try:
            return subprocess.run(["zstd", "-q", f"-{level}", "-c"], input=data, stdout=subprocess.PIPE, check=True).stdout
        except Exception:
            return None


def run(path: Path, reads: int, chunk_bytes: int) -> list[dict[str, object]]:
    enc_model = make_model()
    dec_model = make_model()
    results: list[dict[str, object]] = []
    cumulative_comp = 0
    cumulative_raw = 0
    with path.open("rb") as f:
        for i in range(1, reads + 1):
            data = f.read(chunk_bytes)
            if len(data) != chunk_bytes:
                raise ValueError(f"read {i}: needed {chunk_bytes} bytes, got {len(data)}")
            sha_in = hashlib.sha256(data).hexdigest()
            t0 = time.perf_counter()
            comp = compress_frame(data, enc_model)
            enc_s = time.perf_counter() - t0
            t0 = time.perf_counter()
            restored = decompress_frame(comp, len(data), dec_model)
            dec_s = time.perf_counter() - t0
            sha_out = hashlib.sha256(restored).hexdigest()
            if sha_out != sha_in:
                raise AssertionError(f"read {i}: restore mismatch")
            cumulative_comp += len(comp)
            cumulative_raw += len(data)
            zstd = zstd_compress(data)
            row = {
                "read": i,
                "raw_bytes": len(data),
                "compressed_bytes": len(comp),
                "bpc": len(comp) * 8 / len(data),
                "cumulative_bpc": cumulative_comp * 8 / cumulative_raw,
                "sha256": sha_in,
                "restore_match": True,
                "enc_s": enc_s,
                "dec_s": dec_s,
                "gzip9_bpc": len(gzip.compress(data, compresslevel=9)) * 8 / len(data),
                "bzip2_9_bpc": len(bz2.compress(data, compresslevel=9)) * 8 / len(data),
                "xz6_bpc": len(lzma.compress(data, preset=6)) * 8 / len(data),
                "zstd19_bpc": (len(zstd) * 8 / len(data)) if zstd is not None else None,
                "model_snapshot_bytes": int(enc_model.nbytes),
                "random_access": False,
                "state_recovery": "replay_prior_frames_or_transfer_model_snapshot",
            }
            results.append(row)
            print("PRIORROW|" + "|".join(f"{k}={v}" for k, v in row.items()) + "|json=0", flush=True)
    if not np.array_equal(enc_model, dec_model):
        raise AssertionError("encoder/decoder persistent model states diverged")
    return results


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=Path)
    ap.add_argument("--reads", type=int, default=20)
    ap.add_argument("--chunk-bytes", type=int, default=1_000_000)
    ap.add_argument("--json", type=Path)
    args = ap.parse_args()
    rows = run(args.path, args.reads, args.chunk_bytes)
    if args.json:
        args.json.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    print(f"PRIORVERDICT|reads={len(rows)}|first_bpc={rows[0]['bpc']:.6f}|last_bpc={rows[-1]['bpc']:.6f}|best_bpc={min(r['bpc'] for r in rows):.6f}|all_restore=1|json=0")


if __name__ == "__main__":
    main()
