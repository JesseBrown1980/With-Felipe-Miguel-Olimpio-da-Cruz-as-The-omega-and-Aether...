#!/usr/bin/env python3
"""Seat3 fail-closed independent-source exact-binary memory-bank peer verifier."""
from __future__ import annotations
import hashlib
import json
import math
import sys
from pathlib import Path

EXPECTED_L=(611999,365671)
EXPECTED_SHAS=(
 "de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b",
 "435eccff256d119e608926ba3f3ec46a961d9f0d18801c440de2c3552200101d"
)
SCHEMA="ASOLARIA-SEAT3-AUGUST-LIGHTBANK-RGB-PROJECTOR-V1"
sha=lambda raw:hashlib.sha256(raw).hexdigest()

def verify(py_dir,node_dir,b1,b2,out):
    py=Path(py_dir);node=Path(node_dir)
    a=Path(b1).read_bytes();b=Path(b2).read_bytes()
    assert (len(a),len(b))==EXPECTED_L
    assert (sha(a),sha(b))==EXPECTED_SHAS
    for name in ("lightbank.lbk","lightbank.hbp","lightbank.json"):
        raw=(py/name).read_bytes()
        assert raw==(node/name).read_bytes(),f"independent Python/Node {name} BYTE MISMATCH"
        for folder in (py,node):
            side=(folder/(name+".sha256")).read_text("ascii").split()
            assert side==[sha(raw),name],f"{name} sidecar mismatch"
    stick=(py/"lightbank.lbk").read_bytes()
    hbp=(py/"lightbank.hbp").read_bytes()
    metrics=json.loads((py/"lightbank.json").read_text("ascii"))
    assert metrics==json.loads((node/"lightbank.json").read_text("ascii"))
    assert metrics["schema"]==SCHEMA and metrics["status"]=="PASS"
    assert metrics["source_lengths"]==list(EXPECTED_L)
    assert metrics["source_sha256"]==list(EXPECTED_SHAS)
    assert metrics["combined_bytes"]==977670
    assert metrics["combined_sha256"]==sha(a+b)
    assert metrics["indexed_packets"]==466 and metrics["rgb_frames"]==156
    assert metrics["rgb_lanes"]==[156,155,155]
    assert metrics["memory_banks"]==3 and metrics["capacity_per_bank"]==729
    assert metrics["stress"]["writes"]==756 and metrics["stress"]["evictions"]==27
    assert metrics["stress"]["evicted_recall"]=="HELD"
    assert metrics["lightstick_sha256"]==sha(stick)
    assert metrics["lightstick_bytes"]==len(stick)
    assert metrics["receipt_sha256"]==sha(hbp)
    assert metrics["receipt_bytes"]==len(hbp)
    assert metrics["physical_photon_memory"] is False
    assert metrics["actual_qr_images"] is False
    assert metrics["independent_physical_hosts"] is False
    assert metrics["source_authenticated"] is False
    assert metrics["compression_claim"] is False
    cases=metrics["negative_controls"]
    assert cases["projection_without_common_mode"]=="AMBIGUOUS_HELD"
    for case in ("flipped_encoded_byte","truncated_packet",
                 "swapped_first_rgb_lane","stale_epoch","missing_manifest",
                 "forged_common_component","duplicate_or_swapped_fischer_index",
                 "coherent_fake_source_anchored","cache_eviction_without_archive"):
        assert cases[case]=="HELD",case
    assert sum(v=="HELD" for v in cases.values())==9
    assert cases["coherent_fake_source_without_external_anchor"]=="MATH_GREEN_ORIGIN_UNAUTHENTICATED"
    lines=hbp.decode("ascii").splitlines()
    assert lines[0]==(
       f"PORTAL|schema={SCHEMA}|epoch=20261015"
       "|source_bytes=977670|capacity_per_lane=729|physical_light=0|json=0")
    rows=[line for line in lines if line.startswith("PACKET|")]
    assert len(rows)==466
    for index,line in enumerate(rows):
        assert line.startswith(f"PACKET|index={index:04d}|frame={index//3:03d}|"
                               f"lane={'RGB'[index%3]}|"),(index,line)
        if index==465:assert "|body_bytes=1170|" in line
    assert lines[-1]=="END|cold_read=PASS|projection_only=HELD|external_origin_authenticated=0|real_QR_photon_capture=0|zero_human_per_tick=1|json=0"
    # Each algorithm's decode-only command is separately exercised in CI;
    # this verifier checks their resulting bytes against historical source.
    dst=Path(out);dst.mkdir(parents=True,exist_ok=True)
    for name,raw in (("lightbank.lbk",stick),("lightbank.hbp",hbp),
                     ("lightbank.json",(py/"lightbank.json").read_bytes())):
        (dst/name).write_bytes(raw)
        (dst/(name+".sha256")).write_bytes((sha(raw)+"  "+name+"\n").encode("ascii"))
    j=(py/"lightbank.json").read_bytes()
    hbi=(f"INDEX|schema=ASOLARIA-SEAT3-AUGUST-LIGHTBANK-INDEX-V1|json=0\n"
         f"STICK|bytes={len(stick)}|sha256={sha(stick)}|json=0\n"
         f"HBP|bytes={len(hbp)}|sha256={sha(hbp)}|json=0\n"
         f"JSON|bytes={len(j)}|sha256={sha(j)}|json=0\n"
         "END|physical_optical_storage=0|camera_decode=0|origin_authenticated=0|json=0\n").encode("ascii")
    (dst/"lightbank.hbi").write_bytes(hbi)
    (dst/"lightbank.hbi.sha256").write_bytes((sha(hbi)+"  lightbank.hbi\n").encode("ascii"))
    summary={"status":"PASS","pinned_source_sha256":list(EXPECTED_SHAS),
      "combined_bytes":977670,"indexed_packets":466,"rgb_frames":156,
      "held_cases":9,"evictions":27,"decoded_byte_exact":True,
      "lightstick_bytes":len(stick),"lightstick_sha256":sha(stick),
      "receipt_bytes":len(hbp),"receipt_sha256":sha(hbp),
      "hbi_sha256":sha(hbi),"real_optical_memory_tested":False}
    print(json.dumps(summary,sort_keys=True))
    (dst/"verification.json").write_bytes((json.dumps(summary,sort_keys=True,
        separators=(",",":"))+"\n").encode("ascii"))

if __name__=="__main__":
    if len(sys.argv)!=6:
        raise SystemExit("usage: verify_lightbank.py python_dir node_dir frozen_b1 frozen_b2 artifacts_dir")
    verify(*sys.argv[1:])
