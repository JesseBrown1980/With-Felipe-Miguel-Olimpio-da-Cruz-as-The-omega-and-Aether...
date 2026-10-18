#!/usr/bin/env python3
"""
unified-dashboard-build-v7.py - W34C SIDECAR (CAS-Verified + Classifier)

Reads unified-dashboard-v7.html template, runs unified-dashboard-snapshot-v7.py
(unless --skip-snapshot), embeds the resulting JSON into the data island, writes
C:/HyperBEHCS/bin/unified-dashboard-built-v7.html.

SIDECAR DISCIPLINE (per AETHER law 1): does NOT touch v1..v6 template,
snapshot, or built outputs. Stdlib only. No daemon mutation.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
TEMPLATE_HTML = os.path.join(BIN, "unified-dashboard-v7.html")
OUT_HTML = os.path.join(BIN, "unified-dashboard-built-v7.html")
SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v7.json")
SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v7.py")

DATA_ISLAND_RE = re.compile(
    r'(<script\s+id="data"\s+type="application/json">)(.*?)(</script>)',
    re.DOTALL,
)


def run_snapshot(tail: int, refresh_v6: bool) -> None:
    cmd = [sys.executable, SNAPSHOT_PY, "--tail", str(tail), "--out", SNAPSHOT_JSON]
    if refresh_v6:
        cmd.append("--refresh-v6")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.stdout: print(r.stdout.rstrip())
    if r.stderr: print(r.stderr.rstrip(), file=sys.stderr)
    if r.returncode != 0:
        raise SystemExit(f"snapshot-v7 failed rc={r.returncode}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--template", default=TEMPLATE_HTML)
    ap.add_argument("--out", default=OUT_HTML)
    ap.add_argument("--snapshot", default=SNAPSHOT_JSON)
    ap.add_argument("--skip-snapshot", action="store_true")
    ap.add_argument("--refresh-v6", action="store_true",
                    help="Force re-run of v6 snapshot inside v7 sidecar")
    args = ap.parse_args()

    if not args.skip_snapshot:
        run_snapshot(args.tail, args.refresh_v6)

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
    cf = snap.get("cas_fix_v3") or {}
    af = snap.get("audit_v2_heuristic_fix") or {}
    pc = snap.get("preclassifier") or {}
    print(f"built-v7 ok: {args.out}")
    print(f"  size={size} bytes  lines={lines}")
    print(f"  cas_fix_v3: commits={cf.get('commits')} "
          f"retries={cf.get('retries')} "
          f"max_attempts={cf.get('max_attempts')} "
          f"cas_failures={cf.get('cas_failures')} "
          f"v2_converged={cf.get('defect_repro_v2_converged_count')}/"
          f"{cf.get('defect_repro_trial_count')} "
          f"v3_converged={cf.get('defect_repro_v3_converged_count')}/"
          f"{cf.get('defect_repro_trial_count')}")
    print(f"  audit_v2_heuristic_fix: "
          f"before={af.get('heuristic_flag_count_before')} "
          f"after={af.get('heuristic_flag_count_after')} "
          f"_status={af.get('_status')}")
    print(f"  preclassifier: total_pending={pc.get('total_pending')} "
          f"FP={pc.get('proposed_FP_count')} "
          f"TP={pc.get('proposed_TP_count')} "
          f"FPHF={pc.get('proposed_FPHF_count')} "
          f"CV={pc.get('proposed_CV_count')} "
          f"NI={pc.get('proposed_NI_count')} "
          f"_status={pc.get('_status')}")
    print(f"  open: start {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
