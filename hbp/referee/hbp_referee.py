#!/usr/bin/env python3
"""Stdlib referee mirroring the upstream JS line by line, with the JS string rules those lines use
(UTF-16 code-unit sort and slice, the ECMAScript whitespace set, regex search, plain-object keys,
Node's lossy UTF-8 decode and Buffer.from(hex)). No third-party imports.

  hbp-emitter.mjs 16-111 (no cold JSON branch): canonicalStringify, serializeEnvelope, writeHBP
  hbp-reader.mjs 20-40 (detectFormat, parsePipeRow) and 118-156 (verifyHBP)

Run isolated:  python3 -I hbp_referee.py emit <out>             -> <out>/trinity/, <out>/variants/
               python3 -I hbp_referee.py verify <path.hbp>...    -> one verdict row per path
               python3 -I hbp_referee.py check <dir_a> <dir_b>   -> byte-compare two fixture trees
               python3 -I hbp_referee.py expect <upstream-js.hbp> <out> -> compare with the JS rows
"""
import hashlib
import os
import re
import sys

MAGIC = "!HBP-v0"
MAGIC_HBI = "!HBI-v0"
TUPLE_DIMS = 47  # tuple-tag.mjs:11

# ECMAScript WhiteSpace + LineTerminator: the set `\s` and String.prototype.trim use.
JS_SPACE = frozenset("\t\n\x0b\x0c\r \xa0     　﻿") | frozenset(
    chr(c) for c in range(0x2000, 0x200B)
)
JS_LINE_TERMINATORS = frozenset("\n\r  ")


def js_trim(s):
    i, j = 0, len(s)
    while i < j and s[i] in JS_SPACE:
        i += 1
    while j > i and s[j - 1] in JS_SPACE:
        j -= 1
    return s[i:j]


def utf16_key(s):
    # Array.prototype.sort() default order: UTF-16 code units.
    return s.encode("utf-16-be", "surrogatepass")


def js_slice(s, n):
    # s.slice(0, n) counts UTF-16 code units; a pair cut in half decodes to U+FFFD.
    return s.encode("utf-16-le", "surrogatepass")[: 2 * n].decode("utf-16-le", "replace")


def json_quote(s):
    # JSON.stringify(<string>): V8 escape set.
    out = ['"']
    for ch in s:
        o = ord(ch)
        if ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif ch == "\b":
            out.append("\\b")
        elif ch == "\t":
            out.append("\\t")
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\f":
            out.append("\\f")
        elif ch == "\r":
            out.append("\\r")
        elif o < 0x20:
            out.append("\\u%04x" % o)
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def canonical_stringify(value):  # hbp-emitter.mjs:16-26
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int):
        return str(value)  # equals JSON.stringify(Number) for |n| <= 2**53 - 1
    if isinstance(value, str):
        return json_quote(value)
    if isinstance(value, list):
        return "[" + ",".join(canonical_stringify(v) for v in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value.keys(), key=utf16_key)
        return "{" + ",".join(json_quote(k) + ":" + canonical_stringify(value[k]) for k in keys) + "}"
    raise TypeError("unsupported value type: %r" % (value,))


def _value_line(value):
    return value if isinstance(value, str) else canonical_stringify(value)


def _type(env):
    ty = env.get("type")
    return "message" if ty is None else ty  # envelope.type ?? 'message'


def serialize_envelope(env):  # hbp-emitter.mjs:28-63
    ty = _type(env)
    lines = ["%s %s" % (MAGIC, ty), "type=%s" % ty]
    if env.get("tupleTag") is not None:
        lines.append("[tuple]")
        tup = env["tupleTag"]
        for i in range(TUPLE_DIMS):
            v = tup[i] if i < len(tup) and tup[i] is not None else ""
            lines.append("D%d=%s" % (i + 1, v))
    if env.get("payload") is not None:  # envelope.payload != null
        lines.append("[payload]")
        lines.append(_value_line(env["payload"]))
    if env.get("metadata") is not None:
        lines.append("[metadata]")
        for k in sorted(env["metadata"].keys(), key=utf16_key):
            lines.append("%s=%s" % (k, _value_line(env["metadata"][k])))
    lines.append("%s end" % MAGIC)
    return "\n".join(lines)


def _hex_wrap_64(b):
    h = b.hex()
    parts = [h[i:i + 64] for i in range(0, len(h), 64)]
    return "\n".join(parts) + "\n"


def write_hbp(dest_path, env):  # hbp-emitter.mjs:65-111 minus cold branch
    body = serialize_envelope(env)
    data = body.encode("utf-8")
    sha = hashlib.sha256(data).hexdigest()
    hbp_path = dest_path + ".hbp"
    base = os.path.basename(hbp_path)
    with open(hbp_path, "wb") as f:
        f.write(data)
    with open(dest_path + ".sha256", "wb") as f:
        f.write(("%s  %s\n" % (sha, base)).encode("utf-8"))
    with open(dest_path + ".hex", "wb") as f:
        f.write(_hex_wrap_64(data).encode("utf-8"))
    hbi = "\n".join([
        MAGIC_HBI,
        "packet=%s" % base,
        "bytes=%d" % len(data),
        "sha256=%s" % sha,
        "type=%s" % _type(env),
    ])
    with open(dest_path + ".hbi", "wb") as f:
        f.write((hbi + "\n").encode("utf-8"))
    return {"hbp": hbp_path, "sha": sha, "bytes": len(data)}


def detect_format(text):  # hbp-reader.mjs:20-27
    head = js_slice(text, 64)
    if head.startswith(MAGIC):
        return "hbp-v0-envelope"
    if head.startswith(MAGIC_HBI):
        return "hbi-v0-index"
    # /^HBPv1\|/m : at the start of the head or right after a LineTerminator
    if head.startswith("HBPv1|") or any(
        c in JS_LINE_TERMINATORS and head.startswith("HBPv1|", i + 1) for i, c in enumerate(head)
    ):
        return "hbpv1-pipe"
    if head.startswith("HBI1|"):
        return "hbi1-pipe"
    return "unknown"


def _array_index(k):
    # canonical array-index keys ("0".."4294967294") enumerate first, ascending
    if not k or not all("0" <= c <= "9" for c in k) or (len(k) > 1 and k[0] == "0"):
        return None
    n = int(k)
    return n if n < 4294967295 else None


def parse_pipe_row(line):  # hbp-reader.mjs:30-40
    parts = js_trim(line).split("|")
    tag = parts[0]
    fields = {}  # a repeated key keeps its first position and takes the last value, as in JS
    for i in range(1, len(parts)):
        p = parts[i]
        eq = p.find("=")
        if eq > 0:
            k, v = p[:eq], p[eq + 1:]
        elif p:
            k, v = "_%d" % i, p
        else:
            continue
        if k == "__proto__":
            continue  # the __proto__ setter ignores a string value
        fields[k] = v
    idx = sorted((k for k in fields if _array_index(k) is not None), key=_array_index)
    named = [k for k in fields if _array_index(k) is None]
    return tag, [(k, fields[k]) for k in idx + named]


def _read_sidecar(p):
    # existsSync + readFileSync(p, 'utf8'): lossy decode (U+FFFD, as Node's decoder).
    if not os.path.exists(p):
        return None
    try:
        with open(p, "rb") as f:
            data = f.read()
    except OSError:
        return None  # upstream throws here; the Rust port returns None
    return data.decode("utf-8", "replace")


_HEXV = {c: i for i, c in enumerate("0123456789abcdef")}
_HEXV.update({c: i + 10 for i, c in enumerate("ABCDEF")})


def node_hex_decode(s):
    # Buffer.from(s, 'hex'): UTF-16 units in pairs, each unit's low byte, stop at the first bad pair.
    u = s.encode("utf-16-le", "surrogatepass")
    units = [u[i] | (u[i + 1] << 8) for i in range(0, len(u), 2)]
    out = bytearray()
    for i in range(0, len(units) - 1, 2):
        a = _HEXV.get(chr(units[i] & 0xFF))
        b = _HEXV.get(chr(units[i + 1] & 0xFF))
        if a is None or b is None:
            break
        out.append(a * 16 + b)
    return bytes(out)


def _swap(hbp_path, ext):  # hbpPath.replace(/\.hbp$/, ext)
    return hbp_path[:-4] + ext if hbp_path.endswith(".hbp") else hbp_path


def verify_hbp(hbp_path):  # hbp-reader.mjs:118-156
    res = {"sha_ok": None, "hex_ok": None, "hbi_ok": None, "errors": [], "ok": None}
    if not os.path.exists(hbp_path):
        res["errors"].append("hbp missing")
        return res  # `ok` stays unset (undefined) on this return
    with open(hbp_path, "rb") as f:
        data = f.read()
    sha = hashlib.sha256(data).hexdigest()
    txt = _read_sidecar(_swap(hbp_path, ".sha256"))
    if txt is not None:
        trimmed = js_trim(txt)
        declared = trimmed
        for i, c in enumerate(trimmed):  # .split(/\s+/)[0]
            if c in JS_SPACE:
                declared = trimmed[:i]
                break
        res["sha_ok"] = declared == sha
        if not res["sha_ok"]:
            res["errors"].append("sha mismatch: declared %s vs actual %s" % (js_slice(declared, 16), sha[:16]))
    txt = _read_sidecar(_swap(hbp_path, ".hex"))
    if txt is not None:
        hx = "".join(c for c in txt if c not in JS_SPACE)  # .replace(/\s+/g, '')
        res["hex_ok"] = node_hex_decode(hx) == data
        if not res["hex_ok"]:
            res["errors"].append("hex round-trip mismatch")
    txt = _read_sidecar(_swap(hbp_path, ".hbi"))
    if txt is not None:
        ds = re.search(r"sha256=([0-9a-f]+)", txt)
        db = re.search(r"bytes=([0-9]+)", txt)
        # Number(<digits>) === bytes.length holds exactly when the digits' value equals it
        res["hbi_ok"] = bool(ds) and bool(db) and ds.group(1) == sha and int(db.group(1)) == len(data)
        if not res["hbi_ok"]:
            res["errors"].append("hbi sha/bytes mismatch")
    res["ok"] = len(res["errors"]) == 0
    return res


def _js(v):
    return {None: "null", True: "true", False: "false"}[v]


def verdict(r):
    ok = "undefined" if r["ok"] is None else _js(r["ok"])
    errs = ",".join(e.encode("utf-8").hex() for e in r["errors"])
    return "sha_ok=%s|hex_ok=%s|hbi_ok=%s|ok=%s|errors_hex=%s" % (
        _js(r["sha_ok"]), _js(r["hex_ok"]), _js(r["hbi_ok"]), ok, errs)


# Shared fixtures (identical literals in tests/common/mod.rs and the cold-lane JS measurement).
def fixtures():
    return [
        ("fix1", {"type": "message", "tupleTag": ["alpha", "beta"], "payload": "hello world",
                  "metadata": {"z": "last", "a": "first"}}),
        ("fix2", {"type": "event", "payload": {"a": 1, "b": 2}, "metadata": {"k": ["x", 3, True, None]}}),
        ("fix3", {"type": "message", "payload": {"msg": 'a"b\nc\tD'}}),
        ("sortkeys", {"type": "message", "payload": {"｡": 1, "\U0001F600": 2},
                      "metadata": {"｡": "a", "\U0001F600": "b"}}),
        ("nullpayload", {"type": "message", "payload": None, "metadata": {"k": "v"}}),
        ("base", {"type": "message", "tupleTag": ["a"], "payload": "hello", "metadata": {"k": "v"}}),
        ("x-bytes=v", {"type": "message", "payload": "p"}),
        ("x-sha256=q", {"type": "message", "payload": "p"}),
    ]


def variant_table(base_bytes, base_sha):
    bom = b"\xef\xbb\xbf"
    arabic = "".join(chr(0x660 + int(d)) for d in str(base_bytes))
    return [
        ("v00_clean", "base", "hbp", None),
        ("v01_hex_odd_nibble", "base", "hex", ("append", b"0")),
        ("v02_hex_trailing_zz", "base", "hex", ("append", b"zz\n")),
        ("v03_sha_invalid_utf8", "base", "sha256", ("prefix", b"\xff")),
        ("v04_sha_bom", "base", "sha256", ("prefix", bom)),
        ("v05_sha_nel_sep", "base", "sha256", ("first", b"  ", "\x85".encode("utf-8"))),
        ("v06_hbi_upper_suffix", "base", "hbi", ("first", b"\ntype=", b"ABC\ntype=")),
        ("v07_hbi_garbage_binary", "base", "hbi", ("replace", b"\xff\xfe")),
        ("v08_hex_garbage_binary", "base", "hex", ("replace", b"\xff")),
        ("v09_sha_astral_declared", "base", "sha256",
         ("first", base_sha.encode(), ("\U0001F600" * 20).encode("utf-8"))),
        ("v10_hbi_decoy_line", "base", "hbi", ("prefix", b"xsha256=zz\n")),
        ("v11_hex_bom", "base", "hex", ("prefix", bom)),
        ("v12_sha_empty", "base", "sha256", ("replace", b"")),
        ("v13_hbi_arabic_digits", "base", "hbi",
         ("first", ("bytes=%d" % base_bytes).encode(), ("bytes=" + arabic).encode("utf-8"))),
        ("v14_name_bytes", "x-bytes=v", "hbp", None),
        ("v15_name_sha", "x-sha256=q", "hbp", None),
        ("v16_hex_low_byte", "base", "hex", ("first", b"2", "Ĳ".encode("utf-8"))),
        ("v17_hex_absent", "base", "hex", ("remove",)),
    ]


def _apply(data, edit):
    if edit is None:
        return data
    kind = edit[0]
    if kind == "prefix":
        return edit[1] + data
    if kind == "append":
        return data + edit[1]
    if kind == "replace":
        return edit[1]
    if kind == "first":
        at = data.index(edit[1])
        return data[:at] + edit[2] + data[at + len(edit[1]):]
    return None  # remove


def build_variants(trinity_dir, out):
    with open(os.path.join(trinity_dir, "base.hbp"), "rb") as f:
        base = f.read()
    paths = []
    for vdir, name, ext, edit in variant_table(len(base), hashlib.sha256(base).hexdigest()):
        d = os.path.join(out, vdir)
        os.makedirs(d, exist_ok=True)
        for e in ("hbp", "hbi", "sha256", "hex"):
            with open(os.path.join(trinity_dir, "%s.%s" % (name, e)), "rb") as f:
                data = f.read()
            if e == ext:
                data = _apply(data, edit)
            if data is not None:
                with open(os.path.join(d, "%s.%s" % (name, e)), "wb") as f:
                    f.write(data)
        paths.append(("%s/%s.hbp" % (vdir, name), os.path.join(d, name + ".hbp")))
    return paths


def emit(out):
    tri = os.path.join(out, "trinity")
    os.makedirs(tri, exist_ok=True)
    for name, env in fixtures():
        write_hbp(os.path.join(tri, name), env)
    return build_variants(tri, os.path.join(out, "variants"))


def expected_paths():
    names = {"relay.txt"}
    for name, _ in fixtures():
        names.update("trinity/%s.%s" % (name, e) for e in ("hbp", "hbi", "sha256", "hex"))
    for vdir, name, ext, edit in variant_table(0, ""):
        for e in ("hbp", "hbi", "sha256", "hex"):
            if not (e == ext and edit == ("remove",)):
                names.add("%s/%s/%s.%s" % ("variants", vdir, name, e))
    return names


def _tree(d):
    out = set()
    for root, _, files in os.walk(d):
        for f in files:
            out.add(os.path.relpath(os.path.join(root, f), d).replace(os.sep, "/"))
    return out


def check(a, b):
    want = expected_paths()
    ta, tb = _tree(a), _tree(b)
    bad = 0
    for label, t in (("A", ta), ("B", tb)):
        for p in sorted(want - t):
            print("MISSING in %s: %s" % (label, p))
            bad += 1
        for p in sorted(t - want):
            print("EXTRA in %s: %s" % (label, p))
            bad += 1
    same = 0
    for p in sorted(want & ta & tb):
        with open(os.path.join(a, p), "rb") as f:
            da = f.read()
        with open(os.path.join(b, p), "rb") as f:
            db = f.read()
        if da == db:
            same += 1
        else:
            print("DIFF %s" % p)
            bad += 1
    print("%d/%d files identical" % (same, len(want)))
    return 1 if bad else 0


def _rows(path, tag):
    with open(path, "rb") as f:
        text = f.read().decode("utf-8")
    out = []
    for line in text.split("\n"):
        if line:
            t, fields = parse_pipe_row(line)
            if t == tag:
                out.append(dict(fields))
    return out


def _unhex(h):
    return bytes.fromhex(h).decode("utf-8")


def expect(exp_path, out):
    ok = fail = 0

    def check_eq(label, got, want):
        nonlocal ok, fail
        if got == want:
            ok += 1
        else:
            fail += 1
            print("FAIL %s: got %r want %r" % (label, got, want))

    emits = _rows(exp_path, "EMIT")
    check_eq("EMIT count", len(emits), len(fixtures()))
    for r in emits:
        stem = os.path.join(out, "trinity", r["name"])
        for e, key in (("hbp", "hbp"), ("hbi", "hbi"), ("sha256", "sha256"), ("hex", "hex")):
            with open("%s.%s" % (stem, e), "rb") as f:
                data = f.read()
            check_eq("%s.%s" % (r["name"], e), hashlib.sha256(data).hexdigest(), r[key])
            if e == "hbp":
                check_eq("%s bytes" % r["name"], str(len(data)), r["hbp_bytes"])
    verifies = {r["case"]: r for r in _rows(exp_path, "VERIFY")}
    labels = [lbl for lbl, _ in build_variants(os.path.join(out, "trinity"), os.path.join(out, "variants"))]
    check_eq("VERIFY count", len(verifies), len(labels) + 1)
    js_fmt = "sha_ok=%(sha_ok)s|hex_ok=%(hex_ok)s|hbi_ok=%(hbi_ok)s|ok=%(ok)s|errors_hex=%(errors_hex)s"
    for lbl in labels:
        got = verdict(verify_hbp(os.path.join(out, "variants", lbl)))
        check_eq(lbl, got, js_fmt % verifies[lbl])
    got = verdict(verify_hbp(os.path.join(out, "absent", "none.hbp")))
    check_eq("missing", got, js_fmt % verifies["missing"])
    for r in _rows(exp_path, "DETECT"):
        text = _unhex(r["text_hex"])
        check_eq("detect %r" % text, detect_format(text), r["format"])
    for r in _rows(exp_path, "PIPE"):
        line = _unhex(r["line_hex"])
        tag, fields = parse_pipe_row(line)
        got = (tag.encode("utf-8").hex(),
               ",".join("%s:%s" % (k.encode("utf-8").hex(), v.encode("utf-8").hex()) for k, v in fields))
        check_eq("pipe %r" % line, got, (r["tag_hex"], r["fields_hex"]))
    print("%d OK / %d FAIL" % (ok, fail))
    return 1 if fail else 0


def main(argv):
    if len(argv) >= 3 and argv[1] == "emit":
        emit(argv[2])
        return 0
    if len(argv) >= 3 and argv[1] == "verify":
        bad = 0
        for p in argv[2:]:
            r = verify_hbp(p)
            print("%s %s" % (p, verdict(r)))
            bad += 0 if r["ok"] else 1
        return 1 if bad else 0
    if len(argv) >= 4 and argv[1] == "check":
        return check(argv[2], argv[3])
    if len(argv) >= 4 and argv[1] == "expect":
        return expect(argv[2], argv[3])
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
