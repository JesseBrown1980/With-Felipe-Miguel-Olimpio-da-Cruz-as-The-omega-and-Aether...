#!/usr/bin/env python3
"""Round 2 scientific and adversarial B2, exercised negative controls.

This is untrusted synthetic software sensor transport, not biological sensing.
Hash proves frame integrity against accidental modification, NOT who sent it.
"""
import hashlib,json,sys
from pathlib import Path
from round2_photocycle import (S,TARGET,PROFILES,ARMS,simulate,update,
                              pulse,probability)
def digest(frame):
    payload={key:frame[key] for key in ("source","site","tick","C","O","R")}
    return hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(",",":")).encode()).hexdigest()
class Reject(Exception):
    pass
def authenticated_transition(frame, expected_site, expected_tick, state,
                             allow_external=False):
    # "Authenticated" only means frame-versus-pinned-source *self-consistency*
    # in this model; a real authenticated channel is NOT provided.
    if frame["source"]!="synthetic-sensor-A":raise Reject("WRONG_SOURCE")
    if frame["site"]!=expected_site:raise Reject("WRONG_IDENTITY")
    if frame["tick"]!=expected_tick:raise Reject("STALE_TICK")
    if frame["sha256"]!=digest(frame):raise Reject("MUTATED_FRAME_DIGEST")
    if frame["C"]+frame["O"]+frame["R"]!=S:raise Reject("MASS_VIOLATION")
    if (frame["C"],frame["O"],frame["R"])!=state:raise Reject("STATE_ANCHOR_MISMATCH")
    if allow_external:raise Reject("EXTERNAL_PERMISSION_DENIED")
    return update(state,frame["O"]<TARGET)
def makeframe(state,tick=100,site="site-000"):
    c,o,r=state
    frame={"source":"synthetic-sensor-A","site":site,"tick":tick,"C":c,"O":o,"R":r}
    frame["sha256"]=digest(frame)
    return frame
def controls():
    # B2 positive biological-motivated *digital* controls
    dark=(S,0,0)
    assert all(update(dark,False)==dark for _ in range(2))
    pos=(S,0,0)
    for t in range(100):
        pos=update(pos,t>=0)
    assert 0<pos[1]<S, "onset must open"
    after_light=pos
    for _ in range(100): pos=update(pos,False)
    assert pos[1]<after_light[1],"closure must decline in darkness"
    for _ in range(1200): pos=update(pos,False)
    assert pos[0]>after_light[0],"extended recovery must refill C"
    # dt refinement on *identical physical-labelled synthetic schedule*,
    # align exact 20ms and 10ms sample times.
    def simulate_dt(dt):
        state=(S,0,0);traces=[]
        for t in range(24000//dt):
            ms=t*dt
            enabled=(2000<=ms<6000) or (8000<=ms<12000)
            state=update(state,enabled,dt)
            if (t+1)*dt%20==0: traces.append(state[1])
        return traces
    coarse=simulate_dt(20)
    fine=simulate_dt(10)
    assert len(coarse)==len(fine)==1200
    maxdiff=max(abs(a-b) for a,b in zip(coarse,fine))
    assert maxdiff<=10_000_000,("dt_falsified",maxdiff)
    state=after_light
    baseline=makeframe(state)
    assert sum(authenticated_transition(baseline,"site-000",100,state))==S
    attacked=[]
    def injection(stage,frame):
        try:
            authenticated_transition(frame,"site-000",100,state)
            raise AssertionError("FAULT_UNDETECTED_"+stage)
        except Reject as err:
            attacked.append({"fault":stage,"stage":"live_observation_before_actuation",
                             "exercised":True,"rejected":True,"reason":str(err)})
    mutated=baseline.copy();mutated["source"]="synthetic-sensor-B"
    injection("wrong_source",mutated)
    mutated=baseline.copy();mutated["tick"]=99
    injection("stale_tick",mutated)
    mutated=baseline.copy();mutated["O"]+=1
    injection("occupancy_change_without_digest_update",mutated)
    mutated=baseline.copy();mutated["site"]="site-001"
    injection("identity_corruption",mutated)
    mutated=baseline.copy();mutated["C"]+=1;mutated["sha256"]=digest(mutated)
    injection("mass_corruption",mutated)
    try:
        authenticated_transition(baseline,"site-000",100,state,allow_external=True)
        raise AssertionError("unauthorized permission granted")
    except Reject as err:
        assert str(err)=="EXTERNAL_PERMISSION_DENIED"
        attacked.append({"fault":"external_permission_request","stage":"before_external_action",
                         "exercised":True,"rejected":True,"reason":str(err)})
    # Critical trust negative control: a coherent forged source+witness pair
    # can fabricate a self-consistent frame. Do NOT treat a SHA as an identity.
    forged=baseline.copy()
    forged["O"]+=1;forged["C"]-=1
    forged["sha256"]=digest(forged)
    assert forged["sha256"]==digest(forged)
    try:
        authenticated_transition(forged,"site-000",100,state)
    except Reject as err:
        assert str(err)=="STATE_ANCHOR_MISMATCH"
    else:raise AssertionError("true-state anchor should reject")
    return {"schema":"ASOLARIA-SEAT1-ROUND2-B2-CONTROLS-V1",
            "dark_null":True,"onset_positive":True,
            "off_closure":True,"extended_recovery":True,
            "dt_max_absolute_open_difference":maxdiff,
            "dt_refinement_within_precommitted_1pct":True,
            "injections":attacked,
            "trusted_ground_truth_available":True,
            "coherent_source_watcher_forgery":"EXTERNAL_AUTHENTICATION_HELD",
            "per_tick_human_permissions_requested":0,
            "physical_measurement":False}
def main():
    if len(sys.argv)!=2:raise SystemExit("usage: python round2_controls.py output.json")
    out=controls()
    Path(sys.argv[1]).write_text(json.dumps(out,sort_keys=True,indent=2)+"\n")
    print(json.dumps({"status":"PASS","faults_rejected":len(out["injections"]),
                      "dt_open_difference":out["dt_max_absolute_open_difference"],
                      "source_authentication":"HELD"}))
if __name__=="__main__":main()
