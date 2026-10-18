#!/usr/bin/env python3
# asolaria-omniquant-engine-daemon-stub.py
# V42-B6 OMNIQUANT_ENGINE service-shim — exposes the existing planes/quant.mjs
# selfTest + quantPipeAll via a tiny stdlib HTTP service on :4956 (no extra deps).
# PID: AGT-forge-omni-runtime-gap-closer-H02DB-V42B6-P00-NRUNGAP01
import json, os, subprocess, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("OMNIQUANT_PORT", "4956"))
NODE = os.environ.get("NODE_BIN", "node")
PLANE = r"C:\asolaria-acer\packages\revolver-10k\src\planes\quant.mjs"

def run_node(snippet):
    cmd = [NODE, "--input-type=module", "-e",
           f"import * as q from '{PLANE.replace(chr(92), '/')}'; {snippet}"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return r.stdout.strip(), r.returncode
    except Exception as e:
        return f"err: {e}", 1

class H(BaseHTTPRequestHandler):
    def _send(self, code, body):
        b = body.encode("utf-8")
        self.send_response(code); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def log_message(self, fmt, *args): pass
    def do_GET(self):
        if self.path == "/health":
            return self._send(200, json.dumps({"ok": True, "primitive": "OMNIQUANT_ENGINE"}))
        if self.path == "/selftest":
            out, rc = run_node("const r=q.selfTest(); console.log(JSON.stringify(r));")
            return self._send(200 if rc == 0 else 500, out or "{}")
        if self.path == "/state":
            out, rc = run_node("console.log(JSON.stringify(q.state()));")
            return self._send(200 if rc == 0 else 500, out or "{}")
        return self._send(404, json.dumps({"error": "not_found"}))

if __name__ == "__main__":
    print(f"[omniquant-stub] :{PORT} plane={PLANE}")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
