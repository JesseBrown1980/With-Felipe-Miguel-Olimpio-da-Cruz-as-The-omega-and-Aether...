#!/usr/bin/env python3
"""Verify a frozen append-only Room03 stone against freshly run independent metrics."""
import hashlib
import json
import sys
from fractions import Fraction
from pathlib import Path

STONE_SHA="2459dfd288cbaf07c17f6e7d12560d5fe21f8fce04d95c93b8b13c9618c9e021"
TRACE_SHA="435eccff256d119e608926ba3f3ec46a961d9f0d18801c440de2c3552200101d"
def sha(b):return hashlib.sha256(b).hexdigest()

def verify(stone_path,fresh_json):
    p=Path(stone_path)
    raw=p.read_bytes()
    assert len(raw)==1562, "receipt size changed"
    assert sha(raw)==STONE_SHA,"receipt SHA mismatch"
    side=(p.parent/(p.name+".sha256")).read_text("ascii").split()
    assert side==[STONE_SHA,p.name],"receipt sidecar mismatch"
    lines=raw.decode("ascii").splitlines()
    assert lines[0].startswith("PORTAL|schema=ASOLARIA-SEAT3-ROOM03-RECEIPT-V1|")
    assert lines[-1]=="END|old_stones_unchanged=1|release_issue10=OPEN|json=0"
    assert "CI|run=38726796177|ubuntu_windows_python311_313_node22=4/4_PASS|tamper_rejected=4/4|json=0" in lines
    assert "TRACE|bytes=365671|sha256="+TRACE_SHA+"|python_node_byte_exact=1|json=0" in lines
    values=json.loads(Path(fresh_json).read_text("utf8"))
    assert values["status"]=="PASS"
    assert values["full_trace_bytes"]==365671
    assert values["full_trace_sha256"]==TRACE_SHA
    assert values["candidate_count"]==684
    assert values["cohort_immutable_identity_count"]==81
    assert sum(v=="HELD" for v in values["real_injected_negative_cases"].values())==7
    assert values["biological_parameter_calibrated"] is False
    assert values["physical_hosts_attested"] is False
    assert values["authenticated_light_source"] is False
    assert values["real_human_resume_authenticated"] is False
    assert values["halt_model"]["blocked_before_tick"]==73
    assert values["halt_model"]["invalid_resume_held"] is True
    assert values["halt_model"]["same_final_state"] is True
    assert Fraction(5878733220-4516776378,17820-11664)==Fraction(8407141,38)
    four=values["protocols"]["continuous"]["4"]
    assert four["peak_1_80"]==631752 and four["plateau_sum_141_160"]==5955260
    for lam,selected in values["chosen_policies"].items():
        p,d,f=selected["policy"]
        entry=(f"WIN|lambda={lam}|P={p}|D={d}|F={f}"
               f"|open_hold_J={selected['hold_J']}"
               f"|feedback_hold_J={selected['feedback_hold_J']}|json=0")
        assert entry in lines,"chosen policy or objective differs from hosted stone"
        assert selected["winner_vs_feedback"]=="tuned_open_loop"
        assert selected["hold_J"] < selected["feedback_hold_J"]
    print(json.dumps({"verdict":"SEALED_ROOM03_PASS",
      "stone_sha256":STONE_SHA,"stone_bytes":len(raw),
      "full_trace_sha256":TRACE_SHA,
      "hosted_result_still_reproducible":True,
      "physical_host_attested":False},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: python verify_room03_receipt.py immutable_stone.hbp freshly_produced_model.json")
    verify(*sys.argv[1:])
