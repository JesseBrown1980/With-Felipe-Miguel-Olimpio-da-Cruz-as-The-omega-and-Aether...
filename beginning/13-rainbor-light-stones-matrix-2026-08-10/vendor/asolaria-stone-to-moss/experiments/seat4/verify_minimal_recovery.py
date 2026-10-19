#!/usr/bin/env python3
"""Reproducible Seat 4 acceptance test: lossless vs lossy GF(2) evolution.

Independently derive 81-bit map columns (Python polynomial powers versus Node
transfer matrices), reconstruct sources with minimal sufficient extra bits,
check real kernel collisions and reject any attempt to call identical
post-evolution outputs recoverable without those bits.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[2]
STONE=ROOT/"stones"/"2026-10-14-rainbow81"
SCRIPTS=ROOT/"experiments"/"seat4"
LOSS={
    ("legacy","CA150"):2,
    ("legacy","CA90"):1,
    ("legacy","CA60"):1,
    ("legacy","CA102"):1,
    ("legacy","SHIFT"):0,
    ("triad-stress","TAP0"):1,
    ("triad-stress","TAP1"):1,
    ("triad-stress","TAP2"):0,
    ("triad-stress","TAP3"):0,
    ("triad-stress","TAP4"):1
}
CHALLENGE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
TRACE_SHA="1d9a57dc908ad206d64ab336cd9f9de402614821c41369fb19dfb5f2f2c46bfe"
RECEIPT=STONE/"seat-4-minimal-recovery-20261014.json"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def run(args):
    p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True,timeout=120,check=True)
    return json.loads(p.stdout.strip())


def main():
    # The older independent 40-row rank proof and its SHA sidecars must still hold.
    baseline=run([sys.executable,str(ROOT/"experiments"/"retention"/"verify_retention.py")])
    assert baseline["status"]=="PASS" and baseline["rank_cases"]==40
    receipt_raw=RECEIPT.read_bytes()
    receipt=json.loads(receipt_raw)
    assert receipt["schema"]=="ASOLARIA-SEAT4-MINIMAL-RECOVERY-RESULT-V1"
    assert receipt["seat"]=="seat-4"
    assert receipt["source_challenge_sha256"]==CHALLENGE_SHA
    assert receipt["result"]["complete_trace_sha256"]==TRACE_SHA
    assert receipt["result"]["exact_source_roundtrips"]==8440
    assert receipt["result"]["mismatched_reconstructions"]==0
    assert receipt["boundaries"]["physical_host_independently_attested"] is False
    assert receipt["boundaries"]["physical_three_device_challenge_issued"] is False
    assert receipt["boundaries"]["represents_compression_gain"] is False
    assert [x["minimal_recovery_tag_bits"] for x in receipt["law_results"]]==[
        x for x in LOSS.values()
    ]
    sidecar=RECEIPT.with_suffix(".json.sha256")
    assert sidecar.is_file(),"Seat 4 recovery receipt SHA-256 sidecar missing"
    assert sidecar.read_text("ascii").split()==[sha(receipt_raw),RECEIPT.name]
    with tempfile.TemporaryDirectory(prefix="asolaria-seat4-recovery-") as tmp:
        pyout=Path(tmp)/"python.trace"
        jsout=Path(tmp)/"node.trace"
        python=run([sys.executable,str(SCRIPTS/"minimal_recovery_python.py"),str(pyout)])
        node=run(["node",str(SCRIPTS/"minimal_recovery_matrix.js"),str(jsout)])
        a=pyout.read_bytes()
        b=jsout.read_bytes()
        assert a==b,"Python and Node recovery traces differ"
        digest=sha(a)
        assert digest==TRACE_SHA,"Full source-reconstruction trace differs from pinned bytes"
        assert digest==python["canonical_trace_sha256"]==node["canonical_trace_sha256"]
        for record in (python,node):
            assert record["schema"]=="ASOLARIA-SEAT4-MINIMAL-RECOVERY-V1"
            assert record["seat"]=="seat-4"
            assert record["source_challenge_sha256"]==CHALLENGE_SHA
            assert record["rows"]==8440
            assert record["law_horizon_cases"]==40
            assert record["no_tag_roundtrips"]==2532
            assert record["side_tag_roundtrips"]==5908
            assert record["nonzero_kernel_collisions"]==36
            assert record["wrong_tag_misdecodes"]==28
            assert record["physical_host_independently_attested"] is False
            assert record["law_summary"]==[
                {"family":f,"law":name,"rank":81-k,"minimal_extra_bits":k,
                 "reversible_without_extra_bits":k==0}
                for (f,name),k in LOSS.items()
            ]
        assert a.count(b"\n")==8440
        assert all(len(line.split(b"|"))==8 for line in a.splitlines())
        assert sha(a[:-1]+b"X")!=digest,"tampered trace must hash differently"
        for record in (python,node):
            assert {k:v for k,v in record.items() if k!="algorithm"}=={
                k:v for k,v in python.items() if k!="algorithm"
            }
    print(json.dumps({
        "schema":"ASOLARIA-SEAT4-MINIMAL-RECOVERY-VERIFIED-V1",
        "seat":"seat-4",
        "status":"PASS",
        "law_horizon_cases":40,
        "roundtrips":8440,
        "full_recovery_without_extra_bits":2532,
        "full_recovery_with_minimal_sidebits":5908,
        "constructed_nonzero_kernel_collisions":36,
        "wrong_tag_misdecodes":28,
        "source_challenge_sha256":CHALLENGE_SHA,
        "canonical_trace_sha256":digest,
        "result_receipt_sha256":sha(receipt_raw),
        "cross_language_trace_byte_equal":True,
        "physical_machine_independence":"UNVERIFIED",
        "scope":"exact digital input reconstruction only; no physical entropy, light or faster-than-light test"
    },sort_keys=True))


if __name__=="__main__":
    main()
