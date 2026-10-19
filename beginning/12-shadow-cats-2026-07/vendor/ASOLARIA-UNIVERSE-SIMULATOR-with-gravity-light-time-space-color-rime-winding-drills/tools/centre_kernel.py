#!/usr/bin/env python3
"""centre_kernel.py -- a translucent HTTP 0-space sitting BETWEEN the star kernels.

THE 0 IS THE INFINITE CONDUIT. It is not a store. It holds nothing of its own: the buffer
starts at zero, and what it actually keeps on disk is only the NON-ZERO part -- the same
hole-map discipline as .rime. A conduit with nothing in it costs nothing.

  POST /feed   a chain pushes its vector in
  GET  /pulse  the centre broadcasts the SAME value back out, omnidirectionally
  POST /photon inject one minimal quantum into the pipe
  GET  /cost   how many bytes the conduit is actually holding
"""
import json, sys, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DIM = int(sys.argv[2]) if len(sys.argv) > 2 else 16
LOCK = threading.Lock()
STATE = {"c": [0.0]*DIM, "feeds": 0, "photons": 0}


def nonzero_bytes(v):
    """what the 0-space actually costs: only the non-zero cells are stored."""
    return sum(8 for x in v if x != 0.0)


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, obj):
        b = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        with LOCK:
            if self.path.startswith("/pulse"):
                self._send({"c": STATE["c"], "feeds": STATE["feeds"]})
            elif self.path.startswith("/cost"):
                self._send({"held_bytes": nonzero_bytes(STATE["c"]),
                            "dim": DIM, "feeds": STATE["feeds"],
                            "photons": STATE["photons"]})
            elif self.path.startswith("/zero"):
                STATE["c"] = [0.0]*DIM
                STATE["feeds"] = 0
                self._send({"zeroed": True, "held_bytes": 0})
            else:
                self._send({"ok": True})

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        d = json.loads(self.rfile.read(n) or b"{}")
        with LOCK:
            if self.path.startswith("/feed"):
                v = d.get("v", [])
                for i in range(min(DIM, len(v))):
                    STATE["c"][i] += float(v[i])
                STATE["feeds"] += 1
                self._send({"feeds": STATE["feeds"]})
            elif self.path.startswith("/photon"):
                # ONE photon. one minimal quantum, one cell of the conduit.
                i = int(d.get("i", 0)) % DIM
                STATE["c"][i] += float(d.get("e", 1.0))
                STATE["photons"] += 1
                self._send({"photons": STATE["photons"],
                            "held_bytes": nonzero_bytes(STATE["c"])})
            else:
                self._send({"ok": True})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8740
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
