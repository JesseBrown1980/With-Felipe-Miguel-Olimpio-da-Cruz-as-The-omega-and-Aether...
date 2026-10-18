#!/usr/bin/env python3
"""
heartbeat-dashboard-build.py — W24B
Combines the template heartbeat-dashboard.html with a freshly generated
snapshot JSON, producing heartbeat-dashboard-built.html that the operator
can double-click open in any browser. Pure stdlib, no daemon mutation.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
TEMPLATE_HTML = os.path.join(BIN, "heartbeat-dashboard.html")
OUT_HTML      = os.path.join(BIN, "heartbeat-dashboard-built.html")
SNAPSHOT_JSON = os.path.join(STORE, "heartbeat-snapshot.json")
SNAPSHOT_PY   = os.path.join(BIN, "heartbeat-dashboard-snapshot.py")

# Matches:  <script id="data" type="application/json">...</script>
DATA_ISLAND_RE = re.compile(
    r'(<script\s+id="data"\s+type="application/json">)(.*?)(</script>)',
    re.DOTALL,
)


def run_snapshot(tail: int) -> None:
    r = subprocess.run(
        [sys.executable, SNAPSHOT_PY, "--tail", str(tail), "--out", SNAPSHOT_JSON],
        capture_output=True, text=True,
    )
    if r.stdout:
        print(r.stdout.rstrip())
    if r.stderr:
        print(r.stderr.rstrip(), file=sys.stderr)
    if r.returncode != 0:
        raise SystemExit(f"snapshot failed rc={r.returncode}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=200)
    ap.add_argument("--template", default=TEMPLATE_HTML)
    ap.add_argument("--out", default=OUT_HTML)
    ap.add_argument("--snapshot", default=SNAPSHOT_JSON)
    ap.add_argument("--skip-snapshot", action="store_true",
                    help="reuse existing snapshot json instead of regenerating")
    args = ap.parse_args()

    if not args.skip_snapshot:
        run_snapshot(args.tail)

    if not os.path.exists(args.template):
        raise SystemExit(f"template missing: {args.template}")
    if not os.path.exists(args.snapshot):
        raise SystemExit(f"snapshot missing: {args.snapshot}")

    with open(args.template, "r", encoding="utf-8") as fh:
        html = fh.read()
    with open(args.snapshot, "r", encoding="utf-8") as fh:
        snap_text = fh.read().strip()

    # Validate snapshot json (raises if bad). Re-dump compact for embedding.
    snap = json.loads(snap_text)
    embed = json.dumps(snap, ensure_ascii=False, separators=(",", ":"))
    # Defensive escape — JSON inside <script> must not contain literal </script.
    embed = embed.replace("</", "<\\/")

    if not DATA_ISLAND_RE.search(html):
        raise SystemExit("template has no <script id=\"data\" type=\"application/json\"> island")

    out = DATA_ISLAND_RE.sub(lambda m: m.group(1) + embed + m.group(3), html, count=1)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(out)

    size = os.path.getsize(args.out)
    lines = out.count("\n") + 1
    beats = len(snap.get("beats") or [])
    print(f"built ok: {args.out}")
    print(f"  size={size} bytes  lines={lines}  embedded_beats={beats}")
    print(f"  open: start {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
