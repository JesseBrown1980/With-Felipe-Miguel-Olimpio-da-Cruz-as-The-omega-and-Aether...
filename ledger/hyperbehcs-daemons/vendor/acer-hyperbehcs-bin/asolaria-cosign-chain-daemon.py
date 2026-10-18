"""Asolaria Cosign-Chain Single-Writer Daemon — stops seq collisions per V42-A4/A5 findings.

Round 1+2 of V42 wave produced 4 collision events (seq 250×4, 252×2, 253×3, 254×1)
because parallel agents read prev=N then race-append at N+1. This daemon owns the
chain and serializes all appends.

Authorized by VOTE batch under OP-JESSE apex 2026-05-23 + Foundation v3 LAW.

Endpoints (HTTP :4953):
  POST /api/cosign/append   body=arbitrary cosign row dict (without seq + row_hash)
                            → daemon assigns next seq + computes row_hash + appends
                            → returns {ok, seq, row_hash, antecedents_used}
  GET  /api/cosign/head     → returns {seq, row_hash, ts} of last row
  GET  /api/cosign/range    ?from=N&to=M → returns rows in range
  GET  /health
"""
import json, hashlib, os, threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CHAIN = Path("C:/asolaria-acer/COSIGN_CHAIN.ndjson")
PID_FILE = Path("C:/HyperBEHCS/data/cosign-chain/daemon.pid")
PID_FILE.parent.mkdir(parents=True, exist_ok=True)
PORT = 4953
ANCHOR = "ASOLARIA-COSIGN-CHAIN-SINGLE-WRITER-DAEMON-PID-2026-05-23"
LAW = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"

_lock = threading.Lock()

def now_iso(): return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
def sha16(s): return hashlib.sha256(s.encode() if isinstance(s,str) else s).hexdigest()[:16]

def chain_head():
  """Return (max_seq_across_all_rows, row_hash_of_max). MAX-scan not tail-scan,
  per V42-A4 finding that historical rows have out-of-order seq numbers due to
  parallel race-appends (5+ collision events). MAX(seq) is the safe choice for
  next-seq assignment — guarantees no new collisions even when historical chain
  has dups or gaps."""
  if not CHAIN.exists() or CHAIN.stat().st_size == 0:
    return 0, "0000000000000000"
  max_seq = 0
  max_hash = "0000000000000000"
  with open(CHAIN, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
      try:
        d = json.loads(line)
        s = d.get("seq")
        if isinstance(s, int) and s > max_seq:
          max_seq = s
          max_hash = d.get("row_hash", "0000000000000000")
      except: continue
  return max_seq, max_hash

def append_row(payload_dict):
  """SERIALIZED append — assigns seq, computes row_hash, chains antecedent."""
  with _lock:
    prev_seq, prev_hash = chain_head()
    next_seq = prev_seq + 1
    row = dict(payload_dict)
    row["seq"] = next_seq
    if "antecedents" not in row:
      row["antecedents"] = [prev_hash]
    elif isinstance(row["antecedents"], list) and prev_hash not in row["antecedents"]:
      row["antecedents"] = [prev_hash] + row["antecedents"]
    if "ts" not in row:
      row["ts"] = now_iso()
    if "appended_by_daemon" not in row:
      row["appended_by_daemon"] = ANCHOR
    base = json.dumps({k:v for k,v in row.items() if k != "row_hash"}, sort_keys=True, ensure_ascii=False)
    row["row_hash"] = sha16(base)
    with open(CHAIN, "a", encoding="utf-8") as f:
      f.write(json.dumps(row, ensure_ascii=False) + "\n")
    return next_seq, row["row_hash"], prev_hash

class Handler(BaseHTTPRequestHandler):
  def log_message(self, *a, **k): pass
  def _send(self, code, body):
    payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
    self.send_response(code)
    self.send_header("Content-Type", "application/json")
    self.send_header("Content-Length", str(len(payload)))
    self.end_headers()
    self.wfile.write(payload)
  def _read_body(self):
    n = int(self.headers.get("Content-Length", "0") or "0")
    if not n: return {}
    try: return json.loads(self.rfile.read(n).decode("utf-8"))
    except Exception as e: return {"_parse_error": str(e)}
  def do_GET(self):
    if self.path == "/health":
      seq, rh = chain_head()
      return self._send(200, {"ok": True, "service": "asolaria-cosign-chain-daemon",
                              "port": PORT, "head_seq": seq, "head_row_hash": rh,
                              "anchor_pid": ANCHOR, "law_anchor": LAW, "ts": now_iso()})
    if self.path == "/api/cosign/head":
      seq, rh = chain_head()
      return self._send(200, {"ok": True, "seq": seq, "row_hash": rh, "ts": now_iso()})
    if self.path.startswith("/api/cosign/range"):
      from urllib.parse import urlparse, parse_qs
      q = parse_qs(urlparse(self.path).query)
      try:
        a = int(q.get("from",["1"])[0]); b = int(q.get("to",["999999"])[0])
      except: return self._send(400, {"ok": False, "error": "bad from/to"})
      out = []
      if CHAIN.exists():
        with open(CHAIN, "r", encoding="utf-8") as f:
          for line in f:
            try:
              d = json.loads(line)
              s = d.get("seq")
              if isinstance(s, int) and a <= s <= b:
                out.append(d)
            except: pass
      return self._send(200, {"ok": True, "from": a, "to": b, "count": len(out), "rows": out})
    return self._send(404, {"ok": False, "error": "unknown route", "path": self.path})
  def do_POST(self):
    if self.path == "/api/cosign/append":
      body = self._read_body()
      if "_parse_error" in body:
        return self._send(400, {"ok": False, "error": "parse", "detail": body["_parse_error"]})
      try:
        seq, rh, prev = append_row(body)
        return self._send(200, {"ok": True, "seq": seq, "row_hash": rh, "antecedent_prev": prev})
      except Exception as e:
        return self._send(500, {"ok": False, "error": "append-failed", "detail": str(e)})
    return self._send(404, {"ok": False, "error": "unknown route", "path": self.path})

def main():
  PID_FILE.write_text(str(os.getpid()), encoding="utf-8")
  srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
  s, _ = chain_head()
  print(f"[asolaria-cosign-chain-daemon] :{PORT} | head_seq={s} | anchor={ANCHOR}", flush=True)
  srv.serve_forever()

if __name__ == "__main__":
  main()
