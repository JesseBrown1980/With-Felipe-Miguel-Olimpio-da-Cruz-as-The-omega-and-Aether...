#!/usr/bin/env python3
"""
heartbeat-dashboard-snapshot.py — W24B
Reads the live heartbeat ndjson + counter + loop-pid + substrate file and
emits a JSON snapshot the static dashboard can consume.

Read-only. Stdlib only. No daemon mutation.
"""
from __future__ import annotations
import argparse, hashlib, json, os, sys, time
from datetime import datetime, timezone

STORE = r"C:/HyperBEHCS/store"
HB_NDJSON   = os.path.join(STORE, "system-heartbeat.ndjson")
HB_COUNTER  = os.path.join(STORE, "system-heartbeat.counter")
HB_LOOP_PID = os.path.join(STORE, "heartbeat-loop.pid")
SUBSTRATE   = os.path.join(STORE, "hyperbehcs-substrate.v1.hbs")
OUT_JSON    = os.path.join(STORE, "heartbeat-snapshot.json")


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
        # tasklist /FI "PID eq N" — exit 0 always; check stdout
        import subprocess
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
    read = min(size, max_bytes)
    with open(path, "rb") as fh:
        h.update(fh.read(read))
    return h.hexdigest(), size


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=200)
    ap.add_argument("--out", default=OUT_JSON)
    args = ap.parse_args()

    beats = tail_ndjson(HB_NDJSON, args.tail)
    counter = read_int(HB_COUNTER)
    loop_pid = read_int(HB_LOOP_PID)
    sub_sha, sub_size = file_sha(SUBSTRATE)

    snap = {
        "snapshot_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "counter": counter,
        "loop_pid": loop_pid,
        "loop_alive": pid_alive(loop_pid),
        "substrate_path": SUBSTRATE,
        "substrate_size": sub_size,
        "substrate_sha": sub_sha,
        "tail_requested": args.tail,
        "beat_count": len(beats),
        "beats": beats,
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(snap, fh, ensure_ascii=False, indent=2)

    print(f"snapshot ok: beats={len(beats)} counter={counter} loop_pid={loop_pid} "
          f"alive={snap['loop_alive']} sub_size={sub_size} sub_sha={(sub_sha or '')[:16]}")
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
