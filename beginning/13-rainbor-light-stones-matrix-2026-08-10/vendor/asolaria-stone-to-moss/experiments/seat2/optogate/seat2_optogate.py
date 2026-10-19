#!/usr/bin/env python3
"""Seat2 bounded 81-site digital light-input/gate feedback trial.

NOT optogenetic kinetics, a biological neuron, photons, QLED sensing,
consciousness, source-of-origin attestation or infinite nested agents.
All rates are arbitrary synthetic integer fixtures. Output: 324 HBP rows.
"""
import hashlib
import json
import sys
from pathlib import Path

SITES=81
WAVES=27
MAX=1024
PROFILES={"fast":(900,550),"persistent":(700,120)}
SCENARIOS=("H","E","S","F","W","R")
SCHEMA="ASOLARIA-SEAT2-OPTOGATE-DIGITAL-V1"

def sha(raw):
    return hashlib.sha256(raw).hexdigest()
def light(w):
    return bytes(hashlib.sha256(
        f"ASOLARIA|SEAT2|OPTOGATE|V1|{w}|{i}".encode("ascii")
    ).digest()[0] for i in range(SITES))
def nonce(w,profile):
    return sha(f"ASOLARIA|OPTOGATE|V1|{w}|{profile}".encode())[:32]
def evolve(gates,signals,lights,sensitivity,closing):
    assert len(gates)==len(signals)==len(lights)==SITES
    out_g=[];out_x=[]
    for i in range(SITES):
        old=gates[i]
        open_delta=((MAX-old)*lights[i]*sensitivity)//(255*MAX)
        close_delta=(old*closing)//MAX
        newer=max(0,min(MAX,old+open_delta-close_delta))
        signal=(3*signals[i]+2*newer+signals[(i+1)%SITES])//6
        assert 0<=newer<=MAX and 0<=signal<=MAX
        out_g.append(newer);out_x.append(signal)
    return out_g,out_x
def pixels(gates,signals,lights):
    return bytes(v for i in range(SITES) for v in (
        min(255,gates[i]//4),min(255,signals[i]//4),lights[i]))
def state_digest(gates,signals):
    raw=bytes().join(g.to_bytes(2,"big")+s.to_bytes(2,"big")
                       for g,s in zip(gates,signals))
    return sha(raw)
def compare(prior_g,prior_s,w,profile,scenario):
    sensitivity,closing=PROFILES[profile]
    trusted=light(w)
    received=bytearray(trusted)
    fresh=nonce(w,profile)
    case_nonce=fresh
    if scenario=="S":
        j=(w*11)%SITES
        received[j] ^= 255
    elif scenario=="R":
        received=bytearray(light(w-1))
        case_nonce=nonce(w-1,profile)
    received=bytes(received)
    expected_g,expected_s=evolve(prior_g,prior_s,received,sensitivity,closing)
    report_g=expected_g[:];report_s=expected_s[:]
    j=(w*7)%SITES
    if scenario in ("E","W"):
        report_s[j]=(report_s[j]+1)%MAX
    frame=bytearray(pixels(report_g,report_s,received))
    if scenario=="F":frame[(3*j+1)%len(frame)]^=1
    recomputed_g,recomputed_s=evolve(prior_g,prior_s,received,sensitivity,closing)
    recomputed_pixels=pixels(recomputed_g,recomputed_s,received)
    math_ok=(report_g==recomputed_g and report_s==recomputed_s and bytes(frame)==recomputed_pixels)
    source_ok=(received==trusted and case_nonce==fresh)
    forged_watcher_claim=(scenario=="W")
    if forged_watcher_claim: assert not math_ok,"parent failed to catch fake watcher GREEN"
    accepted=math_ok and source_ok
    assert accepted==(scenario=="H"),(w,profile,scenario,math_ok,source_ok)
    assert math_ok==(scenario in ("H","S","R")),(w,profile,scenario)
    assert source_ok==(scenario not in ("S","R")),(w,profile,scenario)
    return "|".join((
        f"W={w:02d}",f"identity_count={SITES}",f"profile={profile}",f"scenario={scenario}",
        f"received_sha256={sha(received)}",f"trusted_sha256={sha(trusted)}",
        f"nonce={case_nonce}",f"math={int(math_ok)}",f"source={int(source_ok)}",
        f"accepted={int(accepted)}",f"forged_watcher_claim={int(forged_watcher_claim)}",
        f"report_state_sha256={state_digest(report_g,report_s)}",
        f"reference_state_sha256={state_digest(recomputed_g,recomputed_s)}",
        f"frame_sha256={sha(bytes(frame))}",f"reference_frame_sha256={sha(recomputed_pixels)}",
    ))
def run():
    identities=tuple(
        f"E:{i//27}:{(i//9)%3}:{(i//3)%3}:{i%3}" for i in range(SITES)
    )
    assert len(identities)==len(set(identities))==SITES
    snapshots={name:([0]*SITES,[0]*SITES) for name in PROFILES}
    records=[]
    tallies={"math_green":0,"source_green":0,"accepted":0,"held":0,"watcher_forgery_rejected":0}
    for w in range(1,WAVES+1):
        trusted=light(w)
        assert len(trusted)==SITES
        for name,(sensitivity,closing) in PROFILES.items():
            prev_g,prev_x=snapshots[name]
            for scenario in SCENARIOS:
                row=compare(prev_g,prev_x,w,name,scenario)
                records.append(row)
                # Interpret exactly the received fields of this controlled trial.
                math=int(row.split("|math=")[-1].split("|")[0])
                source=int(row.split("|source=")[-1].split("|")[0])
                accepted=int(row.split("|accepted=")[-1].split("|")[0])
                tallies["math_green"]+=math
                tallies["source_green"]+=source
                tallies["accepted"]+=accepted
                tallies["held"]+=1-accepted
                if scenario=="W" and not math:tallies["watcher_forgery_rejected"]+=1
            snapshots[name]=evolve(prev_g,prev_x,trusted,sensitivity,closing)
    assert len(records)==WAVES*len(PROFILES)*len(SCENARIOS)==324
    assert tallies=={"math_green":162,"source_green":216,
                     "accepted":54,"held":270,"watcher_forgery_rejected":54},tallies
    assert all(len(x)==SITES for pair in snapshots.values() for x in pair)
    final={key:state_digest(*pair) for key,pair in snapshots.items()}
    trace=("\n".join(records)+"\n").encode("ascii")
    outcome={
        "schema":SCHEMA,
        "preregistered_wave_count":WAVES,
        "sites":SITES,
        "immutable_id_scheme":"E:t:c:s:l; 3^4=81",
        "profiles":{k:{"sensitivity":v[0],"closing":v[1],"physical_calibration":False}
                    for k,v in PROFILES.items()},
        "scenarios":list(SCENARIOS),
        "cases":len(records),
        "trace_bytes":len(trace),
        "trace_sha256":sha(trace),
        "final_states":final,
        "tallies":tallies,
        "correctness_interpretation":"H mathematical and source bound; S/R self-consistent on untrusted/replayed light but held; E/F/W independently rechecked held",
        "real_opsins_used":False,
        "biological_timescale_inferred":False,
        "screen_pixels_from_physical_camera":False,
        "physical_hosts_attested":0,
        "http_or_wasm_executed":False,
        "actual_neural_signal_observed":False,
        "human_operator_permissions_delegated":False,
        "release_authorized":False,
        "status":"PASS_SYNTHETIC_COMPUTATIONAL_ONLY"
    }
    return trace,(json.dumps(outcome,sort_keys=True,indent=2)+"\n").encode("ascii")
def main():
    if len(sys.argv)!=3:raise SystemExit("usage: python seat2_optogate.py trace.hbp receipt.json")
    trace,receipt=run()
    Path(sys.argv[1]).write_bytes(trace)
    Path(sys.argv[2]).write_bytes(receipt)
    print(json.dumps({"status":"PASS","rows":trace.count(b"\n"),
                      "trace_sha256":sha(trace),"receipt_sha256":sha(receipt)}))
if __name__=="__main__":main()
