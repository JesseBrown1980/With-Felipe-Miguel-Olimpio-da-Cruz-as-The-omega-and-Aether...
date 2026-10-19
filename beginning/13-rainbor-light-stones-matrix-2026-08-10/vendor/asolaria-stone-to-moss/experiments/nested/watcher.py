#!/usr/bin/env python3
"""Nested Rainbow81 grandchild watcher. Independent direct GF(2) single-step check.
Protocol: newline-delimited JSON via stdio; gate cannot be self-approved by child.
"""
import hashlib, json, os, sys, time

N = 81
MASK = (1 << N) - 1
VALID = ([0,1], [0,2], [0,1,3], [0,4,7], [0,1,5,9])

def step(v, taps):
    out = 0
    for t in taps:
        out ^= (((v << t) | (v >> (N - t))) & MASK) if t else v
    return out & MASK

def output(data):
    print(json.dumps(data, sort_keys=True, separators=(",", ":")), flush=True)

output({"kind": "ready", "role": "grandchild-watcher", "pid": os.getpid(), "started_ms": time.time_ns()//1_000_000})
for request in sys.stdin:
    started = time.time_ns() // 1_000_000
    try:
        msg = json.loads(request)
        assert msg["kind"] == "verify", "request-kind"
        cases = msg["cases"]
        assert isinstance(cases, list) and 1 <= len(cases) <= 405
        passed = 0
        for case in cases:
            taps = case["taps"]
            assert taps in VALID, "invalid-law"
            a, b = int(case["at_t"], 16), int(case["at_tplus1"], 16)
            assert 0 <= a <= MASK and 0 <= b <= MASK
            if step(a, taps) != b:
                raise ValueError(f"watcher-mismatch-case-{passed}")
            passed += 1
        digest = hashlib.sha256(json.dumps(cases, sort_keys=True, separators=(",", ":")).encode("ascii")).hexdigest()
        output({"kind": "watcher-verdict", "status": "PASS", "checked": passed,
                "checks_sha256": digest, "watcher_pid": os.getpid(),
                "started_ms": started, "ended_ms": time.time_ns()//1_000_000})
    except Exception as err:
        output({"kind": "watcher-verdict", "status": "REJECT", "checked": 0,
                "reason": str(err)[:150], "watcher_pid": os.getpid(),
                "started_ms": started, "ended_ms": time.time_ns()//1_000_000})
