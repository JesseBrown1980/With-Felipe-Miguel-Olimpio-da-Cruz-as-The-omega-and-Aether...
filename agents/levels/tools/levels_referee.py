#!/usr/bin/env python3
"""Cold-lane referee for agents/levels: runs the vendored universe-simulator players unchanged.

fixtures [--check]
    1. players/rime_fischer.py (no owner receipt): its stdout becomes tests/fixtures/rime-fischer.hbp.
    2. players/rime_agents.py, its four agents in the order of lines 166-170, with the module global
       ENWIK8 pointed at 600,000 synthetic bytes (the LCG of model/hrm-mtp/tools/rime_referee.py:126-134):
       the stdout becomes tests/fixtures/rime-agents-synthetic.hbp.
    3. players/rime_fischer_cluster.py and players/rime_27fischers.py: stdout compared byte for byte
       with the owner receipts vendored under vendor/universe-simulator/receipts/operator/.
    4. fischer_agent() and mcp_agent() of rime_agents.py: their lines compared with the same lines of
       the owner receipt rime_agents.txt (lines 3-9 and 23-28).
    --check compares the fixtures instead of writing them.

agents --enwik8 PATH [--rust FILE]
    players/rime_agents.py, all four agents, with ENWIK8 pointed at PATH (upstream reads the first
    600,000 bytes of 'D:/asolaria-absorb/enwik9'; enwik8 holds the same bytes): stdout compared with
    the owner receipt rime_agents.txt and, with --rust, with the output of
    `cargo run --example rime_agents -- PATH`.

Float: rime_agents.py computes its MTP ratios (line 90) and HRM bpc (lines 113, 125, 129) in
binary64; this referee runs that owner float code unchanged and compares only its printed text.
The referee's own code is integer only.

The Rust side is checked against the same fixtures and receipts by `cargo test`. Prints HBP rows;
exits 1 on any difference. Stdlib only.
"""
import argparse
import contextlib
import hashlib
import io
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True  # importing the vendored players must not write into vendor/
ROOT = Path(__file__).resolve().parent.parent
PLAYERS = ROOT / "vendor" / "universe-simulator" / "players"
RECEIPTS = ROOT / "vendor" / "universe-simulator" / "receipts" / "operator"
FIXTURES = ROOT / "tests" / "fixtures"
UPSTREAM = "ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills@3f9f42dab6247c40b30921b253e3f73c9e942ca5"
FAILURES = []


def check(name, ok, detail=""):
    print(f"CHECK|name={name}|ok={int(bool(ok))}|{detail}|json=0")
    if not ok:
        FAILURES.append(name)


def first_difference(a, b):
    la, lb = a.splitlines(), b.splitlines()
    for i, (x, y) in enumerate(zip(la, lb), 1):
        if x != y:
            return f"line={i}"
    return f"lines={len(la)}/{len(lb)}"


def run_script(name):
    """`python players/<name>` unchanged: no bytecode, no user site, no PYTHON* variables."""
    env = {k: v for k, v in os.environ.items() if not k.startswith("PYTHON")}
    with tempfile.TemporaryDirectory() as cwd:
        done = subprocess.run([sys.executable, "-B", "-E", "-s", "-X", "utf8", str(PLAYERS / name)],
                              cwd=cwd, env=env, capture_output=True, check=True)
    return done.stdout.decode("utf-8")


def synthetic_bytes(n=600_000):
    """model/hrm-mtp/tools/rime_referee.py:126-134."""
    x = 0x2545F4914F6CDD1D
    alpha = b"etaoin shrdlucmfwyp"
    out = bytearray()
    for i in range(n):
        x = (x * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
        out.append((x >> 40) & 0xFF if i >= 500_000 and i % 997 == 0 else alpha[(x >> 33) % len(alpha)])
    return bytes(out)


def rime_agents_module():
    sys.path.insert(0, str(PLAYERS))
    import rime_agents  # the vendored file, unchanged
    return rime_agents


def four_agents(enwik_path):
    """rime_agents.py:166-170 with ENWIK8 (line 25) pointed at enwik_path."""
    m = rime_agents_module()
    m.ENWIK8 = str(enwik_path)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        print("THE FOUR FROZEN SLICE AGENTS — Laws 23-26, one measured demo each\n")
        m.fischer_agent(); m.mtp_agent(); m.hrm_agent(); m.mcp_agent()
        print("=" * 74)
        print("ALL FOUR AGENTS PLAYED. Frozen, sliced, trime-signed, receipt-backed.")
    return buf.getvalue()


def as_fixture(stdout, comment, source_row):
    rows = [f"# {comment}; do not edit", source_row]
    lines = stdout.split("\n")
    assert lines[-1] == "", "stdout ends with a newline"
    for i, line in enumerate(lines[:-1], 1):
        rows.append(f"LINE|n={i}|text={line}")
    sha = hashlib.sha256(stdout.encode("utf-8")).hexdigest()
    rows.append(f"END|lines={len(lines) - 1}|stdout_bytes={len(stdout.encode('utf-8'))}|stdout_sha256={sha}|json=0")
    return "\n".join(rows) + "\n"


def write_or_check(path, text, check_only):
    if check_only:
        have = path.read_text(encoding="utf-8") if path.exists() else ""
        check(f"fixture:{path.name}", have == text, first_difference(have, text))
    else:
        path.write_text(text, encoding="utf-8")
        print(f"WROTE|path={path.relative_to(ROOT)}|bytes={len(text.encode('utf-8'))}|json=0")


def fixtures(args):
    # 1. rime_fischer.py
    out = run_script("rime_fischer.py")
    text = as_fixture(out, "stdout of the vendored players/rime_fischer.py, run unchanged by tools/levels_referee.py",
                      f"SOURCE|repo={UPSTREAM}|path=players/rime_fischer.py|run=python3 -B -E -s -X utf8|json=0")
    write_or_check(FIXTURES / "rime-fischer.hbp", text, args.check)

    # 2. rime_agents.py on synthetic bytes
    data = synthetic_bytes()
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "synthetic.bin"
        p.write_bytes(data)
        out = four_agents(p)
    sha = hashlib.sha256(data).hexdigest()
    text = as_fixture(out, "stdout of the vendored players/rime_agents.py (lines 166-170) on synthetic_bytes(), run by tools/levels_referee.py",
                      f"SOURCE|repo={UPSTREAM}|path=players/rime_agents.py|enwik8=SYNTHETIC|bytes={len(data)}|sha256={sha}|json=0")
    write_or_check(FIXTURES / "rime-agents-synthetic.hbp", text, args.check)

    # 3. owner receipts reproduced by the vendored scripts
    for script, receipt in [("rime_fischer_cluster.py", "rime_fischer_cluster.txt"),
                            ("rime_27fischers.py", "rime_27fischers.txt")]:
        out = run_script(script)
        want = (RECEIPTS / receipt).read_text(encoding="utf-8")
        check(f"receipt:{receipt}", out == want, first_difference(out, want))

    # 4. fischer_agent() and mcp_agent() against the owner receipt rime_agents.txt
    m = rime_agents_module()
    receipt = (RECEIPTS / "rime_agents.txt").read_text(encoding="utf-8").split("\n")
    for fn, lo, hi in [(m.fischer_agent, 3, 9), (m.mcp_agent, 23, 28)]:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            ret = fn()
        got = buf.getvalue().split("\n")[:-1]
        want = receipt[lo - 1:hi]
        check(f"receipt:rime_agents.txt:{lo}-{hi}", got == want, f"return={ret}")


def agents(args):
    out = four_agents(args.enwik8)
    want = (RECEIPTS / "rime_agents.txt").read_text(encoding="utf-8")
    check("receipt:rime_agents.txt", out == want, first_difference(out, want))
    if args.rust:
        rust = Path(args.rust).read_text(encoding="utf-8")
        check("rust:rime_agents", rust == out, first_difference(rust, out))
    print(f"AGENTS|stdout_sha256={hashlib.sha256(out.encode('utf-8')).hexdigest()}|json=0")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fixtures")
    f.add_argument("--check", action="store_true")
    a = sub.add_parser("agents")
    a.add_argument("--enwik8", required=True)
    a.add_argument("--rust")
    args = ap.parse_args()
    {"fixtures": fixtures, "agents": agents}[args.cmd](args)
    print(f"RESULT|failures={len(FAILURES)}|json=0")
    sys.exit(1 if FAILURES else 0)


if __name__ == "__main__":
    main()
