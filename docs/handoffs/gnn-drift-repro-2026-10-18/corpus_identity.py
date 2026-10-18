#!/usr/bin/env python3
"""Is the corpus 'edited' or only re-line-ended? stdlib only (WSL lane). Read-only. HBP rows (json=0).
content_sha = sha256 over canonical rows, independent of line endings/whitespace/key order:
  NODE|id|edgeVolume|avgRisk|maxRisk|failureRate|online|trustTier  then  EDGE|source|target|label  (file order)."""
import hashlib, json
P = "/mnt/c/Users/acer/Asolaria/services/gnn-sidecar/gslgnn_w9_3_corpus.json"
MANIFEST_SHA = "0f1235818828b27d0e143385eb322733e784151bc8a2b8dc60855dc6f5e9699e"
raw = open(P, "rb").read()
lf = raw.replace(b"\r\n", b"\n")
sha = lambda b: hashlib.sha256(b).hexdigest()
print(f"CORPUSBYTES|as_is={sha(raw)}|as_lf={sha(lf)}|manifest={MANIFEST_SHA[:16]}|as_is_eq_manifest={int(sha(raw)==MANIFEST_SHA)}|as_lf_eq_manifest={int(sha(lf)==MANIFEST_SHA)}|json=0")
d = json.loads(raw)
h = hashlib.sha256()
for n in d["nodes"]:
    h.update(("NODE|" + "|".join(repr(n.get(k)) for k in ("id", "edgeVolume", "avgRisk", "maxRisk", "failureRate", "online", "trustTier")) + "\n").encode())
for e in d["edges"]:
    h.update(f"EDGE|{e['source']}|{e['target']}|{e['label']}\n".encode())
print(f"CORPUSCONTENT|nodes={len(d['nodes'])}|edges={len(d['edges'])}|content_sha256={h.hexdigest()}|rule=NODE_repr_fields+EDGE_source_target_label_in_file_order|json=0")
