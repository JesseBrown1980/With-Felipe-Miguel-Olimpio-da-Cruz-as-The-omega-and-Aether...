#!/usr/bin/env python3
"""Check append-only hosted Seat3 Rainbow27 V2 stone against newly generated evidence."""
import hashlib
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
STONE=ROOT/"stones/2026-10-15-rainbow81/seat3-rainbow27-normalized-v2-20261015.hbp"
EXPECTED="56431c449b4e89f9dcca527ce44d239b6bc23e1f36fd3107c6ff722cb8489e2c"
def sha(raw):return hashlib.sha256(raw).hexdigest()
def main(folder):
    text=STONE.read_bytes()
    assert sha(text)==EXPECTED,"committed stone drift"
    side=STONE.with_name(STONE.name+".sha256").read_text("ascii").split()
    assert side==[EXPECTED,STONE.name],"stone sidecar mismatch"
    lines=text.decode("ascii").splitlines()
    assert len(lines)==10
    parsed=[dict(t.split("=",1) for t in ln.split("|") if "=" in t) for ln in lines]
    info=parsed[4]; input_info=parsed[3]; lanes=parsed[5]
    original=(folder/"rainbow27-v2.hbp").read_bytes()
    metrics=json.loads((folder/"rainbow27-v2.json").read_bytes())
    assert info["rows"]==str(metrics["case_count"])=="59049"
    assert info["bytes"]==str(len(original))==str(metrics["trace_bytes"])
    assert info["sha256"]==sha(original)==metrics["trace_sha256"]
    assert input_info["source_fixture_sha256"]==metrics["source_fixture_sha256"]
    assert [int(lanes["lane"+str(i)]) for i in range(3)]==metrics["sampled_lane_counts"]
    assert int(lanes["dark_held"])==metrics["dark_held"]==2187
    assert "release_issue10=OPEN" in lines[-1]
    assert metrics["external_source_authenticated"] is False
    assert metrics["release_authorized"] is False
    print("PASS_SEALED_STONE "+EXPECTED+" source_trace="+info["sha256"])
if __name__=="__main__":
    assert len(sys.argv)==2
    main(Path(sys.argv[1]))
