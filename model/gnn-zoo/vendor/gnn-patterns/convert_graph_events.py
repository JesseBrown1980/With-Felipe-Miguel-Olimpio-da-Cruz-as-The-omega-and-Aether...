#!/usr/bin/env python3
"""
convert_graph_events.py — ROOK ops agent
Converts raw Asolaria NDJSON graph runtime events into GNN training format.

Input:  C:/Users/acer/Asolaria/data/graph-runtime-events.ndjson (1.16M lines)
        C:/Users/acer/Asolaria/data/graph-runtime-events-archive-20260324.ndjson (997K lines)
Output: E:/sovereignty/research/gnn-patterns/gnn-training-export.json

Target format matches gnnDataExport.js output consumed by train_baseline.py:
  { ok, exportedAt, stats, nodes, edges, edgeIndex, format }

Nodes:  { id, type, edgeVolume, avgRisk, maxRisk, failureRate, online, trustTier }
Edges:  { index, source, target, action, category, component, riskScore, riskLevel,
           isMutation, crossDomain, approvalState, timestamp, label }
"""

import json
import sys
import os
from collections import defaultdict
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_DIR = "C:/Users/acer/Asolaria/data"
EVENTS_FILE = os.path.join(DATA_DIR, "graph-runtime-events.ndjson")
ARCHIVE_FILE = os.path.join(DATA_DIR, "graph-runtime-events-archive-20260324.ndjson")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "gnn-training-export.json")

# Risk score >= this threshold labels the edge as suspicious (1), else benign (0)
SUSPICIOUS_THRESHOLD = 6

# Node type mapping: actor.type -> node type string
ACTOR_TYPE_MAP = {
    "ai_agent": "ai_agent",
    "local_client": "local_client",
    "phone_device": "phone_device",
    "browser_tab": "browser_tab",
    "external_service": "external_service",
}

# Trust tier mapping based on node type (matches gnnDataExport.js)
# runtime -> 3, local_client -> 2, else -> 1
TRUST_TIER_MAP = {
    "runtime": 3,
    "local_client": 2,
}


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def parse_event(line):
    """Parse a single NDJSON line into a graph event dict. Returns None on failure."""
    line = line.strip()
    if not line:
        return None
    try:
        evt = json.loads(line)
    except json.JSONDecodeError:
        return None

    # Skip non-graph events and meta markers (like rotation_marker)
    if evt.get("kind") != "graph_event":
        return None
    if evt.get("id", "").startswith("rotation_marker"):
        return None

    return evt


def extract_actor_id(evt):
    """Resolve actor node id from event (matches gnnDataExport.js: actor.id)."""
    actor = evt.get("actor", {})
    return actor.get("id") or "unknown"


def extract_target_id(evt):
    """Resolve target node id from event (matches gnnDataExport.js: target.id)."""
    target = evt.get("target", {})
    return target.get("id") or "unknown"


def extract_actor_type(evt):
    """Resolve actor type string."""
    actor = evt.get("actor", {})
    raw = actor.get("type", "unknown")
    return ACTOR_TYPE_MAP.get(raw, raw)


def extract_target_type(evt):
    """Resolve target type string."""
    target = evt.get("target", {})
    raw = target.get("type", "unknown")
    return raw


def actor_domain(evt):
    return evt.get("actor", {}).get("domain", "local")


def target_domain(evt):
    return evt.get("target", {}).get("domain", "local")


# ---------------------------------------------------------------------------
# Core conversion
# ---------------------------------------------------------------------------

def convert_events(file_paths, max_events=None, verbose=True):
    """
    Read NDJSON files and produce the GNN training export dict.

    Args:
        file_paths: list of NDJSON file paths to read (order = chronological)
        max_events: cap on number of events to process (None = all)
        verbose: print progress

    Returns:
        dict matching gnnDataExport.js format
    """

    # Accumulators
    node_stats = defaultdict(lambda: {
        "type": "unknown",
        "risks": [],
        "failures": 0,
        "total": 0,
        "online": 1,
        "domain": "local",
    })
    edges = []
    categories = set()
    actions = set()
    edge_idx = 0
    processed = 0
    skipped = 0

    for fpath in file_paths:
        if not os.path.exists(fpath):
            if verbose:
                print(f"  [skip] {fpath} not found")
            continue
        if verbose:
            print(f"  Reading {fpath} ...")

        with open(fpath, "r", encoding="utf-8") as f:
            for line in f:
                if max_events is not None and processed >= max_events:
                    break

                evt = parse_event(line)
                if evt is None:
                    skipped += 1
                    continue

                # --- Extract fields ---
                src_id = extract_actor_id(evt)
                tgt_id = extract_target_id(evt)
                action = evt.get("action", "unknown")
                category = evt.get("category", "unknown")
                component = evt.get("component", "unknown")
                risk = evt.get("risk", {})
                risk_score = risk.get("score", 0)
                risk_level = risk.get("level", "low")
                ctx = evt.get("context", {})
                is_mutation = 1 if ctx.get("isMutation", False) else 0
                cross_domain = 1 if (actor_domain(evt) != target_domain(evt)) else 0
                approval = risk.get("approvalState", evt.get("policy", {}).get("approvalState", ""))
                timestamp = evt.get("at", "")
                status = evt.get("status", "ok")

                # --- Label: suspicious per ADR-0010 label policy ---
                # Matches gnnDataExport.js: risk>=6 OR blocked/denied status/action
                label = 0
                if risk_score >= SUSPICIOUS_THRESHOLD:
                    label = 1
                if status in ("blocked", "denied"):
                    label = 1
                if "blocked" in action or "denied" in action:
                    label = 1

                # --- Accumulate node stats ---
                for nid, ntype, ndomain in [
                    (src_id, extract_actor_type(evt), actor_domain(evt)),
                    (tgt_id, extract_target_type(evt), target_domain(evt)),
                ]:
                    ns = node_stats[nid]
                    ns["type"] = ntype
                    ns["risks"].append(risk_score)
                    ns["total"] += 1
                    ns["domain"] = ndomain
                    if status in ("error", "failed", "rejected"):
                        ns["failures"] += 1

                # --- Build edge ---
                edges.append({
                    "index": edge_idx,
                    "source": src_id,
                    "target": tgt_id,
                    "action": action,
                    "category": category,
                    "component": component,
                    "riskScore": risk_score,
                    "riskLevel": risk_level,
                    "isMutation": is_mutation,
                    "crossDomain": cross_domain,
                    "approvalState": approval,
                    "timestamp": timestamp,
                    "label": label,
                })

                categories.add(category)
                actions.add(action)
                edge_idx += 1
                processed += 1

        if max_events is not None and processed >= max_events:
            break

    # --- Build nodes ---
    nodes = []
    for nid, ns in node_stats.items():
        risks = ns["risks"]
        avg_risk = sum(risks) / len(risks) if risks else 0
        max_risk = max(risks) if risks else 0
        failure_rate = ns["failures"] / ns["total"] if ns["total"] > 0 else 0
        trust_tier = TRUST_TIER_MAP.get(ns["type"], 1)

        nodes.append({
            "id": nid,
            "type": ns["type"],
            "edgeVolume": ns["total"],
            "avgRisk": round(avg_risk, 2),
            "maxRisk": max_risk,
            "failureRate": round(failure_rate, 4),
            "online": ns["online"],
            "trustTier": trust_tier,
        })

    # --- Build edgeIndex (adjacency pairs) ---
    node_id_map = {n["id"]: i for i, n in enumerate(nodes)}
    sources = []
    targets = []
    for e in edges:
        sources.append(node_id_map.get(e["source"], 0))
        targets.append(node_id_map.get(e["target"], 0))

    benign = sum(1 for e in edges if e["label"] == 0)
    suspicious = sum(1 for e in edges if e["label"] == 1)

    result = {
        "ok": True,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "totalEvents": processed,
            "totalNodes": len(nodes),
            "totalEdges": len(edges),
            "benign": benign,
            "suspicious": suspicious,
            "labelRatio": round(suspicious / len(edges), 4) if edges else 0,
            "categories": sorted(categories),
            "actions": len(actions),
            "skippedLines": skipped,
        },
        "nodes": nodes,
        "edges": edges,
        "edgeIndex": [sources, targets],
        "format": "asolaria-gnn-v1",
    }

    if verbose:
        print(f"\n  Conversion complete:")
        print(f"    Events processed: {processed:,}")
        print(f"    Skipped lines:    {skipped:,}")
        print(f"    Nodes:            {len(nodes):,}")
        print(f"    Edges:            {len(edges):,}")
        print(f"    Benign:           {benign:,}")
        print(f"    Suspicious:       {suspicious:,}")
        print(f"    Label ratio:      {result['stats']['labelRatio']}")
        print(f"    Categories:       {len(categories)}")
        print(f"    Unique actions:   {len(actions)}")

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Convert Asolaria graph runtime events to GNN training format")
    parser.add_argument("--max-events", "-n", type=int, default=None,
                        help="Max events to process (default: all)")
    parser.add_argument("--output", "-o", type=str, default=OUTPUT_FILE,
                        help="Output JSON path")
    parser.add_argument("--archive", action="store_true", default=False,
                        help="Include the archive file (adds ~997K events)")
    parser.add_argument("--files", nargs="+", default=None,
                        help="Override: list of NDJSON files to read")
    args = parser.parse_args()

    print(f"=== Asolaria Graph Event -> GNN Converter ===")
    print(f"  Max events: {args.max_events or 'ALL'}")
    print(f"  Output:     {args.output}")

    if args.files:
        file_paths = args.files
    else:
        file_paths = [EVENTS_FILE]
        if args.archive:
            file_paths = [ARCHIVE_FILE] + file_paths  # archive first (older)

    result = convert_events(file_paths, max_events=args.max_events)

    print(f"\n  Writing {args.output} ...")
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, separators=(",", ":"))

    file_size = os.path.getsize(args.output)
    print(f"  Written: {file_size:,} bytes ({file_size / 1024 / 1024:.1f} MB)")
    print(f"  Done.")


if __name__ == "__main__":
    main()
