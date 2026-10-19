#!/usr/bin/env python3
"""Actual adversarial transition checks, added AFTER original V1 receipt. Digital only."""
import hashlib,json
from pathlib import Path
S=1_000_000
AUTH_SOURCE=b"SEAT1-FROZEN-SYNTHETIC-LIGHT-SCHEDULE-V1"
AUTH_SHA=hashlib.sha256(AUTH_SOURCE).hexdigest()
def next_state(prev,light,rate=300_000):
    c,o,r=prev
    assert sum(prev)==S and min(prev)>=0
    a=(c*rate//S) if light else 0
    b=o*60_000//S
    d=r*25_000//S
    return c-a+d,o+a-b,r+b-d
def gate(prior_id,report_id,prior,reported,expected_light,reported_light,expected_source,report_source,halt=False):
    if halt:return "HELD_HALTED"
    if prior_id!=report_id:return "HELD_IDENTITY"
    if expected_source!=report_source:return "HELD_ORIGIN"
    if reported_light!=expected_light:return "HELD_LIGHT"
    if min(reported)<0 or sum(reported)!=S:return "HELD_CONSERVATION"
    if reported!=next_state(prior,expected_light):return "HELD_WATCHER_RECOMPUTE"
    return "PASS_DIGITAL"
def check():
    id0=17;prior=(800_000,150_000,50_000);light=True
    honest=next_state(prior,light)
    assert gate(id0,id0,prior,honest,light,light,AUTH_SHA,AUTH_SHA)=="PASS_DIGITAL"
    cases={}
    def hold(key,result):
        assert result.startswith("HELD_"),(key,result)
        cases[key]=result
    hold("swapped_identity",gate(id0,18,prior,honest,light,light,AUTH_SHA,AUTH_SHA))
    hold("mutated_rate",gate(id0,id0,prior,next_state(prior,light,300_002),light,light,AUTH_SHA,AUTH_SHA))
    corrupt=(honest[0]-1,honest[1]+1,honest[2]) # Mass conserved but recomputed mismatch
    hold("forged_observer_mass_conserving",gate(id0,id0,prior,corrupt,light,light,AUTH_SHA,AUTH_SHA))
    hold("stale_prior_replayed_output",gate(id0,id0,(1_000_000,0,0),honest,light,light,AUTH_SHA,AUTH_SHA))
    hold("altered_light_schedule",gate(id0,id0,prior,honest,light,False,AUTH_SHA,AUTH_SHA))
    hold("wrong_source_sha",gate(id0,id0,prior,honest,light,light,AUTH_SHA,"0"*64))
    forged_src=b"ATTACKER-FORGED-SOURCE"
    forged_sha=hashlib.sha256(forged_src).hexdigest()
    assert forged_sha!=AUTH_SHA
    hold("coherent_fake_source_and_local_sha",gate(id0,id0,prior,honest,light,light,AUTH_SHA,forged_sha))
    hold("halt_preempts_valid_tick",gate(id0,id0,prior,honest,light,light,AUTH_SHA,AUTH_SHA,halt=True))
    hold("mass_corruption",gate(id0,id0,prior,(honest[0]+1,honest[1],honest[2]),light,light,AUTH_SHA,AUTH_SHA))
    assert len(cases)==9
    report={"schema":"ASOLARIA-SEAT1-REAL-INJECTION-CONTROLS-V2",
            "scope":"synthetic one-tick verifier; not real source signing or live N-Nest child",
            "real_injected_negative_controls":cases,
            "negative_count":len(cases),"honest_accepted":True,
            "original_V1_GATES_report_provisional":True,
            "original_hbp_unchanged":True,
            "physical_photons":False,"externally_authenticated_source":False,
            "real_operator_approval":False}
    blob=(json.dumps(report,sort_keys=True,separators=(",",":"))+"\n").encode("ascii")
    Path("seat1-actual-adversarial-controls.json").write_bytes(blob)
    Path("seat1-actual-adversarial-controls.json.sha256").write_text(hashlib.sha256(blob).hexdigest()+"  seat1-actual-adversarial-controls.json\n",encoding="ascii")
    print("PASS_SEAT1_GENUINE_ADVERSARIAL_INJECTIONS",len(cases),hashlib.sha256(blob).hexdigest())
if __name__=="__main__":check()
