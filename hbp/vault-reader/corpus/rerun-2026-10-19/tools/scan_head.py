#!/usr/bin/env python3
"""Read-only. Every 7-40 hex token in aether files at HEAD (tracked blobs, read with git cat-file)
that is the prefix of a commit in a local clone. Writes hits.tsv:
repo commit token meta(1/0) fclass path line col"""
import os, re, subprocess, sys, collections
S = "/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad"
A = S + "/asolaria-aether"; W = sys.argv[1]
head = sys.argv[2]
commits = collections.defaultdict(list)
for line in open(W + "/commits.tsv"):
    repo, c = line.rstrip("\n").split("\t")
    commits[c[:7]].append((repo, c))
lt = subprocess.run(["git", "-C", A, "ls-tree", "-r", "-z", head], capture_output=True).stdout.split(b"\0")
ents = []
for e in lt:
    if not e: continue
    meta, path = e.split(b"\t", 1)
    mode, typ, oid = meta.split()
    if typ != b"blob": continue
    ents.append((path.decode("utf-8", "surrogateescape"), oid.decode()))
# vendored lists from UPSTREAM*.sha256 at HEAD
def blob(oid):
    return subprocess.run(["git", "-C", A, "cat-file", "blob", oid], capture_output=True).stdout
VEND = set()
for p, oid in ents:
    if re.search(r"(^|/)UPSTREAM[^/]*\.sha256$", p):
        d = os.path.dirname(p)
        for l in blob(oid).decode("utf-8", "replace").split("\n"):
            m = re.match(r"^[0-9a-f]{64}\s+\*?(.+?)\s*$", l)
            if m: VEND.add(os.path.normpath(os.path.join(d, m.group(1))))
def fclass(rel):
    if "/vendor/" in rel or rel.startswith("vendor/") or rel in VEND: return "vendored"
    if "/tests/fixtures/" in rel or rel.startswith("acer/") or rel.startswith("docs/handoffs/") or rel.startswith("pump/"): return "imported"
    return "own"
def is_meta(path):
    b = os.path.basename(path)
    return b.startswith("PROVENANCE") or b.endswith((".md", ".hbp", ".sha256", ".toml"))
HEX = re.compile(r"(?<![0-9A-Za-z])([0-9a-fA-F]{7,40})(?![0-9A-Za-z])")
out = open(W + "/hits.tsv", "w"); nfiles = 0; nbytes = 0
p = subprocess.Popen(["git", "-C", A, "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
for rel, oid in ents:
    p.stdin.write((oid + "\n").encode()); p.stdin.flush()
    hdr = p.stdout.readline().split()
    size = int(hdr[2]); data = p.stdout.read(size); p.stdout.read(1)
    if b"\0" in data[:8000]: continue
    nfiles += 1; nbytes += size
    text = data.decode("utf-8", "replace")
    fc = fclass(rel); mt = 1 if is_meta(rel) else 0
    for i, line in enumerate(text.split("\n"), 1):
        for m in HEX.finditer(line):
            tl = m.group(1).lower()
            for repo, c in commits.get(tl[:7], []):
                if c.startswith(tl):
                    out.write(f"{repo}\t{c}\t{m.group(1)}\t{mt}\t{fc}\t{rel}\t{i}\t{m.start()}\n")
out.close()
print("head", head, "text files", nfiles, "bytes", nbytes, "vendored-listed", len(VEND))
