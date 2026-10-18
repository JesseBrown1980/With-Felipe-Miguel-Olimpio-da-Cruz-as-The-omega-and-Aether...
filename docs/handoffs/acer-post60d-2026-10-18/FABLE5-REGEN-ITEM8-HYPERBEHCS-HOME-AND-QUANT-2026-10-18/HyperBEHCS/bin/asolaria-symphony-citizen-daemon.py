#!/usr/bin/env python3
"""asolaria-symphony-citizen-daemon.py — V47-G external citizen.

Service: Symphony (workspace ops). HEALTH-CHECK ONLY.
PID: AGT-citizen-symphony-H02EE-V47G-P01-NV47G781
"""
import json, os, sys, hashlib, time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SERVICE = "symphony"
PORT = 4961
ANCHOR_PID = "AGT-citizen-symphony-H02EE-V47G-P01-NV47G781"
WAVE_ANCHOR = "ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23"
LAW_ANCHOR = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"
HILBERT = 781

LEDGER = Path("C:/HyperBEHCS/data/v47-g-external-citizens")
LEDGER.mkdir(parents=True, exist_ok=True)
LOG = LEDGER / f"{SERVICE}-availability.ndjson"


def probe_creds():
    """Probe Symphony credentials — metadata only."""
    state = {"service": SERVICE, "mode": "HEALTH-CHECK",
             "ts": datetime.now(timezone.utc).isoformat(), "checks": {}}
    # Env vars (Symphony often uses SYMPHONY_API_TOKEN / SYMPHONY_BOT_USERNAME)
    env_keys = ["SYMPHONY_API_TOKEN", "SYMPHONY_BOT_USERNAME", "SYMPHONY_POD_URL",
                "SYMPHONY_PRIVATE_KEY", "SYMPHONY_USER_ID"]
    state["checks"]["env_present"] = {k: bool(os.environ.get(k)) for k in env_keys}
    # Common config paths (metadata only)
    candidates = [Path.home() / ".symphony", Path("C:/Users/acer/.config/symphony"),
                  Path("C:/Users/acer/AppData/Roaming/Symphony")]
    state["checks"]["config_dirs"] = [{"path": str(p), "exists": p.exists()} for p in candidates]
    any_env = any(state["checks"]["env_present"].values())
    any_dir = any(c["exists"] for c in state["checks"]["config_dirs"])
    state["valid_creds_overall"] = any_env or any_dir
    state["acquisition_path"] = ("ACQUIRE: set SYMPHONY_API_TOKEN + SYMPHONY_POD_URL env vars, "
                                 "or place service config in ~/.symphony/")
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
