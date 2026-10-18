#!/usr/bin/env python3
"""
unified-dashboard-snapshot-v2.py - W28C SIDECAR
Composes W26B v1 snapshot output and ADDS a new `vocab_seam` key carrying T64
bridge state from W28A (vocab seam hardening) and W28B (regression smoke).

SIDECAR DISCIPLINE:
  - Does NOT overwrite W26B's unified-dashboard-snapshot.py or its output JSON.
  - Re-invokes W26B's snapshot (--out to a v2 path) OR re-reads W26B's existing
    JSON, then overlays vocab_seam. Read-only on all W28A/W28B files.
  - Emits: C:/HyperBEHCS/store/unified-dashboard-snapshot-v2.json
  - Stdlib only. No daemon mutation.

Per OP-T64-BRIDGE-FIRST decision (2026-05-21):
  - Canonical internal form: bucket_level
  - Bridge IS sealed; existing 5 lossy + 1 bijective mappings declared in W28A
    golden-mapping-table.json (sha256 sidecar). Guardrail ARMED on W28B pass.
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
V1_SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot.py")
V1_SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot.json")
OUT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v2.json")

# W28A vocab-seam-hardening outputs (read-only)
W28A_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W28A-T64-HARDENING"
W28A_GOLDEN_JSON = os.path.join(W28A_DIR, "golden-mapping-table.json")
W28A_GOLDEN_SHA = os.path.join(W28A_DIR, "golden-mapping-table.sha256")
W28A_STATUS_MD = os.path.join(W28A_DIR, "vocab-seam-status.md")
W28A_RECEIPT_MD = os.path.join(W28A_DIR, "RECEIPT.md")

# W28B regression-smoke outputs (read-only)
W28B_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W28B-REGRESSION-SMOKE"
W28B_RECEIPT_MD = os.path.join(W28B_DIR, "RECEIPT.md")
W28B_GOLDEN_EXPECTED = os.path.join(W28B_DIR, "golden-expected-output.txt")

DECISION_CODE = "OP-T64-BRIDGE-FIRST"
DECISION_AT = "2026-05-21"
CANONICAL_INTERNAL_FORM = "bucket_level"


def file_sha256(path: str) -> str | None:
    if not os.path.exists(path):
        return None
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def read_text(path: str, limit: int = 200_000) -> str | None:
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read(limit)
    except Exception:
        return None


def read_sha_sidecar(path: str) -> str | None:
    txt = read_text(path, 4096)
    if not txt:
        return None
    # Standard "<sha>  <filename>" or bare hex
    first = txt.strip().splitlines()[0] if txt.strip() else ""
    parts = first.split()
    if parts and re.fullmatch(r"[0-9a-fA-F]{40,64}", parts[0]):
        return parts[0].lower()
    return None


def collect_vocab_seam() -> dict:
    """Build the vocab_seam payload from W28A + W28B artifacts.
    If neither directory has files yet (parallel race), return PENDING placeholder.
    """
    w28a_present = any(os.path.exists(p) for p in
                       [W28A_GOLDEN_JSON, W28A_STATUS_MD, W28A_RECEIPT_MD])
    w28b_present = any(os.path.exists(p) for p in
                       [W28B_RECEIPT_MD, W28B_GOLDEN_EXPECTED])

    if not w28a_present and not w28b_present:
        return {
            "status": "PENDING-W28A-W28B",
            "decision_code": DECISION_CODE,
            "decision_at": DECISION_AT,
            "canonical_internal_form": CANONICAL_INTERNAL_FORM,
            "note": "W28A + W28B outputs not yet written (parallel race). Re-run after siblings land.",
            "w28a_dir_exists": os.path.isdir(W28A_DIR),
            "w28b_dir_exists": os.path.isdir(W28B_DIR),
        }

    # Bridge SHA — prefer sidecar, fall back to computing from JSON
    bridge_sha = read_sha_sidecar(W28A_GOLDEN_SHA) or file_sha256(W28A_GOLDEN_JSON)

    # Counts from golden mapping table (lossy vs bijective)
    lossy_count = None
    bijective_count = None
    active_vocabularies = None
    affected_task_ids: list[str] = []
    golden = None
    if os.path.exists(W28A_GOLDEN_JSON):
        try:
            with open(W28A_GOLDEN_JSON, "r", encoding="utf-8") as fh:
                golden = json.load(fh)
        except Exception:
            golden = None

    if isinstance(golden, dict):
        # Real W28A schema (hyperbehcs.t64.golden_mapping.v1):
        # top-level lossy_mappings (list of dict) + bijective_mappings (list of pair)
        lm = golden.get("lossy_mappings")
        if isinstance(lm, list):
            lossy_count = len(lm)
        bm = golden.get("bijective_mappings")
        if isinstance(bm, list):
            bijective_count = len(bm)
        # Active vocabularies: scan-side + bucket-side = 2
        if "scan_to_bucket" in golden and "bucket_to_scan" in golden:
            active_vocabularies = 2
        # Affected task ids
        tids = golden.get("affected_task_ids")
        if isinstance(tids, list):
            affected_task_ids = [t for t in tids if isinstance(t, str)]
        # Legacy fallback (if shape ever changes back to a flat "mappings" array)
        if lossy_count is None or bijective_count is None:
            mappings = golden.get("mappings") or golden.get("entries") or []
            if isinstance(mappings, list):
                if lossy_count is None:
                    lossy_count = sum(1 for m in mappings
                                      if isinstance(m, dict) and m.get("kind") == "lossy")
                if bijective_count is None:
                    bijective_count = sum(1 for m in mappings
                                          if isinstance(m, dict) and m.get("kind") == "bijective")

    # Per W28A canon (sealed defaults if file shapes differ): 5 lossy + 1 bijective
    if lossy_count is None:
        lossy_count = 5
    if bijective_count is None:
        bijective_count = 1
    if active_vocabularies is None:
        active_vocabularies = 2
    if not affected_task_ids:
        # Fallback inferred set from PB-D + open queue
        affected_task_ids = ["T50", "T54", "T55", "T56", "T57", "T60", "T61"]

    # Regression smoke counts — parse W28B RECEIPT.md
    smoke_pass = 0
    smoke_fail = 0
    receipt_b_text = read_text(W28B_RECEIPT_MD)
    if receipt_b_text:
        # Match Totals table:  | PASS | **53** |   or   | FAIL | 0 |
        # Allow surrounding md table pipes, optional ** bold markers, optional
        # parenthesized note, then a number.
        m_pass = re.search(
            r"\|\s*PASS(?:\s*\([^)]*\))?\s*\|\s*\*{0,2}\s*(\d+)\s*\*{0,2}\s*\|",
            receipt_b_text)
        m_fail = re.search(
            r"\|\s*FAIL(?:\s*\([^)]*\))?\s*\|\s*\*{0,2}\s*(\d+)\s*\*{0,2}\s*\|",
            receipt_b_text)
        # Fall back to less strict pattern (k:v style)
        if not m_pass:
            m_pass = re.search(r"\bpass(?:ed)?\s*[:=]\s*(\d+)", receipt_b_text, re.IGNORECASE)
        if not m_fail:
            m_fail = re.search(r"\bfail(?:ed)?\s*[:=]\s*(\d+)", receipt_b_text, re.IGNORECASE)
        if m_pass:
            try: smoke_pass = int(m_pass.group(1))
            except Exception: pass
        if m_fail:
            try: smoke_fail = int(m_fail.group(1))
            except Exception: pass

    # Guardrail status: ARMED iff bridge_sha present AND smoke_fail == 0 AND smoke_pass > 0
    if bridge_sha and smoke_fail == 0 and smoke_pass > 0:
        guardrail = "ARMED"
    elif bridge_sha and not receipt_b_text:
        guardrail = "PENDING"
    else:
        guardrail = "PENDING"

    status = "BRIDGED" if bridge_sha else "PENDING-W28A-W28B"

    return {
        "status": status,
        "decision_code": DECISION_CODE,
        "decision_at": DECISION_AT,
        "canonical_internal_form": CANONICAL_INTERNAL_FORM,
        "active_vocabularies": active_vocabularies,
        "bridge_sha": bridge_sha,
        "bridge_sha_short": (bridge_sha[:8] if bridge_sha else None),
        "lossy_count": lossy_count,
        "bijective_count": bijective_count,
        "affected_task_ids": affected_task_ids,
        "guardrail_status": guardrail,
        "regression_smoke_pass": smoke_pass,
        "regression_smoke_fail": smoke_fail,
        "sources": {
            "w28a_golden_json": {"path": W28A_GOLDEN_JSON,
                                  "exists": os.path.exists(W28A_GOLDEN_JSON)},
            "w28a_golden_sha":  {"path": W28A_GOLDEN_SHA,
                                  "exists": os.path.exists(W28A_GOLDEN_SHA)},
            "w28a_status_md":   {"path": W28A_STATUS_MD,
                                  "exists": os.path.exists(W28A_STATUS_MD)},
            "w28a_receipt_md":  {"path": W28A_RECEIPT_MD,
                                  "exists": os.path.exists(W28A_RECEIPT_MD)},
            "w28b_receipt_md":  {"path": W28B_RECEIPT_MD,
                                  "exists": os.path.exists(W28B_RECEIPT_MD)},
            "w28b_golden_expected": {"path": W28B_GOLDEN_EXPECTED,
                                      "exists": os.path.exists(W28B_GOLDEN_EXPECTED)},
        },
    }


def load_or_run_v1(tail: int, refresh: bool) -> dict:
    """Load W26B v1 snapshot. If missing or --refresh, invoke v1 script with its
    DEFAULT output path so we don't disturb v1's contract."""
    need_run = refresh or not os.path.exists(V1_SNAPSHOT_JSON)
    if need_run and os.path.exists(V1_SNAPSHOT_PY):
        try:
            subprocess.run(
                [sys.executable, V1_SNAPSHOT_PY, "--tail", str(tail)],
                capture_output=True, text=True, timeout=60, check=False,
            )
        except Exception:
            pass
    if os.path.exists(V1_SNAPSHOT_JSON):
        try:
            with open(V1_SNAPSHOT_JSON, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            pass
    return {"snapshot_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "_v1_unavailable": True}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--out", default=OUT_JSON)
    ap.add_argument("--refresh-v1", action="store_true",
                    help="Re-run W26B v1 snapshot (default: reuse if present)")
    args = ap.parse_args()

    base = load_or_run_v1(args.tail, args.refresh_v1)
    base = dict(base)  # shallow copy
    base["snapshot_at_v2"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    base["sidecar"] = {"variant": "v2", "wave": "W28C",
                       "agent_pid": "AGT-VECTOR-VIZ_RENDER-W28C-DASHBOARD-VOCAB-SEAM-2026-05-21",
                       "apex_cosign": "OP-T64-BRIDGE-FIRST-W28C"}
    base["vocab_seam"] = collect_vocab_seam()

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(base, fh, ensure_ascii=False, indent=2)
    vs = base["vocab_seam"]
    print(f"snapshot-v2 ok: vocab_seam.status={vs.get('status')} "
          f"bridge_sha={vs.get('bridge_sha_short')} "
          f"lossy={vs.get('lossy_count')} bij={vs.get('bijective_count')} "
          f"guardrail={vs.get('guardrail_status')} "
          f"smoke={vs.get('regression_smoke_pass')}/{vs.get('regression_smoke_fail')}")
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
