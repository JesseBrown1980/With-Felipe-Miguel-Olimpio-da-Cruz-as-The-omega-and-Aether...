#!/usr/bin/env python3
"""Cold-lane referee for ledger/hyperbehcs-daemons (Python stdlib only; run with `python3 -I`).

It executes the exact upstream source lines of the two vendored daemons, copied by line range
from vendor/acer-hyperbehcs-bin/ (sha256-pinned), and never imports the daemon modules: their
module top levels create directories under C:/ (cosign lines 22-24, vote-quorum lines 35-40).
Those lines are replaced by temp paths; the `datetime` name the exec'd `now_iso` lines read is
replaced by a fixed clock; nothing binds a port.

  vote-quorum  30-33 imports, 42-61 constants and QUORUM_RULES, 63-64 now_iso/sha16,
               66-163 ledger helpers, is_authorized, evaluate_quorum, 165-254 Handler
  cosign-chain 17-20 imports, 25-32 constants, lock, now_iso, sha16, 34-74 chain_head, append_row

It runs the Rust `hyperbehcs-daemons-vectors` binary over seeded inputs and requires its answers
to equal the upstream lines' answers in every mode. Integer arithmetic only on the referee's side;
the float expressions evaluated are upstream's own lines 149, 151, 157 and 159, run unchanged.

Each daemon is one lane with its own random.Random(SEED) and its own receipt: cosign-chain in
REFEREE.hbp, vote-quorum in VOTE-QUORUM.hbp. The vote-quorum daemon is vendored (owner decision,
2026-10-18; PROVENANCE.md); its lane runs on every run, against a binary built with the (default)
`vote-quorum` feature. If the daemon were absent the vote-quorum lane would print one HELD row and
not run.

  referee.py --vectors <path> --check     compare, and compare the receipts with the .hbp files
  referee.py --vectors <path> --write     compare, then rewrite the receipts
  referee.py --vectors <path> --compare-only [--exhaustive-max N]
                                          compare only (local runs, e.g. mutation checks)
  referee.py ... --fed-vectors <path to cosign-council-vectors>
                                          also measure ledger/cosign-council (federation-1024
                                          cosign-ledger py_parity) against the upstream daemon,
                                          pinned in FED-COMPARE.hbp
"""

import argparse
import ast
import hashlib
import io
import json
import os
import random
import subprocess
import sys
import tempfile
import tokenize
from collections import Counter
from datetime import datetime as real_datetime
from datetime import timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
VENDOR = ROOT / "vendor" / "acer-hyperbehcs-bin"
VQ_PATH = VENDOR / "asolaria-vote-quorum-daemon.py"
CC_PATH = VENDOR / "asolaria-cosign-chain-daemon.py"
PINNED = {
    VQ_PATH.name: "9fd9de52e84caf667ccdcee1c37193a4e9197a86f7c951fc04677a65de6db9ae",
    CC_PATH.name: "a2c863db85a747f3b5272d72b2dc6215f7dda3470a6290621de1bc70def22ea2",
}
VQ_RANGES = [(30, 33), (42, 61), (63, 64), (66, 163), (165, 254)]
CC_RANGES = [(17, 20), (25, 32), (34, 74)]
RECEIPT = HERE / "REFEREE.hbp"
VQ_RECEIPT = HERE / "VOTE-QUORUM.hbp"
FED_RECEIPT = HERE / "FED-COMPARE.hbp"
I128_MAX = 2**127 - 1
SEED = 20261017
EPOCH = real_datetime(1970, 1, 1, tzinfo=timezone.utc)
EXHAUSTIVE_MAX = 10000
TMP_ROOT = None


def tmpdir(prefix):
    """A fresh directory under the run's temporary root (removed when the run ends)."""
    return tempfile.mkdtemp(prefix=prefix, dir=TMP_ROOT)


# ---------------------------------------------------------------- upstream lines


def upstream_lines(path):
    raw = path.read_bytes()
    got = hashlib.sha256(raw).hexdigest()
    if got != PINNED[path.name]:
        sys.exit(f"{path.name}: sha256 {got} != pinned {PINNED[path.name]}")
    return raw.decode("utf-8").split("\n")


def range_text(lines, a, b):
    return "\n".join(lines[a - 1 : b]) + "\n"


def exec_range(path, lines, a, b, ns):
    # Leading newlines keep tracebacks on the upstream line numbers.
    exec(compile("\n" * (a - 1) + range_text(lines, a, b), str(path), "exec"), ns)


class Clock:
    """Stands in for the `datetime` class inside the exec'd lines: `now(tz)` returns `instant`,
    then advances it by `tick_us` microseconds."""

    def __init__(self, instant=EPOCH, tick_us=0):
        self.instant = instant
        self.tick_us = tick_us

    def now(self, tz=None):
        t = self.instant
        self.instant = t + timedelta(microseconds=self.tick_us)
        return t


def load_vote_quorum(lines, data_dir, clock):
    ns = {"__name__": "upstream_vote_quorum_lines"}
    exec_range(VQ_PATH, lines, 30, 33, ns)
    d = Path(data_dir)
    # Stand-ins for lines 35-40 (the daemon's C:/HyperBEHCS/data/vote-quorum paths and mkdir).
    ns.update(
        DATA_DIR=d,
        QUEUE=d / "queue.ndjson",
        VOTES=d / "votes.ndjson",
        OUTCOMES=d / "outcomes.ndjson",
        PID_FILE=d / "daemon.pid",
    )
    ns["datetime"] = clock
    for a, b in VQ_RANGES[1:]:
        exec_range(VQ_PATH, lines, a, b, ns)
    return ns


def load_cosign(lines, chain_path, clock):
    ns = {"__name__": "upstream_cosign_chain_lines"}
    exec_range(CC_PATH, lines, 17, 20, ns)
    ns["CHAIN"] = Path(chain_path)  # stand-in for line 22 (C:/asolaria-acer/COSIGN_CHAIN.ndjson)
    ns["datetime"] = clock
    for a, b in CC_RANGES[1:]:
        exec_range(CC_PATH, lines, a, b, ns)
    return ns


def condition(lines, n):
    """The condition text of the `if`/`elif` on upstream line n."""
    s = lines[n - 1].strip()
    for kw in ("if ", "elif "):
        if s.startswith(kw) and s.endswith(":"):
            return s[len(kw) : -1]
    sys.exit(f"line {n} is not an if/elif: {s!r}")


# ---------------------------------------------------------------- Rust side


def run_rust(binary, requests):
    data = ("\n".join(requests) + "\n").encode("utf-8")
    p = subprocess.run([binary], input=data, capture_output=True, check=False)
    if p.returncode != 0:
        sys.exit(f"vectors binary failed: {p.stderr.decode('utf-8', 'replace')[:2000]}")
    return p.stdout.decode("utf-8").splitlines()


def fields(row):
    out = {}
    for part in row.split("|")[1:]:
        k, _, v = part.partition("=")
        out[k] = v
    return out


def hexs(s):
    return s.encode("utf-8").hex()


def sha256_lines(rows):
    return hashlib.sha256(("\n".join(rows) + "\n").encode("utf-8")).hexdigest()


def encode(v):
    """The vectors binary's prefix tokens for a str / int / list / dict value."""
    if isinstance(v, bool) or v is None:
        raise TypeError("outside the Rust value shapes")
    if isinstance(v, str):
        return "s" + hexs(v)
    if isinstance(v, int):
        return "i" + str(v)
    if isinstance(v, list):
        return " ".join([f"l{len(v)}"] + [encode(x) for x in v])
    if isinstance(v, dict):
        parts = [f"o{len(v)}"]
        for k, x in v.items():
            parts.append("s" + hexs(k))
            parts.append(encode(x))
        return " ".join(parts)
    raise TypeError(type(v).__name__)


# ---------------------------------------------------------------- generators

CHAR_POOL = (
    [chr(c) for c in range(0x00, 0x20)]
    + ['"', "\\", "/", "\x7f", "\x80", "\x85", "\xa0", "\xe1", "\xff"]
    + ["\u0100", "\u0301", "\u2028", "\u2029", "\u20ac", "\ufeff", "\uff61", "\ue000", "\uffff"]
    + ["\u4e2d", "\u6587", "\U0001f600", "\U00010000", "\U0010ffff"]
    + list("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.:")
)
# str.splitlines boundaries that json.dumps(ensure_ascii=False) writes unescaped.
SPLITTERS = ("\x85", "\u2028", "\u2029")
SAFE_POOL = [c for c in CHAR_POOL if c not in SPLITTERS]
INT_EDGES = [0, 1, -1, 7, -7, 2**31, -(2**31), 2**53 + 1, 2**63, -(2**63), 2**127 - 1, -(2**127)]


def gen_str(r, pool=CHAR_POOL, maxlen=12):
    n = r.randrange(0, maxlen + 1)
    if r.randrange(3) == 0:
        return "".join(r.choice(pool[0x20:]) for _ in range(n))
    return "".join(r.choice(pool) for _ in range(n))


def gen_int(r):
    k = r.randrange(4)
    if k == 0:
        return r.choice(INT_EDGES)
    if k == 1:
        return r.randrange(-1000, 1000)
    return r.randrange(-(2**126), 2**126)


def gen_value(r, depth=0):
    k = r.randrange(10 if depth < 3 else 6)
    if k < 3:
        return gen_str(r)
    if k < 5:
        return gen_int(r)
    if k < 6:
        return [gen_str(r) for _ in range(r.randrange(0, 4))]
    if k < 8:
        return [gen_value(r, depth + 1) for _ in range(r.randrange(0, 4))]
    return gen_obj(r, depth + 1)


def gen_key(r):
    k = r.randrange(6)
    if k == 0:
        return r.choice(["row_hash", "seq", "ts", "antecedents", "a", "b", "A", "", "\uff61", "\U0001f600", "\xe1", "a\x00"])
    return gen_str(r, maxlen=6)


def gen_obj(r, depth=0):
    return {gen_key(r): gen_value(r, depth) for _ in range(r.randrange(0, 5))}


# ---------------------------------------------------------------- vote-quorum modes


def mode_rules(binary, ns, out):
    rust = run_rust(binary, ["RULES"])
    want = []
    for cls, spec in ns["QUORUM_RULES"].items():
        want.append(
            f"RULE|class={cls}|rule={spec['rule']}|pool={spec['pool']}|extra={spec.get('extra', '-')}|json=0"
        )
    q = sorted(ns["QUINTUPLE"])
    qsha = hashlib.sha256("\n".join(q).encode("utf-8")).hexdigest()[:16]
    want.append(
        f"SETS|quintuple_n={len(q)}|quintuple_sha16={qsha}|authorized_classes={','.join(sorted(ns['AUTHORIZED_CLASSES']))}|json=0"
    )
    want.append(
        f"WINDOW|law_window_end={ns['LAW_WINDOW_END']}|op_window_end={ns['OP_WINDOW_END']}|json=0"
    )
    ok = rust == want
    out.append(f"CASES|mode=rules|rows={len(want)}|equal={int(ok)}|json=0")
    return ok


def mode_windows(lines, out):
    """Where LAW_WINDOW_END / OP_WINDOW_END and the "extra" key occur, and what reads them."""
    src = "\n".join(lines)
    occ = {"LAW_WINDOW_END": [], "OP_WINDOW_END": []}
    for tok in tokenize.generate_tokens(io.StringIO(src).readline):
        if tok.type == tokenize.NAME and tok.string in occ:
            occ[tok.string].append(tok.start[0])
    tree = ast.parse(src)
    reads = {}
    extra_lines = sorted(
        {n.lineno for n in ast.walk(tree) if isinstance(n, ast.Constant) and n.value == "extra"}
    )
    now_calls = sorted(
        {
            n.lineno
            for n in ast.walk(tree)
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "now_iso"
        }
    )
    for fn in ("is_authorized", "evaluate_quorum"):
        node = next(n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == fn)
        names = {n.id for n in ast.walk(node) if isinstance(n, ast.Name)}
        consts = {n.value for n in ast.walk(node) if isinstance(n, ast.Constant)}
        reads[fn] = (
            int("LAW_WINDOW_END" in names),
            int("OP_WINDOW_END" in names),
            int("extra" in consts),
            int("now_iso" in names or "datetime" in names),
            f"{node.lineno}-{node.end_lineno}",
        )
    out.append(
        "WINDOWS|LAW_WINDOW_END_lines="
        + ",".join(map(str, occ["LAW_WINDOW_END"]))
        + "|OP_WINDOW_END_lines="
        + ",".join(map(str, occ["OP_WINDOW_END"]))
        + "|extra_key_lines="
        + ",".join(map(str, extra_lines))
        + "|now_iso_call_lines="
        + ",".join(map(str, now_calls))
        + "|json=0"
    )
    for fn, (law, op, extra, clock, span) in reads.items():
        out.append(
            f"READS|function={fn}|lines={span}|LAW_WINDOW_END={law}|OP_WINDOW_END={op}|extra={extra}|clock={clock}|json=0"
        )
    return True


def voter_pool(r, ns):
    q = sorted(ns["QUINTUPLE"])
    classes = sorted(ns["AUTHORIZED_CLASSES"])
    v = list(q)
    v += [m + "-2" for m in q] + [m.lower() for m in q] + ["AGT-" + m for m in q] + [m[:-1] for m in q]
    for c in classes:
        v += [c, c + "-7", "AGT-" + c, "AGT-" + c + "-x", c[:-1], "AGT-" + c[:-1], "AGT" + c, " " + c, c.lower(), "agt-" + c]
    v += ["", "AGT-", "AGT", "OPX", "O", "op", "guest-1", "X-OP", "\u00d3P", "OP\u2028", "Pro", "Asolaria", "Special"]
    v += [gen_str(r, SAFE_POOL, 8) for _ in range(40)]
    return v


def mode_auth(binary, ns, r, out):
    voters = voter_pool(r, ns)
    reqs, want = [], []
    for pool in ("quintuple", "authorized", "any"):
        for v in voters:
            reqs.append(f"AUTH|pool={pool}|voter={hexs(v)}")
            want.append(f"AUTH|ok={int(ns['is_authorized'](v, pool))}|json=0")
    rust = run_rust(binary, reqs)
    ok = rust == want
    n_ok = sum(1 for w in want if w.startswith("AUTH|ok=1"))
    out.append(
        f"CASES|mode=auth|cases={len(want)}|authorized={n_ok}|equal={int(ok)}|rust_sha256={sha256_lines(rust)}|json=0"
    )
    return ok


def mode_eval(binary, lines, r, out):
    stub = {"rows": []}
    ns = load_vote_quorum(lines, tmpdir("vq-eval-"), Clock())
    ns["votes_for"] = lambda vote_id: stub["rows"]  # evaluate_quorum line 128 reads it at call time
    classes = list(ns["QUORUM_RULES"]) + ["UNKNOWN", "", "law_change", "DEFAULT "]
    voters = voter_pool(r, ns)
    quint = sorted(ns["QUINTUPLE"])
    reqs, want = [], []
    tallies = {}
    for i in range(4000):
        cls = classes[i % len(classes)]
        n = r.randrange(0, 12) if r.randrange(4) else r.randrange(0, 41)
        rows = []
        if r.randrange(3) == 0:
            rows += [{"voter_pid": m, "vote": "YES"} for m in quint if r.randrange(6)]
        for _ in range(n):
            vote = r.choice(["YES", "YES", "NO", "ABSTAIN", "YES", "NO", "yes", "MAYBE", ""])
            rows.append({"voter_pid": r.choice(voters), "vote": vote})
        r.shuffle(rows)
        stub["rows"] = rows
        s = ns["evaluate_quorum"]("VOTE-x", cls)
        want.append(
            f"EVAL|rule={s['rule']}|pool={s['pool']}|yes={s['yes']}|no={s['no']}|abstain={s['abstain']}|total={s['total_decisive']}|outcome={s['outcome']}|json=0"
        )
        tallies[s["outcome"]] = tallies.get(s["outcome"], 0) + 1
        votes = ",".join(hexs(x["voter_pid"]) + ":" + hexs(x["vote"]) for x in rows)
        reqs.append(f"EVAL|class={hexs(cls)}|votes={votes}")
    rust = run_rust(binary, reqs)
    ok = rust == want
    t = ",".join(f"{k}:{tallies[k]}" for k in sorted(tallies))
    out.append(
        f"CASES|mode=eval|cases={len(want)}|outcomes={t}|equal={int(ok)}|rust_sha256={sha256_lines(rust)}|json=0"
    )
    return ok


def pair_function(lines):
    """bits of the vectors binary's PAIR/EXH rows, from upstream's own expression text. Bits 4-5
    and 6-7 hold the branch outcome as a balanced trit + 1 (reject -1, pending 0, pass +1)."""
    g = {n: condition(lines, n) for n in (149, 151, 157, 159)}
    guard = "total >= 3 and "
    b = {}
    for n, text in g.items():
        if not text.startswith(guard):
            sys.exit(f"line {n}: unexpected condition {text!r}")
        b[n] = text[len(guard) :]
    src = (
        f"lambda yes, no, total: (({b[149]}) | (({b[151]}) << 1) | (({b[157]}) << 2) | (({b[159]}) << 3)"
        f" | (((1 if {g[149]} else -1 if {g[151]} else 0) + 1) << 4)"
        f" | (((1 if {g[157]} else -1 if {g[159]} else 0) + 1) << 6))"
    )
    return eval(compile(src, str(VQ_PATH), "eval"), {"__builtins__": {}}), b


def mode_exhaustive(binary, lines, out, max_total):
    f, bare = pair_function(lines)
    rust = run_rust(binary, [f"EXH|max={max_total}"])
    want = []
    counts = [0, 0, 0, 0]
    for t in range(max_total + 1):
        bs = bytes(f(y, t - y, t) for y in range(t + 1))
        for x, n in Counter(bs).items():
            for i in range(4):
                counts[i] += n * ((x >> i) & 1)
        want.append(f"EXH|t={t}|sha256={hashlib.sha256(bs).hexdigest()}|json=0")
    equal_totals = sum(1 for a, b in zip(rust, want) if a == b)
    ok = rust == want
    pairs = (max_total + 1) * (max_total + 2) // 2
    out.append(
        f"EXHAUSTIVE|max_total={max_total}|pairs={pairs}|totals={len(want)}|equal_totals={equal_totals}|equal={int(ok)}"
        f"|true_149={counts[0]}|true_151={counts[1]}|true_157={counts[2]}|true_159={counts[3]}|json=0"
    )
    for n in (149, 151, 157, 159):
        out.append(f"EXPR|line={n}|python={bare[n]}|json=0")
    return ok


BIG_BANDS = [(3, 2**20), (2**20, 2**40), (2**40, 2**51), (2**51, 2**52), (2**52, 2**53), (2**53, 2**54), (2**54, 2**62)]


def mode_big(binary, lines, r, out):
    f, _ = pair_function(lines)
    ok_all = True
    for lo, hi in BIG_BANDS:
        reqs, want = [], []
        for _ in range(400):
            t = r.randrange(lo, hi)
            for base in (2 * t // 3, t // 2, t - t // 3, t - t // 2, t // 3):
                for d in (-2, -1, 0, 1, 2):
                    yes = base + d
                    if 0 <= yes <= t:
                        reqs.append(f"PAIR|yes={yes}|no={t - yes}")
                        want.append(f"PAIR|bits={f(yes, t - yes, t)}|json=0")
        rust = run_rust(binary, reqs)
        equal = sum(1 for a, b in zip(rust, want) if a == b)
        differ = len(want) - equal
        if hi <= 2**52 and differ:
            ok_all = False
        out.append(f"BIG|band={lo}..{hi}|pairs={len(want)}|equal={equal}|differ={differ}|json=0")
    # yes + no above u64::MAX: the Rust forms take the total in u128 (no wrap, no panic).
    for yes, no in ((2**64 - 1, 1), (2**64 - 1, 2**64 - 1)):
        got = fields(run_rust(binary, [f"PAIR|yes={yes}|no={no}"])[0])["bits"]
        up = f(yes, no, yes + no)
        out.append(f"BIG_EDGE|yes={yes}|no={no}|upstream_bits={up}|rust_bits={got}|equal={int(str(up) == got)}|json=0")
    return ok_all


def mode_idem(binary, lines, r, out):
    d = tmpdir("vq-idem-")
    ns = load_vote_quorum(lines, d, Clock())
    cond = condition(lines, 247)
    code = compile(cond, str(VQ_PATH), "eval")
    outcomes = ["PASS-UNANIMOUS", "PASS-MAJORITY", "PASS-SUPERMAJORITY", "PASS-AUTO", "REJECT", "PENDING"]
    reqs, want = [], []
    for i in range(600):
        ids = [f"VOTE-{r.getrandbits(64):016x}" for _ in range(r.randrange(0, 6))]
        k = r.randrange(4)
        if k == 0 and ids:
            vid = r.choice(ids)
        elif k == 1 and ids:
            vid = r.choice(ids)[:-1]
        elif k == 2 and ids:
            vid = r.choice(ids).upper()
        else:
            vid = f"VOTE-{r.getrandbits(64):016x}"
        with open(ns["OUTCOMES"], "w", encoding="utf-8") as fh:
            for x in ids:
                fh.write(json.dumps({"vote_id": x, "outcome": "REJECT"}, ensure_ascii=False) + "\n")
        o = outcomes[i % len(outcomes)]
        exists = ns["outcome_exists"](vid)
        due = eval(code, ns, {"status": {"outcome": o}, "body": {"vote_id": vid}})
        want.append(f"IDEM|exists={int(exists)}|due={int(bool(due))}|json=0")
        reqs.append(f"IDEM|vote={hexs(vid)}|outcome={o}|existing={','.join(hexs(x) for x in ids)}")
    rust = run_rust(binary, reqs)
    ok = rust == want
    out.append(
        f"CASES|mode=idem|cases={len(want)}|due={sum(1 for w in want if 'due=1' in w)}|equal={int(ok)}|line_247={cond}|json=0"
    )
    return ok


def make_probe(ns):
    base = ns["Handler"]

    class Probe(base):
        """Upstream Handler without a socket: `_send` (lines 167-176) records the reply."""

        def __init__(self, path, body):
            raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.path = path
            self.headers = {"Content-Length": str(len(raw))}
            self.rfile = io.BytesIO(raw)
            self.reply = None

        def _send(self, code, body):
            self.reply = (code, body)

    def post(path, body):
        p = Probe(path, body)
        p.do_POST()
        return p.reply

    return post


def outcome_rows_for(ns, vid):
    p = ns["OUTCOMES"]
    if not p.exists():
        return 0
    n = 0
    for line in p.read_text(encoding="utf-8").split("\n"):
        if line.strip():
            if json.loads(line).get("vote_id") == vid:
                n += 1
    return n


def mode_flow(binary, lines, r, out):
    clock = Clock(real_datetime(2026, 10, 17, tzinfo=timezone.utc), tick_us=1000)
    reqs, want = [], []
    ns = None
    counts = {"casts": 0, "409": 0, "outcome_rows": 0}
    for scen in range(500):
        if scen % 10 == 0:
            ns = load_vote_quorum(lines, tmpdir("vq-flow-"), clock)
            post = make_probe(ns)
            voters = [v for v in voter_pool(r, ns) if not any(c in v for c in SPLITTERS)]
        cls = r.choice(list(ns["QUORUM_RULES"]) + ["UNKNOWN"])
        code, body = post(
            "/api/vote-quorum/submit",
            {
                "decision_class": cls,
                "decision_pid": f"DEC-{scen}-{gen_str(r, SAFE_POOL, 6)}",
                "requester_pid": "REQ-" + str(scen),
                "payload": {"note": gen_str(r, SAFE_POOL, 8), "n": r.randrange(100)},
            },
        )
        assert code == 200, (code, body)
        vid = body["vote_id"]
        reqs.append(f"FLOWNEW|class={hexs(cls)}|vote={hexs(vid)}")
        quint = sorted(ns["QUINTUPLE"])
        seq = []
        if r.randrange(3) == 0:
            seq += [(m, "YES") for m in quint]
        for _ in range(r.randrange(1, 12)):
            seq.append((r.choice(voters + quint), r.choice(["YES", "YES", "NO", "ABSTAIN"])))
        r.shuffle(seq)
        for voter, vote in seq:
            before = outcome_rows_for(ns, vid)
            code, body = post(
                "/api/vote-quorum/cast",
                {"vote_id": vid, "voter_pid": voter, "vote": vote, "reason": gen_str(r, SAFE_POOL, 10)},
            )
            reqs.append(f"FLOWCAST|voter={hexs(voter)}|vote={vote}")
            counts["casts"] += 1
            if code == 409:
                counts["409"] += 1
                want.append("FLOW|code=409|json=0")
                continue
            assert code == 200, (code, body)
            s = body["status"]
            row = outcome_rows_for(ns, vid) - before
            counts["outcome_rows"] += row
            want.append(
                f"FLOW|code=200|rule={s['rule']}|pool={s['pool']}|yes={s['yes']}|no={s['no']}|abstain={s['abstain']}"
                f"|total={s['total_decisive']}|outcome={s['outcome']}|outcome_row={row}|json=0"
            )
    rust = run_rust(binary, reqs)
    ok = rust == want
    out.append(
        f"CASES|mode=flow|votes=500|casts={counts['casts']}|answered_409={counts['409']}|outcome_rows={counts['outcome_rows']}"
        f"|equal={int(ok)}|rust_sha256={sha256_lines(rust)}|json=0"
    )
    return ok


def mode_splitlines(lines, out):
    """Upstream only: cast rows whose `reason` holds a str.splitlines boundary that
    json.dumps(ensure_ascii=False) writes raw (lines 86, 100)."""
    for ch in ("\x85", "\u2028", "\u2029"):
        ns = load_vote_quorum(lines, tmpdir("vq-split-"), Clock(tick_us=1000))
        post = make_probe(ns)
        _, body = post("/api/vote-quorum/submit", {"decision_class": "DAEMON_OP", "decision_pid": "D", "requester_pid": "R"})
        vid = body["vote_id"]
        c1, _ = post("/api/vote-quorum/cast", {"vote_id": vid, "voter_pid": "OP-A", "vote": "YES", "reason": "a" + ch + "b"})
        c2, b2 = post("/api/vote-quorum/cast", {"vote_id": vid, "voter_pid": "OP-A", "vote": "YES", "reason": "plain"})
        written = len([x for x in ns["VOTES"].read_bytes().split(b"\n") if x])
        read = len(ns["votes_for"](vid))
        out.append(
            f"SPLITLINES|char=U+{ord(ch):04X}|first_cast={c1}|second_cast_same_voter={c2}|rows_written={written}"
            f"|rows_read_by_votes_for={read}|yes_after_second={b2['status']['yes']}|json=0"
        )
    ns = load_vote_quorum(lines, tmpdir("vq-tail-"), Clock(tick_us=1000))
    post = make_probe(ns)
    post("/api/vote-quorum/submit", {"decision_class": "DAEMON_OP", "decision_pid": "D1", "requester_pid": "R", "payload": {"blob": "x" * 3000}})
    post("/api/vote-quorum/submit", {"decision_class": "DAEMON_OP", "decision_pid": "D2", "requester_pid": "R"})
    rows = [json.loads(x) for x in ns["QUEUE"].read_text(encoding="utf-8").split("\n") if x]
    out.append(
        f"TAIL2048|prev_row_bytes={len(json.dumps(rows[0], ensure_ascii=False).encode('utf-8'))}"
        f"|next_antecedents_is_genesis={int(rows[1]['antecedents'] == '0000000000000000')}|json=0"
    )
    return True


# ---------------------------------------------------------------- cosign-chain modes


def mode_iso(binary, lines, r, out):
    clock = Clock()
    ns = load_cosign(lines, os.path.join(tmpdir("cc-iso-"), "c.ndjson"), clock)
    secs = [0, 59, 60, 86399, 86400, 951782400, 951868800, 4107542399, 4107542400, 253402300799]
    secs += [r.randrange(0, 253402300800) for _ in range(3000)]
    reqs, want = [], []
    for s in secs:
        clock.instant = EPOCH + timedelta(seconds=s)
        want.append(f"ISO|ts={ns['now_iso']()}|json=0")
        reqs.append(f"ISO|secs={s}")
    rust = run_rust(binary, reqs)
    ok = rust == want
    out.append(f"CASES|mode=iso|cases={len(want)}|equal={int(ok)}|rust_sha256={sha256_lines(rust)}|json=0")
    return ok


def mode_dumps(binary, lines, r, out):
    ns = load_cosign(lines, os.path.join(tmpdir("cc-dumps-"), "c.ndjson"), Clock())
    reqs, want = [], []
    cover = {"control": 0, "quote": 0, "backslash": 0, "del": 0, "nonascii_bmp": 0, "astral": 0, "u2028": 0, "nonascii_key": 0, "nested_obj": 0}
    for i in range(3000):
        v = gen_obj(r) if i % 2 == 0 else gen_value(r)
        text = json.dumps(v, sort_keys=True, ensure_ascii=False)
        want.append(f"DUMPS|hex={hexs(text)}|sha16={ns['sha16'](text)}|json=0")
        reqs.append(f"DUMPS|v={encode(v)}")
        chars = set("".join(strings_of(v)))
        cover["control"] += any(ord(c) < 0x20 for c in chars)
        cover["quote"] += '"' in chars
        cover["backslash"] += "\\" in chars
        cover["del"] += "\x7f" in chars
        cover["nonascii_bmp"] += any(0x80 <= ord(c) <= 0xFFFF for c in chars)
        cover["astral"] += any(ord(c) > 0xFFFF for c in chars)
        cover["u2028"] += "\u2028" in chars
        cover["nonascii_key"] += any(any(ord(c) > 0x7F for c in k) for k in walk_keys(v))
        cover["nested_obj"] += any(isinstance(x, dict) for x in values_of(v) if x is not v)
    rust = run_rust(binary, reqs)
    ok = rust == want
    c = "|".join(f"with_{k}={cover[k]}" for k in cover)
    out.append(f"CASES|mode=dumps|values={len(want)}|{c}|equal={int(ok)}|rust_sha256={sha256_lines(rust)}|json=0")
    return ok


HIST_KINDS = [
    "int_seq", "int_seq", "int_seq", "int_seq", "int_seq", "int_seq_no_row_hash", "int_seq_nonstring_row_hash",
    "seq_str_bool_null", "seq_float_token", "no_seq", "not_an_object_or_invalid", "trailing_invalid_utf8",
    "seq_leading_zero_token", "nan_token",
]


def hist_line(r):
    """One historic chain line (bytes) of a seeded kind: (kind, bytes)."""
    k = r.randrange(14)
    return HIST_KINDS[k], hist_bytes(r, k)


def hist_bytes(r, k):
    h = f"{r.getrandbits(64):016x}"
    seq = r.choice([r.randrange(-3, 40), r.randrange(0, 12), r.choice([0, 1, 2**100, -(2**100)])])
    if r.randrange(40) == 0:
        seq = r.choice([I128_MAX - 1, I128_MAX])  # the i128 boundary of the Rust seq
    if k <= 4:
        return json.dumps({"seq": seq, "event": gen_str(r, SAFE_POOL, 5), "row_hash": h}, ensure_ascii=False).encode()
    if k == 5:
        return json.dumps({"seq": seq, "event": "no-hash"}).encode()
    if k == 6:
        return json.dumps({"seq": seq, "row_hash": r.choice([7, ["a", h], {"x": h}, ""])}).encode()
    if k == 7:
        return json.dumps({"seq": r.choice([str(seq), True, False, None]), "row_hash": h}).encode()
    if k == 8:
        return ('{"seq": %d.0, "row_hash": "%s"}' % (seq, h)).encode()
    if k == 9:
        return json.dumps({"event": "no-seq", "row_hash": h}).encode()
    if k == 10:
        return r.choice([b"[1, 2]", b'"text"', b"5", b"{bad", b"", b"   "])
    if k == 11:
        return ('{"seq": %d, "row_hash": "%s"}' % (seq, h)).encode() + b"\xff"
    if k == 12:
        return ('{"seq": 0%d, "row_hash": "%s"}' % (abs(seq) % 9 + 1, h)).encode()
    return ('{"seq": %d, "row_hash": "%s", "n": NaN}' % (seq, h)).encode()


def hist_view(raw):
    """What lines 44-52 see in one line: (isinstance-int seq or None, row_hash or None), or None
    when the line raises inside the try (skipped)."""
    text = raw.decode("utf-8", errors="ignore")
    try:
        d = json.loads(text)
        s = d.get("seq")
    except Exception:
        return None
    seq = int(s) if isinstance(s, int) else None
    return (seq, d["row_hash"] if "row_hash" in d else None)


def confusables(prev):
    """Values set beside the head value `prev` for the line-64 test `prev_hash not in antecedents`:
    the decimal text of an int, the int of a decimal string, a dict in reversed key order, a dict
    with its last value as JSON text, a list's last element, the list reversed, and `prev` in a list."""
    out = [[prev]]
    if isinstance(prev, int) and not isinstance(prev, bool):
        out.append(str(prev))
    if isinstance(prev, str) and prev.isascii() and prev.isdigit():
        out.append(int(prev))
    if isinstance(prev, dict) and prev:
        out.append(dict(reversed(list(prev.items()))))
        k = list(prev)[-1]
        out.append({**prev, k: json.dumps(prev[k], ensure_ascii=False)})
    if isinstance(prev, list) and prev:
        out.append(prev[-1])
        out.append(list(reversed(prev)))
    return out


def gen_payload(r, prev):
    """A payload for an append whose chain head row_hash is `prev` (any shape)."""
    p = gen_obj(r)
    extras = []
    if r.randrange(3) == 0:
        c = r.choice(confusables(prev))
        extras.append(("antecedents", r.choice([
            [prev], [gen_str(r, SAFE_POOL, 4)], [], ["x", prev], [prev, prev], [7, {"k": "v"}],
            "not-a-list", 5, {"a": prev}, [[prev]], [c], ["x", c],
        ])))
    if r.randrange(4) == 0:
        extras.append(("seq", r.choice([0, 999, "nine", [1]])))
    if r.randrange(4) == 0:
        extras.append(("row_hash", r.choice(["client-hash", 1, ["x"]])))
    if r.randrange(4) == 0:
        extras.append(("ts", gen_str(r, SAFE_POOL, 8)))
    if r.randrange(5) == 0:
        extras.append(("appended_by_daemon", r.choice(["CLIENT", "", 3])))
    for k, v in extras:
        if r.randrange(2) == 0:
            p = {k: v, **{a: b for a, b in p.items() if a != k}}
        else:
            p[k] = v
    return p


def chain_scenario(lines, clock, keep_dir, hist, n_appends, next_append, reqs, want, stats):
    """One chain file: the historic lines `hist` (bytes), then `n_appends` appends through the
    exec'd lines 55-74; `next_append(head_hash)` gives (secs, payload). Returns the file path."""
    d = tempfile.mkdtemp(prefix="cc-chain-", dir=keep_dir)
    path = os.path.join(d, "COSIGN_CHAIN.ndjson")
    ns = load_cosign(lines, path, clock)
    captured = []
    real_sha16 = ns["sha16"]

    def sha16_probe(s, _real=real_sha16, _cap=captured):
        _cap.append(s)
        return _real(s)

    ns["sha16"] = sha16_probe  # append_row line 71 calls sha16(base): record base
    with open(path, "wb") as fh:
        for raw in hist:
            fh.write(raw + b"\n")
    reqs.append("CHAIN")
    stats["scenarios"] += 1
    for raw in hist:
        stats["hist_lines"] += 1
        v = hist_view(raw)
        if v is None:
            stats["hist_skipped"] += 1
            continue
        seq, rh = v
        reqs.append(
            f"HIST|seq={'-' if seq is None else seq}|hash={'-' if rh is None else encode(rh)}"
        )
    for _ in range(n_appends):
        head_seq, head_hash = ns["chain_head"]()
        secs, payload = next_append(head_hash)
        clock.instant = EPOCH + timedelta(seconds=secs)
        captured.clear()
        seq, rh, prev = ns["append_row"](payload)
        reqs.append(f"APPEND|secs={secs}|payload={encode(payload)}")
        stats["appends"] += 1
        ants = payload.get("antecedents")
        if not isinstance(head_hash, str):
            stats["head_not_str"] += 1
        if isinstance(ants, list) and any(
            type(a) is type(c) and a == c for a in ants for c in confusables(head_hash)
        ):
            stats["antecedents_with_head_variant"] += 1
        if seq > I128_MAX:
            # Line 59 gives 2^127; the Rust seq is i128, so that row stays in the cold lane.
            want.append(f"APPEND_COLD|head_seq={head_seq}|json=0")
            stats["cold_appends"] += 1
            break
        last = Path(path).read_bytes().split(b"\n")[-2].decode("utf-8")
        row = json.loads(last)
        want.append(
            f"APPENDED|seq={seq}|prev={encode(prev)}|row_hash={rh}|pre_hex={hexs(captured[0])}|row={encode(row)}|json=0"
        )
    return path


# Head row_hash values for the line-64 membership edges (the hist-kind-6 shapes and their kin).
EDGE_HEADS = [7, "7", 0, "0000000000000000", {"x": "h", "y": 1}, ["a", "h"], "h", ""]


def mode_chain(binary, lines, r, out, keep_dir):
    clock = Clock()
    reqs, want = [], []
    stats = dict.fromkeys(
        ["scenarios", "hist_lines", "hist_skipped", "appends", "head_not_str", "antecedents_with_head_variant", "cold_appends"], 0
    )
    files = []
    # Fixed edges: each head value against each antecedents list built from it, then the i128 seq boundary.
    for head in EDGE_HEADS:
        for c in [head] + confusables(head):
            for ants in ([c], ["x", c]):
                hist = [json.dumps({"seq": 3, "row_hash": head}).encode()]
                files.append(chain_scenario(
                    lines, clock, keep_dir, hist, 1, lambda _h, a=ants: (1800000000, {"e": 1, "antecedents": a}),
                    reqs, want, stats,
                ))
    for top in (I128_MAX - 1, I128_MAX):
        hist = [json.dumps({"seq": top, "row_hash": "aa"}).encode()]
        files.append(chain_scenario(lines, clock, keep_dir, hist, 2, lambda _h: (1800000000, {"e": 1}), reqs, want, stats))
    edges = stats["scenarios"]
    for scen in range(400):
        hist = [hist_line(r)[1] for _ in range(r.randrange(0, 8))]
        files.append(chain_scenario(
            lines, clock, keep_dir, hist, r.randrange(1, 5),
            lambda head_hash: (r.randrange(1700000000, 1900000000), gen_payload(r, head_hash)),
            reqs, want, stats,
        ))
    rust = run_rust(binary, reqs)
    ok = rust == want
    out.append(
        f"CASES|mode=chain|scenarios={stats['scenarios']}|edge_scenarios={edges}|historic_lines={stats['hist_lines']}"
        f"|historic_skipped_by_lines_46_52={stats['hist_skipped']}|appends={stats['appends']}"
        f"|head_not_str={stats['head_not_str']}|antecedents_with_head_variant={stats['antecedents_with_head_variant']}"
        f"|cold_appends_seq_2^127={stats['cold_appends']}|equal={int(ok)}|rust_sha256={sha256_lines(rust)}|json=0"
    )
    return ok, files


def mode_verify_tool(files, out):
    tool = HERE / "verify_chain.py"
    totals = {}
    for f in files:
        p = subprocess.run([sys.executable, "-I", str(tool), f], capture_output=True, check=True)
        for row in p.stdout.decode("utf-8").splitlines():
            if row.startswith("VERIFY|"):
                for k, v in fields(row).items():
                    if k in ("json", "head_seq", "head_row_hash"):
                        continue
                    totals[k] = totals.get(k, 0) + int(v)
    keys = [
        "rows", "parsed", "with_row_hash", "hash_equal", "hash_differs", "daemon_rows", "daemon_hash_equal",
        "daemon_seq_follows_head", "daemon_antecedents_list", "daemon_head_in_antecedents",
        "daemon_rows_hot_lane_shapes",
    ]
    t = {k: totals.get(k, 0) for k in keys}
    ok = (
        t["daemon_rows"] > 0
        and t["daemon_rows"] == t["daemon_hash_equal"] == t["daemon_seq_follows_head"]
        and t["daemon_antecedents_list"] == t["daemon_head_in_antecedents"]
    )
    out.append("VERIFY_TOOL|chains=" + str(len(files)) + "|" + "|".join(f"{k}={totals.get(k, 0)}" for k in keys) + f"|ok={int(ok)}|json=0")
    return ok


# ---------------------------------------------------------------- federation-1024 comparison


def _h(seq, h, extra=""):
    return ('{"seq": %s, "row_hash": "%s"%s}' % (seq, h, extra)).encode()


FED_HEAD_CASES = [
    ("ascending", [_h(1, "a1"), _h(2, "a2"), _h(3, "a3")]),
    ("out_of_order_duplicate_max", [_h(3, "b1"), _h(1, "b2"), _h(3, "b3"), _h(2, "b4")]),
    ("max_row_without_row_hash", [_h(1, "c1"), b'{"seq": 4}']),
    ("max_row_row_hash_integer", [_h(1, "d1"), b'{"seq": 4, "row_hash": 7}']),
    ("max_row_row_hash_list", [_h(1, "e1"), b'{"seq": 4, "row_hash": ["x"]}']),
    ("seq_true_only", [b'{"seq": true, "row_hash": "f1"}']),
    ("seq_string", [_h(1, "g1"), b'{"seq": "9", "row_hash": "g2"}']),
    ("seq_token_9.0", [_h(1, "h1"), b'{"seq": 9.0, "row_hash": "h2"}']),
    ("seq_token_1e1", [_h(1, "i1"), b'{"seq": 1e1, "row_hash": "i2"}']),
    ("seq_token_09", [_h(1, "j1"), b'{"seq": 09, "row_hash": "j2"}']),
    ("nan_in_other_field", [_h(1, "k1"), b'{"seq": 9, "row_hash": "k2", "x": NaN}']),
    ("invalid_utf8_byte_in_a_row", [_h(1, "l1"), _h(9, "l2") + b"\xff"]),
    ("seq_above_u64", [_h(1, "m1"), _h(2**70, "m2")]),
    ("negative_seq_only", [_h(-5, "n1")]),
    ("array_line", [_h(1, "o1"), b'[{"seq": 9}]']),
    ("blank_and_whitespace_lines", [_h(1, "p1"), b"", b"   "]),
    ("crlf_line_endings", [_h(1, "q1") + b"\r", _h(2, "q2") + b"\r"]),
    ("lone_cr_between_rows", [_h(1, "r1") + b"\r" + _h(5, "r2")]),
    ("duplicate_seq_key", [b'{"seq": 9, "seq": 2, "row_hash": "s1"}']),
    ("u2028_in_a_value", [_h(1, "t1"), _h(2, "t2", ', "v": "a\u2028b"')]),
    ("bom_before_first_row", [b"\xef\xbb\xbf" + _h(1, "u1")]),
    ("row_hash_written_escaped", [b'{"seq": 9, "row_hash": "\\u0061bc"}']),
]

FED_APPEND_CASES = [
    ("no_antecedents", '{"e": 1}'),
    ("antecedents_list_without_prev", '{"e": 1, "antecedents": ["x"]}'),
    ("antecedents_list_with_prev", '{"e": 1, "antecedents": ["0000000000000000"]}'),
    ("antecedents_prev_escaped_in_body", '{"e": 1, "antecedents": ["\\u0030000000000000000"]}'),
    ("antecedents_string", '{"e": 1, "antecedents": "x"}'),
    ("antecedents_null", '{"e": 1, "antecedents": null}'),
    ("payload_seq_first", '{"seq": 99, "e": 1}'),
    ("payload_row_hash_first", '{"row_hash": "x", "e": 1}'),
    ("payload_ts", '{"e": 1, "ts": "T"}'),
    ("payload_appended_by_daemon", '{"e": 1, "appended_by_daemon": "C"}'),
    ("nonascii_value_raw", '{"e": "ol\u00e1"}'),
    ("nonascii_value_escaped_in_body", '{"e": "ol\\u00e1"}'),
    ("nonascii_key", '{"\u00e1": 1}'),
    ("u007f_value_escaped_in_body", '{"e": "\\u007f"}'),
    ("float_token", '{"e": 1.0}'),
    ("solidus_escape", '{"e": "a\\/b"}'),
    ("bool_and_null_values", '{"e": true, "f": null}'),
    ("nested_object_key_order", '{"o": {"b": 2, "a": 1}}'),
    ("empty_object", "{}"),
]


def fed_run(fed_binary, args):
    p = subprocess.run([fed_binary] + args, capture_output=True, check=False)
    return p.returncode, [fields(x) for x in p.stdout.decode("utf-8").splitlines()]


def mode_fed(fed_binary, lines, r, out):
    """ledger/cosign-council `cosign-council-vectors` (federation-1024 cosign-ledger py_parity and
    cosign-serve, Rust) against the exec'd upstream lines, on the same inputs."""
    now = "2026-06-25T00:00:00.000Z"
    instant = real_datetime(2026, 6, 25, tzinfo=timezone.utc)
    d = tmpdir("fed-")
    styles = {
        "dumps_default": lambda p: json.dumps(p),
        "dumps_ensure_ascii_false": lambda p: json.dumps(p, ensure_ascii=False),
        "dumps_compact": lambda p: json.dumps(p, separators=(",", ":")),
    }
    payloads = [gen_obj(r) if i % 5 else {"event": "ascii-only", "n": i} for i in range(300)]
    token_bodies = ['{"n": 1.0}', '{"n": 1e2}', '{"n": -0}', '{"n": 0.5}', '{"s": "a\\/b"}', '{"s": "\\u0041"}', '{"s": "ol\\u00e1"}', '{"s": "x\\u007f"}']
    cases = [(style, [dump(p) for p in payloads]) for style, dump in styles.items()] + [("number_and_escape_tokens", token_bodies)]
    pl = os.path.join(d, "one.ndjson")
    chain = os.path.join(d, "COSIGN_CHAIN.ndjson")
    for style, bodies in cases:
        equal, classes, n = 0, {}, 0
        for body in bodies:
            with open(pl, "w", encoding="utf-8") as fh:
                fh.write(body + "\n")
            _, rows = fed_run(fed_binary, ["cosign", pl, now, os.path.join(d, "persisted.ndjson")])
            if rows[0].get("parse") != "ok":
                classes["fed_parse_err"] = classes.get("fed_parse_err", 0) + 1
                continue
            n += 1
            open(chain, "w").close()
            ns = load_cosign(lines, chain, Clock(instant))
            obj = json.loads(body)
            seq, rh, prev = ns["append_row"](obj)
            same = (str(seq), rh, prev) == (rows[0]["seq"], rows[0]["row_hash"], rows[0]["antecedent_prev"])
            equal += same
            if not same:
                cls = []
                if any(any(ord(c) > 0x7F for c in k) for k in walk_keys(obj)):
                    cls.append("nonascii_key")
                if body not in (json.dumps(obj, ensure_ascii=False), json.dumps(obj, ensure_ascii=False, separators=(",", ":"))):
                    cls.append("body_tokens_differ_from_dumps_ensure_ascii_false")
                key = "+".join(cls) or "other"
                classes[key] = classes.get(key, 0) + 1
        c = ",".join(f"{k}:{classes[k]}" for k in sorted(classes)) or "-"
        out.append(f"FED_APPEND|bodies={style}|rows={n}|row_from_genesis_equal={equal}|differ_by_class={c}|json=0")
    # Seq assignment along one chain of 300 appends.
    with open(pl, "w", encoding="utf-8") as fh:
        fh.write("\n".join(json.dumps(p, ensure_ascii=False) for p in payloads) + "\n")
    _, rows = fed_run(fed_binary, ["cosign", pl, now, os.path.join(d, "persisted.ndjson")])
    open(chain, "w").close()
    ns = load_cosign(lines, chain, Clock(instant))
    seqs = [str(ns["append_row"](p)[0]) for p in payloads]
    out.append(f"FED_SEQ|appends={len(seqs)}|seq_equal={sum(1 for a, b in zip(seqs, rows) if a == b.get('seq'))}|json=0")
    # The daemon-written chain (line 73) recomputed by the federation canons.
    shadow = os.path.join(d, "shadow.ndjson")
    open(shadow, "w").close()
    _, rep_rows = fed_run(fed_binary, ["replay", chain, shadow])
    rep_rows = [x for x in rep_rows if "recompute" in x]
    stored = [json.loads(x) for x in Path(chain).read_text(encoding="utf-8").split("\n") if x]
    for canon, key in (("py_parity", "recompute"), ("vote_canon", "vq_recompute")):
        equal, classes = 0, {}
        for f, row in zip(rep_rows, stored):
            if f.get(key) == row["row_hash"]:
                equal += 1
                continue
            keys = list(walk_keys(row))
            cls = []
            if any(any(ord(c) > 0x7F for c in k) for k in keys):
                cls.append("nonascii_key")
            if any(any(ord(c) < 0x20 or c in '"\\' for c in k) for k in keys):
                cls.append("key_written_with_escape")
            key2 = "+".join(cls) or "other"
            classes[key2] = classes.get(key2, 0) + 1
        c = ",".join(f"{k}:{classes[k]}" for k in sorted(classes)) or "-"
        out.append(f"FED_REPLAY|canon={canon}|daemon_rows={len(stored)}|recompute_equal={equal}|differ_by_class={c}|json=0")
    # Seq assignment and head: upstream chain_head (34-53) vs cosign-serve /api/cosign/head
    # (resume.rs fold_seq_max over the ledger), one small chain per case.
    for name, rows in FED_HEAD_CASES:
        with open(chain, "wb") as fh:
            fh.write(b"\n".join(rows) + b"\n")
        open(shadow, "w").close()
        ns = load_cosign(lines, chain, Clock())
        up_seq, up_hash = ns["chain_head"]()
        _, fr = fed_run(fed_binary, ["replay", chain, shadow])
        head = next(x for x in fr if x.get("path") == "/api/cosign/head")
        got = json.loads(bytes.fromhex(head["body_hex"]).decode("utf-8"))
        same = got["seq"] == up_seq and type(up_seq) is int and got["row_hash"] == up_hash
        out.append(
            f"FED_HEAD|case={name}|upstream_seq={up_seq!r}|upstream_hash_type={type(up_hash).__name__}"
            f"|fed_seq={got['seq']}|head_equal={int(same)}|json=0"
        )
    # Append semantics case by case, from an empty chain, same request body on both sides.
    persisted = os.path.join(d, "persisted.ndjson")
    for name, body in FED_APPEND_CASES:
        with open(pl, "w", encoding="utf-8") as fh:
            fh.write(body + "\n")
        _, fr = fed_run(fed_binary, ["cosign", pl, now, persisted])
        open(chain, "w").close()
        ns = load_cosign(lines, chain, Clock(instant))
        seq, rh, prev = ns["append_row"](json.loads(body))
        up_line = Path(chain).read_text(encoding="utf-8").split("\n")[0]
        fed_line = Path(persisted).read_text(encoding="utf-8").split("\n")[0]
        up_row, fed_row = json.loads(up_line), json.loads(fed_line)
        out.append(
            f"FED_APPEND_CASE|case={name}|seq_equal={int(str(seq) == fr[0]['seq'])}"
            f"|antecedents_equal={int(up_row.get('antecedents') == fed_row.get('antecedents'))}"
            f"|row_hash_equal={int(rh == fr[0]['row_hash'])}|key_order_equal={int(list(up_row) == list(fed_row))}"
            f"|line_bytes_equal={int(up_line == fed_line)}|json=0"
        )
    # Fixture of federation-1024 servers/cosign-serve: append its two payloads with the upstream lines.
    fx = ROOT.parent / "cosign-council" / "cosign-serve" / "fixtures" / "daemon-row-hash.ndjson"
    if fx.exists():
        ns = load_cosign(lines, os.path.join(tmpdir("fed-fx-"), "c.ndjson"), Clock())
        got = []
        for line in fx.read_text(encoding="utf-8").split("\n"):
            if line:
                row = json.loads(line)
                stored_hash = row.pop("row_hash")
                row.pop("seq")
                got.append(f"{stored_hash}:{ns['append_row'](row)[1]}")
        out.append(f"FED_FIXTURE|stored_vs_upstream_append={','.join(got)}|json=0")
    return True


def strings_of(v):
    if isinstance(v, str):
        yield v
    elif isinstance(v, dict):
        for k, x in v.items():
            yield k
            yield from strings_of(x)
    elif isinstance(v, list):
        for x in v:
            yield from strings_of(x)


def values_of(v):
    yield v
    if isinstance(v, dict):
        for x in v.values():
            yield from values_of(x)
    elif isinstance(v, list):
        for x in v:
            yield from values_of(x)


def walk_keys(v):
    if isinstance(v, dict):
        for k, x in v.items():
            yield k
            yield from walk_keys(x)
    elif isinstance(v, list):
        for x in v:
            yield from walk_keys(x)


# ---------------------------------------------------------------- main


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vectors", required=True)
    ap.add_argument("--fed-vectors")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--check", action="store_true")
    g.add_argument("--write", action="store_true")
    g.add_argument("--compare-only", action="store_true")
    ap.add_argument("--exhaustive-max", type=int, default=EXHAUSTIVE_MAX)
    a = ap.parse_args()
    if a.exhaustive_max < EXHAUSTIVE_MAX and (a.check or a.write):
        sys.exit("--exhaustive-max below 10000 is for local runs; the receipt pins 10000")

    global TMP_ROOT
    with tempfile.TemporaryDirectory(prefix="hyperbehcs-referee-") as root:
        TMP_ROOT = root
        run(a)


def lane_head(path, ls, ranges):
    rs = ",".join(f"{x}-{y}" for x, y in ranges)
    hs = ",".join(hashlib.sha256(range_text(ls, x, y).encode("utf-8")).hexdigest()[:16] for x, y in ranges)
    daemon = path.name.removeprefix("asolaria-").removesuffix("-daemon.py")
    return [
        f"REFEREE|dir=ledger/hyperbehcs-daemons|upstream=ACER C:/HyperBEHCS/bin 2026-10-17|daemon={daemon}|seed={SEED}|lane=cold|json=0",
        f"UPSTREAM|file={path.name}|sha256={PINNED[path.name]}|newlines={len(ls) - 1}|exec_ranges={rs}|range_sha16={hs}|json=0",
    ]


def run(a):
    ok = True
    vq_text = None
    if not VQ_PATH.exists():
        sys.stdout.write(
            f"HELD|file={VQ_PATH.name}|sha256={PINNED[VQ_PATH.name]}|vote_quorum_lane_run=0"
            "|reason=owner_privacy_clearance_PROVENANCE.md|json=0\n"
        )
    else:
        vq = upstream_lines(VQ_PATH)
        vq_out = lane_head(VQ_PATH, vq, VQ_RANGES)
        r = random.Random(SEED)
        v_ok = True
        ns_vq = load_vote_quorum(vq, tmpdir("vq-rules-"), Clock())
        v_ok &= mode_rules(a.vectors, ns_vq, vq_out)
        v_ok &= mode_windows(vq, vq_out)
        v_ok &= mode_auth(a.vectors, ns_vq, r, vq_out)
        v_ok &= mode_eval(a.vectors, vq, r, vq_out)
        v_ok &= mode_exhaustive(a.vectors, vq, vq_out, a.exhaustive_max)
        v_ok &= mode_big(a.vectors, vq, r, vq_out)
        v_ok &= mode_idem(a.vectors, vq, r, vq_out)
        v_ok &= mode_flow(a.vectors, vq, r, vq_out)
        v_ok &= mode_splitlines(vq, vq_out)
        vq_out.append(f"RESULT|rust_equals_upstream={int(v_ok)}|json=0")
        vq_text = "\n".join(vq_out) + "\n"
        sys.stdout.write(vq_text)
        ok &= v_ok

    cc = upstream_lines(CC_PATH)
    out = lane_head(CC_PATH, cc, CC_RANGES)
    r = random.Random(SEED)
    c_ok = True
    c_ok &= mode_iso(a.vectors, cc, r, out)
    c_ok &= mode_dumps(a.vectors, cc, r, out)
    chain_ok, files = mode_chain(a.vectors, cc, r, out, tmpdir("cc-chains-"))
    c_ok &= chain_ok
    c_ok &= mode_verify_tool(files, out)
    out.append(f"RESULT|rust_equals_upstream={int(c_ok)}|json=0")
    ok &= c_ok
    text = "\n".join(out) + "\n"
    sys.stdout.write(text)

    fed_text = None
    if a.fed_vectors:
        fed_out = [f"FED_COMPARE|against=ledger/cosign-council cosign-council-vectors (federation-1024@dc1da1a9 py_parity)|seed={SEED}|json=0"]
        mode_fed(a.fed_vectors, cc, random.Random(SEED + 1), fed_out)
        fed_text = "\n".join(fed_out) + "\n"
        sys.stdout.write(fed_text)

    if not ok:
        sys.exit("FAIL: the Rust answers differ from the upstream lines (see equal=0 rows)")
    if a.compare_only:
        print("PASS (compare only; receipt not compared)")
        return
    if a.write:
        RECEIPT.write_text(text, encoding="utf-8")
        if vq_text is not None:
            VQ_RECEIPT.write_text(vq_text, encoding="utf-8")
        if fed_text is not None:
            FED_RECEIPT.write_text(fed_text, encoding="utf-8")
        return
    if RECEIPT.read_text(encoding="utf-8") != text:
        sys.exit("FAIL: receipt differs from referee/REFEREE.hbp")
    if vq_text is not None and VQ_RECEIPT.read_text(encoding="utf-8") != vq_text:
        sys.exit("FAIL: receipt differs from referee/VOTE-QUORUM.hbp")
    if fed_text is not None and FED_RECEIPT.read_text(encoding="utf-8") != fed_text:
        sys.exit("FAIL: receipt differs from referee/FED-COMPARE.hbp")
    print("PASS" if vq_text is not None else "PASS (vote-quorum lane held; VOTE-QUORUM.hbp not compared)")


if __name__ == "__main__":
    main()
