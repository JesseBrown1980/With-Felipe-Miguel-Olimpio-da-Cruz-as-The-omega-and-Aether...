#!/usr/bin/env python3
"""Seat4 B3 offline independent replay: unpack 24+ file Actions ZIP and run.

Requires Python>=3.11 and Node.js>=22; no Git credentials, network, QR-camera
or physical optical memory hardware. Checks every archived byte in SHA256SUMS.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

# The offline package is immutable: dynamic import must not create unsealed
# __pycache__ artifacts in its source tree on Ubuntu or Windows.
sys.dont_write_bytecode=True

EXPECTED={
    "lightbank-source-archive.bin":"1288a63f2d5895bc555813b2703947b94c8179974a46bcf132b55d82dd9e7b9c",
    "lightbank-A.g27":"d0e59818cfc80c7c8ed9f1571c76cf7fed54bd2dc94dae9705a2a0f575f36939",
    "lightbank-B.g27":"8931528d3a0eefd14b2743e6a4a4c68703709af95abccc23b408549525b41bb1",
    "lightbank-P.g27":"319549787a6633c9f7d3f5eeebcb3d974626f814346b993af4cbb445c182bd18",
    "colourqr-rgb-transport.hbp":"293e02518d7972c89c488d5525231f1a40636d467fb1f7ca1b4cc9c69c503952",
    "lightbank-result.json":"40a1a961fb3bae45ad1253b9c0ad91ce31e8dfdb59ef48be3f1e0086291f8b4d",
}
STONE="stones/2026-10-15-rainbow81/seat4-lightbank-b3-three-path-memory.json"
STONE_SHA="40a1a961fb3bae45ad1253b9c0ad91ce31e8dfdb59ef48be3f1e0086291f8b4d"

def sha(b):
    return hashlib.sha256(b).hexdigest()

def manifest_check(folder):
    raw=(folder/"SHA256SUMS").read_bytes()
    assert raw and b"\r" not in raw
    lines=raw.decode("ascii").splitlines()
    declared={}
    for line in lines:
        h,name=line.split("  ",1)
        assert len(h)==64 and name not in declared and name!="SHA256SUMS"
        assert ".." not in Path(name).parts and not Path(name).is_absolute()
        declared[name]=h
    observed={p.relative_to(folder).as_posix():sha(p.read_bytes())
              for p in folder.rglob("*")
              if p.is_file() and p.name!="SHA256SUMS"}
    assert declared==observed,("manifest has missing or altered files",
                              set(declared)^set(observed))
    for name,h in EXPECTED.items():
        assert declared[name]==h,("B3 expected raw memory source changed",name)
    assert declared[STONE]==STONE_SHA
    assert (folder/STONE).read_bytes()==(folder/"lightbank-result.json").read_bytes()
    side=(folder/(STONE+".sha256")).read_text("ascii").split()
    assert side==[STONE_SHA,Path(STONE).name]
    return len(declared),sha(raw)

def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--bundle",type=Path,required=True)
    args=p.parse_args()
    root=args.bundle.resolve()
    count,manifest=manifest_check(root)
    archive=(root/"lightbank-source-archive.bin").read_bytes()
    meta=json.loads((root/"lightbank-result.json").read_bytes())
    assert meta["status"]=="PASS" and meta["archive_sha256"]==sha(archive)
    assert meta["pairwise_full_archive_exact_restore"]==3
    assert meta["one_bank_cannot_uniquely_restore"] is True
    assert meta["physical_photons_or_optical_memory_hardware_measured"] is False
    fixture=load("fixture",root/"sources/lightbank_fixture.py")
    parsed=fixture.parse_archive(archive)
    assert set(parsed)==set(fixture.SOURCE_SHA)
    assert len(parsed["seat4-b2-full-ticks.hbp"])==34_876_953

    bank=load("bank",root/"sources/lightbank_python.py")
    all_banks=[(root/f"lightbank-{letter}.g27").read_bytes()
               for letter in bank.BANKS]
    decoded=0
    for i,j in ((0,1),(0,2),(1,2)):
        assert bank.rebuild(archive,all_banks,(i,j))==archive
        decoded+=1
    qr=(root/"colourqr-rgb-transport.hbp").read_bytes()
    assert bank.decode_transport(qr,archive)==archive
    assert bank.projector_control()==meta["projector"]

    n=subprocess.run(["node",root/"sources/lightbank_node.js",
                     root/"lightbank-source-archive.bin",root],
                     capture_output=True,text=True,check=True,timeout=240)
    audit=json.loads(n.stdout)
    assert audit["status"]=="PASS"
    assert audit["pairwise_full_archive_reconstructions"]==decoded==3
    assert audit["canonical_source_sha256"]==meta["archive_sha256"]
    assert audit["qr_transport_sha256"]==meta["colour_qr_transport"]["sha256"]
    print(json.dumps({
        "status":"PASS","seat":"seat-4","replay":"FULL_SOURCE_ARCHIVE_OFFLINE",
        "archive_bytes":len(archive),"archive_sha256":sha(archive),
        "manifest_files":count,"manifest_sha256":manifest,
        "all_three_pair_reconstructions":decoded,
        "colour_qr_transport_reassembled":True,
        "projector_common_mode_collisions":meta["projector"]["common_mode_collisions"],
        "independent_node_byte_equality":True,
        "physical_optical_memory_measured":False
    },sort_keys=True))

if __name__=="__main__":
    main()
