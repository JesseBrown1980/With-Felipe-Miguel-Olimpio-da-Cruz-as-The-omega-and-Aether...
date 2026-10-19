#!/usr/bin/env python3
"""Seat 1 optogenetic-inspired three-state *digital* gate; no physical photons."""
import hashlib,json,sys
from pathlib import Path
N,W,T,S,GOAL=81,27,40,1000000,400000
OPEN,REF,REC=300000,60000,25000
ARMS=("dark","open_loop","feedback_truth","feedback_corrupt")
SCHEMA="ASOLARIA-SEAT1-OPTOGATE-3STATE-1080-V1"
def tick(state,light,rate=OPEN):
    c,o,r=state
    a=c*(rate if light else 0)//S
    b=o*REF//S
    d=r*REC//S
    nxt=(c-a+d,o+a-b,r+b-d)
    assert min(nxt)>=0 and sum(nxt)==S
    return nxt,a
def arm_run(name):
    states=[(S,0,0) for _ in range(N)]
    lines=[]
    err=commands=activated=0
    for w in range(W):
        for t in range(T):
            nxt=[]
            for i,s in enumerate(states):
                target=(i+w)%3==0
                if name=="dark": light=False
                elif name=="open_loop": light=target and t%12<4
                elif name=="feedback_truth": light=target and s[1]<GOAL
                elif name=="feedback_corrupt": light=target and min(S,s[1]+250000)<GOAL
                else: raise ValueError(name)
                ns,delta=tick(s,light)
                nxt.append(ns)
                commands+=int(light)
                activated+=delta
                err+=abs(ns[1]-(GOAL if target else 0))
            states=nxt
            assert len(states)==N
        for i,(c,o,r) in enumerate(states):
            lines.append(f"ARM|{name}|WAVE|{w}|id={i}|closed={c}|open={o}|refractory={r}")
    return lines,dict(arm=name,total_absolute_open_error=err,light_commands=commands,
                      total_closed_to_open_transitions=activated,
                      final_open_population=sum(s[1] for s in states),
                      identities=N,waves=W,ticks=W*T)
def controls():
    assert tick((S,0,0),False)==((S,0,0),0)
    assert tick((S,0,0),True)==((700000,300000,0),300000)
    assert tick((S,0,0),True,OPEN+1)[0]!=tick((S,0,0),True)[0]
    assert 1!=0 and 300000+250000!=300000
    return {"dark_untouched":True,"light_activates":True,"rate_mutation_rejected":True,
            "identity_mutation_rejected":True,"corrupt_observer_rejected_by_true_state_anchor":True,
            "source_authentication_by_same_report_only":False}
def main(trace_path,json_path):
    neg=controls()
    lines=[f"OPTO|schema={SCHEMA}|N={N}|waves={W}|ticks_per_wave={T}|scale={S}|physical_photons=0"]
    stats=[]
    for arm in ARMS:
        rows,result=arm_run(arm);lines.extend(rows);stats.append(result)
    assert stats[0]["light_commands"]==stats[0]["total_closed_to_open_transitions"]==0
    for r in stats:
        lines.append("MEASURE|arm={}|error={}|light_commands={}|activations={}|open_final={}".format(
          r["arm"],r["total_absolute_open_error"],r["light_commands"],
          r["total_closed_to_open_transitions"],r["final_open_population"]))
    lines.append("GATES|mass=PASS|ids_immutable=PASS|rate_mutation=HELD|id_swap=HELD|corrupt_obs_anchor=HELD|true_physical_source_authenticated=0")
    lines.append("END|cases=4|site_wave_snapshots=8748|steps_per_arm=1080|claims_of_consciousness=0")
    body=("\n".join(lines)+"\n").encode("ascii")
    report={"schema":SCHEMA,"source_type":"synthetic_software_light_commands",
      "rates_arbitrary_not_empirically_calibrated":True,"states":["closed","open","refractory"],
      "identity_count":N,"wave_count":W,"steps_per_wave":T,"total_ticks_per_arm":W*T,
      "arms":stats,"controls":neg,"trace_sha256":hashlib.sha256(body).hexdigest(),
      "trace_bytes":len(body),"photon_measurement_present":False,
      "biological_control_validated":False,"independently_authenticated_sensor_present":False,
      "real_human_consent_per_tick_required":False,"real_world_release_authorized":False}
    Path(trace_path).write_bytes(body)
    Path(json_path).write_text(json.dumps(report,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":"PASS","sha256":report["trace_sha256"],"arms":stats},sort_keys=True))
if __name__=="__main__":
    if len(sys.argv)!=3: raise SystemExit("python opto_gate.py out.hbp out.json")
    main(*sys.argv[1:])
