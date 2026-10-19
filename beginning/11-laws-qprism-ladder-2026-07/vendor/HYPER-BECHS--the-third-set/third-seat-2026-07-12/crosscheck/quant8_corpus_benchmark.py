#!/usr/bin/env python3
"""Corpus-bound 8-stage quant-head benchmark with explicit metadata.

This adapts the public quant-huge-message-benchmark.mjs CountSketch/Turbo/Polar/
Zeta/Triple/Quadruple/histogram/prime-power head to byte corpora. The historical
3,200-byte payload serializes Turbo + sign bits + Zeta + histogram only. Scale,
source length, source SHA, triple, quadruple and prime-power summary are reported
as metadata; the head is referential/analytic and cannot reconstruct the corpus.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import statistics
import time
from pathlib import Path

import numpy as np

D = 1024
MUL = np.uint64(2654435761)


def prime_power_table() -> np.ndarray:
    t = np.zeros(D, dtype=np.uint8)
    def is_prime(n: int) -> bool:
        if n < 2:
            return False
        p = 2
        while p * p <= n:
            if n % p == 0:
                return False
            p += 1
        return True
    for n in range(2, D):
        if is_prime(n):
            t[n] = 1
            continue
        for p in range(2, int(math.isqrt(n)) + 1):
            if not is_prime(p):
                continue
            m, k = n, 0
            while m % p == 0:
                m //= p
                k += 1
            if m == 1:
                t[n] = 5 if k > 3 else k + 1
                break
    return t

PPOW = prime_power_table()


def build_head(path: Path, chunk_bytes: int = 8 << 20) -> tuple[dict[str, object], bytes]:
    proj = np.zeros(D, dtype=np.float64)
    source_hash = hashlib.sha256()
    offset = 0
    t0 = time.perf_counter()
    with path.open("rb") as f:
        while True:
            raw = f.read(chunk_bytes)
            if not raw:
                break
            source_hash.update(raw)
            values_u8 = np.frombuffer(raw, dtype=np.uint8)
            n = len(values_u8)
            positions = np.arange(offset, offset + n, dtype=np.uint64)
            h = (positions * MUL) & np.uint64(0xFFFFFFFF)
            idx = (h & np.uint64(D - 1)).astype(np.int64)
            sign = np.where((h & np.uint64(0x80000000)) != 0, -1.0, 1.0)
            weights = values_u8.astype(np.float64) * sign
            proj += np.bincount(idx, weights=weights, minlength=D)
            offset += n
    max_abs = max(float(np.max(np.abs(proj))), 1e-12)
    v = proj / max_abs
    turbo = np.rint(v * 127).astype(np.int8)
    signs = np.packbits((v < 0).astype(np.uint8), bitorder="little")
    abs_v = np.abs(v)
    logmag = np.full_like(abs_v, 15.0)
    np.log2(abs_v, where=abs_v > 0, out=logmag)
    zeta = np.where(abs_v < 1e-9, 15, np.minimum(15, np.floor(-logmag))).astype(np.uint8)
    triple = np.where(v > 0.33, 1, np.where(v < -0.33, -1, 0)).astype(np.int8)
    quad = np.where(v > 0.5, 3, np.where(v > 0, 2, np.where(v > -0.5, 1, 0))).astype(np.uint8)
    hist = np.bincount(((turbo.astype(np.int16) + 128) & 255).astype(np.int64), minlength=256).astype("<u4")
    vm_acc = int(PPOW[turbo != 0].sum())
    payload = turbo.tobytes() + signs.tobytes() + zeta.tobytes() + hist.tobytes()
    elapsed = time.perf_counter() - t0
    if len(payload) != 3200:
        raise AssertionError(f"unexpected tuple size {len(payload)}")
    metadata = {
        "schema": "ASOLARIA_QUANT8_CORPUS_HEAD_v2",
        "source_bytes": offset,
        "source_sha256": source_hash.hexdigest(),
        "payload_bytes": len(payload),
        "scale_f64": max_abs,
        "vm_acc": vm_acc,
        "triple_sha256": hashlib.sha256(triple.tobytes()).hexdigest(),
        "quad_sha256": hashlib.sha256(quad.tobytes()).hexdigest(),
        "head_build_s": elapsed,
        "reconstructs_source": False,
        "retained_body_required": True,
    }
    return metadata, payload


def median_ns(fn, repeats: int) -> int:
    samples = []
    for _ in range(repeats):
        t0 = time.perf_counter_ns(); fn(); samples.append(time.perf_counter_ns() - t0)
    return int(statistics.median(samples))


def hash_file(path: Path, chunk_bytes: int = 16 << 20) -> bytes:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            b = f.read(chunk_bytes)
            if not b:
                break
            h.update(b)
    return h.digest()


def run(path: Path, repeats: int) -> dict[str, object]:
    meta, payload = build_head(path)
    raw_hash_ns = median_ns(lambda: hash_file(path), max(1, min(repeats, 5)))
    tuple_hash_ns = median_ns(lambda: hashlib.sha256(payload).digest(), max(100, repeats * 100))
    tuple_cmp_ns = median_ns(lambda: payload == bytes(payload), max(1000, repeats * 1000))
    complete_meta = json.dumps(meta, sort_keys=True, separators=(",", ":")).encode()
    complete_head = complete_meta + b"\n" + payload
    result = dict(meta)
    result.update({
        "payload_sha256": hashlib.sha256(payload).hexdigest(),
        "metadata_bytes": len(complete_meta),
        "complete_head_bytes": len(complete_head),
        "raw_sha_ns_median": raw_hash_ns,
        "tuple_sha_ns_median": tuple_hash_ns,
        "sha_gain": raw_hash_ns / tuple_hash_ns,
        "tuple_compare_ns_median": tuple_cmp_ns,
        "payload_ratio": meta["source_bytes"] / len(payload),
        "complete_head_ratio": meta["source_bytes"] / len(complete_head),
    })
    return result


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=Path)
    ap.add_argument("--repeats", type=int, default=5)
    ap.add_argument("--json", type=Path)
    args = ap.parse_args()
    r = run(args.path, args.repeats)
    if args.json:
        args.json.write_text(json.dumps(r, indent=2) + "\n", encoding="utf-8")
    print("QUANT8CORPUS|" + "|".join(f"{k}={v}" for k, v in r.items()) + "|json=0")


if __name__ == "__main__":
    main()
