#!/usr/bin/env python3
"""t13_inputs.py - one INPUT row per file project_gguf.py read (stdlib, integer only).

usage: t13_inputs.py WORKDIR
Reads WORKDIR/logs/opened-{a,b}.txt (strace read order), run-{a,b}/stage/STAGE.hbp,
logs/stored_tensors.txt, logs/head_blobs.txt, logs/all_oids.txt and the staged files.
"""
import hashlib
import os
import sys

W = sys.argv[1]


def blob_id(b):
    return hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest()


def stage_rows(v):
    rows = {}
    for line in open(os.path.join(W, f"run-{v}/stage/STAGE.hbp"), encoding="utf-8"):
        if line.startswith("F|"):
            f = {}
            for x in line.rstrip("\n").split("|")[1:]:
                if "=" in x:
                    k, val = x.split("=", 1)
                    f.setdefault(k, val)
            # src may itself hold '|blob=': rebuild it from the raw line
            raw = line.rstrip("\n")
            f["src"] = raw.split("|src=", 1)[1].rsplit("|json=0", 1)[0]
            rows[f["path"]] = f
    return rows


opened = {v: [l.strip() for l in open(os.path.join(W, f"logs/opened-{v}.txt"))] for v in "ab"}
stage = {v: stage_rows(v) for v in "ab"}
tens = {}
for line in open(os.path.join(W, "logs/stored_tensors.txt")):
    p = line.strip().split("|")
    tens[p[1]] = (int(p[5].split("=")[1]), p[6].split("=")[1], int(p[4].split("=")[1]))
head = set(l.strip() for l in open(os.path.join(W, "logs/head_blobs.txt")))
allo = set(l.strip() for l in open(os.path.join(W, "logs/all_oids.txt")))

assert opened["a"] == opened["b"], "read order differs between runs"
out = []
tot = {"a": [0, 0], "b": [0, 0]}
cls_tot = {}
for i, path in enumerate(opened["a"], 1):
    per = {}
    for v in "ab":
        b = open(os.path.join(W, f"run-{v}/stage", path), "rb").read()
        per[v] = (b, hashlib.sha256(b).hexdigest(), blob_id(b), stage[v][path]["src"])
        tot[v][0] += 1
        tot[v][1] += len(b)
    name = os.path.basename(path)
    tn = name.replace(".", "_")
    tl, tsha, toff = tens[tn]
    variants = [("a,b", per["a"])] if per["a"][1] == per["b"][1] else [("a", per["a"]), ("b", per["b"])]
    for runs, (b, s, oid, src) in variants:
        if src.startswith("acer:"):
            cls = "acer_delivery"
        elif src.startswith("ONLY-inside-stored-GGUF"):
            cls = "only_inside_stored_gguf"
        else:
            cls = "usim_history"
        for v in runs.split(","):
            cls_tot.setdefault((v, cls), [0, 0])
            cls_tot[(v, cls)][0] += 1
            cls_tot[(v, cls)][1] += len(b)
        out.append(f"INPUT|n={i}|runs={runs}|path={path}|bytes={len(b)}|sha256={s}|git_blob={oid}"
                   f"|from={src}|class={cls}|in_usim_any_commit={int(oid in allo)}|in_usim_head={int(oid in head)}"
                   f"|equals_stored_tensor={int(s == tsha and len(b) == tl)}({tn}@{toff})|json=0")
print("\n".join(out))
for v in "ab":
    print(f"#TOTAL|run={v}|inputs={tot[v][0]}|bytes={tot[v][1]}|"
          + "|".join(f"{c}={n}({by})" for (vv, c), (n, by) in sorted(cls_tot.items()) if vv == v))
