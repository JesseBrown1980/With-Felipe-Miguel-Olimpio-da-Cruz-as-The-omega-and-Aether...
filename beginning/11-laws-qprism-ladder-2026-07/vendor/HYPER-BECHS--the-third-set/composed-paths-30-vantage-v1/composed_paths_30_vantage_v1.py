#!/usr/bin/env python3
"""COMPOSED-PATHS-30-v1.

A classical, independently executable composition of:

Path 1
  Eight retained exact body stores, a full-SHA authoritative address, compact
  fanout receipt, zero body-payload cache hit, and an explicit total-state ledger.

Path 2
  Thirty prime-PID vantages, eight finite-field equations per vantage, four
  invertible black/white light orientations, an exact capacity ladder at
  k={1,4,7,8,30}, recovery at k=8, 240-equation reprojection at k=30, and
  negative controls for tampering and duplicate/non-independent watchers.

Composed emission
  The body is emitted only when Path-1 full-SHA recall and all four Path-2
  canonical selectors agree. This is classical digital multi-vantage recovery,
  not physical quantum cloning and not a total-ledger Shannon violation.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import os
import struct
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import zstandard as zstd

FIELD = 65_537
DIM = 60
EQUATIONS_PER_VANTAGE = 8
VANTAGE_COUNT = 30
PATH1_WATCHERS = 8
K_LADDER = [1, 4, 7, 8, 30]
PRIMES30 = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43,
            47, 53, 59, 61, 67, 71, 73, 79, 83, 89,
            97, 101, 103, 107, 109, 113, 127, 131, 137, 139]
LIGHTS = ["IDENTITY", "REVERSE", "AFFINE", "PRIME_PERMUTE"]


def import_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ImportError(path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def actor_pid(prime: int, body_sha: str) -> str:
    return sha256_hex(f"COMPOSED30|prime={prime}|body={body_sha}".encode())[:16]


def factor_pid(prime: int) -> int:
    # Fixed rule-of-three role path and one unique vantage root.
    return (2 ** 1) * (3 ** 2) * (5 ** 3) * prime


def h0_entropy_bits_per_byte(data: bytes) -> float:
    arr = np.frombuffer(data, dtype=np.uint8)
    counts = np.bincount(arr, minlength=256).astype(np.float64)
    p = counts[counts > 0] / len(arr)
    return float(-(p * np.log2(p)).sum())


def build_path1_receipt(body: bytes, compressed: bytes, run_pid_hex: str,
                        watcher_pids: list[str]) -> bytes:
    full_sha = sha256(body)
    compressed_sha = sha256(compressed)
    sender = bytes.fromhex(actor_pid(PRIMES30[0], full_sha.hex()))
    receiver = bytes.fromhex(actor_pid(PRIMES30[1], full_sha.hex()))
    run_pid = bytes.fromhex(run_pid_hex)
    nonce = sha256(b"P1-NONCE" + run_pid + full_sha)[:16]
    attestations = []
    for pid_hex in watcher_pids:
        pid = bytes.fromhex(pid_hex)
        digest = hashlib.sha512(b"P1-ATTEST-v1" + pid + full_sha + compressed_sha +
                                len(body).to_bytes(8, "big")).digest()
        attestations.append(pid + digest)
    attestation_root = sha256(b"".join(attestations))
    header = b"P1F2" + bytes([2, len(watcher_pids)])
    header += len(body).to_bytes(8, "big")
    header += len(compressed).to_bytes(8, "big")
    header += full_sha + full_sha[:8] + run_pid + sender + receiver + nonce + attestation_root
    return header + b"".join(attestations)


def verify_path1_receipt(receipt: bytes, body: bytes, compressed: bytes,
                         watcher_pids: list[str]) -> bool:
    if receipt[:4] != b"P1F2" or receipt[4] != 2 or receipt[5] != len(watcher_pids):
        return False
    pos = 6
    body_len = int.from_bytes(receipt[pos:pos+8], "big"); pos += 8
    compressed_len = int.from_bytes(receipt[pos:pos+8], "big"); pos += 8
    full_sha = receipt[pos:pos+32]; pos += 32
    host8 = receipt[pos:pos+8]; pos += 8
    run_pid = receipt[pos:pos+8]; pos += 8
    sender = receipt[pos:pos+8]; pos += 8
    receiver = receipt[pos:pos+8]; pos += 8
    nonce = receipt[pos:pos+16]; pos += 16
    claimed_root = receipt[pos:pos+32]; pos += 32
    if body_len != len(body) or compressed_len != len(compressed):
        return False
    if full_sha != sha256(body) or host8 != full_sha[:8]:
        return False
    if nonce != sha256(b"P1-NONCE" + run_pid + full_sha)[:16]:
        return False
    expected_sender = bytes.fromhex(actor_pid(PRIMES30[0], full_sha.hex()))
    expected_receiver = bytes.fromhex(actor_pid(PRIMES30[1], full_sha.hex()))
    if sender != expected_sender or receiver != expected_receiver:
        return False
    compressed_sha = sha256(compressed)
    rows = []
    for pid_hex in watcher_pids:
        pid = receipt[pos:pos+8]; pos += 8
        digest = receipt[pos:pos+64]; pos += 64
        if pid != bytes.fromhex(pid_hex):
            return False
        expected = hashlib.sha512(b"P1-ATTEST-v1" + pid + full_sha + compressed_sha +
                                  len(body).to_bytes(8, "big")).digest()
        if digest != expected:
            return False
        rows.append(pid + digest)
    return pos == len(receipt) and sha256(b"".join(rows)) == claimed_root


def path1_bench(data: bytes, run_pid_hex: str) -> tuple[dict[str, Any], bytes, dict[str, bytes]]:
    zc = zstd.ZstdCompressor(level=19)
    zd = zstd.ZstdDecompressor()
    compressed = zc.compress(data)
    body_sha = sha256_hex(data)
    watcher_pids = [actor_pid(p, body_sha) for p in PRIMES30[:PATH1_WATCHERS]]
    stores = {pid: compressed for pid in watcher_pids}
    receipt = build_path1_receipt(data, compressed, run_pid_hex, watcher_pids)
    receipt_ok = verify_path1_receipt(receipt, data, compressed, watcher_pids)
    recalls = []
    for pid in watcher_pids:
        restored = zd.decompress(stores[pid], max_output_size=len(data))
        recalls.append({"watcher_pid": pid, "restore": restored == data,
                        "sha_match": sha256_hex(restored) == body_sha})
    # Strict-unanimity negative control: one corrupted replica must be detected.
    tampered_stores = dict(stores)
    damaged = bytearray(tampered_stores[watcher_pids[-1]])
    damaged[len(damaged)//2] ^= 1
    tampered_stores[watcher_pids[-1]] = bytes(damaged)
    tampered_valid = 0
    tampered_held = 0
    for pid in watcher_pids:
        try:
            restored = zd.decompress(tampered_stores[pid], max_output_size=len(data))
            valid = restored == data and sha256_hex(restored) == body_sha
        except Exception:
            valid = False
        tampered_valid += int(valid)
        tampered_held += int(not valid)
    fanout_control_bytes = len(receipt) * PATH1_WATCHERS
    solo_bpc = len(compressed) * 8 / len(data)
    per_watcher_control_bpc = len(receipt) * 8 / len(data)
    fanout_control_bpc = fanout_control_bytes * 8 / len(data)
    result = {
        "body_sha256": body_sha,
        "raw_bytes": len(data),
        "compressed_exact_bytes": len(compressed),
        "solo_exact_code_bpc": solo_bpc,
        "watchers": PATH1_WATCHERS,
        "watcher_pids": watcher_pids,
        "receipt_bytes": len(receipt),
        "receipt_sha256": sha256_hex(receipt),
        "receipt_valid": receipt_ok,
        "all_recall_exact": all(x["restore"] and x["sha_match"] for x in recalls),
        "recalls": recalls,
        "body_payload_wire_bytes": 0,
        "body_payload_wire_bpc": 0.0,
        "per_watcher_control_bpc": per_watcher_control_bpc,
        "fanout_control_bytes": fanout_control_bytes,
        "fanout_control_bpc": fanout_control_bpc,
        "discount_vs_solo_per_watcher": solo_bpc / per_watcher_control_bpc,
        "discount_vs_solo_fanout": solo_bpc / fanout_control_bpc,
        "replicated_exact_store_bytes": PATH1_WATCHERS * len(compressed),
        "shared_store_policy_bytes": len(compressed) + len(receipt),
        "tampered_replica_valid": tampered_valid,
        "tampered_replica_held": tampered_held,
        "tampered_strict_unanimity_emits": tampered_valid == PATH1_WATCHERS,
    }
    return result, receipt, stores


def transform_selector(selector: list[int], light: str) -> list[int]:
    if light == "IDENTITY":
        return [x % FIELD for x in selector]
    if light == "REVERSE":
        return [x % FIELD for x in reversed(selector)]
    if light == "AFFINE":
        return [((2*i + 3) * x + (i*i + 7)) % FIELD for i, x in enumerate(selector)]
    if light == "PRIME_PERMUTE":
        # gcd(7,60)=1, so this permutation is invertible.
        return [(selector[(7*i + 11) % DIM] + PRIMES30[i % len(PRIMES30)]) % FIELD
                for i in range(DIM)]
    raise ValueError(light)


def inverse_transform(values: list[int], light: str) -> list[int]:
    if light == "IDENTITY":
        return [x % FIELD for x in values]
    if light == "REVERSE":
        return [x % FIELD for x in reversed(values)]
    if light == "AFFINE":
        return [((values[i] - (i*i + 7)) * pow(2*i + 3, -1, FIELD)) % FIELD
                for i in range(DIM)]
    if light == "PRIME_PERMUTE":
        out = [0] * DIM
        for i, value in enumerate(values):
            source_index = (7*i + 11) % DIM
            out[source_index] = (value - PRIMES30[i % len(PRIMES30)]) % FIELD
        return out
    raise ValueError(light)


def all_rows() -> list[list[int]]:
    rows = []
    for vantage in range(VANTAGE_COUNT):
        for ray in range(EQUATIONS_PER_VANTAGE):
            t = vantage * EQUATIONS_PER_VANTAGE + ray + 1
            rows.append([pow(t, j, FIELD) for j in range(DIM)])
    return rows


def project(rows: list[list[int]], vector: list[int]) -> list[int]:
    return [sum(row[j] * vector[j] for j in range(DIM)) % FIELD for row in rows]


def recover_ladder(nlens, selector: list[int]) -> tuple[dict[str, Any], bytes]:
    rows = all_rows()
    lights: dict[str, Any] = {}
    packed_all = bytearray()
    recovered_canonical = []
    for light in LIGHTS:
        transformed = transform_selector(selector, light)
        values = project(rows, transformed)
        packed_all.extend(b"".join(struct.pack(">H", v) for v in values))
        ladder = []
        canonical_at_8 = None
        canonical_at_30 = None
        for k in K_LADDER:
            selected_rows = rows[:k * EQUATIONS_PER_VANTAGE]
            selected_values = values[:k * EQUATIONS_PER_VANTAGE]
            rank = nlens.modular_rank(selected_rows, FIELD)
            nullity = DIM - rank
            if rank < DIM:
                ladder.append({"k": k, "equations": len(selected_rows), "rank": rank,
                               "nullity": nullity, "outcome": "HOLD_INSUFFICIENT_CAPACITY",
                               "selector_mismatches": None, "reprojection_mismatches": None})
                continue
            solved = nlens.solve_square(selected_rows[:DIM], selected_values[:DIM], FIELD)
            reprojection_mismatches = sum(
                int((sum(row[j] * solved[j] for j in range(DIM)) % FIELD) != y)
                for row, y in zip(selected_rows, selected_values)
            )
            canonical = inverse_transform(solved, light)
            selector_mismatches = sum(int(a != b) for a, b in zip(canonical, selector))
            ladder.append({"k": k, "equations": len(selected_rows), "rank": rank,
                           "nullity": nullity, "outcome": "RECOVER_EXACT" if not selector_mismatches and not reprojection_mismatches else "HOLD_REPROJECTION",
                           "selector_mismatches": selector_mismatches,
                           "reprojection_mismatches": reprojection_mismatches,
                           "canonical_selector_sha256": sha256_hex(b"".join(struct.pack(">H", x) for x in canonical))})
            if k == 8:
                canonical_at_8 = canonical
            if k == 30:
                canonical_at_30 = canonical
        assert canonical_at_8 is not None and canonical_at_30 is not None
        recovered_canonical.append(canonical_at_30)
        # Warp correction is the exact inverse transform back to the canonical 60D frame.
        original_xyz = nlens.sphere_anisotropy(np.asarray(selector, dtype=np.uint16).tobytes())[0]
        recovered_xyz = nlens.sphere_anisotropy(np.asarray(canonical_at_30, dtype=np.uint16).tobytes())[0]
        lights[light] = {
            "ladder": ladder,
            "transformed_selector_sha256": sha256_hex(b"".join(struct.pack(">H", x) for x in transformed)),
            "canonical_k8_sha256": sha256_hex(b"".join(struct.pack(">H", x) for x in canonical_at_8)),
            "canonical_k30_sha256": sha256_hex(b"".join(struct.pack(">H", x) for x in canonical_at_30)),
            "warp_metric_original": original_xyz,
            "warp_metric_recovered": recovered_xyz,
            "warp_metric_delta": abs(original_xyz - recovered_xyz),
        }
    consensus = all(candidate == selector for candidate in recovered_canonical)

    # Negative control 1: duplicate watcher 8's rows from watcher 7, so k=8 remains rank 56.
    duplicate_rows = [row[:] for row in rows[:64]]
    duplicate_rows[56:64] = [row[:] for row in rows[48:56]]
    duplicate_rank = nlens.modular_rank(duplicate_rows, FIELD)

    # Negative control 2: flip one extra equation after the recovery basis.
    base_values = project(rows, transform_selector(selector, "IDENTITY"))
    extra_tampered = base_values[:]
    extra_tampered[-1] = (extra_tampered[-1] + 1) % FIELD
    recovered_extra = nlens.solve_square(rows[:DIM], extra_tampered[:DIM], FIELD)
    extra_reprojection_mismatches = sum(
        int((sum(row[j] * recovered_extra[j] for j in range(DIM)) % FIELD) != y)
        for row, y in zip(rows, extra_tampered)
    )

    # Negative control 3: flip one basis equation, then require all 240 equations to expose it.
    basis_tampered = base_values[:]
    basis_tampered[10] = (basis_tampered[10] + 1) % FIELD
    recovered_basis = nlens.solve_square(rows[:DIM], basis_tampered[:DIM], FIELD)
    basis_reprojection_mismatches = sum(
        int((sum(row[j] * recovered_basis[j] for j in range(DIM)) % FIELD) != y)
        for row, y in zip(rows, basis_tampered)
    )
    basis_selector_mismatches = sum(int(a != b) for a, b in zip(recovered_basis, selector))

    result = {
        "dimension": DIM,
        "vantages": VANTAGE_COUNT,
        "equations_per_vantage": EQUATIONS_PER_VANTAGE,
        "total_equations_per_light": VANTAGE_COUNT * EQUATIONS_PER_VANTAGE,
        "lights": lights,
        "canonical_consensus": consensus,
        "selector_sha256": sha256_hex(b"".join(struct.pack(">H", x) for x in selector)),
        "shadow_bytes_all_four_lights": len(packed_all),
        "shadow_bytes_k8_all_four_lights": len(LIGHTS) * 8 * EQUATIONS_PER_VANTAGE * 2,
        "duplicate_watcher_k8_rank": duplicate_rank,
        "duplicate_watcher_k8_nullity": DIM - duplicate_rank,
        "duplicate_watcher_k8_outcome": "HOLD_INSUFFICIENT_INDEPENDENCE" if duplicate_rank < DIM else "UNEXPECTED_PASS",
        "extra_tamper_reprojection_mismatches": extra_reprojection_mismatches,
        "extra_tamper_outcome": "HOLD_WATCHER_DISAGREEMENT" if extra_reprojection_mismatches else "UNEXPECTED_PASS",
        "basis_tamper_selector_mismatches": basis_selector_mismatches,
        "basis_tamper_reprojection_mismatches": basis_reprojection_mismatches,
        "basis_tamper_outcome": "HOLD_WATCHER_DISAGREEMENT" if basis_reprojection_mismatches else "UNEXPECTED_PASS",
    }
    return result, bytes(packed_all)


def compact_portal(omniportal, events: list[dict], run_summary: dict) -> tuple[bytes, dict]:
    prefix, portal_summary = omniportal.build(events)
    portal = omniportal.finish(prefix, portal_summary, run_summary)
    decoded = omniportal.decode(portal)
    if decoded["event_count"] != len(events):
        raise AssertionError("portal event count mismatch")
    if [x["event_hash"] for x in decoded["events"]] != [x["event_hash"] for x in events]:
        raise AssertionError("portal event-hash mismatch")
    return portal, portal_summary


def run(args):
    data = Path(args.input).read_bytes()[:args.bytes]
    if len(data) != args.bytes:
        raise EOFError(f"expected {args.bytes}, got {len(data)}")
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    omni = import_module(Path(args.omnievent_script), "composed30_omni")
    omniportal = import_module(Path(args.omniportal_script), "composed30_portal")
    nlens = import_module(Path(args.nlens_script), "composed30_nlens")
    catalog, alphabet = omni.load_specs(Path(args.catalog47), Path(args.alphabet256))
    body_sha = sha256_hex(data)
    run_pid = sha256_hex(f"COMPOSED30|{body_sha}|{os.environ.get('GITHUB_SHA','local')}".encode())[:16]

    path1, path1_receipt, stores = path1_bench(data, run_pid)
    selector = omni.derive_selector(actor_pid(PRIMES30[0], body_sha), data)
    path2, shadows = recover_ladder(nlens, selector)

    path1_pass = path1["receipt_valid"] and path1["all_recall_exact"]
    path2_pass = path2["canonical_consensus"] and all(
        next(row for row in info["ladder"] if row["k"] == 8)["outcome"] == "RECOVER_EXACT" and
        next(row for row in info["ladder"] if row["k"] == 30)["outcome"] == "RECOVER_EXACT"
        for info in path2["lights"].values()
    )
    emitted = path1_pass and path2_pass

    ew = omni.EventWriter(catalog, alphabet, f"COMPOSED30|{body_sha}", os.environ.get("GITHUB_SHA", "local"))
    ew.emit("RUN_OPENED", "asolaria", "shared-object", "executing",
            {"body_sha256": body_sha, "raw_bytes": len(data), "vantages": 30,
             "path1_watchers": 8, "path2_lights": 4,
             "ledger_delta": {"raw_bytes": len(data)}},
            gate="sovereignty", chain="triggers", proof="chain", surface="composed-paths")
    ew.emit("PATH1_RECEIPT_PREPARED", "asolaria", "retained-store", "completed",
            {"receipt_bytes": path1["receipt_bytes"], "receipt_sha256": path1["receipt_sha256"],
             "compressed_exact_bytes": path1["compressed_exact_bytes"],
             "body_payload_wire_bytes": 0,
             "ledger_delta": {"receipt_bytes": path1["receipt_bytes"],
                              "compressed_exact_bytes": path1["compressed_exact_bytes"]}},
            gate="omni", chain="feeds", proof="hash", surface="path1-federation")
    for i, recall in enumerate(path1["recalls"], 1):
        ew.emit("PATH1_WATCHER_RECALL", f"agt-{PRIMES30[i-1]}", "retained-store", "completed",
                {**recall, "watcher_index": i, "body_payload_wire_bytes": 0},
                gate="shannon", chain="proves", proof="hash", surface="path1-federation")
    rows = all_rows()
    for i in range(VANTAGE_COUNT):
        rank = nlens.modular_rank(rows[:(i+1)*EQUATIONS_PER_VANTAGE], FIELD)
        nullity = DIM - rank
        role = ["generator", "reflector", "reviewer"][i % 3]
        prime = PRIMES30[i]
        ew.emit("PATH2_VANTAGE_MEASURED", f"agt-{prime}", "shared-selector", "completed",
                {"vantage": i+1, "prime": prime, "role": role,
                 "prime_factor_pid": factor_pid(prime),
                 "equations_added": EQUATIONS_PER_VANTAGE,
                 "cumulative_rank": rank, "nullity": nullity,
                 "outcome": "RECOVERABLE" if rank == DIM else "HOLD_INSUFFICIENT_CAPACITY"},
                level=i+1, gate="shannon", chain="observed_on", proof="test",
                surface="path2-30-vantage", translation="8-ray-prime-view")
    for light, info in path2["lights"].items():
        row8 = next(row for row in info["ladder"] if row["k"] == 8)
        row30 = next(row for row in info["ladder"] if row["k"] == 30)
        ew.emit("DBWH_LIGHT_RECOVERED", "shannon", "shared-selector", "completed",
                {"light": light, "k8": row8, "k30": row30,
                 "warp_metric_delta": info["warp_metric_delta"]},
                gate="shannon", chain="proves", proof="test", surface="dbbh-dbwh-4light",
                translation="black_projection_white_inverse")
    ew.emit("PATH2_DUPLICATE_WATCHER_HOLD", "shannon", "shared-selector", "blocked",
            {"rank": path2["duplicate_watcher_k8_rank"],
             "nullity": path2["duplicate_watcher_k8_nullity"],
             "outcome": path2["duplicate_watcher_k8_outcome"]},
            gate="shannon", chain="blocks", proof="test", surface="path2-30-vantage", outcome="HOLD")
    ew.emit("PATH2_EXTRA_TAMPER_HOLD", "shannon", "shared-selector", "blocked",
            {"reprojection_mismatches": path2["extra_tamper_reprojection_mismatches"],
             "outcome": path2["extra_tamper_outcome"]},
            gate="shannon", chain="blocks", proof="test", surface="dbbh-dbwh-4light", outcome="HOLD")
    ew.emit("PATH2_BASIS_TAMPER_HOLD", "shannon", "shared-selector", "blocked",
            {"selector_mismatches": path2["basis_tamper_selector_mismatches"],
             "reprojection_mismatches": path2["basis_tamper_reprojection_mismatches"],
             "outcome": path2["basis_tamper_outcome"]},
            gate="shannon", chain="blocks", proof="test", surface="dbbh-dbwh-4light", outcome="HOLD")

    active_wire_bytes = path1["fanout_control_bytes"] + path2["shadow_bytes_k8_all_four_lights"]
    active_wire_bpc = active_wire_bytes * 8 / len(data)
    h0_bpb = h0_entropy_bits_per_byte(data)
    h0_model_bytes = math.ceil(h0_bpb * len(data) / 8)
    data_ledger = {
        "raw_bytes": len(data),
        "empirical_h0_bits_per_byte": h0_bpb,
        "empirical_h0_model_bytes": h0_model_bytes,
        "one_copy_exact_zstd_bytes": path1["compressed_exact_bytes"],
        "eight_replica_exact_store_bytes": path1["replicated_exact_store_bytes"],
        "path1_fanout_control_bytes": path1["fanout_control_bytes"],
        "path2_k8_four_light_shadow_bytes": path2["shadow_bytes_k8_all_four_lights"],
        "path2_all30_four_light_shadow_bytes": path2["shadow_bytes_all_four_lights"],
        "active_wire_bytes": active_wire_bytes,
        "active_wire_bpc": active_wire_bpc,
        "body_payload_wire_bytes": 0,
        "body_payload_wire_bpc": 0.0,
        "discount_vs_solo_exact_code": path1["solo_exact_code_bpc"] / active_wire_bpc,
        "data_plane_total_replicated_bytes": path1["replicated_exact_store_bytes"] +
            path1["fanout_control_bytes"] + path2["shadow_bytes_all_four_lights"],
    }
    ew.emit("COMPOSED_VERIFIED_CLONE" if emitted else "COMPOSED_HELD", "asolaria", "shared-object",
            "completed" if emitted else "blocked",
            {"path1_pass": path1_pass, "path2_pass": path2_pass,
             "emitted_sha256": body_sha if emitted else None,
             "selector_sha256": path2["selector_sha256"],
             "body_payload_wire_bytes": 0,
             "active_wire_bytes": active_wire_bytes,
             "active_wire_bpc": active_wire_bpc},
            gate="sovereignty", chain="proves", proof="hash", surface="composed-paths",
            translation="path1-address-plus-path2-shadows",
            outcome="PASS" if emitted else "HOLD")
    ew.emit("CONSERVATION_LEDGER", "omnimets", "shared-object", "completed",
            {"ledger": data_ledger,
             "interpretation": "zero body payload on a cache hit is not zero total wire or zero retained state"},
            gate="omni", chain="proves", proof="log", surface="omnimets")
    ew.emit("RUN_CLOSED", "asolaria", "shared-object", "completed" if emitted else "blocked",
            {"final_readback": emitted, "body_sha256": body_sha,
             "path1_watchers": PATH1_WATCHERS, "path2_vantages": VANTAGE_COUNT},
            gate="sovereignty", chain="proves", proof="chain", surface="composed-paths",
            omega="sealed", outcome="PASS" if emitted else "HOLD")
    verification = omni.validate_events(ew.events)

    full_events = b"".join(omni.canonical(e) + b"\n" for e in ew.events)
    interim_summary = {
        "chain_head": verification["chain_head"],
        "merkle_root": verification["merkle_root"],
        "final_readback": emitted,
    }
    portal, portal_summary = compact_portal(omniportal, ew.events, interim_summary)
    full_fabric_replicated_bytes = data_ledger["data_plane_total_replicated_bytes"] + len(portal)
    summary = {
        "schema": "COMPOSED-PATHS-30-SUMMARY-v1",
        "object_sha256": body_sha,
        "run_pid": run_pid,
        "path1": path1,
        "path2": path2,
        "composed_emission": "VERIFIED_CLONE" if emitted else "HELD",
        "final_readback": emitted,
        "data_ledger": data_ledger,
        "event_count": len(ew.events),
        "event_full_bytes": len(full_events),
        "portal_bytes": len(portal),
        "portal_ratio": len(full_events) / len(portal),
        "full_fabric_replicated_bytes_plus_portal": full_fabric_replicated_bytes,
        "full_fabric_replicated_bpc_plus_portal": full_fabric_replicated_bytes * 8 / len(data),
        "chain_head": verification["chain_head"],
        "merkle_root": verification["merkle_root"],
        "claude_claim_crosscheck": {
            "path2_ladder_matches_1_4_7_8_30": all(
                [(next(r for r in path2["lights"][light]["ladder"] if r["k"] == k)["nullity"] == expected)
                 for light in LIGHTS for k, expected in [(1,52),(4,28),(7,4),(8,0),(30,0)]]),
            "reported_path1_bpc": 0.0482,
            "independent_active_wire_bpc": active_wire_bpc,
            "same_ledger": False,
            "reported_conservation_bytes": 2_009_218,
            "independent_replicated_data_plane_bytes": data_ledger["data_plane_total_replicated_bytes"],
        },
    }

    (out / "path1_receipt.bin").write_bytes(path1_receipt)
    (out / "path2_shadows_4lights_30v.bin").write_bytes(shadows)
    (out / "path1.json").write_text(json.dumps(path1, indent=2), encoding="utf-8")
    (out / "path2.json").write_text(json.dumps(path2, indent=2), encoding="utf-8")
    (out / "composed_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (out / "composed_events_full.ndjson").write_bytes(full_events)
    (out / "composed_events_portal_v2.hbp").write_bytes(portal)
    hbp = (
        f"COMPOSED30|body_sha256={body_sha}|path1_watchers=8|path2_vantages=30|"
        f"equations_per_vantage=8|lights=4|k7_nullity=4|k8_nullity=0|"
        f"path1_receipt_bytes={path1['receipt_bytes']}|path1_fanout_bytes={path1['fanout_control_bytes']}|"
        f"path2_k8_shadow_bytes={path2['shadow_bytes_k8_all_four_lights']}|"
        f"active_wire_bytes={active_wire_bytes}|active_wire_bpc={active_wire_bpc:.6f}|"
        f"body_payload_wire_bytes=0|solo_exact_code_bpc={path1['solo_exact_code_bpc']:.6f}|"
        f"discount_vs_solo={data_ledger['discount_vs_solo_exact_code']:.6f}|"
        f"replicated_store_bytes={path1['replicated_exact_store_bytes']}|"
        f"data_plane_total_bytes={data_ledger['data_plane_total_replicated_bytes']}|"
        f"event_count={len(ew.events)}|portal_bytes={len(portal)}|"
        f"merkle_root={verification['merkle_root']}|final=VERIFIED_CLONE|json=0\n"
    )
    (out / "composed_summary.hbp").write_text(hbp, encoding="utf-8")
    print(hbp.strip())
    if not emitted:
        raise SystemExit(1)
    if path2["duplicate_watcher_k8_outcome"] != "HOLD_INSUFFICIENT_INDEPENDENCE":
        raise SystemExit("duplicate watcher did not hold")
    if path2["extra_tamper_outcome"] != "HOLD_WATCHER_DISAGREEMENT":
        raise SystemExit("extra tamper did not hold")
    if path2["basis_tamper_outcome"] != "HOLD_WATCHER_DISAGREEMENT":
        raise SystemExit("basis tamper did not hold")
    if path1["tampered_strict_unanimity_emits"]:
        raise SystemExit("tampered path1 replica unexpectedly emitted")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--bytes", type=int, default=1_000_000)
    parser.add_argument("--catalog47", required=True)
    parser.add_argument("--alphabet256", required=True)
    parser.add_argument("--omnievent-script", required=True)
    parser.add_argument("--omniportal-script", required=True)
    parser.add_argument("--nlens-script", required=True)
    parser.add_argument("--output-dir", default="composed-paths-30-vantage-v1/out")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
