#!/usr/bin/env python3
"""Stage audited four-seat N-Nest outputs; optional HF model-repo mirror.

Do not run the older create-only publish_asolaria_to_github_and_huggingface.py
against existing destinations. This script never accepts token CLI arguments,
creates repos, uploads without explicit --publish, or overwrites a preexisting
HF prefix. Remote output must be SHA-256 reread before success is claimed.
"""
import argparse, hashlib, json, os, shutil, sys, urllib.request
from pathlib import Path

HF_REPO="Jessedbrown/asolaria-wasm81-rainbow-audit"
GH_REPO="JesseBrown1980/asolaria-stone-to-moss"
ROOT_PREFIX="experiments/2026-10-15/n-nest-four-seat"
SOURCE_CHALLENGE="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
SEATS=("seat-1","seat-2","seat-3","seat-4")
def digest(b):return hashlib.sha256(b).hexdigest()
def read_json(p):return json.loads(Path(p).read_text())
def github_producing_run(manifest):
    token=os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:raise RuntimeError("GitHub Actions read token is required")
    rid=str(manifest["producing_github_run_id"])
    url="https://api.github.com/repos/"+GH_REPO+"/actions/runs/"+rid
    req=urllib.request.Request(url,headers={
        "Authorization":"Bearer "+token,"Accept":"application/vnd.github+json",
        "X-GitHub-Api-Version":"2022-11-28",
        "User-Agent":"asolaria-nnest-publisher-audit-v1"})
    with urllib.request.urlopen(req,timeout=20) as response:
        run=json.load(response)
    if run.get("conclusion")!="success" or run.get("status")!="completed":
        raise RuntimeError("producing run is not successful and complete")
    sealed_sha=manifest["producing_git_head_sha"]
    reported_sha=run.get("head_sha")
    if sealed_sha != reported_sha:
        # pull_request event: the runner GITHUB_SHA points to the GitHub-created
        # test merge commit. The workflow-run API head_sha is the branch commit.
        # Require that exact branch commit to be a parent of the immutable
        # producer merge commit; no arbitrary SHA mismatch may be waived.
        if run.get("event") != "pull_request":
            raise RuntimeError("unexpected HEAD mismatch for non-PR run")
        commit_url="https://api.github.com/repos/"+GH_REPO+"/git/commits/"+sealed_sha
        merge_req=urllib.request.Request(commit_url,headers={
            "Authorization":"Bearer "+token,
            "Accept":"application/vnd.github+json",
            "X-GitHub-Api-Version":"2022-11-28",
            "User-Agent":"asolaria-nnest-pr-merge-provenance-v1"})
        with urllib.request.urlopen(merge_req,timeout=20) as response:
            merge=json.load(response)
        parents=[p["sha"] for p in merge.get("parents",[])]
        if len(parents)!=2 or reported_sha not in parents or merge.get("sha")!=sealed_sha:
            raise RuntimeError("GitHub PR merge commit cannot be linked to producing branch SHA")
    return {"run_id":rid,"run_attempt":run.get("run_attempt"),
            "head_sha":sealed_sha,"branch_sha":reported_sha,
            "head_semantics":"GITHUB_SHA PR merge commit with verified branch parent"
                             if sealed_sha!=reported_sha else "branch HEAD exact match"}

def stage(inputs,output):
    inputs=Path(inputs);output=Path(output)
    if not inputs.is_dir():raise RuntimeError("missing downloaded GitHub Actions artifact directory")
    if output.exists():raise RuntimeError("refusing to overwrite an existing staging directory")
    m=read_json(inputs/"RECEIPT-MANIFEST.json")
    ref=read_json(inputs/"master-referee.json")
    prism=read_json(inputs/"qprism-reductions-verdict.json")
    if m.get("schema")!="ASOLARIA-NNEST-GITHUB-EVIDENCE-MANIFEST-V1":
        raise RuntimeError("missing validated run-bound source manifest")
    if m.get("status")!="PASS" or ref.get("status")!="PASS" or prism.get("status")!="PASS":
        raise RuntimeError("source failed verification")
    if m.get("original_challenge_source_sha256")!=SOURCE_CHALLENGE:
        raise RuntimeError("source challenge SHA differs")
    if not ref.get("all_four_job_intervals_overlap") or ref.get("cross_seat_wall_clock_overlap_ms",0)<=0:
        raise RuntimeError("four computation windows did not demonstrably overlap")
    if ref.get("rows_verified")!=131220 or ref.get("watcher_cases_verified")!=43740:
        raise RuntimeError("parent/child/watcher counts mismatch")
    if prism.get("exact_2_lane_recoveries")!=1728 or prism.get("sha256_witness_wave_count")!=108:
        raise RuntimeError("Q-PRISM CRT recovery counts mismatch")
    expected=set(m["file_sha256"])
    if len(expected)!=11 or "SHA256SUMS" in expected or "RECEIPT-MANIFEST.json" in expected:
        raise RuntimeError("unexpected required file count")
    sums=(inputs/"SHA256SUMS").read_text()
    true_sums="".join(d+"  "+name+"\n" for name,d in sorted(m["file_sha256"].items()))
    if sums!=true_sums:raise RuntimeError("SHA256SUMS disagreement")
    for name,expected_sha in m["file_sha256"].items():
        path=inputs/name
        if not path.is_file() or digest(path.read_bytes())!=expected_sha:
            raise RuntimeError("missing or corrupted required file: "+name)
    for seat in SEATS:
        rec=read_json(inputs/("nested-"+seat)/(seat+".json"))
        assert rec["github_run_id"]==m["producing_github_run_id"]
        assert rec["canonical_hbp_sha256"]==ref["seat_sha256"][seat]
        assert len(rec["wave_stones"])==27
    producing=github_producing_run(m)
    output.mkdir(parents=True)
    for name in sorted(expected|{"RECEIPT-MANIFEST.json","SHA256SUMS"}):
        target=output/name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(inputs/name,target)
    readme=(
       "# Asolaria N-Nest: four live nested computational seats\n\n"
       "Public GF(2) parent/child/watcher execution on four GitHub-hosted jobs. "
       "This package includes 4 × 32,805 exact mathematical state comparisons, "
       "43,740 grandchild checks, 108 wave seals, four receipts, the master "
       "verdict, bounded Q-PRISM CRT reconstruction controls, and all full HBP data.\n\n"
       "Producer run: https://github.com/"+GH_REPO+"/actions/runs/"+producing["run_id"]+"\n"
       "Source revision: https://github.com/"+GH_REPO+"/commit/"+producing["head_sha"]+"\n"
       "N-Nest, reductions and Q-PRISM lineage is recorded in RECEIPT-MANIFEST.json.\n\n"
       "Proof of real parallel cloud CPU process execution, NOT a provider-backed "
       "four-physical-chassis attestation, a trained neural network or physical "
       "quantum, gravity or faster-than-light communication evidence.\n")
    (output/"README.md").write_text(readme)
    files={p.relative_to(output).as_posix():digest(p.read_bytes())
           for p in output.rglob("*") if p.is_file()}
    (output/"PUBLICATION-SHA256SUMS").write_text(
        "".join(d+"  "+name+"\n" for name,d in sorted(files.items())))
    print("NNEST_HF_STAGING_VERIFIED",json.dumps({
       "producer_run":producing["run_id"],"git_head":producing["head_sha"],
       "file_count":len(files)+1,
       "primary_manifest_sha256":digest((output/"RECEIPT-MANIFEST.json").read_bytes()),
       "destination_type":"model","destination_repo":HF_REPO},sort_keys=True),flush=True)
    return m,producing

def publish(out,m,run,token):
    from huggingface_hub import HfApi,hf_hub_download
    api=HfApi(token=token)
    api.repo_info(HF_REPO,repo_type="model")
    prefix=ROOT_PREFIX+"/"+run["run_id"]
    before=set(api.list_repo_files(HF_REPO,repo_type="model"))
    if any(x.startswith(prefix+"/") for x in before):
        raise RuntimeError("destination prefix already exists; refusing remote overwrite")
    api.upload_folder(repo_id=HF_REPO,repo_type="model",folder_path=str(out),
                      path_in_repo=prefix,
                      commit_message="Deposit immutable N-Nest four-seat producer "+run["run_id"])
    expected={p.relative_to(out).as_posix():digest(p.read_bytes()) for p in out.rglob("*") if p.is_file()}
    after=set(api.list_repo_files(HF_REPO,repo_type="model"))
    for file,sha in expected.items():
        remote=prefix+"/"+file
        if remote not in after:raise RuntimeError("remote file missing: "+file)
        path=hf_hub_download(repo_id=HF_REPO,repo_type="model",filename=remote,
                             token=token,force_download=True)
        if digest(Path(path).read_bytes())!=sha:
            raise RuntimeError("remote SHA256 mismatch: "+file)
    print("NNEST_HF_REMOTE_SHA256_READBACK_VERIFIED",
          "https://huggingface.co/"+HF_REPO+"/tree/main/"+prefix,flush=True)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("downloaded_artifacts",type=Path)
    p.add_argument("staging_output",type=Path)
    p.add_argument("--publish",action="store_true",help="Opt-in protected HF_TOKEN upload + SHA readback")
    args=p.parse_args()
    m,run=stage(args.downloaded_artifacts,args.staging_output)
    if args.publish:
        token=os.environ.get("HF_TOKEN")
        if not token:raise RuntimeError("HF_TOKEN protected Actions secret absent; no upload performed")
        publish(args.staging_output,m,run,token)
    else:
        print("NNEST_HF_UPLOAD_NOT_REQUESTED: publication not claimed")

if __name__=="__main__":
    main()
