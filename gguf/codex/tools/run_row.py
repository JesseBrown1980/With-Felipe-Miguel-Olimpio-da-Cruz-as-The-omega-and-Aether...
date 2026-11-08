#!/usr/bin/env python3
"""run_row.py - run one TARGET row of gguf/codex/CODEX-COMMANDS.hbp as written (stdlib only).

Usage: python3 -I gguf/codex/tools/run_row.py N [--check-only] [--save DIR]
Export the VARS variables the row uses first (absolute paths, no space); W must be an empty
directory unless --check-only. From the repository root, bash runs set -u, the VARS setup and
the row's command; a second bash runs set -u, setup and the row's check. It prints the sha256 of
each text it ran, both exit statuses and the sha256 of the command's stdout and stderr (saved
in DIR with --save). PASS=1 when command ends with the row's exit (default 0) and check with 0.
This runs the row's command, and so the owner program that command names.
"""
import hashlib
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
COMMANDS = os.path.join(ROOT, "gguf", "codex", "CODEX-COMMANDS.hbp")
VAR = re.compile(r"\$\{?([A-Za-z_][A-Za-z0-9_]*)")


def fields(line):
    parts = line.rstrip("\n").split("|")
    return parts[0], dict(x.split("=", 1) for x in parts[1:])


def sha(b):
    return hashlib.sha256(b).hexdigest()


def bash(setup, text):
    script = "set -u\n" + setup + "\n" + text + "\n"
    return subprocess.run(["bash", "-c", script], cwd=ROOT, capture_output=True, check=False)


def main(argv):
    args = list(argv)
    check_only = "--check-only" in args
    if check_only:
        args.remove("--check-only")
    save = None
    if "--save" in args:
        k = args.index("--save")
        save = args[k + 1]
        del args[k:k + 2]
    if len(args) != 1 or not args[0].isdigit():
        print(__doc__, file=sys.stderr)
        return 2
    n = args[0]
    with open(COMMANDS, encoding="utf-8") as f:
        rows = [fields(l) for l in f]
    setup = [d for k, d in rows if k == "VARS"][0]["setup"]
    targets = [d for k, d in rows if k == "TARGET" and d["n"] == n]
    if len(targets) != 1:
        print(f"no TARGET row n={n}", file=sys.stderr)
        return 2
    row = targets[0]
    if row["command"].startswith("none") or row["check"].startswith("none"):
        print(f"ROW|n={n}|runnable=0|command={row['command']}|json=0")
        return 2
    used = set(VAR.findall(setup + " " + row["command"] + " " + row["check"])) - {"QR", "STAGE"}
    for name in sorted(used):
        value = os.environ.get(name, "")
        if not value.startswith("/") or " " in value:
            print(f"{name} must be exported as an absolute path with no space", file=sys.stderr)
            return 2
    w = os.environ["W"]
    if not check_only and (not os.path.isdir(w) or os.listdir(w)):
        print(f"W={w} must be an existing empty directory", file=sys.stderr)
        return 2
    expected = int(row.get("exit", "0"))
    print(f"ROWTEXT|n={n}|setup_sha256={sha(setup.encode())}|command_sha256={sha(row['command'].encode())}"
          f"|check_sha256={sha(row['check'].encode())}|json=0")
    rc = expected
    if not check_only:
        done = bash(setup, row["command"])
        rc = done.returncode
        if save:
            os.makedirs(save, exist_ok=True)
            for name, data in (("command.stdout", done.stdout), ("command.stderr", done.stderr)):
                with open(os.path.join(save, f"n{n}.{name}"), "wb") as f:
                    f.write(data)
        print(f"RUN|n={n}|exit={rc}|expected_exit={expected}|stdout_bytes={len(done.stdout)}"
              f"|stdout_sha256={sha(done.stdout)}|stderr_bytes={len(done.stderr)}|stderr_sha256={sha(done.stderr)}|json=0")
    chk = bash(setup, row["check"])
    out = (chk.stdout + chk.stderr).decode("utf-8", "replace").strip().replace("\n", " ")
    print(f"CHECK|n={n}|exit={chk.returncode}|output={out}|json=0")
    ok = rc == expected and chk.returncode == 0
    print(f"ROW|n={n}|PASS={1 if ok else 0}|json=0")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
