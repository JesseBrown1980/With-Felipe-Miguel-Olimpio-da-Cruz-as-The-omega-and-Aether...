#!/usr/bin/env python3
"""Independent release integration for Seat 1 32,805-row *software* triad.
Requires only Python, Node.js and the merged public source.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CHALLENGE = ROOT / "experiments/seat1/TRIAD-27-CHALLENGE-20261014.json"
STONE = ROOT / "stones/2026-10-14-rainbow81"
EXPECTED_INPUT = "e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
EXPECTED_OUTPUT = "720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3"


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def calculate(pyout, jsout):
    assert digest(CHALLENGE.read_bytes()) == EXPECTED_INPUT
    cmd_python = [sys.executable, str(ROOT/"experiments/seat1/triad_27_python.py"),
                  str(CHALLENGE), str(pyout), "--self-test"]
    cmd_node = ["node", str(ROOT/"experiments/seat1/triad_27_node.js"),
                str(CHALLENGE), str(jsout), "--self-test"]
    p = json.loads(subprocess.run(cmd_python, check=True, capture_output=True,
                                  text=True, timeout=120).stdout)
    n = json.loads(subprocess.run(cmd_node, check=True, capture_output=True,
                                  text=True, timeout=120).stdout)
    data = pyout.read_bytes()
    assert data == jsout.read_bytes()
    assert digest(data) == EXPECTED_OUTPUT
    assert len(data) == 6392029
    for r in (p, n):
        assert r["status"] == "PASS"
        assert r["challenge_sha256"] == EXPECTED_INPUT
        assert r["sha256"] == EXPECTED_OUTPUT
        assert r["rows"] == r["linearity"] == 32805
        assert r["successor"] == r["plus81"] == r["rotation"] == 10935
        assert r["smallstep"] == 120
    assert {k:v for k,v in p.items() if k!="algorithm"} == {
        k:v for k,v in n.items() if k!="algorithm"
    }
    verification = subprocess.run(
        [sys.executable, str(ROOT/"experiments/seat1/triad_release_verify.py"),
         str(pyout), str(jsout)], check=True, capture_output=True,text=True,timeout=120
    )
    assert json.loads(verification.stdout)["status"] == "PASS"
    return data


def main():
    with tempfile.TemporaryDirectory(prefix="seat1-triad-release-") as d:
        tmp = Path(d)
        full = calculate(tmp/"python.hbp", tmp/"node.hbp")
        print(json.dumps({
            "status":"PASS",
            "evidence_class":"independent software replay on CI/cloud machines",
            "body_state_rows":32805,
            "horizons":[10**13,10**13+1,10**13+81],
            "source_challenge_sha256":EXPECTED_INPUT,
            "full_hbp_sha256":digest(full),
            "physical_host_independence_verified":False,
        },sort_keys=True))


if __name__ == "__main__":
    main()
