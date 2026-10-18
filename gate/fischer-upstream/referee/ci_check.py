#!/usr/bin/env python3
"""One-shot CI guard for the upstream Fischer proof and the AE measurement.

Checks the referee against the four pinned Node rows, generates the seeded cases, drives the
vendored upstream (Rust fixture, fixed ts) and the referee over them, and fails unless every Rust
byte is pinned (prove_upstream.py --check). When both host8 binaries are given it also runs the
AE-vs-upstream measurement and fails if any differing case falls outside the two AE input classes.
Standard library only; every child runs as `python3 -I`.

Usage:
  python3 -I referee/ci_check.py <upstream-fixture-bin> [<upstream-host8-bin> <ae-host8-bin>]
Env:
  FISCHER_CASES  number of seeded random cases (default 2000)
"""

import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))


def py(script, *args, **kw):
    return subprocess.run([sys.executable, "-I", os.path.join(HERE, script), *args], **kw).returncode


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    fixture = sys.argv[1]
    up = sys.argv[2] if len(sys.argv) > 2 else None
    ae = sys.argv[3] if len(sys.argv) > 3 else None
    n = os.environ.get("FISCHER_CASES", "2000")

    if py("fischer_referee.py", "--pins") != 0:
        sys.exit(1)
    with tempfile.TemporaryDirectory() as d:
        cases = os.path.join(d, "cases.txt")
        fed = os.path.join(d, "fed.out")
        ref = os.path.join(d, "ref.out")
        with open(cases, "wb") as fh:
            if py("gen_cases.py", n, stdout=fh) != 0:
                sys.exit(1)
        with open(cases, "rb") as ci, open(fed, "wb") as fo:
            subprocess.run([fixture], stdin=ci, stdout=fo, check=True)
        with open(cases, "rb") as ci, open(ref, "wb") as fo:
            if py("fischer_referee.py", stdin=ci, stdout=fo) != 0:
                sys.exit(1)
        if py("prove_upstream.py", fed, ref, cases, "--check") != 0:
            sys.exit(1)
        if up and ae and py("measure_ae.py", up, ae, cases) != 0:
            sys.exit(1)
    print("ci_check: OK")


if __name__ == "__main__":
    main()
