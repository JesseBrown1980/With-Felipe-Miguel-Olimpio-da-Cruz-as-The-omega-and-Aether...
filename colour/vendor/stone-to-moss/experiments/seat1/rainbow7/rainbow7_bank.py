#!/usr/bin/env python3
"""Seat 1: seven logical rainbow-address bank, full-byte persisted (NOT optical).
Input is byte-exact output of previous 81-memory RGB QR pixel readback.
Preregistration: PREREG-RAINBOW7-LIGHTBANK-20261015.md.
"""
from pathlib import Path
import hashlib
import json
import sys

BANDS=("red","orange","yellow","green","blue","indigo","violet")
SOURCE_SHA="02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22"
SOURCE_HBP_SHA="1a4852f498f433d90fabea144c26d2973f7d95c8b01828a9665e7d7eb3dd44bd"
SCHEMA="ASOLARIA-RAINBOW7-BANK-ENTRY-V1"

def digest(data):
    return hashlib.sha256(data).hexdigest()

def canonical(value):
    return (json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)+"\n").encode("utf-8")

def check_sources(source):
    root=Path(source)
    mem=(root/"lightbank-memories.json").read_bytes()
    if digest(mem)!=SOURCE_SHA: raise AssertionError("BASE_81_QR_READBACK_SHA_MISMATCH")
    obj=json.loads(mem)
    if len(obj["records"])!=81 or obj["schema"]!="ASOLARIA-SEAT1-81-RGB-LIGHTBANK-V1":
        raise AssertionError("BASE_81_IDENTITY_COUNT_OR_SCHEMA")
    if any(record["id"]!=f"site-{i:03d}" for i,record in enumerate(obj["records"])):
        raise AssertionError("BASE_81_IDENTITY_DRIFT")
    if canonical(obj)!=mem:raise AssertionError("BASE_81_SOURCE_NOT_CANONICAL")
    results=json.loads((root/"results.json").read_bytes())
    if results["memory_sha256"]!=SOURCE_SHA or results["hbp_sha256"]!=SOURCE_HBP_SHA:
        raise AssertionError("BASE_81_QR_GATE_SHA_MISMATCH")
    if digest((root/"photocycle-frame.hbp").read_bytes())!=SOURCE_HBP_SHA:
        raise AssertionError("BASE_81_PHOTOCYCLE_TRACE_DRIFT")
    metrics={(r["profile"],r["arm"]):r for r in results["metrics"]}
    if len(metrics)!=12:raise AssertionError("BASE_81_ARMS_MISSING")
    for p in ("paired_short","paired_long"):
        if metrics[p,"dark"]["authorized_reads"]!=0 or metrics[p,"feedback_now"]["authorized_reads"]<=0:
            raise AssertionError("READ_GATE_DARK_OR_LIGHT_UNVERIFIED")
    return obj["records"],metrics

def build(source,destination):
    records,metrics=check_sources(source)
    dest=Path(destination);dest.mkdir(parents=True,exist_ok=True)
    offsets=[];payload=bytearray()
    for band_index,band in enumerate(BANDS):
        for i,record in enumerate(records):
            address=f"rainbow7/{band}/site-{i:03d}"
            body=canonical({"schema":SCHEMA,"address":address,
                            "band":band,"id":record["id"],"record":record})
            begin=len(payload)
            payload.extend(body)
            offsets.append(f"MEM|band={band}|id=site-{i:03d}|offset={begin}|length={len(body)}|sha256={digest(body)}")
    bank=bytes(payload)
    hbi=("\n".join(offsets)+"\n").encode("ascii")
    assert len(offsets)==567 and hbi.count(b"MEM|")==567
    (dest/"rainbow7-bank.jsonl").write_bytes(bank)
    (dest/"rainbow7-index.hbi").write_bytes(hbi)
    manifest={
        "schema":"ASOLARIA-RAINBOW7-LOGICAL-READBANK-V1",
        "source_sha256":SOURCE_SHA,
        "source_qr_photocycle_hbp_sha256":SOURCE_HBP_SHA,
        "evidence":"SEVEN_LOGICAL_LABELS_NOT_SEVEN_MEASURED_WAVELENGTHS",
        "original_unique_memories":81,
        "logical_rainbow_bands":list(BANDS),
        "addressable_full_replicas":567,
        "independent_origin_samples":0,
        "original_data_retained_in_full":True,
        "bytes_saved_by_labeling":0,
        "index_sha256":digest(hbi),
        "bank_sha256":digest(bank),
        "bank_bytes":len(bank),
        "index_bytes":len(hbi),
        "read_gate_source":"PRIOR_SYNTHETIC_PHOTOCYCLE_LOGICAL_ONLY",
        "per_band_digital_gate":{
            band: {"profile":("paired_short" if i%2==0 else "paired_long"),
                   "feedback_now_authorized_reads":metrics[("paired_short" if i%2==0 else "paired_long"),"feedback_now"]["authorized_reads"],
                   "dark_authorized_reads":metrics[("paired_short" if i%2==0 else "paired_long"),"dark"]["authorized_reads"]}
            for i,band in enumerate(BANDS)
        },
        "source_authentication":"HELD_DIGEST_NOT_SIGNATURE",
        "physical_optical_storage_verified":False,
        "physical_neural_current_measured":False
    }
    (dest/"rainbow7-manifest.json").write_bytes(canonical(manifest))
    for name in ("rainbow7-bank.jsonl","rainbow7-index.hbi","rainbow7-manifest.json"):
        p=dest/name
        (dest/(name+".sha256")).write_text(f"{digest(p.read_bytes())}  {name}\n",encoding="ascii")
    print(json.dumps({"status":"PASS","addresses":567,"unique_source_memories":81,
        "bank_sha256":digest(bank),"index_sha256":digest(hbi),
        "bank_bytes":len(bank),"index_bytes":len(hbi),
        "optical_storage_verified":False},sort_keys=True))
    return manifest

def main():
    if len(sys.argv)!=3:raise SystemExit("usage: rainbow7_bank.py existing_qr_evidence output_dir")
    build(sys.argv[1],sys.argv[2])

if __name__=="__main__":main()
