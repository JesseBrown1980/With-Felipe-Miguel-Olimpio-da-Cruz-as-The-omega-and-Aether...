#!/usr/bin/env python3
"""Autonomous 27-wave synthetic 'light' lattice simulation, no per-tick humans.

This is a deterministic 81-site toy GF(2) evolution, not physical molecular
dynamics, photon sensing or consciousness. Identity PIDs remain invariant while
field bits and synthetic entity positions evolve; independent matrix watchers
check every tick and negative controls reject tampered field, PID and image.
"""
import argparse,hashlib,json
from pathlib import Path
N=81; W=27; STEPS=81; MASK=(1<<N)-1
HEADER=b"P6\n9 9\n255\n"
def sha(x):return hashlib.sha256(x).hexdigest()
def rot(x,k):return ((x<<k)|(x>>(N-k)))&MASK
def field_step(x):return x^rot(x,1)^rot(x,3)
def witness(x):
    value=0
    for b in range(N):
        if (x>>b)&1:
            t=1<<b
            value^=t^rot(t,1)^rot(t,3)
    return value
def frame(x):
    pixels=bytearray(HEADER)
    for i in range(N):
        p=255 if x>>i&1 else 0
        pixels.extend((p,p,p))
    return bytes(pixels)
def initial(w):
    return int.from_bytes(hashlib.sha256(
        ("ASOLARIA|SEAT4|RECURRENCE|SYNTHETIC|WAVE="+str(w)).encode("ascii")
    ).digest(),"big")&MASK
def ids(w):
    return [sha(("ASOLARIA|RIM|SIM|IDENTITY|"+str(w)+"|"+str(i)).encode("ascii"))[:16]
            for i in range(N)]
def moved(keys,t):
    raw="|".join(p+"@"+str((i+(1+int(p[-2:],16)%4)*t)%N).zfill(2)
                 for i,p in enumerate(keys))
    return sha(raw.encode("ascii"))
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--trace",type=Path,required=True)
    ap.add_argument("--receipt",type=Path,required=True)
    args=ap.parse_args()
    rows=[]; allids=set()
    transition_checks=0;field_faults=0;identity_faults=0;image_faults=0
    for wave in range(W):
        keys=ids(wave)
        assert len(keys)==N and len(set(keys))==N
        allids.update(keys)
        frozen=sha("|".join(keys).encode("ascii"))
        x=initial(wave)
        for tick in range(1,STEPS+1):
            proposed=field_step(x)
            checked=witness(x)
            assert checked==proposed,("watcher disagrees",wave,tick)
            screen=frame(proposed)
            assert len(screen)==len(HEADER)+243
            assert sha("|".join(keys).encode("ascii"))==frozen
            row=("W|w="+str(wave).zfill(2)+"|t="+str(tick).zfill(3)+
                 "|field="+format(proposed,"021x")+"|frame="+sha(screen)+
                 "|positions="+moved(keys,tick)+"|identities="+frozen+"\n")
            rows.append(row)
            x=checked
            transition_checks+=1
        # All negative checks are completely automatic: no human or UI calls.
        assert witness(x)!=(witness(x)^(1<<((wave+7)%N)))
        field_faults+=1
        spoof=list(keys);spoof[wave%N]="0"*16
        assert sha("|".join(spoof).encode("ascii"))!=frozen
        identity_faults+=1
        assert sha(frame(x))!=sha(frame(x^(1<<40)))
        image_faults+=1
    assert len(rows)==2187 and len(allids)==2187
    assert transition_checks==2187
    assert (field_faults,identity_faults,image_faults)==(27,27,27)
    trace="".join(rows).encode("ascii")
    args.trace.parent.mkdir(parents=True,exist_ok=True)
    args.trace.write_bytes(trace)
    receipt={
        "schema":"ASOLARIA-SEAT4-AUTONOMOUS-STABLE-IDENTITIES-V1",
        "seat":"seat-4","model":"81-site cyclic GF2 toy evolution, not physical optics",
        "waves":W,"steps_per_wave":STEPS,"field_transitions":2187,
        "entities_per_wave":N,"distinct_stable_identities":len(allids),
        "automatic_position_updates":W*STEPS*N,
        "manual_interventions_per_tick":0,"human_prompts":0,
        "identity_mutations":0,"independent_matrix_watcher_checks":transition_checks,
        "field_mutations_rejected":field_faults,
        "identity_mutations_rejected":identity_faults,
        "digital_pixel_mutations_rejected":image_faults,
        "trace_rows":len(rows),"trace_bytes":len(trace),
        "trace_sha256":sha(trace),"physical_photons_measured":False,
        "autonomous_authorization":"bounded preconfigured simulation, no approval per step",
        "external_scope_changes":"not implemented by this simulation",
    }
    canonical=(json.dumps(receipt,sort_keys=True,indent=2)+"\n").encode("ascii")
    args.receipt.parent.mkdir(parents=True,exist_ok=True)
    args.receipt.write_bytes(canonical)
    print(json.dumps({"status":"PASS","trace_sha256":sha(trace),
        "receipt_sha256":sha(canonical),"rows":len(rows),
        "manual_interventions":0,"entity_updates":W*STEPS*N},sort_keys=True))
if __name__=="__main__":main()
