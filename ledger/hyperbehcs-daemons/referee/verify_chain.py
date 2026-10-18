#!/usr/bin/env python3
"""Cold-lane verification of a cosign chain .ndjson file (Python stdlib only; run with `python3 -I`).

It uses the vendored cosign daemon's own lines (sha256-pinned), executed by line range, never by
importing the module: sha16 (line 32), the row_hash pre-image expression of line 70, and
chain_head (lines 34-53) with CHAIN pointed at the given file. It reads the file the way lines
44-52 do (utf-8 with errors="ignore", one JSON value per line, non-dict lines skipped) and prints
HBP rows with counts and hashes only; it never prints row contents.

For each row it recomputes row_hash with lines 70-71. For each row whose `appended_by_daemon` is
the daemon's ANCHOR (line 26) and whose seq is an int, it also checks what append_row (58-65)
gives such a row: seq = MAX(seq) of the lines before it + 1, and, when `antecedents` is a list,
that list holds the row_hash of the line that held that MAX.

It also counts the daemon rows whose values, at every depth, are all of the shapes the hot-lane
`pyjson::Value` holds (string, integer in i128, list, object; no lone surrogate), and the daemon
rows holding a float, a bool, a null, an integer outside i128 or a lone surrogate (type checks only).

  verify_chain.py <chain.ndjson>           one VERIFY row
  verify_chain.py <chain.ndjson> --rows    also one ROW per line with a row_hash
"""

import hashlib
import json
import sys
from pathlib import Path

CC_PATH = Path(__file__).resolve().parent.parent / "vendor" / "acer-hyperbehcs-bin" / "asolaria-cosign-chain-daemon.py"
CC_SHA256 = "a2c863db85a747f3b5272d72b2dc6215f7dda3470a6290621de1bc70def22ea2"
OUTSIDE_KINDS = ["float", "bool", "null", "int_outside_i128", "lone_surrogate"]


def lone_surrogate(s):
    return any(0xD800 <= ord(ch) <= 0xDFFF for ch in s)


def outside_kinds(v, kinds):
    """Adds to `kinds` every kind of value in `v` (any depth) outside the hot-lane shapes."""
    if isinstance(v, bool):
        kinds.add("bool")
    elif v is None:
        kinds.add("null")
    elif isinstance(v, float):
        kinds.add("float")
    elif isinstance(v, int):
        if not -(2**127) <= v < 2**127:
            kinds.add("int_outside_i128")
    elif isinstance(v, str):
        if lone_surrogate(v):
            kinds.add("lone_surrogate")
    elif isinstance(v, list):
        for x in v:
            outside_kinds(x, kinds)
    elif isinstance(v, dict):
        for k, x in v.items():
            if lone_surrogate(k):
                kinds.add("lone_surrogate")
            outside_kinds(x, kinds)


def upstream(chain_path):
    raw = CC_PATH.read_bytes()
    if hashlib.sha256(raw).hexdigest() != CC_SHA256:
        sys.exit(f"{CC_PATH.name}: sha256 differs from the pinned upstream bytes")
    lines = raw.decode("utf-8").split("\n")
    ns = {"__name__": "upstream_cosign_chain_lines"}

    def run(a, b):
        text = "\n" * (a - 1) + "\n".join(lines[a - 1 : b]) + "\n"
        exec(compile(text, str(CC_PATH), "exec"), ns)

    run(17, 20)
    ns["CHAIN"] = Path(chain_path)  # stand-in for line 22
    run(25, 32)
    run(34, 53)
    stmt = lines[69].strip()
    if not stmt.startswith("base = "):
        sys.exit("line 70 is not the row_hash pre-image")
    preimage = compile(stmt[len("base = ") :], str(CC_PATH), "eval")
    return ns, preimage


def main():
    if len(sys.argv) not in (2, 3) or (len(sys.argv) == 3 and sys.argv[2] != "--rows"):
        sys.exit(__doc__)
    path = sys.argv[1]
    show_rows = len(sys.argv) == 3
    ns, preimage = upstream(path)
    anchor = ns["ANCHOR"]
    c = dict.fromkeys(
        [
            "rows", "parsed", "with_row_hash", "hash_equal", "hash_differs", "daemon_rows",
            "daemon_hash_equal", "daemon_seq_follows_head", "daemon_antecedents_list",
            "daemon_head_in_antecedents", "daemon_rows_hot_lane_shapes",
        ]
        + [f"daemon_rows_with_{k}" for k in OUTSIDE_KINDS],
        0,
    )
    head_seq, head_hash = 0, "0000000000000000"
    out = []
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for n, line in enumerate(f, 1):
            c["rows"] += 1
            try:
                d = json.loads(line)
                s = d.get("seq")
            except Exception:
                continue
            c["parsed"] += 1
            matched = False
            if "row_hash" in d:
                c["with_row_hash"] += 1
                got = ns["sha16"](eval(preimage, ns, {"row": d}))
                matched = got == d["row_hash"]
                c["hash_equal" if matched else "hash_differs"] += 1
                if show_rows:
                    stored = d["row_hash"] if isinstance(d["row_hash"], str) else "non-string"
                    out.append(f"ROW|line={n}|seq={s if isinstance(s, int) else '-'}|stored={stored}|recomputed={got}|match={int(matched)}|json=0")
            if d.get("appended_by_daemon") == anchor and isinstance(s, int):
                c["daemon_rows"] += 1
                c["daemon_hash_equal"] += matched
                c["daemon_seq_follows_head"] += s == head_seq + 1
                a = d.get("antecedents")
                if isinstance(a, list):
                    c["daemon_antecedents_list"] += 1
                    c["daemon_head_in_antecedents"] += head_hash in a
                kinds = set()
                outside_kinds(d, kinds)
                c["daemon_rows_hot_lane_shapes"] += not kinds
                for k in kinds:
                    c[f"daemon_rows_with_{k}"] += 1
            if isinstance(s, int) and s > head_seq:  # lines 49-51
                head_seq, head_hash = s, d.get("row_hash", "0000000000000000")
    up_seq, up_hash = ns["chain_head"]()
    if (up_seq, up_hash) != (head_seq, head_hash):
        sys.exit("head differs from upstream chain_head over the same file")
    shown = up_hash if isinstance(up_hash, str) else "non-string"
    print("VERIFY|" + "|".join(f"{k}={v}" for k, v in c.items()) + f"|head_seq={up_seq}|head_row_hash={shown}|json=0")
    for row in out:
        print(row)


if __name__ == "__main__":
    main()
