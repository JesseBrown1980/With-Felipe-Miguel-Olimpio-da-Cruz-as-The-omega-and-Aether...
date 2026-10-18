#!/usr/bin/env python3
"""
unified-dashboard-snapshot-v5.py - W31C SIDECAR (AETHER HIGH-ASSURANCE)

Captures FRESH ledger state — supersedes v4's stale snapshot (which froze
a race-state of 22 entries / 0 would-block when actual ledger had violations).

Reads (read-only):
  - prior v4 snapshot JSON (everything v4 overlaid on v3 via load_or_run_v4)
  - W30A shadow-block ledger NDJSON via shadow_block.summarize_ledger +
    raw scan for fresh per-entry detail (pending_review_queue, update_of markers)
  - W30B regression-fixtures RECEIPT.md (race-safe; PENDING if absent)

Emits: C:/HyperBEHCS/store/unified-dashboard-snapshot-v5.json

NEW IN v5:
  - ledger_summary.fresh_snapshot_at        (UTC timestamp of THIS read)
  - ledger_summary.by_verdict               (full verdict tally)
  - ledger_summary.by_review_status         (full review-status tally)
  - ledger_summary.update_of_marker_count   (count of operator-review rows)
  - pending_review_queue                    (top-10 oldest PENDING entries)

SIDECAR DISCIPLINE (AETHER law 1 — no in-place mutation):
  - Does NOT overwrite v1/v2/v3/v4 snapshot scripts or their JSON outputs.
  - Re-invokes v4 OR re-reads v4's existing JSON, overlays v5 ledger_summary.
  - No daemon mutation. Stdlib only (plus sibling-import of shadow_block).
"""
from __future__ import annotations
import argparse, hashlib, importlib.util, json, os, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
V4_SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v4.py")
V4_SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v4.json")
OUT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v5.json")

W30A_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W30A-SHADOW-BLOCK"
W30A_LEDGER = os.path.join(STORE, "shadow-block-ledger.ndjson")
W30A_SHADOW_PY = os.path.join(W30A_DIR, "shadow_block.py")

W30B_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W30B-REGRESSION-FIXTURES"
W30B_RECEIPT = os.path.join(W30B_DIR, "RECEIPT.md")

AGENT_PID    = "AGT-VECTOR-VIZ_RENDER-W31C-DASHBOARD-V5-LEDGER-REVIEW-2026-05-21"
APEX_COSIGN  = "OP-AETHER-HIGH-ASSURANCE-W31C + OP-W30-SHADOW-BLOCK-FIRST"
DECISION_CODE = "OP-AETHER-HIGH-ASSURANCE-W31C"
DECISION_AT   = "2026-05-21"


def file_sha256(path: str) -> Optional[str]:
    if not os.path.exists(path):
        return None
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_shadow_block():
    """Sibling-import W30A shadow_block.py for read-only summarize/read_ledger."""
    if not os.path.exists(W30A_SHADOW_PY):
        return None
    try:
        spec = importlib.util.spec_from_file_location("shadow_block_w30a", W30A_SHADOW_PY)
        mod = importlib.util.module_from_spec(spec)
        sys.modules["shadow_block_w30a"] = mod
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        return mod
    except Exception:
        return None


def load_or_run_v4(tail: int, refresh: bool) -> dict:
    """Load v4 snapshot. If missing or --refresh-v4, invoke v4 script."""
    need_run = refresh or not os.path.exists(V4_SNAPSHOT_JSON)
    if need_run and os.path.exists(V4_SNAPSHOT_PY):
        try:
            subprocess.run(
                [sys.executable, V4_SNAPSHOT_PY, "--tail", str(tail)],
                capture_output=True, text=True, timeout=90, check=False,
            )
        except Exception:
            pass
    if os.path.exists(V4_SNAPSHOT_JSON):
        try:
            with open(V4_SNAPSHOT_JSON, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            pass
    return {"snapshot_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "_v4_unavailable": True}


def read_ledger_fresh(sb_mod, queue_limit: int = 10) -> Dict[str, Any]:
    """FRESH (re-read every call) snapshot of ledger state.

    Uses shadow_block.summarize_ledger (flattened latest review per sha16)
    PLUS a raw scan for update_of marker count and pending queue detail.
    """
    fresh_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    result: Dict[str, Any] = {
        "fresh_snapshot_at": fresh_at,
        "ledger_path": W30A_LEDGER,
        "ledger_exists": os.path.exists(W30A_LEDGER),
        "ledger_sha": file_sha256(W30A_LEDGER),
        "total_entries": 0,
        "would_block_count": 0,
        "pending_review_count": 0,
        "true_positive_count": 0,
        "false_positive_count": 0,
        "confirmed_violation_count": 0,
        "by_verdict": {},
        "by_review_status": {},
        "update_of_marker_count": 0,
        "raw_line_count": 0,
        "_status": "OK",
    }

    if not result["ledger_exists"]:
        result["_status"] = "PENDING (ledger absent)"
        return result

    # Authoritative aggregate via shadow_block (flattened latest-per-sha16)
    if sb_mod is not None:
        try:
            summary = sb_mod.summarize_ledger()
            result["total_entries"] = summary.get("total", 0)
            result["would_block_count"] = summary.get("would_block_count", 0)
            result["pending_review_count"] = summary.get("pending_count", 0)
            result["by_verdict"] = dict(summary.get("by_verdict", {}))
            result["by_review_status"] = dict(summary.get("by_review_status", {}))
            # derive review-state-specific counts
            brs = result["by_review_status"]
            result["true_positive_count"] = brs.get("TRUE-POSITIVE", 0)
            result["false_positive_count"] = brs.get("FALSE-POSITIVE", 0)
            result["confirmed_violation_count"] = brs.get("CONFIRMED-VIOLATION", 0)
        except Exception as e:
            result["_status"] = f"summarize_ledger error: {e}"

    # Raw scan: count update_of marker rows + raw lines
    raw_lines = 0
    update_markers = 0
    try:
        with open(W30A_LEDGER, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                raw_lines += 1
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if obj.get("update_of"):
                    update_markers += 1
    except Exception:
        pass
    result["raw_line_count"] = raw_lines
    result["update_of_marker_count"] = update_markers

    # Pending review queue (top-N oldest PENDING entries, flattened)
    queue: List[Dict[str, Any]] = []
    if sb_mod is not None:
        try:
            entries = sb_mod.read_ledger(n=10 ** 9)
            pending_entries = [e for e in entries
                               if getattr(e, "false_positive_review", "") == "PENDING-REVIEW"]
            # oldest first (read_ledger preserves ledger order)
            for e in pending_entries[:queue_limit]:
                queue.append({
                    "sha16": getattr(e, "sha16", ""),
                    "artifact_path": getattr(e, "artifact_path", ""),
                    "overall_verdict": getattr(e, "overall_verdict", ""),
                    "would_block": bool(getattr(e, "would_block", False)),
                    "decision_code": getattr(e, "decision_code", None),
                    "audit_mode": getattr(e, "audit_mode", ""),
                    "ts_iso": getattr(e, "ts_iso", ""),
                    "review_status": getattr(e, "false_positive_review", ""),
                    "pass_count": getattr(e, "pass_count", 0),
                    "warn_count": getattr(e, "warn_count", 0),
                    "fail_count": getattr(e, "fail_count", 0),
                })
        except Exception as e:
            result["_queue_status"] = f"read_ledger error: {e}"
    result["pending_review_queue"] = queue
    result["queue_limit"] = queue_limit
    return result


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--out", default=OUT_JSON)
    ap.add_argument("--refresh-v4", action="store_true",
                    help="Re-run v4 snapshot before overlaying v5")
    ap.add_argument("--queue-limit", type=int, default=10)
    args = ap.parse_args()

    base = load_or_run_v4(args.tail, args.refresh_v4)
    base = dict(base)
    base["snapshot_at_v5"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    base["sidecar"] = {
        "variant": "v5",
        "wave": "W31C",
        "agent_pid": AGENT_PID,
        "apex_cosign": APEX_COSIGN,
        "supersedes": ["v1", "v2", "v3", "v4"],
        "discipline": "AETHER HIGH-ASSURANCE — sidecar-only, read-only on prior waves",
        "v5_purpose": "FRESH ledger snapshot (v4 captured race-state; v5 re-reads every build)",
    }

    sb_mod = _load_shadow_block()
    fresh_ledger = read_ledger_fresh(sb_mod, queue_limit=args.queue_limit)

    # Overlay fresh ledger summary at top level (new key) AND patch v4 audit_mode
    base["ledger_summary"] = fresh_ledger
    if "audit_mode" in base and isinstance(base["audit_mode"], dict):
        am = base["audit_mode"]
        if "shadow_ledger" in am and isinstance(am["shadow_ledger"], dict):
            sl = am["shadow_ledger"]
            sl["total_entries"] = fresh_ledger["total_entries"]
            sl["would_block_count"] = fresh_ledger["would_block_count"]
            sl["pending_review_count"] = fresh_ledger["pending_review_count"]
            sl["true_positive_count"] = fresh_ledger["true_positive_count"]
            sl["false_positive_count"] = fresh_ledger["false_positive_count"]
            sl["confirmed_violation_count"] = fresh_ledger["confirmed_violation_count"]
            sl["_status"] = fresh_ledger["_status"]
            sl["ledger_exists"] = fresh_ledger["ledger_exists"]
            sl["ledger_sha"] = fresh_ledger["ledger_sha"]
            sl["fresh_snapshot_at"] = fresh_ledger["fresh_snapshot_at"]
            sl["update_of_marker_count"] = fresh_ledger["update_of_marker_count"]
        # promotion-ready recompute on fresh counts
        am["promotion_ready"] = bool(
            fresh_ledger["ledger_exists"]
            and fresh_ledger["pending_review_count"] == 0
            and fresh_ledger["true_positive_count"] > 0
        )

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(base, fh, ensure_ascii=False, indent=2)

    print(f"snapshot-v5 ok: fresh_ledger entries={fresh_ledger['total_entries']} "
          f"would_block={fresh_ledger['would_block_count']} "
          f"pending={fresh_ledger['pending_review_count']} "
          f"tp={fresh_ledger['true_positive_count']} "
          f"fp={fresh_ledger['false_positive_count']} "
          f"updates={fresh_ledger['update_of_marker_count']} "
          f"raw_lines={fresh_ledger['raw_line_count']} "
          f"queue={len(fresh_ledger['pending_review_queue'])}")
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
