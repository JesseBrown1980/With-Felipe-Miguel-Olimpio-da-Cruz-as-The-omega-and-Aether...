#!/usr/bin/env python3
# gslgnn_inference_server.py — :4793 endpoint serving the W9-3 GSLGNN v2 checkpoint
# trained on BOTH_CURRENT_AND_HISTORICAL corpus (fabric ruling 205/234).
#
# Coexists with baseline EdgeLevelGNN sidecar at :4792 — separate endpoints
# preserve voter_2 (acer-micro) AND add distinct voter pathway via :4793.
import json
import sys
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import torch

sys.path.insert(0, os.path.dirname(__file__))
from models.gsl_gnn import GSLGNN

CHECKPOINT = Path(__file__).with_name("gslgnn_w9_3_seq47_v2.pt")
PORT = 4793

MODEL = GSLGNN(node_input_dim=6, hidden_dim=64)
state_dict = torch.load(CHECKPOINT, map_location="cpu")
# Fix PyTorch API drift: remap keys to match current model architecture
model_keys = set(MODEL.state_dict().keys())
fixed = {}
for k, v in state_dict.items():
    if k in model_keys:
        fixed[k] = v
    elif k.replace(".lin.bias", ".bias") in model_keys:
        fixed[k.replace(".lin.bias", ".bias")] = v
    elif k.endswith(".bias") and ".lin." not in k and k.replace(".bias", ".lin.bias") in model_keys:
        fixed[k.replace(".bias", ".lin.bias")] = v
    else:
        fixed[k] = v
MODEL.load_state_dict(fixed)
MODEL.eval()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def do_POST(self):
        try:
            if self.path != "/infer":
                raise ValueError("POST /infer only")
            payload = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))))
            nodes, edges = payload.get("nodes", []), payload.get("edges", [])
            if any(len(x) != 6 for x in nodes):
                raise ValueError("expected nodes[*]=6 floats")
            if not edges:
                raise ValueError("at least one edge required")
            x = torch.tensor(nodes, dtype=torch.float32)
            edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
            with torch.no_grad():
                scores = MODEL(x, edge_index).reshape(-1).tolist()
            body, code = {
                "scores": [float(v) for v in scores],
                "ok": True,
                "model": "GSLGNN",
                "checkpoint": "gslgnn_w9_3_seq47_v2.pt",
                "checkpoint_sha256_first16": "9e50723b10c9de5c",
                "disclosure": "label-rule-learnability not generalization; fit-for-body-tally-scoring",
            }, 200
        except Exception as ex:
            body, code = {"ok": False, "reason": str(ex)}, 400
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())


if __name__ == "__main__":
    print(f"GSLGNN inference server: 0.0.0.0:{PORT} checkpoint={CHECKPOINT.name}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
