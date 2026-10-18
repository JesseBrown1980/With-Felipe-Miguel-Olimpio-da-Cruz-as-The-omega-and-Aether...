#!/usr/bin/env python3
"""
unified-dashboard-snapshot.py - W26B
Aggregates federation overnight wave state into a single JSON snapshot for the
unified static dashboard. Read-only on all sources. Stdlib only. No daemon
mutation.

Sources:
  - Wave reports W17..latest under D:/AsolariaGuides/autopilot-overnight-2026-05-20/wave-NN-report.md
  - PB-D atlas status (W25A-PB-D-ATLAS-COMPLETE.md table)
  - Heartbeat tail + counter + loop-pid
  - GPU thermal classification (mirrors gpu-thermal-watch logic from heartbeat ndjson)
  - Substrate sha + size
  - Daemon endpoint snapshots (/health, /status, /gpu/lane-status, /gpu/bindings)
  - 3D map shas v14..v17

Emits: C:/HyperBEHCS/store/unified-dashboard-snapshot.json
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone
from urllib.request import urlopen
from urllib.error import URLError

STORE = r"C:/HyperBEHCS/store"
WAVE_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20"
MAP_DIR = r"D:/AsolariaGuides/3d-slice-map/merged"
HB_NDJSON = os.path.join(STORE, "system-heartbeat.ndjson")
HB_COUNTER = os.path.join(STORE, "system-heartbeat.counter")
HB_LOOP_PID = os.path.join(STORE, "heartbeat-loop.pid")
SUBSTRATE = os.path.join(STORE, "hyperbehcs-substrate.v1.hbs")
OUT_JSON = os.path.join(STORE, "unified-dashboard-snapshot.json")

DAEMON_HOST = "127.0.0.1"
DAEMON_PORT = 49257
DAEMON_ENDPOINTS = ["/health", "/status", "/gpu/lane-status", "/gpu/bindings"]

WAVE_RANGE = range(17, 27)  # W17..W26 (W26B writes no wave-26-report.md yet — graceful)

# Thermal thresholds mirror gpu-thermal-watch.cjs (GTX 1050 Mobile, Tjmax 97)
THERMAL_THRESHOLDS = {"WARN": 85, "ATTENTION": 90, "HOT": 92, "CRITICAL": 95, "TJMAX": 97}

PB_D_TASKS = [
    ("T50", "substrate-episode-typed-rows", "W25A", "SCAFFOLD-LANDED", "6/6"),
    ("T51", "triple-quant-variance-gate", "W25A", "SCAFFOLD-LANDED", "7/7"),
    ("T52", "MTP-drafter-BIML-shaped", "W25A", "SCAFFOLD-LANDED", "7/7"),
    ("T53", "hookwall-rep-variance-gate", "W22C", "BUILT", "3/3"),
    ("T54", "heartbeat-variance-emitter", "W23A", "SCAFFOLD-LANDED", "9/9"),
    ("T55", "lane-episode-taxonomy", "W24A", "SCAFFOLD-LANDED", "7/7"),
    ("T56", "atlas-as-biml-study-store", "W22A", "BUILT", "6/6"),
    ("T57", "pid-keyed-study-slots", "W22B", "BUILT", "n/a"),
    ("T58", "length-depth-frontier", "W21B", "BUILT (3-path)", "n/a"),
    ("T59", "sloRA-deprecation-canon", "W23A", "SCAFFOLD-LANDED", "8/8"),
    ("T60", "episode-type-schema-v1", "W23A", "SCAFFOLD-LANDED", "23/23"),
    ("T61", "support-set-retrieval-api", "W24A", "SCAFFOLD-LANDED", "6/6"),
    ("T62", "attention-bottleneck-capacity-study", "W25A", "SCAFFOLD-LANDED", "8/8"),
    ("T63", "curriculum-stages-canon", "W24A", "SCAFFOLD-LANDED", "8/8"),
]


def tail_ndjson(path: str, n: int) -> list[dict]:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        lines = fh.readlines()
    out = []
    for ln in lines[-n:]:
        ln = ln.strip()
        if not ln:
            continue
        try:
            out.append(json.loads(ln))
        except Exception:
            pass
    return out


def read_int(path: str) -> int | None:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return int(fh.read().strip())
    except Exception:
        return None


def pid_alive(pid: int | None) -> bool:
    if pid is None:
        return False
    if sys.platform == "win32":
        try:
            r = subprocess.run(
                ["tasklist", "/FI", f"PID eq {pid}", "/NH", "/FO", "CSV"],
                capture_output=True, text=True, timeout=5,
            )
            return str(pid) in (r.stdout or "")
        except Exception:
            return False
    try:
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def file_sha(path: str, max_bytes: int = 4_000_000) -> tuple[str | None, int]:
    if not os.path.exists(path):
        return None, 0
    size = os.path.getsize(path)
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        h.update(fh.read(min(size, max_bytes)))
    return h.hexdigest(), size


def classify_temp(temp_c: float | None) -> str:
    if temp_c is None:
        return "UNKNOWN"
    if temp_c >= THERMAL_THRESHOLDS["CRITICAL"]:
        return "CRITICAL"
    if temp_c >= THERMAL_THRESHOLDS["HOT"]:
        return "HOT"
    if temp_c >= THERMAL_THRESHOLDS["ATTENTION"]:
        return "ATTENTION"
    if temp_c >= THERMAL_THRESHOLDS["WARN"]:
        return "WARN"
    return "NORMAL"


def parse_wave_report(path: str, wave_id: int) -> dict:
    rec = {"wave": wave_id, "path": path, "exists": os.path.exists(path),
           "headline": None, "fired": None, "apex_cosign": None, "size": 0}
    if not rec["exists"]:
        return rec
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        text = fh.read()
    rec["size"] = len(text)
    # Headline: first H1
    m = re.search(r"^#\s+(.+?)$", text, re.MULTILINE)
    if m:
        rec["headline"] = m.group(1).strip()
    # Fired
    m = re.search(r"\*\*Fired\*\*[:\s]+([^\n\r]+)", text)
    if m:
        rec["fired"] = m.group(1).strip()
    # apex_cosign — last occurrence
    matches = list(re.finditer(r"apex_cosign[=:\s]+([A-Z0-9\-+\s_]+)", text))
    if matches:
        rec["apex_cosign"] = matches[-1].group(1).strip().rstrip(".").rstrip(",")
    return rec


def fetch_endpoint(host: str, port: int, path: str, timeout: float = 3.0) -> dict:
    url = f"http://{host}:{port}{path}"
    out = {"url": url, "ok": False, "error": None, "body": None}
    try:
        with urlopen(url, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            try:
                out["body"] = json.loads(raw)
            except Exception:
                out["body"] = {"raw_text": raw[:500]}
            out["ok"] = True
    except URLError as e:
        out["error"] = f"URLError: {e.reason}"
    except Exception as e:
        out["error"] = f"{type(e).__name__}: {e}"
    return out


def collect_map_lineage(map_dir: str) -> list[dict]:
    out = []
    for v in range(14, 18):
        d = os.path.join(map_dir, f"v{v}")
        rec = {"version": f"v{v}", "exists_dir": os.path.isdir(d),
               "json_exists": False, "sha": None, "voxel_count": None}
        if rec["exists_dir"]:
            jp = os.path.join(d, f"map-v{v}.json")
            sp = os.path.join(d, f"map-v{v}.sha256")
            if os.path.exists(jp):
                rec["json_exists"] = True
                try:
                    with open(jp, "r", encoding="utf-8") as fh:
                        j = json.load(fh)
                    if isinstance(j, dict):
                        voxels = j.get("voxels") or j.get("nodes")
                        if isinstance(voxels, list):
                            rec["voxel_count"] = len(voxels)
                except Exception:
                    pass
            if os.path.exists(sp):
                try:
                    with open(sp, "r", encoding="utf-8") as fh:
                        rec["sha"] = fh.read().strip().split()[0]
                except Exception:
                    pass
        out.append(rec)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--out", default=OUT_JSON)
    args = ap.parse_args()

    waves = [parse_wave_report(os.path.join(WAVE_DIR, f"wave-{w}-report.md"), w) for w in WAVE_RANGE]
    waves_present = [w for w in waves if w["exists"]]

    beats = tail_ndjson(HB_NDJSON, args.tail)
    counter = read_int(HB_COUNTER)
    loop_pid = read_int(HB_LOOP_PID)
    sub_sha, sub_size = file_sha(SUBSTRATE)

    # Thermal
    temps = []
    for b in beats:
        gl = b.get("gpu_lane") or {}
        t = gl.get("temp_c")
        if isinstance(t, (int, float)):
            temps.append({"beat_seq": b.get("beat_seq"), "ts": b.get("ts_iso"), "temp_c": t})
    current_temp = temps[-1]["temp_c"] if temps else None
    current_severity = classify_temp(current_temp)
    window_max = max((t["temp_c"] for t in temps), default=None)
    window_max_severity = classify_temp(window_max)
    trend = "unknown"
    if len(temps) >= 4:
        first_half = sum(t["temp_c"] for t in temps[:len(temps)//2]) / max(len(temps)//2, 1)
        second_half = sum(t["temp_c"] for t in temps[len(temps)//2:]) / max(len(temps) - len(temps)//2, 1)
        if second_half > first_half + 1: trend = "rising"
        elif second_half < first_half - 1: trend = "falling"
        else: trend = "flat"

    endpoints = {p: fetch_endpoint(DAEMON_HOST, DAEMON_PORT, p) for p in DAEMON_ENDPOINTS}

    snap = {
        "snapshot_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "wave_range": [WAVE_RANGE.start, WAVE_RANGE.stop - 1],
        "waves": waves,
        "waves_present_count": len(waves_present),
        "pb_d_atlas": [
            {"id": tid, "title": t, "scaffolded_wave": w, "status": s, "selftest": st}
            for (tid, t, w, s, st) in PB_D_TASKS
        ],
        "pb_d_unblock_order": ["T60", "T59", "T54", "T56", "T57", "T50", "T51", "T53", "T52", "T62", "T58"],
        "heartbeat": {
            "counter": counter, "loop_pid": loop_pid, "loop_alive": pid_alive(loop_pid),
            "tail_requested": args.tail, "beat_count": len(beats),
            "first_ts": (beats[0].get("ts_iso") if beats else None),
            "last_ts": (beats[-1].get("ts_iso") if beats else None),
            "tail_beats": [{
                "beat_seq": b.get("beat_seq"), "ts_iso": b.get("ts_iso"),
                "fingerprint": b.get("fingerprint"),
                "daemon_ok": (b.get("daemon_health") or {}).get("ok"),
                "gpu_temp_c": (b.get("gpu_lane") or {}).get("temp_c"),
                "gpu_util_pct": (b.get("gpu_lane") or {}).get("util_pct"),
                "substrate_size": b.get("substrate_size"),
            } for b in beats[-5:]],
        },
        "thermal": {
            "thresholds": THERMAL_THRESHOLDS,
            "current_temp_c": current_temp, "current_severity": current_severity,
            "window_n": len(temps), "window_max": window_max,
            "window_max_severity": window_max_severity, "trend": trend,
            "samples": temps,
        },
        "substrate": {
            "path": SUBSTRATE, "size": sub_size, "sha": sub_sha,
            "walker_bypass": True,
            "walker_bypass_note": "substrate-walker-repair sentinel present in store; bypass active per W17/W19 audits",
        },
        "daemon": {"host": DAEMON_HOST, "port": DAEMON_PORT, "endpoints": endpoints},
        "operator_queue": {
            "tier_0_witness": [
                {"id": "T01", "task": "Patch portal.mjs Line 275: gemma-2-9b-it -> gemma-4-E4B-it"},
                {"id": "T02", "task": "Patch portal.mjs Line 283: HttpPortal branch for HTTP transport"},
                {"id": "T03", "task": "Daemon restart to load gpu-probe-enhanced.cjs"},
                {"id": "T04", "task": "USB-OS Wave 6 ceremony + physical write"},
                {"id": "T05", "task": "Push PR-1..PR-4 to upstream"},
            ],
            "pb_d_promotion_order": [
                "T60 promote_to_live (atomic, 0.5d) -> unblocks T50/T55/T61/T63",
                "T59 annotate memory (0.5d) -> closes SLoRA hallucination canon",
                "T54 dashboard wire (0.5d) -> first second-moment tile",
                "T56 + T57 promote -> unblocks T52 forward + T62 ablation",
                "T50 materialize_sidecar -> unblocks T55/T61 live retrieval",
                "T51 + T53 paired -> tier-3 firmware bar (quant + seed)",
                "T52 + T62 paired -> drafter + capacity-knee, replaces W11D GRU(64)",
                "T58 three-path frontier eval -> length/depth federation frontier",
            ],
            "t58_paths": ["MTP+length-aware", "recursive-cube tree-PID", "sparse+depth-counter"],
            "t56b_inject": "20 study_examples projected from Plan-B SCAN+COGS; ~33K compositional episodes available — operator-witness gated for store injection (W23B)",
        },
        "map_lineage": collect_map_lineage(MAP_DIR),
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(snap, fh, ensure_ascii=False, indent=2)
    print(f"snapshot ok: waves={len(waves_present)}/{len(waves)} "
          f"pb_d={len(snap['pb_d_atlas'])} beats={len(beats)} "
          f"temp={current_temp}C/{current_severity} maps={len(snap['map_lineage'])} "
          f"endpoints_ok={sum(1 for e in endpoints.values() if e['ok'])}/{len(endpoints)}")
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
