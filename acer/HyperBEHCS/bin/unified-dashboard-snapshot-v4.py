#!/usr/bin/env python3
"""
unified-dashboard-snapshot-v4.py - W30C SIDECAR (AETHER HIGH-ASSURANCE)

Adds AUDIT-MODE block (3-state: AUDIT-ONLY / SHADOW-BLOCK / LIVE-BLOCK-FORBIDDEN)
reflecting OP-W30-SHADOW-BLOCK-FIRST. Reads (read-only):
  - prior v3 snapshot (everything v3 reads via load_or_run_v3)
  - W30A shadow-block ledger NDJSON (race-safe; PENDING if absent)
  - W30B regression-fixtures RECEIPT.md (race-safe; PENDING if absent)

Emits: C:/HyperBEHCS/store/unified-dashboard-snapshot-v4.json

SIDECAR DISCIPLINE (AETHER law 1 — no in-place mutation):
  - Does NOT overwrite v1/v2/v3 snapshot scripts or their JSON outputs.
  - Re-invokes v3 OR re-reads v3's existing JSON, overlays v4 audit_mode block.
  - No daemon mutation. Stdlib only.

3-state audit model (OP-W30-SHADOW-BLOCK-FIRST):
  AUDIT-ONLY            -> observations recorded, no would-block emitted
  SHADOW-BLOCK          -> would-block emitted to ledger, no enforcement (CURRENT)
  LIVE-BLOCK-FORBIDDEN  -> enforcement FORBIDDEN by OP-W30 until promotion gate met
                          (>= 1 wave with 0 PENDING + 0 unverified TRUE-POSITIVE)
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone
from typing import Optional

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
V3_SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v3.py")
V3_SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v3.json")
OUT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v4.json")

# W30A shadow-block outputs (read-only, race-safe)
W30A_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W30A-SHADOW-BLOCK"
W30A_LEDGER = os.path.join(STORE, "shadow-block-ledger.ndjson")
W30A_SHADOW_PY = os.path.join(W30A_DIR, "shadow_block.py")
W30A_RECEIPT = os.path.join(W30A_DIR, "RECEIPT.md")

# W30B regression-fixtures outputs (read-only, race-safe)
W30B_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W30B-REGRESSION-FIXTURES"
W30B_RECEIPT = os.path.join(W30B_DIR, "RECEIPT.md")

DOCTRINE_CANON_PATH = (
    r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W30C-dashboard-v4-receipt.md"
)
AGENT_PID    = "AGT-VECTOR-VIZ_RENDER-W30C-DASHBOARD-V4-AUDIT-MODE-2026-05-21"
APEX_COSIGN  = "OP-W30-SHADOW-BLOCK-FIRST + OP-AETHER-HIGH-ASSURANCE-W30C"
DECISION_CODE = "OP-W30-SHADOW-BLOCK-FIRST"
DECISION_AT   = "2026-05-21"

MODE_HISTORY = [
    "AUDIT-ONLY @ W29C",
    "SHADOW-BLOCK @ W30A",
]
CURRENT_MODE = "SHADOW-BLOCK"
LIVE_BLOCK_STATUS = "FORBIDDEN-PER-OP-W30"
PROMOTION_GATE = "≥1 wave with 0 PENDING + 0 unverified TRUE-POSITIVE"


def file_sha256(path: str) -> Optional[str]:
    if not os.path.exists(path):
        return None
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def read_text(path: str, limit: int = 200_000) -> Optional[str]:
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read(limit)
    except Exception:
        return None


def load_or_run_v3(tail: int, refresh: bool) -> dict:
    """Load v3 snapshot. If missing or --refresh-v3, invoke v3 script."""
    need_run = refresh or not os.path.exists(V3_SNAPSHOT_JSON)
    if need_run and os.path.exists(V3_SNAPSHOT_PY):
        try:
            subprocess.run(
                [sys.executable, V3_SNAPSHOT_PY, "--tail", str(tail)],
                capture_output=True, text=True, timeout=60, check=False,
            )
        except Exception:
            pass
    if os.path.exists(V3_SNAPSHOT_JSON):
        try:
            with open(V3_SNAPSHOT_JSON, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            pass
    return {"snapshot_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "_v3_unavailable": True}


def read_shadow_ledger() -> dict:
    """Parse W30A NDJSON ledger. Race-safe: PENDING placeholder if absent.

    Each line is an envelope; we count by verdict + review_state.
    Expected fields (best-effort, lenient parsing):
      verdict             : "WOULD-BLOCK" | "ALLOW" | other
      review_state        : "PENDING" | "TRUE-POSITIVE" | "FALSE-POSITIVE"
      confirmed_violation : bool (optional)
    """
    if not os.path.exists(W30A_LEDGER):
        return {
            "_status": "PENDING (W30A ledger not yet emitted)",
            "ledger_path": W30A_LEDGER,
            "ledger_exists": False,
            "total_entries": 0,
            "would_block_count": 0,
            "pending_review_count": 0,
            "true_positive_count": 0,
            "false_positive_count": 0,
            "confirmed_violation_count": 0,
        }
    total = 0
    would_block = 0
    pending = 0
    tp = 0
    fp = 0
    confirmed = 0
    try:
        with open(W30A_LEDGER, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                total += 1
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                verdict = str(obj.get("verdict") or obj.get("decision") or "").upper()
                review = str(obj.get("review_state") or obj.get("review") or "").upper()
                if "WOULD-BLOCK" in verdict or verdict == "BLOCK" or verdict == "SHADOW-BLOCK":
                    would_block += 1
                if review == "PENDING" or review == "":
                    pending += 1
                elif "TRUE" in review and "POSITIVE" in review:
                    tp += 1
                elif "FALSE" in review and "POSITIVE" in review:
                    fp += 1
                if obj.get("confirmed_violation") is True:
                    confirmed += 1
    except Exception as e:
        return {
            "_status": f"ERROR reading ledger: {e}",
            "ledger_path": W30A_LEDGER,
            "ledger_exists": True,
            "total_entries": 0,
            "would_block_count": 0,
            "pending_review_count": 0,
            "true_positive_count": 0,
            "false_positive_count": 0,
            "confirmed_violation_count": 0,
        }
    return {
        "_status": "OK",
        "ledger_path": W30A_LEDGER,
        "ledger_exists": True,
        "ledger_sha": file_sha256(W30A_LEDGER),
        "total_entries": total,
        "would_block_count": would_block,
        "pending_review_count": pending,
        "true_positive_count": tp,
        "false_positive_count": fp,
        "confirmed_violation_count": confirmed,
    }


def read_regression_fixtures() -> dict:
    """Parse W30B RECEIPT.md for fixture counts. Race-safe: PENDING placeholder if absent."""
    if not os.path.exists(W30B_RECEIPT):
        return {
            "_status": "PENDING (W30B receipt not yet emitted)",
            "receipt_path": W30B_RECEIPT,
            "receipt_exists": False,
            "total": 6,
            "matched_expected": 0,
            "valid_cases_passed": 0,
            "violation_cases_caught": 0,
            "false_positives": 0,
        }
    text = read_text(W30B_RECEIPT) or ""
    # lenient regex extraction
    def grab_int(patterns, default=0):
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                try:
                    return int(m.group(1))
                except Exception:
                    pass
        return default
    total = grab_int([r"total[^0-9]{0,20}fixtures?[^0-9]{0,20}(\d+)",
                      r"(\d+)\s*/\s*6\s*fixtures",
                      r"fixtures?[^0-9]{0,20}total[^0-9]{0,20}(\d+)"], default=6)
    matched = grab_int([r"matched[_\s]expected[^0-9]{0,20}(\d+)",
                        r"(\d+)\s*/\s*6\s*matched"], default=0)
    valid_pass = grab_int([r"valid[_\s]cases?[_\s]passed[^0-9]{0,20}(\d+)",
                           r"valid[^0-9]{0,20}pass(?:ed)?[^0-9]{0,20}(\d+)"], default=0)
    viol_caught = grab_int([r"violation[_\s]cases?[_\s]caught[^0-9]{0,20}(\d+)",
                            r"violations?[^0-9]{0,20}caught[^0-9]{0,20}(\d+)"], default=0)
    fp = grab_int([r"false[_\s]positives?[^0-9]{0,20}(\d+)"], default=0)
    return {
        "_status": "OK",
        "receipt_path": W30B_RECEIPT,
        "receipt_exists": True,
        "receipt_sha": file_sha256(W30B_RECEIPT),
        "total": total or 6,
        "matched_expected": matched,
        "valid_cases_passed": valid_pass,
        "violation_cases_caught": viol_caught,
        "false_positives": fp,
    }


def build_audit_mode_block() -> dict:
    ledger = read_shadow_ledger()
    fixtures = read_regression_fixtures()
    promotion_ready = (
        ledger.get("ledger_exists")
        and ledger.get("pending_review_count", 1) == 0
        and ledger.get("true_positive_count", 0) > 0
    )
    return {
        "current_mode": CURRENT_MODE,
        "mode_history": MODE_HISTORY,
        "live_block_status": LIVE_BLOCK_STATUS,
        "decision_code": DECISION_CODE,
        "decision_at": DECISION_AT,
        "shadow_ledger": {
            "total_entries": ledger.get("total_entries", 0),
            "would_block_count": ledger.get("would_block_count", 0),
            "pending_review_count": ledger.get("pending_review_count", 0),
            "true_positive_count": ledger.get("true_positive_count", 0),
            "false_positive_count": ledger.get("false_positive_count", 0),
            "confirmed_violation_count": ledger.get("confirmed_violation_count", 0),
            "_status": ledger.get("_status"),
            "ledger_exists": ledger.get("ledger_exists", False),
            "ledger_path": ledger.get("ledger_path"),
            "ledger_sha": ledger.get("ledger_sha"),
        },
        "regression_fixtures": {
            "total": fixtures.get("total", 6),
            "matched_expected": fixtures.get("matched_expected", 0),
            "valid_cases_passed": fixtures.get("valid_cases_passed", 0),
            "violation_cases_caught": fixtures.get("violation_cases_caught", 0),
            "false_positives": fixtures.get("false_positives", 0),
            "_status": fixtures.get("_status"),
            "receipt_exists": fixtures.get("receipt_exists", False),
            "receipt_path": fixtures.get("receipt_path"),
            "receipt_sha": fixtures.get("receipt_sha"),
        },
        "promotion_to_live_block_gate": PROMOTION_GATE,
        "promotion_ready": bool(promotion_ready),
        "sources": {
            "W30A_shadow_block_py": {"path": W30A_SHADOW_PY,
                                     "exists": os.path.exists(W30A_SHADOW_PY)},
            "W30A_ledger":          {"path": W30A_LEDGER,
                                     "exists": os.path.exists(W30A_LEDGER)},
            "W30A_receipt":         {"path": W30A_RECEIPT,
                                     "exists": os.path.exists(W30A_RECEIPT)},
            "W30B_receipt":         {"path": W30B_RECEIPT,
                                     "exists": os.path.exists(W30B_RECEIPT)},
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--out", default=OUT_JSON)
    ap.add_argument("--refresh-v3", action="store_true",
                    help="Re-run v3 snapshot before overlaying v4")
    args = ap.parse_args()

    base = load_or_run_v3(args.tail, args.refresh_v3)
    base = dict(base)
    base["snapshot_at_v4"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    base["sidecar"] = {
        "variant": "v4",
        "wave": "W30C",
        "agent_pid": AGENT_PID,
        "apex_cosign": APEX_COSIGN,
        "supersedes": ["v1", "v2", "v3"],
        "discipline": "AETHER HIGH-ASSURANCE — sidecar-only, read-only on prior waves",
    }

    base["audit_mode"] = build_audit_mode_block()

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(base, fh, ensure_ascii=False, indent=2)
    am = base["audit_mode"]
    sl = am["shadow_ledger"]
    rf = am["regression_fixtures"]
    print(f"snapshot-v4 ok: current_mode={am['current_mode']} "
          f"live_block={am['live_block_status']}; "
          f"ledger entries={sl['total_entries']} would_block={sl['would_block_count']} "
          f"pending={sl['pending_review_count']}; "
          f"fixtures matched={rf['matched_expected']}/{rf['total']}; "
          f"promotion_ready={am['promotion_ready']}")
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
