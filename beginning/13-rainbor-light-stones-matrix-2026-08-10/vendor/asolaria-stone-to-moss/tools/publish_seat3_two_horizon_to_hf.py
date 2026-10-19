#!/usr/bin/env python3
"""Reproduce, seal and optionally mirror the Seat-3 two-horizon full-state HBP.

Default: credential-free staging. Publishing requires a protected GitHub
Actions HF_TOKEN secret. Never commit/paste tokens into code or logs.
"""
from __future__ import annotations
import hashlib, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
REPO_ID = "Jessedbrown/asolaria-wasm81-rainbow-audit"
PREFIX = "experiments/2026-10-14/seat3-two-horizon-9720"
EXPECTED = "245ab02b30cbdd9215d161c6561adc6a6c3bf72dd3fa2cb62979b2fb74031cef"
PY_SRC = "experiments/seat3/two_horizon_matrix.py"
JS_SRC = "experiments/seat3/two_horizon_polynomial.js"
STONE = "stones/2026-10-14-rainbow81/seat-3-two-horizon-9720-control.json"

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def run(args):
    r = subprocess.run(args, cwd=BASE, capture_output=True, text=True,
                       timeout=120, check=True)
    return json.loads(r.stdout.strip())

def stage(dst):
    files = (PY_SRC, JS_SRC, STONE)
    for relative in files:
        source = BASE / relative
        if not source.is_file():
            raise FileNotFoundError(relative)
        output = dst / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, output)
    stone = json.loads((BASE / STONE).read_text())
    if (stone.get("records_per_language") != 9720 or
        stone.get("output_sha256_python") != EXPECTED or
        stone.get("output_sha256_node") != EXPECTED or
        stone.get("physical_host_independent") is not False or
        stone.get("modeled_horizons") != [10**13, 10**13 + 1]):
        raise ValueError("Pinned stone differs from the expected evidence")
    with tempfile.TemporaryDirectory(prefix="seat3-recalc-") as tmp:
        p, n = Path(tmp) / "python.hbp", Path(tmp) / "node.hbp"
        sp = run([sys.executable, str(BASE / PY_SRC), str(p)])
        sn = run(["node", str(BASE / JS_SRC), str(n)])
        a, b = p.read_bytes(), n.read_bytes()
        if a != b or sha(a) != EXPECTED or sp != sn:
            raise ValueError("Independent solvers disagree with the sealed hash")
        if (sp.get("records") != 9720 or
            sp.get("direct_step_controls") != 120 or
            sp.get("t_to_tplus1_controls") != 9720 or
            sp.get("delta_uniform_per_law_horizon") is not True or
            sp.get("sha256") != EXPECTED):
            raise ValueError("Missing full-state or metamorphic checks")
        result = dst / "results" / "seat3-two-horizon-9720.hbp"
        result.parent.mkdir(parents=True, exist_ok=True)
        result.write_bytes(a)
        (dst / "results" / "summary.json").write_text(
            json.dumps(sp, indent=2, sort_keys=True) + "\n")
    (dst / "README.md").write_text(
        "# Asolaria Seat 3 — Rainbow81 two-horizon reproducibility\n\n"
        "9,720 full 81-bit evolved state records from 12 waves × five local GF(2) "
        "laws × 81 bodies × two horizons (10^13 and 10^13+1 modeled steps).\n\n"
        "The pinned Python matrix and independent Node cyclic-polynomial "
        "solvers agree byte-for-byte. The full HBP file is regenerated and "
        "SHA-256 verified before any upload.\n\n"
        "GitHub stone: https://github.com/JesseBrown1980/asolaria-stone-to-moss/"
        "blob/main/stones/2026-10-14-rainbow81/seat-3-two-horizon-9720-control.json\n"
        "Independent CI: https://github.com/JesseBrown1980/asolaria-stone-to-moss/"
        "actions/runs/38647138816\n\n"
        "**Synthetic CPU computation only.** No independently attested third "
        "physical host, physical light propagation, quantum entanglement, "
        "gravity measurement or faster-than-light communication.\n")
    paths = sorted(p for p in dst.rglob("*") if p.is_file())
    checks = {p.relative_to(dst).as_posix(): sha(p.read_bytes()) for p in paths}
    checktext = "".join(f"{checks[p]}  {p}\n" for p in sorted(checks))
    (dst / "SHA256SUMS").write_text(checktext, encoding="ascii")
    checks["SHA256SUMS"] = sha(checktext.encode())
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=BASE,
                          check=True, capture_output=True, text=True).stdout.strip()
    manifest = {
        "schema": "ASOLARIA-SEAT3-TWO-HORIZON-HF-PUBLICATION-V1",
        "source_repository": "JesseBrown1980/asolaria-stone-to-moss",
        "source_commit": head, "destination_repository": REPO_ID,
        "destination_prefix": PREFIX, "records": 9720,
        "horizons_modeled_steps": [10**13, 10**13+1],
        "full_hbp_sha256": EXPECTED,
        "evidence_class": "synthetic software; physical host separation unverified",
        "files_sha256": checks
    }
    (dst / "MANIFEST.json").write_text(json.dumps(manifest, indent=2, sort_keys=True)+"\n")
    return manifest

def publish(dst, manifest, token):
    from huggingface_hub import HfApi, hf_hub_download
    api = HfApi(token=token)
    if api.whoami().get("name", "").lower() != "jessedbrown":
        raise RuntimeError("HF identity mismatch; refusing to publish")
    api.repo_info(REPO_ID, repo_type="model")
    api.upload_folder(folder_path=str(dst), repo_id=REPO_ID, repo_type="model",
                      path_in_repo=PREFIX,
                      commit_message="Mirror verified Seat 3 9720-record HBP and source")
    names = set(api.list_repo_files(REPO_ID, repo_type="model"))
    for name, digest in manifest["files_sha256"].items():
        remote = PREFIX + "/" + name
        if remote not in names:
            raise RuntimeError("Remote file missing: " + name)
        downloaded = Path(hf_hub_download(repo_id=REPO_ID, filename=remote,
                                          repo_type="model", token=token,
                                          force_download=True))
        if sha(downloaded.read_bytes()) != digest:
            raise RuntimeError("Remote SHA256 mismatch for " + name)
    remote = PREFIX + "/MANIFEST.json"
    if remote not in names:
        raise RuntimeError("Remote manifest missing")
    downloaded = Path(hf_hub_download(repo_id=REPO_ID, filename=remote,
                                      repo_type="model", token=token,
                                      force_download=True))
    if sha(downloaded.read_bytes()) != sha((dst / "MANIFEST.json").read_bytes()):
        raise RuntimeError("Remote manifest mismatch")
    print("SEAT3_HF_REMOTE_PUBLICATION_VERIFIED",
          "https://huggingface.co/" + REPO_ID + "/tree/main/" + PREFIX)

def main():
    with tempfile.TemporaryDirectory(prefix="seat3-hf-staging-") as tmp:
        folder = Path(tmp)
        manifest = stage(folder)
        print("SEAT3_HF_STAGING_PASS",
              json.dumps({"record_count": 9720, "file_count": len(manifest["files_sha256"]),
                          "sha256": EXPECTED, "target": REPO_ID}, sort_keys=True))
        export = os.environ.get("SEAT3_HF_EXPORT_DIR")
        if export:
            shutil.copytree(folder, export)
            print("SEAT3_HF_STAGING_ARTIFACT_EXPORTED", export)
        if os.environ.get("SEAT3_HF_PUBLISH") != "1":
            return
        token = os.environ.get("HF_TOKEN")
        if not token:
            raise SystemExit("Protected HF_TOKEN GitHub Actions secret missing; upload not attempted")
        publish(folder, manifest, token)

if __name__ == "__main__":
    main()
