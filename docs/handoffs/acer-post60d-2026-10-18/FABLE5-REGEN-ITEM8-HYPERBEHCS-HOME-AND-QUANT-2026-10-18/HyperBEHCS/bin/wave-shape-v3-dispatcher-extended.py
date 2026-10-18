#!/usr/bin/env python3
# wave-shape-v3-dispatcher-extended.py
# PID: AGT-helm-claude-orch-F-H02E5-V43-WAVE306-P00-NORCHF001 (spec 17)
# Anchor: ASOLARIA-V43-WAVE-306-PIPELINE-TRACE-PID-2026-05-23
# Extends C:/HyperBEHCS/bin/wave-shape-v3-dispatcher.py with:
#   (a) parallel mode (concurrent.futures, capped at N)
#   (b) retry-with-backoff on transient failures (DOWN, timeout, transient HTTP)
#   (c) cosign-daemon auto-append per dispatch (POST :4953/api/cosign/append)
# Per feedback_fabric_silent_emit_failure_class_1_2026_05_23 (stdout_bytes>0 post-verify).
import sys, json, time, socket, shutil, subprocess, urllib.request, urllib.error, hashlib, argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Reuse PREFLIGHT, dispatch, probe contract from sibling but inline for stand-alone
PREFLIGHT = {
    "lmstudio":    ("http", "127.0.0.1", 1234, "/v1/models"),
    "ollama":      ("http", "127.0.0.1", 11434, "/api/tags"),
    "asolaria":    ("http", "127.0.0.1", 4781, "/health"),
    "gemini":      ("https", "generativelanguage.googleapis.com", 443, "/"),
    "openai":      ("https", "api.openai.com", 443, "/v1/models"),
    "antigravity": ("tcp",  "127.0.0.1", 64212, None),
    "gemma-local": ("bin",  "gemini", None, None),
    "opencode":    ("bin",  "opencode", None, None),
    "codex":       ("bin",  "codex", None, None),
}

MCI = "C:/asolaria-acer/federation-remake-1024/tools/multi-cli-invoke/multi-cli-invoke.py"
COSIGN_URL = "http://127.0.0.1:4953/api/cosign/append"
ANCHOR_PID = "ASOLARIA-V43-WAVE-306-PIPELINE-TRACE-PID-2026-05-23"
TOOL_PID = "AGT-helm-claude-orch-F-H02E5-V43-WAVE306-P00-NORCHF001"

# Transient-class errors trigger retry
TRANSIENT_PHASES = {"preflight", "invoke-timeout"}
TRANSIENT_NAMES = {"TimeoutError", "ConnectionRefusedError", "OSError", "URLError"}


def sha16(s):
    return hashlib.sha256(s.encode() if isinstance(s, str) else s).hexdigest()[:16]


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def probe(cli):
    sch = PREFLIGHT.get(cli)
    if not sch:
        return ("UNKNOWN", f"no preflight schema for {cli}")
    kind, host, port, path = sch
    t0 = time.time()
    try:
        if kind == "bin":
            ok = bool(shutil.which(host))
            return ("UP" if ok else "DOWN", f"bin={host} which={ok} ms={int((time.time()-t0)*1000)}")
        if kind == "tcp":
            with socket.create_connection((host, port), timeout=3):
                pass
            return ("UP", f"tcp {host}:{port} ms={int((time.time()-t0)*1000)}")
        url = f"{kind}://{host}:{port}{path}"
        req = urllib.request.Request(url, method="GET")
        try:
            code = urllib.request.urlopen(req, timeout=4).status
        except urllib.error.HTTPError as e:
            code = e.code
        return (("UP" if code < 500 else "DOWN"), f"{url} http={code} ms={int((time.time()-t0)*1000)}")
    except Exception as e:
        return ("DOWN", f"{kind}://{host}:{port} err={type(e).__name__}:{str(e)[:80]} ms={int((time.time()-t0)*1000)}")


def dispatch_once(cli, model, prompt):
    state, proof = probe(cli)
    if state != "UP":
        return {"verdict": "HONEST-FAIL", "phase": "preflight", "cli": cli, "proof": proof, "stdout_bytes": 0}
    t0 = time.time()
    try:
        p = subprocess.run(
            ["python", MCI, "invoke", cli, model or ".", prompt],
            capture_output=True, text=True, timeout=60
        )
    except subprocess.TimeoutExpired as e:
        return {"verdict": "HONEST-FAIL", "phase": "invoke-timeout", "cli": cli,
                "proof": f"preflight={proof} | subprocess timeout after 60s",
                "stdout_bytes": 0, "ms": int((time.time()-t0)*1000)}
    ms = int((time.time() - t0) * 1000)
    try:
        parsed = json.loads(p.stdout)
        body = (parsed.get("result") or {}).get("stdout") or ""
    except Exception:
        body = ""
    body_bytes = len(body.encode("utf-8"))
    sha = sha16(body)
    if body_bytes == 0 or p.returncode != 0:
        return {"verdict": "HONEST-FAIL", "phase": "post-verify", "cli": cli,
                "proof": f"preflight={proof} | rc={p.returncode} stdout_bytes=0 stderr={p.stderr[:200]}",
                "stdout_bytes": 0, "ms": ms}
    return {"verdict": "HONEST-PASS", "cli": cli, "model": model,
            "stdout_bytes": body_bytes, "stdout_sha16": sha, "stdout_preview": body[:120],
            "ms": ms, "preflight": proof}


def is_transient(result):
    """Decide if a HONEST-FAIL is transient (worth retrying) vs hard (don't retry)."""
    if result.get("verdict") != "HONEST-FAIL":
        return False
    phase = result.get("phase", "")
    if phase in TRANSIENT_PHASES:
        return True
    proof = result.get("proof", "")
    return any(name in proof for name in TRANSIENT_NAMES)


def dispatch_with_retry(cli, model, prompt, max_retries=3, base_backoff_s=1.5):
    attempts = []
    delay = base_backoff_s
    for attempt in range(1, max_retries + 1):
        r = dispatch_once(cli, model, prompt)
        r["attempt"] = attempt
        attempts.append({"attempt": attempt, "verdict": r["verdict"], "phase": r.get("phase"), "ms": r.get("ms")})
        if r["verdict"] == "HONEST-PASS":
            r["attempts_log"] = attempts
            return r
        if not is_transient(r) or attempt == max_retries:
            r["attempts_log"] = attempts
            r["retried"] = attempt - 1
            return r
        time.sleep(delay)
        delay *= 2  # exponential
    r["attempts_log"] = attempts
    return r


def cosign_append(payload):
    """POST a row to the cosign-chain daemon. Returns {seq, row_hash} or {error}."""
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            COSIGN_URL, data=data,
            headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            body = r.read().decode("utf-8")
        return json.loads(body)
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}:{str(e)[:200]}"}


def dispatch_with_cosign(cli, model, prompt, max_retries=3):
    r = dispatch_with_retry(cli, model, prompt, max_retries=max_retries)
    cosign_payload = {
        "tool": "wave-shape-v3-dispatcher-extended",
        "anchor_pid": ANCHOR_PID,
        "tool_pid": TOOL_PID,
        "dispatch": {
            "cli": cli, "model": model,
            "verdict": r.get("verdict"), "phase": r.get("phase"),
            "stdout_bytes": r.get("stdout_bytes", 0),
            "stdout_sha16": r.get("stdout_sha16"),
            "ms": r.get("ms"), "attempts": r.get("attempts_log"),
            "retried": r.get("retried", 0),
        },
        "spec": 17,
    }
    cosign_resp = cosign_append(cosign_payload)
    r["cosign"] = cosign_resp
    return r


def run_parallel(envelopes, parallel=4, max_retries=3):
    """envelopes = list of {cli, model, prompt}. Returns list of dispatch results."""
    results = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=parallel) as ex:
        future_map = {
            ex.submit(dispatch_with_cosign, e["cli"], e.get("model"), e["prompt"], max_retries): e
            for e in envelopes
        }
        for fut in as_completed(future_map):
            env = future_map[fut]
            try:
                r = fut.result()
            except Exception as e:
                r = {"verdict": "HONEST-FAIL", "phase": "executor-exception",
                     "cli": env["cli"], "proof": f"{type(e).__name__}:{str(e)[:200]}", "stdout_bytes": 0}
            r["envelope"] = env
            results.append(r)
    total_ms = int((time.time() - t0) * 1000)
    counts = {"HONEST-PASS": 0, "HONEST-FAIL": 0}
    for r in results:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
    return {"ok": True, "total_ms": total_ms, "envelopes": len(envelopes),
            "parallel": parallel, "verdict_counts": counts, "results": results}


def main():
    ap = argparse.ArgumentParser(description="wave-shape-v3 extended: parallel + retry + cosign")
    ap.add_argument("--mode", choices=("single", "batch"), default="single")
    ap.add_argument("--cli", help="single mode: cli name")
    ap.add_argument("--model", default=None, help="single mode: model id (or omit)")
    ap.add_argument("--prompt", help="single mode: prompt string")
    ap.add_argument("--envelopes", help="batch mode: path to ndjson of {cli, model, prompt}")
    ap.add_argument("--parallel", type=int, default=3, help="batch mode: parallel workers")
    ap.add_argument("--retries", type=int, default=3, help="max attempts on transient failure")
    args = ap.parse_args()

    if args.mode == "single":
        if not args.cli or not args.prompt:
            print(json.dumps({"ok": False, "error": "single mode requires --cli and --prompt"}, indent=2))
            sys.exit(1)
        r = dispatch_with_cosign(args.cli, args.model, args.prompt, max_retries=args.retries)
        print(json.dumps(r, indent=2))
    else:
        if not args.envelopes:
            print(json.dumps({"ok": False, "error": "batch mode requires --envelopes"}, indent=2))
            sys.exit(1)
        envelopes = []
        for line in Path(args.envelopes).read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                envelopes.append(json.loads(line))
            except Exception:
                pass
        r = run_parallel(envelopes, parallel=args.parallel, max_retries=args.retries)
        print(json.dumps(r, indent=2))


if __name__ == "__main__":
    main()
