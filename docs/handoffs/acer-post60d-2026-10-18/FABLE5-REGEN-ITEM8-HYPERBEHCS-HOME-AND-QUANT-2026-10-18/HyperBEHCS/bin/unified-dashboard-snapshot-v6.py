#!/usr/bin/env python3
"""
unified-dashboard-snapshot-v6.py - W32C SIDECAR (AETHER HIGH-ASSURANCE)

OP-W32-LEDGER-BARRIER-FIRST requirement 6: dashboard must expose
  ledger_snapshot_status = COMPLETE | PARTIAL | STALE | RACE-DETECTED
plus a reconciliation block.

Reads (read-only):
  - prior v5 snapshot JSON (load_or_run_v5: invoke if missing)
  - W32A shadow_block_v2 barrier primitives (PENDING placeholder if absent)
      getBarrierStatus(wave_id='W32')
      reconcileLedger() -> {pass, mismatch_count, recomputed_totals, ...}
  - W32B concurrency-fixture receipt + golden output (PENDING if absent)

Emits: C:/HyperBEHCS/store/unified-dashboard-snapshot-v6.json

NEW IN v6:
  - ledger_snapshot_status      (top-level: COMPLETE | PARTIAL | STALE |
                                 RACE-DETECTED | UNKNOWN-W32A-NOT-PRESENT)
  - reconciliation { pass, mismatch_count, recomputed_totals,
                     dashboard_totals, deltas, last_reconciled_at, _status }
  - concurrency_test { scenario_A, scenario_B, scenario_C,
                       overall, receipt_path, _status }

SIDECAR DISCIPLINE (AETHER law 1 — no in-place mutation):
  - Does NOT overwrite v1/v2/v3/v4/v5 snapshot scripts or their JSON outputs.
  - Re-invokes v5 OR re-reads v5's existing JSON, overlays v6 fields.
  - No daemon mutation. Stdlib only (plus sibling-import of shadow_block_v2).
"""
from __future__ import annotations
import argparse, hashlib, importlib.util, json, os, re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
V5_SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v5.py")
V5_SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v5.json")
OUT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v6.json")

W32A_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W32A-LEDGER-BARRIER"
W32A_MODULE_CANDIDATES = [
    os.path.join(W32A_DIR, "shadow_block_v2.py"),
    os.path.join(W32A_DIR, "barrier.py"),
    os.path.join(W32A_DIR, "ledger_barrier.py"),
]
W32B_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W32B-CONCURRENCY-FIXTURE"
W32B_RECEIPT_CANDIDATES = [
    os.path.join(W32B_DIR, "RECEIPT.md"),
    os.path.join(W32B_DIR, "W32B-receipt.md"),
    os.path.join(W32B_DIR, "receipt.md"),
    os.path.join(W32B_DIR, "golden-concurrency-outcomes.txt"),
]
W32B_GOLDEN_CANDIDATES = [
    os.path.join(W32B_DIR, "golden.json"),
    os.path.join(W32B_DIR, "golden-output.json"),
    os.path.join(W32B_DIR, "expected.json"),
    os.path.join(W32B_DIR, "harness-detail.json"),
]

AGENT_PID = "AGT-VECTOR-VIZ_RENDER-W32C-DASHBOARD-V6-SNAPSHOT-STATUS-2026-05-21"
APEX_COSIGN = "OP-W32-LEDGER-BARRIER-FIRST-W32C + OP-AETHER-HIGH-ASSURANCE"
DECISION_CODE = "OP-W32-LEDGER-BARRIER-FIRST"
DECISION_AT = "2026-05-21"


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def file_sha256(path: str) -> Optional[str]:
    if not os.path.exists(path):
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


def _load_w32a_module():
    """Sibling-import W32A shadow_block_v2 (or fallback barrier module).

    Returns the loaded module, or None if W32A is not yet present (race-safe).
    """
    path = _first_existing(W32A_MODULE_CANDIDATES)
    if not path:
        return None, None
    try:
        spec = importlib.util.spec_from_file_location("w32a_barrier", path)
        mod = importlib.util.module_from_spec(spec)
        sys.modules["w32a_barrier"] = mod
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        return mod, path
    except Exception:
        return None, path


def load_or_run_v5(tail: int, refresh: bool) -> dict:
    """Load v5 snapshot. If missing or --refresh-v5, invoke v5 script."""
    need_run = refresh or not os.path.exists(V5_SNAPSHOT_JSON)
    if need_run and os.path.exists(V5_SNAPSHOT_PY):
        try:
            subprocess.run(
                [sys.executable, V5_SNAPSHOT_PY, "--tail", str(tail)],
                capture_output=True, text=True, timeout=120, check=False,
            )
        except Exception:
            pass
    if os.path.exists(V5_SNAPSHOT_JSON):
        try:
            with open(V5_SNAPSHOT_JSON, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            pass
    return {"snapshot_at": _utcnow_iso(), "_v5_unavailable": True}


def compute_snapshot_status(w32a_mod, fresh_ledger: dict) -> Dict[str, Any]:
    """Compute ledger_snapshot_status. UNKNOWN-W32A-NOT-PRESENT if module
    absent (race-safe). Otherwise call getBarrierStatus(wave_id='W32')."""
    out: Dict[str, Any] = {
        "value": "UNKNOWN-W32A-NOT-PRESENT",
        "wave_id": "W32",
        "evaluated_at": _utcnow_iso(),
        "source": None,
        "_status": "W32A module absent (race-safe placeholder)",
    }
    if w32a_mod is None:
        return out
    fn = getattr(w32a_mod, "getBarrierStatus", None) or \
         getattr(w32a_mod, "get_barrier_status", None)
    if fn is None:
        out["_status"] = "W32A module present but getBarrierStatus not exported"
        return out
    try:
        r = fn(wave_id="W32")
        # Accept either string or dict {status: ..., ...}
        if isinstance(r, str):
            value = r
            detail: Dict[str, Any] = {}
        elif isinstance(r, dict):
            value = r.get("status") or r.get("value") or r.get("ledger_snapshot_status")
            detail = r
        else:
            value = str(r)
            detail = {"raw": repr(r)}
        if value not in {"COMPLETE", "PARTIAL", "STALE", "RACE-DETECTED"}:
            out["_status"] = f"W32A returned unrecognised value: {value!r}"
            out["value"] = "UNKNOWN-W32A-NOT-PRESENT"
        else:
            out["value"] = value
            out["_status"] = "OK"
        out["source"] = "W32A.getBarrierStatus"
        out["detail"] = detail
    except Exception as e:
        out["_status"] = f"getBarrierStatus error: {type(e).__name__}: {e}"
    return out


def run_reconciliation(w32a_mod, dashboard_totals: Dict[str, Any]) -> Dict[str, Any]:
    """Call W32A reconcileLedger() if present; compare to dashboard totals."""
    out: Dict[str, Any] = {
        "pass": False,
        "mismatch_count": None,
        "recomputed_totals": {},
        "dashboard_totals": dict(dashboard_totals or {}),
        "deltas": {},
        "last_reconciled_at": None,
        "_status": "W32A reconcileLedger absent (race-safe PENDING)",
    }
    if w32a_mod is None:
        return out
    fn = (getattr(w32a_mod, "reconcileLedger", None) or
          getattr(w32a_mod, "reconcile_ledger", None) or
          getattr(w32a_mod, "reconcile", None))
    if fn is None:
        out["_status"] = "W32A module present but reconcileLedger not exported"
        return out
    # Call with no args (W32A signature: reconcileLedger(wave_id=None))
    try:
        try:
            r = fn()
        except TypeError:
            # Fallback: some implementations require an argument
            r = fn(None)
    except Exception as e:
        out["_status"] = f"reconcileLedger error: {type(e).__name__}: {e}"
        return out
    # Normalise return: accept dict OR dataclass-with-to_dict OR plain object
    if hasattr(r, "to_dict") and callable(r.to_dict):
        try:
            r = r.to_dict()
        except Exception:
            pass
    if not isinstance(r, dict):
        # last-resort: pull __dict__ if it looks like a dataclass instance
        if hasattr(r, "__dict__"):
            r = dict(r.__dict__)
        else:
            out["_status"] = f"reconcileLedger returned non-dict: {type(r).__name__}"
            return out

    # Pull standard fields with tolerant key names (W32A returns:
    #   total, would_block, pending, by_verdict, by_review_status,
    #   snapshot_mismatch, snapshot_delta, wave_id)
    out["pass"] = (
        not bool(r.get("snapshot_mismatch", False))
        if "snapshot_mismatch" in r
        else bool(r.get("pass") or r.get("ok") or r.get("passed"))
    )
    out["mismatch_count"] = r.get("mismatch_count",
                                  r.get("mismatches",
                                        len(r.get("snapshot_delta") or {})
                                        if "snapshot_delta" in r else None))
    # Build recomputed_totals from W32A flat fields if not explicitly provided
    if "recomputed_totals" in r and isinstance(r["recomputed_totals"], dict):
        out["recomputed_totals"] = dict(r["recomputed_totals"])
    elif "recomputed" in r and isinstance(r["recomputed"], dict):
        out["recomputed_totals"] = dict(r["recomputed"])
    else:
        recomp: Dict[str, Any] = {}
        if "total" in r: recomp["total_entries"] = r["total"]
        if "would_block" in r: recomp["would_block_count"] = r["would_block"]
        if "pending" in r: recomp["pending_review_count"] = r["pending"]
        brs = r.get("by_review_status") or {}
        if "TRUE-POSITIVE" in brs: recomp["true_positive_count"] = brs["TRUE-POSITIVE"]
        if "FALSE-POSITIVE" in brs: recomp["false_positive_count"] = brs["FALSE-POSITIVE"]
        if "CONFIRMED-VIOLATION" in brs:
            recomp["confirmed_violation_count"] = brs["CONFIRMED-VIOLATION"]
        out["recomputed_totals"] = recomp
    out["deltas"] = dict(r.get("deltas", r.get("snapshot_delta", {})) or {})
    out["last_reconciled_at"] = r.get("last_reconciled_at") or _utcnow_iso()
    # Re-derive deltas locally if W32A didn't supply them but supplied recomputed
    if not out["deltas"] and out["recomputed_totals"]:
        for k, v in out["recomputed_totals"].items():
            dv = (dashboard_totals or {}).get(k)
            try:
                delta = (v or 0) - (dv or 0)
            except Exception:
                delta = None
            if delta != 0 and delta is not None:
                out["deltas"][k] = {"dashboard": dv, "recomputed": v, "delta": delta}
    # Re-derive mismatch_count if missing
    if out["mismatch_count"] is None:
        out["mismatch_count"] = len(out["deltas"])
    out["_status"] = "OK"
    return out


def parse_w32b_receipt(receipt_path: Optional[str],
                       golden_path: Optional[str]) -> Dict[str, Any]:
    """Best-effort parse of W32B outcomes for scenario A/B/C PASS/FAIL.

    Tries JSON harness-detail.json first (authoritative), then falls back to
    line-format golden-concurrency-outcomes.txt, then markdown receipt.
    """
    out: Dict[str, Any] = {
        "scenario_A": "PENDING",
        "scenario_B": "PENDING",
        "scenario_C": "PENDING",
        "overall": "PENDING",
        "receipt_path": receipt_path,
        "golden_path": golden_path,
        "_status": "W32B receipt absent (race-safe PENDING)",
    }

    # 1. Try harness-detail.json (authoritative)
    parsed_from = None
    if golden_path and os.path.exists(golden_path) \
            and golden_path.endswith(".json"):
        try:
            with open(golden_path, "r", encoding="utf-8") as fh:
                hd = json.load(fh)
            for letter in ("A", "B", "C"):
                key = "scenario_" + letter
                s = hd.get(key) or {}
                if isinstance(s, dict) and "pass" in s:
                    out[key] = "PASS" if s["pass"] else "FAIL"
                elif isinstance(s, str):
                    out[key] = s.upper()
            parsed_from = "harness-detail.json"
        except Exception as e:
            out["_status"] = f"harness-detail.json read error: {e}"

    # 2. Line-format golden-concurrency-outcomes.txt fallback
    if not parsed_from and receipt_path and os.path.exists(receipt_path):
        try:
            text = open(receipt_path, "r", encoding="utf-8",
                        errors="replace").read()
        except Exception as e:
            out["_status"] = f"W32B receipt read error: {e}"
            text = ""
        # Match lines like: "A | True | ..."
        for letter in ("A", "B", "C"):
            m = re.search(
                r"^\s*" + letter + r"\s*\|\s*(True|False|PASS|FAIL|SKIP|PENDING)\b",
                text, re.MULTILINE | re.IGNORECASE,
            )
            if m:
                v = m.group(1).strip()
                if v.lower() == "true":
                    out["scenario_" + letter] = "PASS"
                elif v.lower() == "false":
                    out["scenario_" + letter] = "FAIL"
                else:
                    out["scenario_" + letter] = v.upper()
        # Also try "scenario A: PASS" / "Scenario_B - FAIL" form (markdown)
        for letter in ("A", "B", "C"):
            if out["scenario_" + letter] != "PENDING":
                continue
            pat = re.compile(
                r"scenario[^A-Za-z0-9]*" + letter
                + r"\b[^\n]*?\b(PASS|FAIL|SKIP|PENDING)\b",
                re.IGNORECASE,
            )
            m2 = pat.search(text)
            if m2:
                out["scenario_" + letter] = m2.group(1).upper()
        if any(out["scenario_" + L] != "PENDING" for L in ("A", "B", "C")):
            parsed_from = os.path.basename(receipt_path)

    vals = [out["scenario_A"], out["scenario_B"], out["scenario_C"]]
    if all(v == "PASS" for v in vals):
        out["overall"] = "PASS"
    elif any(v == "FAIL" for v in vals):
        out["overall"] = "FAIL"
    elif all(v in ("PASS", "SKIP") for v in vals):
        out["overall"] = "PASS-WITH-SKIPS"
    elif all(v == "PENDING" for v in vals):
        out["overall"] = "PENDING"
    else:
        out["overall"] = "PARTIAL"
    if parsed_from:
        out["_status"] = f"OK (parsed from {parsed_from})"
    return out


def extract_dashboard_totals(base: dict) -> Dict[str, Any]:
    """Pull current dashboard totals from v5 base for reconciliation compare."""
    ls = (base.get("ledger_summary") or {})
    return {
        "total_entries": ls.get("total_entries", 0),
        "would_block_count": ls.get("would_block_count", 0),
        "pending_review_count": ls.get("pending_review_count", 0),
        "true_positive_count": ls.get("true_positive_count", 0),
        "false_positive_count": ls.get("false_positive_count", 0),
        "confirmed_violation_count": ls.get("confirmed_violation_count", 0),
        "update_of_marker_count": ls.get("update_of_marker_count", 0),
        "raw_line_count": ls.get("raw_line_count", 0),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--out", default=OUT_JSON)
    ap.add_argument("--refresh-v5", action="store_true",
                    help="Re-run v5 snapshot before overlaying v6")
    args = ap.parse_args()

    base = dict(load_or_run_v5(args.tail, args.refresh_v5))
    base["snapshot_at_v6"] = _utcnow_iso()
    base["sidecar"] = {
        "variant": "v6",
        "wave": "W32C",
        "agent_pid": AGENT_PID,
        "apex_cosign": APEX_COSIGN,
        "decision_code": DECISION_CODE,
        "decision_at": DECISION_AT,
        "supersedes": ["v1", "v2", "v3", "v4", "v5"],
        "discipline": "AETHER HIGH-ASSURANCE — sidecar-only, read-only on prior waves",
        "v6_purpose": "Ledger barrier status + reconciliation + concurrency-test surface",
    }

    w32a_mod, w32a_path = _load_w32a_module()
    fresh_ledger = base.get("ledger_summary") or {}
    snap_status = compute_snapshot_status(w32a_mod, fresh_ledger)
    dashboard_totals = extract_dashboard_totals(base)
    reconciliation = run_reconciliation(w32a_mod, dashboard_totals)
    w32b_receipt = _first_existing(W32B_RECEIPT_CANDIDATES)
    w32b_golden = _first_existing(W32B_GOLDEN_CANDIDATES)
    concurrency_test = parse_w32b_receipt(w32b_receipt, w32b_golden)

    # Top-level v6 fields
    base["ledger_snapshot_status"] = snap_status["value"]
    base["ledger_snapshot_status_detail"] = snap_status
    base["reconciliation"] = reconciliation
    base["concurrency_test"] = concurrency_test

    # Sources block for audit transparency
    base["v6_sources"] = {
        "w32a_module_path": {"path": w32a_path, "exists": w32a_path is not None,
                              "sha": file_sha256(w32a_path) if w32a_path else None},
        "w32b_receipt": {"path": w32b_receipt, "exists": w32b_receipt is not None,
                          "sha": file_sha256(w32b_receipt) if w32b_receipt else None},
        "w32b_golden": {"path": w32b_golden, "exists": w32b_golden is not None,
                         "sha": file_sha256(w32b_golden) if w32b_golden else None},
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(base, fh, ensure_ascii=False, indent=2)

    print(f"snapshot-v6 ok: ledger_snapshot_status={snap_status['value']} "
          f"(w32a_present={w32a_mod is not None}) "
          f"reconciliation.pass={reconciliation['pass']} "
          f"mismatch_count={reconciliation['mismatch_count']} "
          f"concurrency={concurrency_test['scenario_A']}/{concurrency_test['scenario_B']}/{concurrency_test['scenario_C']} "
          f"(overall={concurrency_test['overall']})")
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
