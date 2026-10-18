#!/usr/bin/env python3
# asolaria-omnimets-daemon-stub.py
# V42-B6 OMNIMETS poller — tails ~/.asolaria-workers/omnimets-events.ndjson and
# emits per-lane rollup snapshots. Wire-compatible with packages/omnimets/src/mets.ts.
# PID: AGT-forge-omni-runtime-gap-closer-H02DB-V42B6-P00-NRUNGAP01
import json, os, sys, time
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone

EVENTS = Path(os.path.expanduser("~")) / ".asolaria-workers" / "omnimets-events.ndjson"
OUT = Path("C:/HyperBEHCS/data/omnimets-rollup.ndjson")
OUT.parent.mkdir(parents=True, exist_ok=True)
LANES = ("muscular", "skeletal", "nervous", "circulatory", "endocrine", "digestive", "cross")
KINDS = ("DISPATCH", "PROMOTE", "DEFER", "HALT", "ERROR")
POLL_S = float(os.environ.get("OMNIMETS_POLL_S", "10"))

def rollup():
    state = defaultdict(lambda: defaultdict(int))
    if not EVENTS.exists():
        return state
    try:
        for line in EVENTS.read_text(encoding="utf-8", errors="ignore").splitlines():
            try:
                ev = json.loads(line)
                lane = ev.get("lane", "cross")
                kind = (ev.get("event", "") or "").replace("EVT-METS-", "")
                if lane in LANES and kind in KINDS:
                    state[lane][kind] += 1
            except Exception:
                continue
    except Exception as e:
        print(f"[omnimets-stub] read err: {e}", file=sys.stderr)
    return state

def main():
    print(f"[omnimets-stub] tail={EVENTS} out={OUT} poll={POLL_S}s")
    while True:
        snap = rollup()
        row = {"ts": datetime.now(timezone.utc).isoformat(), "primitive": "OMNIMETS",
               "per_lane": {l: dict(snap[l]) for l in LANES}, "events_file_exists": EVENTS.exists()}
        with OUT.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row) + "\n")
        time.sleep(POLL_S)

if __name__ == "__main__":
    main()
