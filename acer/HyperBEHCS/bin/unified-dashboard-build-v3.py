#!/usr/bin/env python3
"""
unified-dashboard-build-v3.py - W29B SIDECAR (AETHER HIGH-ASSURANCE)

Reads unified-dashboard-v3.html template, runs unified-dashboard-snapshot-v3.py
(unless --skip-snapshot), embeds the resulting JSON into the data island, writes
C:/HyperBEHCS/bin/unified-dashboard-built-v3.html.

SIDECAR DISCIPLINE (per AETHER law 1): does NOT touch v1 or v2 template,
snapshot, or built output. Stdlib only. No daemon mutation.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
TEMPLATE_HTML = os.path.join(BIN, "unified-dashboard-v3.html")
OUT_HTML      = os.path.join(BIN, "unified-dashboard-built-v3.html")
SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v3.json")
SNAPSHOT_PY   = os.path.join(BIN, "unified-dashboard-snapshot-v3.py")

DATA_ISLAND_RE = re.compile(
    r'(<script\s+id="data"\s+type="application/json">)(.*?)(</script>)',
    re.DOTALL,
)


def run_snapshot(tail: int, refresh_v2: bool) -> None:
    cmd = [sys.executable, SNAPSHOT_PY, "--tail", str(tail), "--out", SNAPSHOT_JSON]
    if refresh_v2:
        cmd.append("--refresh-v2")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.stdout: print(r.stdout.rstrip())
    if r.stderr: print(r.stderr.rstrip(), file=sys.stderr)
    if r.returncode != 0:
        raise SystemExit(f"snapshot-v3 failed rc={r.returncode}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--template", default=TEMPLATE_HTML)
    ap.add_argument("--out", default=OUT_HTML)
    ap.add_argument("--snapshot", default=SNAPSHOT_JSON)
    ap.add_argument("--skip-snapshot", action="store_true")
    ap.add_argument("--refresh-v2", action="store_true",
                    help="Force re-run of v2 snapshot inside v3 sidecar")
    args = ap.parse_args()

    if not args.skip_snapshot:
        run_snapshot(args.tail, args.refresh_v2)

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
    vs = snap.get("vocab_seam") or {}
    ad = snap.get("aether_doctrine") or {}
    print(f"built-v3 ok: {args.out}")
    print(f"  size={size} bytes  lines={lines}")
    print(f"  vocab_seam: current_state={vs.get('current_state')} "
          f"(legacy={vs.get('status_legacy_v2')}) "
          f"bridge_sha={vs.get('bridge_sha_short')} "
          f"guardrail={vs.get('guardrail_status')} "
          f"smoke={vs.get('regression_smoke_pass')}/{vs.get('regression_smoke_fail')} "
          f"collapse_forbidden={vs.get('collapse_forbidden')}")
    print(f"  aether_doctrine: laws={ad.get('laws_count')} "
          f"phrase=\"{ad.get('decision_phrase')}\"")
    print(f"  open: start {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
