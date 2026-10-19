#!/usr/bin/env python3
"""Stage or publish checksum-verified Rainbow81 stones to Hugging Face.

The only authorized target is Jessedbrown/asolaria-wasm81-rainbow-audit.
No credential is stored in source control. Publishing requires a repository
Actions secret called HF_TOKEN. Do not supply a token via commits or logs.

Default: local staging/verification with no network or credentials.
Publish: HF_PUBLISH=1 and HF_TOKEN from protected GitHub Actions secret.
"""
from __future__ import annotations
import hashlib
import json
import os
import pathlib
import subprocess
import tempfile

REPO_ID = "Jessedbrown/asolaria-wasm81-rainbow-audit"
PREFIX = "experiments/2026-10-14/rainbow81-github-mirror"
BASE = pathlib.Path(__file__).resolve().parents[1]
STONE_DIR = BASE / "stones" / "2026-10-14-rainbow81"
SOURCE_FILES = (
    "experiments/hash-cascade-81-2026-10-14.py",
    "experiments/test_spatial_hash_27_waves_ci.py",
    "experiments/test_rainbow81_fifth_feature.py",
    "experiments/test_rainbow81_fifth_feature_worstcase.py",
    "experiments/test_rainbow81_adversarial_mixtures.py",
    "experiments/PREREG-fifth-feature-adversarial-waves-2026-10-14.md",
)
REQUIRED_STONES = (
    "RESULTS-INDEX.md",
    "EVALUATION-2026-10-14.md",
    "rainbow81-fifth-feature-results-2026-10-14.json",
    "rainbow81-fifth-feature-worstcase-results-2026-10-14.json",
    "rainbow81-adversarial-2026-10-14-results.json",
    "stone-hash-81-2026-10-14-baseline.hbp",
    "stone-81-spatial-hash-27-waves-2026-10-14.hbp",
    "stone-81-fifth-feature-2026-10-14.hbp",
    "stone-81-fifth-feature-worstcase-2026-10-14.hbp",
    "stone-seat3-adversarial-mixtures-2026-10-14.hbp",
)

def sha256(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()

def stage(root: pathlib.Path) -> dict:
    files = {}
    for rel in SOURCE_FILES:
        source = BASE / rel
        if not source.is_file():
            raise FileNotFoundError(rel)
        files[rel] = source.read_bytes()
    if not STONE_DIR.is_dir():
        raise FileNotFoundError(str(STONE_DIR))
    for name in REQUIRED_STONES:
        if not (STONE_DIR / name).is_file():
            raise FileNotFoundError("Required stone missing: " + name)
    # Include all contemporary stone receipts and SHA companions; never
    # mirror other repository directories or possible local credentials.
    for source in sorted(STONE_DIR.iterdir()):
        if not source.is_file():
            continue
        if source.suffix not in (".hbp", ".hbi", ".md", ".json", ".sha256"):
            continue
        files["stones/2026-10-14-rainbow81/" + source.name] = source.read_bytes()
        if source.suffix == ".sha256":
            base = source.name[:-len(".sha256")]
            partner = STONE_DIR / base
            if not partner.is_file():
                raise ValueError("Orphan SHA256 sidecar: " + source.name)
            chunks = source.read_text(encoding="utf8").strip().split()
            if not chunks or chunks[0].lower() != sha256(partner.read_bytes()):
                raise ValueError("Invalid SHA256 sidecar: " + source.name)
            if len(chunks) > 1 and pathlib.Path(chunks[-1]).name != base:
                raise ValueError("Sidecar filename mismatch: " + source.name)
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=BASE, text=True
    ).strip()
    readme = (
        "# Rainbow81 — GitHub-verified experiment mirror\n\n"
        "Reproducible synthetic CPU control experiments and SHA-256 stones.\n\n"
        "Source: https://github.com/JesseBrown1980/asolaria-stone-to-moss\n\n"
        "This publication does not represent physical optical, quantum, gravity,\n"
        "long-distance signaling or GPU measurements. The uncoloured\n"
        "Brown-Hilbert free centre is distinct from the zero-trit seat 40.\n\n"
        "Only files available in the public GitHub repository are mirrored;\n"
        "the separately described 207-file local archive is not included.\n"
    ).encode()
    files["README.md"] = readme
    manifest = {
        "schema": "RAINBOW81-GITHUB-HF-MIRROR-V1",
        "source_commit": head,
        "source_repository": "JesseBrown1980/asolaria-stone-to-moss",
        "destination": REPO_ID,
        "destination_prefix": PREFIX,
        "evidence_class": "constructed CPU algorithms and receipt files, not physical measurement",
        "files_sha256": {name: sha256(payload) for name, payload in sorted(files.items())},
    }
    for rel, content in files.items():
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    (root / "MANIFEST.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf8"
    )
    return manifest

def main() -> None:
    with tempfile.TemporaryDirectory(prefix="rainbow81-hf-stage-") as temp:
        folder = pathlib.Path(temp)
        manifest = stage(folder)
        summary = {"count": len(manifest["files_sha256"]),
                   "source_commit": manifest["source_commit"],
                   "target": REPO_ID, "prefix": PREFIX}
        print("RAINBOW81_STAGING_PASS", json.dumps(summary, sort_keys=True))
        if os.environ.get("HF_PUBLISH") != "1":
            return
        token = os.environ.get("HF_TOKEN", "")
        if not token:
            raise SystemExit("HF_TOKEN protected GitHub Actions secret is missing: publication not attempted")
        from huggingface_hub import HfApi, hf_hub_download
        api = HfApi(token=token)
        profile = api.whoami()
        if profile.get("name", "").lower() != "jessedbrown":
            raise RuntimeError("Unexpected Hugging Face account; refusing publication")
        api.repo_info(REPO_ID, repo_type="model")
        api.upload_folder(
            folder_path=str(folder), path_in_repo=PREFIX, repo_id=REPO_ID,
            repo_type="model", commit_message="Mirror checksum-audited Rainbow81 stones from GitHub",
        )
        remote = set(api.list_repo_files(REPO_ID, repo_type="model"))
        for path, expected in manifest["files_sha256"].items():
            key = PREFIX + "/" + path
            if key not in remote:
                raise RuntimeError("Missing remotely published file: " + path)
            downloaded = pathlib.Path(hf_hub_download(
                REPO_ID, filename=key, repo_type="model", token=token,
                force_download=True,
            ))
            if sha256(downloaded.read_bytes()) != expected:
                raise RuntimeError("Remote content mismatch: " + path)
        if PREFIX + "/MANIFEST.json" not in remote:
            raise RuntimeError("Remote manifest missing")
        print("RAINBOW81_HF_MIRROR_PUBLISHED_AND_VERIFIED",
              "https://huggingface.co/" + REPO_ID + "/tree/main/" + PREFIX)

if __name__ == "__main__":
    main()
