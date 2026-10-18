#!/usr/bin/env python3
"""
ContrastiveGNN Training (L2) — trained on same corpus as L4 GSLGNN
Reference: "Edge-Level GNN Architectures for Network Intrusion Detection"
Architecture: Accuracy target 94.71% (+2.84% over L0 baseline)
Uses supervised contrastive loss + cross-entropy dual objective.
"""
import json
import sys
import os
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

CORPUS_PATH = os.path.join(os.path.dirname(__file__), 'gslgnn_w9_3_corpus.json')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'contrastive_model.pt')

def load_corpus(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"Corpus: {data['stats']['totalEdges']} edges, {data['stats']['totalNodes']} nodes")
    print(f"Benign: {data['stats']['benign']}, Suspicious: {data['stats']['suspicious']}")
    return data

def build_node_features(nodes):
    features = []
    for node in nodes:
        features.append([
            min(node.get('edgeVolume', 0) / 100.0, 1.0),
            node.get('avgRisk', 0) / 9.0,
            node.get('maxRisk', 0) / 9.0,
            node.get('failureRate', 0),
            node.get('online', 1),
            node.get('trustTier', 1) / 3.0
        ])
    return np.array(features, dtype=np.float32)

def build_edge_index(data):
    node_map = {n['id']: i for i, n in enumerate(data['nodes'])}
    sources, targets = [], []
    for edge in data['edges']:
        sources.append(node_map.get(edge['source'], 0))
        targets.append(node_map.get(edge['target'], 0))
    return np.array([sources, targets], dtype=np.int64)

def build_labels(edges):
    return np.array([e.get('label', 0) for e in edges], dtype=np.float32)

def train_contrastive(epochs=60):
    try:
        import torch
        import torch.nn as nn
        from models.contrastive_gnn import ContrastiveGNN, SupervisedContrastiveLoss
    except ImportError as e:
        print(f"Import error: {e}"); sys.exit(1)

    data = load_corpus(CORPUS_PATH)

    node_features = torch.tensor(build_node_features(data['nodes']))
    edge_index    = torch.tensor(build_edge_index(data))
    labels        = torch.tensor(build_labels(data['edges']))
    labels_long   = labels.long()

    n = len(labels)
    train_end = int(n * 0.7)
    val_end   = int(n * 0.85)

    model         = ContrastiveGNN(node_input_dim=6, hidden_dim=64, projection_dim=64, num_classes=2)
    optimizer     = torch.optim.Adam(model.parameters(), lr=0.005, weight_decay=5e-4)
    ce_criterion  = nn.CrossEntropyLoss()
    sup_con_loss  = SupervisedContrastiveLoss(temperature=0.07)
    lambda_con    = 0.3  # contrastive loss weight

    BATCH = 512  # mini-batch for SupCon — avoids [N×N] OOM on 220k edges
    print(f"\nTraining ContrastiveGNN L2: {n} edges, {epochs} epochs, batch={BATCH}")
    print(f"Dual objective: CE + {lambda_con}*SupCon (mini-batch to avoid OOM)")

    best_val_acc = 0
    train_idx = torch.arange(train_end)

    for epoch in range(epochs):
        model.train()
        # Shuffle batches each epoch
        perm = train_idx[torch.randperm(train_end)]
        epoch_loss = 0.0
        n_batches = 0

        # Compute node embeddings once — reuse for all edge batches
        node_emb = model.encode_nodes(node_features, edge_index)
        node_emb_detach = node_emb.detach()  # detach for edge batches, reattach below

        for start in range(0, train_end, BATCH):
            batch_idx = perm[start:start + BATCH]
            if len(batch_idx) < 2:
                continue

            optimizer.zero_grad()

            # Recompute node emb with grad for this batch
            node_emb_g = model.encode_nodes(node_features, edge_index)
            row = edge_index[0][batch_idx]
            col = edge_index[1][batch_idx]
            edge_feat = model.edge_mlp(
                torch.cat([node_emb_g[row], node_emb_g[col]], dim=1)
            )
            projections = model.get_projections(edge_feat)
            logits = model.classifier(edge_feat)
            probs_batch = torch.softmax(logits, dim=-1)[:, 1]

            batch_labels = labels_long[batch_idx]
            loss_ce  = ce_criterion(logits, batch_labels)
            loss_con = sup_con_loss(projections, batch_labels)
            loss     = loss_ce + lambda_con * loss_con

            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
            n_batches += 1

        if (epoch + 1) % 10 == 0:
            model.eval()
            with torch.no_grad():
                pred = (model(node_features, edge_index) > 0.5).float()
                val_acc = (pred[train_end:val_end] == labels[train_end:val_end]).float().mean().item()
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
            avg_loss = epoch_loss / max(n_batches, 1)
            print(f"  Epoch {epoch+1}: avg_loss={avg_loss:.4f}, val_acc={val_acc:.4f}")

    model.eval()
    with torch.no_grad():
        pred        = (model(node_features, edge_index) > 0.5).float()
        test_labels = labels[val_end:]
        test_pred   = pred[val_end:]
        test_acc    = (test_pred == test_labels).float().mean().item()
        tp = ((test_pred == 1) & (test_labels == 1)).sum().item()
        fp = ((test_pred == 1) & (test_labels == 0)).sum().item()
        fn = ((test_pred == 0) & (test_labels == 1)).sum().item()
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    print(f"\n=== ContrastiveGNN L2 Test Results ===")
    print(f"Accuracy:  {test_acc:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1:        {f1:.4f}")
    print(f"Best val:  {best_val_acc:.4f}")

    torch.save(model.state_dict(), OUTPUT_PATH)
    print(f"Checkpoint saved: {OUTPUT_PATH}")

    return {"model": "ContrastiveGNN_L2", "accuracy": test_acc, "f1": f1,
            "precision": precision, "recall": recall, "checkpoint": OUTPUT_PATH}

if __name__ == "__main__":
    train_contrastive()
