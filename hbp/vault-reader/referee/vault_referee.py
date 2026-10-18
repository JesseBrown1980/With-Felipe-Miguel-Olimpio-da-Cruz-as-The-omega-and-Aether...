#!/usr/bin/env python3
"""Stdlib referee for hbp-vault-reader: the same walk, pairing, pointer resolution and checks,
re-implemented from the same public code, integer only, no JSON.

Upstream lines each rule reproduces:
  asolaria-hbi-hbp src/lib.rs        esc/unesc 117-143, encode_row 145-155, parse_row 159-187,
                                     IdxPointer 194-210, agt 107-111, verify_chain 249-272
  hbp/src/reader.rs blob ee13613f7bd936d06536ce223cc3f57702e8e43f (aether port of
    hbp-reader.mjs:118-156)          verify_hbp 204-271 and its helpers 15-31, 152-202
  FOLLOW tests/verify_public_repo.py strict_tuple_fields 360-374, strict_tuple_receipt 377-401,
                                     named sidecar rule 3961-3978 (`.strip().split()` 3938,
                                     3968), exact sidecar 526-530,
                                     strict_uint 458-461, CENTER 1790-1799 and 1948-1954
  simulator constellation/absorb_all.py 194-196 (FTR receipt = sha256(body)[:32])
  asolaria-office-service fable5-office-render/bigpickle-map-and-ramp.py 3, 8-9 (sha16 chain)
  omnibit scripts/verify_receipt_privacy.py 35-44 (sidecar `*` name), 73-117 (HBIROW rows)
  omnibit tools/movable-flashlight/hbp.py 97-128, 139-163 (HBIFTR indexed_bytes/complete)
  FOLLOW tournament/public-dependencies/gitram/pais_path3_bridge.rs 674-677 and
    asolaria-rotating-lighthouse viewer/github3d.rs 444-458 (HBI|row=|sha256=|hex= rows)
  stone-to-moss tools/seal_quantum_gravity_81.py 89-97 (`name=`), experiments/seat3/
    verify_room03_fourstate.py 110-121 and four more writers (X.hbi HBP|/JSON| rows)

Run isolated:
  python3 -I -B vault_referee.py <root>              print the result rows
  python3 -I -B vault_referee.py --check             every fixture root == its expected file
"""
import hashlib
import os
import sys

KINDS = ("hbi", "hbp", "trinity", "file", "range", "index", "chain", "center")
CENTER_MEMBERS = ("hbi", "hbp", "sha", "sh", "hash")
CHUNK = 1 << 20
HEAD_CAP = 65536
LINE_BOUNDARIES = "\n\r\x0b\x0c\x1c\x1d\x1e\x85\u2028\u2029"
# ECMAScript WhiteSpace + LineTerminator (`\s`, `trim()`), as hbp/src/reader.rs:16-31 `js_is_space`.
JS_WS = "".join(chr(c) for c in [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680]
                + list(range(0x2000, 0x200B)) + [0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF])


def sha256_hex(b):
    return hashlib.sha256(b).hexdigest()


def sha16(s):
    return sha256_hex(s.encode("utf-8"))[:16]


# ---- vendored codec (asolaria-hbi-hbp src/lib.rs) ----

def esc(v):
    return v.replace("\\", "\\\\").replace("|", "\\p").replace("\n", "\\n")


def unesc(v):
    out = []
    i = 0
    while i < len(v):
        c = v[i]
        if c == "\\":
            if i + 1 < len(v):
                n = v[i + 1]
                i += 2
                if n == "\\":
                    out.append("\\")
                elif n == "p":
                    out.append("|")
                elif n == "n":
                    out.append("\n")
                else:
                    out.append("\\" + n)
            else:
                out.append("\\")
                i += 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def encode_row(tag, fields):
    s = tag
    for k, v in fields:
        s += "|" + k + "=" + esc(v)
    return s + "|json=0"


def parse_row(row):
    parts = []
    cur = []
    i = 0
    while i < len(row):
        c = row[i]
        if c == "\\":
            cur.append("\\")
            if i + 1 < len(row):
                cur.append(row[i + 1])
                i += 1
        elif c == "|":
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(c)
        i += 1
    parts.append("".join(cur))
    tag = parts[0]
    fields = []
    for p in parts[1:]:
        eq = p.find("=")
        if eq >= 0:
            fields.append((p[:eq], unesc(p[eq + 1:])))
        elif p:
            fields.append((p, ""))
    return tag, fields


def verify_chain(receipts):
    prev = "0" * 64
    for r in receipts:
        marker = "|event_hash="
        pos = r.rfind(marker)
        if pos < 0:
            return False
        body = r[:pos]
        claimed = r[pos + len(marker):]
        if sha256_hex(body.encode("utf-8")) != claimed:
            return False
        pm = "|prev_event_hash="
        pp = body.rfind(pm)
        if pp < 0:
            return False
        if body[pp + len(pm):] != prev:
            return False
        prev = claimed
    return True


# ---- text rules ----

def splitlines(t):
    return t.splitlines()


def count_rows(data):
    try:
        return len(data.decode("utf-8").splitlines())
    except UnicodeDecodeError:
        return None


def strict_uint(v):
    if v is None or not v or not all("0" <= c <= "9" for c in v) or (len(v) > 1 and v[0] == "0"):
        return None
    n = int(v)
    return n if n < (1 << 64) else None


def is_hex_lower(v, width):
    return len(v) == width and all(c in "0123456789abcdef" for c in v)


def ascii_lower(s):
    return "".join(chr(ord(c) + 32) if "A" <= c <= "Z" else c for c in s)


# ---- verdicts ----

class Checks:
    def __init__(self):
        self.passes, self.differ, self.unresolved, self.info = [], [], [], []

    def eq(self, name, equal):
        if equal:
            self.passes.append(name)
        else:
            self.differ.append(name + "_differs")

    def verdict(self, presence):
        tokens = []
        if self.differ:
            mark = {"present": None, "absent": "bytes_absent", "short": "bytes_short",
                    "zero": "bytes_zero_filled"}[presence]
            if mark:
                trit = "0"
                tokens.append(mark)
            else:
                trit = "-1"
            tokens += self.differ + self.unresolved
        elif self.unresolved:
            trit = "0"
            tokens += self.unresolved
        elif self.passes:
            trit = "+1"
            tokens.append("ok:" + "+".join(self.passes))
        else:
            trit = "0"
            tokens.append("no_check_declared")
        tokens += self.info
        return trit, "+".join(tokens)


def verdict_extent(c, presence, short):
    # a declared extent with fewer bytes present than it declares reads 0
    if not short or c.differ:
        return c.verdict(presence)
    tokens = ["bytes_absent" if presence == "absent" else "bytes_short"]
    tokens += c.unresolved + c.info
    return "0", "+".join(tokens)


def presence_of(length, all_zero, declared):
    if length == 0:
        return "present" if declared == 0 else "absent"
    if declared is not None and declared > length:
        return "short"
    if all_zero:
        return "zero"
    return "present"


def obj(path, kind, nbytes, sha, pointer, trit, reason):
    return {"path": path, "kind": kind, "bytes": nbytes, "sha256": sha,
            "pointer": pointer, "verified": trit, "reason": reason}


def render(o):
    return encode_row("VAULTOBJ", [
        ("path", o["path"]), ("kind", o["kind"]), ("bytes", str(o["bytes"])),
        ("sha256", o["sha256"]), ("pointer", o["pointer"]), ("verified", o["verified"]),
        ("reason", o["reason"])])


# ---- files ----

def name_key(raw):
    # UTF-8 text as written with `\` doubled; each byte that is not UTF-8 as `\xHH`
    out = []
    for ch in raw.decode("utf-8", "surrogateescape"):
        o = ord(ch)
        if ch == "\\":
            out.append("\\\\")
        elif 0xDC80 <= o <= 0xDCFF:
            out.append("\\x%02x" % (o - 0xDC00))
        else:
            out.append(ch)
    return "".join(out)


def walk(root):
    out = {}

    def rec(d, rel):
        entries = []
        with os.scandir(d) as it:
            for e in it:
                entries.append((name_key(os.fsencode(e.name)), e))
        entries.sort(key=lambda x: x[0].encode("utf-8"))
        for name, e in entries:
            child = name if not rel else rel + "/" + name
            if e.is_dir(follow_symlinks=False):
                if name != ".git":
                    rec(e.path, child)
            elif e.is_file(follow_symlinks=False):
                out[child] = e.path

    rec(os.fsencode(root), "")
    return out


def read_all(p):
    with open(p, "rb") as f:
        return f.read()


def file_facts(p):
    data = read_all(p)
    return {"len": len(data), "sha256": sha256_hex(data), "cr": data.count(b"\r"),
            "last": data[-1] if data else None, "all_zero": data.count(0) == len(data),
            "rows": count_rows(data)}


def slice_facts(p, start, length, file_len, expect=None):
    present = 0 if start >= file_len else min(file_len - start, length)
    data = b""
    if present > 0:
        with open(p, "rb") as f:
            f.seek(start)
            data = f.read(present)
    return {"present": present, "sha256": sha256_hex(data),
            "all_zero": data.count(0) == len(data), "head": data[:HEAD_CAP],
            "last": data[-1] if data else None,
            "same": expect is None or expect == data}


def row_bounds(p, needed):
    data = read_all(p)
    out = {}
    row, row_start = 1, 0
    for pos, b in enumerate(data):
        if b == 10:
            if row in needed:
                out[row] = (row_start, pos, pos + 1)
            row += 1
            row_start = pos + 1
    if row_start < len(data) and row in needed:
        out[row] = (row_start, len(data), None)
    return out


# ---- rows ----

class Row:
    def __init__(self, line, raw):
        self.line = line
        self.raw = raw
        self.tag, self.fields = parse_row(raw)

    def get(self, k):
        for a, v in self.fields:
            if a == k:
                return v
        return None

    def has(self, k):
        return self.get(k) is not None


def parse_rows(text):
    pieces = text.split("\n")
    if text.endswith("\n"):
        pieces.pop()
    rows = []
    for i, piece in enumerate(pieces):
        line = piece[:-1] if piece.endswith("\r") else piece
        if line:
            rows.append(Row(i + 1, line))
    return rows


def pointer_prefix(key):
    # `name` with a sibling digest: stone-to-moss tools/seal_quantum_gravity_81.py:89-97,
    # upstream_bridge.py:338-348, seat1_recurrence_72.py:262-268
    if key in ("file", "path", "artifact", "name"):
        return ""
    if key in ("target", "source"):
        return key + "_"
    for suf in ("_file", "_path"):
        if key.endswith(suf) and len(key) > len(suf):
            return key[: -len(suf)] + "_"
    return None


def sibling_keys(prefix):
    v = [prefix + "bytes", prefix + "sha256"]
    v += ["cr", "terminal_lf"] if prefix == "" else [prefix + "rows"]
    return v


def file_pointers(row):
    seen = set()
    out = []
    for k, v in row.fields:
        if k in seen:
            continue
        seen.add(k)
        prefix = pointer_prefix(k)
        if prefix is not None and any(row.has(s) for s in sibling_keys(prefix)):
            out.append((k, v, prefix))
    return out


def anchor_key(row, ptrs):
    if not ptrs or range_form(row) is not None:
        return None
    return 0


PAIR_FORMS = ("idx", "rowidx")


def range_form(row):
    if row.has("byte_start") and row.has("byte_end_exclusive"):
        return "start_end"
    # omnibit scripts/verify_receipt_privacy.py:73-117; movable-flashlight hbp.py:91-135
    if row.tag == "HBIROW" and row.has("len") and (row.has("off") or row.has("offset")):
        return "rowidx"
    if row.has("offset") and row.has("length"):
        return "offset_length"
    if row.has("offset") and row.has("len"):
        return "offset_len"
    if row.tag == "IDX" and row.has("off") and row.has("len"):
        return "idx"
    return None


def range_span(row, form):
    u = lambda k: strict_uint(row.get(k))
    if form == "start_end":
        s, e = u("byte_start"), u("byte_end_exclusive")
        if s is None or e is None or e < s:
            return None
        return s, e - s
    keys = {"offset_length": ("offset", "length"), "offset_len": ("offset", "len"),
            "idx": ("off", "len"),
            "rowidx": ("off" if row.has("off") else "offset", "len")}[form]
    a, b = u(keys[0]), u(keys[1])
    if a is None or b is None:
        return None
    return a, b


def unhex_lower(s):
    if len(s) % 2:
        return None
    if any(c not in "0123456789abcdef" for c in s):
        return None
    return bytes.fromhex(s)


def rust_lines(data):
    # Rust str::lines() over bytes (pais_path3_bridge.rs:674-677 `hbp.lines()`)
    out = []
    start = 0
    for i, b in enumerate(data):
        if b == 10:
            end = i - 1 if i > start and data[i - 1] == 13 else i
            out.append((start, end))
            start = i + 1
    if start < len(data):
        out.append((start, len(data)))
    return out


def strict_fields(line):
    out = {}
    for piece in line.split("|")[1:]:
        if "=" not in piece:
            return None
        k, v = piece.split("=", 1)
        if not k or not v or k in out:
            return None
        out[k] = v
    return out


def footer_checks(data, c):
    try:
        t = data.decode("utf-8")
    except UnicodeDecodeError:
        return
    lines = splitlines(t)
    if not lines:
        return
    last = lines[-1]
    tag = last.split("|")[0]
    body_form = "|body_sha256=" in last
    receipt_form = (not body_form) and "|receipt=" in last
    if not tag.endswith("FTR") or not (body_form or receipt_form):
        return
    f = strict_fields(last)
    if f is None:
        c.differ.append("footer_fields_differs")
        return
    if receipt_form:
        r = f.get("receipt")
        if r is None or not (is_hex_lower(r, 32) or is_hex_lower(r, 64)):
            return
    body = "\n".join(lines[:-1]) + "\n"
    digest = sha256_hex(body.encode("utf-8"))
    differ = []
    if body_form:
        if not data.endswith(b"\n") or b"\r" in data:
            differ.append("footer_lf_bytes_differs")
        if f.get("body_sha256") != digest:
            differ.append("footer_body_sha256_differs")
    else:
        r = f.get("receipt")
        if r != digest[: len(r)]:
            differ.append("footer_receipt_differs")
    if "rows" in f and f["rows"] != str(len(lines)):
        differ.append("footer_rows_differs")
    if not differ:
        c.passes.append("footer_body_sha256" if body_form else "footer_receipt")
    else:
        c.differ += differ


class Vault:
    def __init__(self, root):
        self.files = walk(root)
        self.cache = {}

    def facts(self, rel):
        if rel not in self.cache:
            self.cache[rel] = file_facts(self.files[rel])
        return self.cache[rel]

    def resolve(self, dirc, value):
        first = value.split("/")[0]
        if (not value or value.startswith("/") or value.startswith("~") or "\\" in value
                or ":" in first or any(c == ".." for c in value.split("/"))):
            return ("outside", None)
        comps = [c for c in value.split("/") if c and c != "."]
        if not comps:
            return ("outside", None)
        # the .hbi directory, the root, then (Claude's addition) each directory between them
        for k in [len(dirc), 0] + list(range(len(dirc) - 1, 0, -1)):
            cand = "/".join(dirc[:k] + comps)
            if cand in self.files:
                return ("found", cand)
        return ("absent", None)

    def sidecar_check(self, rel, sha, c):
        side = rel + ".sha256"
        if side not in self.files:
            return
        data = read_all(self.files[side])
        # the target's own name (`path.name`); a name that is not UTF-8 equals no sidecar text
        try:
            name = os.path.basename(self.files[rel]).decode("utf-8")
        except UnicodeDecodeError:
            name = None
        if name is not None and data == (sha + "  " + name + "\n").encode("utf-8"):
            c.passes.append("sidecar_exact")
            return
        try:
            t = data.decode("utf-8")
        except UnicodeDecodeError:
            c.differ.append("sidecar_not_utf8")
            return
        # `read_text(encoding="utf-8").strip().split()` (verify_public_repo.py:3938, 3968)
        f = t.strip().split()
        if len(f) != 2:
            c.differ.append("sidecar_shape_differs")
            return
        # FOLLOW verify_public_repo.py:3968-3973 as written; omnibit
        # scripts/verify_receipt_privacy.py:35-44 `items[1].lstrip("*")`
        name_ok = f[1] == name
        star_ok = (not name_ok) and f[1].startswith("*") and f[1].lstrip("*") == name
        sha_ok = ascii_lower(f[0]) == sha
        if sha_ok and name_ok:
            c.passes.append("sidecar_named")
        elif sha_ok and star_ok:
            c.passes.append("sidecar_named_star")
        if not (name_ok or star_ok):
            c.differ.append("sidecar_name_differs")
        if not sha_ok:
            c.differ.append("sidecar_sha256_differs")

    def read(self, emit):
        # rows are handed out per .hbi; only integer counts are kept for the totals
        hbis = [k for k in sorted(self.files, key=lambda s: s.encode("utf-8")) if k.endswith(".hbi")]
        tally = Tally()
        for rel in hbis:
            objs = []
            self.read_hbi(rel, objs)
            for o in objs:
                tally.add(o)
                emit(render(o))
        for row in tally.rows(len(hbis), len(self.files)):
            emit(row)

    def read_hbi(self, rel, objs):
        data = read_all(self.files[rel])
        sha = sha256_hex(data)
        n = len(data)
        stem = rel[:-4]
        dirc = rel.split("/")[:-1]
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            text = None
        c = Checks()
        self.sidecar_check(rel, sha, c)
        footer_checks(data, c)
        if text is None:
            c.info.append("binary_no_rows")
        t, r = c.verdict(presence_of(n, data.count(0) == n, None))
        objs.append(obj(rel, "hbi", n, sha, "self", t, r))

        hbp_rel = stem + ".hbp"
        hbp_rows = []
        hdata = None
        if hbp_rel in self.files:
            hdata = read_all(self.files[hbp_rel])
            hsha = sha256_hex(hdata)
            c = Checks()
            self.sidecar_check(hbp_rel, hsha, c)
            footer_checks(hdata, c)
            t, r = c.verdict(presence_of(len(hdata), hdata.count(0) == len(hdata), None))
            objs.append(obj(hbp_rel, "hbp", len(hdata), hsha, "pair:" + rel, t, r))
            try:
                hbp_rows = parse_rows(hdata.decode("utf-8"))
            except UnicodeDecodeError:
                hbp_rows = []
        else:
            objs.append(obj(hbp_rel, "hbp", 0, "", "pair:" + rel, "0", "hbp_absent"))

        if (stem + ".sha256") in self.files or (stem + ".hex") in self.files \
                or data.startswith(b"!HBI-v0"):
            objs.append(self.trinity_obj(stem, rel, data, hdata))

        if text is None:
            return
        rows = parse_rows(text)
        self.read_rows(rel, dirc, sha, n, rows, hbp_rel, hbp_rows, hdata, objs)

    def trinity_obj(self, stem, rel, hbi, hdata):
        # walked files only: X.hbp in the walk, and X.sha256 / X.hex walked files whenever
        # that name exists (verify_hbp opens them by name, reader.rs:155-161)
        hbp_rel = stem + ".hbp"
        pointer = "pair:" + rel
        if hbp_rel not in self.files or hdata is None:
            return obj(hbp_rel, "trinity", 0, "", pointer, "0", "hbp_absent")
        try:
            p = self.files[hbp_rel].decode("utf-8")
        except UnicodeDecodeError:
            return obj(hbp_rel, "trinity", 0, "", pointer, "0", "path_not_utf8")
        for ext in ("sha256", "hex"):
            if (stem + "." + ext) not in self.files and os.path.exists(p[:-4] + "." + ext):
                return obj(hbp_rel, "trinity", 0, "", pointer, "0", "sidecar_not_walked")
        v = verify_hbp(p)
        if "hbp missing" in v["errors"]:
            return obj(hbp_rel, "trinity", 0, "", pointer, "0", "hbp_absent")
        hbi_declared = (hbi.startswith(b"!HBI-v0")
                        or declares(hbi, b"sha256=", lambda b: 48 <= b <= 57 or 97 <= b <= 102)
                        or declares(hbi, b"bytes=", lambda b: 48 <= b <= 57))
        c = Checks()
        for name in ("sha", "hex", "hbi"):
            if v[name] is None:
                continue
            if name == "hbi" and not hbi_declared:
                c.info.append("trinity_hbi_not_declared")
            else:
                c.eq("trinity_" + name, v[name])
        nbytes = v["bytes"] or 0
        all_zero = hdata.count(0) == len(hdata)
        t, r = c.verdict(presence_of(nbytes, all_zero, None))
        return obj(hbp_rel, "trinity", nbytes, v["sha256"] or "", pointer, t, r)

    def pair_target(self, rel):
        # the paired X.hbp (or X.json) by its own name in the walk
        if rel in self.files:
            return {"display": rel, "rel": rel, "facts": self.facts(rel)}
        return {"display": rel, "rel": None, "facts": None}

    def target(self, dirc, value):
        kind, trel = self.resolve(dirc, value)
        if kind == "found":
            return {"display": trel, "rel": trel, "facts": self.facts(trel)}, None
        why = "target_absent" if kind == "absent" else "path_not_under_root"
        return {"display": value, "rel": None, "facts": None}, why

    def file_obj(self, row, key, prefix, t, why, hbi):
        pointer = "%s:%d:%s" % (hbi, row.line, key)
        f = t["facts"]
        if f is None:
            return obj(t["display"], "file", 0, "", pointer, "0", why or "target_absent")
        c = Checks()
        declared_len = None
        v = row.get(prefix + "bytes")
        if v is not None:
            nn = strict_uint(v)
            if nn is None:
                c.unresolved.append("declared_bytes_malformed")
            else:
                declared_len = nn
                c.eq("bytes", nn == f["len"])
        v = row.get(prefix + "sha256")
        if v is not None:
            if is_hex_lower(v, 64):
                c.eq("sha256", v == f["sha256"])
            else:
                c.unresolved.append("declared_sha256_malformed")
        if prefix == "":
            v = row.get("cr")
            if v is not None:
                nn = strict_uint(v)
                if nn is None:
                    c.unresolved.append("declared_cr_malformed")
                else:
                    c.eq("cr", nn == f["cr"])
            v = row.get("terminal_lf")
            if v is not None:
                if v in ("0", "1"):
                    c.eq("terminal_lf", (v == "1") == (f["last"] == 10))
                else:
                    c.unresolved.append("declared_terminal_lf_malformed")
        else:
            v = row.get(prefix + "rows")
            if v is not None:
                nn = strict_uint(v)
                if nn is None:
                    c.unresolved.append("declared_rows_malformed")
                elif f["rows"] is None:
                    c.differ.append("rows_target_not_utf8")
                else:
                    c.eq("rows", nn == f["rows"])
        tr, r = c.verdict(presence_of(f["len"], f["all_zero"], declared_len))
        return obj(t["display"], "file", f["len"], f["sha256"], pointer, tr, r)

    def read_rows(self, hbi, dirc, hbi_sha, hbi_len, rows, hbp_rel, hbp_rows, hdata, objs):
        needed = {}
        cur = None
        for i, row in enumerate(rows):
            ptrs = file_pointers(row)
            if anchor_key(row, ptrs) is not None:
                cur = i
            if cur is not None and range_form(row) is not None:
                for k in ("first_row", "last_row", "row"):
                    nn = strict_uint(row.get(k))
                    if nn is not None:
                        needed.setdefault(cur, set()).add(nn)
        receipts = [(r.line, r.raw) for r in rows
                    if "|prev_event_hash=" in r.raw and "|event_hash=" in r.raw]
        anchor = None
        pair = None
        pair_recs = []
        pair_first = None
        hex_rows = []
        hex_first = None
        lines = None
        for i, row in enumerate(rows):
            if row.tag == "HBIFTR" and (row.has("indexed_bytes") or row.has("complete")):
                if pair is None:
                    pair = self.pair_target(hbp_rel)
                arow = rows[anchor["row"]] if anchor is not None else None
                objs.append(flashlight_obj(hbi, row, arow, pair_recs, pair, hdata))
            ptrs = file_pointers(row)
            akey = anchor_key(row, ptrs)
            for pi, (key, value, prefix) in enumerate(ptrs):
                t, why = self.target(dirc, value)
                objs.append(self.file_obj(row, key, prefix, t, why, hbi))
                if akey == pi:
                    bounds = None
                    if t["rel"] is not None and i in needed:
                        bounds = row_bounds(self.files[t["rel"]], needed[i])
                    anchor = {"row": i, "target": t, "bounds": bounds, "ranges": []}
            # X.hbi `HBP|bytes=|sha256=` / `JSON|..` with no path key name X.hbp / X.json
            # (stone-to-moss verify_lightbank_memory.py:75-85, verify_opto_toy.py:54-65,
            # verify_autonomous_universe.py:48-59, verify_room03_fourstate.py:110-121,
            # rainbow27_v2.py:149-179)
            if (not ptrs and row.tag in ("HBP", "JSON")
                    and (row.has("bytes") or row.has("sha256"))):
                ext = "hbp" if row.tag == "HBP" else "json"
                t = self.pair_target(hbp_rel[:-4] + "." + ext)
                objs.append(self.file_obj(row, "pair", "", t, None, hbi))
            form = range_form(row)
            if form is not None:
                if form == "rowidx":
                    if pair_first is None:
                        pair_first = row.line
                    pair_recs.append({"row": strict_uint(row.get("row")),
                                      "span": range_span(row, form)})
                if form in PAIR_FORMS:
                    if pair is None:
                        pair = self.pair_target(hbp_rel)
                    o = self.range_obj(hbi, row, form, pair, None, None)
                elif anchor is not None:
                    o = self.range_obj(hbi, row, form, anchor["target"], anchor["bounds"],
                                       rows[anchor["row"]])
                else:
                    o = self.range_obj(hbi, row, form, None, None, None)
                objs.append(o)
                span = range_span(row, form)
                if anchor is not None and span is not None and form not in PAIR_FORMS:
                    anchor["ranges"].append({"tag": row.tag, "form": form,
                                             "start": span[0], "len": span[1]})
            if row.tag == "HBI" and row.has("row") and row.has("sha256") and row.has("hex"):
                if hex_first is None:
                    hex_first = row.line
                hex_rows.append(strict_uint(row.get("row")))
                if lines is None:
                    lines = rust_lines(hdata) if hdata is not None else []
                objs.append(hexrow_obj(hbi, row, hbp_rel, hdata, lines))
            o = index_obj(hbi, row, anchor, rows)
            if o is not None:
                objs.append(o)
            if (row.tag == "HBIROW" and row.get("kind") == "emitter"
                    and "chain=pid[n]=sha16(pid[n-1]|name)" in row.raw):
                objs.append(chain_obj(hbi, hbi_sha, hbi_len, row, rows[i + 1:]))
            if receipts and receipts[0][0] == row.line:
                objs.append(receipt_obj(hbi, hbi_sha, hbi_len, receipts))
            if row.tag == "CENTER" and all(row.has(k) for k in CENTER_MEMBERS):
                objs.append(center_obj(hbi, hbi_sha, hbi_len, row, hbp_rows))
        if hex_first is not None:
            t = self.pair_target(hbp_rel)
            objs.append(hex_index_obj(hbi, hex_first, hex_rows, t,
                                      len(lines) if lines is not None else 0))
        if pair_first is not None:
            t = self.pair_target(hbp_rel)
            objs.append(rowidx_index_obj(hbi, pair_first, pair_recs, t))

    def range_obj(self, hbi, row, form, target, bounds, anchor_row):
        span = range_span(row, form)
        if span is not None:
            pointer = "%s:%d:%d-%d" % (hbi, row.line, span[0], span[0] + span[1])
        else:
            pointer = "%s:%d" % (hbi, row.line)
        if target is None:
            return obj("", "range", 0, "", pointer, "0", "anchor_absent")
        if target["rel"] is None or target["facts"] is None:
            return obj(target["display"], "range", 0, "", pointer, "0", "anchor_unresolved")
        if span is None:
            return obj(target["display"], "range", 0, "", pointer, "0", "declared_range_malformed")
        start, length = span
        # `chunk.hex() != expected_hex.lower()` (verify_receipt_privacy.py:107-109)
        hx = row.get("hex")
        dec = unhex_lower(ascii_lower(hx)) if hx is not None else None
        s = slice_facts(self.files[target["rel"]], start, length, target["facts"]["len"], dec)
        c = Checks()
        v = row.get("bytes")
        if v is not None:
            nn = strict_uint(v)
            if nn is None:
                c.unresolved.append("declared_bytes_malformed")
            else:
                c.eq("bytes", nn == s["present"] and nn == length)
        for key in ("sha256", "row_sha256"):
            v = row.get(key)
            if v is not None:
                if is_hex_lower(v, 64):
                    c.eq(key, v == s["sha256"])
                else:
                    c.unresolved.append("declared_%s_malformed" % key)
        if hx is not None:
            c.eq("hex", dec is not None and s["same"])
        v = row.get("includes_lf")
        if v is not None:
            if v in ("0", "1"):
                c.eq("includes_lf", (v == "1") == (s["last"] == 10))
            else:
                c.unresolved.append("declared_includes_lf_malformed")
        if form not in PAIR_FORMS:
            for key in ("tag", "kind"):
                v = row.get(key)
                if v is not None:
                    c.eq(key, s["head"].startswith((v + "|").encode("utf-8")))
        if form == "idx":
            pid = row.get("pid")
            if pid is not None and pid.startswith("AGT-"):
                c.eq("agt", pid == "AGT-" + s["sha256"][:16])
        if anchor_row is not None and (row.has("first_row") or row.has("row")):
            lf = anchor_row.get("range_length_includes_terminal_lf")
            basis = anchor_row.get("offset_basis")
            if lf in ("0", "1"):
                if basis is not None and basis != "zero_based_utf8_bytes":
                    c.unresolved.append("offset_basis_unsupported")
                else:
                    u = lambda k: strict_uint(row.get(k))
                    if row.has("first_row"):
                        first, last = u("first_row"), u("last_row")
                    else:
                        first, last = u("row"), u("row")
                    ok = False
                    if first is not None and last is not None and bounds is not None:
                        x, y = bounds.get(first), bounds.get(last)
                        if x is not None and y is not None:
                            end = y[2] if lf == "1" else y[1]
                            ok = x[0] == start and end == start + length
                    c.eq("row_bounds", ok)
        if length > 0 and s["present"] == 0:
            presence = "absent"
        elif s["present"] < length:
            presence = "short"
        elif s["present"] > 0 and s["all_zero"]:
            presence = "zero"
        else:
            presence = "present"
        tr, r = verdict_extent(c, presence, s["present"] < length)
        return obj(target["display"], "range", s["present"], s["sha256"], pointer, tr, r)


def contiguous(recs, total):
    at = 0
    for r in recs:
        if r["start"] != at:
            return False
        at = r["start"] + r["len"]
    return bool(recs) and at == total


def index_obj(hbi, row, anchor, rows):
    footer = row.tag == "FOOTER" and any(row.has(k) for k in ("indexed_rows", "indexed_bytes", "coverage"))
    idxftr = row.tag.endswith("INDEXFTR") and any(
        row.has(k) for k in ("range_count", "bodyref_count", "covered_bytes", "coverage_exact"))
    hbiftr = row.tag.endswith("HBIFTR") and row.has("rows") and not row.has("body_sha256")
    if not (footer or idxftr or hbiftr):
        return None
    pointer = "%s:%d" % (hbi, row.line)
    if anchor is None:
        return obj("", "index", 0, "", pointer, "0", "anchor_absent")
    f = anchor["target"]["facts"]
    total = f["len"] if f is not None else None
    c = Checks()

    def num(key, name, have):
        v = row.get(key)
        if v is not None:
            nn = strict_uint(v)
            if nn is None:
                c.unresolved.append("declared_%s_malformed" % key)
            else:
                c.eq(name, nn == have)

    def cover(recs, want):
        if total is None:
            c.unresolved.append("anchor_unresolved")
        else:
            c.eq("coverage", contiguous(recs, total) == want)

    if footer:
        recs = [r for r in anchor["ranges"] if r["form"] == "start_end"]
        num("indexed_rows", "count", len(recs))
        num("indexed_bytes", "sum", sum(r["len"] for r in recs))
        cv = row.get("coverage")
        if cv == "EXACT":
            cover(recs, True)
        elif cv is not None:
            c.unresolved.append("coverage_value_unsupported")
    elif idxftr:
        ranges = [r for r in anchor["ranges"] if r["tag"] == "RANGE"]
        bodyrefs = sum(1 for r in anchor["ranges"] if r["tag"] == "BODYREF")
        num("range_count", "range_count", len(ranges))
        num("bodyref_count", "bodyref_count", bodyrefs)
        num("covered_bytes", "sum", sum(r["len"] for r in ranges))
        ce = row.get("coverage_exact")
        if ce == "1":
            cover(ranges, True)
        elif ce == "0":
            cover(ranges, False)
        elif ce is not None:
            c.unresolved.append("declared_coverage_exact_malformed")
    else:
        num("rows", "count", len(anchor["ranges"]))
        hv = rows[anchor["row"]].get("rows")
        if hv is not None:
            h, fv = strict_uint(hv), strict_uint(row.get("rows"))
            if h is not None and fv is not None:
                c.eq("header_rows", h == fv)
            else:
                c.unresolved.append("declared_header_rows_malformed")
    tr, r = c.verdict("present")
    return obj(anchor["target"]["display"], "index", f["len"] if f else 0,
               f["sha256"] if f else "", pointer, tr, r)


def pair_index(hbi, line, t, c, short):
    f = t["facts"]
    if f is None:
        presence = "absent"
    elif f["len"] > 0 and short:
        presence = "short"
    else:
        presence = presence_of(f["len"], f["all_zero"], None)
    tr, r = verdict_extent(c, presence, short and f is not None)
    return obj(t["display"], "index", f["len"] if f else 0, f["sha256"] if f else "",
               "%s:%d" % (hbi, line), tr, r)


def flashlight_obj(hbi, row, anchor_row, recs, pair, hdata):
    # omnibit tools/movable-flashlight/hbp.py:97-128 (writer), :139-163 (verifier)
    c = Checks()
    total_len = sum(r["span"][1] for r in recs if r["span"] is not None)
    count = len(recs)
    v = row.get("indexed_bytes")
    if v is not None:
        nn = strict_uint(v)
        if nn is None:
            c.unresolved.append("declared_indexed_bytes_malformed")
        else:
            c.eq("indexed_bytes", nn == total_len)
    if anchor_row is not None and anchor_row.tag == "HBIHDR":
        v = anchor_row.get("row_count")
        if v is not None:
            nn = strict_uint(v)
            if nn is None:
                c.unresolved.append("declared_row_count_malformed")
            else:
                c.eq("row_count", nn == count)
    f = pair["facts"] if pair is not None else None
    if f is not None and hdata is not None:
        v = row.get("complete")
        if v is not None:
            if v in ("0", "1"):
                c.eq("complete", (v == "1") == (total_len == f["len"]))
            else:
                c.unresolved.append("declared_complete_malformed")
        c.eq("source_rows", count == len(hdata.splitlines()))
    else:
        c.unresolved.append("hbp_absent")
    if pair is None:
        pair = {"display": "", "rel": None, "facts": None}
    short = f is not None and total_len > f["len"]
    return pair_index(hbi, row.line, pair, c, short)


def hexrow_obj(hbi, row, hbp_rel, hdata, lines):
    # FOLLOW tournament/public-dependencies/gitram/pais_path3_bridge.rs:674-677;
    # asolaria-rotating-lighthouse viewer/github3d.rs:444-458
    c = Checks()
    n = strict_uint(row.get("row"))
    if n is not None and n < 1:
        n = None
    sha_decl = row.get("sha256")
    if not is_hex_lower(sha_decl, 64):
        sha_decl = None
    hex_decl = row.get("hex") or ""
    if n is None:
        c.unresolved.append("declared_row_malformed")
    if sha_decl is None:
        c.unresolved.append("declared_sha256_malformed")
    d = unhex_lower(hex_decl)
    if d is None:
        c.unresolved.append("declared_hex_malformed")
    elif sha_decl is not None:
        c.eq("hex_sha256", sha256_hex(d) == sha_decl)
    line = None
    if hdata is not None and n is not None and n - 1 < len(lines):
        s, e = lines[n - 1]
        line = (s, e, hdata[s:e])
    if line is not None:
        s, e, l = line
        c.eq("hex", l.hex() == hex_decl)
        ls = sha256_hex(l)
        if sha_decl is not None:
            c.eq("sha256", ls == sha_decl)
        presence = "zero" if (l and l.count(0) == len(l)) else "present"
        nbytes, sha, pointer = len(l), ls, "%s:%d:%d-%d" % (hbi, row.line, s, e)
    else:
        c.unresolved.append("hbp_absent" if hdata is None else "target_row_absent")
        presence = "absent"
        nbytes, sha, pointer = 0, "", "%s:%d" % (hbi, row.line)
    tr, r = c.verdict(presence)
    return obj(hbp_rel, "range", nbytes, sha, pointer, tr, r)


def hex_index_obj(hbi, first, nums, t, n_lines):
    c = Checks()
    c.eq("row_sequence", all(n == k + 1 for k, n in enumerate(nums)))
    if t["facts"] is not None:
        c.eq("rows", len(nums) == n_lines)
    else:
        c.unresolved.append("hbp_absent")
    return pair_index(hbi, first, t, c, len(nums) > n_lines)


def rowidx_index_obj(hbi, first, recs, t):
    # omnibit scripts/verify_receipt_privacy.py:83-117
    c = Checks()
    seq, contiguous, cursor, malformed = True, True, 0, False
    for k, r in enumerate(recs):
        if r["row"] is not None and r["span"] is not None:
            off, ln = r["span"]
            seq = seq and r["row"] == k + 1
            contiguous = contiguous and off == cursor
            cursor = off + ln
        else:
            malformed = True
    c.eq("row_sequence", seq)
    if t["facts"] is not None:
        c.eq("coverage", contiguous and cursor == t["facts"]["len"])
    else:
        c.unresolved.append("hbp_absent")
    if malformed:
        c.unresolved.append("declared_range_malformed")
    short = t["facts"] is not None and cursor > t["facts"]["len"]
    return pair_index(hbi, first, t, c, short)


def chain_obj(hbi, sha, n, row, after):
    c = Checks()
    v = row.get("seed")
    seed = None
    if v is not None and is_hex_lower(v, 16):
        seed = v
    else:
        marker = "seed=sha16(EMITTER-SEED|"
        p = row.raw.find(marker)
        if p >= 0:
            rest = row.raw[p + len(marker):]
            q = rest.find(")")
            if q >= 0:
                seed = sha16("EMITTER-SEED|" + rest[:q])
    if seed is None:
        c.unresolved.append("seed_not_declared")
    else:
        emits = [r for r in after if r.tag == "EMIT"]
        prev = seed
        ok = 0
        first_bad = None
        for e in emits:
            pid = e.get("pid") or ""
            name = e.get("name")
            if name is not None and sha16(prev + "|" + name) == pid:
                ok += 1
            elif first_bad is None:
                first_bad = e.line
            prev = pid
        if not emits:
            c.unresolved.append("no_emit_rows")
        elif first_bad is not None:
            c.differ.append("chain_link_differs:%d/%d:line:%d" % (ok, len(emits), first_bad))
        else:
            c.passes.append("chain:%d/%d" % (ok, len(emits)))
    t, r = c.verdict("present")
    return obj(hbi, "chain", n, sha, "%s:%d" % (hbi, row.line), t, r)


def receipt_obj(hbi, sha, n, receipts):
    allr = [r[1] for r in receipts]
    c = Checks()
    if verify_chain(allr):
        c.passes.append("receipt_chain:%d" % len(allr))
    else:
        bad = 0
        for k in range(1, len(allr) + 1):
            if not verify_chain(allr[:k]):
                bad = receipts[k - 1][0]
                break
        c.differ.append("receipt_chain_differs:line:%d" % bad)
    t, r = c.verdict("present")
    return obj(hbi, "chain", n, sha, "%s:%d" % (hbi, receipts[0][0]), t, r)


def center_obj(hbi, sha, n, row, hbp_rows):
    c = Checks()
    mine = [row.get(k) or "" for k in CENTER_MEMBERS]
    h = None
    for r in hbp_rows:
        if r.tag == "CENTER" and all(r.has(k) for k in CENTER_MEMBERS):
            h = r
            break
    if h is None:
        c.unresolved.append("hbp_center_absent")
    else:
        theirs = [h.get(k) or "" for k in CENTER_MEMBERS]
        c.eq("center_equals_hbp", mine == theirs)
        alg, dom = h.get("algorithm"), h.get("domain")
        if alg == "SHA256_UTF8_DOMAIN_NUL_MEMBER_V1" and dom is not None:
            ok = all(sha256_hex((dom + "\0" + m.upper()).encode("utf-8")) == v
                     for m, v in zip(CENTER_MEMBERS, theirs))
            c.eq("domain_nul_member", ok)
        elif alg is not None:
            c.info.append("algorithm_not_recomputed:" + alg)
    she = row.get("sha_equals_hash")
    if she == "0":
        c.eq("sha_ne_hash", mine[2] != mine[4])
    elif she == "1":
        c.eq("sha_eq_hash", mine[2] == mine[4])
    t, r = c.verdict("present")
    return obj(hbi, "center", n, sha, "%s:%d" % (hbi, row.line), t, r)


# ---- hbp crate reader.rs verify_hbp (port of hbp-reader.mjs:118-156) ----
# Mirrors hbp/src/reader.rs blob ee13613f7bd936d06536ce223cc3f57702e8e43f line by line.

def read_sidecar(p):
    # reader.rs:155-161: existsSync, then the bytes decoded with U+FFFD for invalid UTF-8;
    # a present path that cannot be read gives None
    if not os.path.exists(p):
        return None
    try:
        b = read_all(p)
    except OSError:
        return None
    return b.decode("utf-8", "replace")


def unhex_digit(u):
    # reader.rs:163-170
    if 48 <= u <= 57:
        return u - 48
    if 97 <= u <= 102:
        return u - 87
    if 65 <= u <= 70:
        return u - 55
    return None


def node_hex_decode(s):
    # reader.rs:172-185 `Buffer.from(s, 'hex')`: UTF-16 units in pairs, each unit's low byte,
    # stop at the first pair that is not two hex digits, drop an odd trailing unit
    b = s.encode("utf-16-le")
    units = [b[i] | (b[i + 1] << 8) for i in range(0, len(b), 2)]
    out = bytearray()
    for i in range(0, len(units) - 1, 2):
        hi, lo = unhex_digit(units[i] & 0xFF), unhex_digit(units[i + 1] & 0xFF)
        if hi is None or lo is None:
            break
        out.append(hi * 16 + lo)
    return bytes(out)


def regex_capture_after(hay, needle, cls):
    # reader.rs:187-202: the leftmost needle followed by at least one class character
    frm = 0
    while True:
        at = hay.find(needle, frm)
        if at < 0:
            return None
        start = at + len(needle)
        run = 0
        while start + run < len(hay) and cls(hay[start + run]):
            run += 1
        if run:
            return hay[start:start + run]
        frm = at + 1


def swap_suffix(p, ext):
    # reader.rs:143-150
    return p[:-4] + ext if p.endswith(".hbp") else p


def verify_hbp(hbp_path):
    # reader.rs:204-271
    r = {"sha256": None, "bytes": None, "sha": None, "hex": None, "hbi": None, "errors": []}
    try:
        data = read_all(hbp_path)
    except OSError:
        r["errors"].append("hbp missing")
        return r
    sha = sha256_hex(data)
    r["sha256"], r["bytes"] = sha, len(data)
    t = read_sidecar(swap_suffix(hbp_path, ".sha256"))
    if t is not None:
        t = t.strip(JS_WS)
        declared = t
        for i, ch in enumerate(t):
            if ch in JS_WS:
                declared = t[:i]
                break
        r["sha"] = declared == sha
        if not r["sha"]:
            r["errors"].append("sha mismatch")
    t = read_sidecar(swap_suffix(hbp_path, ".hex"))
    if t is not None:
        hx = "".join(ch for ch in t if ch not in JS_WS)
        r["hex"] = node_hex_decode(hx) == data
        if not r["hex"]:
            r["errors"].append("hex round-trip mismatch")
    t = read_sidecar(swap_suffix(hbp_path, ".hbi"))
    if t is not None:
        dsha = regex_capture_after(t, "sha256=", lambda ch: "0" <= ch <= "9" or "a" <= ch <= "f")
        dbytes = regex_capture_after(t, "bytes=", lambda ch: "0" <= ch <= "9")
        r["hbi"] = dsha == sha and dbytes is not None and int(dbytes) == len(data)
        if not r["hbi"]:
            r["errors"].append("hbi sha/bytes mismatch")
    return r


def declares(hay, needle, cls):
    # some needle in the bytes followed by a byte of the class (when the reader.rs:187-202
    # capture exists; needle and class are ASCII, so bytes and lossy text agree)
    i = hay.find(needle)
    while i >= 0:
        j = i + len(needle)
        if j < len(hay) and cls(hay[j]):
            return True
        i = hay.find(needle, i + 1)
    return False


class Tally:
    def __init__(self):
        self.kinds = {k: [0, 0, 0, 0] for k in KINDS}
        self.reasons = {}

    def add(self, o):
        slot = {"+1": 1, "-1": 2, "0": 3}[o["verified"]]
        if o["kind"] in self.kinds:
            self.kinds[o["kind"]][0] += 1
            self.kinds[o["kind"]][slot] += 1
        if o["verified"] != "+1":
            for tok in o["reason"].split("+"):
                key = o["verified"] + ":" + tok.split(":")[0]
                self.reasons[key] = self.reasons.get(key, 0) + 1

    def rows(self, hbis, files):
        out = []
        total = [0, 0, 0, 0]
        for k in KINDS:
            c = self.kinds[k]
            total = [a + b for a, b in zip(total, c)]
            out.append(encode_row("VAULTKIND", [
                ("kind", k), ("objects", str(c[0])), ("verified", str(c[1])),
                ("failed", str(c[2])), ("unresolved", str(c[3]))]))
        for k in sorted(self.reasons, key=lambda s: s.encode("utf-8")):
            out.append(encode_row("VAULTREASON", [("reason", k), ("count", str(self.reasons[k]))]))
        out.append(encode_row("VAULTTOTAL", [
            ("hbi", str(hbis)), ("files", str(files)), ("objects", str(total[0])),
            ("verified", str(total[1])), ("failed", str(total[2])), ("unresolved", str(total[3]))]))
        return out


def run(root):
    out = []
    Vault(root).read(lambda row: out.append(row + "\n"))
    return "".join(out)


def build_cases(spec_path, base):
    """Write the trees of tests/cases/CASES.hbp under `base`; returns the case names in order.
    CASEFILE|case=|path_hex=|data_hex= writes a file, CASELINK|case=|path_hex=|target_hex= a
    symbolic link; paths are relative to base/<case>, and each case's root is base/<case>/root."""
    names = []
    for line in read_all(spec_path).decode("utf-8").split("\n"):
        if not line:
            continue
        tag, fields = parse_row(line)
        f = dict(fields)
        if tag not in ("CASEFILE", "CASELINK"):
            continue
        if f["case"] not in names:
            names.append(f["case"])
            os.makedirs(os.path.join(os.fsencode(base), f["case"].encode("utf-8"), b"root"))
        path = os.path.join(os.fsencode(base), f["case"].encode("utf-8"), bytes.fromhex(f["path_hex"]))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if tag == "CASEFILE":
            with open(path, "wb") as fh:
                fh.write(bytes.fromhex(f["data_hex"]))
        else:
            os.symlink(bytes.fromhex(f["target_hex"]), path)
    return names


def run_cases(spec_path, base):
    out = []
    for n in build_cases(spec_path, base):
        out.append(encode_row("CASE", [("name", n)]) + "\n")
        out.append(run(os.path.join(base, n, "root")))
    return "".join(out)


def check():
    here = os.path.dirname(os.path.abspath(__file__))
    crate = os.path.dirname(here)
    fixtures = os.path.join(crate, "tests", "fixtures")
    expected = os.path.join(crate, "tests", "expected")
    names = sorted(n for n in os.listdir(fixtures) if os.path.isdir(os.path.join(fixtures, n)))
    bad = 0
    for n in names:
        got = run(os.path.join(fixtures, n)).encode("utf-8")
        want = read_all(os.path.join(expected, n + ".hbp"))
        same = got == want
        bad += 0 if same else 1
        print("REFEREE|fixture=%s|bytes=%d|identical=%d|json=0" % (n, len(got), int(same)))
    roots = len(names)
    if sys.platform.startswith("linux"):
        # names that are not UTF-8 and symbolic links: built at check time, not committed
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            got = run_cases(os.path.join(crate, "tests", "cases", "CASES.hbp"), tmp).encode("utf-8")
        want = read_all(os.path.join(expected, "cases.hbp"))
        same = got == want
        bad += 0 if same else 1
        roots += 1
        print("REFEREE|fixture=cases|bytes=%d|identical=%d|json=0" % (len(got), int(same)))
    else:
        print("REFEREE|fixture=cases|skipped=not_linux|json=0")
    print("REFEREE|fixtures=%d|differing=%d|json=0" % (roots, bad))
    return 1 if bad else 0


def main(argv):
    if len(argv) == 2 and argv[1] == "--check":
        return check()
    if len(argv) != 2:
        sys.stderr.write("usage: vault_referee.py <root> | --check\n")
        return 2
    Vault(argv[1]).read(lambda row: sys.stdout.write(row + "\n"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
