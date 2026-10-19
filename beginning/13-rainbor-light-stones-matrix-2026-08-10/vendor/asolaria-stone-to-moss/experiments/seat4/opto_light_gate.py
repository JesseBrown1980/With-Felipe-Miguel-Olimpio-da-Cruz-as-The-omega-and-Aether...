#!/usr/bin/env python3
"""Optogenetics-inspired BOUNDED digital light gate, not real opsin physics.

27 waves x three unitless toy-gate modes x 81 autonomous ticks.
Stable identities, automatic dynamics, separate honest schedule/field watchers.
No photodetectors, tissue optics, real neurons or clinical claims.
"""
import argparse,hashlib,json
from pathlib import Path
N=81;MASK=(1<<N)-1;MAX=1024
MODES=("DARK","FAST","SLOW")
PARAMS={"DARK":(0,0,1025),"FAST":(448,192,480),"SLOW":(256,96,400)}
FRAME_HEAD=b"P6\n9 9\n255\n"
def sha(b):return hashlib.sha256(b).hexdigest()
def rot(x,n):return ((x<<n)|(x>>(N-n)))&MASK if n else x&MASK
def producer(x):return x^rot(x,1)^rot(x,3)
def watcher(x):
    out=0
    for b in range(N):
        if (x>>b)&1:
            v=1<<b
            out^=v^rot(v,1)^rot(v,3)
    return out
def source(w):
    return int.from_bytes(hashlib.sha256(
      ("ASOLARIA|SEAT4|RECURRENCE|SYNTHETIC|WAVE="+str(w)).encode("ascii")
    ).digest(),"big")&MASK
def pids(w):
    return [sha(("ASOLARIA|RIM|SIM|IDENTITY|"+str(w)+"|"+str(i)).encode("ascii"))[:16]
            for i in range(N)]
def identities(k):
    return sha("|".join(k).encode("ascii"))
def positions(k,t):
    return sha("|".join(
        p+"@"+str((i+(1+int(p[-2:],16)%4)*t)%N).zfill(2)
        for i,p in enumerate(k)).encode("ascii"))
def frame(state):
    b=bytearray(FRAME_HEAD)
    for i in range(N):
        color=255 if (state>>i)&1 else 0
        b.extend((color,color,color))
    return bytes(b)
def schedule(w,t,mode):
    return int(mode!="DARK" and ((w*7 + t*11 + (w^t))%13)<4)
def occupancy(p,pulse,mode):
    gain,decay,_=PARAMS[mode]
    if pulse:p+=((gain*(MAX-p)+512)//MAX)
    else:p-=((decay*p+512)//MAX)
    return min(MAX,max(0,p))
def compute_step(w,t,mode,state,p,mem,pulse):
    next_p=occupancy(p,pulse,mode)
    active=int(next_p>=PARAMS[mode][2])
    injection=(1<<((w+3*t)%N)) if active else 0
    next_state=producer(state)^injection
    next_mem=max(0,mem-18)+(next_p//8 if active else 0)
    spike=int(next_mem>=240)
    if spike:next_mem=0
    return next_state,next_p,next_mem,active,spike
def verify_step(w,t,mode,state,p,mem,actual_pulse,output):
    """Independent column-based field source and anchored pulse check."""
    expected_pulse=schedule(w,t,mode)
    if actual_pulse!=expected_pulse:return False
    next_p=occupancy(p,expected_pulse,mode)
    active=int(next_p>=PARAMS[mode][2])
    next_state=watcher(state)^((1<<((w+3*t)%N)) if active else 0)
    next_mem=max(0,mem-18)+(next_p//8 if active else 0)
    spike=int(next_mem>=240)
    if spike:next_mem=0
    return output==(next_state,next_p,next_mem,active,spike)
def verify_record(w,t,mode,state,p,mem,keys,reported):
    """Independently verify ALL fields, including pulse, pixels and PID.
    
    This is a software reference held separately from the reported record.
    Its correctness does not authenticate a real photon source.
    """
    result=(reported["state"],reported["occ"],reported["mem"],
            reported["gate"],reported["spike"])
    return (verify_step(w,t,mode,state,p,mem,reported["pulse"],result)
            and reported["pix"]==sha(frame(reported["state"]))
            and reported["id"]==identities(keys)
            and reported["pos"]==positions(keys,t))
def main():
    ar=argparse.ArgumentParser()
    ar.add_argument("--trace",type=Path,required=True)
    ar.add_argument("--receipt",type=Path,required=True)
    opt=ar.parse_args()
    lines=[];faults={"pulse":0,"gate_occupancy":0,"field":0,"pixel":0,"pid":0}
    open_counts={m:0 for m in MODES}
    spike_counts={m:0 for m in MODES}
    allkeys=set();checks=0;source_forgery=0;identity_rows=0
    for w in range(27):
        keys=pids(w); allkeys.update(keys)
        assert len(set(keys))==81
        frozen=identities(keys)
        for mode in MODES:
            state=source(w);p=0;mem=0
            for t in range(1,82):
                pulse=schedule(w,t,mode)
                produced=compute_step(w,t,mode,state,p,mem,pulse)
                assert verify_step(w,t,mode,state,p,mem,pulse,produced)
                nxt,newp,newmem,gate,spike=produced
                checks+=1
                open_counts[mode]+=gate;spike_counts[mode]+=spike
                assert 0<=newp<=MAX and 0<=newmem<240
                pic=sha(frame(nxt))
                assert identities(keys)==frozen
                pos=positions(keys,t)
                lines.append(
                    f"W|wave={w:02d}|mode={mode}|tick={t:03d}|pulse={pulse}|occ={newp:04d}|gate={gate}|spike={spike}|mem={newmem:03d}|field={nxt:021x}|frame={pic}|positions={pos}|identities={frozen}\n"
                )
                if t==81:
                    honest={"pulse":pulse,"occ":newp,"state":nxt,
                            "pix":pic,"id":frozen,"pos":pos,"mem":newmem,
                            "gate":gate,"spike":spike}
                    assert verify_record(w,t,mode,state,p,mem,keys,honest)
                    altered={"pulse":1-pulse,
                             "gate_occupancy":(newp+1)%(MAX+1),
                             "field":nxt^1,
                             "pixel":sha(frame(nxt^(1<<40))),
                             "pid":identities(keys[:w]+["0"*16]+keys[w+1:])}
                    for label,value in altered.items():
                        fake=dict(honest)
                        key={"pulse":"pulse","gate_occupancy":"occ",
                             "field":"state","pixel":"pix","pid":"id"}[label]
                        fake[key]=value
                        assert not verify_record(w,t,mode,state,p,mem,keys,fake),(
                            "independent watcher accepted injected fault",w,t,mode,label)
                        faults[label]+=1
                    # The forged pulse plus a fully recomputed downstream
                    # output is self-consistent under the forgery but must
                    # fail the separately pinned pulse schedule.
                    forged_pulse=1-pulse
                    fakeoutput=compute_step(w,t,mode,state,p,mem,forged_pulse)
                    forged={"pulse":forged_pulse,"state":fakeoutput[0],
                            "occ":fakeoutput[1],"mem":fakeoutput[2],
                            "gate":fakeoutput[3],"spike":fakeoutput[4],
                            "pix":sha(frame(fakeoutput[0])),
                            "pos":pos,"id":frozen}
                    assert not verify_record(w,t,mode,state,p,mem,keys,forged)
                    source_forgery+=1
                state,p,mem=nxt,newp,newmem
                identity_rows+=1
    assert len(lines)==27*3*81==6561
    assert checks==6561 and identity_rows==6561 and len(allkeys)==2187
    assert all(v==81 for v in faults.values())
    assert source_forgery==81
    assert open_counts["DARK"]==0 and spike_counts["DARK"]==0
    assert open_counts["FAST"]>0 and open_counts["SLOW"]>0
    trace="".join(lines).encode("ascii")
    opt.trace.parent.mkdir(parents=True,exist_ok=True)
    opt.trace.write_bytes(trace)
    receipt={
        "schema":"ASOLARIA-SEAT4-OPTOINSPIRED-DIGITAL-GATE-V1",
        "seat":"seat-4","classification":"MEASURED_SOFTWARE_PASS",
        "model":"synthetic unitless light-sensitive gate, NOT validated optogenetic physiology",
        "source":"Nobel medicine 2026 optogenetics; Chen et al Nat Biotechnol doi:10.1038/s41587-020-0679-9",
        "waves":27,"modes":list(MODES),"ticks_per_wave_mode":81,
        "tick_records":6561,"immutable_distinct_pids":len(allkeys),
        "synthetic_position_updates":6561*81,
        "automatic_independent_watcher_checks":checks,
        "light_gate_open_counts":open_counts,
        "toy_spike_counts":spike_counts,"injected_faults_rejected":faults,
        "source_forgery_anchored_rejections":source_forgery,
        "zero_human_prompts_per_tick":True,
        "no_real_light_or_ion_channel_data":True,
        "optical_photon_readout":"NOT_MEASURED",
        "physical_host_independence":"NOT_MEASURED",
        "trace_sha256":sha(trace),"trace_bytes":len(trace),
    }
    canon=(json.dumps(receipt,sort_keys=True,indent=2)+"\n").encode("ascii")
    opt.receipt.parent.mkdir(parents=True,exist_ok=True)
    opt.receipt.write_bytes(canon)
    print(json.dumps({"status":"PASS","rows":6561,
        "trace_sha256":sha(trace),"receipt_sha256":sha(canon),
        "source_forgery_controls":source_forgery,
        "faults":sum(faults.values()),"gate_open_counts":open_counts},sort_keys=True))
if __name__=="__main__":main()
