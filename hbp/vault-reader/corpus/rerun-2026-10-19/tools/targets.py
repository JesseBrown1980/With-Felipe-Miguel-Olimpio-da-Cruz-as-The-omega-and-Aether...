#!/usr/bin/env python3
"""Read-only. targets.tsv: label repo commit gitdir mode pin_source kinds, for every A_PIN repo@commit."""
import os, subprocess, sys, collections
S = "/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad"
W = sys.argv[1]
clones = [l.rstrip("\n").split("\t") for l in open(W + "/clones.tsv")]
A = [l.rstrip("\n").split("\t") for l in open(W + "/classes.tsv") if l.startswith("A_PIN\t")]
rank = {"SRC_COL": 0, "PIN_AT": 1, "PIN_KW": 2, "PIN_SECTION": 3, "PIN_AT_ALIAS": 4}
best = {}
for l in open(W + "/occ.tsv"):
    repo, c, k, meta, loc, ctx = l.rstrip("\n").split("\t", 5)
    if k not in rank: continue
    rel = loc.rsplit(":", 1)[0]
    key = (0 if (k == "SRC_COL" and rel.startswith("beginning/") and "PROVENANCE" in rel) else 1, -int(meta), rank[k], rel, int(loc.rsplit(":", 1)[1]))
    if (repo, c) not in best or key < best[(repo, c)][0]:
        best[(repo, c)] = (key, loc)
def git(d, *a, inp=None):
    return subprocess.run(["git", "-C", d] + list(a), capture_output=True, text=True, input=inp)
def promisor(d):
    return git(d, "config", "--get", "remote.origin.promisor").stdout.strip() == "true"
out = open(W + "/targets.tsv", "w")
for cls, repo, c, n, kinds in A:
    cands = [d for name, d in clones if name.lower() == repo.lower()]
    full = [d for d in cands if not promisor(d)]
    prom = [d for d in cands if promisor(d)]
    pick = None; mode = None
    for d in full:
        if git(d, "cat-file", "-e", c + "^{commit}").returncode == 0:
            r = git(d, "rev-list", "--objects", "--missing=print", c)
            if r.returncode == 0 and not any(x.startswith("?") for x in r.stdout.split("\n")):
                pick, mode = d, "complete"; break
    if pick is None:
        for d in prom:
            if git(d, "cat-file", "-e", c + "^{commit}").returncode == 0:
                pick, mode = d, "promisor"; break
    if pick is None: pick, mode = "-", "unresolved"
    label = f"PIN-{repo}-{c[:7]}"
    out.write("\t".join([label, repo, c, pick, mode, best[(repo, c)][1], kinds]) + "\n")
out.close()
