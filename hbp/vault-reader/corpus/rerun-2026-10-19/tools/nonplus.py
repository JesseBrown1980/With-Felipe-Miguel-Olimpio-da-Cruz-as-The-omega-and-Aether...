#!/usr/bin/env python3
"""Read-only. Every non-+1 VAULTOBJ of every pin run: nonplus1.tsv
label repo commit path kind verified reason pointer"""
import os, sys, collections
P = "/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad/vault-rerun/pins"
tg = {l.split("\t")[0]: l.rstrip("\n").split("\t") for l in open(P + "/work/targets.tsv")}
out = open(P + "/work/nonplus1.tsv", "w"); cnt = collections.Counter()
for l in open(P + "/results.tsv"):
    p = l.rstrip("\n").split("\t")
    label = p[0]
    if p[2] == "SKIP_SIZE": continue
    f = P + "/out/" + label + ".rust.hbp"
    if not os.path.exists(f): f = P + "/out/" + label + ".nonplus1.hbp"
    for line in open(f, encoding="utf-8", errors="surrogateescape"):
        if not line.startswith("VAULTOBJ|"): continue
        d = dict(x.partition("=")[::2] for x in line.rstrip("\n").split("|")[1:])
        if d["verified"] == "+1": continue
        out.write("\t".join([label, tg[label][1], tg[label][2], d["path"], d["kind"], d["verified"], d["reason"], d.get("pointer", "")]) + "\n")
        cnt[(d["verified"], d["reason"])] += 1
out.close()
for k, v in sorted(cnt.items(), key=lambda x: -x[1]): print(v, *k)
