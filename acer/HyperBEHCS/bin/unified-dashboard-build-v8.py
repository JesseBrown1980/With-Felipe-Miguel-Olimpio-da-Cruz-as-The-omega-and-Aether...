#!/usr/bin/env python3
"""
unified-dashboard-build-v8.py - W36B SIDECAR (v20 + Audit-v4 + Wake-Up)

Reads unified-dashboard-v8.html template, runs unified-dashboard-snapshot-v8.py
(unless --skip-snapshot), embeds the resulting JSON into the data island, writes
C:/HyperBEHCS/bin/unified-dashboard-built-v8.html.

SIDECAR DISCIPLINE (per AETHER law 1): does NOT touch v1..v7 template,
snapshot, or built outputs. Stdlib only. No daemon mutation.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
TEMPLATE_HTML = os.path.join(BIN, "unified-dashboard-v8.html")
OUT_HTML = os.path.join(BIN, "unified-dashboard-built-v8.html")
SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v8.json")
SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v8.py")

DATA_ISLAND_RE = re.compile(
    r'(<script\s+id="data"\s+type="application/json">)(.*?)(</script>)',
    re.DOTALL,
)


def run_snapshot(tail: int, refresh_v7: bool) -> None:
    cmd = [sys.executable, SNAPSHOT_PY, "--tail", str(tail),
           "--out", SNAPSHOT_JSON]
    if refresh_v7:
        cmd.append("--refresh-v7")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.stdout: print(r.stdout.rstrip())
    if r.stderr: print(r.stderr.rstrip(), file=sys.stderr)
    if r.returncode != 0:
        raise SystemExit(f"snapshot-v8 failed rc={r.returncode}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--template", default=TEMPLATE_HTML)
    ap.add_argument("--out", default=OUT_HTML)
    ap.add_argument("--snapshot", default=SNAPSHOT_JSON)
    ap.add_argument("--skip-snapshot", action="store_true")
    ap.add_argument("--refresh-v7", action="store_true",
                    help="Force re-run of v7 snapshot inside v8 sidecar")
    args = ap.parse_args()

    if not args.skip_snapshot:
        run_snapshot(args.tail, args.refresh_v7)

    if not os.path.exists(args.template):
        raise SystemExit(f"template missing: {args.template}")
    if not os.path.exists(args.snapshot):
        raise SystemExit(f"snapshot missing: {args.snapshot}")

    with open(args.template, "r", encoding="utf-8") as fh:
        html = fh.read()
    with open(args.snapshot, "r", encoding="utf-8") as fh:
        snap = json.load(fh)

    embed = json.dumps(snap, ensure_ascii=False,
                       separators=(",", ":")).replace("</", "<\\/")
    if not DATA_ISLAND_RE.search(html):
        raise SystemExit('template has no <script id="data" '
                         'type="application/json"> island')
    out = DATA_ISLAND_RE.sub(
        lambda m: m.group(1) + embed + m.group(3), html, count=1)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(out)

    size = os.path.getsize(args.out)
    lines = out.count("\n") + 1
    ml = snap.get("map_lineage") or []
    a4 = snap.get("audit_v4") or {}
    wu = snap.get("wake_up_runbook") or {}
    print(f"built-v8 ok: {args.out}")
    print(f"  size={size} bytes  lines={lines}")
    print(f"  map_lineage: {len(ml)} versions "
          f"({', '.join(m.get('version','?') for m in ml)})")
    print(f"  audit_v4: artifacts={a4.get('artifacts_checked')} "
          f"drift={a4.get('drift_count')} "
          f"law7={a4.get('law7_flag_count')} "
          f"non_law7={a4.get('non_law7_findings_total')} "
          f"(law6={a4.get('findings_law6_count')} "
          f"law9={a4.get('findings_law9_count')}) "
          f"_status={a4.get('_status')}")
    print(f"  wake_up_runbook: witness_queue={wu.get('witness_queue_count')} "
          f"sample_at={wu.get('sample_output_captured_at')} "
          f"ledger_pending={wu.get('ledger_pending_count')} "
          f"_status={wu.get('_status')}")
    print(f"  open: start {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
