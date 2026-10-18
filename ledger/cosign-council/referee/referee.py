#!/usr/bin/env python3
"""Cold-lane referee for ledger/cosign-council (Python stdlib only; run with `python3 -I`).

It mirrors, line by line, the vendored upstream Rust it checks (asolaria-federation-1024 @ dc1da1a9):
  cosign-ledger  src/py_parity/json_tok.rs (parse_line), canon.rs, chain.rs (compute_append, fold_seq_max)
  cosign-serve   src/routes.rs (verify, head, tail, health, append when disabled), src/resume.rs,
                 src/main.rs:123-146 (json_escape)
  vote-quorum    src/canon.rs (canonical_base, recompute, stored_row_hash)
  council-serve  src/routes.rs:21-30, 71-111, 168-296 and schedule.rs (aether proposals/verify-schedule)
It generates seeded inputs, runs the Rust `cosign-council-vectors` binary over them, and requires
the Rust output to equal the mirror's output byte for byte.

It also measures, on the same rows, the Rust row_hash against Python
`json.dumps(row, sort_keys=True, ensure_ascii=...)` after `json.loads`, the recipe quoted at
vote-quorum canon.rs:2 and cosign-ledger canon.rs:90-91. These counts are pinned in REFEREE.hbp.

Integer arithmetic only (OWNER-RULES 4). Random draws are integers (`randrange`, `randint`, `choice`,
`shuffle`). Float-shaped JSON tokens are literal strings from FLOAT_TOKENS, put into the dumped text
in place of a string marker. Python floats exist only inside `json.loads` / `json.dumps` in
`py_recipe` and `differs`: that is the daemon's own recipe run unchanged (asolaria-cosign-chain-daemon.py
line 88 `json.loads`, line 70 `json.dumps(..., sort_keys=True, ensure_ascii=False)`).

  referee.py --vectors <path to cosign-council-vectors> --check   compare, and compare with REFEREE.hbp
  referee.py --vectors <path> --write                             compare, then rewrite REFEREE.hbp
  referee.py --vectors <path> --live-ledger <ndjson> --check|--write
      replay one operator ledger, read in place: compare, and compare with (or rewrite) LIVE-CHAIN.hbp.
      Only counts and the ledger's sha256 are printed or written; no row is printed.
"""

import argparse
import hashlib
import json
import os
import random
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RECEIPT = os.path.join(HERE, "REFEREE.hbp")
LIVE_RECEIPT = os.path.join(HERE, "LIVE-CHAIN.hbp")
SEED = 20261017
NOW = "2026-06-25T00:00:00.000Z"
GENESIS = "0000000000000000"
APPENDED_BY_DAEMON = "ASOLARIA-COSIGN-CHAIN-SINGLE-WRITER-DAEMON-PID-2026-05-23"
LAW_ANCHOR = "ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23"

# Rust `char::is_whitespace` (Unicode White_Space), which `str::trim` uses.
RUST_WS = (
    "\t\n\x0b\x0c\r \x85\xa0\u1680"
    + "".join(chr(c) for c in range(0x2000, 0x200B))
    + "\u2028\u2029\u202f\u205f\u3000"
)


def rtrim(s):
    return s.strip(RUST_WS)


def sha16(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


def hexs(s):
    return s.encode("utf-8").hex()


def str_lines(s):
    """Rust `str::lines`: split at \\n, drop one \\r before each \\n, no empty tail."""
    out = []
    for part in s.split("\n"):
        out.append(part)
    if out and out[-1] == "":
        out.pop()
    return [p[:-1] if (i < len(out) - 1 or s.endswith("\n")) and p.endswith("\r") else p
            for i, p in enumerate(out)]


def bufread_lines(data):
    """`BufRead::lines` then `map_while(Result::ok)` / `?` on bytes: stops at invalid UTF-8."""
    out, i, ok = [], 0, True
    while i < len(data):
        j = data.find(b"\n", i)
        if j == -1:
            seg, i, nl = data[i:], len(data), False
        else:
            seg, i, nl = data[i:j], j + 1, True
        if nl and seg.endswith(b"\r"):
            seg = seg[:-1]
        try:
            out.append(seg.decode("utf-8"))
        except UnicodeDecodeError:
            ok = False
            break
    return out, ok


# ---------------------------------------------------------------- cosign-ledger json_tok.rs

class PyChainErr(Exception):
    pass


SC, ARR, OBJ = "sc", "arr", "obj"


class TokParser:
    """json_tok.rs:89-251 `Parser` over the bytes of the trimmed &str."""

    def __init__(self, s):
        self.s = s
        self.pos = 0

    def skip_ws(self):
        while self.pos < len(self.s) and self.s[self.pos] in b" \n\r\t":
            self.pos += 1

    def peek(self):
        return self.s[self.pos] if self.pos < len(self.s) else None

    def bump(self):
        b = self.peek()
        if b is not None:
            self.pos += 1
        return b

    def parse_value(self):
        self.skip_ws()
        c = self.peek()
        if c == ord("{"):
            return self.parse_object()
        if c == ord("["):
            return self.parse_array()
        if c == ord('"'):
            return (SC, self.take_string_raw())
        if c is not None and (c == ord("-") or ord("0") <= c <= ord("9")):
            return (SC, self.take_number_raw())
        if c == ord("t"):
            return (SC, self.take_keyword("true"))
        if c == ord("f"):
            return (SC, self.take_keyword("false"))
        if c == ord("n"):
            return (SC, self.take_keyword("null"))
        raise PyChainErr("parse")

    def parse_object(self):
        self.expect(ord("{"))
        fields = []
        self.skip_ws()
        if self.peek() == ord("}"):
            self.pos += 1
            return (OBJ, fields)
        while True:
            self.skip_ws()
            key_raw = self.take_string_raw()
            key = string_scalar_value(key_raw)
            if key is None:
                raise PyChainErr("parse")
            self.skip_ws()
            self.expect(ord(":"))
            value = self.parse_value()
            for f in fields:
                if f[0] == key:
                    f[1] = value
                    break
            else:
                fields.append([key, value])
            self.skip_ws()
            b = self.bump()
            if b == ord(","):
                continue
            if b == ord("}"):
                break
            raise PyChainErr("parse")
        return (OBJ, fields)

    def parse_array(self):
        self.expect(ord("["))
        values = []
        self.skip_ws()
        if self.peek() == ord("]"):
            self.pos += 1
            return (ARR, values)
        while True:
            values.append(self.parse_value())
            self.skip_ws()
            b = self.bump()
            if b == ord(","):
                continue
            if b == ord("]"):
                break
            raise PyChainErr("parse")
        return (ARR, values)

    def expect(self, want):
        if self.bump() != want:
            raise PyChainErr("parse")

    def take_keyword(self, kw):
        if self.s[self.pos:].startswith(kw.encode()):
            self.pos += len(kw)
            return kw
        raise PyChainErr("parse")

    def take_number_raw(self):
        start = self.pos
        if self.peek() == ord("-"):
            self.pos += 1
        self.take_digits()
        if self.peek() == ord("."):
            self.pos += 1
            self.take_digits()
        if self.peek() in (ord("e"), ord("E")):
            self.pos += 1
            if self.peek() in (ord("+"), ord("-")):
                self.pos += 1
            self.take_digits()
        return self.s[start:self.pos].decode("utf-8")

    def take_digits(self):
        start = self.pos
        while self.peek() is not None and ord("0") <= self.peek() <= ord("9"):
            self.pos += 1
        if self.pos == start:
            raise PyChainErr("parse")

    def take_string_raw(self):
        start = self.pos
        self.expect(ord('"'))
        escaped = False
        while True:
            b = self.bump()
            if b is None:
                raise PyChainErr("parse")
            if escaped:
                escaped = False
                continue
            if b == ord("\\"):
                escaped = True
            elif b == ord('"'):
                return self.s[start:self.pos].decode("utf-8")
            elif b <= 0x1F:
                raise PyChainErr("parse")


HEXDIGITS = "0123456789abcdefABCDEF"


def decode_json_string(s):
    """json_tok.rs:253-294."""
    out = []
    it = iter(s)
    for ch in it:
        if ch != "\\":
            out.append(ch)
            continue
        e = next(it, None)
        if e is None:
            raise PyChainErr("parse")
        simple = {'"': '"', "\\": "\\", "/": "/", "b": "\b", "f": "\f", "n": "\n", "r": "\r", "t": "\t"}
        if e in simple:
            out.append(simple[e])
        elif e == "u":
            v = take_hex4(it)
            if 0xD800 <= v <= 0xDBFF:
                if next(it, None) != "\\" or next(it, None) != "u":
                    raise PyChainErr("parse")
                lo = take_hex4(it)
                if not 0xDC00 <= lo <= 0xDFFF:
                    raise PyChainErr("parse")
                out.append(chr(0x10000 + (((v - 0xD800) << 10) | (lo - 0xDC00))))
            elif 0xDC00 <= v <= 0xDFFF:
                raise PyChainErr("parse")
            else:
                out.append(chr(v))
        else:
            raise PyChainErr("parse")
    return "".join(out)


def take_hex4(it):
    v = 0
    for _ in range(4):
        h = next(it, None)
        if h is None or h not in HEXDIGITS:
            raise PyChainErr("parse")
        v = (v << 4) | int(h, 16)
    return v


def string_scalar_value(raw):
    """json_tok.rs:75-80."""
    if not (raw.startswith('"') and raw.endswith('"')):
        return None
    try:
        return decode_json_string(raw[1:len(raw) - 1])
    except PyChainErr:
        return None


def parse_u64_token(s):
    if not s or any(c not in "0123456789" for c in s):
        return None
    v = int(s)
    return v if v <= 0xFFFFFFFFFFFFFFFF else None


def parse_line(b):
    """json_tok.rs:25-37. Returns the field list of a PyRow."""
    try:
        s = b.decode("utf-8")
    except UnicodeDecodeError:
        raise PyChainErr("parse")
    p = TokParser(rtrim(s).encode("utf-8"))
    value = p.parse_value()
    p.skip_ws()
    if p.pos != len(p.s):
        raise PyChainErr("parse")
    if value[0] != OBJ:
        raise PyChainErr("parse")
    return value[1]


def row_get(row, key):
    for k, v in row:
        if k == key:
            return v
    return None


def row_set(row, key, value):
    for f in row:
        if f[0] == key:
            f[1] = value
            return
    row.append([key, value])


def row_remove(row, key):
    row[:] = [f for f in row if f[0] != key]


def row_seq_if_integer(row):
    v = row_get(row, "seq")
    return parse_u64_token(v[1]) if v is not None and v[0] == SC else None


def row_row_hash(row):
    v = row_get(row, "row_hash")
    return string_scalar_value(v[1]) if v is not None and v[0] == SC else None


# ---------------------------------------------------------------- cosign-ledger canon.rs

def py_escape_string(s):
    """canon.rs:77-105."""
    out = ['"']
    for ch in s:
        c = ord(ch)
        if ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif c == 0x08:
            out.append("\\b")
        elif ch == "\t":
            out.append("\\t")
        elif ch == "\n":
            out.append("\\n")
        elif c == 0x0C:
            out.append("\\f")
        elif ch == "\r":
            out.append("\\r")
        elif c <= 0x1F:
            out.append("\\u%04x" % c)
        elif 0x80 <= c <= 0xFFFF:
            out.append("\\u%04x" % c)
        elif c < 0x10000:
            out.append(ch)
        else:
            v = c - 0x10000
            out.append("\\u%04x\\u%04x" % (0xD800 + ((v >> 10) & 0x3FF), 0xDC00 + (v & 0x3FF)))
    out.append('"')
    return "".join(out)


def value_bytes(value, sort_keys):
    kind, body = value
    if kind == SC:
        return body
    if kind == ARR:
        return "[" + ", ".join(value_bytes(v, sort_keys) for v in body) + "]"
    return object_bytes(body, sort_keys)


def object_bytes(fields, sort_keys):
    if sort_keys:
        fields = sorted(fields, key=lambda f: f[0].encode("utf-8"))
    return "{" + ", ".join(py_escape_string(k) + ": " + value_bytes(v, sort_keys) for k, v in fields) + "}"


def canonical_bytes(row):
    return object_bytes([f for f in row if f[0] != "row_hash"], True)


def persisted_line(row):
    return object_bytes(row, False) + "\n"


# ---------------------------------------------------------------- cosign-ledger chain.rs

def fold_seq_max(acc, row):
    """chain.rs:31-40; acc = [head_seq, head_hash]."""
    seq = row_seq_if_integer(row)
    if seq is None or seq <= acc[0]:
        return
    acc[0] = seq
    rh = row_row_hash(row)
    acc[1] = rh if rh is not None else GENESIS


def compute_append(head_seq, head_hash, payload, now):
    """chain.rs:42-91. Mutates and returns payload; returns (payload, seq, row_hash, prev)."""
    next_seq = head_seq + 1
    prev = head_hash
    had_antecedents = row_get(payload, "antecedents") is not None
    had_ts = row_get(payload, "ts") is not None
    had_appended_by = row_get(payload, "appended_by_daemon") is not None
    antecedents = row_get(payload, "antecedents")
    row_remove(payload, "seq")
    row_remove(payload, "row_hash")
    row_set(payload, "seq", (SC, str(next_seq)))
    if not had_antecedents:
        row_set(payload, "antecedents", (ARR, [(SC, py_escape_string(prev))]))
    elif antecedents[0] == ARR:
        present = any(v[0] == SC and v[1] == py_escape_string(prev) for v in antecedents[1])
        if not present:
            row_set(payload, "antecedents", (ARR, [(SC, py_escape_string(prev))] + list(antecedents[1])))
    if not had_ts:
        row_set(payload, "ts", (SC, py_escape_string(now)))
    if not had_appended_by:
        row_set(payload, "appended_by_daemon", (SC, py_escape_string(APPENDED_BY_DAEMON)))
    row_hash = sha16(canonical_bytes(payload))
    row_set(payload, "row_hash", (SC, py_escape_string(row_hash)))
    return payload, next_seq, row_hash, prev


# ---------------------------------------------------------------- cosign-serve routes.rs + main.rs

def json_escape(s):
    """cosign-serve main.rs:123-138."""
    out = ['"']
    for ch in s:
        if ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\r":
            out.append("\\r")
        elif ch == "\t":
            out.append("\\t")
        elif ch < " ":
            out.append("\\u%04x" % ord(ch))
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def jstr(k, v):
    return "%s:%s" % (json_escape(k), json_escape(v))


def jnum(k, v):
    return "%s:%d" % (json_escape(k), v)


def resume_from(data):
    """resume.rs:7-23 over existing bytes; None when a line is not UTF-8 (`line?`)."""
    lines, ok = bufread_lines(data)
    if not ok:
        return None
    acc = [0, GENESIS]
    for line in lines:
        if rtrim(line) == "":
            continue
        try:
            fold_seq_max(acc, parse_line(line.encode("utf-8")))
        except PyChainErr:
            pass
    return acc


def route_verify(data):
    checked, matched, mismatches, legacy = verify_counts(data)
    return 200, "{\"ok\":true,%s,%s,%s,%s}" % (
        jnum("checked", checked), jnum("matched", matched), jnum("mismatches", mismatches), jnum("legacy", legacy))


def verify_counts(data):
    """routes.rs:99-153 over the live ledger: (checked, matched, mismatches, legacy)."""
    lines, _ = bufread_lines(data)
    checked = matched = mismatches = legacy = 0
    for line in lines:
        if rtrim(line) == "":
            continue
        try:
            row = parse_line(line.encode("utf-8"))
        except PyChainErr:
            legacy += 1
            continue
        disk = row_row_hash(row)
        if disk is None:
            legacy += 1
            continue
        checked += 1
        if sha16(canonical_bytes(row)) == disk:
            matched += 1
        else:
            mismatches += 1
    return checked, matched, mismatches, legacy


def query_param(query, key):
    for part in query.split("&"):
        if "=" in part:
            k, v = part.split("=", 1)
            if k == key:
                return v
    return None


def parse_usize(v):
    """`str::parse::<usize>` on a 64-bit target: one optional leading '+', then one or more ASCII
    digits, value at most 2^64-1; anything else is an error (None)."""
    d = v[1:] if v.startswith("+") else v
    if d == "" or any(c not in "0123456789" for c in d):
        return None
    n = int(d)
    return n if n <= 0xFFFFFFFFFFFFFFFF else None


def route_tail(data, query):
    """routes.rs:155-200 over the live ledger (routes.rs:156-159: `n` parsed as usize, else 5, at most 50)."""
    raw = query_param(query, "n")
    n = parse_usize(raw) if raw is not None else None
    n = min(5 if n is None else n, 50)
    lines, _ = bufread_lines(data)
    rows = []
    for line in lines:
        if rtrim(line) == "":
            continue
        rows.append(line)
        if len(rows) > n:
            rows.pop(0)
    return 200, "{\"ok\":true,\"count\":%d,\"rows\":[%s]}" % (len(rows), ",".join(json_escape(r) for r in rows))


# The tail queries of vectors `replay`, in its order (vectors/src/main.rs TAIL_QUERIES).
TAIL_QUERIES = ["n=3", "n=999", "n=+3", "n=+0", "n=0", "n=", "n=+", "n=++3", "n=-1", "n= 3", "n=3x",
                "n=18446744073709551615", "n=18446744073709551616", "n=99999999999999999999",
                "n=0050", "n=49", "n=7&n=2", "x=1&n=2", "n"]


def route_vectors(ledger_bytes):
    """The ROUTEVEC rows of vectors `replay`: live = the ledger, a new empty shadow, append off."""
    out = []
    out.append(("/api/cosign/verify", "") + route_verify(ledger_bytes))
    head = resume_from(ledger_bytes)
    if head is None:
        head = [0, GENESIS]  # routes.rs:45-51 falls back to the writer head of an empty shadow
    out.append(("/api/cosign/head", "", 200, "{\"ok\":true,%s,%s}" % (jnum("seq", head[0]), jstr("row_hash", head[1]))))
    for q in TAIL_QUERIES:
        out.append(("/api/cosign/tail", q) + route_tail(ledger_bytes, q))
    out.append(("/health", "", 200,
                "{\"ok\":true,\"service\":\"cosign-serve\",\"port\":5091,%s,%s,%s,\"append_shadow\":false,\"live_write\":false}"
                % (jnum("head_seq", 0), jstr("head_row_hash", GENESIS), jstr("law_anchor", LAW_ANCHOR))))
    out.append(("/api/cosign/append", "", 403, "{\"ok\":false,\"error\":\"append-disabled-shadow-only\"}"))
    return ["ROUTEVEC|path=%s|query=%s|status=%d|body_hex=%s|json=0" % (p, q, c, hexs(b)) for p, q, c, b in out]


# ---------------------------------------------------------------- vote-quorum canon.rs

class VqErr(Exception):
    pass


class VqP:
    """vote-quorum canon.rs:41-158 `P` over bytes."""

    def __init__(self, b):
        self.b = b
        self.i = 0

    def ws(self):
        while self.i < len(self.b) and self.b[self.i] in b" \t\n\r":
            self.i += 1

    def peek(self):
        return self.b[self.i] if self.i < len(self.b) else None

    def string_token(self):
        s = self.i
        self.i += 1
        while self.i < len(self.b):
            c = self.b[self.i]
            if c == 0x5C:
                self.i += 2
            elif c == 0x22:
                self.i += 1
                try:
                    return self.b[s:self.i].decode("utf-8")
                except UnicodeDecodeError:
                    raise VqErr("Unexpected")
            else:
                self.i += 1
        raise VqErr("Eof")

    def bare_token(self):
        s = self.i
        while self.i < len(self.b) and self.b[self.i] not in b",}] \t\n\r":
            self.i += 1
        if self.i == s:
            raise VqErr("Unexpected")
        try:
            return self.b[s:self.i].decode("utf-8")
        except UnicodeDecodeError:
            raise VqErr("Unexpected")

    def value(self):
        self.ws()
        c = self.peek()
        if c is None:
            raise VqErr("Eof")
        if c == ord("{"):
            return self.object()
        if c == ord("["):
            return self.array()
        if c == ord('"'):
            return (SC, self.string_token())
        return (SC, self.bare_token())

    def object(self):
        self.i += 1
        m = []
        self.ws()
        if self.peek() == ord("}"):
            self.i += 1
            return (OBJ, m)
        while True:
            self.ws()
            if self.peek() != ord('"'):
                raise VqErr("Unexpected")
            k = self.string_token()
            self.ws()
            if self.peek() != ord(":"):
                raise VqErr("Unexpected")
            self.i += 1
            v = self.value()
            m.append((k, v))
            self.ws()
            c = self.peek()
            if c == ord(","):
                self.i += 1
            elif c == ord("}"):
                self.i += 1
                break
            else:
                raise VqErr("Unexpected")
        return (OBJ, m)

    def array(self):
        self.i += 1
        a = []
        self.ws()
        if self.peek() == ord("]"):
            self.i += 1
            return (ARR, a)
        while True:
            a.append(self.value())
            self.ws()
            c = self.peek()
            if c == ord(","):
                self.i += 1
            elif c == ord("]"):
                self.i += 1
                break
            else:
                raise VqErr("Unexpected")
        return (ARR, a)


def vq_emit(v):
    kind, body = v
    if kind == SC:
        return body
    if kind == ARR:
        return "[" + ", ".join(vq_emit(x) for x in body) + "]"
    order = sorted(range(len(body)), key=lambda i: body[i][0].encode("utf-8"))
    return "{" + ", ".join(body[i][0] + ": " + vq_emit(body[i][1]) for i in order) + "}"


def vq_canonical_base(line):
    v = VqP(line.encode("utf-8")).value()
    if v[0] != OBJ:
        raise VqErr("NotObject")
    return vq_emit((OBJ, [(k, x) for k, x in v[1] if k != '"row_hash"']))


def vq_recompute(line):
    return sha16(vq_canonical_base(line))


def vq_stored_row_hash(line):
    try:
        v = VqP(line.encode("utf-8")).value()
    except VqErr:
        return None
    if v[0] == OBJ:
        for k, val in v[1]:
            if k == '"row_hash"' and val[0] == SC:
                t = val[1]
                if len(t.encode("utf-8")) >= 2 and t[0] == '"' and t[-1] == '"':
                    return t[1:-1]
                return t
    return None


def vq_cols(line, prefix):
    try:
        rc = "%srecompute=%s" % (prefix, vq_recompute(line))
    except VqErr as e:
        rc = "%srecompute=err_%s" % (prefix, e.args[0])
    st = vq_stored_row_hash(line)
    stc = "%sstored_hex=%s" % (prefix, hexs(st)) if st is not None else "%sstored=none" % prefix
    return rc, stc


# ---------------------------------------------------------------- council-serve routes.rs + schedule.rs

def hbp_escape(s):
    """routes.rs:21-30."""
    return "".join("_" if c in "|\r\n\t{}" else c for c in s)


def find_key(s, key):
    """routes.rs:225-236."""
    pat = '"%s"' % key
    rest = s
    while True:
        rel = rest.find(pat)
        if rel < 0:
            return None
        after = rest[rel + len(pat):]
        t = after.lstrip(RUST_WS)
        if t.startswith(":"):
            return t[1:]
        rest = after


def json_str(s, key):
    """routes.rs:238-242."""
    v = find_key(s, key)
    if v is None:
        return None
    v = v.lstrip(RUST_WS)
    if not v.startswith('"'):
        return None
    v = v[1:]
    end = v.find('"')
    return None if end < 0 else v[:end]


def json_unit_q(s, key):
    """routes.rs:247-296."""
    after = find_key(s, key)
    if after is None:
        return None
    after = after.lstrip(RUST_WS)
    end = len(after)
    for i, c in enumerate(after):
        if not (c in "0123456789" or c in ".-+"):
            end = i
            break
    if after[end:end + 1] in ("e", "E"):
        return None
    tok = rtrim(after[:end])
    if tok == "":
        return None
    neg = tok.startswith("-")
    tok = tok.lstrip("-+")
    int_part, frac = tok.split(".", 1) if "." in tok else (tok, "")
    if int_part != "" and any(c not in "0123456789" for c in int_part):
        return None
    if any(c not in "0123456789" for c in frac):
        return None
    if neg:
        return 0
    int_val = 0 if int_part == "" else int(int_part)
    if int_val > 0xFFFFFFFF:
        return None
    if int_val >= 1:
        return 1000
    milli = 0
    for i, c in enumerate(frac[:4]):
        d = ord(c) - 48
        if i < 3:
            milli = milli * 10 + d
        elif d >= 5:
            milli += 1
    for _ in range(len(frac), 3):
        milli *= 10
    return min(milli, 1000)


def parse_proposal(line):
    """routes.rs:207-217."""
    pid = json_str(line, "id")
    if pid is None:
        return None
    score = json_unit_q(line, "score")
    if score is None:
        return None
    genius = json_unit_q(line, "genius")
    risk = json_unit_q(line, "risk")
    return (pid, score, score if genius is None else genius, 0 if risk is None else risk)


def expected_acceptance_q(p):
    """schedule.rs:41-51."""
    v = max((p[1] + p[2]) // 2 - p[3], 0)
    return min(v, 1000)


def confidence_schedule(props, budget, threshold):
    """schedule.rs:55-86."""
    conf = [expected_acceptance_q(p) for p in props]
    order = sorted(range(len(props)), key=lambda i: (-conf[i], props[i][0].encode("utf-8")))
    verified = 0
    out = []
    for rank, i in enumerate(order):
        v = verified < budget and conf[i] >= threshold
        if v:
            verified += 1
        out.append((props[i][0], conf[i], rank, v))
    return out


def render_schedule(body, budget, threshold):
    """routes.rs:169-203."""
    props, legacy = [], 0
    for line in str_lines(body):
        t = rtrim(line)
        if not t:
            continue
        p = parse_proposal(t)
        if p is None:
            legacy += 1
        else:
            props.append(p)
    sched = confidence_schedule(props, budget, threshold)
    vn = sum(1 for s in sched if s[3])
    out = ("COUNCILSCHEDULE|ok=1|status=staged|read_only=true|scheduler=confidence_scheduled_verify|total=%d|verify=%d|"
           "defer=%d|legacy=%d|budget=%d|threshold_q=%d|fire=false|cutover=false|json=0\n"
           % (len(props), vn, len(props) - vn, legacy, budget, threshold))
    for pid, c, rank, v in sched:
        out += "COUNCILSCHED|rank=%d|id=%s|confidence_q=%d|action=%s|fire=false|json=0\n" % (
            rank, hbp_escape(pid), c, "VERIFY" if v else "DEFER")
    return 200, out


def read_to_string(path):
    """`fs::read_to_string`: (text, None), or (None, the Rust `io::ErrorKind` text of the error)."""
    try:
        with open(path, "rb") as f:
            return f.read().decode("utf-8"), None
    except FileNotFoundError:
        return None, "entity not found"
    except IsADirectoryError:
        return None, "is a directory"
    except UnicodeDecodeError:
        return None, "invalid data"


def council_parity(vote_dir):
    """routes.rs:71-111."""
    out, ok = "", True
    for name in ("queue", "votes", "outcomes"):
        path = os.path.join(vote_dir, name + ".ndjson")
        body, kind = read_to_string(path)
        if body is None:
            ok = False
            out += "COUNCILPARITY|ledger=%s|ok=0|missing=1|error=ledger_unreadable|kind=%s|json=0\n" % (
                name, hbp_escape(kind))
            continue
        total = matched = mismatch = legacy = 0
        for line in str_lines(body):
            t = rtrim(line)
            if not t:
                continue
            stored = vq_stored_row_hash(t)
            if stored is None:
                legacy += 1
                continue
            total += 1
            try:
                got = vq_recompute(t)
            except VqErr:
                got = None
            if got == stored:
                matched += 1
            else:
                mismatch += 1
        out += ("COUNCILPARITY|ledger=%s|ok=1|missing=0|rows_with_hash=%d|match=%d|mismatch=%d|legacy=%d|json=0\n"
                % (name, total, matched, mismatch, legacy))
    return (200 if ok else 500), out


# ---------------------------------------------------------------- seeded inputs

KEYS = ["event", "kind", "actor", "verb", "target", "note", "a", "b", "z", "Z", "_x", "value", "nested",
        "list", "count", "x y", 'quote"k', "back\\k", "tab\tk", "nl\nk", "ctl\x01k", "del\x7fk",
        "ol\u00e1", "\u043a\u043b\u044e\u0447", "\u20acuro", "\U0001d11eclef", "\U0001f600", "\u4e2d\u6587", ""]
STRS = ["", "x", "FIXTURE", "ol\u00e1", 'quote " in', "back \\ slash", "tab\there", "line\nbreak", "ctl\x02",
        "del\x7f", "\u20ac", "\U0001d11e", "\U0001f600 emoji", "\u043a\u043b\u044e\u0447", "\u4e2d\u6587\u5b57",
        "|pipe|", "{brace}", "/slash/", "\u2028sep", "\ufeffbom", "\x00nul", GENESIS]

HAND = [
    b'{"n":1.50,"e":1E5,"m":-0,"z":007,"f":0.1e+2,"g":1e-7}',
    b'{"s":"\\/slash","u":"\\u0041","U":"\\u00E1","p":"\\ud834\\udd1e"}',
    b'{"lone":"\\ud800"}',
    b'{"\\ud800k":1}',
    b'{"dup":1,"dup":2,"x":{"d":1,"d":2}}',
    b'{ "sp" :\t1 , "t":[ 1 ,2 ] }',
    b'\xc2\xa0{"nbsp":1}\xe3\x80\x80',
    b'{"nan":NaN}',
    b'{"inf":Infinity}',
    b'{"a":1,}',
    b"{'a':1}",
    b"[1,2]",
    b"",
    b"   ",
    b'{"a":tru}',
    b'{"a":true}trailing',
    b'{"a":"\x01ctl"}',
    b'\xff{"a":1}',
    b'{"a":"\xff"}',
    b'{"a":1} ',
    b'{"k\\"q":1,"k\\\\b":2,"k\\u00e9":3,"k\\n":4,"k\\u00E9":5}',
    b'{"big":123456789012345678901234567890,"neg":-1.0e-10}',
    b'{"seq":"5","row_hash":7,"antecedents":"notalist","ts":12,"appended_by_daemon":null}',
    b'{"antecedents":["0000000000000000"]}',
    b'{"nested":{"row_hash":"inner"},"row_hash":"top"}',
    b'{"a":[]}',
    b"{}",
    b'{"a":{}}',
    b'{"x":-}',
    b'{"x":1.}',
    b'{"x":.5}',
    b'{"x":01.5e}',
    b'{"a":1}\r',
    b'{"ts":"2026-06-25T00:00:00.000Z","event":"FIXTURE-A","nested":{"b":2,"a":1}}',
    b'{"esc":"\\u00e1\\u00E1\\t\\"","k\\/":"v"}',
    b'{"\\u0072ow_hash":"escaped-key-row-hash"}',
]


# Float-shaped JSON number tokens, each the text Python's json.dumps writes for that float (its repr).
# They are text here: the referee never computes a float.
FLOAT_TOKENS = ["1.5", "-0.0", "0.5", "3.0", "-5.0", "1e-07", "2.5e-10", "-7.25e-08", "1e+16", "-1.5e+20",
                "0.30000000000000004", "123456.789", "-987654.3210987", "0.1", "999999.9999999999"]


def float_token(i):
    """A string marker that `dumps` replaces with FLOAT_TOKENS[i] (no key or string holds '~')."""
    return "~f%d~" % i


def dumps(obj, **kw):
    """json.dumps, then each float marker (a quoted string) replaced by its number token."""
    s = json.dumps(obj, **kw)
    for i, tok in enumerate(FLOAT_TOKENS):
        s = s.replace('"%s"' % float_token(i), tok)
    return s


def rand_str(rng):
    if rng.randrange(1000) < 600:
        return rng.choice(STRS)
    return "".join(rng.choice(STRS) for _ in range(rng.randint(1, 3)))


def rand_value(rng, depth):
    r = rng.randrange(1000)
    if r < 180:
        return rng.randint(-10 ** 6, 10 ** 6)
    if r < 240:
        return rng.randint(0, 2 ** 70)
    if r < 360:
        return float_token(rng.randrange(len(FLOAT_TOKENS)))
    if r < 440:
        return rng.choice([True, False, None])
    if r < 740 or depth >= 3:
        return rand_str(rng)
    if r < 870:
        return [rand_value(rng, depth + 1) for _ in range(rng.randint(0, 4))]
    return {rng.choice(KEYS): rand_value(rng, depth + 1) for _ in range(rng.randint(0, 4))}


def gen_cosign_payloads(rng, n):
    """Seeded payload lines (bytes) plus each line's style. Mirror-chained so some payloads carry
    the exact previous row_hash in `antecedents` (chain.rs:60-71 "present" branch)."""
    lines, styles = [], []
    head = [0, GENESIS]
    hand_at = {i * (n // len(HAND)): h for i, h in enumerate(HAND)}
    for i in range(n):
        if i in hand_at:
            b = hand_at[i]
            style = "hand"
        else:
            obj = {}
            for _ in range(rng.randint(1, 6)):
                obj[rng.choice(KEYS)] = rand_value(rng, 0)
            r = rng.randrange(1000)
            if r < 100:
                obj["seq"] = rng.choice([rng.randint(0, 99), "7", float_token(FLOAT_TOKENS.index("3.0"))])
            if rng.randrange(1000) < 100:
                obj["row_hash"] = rand_str(rng)
            r = rng.randrange(1000)
            if r < 100:
                obj["antecedents"] = [head[1]] + [rand_str(rng)]
            elif r < 180:
                obj["antecedents"] = [rand_str(rng), GENESIS]
            elif r < 220:
                obj["antecedents"] = rand_str(rng)
            if rng.randrange(1000) < 250:
                obj["ts"] = rng.choice([NOW, "2026-07-01T12:00:00.000Z", 0, rand_str(rng)])
            if rng.randrange(1000) < 80:
                obj["appended_by_daemon"] = rand_str(rng)
            style = rng.choice(["py_default", "py_compact", "py_utf8"])
            if style == "py_default":
                b = dumps(obj).encode("utf-8")
            elif style == "py_compact":
                b = dumps(obj, separators=(",", ":")).encode("utf-8")
            else:
                b = dumps(obj, ensure_ascii=False).encode("utf-8")
        lines.append(b)
        styles.append(style)
        try:
            row = parse_line(b)
            _, seq, rh, _ = compute_append(head[0], head[1], row, NOW)
            head = [seq, rh]
        except PyChainErr:
            pass
    return lines, styles


def mirror_cosign(lines):
    out, persisted = [], []
    head = [0, GENESIS]
    for i, b in enumerate(lines, 1):
        try:
            row = parse_line(b)
        except PyChainErr:
            out.append("COSIGNVEC|i=%d|parse=err|json=0" % i)
            persisted.append(None)
            continue
        row, seq, rh, prev = compute_append(head[0], head[1], row, NOW)
        line = persisted_line(row)
        out.append("COSIGNVEC|i=%d|parse=ok|seq=%d|antecedent_prev=%s|row_hash=%s|canonical_sha16=%s|persisted_sha16=%s|json=0"
                   % (i, seq, prev, rh, sha16(canonical_bytes(row)), sha16(line)))
        persisted.append((line, rh))
        head = [seq, rh]
    return out, persisted


def build_replay_ledger(rng, persisted, fixture_lines):
    rows = []
    for line, _ in persisted:
        line = line.rstrip("\n")
        r = rng.randrange(1000)
        if r < 80:
            rows.append(line.replace('": ', '":   ', 1))
        elif r < 160 and '"row_hash"' in line:
            rows.append(line.replace('"row_hash"', '"extra": 1, "row_hash"', 1))
        elif r < 220:
            k = line.rfind(', "row_hash"')
            rows.append(line[:k] + "}" if k > 0 else line)
        elif r < 250:
            rows.append(line.replace('"row_hash": "', '"row_hash": 1, "x": "', 1))
        else:
            rows.append(line)
        if rng.randrange(1000) < 30:
            rows.append(rng.choice(["", "   ", "not json", "\t", '{"a":', "[]"]))
    rows.extend(fixture_lines)
    rows.append('{"seq": 99999999999999999999, "row_hash": "overflow"}')
    rows.append('{"seq": 1.5, "row_hash": "float"}')
    rows.append('{"seq": "123456", "row_hash": "string-seq"}\r')
    rows.append('{"seq": 100000, "row_hash": "q\\"\u00e9\\u00e9\\t|end"}')
    rows.append('{"seq": 100000, "row_hash": "same-seq-later"}\r')  # CRLF line end, as on the live chain
    return ("\n".join(rows) + "\n").encode("utf-8")


def mirror_replay(ledger):
    out = []
    lines = ledger.split(b"\n")
    if lines and lines[-1] == b"":
        lines.pop()
    for i, seg in enumerate(lines, 1):
        line = seg.decode("utf-8")
        try:
            row = parse_line(seg)
            st = row_row_hash(row)
            rc = sha16(canonical_bytes(row))
            cos = ("parse=ok|stored=none|recompute=%s" % rc) if st is None else (
                "parse=ok|stored_hex=%s|recompute=%s" % (hexs(st), rc))
        except PyChainErr:
            cos = "parse=err"
        rc2, st2 = vq_cols(line, "vq_")
        out.append("REPLAYVEC|i=%d|%s|%s|%s|json=0" % (i, cos, rc2, st2))
    return out + route_vectors(ledger)


def gen_schedule_ledger(rng, n):
    nums = ["0", "1", "0.5", "0.25", "0.125", "0.12345", "0.9995", "0.9994", "0.0005", "0.0004", "1.5", "-0.2",
            "+0.7", "0.", ".5", "-", "--5", "1e-1", "0.5E0", "2", "4294967296", "4294967295", "007", "0.1.2",
            '"0.5"', "null", "true", "0.999", "0.0", "1.000", "0.30000000000000004", "1-2"]
    ids = ["hi", "lo", "x|y", "{b}", "tab\\tid", "ol\u00e1", "q\\\"q", "", "same", "same", "Z", "a", "\U0001f600"]
    lines = []
    for _ in range(n):
        r = rng.randrange(1000)
        if r < 50:
            lines.append(rng.choice(["", "  ", "not json", "{}", '{"id":"no-score"}', '{"score":0.5}']))
            continue
        parts = []
        if rng.randrange(1000) < 150:
            parts.append('"note":"%s"' % rng.choice(["score", "id", "genius", "risk"]))
        if rng.randrange(1000) < 80:
            parts.append('"nested":{"score":%s}' % rng.choice(nums))
        parts.append('"id"%s:%s"%s"' % (rng.choice(["", " "]), rng.choice(["", " "]), rng.choice(ids)))
        for key, per_mille in (("score", 930), ("genius", 600), ("risk", 500)):
            if rng.randrange(1000) < per_mille:
                parts.append('"%s"%s:%s%s' % (key, rng.choice(["", " ", "\u00a0"]), rng.choice(["", " "]), rng.choice(nums)))
        rng.shuffle(parts)
        lines.append("{" + ",".join(parts) + "}")
    return "\n".join(lines) + "\n"


def mirror_schedule(body, budget, threshold):
    out = []
    for i, line in enumerate(str_lines(body), 1):
        t = rtrim(line)
        if not t:
            out.append("PROPOSALVEC|i=%d|blank=1|json=0" % i)
            continue
        p = parse_proposal(t)
        if p is None:
            out.append("PROPOSALVEC|i=%d|some=0|json=0" % i)
        else:
            out.append("PROPOSALVEC|i=%d|some=1|id_hex=%s|score_q=%d|genius_q=%d|risk_q=%d|json=0" % ((i, hexs(p[0])) + p[1:]))
    code, rows = render_schedule(body, budget, threshold)
    out.append("SCHEDSTATUS|code=%d|json=0" % code)
    out.extend(rows.rstrip("\n").split("\n"))
    out.append("SCHEDROUTE|same=1|json=0")
    return out


def gen_vote_ledger(rng, n):
    rows, prev = [], GENESIS
    for i in range(n):
        obj = {"vote_id": "v%d" % rng.randint(0, 40), "antecedents": prev}
        for _ in range(rng.randint(0, 4)):
            obj[rng.choice(KEYS)] = rand_value(rng, 1)
        style = rng.choice(["py_default", "py_compact", "py_utf8", "py_sorted"])
        if style == "py_default":
            base = dumps(obj)
        elif style == "py_compact":
            base = dumps(obj, separators=(",", ":"))
        elif style == "py_utf8":
            base = dumps(obj, ensure_ascii=False)
        else:
            base = dumps(obj, sort_keys=True)
        h = vq_recompute(base)
        sep = "," if style == "py_compact" else ", "
        line = base[:-1] + '%s"row_hash"%s"%s"}' % (sep, ":" if style == "py_compact" else ": ", h)
        r = rng.randrange(1000)
        if r < 70:
            line = line.replace('"vote_id"', '"vote_id_x"', 1)
        elif r < 120:
            line = base
        elif r < 150:
            line = rng.choice(["not json", "[1]", '{"row_hash": {"x": 1}}', '{"row_hash": 12345}',
                               '{"a": 1, "a": 2, "row_hash": "dup"}', '{"\\u0072ow_hash": "esc"}', '{"x":'])
        elif r < 210:
            # \r and \t between tokens (vote canon.rs:53 `ws`): after `{`, before `:` and before the last `}`
            line = "{\r" + line[1:-1].replace('"vote_id":', '"vote_id"\r\t:', 1) + "\r}"
        rows.append(line)
        prev = h
        if rng.randrange(1000) < 30:
            rows.append(rng.choice(["", "  ", "\t"]))
    return "\n".join(rows) + "\n"


def mirror_parity(vote_dir):
    code, rows = council_parity(vote_dir)
    out = ["PARITYSTATUS|code=%d|json=0" % code] + rows.rstrip("\n").split("\n")
    for name in ("queue", "votes", "outcomes"):
        body, _ = read_to_string(os.path.join(vote_dir, name + ".ndjson"))
        if body is None:
            out.append("VQVEC|ledger=%s|missing=1|json=0" % name)
            continue
        for i, line in enumerate(str_lines(body), 1):
            t = rtrim(line)
            if not t:
                continue
            rc, st = vq_cols(t, "")
            out.append("VQVEC|ledger=%s|i=%d|%s|%s|json=0" % (name, i, st, rc))
    return out


# ---------------------------------------------------------------- measurement (cold lane)

def py_recipe(line, ensure_ascii):
    row = json.loads(line)
    row.pop("row_hash", None)
    return sha16(json.dumps(row, sort_keys=True, ensure_ascii=ensure_ascii))


def tokens(value, keys, strs, nums, orders, decode_key):
    """Walk a parsed value: keys as the canon emits them, string and other scalar tokens, and for
    each object whether the canon's key order differs from the order of the decoded keys."""
    kind, body = value
    if kind == SC:
        (strs if body.startswith('"') else nums).append(body)
    elif kind == ARR:
        for v in body:
            tokens(v, keys, strs, nums, orders, decode_key)
    else:
        ks = [f[0] for f in body]
        keys.extend(ks)
        canon_order = sorted(range(len(ks)), key=lambda i: ks[i].encode("utf-8"))
        py_order = sorted(range(len(ks)), key=lambda i: decode_key(ks[i]))
        orders.append(canon_order != py_order)
        for f in body:
            tokens(f[1], keys, strs, nums, orders, decode_key)


def differs(tok, ensure_ascii):
    try:
        return json.dumps(json.loads(tok), ensure_ascii=ensure_ascii) != tok
    except ValueError:
        return True


def attribute(rows_in, key_form, excluded_key):
    """rows_in: (style, line, rust_hash, parsed value, decode_key). For each style: how many rows
    equal the python recipe, and for the rows that do not, which token class differs. key_form maps
    a parsed key to the text the canon emits for it; excluded_key is the canon's top-level row_hash
    key (cosign canon.rs:19-28 compares the decoded key, vote canon.rs:198 the raw token)."""
    by = {}
    for style, line, rh, parsed, decode_key in rows_in:
        m = by.setdefault(style, {"rows": 0, "ok": 0, True: [0, 0, 0, 0, 0, 0], False: [0, 0, 0, 0, 0, 0], "chars": set()})
        m["rows"] += 1
        try:
            hashes = {True: py_recipe(line, True), False: py_recipe(line, False)}
        except ValueError:
            continue
        m["ok"] += 1
        keys, strs, nums, orders = [], [], [], []
        top = (parsed[0], [f for f in parsed[1] if f[0] != excluded_key])
        tokens(top, keys, strs, nums, orders, decode_key)
        for ea in (True, False):
            c = m[ea]
            if hashes[ea] == rh:
                c[0] += 1
                continue
            kd = [k for k in keys if key_form(k) != json.dumps(decode_key(k), ensure_ascii=ea)]
            vd = any(differs(t, ea) for t in strs)
            nd = any(differs(t, ea) for t in nums)
            od = any(orders)
            c[1] += int(bool(kd))
            c[2] += int(vd)
            c[3] += int(nd)
            c[4] += int(od)
            c[5] += int(not (kd or vd or nd or od))
            if ea and key_form is py_escape_string:
                for k in kd:
                    for ch in k:
                        if py_escape_string(ch) != json.dumps(ch, ensure_ascii=True):
                            m["chars"].add("U+%04X" % ord(ch))
    return by


def measure_rows(ledger, by):
    rows = []
    for style in sorted(by):
        m = by[style]
        t, f = m[True], m[False]
        rows.append(
            "MEASURE|ledger=%s|style=%s|rows=%d|python_loads_ok=%d|eq_dumps_ensure_ascii_true=%d|eq_dumps_ensure_ascii_false=%d|json=0"
            % (ledger, style, m["rows"], m["ok"], t[0], f[0]))
        for ea, c in ((True, t), (False, f)):
            rows.append(
                "MEASUREDIFF|ledger=%s|style=%s|vs=ensure_ascii_%s|rows_differ=%d|key_tokens=%d|string_tokens=%d|number_tokens=%d|key_order=%d|unattributed=%d%s|json=0"
                % (ledger, style, "true" if ea else "false", m["ok"] - c[0], c[1], c[2], c[3], c[4], c[5],
                   ("|key_chars=" + ",".join(sorted(m["chars"]))) if ea and m["chars"] else ""))
    return rows


def measure(persisted, styles):
    rows_in = []
    for item, style in zip(persisted, styles):
        if item is None:
            continue
        line, rh = item
        rows_in.append((style, line, rh, (OBJ, parse_line(line.encode("utf-8"))), lambda k: k))
    return measure_rows("cosign", attribute(rows_in, py_escape_string, "row_hash"))


def measure_vote(body_by_style):
    rows_in = []
    for style in sorted(body_by_style):
        for base in body_by_style[style]:
            parsed = VqP(base.encode("utf-8")).value()
            rows_in.append((style, base, vq_recompute(base), parsed, json.loads))
    return measure_rows("vote", attribute(rows_in, lambda k: k, '"row_hash"'))


def gen_vote_measure_set(rng, n):
    out = {}
    for _ in range(n):
        obj = {"vote_id": "v%d" % rng.randint(0, 40), "antecedents": GENESIS}
        for _ in range(rng.randint(0, 4)):
            obj[rng.choice(KEYS)] = rand_value(rng, 1)
        style = rng.choice(["py_default", "py_compact", "py_utf8", "py_sorted"])
        if style == "py_default":
            base = dumps(obj)
        elif style == "py_compact":
            base = dumps(obj, separators=(",", ":"))
        elif style == "py_utf8":
            base = dumps(obj, ensure_ascii=False)
        else:
            base = dumps(obj, sort_keys=True)
        out.setdefault(style, []).append(base)
    return out


# ---------------------------------------------------------------- extracts

def check_extracts():
    bad = 0
    n = 0
    with open(os.path.join(ROOT, "EXTRACTS.sha256"), encoding="utf-8") as f:
        for row in f:
            h, _, spec = row.rstrip("\n").split(" ", 2)
            spec = spec.strip()
            path, rng_ = spec.split(" ", 1)[1].rsplit(":", 1)
            a, b = (int(x) for x in rng_.split("-"))
            local = os.path.join(ROOT, path[len("servers/"):])
            with open(local, "rb") as g:
                lines = g.read().split(b"\n")
            text = b"\n".join(lines[a - 1:b]) + b"\n"
            n += 1
            if hashlib.sha256(text).hexdigest() != h:
                bad += 1
                print("EXTRACT|mismatch|%s" % spec)
    return n, bad


# ---------------------------------------------------------------- driver

def run(vec, *args):
    r = subprocess.run([vec] + list(args), stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if r.returncode != 0:
        sys.exit("vectors %s failed: %s" % (args[0], r.stderr.decode("utf-8", "replace")))
    return r.stdout.decode("utf-8").rstrip("\n").split("\n")


def compare(name, got, want):
    if got == want:
        return 0
    for i, (g, w) in enumerate(zip(got, want)):
        if g != w:
            print("DIFF|mode=%s|line=%d\n  rust:   %s\n  mirror: %s" % (name, i + 1, g, w))
            break
    else:
        print("DIFF|mode=%s|rust_lines=%d|mirror_lines=%d" % (name, len(got), len(want)))
    return 1


def hex_field(row, key):
    """The text of a `<key>_hex=` / `<key>=` field of a vectors row, decoded; None when absent."""
    for part in row.split("|"):
        if part.startswith(key + "_hex="):
            return bytes.fromhex(part[len(key) + 5:]).decode("utf-8")
        if part.startswith(key + "="):
            return part[len(key) + 1:]
    return None


def live(vec, ledger_path, write):
    """Replay one operator ledger, read in place, through vectors `replay` and the mirror. Only counts
    and the ledger's sha256 are printed or written; a difference is reported by line number only."""
    with open(ledger_path, "rb") as f:
        data = f.read()
    with tempfile.TemporaryDirectory(prefix="cosign-council-live-") as tmp:
        got = run(vec, "replay", ledger_path, os.path.join(tmp, "shadow.ndjson"))
    want = mirror_replay(data)
    fails = 0
    if got != want:
        fails += 1
        first = next((i for i, (g, w) in enumerate(zip(got, want)) if g != w), min(len(got), len(want)))
        print("DIFF|mode=live|line=%d|rust_lines=%d|mirror_lines=%d|json=0" % (first + 1, len(got), len(want)))
    rows = [x for x in got if x.startswith("REPLAYVEC|")]
    cos_h = [x for x in rows if "|stored_hex=" in x]
    vq_h = [x for x in rows if "|vq_stored_hex=" in x]
    checked, matched, mismatches, legacy = verify_counts(data)
    head = resume_from(data)
    receipt = [
        "LIVECHAIN|ledger_sha256=%s|bytes=%d|lines=%d|parse_err=%d|lane=cold|json=0"
        % (hashlib.sha256(data).hexdigest(), len(data), len(rows), sum(1 for x in rows if "|parse=err|" in x)),
        "LIVEVERIFY|route=/api/cosign/verify|checked=%d|matched=%d|mismatches=%d|legacy=%d|json=0"
        % (checked, matched, mismatches, legacy),
        "LIVEHEAD|route=/api/cosign/head|seq=%s|json=0" % ("none" if head is None else head[0]),
        "LIVECANON|canon=cosign_py_parity|rows_with_row_hash=%d|recompute_equal=%d|json=0"
        % (len(cos_h), sum(1 for x in cos_h if hex_field(x, "stored") == hex_field(x, "recompute"))),
        "LIVECANON|canon=vote_quorum|rows_with_row_hash=%d|recompute_equal=%d|json=0"
        % (len(vq_h), sum(1 for x in vq_h if hex_field(x, "vq_stored") == hex_field(x, "vq_recompute"))),
        "LIVEVERDICT|mirror_equals_rust=%d|json=0" % (1 if fails == 0 else 0),
    ]
    text = "\n".join(receipt) + "\n"
    if write:
        with open(LIVE_RECEIPT, "w", encoding="utf-8", newline="") as f:
            f.write(text)
    else:
        with open(LIVE_RECEIPT, encoding="utf-8") as f:
            pinned = f.read()
        if pinned != text:
            fails += 1
            print("RECEIPT|file=LIVE-CHAIN.hbp|equal=0|json=0")
    print(text, end="")
    print("REFEREE|live=%s|json=0" % ("PASS" if fails == 0 else "FAIL"))
    sys.exit(1 if fails else 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vectors", required=True)
    ap.add_argument("--live-ledger")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--check", action="store_true")
    g.add_argument("--write", action="store_true")
    a = ap.parse_args()
    vec = os.path.abspath(a.vectors)
    if a.live_ledger:
        live(vec, a.live_ledger, a.write)
    rng = random.Random(SEED)
    fails = 0
    receipt = ["REFEREE|dir=ledger/cosign-council|upstream=federation-1024@dc1da1a9|seed=%d|lane=cold|json=0" % SEED]

    n_ext, bad_ext = check_extracts()
    fails += bad_ext
    receipt.append("EXTRACTS|ranges=%d|json=0" % n_ext)

    with open(os.path.join(ROOT, "cosign-serve/fixtures/daemon-row-hash.ndjson"), encoding="utf-8") as f:
        fixture_lines = f.read().rstrip("\n").split("\n")

    with tempfile.TemporaryDirectory(prefix="cosign-council-referee-") as tmp:
        # 1. cosign payloads -> compute_append chain
        lines, styles = gen_cosign_payloads(rng, 2400)
        pay = os.path.join(tmp, "payloads.ndjson")
        with open(pay, "wb") as f:
            f.write(b"\n".join(lines) + b"\n")
        persisted_out = os.path.join(tmp, "persisted.ndjson")
        got = run(vec, "cosign", pay, NOW, persisted_out)
        want, persisted = mirror_cosign(lines)
        fails += compare("cosign", got, want)
        with open(persisted_out, encoding="utf-8") as f:
            rust_persisted = f.read()
        if rust_persisted != "".join(p[0] for p in persisted if p is not None):
            fails += 1
            print("DIFF|mode=cosign-persisted")
        n_ok = sum(1 for p in persisted if p is not None)
        receipt.append("CASES|mode=cosign|lines=%d|parse_ok=%d|parse_err=%d|rust_sha256=%s|json=0"
                       % (len(lines), n_ok, len(lines) - n_ok, hashlib.sha256("\n".join(got).encode()).hexdigest()))

        # 2. replay: canon checks per row + verify/head/tail/health/append routes
        ledger = build_replay_ledger(rng, [p for p in persisted if p is not None], fixture_lines)
        lp = os.path.join(tmp, "ledger.ndjson")
        with open(lp, "wb") as f:
            f.write(ledger)
        got = run(vec, "replay", lp, os.path.join(tmp, "shadow.ndjson"))
        want = mirror_replay(ledger)
        fails += compare("replay", got, want)
        receipt.append("CASES|mode=replay|rows=%d|rust_sha256=%s|json=0"
                       % (sum(1 for x in got if x.startswith("REPLAYVEC")), hashlib.sha256("\n".join(got).encode()).hexdigest()))

        # 3. loop-ledger producer -> confidence_schedule, several budgets / thresholds
        body = gen_schedule_ledger(rng, 900)
        sp = os.path.join(tmp, "loop.ndjson")
        with open(sp, "w", encoding="utf-8", newline="") as f:
            f.write(body)
        for budget, threshold in ((8, 500), (1, 0), (0, 500), (3, 1000), (100, 250)):
            got = run(vec, "schedule", sp, str(budget), str(threshold))
            want = mirror_schedule(body, budget, threshold)
            fails += compare("schedule-%d-%d" % (budget, threshold), got, want)
            receipt.append("CASES|mode=schedule|budget=%d|threshold_q=%d|lines=%d|rust_sha256=%s|json=0"
                           % (budget, threshold, len(str_lines(body)), hashlib.sha256("\n".join(got).encode()).hexdigest()))

        # 4. vote-ledger parity route + canon per row
        dirs = []
        full = os.path.join(tmp, "votes-full")
        os.mkdir(full)
        for name in ("queue", "votes", "outcomes"):
            with open(os.path.join(full, name + ".ndjson"), "w", encoding="utf-8", newline="") as f:
                f.write(gen_vote_ledger(rng, 260))
        dirs.append(("full", full))
        part = os.path.join(tmp, "votes-missing-outcomes")
        os.mkdir(part)
        for name in ("queue", "votes"):
            with open(os.path.join(part, name + ".ndjson"), "w", encoding="utf-8", newline="") as f:
                f.write(gen_vote_ledger(rng, 20))
        dirs.append(("missing_outcomes", part))
        empty = os.path.join(tmp, "votes-empty")
        os.mkdir(empty)
        for name in ("queue", "votes", "outcomes"):
            open(os.path.join(empty, name + ".ndjson"), "w").close()
        dirs.append(("empty", empty))
        fixdir = os.path.join(tmp, "votes-cosign-fixture")
        os.mkdir(fixdir)
        for name in ("queue", "votes", "outcomes"):
            with open(os.path.join(fixdir, name + ".ndjson"), "w", encoding="utf-8", newline="") as f:
                f.write("\n".join(fixture_lines) + "\n")
        dirs.append(("cosign_fixture", fixdir))
        # read_to_string errors other than NotFound (routes.rs:100-107 prints `e.kind()`)
        bad = os.path.join(tmp, "votes-invalid-utf8")
        os.mkdir(bad)
        for name in ("queue", "votes", "outcomes"):
            body = gen_vote_ledger(rng, 12).encode("utf-8")
            if name == "votes":
                body = body[:len(body) // 2] + b"\xff" + body[len(body) // 2:]
            with open(os.path.join(bad, name + ".ndjson"), "wb") as f:
                f.write(body)
        dirs.append(("votes_invalid_utf8", bad))
        isdir = os.path.join(tmp, "votes-is-dir")
        os.mkdir(isdir)
        os.mkdir(os.path.join(isdir, "votes.ndjson"))
        for name in ("queue", "outcomes"):
            with open(os.path.join(isdir, name + ".ndjson"), "w", encoding="utf-8", newline="") as f:
                f.write(gen_vote_ledger(rng, 12))
        dirs.append(("votes_is_dir", isdir))
        for label, d in dirs:
            got = run(vec, "parity", d)
            want = mirror_parity(d)
            fails += compare("parity-" + label, got, want)
            receipt.append("CASES|mode=parity|dir=%s|vq_rows=%d|rust_sha256=%s|json=0"
                           % (label, sum(1 for x in got if x.startswith("VQVEC|") and "missing" not in x),
                              hashlib.sha256("\n".join(got).encode()).hexdigest()))
            for x in got:
                if x.startswith("COUNCILPARITY|"):
                    receipt.append("PARITY|dir=%s|%s" % (label, x[len("COUNCILPARITY|"):]))

        # 5. fixture row hashes (upstream's shipped vectors) and the python recipe on them
        for line in fixture_lines:
            row = parse_line(line.encode("utf-8"))
            stored = row_row_hash(row)
            receipt.append("FIXTURE|seq=%d|stored=%s|py_parity=%s|vote_canon=%s|dumps_ensure_ascii_true=%s|dumps_ensure_ascii_false=%s|json=0"
                           % (row_seq_if_integer(row), stored, sha16(canonical_bytes(row)), vq_recompute(line),
                              py_recipe(line, True), py_recipe(line, False)))

        # 6. measurement: Rust shadow canon / vote canon vs python json.dumps(sort_keys=True)
        receipt.extend(measure(persisted, styles))
        receipt.extend(measure_vote(gen_vote_measure_set(rng, 1200)))

    receipt.append("VERDICT|mirror_equals_rust=%d|json=0" % (1 if fails == 0 else 0))
    text = "\n".join(receipt) + "\n"
    if a.write:
        with open(RECEIPT, "w", encoding="utf-8", newline="") as f:
            f.write(text)
        print(text, end="")
        sys.exit(1 if fails else 0)
    with open(RECEIPT, encoding="utf-8") as f:
        pinned = f.read()
    if pinned != text:
        fails += 1
        p, t = pinned.split("\n"), text.split("\n")
        for i, (x, y) in enumerate(zip(p, t)):
            if x != y:
                print("RECEIPT|line=%d\n  pinned: %s\n  now:    %s" % (i + 1, x, y))
                break
        else:
            print("RECEIPT|pinned_lines=%d|now_lines=%d" % (len(p), len(t)))
    print(text, end="")
    print("REFEREE|check=%s|json=0" % ("PASS" if fails == 0 else "FAIL"))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
