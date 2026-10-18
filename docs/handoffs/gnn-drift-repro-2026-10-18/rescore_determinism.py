#!/usr/bin/env python3
"""Where do the L2/L4 low-order float bits come from? Rescore the three P3 checkpoints in a FRESH process,
default threads vs single-thread (x2), compare to the receipt's scores_sha16. Read-only; prints HBP rows (json=0)."""
import hashlib, json, os, platform, sys
import numpy as np, torch
SIDECAR = r"C:\Users\acer\Asolaria\services\gnn-sidecar"
CK = r"D:\PID-Registration-Office\offices\FABLE5-8467a937cba309f7\gnn-retrain-2026-10-18"
RECEIPT = {"L1": "38b043191a5e62e2", "L2": "8bc74ee31839acab", "L4": "993cb532f9944bbf"}
sys.path.insert(0, SIDECAR)
import torch_geometric
import models.prototype_gnn as mp, models.contrastive_gnn as mc, models.gsl_gnn as mg
torch.set_grad_enabled(False)
cap = getattr(getattr(torch.backends, "cpu", None), "get_cpu_capability", lambda: "?")()
print(f"DETENV|torch={torch.__version__}|pyg={torch_geometric.__version__}|numpy={np.__version__}|cpu={platform.processor().replace('|','/')}|"
      f"cpu_capability={cap}|mkldnn={int(torch.backends.mkldnn.is_available())}|mkl={int(torch.backends.mkl.is_available())}|"
      f"default_threads={torch.get_num_threads()}|json=0", flush=True)
data = json.load(open(os.path.join(SIDECAR, "gslgnn_w9_3_corpus.json"), encoding="utf-8"))
nodes, edges = data["nodes"], data["edges"]
x = torch.tensor(np.array([[min(n.get("edgeVolume", 0) / 100.0, 1.0), n.get("avgRisk", 0) / 9.0, n.get("maxRisk", 0) / 9.0,
                            n.get("failureRate", 0), n.get("online", 1), n.get("trustTier", 1) / 3.0] for n in nodes], dtype=np.float32))
idx = {n["id"]: i for i, n in enumerate(nodes)}
ei = torch.tensor(np.array([[idx[e["source"]] for e in edges], [idx[e["target"]] for e in edges]], dtype=np.int64))
N = ei.shape[1]
def l1(m):
    ne = m.encode_nodes(x, ei)
    return torch.cat([torch.softmax(m.compute_prototype_distances(m.get_edge_embeddings_from_nodes(ne, ei[0][a:a + 50000], ei[1][a:a + 50000])), -1)[:, 1]
                      for a in range(0, N, 50000)]).numpy()
SPEC = {"L1": (lambda: mp.PrototypeGNN(6, 64, 2, 3), "prototype_model_strat_2026-10-18.pt", l1),
        "L2": (lambda: mc.ContrastiveGNN(6, 64, 64, 2), "contrastive_model_strat_2026-10-18.pt", lambda m: m(x, ei).numpy()),
        "L4": (lambda: mg.GSLGNN(6, 64), "gslgnn_w9_3_strat_2026-10-18.pt", lambda m: m(x, ei).numpy())}
default = torch.get_num_threads(); results = {}
for run, threads in (("default", default), ("single_a", 1), ("single_b", 1)):
    torch.set_num_threads(threads)
    for lvl, (ctor, f, fwd) in SPEC.items():
        m = ctor(); m.load_state_dict(torch.load(os.path.join(CK, f), map_location="cpu"), strict=True); m.eval()
        s = np.asarray(fwd(m), np.float32).reshape(-1); results[(lvl, run)] = s
        h = hashlib.sha256(s.tobytes()).hexdigest()[:16]
        print(f"RESCORE|model={lvl}|run={run}|threads={threads}|scores_sha16={h}|matches_receipt={int(h == RECEIPT[lvl])}|json=0", flush=True)
for lvl in SPEC:
    d, s1, s2 = results[(lvl, "default")], results[(lvl, "single_a")], results[(lvl, "single_b")]
    print(f"DETERMINISM|model={lvl}|single_a_eq_single_b={int(s1.tobytes() == s2.tobytes())}|default_eq_single={int(d.tobytes() == s1.tobytes())}|"
          f"max_abs_default_vs_single={float(np.abs(d - s1).max())!r}|edges_differ={int((d != s1).sum())}|json=0", flush=True)
