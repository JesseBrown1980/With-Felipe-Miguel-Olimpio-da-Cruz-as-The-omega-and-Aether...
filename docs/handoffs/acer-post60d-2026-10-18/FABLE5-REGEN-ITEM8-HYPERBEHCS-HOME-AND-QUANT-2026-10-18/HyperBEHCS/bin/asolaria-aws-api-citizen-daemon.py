#!/usr/bin/env python3
# asolaria-aws-api-citizen-daemon.py
# V52-D wave — AWS_API_CITIZEN HEALTH-CHECK daemon.
# PID: AGT-helm-aws-api-citizen-H031A-V48-P00-N3D2992BD
# Anchor: ASOLARIA-V52-D-V48-CITIZEN-DAEMONS-BUILT-PID-2026-05-24
# atlas-cp=1071 hilbert=794 supervisor=helm prof=PROF-AWS-API-CITIZEN-001
#
# DISCIPLINE: HEALTH-CHECK default. Creds PRESENCE check only. POST gated 403.
# AWS uses SigV4; multi-service base (sts/s3/ec2/etc). Daemon does NOT mint signatures.
import json, os, threading
from pathlib import Path
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

PID = "AGT-helm-aws-api-citizen-H031A-V48-P00-N3D2992BD"
ANCHOR = "ASOLARIA-V52-D-V48-CITIZEN-DAEMONS-BUILT-PID-2026-05-24"
HILBERT = 794
ATLAS_CP = 1071
BAND = "helm"
PROF = "PROF-AWS-API-CITIZEN-001"
SERVICE = "aws-api"
API_BASE = "multi-service:sts.amazonaws.com,s3.amazonaws.com,ec2.amazonaws.com,lambda.<region>.amazonaws.com"
PORT = int(os.environ.get("AWS_API_CITIZEN_PORT", "4967"))

LEDGER = Path("C:/HyperBEHCS/data/v48-citizens")
LEDGER.mkdir(parents=True, exist_ok=True)
LOG = LEDGER / f"{SERVICE}-availability.ndjson"

CRED_ENV_KEYS = [
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
    "AWS_PROFILE", "AWS_REGION", "AWS_DEFAULT_REGION",
]

STATE = {
    "pid": PID, "anchor": ANCHOR, "atlas_cp": ATLAS_CP, "hilbert": HILBERT,
    "band": BAND, "prof": PROF, "service": SERVICE, "api_base": API_BASE,
    "mode": "HEALTH-CHECK", "safety_mode": "LIFTED" if os.environ.get("AWS_API_CITIZEN_GO") == "1" else "ENGAGED",
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
        Path.home() / ".aws" / "credentials",
        Path.home() / ".aws" / "config",
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
                             "lift_via": "AWS_API_CITIZEN_GO=1 env + restart"})
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
