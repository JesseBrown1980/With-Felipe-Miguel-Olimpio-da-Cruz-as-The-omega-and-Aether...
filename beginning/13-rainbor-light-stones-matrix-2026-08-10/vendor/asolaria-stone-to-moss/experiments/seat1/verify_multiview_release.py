#!/usr/bin/env python3
"""Verify Seat1 sealed 2026-10-15 public software receipt and both raw traces.

This checks byte hashes, result classifications and cross-runtime equality.
No physical host identity or independent lab observation is inferred.
"""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/"stones/2026-10-15-rainbow81"
NAME="seat-1-complementary-views-21392"
TRACE="17f25be31a6f419d98db31d70f63aea2e3dffad00c44453b963bdfbaedb8683c"
SOURCE="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"

def sha(b):
    return hashlib.sha256(b).hexdigest()

def main():
    files={}
    for ext in (".json",".hbp",".hbi"):
        file=DIR/(NAME+ext)
        raw=file.read_bytes()
        actual=sha(raw)
        recorded=(file.parent/(file.name+".sha256")).read_text("ascii").split()
        assert recorded==[actual,file.name],file
        files[ext]=(raw,actual)
    receipt=json.loads(files[".json"][0])
    assert receipt["schema"]=="ASOLARIA-SEAT1-COMPLEMENTARY-VIEWS-RECOVERY-V1"
    assert receipt["physical_host_independently_attested"] is False
    assert receipt["physical_three_host_challenge_issued"] is False
    assert receipt["input_challenge_sha256"]==SOURCE
    assert receipt["trace_sha256"]==TRACE
    assert receipt["trace_size_bytes"]==4180845
    assert receipt["exact_reconstructions"]==21392
    assert [receipt[k] for k in
       ("zero_side_bit_reconstructions","one_side_bit_reconstructions",
        "two_side_bit_reconstructions")]==[4584,16044,764]
    assert receipt["kernel_collision_witnesses"]==96
    assert receipt["wrong_tag_controls"]==88
    assert receipt["no_gain_from_later_same_law_outputs"]==14
    index=files[".hbi"][0].decode("ascii")
    for ext in (".json",".hbp"):
        assert ("file="+NAME+ext+"|sha256="+files[ext][1]) in index
    assert ("sha256="+TRACE) in index
    for path in sys.argv[1:]:
        raw=Path(path).read_bytes()
        assert len(raw)==4180845 and sha(raw)==TRACE,path
        assert raw.count(b"RECORD|")==21392,path
    assert len(sys.argv) in (1,3),"Pass both the Python and Node traces, or neither"
    if len(sys.argv)==3:
        assert Path(sys.argv[1]).read_bytes()==Path(sys.argv[2]).read_bytes()
    print(json.dumps({"status":"PASS","sidecars":3,"rank_cases":112,
       "exact_reconstructions":21392,"raw_traces_verified":len(sys.argv)-1,
       "trace_sha256":TRACE,"physical_host_independence_verified":False},sort_keys=True))
if __name__=="__main__":main()
