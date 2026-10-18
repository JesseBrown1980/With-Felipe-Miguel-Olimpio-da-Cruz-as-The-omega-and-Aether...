#!/usr/bin/env python3
"""
unified-dashboard-build-v5.py - W31C SIDECAR (Fresh Ledger)

Reads unified-dashboard-v5.html template, runs unified-dashboard-snapshot-v5.py
(unless --skip-snapshot), embeds the resulting JSON into the data island, writes
C:/HyperBEHCS/bin/unified-dashboard-built-v5.html.

SIDECAR DISCIPLINE (per AETHER law 1): does NOT touch v1/v2/v3/v4 template,
snapshot, or built outputs. Stdlib only. No daemon mutation.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
TEMPLATE_HTML = os.path.join(BIN, "unified-dashboard-v5.html")
OUT_HTML      = os.path.join(BIN, "unified-dashboard-built-v5.html")
SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v5.json")
SNAPSHOT_PY   = os.path.join(BIN, "unified-dashboard-snapshot-v5.py")

DATA_ISLAND_RE = re.compile(
    r'(<script\s+id="data"\s+type="application/json">)(.*?)(</script>)',
    re.DOTALL,
)


def run_snapshot(tail: int, refresh_v4: bool, queue_limit: int) -> None:
    cmd = [sys.executable, SNAPSHOT_PY,
           "--tail", str(tail),
           "--out", SNAPSHOT_JSON,
           "--queue-limit", str(queue_limit)]
    if refresh_v4:
        cmd.append("--refresh-v4")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.stdout: print(r.stdout.rstrip())
    if r.stderr: print(r.stderr.rstrip(), file=sys.stderr)
    if r.returncode != 0:
        raise SystemExit(f"snapshot-v5 failed rc={r.returncode}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--template", default=TEMPLATE_HTML)
    ap.add_argument("--out", default=OUT_HTML)
    ap.add_argument("--snapshot", default=SNAPSHOT_JSON)
    ap.add_argument("--skip-snapshot", action="store_true")
    ap.add_argument("--refresh-v4", action="store_true",
                    help="Force re-run of v4 snapshot inside v5 sidecar")
    ap.add_argument("--queue-limit", type=int, default=10)
    args = ap.parse_args()

    if not args.skip_snapshot:
        run_snapshot(args.tail, args.refresh_v4, args.queue_limit)

    if not os.path.exists(args.template):
        raise SystemExit(f"template missing: {args.template}")
    if not os.path.exists(args.snapshot):
        raise SystemExit(f"snapshot missing: {args.snapshot}")

    with open(args.template, "r", encoding="utf-8") as fh:
        html = fh.read()
    with open(args.snapshot, "r", encoding="utf-8") as fh:
        snap = json.load(fh)

    embed = json.dumps(snap, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    if not DATA_ISLAND_RE.search(html):
        raise SystemExit('template has no <script id="data" type="application/json"> island')
    out = DATA_ISLAND_RE.sub(lambda m: m.group(1) + embed + m.group(3), html, count=1)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(out)

    size = os.path.getsize(args.out)
    lines = out.count("\n") + 1
    ls = snap.get("ledger_summary") or {}
    am = snap.get("audit_mode") or {}
    print(f"built-v5 ok: {args.out}")
    print(f"  size={size} bytes  lines={lines}")
    print(f"  ledger_summary (FRESH): total={ls.get('total_entries')} "
          f"would_block={ls.get('would_block_count')} "
          f"pending={ls.get('pending_review_count')} "
          f"tp={ls.get('true_positive_count')} fp={ls.get('false_positive_count')}")
    print(f"  fresh_snapshot_at={ls.get('fresh_snapshot_at')} "
          f"update_of_markers={ls.get('update_of_marker_count')} "
          f"raw_lines={ls.get('raw_line_count')}")
    print(f"  pending_review_queue len={len(ls.get('pending_review_queue') or [])}")
    print(f"  audit_mode.promotion_ready={am.get('promotion_ready')} "
          f"(recomputed on fresh counts)")
    print(f"  open: start {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
