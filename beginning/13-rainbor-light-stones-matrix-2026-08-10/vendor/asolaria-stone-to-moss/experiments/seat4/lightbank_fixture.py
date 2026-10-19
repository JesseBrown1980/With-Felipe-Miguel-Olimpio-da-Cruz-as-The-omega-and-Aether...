#!/usr/bin/env python3
"""Generate a pinned, source-complete 5-record binary archive for lightbank B3.

Source programs run on the CI runner. Never make an optical-hardware claim:
this is binary data from pinned digital Asolaria software and August design.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys

MAGIC=b"ASOLARIA-LIGHTBANK-ARCHIVE-V1\n"
SOURCE_SHA={
 "august-rainbor-design.hbp":"bb870f697af209f228f0d42c0de15ece58b550ed9e9bbb31f855956190ac7306",
 "retention-rank40.tsv":"f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78",
 "seat1-3state-photocycle.hbp":"de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b",
 "seat4-b2-fault-ledger.hbp":"ad471bc627451f65d6f26797ddf6c03546ac1f74ab8e3698d9825f1409f9bbb2",
 "seat4-b2-full-ticks.hbp":"2b9575a8d46c2d2f0842d590081641ed2b20daddccc7153107d76efa0d597277"
}

def sha(blob):
    return hashlib.sha256(blob).hexdigest()

def git_blob(blob):
    return hashlib.sha1(b"blob "+str(len(blob)).encode()+b"\0"+blob).hexdigest()

def execute(cmd):
    r=subprocess.run([str(x) for x in cmd],check=True,text=True,
                     capture_output=True,timeout=240)
    obj=json.loads(r.stdout)
    assert obj["status"]=="PASS",obj
    return obj

def make(out,seat1,seat4,rainbor,root):
    out.mkdir(parents=True,exist_ok=True)
    b1=seat1/"experiments/seat1/optogenetics"
    b4=seat4/"experiments/seat4"
    rain=rainbor/"RAINBOR-HUB-2026-08-08.hbp"
    assert git_blob(rain.read_bytes())=="f5e8a5004157229988f8a181e68773c0a2055955"
    assert git_blob((b1/"opto_gate.py").read_bytes())=="32667d1172eae4856a1c31499c04509e96b1771f"
    assert git_blob((b1/"opto_gate_node.js").read_bytes())=="d5e5644b3e4d65759b3f7c44e006da8cc3310261"
    assert git_blob((b4/"room04_adversarial_photocycle.py").read_bytes())=="a6542a2c00e8a4d3ab623983553b7921b0c5c76d"
    s1=execute([sys.executable,b1/"opto_gate.py",
                out/"seat1.hbp",out/"seat1.json"])
    s1n=execute(["node",b1/"opto_gate_node.js",
                 out/"seat1-node.hbp",out/"seat1-node.json"])
    assert s1["sha256"]==s1n["sha256"]==SOURCE_SHA["seat1-3state-photocycle.hbp"]
    assert (out/"seat1.hbp").read_bytes()==(out/"seat1-node.hbp").read_bytes()
    s4=execute([sys.executable,b4/"room04_adversarial_photocycle.py",
        "--tick-hbp",out/"seat4-ticks.hbp",
        "--fault-hbp",out/"seat4-faults.hbp",
        "--phase-a-hbp",out/"seat4-phaseA.hbp",
        "--receipt",out/"seat4-receipt.json"])
    assert s4["site_tick_checks"]==349920
    assert s4["rejected_fault_cases"]==1296
    assert s4["phase_a_sha256"]==s1["sha256"]
    assert (out/"seat4-phaseA.hbp").read_bytes()==(out/"seat1.hbp").read_bytes()
    receipt=json.loads((out/"seat4-receipt.json").read_bytes())
    assert receipt["halt"]["accepted_before_halt"]==17
    assert receipt["halt"]["post_halt_denied"]==64
    assert receipt["halt"]["human_prompts"]==0
    assert receipt["halt"]["external_privileges_granted"]==0
    assert receipt["external_authorization_granted"] is False
    assert receipt["independent_physical_source_authenticated"] is False
    assert receipt["physical_light_or_biology_measured"] is False
    assert sha((out/"seat4-receipt.json").read_bytes())=="e63baf8accdfbca43bd23e02b8849fcf312ee904ea3a29e02ab9c11bd8b0dafd"

    paths={
        "august-rainbor-design.hbp":rain,
        "retention-rank40.tsv":root/"stones/2026-10-14-rainbow81/retention-81-rank40.tsv",
        "seat1-3state-photocycle.hbp":out/"seat1.hbp",
        "seat4-b2-fault-ledger.hbp":out/"seat4-faults.hbp",
        "seat4-b2-full-ticks.hbp":out/"seat4-ticks.hbp"
    }
    assert set(paths)==set(SOURCE_SHA)
    pack=out/"lightbank-source-archive.bin"
    entries=[]
    with pack.open("wb") as f:
        f.write(MAGIC+struct.pack(">H",len(paths)))
        for name in sorted(paths):
            blob=paths[name].read_bytes()
            assert sha(blob)==SOURCE_SHA[name],("PINNED_SOURCE_CHANGED",name)
            encoded=name.encode("ascii")
            assert 0<len(encoded)<65536
            f.write(struct.pack(">H",len(encoded))+encoded)
            f.write(struct.pack(">Q",len(blob))+hashlib.sha256(blob).digest())
            f.write(blob)
            entries.append({"name":name,"bytes":len(blob),"sha256":SOURCE_SHA[name]})
    raw=pack.read_bytes()
    summary={"status":"PASS","schema":"ASOLARIA-LIGHTBANK-FIVE-RECORD-FIXTURE-V1",
        "archive_bytes":len(raw),"archive_sha256":sha(raw),
        "source_entries":entries,"site_ticks":349920,"faults_rejected":1296,
        "original_8748_snapshots":True,
        "source_credibility":"pinned synthetic software outputs + design HBP, not actual optical memory",
        "physical_light_measured":False}
    (out/"fixture-summary.json").write_text(json.dumps(summary,sort_keys=True,indent=2)+"\n",
                                            encoding="utf-8",newline="\n")
    return summary

def parse_archive(blob):
    """Independent portable parser for the source archive (Python side)."""
    assert blob.startswith(MAGIC)
    pos=len(MAGIC)
    count=struct.unpack(">H",blob[pos:pos+2])[0];pos+=2
    assert count==5
    entries={}
    for _ in range(count):
        assert pos+2<=len(blob)
        nl=struct.unpack(">H",blob[pos:pos+2])[0];pos+=2
        assert 0<nl<256
        name=blob[pos:pos+nl].decode("ascii");pos+=nl
        assert name not in entries and name in SOURCE_SHA
        assert pos+40<=len(blob)
        size=struct.unpack(">Q",blob[pos:pos+8])[0];pos+=8
        digest=blob[pos:pos+32];pos+=32
        assert size<=100_000_000 and pos+size<=len(blob)
        raw=blob[pos:pos+size];pos+=size
        assert hashlib.sha256(raw).digest()==digest
        assert sha(raw)==SOURCE_SHA[name]
        entries[name]=raw
    assert pos==len(blob) and list(entries)==sorted(SOURCE_SHA)
    return entries

def main():
    p=argparse.ArgumentParser()
    for x in ("seat1","seat4","rainbor","out"):
        p.add_argument("--"+x,required=True,type=Path)
    args=p.parse_args()
    root=Path(__file__).resolve().parents[2]
    report=make(args.out,args.seat1,args.seat4,args.rainbor,root)
    assert len(parse_archive((args.out/"lightbank-source-archive.bin").read_bytes()))==5
    print(json.dumps(report,sort_keys=True))

if __name__=="__main__":
    main()
