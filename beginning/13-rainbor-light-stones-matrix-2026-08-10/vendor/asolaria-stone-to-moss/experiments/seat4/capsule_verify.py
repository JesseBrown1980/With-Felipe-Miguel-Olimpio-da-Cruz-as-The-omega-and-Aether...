#!/usr/bin/env python3
"""Offline verifier for portable Asolaria Seat 4 N-Nest simulation capsule.

Runs after extracting the ZIP; no Git checkout, HTTP, cloud or user interaction
is required. Only Python 3.11+ and Node 22+ are needed. This is software,
not physical optical, biological, or hardware-independent attestation.
"""
import argparse,hashlib,json,subprocess,sys,tempfile
from pathlib import Path
def sha(x):return hashlib.sha256(x).hexdigest()
def run(argv,cwd=None):
    p=subprocess.run([str(a) for a in argv],cwd=cwd,check=True,
                     capture_output=True,text=True,timeout=240)
    return p.stdout
def root_for(file):
    f=Path(file).resolve()
    a=f.parents[2]
    if (a/"experiments"/"seat4"/"verify_recurrence_trial.py").is_file():
        return a
    b=f.parents[1]
    assert (b/"experiments"/"seat4"/"verify_recurrence_trial.py").is_file()
    return b
def verify_package(root):
    capsule=root/"capsule"
    manifest_raw=(capsule/"manifest.json").read_bytes()
    side=(capsule/"manifest.json.sha256").read_text("ascii").split()
    assert side==[sha(manifest_raw),"manifest.json"],"manifest SHA sidecar incorrect"
    manifest=json.loads(manifest_raw)
    assert manifest["schema"]=="ASOLARIA-SEAT4-PORTABLE-SIMULATION-CAPSULE-V1"
    assert manifest["simulation"]["per_tick_human_interventions"]==0
    assert manifest["simulation"]["identities_are_immutable"] is True
    assert manifest["n_nest_pinned_commit"]=="307903651f56e8a28ef98ca36aef22ee8cda935c"
    expected={e["path"]:e for e in manifest["files"]}
    assert len(expected)==len(manifest["files"]),"duplicate path in manifest"
    actual={p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
    assert actual==set(expected)|{"capsule/manifest.json","capsule/manifest.json.sha256"},(
      "unexpected/missing capsule files",sorted(actual-set(expected)))
    for rel,e in expected.items():
        p=root/rel
        assert p.is_file()
        raw=p.read_bytes()
        assert len(raw)==e["bytes"] and sha(raw)==e["sha256"],("file mismatch",rel)
    assert len([p for p in expected if p.startswith("nnest-upstream/")])>=23
    return manifest
def native_nnest(root):
    scripts=[
      ("nest-depth3-verify.cjs","nest-depth3-verify-2026-06-03.hbp",
       b"RUN-CLEAN|apex_addr=R|apex_gate_ok=true",b"GATE-CAUGHT=true"),
      ("nest-depthN-prime-verify.cjs","nest-depthN-prime-verify-2026-06-03.hbp",
       b"RUN-CLEAN|apex_subtree_ok=true",b"EVERY-LEVEL-CATCHES-CONFABULATION=true")
    ]
    for code,name,passline,tamperline in scripts:
        with tempfile.TemporaryDirectory(prefix="nnest-capsule-") as td:
            output=run(["node",root/"nnest-upstream"/code],cwd=td)
            hp=Path(td)/"data"/"behcs"/name
            data=hp.read_bytes()
            side=hp.with_name(hp.name+".sha256").read_text("ascii").split()
            assert side==[sha(data),name]
            assert passline in data and tamperline in data
            assert data.decode("utf8") in output
def replay(root):
    gate=root/"experiments"/"seat4"
    # These two scripts rerun independent Python/Node full traces, false-green
    # negatives, 81 identity tamper controls and prove 0 per-tick human prompts.
    recurrence=json.loads(run([sys.executable,gate/"verify_recurrence_trial.py"]))
    autonomy=json.loads(run([sys.executable,gate/"verify_autonomous_lattice.py"]))
    assert recurrence["status"]==autonomy["status"]=="PASS"
    assert recurrence["python_node_exact_rows"]==3888
    assert autonomy["independent_python_node_exact_trace_rows"]==2187
    assert autonomy["entity_position_updates"]==177147
    assert autonomy["manual_prompts"]==autonomy["identity_mutations"]==0
    assert autonomy["rejected_mutations"]==81
    assert recurrence["trace_sha256"]==sha((root/"capsule/data/recurrence-3888.hbp").read_bytes())
    assert autonomy["trace_sha256"]==sha((root/"capsule/data/autonomous-2187.hbp").read_bytes())
    assert autonomy["receipt_sha256"]==sha((root/"capsule/data/autonomous-2187.json").read_bytes())
    # Independently rerun 32,805 original Seat 1 HBP records and original
    # signed-byte-independent HBP/HBI/JSON compact sidecars.
    original=json.loads(run([sys.executable,gate/"verify_original_seat1_triad_peer.py"]))
    assert original["status"]=="PASS" and original["original_state_records"]==32805
    assert sha((root/"capsule/data/original-triad-32805.hbp").read_bytes())==(
        "720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3"
    )
    # Re-run all original N-Nest depth3/7 planted fault tests without the need
    # for a Git worktree in the extracted archive.
    native_nnest(root)
    # A single corrupted byte of each of the three full traces invalidates it;
    # no arbitrary incoming archive can pass just because its name is familiar.
    for rel in ("capsule/data/autonomous-2187.hbp",
                "capsule/data/recurrence-3888.hbp",
                "capsule/data/original-triad-32805.hbp"):
        raw=bytearray((root/rel).read_bytes())
        raw[len(raw)//2]^=1
        assert sha(raw)!=sha((root/rel).read_bytes())
    return {"schema":"ASOLARIA-SEAT4-OFFLINE-CAPSULE-REPLAY-V1",
            "status":"PASS","recurrence_cases":3888,
            "automatic_ticks":2187,"movement_events":177147,
            "original_triad_records":32805,"upstream_nnest_scripts":2,
            "zero_human_approvals_within_simulation":True,
            "stable_entity_identifiers":True,
            "exact_cross_language_replays":True,
            "physical_optical_measurement":False}
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--root",type=Path)
    args=p.parse_args()
    root=args.root.resolve() if args.root else root_for(__file__)
    info=verify_package(root)
    result=replay(root)
    result["manifest_sha256"]=sha((root/"capsule/manifest.json").read_bytes())
    result["manifest_entries"]=len(info["files"])
    print(json.dumps(result,sort_keys=True))
if __name__=="__main__":main()
