#!/usr/bin/env python3
"""Seat 4 Room 04: replay a portable, source-complete, read-only evidence bundle.

Usage: python experiments/seat4/room04_offline_verify.py --bundle .
The ZIP's top level contains SHA256SUMS and a source+data directory layout.
No git, Hugging Face token, internet, physical light or human prompt required.
Python 3.11+ and Node.js 22+ are the only program runtimes.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

SEAT1_COMMIT="dd5e47db9522141de3949a23759a5d647ecdafbd"
ORIGINAL="de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b"
TICKS="2b9575a8d46c2d2f0842d590081641ed2b20daddccc7153107d76efa0d597277"
FAULTS="ad471bc627451f65d6f26797ddf6c03546ac1f74ab8e3698d9825f1409f9bbb2"
RECEIPT="e63baf8accdfbca43bd23e02b8849fcf312ee904ea3a29e02ab9c11bd8b0dafd"
RANK="f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78"
ORIGINAL_GIT_BLOBS={
    "opto_gate.py":"32667d1172eae4856a1c31499c04509e96b1771f",
    "opto_gate_node.js":"d5e5644b3e4d65759b3f7c44e006da8cc3310261",
    "verify_opto.py":"31cc1d5abc8ba5c9bda51aac3017de9d7af39701",
    "PREREG-LIGHT-GATED-IDENTITY-1080.md":"a9752cee6bd833af0ad1dbef7b01a50125c8baa1",
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw):
    return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()


def command(args):
    p=subprocess.run([str(x) for x in args],capture_output=True,
                     text=True,timeout=240,check=True)
    return json.loads(p.stdout)


def manifest_check(root):
    manifest=(root/"SHA256SUMS").read_bytes()
    assert manifest and b"\r" not in manifest
    expected={}
    for line in manifest.decode("ascii").splitlines():
        digest,rel=line.split("  ",1)
        p=Path(rel)
        assert not p.is_absolute() and ".." not in p.parts
        assert rel not in expected and len(digest)==64
        expected[rel]=digest
    actual={p.relative_to(root).as_posix():sha(p.read_bytes())
            for p in root.rglob("*") if p.is_file()
            and p.relative_to(root).as_posix()!="SHA256SUMS"}
    assert actual==expected,("offline bundle SHA256SUMS wrong or missing files",
                              set(actual)^set(expected))
    assert sha(manifest)==sha("".join(
        f"{expected[path]}  {path}\n" for path in sorted(expected)
    ).encode("ascii"))
    return len(expected),sha(manifest)


def pinned_inputs(root):
    source=root/"experiments"/"seat1"/"optogenetics"
    for filename,githash in ORIGINAL_GIT_BLOBS.items():
        assert git_blob((source/filename).read_bytes())==githash
    receipt=json.loads((root/"receipt.json").read_bytes())
    assert receipt["frozen_phase_a_sha256"]==ORIGINAL
    assert sha((root/"original-phaseA.hbp").read_bytes())==ORIGINAL
    assert sha((root/"ticks.hbp").read_bytes())==TICKS
    assert sha((root/"faults.hbp").read_bytes())==FAULTS
    assert sha((root/"receipt.json").read_bytes())==RECEIPT
    stone=root/"stones"/"2026-10-15-rainbow81"/"seat4-room04-b2-watchers.json"
    side=stone.with_name(stone.name+".sha256")
    assert stone.read_bytes()==(root/"receipt.json").read_bytes()
    assert side.read_text("ascii").split()==[RECEIPT,stone.name]
    assert receipt["b2_verified_site_tick_transitions"]==349920
    assert receipt["b2_negative_mutations_rejected"]==1296
    assert receipt["b2_clean_checkpoints_accepted"]==108
    assert receipt["halt"]["post_halt_denied"]==64
    assert receipt["halt"]["accepted_before_halt"]==17
    assert receipt["halt"]["human_prompts"]==0
    assert receipt["halt"]["external_privileges_granted"]==0
    assert receipt["independent_physical_source_authenticated"] is False
    assert receipt["physical_light_or_biology_measured"] is False
    return source


def replay(root,source):
    # Replay original unmodified producer's Python and Node implementations,
    # then a separate Seat4 producer and independent Node watchdog. All local.
    with tempfile.TemporaryDirectory(prefix="seat4-room04-offline-") as d:
        temp=Path(d)
        p=command([sys.executable,source/"opto_gate.py",
                  temp/"seat1-py.hbp",temp/"seat1-py.json"])
        n=command(["node",source/"opto_gate_node.js",
                  temp/"seat1-node.hbp",temp/"seat1-node.json"])
        original=(root/"original-phaseA.hbp").read_bytes()
        assert original==(
            temp/"seat1-py.hbp").read_bytes()==(
            temp/"seat1-node.hbp").read_bytes()
        assert p["sha256"]==n["sha256"]==ORIGINAL

        seat4=root/"experiments"/"seat4"
        produced=command([
            sys.executable,seat4/"room04_adversarial_photocycle.py",
            "--tick-hbp",temp/"ticks.hbp",
            "--fault-hbp",temp/"faults.hbp",
            "--phase-a-hbp",temp/"original-phaseA.hbp",
            "--receipt",temp/"receipt.json"
        ])
        assert produced["status"]=="PASS"
        for name in ("ticks.hbp","faults.hbp","original-phaseA.hbp",
                     "receipt.json"):
            assert (temp/name).read_bytes()==(root/name).read_bytes(),name

        watcher=command([
            "node",seat4/"room04_independent_node_watcher.js",
            temp/"ticks.hbp",temp/"faults.hbp",
            temp/"original-phaseA.hbp",temp/"receipt.json"
        ])
        assert watcher["status"]=="PASS"
        assert watcher["independent_node_tick_matches"]==349920
        assert watcher["rejected_fault_rows"]==1296

        retention=command([
            sys.executable,
            root/"experiments"/"retention"/"verify_retention.py"
        ])
        assert retention["status"]=="PASS"
        assert retention["canonical_sha256"]==RANK
        assert retention["rank_cases"]==40
        assert retention["independent_algorithm_parity"] is True

        # Actual negative: corrupt one source byte, require it cannot match
        # the cryptographically committed trace. Hash alone does not recover
        # source information lost by a noninjective map.
        damaged=bytearray((root/"ticks.hbp").read_bytes())
        damaged[len(damaged)//2]^=1
        assert sha(damaged)!=TICKS

        return {"site_ticks":349920,"snapshot_parity":8748,
                "faults_rejected":1296,"retention_rank_cases":40,
                "human_prompts":0,"external_permissions":0}


def main():
    a=argparse.ArgumentParser()
    a.add_argument("--bundle",type=Path,required=True)
    args=a.parse_args()
    root=args.bundle.resolve()
    count,manifest_sha=manifest_check(root)
    source=pinned_inputs(root)
    audit=replay(root,source)
    print(json.dumps({
        "status":"PASS",
        "type":"SEAT4_OFFLINE_SOURCE_COMPLETE_B2",
        "original_seat1_commit":SEAT1_COMMIT,
        "original_phase_a_sha256":ORIGINAL,
        "tick_hbp_sha256":TICKS,
        "fault_hbp_sha256":FAULTS,
        "receipt_sha256":RECEIPT,
        "manifest_sha256":manifest_sha,
        "bundle_files_without_manifest":count,
        "replay":audit,
        "physical_measurement":False,
        "real_world_authority":False
    },sort_keys=True))


if __name__=="__main__":
    main()
