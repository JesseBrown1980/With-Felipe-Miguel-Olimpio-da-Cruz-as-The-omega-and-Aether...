#!/usr/bin/env python3
"""
unified-dashboard-build-v4.py - W30C SIDECAR (AETHER + SHADOW-BLOCK)

Reads unified-dashboard-v4.html template, runs unified-dashboard-snapshot-v4.py
(unless --skip-snapshot), embeds the resulting JSON into the data island, writes
C:/HyperBEHCS/bin/unified-dashboard-built-v4.html.

SIDECAR DISCIPLINE (per AETHER law 1): does NOT touch v1/v2/v3 template,
snapshot, or built output. Stdlib only. No daemon mutation.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
TEMPLATE_HTML = os.path.join(BIN, "unified-dashboard-v4.html")
OUT_HTML      = os.path.join(BIN, "unified-dashboard-built-v4.html")
SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v4.json")
SNAPSHOT_PY   = os.path.join(BIN, "unified-dashboard-snapshot-v4.py")

DATA_ISLAND_RE = re.compile(
    r'(<script\s+id="data"\s+type="application/json">)(.*?)(</script>)',
    re.DOTALL,
)


def run_snapshot(tail: int, refresh_v3: bool) -> None:
    cmd = [sys.executable, SNAPSHOT_PY, "--tail", str(tail), "--out", SNAPSHOT_JSON]
    if refresh_v3:
        cmd.append("--refresh-v3")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.stdout: print(r.stdout.rstrip())
    if r.stderr: print(r.stderr.rstrip(), file=sys.stderr)
    if r.returncode != 0:
        raise SystemExit(f"snapshot-v4 failed rc={r.returncode}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--template", default=TEMPLATE_HTML)
    ap.add_argument("--out", default=OUT_HTML)
    ap.add_argument("--snapshot", default=SNAPSHOT_JSON)
    ap.add_argument("--skip-snapshot", action="store_true")
    ap.add_argument("--refresh-v3", action="store_true",
                    help="Force re-run of v3 snapshot inside v4 sidecar")
    args = ap.parse_args()

    if not args.skip_snapshot:
        run_snapshot(args.tail, args.refresh_v3)

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
    am = snap.get("audit_mode") or {}
    sl = am.get("shadow_ledger") or {}
    rf = am.get("regression_fixtures") or {}
    print(f"built-v4 ok: {args.out}")
    print(f"  size={size} bytes  lines={lines}")
    print(f"  audit_mode: current_mode={am.get('current_mode')} "
          f"live_block={am.get('live_block_status')} "
          f"promotion_ready={am.get('promotion_ready')}")
    print(f"  shadow_ledger: entries={sl.get('total_entries')} "
          f"would_block={sl.get('would_block_count')} "
          f"pending={sl.get('pending_review_count')} "
          f"tp={sl.get('true_positive_count')} fp={sl.get('false_positive_count')} "
          f"exists={sl.get('ledger_exists')}")
    print(f"  fixtures: matched={rf.get('matched_expected')}/{rf.get('total')} "
          f"valid_pass={rf.get('valid_cases_passed')} "
          f"violations_caught={rf.get('violation_cases_caught')} "
          f"fp={rf.get('false_positives')} exists={rf.get('receipt_exists')}")
    print(f"  open: start {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
