#!/usr/bin/env python3
"""Fail closed on cross-language and cross-OS optogenetic digital traces."""
import hashlib,json,sys
from pathlib import Path
def sha(b):return hashlib.sha256(b).hexdigest()
def check(path):
    data=(path/"opto-python.hbp").read_bytes()
    js=(path/"opto-node.hbp").read_bytes()
    assert data==js,"PYTHON_NODE_TRACE_MISMATCH"
    assert data.count(b"ARM|")==8748
    assert b"GATES|mass=PASS|ids_immutable=PASS" in data
    assert b"physical_photons=0" in data
    assert data.endswith(b"END|cases=4|site_wave_snapshots=8748|steps_per_arm=1080|claims_of_consciousness=0\n")
    p=json.loads((path/"opto-python.json").read_text())
    n=json.loads((path/"opto-node.json").read_text())
    assert p["trace_sha256"]==n["trace_sha256"]==sha(data)
    assert p["trace_bytes"]==n["trace_bytes"]==len(data)
    for a,b in zip(p["arms"],n["arms"]):
        for k in ("arm","total_absolute_open_error","light_commands",
                  "total_closed_to_open_transitions","final_open_population"):
            assert a[k]==b[k],(k,a,b)
    assert len(p["arms"])==len(n["arms"])==4
    assert p["arms"][0]["total_closed_to_open_transitions"]==0
    assert p["controls"]["corrupt_observer_rejected_by_true_state_anchor"]
    return p,sha(data)
def main():
    if len(sys.argv) not in (2,3):raise SystemExit("python verify_opto.py directory [other_directory]")
    p,h=check(Path(sys.argv[1]))
    if len(sys.argv)==3:
        q,h2=check(Path(sys.argv[2]))
        assert h==h2,"CROSS_OS_TRACE_BYTE_DRIFT"
        assert p["arms"]==q["arms"],"CROSS_OS_METRIC_DRIFT"
    for file in Path(sys.argv[1]).glob("*.sha256"):
        sha_expected,name=file.read_text("ascii").split()
        assert sha((file.parent/name).read_bytes())==sha_expected
    print(json.dumps({"status":"PASS","trace_sha256":h,"snapshots":8748,
                      "cross_os_checked":len(sys.argv)==3,
                      "feedback_error":next(x["total_absolute_open_error"] for x in p["arms"] if x["arm"]=="feedback_truth"),
                      "open_loop_error":next(x["total_absolute_open_error"] for x in p["arms"] if x["arm"]=="open_loop"),
                      "source_authentication_claimed":False},sort_keys=True))
if __name__=="__main__":main()
