#!/usr/bin/env python3
"""Fail-closed verification of committed append-only 7-class correction stone.

Unlike reading printed PASS strings, compare its SHA and its individual claims
to freshly generated exhaustive rational and original full case-ledger outputs.
"""
import hashlib
import json
import sys
from pathlib import Path

STONE_SHA="4d4c4c28ca76f6d97ab1f16916bfe79936e09189e8b8f904b377bbc77a57a69c"
NORM_SHA="b2e87ffff9f3845defd4108094b6a5e5e0d082a00cec09d3df373176f180517a"
OLD_SHA="dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09"
def sha(x):return hashlib.sha256(x).hexdigest()

def verify(stone,normalized_dir,original_dir):
    stone=Path(stone)
    raw=stone.read_bytes()
    assert len(raw)==1259 and sha(raw)==STONE_SHA, "correction stone byte/SHA drift"
    side=stone.parent/(stone.name+".sha256")
    assert side.read_bytes()==(STONE_SHA+"  "+stone.name+"\n").encode("ascii")
    rows=raw.decode("ascii").splitlines()
    assert len(rows)==11
    norm_dir=Path(normalized_dir)
    original=Path(original_dir)
    real_norm=(norm_dir/"normalized27.hbp").read_bytes()
    stats=json.loads((norm_dir/"normalized27.json").read_bytes())
    original_ledger=(original/"peer-original-cases.hbp").read_bytes()
    assert sha(real_norm)==NORM_SHA and len(real_norm.splitlines())==27
    assert sha(original_ledger)==OLD_SHA and len(original_ledger.splitlines())==52488
    assert stats["trace_sha256"]==NORM_SHA
    assert stats["raw_class_sizes"]==[1,1,1,3,3,3,3,3,3,6]
    assert stats["normalized_class_sizes"]==[1,2,3,3,6,6,6]
    assert stats["valid_normalized_probability_classes"]==6
    assert stats["undefined_zero_classes"]==1
    assert stats["raw_conditional_entropy_uniform_27_bits"]=="1.631077778419"
    assert stats["normalized_conditional_entropy_uniform_27_bits"]=="2.149596296937"
    assert stats["sample_scale_pair"][0]["lane"]==2
    assert stats["sample_scale_pair"][1]["lane"]==1
    expected=[
        f"TRACE|normalized_rows=27|sha256={NORM_SHA}|json=0",
        f"ORIGINAL|old_52488_rows_unchanged=1|old_hbp_sha256={OLD_SHA}|json=0",
        "RAW|ordered_trit_addresses=27|intensity_classes=10|orbit_sizes=1,1,1,3,3,3,3,3,3,6|conditional_entropy_uniform_bits=1.631077778419|json=0",
        "NORM|ordered_trit_addresses=27|intensity_or_undefined_classes=7|defined_probability_classes=6|orbit_sizes=1,2,3,3,6,6,6|conditional_entropy_uniform_bits=2.149596296937|json=0",
        "SCALE|rgb1=1,0,0|rgb2=2,0,0|same_normalized=1|sample_wave=0|sample_address=1|raw_total1=3|raw_total2=12|remainder1=2|remainder2=5|lane1=2|lane2=1|json=0",
        "CI|run=38745021834|ubuntu_windows_python311_313_node22=4/4_PASS|tampered_rational=HELD|json=0",
        "END|original_raw_10_class_stone_unchanged=1|release_gate10=OPEN|peer_reviews=PENDING|json=0",
    ]
    assert all(e in rows for e in expected), "sealed statement inconsistent with regenerated scientific measurements"
    assert stats["actual_photon_wavelengths_measured"] is False
    assert stats["quantum_computer_executed"] is False
    assert stats["source_cryptographically_authenticated"] is False
    print(json.dumps({
        "verdict":"CORRECTION_STONE_VERIFIED",
        "stone_bytes":len(raw),"stone_sha256":sha(raw),
        "normalized_rows":27,"normalized_hbp_sha256":NORM_SHA,
        "original_case_rows":52488,"original_hbp_sha256":OLD_SHA,
        "normalized_classes":7,"defined_probability_classes":6,
        "physical_optical_measured":False},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=4:
        raise SystemExit("usage: python verify_sealed_round3_normalized.py STONE.hbp NORM_OUTPUT_DIR ORIGINAL_PEER_DIR")
    verify(*sys.argv[1:])
