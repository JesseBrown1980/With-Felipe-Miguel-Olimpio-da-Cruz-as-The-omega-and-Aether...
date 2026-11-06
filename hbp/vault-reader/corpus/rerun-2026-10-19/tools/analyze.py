#!/usr/bin/env python3
"""Read the files behind every non-+1 object (git objects only; fetches missing blobs into the
beginning-src partial clones). Writes causes.tsv: label repo commit path kind verified reason pointer cause evidence"""
import os, re, subprocess, sys, hashlib, collections
S = "/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad"
P = S + "/vault-rerun/pins"
tg = {l.split("\t")[0]: l.rstrip("\n").split("\t") for l in open(P + "/work/targets.tsv")}
def git(d, *a, inp=None, text=False):
    return subprocess.run(["git", "-C", d] + list(a), capture_output=True, input=inp, text=text)
def hist_dir(repo, d):
    for cand in (f"{S}/beginning-src/{repo}.git", f"{S}/beginning-src/{repo}"):
        if os.path.isdir(cand): return cand
    if repo == "Asolaria": return S + "/asolaria-mirror.git"
    return d
blob_cache = {}
def show(d, c, path):
    k = (d, c, path)
    if k not in blob_cache:
        r = git(d, "cat-file", "blob", f"{c}:{path}")
        blob_cache[k] = r.stdout if r.returncode == 0 else None
    return blob_cache[k]
def sha(b): return hashlib.sha256(b).hexdigest()
def promisor(d): return git(d, "config", "--get", "remote.origin.promisor", text=True).stdout.strip() == "true"
hist_cache = {}
have_cache = {}
def history(d, path):
    """{sha256: (blob, first commit seen)} for every version of path on all refs."""
    if (d, path) in hist_cache: return hist_cache[(d, path)]
    cs = git(d, "log", "--all", "--full-history", "--format=%H", "--", path, text=True).stdout.split()
    blobs = {}
    for c in reversed(cs):
        r = git(d, "rev-parse", "-q", "--verify", f"{c}:{path}", text=True)
        if r.returncode == 0: blobs.setdefault(r.stdout.strip(), c)
    if promisor(d) and blobs:
        if d not in have_cache:
            have_cache[d] = set(git(d, "cat-file", "--batch-check=%(objectname) %(objecttype)", "--batch-all-objects", text=True).stdout.split("\n"))
        have = have_cache[d]
        need = [b for b in blobs if f"{b} blob" not in have]
        if need:
            git(d, "-c", "fetch.negotiationAlgorithm=noop", "fetch", "origin", "--no-tags", "--no-write-fetch-head",
                "--recurse-submodules=no", "--filter=blob:none", "--stdin", inp=("\n".join(need) + "\n").encode())
    out = {}
    for b, c in blobs.items():
        r = git(d, "cat-file", "blob", b)
        if r.returncode == 0:
            out.setdefault(sha(r.stdout), (b, c))
            out.setdefault("lf:" + sha(r.stdout.replace(b"\r\n", b"\n")), (b, c))
    hist_cache[(d, path)] = out
    return out
def fields(line):
    return dict(x.partition("=")[::2] for x in line.rstrip("\r\n").split("|")[1:])
def rowline(d, c, hbi, ln):
    b = show(d, c, hbi)
    if b is None: return None
    ls = b.split(b"\n")
    return ls[ln - 1].decode("utf-8", "replace") if ln - 1 < len(ls) else None
def match_decl(d, hd, c, path, data, decl):
    if data is None: return "file_unreadable", ""
    cr = data.count(b"\r")
    if sha(data) == decl: return "equal", ""
    if cr and sha(data.replace(b"\r\n", b"\n")) == decl: return "committed_crlf_declared_is_lf_form", f"cr={cr}"
    if sha(data.replace(b"\n", b"\r\n")) == decl: return "declared_is_crlf_form_of_lf_file", "lines=%d" % data.count(b"\n")
    h = history(hd, path)
    if decl in h: return "declared_equals_other_version", f"blob={h[decl][0][:8]}@{h[decl][1][:7]}"
    if "lf:" + decl in h: return "declared_equals_lf_form_of_other_version", f"blob={h['lf:'+decl][0][:8]}@{h['lf:'+decl][1][:7]}"
    return "declared_sha256_matches_no_committed_version_or_eol_bom_variant", f"versions={len([k for k in h if not k.startswith('lf:')])}|cr={cr}"
def tree_names(d, c):
    k = ("tree", d, c)
    if k not in blob_cache:
        blob_cache[k] = git(d, "ls-tree", "-r", "--name-only", c, text=True).stdout.split("\n")
    return blob_cache[k]
rows = [l.rstrip("\n").split("\t") for l in open(P + "/work/nonplus1.tsv")]
if len(sys.argv) > 1: rows = [r for r in rows if r[1] == sys.argv[1]]
out = open(P + "/work/causes.tsv", "w")
for label, repo, c, path, kind, ver, reason, ptr in rows:
    d = tg[label][3]; hd = hist_dir(repo, d)
    cause, ev = "unexplained", ""
    reasons = reason.split("+")
    if ptr == "self" or ptr.startswith("pair:"): src = path
    else: src = ptr.rsplit(":", 2)[0]
    try:
        if kind == "range" and reason != "anchor_absent":
            hbi, ln, rng = ptr.rsplit(":", 2)
            r = fields(rowline(d, c, hbi, int(ln)) or "X|")
            data = show(d, c, path) or b""
            if "byte_start" in r: off = int(r["byte_start"]); n = int(r.get("byte_end_exclusive", off)) - off
            else:
                off = int(r.get("offset", r.get("off", "0")) or 0); n = int(r.get("len", r.get("length", "0")) or 0)
            decl = r.get("row_sha256", r.get("sha256", ""))
            lf = data.replace(b"\r\n", b"\n"); cr = data.count(b"\r")
            raw = rowline(d, c, hbi, int(ln)) or ""
            if sha(data[off:off + n]) == decl and raw.startswith("HBI|") and "row" in r and "hex" in r:
                seg = data[off:off + n]
                cause = "hex_row_sha256_and_hex_cover_off_len_span_with_lf_reader_compares_hbp_line_without_lf"
                ev = "span_ends_lf=%d|hex_equals_span=%d|hex_equals_line=%d" % (1 if seg.endswith(b"\n") else 0, 1 if seg.hex() == r.get("hex") else 0, 1 if seg.rstrip(b"\n").hex() == r.get("hex") else 0)
            elif sha(data[off:off + n]) == decl: cause, ev = "range_sha256_equal_other_field_differs", "cr=%d" % cr
            elif cr and sha(lf[off:off + n]) == decl: cause, ev = "committed_crlf_offsets_declared_on_lf_form", "cr=%d" % cr
            else:
                hit = None
                for b, hc in set(v for k, v in history(hd, path).items() if not k.startswith("lf:")):
                    vb = git(hd, "cat-file", "blob", b).stdout
                    if sha(vb[off:off + n]) == decl: hit = (b, hc); break
                if hit: cause, ev = "ranges_index_other_version_of_target", "blob=%s@%s" % (hit[0][:8], hit[1][:7])
                else: cause, ev = "range_bytes_match_no_version_on_any_ref", "cr=%d" % cr
        elif reason == "anchor_absent":
            hbi, ln, rng = ptr.rsplit(":", 2)
            b = show(d, c, hbi) or b""
            first = fields(b.split(b"\n")[0].decode("utf-8", "replace"))
            tgt = first.get("for", "")
            tp = os.path.join(os.path.dirname(hbi), tgt) if tgt else ""
            tb = show(d, c, tp) if tp else None
            if tb is None: cause, ev = "range_rows_with_no_anchor_row", ""
            else:
                rr = fields(rowline(d, c, hbi, int(ln)) or "X|")
                off = int(rr.get("offset", "0") or 0); n = int(rr.get("len", "0") or 0)
                endnl = 1 if (off + n == len(tb) or tb[off + n:off + n + 1] == b"\n") and (off == 0 or tb[off - 1:off] == b"\n") else 0
                cause = "ranges_target_named_only_by_header_for_key"
                ev = "for=%s|target_present=1|file_sha256_equal=%d|range_on_row_boundary=%d" % (tgt, 1 if first.get("file_sha256") == sha(tb) else 0, endnl)
        elif "sidecar_name_differs" in reasons:
            side = show(d, c, path + ".sha256") or b""
            f = side.decode("utf-8", "replace").split()
            data = show(d, c, path)
            nm = f[1] if len(f) > 1 else ""
            base = os.path.basename(path)
            shape = "name_has_directory_prefix" if nm.lstrip("*").endswith("/" + base) else "name_is_other_file" if nm else "no_name"
            hok = 1 if f and data is not None and f[0].lower() == sha(data) else 0
            cause, ev = "sidecar_" + shape, "sidecar_name=%s|sidecar_hash_equals_file_sha256=%d" % (nm, hok)
            if "sidecar_sha256_differs" in reasons:
                h0 = f[0] if f else ""
                if h0.startswith("\ufeff") and data is not None and h0.lstrip("\ufeff").lower() == sha(data):
                    cause += "+sidecar_starts_with_utf8_bom"; ev += "|hash_after_bom_equals_file_sha256=1"
                else:
                    c2, e2 = match_decl(d, hd, c, path, data, h0.lower())
                    cause += "+" + c2; ev += "|" + e2
        elif "sidecar_sha256_differs" in reasons:
            side = show(d, c, path + ".sha256")
            decl = side.decode("utf-8", "replace").split()[0].lower() if side else ""
            cause, ev = match_decl(d, hd, c, path, show(d, c, path), decl)
        elif "sidecar_shape_differs" in reasons:
            side = show(d, c, path + ".sha256") or b""
            t = side.decode("utf-8", "replace"); f = t.split()
            data = show(d, c, path)
            cause = "sidecar_fields_%d%s%s" % (len(f), "_crlf" if b"\r" in side else "", "_bare_64hex" if len(f) == 1 and re.fullmatch(r"[0-9a-fA-F]{64}", f[0]) else "")
            ev = "sidecar_hash_equals_file_sha256=%d" % (1 if f and data is not None and f[0].lower() == sha(data) else 0)
        elif reasons[0] in ("sha256_differs", "bytes_differs") or "sha256_differs" in reasons and kind == "file":
            hbi, ln, key = ptr.rsplit(":", 2)
            r = fields(rowline(d, c, hbi, int(ln)) or "X|")
            pre = "" if key in ("path", "name", "file") else key[:-4] if key.endswith("path") else key + "_"
            decl = r.get(pre + "sha256", "")
            cause, ev = match_decl(d, hd, c, path, show(d, c, path), decl)
            if "bytes_differs" in reasons: ev += f"|declared_bytes={r.get(pre + 'bytes', '-')}"
        elif "row_sha256_differs" in reasons or "kind_differs" in reasons:
            hbi, ln, rng = ptr.rsplit(":", 2)
            r = fields(rowline(d, c, hbi, int(ln)) or "X|")
            data = show(d, c, path) or b""
            off, n = int(r.get("offset", "0") or 0), int(r.get("len", "0") or 0)
            lf = data.replace(b"\r\n", b"\n")
            if data.count(b"\r") and sha(lf[off:off + n]) == r.get("row_sha256"):
                cause, ev = "committed_crlf_offsets_declared_on_lf_form", "cr=%d" % data.count(b"\r")
            else:
                cause, ev = "row_bytes_differ", "cr=%d" % data.count(b"\r")
        elif reason == "hbp_absent":
            names = tree_names(d, c); base = os.path.basename(path)
            other = [n for n in names if os.path.basename(n) == base and n != path]
            h = git(hd, "log", "--all", "--full-history", "--format=%h", "--", path, text=True).stdout.split()
            if other: cause, ev = "pair_hbp_at_other_path", f"at={other[0]}"
            elif h: cause, ev = "pair_hbp_on_other_commits_only", f"commits={len(h)}|first_seen={h[-1]}"
            else: cause, ev = "pair_hbp_path_on_no_ref_and_no_same_name_file_in_tree", ""
        elif reason == "target_absent":
            names = tree_names(d, c); base = os.path.basename(path)
            other = [n for n in names if os.path.basename(n) == base]
            slash = base.replace("__", "/") if "__" in base else ""
            if "@" in base: cause, ev = "pointer_value_carries_at_commit_suffix", ""
            elif slash and slash in names: cause, ev = "pointer_name_writes_path_slashes_as_double_underscore", "at=" + slash
            elif slash and git(hd, "log", "--all", "--full-history", "--format=%h", "--", slash, text=True).stdout.split():
                cause, ev = "pointer_name_writes_path_slashes_as_double_underscore_path_on_other_commits_only", "at=" + slash
            elif other: cause, ev = "target_name_exists_at_other_path", f"at={other[0]}"
            else:
                h = git(hd, "log", "--all", "--full-history", "--format=%h", "--", path, "*/" + base, text=True).stdout.split()
                if h: cause, ev = "target_on_other_commits_only", f"commits={len(h)}"
                else: cause, ev = "target_never_committed_on_any_ref", ""
        elif reason == "path_not_under_root":
            cause = "absolute_windows_path" if re.match(r"^[A-Za-z]:[/\\]", path) else "absolute_path" if path.startswith("/") else "escapes_root"
        elif reason == "no_check_declared":
            cause, ev = "nothing_declared_to_check_and_no_sidecar_file", "sidecar_file_present=%d" % (1 if show(d, c, path + ".sha256") is not None else 0)
        elif reason.startswith("chain_link_differs"):
            b = show(d, c, src)
            cause, ev = "chain_link_differs", f"hbi_sha256={sha(b)[:16] if b else '-'}"
    except Exception as e:
        cause, ev = "analyzer_error", repr(e)[:80]
    out.write("\t".join([label, repo, c, path, kind, ver, reason, ptr, cause, ev]) + "\n")
out.close()
cnt = collections.Counter()
for l in open(P + "/work/causes.tsv"):
    p = l.rstrip("\n").split("\t"); cnt[(p[6], p[8])] += 1
for k, v in sorted(cnt.items(), key=lambda x: -x[1]): print(v, *k)
