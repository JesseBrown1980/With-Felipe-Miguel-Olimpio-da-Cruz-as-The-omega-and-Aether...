#!/usr/bin/env python3
"""Seat 3 exact finite reliability toy: recursion cannot erase a shared source fault.
Independently enumerated Python implementation. NOT real agent/network/physical runtime.
"""
import hashlib
import itertools
import json
import sys
from fractions import Fraction
from pathlib import Path

SCHEMA="ASOLARIA-SEAT3-RECURRENCE-COMMON-MODE-V1"
LAW_BLOB="f84710d3018882b7282b9fda227638c57568ffe4"
DEPTHS=(1,3,7)
ARMS=("one_pass","self_recurrence","independent_common_source","independent_trusted_anchor")

def digest(b):
    return hashlib.sha256(b).hexdigest()

def enumerate_counts(m):
    total=0
    counts=dict.fromkeys(ARMS,0)
    for common_mode in range(8):
        for errors in itertools.product(range(4),repeat=m):
            total+=1
            shared=(common_mode==0)
            one_misses=(errors[0]==0)
            independent_all_miss=all(v==0 for v in errors)
            if shared or one_misses:
                counts["one_pass"]+=1
                counts["self_recurrence"]+=1
            if shared or independent_all_miss:
                counts["independent_common_source"]+=1
            if independent_all_miss:
                counts["independent_trusted_anchor"]+=1
    assert total==8*4**m
    return counts,total

def audit():
    records=[f"PORTAL|schema={SCHEMA}|law_blob={LAW_BLOB}|source=synthetic_only|physical_host_attested=0|json=0"]
    metrics={}
    for m in DEPTHS:
        counts,total=enumerate_counts(m)
        assert counts=={
            "one_pass":11*(4**(m-1)),
            "self_recurrence":11*(4**(m-1)),
            "independent_common_source":4**m+7,
            "independent_trusted_anchor":8,
        },(m,counts)
        metric={}
        for arm in ARMS:
            fraction=Fraction(counts[arm],total)
            expected=Fraction(11,32) if arm in ARMS[:2] else (
                Fraction(4**m+7,8*4**m) if arm=="independent_common_source" else Fraction(1,4**m)
            )
            assert fraction==expected
            ratio=f"{fraction.numerator}/{fraction.denominator}"
            records.append(f"ARM|checks={m}|name={arm}|false_green={ratio}|accepted={counts[arm]}|total={total}|json=0")
            metric[arm]={"accepted":counts[arm],"total":total,"probability":ratio}
        metrics[str(m)]=metric

    # Counterexample: all reporters and watchers faithfully operate on a forged input.
    external_truth=0
    forged_source=1
    reported=forged_source
    recomputed=forged_source
    consistent=(reported==recomputed)
    anchored=(reported==external_truth)
    assert consistent and not anchored
    records.append("COUNTEREXAMPLE|name=coherent_source_substitution|math_consistent=1|origin_authenticated=0|release_authorized=0|json=0")

    # Stale digital frame: hash alone does not bind its timing/origin, but an external
    # precommitted frame digest can detect a different substituted byte sequence.
    new_frame=b"FRAME|seq=2|pixel=ffffff"
    stale_frame=b"FRAME|seq=1|pixel=ffffff"
    self_consistent_frame=(digest(stale_frame)==digest(stale_frame))
    precommit_matches=(digest(stale_frame)==digest(new_frame))
    assert self_consistent_frame and not precommit_matches
    records.append("FRAME|name=stale_bytes|local_digest_valid=1|precommitted_digest_matches=0|real_camera_used=0|json=0")

    # Recurrence with no trusted correction repeats a false state; an external anchor
    # can correct it in one iteration. No neural or learning claim.
    self_state=1
    anchor_state=1
    for _ in range(7):
        self_state=self_state
        anchor_state=external_truth
    assert self_state!=external_truth and anchor_state==external_truth
    records.append("RECURRENCE|rounds=7|self_only_corrected=0|anchored_corrected=1|actual_model_training=0|json=0")

    # Consent does NOT recur: operator input can override even perfectly green math.
    math_green=True
    assert not (math_green and False and not False)
    assert not (math_green and True and not True)
    assert math_green and True and not False
    records.append("APEX|math_green=1|missing_human_consent=HELD|operator_halt=HELD|human_authorized_model=PASS|real_operator_token=not_tested|json=0")
    records.append("END|depths=1,3,7|arms=4|table_rows=12|common_mode_floor=1/8|physical=0|source_auth=not_proven|json=0")
    trace=("\n".join(records)+"\n").encode("ascii")
    return trace,{"schema":SCHEMA,"law_blob_sha1":LAW_BLOB,"status":"PASS","rows":12,
                  "counts":metrics,"trace_bytes":len(trace),"trace_sha256":digest(trace),
                  "correction_gate":"synthetic trusted-bit only",
                  "source_authenticated":False,"physical_host_attested":False}

def main():
    if len(sys.argv)!=3:
        raise SystemExit("usage: python seat3_recurrence_floor.py output.hbp metrics.json")
    trace,summary=audit()
    Path(sys.argv[1]).write_bytes(trace)
    Path(sys.argv[2]).write_text(json.dumps(summary,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in summary.items() if k!="counts"},sort_keys=True))

if __name__=="__main__":
    main()
