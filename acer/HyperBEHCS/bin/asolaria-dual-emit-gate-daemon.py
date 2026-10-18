"""Asolaria Dual-Emit Gate Daemon — V38-002 DUAL_EMIT_GATE runtime.

Wave-306 Spec-12 — promotes the V38-002-DUAL_EMIT_GATE voxel (descriptor-only,
status DESIGN-MINTED in v39/map-v39.json) to a live runtime daemon.

Per spec: "Rate-controlled tee splitting emit-call to destination (A) + hookwall+GNN (B)"

Operator intent (witness on V38-001):
  "messages emitted do not only route to their directories and locations and
   activations and executions but also to the hookwall and GNNs by default they
   are analyzed we just need to make sure we are eating it into the system and
   maping from it at the same time without exploding"

Pattern this daemon implements:
  An emit-call comes in on HTTP. The daemon synchronously tees it to THREE places:
    (A) the requested destination URL                      (primary route)
    (B) hookwall sink                                      (variance / verb-log)
    (C) GNN trio feed sink                                 (graph-edge analysis)
  Per-source-class rate-limit (token bucket) protects against the "exploding"
  failure mode in the operator witness. When a source exceeds its budget the
  tee to (B) and (C) becomes a counted-drop rather than dispatching, while the
  primary (A) destination still gets the message (sources retain their direct
  channel; observability is the rate-limited side).

  Configurable per source-class via in-memory + ndjson-backed config.

Endpoints (HTTP :4955):
  GET  /health                                  liveness + rate-limit snapshot
  GET  /api/dual-emit-gate/stats                cumulative tee/dispatch/drop counts
  GET  /api/dual-emit-gate/config               current per-source-class limits
  POST /api/dual-emit-gate/config               body={source_class, rate_per_sec, burst}
                                                update one class budget
  POST /api/dual-emit-gate/intercept            body={source_class, destination_url,
                                                payload, hookwall_url?, gnn_url?}
                                                tee, apply rate-limit, return per-leg
                                                dispositions

Receipt file (HBPv1 ndjson + sha-chained):
  C:/HyperBEHCS/data/dual-emit-gate/tee-events.hbp

Rate-limit policy (default — can be overridden via POST /config):
  default              : 50 req/sec  burst 100
  daemon-proxy         : 100 req/sec burst 200
  citizen              : 30 req/sec  burst 60
  cli                  : 20 req/sec  burst 40
  meta                 : 200 req/sec burst 400   (helm-band priority)
  google               : 10 req/sec  burst 20    (external API; conservative)
  antigravity          : 10 req/sec  burst 20

Authorized by Foundation v3 LAW (quintuple 4-month, through 2026-09-23) +
OP-JESSE apex (2-month delegation, through 2026-07-23).

Anchor:   ASOLARIA-DUAL-EMIT-GATE-DAEMON-PID-2026-05-23
Wave:     W2026-V43-WAVE-306-SPEC-12
"""
import json
import hashlib
import os
import re
import sys
import threading
import time
import traceback
import urllib.request
import urllib.error
from collections import defaultdict, deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 4955
ANCHOR = "ASOLARIA-DUAL-EMIT-GATE-DAEMON-PID-2026-05-23"
LAW = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"
WAVE = "W2026-V43-WAVE-306-SPEC-12"
VOXEL = "V38-002-DUAL_EMIT_GATE"

DATA_DIR = Path("C:/HyperBEHCS/data/dual-emit-gate")
DATA_DIR.mkdir(parents=True, exist_ok=True)
TEE_LOG = DATA_DIR / "tee-events.hbp"
CONFIG_FILE = DATA_DIR / "rate-limits.json"
PID_FILE = DATA_DIR / "daemon.pid"

# Defaults — keep observability path generous for helm/meta, conservative for external
DEFAULT_LIMITS = {
    "default":      {"rate_per_sec": 50,  "burst": 100},
    "daemon-proxy": {"rate_per_sec": 100, "burst": 200},
    "citizen":      {"rate_per_sec": 30,  "burst": 60},
    "cli":          {"rate_per_sec": 20,  "burst": 40},
    "meta":         {"rate_per_sec": 200, "burst": 400},
    "google":       {"rate_per_sec": 10,  "burst": 20},
    "antigravity":  {"rate_per_sec": 10,  "burst": 20},
}

DEFAULT_HOOKWALL_URL = "http://127.0.0.1:4947/behcs/send"  # bus :4947 = canonical observability ingest (V52-B fix)
# GNN drain :4920 is POLL-based (no push ingest endpoint); also tee to bus which the drain observes (V52-B honest-fail-by-design)
DEFAULT_GNN_URL = "http://127.0.0.1:4947/behcs/send"  # share bus; GNN drain reads from inbox the bus writes to

# V52-B: target resolver for daemon:<name> scheme (FEDENV-v1 logical names → bound HTTP URLs).
# When a destination_url starts with "daemon:", look up here. If absent → honest-fail "no-resolver"
# rather than attempting urllib parse (which raises ValueError on colon-scheme without //).
DAEMON_TARGET_RESOLVER = {
    "daemon:google-enterprise-citizen": "http://127.0.0.1:4960/health",
    "daemon:symphony-citizen":          "http://127.0.0.1:4961/health",
    "daemon:linear-citizen":            "http://127.0.0.1:4962/health",
    "daemon:augment-citizen":           "http://127.0.0.1:4963/health",
    "daemon:auggie-citizen":            "http://127.0.0.1:4964/health",
    "daemon:ms-graph-citizen":          "http://127.0.0.1:4965/health",
    "daemon:azure-arm-citizen":         "http://127.0.0.1:4966/health",
    "daemon:aws-api-citizen":           "http://127.0.0.1:4967/health",
    "daemon:ms-teams-citizen":          "http://127.0.0.1:4968/health",
    "daemon:onedrive-citizen":          "http://127.0.0.1:4969/health",
    "daemon:hubspot-citizen":           "http://127.0.0.1:4970/health",
    "daemon:cosign-chain":              "http://127.0.0.1:4953/health",
    "daemon:vote-quorum":               "http://127.0.0.1:4952/health",
    "daemon:ghost-envelope-gc":         "http://127.0.0.1:4958/health",
    "daemon:omniquant-engine":          "http://127.0.0.1:4956/health",
    "daemon:hookwall-bus":              "http://127.0.0.1:4947/behcs/health",
    "daemon:gnn-drain":                 "http://127.0.0.1:4920/health",
    "daemon:omnidispatcher":            "http://127.0.0.1:4950/health",
    "daemon:asolaria-fabric":           "http://127.0.0.1:4949/health",
}


def resolve_destination(destination_url):
    """V52-B: resolve daemon:<name> → HTTP URL via FEDENV-v1 map.
    Returns (resolved_url, method_hint) or (None, 'no-resolver') for honest-fail."""
    if not destination_url:
        return None, "no-destination"
    if destination_url.startswith("daemon:"):
        mapped = DAEMON_TARGET_RESOLVER.get(destination_url)
        if mapped:
            return mapped, "GET"  # health endpoints — GET-friendly
        return None, "no-resolver"
    if destination_url.startswith("http://") or destination_url.startswith("https://"):
        return destination_url, "POST"
    return None, "bad-scheme"

_lock = threading.Lock()
_limits = {}  # source_class -> {rate_per_sec, burst}
_buckets = {}  # source_class -> {tokens: float, last_refill: float}

_stats = {
    "total_intercepts": 0,
    "tee_to_destination_ok": 0,
    "tee_to_destination_fail": 0,
    "tee_to_destination_no_resolver": 0,  # V52-B: honest-fail for daemon:<unknown>
    "tee_to_destination_no_destination": 0,  # V52-B: empty destination_url
    "tee_to_destination_bad_scheme": 0,  # V52-B: not http/https/daemon
    "tee_to_hookwall_ok": 0,
    "tee_to_hookwall_drop_rate_limit": 0,
    "tee_to_hookwall_fail": 0,
    "tee_to_gnn_ok": 0,
    "tee_to_gnn_drop_rate_limit": 0,
    "tee_to_gnn_fail": 0,
    "boot_ts": None,
}


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def sha16(s):
    if isinstance(s, str):
        s = s.encode("utf-8")
    return hashlib.sha256(s).hexdigest()[:16]


def load_limits():
    """Load saved limits if present, else seed defaults."""
    global _limits, _buckets
    if CONFIG_FILE.exists():
        try:
            disk = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
            # merge with defaults (defaults fill gaps)
            for k, v in DEFAULT_LIMITS.items():
                disk.setdefault(k, v)
            _limits = disk
        except Exception:
            _limits = dict(DEFAULT_LIMITS)
    else:
        _limits = dict(DEFAULT_LIMITS)
        try:
            CONFIG_FILE.write_text(json.dumps(_limits, indent=2), encoding="utf-8")
        except Exception:
            pass
    now = time.time()
    for cls, lim in _limits.items():
        _buckets[cls] = {"tokens": float(lim["burst"]), "last_refill": now}


def acquire_token(source_class):
    """Token-bucket: return True if rate budget allows, False else. Thread-safe."""
    with _lock:
        cls = source_class if source_class in _limits else "default"
        lim = _limits[cls]
        b = _buckets.setdefault(cls, {"tokens": float(lim["burst"]), "last_refill": time.time()})
        now = time.time()
        elapsed = now - b["last_refill"]
        refill = elapsed * float(lim["rate_per_sec"])
        b["tokens"] = min(float(lim["burst"]), b["tokens"] + refill)
        b["last_refill"] = now
        if b["tokens"] >= 1.0:
            b["tokens"] -= 1.0
            return True
        return False


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


def append_tee_receipt(payload_kv):
    prev = last_row_hash(TEE_LOG)
    payload_kv = dict(payload_kv)
    payload_kv["antecedents"] = prev
    payload_kv["ts"] = now_iso()
    fields = [
        "HBPv1",
        f"layer=dual-emit-gate",
        f"anchor_pid={ANCHOR}",
        f"law_anchor={LAW}",
        f"voxel={VOXEL}",
        f"wave={WAVE}",
    ]
    for k, v in sorted(payload_kv.items()):
        sv = str(v).replace("|", "/").replace("\n", " ").replace("\r", " ")
        fields.append(f"{k}={sv}")
    base = "|".join(fields)
    row_hash = sha16(base)
    line = f"{base}|row_hash={row_hash}\n"
    with open(TEE_LOG, "a", encoding="utf-8") as f:
        f.write(line)
    return row_hash


def http_post(url, body_dict, timeout_sec=3, method="POST"):
    """Best-effort HTTP call. Returns (ok, status, error_str). V52-B: method-aware."""
    try:
        if method == "GET":
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                return True, resp.status, None
        data = json.dumps(body_dict, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            url, data=data, headers={"Content-Type": "application/json"}, method=method
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            return True, resp.status, None
    except urllib.error.HTTPError as e:
        return False, e.code, str(e)
    except Exception as e:
        return False, None, str(e)


def intercept_emit(source_class, destination_url, payload, hookwall_url=None, gnn_url=None):
    """Apply the dual-emit gate: tee to A, B, C with per-class rate-limit on B+C."""
    hookwall_url = hookwall_url or DEFAULT_HOOKWALL_URL
    gnn_url = gnn_url or DEFAULT_GNN_URL
    # A: primary destination — V52-B: resolve daemon:<name> via FEDENV-v1 map first
    resolved_url, method_or_reason = resolve_destination(destination_url)
    if resolved_url is None:
        # honest-fail: no-resolver / no-destination / bad-scheme
        a_ok, a_status, a_err = None, None, method_or_reason
        a_resolved = ""
    else:
        # bus :4947/behcs/send needs an envelope shape (id/type/payload); wrap if POST
        if method_or_reason == "POST" and resolved_url.endswith("/behcs/send"):
            envelope = {
                "id": f"deg-{int(time.time()*1000)}-{sha16(json.dumps(payload, sort_keys=True))[:6]}",
                "type": f"EVT-DUAL-EMIT-{source_class.upper()}",
                "verb": "@dual-emit-gate.leg-A",
                "from": "@dual-emit-gate",
                "payload": payload,
                "ts": now_iso(),
            }
            a_ok, a_status, a_err = http_post(resolved_url, envelope, timeout_sec=5, method="POST")
        else:
            a_ok, a_status, a_err = http_post(resolved_url, payload, timeout_sec=5, method=method_or_reason)
        a_resolved = resolved_url
    # B/C: observability tees — rate-limited per source-class
    b_disp = "DISPATCH"
    c_disp = "DISPATCH"
    b_ok = c_ok = None
    b_status = c_status = None
    b_err = c_err = None
    # V52-B: bus envelope wrapper for /behcs/send-style sinks
    def _bus_env(leg):
        return {
            "id": f"deg-{leg}-{int(time.time()*1000)}-{sha16(json.dumps(payload, sort_keys=True))[:6]}",
            "type": f"EVT-DUAL-EMIT-{leg.upper()}",
            "verb": f"@dual-emit-gate.leg-{leg}",
            "from": "@dual-emit-gate",
            "payload": {"source_class": source_class, "destination_url": destination_url, "leg": leg, "inner_payload": payload},
            "ts": now_iso(),
        }
    if acquire_token(source_class):
        if hookwall_url.endswith("/behcs/send"):
            b_ok, b_status, b_err = http_post(hookwall_url, _bus_env("hookwall"))
        else:
            b_ok, b_status, b_err = http_post(
                hookwall_url,
                {"source_class": source_class, "destination_url": destination_url, "payload": payload, "leg": "hookwall"},
            )
    else:
        b_disp = "DROP-RATE-LIMIT"
    if acquire_token(source_class):
        if gnn_url.endswith("/behcs/send"):
            c_ok, c_status, c_err = http_post(gnn_url, _bus_env("gnn"))
        else:
            c_ok, c_status, c_err = http_post(
                gnn_url,
                {"source_class": source_class, "destination_url": destination_url, "payload": payload, "leg": "gnn"},
            )
    else:
        c_disp = "DROP-RATE-LIMIT"

    # Update stats
    with _lock:
        _stats["total_intercepts"] += 1
        if a_ok is True:
            _stats["tee_to_destination_ok"] += 1
        elif a_ok is False:
            _stats["tee_to_destination_fail"] += 1
        elif a_ok is None:
            # V52-B honest-fail buckets: distinguish "no-resolver" / "no-destination" / "bad-scheme"
            if a_err == "no-resolver":
                _stats["tee_to_destination_no_resolver"] += 1
            elif a_err == "no-destination":
                _stats["tee_to_destination_no_destination"] += 1
            elif a_err == "bad-scheme":
                _stats["tee_to_destination_bad_scheme"] += 1
        if b_disp == "DROP-RATE-LIMIT":
            _stats["tee_to_hookwall_drop_rate_limit"] += 1
        elif b_ok is True:
            _stats["tee_to_hookwall_ok"] += 1
        elif b_ok is False:
            _stats["tee_to_hookwall_fail"] += 1
        if c_disp == "DROP-RATE-LIMIT":
            _stats["tee_to_gnn_drop_rate_limit"] += 1
        elif c_ok is True:
            _stats["tee_to_gnn_ok"] += 1
        elif c_ok is False:
            _stats["tee_to_gnn_fail"] += 1

    # Receipt — record short SHA of payload for trace, never the full payload (size)
    payload_sha = sha16(json.dumps(payload, sort_keys=True, ensure_ascii=False))
    receipt_rh = append_tee_receipt(
        {
            "source_class": source_class,
            "destination_url": destination_url or "",
            "payload_sha16": payload_sha,
            "leg_A_destination_disposition": "OK" if a_ok else ("FAIL" if a_ok is False else "SKIP"),
            "leg_A_status": str(a_status) if a_status is not None else "",
            "leg_B_hookwall_disposition": b_disp if b_disp == "DROP-RATE-LIMIT" else ("OK" if b_ok else "FAIL"),
            "leg_B_status": str(b_status) if b_status is not None else "",
            "leg_C_gnn_disposition": c_disp if c_disp == "DROP-RATE-LIMIT" else ("OK" if c_ok else "FAIL"),
            "leg_C_status": str(c_status) if c_status is not None else "",
        }
    )
    return {
        "receipt_row_hash": receipt_rh,
        "source_class": source_class,
        "leg_A_destination": {"ok": a_ok, "status": a_status, "error": a_err},
        "leg_B_hookwall": {"disposition": b_disp, "ok": b_ok, "status": b_status, "error": b_err},
        "leg_C_gnn": {"disposition": c_disp, "ok": c_ok, "status": c_status, "error": c_err},
    }


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
            with _lock:
                buckets_snap = {k: {"tokens": round(v["tokens"], 2)} for k, v in _buckets.items()}
                stats_snap = dict(_stats)
            return self._send(
                200,
                {
                    "ok": True,
                    "service": "asolaria-dual-emit-gate-daemon",
                    "port": PORT,
                    "anchor_pid": ANCHOR,
                    "law_anchor": LAW,
                    "voxel": VOXEL,
                    "wave": WAVE,
                    "limits": _limits,
                    "buckets": buckets_snap,
                    "stats": stats_snap,
                    "ts": now_iso(),
                },
            )
        if self.path == "/api/dual-emit-gate/stats":
            with _lock:
                return self._send(200, {"ok": True, "stats": dict(_stats), "ts": now_iso()})
        if self.path == "/api/dual-emit-gate/config":
            with _lock:
                return self._send(200, {"ok": True, "limits": dict(_limits)})
        return self._send(404, {"ok": False, "error": "unknown route"})

    def do_POST(self):
        if self.path == "/api/dual-emit-gate/config":
            body = self._read_body()
            cls = body.get("source_class")
            rate = body.get("rate_per_sec")
            burst = body.get("burst")
            if not cls or rate is None or burst is None:
                return self._send(400, {"ok": False, "error": "missing source_class/rate_per_sec/burst"})
            try:
                rate = float(rate)
                burst = float(burst)
            except (TypeError, ValueError):
                return self._send(400, {"ok": False, "error": "rate_per_sec and burst must be numeric"})
            with _lock:
                _limits[cls] = {"rate_per_sec": rate, "burst": burst}
                _buckets[cls] = {"tokens": burst, "last_refill": time.time()}
                try:
                    CONFIG_FILE.write_text(json.dumps(_limits, indent=2), encoding="utf-8")
                except Exception:
                    pass
            return self._send(200, {"ok": True, "limits": dict(_limits)})
        if self.path == "/api/dual-emit-gate/intercept":
            body = self._read_body()
            source_class = body.get("source_class", "default")
            destination_url = body.get("destination_url", "")
            payload = body.get("payload", {})
            hookwall_url = body.get("hookwall_url")
            gnn_url = body.get("gnn_url")
            try:
                result = intercept_emit(source_class, destination_url, payload, hookwall_url, gnn_url)
                return self._send(200, {"ok": True, "result": result, "ts": now_iso()})
            except Exception as e:
                return self._send(500, {"ok": False, "error": str(e), "trace": traceback.format_exc()})
        return self._send(404, {"ok": False, "error": "unknown route"})


def main():
    load_limits()
    try:
        PID_FILE.write_text(str(os.getpid()), encoding="utf-8")
    except Exception:
        pass
    with _lock:
        _stats["boot_ts"] = now_iso()
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(
        f"[dual-emit-gate] LIVE on :{PORT} — voxel={VOXEL} wave={WAVE} "
        f"limits={len(_limits)}-classes tee-log={TEE_LOG}",
        flush=True,
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
