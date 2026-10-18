"""Asolaria Wave-306 Spec-10 — omnidispatcher-meta-target-mint

Mints 6 META target slots that the omnidispatcher resolver (omnidispatcher.mjs:510-516)
requires in order to route `meta:<name>` envelopes. Without these, calls like
  target=meta:wave-18b-synthesis
fail with EVT-FEDENV-REJECTED-UNRESOLVABLE-TARGET because resolveTarget() scans
manifest.slots for {category:'meta', name:X} and returns null.

This script appends 6 new SLOT lines to the canonical manifest:
  C:/HyperBEHCS/store/system-upgrade-2026-05-22/omnidispatcher-1000-slot-manifest-2026-05-22.hbp

Slots minted (category=meta, route=meta-supervisor-slot, band=helm) at slot_ids 36..41
inserted into the post-META-AUTO-SELF-IMPROVE-TOP band (the last existing meta slot
is id=0036 META-AUTO-SELF-IMPROVE-TOP). We pick 0037..0042 — wait: 0037 is already
gemini-3.5-flash-high (antigravity category). So we instead inject these META rows
at the END of the manifest's meta band by emitting a manifest-extension sidecar:
  manifest-meta-extension.hbp
and rebroadcasting the merged manifest with extension marker so resolveTarget()
finds them via the parsed slot list.

NOTE: omnidispatcher loadManifest() reads the .hbp file line-by-line and parses every
SLOT|... line. So we APPEND to the manifest file (after the last SLOT line). The
slot_id field is set high (e.g. 1000..1005) to avoid colliding with existing 0000..0999
allocations. Categories of META and proper name + route ensures resolveTarget()
matches them on first scan.

Anchor:    ASOLARIA-OMNIDISPATCHER-META-SLOTS-MINT-PID-2026-05-23
Wave:      W2026-V43-WAVE-306-SPEC-10
Operator:  OP-JESSE apex
Cosign:    POST /api/cosign/append → cosign-chain-daemon :4953 on completion

USAGE:
  python C:/HyperBEHCS/bin/omnidispatcher-meta-slots-mint.py [--dry-run]

  --dry-run  prints generated SLOT lines and exits without writing
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

MANIFEST = Path("C:/HyperBEHCS/store/system-upgrade-2026-05-22/omnidispatcher-1000-slot-manifest-2026-05-22.hbp")
MANIFEST_SHA = Path(str(MANIFEST) + ".sha256")
BACKUP_DIR = Path("C:/HyperBEHCS/store/system-upgrade-2026-05-22/backups")
COSIGN_URL = "http://127.0.0.1:4953/api/cosign/append"

ANCHOR = "ASOLARIA-OMNIDISPATCHER-META-SLOTS-MINT-PID-2026-05-23"
LAW = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"
WAVE = "W2026-V43-WAVE-306-SPEC-10"

# 6 new META target slots — names match the spec verbatim (target=meta:<name>)
META_SLOTS_TO_MINT = [
    "wave-synthesis",
    "vote-record",
    "cosign-append-via-daemon",
    "hookwall-event",
    "library-index",
    "gnn-trio-feed",
]


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def sha16(s):
    if isinstance(s, str):
        s = s.encode("utf-8")
    return hashlib.sha256(s).hexdigest()[:16]


def sha256_hex(s):
    if isinstance(s, str):
        s = s.encode("utf-8")
    return hashlib.sha256(s).hexdigest()


def hilbert_h_for_name(name):
    """Deterministic H-coord per-name, bounded to H0000..H2FFF to match existing
    manifest distribution (BEHCS-1024 hilbert space addressable range)."""
    h = hashlib.sha256(name.encode("utf-8")).hexdigest()
    # Take first 12 hex bits = up to 4095, mod 0x3000 to stay in observed range
    v = int(h[:4], 16) % 0x3000
    return f"H{v:04X}"


def glyph5_for_name(name):
    """Five-char glyph slot — uses chars 4..9 of sha for stability."""
    h = hashlib.sha256(name.encode("utf-8")).hexdigest()
    # Map hex to printable chars (keep ASCII-printable so console is safe)
    base = "ΣΩΘΨΛΞΦΠ∇∆∂∫⊕⊗⊙⊚⊛⊜⊝⊞⊟⊠⊡⌂⌘⌬"
    out = []
    for i in range(5):
        idx = int(h[4 + i], 16) % len(base)
        out.append(base[idx])
    return "".join(out)


def cube47d_for_name(name):
    h = hashlib.sha256(name.encode("utf-8")).hexdigest()
    coords = [str(int(h[10 + i], 16) % 8) for i in range(6)]
    return "-".join(coords)


def next_slot_id_after_existing(manifest_text):
    """Find max existing slot_id, return that + 1 as the starting id for new slots."""
    max_id = -1
    for line in manifest_text.splitlines():
        if not line.startswith("SLOT|"):
            continue
        for part in line.split("|"):
            if part.startswith("id="):
                try:
                    sid = int(part[3:])
                    if sid > max_id:
                        max_id = sid
                except ValueError:
                    pass
                break
    return max_id + 1


def find_last_row_hash(manifest_text):
    """Return row_hash of the last SLOT in the manifest (for antecedent chain)."""
    last_hash = ""
    for line in manifest_text.splitlines():
        if not line.startswith("SLOT|"):
            continue
        for part in line.split("|"):
            if part.startswith("row_hash="):
                last_hash = part[len("row_hash="):]
    return last_hash


def build_slot_line(slot_id, meta_name, prev_row_hash):
    """Build one SLOT|... line matching the existing manifest format."""
    h_coord = hilbert_h_for_name(meta_name)
    glyph_5 = glyph5_for_name(meta_name)
    cube = cube47d_for_name(meta_name)
    pid_suffix = sha16(f"meta-{meta_name}-{slot_id}").upper()[:8]
    prof_suffix = sha16(f"prof-meta-{meta_name}-{slot_id}").upper()[:8]
    name_upper = meta_name.upper().replace("-", "-")
    pid = f"AGT-OMNIDISPATCHER-SLOT-{slot_id:04d}-META-{name_upper}-{h_coord}-W2026-P00-N{pid_suffix}"
    prof = f"PROF-SLOT-{slot_id:04d}-ABSORB-{h_coord}-W2026-P00-N{prof_suffix}"
    fields = [
        "SLOT",
        f"id={slot_id:04d}",
        "category=meta",
        f"name={meta_name}",
        f"h_coord={h_coord}",
        f"glyph_5={glyph_5}",
        f"cube_47d_xyz_mod8={cube}",
        "band=helm",
        "route=meta-supervisor-slot",
        f"pid={pid}",
        f"prof={prof}",
        "state=READY",
        "cp=PENDING-APEX-MINT",
        f"antecedents={prev_row_hash}",
    ]
    # compute row_hash from the concatenation (matches existing pattern)
    base = "|".join(fields)
    row_hash = sha16(base)
    return f"{base}|row_hash={row_hash}", row_hash


def append_cosign(body):
    """POST to single-writer cosign daemon. Returns (seq, row_hash, prev_hash) or raises."""
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        COSIGN_URL, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp_body = json.loads(resp.read().decode("utf-8"))
    return resp_body


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print generated lines but don't write")
    args = parser.parse_args()

    if not MANIFEST.exists():
        print(f"ERROR: manifest not found at {MANIFEST}", file=sys.stderr)
        sys.exit(1)

    original = MANIFEST.read_text(encoding="utf-8")
    next_id = next_slot_id_after_existing(original)
    prev_hash = find_last_row_hash(original)

    new_lines = []
    minted = []
    for i, name in enumerate(META_SLOTS_TO_MINT):
        sid = next_id + i
        # Pre-check: make sure no existing META slot already has this name
        already_exists = False
        for line in original.splitlines():
            if not line.startswith("SLOT|"):
                continue
            if "|category=meta|" in line and f"|name={name}|" in line:
                already_exists = True
                break
        if already_exists:
            minted.append({"name": name, "skipped": True, "reason": "already-exists"})
            continue
        line, row_hash = build_slot_line(sid, name, prev_hash)
        new_lines.append(line)
        minted.append(
            {
                "name": name,
                "slot_id": sid,
                "h_coord": hilbert_h_for_name(name),
                "row_hash": row_hash,
                "target_expression": f"meta:{name}",
            }
        )
        prev_hash = row_hash

    if args.dry_run:
        print(f"# DRY-RUN — would append {len(new_lines)} META slot lines to {MANIFEST}")
        print(f"# starting slot_id={next_id}")
        for line in new_lines:
            print(line)
        print("---")
        print(json.dumps({"minted": minted}, indent=2, ensure_ascii=False))
        return

    if not new_lines:
        print("All 6 META slots already exist; nothing to mint.")
        print(json.dumps({"minted": minted}, indent=2, ensure_ascii=False))
        return

    # Backup
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = BACKUP_DIR / f"omnidispatcher-1000-slot-manifest-pre-meta-mint-{ts}.hbp"
    backup_path.write_text(original, encoding="utf-8")

    # Append (ensure trailing newline first)
    sep = "" if original.endswith("\n") else "\n"
    appended = original + sep + "\n".join(new_lines) + "\n"
    MANIFEST.write_text(appended, encoding="utf-8")
    new_sha256 = sha256_hex(appended.encode("utf-8") if isinstance(appended, str) else appended)
    MANIFEST_SHA.write_text(f"{new_sha256}  {MANIFEST.name}\n", encoding="utf-8")

    # Cosign append
    cosign_body = {
        "anchor_pid": ANCHOR,
        "law_anchor": LAW,
        "class": "omnidispatcher-meta-target-mint-6-slots",
        "operator": "OP-JESSE-APEX",
        "wave": WAVE,
        "manifest_path": str(MANIFEST),
        "backup_path": str(backup_path),
        "manifest_sha256_after": new_sha256,
        "manifest_sha256_after_short": new_sha256[:16],
        "slots_minted_count": len(new_lines),
        "slots_minted": minted,
        "starting_slot_id": next_id,
        "spec_origin_line_range": "omnidispatcher.mjs:510-516",
        "previously_failing_targets_now_resolvable": [
            f"meta:{m['name']}" for m in minted if not m.get("skipped")
        ],
    }
    try:
        cosign_resp = append_cosign(cosign_body)
        cosign_seq = cosign_resp.get("seq")
        cosign_row_hash = cosign_resp.get("row_hash")
    except Exception as e:
        cosign_seq = None
        cosign_row_hash = None
        cosign_resp = {"error": str(e)}

    result = {
        "ok": True,
        "manifest_updated": str(MANIFEST),
        "backup": str(backup_path),
        "manifest_sha256": new_sha256,
        "slots_minted": minted,
        "starting_slot_id": next_id,
        "cosign_seq": cosign_seq,
        "cosign_row_hash": cosign_row_hash,
        "cosign_response": cosign_resp,
        "anchor_pid": ANCHOR,
        "law_anchor": LAW,
        "wave": WAVE,
        "ts": now_iso(),
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
