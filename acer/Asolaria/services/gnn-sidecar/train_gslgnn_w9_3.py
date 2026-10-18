#!/usr/bin/env python3
# train_gslgnn_w9_3.py — seq=47 SHAPE_C upgrade path, BEHCS-256 fabric.
#
# CANON: this is NOT a separate ML pipeline. It's the W9-3 GSLGNN training
# stage of the BEHCS-256 fabric (per feedback_behcs256_is_the_fabric.md).
# Corpus pick "BOTH_CURRENT_AND_HISTORICAL" was fabric-ruled by acer council
# (192/234, dominant daemons+audit+sovereignty).
#
# Inputs (acer-local, fabric-ruled BOTH):
#   historical:  data/cubes/_orchestrator-ticks.ndjson (41.7 MB, ~hundreds of
#                thousands of orchestrator events with edge structure)
#   current:     data/behcs/acer-tensor-fabric/*.json (Phase-1 beat outputs,
#                signal_beats labels)
#
# Output: services/gnn-sidecar/gslgnn_w9_3_seq47.pt + manifest JSON with
# checkpoint_sha256 + corpus_manifest_sha256 for bilateral bus dispatch.
#
# 5 constraints honored:
#   C1 D11 honesty — checkpoint not PROVEN until empirical 3-substrate seq=47
#   C2 NEVER-WIPE — no sovereignty USB / chain mutation
#   C3 daemon restart — sidecar reload required post-checkpoint (separate step)
#   C4 bilateral bus dispatch of sha + manifest before swap-in
#   C5 failed seq=47 = honor HOLD (seq=45 stays unconditional high-water)

import json
import os
import sys
import hashlib
import glob
from pathlib import Path

ROOT = Path("C:/Users/acer/Asolaria")
HISTORICAL_TICKS = ROOT / "data" / "cubes" / "_orchestrator-ticks.ndjson"
CURRENT_TENSOR_DIR = ROOT / "data" / "behcs" / "acer-tensor-fabric"
SIDECAR_DIR = ROOT / "services" / "gnn-sidecar"
OUT_CHECKPOINT = SIDECAR_DIR / "gslgnn_w9_3_seq47_v2.pt"
OUT_MANIFEST = SIDECAR_DIR / "gslgnn_w9_3_seq47_v2_manifest.json"

sys.path.insert(0, str(SIDECAR_DIR))


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_str(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def load_historical_edges(path, max_lines=50000):
    """Orchestrator-ticks have CUBE TENSOR shape (axis_summary, agent_summary,
    cube primes). Build a graph: each axis/agent = node; edges between axes
    that co-occur in the same tick. Label = anomaly indicator (unknown_count >
    0 OR cube reconciliation mismatch).
    Adjusted to actual data shape per fabric ruling 205/234 daemons+audit."""
    nodes = {}
    edges = []
    if not path.exists():
        return nodes, edges
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for i, line in enumerate(f):
            if i >= max_lines:
                break
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except Exception:
                continue
            axis_sum = e.get("axis_summary") or []
            agent_sum = e.get("agent_summary") or []
            unknown = int(e.get("unknown_count", 0))
            cube_total = int(e.get("cube_total", 0))
            axis_count = int(e.get("axis_cube_count", 0))
            agent_count = int(e.get("agent_cube_count", 0))
            mismatch = max(0, cube_total - (axis_count + agent_count))
            tick_anomaly = 1 if (unknown > 0 or mismatch > 0) else 0

            # Each axis/agent is a node
            tick_nodes = []
            for it in axis_sum + agent_sum:
                if not isinstance(it, dict):
                    continue
                nid = (
                    it.get("axis")
                    or it.get("agent")
                    or it.get("name")
                    or "unknown_node"
                )
                records = int(it.get("records", 0))
                rbytes = int(it.get("bytes", 0))
                cube_prime = float(it.get("cube", 0))
                if nid not in nodes:
                    nodes[nid] = {
                        "id": nid,
                        "edgeVolume": 0,
                        "avgRisk": 0.0,
                        "maxRisk": 0.0,
                        "failureRate": 0.0,
                        "online": 1,
                        "trustTier": 1,
                    }
                nodes[nid]["edgeVolume"] += records
                # Higher cube primes encode deeper/sensitive dims — treat as
                # higher-risk nodes (D32 NEGATIVE_SPACE = 2,248,091 etc).
                normalized_risk = min(cube_prime / 100000.0, 9.0)
                nodes[nid]["avgRisk"] = (nodes[nid]["avgRisk"] + normalized_risk) / 2
                nodes[nid]["maxRisk"] = max(nodes[nid]["maxRisk"], normalized_risk)
                tick_nodes.append((nid, records, normalized_risk))

            # Edges: pairs co-occurring in this tick. Label edge as anomaly if
            # tick had unknown/mismatch OR either node has very high cube prime.
            for j in range(len(tick_nodes) - 1):
                src_id, src_records, src_risk = tick_nodes[j]
                tgt_id, tgt_records, tgt_risk = tick_nodes[j + 1]
                edge_risk = max(src_risk, tgt_risk)
                edge_label = 1 if (tick_anomaly or edge_risk >= 4.0) else 0
                edges.append({
                    "source": src_id,
                    "target": tgt_id,
                    "riskScore": float(edge_risk),
                    "isMutation": 0,
                    "crossDomain": 1 if src_id != tgt_id else 0,
                    "label": edge_label,
                    "tick_id": e.get("tick_id"),
                })
    return nodes, edges


def load_current_phase1(dir_path):
    """Each tensor-fabric output has a body distribution + immune fraction.
    Synthesize beat-edges with labels = signal-carrying."""
    nodes = {}
    edges = []
    for p in sorted(glob.glob(str(dir_path / "*.json"))):
        try:
            with open(p, "r", encoding="utf-8") as f:
                tf = json.load(f)
        except Exception:
            continue
        stats = tf.get("stats", {})
        bt = stats.get("bodyTally") or stats.get("body_tally") or {}
        immune = stats.get("immuneFraction", 0.0)
        signal = stats.get("signalBeats", 0)
        # synthesize 6 nodes (one per body) + edges between adjacent bodies
        bodies = ["nervous", "circulatory", "skeletal", "memory", "muscular", "immune"]
        for b in bodies:
            nid = f"phase1::{Path(p).stem}::{b}"
            count = bt.get(b, 0)
            if nid not in nodes:
                nodes[nid] = {
                    "id": nid,
                    "edgeVolume": count,
                    "avgRisk": 0.5 if b == "immune" else 0.2,
                    "maxRisk": 0.7 if b == "immune" else 0.3,
                    "failureRate": 0.0,
                    "online": 1,
                    "trustTier": 2,
                }
        for i in range(len(bodies) - 1):
            src = f"phase1::{Path(p).stem}::{bodies[i]}"
            tgt = f"phase1::{Path(p).stem}::{bodies[i+1]}"
            # label = 1 if this beat is signal-carrying (above floor)
            count = bt.get(bodies[i], 0) + bt.get(bodies[i+1], 0)
            label = 1 if count > 0 and signal > 0 else 0
            edges.append({
                "source": src,
                "target": tgt,
                "riskScore": float(immune * 6),  # immune fraction → risk
                "isMutation": 0,
                "crossDomain": 0,
                "label": label,
            })
    return nodes, edges


def build_corpus():
    print("[1/5] loading historical orchestrator-ticks (max 50K lines) ...")
    h_nodes, h_edges = load_historical_edges(HISTORICAL_TICKS, 50000)
    print(f"  historical: {len(h_nodes)} nodes, {len(h_edges)} edges")

    print("[2/5] loading current Phase-1 tensor-fabric outputs ...")
    c_nodes, c_edges = load_current_phase1(CURRENT_TENSOR_DIR)
    print(f"  current: {len(c_nodes)} nodes, {len(c_edges)} edges")

    nodes_dict = {**h_nodes, **c_nodes}
    nodes = list(nodes_dict.values())
    edges = h_edges + c_edges

    benign = sum(1 for e in edges if e["label"] == 0)
    suspicious = len(edges) - benign
    stats = {
        "totalNodes": len(nodes),
        "totalEdges": len(edges),
        "benign": benign,
        "suspicious": suspicious,
        "labelRatio": (suspicious / len(edges)) if edges else 0,
        "corpus": "BOTH_CURRENT_AND_HISTORICAL (acer-fabric-ruled 192/234)",
    }
    return {"stats": stats, "nodes": nodes, "edges": edges}


def train(corpus, epochs=30):
    import torch
    import torch.nn as nn
    from models.gsl_gnn import GSLGNN
    import numpy as np

    nodes = corpus["nodes"]
    edges = corpus["edges"]
    if not edges:
        print("[FATAL] no edges in corpus")
        return None

    print(f"[3/5] building tensors: {len(nodes)} nodes, {len(edges)} edges ...")
    node_id_to_idx = {n["id"]: i for i, n in enumerate(nodes)}
    nf = []
    for n in nodes:
        nf.append([
            min(n.get("edgeVolume", 0) / 100.0, 1.0),
            n.get("avgRisk", 0) / 9.0,
            n.get("maxRisk", 0) / 9.0,
            n.get("failureRate", 0),
            n.get("online", 1),
            n.get("trustTier", 1) / 3.0,
        ])
    node_features = torch.tensor(nf, dtype=torch.float32)
    src = [node_id_to_idx[e["source"]] for e in edges]
    tgt = [node_id_to_idx[e["target"]] for e in edges]
    edge_index = torch.tensor([src, tgt], dtype=torch.long)
    labels = torch.tensor([e["label"] for e in edges], dtype=torch.float32)

    n = len(labels)
    train_end = int(n * 0.7)
    val_end = int(n * 0.85)

    print(f"[4/5] training GSLGNN: {epochs} epochs, train={train_end} val={val_end-train_end} test={n-val_end} ...")
    model = GSLGNN(node_input_dim=node_features.shape[1], hidden_dim=64)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.005, weight_decay=5e-4)
    # GSLGNN.forward returns class-1 probabilities (post-softmax) in [0,1].
    # OPT_R1 balanced sampling via class-weighted BCE: pos_weight = neg_count
    # / pos_count counterbalances the imbalanced corpus (fabric ruling 205/234,
    # daemons+audit+sovereignty triad).
    pos_count = float(labels.sum().item())
    neg_count = float(len(labels) - pos_count)
    pos_weight_val = (neg_count / pos_count) if pos_count > 0 else 1.0
    print(f"  class-weight: pos_weight={pos_weight_val:.2f} (pos={int(pos_count)} neg={int(neg_count)})")
    # BCELoss with manual per-sample weighting (pos samples weighted up).
    def weighted_bce(p, y):
        eps = 1e-7
        p = p.clamp(eps, 1 - eps)
        loss_pos = -y * torch.log(p) * pos_weight_val
        loss_neg = -(1 - y) * torch.log(1 - p)
        return (loss_pos + loss_neg).mean()
    criterion = weighted_bce

    best_val = 0
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        scores = model(node_features, edge_index)  # 1D [num_edges] in [0,1]
        scores = scores.clamp(1e-7, 1 - 1e-7)  # avoid log(0)
        loss = criterion(scores[:train_end], labels[:train_end])
        loss.backward()
        optimizer.step()

        with torch.no_grad():
            model.eval()
            scores_eval = model(node_features, edge_index).clamp(1e-7, 1 - 1e-7)
            pred_v = (scores_eval[train_end:val_end] > 0.5).float()
            val_acc = (pred_v == labels[train_end:val_end]).float().mean().item()
            if val_acc > best_val:
                best_val = val_acc

        if (epoch + 1) % 5 == 0:
            print(f"  epoch {epoch+1}: loss={loss.item():.4f} val_acc={val_acc:.4f}")

    # Test
    with torch.no_grad():
        model.eval()
        scores = model(node_features, edge_index).clamp(1e-7, 1 - 1e-7)
        pred = (scores[val_end:] > 0.5).float()
        actual = labels[val_end:]
        test_acc = (pred == actual).float().mean().item()
        tp = ((pred == 1) & (actual == 1)).sum().item()
        fp = ((pred == 1) & (actual == 0)).sum().item()
        fn = ((pred == 0) & (actual == 1)).sum().item()
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    metrics = {
        "test_accuracy": test_acc,
        "test_precision": precision,
        "test_recall": recall,
        "test_f1": f1,
        "best_val_acc": best_val,
        "epochs": epochs,
        "train_size": train_end,
        "val_size": val_end - train_end,
        "test_size": n - val_end,
    }
    print(f"[4/5] metrics: {json.dumps(metrics, indent=2)}")

    torch.save(model.state_dict(), OUT_CHECKPOINT)
    print(f"[5/5] checkpoint saved: {OUT_CHECKPOINT}")
    return metrics


def main():
    print("=== W9-3 GSLGNN training (seq=47 SHAPE_C upgrade path) ===")
    corpus = build_corpus()

    # Save corpus to compute manifest sha
    corpus_json = json.dumps(corpus, indent=2)
    corpus_path = SIDECAR_DIR / "gslgnn_w9_3_corpus.json"
    with open(corpus_path, "w", encoding="utf-8") as f:
        f.write(corpus_json)
    corpus_sha = sha256_str(corpus_json)

    metrics = train(corpus)
    if metrics is None:
        return 1

    checkpoint_sha = sha256_file(OUT_CHECKPOINT)
    manifest = {
        "kind": "gslgnn_w9_3_seq47_manifest",
        "substrate": "BEHCS-256",
        "fabric_ruling": "BOTH_CURRENT_AND_HISTORICAL (acer council 192/234)",
        "corpus_path": str(corpus_path),
        "corpus_sha256": corpus_sha,
        "corpus_stats": corpus["stats"],
        "checkpoint_path": str(OUT_CHECKPOINT),
        "checkpoint_sha256": checkpoint_sha,
        "model_class": "services/gnn-sidecar/models/gsl_gnn.py::GSLGNN",
        "metrics": metrics,
        "d11": "OBSERVED-acer-w9_3-trained-pending-bilateral-verify",
        "constraints_honored": [
            "C1 D11 honesty — not PROVEN until empirical 3-substrate seq=47",
            "C2 NEVER-WIPE — no sovereignty USB / chain mutation",
            "C3 daemon restart — sidecar reload required post-checkpoint",
            "C4 bilateral bus dispatch sha + manifest before swap-in",
            "C5 failed seq=47 = honor HOLD (seq=45 stays unconditional)",
        ],
    }
    with open(OUT_MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
