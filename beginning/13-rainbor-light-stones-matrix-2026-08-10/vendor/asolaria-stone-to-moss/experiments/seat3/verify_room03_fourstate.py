#!/usr/bin/env python3
"""Room 03 independent full-output cross-language checker and provenance-controlled receipts."""
import hashlib
import json
import re
import sys
from fractions import Fraction
from pathlib import Path

SHA = lambda b: hashlib.sha256(b).hexdigest()
PROTOCOLS=("dark","continuous","pair_gap_5","pair_gap_20","pair_gap_60")
MASS=1000000
SCHEMA="ASOLARIA-SEAT3-ROOM03-FOURSTATE-CONTROL-V1"
LAMBDAS=("0","100000","221240","300000")

def check(py_hbp,node_hbp,py_json,node_json,outdir):
    py=Path(py_hbp).read_bytes()
    node=Path(node_hbp).read_bytes()
    if py != node:
        a, b = py.splitlines(), node.splitlines()
        first = next((i for i in range(min(len(a),len(b))) if a[i]!=b[i]),None)
        if first is None:
            raise AssertionError(f"Independent HBP length differs: Python {len(a)} rows, Node {len(b)}")
        raise AssertionError(f"Independent HBP row {first+1} mismatch: Python={a[first][:240]!r}, Node={b[first][:240]!r}")
    jm=Path(py_json).read_bytes()
    jn=Path(node_json).read_bytes()
    assert jm==jn,"Canonical JSON across independent implementations differs"
    records=py.decode("ascii").splitlines()
    assert records[0]==f"PORTAL|schema={SCHEMA}|Q=1000000|ids=81|ticks=240|protocols=5|models=2|physical=0|json=0"
    assert records[-1]=="END|model_tick_rows=2400|candidates=684|fail_closed_mutations=7|source_authenticated=0|physical_light=0|json=0"
    tickrows=[s for s in records if s.startswith("TICK|")]
    controlrows=[s for s in records if s.startswith("CANDIDATE|")]
    negrows=[s for s in records if s.startswith("NEG|")]
    selectrows=[s for s in records if s.startswith("SELECT|")]
    assert len(tickrows)==2400 and len(controlrows)==684 and len(selectrows)==4
    assert len([s for s in negrows if s.endswith("|value=HELD|json=0")])==7
    first=0
    for protocol in PROTOCOLS:
        for model in (3,4):
            exact=tickrows[first:first+240]
            assert len(exact)==240
            for t,record in enumerate(exact,1):
                header=f"TICK|protocol={protocol}|model={model}|k={t:03d}|light="
                assert record.startswith(header),(protocol,model,t)
                pairs=dict(x.split("=",1) for x in record.split("|") if "=" in x)
                assert pairs["mass"]=="1000000"
                light=int(pairs["light"])
                assert light in (0,1)
                if model==3:
                    states=[int(pairs[c]) for c in ("C","O","R")]
                    assert int(pairs["open_total"])==states[1]
                    assert int(pairs["I_proxy"])==states[1]
                else:
                    states=[int(pairs[c]) for c in ("C1","O1","O2","C2")]
                    assert int(pairs["open_total"])==states[1]+states[2]
                    assert int(pairs["I_proxy"])==states[1]+states[2]//4
                assert min(states)>=0 and sum(states)==MASS
                if protocol=="dark":
                    assert light==0 and pairs["open_total"]==pairs["I_proxy"]=="0"
            first+=240
    assert first==2400
    assert any(x=="WITNESS|open_total=250000|I_a=250000|I_b=62500|difference=187500|json=0"
               for x in records)
    assert any(x=="HALT|before_tick=73|invalid_resume=HELD|synthetic_resume=PASS|final_equal=PASS|human_prompts_per_tick=0|json=0" for x in records)
    c={}
    for x in controlrows:
        fields=dict(a.split("=",1) for a in x.split("|") if "=" in a)
        key=(int(fields["P"]),int(fields["D"]),int(fields["F"]))
        assert key not in c
        c[key]=fields
    assert len(c)==684
    for p in (3,4,6,8,10,12,16):
        assert sum(key[0]==p for key in c)==p*(p+1)
    data=json.loads(jm)
    assert data["status"]=="PASS" and data["schema"]==SCHEMA
    assert data["full_trace_sha256"]==SHA(py) and data["full_trace_bytes"]==len(py)
    assert data["candidate_count"]==684
    assert data["cohort_immutable_identity_count"]==81
    assert data["real_injected_negative_cases"]["coherent_forged_schedule"]=="MATH_GREEN_ORIGIN_UNAUTHENTICATED"
    assert data["real_injected_negative_cases"]["origin_authenticated"] is False
    assert sum(v=="HELD" for v in data["real_injected_negative_cases"].values())==7
    assert data["halt_model"]["blocked_before_tick"]==73
    assert data["halt_model"]["invalid_resume_held"] is True
    assert data["halt_model"]["same_final_state"] is True
    assert data["halt_model"]["human_prompts_per_tick"]==0
    assert data["biological_parameter_calibrated"] is False
    assert data["physical_optics_measured"] is False
    assert data["authenticated_light_source"] is False
    assert data["physical_hosts_attested"] is False
    assert data["lambda_break_even_exact"]=="8407141/38"
    assert Fraction(5878733220-4516776378,17820-11664)==Fraction(8407141,38)
    assert (data["fixed_baseline"]["total_E"],data["fixed_baseline"]["total_C"])==(5878733220,11664)
    assert (data["feedback_baseline"]["total_E"],data["feedback_baseline"]["total_C"])==(4516776378,17820)
    for lam in LAMBDAS:
        result=data["chosen_policies"][lam]
        key=tuple(result["policy"])
        assert key in c
        found=c[key]
        assert result["hold_E"]==int(found["hold_E"])
        assert result["hold_C"]==int(found["hold_C"])
        assert result["hold_J"]==result["hold_E"]+int(lam)*result["hold_C"]
        assert result["train_J"]==result["train_E"]+int(lam)*result["train_C"]
        fb=data["feedback_baseline"]
        assert result["feedback_hold_J"]==fb["hold_E"]+int(lam)*fb["hold_C"]
        expected=("tuned_open_loop" if result["hold_J"]<result["feedback_hold_J"]
                  else "feedback" if result["hold_J"]>result["feedback_hold_J"] else "tie")
        assert result["winner_vs_feedback"]==expected
    assert SHA(bytes([py[0]^1])+py[1:])!=SHA(py)
    dst=Path(outdir);dst.mkdir(parents=True,exist_ok=True)
    hbp=dst/"seat3-room03-fourstate-cost.hbp"
    hbp.write_bytes(py)
    def sidecar(path):
        (dst/(path.name+".sha256")).write_text(SHA(path.read_bytes())+"  "+path.name+"\n")
    sidecar(hbp)
    jp=dst/"seat3-room03-fourstate-cost.json"
    jp.write_bytes(jm)
    sidecar(jp)
    index=dst/"seat3-room03-fourstate-cost.hbi"
    index.write_bytes((f"HBI|schema=ASOLARIA-SEAT3-ROOM03-INDEX-V1|json=0\n"
       f"HBP|bytes={len(py)}|sha256={SHA(py)}|json=0\n"
       f"JSON|bytes={len(jm)}|sha256={SHA(jm)}|json=0\n"
       "END|calibrated_physiology=0|physical_host=0|json=0\n").encode("ascii"))
    sidecar(index)
    print(json.dumps({
        "verdict":"PASS", "full_trace_bytes":len(py),"full_trace_sha256":SHA(py),
        "tick_rows":2400,"search_candidates":684,
        "held_real_mutations":7,
        "four_state_continuous":data["protocols"]["continuous"]["4"],
        "open_loop_winners":{k:v["winner_vs_feedback"] for k,v in data["chosen_policies"].items()},
        "chosen_policies":{k:v["policy"] for k,v in data["chosen_policies"].items()},
        "external_biological_validation":False,
    },sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=6:
        raise SystemExit("usage: python verify_room03_fourstate.py python.hbp node.hbp python.json node.json artifact_dir")
    check(*sys.argv[1:])
