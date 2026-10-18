#!/usr/bin/env python3
"""asolaria-augment-citizen-daemon.py — V47-G external citizen.

Service: Augment Code. HEALTH-CHECK ONLY.
PID: AGT-citizen-augment-H02EE-V47G-P03-NV47G783
"""
import json, os, sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SERVICE = "augment"
PORT = 4963
ANCHOR_PID = "AGT-citizen-augment-H02EE-V47G-P03-NV47G783"
WAVE_ANCHOR = "ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23"
LAW_ANCHOR = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"
HILBERT = 783

LEDGER = Path("C:/HyperBEHCS/data/v47-g-external-citizens")
LEDGER.mkdir(parents=True, exist_ok=True)
LOG = LEDGER / f"{SERVICE}-availability.ndjson"


def probe_creds():
    state = {"service": SERVICE, "mode": "HEALTH-CHECK",
             "ts": datetime.now(timezone.utc).isoformat(), "checks": {}}
    env_keys = ["AUGMENT_API_KEY", "AUGMENT_API_TOKEN", "AUGMENT_TOKEN",
                "AUGMENTCODE_API_KEY"]
    state["checks"]["env_present"] = {k: bool(os.environ.get(k)) for k in env_keys}
    cand = [Path.home() / ".augmentcode", Path.home() / ".augment",
            Path("C:/Users/acer/AppData/Roaming/AugmentCode")]
    state["checks"]["config_dirs"] = [{"path": str(p), "exists": p.exists()} for p in cand]
    # VS Code extension presence
    vsx = Path("C:/Users/acer/.vscode/extensions")
    state["checks"]["vscode_augment_extension"] = False
    if vsx.exists():
        try:
            state["checks"]["vscode_augment_extension"] = any(
                "augment" in p.name.lower() for p in vsx.iterdir() if p.is_dir())
        except Exception:
            pass
    any_env = any(state["checks"]["env_present"].values())
    any_dir = any(c["exists"] for c in state["checks"]["config_dirs"])
    state["valid_creds_overall"] = any_env or any_dir
    state["acquisition_path"] = ("ACQUIRE: install Augment Code VS Code extension and "
                                 "sign in, or set AUGMENT_API_KEY env var")
    return state


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a, **k): pass

    def do_GET(self):
        if self.path == "/health":
            snap = probe_creds()
            with LOG.open("a", encoding="utf-8") as f:
                f.write(json.dumps(snap) + "\n")
            body = json.dumps({"ok": True, "service": SERVICE, "port": PORT, "mode": "HEALTH-CHECK",
                               "anchor_pid": ANCHOR_PID, "hilbert": HILBERT,
                               "valid_creds": snap["valid_creds_overall"],
                               "wave_anchor": WAVE_ANCHOR, "law_anchor": LAW_ANCHOR,
                               "fire_authorized": False})
            self.send_response(200); self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body))); self.end_headers()
            self.wfile.write(body.encode())
        else:
            self.send_response(404); self.end_headers()


def main():
    print(f"[{SERVICE}-citizen] HEALTH-CHECK :{PORT} pid={ANCHOR_PID} hilbert={HILBERT}")
    snap = probe_creds()
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"event": "boot", **snap}) + "\n")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
