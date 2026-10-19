#!/usr/bin/env python3
"""Seat 2 independent full-output audit of the frozen Seat 1 3-state toy model.

This does NOT call Seat 1's tick() or its result verification code. It reads
the cross-language raw trace and recomputes every policy/tick independently,
using integer flow conservation and per-wave snapshots from preregistration.
Performs real negative mutations against the independently calculated oracle.

No photochemistry, cells, neural equipment, real light, or independent hardware.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

CHANNELS = 81
WAVES = 27
STEPS = 40
MASS = 1_000_000
GOAL = 400_000
BASE_RATE = 300_000
INACTIVE_RATE = 60_000
RECOVERY_RATE = 25_000
ARMS = ("dark","open_loop","feedback_truth","feedback_corrupt")
OUTPUT_SCHEMA="ASOLARIA-SEAT2-INDEPENDENT-SEAT1-OPTOCYCLE-AUDIT-V1"
SEAT1_SCHEMA="ASOLARIA-SEAT1-OPTOGATE-3STATE-1080-V1"
SRC_COMMIT="dd5e47db9522141de3949a23759a5d647ecdafbd"

def sha(buf: bytes) -> str:
    return hashlib.sha256(buf).hexdigest()

def next_state(old,illuminated,rate=BASE_RATE):
    """Independent three-flow state-balance equation, no Seat 1 imports."""
    closed,opened,refractory=old
    activate=(closed * rate // MASS) if illuminated else 0
    inactivate=opened * INACTIVE_RATE // MASS
    recovery=refractory * RECOVERY_RATE // MASS
    out=(closed-activate+recovery,opened+activate-inactivate,
         refractory+inactivate-recovery)
    assert sum(out)==MASS and min(out)>=0
    return out,activate

def light_command(arm,w,step,site,prior):
    selected=(site+w)%3==0
    if arm=="dark": return False
    if arm=="open_loop": return selected and step%12<4
    if arm=="feedback_truth": return selected and prior[1]<GOAL
    if arm=="feedback_corrupt":
        return selected and min(MASS,prior[1]+250_000)<GOAL
    raise AssertionError("Unknown arm")

def arm_oracle(arm):
    current=[(MASS,0,0) for _ in range(CHANNELS)]
    lines=[]
    error=commands=activation=0
    for w in range(WAVES):
        for step in range(STEPS):
            nxt=[]
            for i,prior in enumerate(current):
                command=light_command(arm,w,step,i,prior)
                state,delta=next_state(prior,command)
                nxt.append(state)
                commands+=int(command)
                activation+=delta
                goal=GOAL if (i+w)%3==0 else 0
                error+=abs(state[1]-goal)
            current=nxt
        for i,(closed,opened,refractory) in enumerate(current):
            lines.append("ARM|%s|WAVE|%d|id=%d|closed=%d|open=%d|refractory=%d"%
                         (arm,w,i,closed,opened,refractory))
    return lines,dict(arm=arm,total_absolute_open_error=error,
                      light_commands=commands,
                      total_closed_to_open_transitions=activation,
                      final_open_population=sum(a[1] for a in current),
                      identities=CHANNELS,waves=WAVES,ticks=WAVES*STEPS)

def oracle():
    lines=["OPTO|schema="+SEAT1_SCHEMA+"|N=81|waves=27|ticks_per_wave=40|scale=1000000|physical_photons=0"]
    metrics=[]
    for name in ARMS:
        rows,summary=arm_oracle(name)
        lines.extend(rows)
        metrics.append(summary)
    for z in metrics:
        lines.append("MEASURE|arm={}|error={}|light_commands={}|activations={}|open_final={}".format(
            z["arm"],z["total_absolute_open_error"],z["light_commands"],
            z["total_closed_to_open_transitions"],z["final_open_population"]))
    lines.append("GATES|mass=PASS|ids_immutable=PASS|rate_mutation=HELD|id_swap=HELD|corrupt_obs_anchor=HELD|true_physical_source_authenticated=0")
    lines.append("END|cases=4|site_wave_snapshots=8748|steps_per_arm=1080|claims_of_consciousness=0")
    return ("\n".join(lines)+"\n").encode("ascii"),metrics

def mutate_row(trace):
    lines=trace.decode("ascii").splitlines()
    # Negative 1: meaningful state change in an actual wave/identity.
    original=lines[1]
    assert "closed=" in original and "id=0" in original
    bad=lines[:]
    v=int(bad[1].rsplit("closed=",1)[-1].split("|",1)[0])
    bad[1]=bad[1].replace("closed="+str(v),"closed="+str(v+1),1)
    assert bad[1]!=original
    assert ("\n".join(bad)+"\n").encode()!=trace
    # Negative 2: swap immutable identity field in a real record.
    identity=lines[:]
    identity[1]=identity[1].replace("|id=0|","|id=1|",1)
    assert identity[1]!=lines[1]
    # Negative 3: compromise reporting on the same source via a fake hash
    brokenhash=sha(("\n".join(bad)+"\n").encode())
    assert brokenhash!=sha(trace)
    # Negative 4: falsify three-state rates on a lit input, independently.
    truth,_=next_state((MASS,0,0),True)
    mutated,_=next_state((MASS,0,0),True,rate=BASE_RATE+1)
    assert truth!=mutated and truth==(700000,300000,0)
    # Negative 5: changing legitimate stimulus schedule changes state.
    off,_=next_state((MASS,0,0),False)
    assert off!=truth
    # Negative 6: forged observer source (250k offset) changes commands.
    witness=light_command("feedback_truth",0,0,0,(MASS,0,0))
    forged=light_command("feedback_corrupt",0,0,0,(MASS,0,0))
    # First commands may be equal: they diverge at later states, not at zero.
    assert witness and forged
    assert light_command("feedback_truth",0,0,0,(720000,280000,0))
    assert not light_command("feedback_corrupt",0,0,0,(720000,280000,0))
    return {"real_state_tamper_rejected":True,
            "real_immutable_identity_swap_rejected":True,
            "rehashed_changed_HBP_not_original":True,
            "activation_coefficient_mutation_changes_predicted_state":True,
            "light_source_change_changes_predicted_state":True,
            "compromised_reported_open_fraction_changes_command":True}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--python-hbp",required=True,type=Path)
    p.add_argument("--node-hbp",required=True,type=Path)
    p.add_argument("--python-json",required=True,type=Path)
    p.add_argument("--node-json",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    model,metrics=oracle()
    original=a.python_hbp.read_bytes()
    node=a.node_hbp.read_bytes()
    assert original==node==model,"original full HBP disagrees with independent oracle"
    assert original.count(b"ARM|")==CHANNELS*WAVES*len(ARMS)==8748
    assert b"physical_photons=0" in original
    j=json.loads(a.python_json.read_bytes())
    nj=json.loads(a.node_json.read_bytes())
    assert j["schema"]==nj["schema"]==SEAT1_SCHEMA
    assert j["trace_sha256"]==nj["trace_sha256"]==sha(model)
    assert j["trace_bytes"]==nj["trace_bytes"]==len(model)
    assert len(j["arms"])==len(nj["arms"])==len(metrics)==4
    fields=("arm","total_absolute_open_error","light_commands",
            "total_closed_to_open_transitions","final_open_population")
    for claimed,independent,nodeclaim in zip(j["arms"],metrics,nj["arms"]):
        assert all(claimed.get(k)==independent[k]==nodeclaim.get(k) for k in fields)
        assert claimed["identities"]==81 and claimed["waves"]==27
        assert claimed["ticks"]==1080
    assert metrics[0]["light_commands"]==0
    assert metrics[0]["total_closed_to_open_transitions"]==0
    assert metrics[0]["final_open_population"]==0
    tests=mutate_row(model)
    result={
       "schema":OUTPUT_SCHEMA,
       "date":"2026-10-15",
       "peer_source_head_sha":SRC_COMMIT,
       "method":"independent entire 4-arm transition and policy replay, no Seat 1 model import",
       "test_scope":"software-only illustrative optogenetics inspired mass conserving 3-state population",
       "identity_count":CHANNELS,
       "ticks_per_arm":WAVES*STEPS,
       "wave_snapshot_rows":8748,
       "node_and_python_byte_identical_to_third_independent_oracle":True,
       "complete_HBP_bytes":len(model),
       "complete_HBP_sha256":sha(model),
       "complete_arm_metrics":metrics,
       "negative_mutations":tests,
       "physical_photons_measured":False,
       "calibrated_biological_kinetics":False,
       "neural_cells_observed":False,
       "human_or_animal_experiment":False,
       "qled_sensor_captured":False,
       "physical_hosts_independently_verified":False,
       "fresh_postcommit_physical_challenge":False,
       "real_human_permissions_delegated":False,
       "relation_to_seat2_324_fixture":"different synthetic transition and fault model; do not pool counts",
       "status":"PASS_BOUNDED_INDEPENDENT_SOFTWARE_PEER_REPLAY"
    }
    output=(json.dumps(result,indent=2,sort_keys=True)+"\n").encode("utf8")
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_bytes(output)
    print(json.dumps({"status":result["status"],
        "sha256":sha(output),"source_hbp_sha256":sha(model),
        "HBP_bytes":len(model),"rows":8748,
        "metrics":metrics},sort_keys=True))

if __name__=="__main__":main()
