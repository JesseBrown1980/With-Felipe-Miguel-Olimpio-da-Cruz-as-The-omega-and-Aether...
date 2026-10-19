#!/usr/bin/env python3
"""Validate the immutable Cube A/B candidate artifacts without promoting them."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from decimal import Decimal
from pathlib import Path
from typing import Any


ARTIFACTS = Path(__file__).resolve().parents[1] / "cube-ab-vantage-comint-v1"

EXPECTED: dict[str, dict[str, Any]] = {
    "A": {
        "filename": "ASOLARIA-CUBE-A.json",
        "name": "ASOLARIA-CUBE-A",
        "sha256": "0b99a6c864f625f4b808c28adc31fd05140693fa619dc16462c294e06bfc7682",
        "bytes": 66_326,
        "metrics": {
            "n": 1920,
            "bpg": Decimal("2.6388287822332934"),
            "bpc": Decimal("3.706626290605497"),
            "used": 1672,
            "cov": Decimal("72.31340841680829"),
            "pay": Decimal("223984.14316284357"),
            "cat": 7680,
        },
        "unique_strings": 1872,
        "duplicate_pair_groups": 9,
        "duplicate_pair_excess": 40,
        "duplicate_string_groups": 12,
        "duplicate_string_excess": 48,
        "referenced_duplicate_ids": 19,
        "max_expansion_bytes": 56,
    },
    "B": {
        "filename": "ASOLARIA-CUBE-B.json",
        "name": "ASOLARIA-CUBE-B",
        "sha256": "b23cf246d7e4d671cbbf15ea5001fb5db1b3c31791c92e0b52e4dd1c9d76a5df",
        "bytes": 66_467,
        "metrics": {
            "n": 1920,
            "bpg": Decimal("2.6733536151760937"),
            "bpc": Decimal("3.678795392105306"),
            "used": 1696,
            "cov": Decimal("71.70522533697621"),
            "pay": Decimal("222244.71200658163"),
            "cat": 7680,
        },
        "unique_strings": 1871,
        "duplicate_pair_groups": 7,
        "duplicate_pair_excess": 49,
        "duplicate_string_groups": 7,
        "duplicate_string_excess": 49,
        "referenced_duplicate_ids": 8,
        "max_expansion_bytes": 54,
    },
}


class ValidationError(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationError(message)


def load_sidecar(path: Path, expected_filename: str) -> str:
    fields = path.read_text(encoding="ascii").strip().split()
    require(len(fields) == 2, f"{path.name}: expected '<sha256> <filename>'")
    digest, filename = fields
    require(filename.lstrip("*") == expected_filename, f"{path.name}: filename mismatch")
    require(
        len(digest) == 64 and all(c in "0123456789abcdefABCDEF" for c in digest),
        f"{path.name}: malformed sha256",
    )
    return digest.lower()


def validate_cube(label: str) -> tuple[dict[str, Any], set[bytes]]:
    expected = EXPECTED[label]
    path = ARTIFACTS / expected["filename"]
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    sidecar_digest = load_sidecar(path.with_suffix(path.suffix + ".sha256"), path.name)

    require(len(raw) == expected["bytes"], f"{label}: byte length changed")
    require(digest == expected["sha256"], f"{label}: pinned digest mismatch")
    require(digest == sidecar_digest, f"{label}: sidecar digest mismatch")

    cube = json.loads(raw.decode("utf-8"), parse_float=Decimal)
    merges = cube.get("merges")
    strings = cube.get("strings")
    metrics = cube.get("metrics_on_holdout")
    require(cube.get("name") == expected["name"], f"{label}: name mismatch")
    require(cube.get("glyphs") == 1920, f"{label}: glyph count mismatch")
    require(isinstance(merges, list) and len(merges) == 1920, f"{label}: merge count mismatch")
    require(isinstance(strings, list) and len(strings) == 1920, f"{label}: string count mismatch")
    require(isinstance(metrics, dict), f"{label}: metrics object missing")

    for key, value in expected["metrics"].items():
        require(metrics.get(key) == value, f"{label}: carried metric {key} changed")
    require(metrics["cat"] == 4 * cube["glyphs"], f"{label}: cat != 4*glyphs")

    expansions: list[bytes] = [bytes([value]) for value in range(256)]
    pair_counts: Counter[tuple[int, int]] = Counter()
    decoded_counts: Counter[bytes] = Counter()
    referenced_ids: set[int] = set()

    for index, row in enumerate(merges):
        output_id = 256 + index
        require(
            isinstance(row, list)
            and len(row) == 2
            and all(isinstance(value, int) and not isinstance(value, bool) for value in row),
            f"{label}: malformed merge row {index}",
        )
        left, right = row
        require(
            0 <= left < output_id and 0 <= right < output_id,
            f"{label}: merge row {index} is not backward-only",
        )
        referenced_ids.update((left, right))
        expansion = expansions[left] + expansions[right]
        try:
            declared = strings[index].encode("latin-1")
        except (AttributeError, UnicodeEncodeError) as exc:
            raise ValidationError(
                f"{label}: string row {index} is not a Latin-1 byte projection"
            ) from exc
        require(expansion == declared, f"{label}: expansion mismatch at row {index}")
        expansions.append(expansion)
        pair_counts[(left, right)] += 1
        decoded_counts[expansion] += 1

    repeated_pairs = {pair: count for pair, count in pair_counts.items() if count > 1}
    repeated_strings = {value: count for value, count in decoded_counts.items() if count > 1}
    duplicate_output_ids = {
        256 + index
        for index, row in enumerate(merges)
        if pair_counts[tuple(row)] > 1
    }
    referenced_duplicate_ids = duplicate_output_ids & referenced_ids

    measured = {
        "sha256": digest,
        "bytes": len(raw),
        "merges": len(merges),
        "unique_pairs": len(pair_counts),
        "unique_strings": len(decoded_counts),
        "duplicate_pair_groups": len(repeated_pairs),
        "duplicate_pair_excess": sum(count - 1 for count in repeated_pairs.values()),
        "duplicate_string_groups": len(repeated_strings),
        "duplicate_string_excess": sum(count - 1 for count in repeated_strings.values()),
        "referenced_duplicate_ids": len(referenced_duplicate_ids),
        "max_expansion_bytes": max(map(len, decoded_counts)),
    }
    for key in (
        "unique_strings",
        "duplicate_pair_groups",
        "duplicate_pair_excess",
        "duplicate_string_groups",
        "duplicate_string_excess",
        "referenced_duplicate_ids",
        "max_expansion_bytes",
    ):
        require(measured[key] == expected[key], f"{label}: {key} changed")

    return measured, set(decoded_counts)


def validate() -> dict[str, Any]:
    a, a_strings = validate_cube("A")
    b, b_strings = validate_cube("B")
    intersection = a_strings & b_strings
    union = a_strings | b_strings
    overlap_a = Decimal(len(intersection)) * 100 / Decimal(len(a_strings))
    overlap_b = Decimal(len(intersection)) * 100 / Decimal(len(b_strings))
    overlap_min = Decimal(len(intersection)) * 100 / Decimal(min(len(a_strings), len(b_strings)))
    jaccard = Decimal(len(intersection)) * 100 / Decimal(len(union))

    require(len(intersection) == 966, "A/B unique-string intersection changed")
    require(len(union) == 2777, "A/B unique-string union changed")

    return {
        "status": "PASS",
        "scope": "SOURCE_INTEGRITY_AND_DECODER_DAG_ONLY",
        "base": "bytes[0..255]",
        "strings_encoding": "latin1_byte_projection",
        "cubes": {"A": a, "B": b},
        "overlap": {
            "definition": "shared_unique_decoded_strings/min(unique_A,unique_B); excludes byte base",
            "intersection": len(intersection),
            "union": len(union),
            "a_percent": str(overlap_a),
            "b_percent": str(overlap_b),
            "headline_percent": str(overlap_min),
            "headline_unique_percent": str(Decimal(100) - overlap_min),
            "jaccard_percent": str(jaccard),
        },
        "metrics": "ARTIFACT_CARRIED_NOT_CORPUS_REPLAYED",
        "encoder_duplicate_id_law": "MISSING_HELD",
        "live_promotion": "HELD_NO_UNANIMOUS_CP_MINT_VOTE",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="emit the complete validation summary")
    args = parser.parse_args()
    summary = validate()
    if args.json:
        print(json.dumps(summary, indent=2, sort_keys=True))
    else:
        print(
            "CUBEABVERIFY|"
            f"A_sha={summary['cubes']['A']['sha256']}|"
            f"B_sha={summary['cubes']['B']['sha256']}|"
            "decoder_dag=PASS|latin1_projection=PASS|"
            f"shared_unique={summary['overlap']['intersection']}|"
            f"overlap_min_pct={Decimal(summary['overlap']['headline_percent']):.6f}|"
            "metrics=ARTIFACT_CARRIED_NOT_REPLAYED|"
            "encoder_law=MISSING_HELD|promotion=HELD|status=PASS"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
