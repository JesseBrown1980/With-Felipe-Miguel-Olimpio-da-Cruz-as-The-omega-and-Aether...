#!/usr/bin/env python3
"""Cross-OS audit preserving raw Q-PRISM numeric trace differences.

No silent correction: exact raw .hbp SHA mismatch is classified as SOURCE_BYTES_DRIFT.
The separate SEMANTIC comparison intentionally removes ONLY received_proposal_sha256.
"""
import hashlib
import json
from pathlib import Path
import sys

PRE_CORRECTION_SEMANTIC="30fcc0cef4bd0b8a1b25c4773781474d362ec93978d853626b3d2f13b752e545"
EXPECTED_CORRECTED_SEMANTIC="e07558181ed548986398e6638187317fd1562698ce56210f78b8ebe8041b1c96"
EXCLUDED_FIELD="received_proposal_sha256"

def digest(raw):
    return hashlib.sha256(raw).hexdigest()
def canon(v):
    return json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=True,allow_nan=False).encode("ascii")

def load(folder):
    record=json.loads((folder/"seat1-recurrence.json").read_bytes())
    assert record["status"]=="PASS" and record["case_count"]==72
    evidence={}
    for ext in ("json","hbp","hbi"):
        path=folder/("seat1-recurrence."+ext)
        data=path.read_bytes()
        expect=(folder/(path.name+".sha256")).read_text("ascii").split()
        assert expect==[digest(data),path.name],path
        evidence[ext]=digest(data)
    assert evidence["hbp"]==record["trace_sha256"]
    assert len((folder/"seat1-recurrence.hbp").read_bytes())==record["trace_bytes"]
    return record,evidence

def semantic(record):
    result=[]
    for case in record["results"]:
        assert EXCLUDED_FIELD in case
        scoped=dict(case)
        scoped.pop(EXCLUDED_FIELD)
        result.append(scoped)
    return {"schema":record["schema"],
            "source_fixture_sha256":record["source_fixture_sha256"],
            "results":result}

def main():
    if len(sys.argv)!=4:
        raise SystemExit("usage: python verify_rim_cross_os.py ubuntu_folder windows_folder output_folder")
    a,e1=load(Path(sys.argv[1]))
    b,e2=load(Path(sys.argv[2]))
    sa,sb=semantic(a),semantic(b)
    assert len(sa["results"])==len(sb["results"])==72
    assert sa==sb,"CASE_SEMANTIC_OUTCOME_DIVERGENCE"
    h=digest(canon(sa))
    assert h==EXPECTED_CORRECTED_SEMANTIC,"Corrected W-arm semantic digest drift: "+h
    assert h!=PRE_CORRECTION_SEMANTIC,"W-arm correction not applied"
    assert all(x["watcher_attack_exercised"] is False and x["accepted_for_processing"] is True
               for x in a["results"] if x["arm"] in ("A","B") and x["scenario"]=="W")
    assert all(x["watcher_attack_exercised"] is True
               for x in a["results"] if x["arm"] in ("C","D") and x["scenario"]=="W")
    changed=sum(x[EXCLUDED_FIELD]!=y[EXCLUDED_FIELD]
                for x,y in zip(a["results"],b["results"]))
    # Raw Q-PRISM bytes have shown BOTH exact matches and full proposal-hash
    # drift on repeated CI runs with identical source. Do not manufacture a
    # permanently OS-specific explanation from an intermittent finding.
    assert changed in (0,72),"Partial source SHA disagreement needs forensic investigation"
    raw_equal=(a["trace_sha256"]==b["trace_sha256"])
    assert raw_equal==(changed==0),"Unexplained raw-trace discrepancy"

    assert all(not z["release_authorized"] and not z["human_consent"]
               for z in a["results"]+b["results"])
    assert all(z["source_authenticated"] == (z["arm"]=="D" and z["scenario"] not in ("S","R"))
               for z in a["results"]+b["results"])
    verdict={
        "schema":"ASOLARIA-SEAT1-RIM-CROSS-OS-OBSERVABILITY-V1",
        "status":"PASS_BYTE_EXACT" if raw_equal else "PASS_SEMANTIC_ONLY_RAW_DRIFT",
        "cases_compared":72,
        "per_case_semantic_mismatches":0,
        "raw_trace_same_bytes":raw_equal,
        "raw_proposal_sha256_differences":changed,
        "excluded_from_semantic_comparison":[EXCLUDED_FIELD],
        "approved_exclusion_reason":"Raw Q-PRISM proposal digest has drifted on some cross-OS runs but matched exactly on others; root cause NOT isolated, no claim of permanent platform divergence",
        "semantic_sha256":h,
        "linux_trace_sha256":e1["hbp"],
        "windows_trace_sha256":e2["hbp"],
        "source_fixture_sha256":a["source_fixture_sha256"],
        "pre_correction_semantic_sha256":PRE_CORRECTION_SEMANTIC,
        "w_without_watcher_corrected":True,
        "all_human_release_authorizations_false":True,
        "physical_host_independence_attested":False,
        "follow_up":"Check dependency, BLAS/math-library versions and numerical serialization; compare repeated runs per same OS before inferring a platform cause."
    }
    out=Path(sys.argv[3]);out.mkdir(parents=True,exist_ok=True)
    payload=canon(verdict)+b"\n"
    p=out/"cross-os-recurrence-audit.json"
    p.write_bytes(payload)
    (out/(p.name+".sha256")).write_text(digest(payload)+"  "+p.name+"\n","ascii")
    print(json.dumps(verdict,sort_keys=True))
if __name__=="__main__":main()
