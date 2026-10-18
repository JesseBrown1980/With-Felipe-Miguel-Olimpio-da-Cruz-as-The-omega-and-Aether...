#!/usr/bin/env python3
"""Measure where the AE Fischer variant differs from the vendored upstream, and both from Node.

Usage: measure_ae.py <upstream-host8-bin> <ae-host8-bin> <cases-file>

Runs every case (skip rule of fischer_referee.is_skipped) through two `fischer-eval-host8 --eval`
binaries: the vendored upstream (gate/fischer-upstream, FED @dc1da1a9) and the AE variant
(gate/fischer-eval, Claude's secondary). AE differs from FED in two places (WIRING-MAP R6):
  floor_after_modifier : the hard floor is applied after the G4 modifier (AE lib.rs:238-239);
  no_default_pid       : AE main.rs:193 keeps the pid -> bh fallback and drops only the
                         BH.FISCHER.HOST8.DEFAULT default, so a case with neither a non-empty pid
                         nor a non-empty bh field gets missing_pid.
The two rows are compared with the live `ts` and the derived `row_hash` removed; each differing case
is bucketed by its parsed fields (fischer_referee.parse_input_fields, the FED main.rs:232-313 mirror).

Node envelope pid (data for OWNER-RULES 7c): the Node callers pass the envelope through unchanged
(asolaria-hookwall.mjs:67,74; fischer-live.mjs:35-42,77-81), so fischer-kernel.mjs:146 sees only a pid
field. The referee runs the Node kernel with envelope.pid taken only from a non-empty pid field and
compares its decision (verdict, cpl, flags) with both binaries. Standard library only.
"""

import importlib.util
import os
import subprocess
import sys

_spec = importlib.util.spec_from_file_location(
    "fischer_referee", os.path.join(os.path.dirname(os.path.abspath(__file__)), "fischer_referee.py"))
fr = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fr)

NEG_MOD_STATES = {"EDGE_MINED", "PATH_FOUND", "CONVERGED"}


def row_dict(row):
    d = {}
    for f in row.strip().split("|"):
        if "=" in f:
            k, v = f.split("=", 1)
            d[k] = v
    return d


def semantic(d):
    return {k: v for k, v in d.items() if k not in ("ts", "row_hash")}


def run(binary, line):
    out = subprocess.run([binary, "--eval", line.encode("utf-8")], capture_output=True, check=True).stdout
    return out.decode("utf-8").strip()


def decision(d):
    flags = ",".join("proof_gain" if f == "proof_gain_q" else f for f in d.get("flags", "").split(",") if f)
    return d.get("verdict"), str(d.get("cpl")), flags


def pid_class(fields):
    if fr.opt_nonempty(fields, "pid"):
        return "pid present"
    if fr.opt_nonempty(fields, "bh"):
        return "bh only"
    return "pid= empty" if "pid" in fields else "pid absent"


def classify(fields, up, ae):
    if not fr.opt_nonempty(fields, "pid") and not fr.opt_nonempty(fields, "bh"):
        return "no_default_pid"
    if up.get("g4_state") in NEG_MOD_STATES and up.get("cpl") != ae.get("cpl"):
        return "floor_after_modifier"
    return "other"


def main():
    up_bin, ae_bin, cases_path = sys.argv[1], sys.argv[2], sys.argv[3]
    with open(cases_path, "rb") as fh:
        cases = [line for line in fr.read_lines(fh.read()) if not fr.is_skipped(line)]
    total = len(cases)
    verdict_diff = cpl_diff = row_diff = 0
    buckets = {"floor_after_modifier": [], "no_default_pid": [], "other": []}
    field_diff_counts = {}
    node_cls = {}  # class -> [n, upstream decision == Node, AE decision == Node, upstream verdict ==, AE verdict ==]

    for case in cases:
        fields = fr.parse_input_fields(case)
        up = row_dict(run(up_bin, case))
        ae = row_dict(run(ae_bin, case))
        node = fr.evaluate_line(case, pid_source="node_envelope")
        nd = (node["verdict"], str(node["cpl"]), ",".join(node["flags"]))
        c = node_cls.setdefault(pid_class(fields), [0, 0, 0, 0, 0])
        c[0] += 1
        c[1] += decision(up) == nd
        c[2] += decision(ae) == nd
        c[3] += up.get("verdict") == nd[0]
        c[4] += ae.get("verdict") == nd[0]
        su, sa = semantic(up), semantic(ae)
        if su == sa:
            continue
        row_diff += 1
        verdict_diff += up.get("verdict") != ae.get("verdict")
        cpl_diff += up.get("cpl") != ae.get("cpl")
        for k in set(su) | set(sa):
            if su.get(k) != sa.get(k):
                field_diff_counts[k] = field_diff_counts.get(k, 0) + 1
        buckets[classify(fields, up, ae)].append((case, up, ae))

    print("cases run through both binaries : %d" % total)
    print("cases with an identical semantic row (ts/row_hash removed): %d" % (total - row_diff))
    print("cases where the row differs     : %d" % row_diff)
    print("  of which verdict differs      : %d" % verdict_diff)
    print("  of which cpl differs          : %d" % cpl_diff)
    print("per-field difference counts (field : #cases):")
    for k in sorted(field_diff_counts, key=lambda k: (-field_diff_counts[k], k)):
        print("  %-16s : %d" % (k, field_diff_counts[k]))
    print()
    print("INPUT CLASSES THAT DIFFER (AE secondary: floor after the modifier; no default pid, bh fallback kept):")
    for name in ("floor_after_modifier", "no_default_pid", "other"):
        items = buckets[name]
        print("  [%s] %d cases" % (name, len(items)))
        for case, up, ae in items[:4]:
            print("    in : %s" % (case[:140]))
            for side, d in (("upstream", up), ("AE      ", ae)):
                print("       %s: verdict=%s cpl=%s glyph=%s pid=%s flags=%s" % (
                    side, d.get("verdict"), d.get("cpl"), d.get("glyph"), d.get("pid"), d.get("flags")))
    floor = buckets["floor_after_modifier"]
    trans = {}
    for _, up, ae in floor:
        key = "%s->%s" % (up.get("verdict"), ae.get("verdict")) if up.get("verdict") != ae.get("verdict") else "unchanged"
        trans[key] = trans.get(key, 0) + 1
    ae_max = max((int(ae["cpl"]) for _, _, ae in floor), default=0)
    below = sum(1 for _, up, ae in floor if int(up["cpl"]) < int(ae["cpl"]))
    print("  floor_after_modifier verdicts upstream->AE: %s; upstream cpl below AE cpl in %d/%d; largest AE cpl %d" % (
        ", ".join("%s %d" % kv for kv in sorted(trans.items())), below, len(floor), ae_max))
    print()
    print("NODE ENVELOPE PID: Node fischerEval decision (verdict,cpl,flags) with envelope.pid only from a")
    print("non-empty pid field (FED main.rs:193-195 substitutes pid -> bh -> BH.FISCHER.HOST8.DEFAULT; Node has no")
    print("such step; absent or empty pid gives Node BLOCK missing_pid cpl=500, mjs:146,339-350):")
    agg = [sum(v[i] for v in node_cls.values()) for i in range(5)]
    print("  all             : n=%d  decision equal upstream %d, AE %d; verdict equal upstream %d, AE %d" % tuple(agg))
    for name in ("pid absent", "pid= empty", "bh only", "pid present"):
        if name in node_cls:
            print("  %-15s : n=%d  decision equal upstream %d, AE %d; verdict equal upstream %d, AE %d" % ((name,) + tuple(node_cls[name])))
    if buckets["other"]:
        print("NOTE: 'other' is non-empty; a difference outside the two AE classes.")
        sys.exit(1)


if __name__ == "__main__":
    main()
