#!/usr/bin/env python3
"""N-LENS-FLASHLIGHT-v1 — twenty deterministic mathematical viewpoints.

This is a classical digital multi-vantage experiment, not physical quantum cloning.
Twenty prime-PID lenses inspect the same first 1,000,000 bytes of enwik8. Every
lens returns a formula, a measured number, a scope tag, and an OMNIEVENT receipt.

The harness tests:
- pi/sphere distribution diagnostics;
- lag mutual information and decorrelation delay;
- prime-seeded sketch decorrelation and ensemble scaling;
- independent fingerprint blindness;
- quant fixed points and recursive quant-down;
- conditional side-information coding and XOR secret sharing;
- CRT arithmetic combs;
- 60D nullspace contraction, exact recovery, and DBWH reprojection;
- prime-factor PIDs and referential crossings;
- compact result/OMNIEVENT portals;
- twenty 3-row views recovering a 60D object exactly.
"""
from __future__ import annotations

import argparse
import base64
import bz2
import gzip
import hashlib
import hmac
import importlib.util
import json
import lzma
import math
import os
import random
import statistics
import struct
import sys
import time
import zlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import numpy as np
import zstandard as zstd

PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43,
          47, 53, 59, 61, 67, 71, 73, 79, 83, 89]
FIELD = 65537
MOD1 = 33_554_467
MOD2 = 33_554_393
EPS_MI = 0.01


@dataclass
class LensResult:
    lens: int
    prime: int
    actor: str
    actor_pid: str
    prime_factor_pid: int
    formula_id: str
    formula: str
    metric: str
    value: float | int | str
    units: str
    status: str
    scope: str
    details: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "lens": self.lens,
            "prime": self.prime,
            "actor": self.actor,
            "actor_pid": self.actor_pid,
            "prime_factor_pid": self.prime_factor_pid,
            "formula_id": self.formula_id,
            "formula": self.formula,
            "metric": self.metric,
            "value": self.value,
            "units": self.units,
            "status": self.status,
            "scope": self.scope,
            "details": self.details,
        }


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def actor_pid(prime: int, object_sha: str) -> str:
    return sha256_hex(f"N-LENS|prime={prime}|object={object_sha}".encode())[:16]


def prime_factor_pid(prime: int) -> int:
    # generator -> reflector -> reviewer -> lens root
    return (2 ** 1) * (3 ** 2) * (5 ** 3) * prime


def entropy_bytes(data: bytes | np.ndarray) -> float:
    arr = np.frombuffer(data, dtype=np.uint8) if isinstance(data, (bytes, bytearray)) else np.asarray(data, dtype=np.uint8)
    if arr.size == 0:
        return 0.0
    counts = np.bincount(arr, minlength=256).astype(np.float64)
    p = counts[counts > 0] / arr.size
    return float(-(p * np.log2(p)).sum())


def monte_carlo_pi(data: bytes | np.ndarray) -> tuple[float, int]:
    arr = np.frombuffer(data, dtype=np.uint8) if isinstance(data, (bytes, bytearray)) else np.asarray(data, dtype=np.uint8)
    n = (arr.size // 2) * 2
    if n < 2:
        return float("nan"), 0
    points = arr[:n].reshape(-1, 2).astype(np.float64)
    xy = points / 127.5 - 1.0
    inside = np.sum(np.sum(xy * xy, axis=1) <= 1.0)
    return float(4.0 * inside / len(xy)), len(xy)


def sphere_anisotropy(data: bytes | np.ndarray) -> tuple[float, list[float], int]:
    arr = np.frombuffer(data, dtype=np.uint8) if isinstance(data, (bytes, bytearray)) else np.asarray(data, dtype=np.uint8)
    n = (arr.size // 3) * 3
    if n < 9:
        return float("nan"), [], 0
    points = arr[:n].reshape(-1, 3).astype(np.float64) / 127.5 - 1.0
    cov = np.cov(points, rowvar=False)
    eig = np.linalg.eigvalsh(cov)
    ratio = float(eig[-1] / max(eig[0], 1e-15))
    return ratio, [float(x) for x in eig], len(points)


def mutual_information_lag(arr: np.ndarray, lag: int) -> float:
    x = arr[:-lag].astype(np.int64)
    y = arr[lag:].astype(np.int64)
    joint = np.bincount(x * 256 + y, minlength=65536).reshape(256, 256).astype(np.float64)
    n = joint.sum()
    px = joint.sum(axis=1)
    py = joint.sum(axis=0)
    nz = joint > 0
    ii, jj = np.nonzero(nz)
    vals = joint[ii, jj]
    return float(np.sum((vals / n) * np.log2((vals * n) / (px[ii] * py[jj]))))


def rankdata(values: list[float]) -> np.ndarray:
    order = np.argsort(values)
    ranks = np.empty(len(values), dtype=np.float64)
    i = 0
    while i < len(values):
        j = i + 1
        while j < len(values) and values[order[j]] == values[order[i]]:
            j += 1
        rank = (i + j - 1) / 2.0 + 1.0
        ranks[order[i:j]] = rank
        i = j
    return ranks


def spearman(x: list[float], y: list[float]) -> float:
    rx, ry = rankdata(x), rankdata(y)
    if np.std(rx) == 0 or np.std(ry) == 0:
        return 0.0
    return float(np.corrcoef(rx, ry)[0, 1])


def corrected_mi(x: np.ndarray, y: np.ndarray, seed: int) -> tuple[float, float, float]:
    joint = np.bincount(x.astype(np.int64) * 256 + y.astype(np.int64), minlength=65536).reshape(256, 256).astype(np.float64)
    n = joint.sum()
    px, py = joint.sum(axis=1), joint.sum(axis=0)
    ii, jj = np.nonzero(joint)
    vals = joint[ii, jj]
    raw = float(np.sum((vals / n) * np.log2((vals * n) / (px[ii] * py[jj]))))
    rng = np.random.default_rng(seed)
    yp = y.copy(); rng.shuffle(yp)
    jointp = np.bincount(x.astype(np.int64) * 256 + yp.astype(np.int64), minlength=65536).reshape(256, 256).astype(np.float64)
    pxp, pyp = jointp.sum(axis=1), jointp.sum(axis=0)
    ii, jj = np.nonzero(jointp); vals = jointp[ii, jj]
    baseline = float(np.sum((vals / n) * np.log2((vals * n) / (pxp[ii] * pyp[jj]))))
    return raw, baseline, max(0.0, raw - baseline)


def import_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ImportError(path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def modular_rank(matrix: list[list[int]], mod: int) -> int:
    a = [row[:] for row in matrix]
    rows, cols = len(a), len(a[0]) if a else 0
    rank = 0
    for col in range(cols):
        pivot = next((r for r in range(rank, rows) if a[r][col] % mod), None)
        if pivot is None:
            continue
        a[rank], a[pivot] = a[pivot], a[rank]
        inv = pow(a[rank][col] % mod, -1, mod)
        a[rank] = [(v * inv) % mod for v in a[rank]]
        for r in range(rows):
            if r == rank or not a[r][col] % mod:
                continue
            factor = a[r][col] % mod
            a[r] = [(a[r][c] - factor * a[rank][c]) % mod for c in range(cols)]
        rank += 1
        if rank == rows:
            break
    return rank


def solve_square(matrix: list[list[int]], rhs: list[int], mod: int) -> list[int]:
    n = len(matrix)
    a = [matrix[i][:] + [rhs[i] % mod] for i in range(n)]
    for col in range(n):
        pivot = next((r for r in range(col, n) if a[r][col] % mod), None)
        if pivot is None:
            raise ValueError("singular matrix")
        a[col], a[pivot] = a[pivot], a[col]
        inv = pow(a[col][col] % mod, -1, mod)
        a[col] = [(v * inv) % mod for v in a[col]]
        for r in range(n):
            if r == col:
                continue
            factor = a[r][col] % mod
            if factor:
                a[r] = [(a[r][c] - factor * a[col][c]) % mod for c in range(n + 1)]
    return [a[i][-1] % mod for i in range(n)]


def crt2(a: int, b: int, p: int = MOD1, q: int = MOD2) -> int:
    t = ((b - a) % q) * pow(p, -1, q) % q
    return a + p * t


def deterministic_key(n: int, seed: bytes) -> bytes:
    out = bytearray()
    counter = 0
    while len(out) < n:
        out.extend(hashlib.sha256(seed + counter.to_bytes(8, "big")).digest())
        counter += 1
    return bytes(out[:n])


def compact_results(results: list[LensResult]) -> tuple[bytes, int, int]:
    full = json.dumps([r.as_dict() for r in results], sort_keys=True, separators=(",", ":")).encode()
    rows = []
    for r in results:
        rows.append([
            r.lens, r.prime, r.actor_pid, r.formula_id, r.metric,
            r.value, r.units, r.status,
        ])
    dictionary = {
        "formula_ids": sorted({r.formula_id for r in results}),
        "metrics": sorted({r.metric for r in results}),
        "units": sorted({r.units for r in results}),
        "statuses": sorted({r.status for r in results}),
    }
    body = json.dumps({"d": dictionary, "r": rows}, separators=(",", ":")).encode()
    packed = base64.urlsafe_b64encode(zlib.compress(body, 9)).rstrip(b"=")
    portal = b"N_LENS_PORTALv1|codec=zlib+base64url|data=" + packed + b"|json=0\n"
    return portal, len(full), len(portal)


def make_result(index: int, object_sha: str, formula_id: str, formula: str,
                metric: str, value: float | int | str, units: str,
                status: str, scope: str, details: dict[str, Any]) -> LensResult:
    prime = PRIMES[index - 1]
    return LensResult(index, prime, f"AGT-{prime}", actor_pid(prime, object_sha),
                      prime_factor_pid(prime), formula_id, formula, metric,
                      value, units, status, scope, details)


def lens_array(data: bytes, bpe_module, omni_module, catalog: dict, alphabet: dict,
               output_dir: Path) -> tuple[list[LensResult], dict[str, Any], list[dict]]:
    object_sha = sha256_hex(data)
    arr = np.frombuffer(data, dtype=np.uint8)
    zc = zstd.ZstdCompressor(level=19)
    zstd_payload = zc.compress(data)
    delta = np.empty_like(arr)
    delta[0] = arr[0]
    delta[1:] = np.bitwise_xor(arr[1:], arr[:-1])
    results: list[LensResult] = []

    # 1 — raw pi projection.
    raw_pi, raw_pairs = monte_carlo_pi(arr)
    results.append(make_result(1, object_sha, "F-PI-RAW-v1", "pi_hat=4*N(x^2+y^2<=1)/N",
        "abs_pi_error_raw", abs(raw_pi - math.pi), "absolute", "MEASURED_HEURISTIC",
        "byte-pair distribution diagnostic; not a redundancy theorem",
        {"pi_hat": raw_pi, "pairs": raw_pairs, "pi": math.pi}))

    # 2 — residual/compressed pi projection.
    residual_pi, residual_pairs = monte_carlo_pi(zstd_payload)
    results.append(make_result(2, object_sha, "F-PI-RESIDUAL-v1", "Delta_pi=|pi_hat(stream)-pi|",
        "abs_pi_error_zstd_payload", abs(residual_pi - math.pi), "absolute", "MEASURED_HEURISTIC",
        "distribution-isotropy diagnostic on a compressed residual stream",
        {"pi_hat": residual_pi, "pairs": residual_pairs, "payload_bytes": len(zstd_payload)}))

    # 3 — test whether Delta-pi tracks compressibility across length-preserving views.
    rng = np.random.default_rng(PRIMES[2])
    transforms: dict[str, bytes] = {
        "raw": data,
        "delta": delta.tobytes(),
        "reversed": data[::-1],
        "shuffled": arr[rng.permutation(arr.size)].tobytes(),
        "xor_lag2": np.bitwise_xor(arr, np.roll(arr, 2)).tobytes(),
        "rotate1": np.bitwise_or(np.left_shift(arr, 1) & 255, np.right_shift(arr, 7)).astype(np.uint8).tobytes(),
        "nibble_swap": np.bitwise_or(np.left_shift(arr & 15, 4), np.right_shift(arr, 4)).astype(np.uint8).tobytes(),
        "sorted": np.sort(arr).tobytes(),
    }
    pi_errors, bpcs, transform_rows = [], [], []
    for name, body in transforms.items():
        pihat, _ = monte_carlo_pi(body)
        bpc = len(zc.compress(body)) * 8 / len(body)
        pierr = abs(pihat - math.pi)
        pi_errors.append(pierr); bpcs.append(bpc)
        transform_rows.append({"name": name, "pi_hat": pihat, "pi_error": pierr, "zstd19_bpc": bpc})
    rho = spearman(pi_errors, bpcs)
    pi_status = "SUPPORTED_AS_HEURISTIC" if abs(rho) >= 0.7 else "NOT_GENERAL_REDUNDANCY_METER"
    results.append(make_result(3, object_sha, "F-PI-REDUNDANCY-CORR-v1",
        "rho_s=Spearman(|pi_hat-pi|, lossless_bpc)", "spearman_pi_error_vs_zstd_bpc",
        rho, "rho", pi_status, "eight deterministic representations of the same bytes",
        {"views": transform_rows, "threshold": 0.7}))

    # 4/5 — 3D sphere anisotropy before and after entropy coding.
    raw_aniso, raw_eig, raw_points = sphere_anisotropy(arr)
    results.append(make_result(4, object_sha, "F-SPHERE-RAW-v1", "A=lambda_max(Cov)/lambda_min(Cov)",
        "raw_covariance_anisotropy", raw_aniso, "ratio", "MEASURED_HEURISTIC",
        "byte-triple 3D distribution; 1 is isotropic", {"eigenvalues": raw_eig, "points": raw_points}))
    z_aniso, z_eig, z_points = sphere_anisotropy(zstd_payload)
    results.append(make_result(5, object_sha, "F-SPHERE-RESIDUAL-v1", "A=lambda_max(Cov)/lambda_min(Cov)",
        "zstd_covariance_anisotropy", z_aniso, "ratio", "MEASURED_HEURISTIC",
        "compressed-stream byte-triple distribution; not physical sphere geometry",
        {"eigenvalues": z_eig, "points": z_points}))

    # 6 — lag mutual information and tau star relative to a permutation baseline.
    lags = [1, 2, 4, 8, 16, 32, 64, 128, 256]
    mi_rows = [{"lag": lag, "mi_bits": mutual_information_lag(arr, lag)} for lag in lags]
    shuffled = arr.copy(); np.random.default_rng(PRIMES[5]).shuffle(shuffled)
    baseline = mutual_information_lag(shuffled, 1)
    threshold = baseline + EPS_MI
    tau = next((row["lag"] for row in mi_rows if row["mi_bits"] <= threshold), None)
    results.append(make_result(6, object_sha, "F-TAU-STAR-v1",
        "tau*=min{tau:I(X_t;X_(t+tau))<=I_perm+epsilon}", "decorrelation_tau_star",
        tau if tau is not None else f">{lags[-1]}", "bytes", "MEASURED",
        "plugin byte mutual information with permutation baseline; finite-sample biased",
        {"epsilon_bits": EPS_MI, "permutation_baseline_bits": baseline,
         "threshold_bits": threshold, "curve": mi_rows}))

    # 7 — twenty prime-seeded sketch views and pairwise decorrelation.
    block = 4096
    nblocks = arr.size // block
    blocks = arr[:nblocks * block].reshape(nblocks, block).astype(np.float64) - 127.5
    sketch_series = []
    for prime in PRIMES:
        signs = np.random.default_rng(prime).choice(np.array([-1.0, 1.0]), size=block)
        sketch_series.append((blocks @ signs) / math.sqrt(block))
    corr = np.corrcoef(np.vstack(sketch_series))
    upper = np.abs(corr[np.triu_indices(len(PRIMES), 1)])
    results.append(make_result(7, object_sha, "F-PRIME-VIEW-DECORRELATION-v1",
        "D=mean_(i<j)|corr(V_i,V_j)|", "mean_abs_pairwise_view_correlation",
        float(np.mean(upper)), "correlation", "MEASURED",
        "twenty deterministic prime-seeded sign projections across real-data blocks",
        {"max_abs_correlation": float(np.max(upper)), "block_bytes": block, "blocks": nblocks}))

    # 8 — ensemble standard error should approach k^-1/2 when lens errors decorrelate.
    lens_entropy = []
    sample_n = 50_000
    for prime in PRIMES:
        idx = np.random.default_rng(prime).choice(arr.size, size=sample_n, replace=False)
        lens_entropy.append(entropy_bytes(arr[idx]))
    bootstrap = np.random.default_rng(20260713)
    ks = [1, 2, 4, 5, 10, 20]
    se_rows = []
    for k in ks:
        means = []
        for _ in range(500):
            choice = bootstrap.choice(lens_entropy, size=k, replace=True)
            means.append(float(np.mean(choice)))
        se_rows.append({"k": k, "std_of_mean": float(np.std(means, ddof=1))})
    fit_x = np.log([r["k"] for r in se_rows if r["std_of_mean"] > 0])
    fit_y = np.log([r["std_of_mean"] for r in se_rows if r["std_of_mean"] > 0])
    slope = float(np.polyfit(fit_x, fit_y, 1)[0])
    results.append(make_result(8, object_sha, "F-ENSEMBLE-SQRT-v1",
        "SE(mean_k)=c*k^alpha; independent theory alpha=-1/2", "ensemble_loglog_slope",
        slope, "exponent", "MEASURED_CONDITIONAL",
        "bootstrap over twenty prime-seeded entropy estimates; correlation may change alpha",
        {"full_entropy_bpb": entropy_bytes(arr), "lens_estimates": lens_entropy, "curve": se_rows}))

    # 9 — p^k blindness using independent 1/53 linear fingerprints of corruption descriptors.
    trials = 50_000
    trial_rng = np.random.default_rng(20260713)
    positions = trial_rng.integers(0, arr.size, size=trials, dtype=np.int64)
    deltas = trial_rng.integers(1, 256, size=trials, dtype=np.int64)
    miss = np.empty((len(PRIMES), trials), dtype=bool)
    for i, prime in enumerate(PRIMES):
        # BLAKE2 keyed by the prime, then one field-53 coefficient. A miss means coefficient zero.
        for j, (pos, delta_v) in enumerate(zip(positions, deltas)):
            digest = hashlib.blake2s(struct.pack(">QQ", int(pos), int(delta_v)),
                                     key=prime.to_bytes(2, "big"), digest_size=2).digest()
            miss[i, j] = (int.from_bytes(digest, "big") % 53) == 0
    single_p = float(np.mean(miss))
    joint_rows = []
    for k in [1, 2, 3, 4, 6, 10, 20]:
        count = int(np.sum(np.all(miss[:k], axis=0)))
        joint_rows.append({"k": k, "empirical_miss": count / trials,
                           "miss_count": count, "independent_p_pow_k": single_p ** k,
                           "zero_count_upper_95": (3.0 / trials) if count == 0 else None})
    results.append(make_result(9, object_sha, "F-BLINDNESS-PK-v1",
        "P(all k fingerprints miss)=p^k only under independence", "single_lens_miss_probability",
        single_p, "probability", "MEASURED_CONDITIONAL",
        "BLAKE2-derived field-53 corruption fingerprints; zero empirical counts are upper bounds",
        {"trials": trials, "theory_p": 1/53, "joint": joint_rows}))

    # 10 — fixed points for specific discrete quants.
    proj = sketch_series[0][:1024]
    proj = proj / max(float(np.max(np.abs(proj))), 1e-12)
    turbo = np.rint(proj * 127).astype(np.int8)
    turbo2 = np.rint((turbo.astype(np.float64) / 127.0) * 127).astype(np.int8)
    tern = np.where(proj > .33, 2, np.where(proj < -.33, 0, 1)).astype(np.uint8)
    tern_rep = np.array([-1.0, 0.0, 1.0])[tern]
    tern2 = np.where(tern_rep > .33, 2, np.where(tern_rep < -.33, 0, 1)).astype(np.uint8)
    quad = np.where(proj > .5, 3, np.where(proj > 0, 2, np.where(proj > -.5, 1, 0))).astype(np.uint8)
    quad_rep = np.array([-.75, -.25, .25, .75])[quad]
    quad2 = np.where(quad_rep > .5, 3, np.where(quad_rep > 0, 2, np.where(quad_rep > -.5, 1, 0))).astype(np.uint8)
    zeta = np.where(np.abs(proj) < 1e-9, 15,
                    np.minimum(15, np.floor(-np.log2(np.maximum(np.abs(proj), 1e-300))))).astype(np.uint8)
    zrep = np.where(zeta == 15, 0.0, np.power(2.0, -(zeta.astype(np.float64) + .5)))
    zeta2 = np.where(zrep < 1e-9, 15, np.minimum(15, np.floor(-np.log2(np.maximum(zrep, 1e-300))))).astype(np.uint8)
    agreements = {"turbo": float(np.mean(turbo == turbo2)), "ternary": float(np.mean(tern == tern2)),
                  "quad": float(np.mean(quad == quad2)), "zeta": float(np.mean(zeta == zeta2))}
    results.append(make_result(10, object_sha, "F-QUANT-FIXED-POINT-v1",
        "f_Q=Pr[Q(dequant(Q(x)))=Q(x)]", "minimum_fixed_point_agreement",
        min(agreements.values()), "fraction", "MEASURED_SCOPED",
        "idempotence of four declared quant/dequant representatives; not all Asolaria quants",
        {"agreements": agreements}))

    # 11 — exact recursive quant-down across one, two, and three learned levels.
    bpe_rows = []
    for levels_n in [1, 2, 3]:
        catalog_bytes, payload, levels, tokens, trace = bpe_module.encode(data, levels_n, 512)
        restored = bpe_module.decode(catalog_bytes, payload, levels, len(tokens), len(data))
        total = len(catalog_bytes) + len(payload)
        bpe_rows.append({"levels": levels_n, "catalog_bytes": len(catalog_bytes),
                         "payload_bytes": len(payload), "total_bytes": total,
                         "bpc": total * 8 / len(data), "tokens": len(tokens),
                         "restore": restored == data, "trace": trace})
    best_bpe = min(bpe_rows, key=lambda r: r["total_bytes"])
    results.append(make_result(11, object_sha, "F-MULTILEVEL-QUANT-v1",
        "L*=argmin_L(payload_L+catalog_L), subject to Restore_L(x)=x",
        "best_exact_multilevel_bpc", best_bpe["bpc"], "bpc", "MEASURED",
        "BPE-style minted levels plus exact catalog and zstd tail",
        {"levels": bpe_rows, "best_level": best_bpe["levels"]}))

    # 12 — exact conditional coding with a 2% mutated side-information view.
    side_rng = np.random.default_rng(PRIMES[11])
    y = arr.copy()
    mutation_n = int(round(.02 * arr.size))
    pos = side_rng.choice(arr.size, size=mutation_n, replace=False)
    replacement = side_rng.integers(0, 256, size=mutation_n, dtype=np.uint8)
    replacement = np.where(replacement == y[pos], (replacement + 1) & 255, replacement).astype(np.uint8)
    y[pos] = replacement
    residual = np.bitwise_xor(arr, y).astype(np.uint8).tobytes()
    residual_comp = zc.compress(residual)
    restored = np.bitwise_xor(y, np.frombuffer(zstd.ZstdDecompressor().decompress(
        residual_comp, max_output_size=len(data)), dtype=np.uint8)).astype(np.uint8).tobytes()
    p = mutation_n / arr.size
    hb = -p * math.log2(p) - (1-p) * math.log2(1-p)
    lower_model = hb + 8*p
    results.append(make_result(12, object_sha, "F-SIDE-INFO-RATE-v1",
        "R_X|Y≈|Compress(X xor Y)|/|X|; model H_b(p)+8p",
        "conditional_residual_bpc", len(residual_comp) * 8 / len(data), "bpc", "MEASURED",
        "receiver is assumed to retain correlated Y; Y cost remains in civilization ledger",
        {"mutation_fraction": p, "model_bits_per_byte": lower_model,
         "residual_bytes": len(residual_comp), "restore": restored == data,
         "standalone_zstd_bpc": len(zstd_payload) * 8 / len(data)}))

    # 13 — all-or-two XOR secret-sharing opacity.
    key = deterministic_key(len(data), b"N-LENS-XOR-SHARE|" + bytes.fromhex(object_sha))
    share_a = np.frombuffer(key, dtype=np.uint8)
    share_b = np.bitwise_xor(arr, share_a).astype(np.uint8)
    sample = min(250_000, arr.size)
    mi_a = corrected_mi(arr[:sample], share_a[:sample], PRIMES[12])
    mi_b = corrected_mi(arr[:sample], share_b[:sample], PRIMES[12] + 1)
    joined = np.bitwise_xor(share_a, share_b).astype(np.uint8).tobytes()
    results.append(make_result(13, object_sha, "F-XOR-OPAQUE-SHARES-v1",
        "A=K; B=X xor K; I(X;A)=I(X;B)=0 ideally; X=A xor B",
        "max_bias_corrected_single_share_mi", max(mi_a[2], mi_b[2]), "bits", "MEASURED_CLASSICAL",
        "finite-sample empirical MI with permutation-bias subtraction; software shares are copyable",
        {"share_a_mi_raw_baseline_corrected": mi_a,
         "share_b_mi_raw_baseline_corrected": mi_b,
         "join_sha256": sha256_hex(joined), "join_exact": joined == data}))

    # 14 — CRT arithmetic comb exactness and single-shadow leakage.
    blocks_n = min(50_000, len(data) // 6)
    crt_ok = True
    for i in range(blocks_n):
        x = int.from_bytes(data[i*6:(i+1)*6], "big")
        if crt2(x % MOD1, x % MOD2) != x:
            crt_ok = False; break
    leakage = math.log2(MOD1)
    joint_margin = math.log2(MOD1 * MOD2) - 48
    results.append(make_result(14, object_sha, "F-CRT-ARITHMETIC-COMB-v1",
        "S_i=X mod p_i; product(p_i)>=2^48 => unique bounded recovery",
        "crt_joint_capacity_margin", joint_margin, "bits", "MEASURED",
        "one residue is ambiguous but informative; two declared coprime moduli recover 48-bit blocks",
        {"blocks": blocks_n, "restore": crt_ok, "single_shadow_information_upper_bits": leakage,
         "moduli": [MOD1, MOD2], "product": MOD1 * MOD2}))

    # 15/16/20 — twenty 3-row lenses contract a 60D nullspace to zero and reproject exactly.
    selector_pid = actor_pid(PRIMES[14], object_sha)
    selector = omni_module.derive_selector(selector_pid, data)
    rows: list[list[int]] = []
    rhs: list[int] = []
    rank_curve = []
    for lens_i in range(20):
        for r in range(3):
            t = lens_i * 3 + r + 1
            row = [pow(t, j, FIELD) for j in range(60)]
            rows.append(row)
            rhs.append(sum(row[j] * selector[j] for j in range(60)) % FIELD)
        rank = modular_rank(rows, FIELD)
        rank_curve.append({"lenses": lens_i + 1, "rank": rank, "nullity": 60-rank})
    full_lens = next((r["lenses"] for r in rank_curve if r["nullity"] == 0), None)
    results.append(make_result(15, object_sha, "F-ZERO-CONTAINER-NULLITY-v1",
        "Z_k=ker(A_k); dim(Z_k)=60-rank(A_k)", "lenses_to_zero_nullity",
        full_lens if full_lens is not None else -1, "lenses", "MEASURED_THEOREM_INSTANCE",
        "each prime lens contributes three independent finite-field equations",
        {"field": FIELD, "rank_curve": rank_curve, "selector_sha256": omni_module.selector_digest(selector)}))
    recovered = solve_square(rows[:60], rhs[:60], FIELD)
    mismatch = sum(int(a != b) for a, b in zip(recovered, selector))
    reproj_mismatch = sum(int((sum(row[j] * recovered[j] for j in range(60)) % FIELD) != y)
                          for row, y in zip(rows, rhs))
    results.append(make_result(16, object_sha, "F-DBWH-REPROJECTION-v1",
        "x_hat=A^-1 y; accept iff A*x_hat=y and x_hat=x",
        "dbwh_reprojection_mismatches", reproj_mismatch, "equations", "MEASURED",
        "finite-field analogue of black projection -> white recovery -> black reprojection",
        {"selector_value_mismatches": mismatch, "equations": len(rows),
         "recovered_selector_sha256": omni_module.selector_digest(recovered)}))

    # 17 — prime-factor PIDs.
    pids = [prime_factor_pid(p) for p in PRIMES]
    decoded_primes = [pid // ((2 ** 1) * (3 ** 2) * (5 ** 3)) for pid in pids]
    results.append(make_result(17, object_sha, "F-PRIME-PID-FACTORIZATION-v1",
        "PID_i=2^1*3^2*5^3*p_i; unique factorization recovers lens root",
        "prime_pid_collision_count", len(pids) - len(set(pids)), "collisions", "MEASURED",
        "ordered role semantics are carried by fixed depth primes; lens root uses a distinct prime",
        {"decoded_match": decoded_primes == PRIMES, "max_pid_bits": max(p.bit_length() for p in pids),
         "pids": pids}))

    # 18 — referential crossing: small coordinate crosses; retained body pays storage.
    store = {object_sha: data}
    address = bytes.fromhex(object_sha)
    recalled = store.get(address.hex())
    results.append(make_result(18, object_sha, "F-REFERENTIAL-CROSSING-v1",
        "wire=SHA256(X); recover only if retained_store[SHA256(X)]=X",
        "body_to_full_digest_wire_ratio", len(data) / len(address), "ratio", "MEASURED",
        "full digest is authoritative; retained-body bytes remain in the total ledger",
        {"body_bytes": len(data), "wire_bytes": len(address), "recall_exact": recalled == data,
         "host8_hint_ratio": len(data) / 8, "host8_authoritative": False}))

    # 20 — 20 three-dimensional views recover the complete 60D selector.
    results.append(make_result(20, object_sha, "F-NVIEW-3D-RECOVERY-v1",
        "A=[P_1;...;P_k], P_i in F_q^(3x60); recover iff rank(A)=60",
        "final_60d_reconstruction_mismatches", mismatch, "coordinates", "MEASURED",
        "twenty 3-row mathematical views; not physical optical or quantum cloning",
        {"views": 20, "rows_per_view": 3, "final_rank": rank_curve[-1]["rank"],
         "final_nullity": rank_curve[-1]["nullity"], "reprojection_mismatches": reproj_mismatch}))

    # 19 — compact all-result portal. Iterate until numeric fields stabilize.
    placeholder = make_result(19, object_sha, "F-LENS-PORTAL-v1",
        "R_portal=bytes(full result JSON)/bytes(dictionary-compressed portal)",
        "result_portal_quant_ratio", 0.0, "ratio", "MEASURED",
        "compact active index; full result bodies remain retained", {})
    results.insert(18, placeholder)
    for _ in range(4):
        portal, full_bytes, portal_bytes = compact_results(results)
        ratio = full_bytes / portal_bytes
        placeholder.value = ratio
        placeholder.details = {"full_json_bytes": full_bytes, "portal_bytes": portal_bytes,
                               "observability_bpc": portal_bytes * 8 / len(data),
                               "full_results_retained_elsewhere": True}
    portal, full_bytes, portal_bytes = compact_results(results)
    (output_dir / "n_lens_results_portal.hbp").write_bytes(portal)

    # OMNIEVENT-address every lens result into Catalog47 + Hyper60.
    ew = omni_module.EventWriter(catalog, alphabet,
        f"N-LENS-20|{object_sha}|{os.environ.get('GITHUB_SHA','local')}",
        os.environ.get("GITHUB_SHA", "local"))
    ew.emit("RUN_OPENED", "asolaria", "shared-object", "executing",
            {"object_sha256": object_sha, "raw_bytes": len(data), "lens_count": 20,
             "ledger_delta": {"raw_bytes": len(data)}},
            gate="sovereignty", chain="triggers", proof="chain", surface="n-lens-array")
    for result in sorted(results, key=lambda r: r.lens):
        ew.emit("LENS_MEASURED", result.actor.lower(), "shared-object", "completed",
                result.as_dict(), gate="shannon", chain="observed_on", proof="test",
                surface="n-lens-array", intent="scheduled", translation=result.formula_id,
                omni="bilateral", outcome="PASS" if not result.status.startswith("REJECTED") else "HOLD")
    supported = sum(r.status in {"MEASURED", "MEASURED_THEOREM_INSTANCE", "MEASURED_CLASSICAL",
                                 "MEASURED_SCOPED", "SUPPORTED_AS_HEURISTIC"} for r in results)
    conditional = sum("CONDITIONAL" in r.status or "HEURISTIC" in r.status for r in results)
    ew.emit("SYNTHESIS", "asolaria", "shared-object", "completed",
            {"supported_or_exact": supported, "conditional_or_heuristic": conditional,
             "lens_count": 20, "zero_nullity_lens": full_lens,
             "final_readback": mismatch == 0 and reproj_mismatch == 0},
            gate="omni", chain="proves", proof="test", surface="n-lens-array")
    ew.emit("RUN_CLOSED", "asolaria", "shared-object", "completed",
            {"object_sha256": object_sha, "lens_count": 20,
             "final_readback": mismatch == 0 and reproj_mismatch == 0},
            gate="sovereignty", chain="proves", proof="chain", surface="n-lens-array", omega="sealed")
    verification = omni_module.validate_events(ew.events)
    full_events = b"".join(omni_module.canonical(e) + b"\n" for e in ew.events)
    (output_dir / "n_lens_events_full.ndjson").write_bytes(full_events)
    portal_v1 = omni_module.build_portal(ew.events, catalog)
    (output_dir / "n_lens_events_portal_v1.hbp").write_bytes(portal_v1)
    views = []
    for e in ew.events:
        xyz = omni_module.projection3(e["hyper60"]["selector"])
        views.append({"event_pid": e["id"], "actor_pid": e["actor_agent_pid"],
                      "prime": next((r.prime for r in results if r.actor.lower() == e["actor"]), None),
                      "xyz": xyz, "selector_sha256": e["hyper60"]["selector_sha256"],
                      "event_hash": e["event_hash"], "lossy_projection": True})
    (output_dir / "n_lens_3d_views.ndjson").write_text(
        "".join(json.dumps(v, sort_keys=True, separators=(",", ":")) + "\n" for v in views), encoding="utf-8")

    summary = {
        "schema": "N-LENS-FLASHLIGHT-SUMMARY-v1",
        "object_sha256": object_sha,
        "raw_bytes": len(data),
        "lens_count": 20,
        "event_count": len(ew.events),
        "chain_head": verification["chain_head"],
        "merkle_root": verification["merkle_root"],
        "result_portal_bytes": portal_bytes,
        "result_json_bytes": full_bytes,
        "result_portal_ratio": full_bytes / portal_bytes,
        "event_full_bytes": len(full_events),
        "event_portal_v1_bytes": len(portal_v1),
        "event_portal_ratio": len(full_events) / len(portal_v1),
        "lenses_to_zero_nullity": full_lens,
        "final_selector_mismatches": mismatch,
        "final_reprojection_mismatches": reproj_mismatch,
        "supported_or_exact": supported,
        "conditional_or_heuristic": conditional,
        "results": [r.as_dict() for r in sorted(results, key=lambda x: x.lens)],
    }
    return sorted(results, key=lambda x: x.lens), summary, ew.events


def run(args):
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    data = Path(args.input).read_bytes()[:args.bytes]
    if len(data) != args.bytes:
        raise EOFError(f"expected {args.bytes} bytes, got {len(data)}")
    bpe = import_module(Path(args.bpe_script), "n_lens_bpe")
    omni = import_module(Path(args.omnievent_script), "n_lens_omni")
    catalog, alphabet = omni.load_specs(Path(args.catalog47), Path(args.alphabet256))
    results, summary, _ = lens_array(data, bpe, omni, catalog, alphabet, output_dir)
    (output_dir / "n_lens_results.json").write_text(
        json.dumps([r.as_dict() for r in results], indent=2), encoding="utf-8")
    (output_dir / "n_lens_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    lines = []
    for r in results:
        details_sha = sha256_hex(json.dumps(r.details, sort_keys=True, separators=(",", ":")).encode())
        lines.append("NLENSFORMULA" + "".join([
            f"|lens={r.lens}", f"|prime={r.prime}", f"|actor={r.actor}",
            f"|actor_pid={r.actor_pid}", f"|prime_factor_pid={r.prime_factor_pid}",
            f"|formula_id={r.formula_id}", f"|metric={r.metric}", f"|value={r.value}",
            f"|units={r.units}", f"|status={r.status}", f"|details_sha256={details_sha}", "|json=0"
        ]))
    lines.append("NLENSVERDICT" + "".join([
        f"|lenses=20", f"|events={summary['event_count']}",
        f"|zero_nullity_lens={summary['lenses_to_zero_nullity']}",
        f"|selector_mismatches={summary['final_selector_mismatches']}",
        f"|reprojection_mismatches={summary['final_reprojection_mismatches']}",
        f"|merkle_root={summary['merkle_root']}", "|status=PASS|json=0"
    ]))
    (output_dir / "n_lens_results.hbp").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(lines[-1])
    if summary["lenses_to_zero_nullity"] != 20 or summary["final_selector_mismatches"] != 0 or summary["final_reprojection_mismatches"] != 0:
        raise SystemExit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--bytes", type=int, default=1_000_000)
    parser.add_argument("--catalog47", required=True)
    parser.add_argument("--alphabet256", required=True)
    parser.add_argument("--bpe-script", required=True)
    parser.add_argument("--omnievent-script", required=True)
    parser.add_argument("--output-dir", default="n-lens-v1/out")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
