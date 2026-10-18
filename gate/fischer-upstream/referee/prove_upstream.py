#!/usr/bin/env python3
"""Pin the vendored upstream Fischer (Rust) against the referee, byte for byte.

Usage: prove_upstream.py <fixture-stream> <referee-stream> <cases-file> [--check]

The fixture stream comes from upstream-fixture (vendored FED lib, fixed ts); the referee stream from
fischer_referee.py (NODE_* = the Node kernel, PORT_* = the Node kernel with the FED port's points
fischer_referee.PORT_POINTS applied, CLASS = the points that change this case). Checks:
  1. Both sides evaluated the same case ids, as many as the case file has non-skipped lines.
  2. Each Rust row, converted to the Node form through the three FED-port format points (axis fields
     king_safety_q/center_gain_q/proof_gain_q -> king_safety/center_gain/proof_gain, lib.rs:432-434 vs
     mjs:262-264; flag proof_gain_q -> proof_gain, lib.rs:344 vs mjs:186; voxel BH3D:x-y-z -> the 3D
     Hilbert index, lib.rs:662-668 vs mjs:22-33) with row_hash recomputed as sha8 of the converted
     prefix, equals the PORT row as an ordered byte string; the Rust row_hash is sha8 of its prefix.
  3. Each Rust EVAL field equals the PORT EVAL field (voxel and flag converted the same way).
  4. Each case whose NODE output differs from its PORT output names at least one CLASS point.
Prints the Node-vs-Rust counts per point. Exits 1 under --check if any check fails. Stdlib only.
"""

import importlib.util
import os
import sys

_spec = importlib.util.spec_from_file_location(
    "fischer_referee", os.path.join(os.path.dirname(os.path.abspath(__file__)), "fischer_referee.py"))
fr = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fr)

AXIS_RENAME = {"king_safety_q": "king_safety", "center_gain_q": "center_gain", "proof_gain_q": "proof_gain"}
POINT_TEXT = {
    "g4_inherited_name": "g4_state names an Object.prototype member: Node cpl=NaN -> PROCEED "
                         "(mjs:368-369,373-382); FED modifier 0 (lib.rs:726-733)",
    "shannon_binary64": "Shannon text in (0.92, binary64 midpoint): Node compares the double "
                        "(mjs:203-204); FED judges the exact text (lib.rs:496-498,510-543)",
    "payload_length_unit": "payload length: Node UTF-16 units (mjs:157-159,199); FED UTF-8 bytes "
                           "(lib.rs:359; main.rs:296-300 maps each input byte to one char)",
    "hbp_escape": "| CR LF TAB in pid/move/g4_state/composite/prev_hash/ts: Node writes them raw "
                  "(mjs:256-272); FED writes _ (lib.rs:426-443,551-553)",
}


def unframe(s):
    out, i = [], 0
    while i < len(s):
        if s[i] == "%":
            out.append(chr(int(s[i + 1:i + 3], 16)))
            i += 3
        else:
            out.append(s[i])
            i += 1
    return "".join(out)


def read_stream(path):
    data = {}
    with open(path, encoding="utf-8", newline="\n") as fh:
        for line in fh:
            idx, kind, body = line.rstrip("\n").split("\t", 2)
            if kind.endswith("EVAL"):
                value = dict(kv.split("=", 1) for kv in body.split("\t"))
                value = {k: unframe(v) for k, v in value.items()}
            elif kind == "CLASS":
                value = [c for c in body.split(",") if c]
            else:
                value = unframe(body)
            data.setdefault(idx, {})[kind] = value
    return data


def node_flags(flags):
    return ",".join("proof_gain" if f == "proof_gain_q" else f for f in flags.split(",")) if flags else ""


def node_voxel(voxel):
    x, y, z = (int(v) for v in voxel[len("BH3D:"):].split("-"))
    return "BH3D:%d" % fr.hilbert_encode_3d_b4((x, y, z))


def rust_row_to_node_form(row):
    prefix, _, row_hash = row.rpartition("|row_hash=")
    out = []
    for field in prefix.split("|"):
        key, eq, value = field.partition("=")
        if key in AXIS_RENAME:
            field = AXIS_RENAME[key] + "=" + value
        elif key == "flags":
            field = "flags=" + node_flags(value)
        elif key == "voxel_coord":
            field = "voxel_coord=" + node_voxel(value)
        out.append(field)
    converted = "|".join(out)
    return converted + "|row_hash=" + fr.sha8(converted), row_hash == fr.sha8(prefix)


def rust_eval_to_node_form(ev):
    ev = dict(ev)
    ev["flags"] = node_flags(ev["flags"])
    ev["voxel_coord"] = node_voxel(ev["voxel_coord"])
    return ev


def decision(ev):
    return ev["verdict"], ev["cpl"], node_flags(ev["flags"])


def main():
    fed_path, ref_path, cases_path = sys.argv[1], sys.argv[2], sys.argv[3]
    check = "--check" in sys.argv[4:]
    with open(cases_path, "rb") as fh:
        expected = sum(1 for line in fr.read_lines(fh.read()) if not fr.is_skipped(line))
    fed, ref = read_stream(fed_path), read_stream(ref_path)
    ids = sorted(set(fed) & set(ref), key=int)
    only_fed, only_ref = sorted(set(fed) - set(ref), key=int), sorted(set(ref) - set(fed), key=int)
    n = len(ids)

    row_pin = hash_ok = eval_pin = 0
    node_row_equal = node_decision_equal = node_verdict_equal = 0
    voxel_points = flag_points = 0
    per_point = {p: [0, 0] for p in fr.PORT_POINTS}  # [cases, of which the decision differs]
    unattributed, pin_fail = [], []

    for i in ids:
        f, r = fed[i], ref[i]
        converted, ok_hash = rust_row_to_node_form(f["ROW"])
        hash_ok += ok_hash
        row_ok = converted == r["PORT_ROW"]
        row_pin += row_ok
        fe = rust_eval_to_node_form(f["EVAL"])
        eval_ok = fe == r["PORT_EVAL"]
        eval_pin += eval_ok
        if not (row_ok and eval_ok and ok_hash):
            pin_fail.append((i, converted, r["PORT_ROW"], [(k, fe.get(k), r["PORT_EVAL"].get(k))
                                                          for k in fr.EVAL_KEYS if fe.get(k) != r["PORT_EVAL"].get(k)]))
        voxel_points += f["EVAL"]["voxel_coord"] != r["NODE_EVAL"]["voxel_coord"]
        flag_points += "proof_gain_q" in f["EVAL"]["flags"].split(",")

        node_row_equal += converted == r["NODE_ROW"]
        same_decision = decision(f["EVAL"]) == decision(r["NODE_EVAL"])
        node_decision_equal += same_decision
        node_verdict_equal += f["EVAL"]["verdict"] == r["NODE_EVAL"]["verdict"]
        if (r["NODE_ROW"], r["NODE_EVAL"]) != (r["PORT_ROW"], r["PORT_EVAL"]):
            if not r["CLASS"]:
                unattributed.append(i)
            for p in r["CLASS"]:
                per_point[p][0] += 1
                per_point[p][1] += not same_decision

    print("cases in file (not skipped)     : %d" % expected)
    print("cases evaluated by both sides   : %d (only Rust %d, only referee %d)" % (n, len(only_fed), len(only_ref)))
    print("PIN Rust row -> Node form (3 format points, row_hash recomputed) == referee FED-port row bytes: %d/%d" % (row_pin, n))
    print("PIN Rust row_hash == sha8(Rust row prefix): %d/%d" % (hash_ok, n))
    print("PIN Rust EVAL == referee FED-port EVAL (voxel/flag converted): %d/%d" % (eval_pin, n))
    print("Node fischer-kernel.mjs vs vendored Rust, same FED-mapped inputs:")
    print("  decision (verdict,cpl,flags) equal: %d/%d; verdict equal: %d/%d" % (node_decision_equal, n, node_verdict_equal, n))
    print("  row bytes equal after the 3 format conversions: %d/%d" % (node_row_equal, n))
    print("  cases where Node and the FED port differ, per point (a case can carry several):")
    for p in fr.PORT_POINTS:
        print("    %-19s : %d cases, decision differs in %d -- %s" % (p, per_point[p][0], per_point[p][1], POINT_TEXT[p]))
    print("  differing cases with no point attributed: %d" % len(unattributed))
    print("format points (every case is converted through them):")
    print("  voxel_coord BH3D:x-y-z vs BH3D:<hilbert index>: %d cases" % voxel_points)
    print("  flag proof_gain_q vs proof_gain: %d cases" % flag_points)
    print("  axis field names *_q vs Node names: every row; row_hash follows the bytes")
    for i, conv, port, ed in pin_fail[:10]:
        print("  PIN DIFF case %s\n    rust->node %s\n    port       %s\n    eval %s" % (i, conv[:200], port[:200], ed))
    for i in (only_fed + only_ref)[:10]:
        print("  ONE-SIDED case %s" % i)
    failed = bool(only_fed or only_ref or n != expected or pin_fail or unattributed)
    print("RESULT: %s" % ("DIFFERENCES OUTSIDE THE DOCUMENTED POINTS" if failed else "OK (every Rust byte pinned)"))
    return 1 if (failed and check) else 0


if __name__ == "__main__":
    sys.exit(main())
