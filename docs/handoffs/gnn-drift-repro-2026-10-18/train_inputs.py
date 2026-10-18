import hashlib, os, torch, torch_geometric, numpy
F = {
  "corpus": r"C:\Users\acer\Asolaria\services\gnn-sidecar\gslgnn_w9_3_corpus.json",
  "prototype_gnn.py": r"C:\Users\acer\Asolaria\services\gnn-sidecar\models\prototype_gnn.py",
  "contrastive_gnn.py": r"C:\Users\acer\Asolaria\services\gnn-sidecar\models\contrastive_gnn.py",
  "gsl_gnn.py": r"C:\Users\acer\Asolaria\services\gnn-sidecar\models\gsl_gnn.py",
  "models__init__.py": r"C:\Users\acer\Asolaria\services\gnn-sidecar\models\__init__.py",
  "retrain_stratified.py": r"C:\Users\acer\AppData\Local\Temp\claude\C--Users-acer\d6674318-eced-492f-a166-818a5162c281\scratchpad\retrain_stratified.py",
  "pyg_gcn_conv.py": os.path.join(os.path.dirname(torch_geometric.__file__), "nn", "conv", "gcn_conv.py"),
}
for k, p in F.items():
    b = open(p, "rb").read()
    print(f"TRAININPUT|name={k}|bytes={len(b)}|sha256={hashlib.sha256(b).hexdigest()}|crlf={b.count(b'\r\n')}|json=0")
print(f"TRAINENV|torch={torch.__version__}|pyg={torch_geometric.__version__}|numpy={numpy.__version__}|seed=1792|steps=300|json=0")
