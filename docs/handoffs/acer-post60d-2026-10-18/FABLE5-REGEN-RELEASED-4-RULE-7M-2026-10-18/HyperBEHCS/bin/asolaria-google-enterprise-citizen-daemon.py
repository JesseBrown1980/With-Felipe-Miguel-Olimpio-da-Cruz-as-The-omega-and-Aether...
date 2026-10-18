#!/usr/bin/env python3
"""asolaria-google-enterprise-citizen-daemon.py — V47-G external citizen.

Service: Google Cloud / Workspace / Gemini API (plasmatoid@gmail.com).
Mode: HEALTH-CHECK ONLY. No API fire until operator GO.
PID: AGT-citizen-google-enterprise-H02EE-V47G-P00-NV47G780
Anchor: ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23
"""
import json, os, sys, hashlib, subprocess, time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SERVICE = "google-enterprise"
PORT = 4960
ANCHOR_PID = "AGT-citizen-google-enterprise-H02EE-V47G-P00-NV47G780"
WAVE_ANCHOR = "ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23"
LAW_ANCHOR = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"
HILBERT = 780

LEDGER = Path("C:/HyperBEHCS/data/v47-g-external-citizens")
LEDGER.mkdir(parents=True, exist_ok=True)
LOG = LEDGER / f"{SERVICE}-availability.ndjson"


def probe_creds():
    """Probe Google credentials WITHOUT printing key contents."""
    state = {
        "service": SERVICE,
        "mode": "HEALTH-CHECK",
        "ts": datetime.now(timezone.utc).isoformat(),
        "checks": {},
    }
    # gcloud auth list (account names only)
    try:
        r = subprocess.run(["gcloud", "auth", "list", "--format=value(account,status)"],
                           capture_output=True, text=True, timeout=10)
        accts = [l.strip() for l in r.stdout.splitlines() if l.strip()]
        state["checks"]["gcloud_accounts"] = {"present": len(accts) > 0, "count": len(accts),
                                              "names": [a.split("\t")[0] for a in accts]}
    except Exception as e:
        state["checks"]["gcloud_accounts"] = {"present": False, "err_class": type(e).__name__}
    # gcloud config
    try:
        r = subprocess.run(["gcloud", "config", "list", "--format=value(core.account,core.project)"],
                           capture_output=True, text=True, timeout=10)
        out = r.stdout.strip().split("\n")
        state["checks"]["gcloud_config"] = {"account_present": bool(out and out[0]),
                                            "project_present": bool(len(out) > 1 and out[1] if len(out) > 1 else False)}
    except Exception as e:
        state["checks"]["gcloud_config"] = {"err_class": type(e).__name__}
    # legacy creds file
    legacy = Path("C:/Users/acer/AppData/Roaming/gcloud/legacy_credentials/plasmatoid@gmail.com/adc.json")
    state["checks"]["legacy_oauth_user_creds"] = {"path": str(legacy), "exists": legacy.exists(),
                                                   "size": legacy.stat().st_size if legacy.exists() else 0}
    # Token mintable (no print)
    try:
        r = subprocess.run(["gcloud", "auth", "print-access-token"],
                           capture_output=True, text=True, timeout=10)
        state["checks"]["user_token_mintable"] = (r.returncode == 0 and len(r.stdout.strip()) > 50)
    except Exception as e:
        state["checks"]["user_token_mintable"] = False
    # ADC for service accounts (separate)
    try:
        r = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                           capture_output=True, text=True, timeout=10)
        state["checks"]["adc_present"] = (r.returncode == 0 and len(r.stdout.strip()) > 50)
    except Exception as e:
        state["checks"]["adc_present"] = False
    # GOOGLE_API_KEY env (presence only)
    state["checks"]["env_google_api_key_present"] = bool(os.environ.get("GOOGLE_API_KEY"))
    state["checks"]["env_gemini_api_key_present"] = bool(os.environ.get("GEMINI_API_KEY"))
    state["valid_creds_overall"] = (state["checks"].get("user_token_mintable", False)
                                    or state["checks"].get("env_google_api_key_present", False))
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
                               "fire_authorized": False,
                               "note": "Waiting for explicit operator GO before any API call."})
            self.send_response(200); self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body))); self.end_headers()
            self.wfile.write(body.encode())
        else:
            self.send_response(404); self.end_headers()


def main():
    print(f"[{SERVICE}-citizen] HEALTH-CHECK mode :{PORT} pid={ANCHOR_PID} hilbert={HILBERT}")
    snap = probe_creds()
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"event": "boot", **snap}) + "\n")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
