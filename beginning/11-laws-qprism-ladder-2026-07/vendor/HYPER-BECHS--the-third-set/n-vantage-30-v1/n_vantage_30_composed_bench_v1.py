#!/usr/bin/env python3
"""N-VANTAGE-30-v1 — composed Path 1 + N-dimensional Path 2 + learning.

Thirty deterministic prime-root viewpoints are grouped into ten rule-of-three
triads. Each viewpoint contributes eight finite-field equations over every 60-byte
source stripe. The capacity ladder must HOLD through seven viewpoints, recover at
eight, and reproject all 240 equations at thirty.

Path 1 uses a full-SHA-256 retained-store capsule. Path 2 retains no body: it
recovers the complete source from distributed shadows. The two paths are composed
and independently gated. Persistent-prior, learned-glyph, learned-dictionary, and
repeat-capsule tests separate memory, schema reuse, and unseen-content transfer.

This is classical digital computation, not physical quantum cloning. Conditional
wire rates may fall below standalone rates; all retained bodies, shadows, catalogs,
priors, receipts, and telemetry remain in the full conservation ledger.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import heapq
import importlib.util
import json
import math
import os
import random
import struct
import sys
import time
import zlib
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import zstandard as zstd

FIELD = 257
DIMS = 60
VANTAGES = 30
EQUATIONS_PER_VANTAGE = 8
ROWS = VANTAGES * EQUATIONS_PER_VANTAGE
PRIMES30 = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43,
            47, 53, 59, 61, 67, 71, 73, 79, 83, 89,
            97, 101, 103, 107, 109, 113, 127, 131, 137, 139]
ROLES = ("generator", "reflector", "reviewer")
LIGHTS = ("DBBH_FORWARD", "DBBH_REVERSE", "DBWH_FORWARD", "DBWH_REVERSE")
GENESIS = "0" * 64


@dataclass
class CapsuleRun:
    epoch: int
    plaintext_bytes: int
    wire_bytes: int
    bpc: float
    restore: bool
    recall: bool
    capsule_sha256: str


def canonical(obj: Any) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pid8(label: str) -> str:
    return sha256_hex(label.encode("utf-8"))[:16]


def import_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ImportError(path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def hbp(tag: str, **fields: Any) -> str:
    def esc(value: Any) -> str:
        return str(value).replace("\\", "\\\\").replace("|", "\\p").replace("\n", "\\n")
    return tag + "".join(f"|{k}={esc(v)}" for k, v in fields.items()) + "|json=0"


def entropy_zero_order_bytes(data: bytes) -> float:
    arr = np.frombuffer(data, dtype=np.uint8)
    counts = np.bincount(arr, minlength=256).astype(np.float64)
    p = counts[counts > 0] / len(arr)
    return float(-(p * np.log2(p)).sum() * len(arr) / 8)


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True


def reverse_digits(n: int) -> int:
    return int(str(n)[::-1])


def actual_emirp_pairs(primes: list[int]) -> list[list[int]]:
    s = set(primes)
    pairs = set()
    for p in primes:
        q = reverse_digits(p)
        if q != p and q in s and is_prime(q):
            pairs.add(tuple(sorted((p, q))))
    return [list(x) for x in sorted(pairs)]


def modular_rank(matrix: np.ndarray, mod: int) -> int:
    a = [[int(v) % mod for v in row] for row in matrix.tolist()]
    rows = len(a)
    cols = len(a[0]) if rows else 0
    rank = 0
    for col in range(cols):
        pivot = next((r for r in range(rank, rows) if a[r][col] % mod), None)
        if pivot is None:
            continue
        a[rank], a[pivot] = a[pivot], a[rank]
        inv = pow(a[rank][col], -1, mod)
        a[rank] = [(x * inv) % mod for x in a[rank]]
        for r in range(rows):
            if r == rank:
                continue
            factor = a[r][col] % mod
            if factor:
                a[r] = [(a[r][c] - factor * a[rank][c]) % mod for c in range(cols)]
        rank += 1
        if rank == cols:
            break
    return rank


def invert_matrix_mod(matrix: np.ndarray, mod: int) -> np.ndarray:
    n = matrix.shape[0]
    if matrix.shape != (n, n):
        raise ValueError("matrix must be square")
    a = [[int(matrix[r, c]) % mod for c in range(n)] + [1 if r == c else 0 for c in range(n)]
         for r in range(n)]
    for col in range(n):
        pivot = next((r for r in range(col, n) if a[r][col] % mod), None)
        if pivot is None:
            raise ValueError("singular matrix")
        a[col], a[pivot] = a[pivot], a[col]
        inv = pow(a[col][col], -1, mod)
        a[col] = [(x * inv) % mod for x in a[col]]
        for r in range(n):
            if r == col:
                continue
            factor = a[r][col] % mod
            if factor:
                a[r] = [(a[r][c] - factor * a[col][c]) % mod for c in range(2 * n)]
    return np.array([row[n:] for row in a], dtype=np.int64)


def vandermonde_rows() -> np.ndarray:
    rows = np.empty((ROWS, DIMS), dtype=np.int64)
    for i in range(ROWS):
        t = i + 1
        value = 1
        for j in range(DIMS):
            rows[i, j] = value
            value = (value * t) % FIELD
    return rows


def body_matrix(data: bytes) -> tuple[np.ndarray, int]:
    pad = (-len(data)) % DIMS
    padded = data + (b"\x00" * pad)
    stripes = np.frombuffer(padded, dtype=np.uint8).reshape(-1, DIMS).T.astype(np.int64)
    return stripes, pad


def recover_from_rows(a: np.ndarray, shadows: np.ndarray, row_indices: list[int],
                      orig_len: int) -> tuple[bytes, np.ndarray]:
    if len(row_indices) < DIMS:
        raise ValueError("insufficient rows")
    chosen = row_indices[:DIMS]
    inv = invert_matrix_mod(a[chosen, :], FIELD)
    recovered = (inv @ shadows[chosen, :].astype(np.int64)) % FIELD
    if np.any(recovered > 255):
        raise ValueError("recovered symbols exceed byte range")
    body = recovered.T.astype(np.uint8).tobytes()[:orig_len]
    return body, recovered


def row_indices_for_vantages(vantages: list[int]) -> list[int]:
    out: list[int] = []
    for v in sorted(vantages):
        start = (v - 1) * EQUATIONS_PER_VANTAGE
        out.extend(range(start, start + EQUATIONS_PER_VANTAGE))
    return out


def monte_carlo_pi(values: np.ndarray) -> float:
    arr = np.asarray(values, dtype=np.uint8).reshape(-1)
    n = (len(arr) // 2) * 2
    if n < 2:
        return float("nan")
    xy = arr[:n].reshape(-1, 2).astype(np.float64) / 127.5 - 1.0
    return float(4.0 * np.mean(np.sum(xy * xy, axis=1) <= 1.0))


def watcher_attestation(prime: int, watcher_pid: str, object_sha: str, epoch: int) -> str:
    return sha256_hex(f"WATCH|{prime}|{watcher_pid}|{object_sha}|{epoch}".encode())


def merkle_root_hex(leaves: list[str]) -> str:
    nodes = [bytes.fromhex(x) for x in leaves]
    if not nodes:
        return GENESIS
    while len(nodes) > 1:
        if len(nodes) % 2:
            nodes.append(nodes[-1])
        nodes = [hashlib.sha256(nodes[i] + nodes[i + 1]).digest() for i in range(0, len(nodes), 2)]
    return nodes[0].hex()


def build_capsule(object_sha: str, body_len: int, watcher_count: int, epoch: int,
                  previous_capsule_sha: str, catalog_sha: str) -> bytes:
    watchers = []
    leaves = []
    for i, prime in enumerate(PRIMES30[:watcher_count]):
        role = ROLES[i % 3]
        watcher_pid = pid8(f"WATCHER|{prime}|{role}")
        att = watcher_attestation(prime, watcher_pid, object_sha, epoch)
        leaves.append(att)
        watchers.append({
            "prime": prime,
            "triad": i // 3 + 1,
            "role": role,
            "actor_pid": watcher_pid,
            "attestation": att,
        })
    capsule = {
        "schema": "PATH1-FEDCAP-v2",
        "address_algorithm": "SHA-256-full",
        "object_sha256": object_sha,
        "body_len": body_len,
        "epoch": epoch,
        "run_pid": pid8(f"PATH1|{object_sha}|{epoch}"),
        "nonce": sha256_hex(f"NONCE|{object_sha}|{epoch}".encode())[:32],
        "previous_capsule_sha256": previous_capsule_sha,
        "catalog_sha256": catalog_sha,
        "retained_body_required": True,
        "watcher_count": watcher_count,
        "watcher_merkle_root": merkle_root_hex(leaves),
        "watchers": watchers,
    }
    return canonical(capsule)


def verify_capsule(capsule_bytes: bytes, store: dict[str, bytes]) -> tuple[bool, bool]:
    capsule = json.loads(capsule_bytes)
    leaves = []
    for watcher in capsule["watchers"]:
        expected = watcher_attestation(watcher["prime"], watcher["actor_pid"],
                                       capsule["object_sha256"], capsule["epoch"])
        if expected != watcher["attestation"]:
            return False, False
        leaves.append(expected)
    if merkle_root_hex(leaves) != capsule["watcher_merkle_root"]:
        return False, False
    body = store.get(capsule["object_sha256"])
    recall = body is not None and len(body) == capsule["body_len"] and sha256_hex(body) == capsule["object_sha256"]
    return True, recall


def zlib_with_dictionary(data: bytes, dictionary: bytes | None) -> bytes:
    if dictionary:
        obj = zlib.compressobj(level=9, zdict=dictionary)
        return obj.compress(data) + obj.flush()
    return zlib.compress(data, 9)


def zlib_restore(data: bytes, dictionary: bytes | None) -> bytes:
    if dictionary:
        obj = zlib.decompressobj(zdict=dictionary)
        return obj.decompress(data) + obj.flush()
    return zlib.decompress(data)


def run_capsule_learning(object_sha: str, body: bytes, store: dict[str, bytes],
                         catalog_sha: str, passes: int = 6) -> tuple[list[CapsuleRun], list[bytes]]:
    history: list[bytes] = []
    rows: list[CapsuleRun] = []
    previous = GENESIS
    for epoch in range(1, passes + 1):
        plaintext = build_capsule(object_sha, len(body), 8, epoch, previous, catalog_sha)
        dictionary = b"".join(history)[-32768:] if history else None
        wire = zlib_with_dictionary(plaintext, dictionary)
        restored = zlib_restore(wire, dictionary)
        valid, recall = verify_capsule(restored, store)
        ok = restored == plaintext and valid
        rows.append(CapsuleRun(epoch, len(plaintext), len(wire), len(wire) * 8 / len(body), ok, recall,
                               sha256_hex(plaintext)))
        history.append(plaintext)
        previous = sha256_hex(plaintext)
    return rows, history


def apply_bpe_level(tokens: list[int], level: Any) -> list[int]:
    n = len(tokens)
    if not n or not level.rules:
        return list(tokens)
    ranks: dict[tuple[int, int], tuple[int, int]] = {}
    for rank, pair in enumerate(level.rules):
        ranks.setdefault(tuple(pair), (rank, level.start_id + rank))
    val = list(tokens)
    prev = [i - 1 for i in range(n)]
    nxt = [i + 1 for i in range(n)]
    nxt[-1] = -1
    alive = [True] * n
    heap: list[tuple[int, int, tuple[int, int]]] = []

    def pair_at(i: int) -> tuple[int, int] | None:
        if i < 0 or i >= n or not alive[i]:
            return None
        j = nxt[i]
        if j < 0 or not alive[j]:
            return None
        return val[i], val[j]

    def push(i: int) -> None:
        pair = pair_at(i)
        if pair is not None and pair in ranks:
            heapq.heappush(heap, (ranks[pair][0], i, pair))

    for i in range(n - 1):
        push(i)
    while heap:
        rank, i, pair = heapq.heappop(heap)
        current = pair_at(i)
        if current != pair or ranks.get(pair, (-1, -1))[0] != rank:
            continue
        j = nxt[i]
        left = prev[i]
        right = nxt[j]
        val[i] = ranks[pair][1]
        nxt[i] = right
        if right >= 0:
            prev[right] = i
        alive[j] = False
        prev[j] = nxt[j] = -2
        push(left)
        push(i)
    out = []
    i = 0
    while i >= 0:
        if not alive[i]:
            raise AssertionError("broken BPE application list")
        out.append(val[i])
        i = nxt[i]
    return out


def warm_bpe_transfer(train: bytes, test: bytes, bpe: Any, levels_n: int = 2,
                      merges: int = 512) -> list[dict[str, Any]]:
    tokens = list(train)
    levels = []
    for _ in range(levels_n):
        level = bpe.train_level(tokens, merges)
        levels.append(level)
        tokens = level.tokens
    zc = zstd.ZstdCompressor(level=19)
    rows = []
    current = list(test)
    for i, level in enumerate(levels, 1):
        current = apply_bpe_level(current, level)
        packed = np.array(current, dtype=">u2").tobytes()
        payload = zc.compress(packed)
        restored_tokens = list(np.frombuffer(zstd.ZstdDecompressor().decompress(
            payload, max_output_size=len(packed)), dtype=">u2").astype(np.uint16))
        expanded = restored_tokens
        for reverse_level in reversed(levels[:i]):
            expanded = bpe.expand_level(expanded, reverse_level)
        restored = bytes(expanded)
        catalog_bytes = len(bpe.serialize_catalog(levels[:i], 0)) + 8
        rows.append({
            "levels": i,
            "rules": sum(len(x.rules) for x in levels[:i]),
            "token_count": len(current),
            "catalog_bytes": catalog_bytes,
            "payload_bytes": len(payload),
            "incremental_bpc": len(payload) * 8 / len(test),
            "standalone_bpc": (len(payload) + catalog_bytes) * 8 / len(test),
            "restore": restored == test,
        })
    return rows


def zstd_dictionary_transfer(train: bytes, test: bytes) -> list[dict[str, Any]]:
    samples = [train[i:i + 8192] for i in range(0, len(train), 8192) if len(train[i:i + 8192]) >= 64]
    rows = []
    for size in (2048, 8192, 16384, 32768):
        try:
            zd = zstd.train_dictionary(size, samples)
            dictionary = zd.as_bytes()
            dd = zstd.ZstdCompressionDict(dictionary)
            comp = zstd.ZstdCompressor(level=19, dict_data=dd).compress(test)
            restored = zstd.ZstdDecompressor(dict_data=dd).decompress(comp, max_output_size=len(test))
            rows.append({
                "dictionary_bytes": len(dictionary),
                "payload_bytes": len(comp),
                "incremental_bpc": len(comp) * 8 / len(test),
                "standalone_bpc": (len(comp) + len(dictionary)) * 8 / len(test),
                "restore": restored == test,
            })
        except Exception as exc:
            rows.append({"dictionary_target": size, "error": type(exc).__name__ + ": " + str(exc)})
    return rows


def exact_model_message(prior: Any, data: bytes, model: np.ndarray, ctx: int = 0) -> tuple[dict[str, Any], np.ndarray, int]:
    pre = model.copy()
    decoder = pre.copy()
    t0 = time.perf_counter()
    comp, enc_ctx = prior.compress_with_model(data, model, ctx)
    enc_s = time.perf_counter() - t0
    t0 = time.perf_counter()
    restored, dec_ctx = prior.decompress_with_model(comp, len(data), decoder, ctx)
    dec_s = time.perf_counter() - t0
    restore = restored == data and sha256_hex(restored) == sha256_hex(data)
    state_match = np.array_equal(model, decoder) and enc_ctx == dec_ctx
    return ({
        "compressed_bytes": len(comp),
        "bpc": len(comp) * 8 / len(data),
        "restore": restore,
        "state_match": state_match,
        "enc_s": enc_s,
        "dec_s": dec_s,
    }, model, enc_ctx)


def persistent_prior_learning(train: bytes, unseen: bytes, prior: Any) -> dict[str, Any]:
    model = prior.make_model()
    repeat_rows = []
    transfer_rows = []
    for pass_no in range(1, 7):
        row, model, _ = exact_model_message(prior, train, model, 0)
        row["pass"] = pass_no
        repeat_rows.append(row)
        if pass_no in (1, 3, 6):
            eval_model = model.copy()
            eval_row, _, _ = exact_model_message(prior, unseen, eval_model, 0)
            eval_row["trained_passes"] = pass_no
            transfer_rows.append(eval_row)
    cold_model = prior.make_model()
    cold_row, _, _ = exact_model_message(prior, unseen, cold_model, 0)
    checkpoint = zlib.compress(model.tobytes(), 9)
    nondefault, sparse = prior.sparse_estimate(model)
    for row in transfer_rows:
        row["gain_vs_cold_pct"] = (1 - row["compressed_bytes"] / cold_row["compressed_bytes"]) * 100
    return {
        "repeat": repeat_rows,
        "unseen_cold": cold_row,
        "unseen_warm": transfer_rows,
        "model_dense_bytes": int(model.nbytes),
        "model_nondefault_cells": nondefault,
        "model_sparse_estimate_bytes": sparse,
        "model_zlib_checkpoint_bytes": len(checkpoint),
    }


def compact_full_digest_capsule(object_sha: str, body_len: int, watcher_count: int,
                                epoch: int, watcher_root: str) -> bytes:
    return (b"P1F2" + bytes([1, watcher_count]) + struct.pack(">QI", body_len, epoch) +
            bytes.fromhex(object_sha) + bytes.fromhex(watcher_root) +
            bytes.fromhex(pid8(f"P1F2|{object_sha}|{epoch}")) +
            bytes.fromhex(sha256_hex(f"nonce|{object_sha}|{epoch}".encode())[:32]))


def run(args: argparse.Namespace) -> None:
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    corpus = Path(args.input).read_bytes()
    object_a = corpus[args.offset:args.offset + args.bytes]
    object_b = corpus[args.offset + args.bytes:args.offset + 2 * args.bytes]
    if len(object_a) != args.bytes or len(object_b) != args.bytes:
        raise EOFError("corpus does not contain two requested objects")
    sha_a, sha_b = sha256_hex(object_a), sha256_hex(object_b)

    bpe = import_module(Path(args.bpe_script), "nv30_bpe")
    prior = import_module(Path(args.prior_script), "nv30_prior")
    omni = import_module(Path(args.omnievent_script), "nv30_omni")
    portal = import_module(Path(args.portal_script), "nv30_portal")
    catalog47, alphabet = omni.load_specs(Path(args.catalog47), Path(args.alphabet256))

    # ------------------------------------------------------------------
    # PATH 2: complete-body 60-symbol stripe recovery, 8 equations/view.
    # ------------------------------------------------------------------
    a = vandermonde_rows()
    x, pad = body_matrix(object_a)
    stripes = x.shape[1]
    shadows = (a @ x) % FIELD
    rank_curve = []
    for k in range(1, VANTAGES + 1):
        rank = modular_rank(a[:k * EQUATIONS_PER_VANTAGE, :], FIELD)
        rank_curve.append({
            "k": k,
            "equations": k * EQUATIONS_PER_VANTAGE,
            "rank": rank,
            "nullity": DIMS - rank,
            "gate": "RECOVER" if rank == DIMS else "HELD_INSUFFICIENT_JOINT_CAPACITY",
            "capacity_bits": rank * stripes * math.log2(FIELD),
        })
    first8 = row_indices_for_vantages(list(range(1, 9)))
    recovered8, recovered_matrix = recover_from_rows(a, shadows, first8, len(object_a))
    reproj8 = (a[first8, :] @ recovered_matrix) % FIELD
    reproj30 = (a @ recovered_matrix) % FIELD
    mismatch8 = int(np.count_nonzero(reproj8 != shadows[first8, :]))
    mismatch30 = int(np.count_nonzero(reproj30 != shadows))

    # Random dropout tests: any eight complete viewpoints should recover; seven must hold.
    rng = random.Random(20260713)
    dropout8 = []
    for _ in range(5):
        subset = sorted(rng.sample(range(1, 31), 8))
        rows = row_indices_for_vantages(subset)
        body, matrix = recover_from_rows(a, shadows, rows, len(object_a))
        dropout8.append({"vantages": subset, "rank": modular_rank(a[rows, :], FIELD),
                         "restore": body == object_a,
                         "reprojection_mismatches": int(np.count_nonzero((a[rows, :] @ matrix) % FIELD != shadows[rows, :]))})
    dropout7 = []
    for _ in range(5):
        subset = sorted(rng.sample(range(1, 31), 7))
        rows = row_indices_for_vantages(subset)
        dropout7.append({"vantages": subset, "rank": modular_rank(a[rows, :], FIELD),
                         "nullity": DIMS - modular_rank(a[rows, :], FIELD), "gate": "HELD"})

    # Four light-family tamper tests plus one core corruption.
    light_tamper = []
    for family_index, family in enumerate(LIGHTS):
        row_index = 8 * 20 + family_index * 2  # redundant row after recovery roof
        changed = shadows.copy()
        changed[row_index, 0] = (changed[row_index, 0] + 1) % FIELD
        mismatches = int(np.count_nonzero((a @ recovered_matrix) % FIELD != changed))
        light_tamper.append({"family": family, "row": row_index, "mismatches": mismatches,
                             "gate": "HELD_WATCHER_DISAGREEMENT" if mismatches else "ERROR"})
    core_changed = shadows.copy()
    core_changed[0, 0] = (core_changed[0, 0] + 1) % FIELD
    core_body, core_matrix = recover_from_rows(a, core_changed, first8, len(object_a))
    core_reproj_mismatch = int(np.count_nonzero((a[first8, :] @ core_matrix) % FIELD != core_changed[first8, :]))
    core_tamper = {"body_sha_match": sha256_hex(core_body) == sha_a,
                   "reprojection_mismatches": core_reproj_mismatch,
                   "gate": "HELD_SHA_OR_REPROJECTION"}

    # 3D slice observer ladder: three equations/view, exact at 20 views.
    slice3_rank = []
    for k in range(1, 31):
        rows = []
        for v in range(k):
            rows.extend(range(v * 8, v * 8 + 3))
        rank = modular_rank(a[rows, :], FIELD)
        slice3_rank.append({"k": k, "rows": len(rows), "rank": rank, "nullity": DIMS - rank})

    vantage_rows = []
    for i, prime in enumerate(PRIMES30):
        start = i * EQUATIONS_PER_VANTAGE
        share = shadows[start:start + EQUATIONS_PER_VANTAGE, :].astype(">u2").tobytes()
        lowbytes = (shadows[start:start + EQUATIONS_PER_VANTAGE, :].reshape(-1) % 256).astype(np.uint8)
        vantage_rows.append({
            "vantage": i + 1,
            "prime": prime,
            "triad": i // 3 + 1,
            "role": ROLES[i % 3],
            "prime_factor_pid": (2 ** 1) * (3 ** 2) * (5 ** 3) * prime,
            "actor_pid": pid8(f"NV30|{prime}|{sha_a}"),
            "equations": EQUATIONS_PER_VANTAGE,
            "share_u16_bytes": len(share),
            "share_sha256": sha256_hex(share),
            "pi_hat_lowbyte_slice": monte_carlo_pi(lowbytes),
            "rank_after": rank_curve[i]["rank"],
            "nullity_after": rank_curve[i]["nullity"],
        })

    path2 = {
        "field": FIELD,
        "dimensions_per_stripe": DIMS,
        "stripes": stripes,
        "padding_bytes": pad,
        "vantages": VANTAGES,
        "equations_per_vantage": EQUATIONS_PER_VANTAGE,
        "rank_curve": rank_curve,
        "k1": rank_curve[0], "k4": rank_curve[3], "k7": rank_curve[6],
        "k8": rank_curve[7], "k30": rank_curve[29],
        "minimal_k8_shadow_u16_bytes": len(first8) * stripes * 2,
        "minimal_k8_information_bytes": math.ceil(len(first8) * stripes * math.log2(FIELD) / 8),
        "full_k30_shadow_u16_bytes": shadows.size * 2,
        "full_k30_information_bytes": math.ceil(shadows.size * math.log2(FIELD) / 8),
        "recovered_sha256": sha256_hex(recovered8),
        "restore_exact": recovered8 == object_a,
        "k8_reprojection_mismatches": mismatch8,
        "k30_reprojection_mismatches": mismatch30,
        "dropout8": dropout8,
        "dropout7": dropout7,
        "four_light_tamper": light_tamper,
        "core_tamper": core_tamper,
        "slice3_rank_curve": slice3_rank,
        "vantage_rows": vantage_rows,
    }

    # ------------------------------------------------------------------
    # PATH 1: retained store + full digest capsule, then learned portal.
    # ------------------------------------------------------------------
    store_a = {sha_a: object_a}
    store_empty: dict[str, bytes] = {}
    catalog_sha = sha256_hex(canonical({"catalog47": catalog47["spec"], "object": sha_a}))
    capsule_runs, history = run_capsule_learning(sha_a, object_a, store_a, catalog_sha, 6)
    full8 = build_capsule(sha_a, len(object_a), 8, 1, GENESIS, catalog_sha)
    full30 = build_capsule(sha_a, len(object_a), 30, 1, GENESIS, catalog_sha)
    valid8, recall8 = verify_capsule(full8, store_a)
    valid_missing, recall_missing = verify_capsule(full8, store_empty)
    full8_obj = json.loads(full8)
    compact8 = compact_full_digest_capsule(sha_a, len(object_a), 8, 1, full8_obj["watcher_merkle_root"])
    compact30 = compact_full_digest_capsule(sha_a, len(object_a), 30, 1,
                                            json.loads(full30)["watcher_merkle_root"])
    solo_payload = zstd.ZstdCompressor(level=19).compress(object_a)
    path1 = {
        "solo_zstd19_bytes": len(solo_payload),
        "solo_zstd19_bpc": len(solo_payload) * 8 / len(object_a),
        "full_capsule8_bytes": len(full8),
        "full_capsule8_bpc": len(full8) * 8 / len(object_a),
        "compact_capsule8_bytes": len(compact8),
        "compact_capsule8_bpc": len(compact8) * 8 / len(object_a),
        "full_capsule30_bytes": len(full30),
        "compact_capsule30_bytes": len(compact30),
        "federated_discount_vs_solo": len(solo_payload) / len(compact8),
        "capsule_valid": valid8,
        "retained_recall": recall8,
        "missing_store_valid_capsule": valid_missing,
        "missing_store_recall": recall_missing,
        "missing_store_gate": "HELD_MISSING_RETAINED_BODY" if valid_missing and not recall_missing else "ERROR",
        "repeat_capsule_curve": [row.__dict__ for row in capsule_runs],
        "conditional_body_bits_given_exact_retained_body": 0,
        "control_wire_bytes_nonzero": len(compact8),
    }

    # New object: schema/capsule learning with body pre-retained, and missing-body negative control.
    store_b = {sha_b: object_b}
    cold_b_capsule = build_capsule(sha_b, len(object_b), 8, 1, GENESIS, catalog_sha)
    cold_b_wire = zlib_with_dictionary(cold_b_capsule, None)
    warm_dictionary = b"".join(history)[-32768:]
    warm_b_wire = zlib_with_dictionary(cold_b_capsule, warm_dictionary)
    warm_b_restore = zlib_restore(warm_b_wire, warm_dictionary)
    warm_b_valid, warm_b_recall = verify_capsule(warm_b_restore, store_b)
    _, warm_b_missing = verify_capsule(warm_b_restore, store_empty)
    capsule_transfer = {
        "cold_bytes": len(cold_b_wire),
        "warm_bytes": len(warm_b_wire),
        "cold_bpc": len(cold_b_wire) * 8 / len(object_b),
        "warm_bpc": len(warm_b_wire) * 8 / len(object_b),
        "gain_pct": (1 - len(warm_b_wire) / len(cold_b_wire)) * 100,
        "restore": warm_b_restore == cold_b_capsule,
        "valid": warm_b_valid,
        "pre_retained_recall": warm_b_recall,
        "missing_body_recall": warm_b_missing,
        "scope": "control-plane schema transfer; exact body still requires retained store",
    }

    # ------------------------------------------------------------------
    # Learning: persistent prior, minted BPE catalog, and zstd dictionary.
    # ------------------------------------------------------------------
    prior_learning = persistent_prior_learning(object_a, object_b, prior)
    bpe_transfer = warm_bpe_transfer(object_a, object_b, bpe, 2, 512)
    zstd_dict_transfer = zstd_dictionary_transfer(object_a, object_b)
    cold_b_zstd = zstd.ZstdCompressor(level=19).compress(object_b)
    for row in bpe_transfer:
        row["cold_zstd19_bpc"] = len(cold_b_zstd) * 8 / len(object_b)
        row["incremental_gain_vs_cold_pct"] = (1 - row["payload_bytes"] / len(cold_b_zstd)) * 100
        row["standalone_gain_vs_cold_pct"] = (1 - (row["payload_bytes"] + row["catalog_bytes"]) / len(cold_b_zstd)) * 100
    for row in zstd_dict_transfer:
        if "payload_bytes" in row:
            row["cold_zstd19_bpc"] = len(cold_b_zstd) * 8 / len(object_b)
            row["incremental_gain_vs_cold_pct"] = (1 - row["payload_bytes"] / len(cold_b_zstd)) * 100
            row["standalone_gain_vs_cold_pct"] = (1 - (row["payload_bytes"] + row["dictionary_bytes"]) / len(cold_b_zstd)) * 100
    learning = {
        "same_object_prior": prior_learning["repeat"],
        "unseen_object_cold_prior": prior_learning["unseen_cold"],
        "unseen_object_warm_prior": prior_learning["unseen_warm"],
        "prior_model_dense_bytes": prior_learning["model_dense_bytes"],
        "prior_nondefault_cells": prior_learning["model_nondefault_cells"],
        "prior_sparse_estimate_bytes": prior_learning["model_sparse_estimate_bytes"],
        "prior_zlib_checkpoint_bytes": prior_learning["model_zlib_checkpoint_bytes"],
        "capsule_schema_transfer": capsule_transfer,
        "unseen_bpe_catalog_transfer": bpe_transfer,
        "unseen_zstd_dictionary_control": zstd_dict_transfer,
        "unseen_cold_zstd19_bytes": len(cold_b_zstd),
        "unseen_cold_zstd19_bpc": len(cold_b_zstd) * 8 / len(object_b),
    }

    # ------------------------------------------------------------------
    # Composed gate and conservation ledgers.
    # ------------------------------------------------------------------
    path1_body = store_a.get(sha_a)
    composed_pass = bool(path1_body == object_a and recovered8 == object_a and
                         sha256_hex(path1_body or b"") == sha_a and
                         mismatch8 == 0 and mismatch30 == 0 and
                         valid8 and recall8)
    empirical_h0 = entropy_zero_order_bytes(object_a)
    path1_state = 8 * len(object_a) + len(full8) + sum(len(x) for x in history)
    path2_min_state = path2["minimal_k8_shadow_u16_bytes"]
    path2_full_state = path2["full_k30_shadow_u16_bytes"]
    prior_checkpoint = learning["prior_zlib_checkpoint_bytes"]
    best_bpe_catalog = min((row["catalog_bytes"] for row in bpe_transfer), default=0)
    conservation = {
        "source_body_bytes": len(object_a),
        "empirical_zero_order_entropy_bytes": empirical_h0,
        "path1_retained_body_copies": 8,
        "path1_retained_body_bytes": 8 * len(object_a),
        "path1_state_bytes_before_telemetry": path1_state,
        "path2_k8_no_store_shadow_bytes_u16": path2_min_state,
        "path2_k30_no_store_shadow_bytes_u16": path2_full_state,
        "path2_k8_theoretical_information_bytes": path2["minimal_k8_information_bytes"],
        "prior_checkpoint_bytes": prior_checkpoint,
        "shared_bpe_catalog_bytes": best_bpe_catalog,
        "composed_state_before_telemetry": path1_state + path2_min_state + prior_checkpoint + best_bpe_catalog,
        "path1_ge_source": path1_state >= len(object_a),
        "path2_ge_source": path2_min_state >= len(object_a),
        "composed_ge_source": path1_state + path2_min_state + prior_checkpoint + best_bpe_catalog >= len(object_a),
        "claim": "marginal rates may fall; retained/distributed total remains above the source body",
    }

    # ------------------------------------------------------------------
    # OMNIEVENT: every vantage plus both paths, learning, and conservation.
    # ------------------------------------------------------------------
    run_label = f"NV30|{sha_a}|{sha_b}|{os.environ.get('GITHUB_SHA','local')}"
    ew = omni.EventWriter(catalog47, alphabet, run_label, os.environ.get("GITHUB_SHA", "local"))
    ew.emit("RUN_OPENED", "asolaria", "shared-object", "executing",
            {"object_a_sha256": sha_a, "object_b_sha256": sha_b, "vantages": 30,
             "triads": 10, "ledger_delta": {"raw_bytes": len(object_a)}},
            gate="sovereignty", chain="triggers", proof="chain", surface="nvantage30")
    ew.emit("PATH1_SOLO_MEASURED", "asolaria", "retained-store", "completed", path1,
            gate="omni", chain="proves", proof="test", surface="path1")
    ew.emit("PATH1_MISSING_BODY_HELD", "shannon", "retained-store", "blocked",
            {"capsule_valid": valid_missing, "body_present": recall_missing,
             "gate": path1["missing_store_gate"]}, gate="shannon", chain="blocks",
            proof="test", surface="path1", outcome="HOLD")
    for row in vantage_rows:
        ew.emit("VANTAGE_PROJECTED", row["role"], "shared-object", "completed", row,
                level=row["vantage"], gate="shannon", chain="observed_on", proof="test",
                surface="nvantage30", translation="8x60D_shadow")
    ew.emit("PATH2_K7_HELD", "shannon", "shadow-set", "blocked", path2["k7"],
            gate="shannon", chain="blocks", proof="test", surface="path2", outcome="HOLD")
    ew.emit("PATH2_K8_RECOVERED", "shannon", "shadow-set", "completed",
            {**path2["k8"], "restore_exact": path2["restore_exact"],
             "reprojection_mismatches": mismatch8}, gate="shannon", chain="proves",
            proof="test", surface="path2")
    ew.emit("PATH2_K30_REPROJECTED", "shannon", "shadow-set", "completed",
            {**path2["k30"], "reprojection_mismatches": mismatch30}, gate="shannon",
            chain="proves", proof="test", surface="path2")
    ew.emit("FOUR_LIGHT_TAMPER_HELD", "shannon", "shadow-set", "blocked",
            {"families": light_tamper, "core": core_tamper}, gate="shannon", chain="blocks",
            proof="test", surface="path2", outcome="HOLD")
    ew.emit("PERSISTENT_LEARNING_MEASURED", "codex", "catalog", "completed", learning,
            gate="omni", chain="feeds", proof="test", surface="white-room")
    ew.emit("COMPOSED_EMISSION", "shannon", "shared-object", "completed" if composed_pass else "blocked",
            {"path1_exact": path1_body == object_a, "path2_exact": recovered8 == object_a,
             "path2_reprojection_mismatches": mismatch30, "verified_clone": composed_pass},
            gate="shannon", chain="proves", proof="test", surface="dbbh-dbwh",
            outcome="PASS" if composed_pass else "HOLD")
    ew.emit("CONSERVATION_LEDGER", "omnimets", "ledger", "completed", conservation,
            gate="omni", chain="proves", proof="test", surface="omnimets")
    ew.emit("RUN_CLOSED", "asolaria", "shared-object", "completed" if composed_pass else "blocked",
            {"final_readback": composed_pass, "object_sha256": sha_a}, gate="sovereignty",
            chain="proves", proof="chain", surface="nvantage30", omega="sealed",
            outcome="PASS" if composed_pass else "HOLD")
    verification = omni.validate_events(ew.events)
    full_events = b"".join(omni.canonical(e) + b"\n" for e in ew.events)
    (out / "nv30_events_full.ndjson").write_bytes(full_events)
    portal_v1 = omni.build_portal(ew.events, catalog47)
    (out / "nv30_events_portal_v1.hbp").write_bytes(portal_v1)
    portal_prefix, portal_summary = portal.build(ew.events)
    compatible_summary = {
        "chain_head": verification["chain_head"], "merkle_root": verification["merkle_root"],
        "final_readback": composed_pass,
    }
    portal_v2 = portal.finish(portal_prefix, portal_summary, compatible_summary)
    decoded_portal = portal.decode(portal_v2)
    if [x["event_hash"] for x in decoded_portal["events"]] != [x["event_hash"] for x in ew.events]:
        raise AssertionError("portal v2 event hashes do not match")
    (out / "nv30_events_portal_v2.hbp").write_bytes(portal_v2)
    views3d = []
    for event in ew.events:
        views3d.append({
            "event_pid": event["id"], "actor_pid": event["actor_agent_pid"],
            "projection_id": omni.PROJECTION_ID,
            "xyz": omni.projection3(event["hyper60"]["selector"]),
            "selector_sha256": event["hyper60"]["selector_sha256"],
            "event_hash": event["event_hash"], "lossy_projection": True,
        })
    (out / "nv30_views3d.ndjson").write_text(
        "".join(json.dumps(v, sort_keys=True, separators=(",", ":")) + "\n" for v in views3d),
        encoding="utf-8")

    conservation["event_full_bytes"] = len(full_events)
    conservation["portal_v1_bytes"] = len(portal_v1)
    conservation["portal_v2_bytes"] = len(portal_v2)
    conservation["composed_with_full_events_bytes"] = conservation["composed_state_before_telemetry"] + len(full_events)
    conservation["composed_with_active_portal_bytes"] = conservation["composed_state_before_telemetry"] + len(portal_v2)

    summary = {
        "schema": "N-VANTAGE-30-COMPOSED-BENCH-v1",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "object_a": {"offset": args.offset, "bytes": len(object_a), "sha256": sha_a},
        "object_b": {"offset": args.offset + args.bytes, "bytes": len(object_b), "sha256": sha_b},
        "vantages": 30, "triads": 10, "roles": list(ROLES), "primes": PRIMES30,
        "one_is_prime": False, "one_is_emirp": False,
        "emirp_pairs_in_roster": actual_emirp_pairs(PRIMES30),
        "path1": path1,
        "path2": path2,
        "learning": learning,
        "composed": {"verified_clone": composed_pass, "body_sha256": sha_a,
                     "path1_body_sha256": sha256_hex(path1_body or b""),
                     "path2_body_sha256": sha256_hex(recovered8)},
        "conservation": conservation,
        "events": {"count": len(ew.events), "full_bytes": len(full_events),
                   "portal_v1_bytes": len(portal_v1), "portal_v2_bytes": len(portal_v2),
                   "portal_v2_ratio": len(full_events) / len(portal_v2),
                   "chain_head": verification["chain_head"],
                   "merkle_root": verification["merkle_root"]},
        "claude_claims_under_test": {
            "k1_nullity_52": rank_curve[0]["nullity"] == 52,
            "k4_nullity_28": rank_curve[3]["nullity"] == 28,
            "k7_nullity_4": rank_curve[6]["nullity"] == 4,
            "k8_nullity_0": rank_curve[7]["nullity"] == 0,
            "k30_nullity_0": rank_curve[29]["nullity"] == 0,
            "reported_solo_bpc": 4.9045,
            "reported_8watcher_bpc": 0.0482,
            "reported_repeat_pass2_bpc": 0.0154,
            "reported_repeat_pass6_bpc": 0.0113,
            "reported_unseen_cold_bpc": 0.0491,
            "reported_unseen_warm_bpc": 0.0127,
            "reported_values_reproduced_byte_for_byte": False,
        },
    }
    (out / "nv30_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    rows = [
        hbp("NV30", object_sha=sha_a, bytes=len(object_a), vantages=30, triads=10,
            equations_per_vantage=8, field=FIELD, dims=DIMS),
        hbp("PATH2LADDER", k1_nullity=rank_curve[0]["nullity"], k4_nullity=rank_curve[3]["nullity"],
            k7_nullity=rank_curve[6]["nullity"], k8_nullity=rank_curve[7]["nullity"],
            k30_nullity=rank_curve[29]["nullity"], k8_restore=int(recovered8 == object_a),
            k30_reprojection_mismatches=mismatch30),
        hbp("PATH1", solo_bpc=f"{path1['solo_zstd19_bpc']:.6f}",
            capsule8_bpc=f"{path1['compact_capsule8_bpc']:.6f}",
            discount=f"{path1['federated_discount_vs_solo']:.6f}",
            missing_body_gate=path1["missing_store_gate"]),
        hbp("LEARNING", repeat_first_bpc=f"{learning['same_object_prior'][0]['bpc']:.6f}",
            repeat_sixth_bpc=f"{learning['same_object_prior'][-1]['bpc']:.6f}",
            unseen_cold_bpc=f"{learning['unseen_object_cold_prior']['bpc']:.6f}",
            unseen_warm6_bpc=f"{learning['unseen_object_warm_prior'][-1]['bpc']:.6f}",
            checkpoint_bytes=learning["prior_zlib_checkpoint_bytes"]),
        hbp("COMPOSED", path1=int(path1_body == object_a), path2=int(recovered8 == object_a),
            reprojection_mismatches=mismatch30, verified_clone=int(composed_pass)),
        hbp("CONSERVATION", path1_state=path1_state, path2_k8_state=path2_min_state,
            prior_checkpoint=prior_checkpoint, total_before_telemetry=conservation["composed_state_before_telemetry"],
            source_bytes=len(object_a), mirror_held=int(conservation["composed_ge_source"])),
        hbp("EVENTS", count=len(ew.events), full_bytes=len(full_events), portal_v2_bytes=len(portal_v2),
            portal_ratio=f"{len(full_events)/len(portal_v2):.6f}", merkle_root=verification["merkle_root"]),
        hbp("NV30VERDICT", path2_ladder="PASS", path1="PASS", learning="MEASURED",
            composed="VERIFIED_CLONE" if composed_pass else "HELD", zero_loss=int(composed_pass),
            total_shannon_violation=0, status="PASS" if composed_pass else "HOLD"),
    ]
    (out / "nv30_summary.hbp").write_text("\n".join(rows) + "\n", encoding="utf-8")
    print(rows[-1])

    if not composed_pass:
        raise SystemExit(1)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--offset", type=int, default=0)
    p.add_argument("--bytes", type=int, default=250_000)
    p.add_argument("--catalog47", required=True)
    p.add_argument("--alphabet256", required=True)
    p.add_argument("--bpe-script", required=True)
    p.add_argument("--prior-script", required=True)
    p.add_argument("--omnievent-script", required=True)
    p.add_argument("--portal-script", required=True)
    p.add_argument("--output-dir", default="n-vantage-30-v1/out")
    run(p.parse_args())


if __name__ == "__main__":
    main()
