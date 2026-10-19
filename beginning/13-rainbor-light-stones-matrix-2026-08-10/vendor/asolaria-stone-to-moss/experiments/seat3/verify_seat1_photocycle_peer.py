#!/usr/bin/env python3
"""Seat 3 independent output/audit verifier (not a producer-code import).
Read all 8748 full snapshot rows, mathematical costs and tested negative cases.
"""
from __future__ import annotations
import hashlib
import json
import re
import sys
from fractions import Fraction
from pathlib import Path

EXPECTED_SHA="de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b"
ARMS=("dark","open_loop","feedback_truth","feedback_corrupt")
EXPECTED=[
 (11664000000,0),(5878733220,11664),
 (4516776378,17820),(8221918824,2835)
]
PATTERN=re.compile(
 r"^ARM\|(?P<arm>[a-z_]+)\|WAVE\|(?P<w>\d+)\|id=(?P<id>\d+)"
 r"\|closed=(?P<c>\d+)\|open=(?P<o>\d+)\|refractory=(?P<r>\d+)$")
def sha(b):return hashlib.sha256(b).hexdigest()

def verify(hbp,report,outdir):
    data=Path(hbp).read_bytes()
    assert sha(data)==EXPECTED_SHA,"full frozen Seat1 trace SHA-256 mismatch"
    lines=data.decode("ascii").splitlines()
    assert lines[0]=="OPTO|schema=ASOLARIA-SEAT1-OPTOGATE-3STATE-1080-V1|N=81|waves=27|ticks_per_wave=40|scale=1000000|physical_photons=0"
    assert lines[-1]=="END|cases=4|site_wave_snapshots=8748|steps_per_arm=1080|claims_of_consciousness=0"
    assert len(lines)==1+8748+4+1+1
    snapshots=lines[1:8749]
    for index,line in enumerate(snapshots):
        m=PATTERN.fullmatch(line)
        assert m is not None,(index,line)
        x=m.groupdict()
        arm=ARMS[index//(27*81)]
        remaining=index%(27*81)
        wave=remaining//81
        ident=remaining%81
        assert (x["arm"],int(x["w"]),int(x["id"]))==(arm,wave,ident)
        c,o,r=map(int,(x["c"],x["o"],x["r"]))
        assert 0<=c<=1000000 and 0<=o<=1000000 and 0<=r<=1000000
        assert c+o+r==1000000
        if arm=="dark":assert (c,o,r)==(1000000,0,0)
    assert lines[-2]=="GATES|mass=PASS|ids_immutable=PASS|rate_mutation=HELD|id_swap=HELD|corrupt_obs_anchor=HELD|true_physical_source_authenticated=0"
    raw=json.loads(Path(report).read_text("utf-8"))
    assert raw["trace_sha256"]==EXPECTED_SHA and raw["trace_bytes"]==len(data)
    assert raw["producer_trace_sha256"]==EXPECTED_SHA
    assert raw["rows"]==8748
    assert raw["source_authentication"] is False and raw["physical_light_measured"] is False
    assert [m["arm"] for m in raw["arms"]]==list(ARMS)
    for i,x in enumerate(raw["arms"]):
        assert (x["total_absolute_open_error"],x["light_commands"])==EXPECTED[i]
    for label in ("mass_conserving_state_swap","forged_id","rate_mutation",
                  "stale_prior_state","swapped_light_input",
                  "changed_wave","changed_tick"):
        assert raw["additional_real_tamper_controls"][label]=="HELD",(label,raw)
    assert raw["additional_real_tamper_controls"]["honest"]=="PASS"
    assert raw["additional_real_tamper_controls"]["coherent_forged_source"]=="MATH_GREEN_ORIGIN_UNAUTHENTICATED"
    assert raw["additional_real_tamper_controls"]["authenticated_source"] is False
    cost=raw["cost_frontier"]
    exact=Fraction(
        EXPECTED[1][0]-EXPECTED[2][0],
        EXPECTED[2][1]-EXPECTED[1][1])
    assert exact==Fraction(8407141,38),exact
    assert cost["crossover_exact"]=="8407141/38"
    assert cost["lambda_checks"]["0"]["winner"]=="feedback_truth"
    assert cost["lambda_checks"]["221240"]["winner"]=="feedback_truth"
    assert cost["lambda_checks"]["221241"]["winner"]=="open_loop"
    assert sha(bytes([data[0]^1])+data[1:])!=EXPECTED_SHA
    root=Path(outdir)
    root.mkdir(parents=True,exist_ok=True)
    def seal(name,blob):
        p=root/name;p.write_bytes(blob)
        (root/(name+".sha256")).write_text(sha(blob)+"  "+name+"\n")
    canonical=(json.dumps(raw,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
    seal("seat3-seat1-photocycle-peer.json",canonical)
    seal("seat3-seat1-photocycle-peer.hbp",data)
    hbi=(f"HBI|schema=ASOLARIA-SEAT3-SEAT1-OPTO-PEER-V1|json=0\n"
         f"HBP|bytes={len(data)}|sha256={EXPECTED_SHA}|json=0\n"
         f"JSON|bytes={len(canonical)}|sha256={sha(canonical)}|json=0\n"
         "END|source_authenticated=0|physical=0|json=0\n").encode("ascii")
    seal("seat3-seat1-photocycle-peer.hbi",hbi)
    print(json.dumps({"status":"PASS","frozen_trace_sha256":EXPECTED_SHA,
                      "frozen_trace_bytes":len(data),"peer_snapshots":8748,
                      "independent_negative_controls":7,
                      "coherent_forged_source":"MATH_GREEN_ORIGIN_UNAUTHENTICATED",
                      "cost_break_even":cost["crossover_exact"]},sort_keys=True))
if __name__=="__main__":
    if len(sys.argv)!=4:
        raise SystemExit("usage: python verify_seat1_photocycle_peer.py peer.hbp peer.json receipts_dir")
    verify(*sys.argv[1:])
