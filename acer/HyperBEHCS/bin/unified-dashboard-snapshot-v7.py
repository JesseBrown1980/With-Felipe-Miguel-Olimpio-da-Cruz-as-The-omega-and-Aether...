#!/usr/bin/env python3
"""
unified-dashboard-snapshot-v7.py - W34C SIDECAR (AETHER HIGH-ASSURANCE)

NEW IN v7:
  - cas_fix_v3 block:           parsed from W33A RECEIPT.md
      {commits, retries, max_attempts, cas_failures,
       defect_repro_v2_lost, defect_repro_v3_converged, fix_module_sha,
       receipt_sha, receipt_path, _status}
  - audit_v2_heuristic_fix:     parsed from W34A RECEIPT.md (race-safe PENDING
                                  if absent)
      {heuristic_flag_count_before, heuristic_flag_count_after,
       audit_v2_sha, receipt_sha, receipt_path, _status}
  - preclassifier block:        parsed from W34B RECEIPT.md (race-safe PENDING
                                  if absent)
      {total_pending, proposed_FP_count, proposed_TP_count,
       proposed_FPHF_count, proposed_CV_count, proposed_NI_count,
       classifier_sha, receipt_sha, receipt_path, _status}

Reads (read-only):
  - prior v6 snapshot JSON (load_or_run_v6: invoke v6 script if missing)
  - W33A RECEIPT.md (CAS-fix verification + 10/10 defect repro)
  - W34A RECEIPT.md (audit-v2 heuristic flag drop) - PENDING if absent
  - W34B RECEIPT.md (pre-classifier proposal distribution) - PENDING if absent

Emits: C:/HyperBEHCS/store/unified-dashboard-snapshot-v7.json

SIDECAR DISCIPLINE (AETHER law 1 - no in-place mutation):
  - Does NOT overwrite v1..v6 snapshot scripts or their JSON outputs.
  - Re-invokes v6 OR re-reads v6's existing JSON, overlays v7 fields.
  - No daemon mutation. Stdlib only.
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
V6_SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v6.py")
V6_SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v6.json")
OUT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v7.json")

W33A_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W33A-CAS-FIX"
W33A_RECEIPT_CANDIDATES = [
    os.path.join(W33A_DIR, "RECEIPT.md"),
    os.path.join(W33A_DIR, "W33A-receipt.md"),
    os.path.join(W33A_DIR, "receipt.md"),
]
W33A_MODULE_CANDIDATES = [
    os.path.join(W33A_DIR, "shadow_block_v3.py"),
]

W34A_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W34A-AUDIT-V2-HEURISTIC-FIX"
W34A_RECEIPT_CANDIDATES = [
    os.path.join(W34A_DIR, "RECEIPT.md"),
    os.path.join(W34A_DIR, "W34A-receipt.md"),
    os.path.join(W34A_DIR, "receipt.md"),
]
W34A_MODULE_CANDIDATES = [
    os.path.join(W34A_DIR, "aether_audit_v2.py"),
    os.path.join(W34A_DIR, "audit_v2.py"),
]

W34B_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W34B-LEDGER-PRECLASSIFIER"
W34B_RECEIPT_CANDIDATES = [
    os.path.join(W34B_DIR, "RECEIPT.md"),
    os.path.join(W34B_DIR, "W34B-receipt.md"),
    os.path.join(W34B_DIR, "receipt.md"),
]
W34B_MODULE_CANDIDATES = [
    os.path.join(W34B_DIR, "preclassifier.py"),
    os.path.join(W34B_DIR, "ledger_preclassifier.py"),
]

AGENT_PID = "AGT-VECTOR-VIZ_RENDER-W34C-DASHBOARD-V7-2026-05-21"
APEX_COSIGN = ("OP-AETHER-HIGH-ASSURANCE-W34C + OP-W30-SHADOW-BLOCK-FIRST "
               "+ OP-W32-LEDGER-BARRIER-FIRST")
DECISION_CODE = "OP-AETHER-HIGH-ASSURANCE-W34C"
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


def load_or_run_v6(tail: int, refresh: bool) -> dict:
    """Load v6 snapshot. If missing or --refresh-v6, invoke v6 script."""
    need_run = refresh or not os.path.exists(V6_SNAPSHOT_JSON)
    if need_run and os.path.exists(V6_SNAPSHOT_PY):
        try:
            subprocess.run(
                [sys.executable, V6_SNAPSHOT_PY, "--tail", str(tail)],
                capture_output=True, text=True, timeout=120, check=False,
            )
        except Exception:
            pass
    if os.path.exists(V6_SNAPSHOT_JSON):
        try:
            with open(V6_SNAPSHOT_JSON, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            pass
    return {"snapshot_at": _utcnow_iso(), "_v6_unavailable": True}


# --- W33A parsers ---------------------------------------------------------

def parse_w33a_receipt(receipt_path: Optional[str]) -> Dict[str, Any]:
    """Parse W33A CAS-fix receipt for CAS stats + defect repro outcomes."""
    out: Dict[str, Any] = {
        "commits": None,
        "retries": None,
        "max_attempts": None,
        "cas_failures": None,
        "defect_repro_v2_lost": [],
        "defect_repro_v3_converged": [],
        "defect_repro_v2_converged_count": None,
        "defect_repro_v3_converged_count": None,
        "defect_repro_trial_count": 10,
        "fix_module_sha": None,
        "receipt_sha": None,
        "receipt_path": receipt_path,
        "_status": "W33A receipt absent (race-safe PENDING)",
    }
    if not receipt_path or not os.path.exists(receipt_path):
        return out
    try:
        text = open(receipt_path, "r", encoding="utf-8",
                    errors="replace").read()
    except Exception as e:
        out["_status"] = f"W33A receipt read error: {e}"
        return out
    out["receipt_sha"] = file_sha256(receipt_path)

    # fix_module_sha for shadow_block_v3.py
    m = re.search(
        r"`shadow_block_v3\.py`\s*sha256\s*[:=]\s*`?([0-9a-fA-F]{64})`?",
        text,
    )
    if m:
        out["fix_module_sha"] = m.group(1).lower()

    # CAS stats JSON block (looking for "commits": N, etc.)
    # Receipt has a fenced block:
    #   "commits": 50,
    #   "retries": 173,
    #   "max_attempts_seen": 7,
    #   "cas_failures": 0
    def _int_after(keys):
        for k in keys:
            mm = re.search(r'"' + k + r'"\s*:\s*(\d+)', text)
            if mm:
                return int(mm.group(1))
        return None
    out["commits"] = _int_after(["commits"])
    out["retries"] = _int_after(["retries"])
    out["max_attempts"] = _int_after(["max_attempts_seen", "max_attempts"])
    out["cas_failures"] = _int_after(["cas_failures"])

    # Defect repro tables: per-trial writer_done_count arrays
    # W32A v2 (defective): `[2, 2, 2, 2, 2, 2, 1, 2, 2, 1]`
    # W33A v3 (CAS-fixed): `[5, 5, 5, 5, 5, 5, 5, 5, 5, 5]`
    def _trial_arr(label):
        pat = re.compile(
            re.escape(label) + r"[^\n]*?`\s*\[\s*([0-9,\s]+?)\s*\]\s*`",
            re.IGNORECASE,
        )
        mm = pat.search(text)
        if not mm:
            return []
        return [int(x.strip()) for x in mm.group(1).split(",")
                if x.strip().isdigit()]
    out["defect_repro_v2_lost"] = _trial_arr("W32A v2 (defective)")
    out["defect_repro_v3_converged"] = _trial_arr("W33A v3 (CAS-fixed)")
    # Fallback: try "v2" / "v3" generic labels
    if not out["defect_repro_v2_lost"]:
        out["defect_repro_v2_lost"] = _trial_arr("v2 (defective)")
    if not out["defect_repro_v3_converged"]:
        out["defect_repro_v3_converged"] = _trial_arr("v3 (CAS-fixed)")

    # Convergence counts (expected_writers=5 -> trial converges if ==5)
    if out["defect_repro_v2_lost"]:
        out["defect_repro_v2_converged_count"] = sum(
            1 for v in out["defect_repro_v2_lost"] if v == 5)
        out["defect_repro_trial_count"] = len(out["defect_repro_v2_lost"])
    if out["defect_repro_v3_converged"]:
        out["defect_repro_v3_converged_count"] = sum(
            1 for v in out["defect_repro_v3_converged"] if v == 5)

    out["_status"] = "OK (parsed)"
    return out


# --- W34A parsers ---------------------------------------------------------

def parse_w34a_receipt(receipt_path: Optional[str]) -> Dict[str, Any]:
    """Parse W34A audit-v2 heuristic-fix receipt for flag-count drop."""
    out: Dict[str, Any] = {
        "heuristic_flag_count_before": None,
        "heuristic_flag_count_after": None,
        "audit_v2_sha": None,
        "receipt_sha": None,
        "receipt_path": receipt_path,
        "_status": "W34A receipt absent (race-safe PENDING)",
    }
    if not receipt_path or not os.path.exists(receipt_path):
        return out
    try:
        text = open(receipt_path, "r", encoding="utf-8",
                    errors="replace").read()
    except Exception as e:
        out["_status"] = f"W34A receipt read error: {e}"
        return out
    out["receipt_sha"] = file_sha256(receipt_path)

    # before/after counts — tolerant of several phrasings
    def _int_for(label_patterns):
        for pat in label_patterns:
            mm = re.search(pat, text, re.IGNORECASE)
            if mm:
                try:
                    return int(mm.group(1))
                except Exception:
                    continue
        return None
    # Primary phrasing in W34A receipt: "Heuristic-flag count: 7 -> 0"
    # (also handles unicode arrow, =>, ->, →)
    arrow_pat = re.compile(
        r"heuristic[- _]?flag\s*count\s*[:=]?\s*(\d+)\s*"
        r"(?:->|=>|\u2192|to|\u2014>)\s*(\d+)",
        re.IGNORECASE,
    )
    m_arrow = arrow_pat.search(text)
    if m_arrow:
        out["heuristic_flag_count_before"] = int(m_arrow.group(1))
        out["heuristic_flag_count_after"] = int(m_arrow.group(2))
    else:
        out["heuristic_flag_count_before"] = _int_for([
            r"heuristic[_ ]?flag[_ ]?count[_ ]?before\s*[:=]\s*(\d+)",
            r"before\s*[:=]\s*(\d+)\s*(?:heuristic|flags?)",
            r"(\d+)\s*heuristic\s*flags?\s*(?:before|prior)",
        ])
        out["heuristic_flag_count_after"] = _int_for([
            r"heuristic[_ ]?flag[_ ]?count[_ ]?after\s*[:=]\s*(\d+)",
            r"after\s*[:=]\s*(\d+)\s*(?:heuristic|flags?)",
            r"(\d+)\s*heuristic\s*flags?\s*(?:after|remaining)",
            r"drop(?:ped)?\s*(?:from\s*\d+\s*)?to\s*(\d+)",
        ])

    # audit-v2 module sha
    m = re.search(
        r"`?(?:aether_audit_v2|audit_v2)\.py`?\s*sha256\s*[:=]\s*"
        r"`?([0-9a-fA-F]{64})`?",
        text,
    )
    if m:
        out["audit_v2_sha"] = m.group(1).lower()

    parsed_any = (out["heuristic_flag_count_before"] is not None
                  or out["heuristic_flag_count_after"] is not None)
    out["_status"] = "OK (parsed)" if parsed_any \
        else "W34A receipt present but no countable fields"
    return out


# --- W34B parsers ---------------------------------------------------------

def parse_w34b_receipt(receipt_path: Optional[str]) -> Dict[str, Any]:
    """Parse W34B pre-classifier receipt for proposal distribution."""
    out: Dict[str, Any] = {
        "total_pending": None,
        "proposed_FP_count": None,
        "proposed_TP_count": None,
        "proposed_FPHF_count": None,
        "proposed_CV_count": None,
        "proposed_NI_count": None,
        "classifier_sha": None,
        "receipt_sha": None,
        "receipt_path": receipt_path,
        "_status": "W34B receipt absent (race-safe PENDING)",
    }
    if not receipt_path or not os.path.exists(receipt_path):
        return out
    try:
        text = open(receipt_path, "r", encoding="utf-8",
                    errors="replace").read()
    except Exception as e:
        out["_status"] = f"W34B receipt read error: {e}"
        return out
    out["receipt_sha"] = file_sha256(receipt_path)

    def _int_for(label_patterns):
        for pat in label_patterns:
            mm = re.search(pat, text, re.IGNORECASE)
            if mm:
                try:
                    return int(mm.group(1))
                except Exception:
                    continue
        return None

    out["total_pending"] = _int_for([
        r"total[_ ]?pending\s*[:=]\s*(\d+)",
        # Markdown table row: "| **TOTAL** | **98**|"
        r"\*\*TOTAL\*\*\s*\|\s*\*\*(\d+)\*\*",
        # "pending analyzed   : 98" (selftest output)
        r"pending\s*analyzed\s*[:=]\s*(\d+)",
        # "98 PENDING-REVIEW Entries" (section heading)
        r"(\d+)\s+PENDING-?REVIEW\s+Entries",
        r"(\d+)\s*total\s*pending",
        r"pending\s*entries?\s*[:=]\s*(\d+)",
    ])

    # Helper: match markdown-table-row of the form
    #   | `LABEL` | NUM | ... |   or   | LABEL | NUM | ...
    # tolerant of leading **bold**, backticks, and whitespace.
    def _row_count(label_regex):
        pat = re.compile(
            r"\|\s*\*?\*?`?\s*" + label_regex
            + r"\s*`?\*?\*?\s*\|\s*\*?\*?(\d+)\*?\*?\s*\|",
            re.IGNORECASE,
        )
        mm = pat.search(text)
        return int(mm.group(1)) if mm else None

    # Proposal counts — prefer explicit "proposed_X_count" labels, fall back
    # to markdown-table-row, then to looser phrasings.
    out["proposed_FP_count"] = _int_for([
        r"proposed[_ ]?FP[_ ]?count\s*[:=]\s*(\d+)",
    ]) or _row_count(r"FALSE-?POSITIVE")
    out["proposed_TP_count"] = _int_for([
        r"proposed[_ ]?TP[_ ]?count\s*[:=]\s*(\d+)",
    ]) or _row_count(r"TRUE-?POSITIVE")
    out["proposed_FPHF_count"] = _int_for([
        r"proposed[_ ]?FPHF[_ ]?count\s*[:=]\s*(\d+)",
    ])
    if out["proposed_FPHF_count"] is None:
        out["proposed_FPHF_count"] = _row_count(r"FALSE-?POSITIVE-?HEURISTIC-?FLAG")
    out["proposed_CV_count"] = _int_for([
        r"proposed[_ ]?CV[_ ]?count\s*[:=]\s*(\d+)",
    ])
    if out["proposed_CV_count"] is None:
        out["proposed_CV_count"] = _row_count(r"CONFIRMED-?VIOLATION")
    out["proposed_NI_count"] = _int_for([
        r"proposed[_ ]?NI[_ ]?count\s*[:=]\s*(\d+)",
    ])
    if out["proposed_NI_count"] is None:
        # Accept either INSPECTION or INVESTIGATION (receipt uses the latter)
        out["proposed_NI_count"] = (_row_count(r"NEEDS-?INVESTIGATION")
                                    or _row_count(r"NEEDS-?INSPECTION"))

    # classifier module sha
    m = re.search(
        r"`?(?:preclassifier|ledger_preclassifier)\.py`?\s*sha256\s*[:=]\s*"
        r"`?([0-9a-fA-F]{64})`?",
        text,
    )
    if m:
        out["classifier_sha"] = m.group(1).lower()

    parsed_any = any(out[k] is not None for k in (
        "total_pending", "proposed_FP_count", "proposed_TP_count",
        "proposed_FPHF_count", "proposed_CV_count", "proposed_NI_count"))
    out["_status"] = "OK (parsed)" if parsed_any \
        else "W34B receipt present but no countable fields"
    return out


# --- main -----------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--out", default=OUT_JSON)
    ap.add_argument("--refresh-v6", action="store_true",
                    help="Re-run v6 snapshot before overlaying v7")
    args = ap.parse_args()

    base = dict(load_or_run_v6(args.tail, args.refresh_v6))
    base["snapshot_at_v7"] = _utcnow_iso()
    base["sidecar"] = {
        "variant": "v7",
        "wave": "W34C",
        "agent_pid": AGENT_PID,
        "apex_cosign": APEX_COSIGN,
        "decision_code": DECISION_CODE,
        "decision_at": DECISION_AT,
        "supersedes": ["v1", "v2", "v3", "v4", "v5", "v6"],
        "discipline": ("AETHER HIGH-ASSURANCE - sidecar-only, read-only on "
                       "prior waves"),
        "v7_purpose": ("CAS-fix verification (W33A) + audit-v2 heuristic fix "
                       "(W34A) + pre-classifier proposals (W34B)"),
    }

    # Parse W33A / W34A / W34B receipts (race-safe)
    w33a_receipt = _first_existing(W33A_RECEIPT_CANDIDATES)
    w34a_receipt = _first_existing(W34A_RECEIPT_CANDIDATES)
    w34b_receipt = _first_existing(W34B_RECEIPT_CANDIDATES)
    w33a_module = _first_existing(W33A_MODULE_CANDIDATES)
    w34a_module = _first_existing(W34A_MODULE_CANDIDATES)
    w34b_module = _first_existing(W34B_MODULE_CANDIDATES)

    cas_fix_v3 = parse_w33a_receipt(w33a_receipt)
    # Prefer live shadow_block_v3.py file sha if the receipt didn't include one
    if not cas_fix_v3.get("fix_module_sha") and w33a_module:
        cas_fix_v3["fix_module_sha"] = file_sha256(w33a_module)

    audit_v2_heuristic_fix = parse_w34a_receipt(w34a_receipt)
    if not audit_v2_heuristic_fix.get("audit_v2_sha") and w34a_module:
        audit_v2_heuristic_fix["audit_v2_sha"] = file_sha256(w34a_module)

    preclassifier = parse_w34b_receipt(w34b_receipt)
    if not preclassifier.get("classifier_sha") and w34b_module:
        preclassifier["classifier_sha"] = file_sha256(w34b_module)

    # Top-level v7 fields
    base["cas_fix_v3"] = cas_fix_v3
    base["audit_v2_heuristic_fix"] = audit_v2_heuristic_fix
    base["preclassifier"] = preclassifier

    base["v7_sources"] = {
        "w33a_receipt": {"path": w33a_receipt,
                         "exists": w33a_receipt is not None,
                         "sha": file_sha256(w33a_receipt)},
        "w33a_module": {"path": w33a_module,
                        "exists": w33a_module is not None,
                        "sha": file_sha256(w33a_module)},
        "w34a_receipt": {"path": w34a_receipt,
                         "exists": w34a_receipt is not None,
                         "sha": file_sha256(w34a_receipt)},
        "w34a_module": {"path": w34a_module,
                        "exists": w34a_module is not None,
                        "sha": file_sha256(w34a_module)},
        "w34b_receipt": {"path": w34b_receipt,
                         "exists": w34b_receipt is not None,
                         "sha": file_sha256(w34b_receipt)},
        "w34b_module": {"path": w34b_module,
                        "exists": w34b_module is not None,
                        "sha": file_sha256(w34b_module)},
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(base, fh, ensure_ascii=False, indent=2)

    print(f"snapshot-v7 ok: "
          f"cas_fix_v3.commits={cas_fix_v3['commits']} "
          f"retries={cas_fix_v3['retries']} "
          f"max_attempts={cas_fix_v3['max_attempts']} "
          f"cas_failures={cas_fix_v3['cas_failures']} "
          f"v2_converged={cas_fix_v3['defect_repro_v2_converged_count']}/"
          f"{cas_fix_v3['defect_repro_trial_count']} "
          f"v3_converged={cas_fix_v3['defect_repro_v3_converged_count']}/"
          f"{cas_fix_v3['defect_repro_trial_count']}")
    print(f"  audit_v2_heuristic_fix._status={audit_v2_heuristic_fix['_status']}")
    print(f"  preclassifier._status={preclassifier['_status']}")
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
