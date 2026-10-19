#!/usr/bin/env python3
"""Verify append-only Seat 3 photocycle peer stone against FRESH independent run."""
import hashlib
import json
import sys
from fractions import Fraction
from pathlib import Path
STONE_SHA="86676a11415930c54a02ab392d3b281973202e1427748dcbb053d2862b798e2d"
TRACE_SHA="de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b"
def sha(raw):return hashlib.sha256(raw).hexdigest()
def check(stone_path,metrics_path):
    p=Path(stone_path);b=p.read_bytes()
    assert len(b)==1450 and sha(b)==STONE_SHA,"immutable summary stone drift"
    side=(p.parent/(p.name+".sha256")).read_text("ascii").split()
    assert side==[STONE_SHA,p.name],"invalid immutable stone sidecar"
    text=b.decode("ascii")
    assert text.startswith("PORTAL|schema=ASOLARIA-SEAT3-SEAT1-PHOTOCYCLE-PEER-20261015-V1")
    assert "HOSTED|ci_run=38722837516|jobs=4/4_PASS" in text
    assert "REPLAY|rows=8748|bytes=611999|sha256="+TRACE_SHA in text
    assert "crossover_exact=8407141/38" in text
    assert "NEGATIVES|real_injected_and_held=7" in text
    assert "peer_review=pending" in text
    m=json.loads(Path(metrics_path).read_text())
    assert m["trace_sha256"]==TRACE_SHA and m["trace_bytes"]==611999
    assert len(m["arms"])==4
    for a in m["arms"]:
        target=f"MEASURE|arm={a['arm']}|absolute_error={a['total_absolute_open_error']}|light_commands={a['light_commands']}|json=0"
        assert target in text
    assert m["cost_frontier"]["crossover_exact"]=="8407141/38"
    assert Fraction(5878733220-4516776378,17820-11664)==Fraction(8407141,38)
    n=m["additional_real_tamper_controls"]
    assert sum(v=="HELD" for v in n.values())==7
    assert n["coherent_forged_source"]=="MATH_GREEN_ORIGIN_UNAUTHENTICATED"
    assert m["source_authentication"] is False and m["physical_light_measured"] is False
    print(json.dumps({"status":"SEALED_SEAT3_PEER_PASS","stone_sha256":STONE_SHA,
                      "stone_bytes":len(b),"full_trace_sha256":TRACE_SHA,
                      "real_negative_controls":7,"cost_crossing":"8407141/38",
                      "physical_host_attested":False},sort_keys=True))
if __name__=="__main__":
    if len(sys.argv)!=3:raise SystemExit("usage: python verify_sealed_seat1_photocycle_peer.py stone.hbp fresh_metrics.json")
    check(*sys.argv[1:])
