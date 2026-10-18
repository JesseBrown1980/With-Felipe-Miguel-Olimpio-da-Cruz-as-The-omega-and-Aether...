#!/usr/bin/env python3
"""Independent integer-only review of nine trime jumps and apparent motion.
No actual exoplanet, stellar wind, black-hole image, or instrument capture.
"""
import csv
import hashlib
import sys
from pathlib import Path

TIMES=[81,243,729,2187,6561,19683,59049,177147,531441]
SOURCE=hashlib.sha256(
    b"ASOLARIA-R5-SYNTHETIC-2D-ORBIT-SURROGATE-WIND-PULSE-1000"
).digest()

def sha(data):return hashlib.sha256(data).digest()
def point(t,wind):
    change=max(0,t-1000) if wind else 0
    return ((13+2*t+3*change)%81,(26+5*t+2*change)%81)
def checkpoint(old,t,state):
    message=(b"ASOLARIA-FREEZE-PLAY-CHECKPOINT-V1\0"+old+
             t.to_bytes(8,"little")+SOURCE+state)
    return sha(message)
def parse_hbp(path):
    text=path.read_text()
    assert text.startswith("HBP1|schema=ASOLARIA-NINE-JUMP-MOTION-R5")
    result=[]
    for line in text.splitlines():
        if not line.startswith("JUMP|"):continue
        result.append(dict(item.split("=",1) for item in line.split("|")[1:]
                           if "=" in item))
    assert len(result)==9
    assert "baseline_fail=6|held_branches=6" in text
    assert "independent_real_astrometry=NONE" in text
    return text,result
def main():
    root=Path(sys.argv[1] if len(sys.argv)>1 else "out")
    with (root/"NINE-JUMP-MOTION-R5.csv").open(newline="") as inp:
        rows=list(csv.DictReader(inp))
    assert len(rows)==9
    hbp,receipts=parse_hbp(root/"NINE-JUMP-MOTION-R5.hbp")
    prior=bytes(32)
    failure_count=0
    for i,(t,row,receipt) in enumerate(zip(TIMES,rows,receipts)):
        assert int(row["rung"])==i
        assert int(row["logical_tick"])==t
        baseline=point(t,False)
        observed=point(t,True)
        plus1=point(t+1,True)
        plus2=point(t+2,True)
        velocity=((plus1[0]-observed[0])%81,(plus1[1]-observed[1])%81)
        assert baseline==(13,26) # period-81 alias
        assert observed==((13,26) if i<3 else (10,51))
        assert velocity==((2,5) if i<3 else (5,7))
        actual=[baseline[0],baseline[1],observed[0],observed[1],
                plus1[0],plus1[1],plus2[0],plus2[1],velocity[0],velocity[1]]
        keys=["baseline_x","baseline_y","observed_x","observed_y",
              "offset1_x","offset1_y","offset2_x","offset2_y","velocity_x","velocity_y"]
        for key,expected in zip(keys,actual):
            assert int(row[key])==expected, (t,key,expected,row[key])
        mismatch=observed!=baseline
        failure_count+=int(mismatch)
        assert row["baseline_failure"]==str(mismatch).lower()
        assert row["branch"]==("Hold" if mismatch else "Grow")
        assert row["source_physical"]=="false"
        assert receipt["rung"]==str(i)
        assert receipt["tick"]==str(t)
        assert receipt["reference"]==f"{baseline[0]}:{baseline[1]}"
        assert receipt["observed"]==f"{observed[0]}:{observed[1]}"
        assert receipt["velocity"]==f"{velocity[0]}:{velocity[1]}"
        assert receipt["baseline_failure"]==str(mismatch).lower()
        assert receipt["branch"]==row["branch"]
        assert receipt["source_custody"]=="UNVERIFIED"
        state_sha=sha(bytes(observed))
        assert receipt["state_sha256"]==state_sha.hex()
        assert receipt["prev_sha256"]==prior.hex()
        expected_sha=checkpoint(prior,t,state_sha)
        assert row["checkpoint_sha256"]==expected_sha.hex()
        assert receipt["linked_sha256"]==expected_sha.hex()
        assert checkpoint(prior,t+1,state_sha)!=expected_sha
        prior=expected_sha
    assert failure_count==6
    after=point(10_000_000_000,True)
    assert point(10_000_000_081,True)==after
    assert f"point={after[0]}:{after[1]}" in hbp
    assert "real_elapsed_10Gyr=FALSE" in hbp
    for name in ["NINE-JUMP-MOTION-R5.csv","NINE-JUMP-MOTION-R5.hbp"]:
        data=(root/name).read_bytes()
        print("SHA256",name,sha(data).hex(),"bytes",len(data))
    print("PASS_9_OF_9_EXACT_RUNG_CHECKPOINTS_6_HELD_3_PASSED_ALIASING_DETECTED")
if __name__=="__main__":main()
