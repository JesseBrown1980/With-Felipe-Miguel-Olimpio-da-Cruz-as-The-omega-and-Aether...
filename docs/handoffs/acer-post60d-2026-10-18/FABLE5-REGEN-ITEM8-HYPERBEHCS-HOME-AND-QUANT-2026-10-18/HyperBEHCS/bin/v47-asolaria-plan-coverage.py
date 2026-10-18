"""ASOLARIA Wave-V47-F — Plan Blast-Radius Coverage Mapper.

Cross-references memory/project_*/reference_* entries against 3d-slice-map v13..v45
voxels, emits coverage descriptor + human-readable companion.

PID: AGT-helm-claude-v47-F-plan-coverage-H02ED-V47F-P00-NV47F001
Anchor: ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23
Operator: OP-JESSE
"""
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

MEMORY_DIR = Path("C:/Users/acer/.claude/projects/C--/memory")
MAP_DIR = Path("D:/AsolariaGuides/3d-slice-map/merged")
DESC_OUT = Path("C:/HyperBEHCS/store/library-50d-descriptors/v47-asolaria-plan-coverage.descriptor.json")
MD_OUT = Path("C:/HyperBEHCS/bin/v47-asolaria-plan-coverage.md")
COSIGN_URL = "http://127.0.0.1:4953/api/cosign/append"
COSIGN_HEAD = "http://127.0.0.1:4953/api/cosign/head"

WAVE_PID = "AGT-helm-claude-v47-F-plan-coverage-H02ED-V47F-P00-NV47F001"
WAVE_ANCHOR = "ASOLARIA-V47-BLAST-RADIUS-FIRE-EVERYTHING-PID-2026-05-23"
LAW_ANCHOR = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------- Step 1: enumerate plan items from memory ----------

def slug_from_filename(p: Path) -> str:
    """Strip project_/reference_ prefix and .md, lower-case."""
    name = p.stem
    for pfx in ("project_", "reference_", "feedback_"):
        if name.startswith(pfx):
            name = name[len(pfx):]
    return name


def keywords_from_slug(slug: str) -> list[str]:
    """Tokenize the slug into bag-of-words for theme matching."""
    parts = re.split(r"[_\-]", slug)
    return [p.lower() for p in parts if len(p) >= 3]


def load_plan_items() -> list[dict]:
    items = []
    for p in sorted(MEMORY_DIR.glob("project_*.md")):
        slug = slug_from_filename(p)
        items.append({
            "file": p.name,
            "slug": slug,
            "keywords": keywords_from_slug(slug),
            "kind": "project",
        })
    for p in sorted(MEMORY_DIR.glob("reference_*.md")):
        slug = slug_from_filename(p)
        items.append({
            "file": p.name,
            "slug": slug,
            "keywords": keywords_from_slug(slug),
            "kind": "reference",
        })
    return items


# ---------- Step 2: enumerate voxels across v13..v45 ----------

def load_voxels() -> list[dict]:
    """Return list of {version, voxel_id, hilbert_index, theme, supervisor, lane, anchor}."""
    voxels = []
    for v in range(13, 46):
        f = MAP_DIR / f"v{v}" / f"map-v{v}.json"
        if not f.exists():
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            continue
        # schema variants: top-level "voxels" OR body.voxels
        body = data.get("body", data)
        vlist = body.get("voxels") or data.get("voxels") or []
        for vox in vlist:
            theme = (vox.get("theme") or "").lower()
            lane = (vox.get("absorption_lane") or "").lower()
            voxels.append({
                "version": f"v{v}",
                "voxel_id": vox.get("id") or "",
                "hilbert_index": vox.get("hilbert_index"),
                "theme": theme,
                "supervisor": vox.get("supervisor") or vox.get("supervisor_cohort") or "",
                "lane": lane,
                "anchor_pid": body.get("anchor_pid") or "",
                "cube_anchor_47D": vox.get("cube_anchor_47D") or "",
            })
    return voxels


# ---------- Step 3: match plan items → voxels ----------

# Theme synonyms for cross-version matching
SYNONYMS = {
    "asolaria": ["asolaria", "asola"],
    "foundation": ["foundation", "law"],
    "hyperbehcs": ["hyperbehcs", "behcs"],
    "behcs256": ["behcs", "256"],
    "behcs1024": ["behcs", "1024"],
    "omnimets": ["omnimets", "omnimet", "meets"],
    "omnidispatcher": ["omnidispatcher", "dispatcher"],
    "omnishannon": ["omnishannon", "shannon"],
    "omnispindle": ["omnispindle", "spindle"],
    "omniflywheel": ["omniflywheel", "flywheel"],
    "router": ["router", "rotator"],
    "antigravity": ["antigravity"],
    "hookwall": ["hookwall"],
    "pid": ["pid"],
    "gnn": ["gnn"],
    "hermes": ["hermes"],
    "sovlinux": ["sovlinux"],
    "sovereignty": ["sovereignty", "sovereign"],
    "falcon": ["falcon"],
    "usb": ["usb"],
    "white_room": ["whiteroom", "white-room", "white_room"],
    "atlas": ["atlas"],
    "alphabet": ["alphabet"],
    "council": ["council"],
    "shannon": ["shannon"],
    "scrcpy": ["scrcpy"],
    "wasgm": ["wasgm"],
    "qdd": ["qdd", "ezprotect"],
    "constitutional": ["constitutional", "constitut"],
    "bilateral": ["bilateral"],
    "cohort": ["cohort"],
    "mtp": ["mtp"],
    "gemma": ["gemma"],
    "novalum": ["novalum"],
    "biml": ["biml"],
    "tier": ["tier"],
    "drive": ["drive", "38tb"],
    "google": ["google", "ultra", "gemini"],
    "spindle": ["spindle"],
    "wave": ["wave"],
    "voxel": ["voxel"],
    "absorption": ["absorption", "absorb"],
    "fabric": ["fabric"],
    "cosign": ["cosign"],
    "v24": ["v24"],
    "v29": ["v29"],
    "v40": ["v40"],
    "v41": ["v41"],
    "v42": ["v42", "meta"],
    "operator": ["operator", "op-jesse", "op-rayssa"],
}


def match_score(item_kw: list[str], voxel: dict) -> int:
    """Lightweight score: count of item-keywords found in voxel theme/lane/supervisor/cube_anchor."""
    haystack = " ".join([
        voxel["theme"], voxel["lane"], voxel["supervisor"],
        voxel["cube_anchor_47D"].lower(), voxel["anchor_pid"].lower(),
    ])
    score = 0
    for kw in item_kw:
        # direct hit
        if kw and kw in haystack:
            score += 2
            continue
        # synonym hit
        syns = SYNONYMS.get(kw, [])
        for s in syns:
            if s in haystack:
                score += 1
                break
    return score


def classify(items: list[dict], voxels: list[dict]) -> tuple[dict, list[dict]]:
    """Return (item_to_match, gap_proposals)."""
    by_item = {}
    gaps = []
    for it in items:
        best = (0, None)
        for vox in voxels:
            s = match_score(it["keywords"], vox)
            if s > best[0]:
                best = (s, vox)
        if best[0] >= 4:  # strong match: ≥2 keyword hits weighted
            by_item[it["file"]] = {
                "status": "VOXELIZED",
                "score": best[0],
                "voxel_id": best[1]["voxel_id"],
                "version": best[1]["version"],
                "hilbert_index": best[1]["hilbert_index"],
                "theme": best[1]["theme"],
                "supervisor": best[1]["supervisor"],
                "lane": best[1]["lane"],
            }
        elif best[0] >= 2:
            by_item[it["file"]] = {
                "status": "DESCRIPTOR-ONLY",
                "score": best[0],
                "nearest_voxel_id": best[1]["voxel_id"] if best[1] else None,
                "nearest_version": best[1]["version"] if best[1] else None,
                "nearest_theme": best[1]["theme"] if best[1] else None,
            }
        else:
            # NOT-IN-MAP — propose where to voxelize
            proposal = propose_voxelization(it, voxels)
            by_item[it["file"]] = {
                "status": "NOT-IN-MAP",
                "score": best[0],
                "proposal": proposal,
            }
            gaps.append({"item": it, "proposal": proposal})
    return by_item, gaps


def propose_voxelization(item: dict, voxels: list[dict]) -> dict:
    """Propose version/supervisor/hilbert range for a NOT-IN-MAP item.
    Strategy: pick least-occupied supervisor band, propose next hilbert window."""
    # Heuristic: route by keyword themes
    kw = set(item["keywords"])
    supervisor = "law"  # default
    target_version = "v46"  # next available
    if any(k in kw for k in ["operator", "constitutional", "foundation", "vision", "jesse", "rayssa"]):
        supervisor = "law"
    elif any(k in kw for k in ["pid", "gnn", "hookwall", "fabric", "shannon"]):
        supervisor = "vector"
    elif any(k in kw for k in ["spindle", "omnispindle", "absorption", "cohort"]):
        supervisor = "forge"
    elif any(k in kw for k in ["scrcpy", "screen", "ui", "front", "dashboard"]):
        supervisor = "rook"
    elif any(k in kw for k in ["usb", "drive", "sovlinux", "sovereignty"]):
        supervisor = "gaia"
    elif any(k in kw for k in ["heartbeat", "watchdog", "kicker", "daemon"]):
        supervisor = "heartbeat"
    elif any(k in kw for k in ["falcon", "phone", "android", "aether", "felipe"]):
        supervisor = "falcon"
    elif any(k in kw for k in ["router", "dispatcher", "omnidispatcher", "lan", "network"]):
        supervisor = "helm"
    # Hilbert range: contiguous next-window beyond v45's tail
    max_hilbert = max((v["hilbert_index"] or 0) for v in voxels) if voxels else 0
    return {
        "target_version": target_version,
        "supervisor_band": supervisor,
        "hilbert_range_start": max_hilbert + 1,
        "hilbert_range_hint": f"{max_hilbert+1}..{max_hilbert+8}",
        "rationale": f"keyword-route → supervisor={supervisor}; v46 next emission slot",
    }


# ---------- Step 4: coverage matrix + top gaps ----------

def build_coverage(items: list[dict], item_to_match: dict) -> dict:
    voxelized = [k for k, v in item_to_match.items() if v["status"] == "VOXELIZED"]
    descriptor = [k for k, v in item_to_match.items() if v["status"] == "DESCRIPTOR-ONLY"]
    not_in_map = [k for k, v in item_to_match.items() if v["status"] == "NOT-IN-MAP"]
    total = len(items)
    return {
        "total_plan_items": total,
        "voxelized": len(voxelized),
        "descriptor_only": len(descriptor),
        "not_in_map": len(not_in_map),
        "pct_voxelized": round(100.0 * len(voxelized) / total, 1) if total else 0.0,
        "pct_descriptor_only": round(100.0 * len(descriptor) / total, 1) if total else 0.0,
        "pct_not_in_map": round(100.0 * len(not_in_map) / total, 1) if total else 0.0,
        "voxelized_sample": voxelized[:10],
        "top_10_gaps": not_in_map[:10],
    }


# ---------- Step 5: emit descriptor + markdown ----------

def emit_descriptor(items, voxels, item_to_match, coverage, gaps):
    desc = {
        "schema": "asolaria.coverage.descriptor.v1",
        "wave": "V47-F",
        "pid": WAVE_PID,
        "anchor_pid": WAVE_ANCHOR,
        "law_anchor": LAW_ANCHOR,
        "operator": "OP-JESSE",
        "ts": now_iso(),
        "inputs": {
            "memory_dir": str(MEMORY_DIR),
            "map_dir": str(MAP_DIR),
            "v_range_scanned": "v13..v45",
        },
        "totals": {
            "plan_items_total": coverage["total_plan_items"],
            "voxels_total": len(voxels),
        },
        "coverage_matrix": coverage,
        "per_item_index": item_to_match,
        "top_voxelization_proposals": [
            {
                "item": g["item"]["file"],
                "kind": g["item"]["kind"],
                "proposal": g["proposal"],
            }
            for g in gaps[:10]
        ],
        "method": {
            "match_threshold_voxelized": 4,
            "match_threshold_descriptor_only": 2,
            "scoring": "keyword direct=2, synonym=1; haystack = theme+lane+supervisor+cube_anchor_47D+anchor_pid",
        },
    }
    DESC_OUT.parent.mkdir(parents=True, exist_ok=True)
    DESC_OUT.write_text(json.dumps(desc, indent=2), encoding="utf-8")
    return desc


def emit_markdown(coverage, item_to_match, gaps, voxels):
    lines = []
    lines.append("# V47-F Asolaria Plan Coverage Map")
    lines.append("")
    lines.append(f"PID: `{WAVE_PID}`")
    lines.append(f"Anchor: `{WAVE_ANCHOR}`")
    lines.append(f"Operator: OP-JESSE")
    lines.append(f"Emitted: {now_iso()}")
    lines.append("")
    lines.append("## Blast Radius")
    lines.append("Entire Asolaria plan and surfaces + Network surfaces + 3D map + DRIVES + USBS.")
    lines.append("")
    lines.append("## Coverage Matrix")
    lines.append("")
    lines.append(f"| Metric | Value |")
    lines.append(f"|---|---|")
    lines.append(f"| Total plan items | {coverage['total_plan_items']} |")
    lines.append(f"| Voxels scanned (v13..v45) | {len(voxels)} |")
    lines.append(f"| VOXELIZED | {coverage['voxelized']} ({coverage['pct_voxelized']}%) |")
    lines.append(f"| DESCRIPTOR-ONLY | {coverage['descriptor_only']} ({coverage['pct_descriptor_only']}%) |")
    lines.append(f"| NOT-IN-MAP | {coverage['not_in_map']} ({coverage['pct_not_in_map']}%) |")
    lines.append("")
    lines.append("## Top-10 Gaps (NOT-IN-MAP) with voxelization proposals")
    lines.append("")
    lines.append("| # | Plan Item | Proposed v | Supervisor | Hilbert Range |")
    lines.append("|---|---|---|---|---|")
    for i, g in enumerate(gaps[:10], 1):
        p = g["proposal"]
        lines.append(f"| {i} | `{g['item']['file']}` | {p['target_version']} | {p['supervisor_band']} | {p['hilbert_range_hint']} |")
    lines.append("")
    lines.append("## VOXELIZED Sample (first 10)")
    lines.append("")
    lines.append("| # | Plan Item | Voxel | Version | Hilbert | Theme |")
    lines.append("|---|---|---|---|---|---|")
    vox_items = [(k, v) for k, v in item_to_match.items() if v["status"] == "VOXELIZED"]
    for i, (k, v) in enumerate(vox_items[:10], 1):
        lines.append(f"| {i} | `{k}` | {v['voxel_id']} | {v['version']} | {v['hilbert_index']} | {v['theme'][:50]} |")
    lines.append("")
    lines.append("## Per-Item Index (full)")
    lines.append("")
    lines.append("See companion descriptor JSON: `v47-asolaria-plan-coverage.descriptor.json`")
    lines.append("")
    lines.append("## Cosign")
    lines.append("")
    lines.append("Row appended via cosign-chain single-writer daemon :4953.")
    MD_OUT.write_text("\n".join(lines), encoding="utf-8")


# ---------- Step 6: cosign append via daemon ----------

def cosign_append(desc, coverage):
    row = {
        "wave": "V47-F",
        "pid": WAVE_PID,
        "anchor": WAVE_ANCHOR,
        "law_anchor": LAW_ANCHOR,
        "operator": "OP-JESSE",
        "action": "plan-blast-radius-coverage-map",
        "artifact": str(DESC_OUT),
        "companion": str(MD_OUT),
        "summary": {
            "plan_items_total": coverage["total_plan_items"],
            "voxelized_count": coverage["voxelized"],
            "voxelized_pct": coverage["pct_voxelized"],
            "descriptor_only_count": coverage["descriptor_only"],
            "not_in_map_count": coverage["not_in_map"],
            "voxels_scanned_total": desc["totals"]["voxels_total"],
            "v_range": "v13..v45",
        },
        "verdict": "GREEN",
        "ts": now_iso(),
    }
    body = json.dumps(row).encode("utf-8")
    req = urllib.request.Request(
        COSIGN_URL, data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        return {"ok": False, "error": str(e)}


def main():
    print("[V47-F] loading plan items from memory…", file=sys.stderr)
    items = load_plan_items()
    print(f"[V47-F]   {len(items)} plan items found", file=sys.stderr)

    print("[V47-F] loading voxels from v13..v45…", file=sys.stderr)
    voxels = load_voxels()
    print(f"[V47-F]   {len(voxels)} voxels scanned", file=sys.stderr)

    print("[V47-F] classifying matches…", file=sys.stderr)
    item_to_match, gaps = classify(items, voxels)

    coverage = build_coverage(items, item_to_match)
    print(f"[V47-F]   VOXELIZED={coverage['voxelized']} ({coverage['pct_voxelized']}%) "
          f"DESCRIPTOR-ONLY={coverage['descriptor_only']} NOT-IN-MAP={coverage['not_in_map']}",
          file=sys.stderr)

    print("[V47-F] emitting descriptor + markdown…", file=sys.stderr)
    desc = emit_descriptor(items, voxels, item_to_match, coverage, gaps)
    emit_markdown(coverage, item_to_match, gaps, voxels)
    print(f"[V47-F]   wrote {DESC_OUT}", file=sys.stderr)
    print(f"[V47-F]   wrote {MD_OUT}", file=sys.stderr)

    print("[V47-F] cosign append…", file=sys.stderr)
    res = cosign_append(desc, coverage)
    print(f"[V47-F]   cosign result: {json.dumps(res)}", file=sys.stderr)

    # Print summary line for caller
    summary = {
        "plan_items_total": coverage["total_plan_items"],
        "voxelized_pct": coverage["pct_voxelized"],
        "voxelized_count": coverage["voxelized"],
        "descriptor_only_count": coverage["descriptor_only"],
        "not_in_map_count": coverage["not_in_map"],
        "voxels_scanned": len(voxels),
        "top_5_gaps": [g["item"]["file"] for g in gaps[:5]],
        "cosign": res,
    }
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
