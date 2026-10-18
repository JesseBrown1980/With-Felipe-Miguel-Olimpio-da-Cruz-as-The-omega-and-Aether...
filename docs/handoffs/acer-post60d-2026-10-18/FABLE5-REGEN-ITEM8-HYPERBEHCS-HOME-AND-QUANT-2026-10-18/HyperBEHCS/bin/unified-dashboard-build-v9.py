#!/usr/bin/env python3
"""
unified-dashboard-build-v9.py - W38B SIDECAR (Closure + Detector Progression)

Reads unified-dashboard-v9.html template, runs unified-dashboard-snapshot-v9.py
(unless --skip-snapshot), embeds the resulting JSON into the data island, writes
C:/HyperBEHCS/bin/unified-dashboard-built-v9.html.

SIDECAR DISCIPLINE (per AETHER law 1): does NOT touch v1..v8 template,
snapshot, or built outputs. Stdlib only. No daemon mutation.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
TEMPLATE_HTML = os.path.join(BIN, "unified-dashboard-v9.html")
OUT_HTML = os.path.join(BIN, "unified-dashboard-built-v9.html")
SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v9.json")
SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v9.py")

DATA_ISLAND_RE = re.compile(
    r'(<script\s+id="data"\s+type="application/json">)(.*?)(</script>)',
    re.DOTALL,
)


def run_snapshot(tail: int, refresh_v8: bool) -> None:
    cmd = [sys.executable, SNAPSHOT_PY, "--tail", str(tail),
           "--out", SNAPSHOT_JSON]
    if refresh_v8:
        cmd.append("--refresh-v8")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.stdout: print(r.stdout.rstrip())
    if r.stderr: print(r.stderr.rstrip(), file=sys.stderr)
    if r.returncode != 0:
        raise SystemExit(f"snapshot-v9 failed rc={r.returncode}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--template", default=TEMPLATE_HTML)
    ap.add_argument("--out", default=OUT_HTML)
    ap.add_argument("--snapshot", default=SNAPSHOT_JSON)
    ap.add_argument("--skip-snapshot", action="store_true")
    ap.add_argument("--refresh-v8", action="store_true",
                    help="Force re-run of v8 snapshot inside v9 sidecar")
    args = ap.parse_args()

    if not args.skip_snapshot:
        run_snapshot(args.tail, args.refresh_v8)

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
    fc = snap.get("findings_closure_w35b_w37") or {}
    dp = snap.get("audit_detector_progression") or {}
    w37a = snap.get("w37a_smoke_v2") or {}
    w37b = snap.get("w37b_audit_v3") or {}
    print(f"built-v9 ok: {args.out}")
    print(f"  size={size} bytes  lines={lines}")
    print(f"  map_lineage: {len(ml)} versions "
          f"({', '.join(m.get('version','?') for m in ml)})")
    print(f"  findings_closure: {fc.get('closed_count')}/{fc.get('total')} "
          f"CLOSED  _status={fc.get('_status')}")
    print(f"  detector_progression: {'->'.join(dp.get('chain', []))} "
          f"_status={dp.get('_status')}")
    print(f"  w37a: {w37a.get('tests_pass')}/{w37a.get('tests_total')} PASS "
          f"verdict={w37a.get('self_audit_verdict')}")
    print(f"  w37b: {w37b.get('selftest_pass')}/{w37b.get('selftest_total')} "
          f"PASS verdict={w37b.get('self_audit_verdict')}")
    print(f"  open: start {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
