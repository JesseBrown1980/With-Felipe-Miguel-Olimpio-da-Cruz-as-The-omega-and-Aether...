import json, os, numpy as np
D = r"C:\Users\acer\AppData\Local\Temp\claude\C--Users-acer\d6674318-eced-492f-a166-818a5162c281\scratchpad"
y = np.array([int(e["label"]) for e in json.load(open(r"C:\Users\acer\Asolaria\services\gnn-sidecar\gslgnn_w9_3_corpus.json", encoding="utf-8"))["edges"]])
for lvl in ("L1", "L2", "L4"):
    a, b = np.load(os.path.join(D, f"isa_native_{lvl}.npy")), np.load(os.path.join(D, f"isa_all_forced_down_{lvl}.npy"))
    d = np.abs(a.astype(np.float64) - b.astype(np.float64)); ulp = np.abs(a.view(np.int32).astype(np.int64) - b.view(np.int32).astype(np.int64))
    print(f"ISADIFF|model={lvl}|edges_differ={int((a != b).sum())}|max_abs={d.max()!r}|max_ulp={int(ulp.max())}|"
          f"decision_flips_at_0p5={int(((a > 0.5) != (b > 0.5)).sum())}|benign_caught_native={int((a[y == 0] <= 0.5).sum())}|"
          f"benign_caught_forced={int((b[y == 0] <= 0.5).sum())}|json=0")
