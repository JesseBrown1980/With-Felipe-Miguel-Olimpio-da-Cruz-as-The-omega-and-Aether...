#!/usr/bin/env python3
"""Run the pinned, vendored Layer-4/5 Q-PRISM + N-Nest software gate.

Original upstream_bridge.py is unchanged. The adapter checks the exact Git
blob bytes from UPSTREAM-LOCK.json instead of requiring separately checked-out
Git repositories. Hash consistency is not independent source authentication.
"""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import upstream_bridge as bridge

HERE = Path(__file__).resolve().parent
Q = HERE / "vendor" / "qprism-control"
N = HERE / "vendor" / "nnest"
LOCK = HERE / "UPSTREAM-LOCK.json"
OUT = HERE / "artifacts"


def git_blob_sha1(contents: bytes) -> str:
    header = b"blob " + str(len(contents)).encode("ascii") + b"\0"
    return hashlib.sha1(header + contents).hexdigest()


def source_check(nn: Path, q: Path):
    assert nn.resolve() == N.resolve() and q.resolve() == Q.resolve()
    pins = json.loads(LOCK.read_text(encoding="utf-8"))
    assert pins["schema"] == "ASOLARIA-SEAT1-NNEST-QPRISM-SOURCE-PINS-V1"
    assert len(pins["sources"]) == 2
    verified = {}
    for item, root in zip(pins["sources"], (nn, q)):
        actual = {}
        for name, expected in item["files"].items():
            src = (root / name).resolve()
            assert src.is_relative_to(root.resolve()), "Path escapes vendor root"
            raw = src.read_bytes()
            found = git_blob_sha1(raw)
            assert found == expected, f"Upstream byte mismatch: {name}"
            actual[name] = found
        verified[item["repo"]] = {"commit": item["commit"], "blobs": actual}
    return pins, verified


def adversarial_gate():
    pins = json.loads(LOCK.read_text(encoding="utf-8"))
    pin = pins["sources"][1]
    params = {
        "control_arm": "prism", "seed": 20261015, "coupling": 0.9,
        "budget": 8, "reference_samples": 200, "influence": 0.5,
        "synthetic_only": True,
    }
    good = bridge.leaf(Q, params, pin)
    tampered = copy.deepcopy(good)
    tampered["selector"] = "HG1024:QPRISM:FORGED-SELECTOR"
    tampered["scores"]["snr"] += 3.0

    legitimate = bridge.independent_watcher(Q, params, pin, tampered)
    assert legitimate["verdict"] == "HELD"

    normal_process = bridge.process
    forged_script = HERE / "forged_watcher.py"
    observed = {"spawned": False}

    def substituted_process(argv, cwd=None, input=None):
        if len(argv) >= 3 and argv[2] == "watch":
            observed["spawned"] = True
            response = subprocess.run(
                [sys.executable, str(forged_script)],
                cwd=cwd, input=input, capture_output=True, check=True,
                text=True, encoding="utf-8",
            )
            return response.stdout
        return normal_process(argv, cwd=cwd, input=input)

    bridge.process = substituted_process
    try:
        forged = bridge.independent_watcher(Q, params, pin, tampered)
    finally:
        bridge.process = normal_process
    assert observed["spawned"]
    assert forged["verdict"] == "PASS"
    assert bridge.check_nested(forged, 7)["apex_green"]
    parent = bridge.parent_recompute_watcher_gate(Q, pin, params, tampered, forged)
    assert parent["verdict"] == "HELD"
    assert not bridge.check_nested(parent, 3)["apex_green"]
    assert not bridge.check_nested(parent, 7)["apex_green"]
    assert parent["source_authenticated"] is False
    print("ADVERSARIAL_WATCHER_GATE_PASS forged_subprocess_detected=1 "
          "unanchored_false_green=1 anchored_parent_held=1")


def main():
    # Preserve the imported original source byte-for-byte.
    bridge.source_check = source_check
    source_check(N, Q)
    bridge.run(N, Q, OUT)
    bridge.audit(OUT)
    adversarial_gate()
    print("VENDORED_QPRISM_NNEST_GATE_PASS software_only=1 "
          "source_authenticated=0 physical_host_attested=0")


if __name__ == "__main__":
    main()
