#!/usr/bin/env python3
"""
train_gslgnn_archive.py — GPU-WATCH ops agent
Train GSLGNN on 200K archive dataset with proper shuffling.
Fixes temporal label clustering that caused 0% F1 in chronological split.
"""

import sys
import os
import time
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from train_all_models import load_dataset, build_tensors, compute_metrics, get_class_weights
from models.gsl_gnn import GSLGNN


def main():
    # Load data
    dataset_path = os.path.join(os.path.dirname(__file__), "gnn-training-archive-200k.json")
    data = load_dataset(dataset_path, max_edges=200000)
    node_features, edge_index, labels = build_tensors(data)
    print(f"Tensors: {node_features.shape}, {edge_index.shape}, {labels.shape}")
    print(f"Label distribution: pos={labels.sum().item():.0f}, neg={(1-labels).sum().item():.0f}")

    # SHUFFLE edges to break temporal clustering
    n = len(labels)
    perm = torch.randperm(n)
    labels = labels[perm]
    edge_index = edge_index[:, perm]

    train_end = int(n * 0.7)
    val_end = int(n * 0.85)

    # Verify label distribution in each split
    train_pos = labels[:train_end].sum().item()
    val_pos = labels[train_end:val_end].sum().item()
    test_pos = labels[val_end:].sum().item()
    print(f"After shuffle:")
    print(f"  Train: {train_end} edges, {train_pos:.0f} suspicious ({train_pos/train_end*100:.2f}%)")
    print(f"  Val: {val_end-train_end} edges, {val_pos:.0f} suspicious ({val_pos/(val_end-train_end)*100:.2f}%)")
    print(f"  Test: {n-val_end} edges, {test_pos:.0f} suspicious ({test_pos/(n-val_end)*100:.2f}%)")

    # Train GSLGNN
    num_nodes = node_features.shape[0]
    model = GSLGNN(node_input_dim=node_features.shape[1], hidden_dim=64,
                   num_classes=2, gsl_hidden_dim=32)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.005, weight_decay=5e-4)

    pos_weight = get_class_weights(labels, train_end)
    ce_weights = torch.tensor([1.0, pos_weight])
    criterion = nn.CrossEntropyLoss(weight=ce_weights)
    labels_long = labels.long()

    epochs = 100
    best_val_f1 = 0
    best_state = None
    t0 = time.time()

    print(f"\nTraining GSLGNN: {num_nodes} nodes, {n} edges, {epochs} epochs")
    print("=" * 60)
    sys.stdout.flush()

    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()

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
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        if (epoch + 1) % 10 == 0 or epoch == 0:
            model.eval()
            with torch.no_grad():
                pred = (model(node_features, edge_index) > 0.5).float()
                val_m = compute_metrics(pred[train_end:val_end], labels[train_end:val_end])
                if val_m["f1"] > best_val_f1:
                    best_val_f1 = val_m["f1"]
                    best_state = {k: v.clone() for k, v in model.state_dict().items()}
            print(f"  Epoch {epoch+1:3d}: loss={loss.item():.4f}, "
                  f"val_acc={val_m['accuracy']:.4f}, val_prec={val_m['precision']:.4f}, "
                  f"val_rec={val_m['recall']:.4f}, val_f1={val_m['f1']:.4f}")
            sys.stdout.flush()

    elapsed = time.time() - t0

    if best_state:
        model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        pred = (model(node_features, edge_index) > 0.5).float()
        metrics = compute_metrics(pred[val_end:], labels[val_end:])

    print(f"\n{'='*60}")
    print(f"GSLGNN FINAL RESULTS (200K archive, shuffled, {epochs} epochs)")
    print(f"{'='*60}")
    print(f"  Accuracy:  {metrics['accuracy']:.4f} ({metrics['accuracy']*100:.2f}%)")
    print(f"  Precision: {metrics['precision']:.4f}")
    print(f"  Recall:    {metrics['recall']:.4f}")
    print(f"  F1 Score:  {metrics['f1']:.4f}")
    print(f"  TP={metrics['tp']}, FP={metrics['fp']}, FN={metrics['fn']}, TN={metrics['tn']}")
    print(f"  Training time: {elapsed:.1f}s")

    base_dir = os.path.dirname(__file__)
    model_path = os.path.join(base_dir, "gsl_model_archive_200k_shuffled.pt")
    torch.save(model.state_dict(), model_path)
    print(f"  Model saved: {model_path}")

    results_path = os.path.join(base_dir, "gslgnn_archive_200k_results.json")
    with open(results_path, "w") as f:
        json.dump({
            "model": "GSLGNN",
            "dataset": "200k_archive_shuffled",
            "epochs": epochs,
            "metrics": metrics,
            "training_time_s": elapsed,
            "best_val_f1": best_val_f1,
            "data": {
                "total": n,
                "train": train_end,
                "val": val_end - train_end,
                "test": n - val_end,
                "train_pos": train_pos,
                "val_pos": val_pos,
                "test_pos": test_pos,
            },
        }, f, indent=2)
    print(f"  Results saved: {results_path}")


if __name__ == "__main__":
    main()
