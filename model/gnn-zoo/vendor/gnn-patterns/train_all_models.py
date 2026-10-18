#!/usr/bin/env python3
"""
train_all_models.py — ROOK ops agent
Trains all 4 GNN models on Asolaria graph runtime events.

Models:
  1. EdgeLevelGNN (baseline)        -> baseline_model_retrained.pt
  2. ContrastiveGNN                 -> contrastive_model.pt
  3. PrototypeGNN                   -> prototype_model.pt
  4. GSLGNN                         -> gsl_model.pt
"""

import json
import sys
import os
import time
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv

from models.gnn_baseline import EdgeLevelGNN
from models.contrastive_gnn import ContrastiveGNN, SupervisedContrastiveLoss
from models.prototype_gnn import PrototypeGNN
from models.gsl_gnn import GSLGNN


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_dataset(path, max_edges=None):
    """Load GNN training export JSON. Optionally cap edges for sample runs."""
    print(f"Loading {path} ...")
    t0 = time.time()
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    elapsed = time.time() - t0
    print(f"  Loaded in {elapsed:.1f}s: {data['stats']['totalEdges']} edges, {data['stats']['totalNodes']} nodes")
    print(f"  Benign: {data['stats']['benign']}, Suspicious: {data['stats']['suspicious']}")
    print(f"  Label ratio: {data['stats']['labelRatio']}")

    if max_edges and max_edges < len(data["edges"]):
        print(f"  Capping to {max_edges} edges (sample run)")
        data["edges"] = data["edges"][:max_edges]
        node_map = {n["id"]: i for i, n in enumerate(data["nodes"])}
        sources = [node_map.get(e["source"], 0) for e in data["edges"]]
        targets = [node_map.get(e["target"], 0) for e in data["edges"]]
        data["edgeIndex"] = [sources, targets]
        benign = sum(1 for e in data["edges"] if e["label"] == 0)
        suspicious = max_edges - benign
        data["stats"]["totalEdges"] = max_edges
        data["stats"]["benign"] = benign
        data["stats"]["suspicious"] = suspicious

    return data


def build_tensors(data):
    """Convert data dict to PyTorch tensors."""
    node_features = []
    for node in data["nodes"]:
        node_features.append([
            min(node.get("edgeVolume", 0) / 100.0, 1.0),
            node.get("avgRisk", 0) / 9.0,
            node.get("maxRisk", 0) / 9.0,
            node.get("failureRate", 0),
            node.get("online", 1),
            node.get("trustTier", 1) / 3.0,
        ])
    node_features = torch.tensor(node_features, dtype=torch.float32)
    edge_index = torch.tensor(data["edgeIndex"], dtype=torch.long)
    labels = torch.tensor([e.get("label", 0) for e in data["edges"]], dtype=torch.float32)
    return node_features, edge_index, labels


def split_data(n, train_ratio=0.7, val_ratio=0.15):
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    return train_end, val_end


def compute_metrics(pred, labels):
    tp = ((pred == 1) & (labels == 1)).sum().item()
    fp = ((pred == 1) & (labels == 0)).sum().item()
    fn = ((pred == 0) & (labels == 1)).sum().item()
    tn = ((pred == 0) & (labels == 0)).sum().item()
    total = len(labels)
    acc = (tp + tn) / total if total > 0 else 0
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
    return {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1,
            "tp": tp, "fp": fp, "fn": fn, "tn": tn}


def get_class_weights(labels, train_end):
    """Compute inverse-frequency class weights for imbalanced data."""
    train_labels = labels[:train_end]
    n_pos = train_labels.sum().item()
    n_neg = train_end - n_pos
    if n_pos == 0 or n_neg == 0:
        return 1.0  # Can't balance, return uniform
    # Weight for positive class = n_neg / n_pos (upweight minority)
    pos_weight = n_neg / n_pos
    print(f"  Class weights: neg=1.0, pos={pos_weight:.2f} (ratio {n_pos/train_end:.4f})")
    return pos_weight


# ---------------------------------------------------------------------------
# Training functions
# ---------------------------------------------------------------------------

def train_edge_level_gnn(node_features, edge_index, labels, epochs=50, lr=0.01, save_path=None):
    """Train EdgeLevelGNN baseline with class-weighted BCE."""
    n = len(labels)
    train_end, val_end = split_data(n)
    model = EdgeLevelGNN(node_input_dim=node_features.shape[1], hidden_dim=64)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)

    pos_weight = get_class_weights(labels, train_end)
    # Use BCEWithLogitsLoss with pos_weight for proper class balancing
    # But model outputs sigmoid already, so use manual weighting with BCELoss
    weight_tensor = torch.ones_like(labels[:train_end])
    weight_tensor[labels[:train_end] == 1] = pos_weight

    print(f"\n{'='*60}")
    print(f"Training EdgeLevelGNN: {node_features.shape[0]} nodes, {n} edges, {epochs} epochs")
    print(f"Split: train={train_end}, val={val_end - train_end}, test={n - val_end}")
    print(f"{'='*60}")

    best_val_f1 = 0
    best_state = None
    t0 = time.time()
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        out = model(node_features, edge_index)
        # Weighted BCE: manually apply per-sample weights
        bce = F.binary_cross_entropy(out[:train_end], labels[:train_end], weight=weight_tensor)
        bce.backward()
        optimizer.step()

        if (epoch + 1) % 10 == 0 or epoch == 0:
            model.eval()
            with torch.no_grad():
                pred = (model(node_features, edge_index) > 0.5).float()
                val_metrics = compute_metrics(pred[train_end:val_end], labels[train_end:val_end])
                if val_metrics["f1"] > best_val_f1:
                    best_val_f1 = val_metrics["f1"]
                    best_state = {k: v.clone() for k, v in model.state_dict().items()}
            print(f"  Epoch {epoch + 1:3d}: loss={bce.item():.4f}, val_acc={val_metrics['accuracy']:.4f}, val_f1={val_metrics['f1']:.4f}")

    elapsed = time.time() - t0
    # Restore best model
    if best_state:
        model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        pred = (model(node_features, edge_index) > 0.5).float()
        metrics = compute_metrics(pred[val_end:], labels[val_end:])

    print(f"\n  Test Results: acc={metrics['accuracy']:.4f}, prec={metrics['precision']:.4f}, "
          f"rec={metrics['recall']:.4f}, f1={metrics['f1']:.4f}")
    print(f"  Training time: {elapsed:.1f}s")

    if save_path:
        torch.save(model.state_dict(), save_path)
        print(f"  Saved: {save_path}")

    return model, metrics


def train_contrastive_gnn(node_features, edge_index, labels, epochs=50, lr=0.005, save_path=None):
    """Train ContrastiveGNN with combined contrastive + weighted CE loss."""
    n = len(labels)
    train_end, val_end = split_data(n)
    model = ContrastiveGNN(node_input_dim=node_features.shape[1], hidden_dim=64,
                           projection_dim=64, num_classes=2)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)

    pos_weight = get_class_weights(labels, train_end)
    ce_weights = torch.tensor([1.0, pos_weight])
    ce_loss_fn = nn.CrossEntropyLoss(weight=ce_weights)
    contrastive_loss_fn = SupervisedContrastiveLoss(temperature=0.07)
    labels_long = labels.long()

    print(f"\n{'='*60}")
    print(f"Training ContrastiveGNN: {node_features.shape[0]} nodes, {n} edges, {epochs} epochs")
    print(f"Split: train={train_end}, val={val_end - train_end}, test={n - val_end}")
    print(f"{'='*60}")

    best_val_f1 = 0
    best_state = None
    t0 = time.time()
    batch_size = min(4096, train_end)

    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()

        probs, projections = model(node_features, edge_index, return_projections=True)
        node_emb = model.encode_nodes(node_features, edge_index)
        edge_emb = model.get_edge_embeddings(node_emb, edge_index)
        logits = model.classifier(edge_emb)

        ce_loss = ce_loss_fn(logits[:train_end], labels_long[:train_end])

        if train_end > batch_size:
            idx = torch.randperm(train_end)[:batch_size]
        else:
            idx = torch.arange(train_end)
        con_loss = contrastive_loss_fn(projections[idx], labels[idx])

        loss = ce_loss + 0.5 * con_loss
        loss.backward()
        optimizer.step()

        if (epoch + 1) % 10 == 0 or epoch == 0:
            model.eval()
            with torch.no_grad():
                pred = (model(node_features, edge_index) > 0.5).float()
                val_metrics = compute_metrics(pred[train_end:val_end], labels[train_end:val_end])
                if val_metrics["f1"] > best_val_f1:
                    best_val_f1 = val_metrics["f1"]
                    best_state = {k: v.clone() for k, v in model.state_dict().items()}
            print(f"  Epoch {epoch + 1:3d}: loss={loss.item():.4f} (ce={ce_loss.item():.4f}, con={con_loss.item():.4f}), val_f1={val_metrics['f1']:.4f}")

    elapsed = time.time() - t0
    if best_state:
        model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        pred = (model(node_features, edge_index) > 0.5).float()
        metrics = compute_metrics(pred[val_end:], labels[val_end:])

    print(f"\n  Test Results: acc={metrics['accuracy']:.4f}, prec={metrics['precision']:.4f}, "
          f"rec={metrics['recall']:.4f}, f1={metrics['f1']:.4f}")
    print(f"  Training time: {elapsed:.1f}s")

    if save_path:
        torch.save(model.state_dict(), save_path)
        print(f"  Saved: {save_path}")

    return model, metrics


def train_prototype_gnn(node_features, edge_index, labels, epochs=50, lr=0.005, save_path=None):
    """Train PrototypeGNN with weighted CE loss."""
    n = len(labels)
    train_end, val_end = split_data(n)
    model = PrototypeGNN(node_input_dim=node_features.shape[1], hidden_dim=64,
                         num_classes=2, num_prototypes_per_class=3, temperature=0.1)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)
    labels_long = labels.long()

    pos_weight = get_class_weights(labels, train_end)
    ce_weights = torch.tensor([1.0, pos_weight])
    criterion = nn.CrossEntropyLoss(weight=ce_weights)

    print(f"\n{'='*60}")
    print(f"Training PrototypeGNN: {node_features.shape[0]} nodes, {n} edges, {epochs} epochs")
    print(f"Split: train={train_end}, val={val_end - train_end}, test={n - val_end}")
    print(f"{'='*60}")

    best_val_f1 = 0
    best_state = None
    t0 = time.time()

    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()

        node_emb = model.encode_nodes(node_features, edge_index)
        edge_emb = model.get_edge_embeddings(node_emb, edge_index)
        logits = model.compute_prototype_distances(edge_emb)

        loss = criterion(logits[:train_end], labels_long[:train_end])
        loss.backward()
        optimizer.step()

        if (epoch + 1) % 10 == 0 or epoch == 0:
            model.eval()
            with torch.no_grad():
                pred = (model(node_features, edge_index) > 0.5).float()
                val_metrics = compute_metrics(pred[train_end:val_end], labels[train_end:val_end])
                if val_metrics["f1"] > best_val_f1:
                    best_val_f1 = val_metrics["f1"]
                    best_state = {k: v.clone() for k, v in model.state_dict().items()}
            print(f"  Epoch {epoch + 1:3d}: loss={loss.item():.4f}, val_f1={val_metrics['f1']:.4f}")

    elapsed = time.time() - t0
    if best_state:
        model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        pred = (model(node_features, edge_index) > 0.5).float()
        metrics = compute_metrics(pred[val_end:], labels[val_end:])

    print(f"\n  Test Results: acc={metrics['accuracy']:.4f}, prec={metrics['precision']:.4f}, "
          f"rec={metrics['recall']:.4f}, f1={metrics['f1']:.4f}")
    print(f"  Training time: {elapsed:.1f}s")

    if save_path:
        torch.save(model.state_dict(), save_path)
        print(f"  Saved: {save_path}")

    return model, metrics


def train_gsl_gnn(node_features, edge_index, labels, epochs=50, lr=0.005, save_path=None,
                  max_nodes_for_gsl=5000):
    """Train GSLGNN with weighted CE loss. Caps nodes for O(N^2) adjacency."""
    n = len(labels)
    train_end, val_end = split_data(n)
    num_nodes = node_features.shape[0]

    if num_nodes > max_nodes_for_gsl:
        print(f"  [GSL] {num_nodes} nodes > {max_nodes_for_gsl} limit. Subsampling nodes.")

    model = GSLGNN(node_input_dim=node_features.shape[1], hidden_dim=64,
                   num_classes=2, gsl_hidden_dim=32)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)
    labels_long = labels.long()

    pos_weight = get_class_weights(labels, train_end)
    ce_weights = torch.tensor([1.0, pos_weight])
    criterion = nn.CrossEntropyLoss(weight=ce_weights)

    print(f"\n{'='*60}")
    print(f"Training GSLGNN: {num_nodes} nodes, {n} edges, {epochs} epochs")
    print(f"Split: train={train_end}, val={val_end - train_end}, test={n - val_end}")
    print(f"{'='*60}")

    best_val_f1 = 0
    best_state = None
    t0 = time.time()

    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()

        # GSL forward: learn adjacency + encode
        learned_adj = model.gsl(node_features, edge_index)
        learned_adj = learned_adj + torch.eye(num_nodes)
        degree = learned_adj.sum(dim=1, keepdim=True).clamp(min=1)
        learned_adj_norm = learned_adj / degree

        node_emb_learned = model.encode_with_learned_graph(node_features, learned_adj_norm)
        node_emb_orig = model.encode_with_original_graph(node_features, edge_index)

        row, col = edge_index
        combined = torch.cat([
            torch.cat([node_emb_learned[row], node_emb_learned[col]], dim=1),
            torch.cat([node_emb_orig[row], node_emb_orig[col]], dim=1),
        ], dim=1)
        logits = model.edge_classifier(combined)

        loss = criterion(logits[:train_end], labels_long[:train_end])
        loss.backward()
        # Gradient clipping to prevent instability
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        if (epoch + 1) % 10 == 0 or epoch == 0:
            model.eval()
            with torch.no_grad():
                pred = (model(node_features, edge_index) > 0.5).float()
                val_metrics = compute_metrics(pred[train_end:val_end], labels[train_end:val_end])
                if val_metrics["f1"] > best_val_f1:
                    best_val_f1 = val_metrics["f1"]
                    best_state = {k: v.clone() for k, v in model.state_dict().items()}
            print(f"  Epoch {epoch + 1:3d}: loss={loss.item():.4f}, val_f1={val_metrics['f1']:.4f}")

    elapsed = time.time() - t0
    if best_state:
        model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        pred = (model(node_features, edge_index) > 0.5).float()
        metrics = compute_metrics(pred[val_end:], labels[val_end:])

    print(f"\n  Test Results: acc={metrics['accuracy']:.4f}, prec={metrics['precision']:.4f}, "
          f"rec={metrics['recall']:.4f}, f1={metrics['f1']:.4f}")
    print(f"  Training time: {elapsed:.1f}s")

    if save_path:
        torch.save(model.state_dict(), save_path)
        print(f"  Saved: {save_path}")

    return model, metrics


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Train all 4 GNN models")
    parser.add_argument("--max-edges", "-n", type=int, default=None)
    parser.add_argument("--epochs", "-e", type=int, default=50)
    parser.add_argument("--dataset", "-d", type=str,
                        default=os.path.join(os.path.dirname(__file__), "gnn-training-export.json"))
    parser.add_argument("--gsl-node-limit", type=int, default=5000)
    args = parser.parse_args()

    base_dir = os.path.dirname(__file__)

    data = load_dataset(args.dataset, max_edges=args.max_edges)
    node_features, edge_index, labels = build_tensors(data)
    print(f"\nTensors: node_features={node_features.shape}, edge_index={edge_index.shape}, "
          f"labels={labels.shape} (pos={labels.sum().item():.0f}, neg={(1-labels).sum().item():.0f})")

    results = {}

    # 1. EdgeLevelGNN
    _, metrics = train_edge_level_gnn(
        node_features, edge_index, labels, epochs=args.epochs,
        save_path=os.path.join(base_dir, "baseline_model_retrained.pt"))
    results["EdgeLevelGNN"] = metrics

    # 2. ContrastiveGNN
    _, metrics = train_contrastive_gnn(
        node_features, edge_index, labels, epochs=args.epochs,
        save_path=os.path.join(base_dir, "contrastive_model.pt"))
    results["ContrastiveGNN"] = metrics

    # 3. PrototypeGNN
    _, metrics = train_prototype_gnn(
        node_features, edge_index, labels, epochs=args.epochs,
        save_path=os.path.join(base_dir, "prototype_model.pt"))
    results["PrototypeGNN"] = metrics

    # 4. GSLGNN
    _, metrics = train_gsl_gnn(
        node_features, edge_index, labels, epochs=args.epochs,
        save_path=os.path.join(base_dir, "gsl_model.pt"),
        max_nodes_for_gsl=args.gsl_node_limit)
    results["GSLGNN"] = metrics

    # Summary
    print(f"\n{'='*60}")
    print(f"{'MODEL':<20} {'ACC':>8} {'PREC':>8} {'REC':>8} {'F1':>8}")
    print(f"{'='*60}")
    for name, m in results.items():
        print(f"{name:<20} {m['accuracy']:>8.4f} {m['precision']:>8.4f} {m['recall']:>8.4f} {m['f1']:>8.4f}")
    print(f"{'='*60}")

    summary_path = os.path.join(base_dir, "training_results.json")
    with open(summary_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved: {summary_path}")


if __name__ == "__main__":
    main()
