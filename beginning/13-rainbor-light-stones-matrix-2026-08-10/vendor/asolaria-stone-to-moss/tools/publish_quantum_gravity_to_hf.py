#!/usr/bin/env python3
"""Publish checksum-verified QG81 computational receipts to Hugging Face.

Requires a GitHub Actions HF_TOKEN repository secret with permission to write
to the user's HF repositories. Never put credentials in git, stdout or stones.
Does not claim to have been run unless GitHub Actions reports success.
"""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import tempfile
from huggingface_hub import HfApi, hf_hub_download

OWNER = "Jessedbrown"
DESTS = (
    "Jessedbrown/asolaria-wasm81-rainbow-audit",
    "Jessedbrown/tests",
)
PREFIX = "experiments/2026-10-14/quantum-gravity-81"
BASE = pathlib.Path(__file__).resolve().parents[1]
STONE = BASE / "stones" / "2026-10-14-rainbow81"
NAMES = (
    "quantum-gravity-81-compact-receipt.json",
    "quantum-gravity-81-full-CI-result.json",
    "stone-seat3-81-quantum-gravity-2026-10-14.hbi",
    "stone-seat3-81-quantum-gravity-2026-10-14.hbp",
)
CODE = (
    "experiments/PREREG-81-quantum-gravity-gates-2026-10-14.md",
    "experiments/EVALUATION-81-QUANTUM-GRAVITY-2026-10-14.md",
    "experiments/test_81_quantum_gravity_controls.py",
    "tools/seal_quantum_gravity_81.py",
)
RESULT_HASH = "f3c634d62c8ebb634aa6fbd04503f94c2bee3cc1269880a6b69b4db896234dd0"

def digest(b):
    return hashlib.sha256(b).hexdigest()

def guard():
    token = os.environ.get("HF_TOKEN", "")
    if not token:
        raise SystemExit("HF_TOKEN repository secret missing; no Hugging Face files were uploaded.")
    # Avoid printing the token, even in error output.
    return token

def build(folder):
    manifest = {"schema": "ASOLARIA-QG81-HF-MIRROR-MANIFEST-V1",
                "date": "2026-10-14",
                "source_repo": "JesseBrown1980/asolaria-stone-to-moss",
                "source_commit": subprocess.check_output(
                    ["git", "rev-parse", "HEAD"], cwd=BASE, text=True).strip(),
                "original_ci": "https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38589387275",
                "stone_ci": "https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38590501127",
                "evidence_class": "synthetic classical CPU computations; no physical quantum or gravitational observation",
                "files_sha256": {}}
    for name in NAMES:
        src = STONE / name
        if not src.is_file():
            raise RuntimeError("Missing sealed artifact " + name)
        blob = src.read_bytes()
        expected_line = (STONE / (name+".sha256")).read_text(encoding="ascii").strip().split()
        if len(expected_line) < 2 or expected_line[0] != digest(blob) or expected_line[1] != name:
            raise RuntimeError("Checksum verification failed for " + name)
        dst = pathlib.Path(folder) / "stones" / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(blob)
        sidecar = pathlib.Path(folder) / "stones" / (name+".sha256")
        sidecar.write_bytes((STONE / (name+".sha256")).read_bytes())
        manifest["files_sha256"]["stones/"+name] = digest(blob)
        manifest["files_sha256"]["stones/"+name+".sha256"] = digest(sidecar.read_bytes())
    for name in CODE:
        blob = (BASE/name).read_bytes()
        dst = pathlib.Path(folder)/name
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(blob)
        manifest["files_sha256"][name] = digest(blob)
    if manifest["files_sha256"]["stones/quantum-gravity-81-full-CI-result.json"] != RESULT_HASH:
        raise RuntimeError("CI checksum does not match independently verified run")
    readme = (
        "# Asolaria QG81 — reproducible computational control experiments\n\n"
        "81 simulated bodies; nine local-hidden-variable CHSH waves, nine 81-party\n"
        "restricted GHZ sample waves, and nine spatial scaling controls.\n"
        "Python 3.11 and 3.13 CI outputs were byte-identical.\n\n"
        "**No real optical, gravity, brain, GPU or quantum-hardware observations.**\n"
        "The singlet law and Newton-style force were programmed comparison controls.\n\n"
        "Source: https://github.com/JesseBrown1980/asolaria-stone-to-moss\n"
        "Audit: https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38589387275\n"
        "SHA-256 checksums and full JSON receipts included.\n"
    ).encode()
    (pathlib.Path(folder)/"README.md").write_bytes(readme)
    manifest["files_sha256"]["README.md"] = digest(readme)
    raw = (json.dumps(manifest, sort_keys=True, indent=2)+"\n").encode()
    (pathlib.Path(folder)/"MANIFEST.json").write_bytes(raw)
    return manifest

def main():
    if os.environ.get("HF_PUBLISH_DRY_RUN") == "1":
        with tempfile.TemporaryDirectory(prefix="asolaria-hf-stage-audit-") as tmp:
            manifest = build(tmp)
            print("STAGING_INTEGRITY_PASS",
                  json.dumps({"file_count": len(manifest["files_sha256"]),
                              "destinations": DESTS,
                              "archive_prefix": PREFIX}))
        return
    token = guard()
    api = HfApi(token=token)
    account = api.whoami().get("name", "")
    if account.lower() != OWNER.lower():
        raise RuntimeError("Hugging Face account mismatch; publication halted")
    with tempfile.TemporaryDirectory(prefix="asolaria-hf-stage-") as tmp:
        manifest = build(tmp)
        for repo in DESTS:
            print("Target:", repo)
            api.create_repo(repo_id=repo, repo_type="model", private=False, exist_ok=True)
            api.upload_folder(
                folder_path=tmp,
                path_in_repo=PREFIX,
                repo_id=repo,
                repo_type="model",
                commit_message="Publish QG81 computational-control stones with CI receipts",
            )
            listed = set(api.list_repo_files(repo, repo_type="model"))
            for name, expected in manifest["files_sha256"].items():
                remote = PREFIX+"/"+name
                if remote not in listed:
                    raise RuntimeError("Remote repository missing "+remote)
                remote_path = hf_hub_download(repo_id=repo, filename=remote,
                                               repo_type="model", token=token,
                                               force_download=True)
                if digest(pathlib.Path(remote_path).read_bytes()) != expected:
                    raise RuntimeError("Remote SHA-256 mismatch "+remote)
            if PREFIX+"/MANIFEST.json" not in listed:
                raise RuntimeError("Remote publication manifest missing")
            print("VERIFIED:", "https://huggingface.co/"+repo+"/tree/main/"+PREFIX)
        print("PUBLISHED_AND_VERIFIED_TWO_HUGGING_FACE_REPOSITORIES")

if __name__=="__main__":
    main()
