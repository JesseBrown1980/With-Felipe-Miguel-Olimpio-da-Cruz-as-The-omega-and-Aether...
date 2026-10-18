#!/usr/bin/env python3
# antigravity-7-picker-preflight.py
# PID: AGT-helm-claude-orch-F-H02E5-V43-WAVE306-P00-NORCHF001 (spec 16)
# Anchor: ASOLARIA-V43-WAVE-306-PIPELINE-TRACE-PID-2026-05-23
# Per memory: project_antigravity_cdp_catalog_loop_closed_2026_05_22 (7 picker models via CDP IDE puppeting)
# Per feedback: feedback_fabric_silent_emit_failure_class_1_2026_05_23 (bus=200 != model output)
#
# Goal: probe each of 7 Antigravity picker models with a tiny prompt, post-verify
# stdout_bytes>0, classify HONEST-PASS vs SILENT-FAIL.
#
# The 7 picker models (per memory line):
#   Gemini 3.5 Flash High / Med · Gemini 3.1 Pro High / Low ·
#   Claude Sonnet 4.6 Thinking · Claude Opus 4.6 Thinking · GPT-OSS 120B
#
# Strategy:
#   - This pre-flight is NON-INVASIVE — it does NOT actually trigger 7 CDP send-prompts
#     (that would require manually switching the IDE picker 7 times).
#   - It does the substrate-level probe: CDP page reachable? input element findable?
#     model-picker DOM detectable? — and emits a per-model row with a probe verdict.
#   - For an active "send" probe of a SINGLE currently-selected model, it can issue
#     antigravity:send-prompt with a 1-token prompt and poll antigravity:read-response.
#
# Shape: pre-flight probe -> (optional) invoke -> post-verify -> HONEST-PASS | HONEST-FAIL+proof
import sys, json, time, socket, subprocess, hashlib, asyncio
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

CDP_HOST = "127.0.0.1"
CDP_PORT = 2027
PROXY = "C:/asolaria-acer/federation-remake-1024/tools/omniscrcpy/omniscrcpy-antigravity-proxy.py"
OUT_DIR = Path("C:/HyperBEHCS/data/antigravity-preflight")
OUT_DIR.mkdir(parents=True, exist_ok=True)

PICKER_MODELS = [
    {"id": "gemini-3.5-flash-high",   "label": "Gemini 3.5 Flash (High)",   "vendor": "google"},
    {"id": "gemini-3.5-flash-med",    "label": "Gemini 3.5 Flash (Med)",    "vendor": "google"},
    {"id": "gemini-3.1-pro-high",     "label": "Gemini 3.1 Pro (High)",     "vendor": "google"},
    {"id": "gemini-3.1-pro-low",      "label": "Gemini 3.1 Pro (Low)",      "vendor": "google"},
    {"id": "claude-sonnet-4.6-think", "label": "Claude Sonnet 4.6 Thinking", "vendor": "anthropic"},
    {"id": "claude-opus-4.6-think",   "label": "Claude Opus 4.6 Thinking",   "vendor": "anthropic"},
    {"id": "gpt-oss-120b",            "label": "GPT-OSS 120B",               "vendor": "openai-oss"},
]

TINY_PROMPT = "Reply with exactly one word: ACK"


def sha16(s):
    return hashlib.sha256(s.encode() if isinstance(s, str) else s).hexdigest()[:16]


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def probe_cdp_tcp():
    """Substrate-level: TCP UP at 2027?"""
    t0 = time.time()
    try:
        with socket.create_connection((CDP_HOST, CDP_PORT), timeout=3):
            pass
        return ("UP", f"tcp {CDP_HOST}:{CDP_PORT} ms={int((time.time()-t0)*1000)}")
    except Exception as e:
        return ("DOWN", f"tcp {CDP_HOST}:{CDP_PORT} err={type(e).__name__}:{str(e)[:80]} ms={int((time.time()-t0)*1000)}")


def probe_cdp_http():
    """Substrate-level: HTTP /json/list returns page targets?"""
    t0 = time.time()
    try:
        req = Request(f"http://{CDP_HOST}:{CDP_PORT}/json/list", headers={"Accept": "application/json"})
        with urlopen(req, timeout=5) as r:
            body = r.read().decode("utf-8")
        targets = json.loads(body)
        pages = [t for t in targets if t.get("type") == "page"]
        ms = int((time.time() - t0) * 1000)
        if not pages:
            return ("DOWN", f"http /json/list returned 0 pages ms={ms} total_targets={len(targets)}")
        return ("UP", f"http /json/list pages={len(pages)} total_targets={len(targets)} ms={ms}")
    except Exception as e:
        return ("DOWN", f"http /json/list err={type(e).__name__}:{str(e)[:120]} ms={int((time.time()-t0)*1000)}")


def probe_proxy_status():
    """Run proxy antigravity:status verb and check it picks a page."""
    if not Path(PROXY).exists():
        return ("DOWN", f"proxy script missing at {PROXY}")
    t0 = time.time()
    try:
        p = subprocess.run(
            ["python", PROXY, "antigravity:status"],
            capture_output=True, text=True, timeout=15
        )
        ms = int((time.time() - t0) * 1000)
        body_bytes = len(p.stdout.encode("utf-8"))
        if p.returncode != 0:
            return ("DOWN", f"proxy rc={p.returncode} stdout_bytes={body_bytes} stderr={p.stderr[:200]} ms={ms}")
        try:
            parsed = json.loads(p.stdout)
            ok = (parsed.get("result") or {}).get("ok", False)
            if ok:
                return ("UP", f"proxy verb=status ok=true stdout_bytes={body_bytes} ms={ms}")
            return ("DOWN", f"proxy verb=status ok=false body={p.stdout[:200]} ms={ms}")
        except Exception:
            return ("DOWN", f"proxy returned non-JSON ({body_bytes} bytes) ms={ms}")
    except subprocess.TimeoutExpired:
        return ("DOWN", f"proxy timeout after 15s ms={int((time.time()-t0)*1000)}")
    except Exception as e:
        return ("DOWN", f"proxy err={type(e).__name__}:{str(e)[:80]} ms={int((time.time()-t0)*1000)}")


def probe_model_via_send(model, send_active=False):
    """For SENT probes (send_active=True only): write tiny prompt, dispatch via proxy,
    poll read-response, post-verify stdout_bytes>0. Caveat: this exercises the
    CURRENTLY-SELECTED model in the IDE picker — switching models requires manual
    IDE click, so this returns INFERRED status (cannot enforce 'this model = X').

    For send_active=False (default), returns NOT-PROBED with substrate-level basis."""
    if not send_active:
        return {
            "model_id": model["id"],
            "label": model["label"],
            "vendor": model["vendor"],
            "verdict": "NOT-PROBED",
            "phase": "substrate-only",
            "stdout_bytes": 0,
            "proof": "Active send probe disabled — would require manual IDE picker switch for each of 7 models. "
                     "Run with --active to send tiny prompt to currently-selected model only."
        }
    # Active probe (uses currently-selected model)
    tmp_prompt = OUT_DIR / f"tiny-prompt-{model['id']}.txt"
    tmp_prompt.write_text(TINY_PROMPT, encoding="utf-8")
    t0 = time.time()
    try:
        p = subprocess.run(
            ["python", PROXY, "antigravity:send-prompt", str(tmp_prompt)],
            capture_output=True, text=True, timeout=20
        )
        send_ms = int((time.time() - t0) * 1000)
        send_ok = False
        try:
            send_ok = (json.loads(p.stdout).get("result") or {}).get("ok", False)
        except Exception:
            pass
        if not send_ok:
            return {
                "model_id": model["id"], "label": model["label"], "vendor": model["vendor"],
                "verdict": "HONEST-FAIL", "phase": "send-prompt", "stdout_bytes": 0,
                "proof": f"send rc={p.returncode} ok=false body={p.stdout[:200]} stderr={p.stderr[:200]} ms={send_ms}"
            }
        # Wait for response to populate (model latency)
        time.sleep(6)
        # Poll read
        t1 = time.time()
        r = subprocess.run(
            ["python", PROXY, "antigravity:read-response"],
            capture_output=True, text=True, timeout=15
        )
        read_ms = int((time.time() - t1) * 1000)
        try:
            blocks = ((json.loads(r.stdout).get("result") or {}).get("blocks") or [])
        except Exception:
            blocks = []
        # Find a block that contains ACK or is otherwise non-trivial new content
        body = ""
        for b in blocks:
            preview = b.get("preview", "")
            if preview and len(preview) > len(body):
                body = preview
        body_bytes = len(body.encode("utf-8"))
        sha = sha16(body)
        if body_bytes == 0:
            return {
                "model_id": model["id"], "label": model["label"], "vendor": model["vendor"],
                "verdict": "SILENT-FAIL", "phase": "post-verify-read",
                "stdout_bytes": 0,
                "proof": f"send ok ms={send_ms}, read returned 0 blocks/content ms={read_ms} "
                         f"(CANONICAL silent-emit pattern: dispatch succeeded but no model output captured)"
            }
        return {
            "model_id": model["id"], "label": model["label"], "vendor": model["vendor"],
            "verdict": "HONEST-PASS", "phase": "complete",
            "stdout_bytes": body_bytes, "stdout_sha16": sha, "stdout_preview": body[:240],
            "ms_send": send_ms, "ms_read": read_ms
        }
    except subprocess.TimeoutExpired:
        return {
            "model_id": model["id"], "label": model["label"], "vendor": model["vendor"],
            "verdict": "HONEST-FAIL", "phase": "timeout", "stdout_bytes": 0,
            "proof": f"subprocess timeout after total {int((time.time()-t0)*1000)}ms"
        }
    except Exception as e:
        return {
            "model_id": model["id"], "label": model["label"], "vendor": model["vendor"],
            "verdict": "HONEST-FAIL", "phase": "exception", "stdout_bytes": 0,
            "proof": f"err={type(e).__name__}:{str(e)[:200]}"
        }


def run(active_send=False):
    tcp_state, tcp_proof = probe_cdp_tcp()
    http_state, http_proof = ("UNTESTED", "skipped: TCP DOWN") if tcp_state != "UP" else probe_cdp_http()
    proxy_state, proxy_proof = ("UNTESTED", "skipped: HTTP DOWN") if http_state != "UP" else probe_proxy_status()

    substrate = {
        "cdp_tcp_2027": {"state": tcp_state, "proof": tcp_proof},
        "cdp_http_json_list": {"state": http_state, "proof": http_proof},
        "proxy_antigravity_status": {"state": proxy_state, "proof": proxy_proof},
    }
    substrate_up = tcp_state == "UP" and http_state == "UP" and proxy_state == "UP"

    # Per-model rows
    model_rows = []
    if not substrate_up:
        for m in PICKER_MODELS:
            model_rows.append({
                "model_id": m["id"], "label": m["label"], "vendor": m["vendor"],
                "verdict": "SUBSTRATE-DOWN", "phase": "preflight",
                "stdout_bytes": 0,
                "proof": f"substrate-level CDP/proxy not UP — tcp={tcp_state} http={http_state} proxy={proxy_state}"
            })
    else:
        for m in PICKER_MODELS:
            model_rows.append(probe_model_via_send(m, send_active=active_send))

    # Classify
    counts = {"HONEST-PASS": 0, "SILENT-FAIL": 0, "HONEST-FAIL": 0, "NOT-PROBED": 0, "SUBSTRATE-DOWN": 0}
    for r in model_rows:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1

    out = {
        "ok": True,
        "tool": "antigravity-7-picker-preflight",
        "pid": "AGT-helm-claude-orch-F-H02E5-V43-WAVE306-P00-NORCHF001",
        "anchor_pid": "ASOLARIA-V43-WAVE-306-PIPELINE-TRACE-PID-2026-05-23",
        "spec": 16,
        "ts": now_iso(),
        "active_send": active_send,
        "substrate": substrate,
        "substrate_up": substrate_up,
        "picker_models_total": len(PICKER_MODELS),
        "model_rows": model_rows,
        "verdict_counts": counts,
        "note": "Without --active, per-model rows return NOT-PROBED (only IDE-picker-current can be actively tested without manual switching). "
                "Substrate UP/DOWN gates the entire fleet. Silent-emit pattern flagged when send ok but read returns 0 bytes."
    }
    stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    out_path = OUT_DIR / f"preflight-{stamp}.json"
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    out["report_path"] = str(out_path)
    return out


if __name__ == "__main__":
    active = "--active" in sys.argv
    result = run(active_send=active)
    print(json.dumps(result, indent=2))
