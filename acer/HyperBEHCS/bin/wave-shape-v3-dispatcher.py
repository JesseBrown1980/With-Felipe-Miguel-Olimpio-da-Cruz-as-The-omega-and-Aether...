#!/usr/bin/env python3
# wave-shape-v3-dispatcher.py - PID AGT-rook-silent-emit-stress-H02DA-V42B5-P00-NSILENT01
# Anchor: ASOLARIA-V42B5-SILENT-EMIT-STRESS-PID-2026-05-23
# Per feedback_fabric_silent_emit_failure_class_1_2026_05_23.md (bus=200 != model output)
# Shape: pre-flight probe -> invoke -> post-verify -> HONEST-PASS | HONEST-FAIL+proof
import sys, json, time, socket, shutil, subprocess, urllib.request, hashlib
from pathlib import Path
PREFLIGHT = {
    "lmstudio":    ("http", "127.0.0.1", 1234, "/v1/models"),
    "ollama":      ("http", "127.0.0.1", 11434, "/api/tags"),
    "asolaria":    ("http", "127.0.0.1", 4781, "/health"),
    "gemini":      ("https", "generativelanguage.googleapis.com", 443, "/"),
    "openai":      ("https", "api.openai.com", 443, "/v1/models"),
    "antigravity": ("tcp",  "127.0.0.1", 64212, None),       # native gRPC port
    "gemma-local": ("bin",  "gemini", None, None),           # bin presence proxy
    "opencode":    ("bin",  "opencode", None, None),
    "codex":       ("bin",  "codex", None, None),
}
def probe(cli):
    sch = PREFLIGHT.get(cli)
    if not sch: return ("UNKNOWN", f"no preflight schema for {cli}")
    kind, host, port, path = sch
    t0 = time.time()
    try:
        if kind == "bin":
            ok = bool(shutil.which(host)); return ("UP" if ok else "DOWN", f"bin={host} which={ok} ms={int((time.time()-t0)*1000)}")
        if kind == "tcp":
            with socket.create_connection((host, port), timeout=3): pass
            return ("UP", f"tcp {host}:{port} ms={int((time.time()-t0)*1000)}")
        url = f"{kind}://{host}:{port}{path}"
        req = urllib.request.Request(url, method="GET")
        try: code = urllib.request.urlopen(req, timeout=4).status
        except urllib.error.HTTPError as e: code = e.code  # 401/403 = reachable
        return (("UP" if code < 500 else "DOWN"), f"{url} http={code} ms={int((time.time()-t0)*1000)}")
    except Exception as e:
        return ("DOWN", f"{kind}://{host}:{port} err={type(e).__name__}:{str(e)[:80]} ms={int((time.time()-t0)*1000)}")
def dispatch(cli, model, prompt):
    state, proof = probe(cli)
    if state != "UP":
        return {"verdict": "HONEST-FAIL", "phase": "preflight", "cli": cli, "proof": proof, "stdout_bytes": 0}
    mci = "C:/asolaria-acer/federation-remake-1024/tools/multi-cli-invoke/multi-cli-invoke.py"
    t0 = time.time()
    try: p = subprocess.run(["python", mci, "invoke", cli, model or ".", prompt], capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired as e: return {"verdict": "HONEST-FAIL", "phase": "invoke-timeout", "cli": cli, "proof": f"preflight={proof} | subprocess timeout after 60s: {str(e)[:120]}", "stdout_bytes": 0, "ms": int((time.time()-t0)*1000)}
    ms = int((time.time()-t0)*1000)
    try: parsed = json.loads(p.stdout); body = (parsed.get("result") or {}).get("stdout") or ""
    except Exception: body = ""
    body_bytes = len(body.encode("utf-8")); sha = hashlib.sha256(body.encode("utf-8")).hexdigest()[:16]
    if body_bytes == 0 or p.returncode != 0:
        return {"verdict": "HONEST-FAIL", "phase": "post-verify", "cli": cli, "proof": f"preflight={proof} | rc={p.returncode} stdout_bytes=0 stderr={p.stderr[:200]}", "stdout_bytes": 0, "ms": ms}
    return {"verdict": "HONEST-PASS", "cli": cli, "model": model, "stdout_bytes": body_bytes, "stdout_sha16": sha, "stdout_preview": body[:120], "ms": ms, "preflight": proof}
if __name__ == "__main__":
    if len(sys.argv) < 4: print(json.dumps({"usage": "wave-shape-v3-dispatcher.py <cli> <model|.> <prompt>"}, indent=2)); sys.exit(1)
    print(json.dumps(dispatch(sys.argv[1], None if sys.argv[2] == "." else sys.argv[2], sys.argv[3]), indent=2))
