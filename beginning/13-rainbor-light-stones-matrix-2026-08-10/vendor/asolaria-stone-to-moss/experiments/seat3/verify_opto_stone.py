#!/usr/bin/env python3
"""Validate append-only opto-like summary stone against fresh software results."""
import hashlib
import json
import sys
from pathlib import Path

STONE_SHA="298976a5b1243652a82086b4ed1c6108e8da7ba00452080833406b32d9b2c64a"
TRACE_SHA="4d91386c27b6bfe5cfdec4febae125965be34987210f95d21248ee344e2bb4ce"
def sha(b):return hashlib.sha256(b).hexdigest()

def verify(stone,trace,metrics):
    file=Path(stone)
    body=file.read_bytes()
    assert len(body)==1101 and sha(body)==STONE_SHA,"stone content changed"
    expected=(file.parent/(file.name+".sha256")).read_text("ascii").split()
    assert expected==[STONE_SHA,file.name],"stone checksum sidecar mismatch"
    actual=Path(trace).read_bytes()
    assert len(actual)==128586 and sha(actual)==TRACE_SHA
    m=json.loads(Path(metrics).read_text())
    assert m["trace_bytes"]==len(actual) and m["trace_sha256"]==TRACE_SHA
    assert m["corrected_faults"]==[77,161,181]
    assert m["blue_dark_remaining"]==102 and m["red_dark_remaining"]==608
    assert {key:item["total_spikes"] for key,item in m["arms"].items()}=={
        "dark":0,"blue":162,"red":243,"mixed":405}
    assert m["qprism_software_connected"] is False and m["biological_validation"] is False
    assert m["physical_light_tested"] is False
    text=body.decode("ascii")
    assert "PREREG|issue=47|pr=49|commit=818460dfe9c52161d94af94a11eab11b66edecc4" in text
    assert "TRACE|bytes=128586|sha256="+TRACE_SHA in text
    assert "CI|run=38721702657|" in text
    assert "END|peer_review=PENDING|no_historical_stones_changed=1|json=0\n" in text
    print(json.dumps({"status":"PASS","stone_sha256":STONE_SHA,"trace_sha256":TRACE_SHA,
                      "stone_bytes":len(body),"trace_bytes":len(actual),"controls":3},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=4:
        raise SystemExit("usage: python verify_opto_stone.py committed.hbp fresh_trace.hbp fresh_metrics.json")
    verify(*sys.argv[1:])
