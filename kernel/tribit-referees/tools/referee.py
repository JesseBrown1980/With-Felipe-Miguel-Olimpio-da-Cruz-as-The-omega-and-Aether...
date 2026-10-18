#!/usr/bin/env python3
"""Cold-lane referee for kernel/tribit-referees. Standard library only, integer arithmetic only.

  python -I tools/referee.py --check [--rust DIR]
  python -I tools/referee.py --write

--check
  1. every vendored file: sha256 (UPSTREAM.sha256) and git blob id equal the pinned upstream blob;
  2. runs each vendored script as written (`python -I`) and compares its stdout byte for byte with
     receipts/*.stdout, whose sha256 receipts/RUNS.hbp pins;
  3. checks the receipt tables quoted in the vendored READMEs against those outputs;
  4. lists the syntactic float sites of each script (ast) and compares them with
     receipts/FLOAT-SITES.hbp; checks this file has none;
  5. with --rust DIR: runs DIR/crank, DIR/compose and DIR/trunk N and compares their stdout with
     the same receipts (the Rust ports are byte-equal to the scripts).
--write regenerates receipts/*.stdout, receipts/RUNS.hbp and receipts/FLOAT-SITES.hbp.
"""
import ast
import hashlib
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BL = "vendor/The-Brown-Light-erdos-Engine-block-powered-by-light"
BS = "vendor/the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3"
CL = "vendor/does-the-closure-survive-81-levels"
TN = "vendor/does-2-to-the-n-always-contain-a-digit-2-in-base-3"

# (vendored path, upstream repo, commit, git blob id)
VENDORED = [
    (BL + "/crank.py", "JesseBrown1980/The-Brown-Light-erdos-Engine-block-powered-by-light",
     "a2a6c447c8374fff441ac2a29614f525af2b2537", "12b034336e81c4df82611006dfdc2dc7dcc112a6"),
    (BL + "/README.md", "JesseBrown1980/The-Brown-Light-erdos-Engine-block-powered-by-light",
     "a2a6c447c8374fff441ac2a29614f525af2b2537", "85b48578c86f8fdeaac4fc6ab2743748be51c465"),
    (BS + "/README.md", "JesseBrown1980/the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3",
     "5bdc268091caab1df2c43de40a50fbc456642960", "395ba5bccd7dda61bac6bf85f0d9a4acac68a355"),
    (CL + "/compose.py", "JesseBrown1980/does-the-closure-survive-81-levels",
     "00dc393f10e346762f10842fcd2d02d08df508df", "f3574ed13bd4c18ca1fe4d42c2fb5d46f635807a"),
    (CL + "/README.md", "JesseBrown1980/does-the-closure-survive-81-levels",
     "00dc393f10e346762f10842fcd2d02d08df508df", "69eb40fd9c1561a0e598ded0877a172815ace39b"),
    (TN + "/trunk.py", "JesseBrown1980/does-2-to-the-n-always-contain-a-digit-2-in-base-3",
     "02299b45e9f66684ac19cb0cf40aa603fcbfb3cc", "5cefbf01a659b5f8bb23a0dd8fef8ba2bba793b0"),
    (TN + "/README.md", "JesseBrown1980/does-2-to-the-n-always-contain-a-digit-2-in-base-3",
     "02299b45e9f66684ac19cb0cf40aa603fcbfb3cc", "5f3a0ee52191e01baca58bcc6072160b42abb3ef"),
]

# (name, script, args, receipt, Rust example, its args)
RUNS = [
    ("crank", BL + "/crank.py", [], "receipts/crank.stdout", "crank", []),
    ("compose", CL + "/compose.py", [], "receipts/compose.stdout", "compose", []),
    ("trunk-8", TN + "/trunk.py", ["8"], "receipts/trunk-8.stdout", "trunk", ["8"]),
    ("trunk-4000", TN + "/trunk.py", ["4000"], "receipts/trunk-4000.stdout", "trunk", ["4000"]),
    ("trunk-200000", TN + "/trunk.py", ["200000"], "receipts/trunk-200000.stdout", "trunk",
     ["200000"]),
]

SCRIPTS = [BL + "/crank.py", CL + "/compose.py", TN + "/trunk.py"]

FAILS = []


def fail(msg):
    FAILS.append(msg)
    print("FAIL|" + msg)


def path(rel):
    return os.path.join(HERE, rel)


def read_bytes(rel):
    with open(path(rel), "rb") as f:
        return f.read()


def git_blob(data):
    return hashlib.sha1(b"blob %d\x00" % len(data) + data).hexdigest()


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def run_script(script, args):
    with tempfile.TemporaryDirectory() as cwd:
        p = subprocess.run([sys.executable, "-I", path(script)] + args, cwd=cwd,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if p.returncode != 0:
        fail("script %s exited %d: %s" % (script, p.returncode, p.stderr.decode()[-400:]))
    return p.stdout


# ------------------------------------------------------------------ 1. vendored bytes
def check_vendored():
    pinned = {}
    for line in read_bytes("UPSTREAM.sha256").decode().splitlines():
        digest, rel = line.split("  ", 1)
        pinned[rel] = digest
    if sorted(pinned) != sorted(v[0] for v in VENDORED):
        fail("UPSTREAM.sha256 lists %s" % sorted(pinned))
    for rel, repo, commit, blob in VENDORED:
        data = read_bytes(rel)
        ok = git_blob(data) == blob and sha256(data) == pinned.get(rel)
        print("VENDORED|path=%s|repo=%s|commit=%s|blob=%s|sha256=%s|bytes=%d|ok=%d|json=0"
              % (rel, repo, commit, blob, sha256(data), len(data), int(ok)))
        if not ok:
            fail("vendored bytes differ: " + rel)


# ------------------------------------------------------------------ 2. runs and receipts
def runs_hbp(outputs):
    rows = ["HBP1|schema=ASOLARIA-AETHER-TRIBIT-REFEREES-RUNS-V1|json=0"]
    blobs = {v[0]: v[3] for v in VENDORED}
    for name, script, args, receipt, _ex, _exargs in RUNS:
        out = outputs[name]
        rows.append("RUN|name=%s|script=%s|blob=%s|args=%s|stdout=%s|sha256=%s|lines=%d|bytes=%d|json=0"
                    % (name, script, blobs[script], ",".join(args) or "-", receipt, sha256(out),
                       out.count(b"\n"), len(out)))
    return "\n".join(rows) + "\n"


def check_runs():
    if sys.version_info < (3, 12):
        fail("compose.py's float64 rows use the builtin sum of CPython >= 3.12; this is %s"
             % sys.version.split()[0])
    outputs = {}
    for name, script, args, receipt, _ex, _exargs in RUNS:
        out = run_script(script, args)
        outputs[name] = out
        same = out == read_bytes(receipt)
        print("RUN|name=%s|python=%s|stdout_sha256=%s|equals_receipt=%d|json=0"
              % (name, sys.version.split()[0], sha256(out), int(same)))
        if not same:
            fail("%s stdout differs from %s" % (name, receipt))
    if runs_hbp(outputs).encode() != read_bytes("receipts/RUNS.hbp"):
        fail("receipts/RUNS.hbp differs from the runs")
    return outputs


# ------------------------------------------------------------------ 3. README receipts
def readme_rows(rel, first, last):
    lines = read_bytes(rel).decode("utf-8").split("\n")
    out = []
    for line in lines[first - 1:last]:
        line = line.rstrip("\r").replace("−", "-")
        if line.strip():
            out.append(line.split())
    return out


def num(text):
    return int(text.replace(",", ""))


def crank_rows(out):
    rows = {}
    checks = {}
    for line in out.decode().split("\n"):
        m = re.match(r"^ (\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S+)$", line)
        if m:
            rows[int(m.group(1))] = (int(m.group(2)), int(m.group(3)), int(m.group(4)),
                                     int(m.group(5)), m.group(6))
        m = re.match(r"^  P\((\d+)\) = (\S+)\s+= (\S+)$", line)
        if m:
            checks[int(m.group(1))] = m.group(2)
    return rows, checks


def trunk_parts(out):
    text = out.decode()
    records = [(int(a), int(b), int(c)) for a, b, c in
               re.findall(r"^   (\d+)\s+(\d+)\s+(\d+)$", text, re.M)]
    dist = {int(k): (int(n), p) for k, n, p in
            re.findall(r"^   pos (\d+)\s+(\d+)\s+\(([\d.]+)%\)$", text, re.M)}
    no_minus = re.search(r"^NO_MINUS_ANYWHERE\|n=\[(.*)\]\|json=0$", text, re.M).group(1)
    mins = re.search(r"^MIN_MINUS_COUNT\|for n>8\|value=(\S+)\|at_n=(\S+)\|json=0$", text, re.M)
    n_max = int(re.search(r"\|N=(\d+)\|", text).group(1))
    return records, dist, no_minus, (mins.group(1), mins.group(2)), n_max


def percent_of_fraction(frac_text):
    """100 * n/d rounded half to even at 4 decimals, as text, in integers."""
    n, d = (int(x) for x in frac_text.split("/"))
    q, r = divmod(100 * 10 ** 4 * n, d)
    if 2 * r > d or (2 * r == d and q % 2 == 1):
        q += 1
    return "%d.%04d%%" % (q // 10 ** 4, q % 10 ** 4)


def sig4(e_text):
    """'1.136868e-13' -> '1.137e-13': the printed digits rounded half up to 4 significant digits."""
    m = re.match(r"^(-?)(\d)\.(\d+)e([+-]\d+)$", e_text)
    sign, digits, exp = m.group(1), m.group(2) + m.group(3), int(m.group(4))
    if digits[4] == "5" and set(digits[5:]) <= {"0"}:
        fail("a printed tie at the 4th digit cannot be rounded from the text: " + e_text)
    keep = int(digits[:4]) + (1 if digits[4] >= "5" else 0)
    if keep == 10000:
        keep, exp = 1000, exp + 1
    k = "%04d" % keep
    return "%s%s.%se%s%02d" % (sign, k[0], k[1:], "-" if exp < 0 else "+", abs(exp))


def compare(label, got, want):
    ok = got == want
    print("README|%s|ok=%d|json=0" % (label, int(ok)))
    if not ok:
        fail("%s: README %r, script %r" % (label, want, got))


def check_readmes(outs):
    crank, checks = crank_rows(outs["crank"])
    # crank tables: Brown-Light README.md:61-73, browns-solution README.md:131-144 and :235-247
    for rel, first, last in ((BL + "/README.md", 62, 73), (BS + "/README.md", 132, 144),
                             (BS + "/README.md", 236, 247)):
        for row in readme_rows(rel, first, last):
            k = int(row[0])
            got = crank[k]
            want = (num(row[1]), num(row[2]), num(row[3]), num(row[4]), row[5])
            compare("%s:%d-%d|k=%d" % (rel, first, last, k), got, want)
    records, dist, no_minus, mins, n_max = trunk_parts(outs["trunk-200000"])
    # distribution: browns-solution README.md:164-169, does-2 README.md:60-65
    for rel, first, last in ((BS + "/README.md", 164, 169), (TN + "/README.md", 60, 65)):
        for row in readme_rows(rel, first, last):
            k = int(row[0])
            got = (dist[k][1] + "%", percent_of_fraction(checks[k]), checks[k])
            compare("%s:%d-%d|pos=%d" % (rel, first, last, k), got, (row[1], row[2], row[3]))
    # record setters: does-2 README.md:104-115 (n, lowest -1)
    got = [(n, lo) for n, lo, _m in records]
    want = [(int(r[0]), int(r[1])) for r in readme_rows(TN + "/README.md", 104, 115)]
    compare(TN + "/README.md:104-115|records", got, want)
    # browns-solution README.md:80-86 (n, lo(n)) are record setters; lo(n-1), lo(n+1) and
    # triple_min come from trianti.py, which is not vendored here
    for r in readme_rows(BS + "/README.md", 80, 86):
        compare(BS + "/README.md:80-86|n=%s" % r[0], (int(r[0]), int(r[2])) in got, True)
    # summary: does-2 README.md:136-139
    s = readme_rows(TN + "/README.md", 136, 139)
    compare(TN + "/README.md:136|range", n_max, num(s[0][-1]))
    compare(TN + "/README.md:137|no_minus", "{%s}" % no_minus, " ".join(s[1][-3:]))
    compare(TN + "/README.md:138|counterexamples",
            len([n for n in no_minus.split(", ") if int(n) > 8]), int(s[2][-1]))
    compare(TN + "/README.md:139|min_count", mins, (s[3][-5].rstrip(","), s[3][-1]))
    # compose: closure README.md:36-41, :56-60, :62-66, :82-86
    text = outs["compose"].decode()
    sec1 = {int(a): (int(b), int(c), int(d)) for a, b, c, d in
            re.findall(r"^  (\d+)\s+(\d+)\s+(\d+)\s+(\d+)$", text, re.M)}
    for r in readme_rows(CL + "/README.md", 36, 41):
        compare(CL + "/README.md:36-41|depth=%s" % r[0], sec1[int(r[0])],
                (num(r[1]), num(r[2]), num(r[3])))
    sec2 = {(int(a), b): (int(c), d) for a, b, c, d in
            re.findall(r"^  (\d+)\s+(int|float64)\s+(\d+)\s+(0 exactly|\S+)$", text, re.M)}
    for r in readme_rows(CL + "/README.md", 56, 60):
        compare(CL + "/README.md:56-60|depth=%s" % r[0], sec2[(int(r[0]), "int")],
                (num(r[2]), " ".join(r[3:])))
    for r in readme_rows(CL + "/README.md", 62, 66):
        m, worst = sec2[(int(r[0]), "float64")]
        compare(CL + "/README.md:62-66|depth=%s" % r[0], (m, sig4(worst)), (num(r[2]), r[3]))
    exact = dict(re.findall(r"^  (\d+)\s+exact\s+(\S+)$", text, re.M))
    flo = dict(re.findall(r"^  (\d+)\s+float64\s+(\S+e[+-]\d+)$", text, re.M))
    for r in readme_rows(CL + "/README.md", 82, 86):
        compare(CL + "/README.md:82-86|depth=%s" % r[0], (exact[r[0]], sig4(flo[r[0]])),
                (r[1], r[2]))


# ------------------------------------------------------------------ 4. float sites
FLOAT_FMT = re.compile(r"%[-+ #0]*\d*(?:\.\d+)?[eEfFgG]")


def float_sites(rel):
    src = read_bytes(rel).decode("utf-8")
    tree = ast.parse(src)
    sites = []
    for node in ast.walk(tree):
        kind = None
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "float":
            kind = "float_call"
        elif isinstance(node, ast.Constant) and type(node.value) is float:
            kind = "float_literal"
        elif isinstance(node, ast.BinOp) and isinstance(node.op, ast.Div):
            kind = "true_division"
        elif (isinstance(node, ast.BinOp) and isinstance(node.op, ast.Mod)
              and isinstance(node.left, ast.Constant) and isinstance(node.left.value, str)
              and FLOAT_FMT.search(node.left.value)):
            kind = "float_format:" + "+".join(FLOAT_FMT.findall(node.left.value))
        if kind:
            seg = ast.get_source_segment(src, node).split("\n")[0]
            if "|" in seg:
                fail("a '|' in a float-site source segment of " + rel)
            sites.append((node.lineno, node.col_offset, kind, seg))
    return sorted(sites)


def float_sites_hbp():
    rows = ["HBP1|schema=ASOLARIA-AETHER-TRIBIT-REFEREES-FLOAT-SITES-V1|json=0"]
    for rel in SCRIPTS:
        sites = float_sites(rel)
        rows.append("SCRIPT|path=%s|float_sites=%d|json=0" % (rel, len(sites)))
        for line, col, kind, seg in sites:
            rows.append("FLOAT_SITE|path=%s|line=%d|col=%d|kind=%s|source=%s|json=0"
                        % (rel, line, col, kind, seg))
    return "\n".join(rows) + "\n"


def check_float_sites():
    text = float_sites_hbp()
    for row in text.splitlines():
        if row.startswith("SCRIPT|"):
            print(row)
    if text.encode() != read_bytes("receipts/FLOAT-SITES.hbp"):
        fail("receipts/FLOAT-SITES.hbp differs from the ast scan")
    own = float_sites("tools/referee.py")
    print("SELF|path=tools/referee.py|float_sites=%d|json=0" % len(own))
    if own:
        fail("tools/referee.py has float sites: %s" % own)


# ------------------------------------------------------------------ 5. Rust ports
def check_rust(bindir):
    for name, _script, _args, receipt, example, exargs in RUNS:
        exe = os.path.join(bindir, example)
        try:
            p = subprocess.run([exe] + exargs, stdout=subprocess.PIPE, check=False)
        except OSError as e:
            fail("Rust %s did not run: %s" % (exe, e))
            continue
        same = p.returncode == 0 and p.stdout == read_bytes(receipt)
        print("RUST|name=%s|example=%s|stdout_sha256=%s|equals_script=%d|json=0"
              % (name, example, sha256(p.stdout), int(same)))
        if not same:
            fail("Rust %s differs from %s" % (example, receipt))


def write():
    outputs = {}
    for name, script, args, receipt, _ex, _exargs in RUNS:
        outputs[name] = run_script(script, args)
        with open(path(receipt), "wb") as f:
            f.write(outputs[name])
    with open(path("receipts/RUNS.hbp"), "wb") as f:
        f.write(runs_hbp(outputs).encode())
    with open(path("receipts/FLOAT-SITES.hbp"), "wb") as f:
        f.write(float_sites_hbp().encode())


def main(argv):
    if "--write" in argv:
        write()
        print("WROTE|receipts|json=0")
        return 0
    if "--check" not in argv:
        print(__doc__)
        return 2
    check_vendored()
    outputs = check_runs()
    check_readmes(outputs)
    check_float_sites()
    if "--rust" in argv:
        check_rust(argv[argv.index("--rust") + 1])
    print("VERDICT|fails=%d|json=0" % len(FAILS))
    return 1 if FAILS else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
