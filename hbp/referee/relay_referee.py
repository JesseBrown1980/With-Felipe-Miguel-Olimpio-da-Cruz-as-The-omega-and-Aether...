#!/usr/bin/env python3
"""Stdlib referee mirroring relay-envelope.mjs (1-77) line by line. No third-party imports.

Run isolated:  python3 -I relay_referee.py build    -> prints the fixture rows, one per line
               python3 -I relay_referee.py selftest -> envelope-level parity assertions
               python3 -I relay_referee.py expect <upstream-js.hbp> -> PREFIX/RELAYROW rows vs JS
"""
import hashlib
import sys

SPEC_VERSION = "1"
GENESIS = "0000000000000000"
READ_VERBS = {"NOTE", "STATUS", "ANSWER", "OBSERVE", "RECALL-REQ", "ACK"}
ACTION_VERBS = {"EXEC", "WRITE", "MINT", "FIRE", "RETIRE", "COSIGN"}
CONTROL_VERBS = {"HOLD"}
FIELD_ORDER = ["v", "from", "to", "verb", "seq", "ts", "pid",
               "payload_sha256", "hbi_off", "len", "token", "antecedent", "sig"]


def class_of(verb):
    if verb in READ_VERBS:
        return "READ"
    if verb in CONTROL_VERBS:
        return "CONTROL"
    return "ACTION"


def sha256hex(buf):
    return hashlib.sha256(buf).hexdigest()


def sha16(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


def _is_bad(ch):
    o = ord(ch)
    return ch in "|{}" or o <= 0x1f or o == 0x7f or o == 0x2028 or o == 0x2029


def clean(name, v):
    s = str(v)
    if any(_is_bad(c) for c in s):
        raise ValueError(
            "FIELD_INJECTION_REJECT: field " + name +
            " contains a forbidden char ( | { } or a control/separator )")
    return s


def sig_preimage(f):
    # Array.prototype.join renders an absent (undefined) field as ""
    keys = ["from", "to", "verb", "seq", "ts", "pid", "payload_sha256", "antecedent"]
    return "|".join("" if f.get(k) is None else f[k] for k in keys)


def row_prefix(f):
    # clean() applies String(): an absent field renders as "undefined"
    return "RELAY|" + "|".join(k + "=" + clean(k, "undefined" if f.get(k) is None else f[k]) for k in FIELD_ORDER)


def build_row(f):
    filled = {"token": "-", "sig": "-"}
    filled.update(f)
    for k in FIELD_ORDER:
        if filled.get(k) is None:
            raise ValueError("MISSING_FIELD: " + k)
    prefix = row_prefix(filled)
    return prefix + "|row_hash=" + sha16(prefix)


def parse_row(line):
    s = line[:-1] if line.endswith("\n") else line
    if any((ord(c) <= 0x1f or ord(c) == 0x7f or ord(c) == 0x2028 or ord(c) == 0x2029) for c in s):
        raise ValueError("PARSE_REJECT: control/separator char in row (injection guard)")
    if not s.startswith("RELAY|"):
        raise ValueError("PARSE_REJECT: not a RELAY row")
    at = s.find("|row_hash=")
    if at < 0:
        raise ValueError("PARSE_REJECT: no row_hash")
    prefix = s[:at]
    row_hash = s[at + len("|row_hash="):]
    toks = prefix.split("|")
    if toks[0] != "RELAY":
        raise ValueError("PARSE_REJECT: bad header")
    f = {}
    keys = []
    for t in toks[1:]:
        eq = t.find("=")
        if eq < 0:
            raise ValueError("PARSE_REJECT: bad token " + t)
        k = t[:eq]
        f[k] = t[eq + 1:]
        keys.append(k)
    if len(keys) != len(FIELD_ORDER):
        raise ValueError("PARSE_REJECT: field count %d != %d" % (len(keys), len(FIELD_ORDER)))
    for i in range(len(FIELD_ORDER)):
        if keys[i] != FIELD_ORDER[i]:
            raise ValueError("PARSE_REJECT: field-order at %d got %s want %s" % (i, keys[i], FIELD_ORDER[i]))
    f["row_hash"] = row_hash
    f["_prefix"] = prefix
    return f


def row_hash_ok(f):
    return sha16(f["_prefix"]) == f["row_hash"]


TS = "2026-06-21T00:00:00Z"


def fixtures():
    r1 = {"v": "1", "from": "acer", "to": "liris", "verb": "NOTE", "seq": "1", "ts": TS,
          "pid": "BH.RELAY.acer.1", "payload_sha256": "aa" * 32, "hbi_off": "0",
          "len": "0", "antecedent": GENESIS}
    r2 = {"v": "1", "from": "acer", "to": "liris", "verb": "STATUS", "seq": "2", "ts": TS,
          "pid": "BH.RELAY.acer.2", "payload_sha256": "bb" * 32, "hbi_off": "0",
          "len": "11", "antecedent": GENESIS}
    return [r1, r2]


def main(argv):
    if len(argv) >= 2 and argv[1] == "build":
        for f in fixtures():
            print(build_row(f))
        return 0
    if len(argv) >= 2 and argv[1] == "selftest":
        ok = 0
        fail = 0

        def check(name, cond):
            nonlocal ok, fail
            if cond:
                ok += 1
            else:
                fail += 1
                print("FAIL " + name)
        row = build_row(fixtures()[0])
        p = parse_row(row)
        check("round_hash_ok", row_hash_ok(p))
        try:
            parse_row(row.replace("RELAY|v=1|from=acer", "RELAY|from=acer|v=1", 1))
            check("field_order_reject", False)
        except ValueError as e:
            check("field_order_reject", str(e) == "PARSE_REJECT: field-order at 0 got from want v")
        try:
            clean("verb", "NOTE|row_hash=x")
            check("inject_pipe", False)
        except ValueError:
            check("inject_pipe", True)
        try:
            build_row({"v": "1", "from": "a", "to": "b", "verb": "NOTE", "seq": "1", "ts": TS,
                       "pid": "p", "payload_sha256": "aa", "hbi_off": "0", "len": "0",
                       "antecedent": GENESIS + "\nRELAY|fake"})
            check("inject_newline", False)
        except ValueError:
            check("inject_newline", True)
        check("class_read", class_of("NOTE") == "READ")
        check("class_action_unknown", class_of("ZZZ") == "ACTION")
        print("%d OK / %d FAIL" % (ok, fail))
        return 1 if fail else 0
    if len(argv) >= 3 and argv[1] == "expect":
        return expect(argv[2])
    print(__doc__)
    return 2


def expect(path):
    with open(path, "rb") as fh:
        rows = [ln for ln in fh.read().decode("utf-8").split("\n") if ln]

    def fields(ln):
        return dict(p.split("=", 1) for p in ln.split("|")[1:])

    prefixes = {fields(ln)["case"]: bytes.fromhex(fields(ln)["prefix_hex"]).decode("utf-8")
                for ln in rows if ln.startswith("PREFIX|")}
    relay = [bytes.fromhex(fields(ln)["row_hex"]).decode("utf-8") for ln in rows if ln.startswith("RELAYROW|")]
    f = {"v": "1", "from": "a", "to": "b", "verb": "NOTE", "seq": "1", "ts": "t", "pid": "p",
         "payload_sha256": "aa", "hbi_off": "0", "len": "0", "antecedent": GENESIS}
    got = [("empty", row_prefix({}), prefixes.get("empty")),
           ("no-token-sig", row_prefix(f), prefixes.get("no-token-sig")),
           ("sig-preimage-empty", sig_preimage({}), prefixes.get("sig-preimage-empty")),
           ("relay rows", [build_row(r) for r in fixtures()], relay)]
    fail = 0
    for name, g, w in got:
        if g != w:
            fail += 1
            print("FAIL %s: got %r want %r" % (name, g, w))
    print("%d OK / %d FAIL" % (len(got) - fail, fail))
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
