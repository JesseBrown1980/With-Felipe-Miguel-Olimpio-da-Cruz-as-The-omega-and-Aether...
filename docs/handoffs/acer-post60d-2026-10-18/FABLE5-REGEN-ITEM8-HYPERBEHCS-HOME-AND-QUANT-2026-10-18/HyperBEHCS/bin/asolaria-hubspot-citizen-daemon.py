#!/usr/bin/env python3
# asolaria-hubspot-citizen-daemon.py
# Wave-V47-H HubSpot API citizen daemon — HEALTH-CHECK mode only.
# PID: AGT-helm-claude-v47-H-hubspot-citizen-H02EF-V47H-P00-NV47H001
# Anchor: ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23
# Operator: OP-JESSE apex. "We can also use hubspot API to farm that."
#
# DISCIPLINE:
#   - NEVER prints API key contents (paths + boolean validity only).
#   - Stays in HEALTH-CHECK mode until explicit operator GO for farm operation.
#   - "We can also use hubspot API to farm that" = enumeration directive, not fire directive.
#   - Per project_qdd_*: Natalie + Jesse have HubSpot context for QDD/CHARM workflow.
#   - Per hubspot.hbp catalog row hubspot_oauth_gate: DEFER-TO-APEX per asolaria_mcp_policy.
#
# Hilbert: 790  Forge band  prof PROF-HUBSPOT-CRM-CITIZEN-001

import json, os, sys, time, hashlib, threading, subprocess
from pathlib import Path
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib import request as urlrequest, error as urlerror

PID = "AGT-helm-claude-v47-H-hubspot-citizen-H02EF-V47H-P00-NV47H001"
ANCHOR = "ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23"
HILBERT = 790
BAND = "forge"
PROF = "PROF-HUBSPOT-CRM-CITIZEN-001"
PORT = int(os.environ.get("HUBSPOT_CITIZEN_PORT", "4970"))

LEDGER = Path("C:/HyperBEHCS/data/v47-h-hubspot-citizen-ledger.ndjson")
LEDGER.parent.mkdir(parents=True, exist_ok=True)

# Candidate credential paths — checked for existence ONLY, contents NEVER read for echo.
CRED_CANDIDATE_PATHS = [
    "C:/asolaria-acer/.env",
    "C:/Users/acer/.asolaria/.env",
    "C:/Users/acer/.hubspot",
    "C:/Users/acer/.hubspotrc",
    "C:/Users/acer/hubspot.config.yml",
    "C:/Users/acer/.env",
]
CRED_ENV_KEYS = ["HUBSPOT_API_KEY", "HUBSPOT_TOKEN", "HUBSPOT_PRIVATE_APP_TOKEN", "HAPIKEY"]

STATE = {
    "pid": PID,
    "anchor": ANCHOR,
    "hilbert": HILBERT,
    "band": BAND,
    "prof": PROF,
    "mode": "HEALTH-CHECK",
    "ready_for_farm": False,
    "creds_found": False,
    "creds_source": None,
    "health_check_last": None,
    "health_check_ok": None,
    "started": datetime.now(timezone.utc).isoformat(),
    "operator_go_received": False,
    "qdd_charm_context": "project_qdd-Natalie-Jesse-CHARM-context",
}
STATE_LOCK = threading.Lock()


def ledger_log(event: str, payload: dict) -> None:
    """Append a row to the ledger. NEVER log API key contents."""
    row = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "pid": PID,
        "event": event,
        "payload": payload,
    }
    with LEDGER.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")


def discover_creds() -> tuple[bool, str | None]:
    """Return (found, source_descriptor). Never returns or logs key contents."""
    # 1) Environment variables
    for k in CRED_ENV_KEYS:
        if os.environ.get(k):
            return True, f"env:{k}"
    # 2) Candidate config files (existence + non-empty only)
    for p in CRED_CANDIDATE_PATHS:
        path = Path(p)
        if path.exists() and path.is_file() and path.stat().st_size > 0:
            # Do NOT read contents — just confirm presence.
            return True, f"file:{p}"
    # 3) Windows Credential Manager
    try:
        r = subprocess.run(["cmdkey", "/list"], capture_output=True, text=True, timeout=5)
        if r.returncode == 0 and "hubspot" in r.stdout.lower():
            return True, "cmdkey:hubspot"
    except Exception:
        pass
    return False, None


def hubspot_health_check() -> dict:
    """Probe https://api.hubapi.com/integrations/v1/me with Bearer token IF creds present.
    NEVER prints token. Returns status summary only."""
    found, source = discover_creds()
    with STATE_LOCK:
        STATE["creds_found"] = found
        STATE["creds_source"] = source

    if not found:
        return {"ok": False, "reason": "creds-required-from-operator", "source": None}

    # Token retrieval — held in local scope only, never written to ledger/cosign/stdout.
    token = None
    for k in CRED_ENV_KEYS:
        if os.environ.get(k):
            token = os.environ[k]
            break
    if token is None:
        # File-based: do not auto-parse arbitrary file formats here; defer until canonical schema.
        return {"ok": False, "reason": "file-creds-parser-not-implemented-defer-to-operator", "source": source}

    try:
        req = urlrequest.Request(
            "https://api.hubapi.com/integrations/v1/me",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            method="GET",
        )
        with urlrequest.urlopen(req, timeout=10) as resp:
            status = resp.status
        return {"ok": status == 200, "status": status, "source": source, "endpoint": "integrations/v1/me"}
    except urlerror.HTTPError as e:
        return {"ok": False, "status": e.code, "source": source, "endpoint": "integrations/v1/me"}
    except Exception as e:
        return {"ok": False, "reason": f"network-error:{type(e).__name__}", "source": source}
    finally:
        token = None  # explicit nuke


class StatusHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Silence default access log; we use the structured ledger.
        return

    def _send(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/status"):
            with STATE_LOCK:
                snap = dict(STATE)
            self._send(200, snap)
        elif self.path == "/health":
            result = hubspot_health_check()
            with STATE_LOCK:
                STATE["health_check_last"] = datetime.now(timezone.utc).isoformat()
                STATE["health_check_ok"] = bool(result.get("ok"))
            ledger_log("HEALTH_CHECK", {k: v for k, v in result.items() if k != "token"})
            self._send(200, result)
        elif self.path == "/ready":
            with STATE_LOCK:
                self._send(200, {"ready_for_farm": STATE["ready_for_farm"], "mode": STATE["mode"]})
        else:
            self._send(404, {"ok": False, "error": "unknown route", "path": self.path})

    def do_POST(self):
        # Reserved for future operator GO endpoint — gated, NOT auto-promote.
        self._send(403, {"ok": False, "error": "operator-GO-required-out-of-band", "mode": "HEALTH-CHECK"})


def serve():
    found, source = discover_creds()
    with STATE_LOCK:
        STATE["creds_found"] = found
        STATE["creds_source"] = source
    ledger_log("START", {
        "port": PORT, "mode": "HEALTH-CHECK",
        "creds_found": found, "creds_source": source,
        "ready_for_farm": False,
    })
    httpd = HTTPServer(("127.0.0.1", PORT), StatusHandler)
    print(f"[hubspot-citizen] listening 127.0.0.1:{PORT} mode=HEALTH-CHECK creds_found={found}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        ledger_log("STOP", {"reason": "KeyboardInterrupt"})


if __name__ == "__main__":
    serve()
