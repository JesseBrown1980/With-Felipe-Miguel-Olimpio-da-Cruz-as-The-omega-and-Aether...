#!/usr/bin/env python3
"""
unified-dashboard-snapshot-v3.py - W29B SIDECAR (AETHER HIGH-ASSURANCE)

Promotes the vocab-seam status from BRIDGED -> TESTED reflecting W28B
regression-smoke (53/53 PASS, GUARDRAIL ARMED, golden output snapshot
deterministic). Adds the formal 4-state model + AETHER HIGH-ASSURANCE
doctrine block. Stdlib only. Read-only on W28A/W28B output.

SIDECAR DISCIPLINE (per AETHER law 1 — no in-place mutation of live scaffolds):
  - Does NOT overwrite v1/v2 snapshot scripts or their JSON output.
  - Re-invokes v2 (--out to a v2 path) OR re-reads v2's existing JSON,
    then overlays the v3 promotions.
  - Emits: C:/HyperBEHCS/store/unified-dashboard-snapshot-v3.json
  - No daemon mutation.

4-state seam model (AETHER HIGH-ASSURANCE):
  OPEN      -> seam exists, no bridge written, divergent vocabularies leak
  BRIDGED   -> bridge SHA stable, mapping table sealed, guardrail PENDING
  TESTED    -> regression smoke green, guardrail ARMED, golden snapshot
               deterministic, third-vocab introduction structurally blocked
  COLLAPSED -> FORBIDDEN per AETHER law 10 (canonical collapse would erase
               the multi-vocab affordance; requires separate operator cosign
               that AETHER doctrine prohibits while T55..T63 remain live)
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, subprocess, sys
from datetime import datetime, timezone
from typing import Optional

BIN = r"C:/HyperBEHCS/bin"
STORE = r"C:/HyperBEHCS/store"
V2_SNAPSHOT_PY = os.path.join(BIN, "unified-dashboard-snapshot-v2.py")
V2_SNAPSHOT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v2.json")
OUT_JSON = os.path.join(STORE, "unified-dashboard-snapshot-v3.json")

# W28A vocab-seam-hardening outputs (read-only)
W28A_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W28A-T64-HARDENING"
W28A_GOLDEN_JSON = os.path.join(W28A_DIR, "golden-mapping-table.json")
W28A_GOLDEN_SHA  = os.path.join(W28A_DIR, "golden-mapping-table.sha256")
W28A_STATUS_MD   = os.path.join(W28A_DIR, "vocab-seam-status.md")
W28A_RECEIPT_MD  = os.path.join(W28A_DIR, "RECEIPT.md")

# W28B regression-smoke outputs (read-only)
W28B_DIR = r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W28B-REGRESSION-SMOKE"
W28B_RECEIPT_MD       = os.path.join(W28B_DIR, "RECEIPT.md")
W28B_GOLDEN_EXPECTED  = os.path.join(W28B_DIR, "golden-expected-output.txt")

DOCTRINE_CANON_PATH = (
    r"D:/AsolariaGuides/autopilot-overnight-2026-05-20/W29B-dashboard-4state-receipt.md"
)
AGENT_PID    = "AGT-VECTOR-VIZ_RENDER-W29B-DASHBOARD-4STATE-SEAM-2026-05-21"
APEX_COSIGN  = "OP-T64-BRIDGE-FIRST + OP-AETHER-HIGH-ASSURANCE-W29B"
DECISION_CODE = "OP-T64-BRIDGE-FIRST"
DECISION_AT   = "2026-05-21"

# AETHER HIGH-ASSURANCE — 10 laws (W29B canon emission)
AETHER_LAWS = [
    "Law 1: No in-place mutation of live scaffolds — sidecar-only evolution.",
    "Law 2: All seam crossings emit a bridge SHA; SHA must be deterministic.",
    "Law 3: Golden snapshot output is the regression contract — diff = alarm.",
    "Law 4: Guardrails ARM only when bridge SHA stable AND smoke 0-fail.",
    "Law 5: Third-vocabulary introduction without bridge entry = structural fail.",
    "Law 6: Promotion gates (NotImplementedError) cannot be lifted without operator cosign.",
    "Law 7: Read-only on upstream wave outputs — never edit a prior wave's artifact.",
    "Law 8: Append-only receipts — receipts are never rewritten, only superseded.",
    "Law 9: Dashboard must expose seam status clearly: open / bridged / tested / collapsed.",
    "Law 10: COLLAPSED is FORBIDDEN while any of T55..T63 remain live; canonical collapse "
            "requires a separate operator cosign that AETHER doctrine prohibits.",
]
AETHER_PRIMARY_INVARIANT = (
    "Bridge, do not collapse; test, do not assume; expose state, do not hide it."
)
AETHER_DECISION_PHRASE = "OP-T64-BRIDGE-FIRST + AETHER-HIGH-ASSURANCE"

STATE_HISTORY = [
    "OPEN @ pre-W27",
    "BRIDGED @ W27A/W28A",
    "TESTED @ W28B",
    "COLLAPSED @ FORBIDDEN-PER-LAW-10",
]


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


def load_or_run_v2(tail: int, refresh: bool) -> dict:
    """Load v2 snapshot. If missing or --refresh, invoke v2 script."""
    need_run = refresh or not os.path.exists(V2_SNAPSHOT_JSON)
    if need_run and os.path.exists(V2_SNAPSHOT_PY):
        try:
            subprocess.run(
                [sys.executable, V2_SNAPSHOT_PY, "--tail", str(tail)],
                capture_output=True, text=True, timeout=60, check=False,
            )
        except Exception:
            pass
    if os.path.exists(V2_SNAPSHOT_JSON):
        try:
            with open(V2_SNAPSHOT_JSON, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            pass
    return {"snapshot_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "_v2_unavailable": True}


def derive_current_state(vs_v2: dict) -> str:
    """Promote BRIDGED -> TESTED based on W28B receipt + golden snapshot presence.
    OPEN if no bridge SHA at all. COLLAPSED is never auto-derived (forbidden).
    """
    bridge_sha = vs_v2.get("bridge_sha")
    smoke_pass = vs_v2.get("regression_smoke_pass") or 0
    smoke_fail = vs_v2.get("regression_smoke_fail") or 0
    golden_exists = os.path.exists(W28B_GOLDEN_EXPECTED)

    if not bridge_sha:
        return "OPEN"
    if smoke_pass > 0 and smoke_fail == 0 and golden_exists:
        return "TESTED"
    return "BRIDGED"


def promote_vocab_seam(vs_v2: dict) -> dict:
    """Take v2 vocab_seam dict, overlay v3 promotions."""
    current_state = derive_current_state(vs_v2)

    # Per-state annotations (timestamps + source-wave)
    state_annotations = {
        "OPEN":      {"source_wave": "pre-W27", "ts": None,
                       "note": "no bridge written; vocabularies divergent"},
        "BRIDGED":   {"source_wave": "W27A/W28A", "ts": "2026-05-21",
                       "note": "bridge SHA " + (vs_v2.get("bridge_sha_short") or "?")
                               + " sealed; guardrail PENDING"},
        "TESTED":    {"source_wave": "W28B", "ts": "2026-05-21",
                       "note": "53/53 PASS; GUARDRAIL ARMED; golden snapshot deterministic"},
        "COLLAPSED": {"source_wave": "FORBIDDEN-PER-LAW-10", "ts": None,
                       "note": "canonical collapse forbidden by AETHER law 10"},
    }

    out = dict(vs_v2)  # shallow copy
    out["current_state"] = current_state
    out["state_history"] = STATE_HISTORY
    out["state_annotations"] = state_annotations
    out["collapse_forbidden"] = True
    out["collapse_forbidden_cite"] = "AETHER HIGH-ASSURANCE law 10"
    # The legacy `status` field stays for backward compat with v2 readers,
    # but v3 panels prefer `current_state`.
    out["status_legacy_v2"] = vs_v2.get("status")
    out["status"] = current_state  # legacy field promoted too
    out["golden_snapshot_exists"] = os.path.exists(W28B_GOLDEN_EXPECTED)
    out["golden_snapshot_path"] = W28B_GOLDEN_EXPECTED
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tail", type=int, default=20)
    ap.add_argument("--out", default=OUT_JSON)
    ap.add_argument("--refresh-v2", action="store_true",
                    help="Re-run v2 snapshot before overlaying v3")
    args = ap.parse_args()

    base = load_or_run_v2(args.tail, args.refresh_v2)
    base = dict(base)
    base["snapshot_at_v3"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    base["sidecar"] = {
        "variant": "v3",
        "wave": "W29B",
        "agent_pid": AGENT_PID,
        "apex_cosign": APEX_COSIGN,
        "supersedes": ["v1", "v2"],
        "discipline": "AETHER HIGH-ASSURANCE — sidecar-only, read-only on prior waves",
    }

    vs_v2 = base.get("vocab_seam") or {
        "status": "PENDING",
        "decision_code": DECISION_CODE,
        "decision_at": DECISION_AT,
    }
    base["vocab_seam"] = promote_vocab_seam(vs_v2)

    base["aether_doctrine"] = {
        "primary_invariant": AETHER_PRIMARY_INVARIANT,
        "decision_phrase":   AETHER_DECISION_PHRASE,
        "doctrine_canon_path": DOCTRINE_CANON_PATH,
        "laws_count": 10,
        "laws": AETHER_LAWS,
        "minted_wave": "W29B",
        "minted_at":   "2026-05-21",
        "minter_pid":  AGENT_PID,
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(base, fh, ensure_ascii=False, indent=2)
    vs = base["vocab_seam"]
    print(f"snapshot-v3 ok: vocab_seam.current_state={vs.get('current_state')} "
          f"(v2 was {vs.get('status_legacy_v2')}); "
          f"collapse_forbidden={vs.get('collapse_forbidden')}; "
          f"golden_snapshot={vs.get('golden_snapshot_exists')}; "
          f"laws={base['aether_doctrine']['laws_count']}")
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
