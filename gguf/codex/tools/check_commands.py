#!/usr/bin/env python3
"""check_commands.py - check gguf/codex/CODEX-COMMANDS.hbp against the manifest and the tree (stdlib only).

Usage: python3 -I gguf/codex/tools/check_commands.py
Checks: one TARGET row for each n in 1..37; artifact, stored_sha256 and bytes equal to every
CODEX-MANIFEST.hbp line the row names; each repo_files entry exists with its sha256; each
stored_here path exists with the row's sha256 and size; the manifest sha256 the header names.
Each bash field (setup, command, check, referee, port_command, port_check) that does not start
with none: parses with bash -n; holds no single quote, backquote, $( or < other than <<<; has
every ( opening a subshell that starts with cd, and no other cd; uses only VARS variables, each
in double quotes except $STAGE; names only repository paths that exist (outside subshells, and
each plain cd target); and
a sha256sum <<< check names the row's stored_sha256. It runs no command but bash -n.
"""
import hashlib
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
COMMANDS = os.path.join(ROOT, "gguf", "codex", "CODEX-COMMANDS.hbp")
MANIFEST = os.path.join(ROOT, "gguf", "codex", "CODEX-MANIFEST.hbp")
SCHEMA = "ASOLARIA-AETHER-CODEX-COMMANDS-V2"
SHELL_KEYS = ("setup", "command", "check", "referee", "port_command", "port_check")
SET_BY_SETUP = ("QR", "STAGE")
WORD_SPLIT = ("STAGE",)
VAR = re.compile(r"\$\{?([A-Za-z_][A-Za-z0-9_]*)")
SHA_CHECK = re.compile(r'sha256sum -c --quiet <<< "([0-9a-f]{64})  ')


def fields(line):
    parts = line.rstrip("\n").split("|")
    return parts[0], dict(x.split("=", 1) for x in parts[1:])


def sha256_of(rel):
    with open(os.path.join(ROOT, rel), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def outside_subshells(text):
    out, depth = [], 0
    for c in text:
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        elif depth == 0:
            out.append(c)
    return "".join(out)


def shell_problems(text, names):
    probs = []
    for bad, why in (("'", "a single quote"), ("`", "a backquote"), ("$(", "a command substitution")):
        if bad in text:
            probs.append(why)
    if "<" in text.replace("<<<", ""):
        probs.append("a < that is not <<< (placeholder or input redirection)")
    for i, c in enumerate(text):
        if c == "(" and not text.startswith("( cd ", i):
            probs.append(f"a ( at {i} that does not open a subshell starting with cd")
    if text.count("(") != text.count(")"):
        probs.append("unbalanced parentheses")
    if re.search(r"(^|&&|;|\|\|)\s*cd\s", text):
        probs.append("a cd outside a subshell")
    quoted, i = False, 0
    while i < len(text):
        c = text[i]
        if c == "\\":
            i += 2
            continue
        if c == '"':
            quoted = not quoted
        elif c == "$":
            m = VAR.match(text, i)
            if m:
                name = m.group(1)
                if name not in names:
                    probs.append(f"${name} is not a VARS variable")
                elif name in WORD_SPLIT and quoted:
                    probs.append(f"${name} is in double quotes")
                elif name not in WORD_SPLIT and not quoted:
                    probs.append(f"${name} is not in double quotes")
        i += 1
    if quoted:
        probs.append("an unclosed double quote")
    toks = outside_subshells(text).split() + re.findall(r"\( cd ([^ $\"]+) ", text)
    for tok in toks:
        tok = re.sub(r"^[A-Za-z_]+=", "", tok)
        if "/" not in tok or "$" in tok or '"' in tok or ":" in tok or tok.startswith("-"):
            continue
        if not os.path.exists(os.path.join(ROOT, tok)):
            probs.append(f"repository path {tok} does not exist")
    done = subprocess.run(["bash", "-n", "-c", text], capture_output=True, check=False)
    if done.returncode != 0:
        probs.append("bash -n: " + done.stderr.decode("utf-8", "replace").strip().replace("\n", " "))
    return probs


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
    if head.get("schema") != SCHEMA:
        bad.append(f"header: schema is {head.get('schema')}, not {SCHEMA}")
    want = head.get("source", "").split("sha256 ", 1)[-1][:64]
    if want != hashlib.sha256(man_bytes).hexdigest():
        bad.append(f"header: CODEX-MANIFEST.hbp sha256 is {hashlib.sha256(man_bytes).hexdigest()}, the header names {want}")
    varrows = [d for _, k, d in rows if k == "VARS"]
    if len(varrows) != 1 or "setup" not in varrows[0]:
        bad.append("not exactly one VARS row with a setup field")
    names = set(k for k in (varrows[0] if varrows else {}) if k not in ("rule", "setup", "json")) | set(SET_BY_SETUP)
    seen, files_checked, shell_checked = [], 0, 0
    for i, kind, d in rows:
        for entry in [] if d.get("repo_files", "none") == "none" else d["repo_files"].split(","):
            path, digest = entry.rsplit(":", 1)
            files_checked += 1
            if not os.path.isfile(os.path.join(ROOT, path)):
                bad.append(f"line {i}: {path} is missing")
            elif sha256_of(path) != digest:
                bad.append(f"line {i}: {path} sha256 differs from {digest}")
        for key in SHELL_KEYS if kind in ("VARS", "TARGET") else ():
            text = d.get(key)
            if text is None or text.startswith("none"):
                continue
            shell_checked += 1
            for p in shell_problems(text, names):
                bad.append(f"line {i}: {key}: {p}")
            for digest in SHA_CHECK.findall(text):
                if digest != d.get("stored_sha256"):
                    bad.append(f"line {i}: {key}: sha256sum check names {digest}, not the row's stored_sha256")
        if kind != "TARGET":
            continue
        seen.append(int(d["n"]))
        if "exit" in d and not d["exit"].isdigit():
            bad.append(f"line {i}: exit={d['exit']} is not a non-negative integer")
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
    print(f"COMMANDS|targets={len(seen)}|files_checked={files_checked}|shell_fields={shell_checked}|bad={len(bad)}|json=0")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
