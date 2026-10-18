#!/usr/bin/env python3
"""One fresh-process rescore of the three P3 checkpoints under whatever ISA env the caller set. Read-only; HBP rows (json=0)."""
import hashlib, json, os, platform, sys
import numpy as np, torch
SIDECAR = r"C:\Users\acer\Asolaria\services\gnn-sidecar"
CK = r"D:\PID-Registration-Office\offices\FABLE5-8467a937cba309f7\gnn-retrain-2026-10-18"
RECEIPT = {"L1": "38b043191a5e62e2", "L2": "8bc74ee31839acab", "L4": "993cb532f9944bbf"}
VARIANT = sys.argv[1] if len(sys.argv) > 1 else "native"
sys.path.insert(0, SIDECAR)
import torch_geometric
import models.prototype_gnn as mp, models.contrastive_gnn as mc, models.gsl_gnn as mg
torch.set_grad_enabled(False)
try:
    import winreg
    k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
    cpu_name = winreg.QueryValueEx(k, "ProcessorNameString")[0].strip()
except Exception:
    cpu_name = platform.processor()
env = {k: os.environ.get(k, "-") for k in ("ATEN_CPU_CAPABILITY", "MKL_ENABLE_INSTRUCTIONS", "ONEDNN_MAX_CPU_ISA")}
print(f"ISAENV|variant={VARIANT}|cpu_name={cpu_name.replace('|','/')}|cpu_id={platform.processor().replace('|','/')}|"
      f"os={platform.system()}-{platform.release()}|torch={torch.__version__}|pyg={torch_geometric.__version__}|"
      f"cpu_capability={torch.backends.cpu.get_cpu_capability()}|threads={torch.get_num_threads()}|"
      + "|".join(f"{k}={v}" for k, v in env.items()) + "|json=0", flush=True)
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
ref = {}
for lvl, (ctor, f, fwd) in SPEC.items():
    m = ctor(); m.load_state_dict(torch.load(os.path.join(CK, f), map_location="cpu"), strict=True); m.eval()
    s = np.asarray(fwd(m), np.float32).reshape(-1); h = hashlib.sha256(s.tobytes()).hexdigest()[:16]
    np.save(os.path.join(os.environ.get("ISA_OUT", "."), f"isa_{VARIANT}_{lvl}.npy"), s)
    print(f"ISARESCORE|variant={VARIANT}|model={lvl}|scores_sha16={h}|matches_receipt={int(h == RECEIPT[lvl])}|n_unique={len(np.unique(s))}|json=0", flush=True)
