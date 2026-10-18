#!/usr/bin/env python3
# prototype_inference_server.py — :4795 serving L1 PrototypeGNN checkpoint
#
# L1 PrototypeGNN: distance-based edge classification with learnable prototypes.
# Architecture: GCN encoder → edge embedding → prototype distance logits.
# Checkpoint: prototype_model.pt  (sha256 first-16: 0ffa2bfaa6f7a281)
# Trained by: train_prototype.py on gslgnn_w9_3_corpus.json (60 epochs)
# Target accuracy: 94.24% (+2.37% over L0 baseline)
#
# Coexists with:
#   :4792 baseline EdgeLevelGNN (L0)
#   :4793 GSLGNN W9-3 v2       (L4)
# L2 ContrastiveGNN is NOT served — contrastive_model.pt absent (run train_contrastive.py).
import json
import sys
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import torch

sys.path.insert(0, os.path.dirname(__file__))
from models.prototype_gnn import PrototypeGNN

CHECKPOINT = Path(__file__).with_name("prototype_model.pt")
PORT = 4795


def normalize_state_dict_keys(state_dict):
    """
    Remap keys for bilateral PyG/non-PyG substrate compatibility.
    Real PyG GCNConv saves keys ending in .lin.bias; the fallback stub
    saves them as .bias.  Try both so the same .pt loads on either substrate.
    """
    model_keys = set(PrototypeGNN(6, 64).state_dict().keys())
    fixed = {}
    for k, v in state_dict.items():
        if k in model_keys:
            fixed[k] = v
        elif k.replace(".lin.bias", ".bias") in model_keys:
            fixed[k.replace(".lin.bias", ".bias")] = v
        elif (k.endswith(".bias") and ".lin." not in k
              and k.replace(".bias", ".lin.bias") in model_keys):
            fixed[k.replace(".bias", ".lin.bias")] = v
        else:
            fixed[k] = v
    return fixed


MODEL = PrototypeGNN(node_input_dim=6, hidden_dim=64, num_classes=2, num_prototypes_per_class=3)
_state_dict = torch.load(CHECKPOINT, map_location="cpu")
try:
    MODEL.load_state_dict(_state_dict)
except RuntimeError:
    MODEL.load_state_dict(normalize_state_dict_keys(_state_dict))
MODEL.eval()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass

    def do_GET(self):
        if self.path == "/health":
            body = {"ok": True, "model": "PrototypeGNN", "port": PORT,
                    "checkpoint": CHECKPOINT.name}
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(body).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        try:
            if self.path != "/infer":
                raise ValueError("POST /infer only")
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            nodes = payload.get("nodes", [])
            edges = payload.get("edges", [])
            if not nodes:
                raise ValueError("nodes required")
            if not edges:
                raise ValueError("at least one edge required")
            if any(len(x) != 6 for x in nodes):
                raise ValueError("expected nodes[*]=6 floats")
            if any(len(x) != 2 for x in edges):
                raise ValueError("expected edges[*]=2 ints")

            x = torch.tensor(nodes, dtype=torch.float32)
            edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()

            with torch.no_grad():
                scores = MODEL(x, edge_index).reshape(-1).tolist()

            body, code = {
                "scores": [float(v) for v in scores],
                "ok": True,
                "model": "PrototypeGNN",
                "level": "L1",
                "checkpoint": CHECKPOINT.name,
                "checkpoint_sha256_first16": "0ffa2bfaa6f7a281",
                "num_classes": 2,
                "num_prototypes_per_class": 3,
                "disclosure": (
                    "Prototype-distance edge classifier; "
                    "trained on gslgnn_w9_3_corpus (60 epochs); "
                    "score = P(anomaly); threshold 0.5 recommended"
                ),
            }, 200
        except Exception as ex:
            body, code = {"ok": False, "reason": str(ex)}, 400

        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())


if __name__ == "__main__":
    print(f"PrototypeGNN L1 inference server: 0.0.0.0:{PORT}  checkpoint={CHECKPOINT.name}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
