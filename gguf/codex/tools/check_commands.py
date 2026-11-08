#!/usr/bin/env python3
"""check_commands.py - check gguf/codex/CODEX-COMMANDS.hbp against the manifest and the tree (stdlib only).

Usage: python3 -I gguf/codex/tools/check_commands.py
Checks: one TARGET row for each n in 1..37; artifact, stored_sha256 and bytes equal to every
CODEX-MANIFEST.hbp line the row names; each repo_files entry exists with its sha256; each
stored_here path exists with the row's sha256 and size; the manifest sha256 the header names.
It runs no command and reads no file outside the repository.
"""
import hashlib
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
COMMANDS = os.path.join(ROOT, "gguf", "codex", "CODEX-COMMANDS.hbp")
MANIFEST = os.path.join(ROOT, "gguf", "codex", "CODEX-MANIFEST.hbp")


def fields(line):
    parts = line.rstrip("\n").split("|")
    return parts[0], dict(x.split("=", 1) for x in parts[1:])


def sha256_of(rel):
    with open(os.path.join(ROOT, rel), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def main():
    bad = []
    with open(MANIFEST, "rb") as f:
        man_bytes = f.read()
    man = {i: fields(l) for i, l in enumerate(man_bytes.decode("utf-8").splitlines(), 1)}
    rows = []
    with open(COMMANDS, encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            try:
                rows.append((i,) + fields(line))
            except ValueError:
                bad.append(f"line {i}: a field without '='")
    head = rows[0][2] if rows and rows[0][1] == "HBP1" else {}
    want = head.get("source", "").split("sha256 ", 1)[-1][:64]
    if want != hashlib.sha256(man_bytes).hexdigest():
        bad.append(f"header: CODEX-MANIFEST.hbp sha256 is {hashlib.sha256(man_bytes).hexdigest()}, the header names {want}")
    seen, files_checked = [], 0
    for i, kind, d in rows:
        for entry in [] if d.get("repo_files", "none") == "none" else d["repo_files"].split(","):
            path, digest = entry.rsplit(":", 1)
            files_checked += 1
            if not os.path.isfile(os.path.join(ROOT, path)):
                bad.append(f"line {i}: {path} is missing")
            elif sha256_of(path) != digest:
                bad.append(f"line {i}: {path} sha256 differs from {digest}")
        if kind != "TARGET":
            continue
        seen.append(int(d["n"]))
        for ln in [int(x) for x in d["manifest"].split(",")]:
            mk, md = man.get(ln, ("", {}))
            for key in ("artifact", "stored_sha256", "bytes"):
                if md.get(key) != d[key]:
                    bad.append(f"line {i}: n={d['n']} {key} differs from CODEX-MANIFEST.hbp:{ln} ({mk})")
        stored = d["stored_here"]
        if not stored.startswith("none"):
            files_checked += 1
            if not os.path.isfile(os.path.join(ROOT, stored)):
                bad.append(f"line {i}: stored_here {stored} is missing")
            elif sha256_of(stored) != d["stored_sha256"] or os.path.getsize(os.path.join(ROOT, stored)) != int(d["bytes"]):
                bad.append(f"line {i}: stored_here {stored} differs from stored_sha256 or bytes")
    if sorted(seen) != list(range(1, 38)):
        bad.append(f"TARGET n values are {sorted(seen)}, not 1..37 once each")
    for b in bad:
        print("BAD|" + b)
    print(f"COMMANDS|targets={len(seen)}|files_checked={files_checked}|bad={len(bad)}|json=0")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
