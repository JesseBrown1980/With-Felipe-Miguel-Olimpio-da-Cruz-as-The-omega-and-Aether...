#!/usr/bin/env python3
"""Fail-closed stone-to-fresh-replay verification for 3-bit order theorem."""
import hashlib
import json
import sys
from pathlib import Path

STONE_SHA="bbc4ecf5d228f8ffca0db457a8437b35f9f422426aae4be6612a268e36b68a5c"
SOURCE_SHA="8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672"
TRACE_SHA="18e611242d5d48ceb35b0bba14a13bbae192fd51141fe659f6052ada7f5c506a"
JSON_SHA="98fbe2a386c72700934e86aaf1f02da94a78d680ece533aeb7df824fd0ac4f7c"
AUDITOR_SHA="beb22f9ebb0bea52790adfbfdec61a4dcfaf0ce1b1f9bcc4c084911348f3542c"

def sha(b):return hashlib.sha256(b).hexdigest()

def verify(stone,out):
    stone=Path(stone)
    body=stone.read_bytes()
    assert len(body)==1392 and sha(body)==STONE_SHA,"STONE_CONTENT_DRIFT"
    side=stone.parent/(stone.name+".sha256")
    assert side.read_bytes()==(STONE_SHA+"  "+stone.name+"\n").encode("ascii")
    lines=body.decode("ascii").splitlines()
    assert len(lines)==11
    assert lines[0]=="PORTAL|schema=ASOLARIA-SEAT3-3BIT-QUADRATIC-WITNESS-V1|date=2026-10-15|digital_only=1|json=0"
    assert lines[-1]=="END|protocol_post_hoc_discovery=1|old_source_untouched=1|release_issue10=OPEN|peer_reviews=PENDING|json=0"

    out=Path(out)
    trace=(out/"witness59049.hbp").read_bytes()
    receipt=(out/"witness-result.json").read_bytes()
    audit=(out/"witness-independent-check.json").read_bytes()
    assert len(trace)==3260349 and sha(trace)==TRACE_SHA
    assert len(receipt)==2981 and sha(receipt)==JSON_SHA
    assert len(audit)==436 and sha(audit)==AUDITOR_SHA
    r=json.loads(receipt)
    a=json.loads(audit)
    assert r["full_trace_bytes"]==3260349
    assert r["full_trace_sha256"]==TRACE_SHA
    assert r["verified_original_v2_trace_sha256"]==SOURCE_SHA
    assert r["verified_original_v2_rows"]==59049
    assert r["ordered_id_count"]==27
    assert r["normalized_classes_including_dark"]==7
    assert r["valid_normalized_probabilities"]==6
    assert r["max_normalized_equivalence_class"]==6
    assert r["minimum_fixed_class_conditioned_side_bits"]==3
    assert r["fixed_class_plus_witness_total_bits"]==6
    assert r["standalone_direct_ordered_id_fixed_bits"]==5
    assert r["quadratic_formula"]=="(r+4g+3b+4rg)%8"
    assert [x["valid_coefficient_triples"] for x in r["affine_search"]]==[0]*9+[60]
    assert [x["valid_coefficient_quads"] for x in r["degree2_monomial_search"]]==[0,0,0,8,8,8]
    assert r["affine_search"][-1]["first"]==[1,3,4]
    assert r["degree2_monomial_search"][3]["first"]==[1,4,3,4]
    assert r["reconstructed_route_census"]=={"0":36906,"1":10179,"2":9777,"H":2187}
    assert sum(v=="HELD" for v in r["negative_controls"].values())==10
    assert r["negative_controls"]["self_consistent_attacker_owned_manifest"]=="ORIGIN_UNAUTHENTICATED"
    assert r["negative_controls"]["wrong_valid_in_class_witness_is_decodable_as_another_id"]=="NEEDS_TRUSTED_SOURCE_BINDING"
    assert a["verdict"]=="INDEPENDENT_THIRD_WITNESS_CHECK_PASS"
    assert a["trace_sha256"]==TRACE_SHA and a["json_sha256"]==JSON_SHA
    assert r["externally_authenticated_origin"] is False
    assert r["physical_spectrum_measured"] is False
    required=[
      f"UPSTREAM|pr81_head=c32d472dfe84f352450eb50469e0e9a987c33d78|source_hbp_sha256={SOURCE_SHA}|json=0",
      "WITNESS|formula=(r+4g+3b+4rg)%8|additional_fixed_bits=3|inverse_unique_with_class=27|total_fixed_bits_including_class=6|direct_id_bits=5|json=0",
      "AFFINE|family=(ar+bg+cb)%m|m2_to_m10_valid_triples=0|m11_valid_triples=60|m11_first=1,3,4|json=0",
      "QUADRATIC|family=(ar+bg+cb+dT)%8|monomials=r2,g2,b2,rg,rb,gb|counts=0,0,0,8,8,8|first_rg=1,4,3,4|json=0",
      f"TRACE|original_route_rows=59049|witness_hbp_bytes=3260349|witness_hbp_sha256={TRACE_SHA}|json=0",
      f"RECEIPT|json_bytes=2981|json_sha256={JSON_SHA}|auditor_sha256={AUDITOR_SHA}|json=0",
      "CI|run=38763638453|ubuntu_windows_python311_313_node22=4/4_PASS|four_artifacts_byte_equal=PASS|tamper=HELD|json=0",
    ]
    assert all(x in lines for x in required),"STONE_TO_SOURCE_RECEIPT_MISMATCH"
    print(json.dumps({
        "status":"SEALED_3BIT_WITNESS_PASS",
        "stone_sha256":STONE_SHA,
        "full_trace_sha256":TRACE_SHA,
        "replayed_source_rows":59049,
        "ordered_id_count":27,
        "witness_extra_bits":3,
        "physical_spectrum_measured":False
    },sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=3:raise SystemExit("usage: python verify_sealed_witness.py STONE.hbp FRESH_OUTPUT_DIR")
    verify(*sys.argv[1:])
