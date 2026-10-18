#!/usr/bin/env python3
# asolaria-ms-teams-citizen-daemon.py
# V52-D wave — MS_TEAMS_CITIZEN HEALTH-CHECK daemon.
# PID: AGT-vector-ms-teams-citizen-H031B-V48-P00-NCD93A957
# Anchor: ASOLARIA-V52-D-V48-CITIZEN-DAEMONS-BUILT-PID-2026-05-24
# atlas-cp=1076 hilbert=795 supervisor=vector prof=PROF-MS-TEAMS-API-CITIZEN-001
#
# Teams = Graph subset; shares MS_GRAPH AAD auth surface.
# DISCIPLINE: HEALTH-CHECK default. Creds PRESENCE check only. POST gated 403.
import json, os, threading
from pathlib import Path
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

PID = "AGT-vector-ms-teams-citizen-H031B-V48-P00-NCD93A957"
ANCHOR = "ASOLARIA-V52-D-V48-CITIZEN-DAEMONS-BUILT-PID-2026-05-24"
HILBERT = 795
ATLAS_CP = 1076
BAND = "vector"
PROF = "PROF-MS-TEAMS-API-CITIZEN-001"
SERVICE = "ms-teams"
API_BASE = "https://graph.microsoft.com/v1.0/teams"
PORT = int(os.environ.get("MS_TEAMS_CITIZEN_PORT", "4968"))

LEDGER = Path("C:/HyperBEHCS/data/v48-citizens")
LEDGER.mkdir(parents=True, exist_ok=True)
LOG = LEDGER / f"{SERVICE}-availability.ndjson"

CRED_ENV_KEYS = [
    "MS_TEAMS_TOKEN", "MS_GRAPH_TOKEN", "AZURE_AD_TOKEN",
    "AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_CLIENT_SECRET",
]

STATE = {
    "pid": PID, "anchor": ANCHOR, "atlas_cp": ATLAS_CP, "hilbert": HILBERT,
    "band": BAND, "prof": PROF, "service": SERVICE, "api_base": API_BASE,
    "mode": "HEALTH-CHECK", "safety_mode": "LIFTED" if os.environ.get("MS_TEAMS_CITIZEN_GO") == "1" else "ENGAGED",
    "creds_present": False, "creds_sources": [],
    "last_check_ts": None, "started": datetime.now(timezone.utc).isoformat(),
}
STATE_LOCK = threading.Lock()


def ledger_log(event, payload):
    row = {"ts": datetime.now(timezone.utc).isoformat(), "pid": PID, "event": event, "payload": payload}
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")


def probe_creds():
    sources = []
    for k in CRED_ENV_KEYS:
        if os.environ.get(k):
            sources.append(f"env:{k}")
    cand_paths = [
        Path.home() / ".azure" / "credentials",
        Path.home() / ".azure" / "azureProfile.json",
    ]
    for p in cand_paths:
        if p.exists() and p.is_file() and p.stat().st_size > 0:
            sources.append(f"file:{p}")
    return (len(sources) > 0, sources)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a, **k): pass

    def _send(self, status, body):
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/status"):
            with STATE_LOCK:
                self._send(200, dict(STATE))
        elif self.path == "/health":
            present, sources = probe_creds()
            with STATE_LOCK:
                STATE["creds_present"] = present
                STATE["creds_sources"] = sources
                STATE["last_check_ts"] = datetime.now(timezone.utc).isoformat()
                snap = dict(STATE)
            ledger_log("HEALTH_CHECK", {"creds_present": present, "source_count": len(sources)})
            self._send(200, snap)
        else:
            self._send(404, {"ok": False, "error": "unknown route", "path": self.path})

    def do_POST(self):
        if self.path != "/v1/envelope":
            self._send(404, {"ok": False, "error": "unknown route", "path": self.path})
            return
        with STATE_LOCK:
            safety = STATE["safety_mode"]
        if safety != "LIFTED":
            self._send(403, {"ok": False, "error": "operator-GO-required-out-of-band",
                             "mode": "HEALTH-CHECK", "safety_mode": safety,
                             "lift_via": "MS_TEAMS_CITIZEN_GO=1 env + restart"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length else b""
            env = json.loads(raw.decode("utf-8")) if raw else {}
        except Exception as e:
            self._send(400, {"ok": False, "error": "envelope-parse-error", "class": type(e).__name__})
            return
        if env.get("schema") != "FEDENV-v1":
            self._send(422, {"ok": False, "error": "schema-must-be-FEDENV-v1", "got": env.get("schema")})
            return
        ledger_log("ENVELOPE_ACCEPTED_LIFTED", {"corr_id": env.get("corr_id"), "verb": env.get("verb")})
        self._send(202, {"ok": True, "accepted": True, "mode": "LIFTED",
                         "note": "envelope-queued-but-no-api-fire-without-explicit-operator-fire-grant"})


def serve():
    present, sources = probe_creds()
    with STATE_LOCK:
        STATE["creds_present"] = present
        STATE["creds_sources"] = sources
    ledger_log("START", {"port": PORT, "creds_present": present, "source_count": len(sources),
                         "safety_mode": STATE["safety_mode"]})
    httpd = HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"[{SERVICE}-citizen] listening 127.0.0.1:{PORT} mode=HEALTH-CHECK creds_present={present}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        ledger_log("STOP", {"reason": "KeyboardInterrupt"})


if __name__ == "__main__":
    serve()
