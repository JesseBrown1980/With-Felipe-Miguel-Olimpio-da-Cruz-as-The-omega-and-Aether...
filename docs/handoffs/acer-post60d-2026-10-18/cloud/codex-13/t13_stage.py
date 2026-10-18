#!/usr/bin/env python3
"""t13_stage.py - stage the D:/ tree that USIM project_gguf.py@4ea2ae3 globs (stdlib only).

Written for this review, independently of regen/tools/stage_office.py, to the round-2 recipe:
  office = FABLE5-*.hbi|hbp in matrices/ then receipts/ (receipts/ wins) of --commit (37248b2),
           keeping only names present in matrices/ or receipts/ at --names-from (7ca9ce5),
           FABLE5-SELF-SEED-3078.hbp taken from 7ca9ce5:matrices/, minus --remove names,
           FABLE5-SELF-SEED-3078.hbi from --selfseed-hbi (a file) or 'tree' (the --commit copy);
  laws   = the four .qr files from --laws-dir (ACER delivery), prior3174.bin from --prior;
  wasm   = --wasm (4ea2ae3:web/asolaria_tribit.wasm); no CONSTELLATION GGUF is staged.
Office .sha256 sidecars from the same tree dir are copied (the program's globs never match them).
Writes DEST/STAGE.hbp with one row per staged file. Reads git objects only; runs nothing.
"""
import argparse
import fnmatch
import hashlib
import os
import subprocess
import sys

OFF = "D:/PID-Registration-Office/offices/FABLE5-8467a937cba309f7"
ABS = "D:/asolaria-absorb"
QR = ("asolaria-corpus.txt.qr", "code-corpus.txt.qr", "fotoC.bin.qr", "wiki.qr")
SEED_HBP = "FABLE5-SELF-SEED-3078.hbp"
SEED_HBI = "FABLE5-SELF-SEED-3078.hbi"


def git(g, *a):
    env = dict(os.environ, GIT_NO_LAZY_FETCH="1")
    return subprocess.run(["git", "--git-dir", g, *a], capture_output=True, check=True, env=env).stdout


def ls(g, commit, d):
    """{basename: blob_oid} for regular files directly in dir d at commit."""
    out = {}
    for line in git(g, "ls-tree", commit, d + "/").decode().splitlines():
        meta, path = line.split("\t", 1)
        mode, typ, oid = meta.split()
        if typ == "blob":
            out[os.path.basename(path)] = oid
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--git", required=True)
    ap.add_argument("--commit", default="37248b2")
    ap.add_argument("--names-from", default="7ca9ce5")
    ap.add_argument("--seed-hbp-from", default="7ca9ce5")
    ap.add_argument("--remove", action="append", default=[])
    ap.add_argument("--selfseed-hbi", required=True, help="file path, or 'tree'")
    ap.add_argument("--selfseed-hbi-label", default="")
    ap.add_argument("--laws-dir", required=True)
    ap.add_argument("--laws-label", required=True)
    ap.add_argument("--prior", default="3f9f42d:key/prior3174.bin")
    ap.add_argument("--wasm", default="4ea2ae3:web/asolaria_tribit.wasm")
    ap.add_argument("--dest", required=True)
    a = ap.parse_args()

    dest = os.path.abspath(a.dest)
    if os.path.exists(dest) and os.listdir(dest):
        sys.exit(f"refusing: {dest} not empty")
    c = git(a.git, "rev-parse", "--verify", a.commit + "^{commit}").decode().strip()
    nf = git(a.git, "rev-parse", "--verify", a.names_from + "^{commit}").decode().strip()

    office, side = {}, {}
    for d in ("matrices", "receipts"):
        t = ls(a.git, c, d)
        for n, oid in t.items():
            if fnmatch.fnmatchcase(n, "FABLE5-*.hbi") or fnmatch.fnmatchcase(n, "FABLE5-*.hbp"):
                office[n] = (oid, f"usim@{c[:7]}:{d}/{n}")
                if n + ".sha256" in t:
                    side[n] = (t[n + ".sha256"], f"usim@{c[:7]}:{d}/{n}.sha256")
                else:
                    side.pop(n, None)
    keep = set(ls(a.git, nf, "matrices")) | set(ls(a.git, nf, "receipts"))
    dropped = sorted(n for n in office if n not in keep)
    for n in dropped:
        office.pop(n)
        side.pop(n, None)
    seed_oid = git(a.git, "rev-parse", f"{a.seed_hbp_from}:matrices/{SEED_HBP}").decode().strip()
    office[SEED_HBP] = (seed_oid, f"usim@{a.seed_hbp_from}:matrices/{SEED_HBP}")
    side.pop(SEED_HBP, None)
    for n in a.remove:
        if n not in office:
            sys.exit(f"--remove {n}: not in office")
        office.pop(n)
        side.pop(n, None)
    files = {}  # rel -> (bytes, source, role)
    for n, (oid, src) in sorted(office.items()):
        files[f"{OFF}/{n}"] = (git(a.git, "cat-file", "blob", oid), f"{src}|blob={oid}", "office")
        if n in side:
            soid, ssrc = side[n]
            files[f"{OFF}/{n}.sha256"] = (git(a.git, "cat-file", "blob", soid), f"{ssrc}|blob={soid}", "office-sidecar")
    if a.selfseed_hbi != "tree":
        b = open(a.selfseed_hbi, "rb").read()
        files[f"{OFF}/{SEED_HBI}"] = (b, a.selfseed_hbi_label or a.selfseed_hbi, "office")
        files.pop(f"{OFF}/{SEED_HBI}.sha256", None)
    for n in QR:
        files[f"{ABS}/laws/{n}"] = (open(os.path.join(a.laws_dir, n), "rb").read(), f"{a.laws_label}/{n}", "laws")
    poid = git(a.git, "rev-parse", a.prior).decode().strip()
    files[f"{ABS}/laws/prior3174.bin"] = (git(a.git, "cat-file", "blob", poid), f"usim@{a.prior}|blob={poid}", "laws")
    woid = git(a.git, "rev-parse", a.wasm).decode().strip()
    files[f"{ABS}/asolaria-tribit/web/asolaria_tribit.wasm"] = (git(a.git, "cat-file", "blob", woid),
                                                              f"usim@{a.wasm}|blob={woid}", "wasm")
    rows = [f"STAGEHDR|tool=t13_stage.py|commit={c}|names_from={nf}|dest={dest}|json=0"]
    for rel in sorted(files):
        b, src, role = files[rel]
        p = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "xb") as f:
            f.write(b)
        rows.append(f"F|role={role}|path={rel}|bytes={len(b)}|sha256={hashlib.sha256(b).hexdigest()}|src={src}|json=0")
    os.makedirs(os.path.join(dest, ABS, "constellation"), exist_ok=True)
    rows.append(f"NOTE|names_from {nf[:7]} left out {len(dropped)}: {' '.join(dropped)}|json=0")
    nof = sum(1 for r, (_, _, role) in files.items() if role == "office")
    rows.append(f"COUNT|office={nof}|staged_files={len(files)}|staged_bytes={sum(len(v[0]) for v in files.values())}|json=0")
    with open(os.path.join(dest, "STAGE.hbp"), "x", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(rows) + "\n")
    print(rows[-1])
    print(rows[-2][:300])


if __name__ == "__main__":
    main()
