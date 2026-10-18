#!/usr/bin/env python3
"""V47-G mint script: compute voxel tokens, write final voxels file, append cosign row."""
import hashlib, json, urllib.request, sys
from pathlib import Path
from datetime import datetime, timezone

WAVE = "V47-G"
WAVE_ANCHOR = "ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23"
LAW_ANCHOR = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"

CITIZENS = [
    ("AGT-citizen-google-enterprise-H02EE-V47G-P00-NV47G780", "google-enterprise", 4960, 780),
    ("AGT-citizen-symphony-H02EE-V47G-P01-NV47G781",          "symphony",          4961, 781),
    ("AGT-citizen-linear-H02EE-V47G-P02-NV47G782",            "linear",            4962, 782),
    ("AGT-citizen-augment-H02EE-V47G-P03-NV47G783",           "augment",           4963, 783),
    ("AGT-citizen-auggie-H02EE-V47G-P04-NV47G784",            "auggie",            4964, 784),
]

OUT = Path("C:/HyperBEHCS/store/v47-g-external-citizens-voxels-2026-05-23.txt")
DESC = Path("C:/HyperBEHCS/store/library-50d-descriptors/v47-g-external-citizens.descriptor.json")


def token16(s): return hashlib.sha256(s.encode()).hexdigest()[:16]


def cube_xyz_from_token(tok):
    # Map first 6 hex chars into 3 axes (0..7 each) for an 8^3 cube
    h = int(tok[:6], 16)
    return (h & 7, (h >> 3) & 7, (h >> 6) & 7)


def voxel_rows():
    rows = []
    for pid, svc, port, hil in CITIZENS:
        tok = token16(pid)
        x, y, z = cube_xyz_from_token(tok)
        glyph = (hil * 7) % 1024
        rows.append({
            "pid": pid, "service": svc, "port": port, "hilbert": hil,
            "token": tok, "cube_xyz": [x, y, z], "glyph": glyph,
            "wave": WAVE, "lane": f"external-citizen-{svc}",
            "cube_anchor_47D": "D44_EXTERNAL_CITIZEN",
            "mode": "HEALTH-CHECK", "fire_authorized": False,
        })
    return rows


def write_voxels(rows):
    lines = []
    for r in rows:
        lines.append(
            f"PID-VOXEL|pid={r['pid']}|wave={r['wave']}|cube_anchor_47D={r['cube_anchor_47D']}"
            f"|hilbert={r['hilbert']}|token={r['token']}|cube_xyz=({r['cube_xyz'][0]},{r['cube_xyz'][1]},{r['cube_xyz'][2]})"
            f"|glyph={r['glyph']}|lane={r['lane']}|service={r['service']}|port={r['port']}"
            f"|mode={r['mode']}|fire_authorized={str(r['fire_authorized']).lower()}"
        )
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    sha = hashlib.sha256(OUT.read_bytes()).hexdigest()
    (OUT.parent / (OUT.name + ".sha256")).write_text(sha + "\n")
    return sha


def write_descriptor(rows, voxels_sha, cosign_seq=None, cosign_row_hash=None):
    desc = {
        "schema": "v47-g-external-citizens.descriptor/1",
        "wave": WAVE,
        "pid": "AGT-helm-claude-v47-G-service-keys-farm-H02EE-V47G-P00-NV47G001",
        "anchor": WAVE_ANCHOR,
        "law_anchor": LAW_ANCHOR,
        "operator": "OP-JESSE",
        "ts": datetime.now(timezone.utc).isoformat(),
        "vantage": "acer-192.168.1.50",
        "directive_quote": ("use asolaria profile to have the External keys to symphony and linear and "
                            "Augment And auggie nodes running daemons PID and farm those as well..."),
        "citizens": rows,
        "voxels_file": str(OUT),
        "voxels_sha256": voxels_sha,
        "voxel_count": len(rows),
        "hilbert_range": "780..784",
        "port_range": "4960..4964",
        "discipline": {
            "ask_the_fabric": True,
            "no_destructive_ops": True,
            "no_key_contents_printed": True,
            "metadata_only": True,
            "all_daemons_health_check_mode": True,
            "fire_authorization_required": "explicit operator GO per daemon before any API call",
        },
        "credential_state_summary": {
            "google_enterprise": {
                "user_oauth": "PRESENT (plasmatoid@gmail.com, gcloud auth list active)",
                "adc": "ABSENT (application-default needs setup for SA-style flows)",
                "env_GOOGLE_API_KEY": "PRESENT",
                "env_GEMINI_API_KEY": "PRESENT",
                "project": "winged-complex-390417",
                "fire_ready": True,
            },
            "symphony": {"env": "ABSENT", "config_dir": "ABSENT", "fire_ready": False,
                         "next": "set SYMPHONY_API_TOKEN + SYMPHONY_POD_URL"},
            "linear": {"env_LINEAR_API_KEY": "ABSENT", "mcp_oauth": "AVAILABLE (claude_ai_Linear)",
                       "fire_ready_via_mcp": True, "fire_ready_via_env": False,
                       "next": "set LINEAR_API_KEY for direct daemon API access"},
            "augment": {"env": "ABSENT", "vscode_ext": "absent", "fire_ready": False,
                        "next": "install Augment VS Code ext or set AUGMENT_API_KEY"},
            "auggie": {"env": "ABSENT", "cli_on_path": False, "fire_ready": False,
                       "next": "install auggie CLI and run `auggie login`"},
        },
        "cosign_seq": cosign_seq,
        "cosign_row_hash": cosign_row_hash,
    }
    DESC.parent.mkdir(parents=True, exist_ok=True)
    DESC.write_text(json.dumps(desc, indent=2), encoding="utf-8")
    sha = hashlib.sha256(DESC.read_bytes()).hexdigest()
    (DESC.parent / (DESC.name + ".sha256")).write_text(sha + "\n")
    return desc, sha


def append_cosign(payload):
    body = json.dumps(payload).encode()
    req = urllib.request.Request("http://127.0.0.1:4953/api/cosign/append",
                                  data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


def main():
    rows = voxel_rows()
    voxels_sha = write_voxels(rows)
    desc, desc_sha = write_descriptor(rows, voxels_sha)
    cosign_payload = {
        "wave": WAVE,
        "anchor_pid": WAVE_ANCHOR,
        "law_anchor": LAW_ANCHOR,
        "operator": "OP-JESSE",
        "event": "V47-G-EXTERNAL-CITIZENS-MINTED",
        "voxel_count": len(rows),
        "hilbert_range": "780..784",
        "port_range": "4960..4964",
        "services": [r["service"] for r in rows],
        "voxels_file": str(OUT),
        "voxels_sha256": voxels_sha,
        "descriptor_file": str(DESC),
        "descriptor_sha256": desc_sha,
        "mode_all": "HEALTH-CHECK",
        "fire_authorized_count": 0,
        "fire_authorization_pending": ["per-daemon explicit operator GO"],
    }
    cosign = append_cosign(cosign_payload)
    # Re-write descriptor with cosign seq embedded
    write_descriptor(rows, voxels_sha, cosign.get("seq"), cosign.get("row_hash"))
    print(json.dumps({"voxels_written": len(rows), "voxels_sha": voxels_sha[:16],
                      "descriptor_sha": desc_sha[:16], "cosign": cosign}, indent=2))


if __name__ == "__main__":
    main()
