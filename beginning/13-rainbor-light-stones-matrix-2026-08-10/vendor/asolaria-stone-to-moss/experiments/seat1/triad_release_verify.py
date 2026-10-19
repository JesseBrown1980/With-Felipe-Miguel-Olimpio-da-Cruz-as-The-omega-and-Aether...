#!/usr/bin/env python3
"""Verify publicly sealed Seat 1 triad receipts against full Python/Node outputs."""
import hashlib,json,pathlib,sys

ROOT=pathlib.Path(__file__).resolve().parents[2]
STONE=ROOT/"stones"/"2026-10-14-rainbow81"
PREFIX="seat-1-20261014-triad27-three-horizon"
CHALLENGE=ROOT/"experiments"/"seat1"/"TRIAD-27-CHALLENGE-20261014.json"
EXPECTED_RESULT="720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3"
EXPECTED_CHALLENGE="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"

def sha(b):return hashlib.sha256(b).hexdigest()
def verify_sidecar(name):
    f=STONE/(PREFIX+"."+name)
    fields=(STONE/(PREFIX+"."+name+".sha256")).read_text(encoding="ascii").strip().split()
    assert len(fields)==2 and fields[1]==f.name and fields[0]==sha(f.read_bytes()),f.name
    return f.read_bytes()
def main():
    assert len(sys.argv)==3,"Usage: python triad_release_verify.py python.hbp node.hbp"
    p=pathlib.Path(sys.argv[1]).read_bytes()
    n=pathlib.Path(sys.argv[2]).read_bytes()
    assert p==n and sha(p)==EXPECTED_RESULT
    assert sha(CHALLENGE.read_bytes())==EXPECTED_CHALLENGE
    assert p.count(b"WAVE|")==32805
    assert b"physical_tested=0" in p
    receipt=json.loads(verify_sidecar("json"))
    hbp=verify_sidecar("hbp")
    hbi=verify_sidecar("hbi")
    assert receipt["python_node_exact_rows"]==32805
    assert receipt["hbp_sha256"]==EXPECTED_RESULT
    assert receipt["challenge_sha256"]==EXPECTED_CHALLENGE
    assert receipt["physical_host_independently_verified"] is False
    assert receipt["fresh_three_host_challenge"] is False
    assert receipt["linearity_controls_per_implementation"]==32805
    assert all(receipt[k]==10935 for k in (
        "rotation_controls_per_implementation","plus81_composition_checks_per_implementation",
        "successor_checks_per_implementation"))
    assert b"mismatches=0" in hbp and b"physical_host_attested=0" in hbi
    assert sha(p[:-1]+b"Z")!=EXPECTED_RESULT
    print(json.dumps({"status":"PASS","seat":"seat-1","records":32805,
                      "metamorphic_per_lang":65610,
                      "checksums_verified":3,"full_hbp_sha256":EXPECTED_RESULT,
                      "physical_host":False},sort_keys=True))
if __name__=="__main__":main()
