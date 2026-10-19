#!/usr/bin/env python3
"""Verify the append-only Seat3 summary stone against freshly regenerated output."""
import hashlib
import json
import sys
from pathlib import Path

STONE_SHA="7fbce59c1014036023ad2c476ba86ebc64e2ced96daafe42869723990cd2b4e2"
TRACE_SHA="7dfed579564a17c11e9291194819dae4dc9aa8749c297cbf356c0fd6e887ecff"
WORLD_SHA="b756cece77eca7ad2b7bd19ea4c57bca8c73ffe117a0940c1021f4272ff020f0"
def sha(raw):return hashlib.sha256(raw).hexdigest()

def audit(path,metrics):
    p=Path(path)
    content=p.read_bytes()
    check=(p.parent/(p.name+".sha256")).read_text("ascii").split()
    assert len(content)==1208 and sha(content)==STONE_SHA
    assert check==[STONE_SHA,p.name],"stone sidecar mismatch"
    rows=content.decode("ascii").splitlines()
    assert rows[0].startswith("PORTAL|schema=ASOLARIA-SEAT3-AUTONOMOUS-IDENTITY-STONE-V1")
    assert rows[-1]=="END|immutable_old_stones=1|peer_review=pending|release_gate=OPEN|json=0"
    body="\n".join(rows)
    assert "prereg_commit=f1ea18fa24632e7ac5840316c658053af6e4a308" in body
    assert "law_blob_sha1=f84710d3018882b7282b9fda227638c57568ffe4" in body
    assert "CI|run=38720117338|os=ubuntu,windows|python=3.11,3.13|node=22|jobs=4/4_PASS" in body
    assert "|operator_prompts_per_tick=0|" in body or "|prompts_per_tick=0|" in body
    actual=json.loads(Path(metrics).read_text("utf8"))
    assert actual["trace_sha256"]==TRACE_SHA and actual["trace_bytes"]==121239
    assert actual["baseline_final_sha256"]==WORLD_SHA
    assert actual["faulted_final_sha256"]==WORLD_SHA
    assert actual["paused_resumed_final_sha256"]==WORLD_SHA
    assert actual["initial_entities"]==81 and actual["final_entities"]==108
    assert actual["virtual_spawns"]==27 and actual["ticks"]==1080
    assert actual["max_depth"]==7 and actual["operator_prompts_per_tick"]==0
    assert [x["tick"] for x in actual["corrections"]]==[31,401,799,1000]
    assert ("TRACE|bytes=121239|sha256="+TRACE_SHA) in body
    assert ("WORLD|baseline_faulted_and_resumed_identical=1|sha256="+WORLD_SHA) in body
    assert actual["source_authenticated"] is False
    assert actual["physical_host_attested"] is False
    print(json.dumps({"verified":"SEAT3_AUTONOMOUS_STONE_PASS",
                      "stone_bytes":len(content),"stone_sha256":STONE_SHA,
                      "full_trace_sha256":TRACE_SHA,"world_sha256":WORLD_SHA,
                      "release_gate":"OPEN"},sort_keys=True))
if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: python verify_sealed_autonomous_stone.py stone.hbp freshly_generated_metrics.json")
    audit(*sys.argv[1:])
