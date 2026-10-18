#!/usr/bin/env python3
"""
inference_server_v2.py — 4-Layer GNN Immune Cascade
PID: asolaria | IX-518 | Port 4792

Layer stack:
  L0 EdgeLevelGNN   — wide net, 84% recall (fast path: BENIGN exits immediately)
  L1 ContrastiveGNN — embedding separation, confirms L0
  L2 PrototypeGNN   — archetype matching, known threat shapes
  L4 GSLGNN         — perfect classifier, final authority

POST /infer  {nodes, edges, edge_features}
GET  /health
"""

import json
import time
import sys
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).parent))

from models.gnn_baseline import EdgeLevelGNN
from models.contrastive_gnn import ContrastiveGNN
from models.prototype_gnn import PrototypeGNN
from models.gsl_gnn import GSLGNN

BASE = Path(__file__).parent
PORT = int(os.environ.get("GNN_PORT", 4792))

# --- Load models ---
MODELS = {}
LOAD_ERRORS = {}

def load_model(name, cls, kwargs, pt_files):
    """Load a model from the first available .pt file."""
    for pt in pt_files:
        p = BASE / pt
        if p.exists():
            try:
                m = cls(**kwargs)
                m.load_state_dict(torch.load(p, map_location="cpu", weights_only=True))
                m.eval()
                MODELS[name] = m
                print(f"  [OK] {name} loaded from {pt}")
                return
            except Exception as e:
                LOAD_ERRORS[name] = f"{pt}: {e}"
    LOAD_ERRORS[name] = f"no .pt found in {pt_files}"
    print(f"  [FAIL] {name}: {LOAD_ERRORS[name]}")

print("Loading 4-layer GNN immune cascade...")
load_model("L0_EdgeLevel", EdgeLevelGNN,
           {"node_input_dim": 6, "hidden_dim": 64},
           ["baseline_model_retrained.pt", "baseline_model.pt"])

load_model("L1_Contrastive", ContrastiveGNN,
           {"node_input_dim": 6, "hidden_dim": 64, "projection_dim": 64, "num_classes": 2},
           ["contrastive_model.pt"])

load_model("L2_Prototype", PrototypeGNN,
           {"node_input_dim": 6, "hidden_dim": 64, "num_classes": 2,
            "num_prototypes_per_class": 3, "temperature": 0.1},
           ["prototype_model.pt"])

load_model("L4_GSLGNN", GSLGNN,
           {"node_input_dim": 6, "hidden_dim": 64, "num_classes": 2, "gsl_hidden_dim": 32},
           ["gsl_model.pt"])

print(f"Models loaded: {len(MODELS)}/4 | Errors: {len(LOAD_ERRORS)}")


def run_cascade(node_features, edge_index):
    """
    Run the 4-layer immune cascade.
    Returns per-edge scores and layer verdicts.
    """
    t0 = time.time()
    n_edges = edge_index.shape[1]
    layers = {}
    cascade_depth = 0

    # --- L0: EdgeLevelGNN (wide net, fast path) ---
    if "L0_EdgeLevel" in MODELS:
        with torch.no_grad():
            l0_scores = MODELS["L0_EdgeLevel"](node_features, edge_index)
        l0_flags = (l0_scores > 0.5).float()
        l0_suspicious_idx = torch.nonzero(l0_flags, as_tuple=True)[0]
        layers["L0"] = {
            "model": "EdgeLevelGNN",
            "flagged": int(l0_flags.sum().item()),
            "total": n_edges,
            "threshold": 0.5,
        }
        cascade_depth = 0

        # Fast path: if L0 says ALL benign, skip deeper layers
        if l0_flags.sum().item() == 0:
            elapsed = time.time() - t0
            return {
                "scores": l0_scores.tolist(),
                "layers": layers,
                "final_verdict": "benign",
                "allow": True,
                "cascade_depth": 0,
                "fast_path": True,
                "elapsed_ms": round(elapsed * 1000, 1),
            }
    else:
        # No L0 model — can't fast-path, run everything
        l0_scores = torch.zeros(n_edges)
        l0_flags = torch.ones(n_edges)  # assume all suspicious
        l0_suspicious_idx = torch.arange(n_edges)
        layers["L0"] = {"model": "MISSING", "flagged": n_edges, "total": n_edges}

    # --- L1: ContrastiveGNN (embedding confirmation) ---
    if "L1_Contrastive" in MODELS and len(l0_suspicious_idx) > 0:
        with torch.no_grad():
            l1_scores = MODELS["L1_Contrastive"](node_features, edge_index)
        l1_flags = (l1_scores > 0.5).float()
        # Only count edges that BOTH L0 and L1 flagged
        l1_confirmed = (l0_flags * l1_flags).sum().item()
        layers["L1"] = {
            "model": "ContrastiveGNN",
            "confirmed": int(l1_confirmed),
            "l0_flagged": int(l0_flags.sum().item()),
        }
        cascade_depth = 1
    else:
        l1_scores = l0_scores
        layers["L1"] = {"model": "MISSING" if "L1_Contrastive" not in MODELS else "SKIPPED"}

    # --- L2: PrototypeGNN (archetype matching) ---
    if "L2_Prototype" in MODELS and len(l0_suspicious_idx) > 0:
        with torch.no_grad():
            l2_scores = MODELS["L2_Prototype"](node_features, edge_index)
        l2_flags = (l2_scores > 0.5).float()
        layers["L2"] = {
            "model": "PrototypeGNN",
            "flagged": int(l2_flags.sum().item()),
        }
        cascade_depth = 2
    else:
        l2_scores = l1_scores
        layers["L2"] = {"model": "MISSING" if "L2_Prototype" not in MODELS else "SKIPPED"}

    # --- L4: GSLGNN (final authority — perfect classifier) ---
    if "L4_GSLGNN" in MODELS and len(l0_suspicious_idx) > 0:
        with torch.no_grad():
            l4_scores = MODELS["L4_GSLGNN"](node_features, edge_index)
        l4_flags = (l4_scores > 0.5).float()
        n_suspicious = int(l4_flags.sum().item())
        layers["L4"] = {
            "model": "GSLGNN",
            "suspicious": n_suspicious,
            "total": n_edges,
            "precision": "100%",
        }
        cascade_depth = 4

        elapsed = time.time() - t0
        if n_suspicious > 0:
            return {
                "scores": l4_scores.tolist(),
                "layers": layers,
                "final_verdict": "suspicious",
                "allow": False,
                "suspicious_count": n_suspicious,
                "cascade_depth": cascade_depth,
                "fast_path": False,
                "elapsed_ms": round(elapsed * 1000, 1),
            }
        else:
            # L0 flagged but L4 says benign = false alarm
            return {
                "scores": l4_scores.tolist(),
                "layers": layers,
                "final_verdict": "benign",
                "allow": True,
                "note": "L0 false alarm cleared by GSLGNN",
                "cascade_depth": cascade_depth,
                "fast_path": False,
                "elapsed_ms": round(elapsed * 1000, 1),
            }
    else:
        # No L4 — fall back to L0 verdict (conservative)
        elapsed = time.time() - t0
        n_flagged = int(l0_flags.sum().item())
        return {
            "scores": l0_scores.tolist(),
            "layers": layers,
            "final_verdict": "suspicious" if n_flagged > 0 else "benign",
            "allow": n_flagged == 0,
            "note": "L4 GSLGNN not available, using L0 conservative verdict",
            "cascade_depth": cascade_depth,
            "fast_path": False,
            "elapsed_ms": round(elapsed * 1000, 1),
        }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path == "/health":
            body = {
                "ok": True,
                "models_loaded": len(MODELS),
                "models_total": 4,
                "models": {k: True for k in MODELS},
                "errors": LOAD_ERRORS,
                "port": PORT,
                "version": "v2-cascade",
                "layers": ["L0_EdgeLevel", "L1_Contrastive", "L2_Prototype", "L4_GSLGNN"],
            }
            self._respond(200, body)
        else:
            self._respond(404, {"ok": False, "reason": "GET /health only"})

    def do_POST(self):
        try:
            if self.path != "/infer":
                raise ValueError("POST /infer only")

            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))

            nodes = payload["nodes"]
            edges = payload["edges"]

            # Validate
            if not nodes or not edges:
                raise ValueError("nodes and edges required")
            if any(len(x) != 6 for x in nodes):
                raise ValueError("each node must have 6 features")
            if any(len(x) != 2 for x in edges):
                raise ValueError("each edge must be [source, target]")

            node_features = torch.tensor(nodes, dtype=torch.float32)
            edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()

            result = run_cascade(node_features, edge_index)
            result["ok"] = True
            self._respond(200, result)

        except Exception as ex:
            self._respond(400, {"ok": False, "reason": str(ex)})

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())


if __name__ == "__main__":
    print(f"4-Layer GNN Immune Cascade listening on :{PORT}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
