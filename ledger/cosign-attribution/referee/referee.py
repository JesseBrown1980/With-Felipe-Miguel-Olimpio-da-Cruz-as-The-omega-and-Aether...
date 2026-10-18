#!/usr/bin/env python3
"""Cold-lane referee for ledger/cosign-attribution (Claude's addition). Python stdlib only; run with `python3 -I`.

Two independent parts, then a byte-for-byte comparison with the Rust `cosign-attribution` output:

1. DEFAULT counts: a line-by-line mirror of the vendored Rust the default verifier runs
   (federation-1024 @ dc1da1a9): cosign-ledger src/py_parity/json_tok.rs (parse_line, row_hash,
   seq_if_integer), canon.rs (canonical_bytes, py_escape_string, sha16) and cosign-serve
   src/routes.rs:120-142 (the verify loop over BufRead::lines + map_while(Result::ok)).
2. ATTRIBUTION: over the row the json_tok.rs mirror read (py_row), with Python's own json module
   and hashlib: each string token is decoded by CPython's scanner (json.loads of the token), every
   other token is kept as stored (no number is re-formatted), and each formula is the compact
   serialization with json.encoder.encode_basestring (non-ASCII kept) or
   json.encoder.encode_basestring_ascii (non-ASCII escaped), sha256 via hashlib.

It also checks that its encoder equals json.dumps(..., separators=(",", ":")) on every fixture row
whose numbers are integer tokens Python writes back unchanged (DUMPS row), and that eight deliberate
mutations of the referee each change the output on the fixtures (MUTATION rows). Integer only.

  referee.py --bin <cosign-attribution> --check            synthetic fixtures; compare with REFEREE.hbp
  referee.py --bin <cosign-attribution> --write            synthetic fixtures; rewrite REFEREE.hbp
  referee.py --bin <cosign-attribution> --chain <file>     one more file (a private ledger): compares
                                                           row for row; prints counts only
"""

import argparse
import hashlib
import json
import os
import random
import subprocess
import sys
import tempfile
from json.encoder import encode_basestring, encode_basestring_ascii

HERE = os.path.dirname(os.path.abspath(__file__))
RECEIPT = os.path.join(HERE, "REFEREE.hbp")
SEED = 20261017
B = chr(92)
ANCHOR = "ASOLARIA-COSIGN-CHAIN-SINGLE-WRITER-DAEMON-PID-2026-05-23"  # py_parity mod.rs:16
DEFAULT_VERIFIER = "federation-1024@dc1da1a9 servers/cosign-serve/src/routes.rs:99-152"
LABEL = "Claude's addition, not upstream, not the default verifier"
FORMULAS = [
    ("sorted_compact_kept", True, False),
    ("original_compact_kept", False, False),
    ("sorted_compact_escaped", True, True),
    ("original_compact_escaped", False, True),
]
MUTATIONS = [
    "del_raw_in_escaped",      # U+007F left as it is in the escaped form (canon.rs:90-94 behaviour)
    "normalize_numbers",       # number tokens re-written (exponent lower case, '+' dropped, -0 as 0)
    "escaped_before_kept",     # try the escaped forms first
    "utf16_key_order",         # sort keys by UTF-16 code units instead of code points
    "ignore_daemon_key",       # no daemon_row_mismatch class
    "surrogatepass_kept",      # kept form of an unpaired surrogate encoded with surrogatepass
    "digest_prefix_any_len",   # row_hash compared with the sha256 hex prefix of its own length
    "json_loads_line",         # formulas only for a line json.loads reads (refuses 01, a replaced \q or 01)
]
# The mirror recurses once per nesting level, as json_tok.rs does; the Rust debug binary reads rows
# up to about 13,400 levels on an 8 MiB stack (README, "Nesting depth"), so the limit is set well above.
RECURSION_LIMIT = 100000

# Rust `char::is_whitespace` (Unicode White_Space), which `str::trim` uses (routes.rs:125, json_tok.rs:27).
RUST_WS = "".join(chr(c) for c in [9, 10, 11, 12, 13, 32, 0x85, 0xA0, 0x1680]
                  + list(range(0x2000, 0x200B)) + [0x2028, 0x2029, 0x202F, 0x205F, 0x3000])


def rtrim(s):
    return s.strip(RUST_WS)


def sha16(s):
    """canon.rs:8-17."""
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


def bufread_lines(data):
    """BufRead::lines (one \\r dropped before each \\n) with map_while(Result::ok): ends at invalid UTF-8."""
    out, i = [], 0
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
            return out, True
    return out, False


# ------------------------------------------------------------------ mirror of json_tok.rs

class ParseErr(Exception):
    pass


SC, ARR, OBJ = "sc", "arr", "obj"
HEX = "0123456789abcdefABCDEF"


class Tok:
    """json_tok.rs:84-251 `Parser`, over the bytes of the trimmed str."""

    def __init__(self, b):
        self.b, self.i = b, 0

    def peek(self):
        return self.b[self.i] if self.i < len(self.b) else None

    def bump(self):
        c = self.peek()
        if c is not None:
            self.i += 1
        return c

    def ws(self):
        while self.peek() in (32, 10, 13, 9):
            self.i += 1

    def expect(self, want):
        if self.bump() != want:
            raise ParseErr()

    def value(self):
        self.ws()
        c = self.peek()
        if c == 0x7B:
            return self.obj()
        if c == 0x5B:
            return self.arr()
        if c == 0x22:
            return (SC, self.string())
        if c is not None and (c == 0x2D or 0x30 <= c <= 0x39):
            return (SC, self.number())
        for kw in (b"true", b"false", b"null"):
            if c == kw[0]:
                if self.b.startswith(kw, self.i):
                    self.i += len(kw)
                    return (SC, kw.decode())
                raise ParseErr()
        raise ParseErr()

    def obj(self):
        self.expect(0x7B)
        fields = []
        self.ws()
        if self.peek() == 0x7D:
            self.i += 1
            return (OBJ, fields)
        while True:
            self.ws()
            key = string_scalar_value(self.string())
            if key is None:
                raise ParseErr()
            self.ws()
            self.expect(0x3A)
            v = self.value()
            for f in fields:
                if f[0] == key:
                    f[1] = v
                    break
            else:
                fields.append([key, v])
            self.ws()
            c = self.bump()
            if c == 0x2C:
                continue
            if c == 0x7D:
                return (OBJ, fields)
            raise ParseErr()

    def arr(self):
        self.expect(0x5B)
        values = []
        self.ws()
        if self.peek() == 0x5D:
            self.i += 1
            return (ARR, values)
        while True:
            values.append(self.value())
            self.ws()
            c = self.bump()
            if c == 0x2C:
                continue
            if c == 0x5D:
                return (ARR, values)
            raise ParseErr()

    def digits(self):
        start = self.i
        while self.peek() is not None and 0x30 <= self.peek() <= 0x39:
            self.i += 1
        if self.i == start:
            raise ParseErr()

    def number(self):
        start = self.i
        if self.peek() == 0x2D:
            self.i += 1
        self.digits()
        if self.peek() == 0x2E:
            self.i += 1
            self.digits()
        if self.peek() in (0x65, 0x45):
            self.i += 1
            if self.peek() in (0x2B, 0x2D):
                self.i += 1
            self.digits()
        return self.b[start:self.i].decode()

    def string(self):
        start = self.i
        self.expect(0x22)
        escaped = False
        while True:
            c = self.bump()
            if c is None:
                raise ParseErr()
            if escaped:
                escaped = False
            elif c == 0x5C:
                escaped = True
            elif c == 0x22:
                return self.b[start:self.i].decode("utf-8")
            elif c <= 0x1F:
                raise ParseErr()


def take_hex4(s, i):
    if i + 4 > len(s) or any(h not in HEX for h in s[i:i + 4]):
        raise ParseErr()
    return int(s[i:i + 4], 16)


def decode_json_string(s):
    """json_tok.rs:253-306 (decode_json_string, take_hex4)."""
    out, i = [], 0
    simple = {'"': '"', B: B, "/": "/", "b": chr(8), "f": chr(12), "n": chr(10), "r": chr(13), "t": chr(9)}
    while i < len(s):
        ch = s[i]
        i += 1
        if ch != B:
            out.append(ch)
            continue
        if i >= len(s):
            raise ParseErr()
        e = s[i]
        i += 1
        if e in simple:
            out.append(simple[e])
        elif e == "u":
            v = take_hex4(s, i)
            i += 4
            if 0xD800 <= v <= 0xDBFF:
                if s[i:i + 2] != B + "u":
                    raise ParseErr()
                lo = take_hex4(s, i + 2)
                i += 6
                if not 0xDC00 <= lo <= 0xDFFF:
                    raise ParseErr()
                out.append(chr(0x10000 + (((v - 0xD800) << 10) | (lo - 0xDC00))))
            elif 0xDC00 <= v <= 0xDFFF:
                raise ParseErr()
            else:
                out.append(chr(v))
        else:
            raise ParseErr()
    return "".join(out)


def string_scalar_value(raw):
    """json_tok.rs:75-80."""
    if not (raw.startswith('"') and raw.endswith('"')):
        return None
    try:
        return decode_json_string(raw[1:len(raw) - 1])
    except ParseErr:
        return None


def parse_line(line):
    """json_tok.rs:25-37 on the line as a str. Returns the PyRow field list."""
    t = Tok(rtrim(line).encode("utf-8"))
    v = t.value()
    t.ws()
    if t.i != len(t.b) or v[0] != OBJ:
        raise ParseErr()
    return v[1]


def row_get(row, key):
    for k, v in row:
        if k == key:
            return v
    return None


def row_hash(row):
    v = row_get(row, "row_hash")
    return string_scalar_value(v[1]) if v is not None and v[0] == SC else None


def seq_if_integer(row):
    v = row_get(row, "seq")
    if v is None or v[0] != SC or not v[1] or any(c not in "0123456789" for c in v[1]):
        return None
    n = int(v[1])
    return n if n <= 0xFFFFFFFFFFFFFFFF else None


# ------------------------------------------------------------------ mirror of canon.rs

def py_escape_string(s):
    """canon.rs:77-105."""
    out = ['"']
    short = {'"': B + '"', B: B + B, chr(8): B + "b", chr(9): B + "t", chr(10): B + "n", chr(12): B + "f", chr(13): B + "r"}
    for ch in s:
        c = ord(ch)
        if ch in short:
            out.append(short[ch])
        elif c <= 0x1F or 0x80 <= c <= 0xFFFF:
            out.append(B + "u%04x" % c)
        elif c < 0x10000:
            out.append(ch)
        else:
            v = c - 0x10000
            out.append(B + "u%04x" % (0xD800 + ((v >> 10) & 0x3FF)) + B + "u%04x" % (0xDC00 + (v & 0x3FF)))
    out.append('"')
    return "".join(out)


def value_bytes(v, sort_keys):
    kind, body = v
    if kind == SC:
        return body
    if kind == ARR:
        return "[" + ", ".join([value_bytes(x, sort_keys) for x in body]) + "]"
    return object_bytes(body, sort_keys)


def object_bytes(fields, sort_keys):
    if sort_keys:
        fields = sorted(fields, key=lambda f: f[0].encode("utf-8"))
    return "{" + ", ".join([py_escape_string(k) + ": " + value_bytes(v, sort_keys) for k, v in fields]) + "}"


def canonical_bytes(row):
    """canon.rs:19-28."""
    return object_bytes([f for f in row if f[0] != "row_hash"], True)


# ------------------------------------------------------------------ attribution with Python's json

class Raw:
    __slots__ = ("tok",)

    def __init__(self, tok):
        self.tok = tok


def refuse(tok):
    raise ValueError("refused " + tok)


def py_read(line):
    """The row as json.loads reads it (number tokens kept), without its top-level row_hash; None if refused.
    Used by the fixture generator, the DUMPS check and the json_loads_line mutation."""
    try:
        obj = json.loads(rtrim(line), parse_int=Raw, parse_float=Raw, parse_constant=refuse)
    except (ValueError, RecursionError):
        return None
    obj.pop("row_hash", None)
    return obj


def py_value(v):
    kind, body = v
    if kind == SC:
        return json.loads(body) if body.startswith('"') else Raw(body)
    if kind == ARR:
        return [py_value(x) for x in body]
    return {k: py_value(x) for k, x in body}


def py_row(row):
    """The row the mirror read (json_tok.rs:25-37), without its top-level row_hash: each string token
    decoded by CPython's scanner, every other token kept as stored; None when a string does not decode."""
    try:
        return {k: py_value(v) for k, v in row if k != "row_hash"}
    except ValueError:
        return None


def utf16_units(s):
    return s.encode("utf-16-be", "surrogatepass")


def enc(o, sort, asc, mut):
    if isinstance(o, dict):
        items = list(o.items())
        if sort:
            items.sort(key=(lambda kv: utf16_units(kv[0])) if mut == "utf16_key_order" else (lambda kv: kv[0]))
        return "{" + ",".join([enc(k, sort, asc, mut) + ":" + enc(v, sort, asc, mut) for k, v in items]) + "}"
    if isinstance(o, list):
        return "[" + ",".join([enc(v, sort, asc, mut) for v in o]) + "]"
    if isinstance(o, str):
        if not asc:
            return encode_basestring(o)
        r = encode_basestring_ascii(o)
        return r.replace(B + "u007f", chr(0x7F)) if mut == "del_raw_in_escaped" else r
    if isinstance(o, Raw):
        if mut == "normalize_numbers":
            t = o.tok.replace("E", "e").replace("e+", "e")
            return "0" if t == "-0" else t
        return o.tok
    if o is True:
        return "true"
    if o is False:
        return "false"
    if o is None:
        return "null"
    raise TypeError(type(o))


def digest_hex(s, full, mut):
    b = s.encode("utf-8", "surrogatepass" if mut == "surrogatepass_kept" else "strict")
    h = hashlib.sha256(b).hexdigest()
    return h if full else h[:16]


def first_formula(obj, disk, full, mut):
    if obj is None:
        return None
    order = FORMULAS[2:] + FORMULAS[:2] if mut == "escaped_before_kept" else FORMULAS
    for name, srt, asc in order:
        try:
            h = digest_hex(enc(obj, srt, asc, mut), full, mut)
        except UnicodeEncodeError:
            continue
        if mut == "digest_prefix_any_len":
            h = hashlib.sha256(enc(obj, srt, asc, mut).encode("utf-8")).hexdigest()[:len(disk)]
        if h == disk:
            return name
    return None


def lower_hex(s, n=None):
    return (n is None or len(s) == n) and all(c in "0123456789abcdef" for c in s)


def attribute(line, row, disk, mut):
    obj = py_read(line) if mut == "json_loads_line" else py_row(row)
    if row_get(row, "appended_by_daemon") is not None and mut != "ignore_daemon_key":
        v = row_get(row, "appended_by_daemon")
        try:
            anchor = v[0] == SC and v[1].startswith('"') and json.loads(v[1]) == ANCHOR
        except ValueError:
            anchor = False
        f = first_formula(obj, disk, False, mut) if lower_hex(disk, 16) else None
        return "daemon_row_mismatch", ("daemon", int(anchor), f or "none")
    if lower_hex(disk, 16) or mut == "digest_prefix_any_len":
        f = first_formula(obj, disk, False, mut)
        if f:
            return f, None
    full = (first_formula(obj, disk, True, mut) or "none") if lower_hex(disk, 64) else "-"
    return "unidentified", ("unid", len(disk), int(lower_hex(disk)), full)


def report(data, mut=None):
    """The rendered rows for a file's bytes (None: the file could not be opened)."""
    d = dict(checked=0, matched=0, mismatches=0, legacy=0)
    lc = dict(file_opened=0, read=0, read_stopped=0, blank=0, legacy_parse=0, legacy_no_hash=0)
    rows = []
    if data is not None:
        lc["file_opened"] = 1
        lines, stopped = bufread_lines(data)
        lc["read_stopped"] = int(stopped)
        for i, line in enumerate(lines, 1):
            lc["read"] += 1
            if rtrim(line) == "":
                lc["blank"] += 1
                continue
            try:
                row = parse_line(line)
            except ParseErr:
                d["legacy"] += 1
                lc["legacy_parse"] += 1
                continue
            disk = row_hash(row)
            if disk is None:
                d["legacy"] += 1
                lc["legacy_no_hash"] += 1
                continue
            d["checked"] += 1
            if sha16(canonical_bytes(row)) == disk:
                d["matched"] += 1
                continue
            d["mismatches"] += 1
            name, ev = attribute(line, row, disk, mut)
            rows.append((i, seq_if_integer(row), name, ev))
    out = ["DEFAULT|verifier=%s|checked=%d|matched=%d|mismatches=%d|legacy=%d|json=0" % (
        DEFAULT_VERIFIER, d["checked"], d["matched"], d["mismatches"], d["legacy"])]
    out.append("ATTRIBUTION|label=%s|file_opened=%d|lines_read=%d|read_stopped=%d|blank=%d|legacy_parse=%d|legacy_no_hash=%d|json=0" % (
        LABEL, lc["file_opened"], lc["read"], lc["read_stopped"], lc["blank"], lc["legacy_parse"], lc["legacy_no_hash"]))
    totals = {name: 0 for name, _, _ in FORMULAS}
    totals.update(unidentified=0, daemon_row_mismatch=0)
    for i, seq, name, ev in rows:
        totals[name] += 1
        out.append("ATTRIB|line=%d|seq=%s|formula=%s|json=0" % (i, "none" if seq is None else seq, name))
        if ev and ev[0] == "unid":
            out.append("ATTRIB_UNIDENTIFIED|line=%d|row_hash_len=%d|row_hash_lower_hex=%d|full_sha256_formula=%s|json=0" % ((i,) + ev[1:]))
        elif ev and ev[0] == "daemon":
            out.append("ATTRIB_DAEMON_ROW|line=%d|value_is_daemon_anchor=%d|sha16_formula=%s|json=0" % ((i,) + ev[1:]))
    out.append("ATTRIBUTION|label=%s|mismatches=%d|%s|unidentified=%d|daemon_row_mismatch=%d|json=0" % (
        LABEL, len(rows), "|".join("%s=%d" % (n, totals[n]) for n, _, _ in FORMULAS),
        totals["unidentified"], totals["daemon_row_mismatch"]))
    return "".join(r + "\n" for r in out)


# ------------------------------------------------------------------ json.dumps cross-check

def refuse_float(tok):
    raise ValueError("float " + tok)


def raw_ints_stable(o):
    if isinstance(o, dict):
        return all([raw_ints_stable(v) for v in o.values()])
    if isinstance(o, list):
        return all([raw_ints_stable(v) for v in o])
    if isinstance(o, Raw):
        return str(int(o.tok)) == o.tok
    return True


def dumps_check(data):
    """(rows, forms compared, forms equal): encoder vs json.dumps on rows with integer tokens only."""
    rows = compared = equal = 0
    lines, _ = bufread_lines(data)
    for line in lines:
        try:
            parse_line(line)
            plain = json.loads(rtrim(line), parse_float=refuse_float, parse_constant=refuse)
            raw = py_read(line)
        except (ParseErr, ValueError, RecursionError):
            continue
        if raw is None or not isinstance(plain, dict) or not raw_ints_stable(raw):
            continue
        plain.pop("row_hash", None)
        try:
            forms = [(json.dumps(plain, sort_keys=srt, ensure_ascii=asc, separators=(",", ":")), enc(raw, srt, asc, None))
                     for _, srt, asc in FORMULAS]
        except RecursionError:
            continue
        rows += 1
        for dumped, mine in forms:
            compared += 1
            equal += dumped == mine
    return rows, compared, equal


# ------------------------------------------------------------------ synthetic fixtures

KEYS = ["a", "b", "c", "seq", "ts", "event", "z", "Z", "_", "aa", "/",
        "k" + chr(0xE9) + "y", chr(0x43A) + chr(0x43B), chr(0x1F600), chr(0xE000), chr(0xFFFF),
        "d" + chr(0x7F), 'q"', "b" + B, "tab" + chr(9), "nul" + chr(0), "a" + chr(0x10FFFF), chr(0x2028)]
STRS = ["x", "", "ol" + chr(0xE1), chr(0x1F600), "a" + chr(0x7F) + "b", "a/b", "l" + chr(10),
        chr(1) + chr(31), '"q"', B, chr(0x2028), chr(0xFEFF), "GO-WITH-CONDITIONS", chr(0xD800),
        chr(0xDC00) + "x", chr(0xD83D), chr(0xD83D) + "A", ANCHOR, "2026-06-25T00:00:00.000Z",
        chr(0x10FFFF), chr(0x80), chr(0xE9) + chr(0x1F600)]
NUMS = ["0", "-0", "1", "-7", "42", "1.50", "1E+2", "2.0e-3", "1e05", "12345678901234567890123",
        "0.000", "-1.5E-10", "3.14", "18446744073709551615", "18446744073709551616"]
BAD_NUMS = ["01", "-01", "00.5"]
SHORT = {'"': '"', B: B, chr(8): "b", chr(12): "f", chr(10): "n", chr(13): "r", chr(9): "t"}
SEPS = [(", ", ": "), (",", ":"), (" ," + chr(9), " : ")]


def hex4(r, v):
    h = "%04x" % v
    return h.upper() if r.randrange(4) == 0 else h


def disk_str(r, s, allow_bad):
    out = ['"']
    for ch in s:
        c = ord(ch)
        if ch in ('"', B):
            out.append(B + ch if r.randrange(4) else B + "u" + hex4(r, c))
        elif c < 0x20:
            out.append(B + SHORT[ch] if ch in SHORT and r.randrange(2) else B + "u" + hex4(r, c))
        elif 0xD800 <= c <= 0xDFFF:
            out.append(B + "u" + hex4(r, c))
        elif ch == "/":
            out.append(r.choice(["/", B + "/"]))
        elif c >= 0x80 and r.randrange(2):
            if c > 0xFFFF:
                v = c - 0x10000
                out.append(B + "u" + hex4(r, 0xD800 + (v >> 10)) + B + "u" + hex4(r, 0xDC00 + (v & 0x3FF)))
            else:
                out.append(B + "u" + hex4(r, c))
        elif c < 0x80 and r.randrange(20) == 0:
            out.append(B + "u" + hex4(r, c))
        else:
            out.append(ch)
    if allow_bad and r.randrange(60) == 0:
        out.append(r.choice([B + "q", B + "u12", B + "x41"]))
    out.append('"')
    return "".join(out)


def gen_value(r, depth):
    k = r.randrange(12)
    if depth < 3 and k == 0:
        return (ARR, [gen_value(r, depth + 1) for _ in range(r.randrange(4))])
    if depth < 3 and k == 1:
        return (OBJ, gen_fields(r, depth + 1, True))
    if k <= 5:
        return ("str", r.choice(STRS))
    if k <= 9:
        return ("num", r.choice(BAD_NUMS) if r.randrange(50) == 0 else r.choice(NUMS))
    return ("lit", r.choice(["true", "false", "null"]))


def gen_fields(r, depth, nested):
    n = r.randrange(4) if nested else 1 + r.randrange(6)
    keys = KEYS + (["row_hash", "appended_by_daemon"] if nested else [])
    return [(r.choice(keys), gen_value(r, depth)) for _ in range(n)]


def disk_value(r, v, sep):
    kind, body = v
    if kind == "str":
        return disk_str(r, body, True)
    if kind in ("num", "lit"):
        return body
    if kind == ARR:
        return "[" + sep[0].join(disk_value(r, x, sep) for x in body) + "]"
    return "{" + sep[0].join(disk_str(r, k, False) + sep[1] + disk_value(r, x, sep) for k, x in body) + "}"


def rand_hex(r, n):
    return "".join(r.choice("0123456789abcdef") for _ in range(n))


def formula_hash(obj, idx, full, errors="strict"):
    if obj is None:
        return None
    _, srt, asc = FORMULAS[idx]
    try:
        h = hashlib.sha256(enc(obj, srt, asc, None).encode("utf-8", errors)).hexdigest()
    except UnicodeEncodeError:
        return None
    return h if full else h[:16]


def gen_hashed_row(r):
    sep = r.choice(SEPS)
    fields = gen_fields(r, 0, False)
    if r.randrange(4) == 0:
        fields.insert(0, ("seq", ("num", str(1 + r.randrange(4000))) if r.randrange(4) else ("str", "12")))
    if r.randrange(8) == 0:
        fields.insert(r.randrange(len(fields) + 1), ("appended_by_daemon", ("str", ANCHOR if r.randrange(3) else "OTHER-WRITER")))
    pieces = [disk_str(r, k, False) + sep[1] + disk_value(r, v, sep) for k, v in fields]
    body = "{" + sep[0].join(pieces) + "}"
    try:
        row = parse_line(body)
    except ParseErr:
        row = None
    obj = py_read(body)
    recipe = r.randrange(18)
    h = None
    if recipe < 4 and row is not None:
        h = sha16(canonical_bytes(row))
    elif recipe < 8:
        h = formula_hash(obj, recipe - 4, False)
    elif recipe < 10:
        h = formula_hash(obj, r.randrange(4), True)
    elif recipe == 11:
        h = formula_hash(obj, r.randrange(4), False)
        h = h.upper() if h else None
    elif recipe == 12:
        h = "".join(r.choice("0123456789abcdefXYZ-" + chr(0xE9)) for _ in range(r.choice([17, 25, 41])))
    elif recipe == 13:
        h = rand_hex(r, 64)
    elif recipe == 14:
        h = formula_hash(obj, r.randrange(4), False)
    elif recipe == 15:
        # a kept form whose unpaired surrogates were written as surrogatepass bytes
        h = formula_hash(obj, r.randrange(2), False, "surrogatepass")
    elif recipe == 16:
        # a duplicate of the first key, holding a value Python refuses, before the readable one;
        # hashed over the values PyRow keeps
        bad = r.choice(BAD_NUMS + ['"' + B + 'q"', '[' + r.choice(BAD_NUMS) + ']'])
        pieces = [disk_str(r, fields[0][0], False) + sep[1] + bad] + pieces
        try:
            kept_view = py_read(object_bytes(parse_line("{" + sep[0].join(pieces) + "}"), False))
        except ParseErr:
            kept_view = None
        h = formula_hash(kept_view, r.randrange(4), False)
    if h is None:
        h = rand_hex(r, 16)
    token = disk_str(r, h, False) if recipe == 14 else '"' + h + '"'
    entry = disk_str(r, "row_hash", False) + sep[1] + token
    pos = r.randrange(10)
    pieces = pieces + [entry] if pos < 7 else [entry] + pieces if pos < 9 else pieces[:1] + [entry] + pieces[1:]
    if r.randrange(20) == 0:
        pieces = ['"row_hash"' + sep[1] + '"' + rand_hex(r, 16) + '"'] + pieces
    return "{" + sep[0].join(pieces) + "}"


PARSE_FAILS = ['{"a": 1,', "[1, 2]", "not json", '{"a": NaN, "row_hash": "0123456789abcdef"}',
               '{"a": 1} x', '{"k' + B + 'ud800": 1, "row_hash": "0123456789abcdef"}',
               '{"a": "' + chr(1) + '"}', chr(0x1C) + '{"a": 1}', '{"a": tru}']
BLANKS = ["", "  ", chr(9), chr(0xA0), chr(0x3000) + " ", chr(0x85)]


def gen_line(r):
    k = r.randrange(100)
    if k < 3:
        return r.choice(BLANKS)
    if k < 6:
        return r.choice(PARSE_FAILS)
    if k < 9:
        sep = r.choice(SEPS)
        fields = gen_fields(r, 0, False)
        if r.randrange(2):
            fields.append(("row_hash", r.choice([("num", "5"), ("lit", "null"), (ARR, []), (OBJ, [])])))
        return disk_value(r, (OBJ, fields), sep)
    return gen_hashed_row(r)


def gen_chain(r, n):
    parts = []
    for i in range(n):
        parts.append(gen_line(r))
        if i < n - 1 or r.randrange(2):
            parts.append("\r\n" if r.randrange(7) == 0 else "\n")
    return "".join(parts).encode("utf-8")


def hand_row(stored, expected):
    """`stored` is the row without its closing brace; row_hash is sha16 of the hand-written `expected` bytes."""
    return stored + ', "row_hash": "' + sha16(expected) + '"}'


def tokens_chain():
    """Tokens written as stored, replaced duplicate values, a value with no decoded form, str::trim."""
    q = B + "q"
    rows = [
        hand_row('{"n": 01, "m": [-01, 00.5]', '{"m":[-01,00.5],"n":01}'),       # sorted_compact_kept
        hand_row('{"a": 01, "a": 2', '{"a":2}'),                                 # sorted_compact_kept
        hand_row('{"z": "' + q + '", "z": "x", "b": 1', '{"z":"x","b":1}'),      # original_compact_kept
        hand_row('{"v": "' + q + '"', '{"v":"' + q + '"}'),                      # unidentified
        chr(0xA0) + hand_row('{"b": "x", "a": 1', '{"a":1,"b":"x"}') + chr(0x3000),  # sorted_compact_kept
    ]
    return "\n".join(rows).encode("utf-8") + b"\n"


def deep_chain():
    """Nesting deeper than CPython's default recursion limit (1000), below the Rust binary's 13,409."""
    def arrays(d):
        return "[" * d + "1" + "]" * d

    def objects(d):
        return '{"y": ' * d + "1" + "}" * d, '{"y":' * d + "1" + "}" * d

    stored, compact = objects(2000)
    rows = [
        hand_row('{"a": ' + arrays(600), '{"a":' + arrays(600) + '}'),             # sorted_compact_kept
        hand_row('{"a": ' + arrays(4000), '{"a":' + arrays(4000) + '}'),           # sorted_compact_kept
        hand_row('{"z": ' + stored + ', "a": 0', '{"z":' + compact + ',"a":0}'),   # original_compact_kept
        hand_row('{"a": ' + arrays(1000), '{"a": ' + arrays(1000) + '}'),          # matched by the default
        '{"a": ' + arrays(3000) + ', "row_hash": "0123456789abcdef"}',             # unidentified
    ]
    return "\n".join(rows).encode("utf-8") + b"\n"


def fixtures():
    r = random.Random(SEED)
    synthetic = gen_chain(r, 6000)
    head = gen_chain(r, 60)
    utf8_stop = head + (b"" if head.endswith(b"\n") else b"\n") + b'{"a": "\xff"}\n' + gen_chain(r, 20)
    cr_tail = gen_chain(r, 10).rstrip(b"\n") + b"\r"
    return [("synthetic", synthetic), ("utf8_stop", utf8_stop), ("cr_tail", cr_tail), ("empty", b""),
            ("tokens", tokens_chain()), ("deep", deep_chain())]


# ------------------------------------------------------------------ driver

def run_rust(binary, path):
    p = subprocess.run([binary, path], capture_output=True, check=True)
    return p.stdout.decode("utf-8")


def totals_row(name, text):
    rows = text.splitlines()
    default = rows[0].split("|", 2)[2].rsplit("|json=0", 1)[0]
    attribution = rows[-1].split("|", 3)[3]
    return "TOTALS|name=%s|%s|%s" % (name, default, attribution)


def synthetic_receipt(binary):
    out = ["REFEREE|dir=ledger/cosign-attribution|label=%s|seed=%d|lane=cold|json=0" % (LABEL, SEED)]
    ok = True
    with tempfile.TemporaryDirectory() as tmp:
        cases = fixtures()
        for name, data in cases:
            path = os.path.join(tmp, name + ".ndjson")
            with open(path, "wb") as f:
                f.write(data)
            rust = run_rust(binary, path)
            mine = report(data)
            equal = rust == mine
            ok &= equal
            out.append("FIXTURE|name=%s|bytes=%d|sha256=%s|rust_sha256=%s|rust_equals_referee=%d|json=0" % (
                name, len(data), hashlib.sha256(data).hexdigest(),
                hashlib.sha256(rust.encode("utf-8")).hexdigest(), int(equal)))
            out.append(totals_row(name, mine))
        missing = os.path.join(tmp, "missing.ndjson")
        rust = run_rust(binary, missing)
        equal = rust == report(None)
        ok &= equal
        out.append("FIXTURE|name=missing|rust_equals_referee=%d|json=0" % int(equal))
        rows, compared, eq = dumps_check(cases[0][1])
        ok &= compared == eq
        out.append("DUMPS|fixture=synthetic|rows=%d|forms_compared=%d|forms_equal=%d|json=0" % (rows, compared, eq))
        for mut in MUTATIONS:
            caught = any(report(data, mut) != report(data) for _, data in cases)
            ok &= caught
            out.append("MUTATION|name=%s|caught=%d|json=0" % (mut, int(caught)))
    return "".join(r + "\n" for r in out), ok


def chain_counts(binary, path):
    with open(path, "rb") as f:
        data = f.read()
    rust = run_rust(binary, path)
    mine = report(data)
    out = ["CHAIN|bytes=%d|sha256=%s|rust_equals_referee=%d|json=0" % (
        len(data), hashlib.sha256(data).hexdigest(), int(rust == mine))]
    rows = mine.splitlines()
    out += [rows[0], rows[1], rows[-1]]
    groups = {}
    for r in rows:
        if r.startswith("ATTRIB_UNIDENTIFIED|") or r.startswith("ATTRIB_DAEMON_ROW|"):
            key = r.split("|", 1)[0] + "|" + r.split("|", 2)[2].rsplit("|json=0", 1)[0]
            groups[key] = groups.get(key, 0) + 1
    out += ["%s|rows=%d|json=0" % (k, v) for k, v in sorted(groups.items())]
    rws, compared, eq = dumps_check(data)
    out.append("DUMPS|rows=%d|forms_compared=%d|forms_equal=%d|json=0" % (rws, compared, eq))
    return "".join(r + "\n" for r in out), rust == mine and compared == eq


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bin", required=True)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--chain")
    a = ap.parse_args()
    sys.setrecursionlimit(RECURSION_LIMIT)
    if a.chain:
        text, ok = chain_counts(a.bin, a.chain)
        sys.stdout.write(text)
        sys.exit(0 if ok else 1)
    text, ok = synthetic_receipt(a.bin)
    sys.stdout.write(text)
    if not ok:
        print("REFEREE|result=FAIL|json=0")
        sys.exit(1)
    if a.write:
        with open(RECEIPT, "w", encoding="utf-8") as f:
            f.write(text)
        print("REFEREE|result=WRITTEN|json=0")
        return
    with open(RECEIPT, encoding="utf-8") as f:
        pinned = f.read()
    if pinned != text:
        print("REFEREE|result=FAIL|reason=differs_from_REFEREE.hbp|json=0")
        sys.exit(1)
    print("REFEREE|result=PASS|json=0")


if __name__ == "__main__":
    main()
