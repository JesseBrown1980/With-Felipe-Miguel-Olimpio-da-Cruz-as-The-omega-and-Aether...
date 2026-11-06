#!/usr/bin/env python3
"""materialize.py <mnt> <gitdir> <commit>: make the overlay view <mnt> hold exactly the blobs of <commit>
(extra files removed, differing or missing files written from the blob), then verify every file with
git hash-object --no-filters. Prints: files expected, removed, written, verified_equal, extra_after."""
import os, sys, subprocess
mnt, gd, c = sys.argv[1:4]
lt = subprocess.run(["git", "-C", gd, "ls-tree", "-r", "-z", c], capture_output=True, check=True).stdout.split(b"\0")
exp = {}
for e in lt:
    if not e: continue
    meta, path = e.split(b"\t", 1)
    mode, typ, oid = meta.decode().split()
    if typ != "blob" or mode not in ("100644", "100755"): sys.exit(f"unsupported entry {mode} {typ} {path!r}")
    exp[path.decode("utf-8", "surrogateescape")] = oid
def files():
    out = []
    for root, dirs, fs in os.walk(mnt):
        for f in fs:
            p = os.path.join(root, f)
            if os.path.islink(p) or not os.path.isfile(p): sys.exit(f"non-regular {p}")
            out.append(os.path.relpath(p, mnt))
    return out
def hashes(paths):
    r = subprocess.run(["git", "hash-object", "--no-filters", "--stdin-paths"], input="\n".join(os.path.join(mnt, p) for p in paths) + "\n",
                       capture_output=True, text=True, check=True)
    return dict(zip(paths, r.stdout.split()))
have = files(); removed = written = 0
for p in have:
    if p not in exp: os.unlink(os.path.join(mnt, p)); removed += 1
h = hashes([p for p in have if p in exp])
for p, oid in exp.items():
    if h.get(p) != oid:
        fp = os.path.join(mnt, p)
        if os.path.lexists(fp): os.unlink(fp)
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        data = subprocess.run(["git", "-C", gd, "cat-file", "blob", oid], capture_output=True, check=True).stdout
        open(fp, "wb").write(data); written += 1
after = files(); h2 = hashes(after)
eq = sum(1 for p in after if h2[p] == exp.get(p))
print(len(exp), removed, written, eq, len(set(after) - set(exp)), len(set(exp) - set(after)))
sys.exit(0 if eq == len(exp) and len(after) == len(exp) else 1)
