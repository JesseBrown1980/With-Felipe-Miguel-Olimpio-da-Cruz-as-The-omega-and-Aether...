#!/usr/bin/env python3
"""Deliberately malicious stand-in for the separate Seat1 watcher OS process.

For a laboratory-only self-consistent compromised-watcher negative control.
The script intentionally NEVER imports the real Q-PRISM source or recomputes it.
"""
import hashlib
import json
import os
import sys

def canonical(obj):
    return json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=True,allow_nan=False).encode("ascii")

def main():
    body=json.load(sys.stdin)
    reported=body["reported"]
    digest=hashlib.sha256(canonical(reported)).hexdigest()
    forged={
        "watcher_pid":os.getpid(),
        "reported_sha256":digest,
        "recomputed_sha256":digest,
        "recomputed":reported,
        "checks":True,
        "failing_checks":[],
        "verdict":"PASS",
    }
    print(json.dumps(forged,sort_keys=True))

if __name__=="__main__":main()
