#!/usr/bin/env python3
"""Seat4 Room04 Round2 independent synthetic replay and executed digital falsifiers.
NO photons, opsins, external permissions, attested hosts or OS-level process HALT.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

N=81
MASK=(1<<N)-1
MODES=("DARK","FAST","SLOW")
PARAMS={"DARK":(0,0,1025),"FAST":(448,192,480),"SLOW":(256,96,400)}
SOURCE_COMMIT="3f1f383a4c483fc724f221c7d915ef455f3cbf40"
SOURCE_BLOBS={
 "experiments/seat4/opto_light_gate.py":"4407382036e73becd17b7ebe35ee00568a13c5bd",
 "experiments/seat4/opto_light_gate_node.js":"beea9223f34d8aab8feeadbbea22eb1e88c2c27d"
}
BASELINE_SHA="3ca42d274909f3ba7b03a3a00662eda0375e2515acb93f769ec072d2695a0b93"
ATTACKS=("pulse_flip","occupancy_flip","field_flip","pixel_flip","pid_flip",
         "position_flip","mem_flip","coherent_pulse_forgery","coherent_field_frame_forgery")

def sha(b):
    return hashlib.sha256(b).hexdigest()

def ensure(ok,msg):
    if not ok: raise AssertionError(msg)

def verify_git_blobs(root):
    for path,frozen in SOURCE_BLOBS.items():
        b=(root/path).read_bytes()
        git=hashlib.sha1(b"blob "+str(len(b)).encode("ascii")+b"\x00"+b).hexdigest()
        ensure(git==frozen,"Producer file changed: "+path+" actual blob "+git)

def wave_start(w):
    return int(sha(f"ASOLARIA|SEAT4|RECURRENCE|SYNTHETIC|WAVE={w}".encode("ascii")),16)&MASK

def pids(w):
    return tuple(sha(f"ASOLARIA|RIM|SIM|IDENTITY|{w}|{i}".encode("ascii"))[:16]
                 for i in range(N))

def identities(keys):
    return sha("|".join(keys).encode("ascii"))

def positions(keys,t):
    return sha("|".join(f"{p}@{(i+(1+int(p[-2:],16)%4)*t)%N:02d}"
                        for i,p in enumerate(keys)).encode("ascii"))

def digital_frame_hash(x):
    data=bytearray(b"P6\n9 9\n255\n")
    for i in range(N):
        pixel=255*((x>>i)&1)
        data.extend((pixel,pixel,pixel))
    return sha(bytes(data))

def schedule(w,t,mode):
    return int(mode!="DARK" and (7*w+11*t+(w^t))%13<4)

def next_occ(p,pulse,mode):
    gain,decay,_=PARAMS[mode]
    val=p+(gain*(1024-p)+512)//1024 if pulse else p-(decay*p+512)//1024
    return min(1024,max(0,val))

def independent_field(x):
    # XOR exact basis columns: different algorithm from producer's bit rotations.
    out=0
    for i in range(N):
        if (x>>i)&1:
            out ^= (1<<i)|(1<<((i+1)%N))|(1<<((i+3)%N))
    return out

def transition(w,t,mode,prior,pulse):
    x,p,mem=prior
    occ=next_occ(p,pulse,mode)
    gate=int(occ>=PARAMS[mode][2])
    field=independent_field(x)^(1<<((w+3*t)%N) if gate else 0)
    voltage=max(0,mem-18)+(occ//8 if gate else 0)
    spike=int(voltage>=240)
    return field,occ,(0 if spike else voltage),gate,spike

def make_record(w,t,mode,prior,keys,pulse):
    x,p,v,gate,spike=transition(w,t,mode,prior,pulse)
    return {"pulse":pulse,"occ":p,"state":x,"pix":digital_frame_hash(x),
            "id":identities(keys),"pos":positions(keys,t),
            "mem":v,"gate":gate,"spike":spike}

def accept(w,t,mode,prior,keys,given,anchored=True):
    if anchored and given.get("pulse")!=schedule(w,t,mode):
        return False
    # Unanchored mode is deliberately vulnerable to a coherent source substitution.
    return make_record(w,t,mode,prior,keys,given.get("pulse",999))==given

def canonical_row(w,t,mode,r):
    return (f"W|wave={w:02d}|mode={mode}|tick={t:03d}|pulse={r['pulse']}"
            f"|occ={r['occ']:04d}|gate={r['gate']}|spike={r['spike']}"
            f"|mem={r['mem']:03d}|field={r['state']:021x}|frame={r['pix']}"
            f"|positions={r['pos']}|identities={r['id']}\n")

def mutated_records(w,mode,prior,keys,honest):
    field=honest["state"]^1
    return {
      "pulse_flip":{**honest,"pulse":1-honest["pulse"]},
      "occupancy_flip":{**honest,"occ":(honest["occ"]+1)%1025},
      "field_flip":{**honest,"state":field},
      "pixel_flip":{**honest,"pix":digital_frame_hash(honest["state"]^(1<<40))},
      "pid_flip":{**honest,"id":sha(b"forged-pid:"+honest["id"].encode("ascii"))},
      "position_flip":{**honest,"pos":sha(b"forged-pos:"+honest["pos"].encode("ascii"))},
      "mem_flip":{**honest,"mem":(honest["mem"]+1)%240},
      "coherent_pulse_forgery":make_record(w,81,mode,prior,keys,1-honest["pulse"]),
      "coherent_field_frame_forgery":{**honest,"state":field,"pix":digital_frame_hash(field)}
    }

class LocalRunner:
    """A cooperative Python state-machine guard, NOT an OS halt mechanism."""
    def __init__(self,w,mode):
        self.w=w; self.mode=mode; self.state=(wave_start(w),0,0)
        self.tick=0; self.halted=False
        self.allowed=frozenset(("compute.local",))
    def step(self):
        if self.halted: return "HALTED"
        if self.tick>=81: return "BOUND_REACHED"
        self.tick+=1
        self.state=transition(self.w,self.tick,self.mode,self.state,
                              schedule(self.w,self.tick,self.mode))[:3]
        return "ADVANCED"
    def halt(self):
        self.halted=True
        return "HALTED"
    def privilege(self,scope):
        return scope in self.allowed

def run(root):
    verify_git_blobs(root)
    rows=[];ledger=[]
    rejected={k:0 for k in ATTACKS}
    opens={m:0 for m in MODES}
    spikes={m:0 for m in MODES}
    allkeys=set();unanchored=0;halt_cases=0;scope_denials=0
    for w in range(27):
        keys=pids(w)
        ensure(len(set(keys))==81,"PID collision")
        allkeys.update(keys)
        for mode in MODES:
            prior=(wave_start(w),0,0)
            for tick in range(1,82):
                honest=make_record(w,tick,mode,prior,keys,schedule(w,tick,mode))
                ensure(accept(w,tick,mode,prior,keys,honest),"Honest rejected")
                ensure(0<=honest["occ"]<=1024 and 0<=honest["mem"]<240,"Out of bounds")
                rows.append(canonical_row(w,tick,mode,honest))
                opens[mode]+=honest["gate"]
                spikes[mode]+=honest["spike"]
                if tick==81: terminal_prior=prior;terminal_honest=honest
                prior=(honest["state"],honest["occ"],honest["mem"])
            fake_cases=mutated_records(w,mode,terminal_prior,keys,terminal_honest)
            ensure(set(fake_cases)==set(ATTACKS),"Attack catalog changed")
            for attack,fake in fake_cases.items():
                ensure(fake!=terminal_honest,"Unexercised mutation: "+attack)
                ensure(not accept(w,81,mode,terminal_prior,keys,fake),
                       f"Accepted {attack} at wave {w}, mode {mode}")
                rejected[attack]+=1
                ledger.append({"wave":w,"mode":mode,"tick":81,"attack":attack,
                               "attack_exercised":True,
                               "stage":"terminal_report_before_anchored_verifier",
                               "persistence":"single_record",
                               "truth":"synthetic_anchored_schedule",
                               "anchored_result":"REJECTED"})
                if attack=="coherent_pulse_forgery":
                    ensure(accept(w,81,mode,terminal_prior,keys,fake,anchored=False),
                           "Unanchored coherent local source must pass math")
                    unanchored+=1
            runner=LocalRunner(w,mode)
            for _ in range(40):
                ensure(runner.step()=="ADVANCED","Premature synthetic HALT")
            before=(runner.state,runner.tick,runner.allowed)
            ensure(runner.halt()=="HALTED","HALT refused")
            ensure(runner.step()=="HALTED","Post HALT tick unexpectedly advanced")
            ensure((runner.state,runner.tick,runner.allowed)==before,"Post-HALT state changed")
            halt_cases+=1
            ensure(not runner.privilege("network.publish"),"Scope escalation accepted")
            ensure(runner.allowed==frozenset(("compute.local",)),"Allowlist changed")
            scope_denials+=1
    trace="".join(rows).encode("ascii")
    ensure(len(rows)==6561 and sha(trace)==BASELINE_SHA,
           "Frozen canonical trace changed: "+sha(trace))
    ensure(len(allkeys)==2187,"Identity count changed")
    ensure(len(ledger)==729 and all(v==81 for v in rejected.values()),"Fault count changed")
    ensure(unanchored==halt_cases==scope_denials==81,"Trial count changed")
    ensure(opens=={"DARK":0,"FAST":1170,"SLOW":1681},"Open-count drift")
    ensure(spikes=={"DARK":0,"FAST":253,"SLOW":348},"Spike-count drift")
    receipt={
      "schema":"ASOLARIA-SEAT4-ROUND2-ANCHORED-FALSIFIERS-V1",
      "classification":"COMPUTATIONAL_LOCAL_PASS_PENDING_CI_AND_INDEPENDENT_PEER",
      "seat":"seat-4","room":"04","coordination_issue":55,"work_order_issue":59,
      "source_commit":SOURCE_COMMIT,"source_git_blobs":SOURCE_BLOBS,
      "phase":"B2_DIGITAL_ADVERSARIAL_NOT_B1_BIOLOGY",
      "original_baseline_hbp_sha256":BASELINE_SHA,
      "independently_recomputed_hbp_sha256":sha(trace),
      "original_baseline_rows":len(rows),"stable_synthetic_pids":len(allkeys),
      "terminal_cases":81,"rejected_faults_by_type":rejected,
      "fault_injections_exercised":len(ledger),
      "unanchored_coherent_forgery_math_accepted":unanchored,
      "anchored_coherent_forgery_rejected":rejected["coherent_pulse_forgery"],
      "cooperative_halt_cases":halt_cases,
      "simulated_privilege_escalation_denials":scope_denials,
      "authoritative_source_attested":False,
      "real_optical_photons_measured":False,
      "biological_rates_calibrated":False,
      "real_external_permission_tested":False,
      "physical_hosts_attested":False,
      "no_tickwise_human_approval_in_simulation":True,
      "open_counts":opens,"spike_counts":spikes,
      "limitations":"Synthetic independent fixed-fixture audit; cooperative HALT unit test and local scope decision only. Physical source unverified; historical stones unchanged."
    }
    return trace,receipt,ledger

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[2])
    ap.add_argument("--trace",type=Path)
    ap.add_argument("--receipt",type=Path)
    ap.add_argument("--fault-ledger",type=Path)
    a=ap.parse_args()
    trace,receipt,ledger=run(a.repo)
    if a.trace: a.trace.write_bytes(trace)
    if a.receipt:
        a.receipt.write_text(json.dumps(receipt,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    if a.fault_ledger:
        a.fault_ledger.write_text(json.dumps(ledger,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":"PASS","trace_sha256":sha(trace),
          "rows":receipt["original_baseline_rows"],
          "fault_rejections":receipt["fault_injections_exercised"],
          "unanchored_forgery_passes":receipt["unanchored_coherent_forgery_math_accepted"],
          "halt":receipt["cooperative_halt_cases"],
          "scope_denied":receipt["simulated_privilege_escalation_denials"]},sort_keys=True))

if __name__=="__main__": main()
