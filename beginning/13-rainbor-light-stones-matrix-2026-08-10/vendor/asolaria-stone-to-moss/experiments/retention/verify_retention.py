#!/usr/bin/env python3
"""Offline CI: compare independent GF(2) loss/rank results and negative controls."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "experiments" / "retention"
STONE = ROOT / "stones" / "2026-10-14-rainbow81"
CHALLENGE = ROOT / "experiments" / "seat1" / "TRIAD-27-CHALLENGE-20261014.json"
EXPECTED = "f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78"
ROWS = STONE / "retention-81-rank40.tsv"
RECEIPT = STONE / "retention-81-rank40.json"

EXPECTED_RANKS = {
    ("legacy", "CA150"): 79,
    ("legacy", "CA90"): 80,
    ("legacy", "CA60"): 80,
    ("legacy", "CA102"): 80,
    ("legacy", "SHIFT"): 81,
    ("triad-stress", "TAP0"): 80,
    ("triad-stress", "TAP1"): 80,
    ("triad-stress", "TAP2"): 81,
    ("triad-stress", "TAP3"): 81,
    ("triad-stress", "TAP4"): 80,
}
HORIZONS = [1, 10**13, 10**13 + 1, 10**13 + 81]


def sha(value):
    return hashlib.sha256(value).hexdigest()


def run(command):
    return subprocess.run(command, capture_output=True, text=True, check=True,
                          timeout=120)


def main():
    raw = ROWS.read_bytes()
    assert sha(raw) == EXPECTED
    side = ROWS.with_suffix(".tsv.sha256").read_text("ascii").split()
    assert side == [EXPECTED, ROWS.name]
    lines = raw.decode("ascii").splitlines()
    assert len(lines) == 40
    for i, ((family, law), rank) in enumerate(EXPECTED_RANKS.items()):
        for j, horizon in enumerate(HORIZONS):
            assert lines[i*4+j] == (
                f"{family}|{law}|{horizon}|{rank}|{81-rank}|{2**(81-rank)}"
            )
    receipt_bytes = RECEIPT.read_bytes()
    sealed_sha = RECEIPT.with_suffix(".json.sha256").read_text("ascii").split()
    assert sealed_sha == [sha(receipt_bytes), RECEIPT.name]
    record = json.loads(receipt_bytes)
    assert record["schema"] == "ASOLARIA-GF2-81-INFORMATION-RETENTION-STONE-V1"
    assert record["challenge_sha256"] == sha(CHALLENGE.read_bytes())
    assert record["cross_language"]["canonical_tsv_sha256"] == EXPECTED
    assert record["cross_language"]["mismatches"] == 0
    assert record["model_horizons"] == HORIZONS
    assert record["scope"]["physical_host_independence_verified"] is False
    assert record["scope"]["fresh_cross_host_blinded_challenge"] is False
    assert record["scope"]["huggingface_remote_publication_verified"] is False
    assert record["scope"]["repairs_original_seat2_signature"] is False
    for item in record["results"]:
        rank = EXPECTED_RANKS[(item["family"], item["law"])]
        assert item["rank"] == rank
        assert item["lost_bits"] == 81-rank
        assert item["preimages_per_reachable_output"] == 2**(81-rank)

    with tempfile.TemporaryDirectory(prefix="asolaria-retention-") as root:
        tmp = Path(root)
        pyout = tmp / "python.tsv"
        jsout = tmp / "node.tsv"
        p = json.loads(run([sys.executable, str(DIR/"retention_poly.py"),
                            str(CHALLENGE), str(pyout)]).stdout)
        n = json.loads(run(["node", str(DIR/"retention_matrix.js"),
                            str(CHALLENGE), str(jsout)]).stdout)
        assert pyout.read_bytes() == jsout.read_bytes() == raw
        assert p["csv_sha256"] == n["csv_sha256"] == EXPECTED
        assert p["rows"] == n["rows"] == 40
        assert p["laws"] == n["laws"] == 10
        assert p["horizon_count"] == n["horizon_count"] == 4
        assert p["physical_host_verified"] is False
        assert n["physical_host_verified"] is False
        for a,b in zip(p["law_results"], n["law_results"], strict=True):
            for field in ("family", "law", "taps", "rank",
                          "kernel_dimension_bits", "preimages_per_reachable_output"):
                assert a[field] == b[field], (field,a,b)

        # The challenge is pinned byte-for-byte, not only by parsed values.
        bad = CHALLENGE.read_bytes().replace(b"eff1eda9", b"0ff1eda9", 1)
        assert bad != CHALLENGE.read_bytes()
        badfile = tmp / "badchallenge.json"
        badfile.write_bytes(bad)
        for argv in (
            [sys.executable, str(DIR/"retention_poly.py"), str(badfile), str(pyout)],
            ["node", str(DIR/"retention_matrix.js"), str(badfile), str(jsout)],
        ):
            r = subprocess.run(argv, capture_output=True, text=True, timeout=120)
            assert r.returncode != 0, "mutated challenge should be rejected"
        assert sha(raw[:-1]+b"X") != EXPECTED

    print(json.dumps({
        "status":"PASS", "evidence":"mathematical injectivity; not physical",
        "rank_cases":40, "laws":10, "horizons":4,
        "two_languages_byte_equal":True,
        "independent_algorithm_parity":True,
        "negative_controls":"PASS", "canonical_sha256":EXPECTED,
        "receipt_sha256":sha(RECEIPT.read_bytes()),
        "physical_host_attested":False
    },sort_keys=True))


if __name__ == "__main__":
    main()
