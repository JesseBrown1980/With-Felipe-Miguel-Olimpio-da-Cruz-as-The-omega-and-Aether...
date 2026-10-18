# ADR-0010: GNN Preconditions — Edge Label Policy + Dataset Schema

## Status
Accepted (2026-03-15)

## Context
Per the Anti-Drift Constitution Section X and Yaman's paper, the GNN is an edge-intelligence sidecar. Before any model training, we need: edge label policy, node/edge feature definitions, export format, temporal split rules, shadow-mode evaluation contract, and fallback-to-heuristics contract.

## Edge Label Policy
- Start binary: benign vs suspicious
- Derive labels from operational truth:
  - approval_denied → suspicious
  - guardian_blocked → suspicious
  - human_rollback → suspicious
  - severe_mistake_pattern_hit → suspicious
  - unauthorized_privileged_action → suspicious
  - secret_touch → suspicious
  - All other → benign
- pseudoLabel "watch" from current system = benign (needs human review to promote)

## Node Features (per the paper: 12-dim minimum)
1. entity_type (one-hot: sovereign, agent, tower, surface, gate, packet, task, sub_colony)
2. district (one-hot: citadel, colony, perimeter, gate_ring, cloud_arc, world_bridge, ledger_quarter, workshop)
3. trust_tier (0-3)
4. online (0/1)
5. recent_edge_volume (normalized)
6. average_risk_score (0-9 normalized to 0-1)
7. failure_rate (0-1)
8. freshness_band (one-hot: hot, warm, cool, cold)

## Edge Features (per the paper: 10-dim minimum)
1. action (embedded or one-hot from top-50 actions)
2. category (one-hot)
3. component (one-hot)
4. transport (one-hot: http, mqtt, mcp, relay, playwright)
5. cross_domain_flag (0/1)
6. approval_state (one-hot: not_required, approved, denied, pending)
7. sensitivity (0-1)
8. criticality (0-1)
9. risk_score (0-9 normalized)
10. time_since_similar_edge (normalized)

## Export Format
PyTorch Geometric compatible:
- nodes.csv: nodeId, feature1, feature2, ...
- edges.csv: source, target, feature1, feature2, ..., label
- Temporal ordering preserved (exportedAt timestamp per record)
- Train/val/test split: 70/15/15 by temporal order

## Shadow-Mode Evaluation Contract
- Model runs alongside heuristic scorer
- Both scores logged per edge event
- Comparison metrics: precision, recall, F1, ROC-AUC
- Model does NOT replace heuristics until:
  a) False-positive budget is acceptable
  b) Explanations are inspectable
  c) Rollback is proven

## Fallback-to-Heuristics Contract
- On model error, timeout, schema mismatch: immediate fallback
- Heuristic score is always computed
- Model score is advisory only until promoted

## Current Data Status
- Training export: 4 edge samples, 100 record samples, 5 nodes
- Need 10K+ labeled edge events before serious training
- Experimental prototypes: 4 (provider-route, phone-loop, task-flow, privileged-control)

## Model Progression (per paper)
1. EdgeLevelGCN baseline → shadow mode only
2. Prototype-GNN → first production candidate (interpretable)
3. Contrastive-GNN → high-recall specialist
4. GSL-GNN → topology discovery (later)
