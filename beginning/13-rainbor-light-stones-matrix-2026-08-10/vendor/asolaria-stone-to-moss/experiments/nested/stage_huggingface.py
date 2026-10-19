#!/usr/bin/env python3
"""Stage, verify and optionally upload N-Nest four-seat public evidence to HF Hub.

No secrets on disk. Exact run-bound checksum and authoritative watcher gates.
Usage:
    python experiments/nested/stage_huggingface.py STONES_ROOT STAGING_DIR
    python experiments/nested/stage_huggingface.py --publish-only STAGING_DIR
The upload uses ordinary Hugging Face Hub APIs and protected environment HF_TOKEN.
"""
import argparse, hashlib, json, os, shutil, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DEST="Jessedbrown/asolaria-wasm81-rainbow-audit"
PREFIX="experiments/2026-10-15/nnest-four-seat-live-v1"
SEATS=("seat-1","seat-2","seat-3","seat-4")
RAW_ARTIFACTS=("master-referee.json","qprism-reductions-verdict.json",
               "qprism-wave-seals.hbi","RECEIPT-MANIFEST.json","SHA256SUMS")
SOURCE_PATHS=(
 "experiments/nested/PREREG-FOUR-SEAT-NESTED-20261015.md",
 "experiments/nested/parent_matrix.py",
 "experiments/nested/child_poly.js",
 "experiments/nested/watcher.py",
 "experiments/nested/master_verify.py",
 "experiments/nested/qprism_reductions_gate.py",
 "experiments/nested/evidence_manifest.py",
 "experiments/nested/stage_huggingface.py",
 "experiments/seat1/TRIAD-27-CHALLENGE-20261014.json",
)
def sha(data):return hashlib.sha256(data).hexdigest()
def copy(src,dst):
    assert src.is_file(), "required file missing: "+str(src)
    dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(src,dst)
def safe_relpath(s):
    p=Path(s)
    assert not p.is_absolute() and ".." not in p.parts and str(p)!="."
    return p
def verify_staging(staging):
    staging=Path(staging)
    manifest=json.loads((staging/"RELEASE-MANIFEST.json").read_text())
    assert manifest["schema"]=="ASOLARIA-NNEST-HF-RELEASE-V1"
    assert manifest["destination"]==DEST
    assert manifest["prefix"]==PREFIX+"/"+str(manifest["producing_github_run_id"])
    for name,digest in manifest["file_sha256"].items():
        f=staging/safe_relpath(name)
        assert f.is_file(), "missing release evidence: "+name
        assert sha(f.read_bytes())==digest, "release SHA mismatch: "+name
    assert len(manifest["seat_result_sha256"])==4
    for seat in SEATS:
        path=staging/"evidence"/("nested-"+seat)/(seat+".hbp")
        assert sha(path.read_bytes())==manifest["seat_result_sha256"][seat]
    return manifest
def stage(source,target):
    source=Path(source);target=Path(target)
    assert not target.exists() or not any(target.iterdir()), "stage target must be empty"
    target.mkdir(parents=True,exist_ok=True)
    manifest=json.loads((source/"RECEIPT-MANIFEST.json").read_text())
    master=json.loads((source/"master-referee.json").read_text())
    prism=json.loads((source/"qprism-reductions-verdict.json").read_text())
    assert manifest["schema"]=="ASOLARIA-NNEST-GITHUB-EVIDENCE-MANIFEST-V1"
    assert manifest["status"]==master["status"]==prism["status"]=="PASS"
    assert manifest["execution"]["four_runner_math_windows_overlap"] is True
    assert manifest["execution"]["total_parent_child_rows"]==131220
    assert manifest["execution"]["total_grandchild_watcher_checks"]==43740
    assert master["verified_seats"]==4 and master["all_108_wave_stones_verified"] is True
    assert prism["exact_2_lane_recoveries"]==1728
    source_sums={}
    for line in (source/"SHA256SUMS").read_text("ascii").splitlines():
        digest,name=line.split("  ",1)
        assert name not in source_sums
        source_sums[name]=digest
    assert source_sums==manifest["file_sha256"], "run manifest differs from SHA256SUMS"
    for name,digest in source_sums.items():
        rel=safe_relpath(name)
        inp=source/rel
        assert sha(inp.read_bytes())==digest, "source corruption "+name
        copy(inp,target/"evidence"/rel)
    for name in RAW_ARTIFACTS:
        copy(source/name,target/"evidence"/name)
    for name in SOURCE_PATHS:
        copy(ROOT/name,target/"source"/name)
    (target/"README.md").write_text(
        "# Asolaria N-Nest: four-seat concurrent nested GF(2) verification\n\n"
        "This release contains actual GitHub-hosted process computation. Each of "
        "four seat jobs runs a live Python matrix parent, a separate Node.js "
        "polynomial child, and a Python direct-step watcher grandchild. "
        "Every child's report must match independently recomputed truth; "
        "failure at any descendant propagates to the master gate.\n\n"
        "Four seats × 27 waves × 81 bodies × five laws × three digital horizons "
        "= 131,220 full-state records and 43,740 direct-step watcher checks. "
        "All 108 wave SHA seals and the Q-PRISM source-bound CRT projections are "
        "validated against the complete recorded original payloads. "
        "Real job overlap is reported in master-referee.json; server-chassis "
        "identities are not attested.\n\n"
        "Source: https://github.com/JesseBrown1980/asolaria-stone-to-moss\n"
        "N-Nest design: https://github.com/JesseBrown1980/"
        "N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED\n"
        "Review PR #28 for the preregistration, source and CI.\n\n"
        "This is deterministic classical digital computation. It does not "
        "demonstrate actual neural-network training, four distinct physical "
        "chassis, quantum behavior or faster-than-light information transfer.\n",
        encoding="utf8")
    paths=sorted(x for x in target.rglob("*") if x.is_file())
    sums={str(x.relative_to(target)):sha(x.read_bytes()) for x in paths}
    release={
        "schema":"ASOLARIA-NNEST-HF-RELEASE-V1","destination":DEST,
        "prefix":PREFIX+"/"+str(manifest["producing_github_run_id"]),
        "producing_github_run_id":manifest["producing_github_run_id"],
        "producing_git_head_sha":manifest["producing_git_head_sha"],
        "source_repositories":manifest["source_lineage"],
        "job_overlap_ms":master["cross_seat_wall_clock_overlap_ms"],
        "verification":"All four N-Nest seats and QPRISM projection passed",
        "seat_result_sha256":master["seat_sha256"],"wave_stones":108,
        "case_rows":131220,"watcher_cases":43740,
        "chassis_attested":False,"neural_training_claimed":False,
        "file_sha256":sums}
    (target/"RELEASE-MANIFEST.json").write_text(json.dumps(release,sort_keys=True,indent=2)+"\n")
    (target/"RELEASE-SHA256SUMS").write_text(
        "".join(f"{digest}  {name}\n" for name,digest in sorted(sums.items())),encoding="ascii")
    verify_staging(target)
    print("NNEST_HF_STAGING_PASS",json.dumps({"file_count":len(sums),"github_run_id":manifest["producing_github_run_id"],
        "release_manifest_sha256":sha((target/"RELEASE-MANIFEST.json").read_bytes())},sort_keys=True))
def publish(staging):
    staging=Path(staging)
    manifest=verify_staging(staging)
    token=os.environ.get("HF_TOKEN")
    if not token:raise RuntimeError("HF_TOKEN GitHub secret missing; remote upload NOT performed")
    from huggingface_hub import HfApi,hf_hub_download
    api=HfApi(token=token)
    who=api.whoami()
    assert str(who.get("name","")).lower()=="jessedbrown", "HF account mismatch; upload rejected"
    api.repo_info(DEST,repo_type="model")
    remote_prefix=manifest["prefix"]
    original=set(api.list_repo_files(DEST,repo_type="model"))
    if any(name.startswith(remote_prefix+"/") for name in original):
        raise RuntimeError("HF destination prefix already exists; refuse overwrite")
    api.upload_folder(repo_id=DEST,repo_type="model",folder_path=str(staging),
                      path_in_repo=remote_prefix,commit_message="Mirror SHA-verified N-Nest four-seat nested proofs")
    names=set(api.list_repo_files(DEST,repo_type="model"))
    expected={*manifest["file_sha256"],"RELEASE-MANIFEST.json","RELEASE-SHA256SUMS"}
    for name in sorted(expected):
        remote=remote_prefix+"/"+name
        assert remote in names, "HF uploaded file not visible: "+name
        f=Path(hf_hub_download(repo_id=DEST,filename=remote,repo_type="model",
                               token=token,force_download=True))
        assert sha(f.read_bytes())==sha((staging/name).read_bytes()), "HF readback SHA mismatch: "+name
    print("NNEST_HF_REMOTE_PUBLISHED_AND_READBACK_VERIFIED",
          "https://huggingface.co/"+DEST+"/tree/main/"+remote_prefix)
def main():
    p=argparse.ArgumentParser()
    p.add_argument("paths",nargs="+")
    p.add_argument("--publish-only",action="store_true")
    a=p.parse_args()
    if a.publish_only:
        if len(a.paths)!=1: p.error("publish-only takes STAGING_DIR")
        publish(a.paths[0])
    else:
        if len(a.paths)!=2: p.error("staging takes SOURCE_ROOT STAGING_DIR")
        stage(*a.paths)
if __name__=="__main__":main()
