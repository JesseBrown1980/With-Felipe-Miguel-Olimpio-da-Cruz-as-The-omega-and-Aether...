#!/usr/bin/env python3
"""Group causes.tsv into RERUNNOTE rows (one per repo, reason, cause). Integers and tokens only."""
import collections, re, sys
P = "/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad/vault-rerun/pins"
rows = [l.rstrip("\n").split("\t") for l in open(P + "/work/causes.tsv")]
g = collections.OrderedDict()
for label, repo, c, path, kind, ver, reason, ptr, cause, ev in sorted(rows, key=lambda r: (r[1], r[6], r[8])):
    g.setdefault((repo, reason, cause), []).append((c, path, kind, ver, ptr, ev))
def tok(s): return s.replace("|", "/").replace("=", ":").replace(",", ";")
out = []
for (repo, reason, cause), items in g.items():
    commits = sorted({c[:7] for c, *_ in items})
    vers = collections.Counter(v for _, _, _, v, _, _ in items)
    srcs = sorted({(p.rsplit(":", 2)[0] if not (p == "self" or p.startswith("pair:")) else (p[5:] if p.startswith("pair:") else pa)) for _, pa, _, _, p, _ in items})
    paths = sorted({pa for _, pa, *_ in items if pa})
    f = [f"RERUNNOTE|repo=JesseBrown1980/{repo}|scope=pins|commits={len(commits)}|commit7={','.join(commits)}",
         f"reason={reason}|objects={len(items)}|minus_one_rows={vers.get('-1', 0)}|zero_rows={vers.get('0', 0)}|cause={cause}",
         f"paths={len(paths)}:{','.join(tok(p) for p in paths)}"]
    if srcs != paths: f.append(f"read_from={len(srcs)}:{','.join(tok(s) for s in srcs)}")
    evs = collections.Counter(e for *_, e in items)
    if cause in ("declared_equals_other_version", "target_name_exists_at_other_path", "pair_hbp_at_other_path") or "double_underscore" in cause:
        pairs = sorted({(pa, e) for _, pa, _, _, _, e in items})
        f.append("matched=%d:%s" % (len(pairs), ",".join(tok(pa) + "~" + tok(e.replace("blob=", "").replace("at=", "")) for pa, e in pairs)))
    elif cause.startswith("committed_crlf"):
        crs = sorted({int(re.search(r"cr=(\d+)", e).group(1)) for e in evs if "cr=" in e})
        f.append(f"lf_form_equal={len(items)}|cr_bytes_min={crs[0] if crs else 0}|cr_bytes_max={crs[-1] if crs else 0}")
    elif cause.startswith("sidecar_fields"):
        f.append("sidecar_hash_equals_file_sha256=%d" % sum(v for e, v in evs.items() if "sidecar_hash_equals_file_sha256=1" in e))
    elif cause == "ranges_target_named_only_by_header_for_key":
        f.append("header_for_target_present=%d|header_file_sha256_equal=%d|ranges_on_row_boundaries=%d" % (
            sum(v for e, v in evs.items() if "target_present=1" in e), sum(v for e, v in evs.items() if "file_sha256_equal=1" in e),
            sum(v for e, v in evs.items() if "range_on_row_boundary=1" in e)))
    elif cause.startswith("hex_row"):
        f.append("span_ends_lf=%d|hex_equals_span=%d|hex_equals_line=%d" % tuple(
            sum(v for e, v in evs.items() if k + "=1" in e) for k in ("span_ends_lf", "hex_equals_span", "hex_equals_line")))
    elif cause.startswith("sidecar_name_has_directory_prefix"):
        f.append("sidecar_hash_equals_file_sha256=%d" % sum(v for e, v in evs.items() if "sidecar_hash_equals_file_sha256=1" in e))
        if "bom" in cause: f.append("hash_after_bom_equals_file_sha256=%d" % sum(v for e, v in evs.items() if "hash_after_bom_equals_file_sha256=1" in e))
    elif "no_committed_version" in cause:
        f.append("versions_on_all_refs=%d|variants_tested=as_is;strip_final_lf;add_lf;crlf;crlf_strip_final;lf;bom|tree_files_tested=all|tree_files_equal=0" % max(int(re.search(r"versions=(\d+)", e).group(1)) for e in evs))
    elif cause == "nothing_declared_to_check_and_no_sidecar_file":
        f.append("sidecar_file_present=%d" % sum(v for e, v in evs.items() if "sidecar_file_present=1" in e))
    elif cause == "chain_link_differs":
        f.append("chain_hbi_sha256_16=%s|same_bytes_as=ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills@8af62f5:matrices/FABLE5-SELF-PRISM-CUBES-2026-07-02.hbi|links=46|links_equal_with_name=0|links_equal_with_family_colon_name=46|as_in_note=what-is-asolaria---how-do-we-get-reductions-in-everything@29307bf" % ",".join(sorted({e.split("=")[1] for e in evs})))
    elif cause == "declared_is_crlf_form_of_lf_file":
        f.append(f"crlf_form_equal={len(items)}")
    f.append("json=0")
    out.append("|".join(f))
open(P + "/work/notes.hbp", "w").write("\n".join(out) + "\n")
print(len(out), sum(len(v) for v in g.values()))
