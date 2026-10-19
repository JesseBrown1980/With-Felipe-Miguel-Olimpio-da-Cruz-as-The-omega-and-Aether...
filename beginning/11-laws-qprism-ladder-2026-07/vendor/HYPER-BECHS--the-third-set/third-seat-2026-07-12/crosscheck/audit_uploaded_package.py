#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
receipt = ROOT / "E8-E100-THIRD-SEAT-RECEIPT-2026-07-12.md"
sidecar = ROOT / "E8-E100-THIRD-SEAT-RECEIPT-2026-07-12.md.sha256"
text = receipt.read_text(encoding="utf-8")
actual = hashlib.sha256(receipt.read_bytes()).hexdigest()
expected = sidecar.read_text(encoding="utf-8").split()[0]
codec = ROOT / "asolaria_codec_v0_1.py"
ladder = ROOT / "behcs_ladder_roundtrip.py"

checks = {
    "receipt_sha_expected": expected,
    "receipt_sha_actual": actual,
    "receipt_sidecar_match": actual == expected,
    "codec_sha256": hashlib.sha256(codec.read_bytes()).hexdigest(),
    "ladder_sha256": hashlib.sha256(ladder.read_bytes()).hexdigest(),
    "test4_bpc_recomputed": 392002 * 8 / 1_000_000,
    "test5_e8_payload_ratio_recomputed": 100_000_000 / 3200,
    "test5_e9_payload_ratio_recomputed": 1_000_000_000 / 3200,
    "test6_e10_payload_ratio_recomputed": 10_000_000_000 / 3200,
    "test7_34_glyph_capacity_gt_e100": 1024 ** 34 > 10 ** 100,
    "test7_33_glyph_capacity_lt_e100": 1024 ** 33 < 10 ** 100,
    "test7_60_tuple_decimal_digits": len(str(1024 ** 60 - 1)),
    "test8_mint_bpc_recomputed": 342210 * 8 / 1_000_000,
    "test8_prior_drop_pct_recomputed": (2.912 - 2.437) / 2.912 * 100,
    "receipt_contains_tests_1_to_8": all(f"Test {i}" in text for i in range(1, 9)),
    "provided_scripts_cover_tests": {
        "1_2": "behcs_ladder_roundtrip.py",
        "3": "no v0 script supplied",
        "4": "asolaria_codec_v0_1.py",
        "5": "no producing script supplied",
        "6": "no producing script supplied",
        "7": "no virtual-object definition supplied",
        "8": "no mint/prior script supplied",
    },
    "extended_reads_11_20_present": "read 20" in text.lower() or "reads 11" in text.lower(),
}
print(json.dumps(checks, indent=2))
if not checks["receipt_sidecar_match"]:
    raise SystemExit(1)
