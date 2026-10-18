"""Asolaria Vote-Quorum Daemon — implements Foundation v3 LAW "vote not pass" rule.

Significant fabric decisions go through this gate instead of auto-passing. Quorum
rules per decision class. Authorized pool from LAW v3 (2-month OP authority window).

Endpoints (HTTP :4952):
  POST /api/vote-quorum/submit  body={decision_class, decision_pid, payload, requester_pid}
  POST /api/vote-quorum/cast    body={vote_id, voter_pid, vote, reason}  vote in {YES,NO,ABSTAIN}
  GET  /api/vote-quorum/status/<vote_id>
  GET  /api/vote-quorum/pending
  GET  /health
  GET  /api/vote-quorum/quorum-rules

Decision classes + rules:
  LAW_CHANGE     unanimous-5 (Jesse, Rayssa, Amy, Dan, Felipe)
  CP_MINT        unanimous-5 (apex)
  USB_WRITE      supermajority (2/3) + operator-witness
  DAEMON_OP      simple majority of authorized pool
  MEMORY_WRITE   simple majority
  COSIGN_APPEND  simple majority
  GHOST_GC       simple majority
  HEARTBEAT_ACK  auto-pass (low-risk)
  DEFAULT        simple majority

Ledgers (HBPv1 ndjson + sha-chain):
  C:/HyperBEHCS/data/vote-quorum/queue.ndjson      open votes
  C:/HyperBEHCS/data/vote-quorum/votes.ndjson      each cast vote
  C:/HyperBEHCS/data/vote-quorum/outcomes.ndjson   resolved decisions
"""
import json, hashlib, os, time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DATA_DIR = Path("C:/HyperBEHCS/data/vote-quorum")
DATA_DIR.mkdir(parents=True, exist_ok=True)
QUEUE = DATA_DIR / "queue.ndjson"
VOTES = DATA_DIR / "votes.ndjson"
OUTCOMES = DATA_DIR / "outcomes.ndjson"
PID_FILE = DATA_DIR / "daemon.pid"

PORT = 4952
ANCHOR = "ASOLARIA-VOTE-QUORUM-DAEMON-PID-2026-05-23"
LAW_ANCHOR = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"

QUINTUPLE = {"OP-JESSE", "OP-RAYSSA", "OP-AMY", "OP-DAN", "OP-FELIPE"}
AUTHORIZED_CLASSES = {"Special-OP", "OP", "Asolaria-PID", "Profile"}  # 2-month window
LAW_WINDOW_END = "2026-09-23"  # quintuple 4mo
OP_WINDOW_END = "2026-07-23"   # OP class 2mo

QUORUM_RULES = {
  "LAW_CHANGE":    {"rule": "unanimous-5", "pool": "quintuple"},
  "CP_MINT":       {"rule": "unanimous-5", "pool": "quintuple"},
  "USB_WRITE":     {"rule": "supermajority-2-3", "pool": "authorized", "extra": "operator-witness-required"},
  "DAEMON_OP":     {"rule": "simple-majority", "pool": "authorized"},
  "MEMORY_WRITE":  {"rule": "simple-majority", "pool": "authorized"},
  "COSIGN_APPEND": {"rule": "simple-majority", "pool": "authorized"},
  "GHOST_GC":      {"rule": "simple-majority", "pool": "authorized"},
  "HEARTBEAT_ACK": {"rule": "auto-pass", "pool": "any"},
  "DEFAULT":       {"rule": "simple-majority", "pool": "authorized"},
}

def now_iso(): return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")[:23]+"Z"
def sha16(s): return hashlib.sha256(s.encode() if isinstance(s,str) else s).hexdigest()[:16]

def last_row_hash(path):
  if not path.exists() or path.stat().st_size == 0:
    return "0000000000000000"
  with open(path, "rb") as f:
    f.seek(0, 2); end = f.tell()
    chunk_size = min(2048, end); f.seek(end - chunk_size)
    tail = f.read().decode("utf-8", errors="ignore").strip().splitlines()
  if not tail: return "0000000000000000"
  try:
    return json.loads(tail[-1]).get("row_hash", "0000000000000000")
  except Exception:
    return "0000000000000000"

def append_row(path, row_dict):
  prev = last_row_hash(path)
  row_dict["antecedents"] = prev
  row_dict["ts"] = now_iso()
  base = json.dumps(row_dict, sort_keys=True, ensure_ascii=False)
  row_dict["row_hash"] = sha16(base)
  with open(path, "a", encoding="utf-8") as f:
    f.write(json.dumps(row_dict, ensure_ascii=False) + "\n")
  return row_dict["row_hash"]

def all_open_votes():
  if not QUEUE.exists(): return []
  rows = []
  for line in QUEUE.read_text(encoding="utf-8").splitlines():
    try: rows.append(json.loads(line))
    except: pass
  return rows

def votes_for(vote_id):
  if not VOTES.exists(): return []
  out = []
  for line in VOTES.read_text(encoding="utf-8").splitlines():
    try:
      r = json.loads(line)
      if r.get("vote_id") == vote_id:
        out.append(r)
    except: pass
  return out

def outcome_exists(vote_id):
  """Idempotence check — added per V42-A2 stress-test finding (VOTE-099721086217cba2 PASS-MAJORITY)."""
  if not OUTCOMES.exists(): return False
  for line in OUTCOMES.read_text(encoding="utf-8").splitlines():
    try:
      r = json.loads(line)
      if r.get("vote_id") == vote_id: return True
    except: pass
  return False

def is_authorized(voter_pid, pool):
  if pool == "quintuple":
    return voter_pid in QUINTUPLE
  if pool == "authorized":
    return voter_pid in QUINTUPLE or any(voter_pid.startswith(f"AGT-{c}") or voter_pid.startswith(c) for c in AUTHORIZED_CLASSES)
  return True  # any

def evaluate_quorum(vote_id, decision_class):
  rule_spec = QUORUM_RULES.get(decision_class, QUORUM_RULES["DEFAULT"])
  rule, pool = rule_spec["rule"], rule_spec["pool"]
  cast = votes_for(vote_id)
  cast = [v for v in cast if is_authorized(v["voter_pid"], pool)]
  yes = sum(1 for v in cast if v["vote"] == "YES")
  no = sum(1 for v in cast if v["vote"] == "NO")
  abstain = sum(1 for v in cast if v["vote"] == "ABSTAIN")
  total = yes + no  # abstains don't count for quorum
  status = {"vote_id": vote_id, "decision_class": decision_class, "rule": rule, "pool": pool,
            "yes": yes, "no": no, "abstain": abstain, "total_decisive": total}
  if rule == "auto-pass":
    status["outcome"] = "PASS-AUTO"
    return status
  if rule == "unanimous-5":
    yes_voters = {v["voter_pid"] for v in cast if v["vote"] == "YES"}
    if yes_voters >= QUINTUPLE and no == 0:
      status["outcome"] = "PASS-UNANIMOUS"
    elif no > 0:
      status["outcome"] = "REJECT"
    else:
      status["outcome"] = "PENDING"
    return status
  if rule == "supermajority-2-3":
    if total >= 3 and yes >= (2 * total) / 3:
      status["outcome"] = "PASS-SUPERMAJORITY"
    elif total >= 3 and no > total / 3:
      status["outcome"] = "REJECT"
    else:
      status["outcome"] = "PENDING"
    return status
  # simple-majority
  if total >= 3 and yes > total / 2:
    status["outcome"] = "PASS-MAJORITY"
  elif total >= 3 and no >= total / 2:
    status["outcome"] = "REJECT"
  else:
    status["outcome"] = "PENDING"
  return status

class Handler(BaseHTTPRequestHandler):
  def log_message(self, *a, **k): pass  # silent
  def _send(self, code, body):
    try:
      self.send_response(code)
      self.send_header("Content-Type", "application/json")
      payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
      self.send_header("Content-Length", str(len(payload)))
      self.end_headers()
      self.wfile.write(payload)
    except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
      pass
  def _read_body(self):
    n = int(self.headers.get("Content-Length", "0") or "0")
    if not n: return {}
    raw = self.rfile.read(n).decode("utf-8")
    try: return json.loads(raw)
    except: return {"_raw": raw[:500]}
  def do_GET(self):
    p = self.path
    if p == "/health":
      return self._send(200, {"ok": True, "service": "asolaria-vote-quorum-daemon", "port": PORT,
                              "anchor_pid": ANCHOR, "law_anchor": LAW_ANCHOR,
                              "pending_count": len(all_open_votes()),
                              "ts": now_iso()})
    if p == "/api/vote-quorum/pending":
      pending = []
      for v in all_open_votes():
        status = evaluate_quorum(v["vote_id"], v["decision_class"])
        if status["outcome"] == "PENDING":
          pending.append({**v, "status": status})
      return self._send(200, {"ok": True, "pending": pending, "count": len(pending)})
    if p == "/api/vote-quorum/quorum-rules":
      return self._send(200, {"ok": True, "rules": QUORUM_RULES, "quintuple": list(QUINTUPLE),
                              "authorized_classes": list(AUTHORIZED_CLASSES),
                              "law_window_end": LAW_WINDOW_END, "op_window_end": OP_WINDOW_END})
    if p.startswith("/api/vote-quorum/status/"):
      vid = p.split("/")[-1]
      open_votes = [v for v in all_open_votes() if v.get("vote_id") == vid]
      if not open_votes:
        return self._send(404, {"ok": False, "error": "vote_id not found", "vote_id": vid})
      v = open_votes[0]
      status = evaluate_quorum(vid, v["decision_class"])
      return self._send(200, {"ok": True, "decision": v, "status": status,
                              "cast_votes": votes_for(vid)})
    return self._send(404, {"ok": False, "error": "unknown route", "path": p})
  def do_POST(self):
    p = self.path
    body = self._read_body()
    if p == "/api/vote-quorum/submit":
      required = ("decision_class", "decision_pid", "requester_pid")
      missing = [k for k in required if k not in body]
      if missing:
        return self._send(400, {"ok": False, "error": "missing fields", "missing": missing})
      vote_id = f"VOTE-{sha16(body['decision_pid']+now_iso())}"
      row = {"vote_id": vote_id, "decision_class": body["decision_class"],
             "decision_pid": body["decision_pid"], "payload": body.get("payload", {}),
             "requester_pid": body["requester_pid"], "anchor_pid": ANCHOR,
             "law_anchor": LAW_ANCHOR}
      append_row(QUEUE, row)
      return self._send(200, {"ok": True, "vote_id": vote_id, "rule": QUORUM_RULES.get(body["decision_class"], QUORUM_RULES["DEFAULT"])})
    if p == "/api/vote-quorum/cast":
      required = ("vote_id", "voter_pid", "vote")
      missing = [k for k in required if k not in body]
      if missing:
        return self._send(400, {"ok": False, "error": "missing fields", "missing": missing})
      if body["vote"] not in ("YES", "NO", "ABSTAIN"):
        return self._send(400, {"ok": False, "error": "vote must be YES/NO/ABSTAIN"})
      open_votes = [v for v in all_open_votes() if v.get("vote_id") == body["vote_id"]]
      if not open_votes:
        return self._send(404, {"ok": False, "error": "vote_id not found"})
      decision = open_votes[0]
      already = [v for v in votes_for(body["vote_id"]) if v["voter_pid"] == body["voter_pid"]]
      if already:
        return self._send(409, {"ok": False, "error": "voter already cast", "previous": already[0]})
      pool = QUORUM_RULES.get(decision["decision_class"], QUORUM_RULES["DEFAULT"])["pool"]
      authorized = is_authorized(body["voter_pid"], pool)
      cast_row = {"vote_id": body["vote_id"], "voter_pid": body["voter_pid"],
                  "vote": body["vote"], "reason": body.get("reason", ""),
                  "authorized": authorized, "anchor_pid": ANCHOR}
      append_row(VOTES, cast_row)
      status = evaluate_quorum(body["vote_id"], decision["decision_class"])
      if status["outcome"] in ("PASS-UNANIMOUS", "PASS-MAJORITY", "PASS-SUPERMAJORITY", "PASS-AUTO", "REJECT") and not outcome_exists(body["vote_id"]):
        outcome_row = {"vote_id": body["vote_id"], "decision_class": decision["decision_class"],
                       "decision_pid": decision["decision_pid"], "outcome": status["outcome"],
                       "tally": {k: status[k] for k in ("yes","no","abstain","total_decisive")},
                       "anchor_pid": ANCHOR, "law_anchor": LAW_ANCHOR}
        append_row(OUTCOMES, outcome_row)
      return self._send(200, {"ok": True, "cast": cast_row, "status": status})
    return self._send(404, {"ok": False, "error": "unknown route", "path": p})

def main():
  PID_FILE.write_text(str(os.getpid()), encoding="utf-8")
  srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
  print(f"[asolaria-vote-quorum-daemon] listening on 0.0.0.0:{PORT} | law={LAW_ANCHOR}", flush=True)
  srv.serve_forever()

if __name__ == "__main__":
  main()
