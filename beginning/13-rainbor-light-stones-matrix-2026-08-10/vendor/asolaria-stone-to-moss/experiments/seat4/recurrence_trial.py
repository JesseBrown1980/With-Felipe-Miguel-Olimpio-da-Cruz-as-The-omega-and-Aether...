#!/usr/bin/env python3
"""Seat 4 - bounded "Recurrence Is Mind" multi-entity digital feedback trial.

Nine adversarial scenarios x 27 waves x four watcher counts x four arms.
The 9x9 PPM is a DIGITAL screenshot, not a physical screen/photon sample.
The "trusted anchor" is an independent benchmark fixture assumption; this
program neither authenticates a physical sensor nor proves consciousness.
"""
import argparse
import hashlib
import json
from pathlib import Path

MASK=(1<<81)-1
WAVES=27
WATCHERS=(1,2,4,8)
ARMS=("A","B","C","D")
FAULTS=(
 "HONEST","OUTPUT_FLIP","COMMON_SOURCE","FRAME_FLIP",
 "ONE_WATCHER_FORGED","ALL_WATCHERS_FORGED",
 "ANCHOR_DELAYED","ANCHOR_MISSING","CONSENT_MISSING"
)
EXPECTED_FALSE={"A":648,"B":216,"C":243,"D":0}
EXPECTED_HELD={"A":0,"B":0,"C":108,"D":216}
FRAME_HEADER=b"P6\n9 9\n255\n"

def sha(data):
    return hashlib.sha256(data).hexdigest()

def rot(x,k):
    return ((x<<k)|(x>>(81-k)))&MASK if k else x&MASK

def source(wave):
    return int.from_bytes(hashlib.sha256(
        f"ASOLARIA|SEAT4|RECURRENCE|SYNTHETIC|WAVE={wave}".encode("ascii")
    ).digest(),"big")&MASK

def evolve(x):
    return x^rot(x,1)^rot(x,3)

def frame(y):
    data=bytearray(FRAME_HEADER)
    for bit in range(81):
        pixel=255 if (y>>bit)&1 else 0
        data.extend((pixel,pixel,pixel))
    assert len(data)==len(FRAME_HEADER)+243
    return bytes(data)

def matrix_independent(x):
    """Independently compute output from 81 explicit output columns."""
    result=0
    for i in range(81):
        if (x>>i)&1:
            basis=1<<i
            column=basis^rot(basis,1)^rot(basis,3)
            result^=column
    return result

def initial(wave,fault):
    truth=source(wave)
    state=truth ^ (1<<((wave+13)%81)) if fault=="COMMON_SOURCE" else truth
    y=evolve(state)
    if fault in ("OUTPUT_FLIP","ONE_WATCHER_FORGED","ALL_WATCHERS_FORGED"):
        y^=1<<((wave+7)%81)
    pic=frame(y)
    if fault=="FRAME_FLIP":
        pic=frame(y^(1<<40))
    consent=fault!="CONSENT_MISSING"
    return truth,state,y,pic,consent

def trial(wave,fault,arm,n):
    truth,x,y,pic,consent=initial(wave,fault)
    known_y=evolve(truth)
    known_pic=frame(known_y)
    accepted=False
    repair_round=0
    calls=0
    rounds=0

    if arm=="A":
        accepted=True
    else:
        for round_number in (1,2,3):
            rounds=round_number
            if arm in ("C","D") and not consent:
                break
            if arm=="B":
                expected_y=evolve(x)
                expected_pic=frame(expected_y)
                calls+=1
                valid=(y==expected_y and pic==expected_pic)
                if valid:
                    accepted=True
                    break
                y,pic=expected_y,expected_pic
                if repair_round==0:repair_round=round_number
                continue
            if arm=="C":
                honest_disagreements=[]
                for i in range(n):
                    compromised=(
                        fault=="ALL_WATCHERS_FORGED" or
                        (fault=="ONE_WATCHER_FORGED" and i==0)
                    )
                    if compromised:
                        # A controlled forged watcher simply asserts PASS;
                        # the constructed parent sees no independent truth.
                        continue
                    observed_y=matrix_independent(x)
                    observed_pic=frame(observed_y)
                    calls+=1
                    if y!=observed_y or pic!=observed_pic:
                        honest_disagreements.append((observed_y,observed_pic))
                if not honest_disagreements:
                    accepted=True
                    break
                # Only a real independently recomputing watcher can suggest
                # a correction; an all-malicious tree cannot supply one.
                assert all(v==honest_disagreements[0] for v in honest_disagreements)
                y,pic=honest_disagreements[0]
                if repair_round==0:repair_round=round_number
                continue
            assert arm=="D"
            if fault=="ANCHOR_MISSING" or (fault=="ANCHOR_DELAYED" and round_number==1):
                continue
            # The original fixture is deliberately *not* derived from
            # reporter's x; in real deployment it needs authentication.
            expected_x=truth
            expected_y=matrix_independent(expected_x)
            expected_pic=frame(expected_y)
            calls+=1
            if (x,y,pic)==(expected_x,expected_y,expected_pic):
                accepted=True
                break
            x,y,pic=expected_x,expected_y,expected_pic
            if repair_round==0:repair_round=round_number
    correct=(x==truth and y==known_y and pic==known_pic)
    false_green=accepted and (not correct or not consent)
    held=not accepted
    return {
        "wave":wave,"fault":fault,"arm":arm,"n":n,
        "accepted":int(accepted),"correct":int(correct),
        "false_green":int(false_green),"held":int(held),
        "repaired_at":repair_round,"rounds":rounds,"operations":calls,
        "source_hex":f"{x:021x}","future_hex":f"{y:021x}",
        "screen_ppm_sha256":sha(pic),
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--trace",type=Path,required=True)
    ap.add_argument("--receipt",type=Path,required=True)
    args=ap.parse_args()
    cases=[]
    tallies={a:{"cases":0,"false_green":0,"holds":0,
                "correct_final":0,"repair_events":0,
                "operations":0,"accepted_without_anchor":0} for a in ARMS}
    rows=[]
    for wave in range(WAVES):
        for fault in FAULTS:
            for n in WATCHERS:
                for arm in ARMS:
                    c=trial(wave,fault,arm,n)
                    cases.append(c)
                    t=tallies[arm]
                    t["cases"]+=1;t["false_green"]+=c["false_green"]
                    t["holds"]+=c["held"];t["correct_final"]+=c["correct"]
                    t["repair_events"]+=int(c["repaired_at"]!=0)
                    t["operations"]+=c["operations"]
                    if c["accepted"] and fault in ("ANCHOR_MISSING","ANCHOR_DELAYED") and arm!="D":
                        t["accepted_without_anchor"]+=1
                    rows.append("|".join(str(c[key]) for key in (
                        "wave","fault","arm","n","accepted","correct",
                        "false_green","held","repaired_at","rounds",
                        "operations","source_hex","future_hex","screen_ppm_sha256"
                    ))+"\n")
    assert len(rows)==WAVES*len(FAULTS)*len(WATCHERS)*len(ARMS)==3888
    assert {a:tallies[a]["false_green"] for a in ARMS}==EXPECTED_FALSE
    assert {a:tallies[a]["holds"] for a in ARMS}==EXPECTED_HELD
    assert all(t["cases"]==972 for t in tallies.values())
    assert all(trial(w,"HONEST","D",n)["accepted"]==1
               for w in range(WAVES) for n in WATCHERS)
    assert all(trial(w,"CONSENT_MISSING","D",n)["held"]==1
               for w in range(WAVES) for n in WATCHERS)
    assert all(trial(w,"ANCHOR_DELAYED","D",n)["rounds"]==2
               for w in range(WAVES) for n in WATCHERS)
    # Independently derived test for the PPM channel: it is 9x9xRGB,
    # and a corrupted pixel must change the exact frame SHA.
    assert sha(frame(0))!=sha(frame(1<<40))
    assert len(frame(0))==len(FRAME_HEADER)+243

    trace="".join(rows).encode("ascii")
    args.trace.parent.mkdir(parents=True,exist_ok=True)
    args.trace.write_bytes(trace)
    report={
        "schema":"ASOLARIA-SEAT4-RECURRENCE-IS-MIND-81-V1",
        "seat":"seat-4",
        "classification":"BOUNDED_SYNTHETIC_SOFTWARE_TRIAL",
        "law_source":"N-Nest LAW.md, recurrence + ground truth corrective gate",
        "waves":WAVES,"fault_modes":list(FAULTS),"watcher_counts":list(WATCHERS),
        "arms":list(ARMS),"max_rounds":3,
        "total_cases":len(cases),"cases_per_arm":972,
        "tallies":tallies,"trace_sha256":sha(trace),
        "trace_bytes":len(trace),
        "visual_channel":"digital 9x9 RGB PPM, not captured photons",
        "source_anchor":"deterministic precommitted local benchmark fixture, not a physical attestation",
        "human_apex_consent_checked_in_arms":["C","D"],
        "mathematical_warning":"independent consistency cannot authenticate common compromised source",
        "physical_hosts_attested":0,
        "physical_screen_or_camera_measured":False,
        "consciousness_or_human_like_mind_established":False,
        "zero_trust_anchor_compromise_tested":False,
    }
    pretty=(json.dumps(report,sort_keys=True,indent=2)+"\n").encode("ascii")
    args.receipt.parent.mkdir(parents=True,exist_ok=True)
    args.receipt.write_bytes(pretty)
    args.receipt.with_name(args.receipt.name+".sha256").write_text(
        sha(pretty)+"  "+args.receipt.name+"\n",encoding="ascii",newline="\n")
    print(json.dumps({"status":"PASS","cases":len(cases),"trace_sha256":sha(trace),
                      "receipt_sha256":sha(pretty),"false_green":EXPECTED_FALSE,
                      "held":EXPECTED_HELD},sort_keys=True))

if __name__=="__main__":
    main()
