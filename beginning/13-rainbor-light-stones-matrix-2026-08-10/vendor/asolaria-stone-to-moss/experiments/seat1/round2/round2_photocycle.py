#!/usr/bin/env python3
"""Seat 1 Round 2: PREREGISTERED synthetic C/O/R current-proxy dynamics.
Integer-only 81-site model. Not measured photons, opsins, or neurons.
"""
import hashlib, json, sys
from pathlib import Path

S = 1_000_000_000
N, TICKS = 81, 1200
CHECKPOINTS = (0,99,100,299,300,399,400,599,600,699,700,899,900,1199)
ARMS = ("dark","open_loop_full","open_loop_half","feedback_now","feedback_delay10","feedback_stale100")
PROFILES = ("dark","paired_short","paired_long")
TARGET=350_000_000
SCHEMA="ASOLARIA-SEAT1-ROUND2-3STATE-RATE-CURRENT-V1"
ALPHA = 800
BETA, GAMMA = 450, 120

def pulse(profile,t):
    return ((100<=t<300) or (400<=t<600 if profile=="paired_short" else 700<=t<900)) if profile!="dark" else False

def probability(rate,dt=20):
    return (S*rate*dt)//(1_000_000+rate*dt)

def update(state, command, dt=20):
    c,o,r=state
    fco=c*probability(ALPHA if command else 0,dt)//S
    forr=o*probability(BETA,dt)//S
    frc=r*probability(GAMMA,dt)//S
    next_state=(c-fco+frc,o+fco-forr,r+forr-frc)
    assert all(x>=0 for x in next_state) and sum(next_state)==S
    return next_state

def command_for(arm,enabled,t,history,state):
    if not enabled or arm=="dark": return False
    if arm=="open_loop_full": return True
    if arm=="open_loop_half": return t%2==0
    if arm=="feedback_now": return state[1]<TARGET
    delay=10 if arm=="feedback_delay10" else 100
    old=history[t-delay] if t>=delay else 0
    return old<TARGET

def simulate_profile_arm(profile,arm):
    # Treat site ID as immutable. Each site is independently computed, not
    # broadcast as an alleged independent biological observation.
    frames=[]
    metrics={"absolute_error":0,"light_on_site_ticks":0,"global_command_ticks":0,
             "switches":0,"onset_open":None,"post_off_open":None,
             "final_open":0,"site_count":N}
    for site in range(N):
        state=(S,0,0)
        start_o=[]
        last_command=False
        for t in range(TICKS):
            start_o.append(state[1])
            enabled=pulse(profile,t)
            cmd=command_for(arm,enabled,t,start_o,state)
            state=update(state,cmd)
            c,o,r=state
            metrics["absolute_error"]+=abs(o-(TARGET if enabled else 0))
            metrics["light_on_site_ticks"]+=int(cmd)
            metrics["switches"]+=int(cmd!=last_command)
            if site==0: metrics["global_command_ticks"]+=int(cmd)
            if t in CHECKPOINTS:
                current=-(120_000*o//S)
                frames.append(f"FRAME|profile={profile}|arm={arm}|id=site-{site:03d}|tick={t:04d}|C={c}|O={o}|R={r}|I_millipA={current}")
                if site==0 and t==100:metrics["onset_open"]=o
                if site==0 and t==300:metrics["post_off_open"]=o
            last_command=cmd
        metrics["final_open"]+=state[1]
    return frames,metrics

def simulate():
    lines=[f"MODEL|schema={SCHEMA}|dt_ms=20|S={S}|N=81|ticks=1200|checkpoints=14|digital_only=1"]
    per={}
    for profile in PROFILES:
        per[profile]={}
        for arm in ARMS:
            frames,metrics=simulate_profile_arm(profile,arm)
            lines.extend(frames)
            per[profile][arm]=metrics
    assert len(lines)==1+3*6*81*len(CHECKPOINTS)
    lines.append("END|profiles=3|arms=6|site_frames=20412|physical_observations=0")
    hbp=("\n".join(lines)+"\n").encode("ascii")
    return hbp, {"schema":SCHEMA,"evidence":"synthetic digital kinetic proxy",
        "profiles":per,"site_frames":20412,
        "record_sha256":hashlib.sha256(hbp).hexdigest(),
        "record_bytes":len(hbp),
        "rates_milli_per_s":{"alpha_light":ALPHA,"beta":BETA,"gamma":GAMMA},
        "proxy":{"conductance_pS":2000,"voltage_mV":-60,"reversal_mV":0},
        "physical_observations":False}

def main():
    if len(sys.argv)!=3:raise SystemExit("usage: round2_photocycle.py output.hbp metrics.json")
    trace,report=simulate()
    Path(sys.argv[1]).write_bytes(trace)
    Path(sys.argv[2]).write_text(json.dumps(report,sort_keys=True,indent=2)+"\n",encoding="utf8")
    print(json.dumps({"status":"PASS","implementation":"python_integer_three_state",
      "sha256":report["record_sha256"],"rows":report["site_frames"],"bytes":len(trace)},
      sort_keys=True))
if __name__=="__main__":main()
