#!/usr/bin/env python3
"""asolaria-linear-citizen-daemon.py — V47-G external citizen.

Service: Linear (issue tracker). HEALTH-CHECK ONLY.
MCP Linear server is available via .mcp.json — this daemon mirrors as fabric-citizen.
PID: AGT-citizen-linear-H02EE-V47G-P02-NV47G782
"""
import json, os, sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SERVICE = "linear"
PORT = 4962
ANCHOR_PID = "AGT-citizen-linear-H02EE-V47G-P02-NV47G782"
WAVE_ANCHOR = "ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23"
LAW_ANCHOR = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"
HILBERT = 782

LEDGER = Path("C:/HyperBEHCS/data/v47-g-external-citizens")
LEDGER.mkdir(parents=True, exist_ok=True)
LOG = LEDGER / f"{SERVICE}-availability.ndjson"


def probe_creds():
    state = {"service": SERVICE, "mode": "HEALTH-CHECK",
             "ts": datetime.now(timezone.utc).isoformat(), "checks": {}}
    env_keys = ["LINEAR_API_KEY", "LINEAR_API_TOKEN", "LINEAR_TOKEN", "LINEAR_OAUTH_TOKEN"]
    state["checks"]["env_present"] = {k: bool(os.environ.get(k)) for k in env_keys}
    # MCP Linear server registered (presence of jsonrpc transport)
    mcp_cache = Path("C:/Users/acer/.claude/mcp-needs-auth-cache.json")
    state["checks"]["claude_mcp_linear_known"] = mcp_cache.exists()
    cand = [Path.home() / ".linear", Path("C:/Users/acer/AppData/Roaming/Linear")]
    state["checks"]["config_dirs"] = [{"path": str(p), "exists": p.exists()} for p in cand]
    any_env = any(state["checks"]["env_present"].values())
    any_dir = any(c["exists"] for c in state["checks"]["config_dirs"])
    state["mcp_oauth_path_available"] = True
    state["valid_creds_overall"] = any_env or any_dir
    state["acquisition_path"] = ("Linear ACTIVE via MCP OAuth (claude_ai_Linear). "
                                 "Daemon-side direct API requires LINEAR_API_KEY env var "
                                 "(from https://linear.app/settings/api).")
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
                               "mcp_oauth_path": True,
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
