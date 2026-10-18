#!/usr/bin/env python3
"""P3: stratified retrain of L1 PrototypeGNN, L2 ContrastiveGNN, L4 GSLGNN.
- split: seeded, stratified 70/15/15 per class (benign 28/6/6), so train is no longer single-class
- loss: class-balanced (each class contributes half per batch)
- GCNConv: the REAL torch_geometric one for all three (the only interpreter with torch, Windows py3.13, has PyG 2.7.0),
  so the trained function == the served function
Originals untouched. Writes only OUTDIR (new .pt + RETRAIN.rows). E=0: no servers, no sockets. HBP rows, json=0."""
import hashlib, json, os, sys, time
import numpy as np, torch, torch.nn.functional as F

SIDECAR = r"C:\Users\acer\Asolaria\services\gnn-sidecar"
OUTDIR = sys.argv[1]
SEED, STEPS = 1792, 300
os.makedirs(OUTDIR, exist_ok=True)
sys.path.insert(0, SIDECAR)
import torch_geometric
import models.prototype_gnn as mp, models.contrastive_gnn as mc, models.gsl_gnn as mg
rows = []
def row(tag, **kv):
    r = tag + "|" + "|".join(f"{k}={v}" for k, v in kv.items()) + "|json=0"; rows.append(r); print(r, flush=True)
    open(os.path.join(OUTDIR, "RETRAIN.rows"), "w", encoding="utf-8", newline="\n").write("\n".join(rows) + "\n")
gcn = {m.__name__.split(".")[-1]: m.GCNConv.__module__.split(".")[0] for m in (mp, mc, mg)}
row("RETRAINENV", torch=torch.__version__, pyg=torch_geometric.__version__, gcn_l1=gcn["prototype_gnn"], gcn_l2=gcn["contrastive_gnn"], gcn_l4=gcn["gsl_gnn"], seed=SEED, steps=STEPS)
assert set(gcn.values()) == {"torch_geometric"}
torch.manual_seed(SEED); gen = torch.Generator().manual_seed(SEED)

t0 = time.time()
data = json.load(open(os.path.join(SIDECAR, "gslgnn_w9_3_corpus.json"), encoding="utf-8"))
nodes, edges = data["nodes"], data["edges"]
x = torch.tensor(np.array([[min(n.get("edgeVolume", 0) / 100.0, 1.0), n.get("avgRisk", 0) / 9.0, n.get("maxRisk", 0) / 9.0,
                            n.get("failureRate", 0), n.get("online", 1), n.get("trustTier", 1) / 3.0] for n in nodes], dtype=np.float32))
idx = {n["id"]: i for i, n in enumerate(nodes)}
ei = torch.tensor(np.array([[idx[e["source"]] for e in edges], [idx[e["target"]] for e in edges]], dtype=np.int64))
y = np.array([int(e["label"]) for e in edges], dtype=np.int64); Y = torch.tensor(y)
N = len(y)

rng = np.random.default_rng(SEED)
ben, sus = np.where(y == 0)[0], np.where(y == 1)[0]; rng.shuffle(ben); rng.shuffle(sus)
def cut(a): n = len(a); return a[:int(n * 0.7)], a[int(n * 0.7):int(n * 0.85)], a[int(n * 0.85):]
(btr, bva, bte), (str_, sva, ste) = cut(ben), cut(sus)
SPL = {"train": np.concatenate([btr, str_]), "val": np.concatenate([bva, sva]), "test": np.concatenate([bte, ste])}
row("SPLIT", kind="stratified_seeded", benign_train=len(btr), benign_val=len(bva), benign_test=len(bte),
    susp_train=len(str_), susp_val=len(sva), susp_test=len(ste), split_sha16=hashlib.sha256(np.concatenate([btr, bva, bte, str_, sva, ste]).tobytes()).hexdigest()[:16])
p = 40 / N
row("GATECEILING", gate="std_gt_0.01_on_corpus", max_possible_std=f"{(p * (1 - p)) ** 0.5:.6f}", meaning="even_a_perfect_0/1_classifier_clears_the_gate_by_only_0.00126_at_40_of_315249")

BTR, STR = torch.tensor(btr), torch.tensor(str_)
def batch(n_s):
    i = torch.cat([BTR, STR[torch.randint(len(STR), (n_s,), generator=gen)]]); return i, Y[i]
def wce(logits, lab, n_s):  # each class contributes half
    return F.cross_entropy(logits, lab, weight=torch.tensor([1.0 / len(BTR), 1.0 / n_s]))

def auc2(s, sel):
    s = np.asarray(s, np.float32); sel = np.asarray(sel)
    ss = np.sort(s[sel][y[sel] == 1]); bb = s[sel][y[sel] == 0]
    hi = np.searchsorted(ss, bb, side="right"); lo = np.searchsorted(ss, bb, side="left")
    return int(2 * (len(ss) - hi).sum() + (hi - lo).sum()), 2 * len(ss) * len(bb)

def report(lvl, s, secs):
    s = np.asarray(s, np.float32).reshape(-1)
    kv = dict(model=lvl, n=len(s), min=repr(float(s.min())), max=repr(float(s.max())), std=f"{float(s.std()):.6g}",
              n_unique=len(np.unique(s)), gate_std_gt_0p01=int(float(s.std()) > 0.01))
    for name, sel in (("corpus", np.arange(N)), ("train", SPL["train"]), ("val", SPL["val"]), ("test", SPL["test"])):
        a, d = auc2(s, sel); kv[f"auc_{name}"] = f"{a}/{d}={a / d:.6f}"
    te = SPL["test"]
    kv["test_benign_caught_at_0p5"] = f"{int((s[te][y[te] == 0] <= 0.5).sum())}/{int((y[te] == 0).sum())}"
    kv["test_false_alarms_at_0p5"] = f"{int((s[te][y[te] == 1] <= 0.5).sum())}/{int((y[te] == 1).sum())}"
    kv["train_secs"] = secs; kv["scores_sha16"] = hashlib.sha256(s.tobytes()).hexdigest()[:16]
    row("RETRAINED", **kv)

def save_and_reload(lvl, model, ctor, fwd, s_mem, fname):
    path = os.path.join(OUTDIR, fname); torch.save(model.state_dict(), path)
    b = open(path, "rb").read(); keys = list(torch.load(path, map_location="cpu"))
    fresh = ctor(); fresh.load_state_dict(torch.load(path, map_location="cpu"), strict=True); fresh.eval()
    with torch.no_grad(): s2 = np.asarray(fwd(fresh), np.float32).reshape(-1)
    row("CKPT", model=lvl, file=fname, bytes=len(b), sha256=hashlib.sha256(b).hexdigest(),
        keyform="pyg" if any(k.endswith("conv1.bias") for k in keys) and not any(k.endswith("conv1.lin.bias") for k in keys) else "stub",
        strict_reload=1, reload_scores_identical=int(np.asarray(s_mem, np.float32).tobytes() == s2.tobytes()))

# ---------------- L1 PrototypeGNN ----------------
def l1_fwd(m):
    ne = m.encode_nodes(x, ei); out = []
    for a in range(0, N, 50000):
        out.append(torch.softmax(m.compute_prototype_distances(m.get_edge_embeddings_from_nodes(ne, ei[0][a:a + 50000], ei[1][a:a + 50000])), -1)[:, 1])
    return torch.cat(out).numpy()
t = time.time(); m1 = mp.PrototypeGNN(6, 64, 2, 3); opt = torch.optim.Adam(m1.parameters(), lr=0.005, weight_decay=5e-4)
for step in range(STEPS):
    m1.train(); opt.zero_grad(); i, lab = batch(2048)
    ne = m1.encode_nodes(x, ei)
    loss = wce(m1.compute_prototype_distances(m1.get_edge_embeddings_from_nodes(ne, ei[0][i], ei[1][i])), lab, 2048)
    loss.backward(); opt.step()
m1.eval()
with torch.no_grad(): s1 = l1_fwd(m1)
report("L1", s1, round(time.time() - t, 1))
save_and_reload("L1", m1, lambda: mp.PrototypeGNN(6, 64, 2, 3), l1_fwd, s1, "prototype_model_strat_2026-10-18.pt")

# ---------------- L2 ContrastiveGNN ----------------
t = time.time(); m2 = mc.ContrastiveGNN(6, 64, 64, 2); supcon = mc.SupervisedContrastiveLoss(0.07)
opt = torch.optim.Adam(m2.parameters(), lr=0.005, weight_decay=5e-4)
for step in range(STEPS):
    m2.train(); opt.zero_grad(); i, lab = batch(484)
    ne = m2.encode_nodes(x, ei); ef = m2.edge_mlp(torch.cat([ne[ei[0][i]], ne[ei[1][i]]], 1))
    loss = wce(m2.classifier(ef), lab, 484) + 0.3 * supcon(m2.get_projections(ef), lab)
    loss.backward(); opt.step()
m2.eval()
l2_fwd = lambda m: m(x, ei).reshape(-1).numpy()
with torch.no_grad(): s2 = l2_fwd(m2)
report("L2", s2, round(time.time() - t, 1))
save_and_reload("L2", m2, lambda: mc.ContrastiveGNN(6, 64, 64, 2), l2_fwd, s2, "contrastive_model_strat_2026-10-18.pt")

# ---------------- L4 GSLGNN ----------------
def gsl_logits(m, i):  # GSLGNN.forward restricted to edges i (node embeddings still from the FULL graph)
    la = m.gsl(x, ei) + torch.eye(x.shape[0]); la = la / la.sum(dim=1, keepdim=True).clamp(min=1)
    hl, ho = m.encode_with_learned_graph(x, la), m.encode_with_original_graph(x, ei)
    r, c = ei[0][i], ei[1][i]
    return m.edge_classifier(torch.cat([hl[r], hl[c], ho[r], ho[c]], 1))
t = time.time(); m4 = mg.GSLGNN(6, 64); opt = torch.optim.Adam(m4.parameters(), lr=0.005, weight_decay=5e-4)
for step in range(STEPS):
    m4.train(); opt.zero_grad(); i, lab = batch(4096)
    loss = wce(gsl_logits(m4, i), lab, 4096); loss.backward(); opt.step()
m4.eval()
l4_fwd = lambda m: m(x, ei).reshape(-1).numpy()
with torch.no_grad():
    s4 = l4_fwd(m4)
    probe = torch.arange(0, N, 997); helper_gap = float((torch.softmax(gsl_logits(m4, probe), -1)[:, 1] - torch.tensor(s4)[probe]).abs().max())
row("HELPERPARITY", model="L4", gsl_logits_vs_forward_max_abs=repr(helper_gap), probe_edges=len(probe))
report("L4", s4, round(time.time() - t, 1))
save_and_reload("L4", m4, lambda: mg.GSLGNN(6, 64), l4_fwd, s4, "gslgnn_w9_3_strat_2026-10-18.pt")
row("RETRAINDONE", secs=round(time.time() - t0, 1), originals_touched=0, servers_swapped=0)
