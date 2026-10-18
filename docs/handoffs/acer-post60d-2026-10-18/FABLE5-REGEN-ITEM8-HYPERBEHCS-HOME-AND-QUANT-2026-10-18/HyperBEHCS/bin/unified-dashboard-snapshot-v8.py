#!/usr/bin/env python3
"""
unified-dashboard-snapshot-v8.py - W36B SIDECAR (AETHER HIGH-ASSURANCE)

NEW IN v8:
  - map_lineage extended to v14..v20 (7 versions, was v14..v17 in v1 baseline)
  - audit_v4 block:           parsed from W35B-cross-wave-integrity-audit-v4.md
      {artifacts_checked, drift_count, law7_flag_count,
       non_law7_findings, findings_law6_count, findings_law9_count,
       audit_path, audit_sha, _status, _verdict}
  - wake_up_runbook block:    parsed from W35C-WAKE-UP-RUNBOOK/ (RECEIPT.md +
                                wake_up.py path + sample run captured in
                                RECEIPT.md)
      {runbook_dir, runbook_md_path, wake_up_py_path, wake_up_py_sha,
       sample_output_captured_at, witness_queue_count, quick_start,
       _status}

Reads (read-only):
  - prior v7 snapshot JSON (load_or_run_v7: invoke v7 script if missing)
  - W35B audit v4 markdown (race-safe PENDING if absent)
  - W35C wake-up runbook RECEIPT.md + wake_up.py (race-safe PENDING if absent)
  - 3d-slice-map merged/v14..v20 dirs (extended lineage)

Emits: C:/HyperBEHCS/store/unified-dashboard-snapshot-v8.json

SIDECAR DISCIPLINE (AETHER law 1 - no in-place mutation):
  - Does NOT overwrite v1..v7 snapshot scripts or their JSON outputs.
  - Re-invokes v7 OR re-reads v7's existing JSON, overlays v8 fields.
  - No daemon mutation. Stdlib only.
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
V7_SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v7.py")
V7_SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v7.json")
OUT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v8.json")

MAP_DIR = r"D:/AsolariaGuides/3d-slice-map/merged"

W35B_PATH_CANDIDATES = [
    r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W35B-cross-wave-integrity-audit-v4.md",
    r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W35B-audit-v4.md",
]

W35C_DIR_CANDIDATES = [
    r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W35C-WAKE-UP-RUNBOOK",
    r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W35C-wake-up-runbook",
]

AGENT_PID = "AGT-VECTOR-VIZ_RENDER-W36B-DASHBOARD-V8-2026-05-21"
APEX_COSIGN = ("OP-AETHER-HIGH-ASSURANCE-W36B + OP-T64-BRIDGE-FIRST "
               "+ OP-W30-SHADOW-BLOCK-FIRST + OP-W32-LEDGER-BARRIER-FIRST")
DECISION_CODE = "OP-AETHER-HIGH-ASSURANCE-W36B"
DECISION_AT = "2026-05-21"


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def file_sha256(path: Optional[str]) -> Optional[str]:
    if not path or not os.path.exists(path):
        return None
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _first_existing(paths) -> Optional[str]:
    for p in paths:
        if os.path.exists(p):
            return p
    return None


def load_or_run_v7(tail: int, refresh: bool) -> dict:
    """Load v7 snapshot. If missing or --refresh-v7, invoke v7 script."""
    need_run = refresh or not os.path.exists(V7_SNAPSHOT_JSON)
    if need_run and os.path.exists(V7_SNAPSHOT_PY):
        try:
            subprocess.run(
                [sys.executable, V7_SNAPSHOT_PY, "--tail", str(tail)],
                capture_output=True, text=True, timeout=180, check=False,
            )
        except Exception:
            pass
    if os.path.exists(V7_SNAPSHOT_JSON):
        try:
            with open(V7_SNAPSHOT_JSON, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            pass
    return {"snapshot_at": _utcnow_iso(), "_v7_unavailable": True}


# --- Extended map lineage (v14..v20) -------------------------------------

def collect_map_lineage_v8(map_dir: str) -> List[Dict[str, Any]]:
    """Re-emit map_lineage extended to v14..v20 (7 versions)."""
    out: List[Dict[str, Any]] = []
    for v in range(14, 21):
        d = os.path.join(map_dir, f"v{v}")
        rec: Dict[str, Any] = {
            "version": f"v{v}",
            "exists_dir": os.path.isdir(d),
            "json_exists": False,
            "sha": None,
            "voxel_count": None,
        }
        if rec["exists_dir"]:
            jp = os.path.join(d, f"map-v{v}.json")
            sp = os.path.join(d, f"map-v{v}.sha256")
            if os.path.exists(jp):
                rec["json_exists"] = True
                try:
                    with open(jp, "r", encoding="utf-8") as fh:
                        j = json.load(fh)
                    if isinstance(j, dict):
                        voxels = j.get("voxels") or j.get("nodes")
                        if isinstance(voxels, list):
                            rec["voxel_count"] = len(voxels)
                        # v20 is descriptor-only: count parent + new voxels
                        elif "new_voxels" in j:
                            nv = j.get("new_voxels")
                            if isinstance(nv, list):
                                # carry-forward parent count + new
                                parent_n = (j.get("parent") or {}).get(
                                    "voxel_count") or 0
                                rec["voxel_count"] = parent_n + len(nv)
                except Exception:
                    pass
            if os.path.exists(sp):
                try:
                    with open(sp, "r", encoding="utf-8") as fh:
                        rec["sha"] = fh.read().strip().split()[0]
                except Exception:
                    pass
        out.append(rec)
    return out


# --- W35B parsers ---------------------------------------------------------

def parse_w35b_audit(audit_path: Optional[str]) -> Dict[str, Any]:
    """Parse W35B cross-wave-integrity-audit-v4.md."""
    out: Dict[str, Any] = {
        "audit_path": audit_path,
        "audit_sha": None,
        "artifacts_checked": None,
        "drift_count": None,
        "law7_flag_count": None,
        "non_law7_findings_total": None,
        "findings_law6_count": None,
        "findings_law9_count": None,
        "verdict_line": None,
        "snapshot_mismatch": None,
        "_status": "W35B audit absent (race-safe PENDING)",
    }
    if not audit_path or not os.path.exists(audit_path):
        return out
    try:
        text = open(audit_path, "r", encoding="utf-8",
                    errors="replace").read()
    except Exception as e:
        out["_status"] = f"W35B audit read error: {e}"
        return out
    out["audit_sha"] = file_sha256(audit_path)

    # Artifacts checked: "Total artifacts checked**: **155**"
    m = re.search(
        r"Total\s*artifacts\s*checked\*+\s*:\s*\*+(\d+)\*+",
        text, re.IGNORECASE)
    if not m:
        m = re.search(
            r"(\d+)\s*artifacts\s*checked\s*across\s*W17",
            text, re.IGNORECASE)
    if m:
        out["artifacts_checked"] = int(m.group(1))

    # Drift counts (sha mismatches + mtime anomalies + live state drift)
    # All zeros expected. Search "0 drift" / "drift: 0"
    drift_zero = re.search(
        r"(?:NO\s+DRIFT|0\s+drift|drift\s*[:=]?\s*0)",
        text, re.IGNORECASE) is not None
    sha_mm = re.search(
        r"sha256\s*mismatches\*+\s*:\s*\*+(\d+)\*+",
        text, re.IGNORECASE)
    if sha_mm:
        out["drift_count"] = int(sha_mm.group(1))
    elif drift_zero:
        out["drift_count"] = 0

    # Law-7 heuristic flag count
    m = re.search(
        r"W34A\s*law-?7\s*heuristic\s*flag\s*count\*+\s*:\s*\*+(\d+)\*+",
        text, re.IGNORECASE)
    if not m:
        m = re.search(
            r"law-?7\s*heuristic\s*flag\s*count.*?(\d+)",
            text, re.IGNORECASE)
    if m:
        out["law7_flag_count"] = int(m.group(1))

    # Non-law-7 findings: "(not new drift)**: 4" + law-6 ×3, law-9 ×1
    m = re.search(
        r"Pre-existing.*?findings\s*exposed[^:]*:\s*\**(\d+)\**",
        text, re.IGNORECASE)
    if not m:
        m = re.search(
            r"non-law-?7\s*detector\s*findings\s*exposed.*?(\d+)",
            text, re.IGNORECASE)
    if m:
        out["non_law7_findings_total"] = int(m.group(1))

    # "law-6 ×3, law-9 ×1" or "split across law-6 (3) and law-9 (1)"
    m6 = re.search(r"law-?6\s*[\(x\xd7]\s*(\d+)\)?", text, re.IGNORECASE)
    if m6:
        out["findings_law6_count"] = int(m6.group(1))
    m9 = re.search(r"law-?9\s*[\(x\xd7]\s*(\d+)\)?", text, re.IGNORECASE)
    if m9:
        out["findings_law9_count"] = int(m9.group(1))

    # snapshot_mismatch
    m = re.search(r"snapshot_mismatch\s*=\s*(True|False)", text)
    if m:
        out["snapshot_mismatch"] = (m.group(1) == "True")

    # VERDICT line
    m = re.search(r"VERDICT[^\n]*?:\s*([^\n]+)", text)
    if not m:
        m = re.search(r"\*\*VERDICT[^*\n]+\*\*", text)
    if m:
        out["verdict_line"] = m.group(0).strip()[:200]

    parsed_any = any(
        out[k] is not None for k in (
            "artifacts_checked", "law7_flag_count",
            "non_law7_findings_total", "drift_count"))
    out["_status"] = "OK (parsed)" if parsed_any \
        else "W35B audit present but no countable fields"
    return out


# --- W35C parsers ---------------------------------------------------------

def parse_w35c_runbook(runbook_dir: Optional[str]) -> Dict[str, Any]:
    """Parse W35C wake-up runbook RECEIPT.md for sample-output + queue count.
    Also captures wake_up.py path + sha + presence of quick-reference + runbook."""
    out: Dict[str, Any] = {
        "runbook_dir": runbook_dir,
        "runbook_md_path": None,
        "receipt_md_path": None,
        "wake_up_py_path": None,
        "wake_up_py_sha": None,
        "wake_up_py_sha16": None,
        "quick_reference_path": None,
        "sample_output_captured_at": None,
        "witness_queue_count": None,
        "quick_start": "python wake_up.py all",
        "ledger_pending_count": None,
        "preclass_fp_count": None,
        "preclass_tp_count": None,
        "preclass_ni_count": None,
        "_status": "W35C runbook absent (race-safe PENDING)",
    }
    if not runbook_dir or not os.path.isdir(runbook_dir):
        return out

    rb_md = os.path.join(runbook_dir, "runbook.md")
    rc_md = os.path.join(runbook_dir, "RECEIPT.md")
    wu_py = os.path.join(runbook_dir, "wake_up.py")
    qr_md = os.path.join(runbook_dir, "quick-reference.md")
    out["runbook_md_path"] = rb_md if os.path.exists(rb_md) else None
    out["receipt_md_path"] = rc_md if os.path.exists(rc_md) else None
    out["wake_up_py_path"] = wu_py if os.path.exists(wu_py) else None
    out["quick_reference_path"] = qr_md if os.path.exists(qr_md) else None
    if out["wake_up_py_path"]:
        sha = file_sha256(out["wake_up_py_path"])
        out["wake_up_py_sha"] = sha
        out["wake_up_py_sha16"] = sha[:16] if sha else None

    if not out["receipt_md_path"]:
        return out
    try:
        text = open(out["receipt_md_path"], "r", encoding="utf-8",
                    errors="replace").read()
    except Exception as e:
        out["_status"] = f"W35C receipt read error: {e}"
        return out

    # Sample output captured: "(captured 2026-05-21T09:12Z)"
    m = re.search(
        r"captured\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z)",
        text, re.IGNORECASE)
    if m:
        out["sample_output_captured_at"] = m.group(1)

    # Witness queue count: "14 items pending operator action."
    m = re.search(
        r"(\d+)\s+items\s+pending\s+operator\s+action",
        text, re.IGNORECASE)
    if m:
        out["witness_queue_count"] = int(m.group(1))

    # Ledger summary inside sample output
    m = re.search(r"total\s*:\s*(\d+)", text)
    if m:
        out["ledger_pending_count"] = int(m.group(1))
    m = re.search(r"FALSE-POSITIVE\s+(\d+)", text)
    if m:
        out["preclass_fp_count"] = int(m.group(1))
    m = re.search(r"TRUE-POSITIVE\s+(\d+)", text)
    if m:
        out["preclass_tp_count"] = int(m.group(1))
    m = re.search(r"NEEDS-INVESTIGATION\s+(\d+)", text)
    if m:
        out["preclass_ni_count"] = int(m.group(1))

    # Quick start phrase override (defensive)
    m = re.search(r"`python\s+wake_up\.py\s+all`", text)
    if m:
        out["quick_start"] = "python wake_up.py all"

    parsed_any = any(
        out[k] is not None for k in (
            "sample_output_captured_at", "witness_queue_count",
            "ledger_pending_count"))
    out["_status"] = "OK (parsed)" if parsed_any \
        else "W35C receipt present but no countable fields"
    return out


# --- main -----------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--out", default=OUT_JSON)
    ap.add_argument("--refresh-v7", action="store_true",
                    help="Re-run v7 snapshot before overlaying v8")
    args = ap.parse_args()

    base = dict(load_or_run_v7(args.tail, args.refresh_v7))
    base["snapshot_at_v8"] = _utcnow_iso()
    base["sidecar"] = {
        "variant": "v8",
        "wave": "W36B",
        "agent_pid": AGENT_PID,
        "apex_cosign": APEX_COSIGN,
        "decision_code": DECISION_CODE,
        "decision_at": DECISION_AT,
        "supersedes": ["v1", "v2", "v3", "v4", "v5", "v6", "v7"],
        "discipline": ("AETHER HIGH-ASSURANCE - sidecar-only, read-only on "
                       "prior waves"),
        "v8_purpose": ("v20 map lineage extension (W35A) + audit v4 results "
                       "(W35B) + wake-up runbook surface (W35C)"),
    }

    # Override map_lineage to extended v14..v20 (keep v7 entry intact in
    # _v7_map_lineage so prior consumers can still find it)
    prior_map = base.get("map_lineage")
    base["map_lineage"] = collect_map_lineage_v8(MAP_DIR)
    if prior_map is not None:
        base["_v7_map_lineage"] = prior_map

    # Parse W35B audit v4 (race-safe)
    audit_path = _first_existing(W35B_PATH_CANDIDATES)
    audit_v4 = parse_w35b_audit(audit_path)
    base["audit_v4"] = audit_v4

    # Parse W35C wake-up runbook (race-safe)
    rb_dir = _first_existing(W35C_DIR_CANDIDATES)
    wake_up = parse_w35c_runbook(rb_dir)
    base["wake_up_runbook"] = wake_up

    base["v8_sources"] = {
        "w35b_audit": {"path": audit_path,
                       "exists": audit_path is not None,
                       "sha": file_sha256(audit_path)},
        "w35c_runbook_dir": {"path": rb_dir,
                             "exists": rb_dir is not None,
                             "receipt_sha": file_sha256(
                                 wake_up.get("receipt_md_path")),
                             "wake_up_py_sha": wake_up.get("wake_up_py_sha")},
        "map_v20": {"path": os.path.join(MAP_DIR, "v20", "map-v20.json"),
                    "exists": os.path.exists(
                        os.path.join(MAP_DIR, "v20", "map-v20.json")),
                    "sha": file_sha256(
                        os.path.join(MAP_DIR, "v20", "map-v20.json"))},
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(base, fh, ensure_ascii=False, indent=2)

    print(f"snapshot-v8 ok: "
          f"map_lineage_versions={len(base['map_lineage'])} "
          f"audit_v4.artifacts={audit_v4.get('artifacts_checked')} "
          f"drift={audit_v4.get('drift_count')} "
          f"law7={audit_v4.get('law7_flag_count')} "
          f"non_law7={audit_v4.get('non_law7_findings_total')} "
          f"(law6={audit_v4.get('findings_law6_count')} "
          f"law9={audit_v4.get('findings_law9_count')})")
    print(f"  audit_v4._status={audit_v4['_status']}")
    print(f"  wake_up_runbook.witness_queue_count="
          f"{wake_up.get('witness_queue_count')} "
          f"sample_at={wake_up.get('sample_output_captured_at')} "
          f"_status={wake_up['_status']}")
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
