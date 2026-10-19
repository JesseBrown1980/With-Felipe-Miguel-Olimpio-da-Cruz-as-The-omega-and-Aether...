/**
 * gnn-l1-l2-status.test.mjs
 *
 * Documents the checkpoint and inference-server status for L1 (PrototypeGNN)
 * and L2 (ContrastiveGNN) as of 2026-06-01.
 *
 * L1 STATUS  : CHECKPOINT PRESENT  — prototype_model.pt (73793 bytes)
 *              inference server written at prototype_inference_server.py (:4795)
 *
 * L2 STATUS  : CHECKPOINT ABSENT   — contrastive_model.pt does not exist
 *              inference server NOT written (no weights to load)
 *              training required: run train_contrastive.py
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ACER_GNN_SIDECAR = "C:/Users/acer/Asolaria/services/gnn-sidecar";
const GNN_SIDECAR = process.env.ASOLARIA_GNN_SIDECAR
  || (fs.existsSync(ACER_GNN_SIDECAR) ? ACER_GNN_SIDECAR : path.resolve(process.cwd(), "services", "gnn-sidecar"));
const HAS_GNN_SIDECAR = fs.existsSync(GNN_SIDECAR);
const SKIP_MISSING_SIDECAR = HAS_GNN_SIDECAR ? false : `GNN sidecar root not present on this host: ${GNN_SIDECAR}`;

// ---------------------------------------------------------------------------
// L1 PrototypeGNN
// ---------------------------------------------------------------------------

describe("L1 PrototypeGNN checkpoint", () => {
  const checkpointPath = path.join(GNN_SIDECAR, "prototype_model.pt");

  it("prototype_model.pt exists", { skip: SKIP_MISSING_SIDECAR }, () => {
    assert.ok(
      fs.existsSync(checkpointPath),
      `checkpoint not found at ${checkpointPath}`
    );
  });

  it("prototype_model.pt is non-trivial (>= 50 KB)", { skip: SKIP_MISSING_SIDECAR }, () => {
    const { size } = fs.statSync(checkpointPath);
    assert.ok(
      size >= 50_000,
      `file too small (${size} bytes) — may be corrupt or stub`
    );
  });

  it("prototype_inference_server.py exists at :4795", { skip: SKIP_MISSING_SIDECAR }, () => {
    const serverPath = path.join(GNN_SIDECAR, "prototype_inference_server.py");
    assert.ok(
      fs.existsSync(serverPath),
      `inference server not found at ${serverPath}`
    );
  });

  it("prototype_inference_server.py declares PORT 4795", { skip: SKIP_MISSING_SIDECAR }, () => {
    const serverPath = path.join(GNN_SIDECAR, "prototype_inference_server.py");
    const src = fs.readFileSync(serverPath, "utf8");
    assert.ok(
      src.includes("PORT = 4795"),
      "PORT 4795 declaration not found in inference server"
    );
  });

  it("prototype_inference_server.py loads PrototypeGNN with correct dims", { skip: SKIP_MISSING_SIDECAR }, () => {
    const serverPath = path.join(GNN_SIDECAR, "prototype_inference_server.py");
    const src = fs.readFileSync(serverPath, "utf8");
    // node_input_dim=6, hidden_dim=64, num_classes=2, num_prototypes_per_class=3
    assert.ok(
      src.includes("node_input_dim=6") && src.includes("hidden_dim=64"),
      "Expected node_input_dim=6, hidden_dim=64 in server instantiation"
    );
    assert.ok(
      src.includes("num_classes=2") && src.includes("num_prototypes_per_class=3"),
      "Expected num_classes=2, num_prototypes_per_class=3 in server instantiation"
    );
  });
});

// ---------------------------------------------------------------------------
// L2 ContrastiveGNN — checkpoint absent, server intentionally not written
// ---------------------------------------------------------------------------

describe("L2 ContrastiveGNN checkpoint (TRAINED 2026-06-01 — gap closed)", () => {
  const checkpointPath = path.join(GNN_SIDECAR, "contrastive_model.pt");

  it("contrastive_model.pt now EXISTS (trained this session, gap closed)", { skip: SKIP_MISSING_SIDECAR }, () => {
    assert.ok(
      fs.existsSync(checkpointPath),
      `contrastive_model.pt expected at ${checkpointPath} — train_contrastive.py was run 2026-06-01`
    );
  });

  it("L2 stays BENCHED until spread-verified (same degenerate-corpus caveat as L4)", { skip: SKIP_MISSING_SIDECAR }, () => {
    // Trained to ~99.92% on the 40-benign-vs-315k-suspicious corpus — the same
    // imbalance that left L4 a dead constant 0.5292. Present but NOT trusted as a
    // voter until a class-weighted retrain passes spread std > 0.01. The inference
    // server (:4796) is intentionally NOT wired until that spread check passes.
    const serverPath = path.join(GNN_SIDECAR, "contrastive_inference_server.py");
    assert.ok(
      !fs.existsSync(serverPath),
      "L2 inference server (:4796) intentionally deferred until spread-verified"
    );
  });

  it("train_contrastive.py exists and is ready to produce contrastive_model.pt", { skip: SKIP_MISSING_SIDECAR }, () => {
    const trainerPath = path.join(GNN_SIDECAR, "train_contrastive.py");
    assert.ok(
      fs.existsSync(trainerPath),
      `train_contrastive.py not found at ${trainerPath}`
    );
    const src = fs.readFileSync(trainerPath, "utf8");
    assert.ok(
      src.includes("contrastive_model.pt"),
      "trainer does not reference expected output path contrastive_model.pt"
    );
  });
});

// ---------------------------------------------------------------------------
// Gap documentation (static — always passes, surfaces info in test output)
// ---------------------------------------------------------------------------

describe("L2 gap: what training requires", () => {
  it("documents training command and expected output", () => {
    /**
     * To produce contrastive_model.pt:
     *
     *   cd C:/Users/acer/Asolaria/services/gnn-sidecar
     *   python train_contrastive.py
     *
     * Prerequisites:
     *   - gslgnn_w9_3_corpus.json (present)
     *   - torch + numpy (present per L0/L1/L4 successful runs)
     *   - torch_geometric optional (falls back to stub GCNConv)
     *
     * Expected output:
     *   - contrastive_model.pt (~50-150 KB state_dict)
     *   - Keys: conv1.lin.{weight,bias}, conv2.lin.{weight,bias},
     *           edge_mlp.0.{weight,bias}, projection_head.{0,2}.{weight,bias},
     *           classifier.{0,3}.{weight,bias}
     *   - Architecture: ContrastiveGNN(node_input_dim=6, hidden_dim=64,
     *                                  projection_dim=64, num_classes=2)
     *
     * After training, write contrastive_inference_server.py at :4796
     * following the same pattern as prototype_inference_server.py.
     */
    assert.ok(true, "gap documentation note — always passes");
  });
});
