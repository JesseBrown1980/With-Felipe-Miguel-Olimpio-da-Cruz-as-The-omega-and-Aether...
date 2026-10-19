#!/usr/bin/env python3
"""Require immutable Seat3 Round3 mini-stone to match FRESH full peer regeneration."""
from __future__ import annotations
import hashlib
import json
import sys
from pathlib import Path
from collections import Counter

STONE_SHA="516b23c6d83c5bbdc3f8df69d034ee3159884d414956f1eff0ff9e5934f60718"
CASE_SHA="dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09"
ROUTE_SHA="1a52adde61fc1aa52331e013ece14e583475fddc34d2fa561ca12f7402590bc4"
FLEET_SHA="9a0f07b35fc4938c2b47f2acfc2a653629ea8c2f01f2bf4f1d0e17a08f28185b"
SRC_SHA="fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4"

def digest(raw):return hashlib.sha256(raw).hexdigest()

def verify(stone_path, fresh_dir):
    p=Path(stone_path)
    raw=p.read_bytes()
    assert len(raw)==1531 and digest(raw)==STONE_SHA, "sealed stone byte/hash drift"
    side=(p.parent/(p.name+".sha256")).read_bytes()
    assert side==(STONE_SHA+"  "+p.name+"\n").encode("ascii"),"stone sidecar drift"
    lines=raw.decode("ascii").splitlines()
    assert lines[0]=="PORTAL|schema=ASOLARIA-SEAT3-ROUND3-QUTRIT-RAINBOW27-V1|date=2026-10-15|physical=0|json=0"
    assert lines[-1]=="END|prior_stones_unchanged=1|original_32805_fixture_unchanged=1|release_issue10=OPEN|peer_review=PENDING|json=0"
    root=Path(fresh_dir)
    source=(root/"peer-original-cases.hbp").read_bytes()
    routes=(root/"peer-routes.hbp").read_bytes()
    fleet=(root/"peer-fleet.hbp").read_bytes()
    j=json.loads((root/"peer-results.json").read_bytes())
    assert digest(source)==CASE_SHA and len(source)==10773162
    assert digest(routes)==ROUTE_SHA and digest(fleet)==FLEET_SHA
    assert j["fixture_sha256"]==SRC_SHA and j["fixture_bytes"]==65536
    assert j["status"]=="PASS"
    assert j["total_packet_cases"]==52488 and j["genuine_clean_accepted"]==8748
    assert j["active_faults_held"]==26244 and j["closed_gates_held"]==17496
    assert j["fleet_trades"]==10000 and j["fleet_asset_totals"]==[700000]*3
    assert j["pseudo_born_rejections"]==0
    assert j["pseudo_born_lane_census"]=={"0":1737,"1":241,"2":209}
    assert j["rainbow27"]["ordered_trit_ids"]==27
    assert j["rainbow27"]["permutation_invariant_intensity_classes"]==10
    assert j["rainbow27"]["class_orbit_sizes"]==[1,1,1,3,3,3,3,3,3,6]
    assert sum(v=="HELD" for v in j["negative_controls"].values())==7
    assert j["real_optical_photons"] is False
    assert j["source_origin_authenticated"] is False
    for record in (
        f"ORIGINAL|cases=52488|bytes=10773162|sha256={CASE_SHA}|json=0",
        f"SOURCE|bytes=65536|sha256={SRC_SHA}|json=0",
        f"ROUTES|count=2187|lane0=1737|lane1=241|lane2=209|rejections=0|sha256={ROUTE_SHA}|json=0",
        f"FLEET|trades=10000|assets=700000,700000,700000|drift=0|sha256={FLEET_SHA}|json=0",
        "RAINBOW27|ordered_addresses=27|symmetric_intensity_classes=10|orbits=1,1,1,3,3,3,3,3,3,6|zero_norm=1|json=0",
        "CI|run=38740584271|ubuntu_windows_python311_313_node22=4/4_PASS|json=0",
    ):
        assert record in lines, "sealed statement differs from regenerated output"
    print(json.dumps({"verdict":"SEALED_ROUND3_PEER_PASS",
       "stone_bytes":len(raw),"stone_sha256":STONE_SHA,
       "full_original_case_sha256":CASE_SHA,
       "route_sha256":ROUTE_SHA,"fleet_sha256":FLEET_SHA,
       "ordered_trit_addresses":27,"symmetric_classes":10,
       "photonic_memory_measured":False},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: python verify_sealed_round3_rainbow.py stone.hbp FRESH_PEER_DIR")
    verify(*sys.argv[1:])
