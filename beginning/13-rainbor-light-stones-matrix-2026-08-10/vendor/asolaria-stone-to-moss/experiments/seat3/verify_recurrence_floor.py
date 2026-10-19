#!/usr/bin/env python3
"""Verify exact recurrent-fault enumeration, independently authored sources and sealed HBP."""
import hashlib
import json
import sys
from fractions import Fraction
from pathlib import Path
EXPECTED_SHA="3f4d0d407eefa32ff0806f2075fdd66569f79c4d49c2f466dc0e0580d18a94ff"
EXPECTED_BYTES=1739
ARMS=("one_pass","self_recurrence","independent_common_source","independent_trusted_anchor")
def sha(b):return hashlib.sha256(b).hexdigest()
def verify(py_hbp,node_hbp,py_json,node_json,committed_hbp):
    x=Path(py_hbp).read_bytes()
    y=Path(node_hbp).read_bytes()
    z=Path(committed_hbp).read_bytes()
    assert x==y==z, "Python / Node / repository sealed stone byte mismatch"
    assert len(x)==EXPECTED_BYTES and sha(x)==EXPECTED_SHA, "full deterministic trace changed"
    assert b'physical_host_attested=0' in x and b'origin_authenticated=0' in x
    assert b'missing_human_consent=HELD|operator_halt=HELD' in x
    assert b'local_digest_valid=1|precommitted_digest_matches=0' in x
    assert sha(bytes([x[0]^1])+x[1:])!=EXPECTED_SHA,"tampering not detected"
    side=Path(str(committed_hbp)+".sha256").read_text("ascii").split()
    assert side==[EXPECTED_SHA,Path(committed_hbp).name], "sealed stone sidecar mismatch"
    a=json.loads(Path(py_json).read_text(encoding="utf8"))
    b=json.loads(Path(node_json).read_text(encoding="utf8"))
    assert a==b, "independent metrics differ"
    assert a["trace_bytes"]==EXPECTED_BYTES and a["trace_sha256"]==EXPECTED_SHA
    assert a["status"]=="PASS" and a["source_authenticated"] is False
    assert a["physical_host_attested"] is False
    assert a["law_blob_sha1"]=="f84710d3018882b7282b9fda227638c57568ffe4"
    assert a["rows"]==12
    rows=[line for line in x.splitlines() if line.startswith(b"ARM|")]
    assert len(rows)==12
    for m in (1,3,7):
        total=8*4**m
        for arm in ARMS:
            item=a["counts"][str(m)][arm]
            count=item["accepted"]
            assert item["total"]==total
            f=Fraction(count,total)
            assert item["probability"]==f"{f.numerator}/{f.denominator}"
            expected=(Fraction(11,32) if arm in ARMS[:2]
                else (Fraction(4**m+7,total) if arm=="independent_common_source"
                    else Fraction(1,4**m)))
            assert f==expected,(m,arm,f,expected)
    print(json.dumps({"status":"PASS","full_hbp_bytes":EXPECTED_BYTES,
                      "sha256":EXPECTED_SHA,"checks":12,
                      "bounded_depths":[1,3,7],
                      "common_mode_floor":"1/8",
                      "human_apex_and_halt_model":"PASS",
                      "independent_python_node_bytes":"MATCH",
                      "hardware_attested":False},sort_keys=True))
if __name__=="__main__":
    if len(sys.argv)!=6:
        raise SystemExit("usage: python verify_recurrence_floor.py python.hbp node.hbp python.json node.json committed.hbp")
    verify(*sys.argv[1:])
