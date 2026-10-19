#!/usr/bin/env python3
"""Synthetic integer-only optogenetics-inspired gate audit (Seat 3).
Light pulses, receptor-type response, membrane proxy, automatic watcher correction.
NOT calibrated neuroscience, physical light, human brain or native Q-PRISM.
"""
from __future__ import annotations
import hashlib
import json
import sys
from pathlib import Path

Q = 1024
SCHEMA = "ASOLARIA-SEAT3-OPTOGATE-TOY-V1"
ARMS = ("dark", "blue", "red", "mixed")
PARAMS = {"ChR2-like": (896,32,256),
          "ChRmine-like": (192,896,64),
          "absent": (0,0,256)}
FAULTS = {77: "gate", 161: "pulse", 181: "id"}
FAULT_ID = "E:0:0:0:0"

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def make_entities():
    result={}
    for t in range(3):
        for c in range(3):
            for s in range(3):
                for l in range(3):
                    ident=f"E:{t}:{c}:{s}:{l}"
                    kind=("ChR2-like","ChRmine-like","absent")[c]
                    result[ident]=dict(id=ident,color=c,kind=kind,
                                       gate=0,voltage=0,refractory=0,spikes=0)
    assert len(result)==81 and len({e["id"] for e in result.values()})==81
    return result

def stimulus(tick,arm):
    k=tick%80
    blue=Q if 1<=k<=8 and arm in ("blue","mixed") else 0
    red=Q if 25<=k<=32 and arm in ("red","mixed") else 0
    label="blue" if blue else ("red" if red else "dark")
    return blue,red,label

def propose(old,pulse):
    blue,red,label=pulse
    wb,wr,off=PARAMS[old["kind"]]
    stimulation=(blue*wb+red*wr)//Q
    opening=((Q-old["gate"])*stimulation)//Q
    closing=(old["gate"]*off+Q-1)//Q
    gate=max(0,min(Q,old["gate"]+opening-closing))
    potential=(old["voltage"]*7)//8 + gate//16
    if old["refractory"]>0:
        voltage=potential
        refractory=old["refractory"]-1
        fired=0
    elif potential>=192:
        voltage=0
        refractory=3
        fired=1
    else:
        voltage=potential
        refractory=0
        fired=0
    return dict(id=old["id"],pulse=label,gate=gate,voltage=voltage,
                refractory=refractory,spikes=old["spikes"]+fired)

def recompute_from_prior(old,pulse):
    # Watcher recalculates independently from prior (NOT reported next-state bytes).
    blue,red,emission=pulse
    wb,wr,closing=PARAMS[old["kind"]]
    photo=(wb*blue+wr*red)//1024
    current=old["gate"]
    current+=((1024-current)*photo)//1024
    current-=(old["gate"]*closing+1023)//1024
    current=0 if current<0 else (1024 if current>1024 else current)
    integrated=old["voltage"]-(old["voltage"]//8
                                  if old["voltage"]%8==0 else (old["voltage"]+7)//8)
    integrated+=current//16
    # integrated == floor(old_voltage*7/8)
    assert integrated==(old["voltage"]*7)//8+current//16
    if old["refractory"]!=0:
        return dict(id=old["id"],pulse=emission,gate=current,
                    voltage=integrated,refractory=old["refractory"]-1,spikes=old["spikes"])
    if integrated>=192:
        return dict(id=old["id"],pulse=emission,gate=current,
                    voltage=0,refractory=3,spikes=old["spikes"]+1)
    return dict(id=old["id"],pulse=emission,gate=current,
                voltage=integrated,refractory=0,spikes=old["spikes"])

def snapshot_digest(entities,arm,tick):
    lines=[f"SNAPSHOT|arm={arm}|tick={tick}"]
    for ident in sorted(entities):
        e=entities[ident]
        lines.append("|".join(str(e[k]) for k in
                   ("id","color","kind","gate","voltage","refractory","spikes")))
    return sha(("\n".join(lines)+"\n").encode("ascii"))

def run_arm(arm,with_faults=False,trace=True):
    entities=make_entities()
    original={k:(e["id"],e["color"],e["kind"]) for k,e in entities.items()}
    rows=[]
    corrections=[]
    probe={}
    positive_ticks=0
    for tick in range(1,241):
        pulse=stimulus(tick,arm)
        prev={k:v.copy() for k,v in entities.items()}
        for ident in sorted(prev):
            expected=recompute_from_prior(prev[ident],pulse)
            reported=propose(prev[ident],pulse)
            assert expected==reported,(arm,tick,ident)
            if with_faults and arm=="mixed" and tick in FAULTS and ident==FAULT_ID:
                fault=FAULTS[tick]
                if fault=="gate":reported["gate"]+=1
                elif fault=="pulse":reported["pulse"]="red"
                elif fault=="id":reported["id"]+="-FORGED"
            if reported!=expected:
                assert arm=="mixed" and ident==FAULT_ID and tick in FAULTS
                fault=FAULTS[tick]
                corrections.append((tick,ident,fault))
                if trace:
                    rows.append(f"CORRECTED|arm=mixed|tick={tick:03d}|id={ident}"
                                f"|field={fault}|watcher=REJECT_RECOMPUTE|identity_changed=0|json=0")
            e=entities[ident]
            for field in ("gate","voltage","refractory","spikes"):
                e[field]=expected[field]
            assert 0<=e["gate"]<=Q and 0<=e["voltage"]<=1024
            if e["kind"]=="absent":
                assert e["gate"]==e["voltage"]==e["spikes"]==0
            if arm=="dark":
                assert e["gate"]==e["voltage"]==e["spikes"]==0
            assert (e["id"],e["color"],e["kind"])==original[ident]
        if any(e["gate"]>0 for e in entities.values()):
            positive_ticks+=1
        if arm=="blue" and tick==1:
            probe["blue_chR2_t1"]=entities["E:0:0:0:0"]["gate"]
            probe["blue_chRmine_t1"]=entities["E:0:1:0:0"]["gate"]
        if arm=="red" and tick==25:
            probe["red_chR2_t25"]=entities["E:0:0:0:0"]["gate"]
            probe["red_chRmine_t25"]=entities["E:0:1:0:0"]["gate"]
        if trace:
            rows.append(f"TICK|arm={arm}|k={tick:03d}"
                        f"|state_sha256={snapshot_digest(entities,arm,tick)}"
                        f"|sum_gate={sum(e['gate'] for e in entities.values())}"
                        f"|sum_spikes={sum(e['spikes'] for e in entities.values())}"
                        "|json=0")
    total_spikes=sum(e["spikes"] for e in entities.values())
    total_gate=sum(e["gate"] for e in entities.values())
    final=snapshot_digest(entities,arm,240)
    summary=dict(arm=arm,final_sha256=final,corrections=len(corrections),
                 total_gate=total_gate,total_spikes=total_spikes,
                 positive_ticks=positive_ticks,probe=probe,
                 immutable_identities=81,per_tick_operator_prompts=0)
    if trace:
        rows.append(f"SUMMARY|arm={arm}|final_sha256={final}"
                    f"|spikes={total_spikes}|positive_ticks={positive_ticks}"
                    f"|corrections={len(corrections)}|json=0")
    return entities,summary,rows,corrections

def dark_relaxation(close):
    gate=Q
    for _ in range(8):
        gate-=((gate*close+Q-1)//Q)
    return gate

def audit():
    rows=[f"PORTAL|schema={SCHEMA}|identities=81|ticks_per_arm=240"
          "|physical_light=0|neural_cells=0|operator_prompts_per_tick=0|json=0"]
    summaries={}
    for arm in ARMS:
        _,summary,lines,corr=run_arm(arm,with_faults=(arm=="mixed"))
        summaries[arm]=summary
        rows.extend(lines)
        if arm=="mixed":
            assert corr==[(77,FAULT_ID,"gate"),(161,FAULT_ID,"pulse"),(181,FAULT_ID,"id")]
    _,clean,_,_=run_arm("mixed",with_faults=False,trace=False)
    assert clean["final_sha256"]==summaries["mixed"]["final_sha256"]
    assert summaries["dark"]["total_spikes"]==summaries["dark"]["total_gate"]==0
    assert summaries["dark"]["positive_ticks"]==0
    assert summaries["blue"]["probe"]["blue_chR2_t1"]>summaries["blue"]["probe"]["blue_chRmine_t1"]
    assert summaries["red"]["probe"]["red_chRmine_t25"]>summaries["red"]["probe"]["red_chR2_t25"]
    assert summaries["blue"]["positive_ticks"]>0 and summaries["red"]["positive_ticks"]>0
    assert summaries["mixed"]["total_spikes"]>0
    blue_dark=dark_relaxation(256)
    red_dark=dark_relaxation(64)
    assert red_dark>blue_dark
    rows.append(f"CONTROL|name=matched_gate_dark_relaxation|ticks=8|chR2_like={blue_dark}"
                f"|chRmine_like={red_dark}|slower_chRmine_like=1|json=0")
    rows.append("CONTROL|name=source_provenance|math_replay=PASS"
                "|authenticated_physical_optical_origin=0|json=0")
    rows.append("END|arms=4|full_ticks=960|initial_ids=81|stable_ids=1"
                "|corrections=3|missing_receptor_never_activates=1"
                "|dark_null=PASS|independent_watcher=TOY_RECOMPUTATION"
                "|physical_light_claim=0|json=0")
    raw=("\n".join(rows)+"\n").encode("ascii")
    assert sum(line.startswith("TICK|") for line in rows)==960
    assert sum(line.startswith("CORRECTED|") for line in rows)==3
    assert sum(line.startswith("SUMMARY|") for line in rows)==4
    metrics=dict(schema=SCHEMA,status="PASS",source_references=[
        "https://www.nature.com/articles/nn1525",
        "https://www.nature.com/articles/s41467-022-32441-7"],
        identities=81,ticks_per_arm=240,total_ticks=960,
        arms=summaries,corrected_faults=[77,161,181],
        blue_dark_remaining=blue_dark,red_dark_remaining=red_dark,
        mixed_corrected_equals_clean=True,trace_bytes=len(raw),trace_sha256=sha(raw),
        physical_hosts_attested=False,physical_light_tested=False,
        biological_validation=False,qprism_software_connected=False)
    return raw,metrics

if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: python seat3_opto_toy.py output.hbp metrics.json")
    hbp,metrics=audit()
    Path(sys.argv[1]).write_bytes(hbp)
    Path(sys.argv[2]).write_text(json.dumps(metrics,indent=2,sort_keys=True)+"\n")
    print(json.dumps({"status":"PASS","bytes":len(hbp),"sha256":sha(hbp),
                      "totals":{x:summ["total_spikes"] for x,summ in metrics["arms"].items()},
                      "faults":metrics["corrected_faults"],
                      "dark_recovery":[metrics["blue_dark_remaining"],metrics["red_dark_remaining"]]},
                     sort_keys=True))
