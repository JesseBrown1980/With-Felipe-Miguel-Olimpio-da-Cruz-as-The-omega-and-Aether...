#!/usr/bin/env python3
"""
unified-dashboard-build-v6.py - W32C SIDECAR (Ledger Barrier)

Reads unified-dashboard-v6.html template, runs unified-dashboard-snapshot-v6.py
(unless --skip-snapshot), embeds the resulting JSON into the data island, writes
C:/HyperBEHCS/bin/unified-dashboard-built-v6.html.

SIDECAR DISCIPLINE (per AETHER law 1): does NOT touch v1/v2/v3/v4/v5 template,
snapshot, or built outputs. Stdlib only. No daemon mutation.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
TEMPLATE_HTML = os.path.join(BIN, "unified-dashboard-v6.html")
OUT_HTML = os.path.join(BIN, "unified-dashboard-built-v6.html")
SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v6.json")
SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v6.py")

DATA_ISLAND_RE = re.compile(
    r'(<script\s+id="data"\s+type="application/json">)(.*?)(</script>)',
    re.DOTALL,
)


def run_snapshot(tail: int, refresh_v5: bool) -> None:
    cmd = [sys.executable, SNAPSHOT_PY, "--tail", str(tail), "--out", SNAPSHOT_JSON]
    if refresh_v5:
        cmd.append("--refresh-v5")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.stdout: print(r.stdout.rstrip())
    if r.stderr: print(r.stderr.rstrip(), file=sys.stderr)
    if r.returncode != 0:
        raise SystemExit(f"snapshot-v6 failed rc={r.returncode}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--template", default=TEMPLATE_HTML)
    ap.add_argument("--out", default=OUT_HTML)
    ap.add_argument("--snapshot", default=SNAPSHOT_JSON)
    ap.add_argument("--skip-snapshot", action="store_true")
    ap.add_argument("--refresh-v5", action="store_true",
                    help="Force re-run of v5 snapshot inside v6 sidecar")
    args = ap.parse_args()

    if not args.skip_snapshot:
        run_snapshot(args.tail, args.refresh_v5)

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
        raise SystemExit('template has no <script id="data" type="application/json"> island')
    out = DATA_ISLAND_RE.sub(lambda m: m.group(1) + embed + m.group(3), html, count=1)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(out)

    size = os.path.getsize(args.out)
    lines = out.count("\n") + 1
    lss = snap.get("ledger_snapshot_status") or "?"
    rec = snap.get("reconciliation") or {}
    ct = snap.get("concurrency_test") or {}
    print(f"built-v6 ok: {args.out}")
    print(f"  size={size} bytes  lines={lines}")
    print(f"  ledger_snapshot_status={lss}")
    print(f"  reconciliation.pass={rec.get('pass')} "
          f"mismatch_count={rec.get('mismatch_count')} "
          f"last_reconciled_at={rec.get('last_reconciled_at')}")
    print(f"  concurrency_test A={ct.get('scenario_A')} "
          f"B={ct.get('scenario_B')} C={ct.get('scenario_C')} "
          f"overall={ct.get('overall')}")
    print(f"  open: start {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
