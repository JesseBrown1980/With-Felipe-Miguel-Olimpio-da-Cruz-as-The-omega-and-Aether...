#!/usr/bin/env python3
"""Cross-check committed source-sealed B3 stone against newly rerun full B3 metrics."""
import hashlib
import json
import sys
from pathlib import Path

STONE_SHA="6e5ef1e58b399994997e942a7a0a4f1624e99ec06e4db308f03410566b605845"
TRACE_SHA="3624ef608ec0db378cde791f97aabda8833988e4996daf41a8bc1ce1d00852b9"
ROOT_SHA="841825c3ef6c84174e3c9da71adef7629f4cfad9368968ba4cb5fae5d9469b1f"
PROJECTED_SHA="e6f3bd32079cf3a26b86a2f9d7f95497596e190986eca96a8a0be56dfeb3eb80"
SHA=lambda b:hashlib.sha256(b).hexdigest()

def check(path,metrics_path):
    path=Path(path)
    b=path.read_bytes()
    assert len(b)==1653 and SHA(b)==STONE_SHA,"immutable August HBP source changed"
    side=(path.parent/(path.name+".sha256")).read_text("ascii").split()
    assert side==[STONE_SHA,path.name],"corrupted SHA256 sidecar"
    txt=b.decode("ascii")
    assert txt.startswith("PORTAL|schema=ASOLARIA-SEAT3-AUGUST-LIGHTBANK-RECEIPT-V1")
    assert txt.endswith("END|historical_stones_unchanged=1|peer_review=PENDING|json=0\n")
    assert "PREREG|commit=d04bbd6316d98a2f7728643c1a972f453da9a62a" in txt
    assert "CI|run=38733356623|ubuntu_windows_python311_313_node22=4/4_PASS" in txt
    m=json.loads(Path(metrics_path).read_text("utf8"))
    assert m["schema"]=="ASOLARIA-SEAT3-AUGUST-LIGHTBANK-PROJECTOR-RGB-V1"
    assert m["status"]=="PASS"
    assert m["full_trace_bytes"]==24244 and m["full_trace_sha256"]==TRACE_SHA
    assert m["source_sha256"]==ROOT_SHA and m["source_bytes"]==65536
    assert m["projected_sha256"]==PROJECTED_SHA and m["projected_bytes"]==131076
    assert m["matrix_rank"]==2 and m["matrix_projector_identity"] is True
    assert m["raw_mode"]["chunks"]==32 and m["raw_mode"]["frames"]==11
    assert m["projected_mode"]["chunks"]==63 and m["projected_mode"]["frames"]==21
    assert m["bank_capacity"]==729 and m["post_fill_evictions"]==63
    assert m["immutable_slot_identities"] is True
    assert m["negative_held_count"]==7
    assert all(x["verdict"]=="HELD" for x in m["executed_negative_controls"])
    assert m["origin_authenticated"] is False and m["camera_used"] is False
    assert m["optical_device_used"] is False and m["qr_pixels_generated"] is False
    assert "TRACE|bytes=24244|sha256="+TRACE_SHA in txt
    assert "ROOT|raw_bytes=65536|raw_sha256="+ROOT_SHA in txt
    assert "encoded_sha256="+PROJECTED_SHA in txt
    assert "BANK|slot_capacity=729|initial_projected_packets=63|projected_recall_hits=63" in txt
    assert "BOUNDARY|optical_memory_device=NOT_TESTED|ordinary_QR_scan=NOT_TESTED" in txt
    print(json.dumps({"verdict":"SEALED_AUGUST_LIGHTBANK_PASS",
       "receipt_bytes":len(b),"receipt_sha256":STONE_SHA,
       "trace_sha256":TRACE_SHA,"source_sha256":ROOT_SHA,
       "lossless_projector_with_common_sideband":True,
       "physical_photons_tested":False,"independent_host_attestation":False},
       sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: python verify_sealed_lightbank.py receipt.hbp newly_generated_metrics.json")
    check(*sys.argv[1:])
