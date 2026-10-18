"""Asolaria Ghost-Envelope GC Daemon — V39 voxel GHOST_ENVELOPE_GC runtime.

Wave-306 Spec-11 — promotes the V38-004-GHOST_ENVELOPE_GC voxel (descriptor-only,
status DESIGN-MINTED in v39/map-v39.json) to a live runtime daemon.

What "ghost" means here (per V38-002-DUAL_EMIT_GATE / V38-003-HONEST_FAIL_DETECTOR):
  An envelope that completed the dispatch path with bus_status=200 (HTTP-OK at the
  transport layer) BUT carries worker_output_size=0 — i.e. the model/worker silently
  emitted nothing. The envelope LOOKS like a success on the bus but contains no
  real work product. These are "silent-fail ghost rows".

What this daemon does:
  * Periodically scans omnidispatcher pid-inboxes (+ pid-inboxes-processed for audit)
    for envelopes matching the ghost pattern (bus=200 AND worker_output_size=0).
  * Marks each as ghost (writes an entry to ghost-gc-receipts.hbp ndjson sidecar).
  * NEVER destructively deletes — preserves canon. Just flags. Operator may later
    decide to move flagged ghosts to a cold-archive via a separate disposition tool.
  * Also exposes an HTTP endpoint to flag an envelope on-demand and to query the
    flagged-ghost catalogue.

Endpoints (HTTP :4958):
  GET  /health                     liveness + counters
  GET  /api/ghost-gc/stats         total scanned, ghost_count, last_scan_ts
  GET  /api/ghost-gc/list?limit=N  last N flagged ghosts
  POST /api/ghost-gc/scan          force-trigger one scan pass (returns counts)
  POST /api/ghost-gc/flag          body={envelope:{...}, source_path?} — manual flag

Receipt file (HBPv1 ndjson + sha-chained):
  C:/HyperBEHCS/data/ghost-envelope-gc/ghost-gc-receipts.hbp

Authorized by Foundation v3 LAW (quintuple-cosign 4-month window through 2026-09-23)
and OP-JESSE-APEX (2-month delegation through 2026-07-23). GHOST_GC decision class
in vote-quorum-daemon is simple-majority — daemon may operate freely under that
class as long as it never destroys data.

Anchor:   ASOLARIA-GHOST-ENVELOPE-GC-DAEMON-PID-2026-05-23
Wave:     W2026-V43-WAVE-306-SPEC-11
"""
import json
import hashlib
import os
import re
import sys
import threading
import time
import traceback
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 4958
ANCHOR = "ASOLARIA-GHOST-ENVELOPE-GC-DAEMON-PID-2026-05-23"
LAW = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"
WAVE = "W2026-V43-WAVE-306-SPEC-11"
VOXEL = "V38-004-GHOST_ENVELOPE_GC"

INBOX_ROOT = Path("C:/asolaria-acer/pid-inboxes")
PROCESSED_ROOT = Path("C:/asolaria-acer/pid-inboxes-processed")
DATA_DIR = Path("C:/HyperBEHCS/data/ghost-envelope-gc")
DATA_DIR.mkdir(parents=True, exist_ok=True)
RECEIPTS = DATA_DIR / "ghost-gc-receipts.hbp"
PID_FILE = DATA_DIR / "daemon.pid"

SCAN_INTERVAL_SEC = 60  # one pass per minute
SCAN_DEPTH = 4  # how deep to recurse from inbox roots

_stats_lock = threading.Lock()
_stats = {
    "total_scans": 0,
    "total_files_seen": 0,
    "total_ghosts_flagged": 0,
    "last_scan_ts": None,
    "last_scan_envelopes_scanned": 0,
    "last_scan_ghosts_found": 0,
}
_seen_envelopes = set()  # row_hash dedupe to avoid double-flagging across scans


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def sha16(s):
    if isinstance(s, str):
        s = s.encode("utf-8")
    return hashlib.sha256(s).hexdigest()[:16]


def last_row_hash(path):
    if not path.exists() or path.stat().st_size == 0:
        return "0000000000000000"
    try:
        with open(path, "rb") as f:
            f.seek(0, 2)
            end = f.tell()
            chunk = min(4096, end)
            f.seek(end - chunk)
            tail = f.read().decode("utf-8", errors="ignore").strip().splitlines()
        for ln in reversed(tail):
            ln = ln.strip()
            if not ln:
                continue
            m = re.search(r"\|row_hash=([0-9a-f]+)", ln)
            if m:
                return m.group(1)
    except Exception:
        pass
    return "0000000000000000"


def append_receipt(payload_kv):
    """Append one HBPv1 ghost-gc receipt line (pipe-delimited, sha-chained)."""
    prev = last_row_hash(RECEIPTS)
    payload_kv = dict(payload_kv)
    payload_kv["antecedents"] = prev
    payload_kv["ts"] = now_iso()
    # Build a deterministic HBPv1 line
    fields = [
        "HBPv1",
        f"layer=ghost-envelope-gc",
        f"anchor_pid={ANCHOR}",
        f"law_anchor={LAW}",
        f"voxel={VOXEL}",
        f"wave={WAVE}",
    ]
    for k, v in sorted(payload_kv.items()):
        # sanitize value to be pipe-safe and single-line
        sv = str(v).replace("|", "/").replace("\n", " ").replace("\r", " ")
        fields.append(f"{k}={sv}")
    base = "|".join(fields)
    row_hash = sha16(base)
    line = f"{base}|row_hash={row_hash}\n"
    with open(RECEIPTS, "a", encoding="utf-8") as f:
        f.write(line)
    return row_hash


def detect_ghost(env, source_path=None):
    """Return (is_ghost, reason_dict_or_none). Pattern: bus_status==200 and
    worker_output_size==0. Tolerant of multiple key namings."""
    if not isinstance(env, dict):
        return False, None
    bus = (
        env.get("bus")
        or env.get("bus_status")
        or env.get("status_bus")
        or env.get("http_status")
        or env.get("response_status")
    )
    # Coerce string '200' to int 200
    try:
        bus_int = int(bus) if bus is not None else None
    except (TypeError, ValueError):
        bus_int = None
    if bus_int != 200:
        return False, None
    out_size = env.get("worker_output_size")
    if out_size is None:
        # Also consider explicit empty payloads
        if "worker_output" in env:
            wo = env.get("worker_output")
            if isinstance(wo, (str, bytes)):
                out_size = len(wo)
            elif isinstance(wo, list):
                out_size = len(wo) if all(isinstance(x, (str, int, float)) for x in wo) else None
            elif wo is None:
                out_size = 0
            else:
                out_size = None
        elif "result" in env:
            r = env.get("result")
            if r is None:
                out_size = 0
            elif isinstance(r, (str, bytes)):
                out_size = len(r)
            else:
                out_size = None
    if out_size is None:
        return False, None
    try:
        size_int = int(out_size)
    except (TypeError, ValueError):
        return False, None
    if size_int != 0:
        return False, None
    return True, {
        "bus_status": bus_int,
        "worker_output_size": size_int,
        "row_hash": env.get("row_hash"),
        "envelope_target": env.get("target"),
        "envelope_caller_pid": env.get("caller_pid"),
        "source_path": str(source_path) if source_path else None,
    }


def scan_envelope_file(fp):
    """Return (envelope_dict_or_None, parse_error)."""
    try:
        with open(fp, "r", encoding="utf-8") as f:
            raw = f.read()
        if not raw.strip():
            return None, "empty"
        env = json.loads(raw)
        return env, None
    except json.JSONDecodeError as e:
        return None, f"json-decode:{e}"
    except Exception as e:
        return None, f"read-error:{e}"


def scan_pass():
    """Walk inbox dirs, find ghost envelopes, flag them. NEVER deletes."""
    scanned = 0
    ghosts_this_pass = 0
    new_flags = []
    roots = [INBOX_ROOT, PROCESSED_ROOT]
    for root in roots:
        if not root.exists():
            continue
        # bounded walk
        for dirpath, dirnames, filenames in os.walk(root):
            depth = len(Path(dirpath).relative_to(root).parts)
            if depth > SCAN_DEPTH:
                dirnames[:] = []
                continue
            for fn in filenames:
                if not (fn.endswith(".json") or fn.endswith(".envelope.json")):
                    continue
                fp = Path(dirpath) / fn
                scanned += 1
                env, err = scan_envelope_file(fp)
                if err:
                    continue
                is_ghost, reason = detect_ghost(env, source_path=fp)
                if not is_ghost:
                    continue
                # Dedupe by envelope row_hash if present, else file path
                key = env.get("row_hash") or str(fp)
                if key in _seen_envelopes:
                    continue
                _seen_envelopes.add(key)
                # Flag (write receipt)
                rh = append_receipt(
                    {
                        "action": "FLAG-GHOST",
                        "preserves_canon": "true",
                        "destructively_deleted": "false",
                        **{f"reason_{k}": v for k, v in (reason or {}).items() if v is not None},
                    }
                )
                ghosts_this_pass += 1
                new_flags.append({"receipt_row_hash": rh, **(reason or {})})
    with _stats_lock:
        _stats["total_scans"] += 1
        _stats["total_files_seen"] += scanned
        _stats["total_ghosts_flagged"] += ghosts_this_pass
        _stats["last_scan_ts"] = now_iso()
        _stats["last_scan_envelopes_scanned"] = scanned
        _stats["last_scan_ghosts_found"] = ghosts_this_pass
    return {"scanned": scanned, "ghosts_found": ghosts_this_pass, "new_flags": new_flags}


def list_recent_flags(limit=50):
    if not RECEIPTS.exists():
        return []
    out = []
    with open(RECEIPTS, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for ln in lines[-limit:]:
        ln = ln.strip()
        if not ln:
            continue
        # Parse pipe-delimited HBPv1
        kv = {}
        for part in ln.split("|"):
            if "=" in part:
                k, v = part.split("=", 1)
                kv[k] = v
        out.append(kv)
    return out


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass

    def _send(self, code, body):
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _read_body(self):
        n = int(self.headers.get("Content-Length", "0") or "0")
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception as e:
            return {"_parse_error": str(e)}

    def do_GET(self):
        if self.path == "/health":
            with _stats_lock:
                snap = dict(_stats)
            return self._send(
                200,
                {
                    "ok": True,
                    "service": "asolaria-ghost-envelope-gc-daemon",
                    "port": PORT,
                    "anchor_pid": ANCHOR,
                    "law_anchor": LAW,
                    "voxel": VOXEL,
                    "wave": WAVE,
                    "receipts_path": str(RECEIPTS),
                    "stats": snap,
                    "ts": now_iso(),
                },
            )
        if self.path.startswith("/api/ghost-gc/stats"):
            with _stats_lock:
                snap = dict(_stats)
            return self._send(200, {"ok": True, "stats": snap, "ts": now_iso()})
        if self.path.startswith("/api/ghost-gc/list"):
            from urllib.parse import urlparse, parse_qs

            q = parse_qs(urlparse(self.path).query)
            try:
                limit = max(1, min(500, int(q.get("limit", ["50"])[0])))
            except ValueError:
                limit = 50
            return self._send(200, {"ok": True, "flags": list_recent_flags(limit)})
        return self._send(404, {"ok": False, "error": "unknown route"})

    def do_POST(self):
        if self.path == "/api/ghost-gc/scan":
            try:
                res = scan_pass()
                return self._send(200, {"ok": True, "scan": res, "ts": now_iso()})
            except Exception as e:
                return self._send(500, {"ok": False, "error": str(e), "trace": traceback.format_exc()})
        if self.path == "/api/ghost-gc/flag":
            body = self._read_body()
            env = body.get("envelope") or {}
            source = body.get("source_path")
            is_ghost, reason = detect_ghost(env, source_path=source)
            if not is_ghost:
                return self._send(
                    200,
                    {"ok": False, "is_ghost": False, "reason": "envelope-does-not-match-ghost-pattern"},
                )
            rh = append_receipt(
                {
                    "action": "FLAG-GHOST-MANUAL",
                    "preserves_canon": "true",
                    "destructively_deleted": "false",
                    **{f"reason_{k}": v for k, v in (reason or {}).items() if v is not None},
                }
            )
            with _stats_lock:
                _stats["total_ghosts_flagged"] += 1
            return self._send(200, {"ok": True, "is_ghost": True, "receipt_row_hash": rh, "reason": reason})
        return self._send(404, {"ok": False, "error": "unknown route"})


def scan_loop():
    while True:
        try:
            scan_pass()
        except Exception:
            traceback.print_exc()
        time.sleep(SCAN_INTERVAL_SEC)


def main():
    # Write PID file
    try:
        PID_FILE.write_text(str(os.getpid()), encoding="utf-8")
    except Exception:
        pass
    t = threading.Thread(target=scan_loop, daemon=True)
    t.start()
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(
        f"[ghost-envelope-gc] LIVE on :{PORT} — voxel={VOXEL} wave={WAVE} receipts={RECEIPTS}",
        flush=True,
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
