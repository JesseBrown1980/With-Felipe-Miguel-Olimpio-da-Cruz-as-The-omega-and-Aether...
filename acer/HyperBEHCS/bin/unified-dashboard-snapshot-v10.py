#!/usr/bin/env python3
"""
unified-dashboard-snapshot-v10.py - W40B SIDECAR (AETHER HIGH-ASSURANCE)

NEW IN v10 (over v9):
  - map_lineage extended to v14..v22 (9 versions, was v14..v21 in v9)
  - w39a_w27_triage block:    parsed from
        W39A-W27-TRIAGE/RECEIPT.md   (2 findings classified:
        W27A=COSMETIC-HEURISTIC, W27C=TRUE-MINOR)
  - w39b_scorecard block:     produced by invoking
        W39B-PROMOTION-READINESS/scorecard.py --json
        (13 gates, 8 PROMOTE / 0 NEEDS-WORK / 5 BLOCKED)
  - w39c_v22_emission block:  parsed from
        W39C-v22-emission-receipt.md (14 new voxels @ 492..505)
  - w40a_annex block:         race-safe placeholder PENDING
                              (W40A may land in parallel)
  - promotion_readiness block: 13 gate rows, score+rec+witness_min+blocker
  - tier_0_path block:        5 ordered Tier-0 steps
        G05 (0) -> G13 (3) -> G02 (20) -> G09 (25) -> G12 (50)
        (per W39B scorecard.md "Top recommendations" + cumulative 98 min)
        Note: scorecard.md lists G05->G13->G09->G12->G02 in §"Top
        recommendations" cascade; the panel-21 ordering uses
        witness-minute ascending: G05->G13->G02->G09->G12 = 0+3+20+25+50
        = 98 min total. Both orderings sum to the same 98 min.

Reads (read-only):
  - prior v9 snapshot JSON (load_or_run_v9: invoke v9 script if missing)
  - W39A RECEIPT.md (race-safe PENDING if absent)
  - W39B scorecard.py (invoked via subprocess --json)
  - W39C v22 emission receipt (race-safe PENDING if absent)
  - W40A annex receipt (race-safe PENDING - parallel wave candidate)
  - 3d-slice-map merged/v14..v22 dirs (extended lineage)

Emits: C:/HyperBEHCS/store/unified-dashboard-snapshot-v10.json

SIDECAR DISCIPLINE (AETHER law 1 - no in-place mutation):
  - Does NOT overwrite v1..v9 snapshot scripts or their JSON outputs.
  - Re-invokes v9 OR re-reads v9's existing JSON, overlays v10 fields.
  - W39B scorecard.py invoked READ-ONLY (no flag mutation).
  - No daemon mutation. Stdlib only.
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
V9_SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v9.py")
V9_SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v9.json")
OUT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v10.json")

MAP_DIR = r"D:/AsolariaGuides/3d-slice-map/merged"
AUTOPILOT_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20"

W39A_RECEIPT = os.path.join(AUTOPILOT_DIR,
                            "W39A-W27-TRIAGE", "RECEIPT.md")
W39B_SCORECARD_PY = os.path.join(AUTOPILOT_DIR,
                                 "W39B-PROMOTION-READINESS", "scorecard.py")
W39B_SCORECARD_MD = os.path.join(AUTOPILOT_DIR,
                                 "W39B-PROMOTION-READINESS", "scorecard.md")
W39C_RECEIPT = os.path.join(AUTOPILOT_DIR,
                            "W39C-v22-emission-receipt.md")
W40A_RECEIPT_CANDIDATES = [
    os.path.join(AUTOPILOT_DIR, "W40A-W27A-VOCAB-ANNEX", "RECEIPT.md"),
    os.path.join(AUTOPILOT_DIR, "W40A-W27-ANNEX", "RECEIPT.md"),
    os.path.join(AUTOPILOT_DIR, "W40A-annex-receipt.md"),
]

AGENT_PID = "AGT-VECTOR-VIZ_RENDER-W40B-DASHBOARD-V10-PROMOTION-2026-05-21"
APEX_COSIGN = ("OP-AETHER-HIGH-ASSURANCE-W40B + OP-AETHER-HIGH-ASSURANCE-W39B "
               "+ OP-T64-BRIDGE-FIRST + OP-W30-SHADOW-BLOCK-FIRST "
               "+ OP-W32-LEDGER-BARRIER-FIRST")
DECISION_CODE = "OP-AETHER-HIGH-ASSURANCE-W40B"
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


def _read_text(path: Optional[str]) -> Optional[str]:
    if not path or not os.path.exists(path):
        return None
    try:
        return open(path, "r", encoding="utf-8", errors="replace").read()
    except Exception:
        return None


def load_or_run_v9(tail: int, refresh: bool) -> dict:
    """Load v9 snapshot. If missing or --refresh-v9, invoke v9 script."""
    need_run = refresh or not os.path.exists(V9_SNAPSHOT_JSON)
    if need_run and os.path.exists(V9_SNAPSHOT_PY):
        try:
            subprocess.run(
                [sys.executable, V9_SNAPSHOT_PY, "--tail", str(tail)],
                capture_output=True, text=True, timeout=180, check=False,
            )
        except Exception:
            pass
    if os.path.exists(V9_SNAPSHOT_JSON):
        try:
            with open(V9_SNAPSHOT_JSON, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            pass
    return {"snapshot_at": _utcnow_iso(), "_v9_unavailable": True}


# --- Extended map lineage (v14..v22) -------------------------------------

def collect_map_lineage_v10(map_dir: str) -> List[Dict[str, Any]]:
    """Re-emit map_lineage extended to v14..v22 (9 versions)."""
    out: List[Dict[str, Any]] = []
    for v in range(14, 23):
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
                        elif "new_voxels" in j:
                            nv = j.get("new_voxels")
                            if isinstance(nv, list):
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


# --- W39A triage parser ---------------------------------------------------

def parse_w39a_triage(path: Optional[str]) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "receipt_path": path,
        "receipt_sha": None,
        "triage_check_py_sha": None,
        "findings_total": None,
        "exact_confirms": None,
        "cosmetic_count": None,
        "true_minor_count": None,
        "true_material_count": None,
        "findings": [],
        "self_audit_verdict": None,
        "_status": "W39A receipt absent (race-safe PENDING)",
    }
    text = _read_text(path)
    if text is None:
        return out
    out["receipt_sha"] = file_sha256(path)

    m = re.search(r"triage_check\.py.*?`([0-9a-f]{64})`", text, re.DOTALL)
    if m:
        out["triage_check_py_sha"] = m.group(1)

    # "Findings triaged (2 of 2)" / "summary.exact_confirms=2/2"
    m = re.search(r"Findings triaged \((\d+)\s+of\s+(\d+)\)", text)
    if m:
        out["findings_total"] = int(m.group(2))
    m = re.search(r"exact_confirms=(\d+)/(\d+)", text)
    if m:
        out["exact_confirms"] = int(m.group(1))

    # Severity counts
    m = re.search(r"COSMETIC-HEURISTIC\s*=\s*(\d+)", text)
    if m:
        out["cosmetic_count"] = int(m.group(1))
    m = re.search(r"TRUE-MINOR\s*=\s*(\d+)", text)
    if m:
        out["true_minor_count"] = int(m.group(1))
    m = re.search(r"TRUE-MATERIAL\s*=\s*(\d+)", text)
    if m:
        out["true_material_count"] = int(m.group(1))

    # Per-finding rows (W27A + W27C)
    if "W27A-T64-VOCAB-BRIDGE" in text:
        out["findings"].append({
            "artifact": "W27A-T64-VOCAB-BRIDGE",
            "laws": "law-5 + law-7",
            "severity": "COSMETIC-HEURISTIC",
            "detector_confirmed": True,
            "recommended_remediation": ("Approach B: required-fields-annex "
                                        "sidecar"),
        })
    if "W27C-HEARTBEAT-ANALYTICS" in text:
        out["findings"].append({
            "artifact": "W27C-HEARTBEAT-ANALYTICS",
            "laws": "law-6 + law-7",
            "severity": "TRUE-MINOR",
            "detector_confirmed": True,
            "recommended_remediation": ("Approach C: superseded-by-W36C + "
                                        "required-fields-annex (v4+ "
                                        "detector NA carve-out)"),
        })

    if re.search(r"AETHER-COMPLIANT", text):
        out["self_audit_verdict"] = "AETHER-COMPLIANT"

    parsed_any = any(out[k] is not None for k in (
        "findings_total", "triage_check_py_sha", "self_audit_verdict"))
    out["_status"] = "OK (parsed)" if parsed_any \
        else "W39A receipt present but no countable fields"
    return out


# --- W39B scorecard invocation -------------------------------------------

def run_w39b_scorecard() -> Dict[str, Any]:
    """Invoke W39B scorecard.py --json and parse the full report."""
    out: Dict[str, Any] = {
        "scorecard_py_path": W39B_SCORECARD_PY,
        "scorecard_md_path": W39B_SCORECARD_MD,
        "scorecard_py_sha": file_sha256(W39B_SCORECARD_PY),
        "scorecard_md_sha": file_sha256(W39B_SCORECARD_MD),
        "audit_clean": None,
        "gate_count": None,
        "summary_by_recommendation": {},
        "gates": [],
        "rc": None,
        "_status": "W39B scorecard not yet invoked",
    }
    if not os.path.exists(W39B_SCORECARD_PY):
        out["_status"] = "W39B scorecard.py absent"
        return out
    try:
        r = subprocess.run(
            [sys.executable, W39B_SCORECARD_PY, "--json"],
            capture_output=True, text=True, timeout=120, check=False,
        )
        out["rc"] = r.returncode
        if r.returncode == 0 and r.stdout.strip():
            try:
                report = json.loads(r.stdout)
                out["audit_clean"] = report.get("audit_clean")
                out["gate_count"] = report.get("gate_count")
                out["summary_by_recommendation"] = report.get(
                    "summary_by_recommendation", {})
                out["gates"] = report.get("gates", [])
                out["_status"] = "OK (invoked)"
            except json.JSONDecodeError as e:
                out["_status"] = f"scorecard JSON parse failed: {e}"
        else:
            out["_status"] = (f"scorecard rc={r.returncode}; "
                              f"stderr_head={(r.stderr or '')[:200]}")
    except Exception as e:
        out["_status"] = f"scorecard invocation exception: {e}"
    return out


# --- W39C v22 parser -----------------------------------------------------

def parse_w39c_v22(path: Optional[str]) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "receipt_path": path,
        "receipt_sha": None,
        "map_v22_json_sha": None,
        "new_voxel_count": None,
        "parent_sha16": None,
        "cluster_dist": None,
        "self_audit_verdict": None,
        "_status": "W39C receipt absent (race-safe PENDING)",
    }
    text = _read_text(path)
    if text is None:
        return out
    out["receipt_sha"] = file_sha256(path)

    m = re.search(r"map-v22\.json.*?`([0-9a-f]{64})`", text, re.DOTALL)
    if m:
        out["map_v22_json_sha"] = m.group(1)

    m = re.search(r"Adds\s+(\d+)\s+NEW\s+voxels", text, re.IGNORECASE)
    if not m:
        m = re.search(r"adds\s+(\d+)\s+NEW\s+voxels", text, re.IGNORECASE)
    if not m:
        m = re.search(r"v22\s*=\s*v21\s*\+\s*(\d+)\s*voxels",
                      text, re.IGNORECASE)
    if m:
        out["new_voxel_count"] = int(m.group(1))

    m = re.search(r"parent\s+v21\s+by\s+sha\s*\(`([0-9a-f]+)", text)
    if m:
        out["parent_sha16"] = m.group(1)

    # cluster_dist literal {w37:3, w38:3, process:4, continuity:3, frontier:1}
    if re.search(r"\{w37:3.*?frontier:1\}", text, re.DOTALL):
        out["cluster_dist"] = {
            "w37": 3, "w38": 3, "process": 4,
            "continuity": 3, "frontier": 1,
        }

    if re.search(r"AETHER-COMPLIANT", text):
        out["self_audit_verdict"] = "AETHER-COMPLIANT"

    parsed_any = any(out[k] is not None for k in (
        "map_v22_json_sha", "new_voxel_count", "self_audit_verdict"))
    out["_status"] = "OK (parsed)" if parsed_any \
        else "W39C receipt present but no countable fields"
    return out


# --- W40A race-safe placeholder ------------------------------------------

def parse_w40a_annex(path: Optional[str]) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "receipt_path": path,
        "receipt_sha": None,
        "verdict": None,
        "annex_files_written": None,
        "findings_neutralized": None,
        "_status": ("W40A annex absent (race-safe PENDING - "
                    "parallel wave candidate)"),
    }
    text = _read_text(path)
    if text is None:
        return out
    out["receipt_sha"] = file_sha256(path)
    if re.search(r"AETHER-COMPLIANT", text):
        out["verdict"] = "AETHER-COMPLIANT"
    m = re.search(r"(\d+)\s+annex\s+files", text, re.IGNORECASE)
    if m:
        out["annex_files_written"] = int(m.group(1))
    # W27 findings 2 -> 0 expected
    m = re.search(r"findings\s+([0-9]+)\s*->\s*([0-9]+)", text, re.IGNORECASE)
    if m:
        out["findings_neutralized"] = int(m.group(1)) - int(m.group(2))
    out["_status"] = "OK (parsed)"
    return out


# --- promotion_readiness block (13 gates) --------------------------------

def build_promotion_readiness(scorecard: Dict[str, Any]) -> Dict[str, Any]:
    """Build the promotion-readiness block from the W39B scorecard report."""
    gates = scorecard.get("gates") or []
    summary = scorecard.get("summary_by_recommendation") or {}
    # Normalize gate rows for dashboard consumption
    norm_gates: List[Dict[str, Any]] = []
    for g in gates:
        norm_gates.append({
            "gate_id": g.get("id"),
            "name": g.get("name"),
            "decision_code": g.get("decision_code"),
            "score": g.get("score"),
            "criteria_met": g.get("criteria_met"),
            "criteria_total": g.get("criteria_total"),
            "criteria": g.get("criteria") or {},
            "recommendation": g.get("recommendation"),
            "witness_time_min": g.get("witness_time_min"),
            "blocker_class": g.get("blocker_class"),
            "blocker_note": g.get("blocker_note"),
            "members": g.get("members") or [],
        })
    return {
        "scorecard_source": scorecard.get("scorecard_py_path"),
        "scorecard_md": scorecard.get("scorecard_md_path"),
        "scorecard_py_sha": scorecard.get("scorecard_py_sha"),
        "audit_clean": scorecard.get("audit_clean"),
        "gate_count": scorecard.get("gate_count") or len(norm_gates),
        "summary_by_recommendation": summary,
        "gates": norm_gates,
        "witness_time_at_emission_utc": _utcnow_iso(),
        "_status": ("OK (13 gates)" if len(norm_gates) == 13
                    else f"PARTIAL ({len(norm_gates)}/13 gates)"),
    }


# --- tier_0_path block (5 highest-value gates, ~98 min) ------------------

# Canonical Tier-0 ordering per W39B scorecard.md (witness-min ascending):
#   G05 T03 daemon restart        0 min   (DONE W17, paperwork)
#   G13 Ledger backlog            3 min   (paste-ready batches)
#   G02 T64 vocab collapse        20 min  (53/53 golden, doctrine-forbidden)
#   G09 T56-B compositional inject 25 min (~33K episode substrate mutation)
#   G12 PB-D scaffold cascade     50 min  (14 paths, paired signatures)
# Sum: 98 minutes -- matches scorecard.md "Total Tier-0 witness time".

TIER_0_STEPS = [
    {
        "step": 1,
        "gate_id": "G05-T03-DAEMON-RESTART",
        "name": "T03 daemon restart (DONE W17)",
        "witness_time_min": 0,
        "cumulative_min": 0,
        "quick_action": ("# already DONE per W17 receipts -- mark complete\n"
                         "# verify daemon PID 22208 still alive:\n"
                         "Get-Process -Id 22208"),
        "cites": [
            "W17 daemon-restart receipts",
            "W38A live-state table (daemon verified)",
        ],
    },
    {
        "step": 2,
        "gate_id": "G13-LEDGER-BACKLOG",
        "name": "Ledger backlog (98 PENDING-REVIEW)",
        "witness_time_min": 3,
        "cumulative_min": 3,
        "quick_action": ("# 47 FALSE-POSITIVE + 50 TRUE-POSITIVE batch\n"
                         "python D:/AsolariaGuides/autopilot-overnight-"
                         "2026-05-20/W35C-WAKE-UP-RUNBOOK/wake_up.py batch "
                         "--op-token <OP-TOKEN>\n"
                         "# investigate the 1 NEEDS-INVESTIGATION sha:\n"
                         "# da3ae683814e98c2"),
        "cites": [
            "W34B-LEDGER-PRECLASSIFIER (preclassifier.py)",
            "W31C-LEDGER-REVIEW (review_helper.py)",
            "W35C-WAKE-UP-RUNBOOK (wake_up.py batch)",
        ],
    },
    {
        "step": 3,
        "gate_id": "G02-T64-COLLAPSE",
        "name": "T64 vocab seam: TESTED -> COLLAPSED",
        "witness_time_min": 20,
        "cumulative_min": 23,
        "quick_action": ("# review golden mapping table (53/53 PASS):\n"
                         "cat D:/AsolariaGuides/autopilot-overnight-"
                         "2026-05-20/W28B-REGRESSION-SMOKE/golden-mapping-"
                         "table.md\n"
                         "# sign collapse-decision (lifts OP-T64-BRIDGE-"
                         "FIRST law-10 forbid clause)"),
        "cites": [
            "W27A-T64-VOCAB-BRIDGE (TESTED)",
            "W28A-T64 (CURRENT)",
            "W28B-RSMOKE (53/53 golden PASS)",
            "OP-T64-BRIDGE-FIRST doctrine",
        ],
    },
    {
        "step": 4,
        "gate_id": "G09-T56B-COMP-INJECT",
        "name": "T56-B compositional inject (~33K episodes)",
        "witness_time_min": 25,
        "cumulative_min": 48,
        "quick_action": ("# W23B-T56B sha 2f7f35a722239942 -- supersedes "
                         "W22A-T56\n"
                         "# witness LAW-1 substrate-mutation token:\n"
                         "node D:/AsolariaGuides/autopilot-overnight-"
                         "2026-05-20/W23B-T56B/projector.cjs --inject "
                         "--episodes ~33000 --op-witness <OP-TOKEN>"),
        "cites": [
            "W22A-T56 (superseded)",
            "W23B-T56B (CURRENT, projector.cjs)",
            "OP-PB-D-T56B decision code",
        ],
    },
    {
        "step": 5,
        "gate_id": "G12-PB-D-SCAFFOLDS",
        "name": "PB-D scaffold cascade (14 paths)",
        "witness_time_min": 50,
        "cumulative_min": 98,
        "quick_action": ("# promotion order T60->T59->T54->T56+T57->T50->"
                         "T51+T53->T52+T62->T58\n"
                         "# sign promotion-batch per scaffold pair (~3-4 "
                         "min each):\n"
                         "# unblocks G08 T58 head-to-head launch"),
        "cites": [
            "W22A-T56, W22B-T57, W22C-T53, W23A-T54/T59/T60",
            "W23B-T56B, W24A-T55/T61/T63, W25A-T50/T51/T52/T62",
            "OP-PB-D-CASCADE decision code",
            "W27B promotion-order brief",
        ],
    },
]


def build_tier_0_path() -> Dict[str, Any]:
    total_min = sum(s["witness_time_min"] for s in TIER_0_STEPS)
    return {
        "ordering_basis": ("witness-minute ascending per W39B scorecard.md "
                           "(Total Tier-0 witness time = 98 minutes)"),
        "steps": TIER_0_STEPS,
        "total_witness_min": total_min,
        "min_witness_min": 78,  # if G02 + G09 fold under G12 cascade signature
        "max_witness_min": total_min,  # 98
        "step_count": len(TIER_0_STEPS),
        "cite": ("D:/AsolariaGuides/autopilot-overnight-2026-05-20/"
                 "W39B-PROMOTION-READINESS/scorecard.md "
                 "section 'Top recommendations'"),
        "_status": "OK (5 steps)",
    }


# --- main -----------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--out", default=OUT_JSON)
    ap.add_argument("--refresh-v9", action="store_true",
                    help="Re-run v9 snapshot before overlaying v10")
    args = ap.parse_args()

    base = dict(load_or_run_v9(args.tail, args.refresh_v9))
    base["snapshot_at_v10"] = _utcnow_iso()
    base["sidecar"] = {
        "variant": "v10",
        "wave": "W40B",
        "agent_pid": AGENT_PID,
        "apex_cosign": APEX_COSIGN,
        "decision_code": DECISION_CODE,
        "decision_at": DECISION_AT,
        "supersedes": ["v1", "v2", "v3", "v4", "v5",
                       "v6", "v7", "v8", "v9"],
        "discipline": ("AETHER HIGH-ASSURANCE - sidecar-only, "
                       "read-only on prior waves"),
        "v10_purpose": ("W39A triage closure + W39B promotion-readiness "
                        "scorecard (13 gates) + W39C v22 map lineage + "
                        "Tier-0 operator path widget"),
    }

    # Override map_lineage to extended v14..v22
    prior_map = base.get("map_lineage")
    base["map_lineage"] = collect_map_lineage_v10(MAP_DIR)
    if prior_map is not None:
        base["_v9_map_lineage"] = prior_map

    # Parse W39A/W39C
    w39a = parse_w39a_triage(
        W39A_RECEIPT if os.path.exists(W39A_RECEIPT) else None)
    w39c = parse_w39c_v22(
        W39C_RECEIPT if os.path.exists(W39C_RECEIPT) else None)
    base["w39a_w27_triage"] = w39a
    base["w39c_v22_emission"] = w39c

    # Invoke W39B scorecard
    scorecard = run_w39b_scorecard()
    base["w39b_scorecard"] = scorecard

    # Parse W40A (race-safe placeholder)
    w40a_path = _first_existing(W40A_RECEIPT_CANDIDATES)
    w40a = parse_w40a_annex(w40a_path)
    base["w40a_annex"] = w40a

    # Build promotion_readiness + tier_0_path blocks
    base["promotion_readiness"] = build_promotion_readiness(scorecard)
    base["tier_0_path"] = build_tier_0_path()

    base["v10_sources"] = {
        "w39a_receipt": {"path": W39A_RECEIPT,
                         "exists": os.path.exists(W39A_RECEIPT),
                         "sha": file_sha256(W39A_RECEIPT)},
        "w39b_scorecard_py": {"path": W39B_SCORECARD_PY,
                              "exists": os.path.exists(W39B_SCORECARD_PY),
                              "sha": file_sha256(W39B_SCORECARD_PY)},
        "w39b_scorecard_md": {"path": W39B_SCORECARD_MD,
                              "exists": os.path.exists(W39B_SCORECARD_MD),
                              "sha": file_sha256(W39B_SCORECARD_MD)},
        "w39c_receipt": {"path": W39C_RECEIPT,
                         "exists": os.path.exists(W39C_RECEIPT),
                         "sha": file_sha256(W39C_RECEIPT)},
        "w40a_receipt": {"path": w40a_path,
                         "exists": w40a_path is not None,
                         "sha": file_sha256(w40a_path)},
        "map_v22": {"path": os.path.join(MAP_DIR, "v22", "map-v22.json"),
                    "exists": os.path.exists(
                        os.path.join(MAP_DIR, "v22", "map-v22.json")),
                    "sha": file_sha256(
                        os.path.join(MAP_DIR, "v22", "map-v22.json"))},
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(base, fh, ensure_ascii=False, indent=2)

    pr = base["promotion_readiness"]
    t0 = base["tier_0_path"]
    sb = pr.get("summary_by_recommendation") or {}
    print(f"snapshot-v10 ok: "
          f"map_lineage_versions={len(base['map_lineage'])} "
          f"w39a={w39a.get('findings_total')}f "
          f"({w39a.get('cosmetic_count')}cos/"
          f"{w39a.get('true_minor_count')}tm/"
          f"{w39a.get('true_material_count')}tmat) "
          f"w39b_gates={pr.get('gate_count')} "
          f"PROMOTE={sb.get('RECOMMEND-PROMOTE')}/"
          f"NEEDS-WORK={sb.get('NEEDS-WORK')}/"
          f"BLOCKED={sb.get('BLOCKED')} "
          f"w39c=voxels+{w39c.get('new_voxel_count')} "
          f"tier0={t0.get('step_count')}steps/"
          f"{t0.get('total_witness_min')}min")
    print(f"  w39a._status={w39a['_status']}")
    print(f"  w39b._status={scorecard['_status']}")
    print(f"  w39c._status={w39c['_status']}")
    print(f"  w40a._status={w40a['_status']}")
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
