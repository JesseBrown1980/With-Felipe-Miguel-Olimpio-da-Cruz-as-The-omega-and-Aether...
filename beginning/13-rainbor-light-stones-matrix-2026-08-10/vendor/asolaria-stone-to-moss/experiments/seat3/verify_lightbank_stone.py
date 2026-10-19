#!/usr/bin/env python3
"""Fail-closed full SHA sidecar and source-to-receipt verification of August Lightbank stone."""
import hashlib
import json
import sys
from pathlib import Path

STONE_SHA="36378bcf565200bf7ffaa952ec659777b9bae8964192c3d7ce7f5251cc9bc26a"
STICK_SHA="54bd7fbd5de20dee1cc409b8e1fa52ea0c2bdbf64777adf1abd2cf5077fac5f2"
HBP_SHA="c1cfdeca37da66b91f38da617081b0836ed8b9036eed3cf10e0fdd2539ab57cc"
HBI_SHA="595868d29142a1e6857dde29cf3fa38ebfac1bafd844e1c02a1e6cc789e144b4"
B1_SHA="de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b"
B2_SHA="435eccff256d119e608926ba3f3ec46a961d9f0d18801c440de2c3552200101d"
def sha(b):return hashlib.sha256(b).hexdigest()

def verify(stone,fresh_json,independent_artifacts):
    p=Path(stone)
    b=p.read_bytes()
    assert len(b)==1665 and sha(b)==STONE_SHA,"immutability stone changed"
    sc=(p.parent/(p.name+".sha256")).read_text("ascii").split()
    assert sc==[STONE_SHA,p.name],"sidecar invalid or mismatched"
    txt=b.decode("ascii")
    assert txt.startswith("PORTAL|schema=ASOLARIA-SEAT3-AUGUST-LIGHTBANK-STONE-V1")
    assert txt.endswith("END|original_frozen_sources_unchanged=1|physical_release_issue10=OPEN|peer_review=PENDING|json=0\n")
    assert "PREREG|commit=1db86832abbc32228f0b83334f60ceb7facbac37" in txt
    assert "CI|run=38734497453|ubuntu_windows=4/4_PASS" in txt
    m=json.loads(Path(fresh_json).read_text("ascii"))
    assert m["source_sha256"]==[B1_SHA,B2_SHA]
    assert m["source_lengths"]==[611999,365671]
    assert m["combined_bytes"]==977670
    assert m["lightstick_bytes"]==1978290
    assert m["lightstick_sha256"]==STICK_SHA
    assert m["receipt_bytes"]==65621
    assert m["receipt_sha256"]==HBP_SHA
    assert m["indexed_packets"]==466 and m["rgb_frames"]==156
    assert m["rgb_lanes"]==[156,155,155]
    assert m["capacity_per_bank"]==729
    assert m["stress"]["evictions"]==27
    assert sum(x=="HELD" for x in m["negative_controls"].values())==9
    assert m["physical_photon_memory"] is False
    assert m["actual_qr_images"] is False
    assert m["source_authenticated"] is False
    assert m["independent_physical_hosts"] is False
    folder=Path(independent_artifacts)
    actual=(folder/"lightbank.hbi").read_bytes()
    assert sha(actual)==HBI_SHA,"independent receipt HBI mismatch"
    assert (folder/"lightbank.lbk").read_bytes()==Path(fresh_json).parent.joinpath("lightbank.lbk").read_bytes()
    print(json.dumps({"verdict":"SEALED_AUGUST_LIGHTBANK_PASS",
      "stone_bytes":len(b),"stone_sha256":STONE_SHA,
      "full_stick_sha256":STICK_SHA,"full_hbp_sha256":HBP_SHA,
      "four_hosted_jobs":"4/4","physical_light_storage":False},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=4:
        raise SystemExit("usage: python verify_lightbank_stone.py stone.hbp freshly_generated_lightbank.json verification_artifacts_dir")
    verify(*sys.argv[1:])
