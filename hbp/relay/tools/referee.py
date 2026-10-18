#!/usr/bin/env python3
# referee.py — stdlib Python referee for the PHASE-1 RELAY auto-driver (E=0).
# Mirrors the upstream JS one function at a time:
#   relay-envelope.mjs  (clean/rowPrefix/buildRow/parseRow, sha16/sha256hex, classOf)
#   relay-hbp-writer.mjs (fileSize/appendBlob/appendRow)
#   relay-hbi-indexer.mjs (MAX_PAYLOAD/appendIndex/loadIndex/readBlob)
#   relay-carveout.mjs  (canonicalize/assertReadAllowed structural guard; scan mechanism)
#   relay-driver.mjs    (lanePaths/laneHead/emit/verifyLane/reverseWalk)
# Integer arithmetic only; no float; no JSON. Files are read as bytes and decoded the way
# Buffer.toString('utf8') decodes them (U+FFFD per ill-formed subsequence); JS strings are
# mirrored as UTF-16 code units where the JS slices or compares them (carve-out canonicalize,
# loadIndex tokens); JS Number() and Number::toString are computed with Python ints.
#
# Usage:
#   python3 referee.py            run the 23-assertion suite, print PASS/FAIL
#   python3 referee.py --check    additionally assert 23/0 and byte-identity to the embedded gold
#   python3 referee.py --cross <examples/relay_ops binary> [seed ...]
#                                 run generated op scripts through the Rust port and this referee
#                                 (seeds default 1 2 3) and require equal results and lane bytes
import errno
import hashlib
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile

# ---- relay-envelope.mjs ----
SPEC_VERSION = "1"
GENESIS = "0000000000000000"
READ_VERBS = {"NOTE", "STATUS", "ANSWER", "OBSERVE", "RECALL-REQ", "ACK"}
ACTION_VERBS = {"EXEC", "WRITE", "MINT", "FIRE", "RETIRE", "COSIGN"}
CONTROL_VERBS = {"HOLD"}


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


FIELD_ORDER = ["v", "from", "to", "verb", "seq", "ts", "pid",
               "payload_sha256", "hbi_off", "len", "token", "antecedent", "sig"]


def _is_bad(ch):
    o = ord(ch)
    return ch in "|{}" or o <= 0x1F or o == 0x7F or o == 0x2028 or o == 0x2029


def clean(name, v):
    s = str(v)
    if any(_is_bad(c) for c in s):
        raise ValueError("FIELD_INJECTION_REJECT: field " + name +
                         " contains a forbidden char ( | { } or a control/separator )")
    return s


def row_prefix(f):
    return "RELAY|" + "|".join(k + "=" + clean(k, f.get(k, "")) for k in FIELD_ORDER)


def build_row(f):
    filled = {"token": "-", "sig": "-"}
    filled.update(f)
    for k in FIELD_ORDER:
        if filled.get(k) is None:
            raise ValueError("MISSING_FIELD: " + k)
    prefix = row_prefix(filled)
    return prefix + "|row_hash=" + sha16(prefix)


def _has_control_or_sep(s):
    for ch in s:
        o = ord(ch)
        if o <= 0x1F or o == 0x7F or o == 0x2028 or o == 0x2029:
            return True
    return False


def parse_row(line):
    s = line[:-1] if line.endswith("\n") else line
    if _has_control_or_sep(s):
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
    for i, want in enumerate(FIELD_ORDER):
        if keys[i] != want:
            raise ValueError("PARSE_REJECT: field-order at %d got %s want %s" % (i, keys[i], want))
    f["row_hash"] = row_hash
    f["_prefix"] = prefix
    return f


# ---- node:fs reads (readFileSync / openSync+readSync), with node's error text ----
_ERRNO_TEXT = {
    errno.EPERM: ("EPERM", "operation not permitted"),
    errno.ENOENT: ("ENOENT", "no such file or directory"),
    errno.EIO: ("EIO", "i/o error"),
    errno.EACCES: ("EACCES", "permission denied"),
    errno.ENOTDIR: ("ENOTDIR", "not a directory"),
    errno.EISDIR: ("EISDIR", "illegal operation on a directory"),
    errno.EMFILE: ("EMFILE", "too many open files"),
    errno.ENAMETOOLONG: ("ENAMETOOLONG", "name too long"),
    errno.ELOOP: ("ELOOP", "too many symbolic links encountered"),
}


def _fs_error(e, syscall, path=None):
    at = "" if path is None else " '%s'" % path
    known = _ERRNO_TEXT.get(e.errno)
    if known:
        return ValueError("%s: %s, %s%s" % (known[0], known[1], syscall, at))
    return ValueError("%s%s: %s" % (syscall, at, e))


def _read_file(path):
    # readFileSync(path): open names the path in its error; a read error (EISDIR) does not.
    try:
        fd = os.open(path, os.O_RDONLY)
    except OSError as e:
        raise _fs_error(e, "open", path)
    try:
        chunks = []
        while True:
            try:
                b = os.read(fd, 1 << 16)
            except OSError as e:
                raise _fs_error(e, "read")
            if not b:
                return b"".join(chunks)
            chunks.append(b)
    finally:
        os.close(fd)


def _read_text_if_exists(path):
    # existsSync(p) ? readFileSync(p, 'utf8') : <empty> (relay-driver.mjs:59/81, relay-hbi-indexer.mjs:15-16)
    if not os.path.exists(path):
        return ""
    return _read_file(path).decode("utf-8", "replace")


def _u16(s):
    b = s.encode("utf-16-le", "surrogatepass")
    return [b[i] | (b[i + 1] << 8) for i in range(0, len(b), 2)]


def _from_u16(units):
    return bytes(x for u in units for x in (u & 0xFF, u >> 8)).decode("utf-16-le", "surrogatepass")


# ---- relay-hbp-writer.mjs ----
def file_size(p):
    return os.path.getsize(p) if os.path.exists(p) else 0


def append_blob(payloads_path, buf):
    off = file_size(payloads_path)
    with open(payloads_path, "ab") as fh:
        fh.write(buf)
    return off, len(buf)


def append_row(hbp_path, row):
    off = file_size(hbp_path)
    with open(hbp_path, "ab") as fh:
        fh.write((row + "\n").encode("utf-8"))
    return off


# ---- JS Number(string) and Number::toString, in integers ----
_JS_SPACE = ("\t\n\x0b\x0c\r             "
             "     　﻿")
_DEC_RE = re.compile(r"([+-]?)(?:(Infinity)|([0-9]*)(?:\.([0-9]*))?(?:[eE]([+-]?[0-9]+))?)", re.ASCII)
_RADIX_RE = re.compile(r"0(?:[xX]([0-9a-fA-F]+)|[oO]([0-7]+)|[bB]([01]+))", re.ASCII)


def _digits_to_int(d):
    n = 0
    for i in range(0, len(d), 1000):
        chunk = d[i:i + 1000]
        n = n * 10 ** len(chunk) + int(chunk)
    return n


def _round_ratio(p, q):
    # nearest double to p/q > 0 (ties to even) as (m, e) with value m * 2**e, or None (Infinity)
    s = 53 - (p.bit_length() - q.bit_length())
    while True:
        se = min(s, 1074)
        num, den = (p << se, q) if se >= 0 else (p, q << -se)
        quo, rem = divmod(num, den)
        if quo >= 1 << 53 and se == s:
            s -= 1
            continue
        if 2 * rem > den or (2 * rem == den and quo & 1):
            quo += 1
        e = -se
        if quo == 1 << 53:
            quo, e = 1 << 52, e + 1
        return None if e > 971 else (quo, e)


def _number(s):
    # ECMA-262 StringToNumber: ("nan",) | ("inf", neg) | ("fin", neg, m, e)
    t = s.strip(_JS_SPACE)
    if t == "":
        return ("fin", False, 0, 0)
    m = _RADIX_RE.fullmatch(t)
    if m:
        digits, radix = next((g, r) for g, r in zip(m.groups(), (16, 8, 2)) if g is not None)
        r = _round_ratio(int(digits, radix), 1) if int(digits, radix) else (0, 0)
        return ("fin", False) + r if r else ("inf", False)
    m = _DEC_RE.fullmatch(t)
    if not m:
        return ("nan",)
    neg = m.group(1) == "-"
    if m.group(2):
        return ("inf", neg)
    ip, fp, ex = m.group(3) or "", m.group(4) or "", m.group(5)
    if ip == "" and fp == "":
        return ("nan",)
    if ex is None:
        e10 = 0
    else:
        mag_digits = ex.lstrip("+-").lstrip("0")
        e10 = (10 ** 13 if len(mag_digits) > 13 else int(mag_digits or "0")) * (-1 if ex.startswith("-") else 1)
    e10 -= len(fp)
    sig = (ip + fp).lstrip("0")
    if sig == "":
        return ("fin", neg, 0, 0)
    if len(sig) + e10 >= 310:
        return ("inf", neg)
    if len(sig) + e10 <= -324:
        return ("fin", neg, 0, 0)
    n = _digits_to_int(sig)
    r = _round_ratio(n * 10 ** e10, 1) if e10 >= 0 else _round_ratio(n, 10 ** -e10)
    return ("fin", neg) + r if r else ("inf", neg)


def _nonneg_integer(v):
    # Number.isInteger(x) && !(x < 0): the exact integer value, or None
    if v[0] != "fin":
        return None
    _, neg, m, e = v
    if m == 0:
        return 0
    if neg:
        return None
    if e >= 0:
        return m << e
    return m >> -e if m % (1 << -e) == 0 else None


def _int_to_js_string(x):
    # Number::toString for a non-negative integer double x: shortest round-trip digits, closest, even
    if x.bit_length() <= 53:
        return str(x)
    m, e = _round_ratio(x, 1)
    hi = 4 * x + (1 << (e + 1))
    lo = 4 * x - ((1 << e) if m == 1 << 52 else (1 << (e + 1)))
    inclusive = m % 2 == 0
    n = len(str(x))
    for k in range(1, n + 1):
        step = 10 ** (n - k)
        cands = []
        for sd in (x // step, x // step + 1):
            c4 = 4 * sd * step
            if lo < c4 < hi or (inclusive and c4 in (lo, hi)):
                cands.append((abs(sd * step - x), sd % 2, sd * step))
        if cands:
            c = min(cands)[2]
            break
    full = str(c)
    if len(full) <= 21:
        return full
    sig = full.rstrip("0")
    return sig[0] + ("." + sig[1:] if len(sig) > 1 else "") + "e+" + str(len(full) - 1)


# ---- relay-hbi-indexer.mjs ----
MAX_PAYLOAD = 8 * 1024 * 1024
IDX_FIELDS = ["row_hash", "row_off", "row_len", "pid", "verb", "cls",
              "from", "to", "ts", "seq", "payload_off", "payload_len"]


def append_index(hbi_path, rec):
    line = "IDX|" + "|".join(k + "=" + str(rec[k]) for k in IDX_FIELDS)
    with open(hbi_path, "ab") as fh:
        fh.write((line + "\n").encode("utf-8"))


def load_index(hbi_path):
    out = []
    for ln in _read_text_if_exists(hbi_path).split("\n"):
        if not ln.startswith("IDX|"):
            continue
        f = {}
        for t in ln[4:].split("|"):
            u = _u16(t)
            e = u.index(0x3D) if 0x3D in u else -1
            # t.slice(0, e) / t.slice(e + 1) on UTF-16 units; e = -1 gives key t.slice(0, -1), value t
            f[_from_u16(u[:e])] = _from_u16(u[e + 1:])
        out.append(f)
    return out


def read_blob(payloads_path, off, length):
    off = _nonneg_integer(_number(str(off)))
    length = _nonneg_integer(_number(str(length)))
    if off is None or length is None:
        raise ValueError("BOUNDS_REJECT: bad off/len")
    if length > MAX_PAYLOAD:
        raise ValueError("BOUNDS_REJECT: len %s exceeds cap %d" % (_int_to_js_string(length), MAX_PAYLOAD))
    size = file_size(payloads_path)
    m, e = _round_ratio(off + length, 1) if off + length else (0, 0)
    total = m << e if e >= 0 else m >> -e
    if total > size:
        raise ValueError("BOUNDS_REJECT: off+len %s exceeds store size %d" % (_int_to_js_string(total), size))
    try:
        fd = os.open(payloads_path, os.O_RDONLY)
    except OSError as e:
        raise _fs_error(e, "open", payloads_path)
    try:
        out = b""
        while len(out) < length:
            try:
                b = os.pread(fd, length - len(out), off + len(out))
            except OSError as e:
                raise _fs_error(e, "read")
            if not b:
                break
            out += b
        return out
    finally:
        os.close(fd)


# ---- relay-carveout.mjs ----
# relay-carveout.mjs:14-26 detection table, as bytes regexes over the Latin-1 text scan() builds.
# Python bytes patterns use ASCII \b and ASCII-only IGNORECASE, as a JS regex without the u flag
# does on Latin-1 text; JS \s on that text also includes NBSP (0xA0), so \s/\S are spelled out.
_WS = rb"[\t\n\x0b\x0c\r \xa0]"
_NWS = rb"[^\t\n\x0b\x0c\r \xa0]"
PATTERNS = [
    (re.compile(rb"-----BEGIN [A-Z2 ]*PRIVATE KEY-----"), "pem-private-key-header"),
    (re.compile(rb"-----BEGIN OPENSSH " + rb"PRIVATE KEY-----"), "openssh-private-key"),
    (re.compile(rb"\bAKIA[0-9A-Z]{16}\b"), "aws-access-key-id"),
    (re.compile(rb"\bgh[pousr]_[A-Za-z0-9]{36,}\b"), "github-token"),
    (re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"), "slack-token"),
    (re.compile(rb"ssh-(rsa|ed25519) AAAA[0-9A-Za-z+/]{40,}"), "ssh-pubkey-material"),
    (re.compile(rb"\bCHARM_[A-Z0-9_]{4,}\b"), "charm-secret-marker"),
    (re.compile(rb"\bbeast-keys?\b", re.I), "beast-keys-marker"),
    (re.compile(rb"decrypted[-_]?vault", re.I), "decrypted-vault-marker"),
    (re.compile(rb'"?private_key"?' + _WS + rb"*[:=]", re.I), "private_key-field"),
    (re.compile(rb"\b(api[_-]?key|secret|password|passwd|bearer)\b" + _WS + rb"*[:=]" + _WS + rb"*" +
                _NWS + rb"{8,}", re.I), "secret-assignment"),
]
DENY_SEGMENTS = {".ssh", ".gnupg", "vault", "sovereignty-vault", "decryptedvault",
                 "decrypted-vault", "decrypted_vault", "beast-keys", "key", "keys",
                 "secret", "secrets", "credential", "credentials"}


def scan(buf):
    text = bytes(buf) if isinstance(buf, (bytes, bytearray)) else str(buf).encode("latin-1")
    reasons = [tag for rx, tag in PATTERNS if rx.search(text)]
    return {"hit": len(reasons) > 0, "reasons": reasons}


def _posix_dirname(p):
    if p == "":
        return "."
    has_root = p.startswith("/")
    t = p.rstrip("/") or "/"
    i = t.rfind("/")
    if i < 0:
        return "/" if has_root else "."
    return "/" if i == 0 else t[:i]


def _posix_resolve(p):
    # node path.posix.resolve: join to cwd when relative, then collapse '.', '..' and repeated '/'
    if not p.startswith("/"):
        p = os.getcwd() + "/" + p
    out = []
    for seg in p.split("/"):
        if seg in ("", "."):
            continue
        if seg == "..":
            if out:
                out.pop()
            continue
        out.append(seg)
    return "/" + "/".join(out)


def canonicalize(abs_path):
    # relay-carveout.mjs:40-52, as UTF-16 units (cur.slice(parent.length + 1) cuts a UTF-16 index)
    cur = abs_path
    tail = []
    while cur and not os.path.exists(cur):
        parent = _posix_dirname(cur)
        if parent == cur:
            break
        u = _u16(cur)
        tail.insert(0, u[min(len(_u16(parent)) + 1, len(u)):])
        cur = parent
    base = cur
    if os.path.exists(cur):
        try:
            base = os.fsencode(os.path.realpath(cur)).decode("utf-8", "replace")
        except OSError:
            base = cur
    out = _u16(base)
    for c in tail:
        while c and c[-1] in (0x2E, 0x20):
            c = c[:-1]
        out = out + [0x2F] + c
    return out


def _has_dollar_stream(comp):
    for i, ch in enumerate(comp):
        if ch == "$" and i + 1 < len(comp):
            n = comp[i + 1]
            if n.isascii() and (n.isalpha() or n == "_"):
                return True
    return False


def _is_short_name_alias(comp):
    stripped = comp.rstrip("0123456789")
    return len(stripped) < len(comp) and stripped.endswith("~")


def _strip_leading_drive(abs_path):
    if len(abs_path) >= 2 and abs_path[0].isascii() and abs_path[0].isalpha() and abs_path[1] == ":":
        return abs_path[2:]
    return abs_path


def _deny_dir_match(canon_units):
    # DENY_DIR_RE with the i flag folds ASCII only: a segment holding a non-ASCII unit never matches
    seg = []
    for u in canon_units + [0x2F]:
        if u == 0x2F:
            if seg and all(x < 0x80 for x in seg) and bytes(seg).decode("ascii").lower() in DENY_SEGMENTS:
                return True
            seg = []
        else:
            seg.append(u)
    return False


def assert_read_allowed(src_path, allow_root=None):
    abs_path = _posix_resolve(src_path)
    after_drive = _strip_leading_drive(abs_path)
    if ":" in after_drive:
        raise ValueError("CARVEOUT_PATH_DENY: NTFS stream/ADS syntax not allowed: " + abs_path)
    for comp in re.split(r"[\\/]", after_drive):
        if _has_dollar_stream(comp):
            raise ValueError("CARVEOUT_PATH_DENY: NTFS $-stream component not allowed: " + abs_path)
        if _is_short_name_alias(comp):
            raise ValueError("CARVEOUT_PATH_DENY: 8.3 short-name alias not allowed: " + abs_path)
    canon = [0x2F if u == 0x5C else u for u in canonicalize(abs_path)]
    if _deny_dir_match(canon):
        raise ValueError("CARVEOUT_PATH_DENY: EMIT may not read carve-out dir: " +
                         abs_path + " (canonical: " + _from_u16(canon) + ")")
    if allow_root:
        root = canonicalize(_posix_resolve(allow_root))
        a = canonicalize(abs_path)
        if a != root and a[:len(root) + 1] != root + [0x2F]:
            raise ValueError("ALLOWLIST_DENY: EMIT path outside allow-root: " + abs_path)
    return abs_path


# ---- relay-driver.mjs ----
MAX_SAFE_INTEGER = 9007199254740991


def lane_paths(d, seat):
    return {"hbp": "%s/relay-%s.hbp" % (d, seat),
            "hbi": "%s/relay-%s.hbi" % (d, seat),
            "payloads": "%s/relay-%s.payloads" % (d, seat)}


def _canonical_seq(s):
    if s == "" or not all(c.isascii() and c.isdigit() for c in s):
        return None
    n = int(s)
    if n > MAX_SAFE_INTEGER:
        return None
    return n


def lane_head(hbi_path):
    idx = load_index(hbi_path)
    if not idx:
        return {"row_hash": GENESIS, "seq": 0}
    last = idx[-1]
    seq_s = last.get("seq", "undefined")  # an absent key is JS undefined, printed "undefined"
    seq = _canonical_seq(seq_s)
    if seq is None:
        raise ValueError("LANE_HEAD_CORRUPT: non-canonical seq at lane head: " + seq_s)
    return {"row_hash": last.get("row_hash"), "seq": seq}


def emit(paths, from_, to, verb, n, ts, payload=None, payload_file=None, token="-", allow_root=None):
    if payload_file is not None:
        assert_read_allowed(payload_file, allow_root)
        buf = _read_file(payload_file)
    elif payload is None:
        buf = b"undefined"  # String(undefined) (relay-driver.mjs:32)
    else:
        buf = payload if isinstance(payload, (bytes, bytearray)) else str(payload).encode("utf-8")
    sc = scan(buf)
    if sc["hit"]:
        raise ValueError("CARVEOUT_CONTENT_REJECT: payload matched " + ",".join(sc["reasons"]))
    head = lane_head(paths["hbi"])
    seq = head["seq"] + 1
    off, length = append_blob(paths["payloads"], buf)
    f = {"v": "1", "from": from_, "to": to, "verb": verb, "seq": str(seq), "ts": ts,
         "pid": "BH.RELAY.%s.%s" % (from_, n), "payload_sha256": sha256hex(buf),
         "hbi_off": str(off), "len": str(length), "token": token,
         "antecedent": head["row_hash"], "sig": "-"}
    row = build_row(f)
    row_off = append_row(paths["hbp"], row)
    p = parse_row(row)
    append_index(paths["hbi"], {
        "row_hash": p["row_hash"], "row_off": row_off, "row_len": len((row + "\n").encode("utf-8")),
        "pid": f["pid"], "verb": verb, "cls": class_of(verb), "from": from_, "to": to, "ts": ts,
        "seq": str(seq), "payload_off": off, "payload_len": length})
    return row


def _lines_nonempty(path):
    return [ln for ln in _read_text_if_exists(path).split("\n") if ln]


def verify_lane(paths):
    failures = []
    lines = _lines_nonempty(paths["hbp"])
    prev = GENESIS
    prev_seq = 0
    checked = 0
    for ln in lines:
        try:
            f = parse_row(ln)
        except ValueError as e:
            failures.append({"row": checked, "why": "PARSE: " + str(e)})
            checked += 1
            continue
        if sha16(f["_prefix"]) != f["row_hash"]:
            failures.append({"row": checked, "why": "ROW_HASH mismatch"})
        try:
            blob = read_blob(paths["payloads"], f["hbi_off"], f["len"])
            if sha256hex(blob) != f["payload_sha256"]:
                failures.append({"row": checked, "why": "PAYLOAD_SHA256 mismatch"})
        except ValueError as e:
            failures.append({"row": checked, "why": "PAYLOAD: " + str(e)})
        if f["antecedent"] != prev:
            failures.append({"row": checked, "why": "ANTECEDENT break: got %s want %s" % (f["antecedent"], prev)})
        sq = _canonical_seq(f["seq"])
        if sq is None:
            failures.append({"row": checked, "why": "SEQ not a canonical non-negative integer: " + f["seq"]})
        elif sq <= prev_seq:
            failures.append({"row": checked, "why": "SEQ not strictly increasing: %s <= %d" % (f["seq"], prev_seq)})
        else:
            prev_seq = sq
        prev = f["row_hash"]
        checked += 1
    return {"pass": len(failures) == 0, "checked": checked, "failures": failures}


def reverse_walk(paths):
    lines = _lines_nonempty(paths["hbp"])
    parsed = []
    issues = []
    for j, ln in enumerate(lines):
        try:
            parsed.append(parse_row(ln))
        except ValueError as e:
            issues.append({"i": j, "why": "PARSE: " + str(e)})
            parsed.append(None)
    for i in range(len(parsed) - 1, -1, -1):
        f = parsed[i]
        if f is None:
            continue
        if sha16(f["_prefix"]) != f["row_hash"]:
            issues.append({"i": i, "why": "row_hash"})
        if i == 0:
            want = GENESIS
        else:
            prev_node = parsed[i - 1]
            want = prev_node["row_hash"] if prev_node else "<unparseable-prev>"
        if f["antecedent"] != want:
            issues.append({"i": i, "why": "antecedent"})
    return {"pass": len(issues) == 0, "walked": sum(1 for p in parsed if p), "issues": issues}


# ---- 23-assertion suite (mirror of relay-driver.test.mjs) ----
SEED3_HBP_GOLD = (
    "RELAY|v=1|from=acer|to=liris|verb=NOTE|seq=1|ts=2026-06-21T00:00:00Z|pid=BH.RELAY.acer.1|payload_sha256=5e7bc15bf057e43ec7008bd0f42607e27792f0e90430346859c55973dd57dee7|hbi_off=0|len=13|token=-|antecedent=0000000000000000|sig=-|row_hash=7e3120b7b1099d43\n"
    "RELAY|v=1|from=acer|to=liris|verb=STATUS|seq=2|ts=2026-06-21T00:00:00Z|pid=BH.RELAY.acer.2|payload_sha256=7fc97f3174badf470f90e24fde0cfcf1e338ccb15cd2ca6b3263c628d85014ce|hbi_off=13|len=13|token=-|antecedent=7e3120b7b1099d43|sig=-|row_hash=850ef5dfbd121ca2\n"
    "RELAY|v=1|from=acer|to=liris|verb=ANSWER|seq=3|ts=2026-06-21T00:00:00Z|pid=BH.RELAY.acer.3|payload_sha256=086fcb55fa03903372cadbab69714e885274d5cb95b95ededf4440df63474dd5|hbi_off=26|len=13|token=-|antecedent=850ef5dfbd121ca2|sig=-|row_hash=9086b15982e7499e\n"
)
SEED3_HBI_GOLD = (
    "IDX|row_hash=7e3120b7b1099d43|row_off=0|row_len=254|pid=BH.RELAY.acer.1|verb=NOTE|cls=READ|from=acer|to=liris|ts=2026-06-21T00:00:00Z|seq=1|payload_off=0|payload_len=13\n"
    "IDX|row_hash=850ef5dfbd121ca2|row_off=254|row_len=257|pid=BH.RELAY.acer.2|verb=STATUS|cls=READ|from=acer|to=liris|ts=2026-06-21T00:00:00Z|seq=2|payload_off=13|payload_len=13\n"
    "IDX|row_hash=9086b15982e7499e|row_off=511|row_len=257|pid=BH.RELAY.acer.3|verb=ANSWER|cls=READ|from=acer|to=liris|ts=2026-06-21T00:00:00Z|seq=3|payload_off=26|payload_len=13\n"
)
ONE_HBP_GOLD = (
    "RELAY|v=1|from=acer|to=liris|verb=NOTE|seq=1|ts=2026-06-21T00:00:00Z|pid=BH.RELAY.acer.1|payload_sha256=fbed828eae16b6a506217d698f5c935467298add9b3611c91015a8db51a6afb1|hbi_off=0|len=33|token=-|antecedent=0000000000000000|sig=-|row_hash=969c37ba34d8ba1e\n"
)

TS = "2026-06-21T00:00:00Z"


class Tally:
    def __init__(self):
        self.p = 0
        self.f = 0

    def ok(self, name, cond):
        if cond:
            self.p += 1
            print("  PASS  " + name)
        else:
            self.f += 1
            print("  FAIL  " + name)


def _fresh(base, tag):
    d = os.path.join(base, "relay-ref-" + tag)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    return lane_paths(d.replace("\\", "/"), "acer")


def _seed(P, n=3):
    verbs = ["NOTE", "STATUS", "ANSWER"]
    for i in range(1, n + 1):
        emit(P, "acer", "liris", verbs[(i - 1) % 3], i, TS, payload="row %d payload" % i)


def _denies(p, root=None):
    try:
        assert_read_allowed(p, root)
        return False
    except ValueError as e:
        return "DENY" in str(e)


def run_suite(check):
    t = Tally()
    base = tempfile.mkdtemp(prefix="relay-referee-")
    print("PHASE-1 RELAY-DRIVER TEST SUITE (E=0) — Python referee\n")

    P = _fresh(base, "t0"); _seed(P)
    t.ok("t0 clean lane VERIFY pass", verify_lane(P)["pass"])
    t.ok("t0 clean lane reverse-walk pass", reverse_walk(P)["pass"])

    P = _fresh(base, "t1"); _seed(P)
    b = bytearray(open(P["payloads"], "rb").read()); b[0] ^= 0xFF
    open(P["payloads"], "wb").write(bytes(b))
    v = verify_lane(P)
    t.ok("t1 flipped payload byte REJECTED",
         (not v["pass"]) and any("PAYLOAD_SHA256" in x["why"] for x in v["failures"]))

    P = _fresh(base, "t2"); _seed(P)
    lines = _lines_nonempty(P["hbp"])
    lines[1] = lines[1].replace("verb=STATUS", "verb=EXEC")
    open(P["hbp"], "w").write("\n".join(lines) + "\n")
    v = verify_lane(P)
    t.ok("t2 tampered verb (READ->EXEC) REJECTED",
         (not v["pass"]) and any("ROW_HASH" in x["why"] for x in v["failures"]))

    P = _fresh(base, "t3")
    r1 = build_row({"v": "1", "from": "acer", "to": "liris", "verb": "NOTE", "seq": "1", "ts": TS,
                    "pid": "BH.RELAY.acer.1", "payload_sha256": "aa" * 32, "hbi_off": "0", "len": "0",
                    "token": "-", "antecedent": "deadbeefdeadbeef", "sig": "-"})
    open(P["hbp"], "w").write(r1 + "\n"); open(P["payloads"], "wb").write(b"")
    v = verify_lane(P)
    t.ok("t3 broken antecedent REJECTED",
         (not v["pass"]) and any("ANTECEDENT" in x["why"] for x in v["failures"]))

    threw = False
    try:
        clean("verb", "NOTE|row_hash=x|injected")
    except ValueError:
        threw = True
    t.ok("t4a field-injection ( | ) throws at clean()", threw)
    threw2 = False
    try:
        build_row({"v": "1", "from": "acer", "to": "liris", "verb": "NOTE", "seq": "1", "ts": TS,
                   "pid": "p", "payload_sha256": "aa", "hbi_off": "0", "len": "0", "token": "-",
                   "antecedent": GENESIS + "\nRELAY|fake", "sig": "-"})
    except ValueError:
        threw2 = True
    t.ok("t4b newline-in-field throws at buildRow", threw2)
    P = _fresh(base, "t4")
    emit(P, "acer", "liris", "NOTE", 1, TS,
         payload=b"evil\nRELAY|v=1|from=attacker|to=acer|verb=EXEC|fake")
    rows = _lines_nonempty(P["hbp"])
    t.ok("t4c payload-borne fake row did NOT inject a ledger row",
         len(rows) == 1 and verify_lane(P)["pass"])

    # relay-driver.test.mjs:66-67 fixture, assembled here at run time: a key-header line and "AAAA....".
    P = _fresh(base, "t5")
    threw = False
    try:
        emit(P, "acer", "liris", "NOTE", 1, TS,
             payload=("-----BEGIN " + "OPENSSH PRIVATE" + " KEY-----\nAAAA....").encode("utf-8"))
    except ValueError as e:
        threw = "CARVEOUT" in str(e)
    t.ok("t5 carve-out content REJECTED at emit", threw and not os.path.exists(P["hbp"]))

    P = _fresh(base, "t6"); _seed(P, 3)
    lines = _lines_nonempty(P["hbp"])
    open(P["hbp"], "w").write("\n".join(lines) + "\n" + lines[0] + "\n")
    v = verify_lane(P)
    t.ok("t6 replayed old row REJECTED (seq + antecedent)",
         (not v["pass"]) and any(("SEQ" in x["why"] or "ANTECEDENT" in x["why"]) for x in v["failures"]))

    P = _fresh(base, "t7"); _seed(P, 1)
    f = parse_row(_lines_nonempty(P["hbp"])[0])
    bad = f["_prefix"].replace("len=" + f["len"], "len=999999999", 1)
    open(P["hbp"], "w").write(bad + "|row_hash=" + sha16(bad) + "\n")
    v = verify_lane(P)
    t.ok("t7 out-of-bounds payload len REJECTED (no crash)",
         (not v["pass"]) and any("BOUNDS" in x["why"] for x in v["failures"]))

    P = _fresh(base, "t8")
    pays = [b"r1", b"r2", b"r3"]
    open(P["payloads"], "wb").write(b"".join(pays))
    off = 0; prev = GENESIS; rows = []; seqs = ["1", "NaN", "3"]
    for i in range(3):
        r = build_row({"v": "1", "from": "acer", "to": "liris", "verb": "NOTE", "seq": seqs[i], "ts": TS,
                       "pid": "BH.RELAY.acer.%d" % (i + 1), "payload_sha256": sha256hex(pays[i]),
                       "hbi_off": str(off), "len": str(len(pays[i])), "token": "-",
                       "antecedent": prev, "sig": "-"})
        rows.append(r); prev = parse_row(r)["row_hash"]; off += len(pays[i])
    open(P["hbp"], "w").write("\n".join(rows) + "\n")
    v = verify_lane(P)
    t.ok("t8 NaN seq on intact chain REJECTED (canonical-integer gate)",
         (not v["pass"]) and any("SEQ not a canonical" in x["why"] for x in v["failures"]))

    t.ok("t9a .ssh DENY", _denies("C:/Users/acer/.ssh/id_ed25519"))
    t.ok("t9b vault DENY", _denies("C:/x/vault/secret.txt"))
    t.ok("t9c NTFS ADS (::$INDEX_ALLOCATION) DENY", _denies("C:/x/vault::$INDEX_ALLOCATION/secret"))
    t.ok("t9d trailing-dot (vault.) DENY", _denies("C:/x/vault./secret"))
    t.ok("t9e trailing-space (vault ) DENY", _denies("C:/x/vault /secret"))
    t.ok("t9f 8.3 short-name (SOVERE~1) DENY", _denies("C:/x/SOVERE~1/secret"))
    t.ok("t9g keys. DENY", _denies("C:/x/keys./k"))
    root = os.path.join(base, "t9-root"); shutil.rmtree(root, ignore_errors=True); os.makedirs(root)
    open(os.path.join(root, "payload.txt"), "w").write("ok payload")
    allowed = False
    try:
        assert_read_allowed(root + "/payload.txt", root); allowed = True
    except ValueError:
        allowed = False
    t.ok("t9h plain file under allow-root ALLOWED", allowed)
    t.ok("t9i path outside allow-root DENY", _denies("C:/some/other/place/file.txt", root))

    P = _fresh(base, "t10")
    threw = False
    try:
        emit(P, "acer", "liris", "NOTE", 1, TS, payload_file="C:/Users/acer/.ssh/id_ed25519")
    except ValueError as e:
        threw = "DENY" in str(e)
    t.ok("t10a emit(payloadFile in carve-out) REJECTED before read", threw and not os.path.exists(P["hbp"]))
    root = os.path.join(base, "t10-root"); shutil.rmtree(root, ignore_errors=True); os.makedirs(root)
    open(os.path.join(root, "note.txt"), "w").write("a legitimate file-sourced payload")
    ok_emit = False
    try:
        emit(P, "acer", "liris", "NOTE", 1, TS, payload_file=root + "/note.txt", allow_root=root)
        ok_emit = verify_lane(P)["pass"]
    except ValueError:
        ok_emit = False
    t.ok("t10b emit(legit payloadFile under allow-root) succeeds + verifies", ok_emit)

    print("\n%d PASS / %d FAIL" % (t.p, t.f))

    if check:
        # byte-identity to the embedded gold (same bytes the JS and the Rust port emit)
        G = _fresh(base, "gold3"); _seed(G, 3)
        assert open(G["hbp"]).read() == SEED3_HBP_GOLD, "hbp bytes differ from gold"
        assert open(G["hbi"]).read() == SEED3_HBI_GOLD, "hbi bytes differ from gold"
        root = os.path.join(base, "gold1-root"); shutil.rmtree(root, ignore_errors=True); os.makedirs(root)
        open(os.path.join(root, "note.txt"), "w").write("a legitimate file-sourced payload")
        H = _fresh(base, "gold1")
        emit(H, "acer", "liris", "NOTE", 1, TS, payload_file=root + "/note.txt", allow_root=root)
        assert open(H["hbp"]).read() == ONE_HBP_GOLD, "file-sourced row bytes differ from gold"
        assert t.p == 23 and t.f == 0, "expected 23/0, got %d/%d" % (t.p, t.f)
        print("CHECK OK: 23/0 and byte-identical to upstream gold")

    shutil.rmtree(base, ignore_errors=True)
    return t.f


# ---- --cross: the Rust port (examples/relay_ops.rs) against this referee on generated inputs ----
# Both run the same op script on the same fixture tree (rebuilt at the same path for each run);
# the per-op results and the bytes of every file left in the tree must be equal.
def _hx(v):
    return v.encode("utf-8").hex() if isinstance(v, str) else bytes(v).hex()


def _txt(h):
    return None if h == "-" else bytes.fromhex(h).decode("utf-8")


def _js_text(s):
    # a JS string written as UTF-8: a lone surrogate becomes U+FFFD
    return s.encode("utf-16-le", "surrogatepass").decode("utf-16-le", "replace")


def run_ops(lines):
    out = []
    for line in lines:
        a = line.split(" ")
        block = []
        try:
            if a[0] in ("VERIFY", "WALK"):
                P = lane_paths(_txt(a[1]), _txt(a[2]))
                if a[0] == "VERIFY":
                    v = verify_lane(P)
                    block.append("VERIFY %s %d" % (str(v["pass"]).lower(), v["checked"]))
                    block += ["  F %d %s" % (x["row"], x["why"]) for x in v["failures"]]
                else:
                    w = reverse_walk(P)
                    block.append("WALK %s %d" % (str(w["pass"]).lower(), w["walked"]))
                    block += ["  I %d %s" % (x["i"], x["why"]) for x in w["issues"]]
            elif a[0] == "HEAD":
                h = lane_head(_txt(a[1]))
                block.append("HEAD %s %d" % ("undefined" if h["row_hash"] is None else h["row_hash"], h["seq"]))
            elif a[0] == "EMIT":
                kw = {}
                if a[7] != "-":
                    kw["payload"] = bytes.fromhex(a[7])
                if a[8] != "-":
                    kw["payload_file"] = _txt(a[8])
                if a[9] != "-":
                    kw["token"] = _txt(a[9])
                if a[10] != "-":
                    kw["allow_root"] = _txt(a[10])
                row = emit(lane_paths(_txt(a[1]), _txt(a[2])), _txt(a[3]), _txt(a[4]), _txt(a[5]), int(a[6]),
                           _txt(a[11]), **kw)
                block.append("EMIT OK " + row)
            elif a[0] == "SCAN":
                sc = scan(bytes.fromhex(a[1]))
                block.append("SCAN %s %s" % (str(sc["hit"]).lower(), ",".join(sc["reasons"])))
            elif a[0] == "ARA":
                block.append("ARA OK " + assert_read_allowed(_txt(a[1]), _txt(a[2])))
            elif a[0] == "READBLOB":
                b = read_blob(_txt(a[1]), _txt(a[2]), _txt(a[3]))
                block.append("READBLOB OK %d %s" % (len(b), sha256hex(b)))
            else:
                block.append("BADOP " + a[0])
            out += block
        except ValueError as e:
            out += block
            out.append(a[0] + " ERR " + (str(e) if type(e) is ValueError else "exc:" + type(e).__name__))
        except Exception as e:  # noqa: BLE001 - any other outcome is recorded and will differ
            out += block
            out.append(a[0] + " ERR exc:" + type(e).__name__)
    return _js_text("\n".join(out) + "\n")


def _rand_run(R, alpha, n):
    return "".join(alpha[R.randrange(len(alpha))] for _ in range(n))


def _pick(R, seq):
    return seq[R.randrange(len(seq))]


_UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
_AL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"


def _scan_case(R):
    flip = lambda t: "".join(c.swapcase() if R.randrange(4) == 0 else c for c in t)  # noqa: E731
    edge = ["", " ", "_", "a", "Z", "9", "-", "/", "\xa0", "\xe9", "\n", "\x85", ".", "+"]
    k = R.randrange(12)
    if k == 0:
        body = ("-----BEGIN " + _pick(R, ["RSA ", "", "EC ", "OPENSSH ", "2 ", "rsa ", "PRIVATE ", "X-"]) +
                _pick(R, ["PRIVATE KEY", "PRIVATE  KEY", "PUBLIC KEY", "Private KEY"]) + _pick(R, ["-----", "----"]))
    elif k == 1:
        body = flip("-----BEGIN OPENSSH ") + "PRIVATE KEY" + _pick(R, ["-----", "----"])
    elif k == 2:
        body = _pick(R, ["AKIA", "AKIa", "ASIA"]) + _rand_run(R, _UP + _pick(R, ["", "a", "_"]), _pick(R, [15, 16, 16, 17]))
    elif k == 3:
        body = "gh" + _pick(R, "pousrx") + _pick(R, ["_", "-"]) + _rand_run(R, _AL, _pick(R, [35, 36, 37, 40]))
    elif k == 4:
        body = "xox" + _pick(R, "baprsz") + _pick(R, ["-", "_"]) + _rand_run(R, _AL + "-", _pick(R, [9, 10, 11, 14]))
    elif k == 5:
        body = _pick(R, ["ssh-rsa AAAA", "ssh-ed25519 AAAA", "ssh-dss AAAA"]) + _rand_run(R, _AL + "+/", _pick(R, [39, 40, 41]))
    elif k == 6:
        body = _pick(R, ["CHARM_", "CHARM-", "charm_"]) + _rand_run(R, _UP + "_" + _pick(R, ["", "a"]), _pick(R, [3, 4, 5]))
    elif k == 7:
        body = flip("beast-key") + _pick(R, ["", "s", "S", "ss", "z"])
    elif k == 8:
        body = flip("decrypted") + _pick(R, ["", "-", "_", " ", "--"]) + flip("vault")
    elif k == 9:
        body = (_pick(R, ['"', ""]) + flip("private_key") + _pick(R, ['"', "", "'"]) +
                _rand_run(R, " \t\xa0\x85", R.randrange(3)) + _pick(R, [":", "=", "-", ""]))
    elif k == 10:
        body = (flip(_pick(R, ["api_key", "api-key", "apikey", "secret", "password", "passwd", "bearer", "token"])) +
                _pick(R, ["", "s", "_"]) + _rand_run(R, " \t\xa0\x85", R.randrange(3)) + _pick(R, [":", "=", ""]) +
                _rand_run(R, " \t\xa0", R.randrange(3)) + _rand_run(R, "ab9!\x85\xe9 ", _pick(R, [7, 8, 9])))
    else:
        body = _rand_run(R, "\x00\x7f\x80\xa0\xff-:=\" abcAKIgh_xo", R.randrange(0, 40))
    return (_pick(R, edge) + body + _pick(R, edge)).encode("latin-1")


_SPACES = ["", " ", "\t", "\n", " ", " ", " ", " ", "　", "﻿", "᠎", "​", "\x85"]


def _num_case(R):
    k = R.randrange(10)
    if k == 0:
        return _pick(R, ["", "Infinity", "-Infinity", "infinity", "NaN", ".", "e", "+", "0x", "0b2", "0o8", "1_0",
                         "--1", "1e1e1", "١"])
    if k == 1:
        return "0" + _pick(R, "xXoObB") + _rand_run(R, "0123456789abcdefABCDEF", R.randrange(1, 30))
    if k == 2:
        return _pick(R, _SPACES) + _num_case(R) + _pick(R, _SPACES)
    v = _pick(R, ["", "", "+", "-"]) + _rand_run(R, "0123456789", _pick(R, [0, 1, 1, 2, 3, 16, 17, 20, 25, 40, 400]))
    if R.randrange(3) == 0:
        v += "." + _rand_run(R, "0123456789", _pick(R, [0, 1, 2, 20, 30]))
    if R.randrange(3) == 0:
        v += _pick(R, "eE") + _pick(R, ["", "+", "-"]) + _rand_run(R, "0123456789", _pick(R, [1, 2, 3, 5]))
    return v


_COMP = ["vault", "vault.", "vault ", "Vault", "VAULT..", "keys", "key", "Keys", "KEYS ", "keyz", ".ssh", ".SSH",
         ".gnupg", "secret", "secrets.", "credential", "credentials", "decrypted-vault", "decryptedvault",
         "decrypted_Vault", "beast-keys", "sovereignty-vault", "x~1", "SOVERE~12", "~", "a~b", "$X", "$_", "$1", "a$",
         "é", "ſecret", "Keys", "\U0001F600keys", "١~١", "..", ".", "", "link", "root",
         "rootX", "rootlink", "sub", "f", "a:b", "nope", " ", "...", "home", "dot.d", "\U0001F600", "\\", "a\\b"]


def _cross_cases(W, seed):
    R = random.Random(seed)
    ops = []
    for _ in range(700):
        ops.append("SCAN " + _scan_case(R).hex())
    store = W + "/fz.payloads"
    open(store, "wb").write(bytes(range(64)))
    for _ in range(700):
        off = _num_case(R) if R.randrange(2) else str(R.randrange(70))
        ln = _num_case(R) if R.randrange(2) else str(R.randrange(70))
        ops.append("READBLOB %s %s %s" % (_hx(store), _hx(off), _hx(ln)))
    n = W + "/n"
    for d in ["vault", "vault.", "home/.ssh", "root/sub", "rootX", "keys", "é", "dot.d"]:
        os.makedirs(n + "/" + d, exist_ok=True)
    for f in ["root/sub/f", "rootX/f", "vault./f", "é/f", "dot.d/f"]:
        open(n + "/" + f, "wb").write(b"x")
    os.symlink(n + "/home/.ssh", n + "/link")
    os.symlink(n + "/root", n + "/rootlink")
    for _ in range(700):
        k = R.randrange(4)
        path = (n + "/" if k < 2 else ("/" if k == 2 else "")) + "/".join(_pick(R, _COMP) for _ in range(R.randrange(1, 5)))
        root = _pick(R, [None, None, "", n + "/root", n, "/", "n/root", n + "/rootlink", n + "/ro"])
        ops.append("ARA %s %s" % (_hx(path), "-" if root is None else _hx(root)))
    verbs = ["NOTE", "STATUS", "ANSWER", "EXEC", "HOLD", "WEIRD"]
    bads = [b"\xff", b"\xc3", b"\xed\xa0\x80", b"\xf0\x9f", b"\r", b"\x00", b"\xef\xbb\xbf"]
    for li in range(25):
        d = W + "/lane%d" % li
        os.makedirs(d)
        rows, idx, pay, prev = [], [], b"", GENESIS
        for i in range(1, R.randrange(2, 6)):
            pl = _rand_run(R, "abc xyz", R.randrange(20)).encode()
            f = {"v": "1", "from": "acer", "to": "liris", "verb": _pick(R, verbs), "seq": str(i), "ts": TS,
                 "pid": "BH.RELAY.acer.%d" % i, "payload_sha256": sha256hex(pl), "hbi_off": str(len(pay)),
                 "len": str(len(pl)), "token": "-", "antecedent": prev, "sig": "-"}
            t = R.randrange(12)
            if t == 0:
                f["seq"] = _pick(R, ["NaN", "0", "%d" % (i + 5), "9007199254740993", " %d" % i, "0%d" % i])
            elif t == 1:
                f["hbi_off"] = _pick(R, ["0x%x" % len(pay), "%de0" % len(pay), " %d" % len(pay), "-0"])
            elif t == 2:
                f["len"] = _pick(R, ["%d.0" % len(pl), "99999999999999999999", "1e21", "-1", ""])
            elif t == 3:
                f["antecedent"] = "deadbeefdeadbeef"
            r = build_row(f)
            prev = parse_row(r)["row_hash"]
            rows.append(r)
            pay += pl
            idx.append("IDX|row_hash=%s|row_off=0|row_len=0|pid=%s|verb=%s|cls=READ|from=acer|to=liris|ts=%s|seq=%s|"
                       "payload_off=0|payload_len=0" % (prev, f["pid"], f["verb"], TS, f["seq"]))
        hbp = ("\n".join(rows) + "\n").encode()
        hbi = ("\n".join(idx) + "\n").encode()
        for _ in range(R.randrange(3)):
            k = R.randrange(6)
            if k == 0:
                at = R.randrange(len(hbp))
                hbp = hbp[:at] + _pick(R, bads) + hbp[at + 1:]
            elif k == 1:
                at = R.randrange(len(hbi))
                hbi = hbi[:at] + _pick(R, bads) + hbi[at + 1:]
            elif k == 2:
                hbi = hbi.rstrip(b"\n") + _pick(R, [b"|row_hashZ", b"|seqq", b"|x", b"||", b"|=1"]) + b"\n"
            elif k == 3:
                hbi = hbi.replace(b"|seq=", b"|sq=") if R.randrange(2) else hbi.replace(b"row_hash=", b"rh=")
            elif k == 4:
                hbp = hbp.replace(b"\n", b"\r\n", 1)
            else:
                pay = pay[:-1] if pay else b"z"
        for ext, b in (("hbp", hbp), ("hbi", hbi), ("payloads", pay)):
            open("%s/relay-acer.%s" % (d, ext), "wb").write(b)
        ops += ["VERIFY %s %s" % (_hx(d), _hx("acer")), "WALK %s %s" % (_hx(d), _hx("acer")),
                "HEAD " + _hx(d + "/relay-acer.hbi")]
        for _ in range(R.randrange(1, 4)):
            pl = _pick(R, [b"note", b"", b"password = " + _rand_run(R, "abc", 9).encode(), b"\xff\xfe", None])
            ops.append("EMIT %s %s %s %s %s %d %s - %s %s %s" % (
                _hx(d), _hx("acer"), _hx("acer"), _hx(_pick(R, ["liris", "li ris", "é"])),
                _hx(_pick(R, verbs + ["NO|TE"])), R.randrange(1, 9), "-" if pl is None else pl.hex(),
                _pick(R, ["-", _hx("tok")]), _pick(R, ["-", _hx(""), _hx(n)]), _hx(TS)))
        ops += ["VERIFY %s %s" % (_hx(d), _hx("acer")), "WALK %s %s" % (_hx(d), _hx("acer"))]
    os.makedirs(W + "/dirlane/relay-acer.hbp")
    os.makedirs(W + "/dirlane/relay-acer.hbi")
    ops += ["VERIFY %s %s" % (_hx(W + "/dirlane"), _hx("acer")), "WALK %s %s" % (_hx(W + "/dirlane"), _hx("acer")),
            "HEAD " + _hx(W + "/dirlane/relay-acer.hbi")]
    for _ in range(30):
        src = _pick(R, [n + "/root/sub/f", n + "/rootX/f", n + "/vault./f", n + "/é/f", n + "/link/x", "n/root/sub/f",
                        n + "/nope", "/é/x", n + "/dot.d"])
        root = _pick(R, ["-", _hx(n + "/root"), _hx(n), _hx(""), _hx("n")])
        ops.append("EMIT %s %s %s %s %s 1 - %s - %s %s" % (_hx(W + "/fl"), _hx("acer"), _hx("acer"), _hx("liris"),
                                                          _hx("NOTE"), _hx(src), root, _hx(TS)))
    os.makedirs(W + "/fl")
    ops.append("VERIFY %s %s" % (_hx(W + "/fl"), _hx("acer")))
    return ops


def _snapshot(W):
    out = []
    for dp, dns, fns in os.walk(W):
        for name in sorted(dns + fns):
            full = os.path.join(dp, name)
            rel = os.path.relpath(full, W)
            if os.path.islink(full):
                out.append("L " + rel)
            elif os.path.isfile(full):
                out.append("%s %d %s" % (sha256hex(open(full, "rb").read()), os.path.getsize(full), rel))
    return sorted(out)


def run_cross(binary, seeds):
    binary = os.path.abspath(binary)
    base = tempfile.mkdtemp(prefix="relay-cross-")
    W = os.path.join(base, "w").replace("\\", "/")
    total = differing = 0
    try:
        for seed in seeds:
            results = {}
            for impl in ("rust", "referee"):
                shutil.rmtree(W, ignore_errors=True)
                os.makedirs(W)
                ops = _cross_cases(W, seed)
                script = os.path.join(base, "ops-%d.txt" % seed)
                open(script, "w", encoding="utf-8").write("\n".join(ops) + "\n")
                here = os.getcwd()
                os.chdir(W)
                try:
                    if impl == "rust":
                        text = subprocess.run([binary, script], capture_output=True, check=True).stdout.decode("utf-8")
                    else:
                        text = run_ops(ops)
                finally:
                    os.chdir(here)
                results[impl] = (text, _snapshot(W), ops)
            groups = {}
            for impl, (text, _, _) in results.items():
                g = []
                for ln in text.split("\n"):
                    if ln.startswith("  "):
                        g[-1].append(ln)
                    elif ln:
                        g.append([ln])
                groups[impl] = g
            ops = results["rust"][2]
            total += len(ops)
            for k, op in enumerate(ops):
                a = groups["rust"][k] if k < len(groups["rust"]) else ["<missing>"]
                b = groups["referee"][k] if k < len(groups["referee"]) else ["<missing>"]
                if a != b:
                    differing += 1
                    if differing <= 20:
                        print("DIFF seed %d op %d %s\n  rust:    %s\n  referee: %s" % (seed, k, op[:120], a, b))
            if results["rust"][1] != results["referee"][1]:
                differing += 1
                print("DIFF seed %d: lane files differ after the run" % seed)
    finally:
        shutil.rmtree(base, ignore_errors=True)
    print("CROSS %s: %d ops over seeds %s, %d differing (Rust port vs referee)" % (
        "OK" if differing == 0 else "FAIL", total, ",".join(str(x) for x in seeds), differing))
    return differing


if __name__ == "__main__":
    argv = sys.argv[1:]
    if "--cross" in argv:
        # --cross <relay_ops binary> [seed ...]   (default seeds 1 2 3)
        i = argv.index("--cross")
        seeds = [int(x) for x in argv[i + 2:]] or [1, 2, 3]
        sys.exit(1 if run_cross(argv[i + 1], seeds) else 0)
    check = "--check" in argv
    sys.exit(1 if run_suite(check) else 0)
