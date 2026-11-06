#!/usr/bin/env python3
"""For each 'no version matches' object: test byte variants and every file of the same tree against the declared hash."""
import subprocess, hashlib, sys
P = "/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad/vault-rerun/pins"
tg = {l.split("\t")[0]: l.rstrip("\n").split("\t") for l in open(P + "/work/targets.tsv")}
sha = lambda b: hashlib.sha256(b).hexdigest()
seen = set()
for l in open(P + "/work/causes.tsv"):
    p = l.rstrip("\n").split("\t")
    label, repo, c, path, kind, ver, reason, ptr, cause, ev = p
    if "no_version" not in cause: continue
    d = tg[label][3]
    key = (repo, path, reason)
    if key in seen: continue
    seen.add(key)
    data = subprocess.run(["git", "-C", d, "cat-file", "blob", f"{c}:{path}"], capture_output=True).stdout
    if "sidecar" in reason:
        side = subprocess.run(["git", "-C", d, "cat-file", "blob", f"{c}:{path}.sha256"], capture_output=True).stdout
        decl = side.split()[0].decode().lower(); declsrc = "sidecar:" + side.decode("utf-8", "replace").strip()[:120]
    else:
        hbi, ln, k = ptr.rsplit(":", 2)
        row = subprocess.run(["git", "-C", d, "cat-file", "blob", f"{c}:{hbi}"], capture_output=True).stdout.split(b"\n")[int(ln) - 1].decode()
        f = dict(x.partition("=")[::2] for x in row.split("|")[1:]); decl = f.get("sha256", ""); declsrc = "row:" + row[:160]
    var = {"as_is": data, "strip_final_lf": data.rstrip(b"\n"), "add_lf": data + b"\n", "crlf": data.replace(b"\n", b"\r\n"),
           "crlf_strip_final": data.replace(b"\n", b"\r\n").rstrip(b"\r\n"), "lf": data.replace(b"\r\n", b"\n"), "bom": b"\xef\xbb\xbf" + data}
    hit = [k for k, v in var.items() if sha(v) == decl]
    tree = subprocess.run(["git", "-C", d, "ls-tree", "-r", c], capture_output=True, text=True).stdout.split("\n")
    other = []
    for t in tree:
        if not t: continue
        meta, name = t.split("\t", 1)
        b = subprocess.run(["git", "-C", d, "cat-file", "blob", meta.split()[2]], capture_output=True).stdout
        if sha(b) == decl or sha(b.replace(b"\n", b"\r\n")) == decl: other.append(name)
    print(repo, c[:7], path, reason, "decl=" + decl[:16], "file=" + sha(data)[:16], "variant_hits=" + ",".join(hit), "tree_hits=" + ",".join(other[:3]), declsrc, sep="\n  ")
