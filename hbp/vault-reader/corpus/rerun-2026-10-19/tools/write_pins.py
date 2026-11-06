#!/usr/bin/env python3
"""Append the pin re-run to RERUN.hbp (base: RERUN-v2.hbp, the copy taken first). Integers only, no JSON."""
import os, shutil, collections
S = "/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad"
R = S + "/vault-rerun"; P = R + "/pins"; W = P + "/work"
AETHER = "7377995c5fc0971170a9da19d281204de280f4be"
TASK_HEAD = "ba1ffe1745bb966f6dc0990ec0a83e3e4097d149"
LIMIT = 5 * 1024 * 1024
base = [l.rstrip("\n") for l in open(R + "/RERUN-v2.hbp")]
tag = lambda l: l.split("|", 1)[0]
fields = lambda l: dict(kv.split("=", 1) for kv in l.split("|")[1:] if "=" in kv)
assert sum(1 for l in base if tag(l) == "ALLTOTAL") == 1
old_all = fields([l for l in base if tag(l) == "ALLTOTAL"][0])
targets = [l.rstrip("\n").split("\t") for l in open(W + "/targets.tsv")]
res = {}
for l in open(P + "/results.tsv"):
    p = l.rstrip("\n").split("\t"); res[p[0]] = p
classes = [l.rstrip("\n").split("\t") for l in open(W + "/classes.tsv")]
cnt = collections.Counter(c[0] for c in classes)
repos_of = lambda k: len({c[1] for c in classes if c[0] == k})
oldA = {tuple(l.rstrip("\n").split("\t")) for l in open(W + "/oldA.txt")}
newA = {(c[1], c[2]) for c in classes if c[0] == "A_PIN"}
dropped = sorted(oldA - newA); added = sorted(newA - oldA)
cls_of = {(c[1], c[2]): c[0] for c in classes}
dd = [f"{r}@{c[:7]}" for r, c in dropped if cls_of.get((r, c)) == "B_DATING"]
dc = [f"{r}@{c[:7]}" for r, c in dropped if cls_of.get((r, c)) == "B_CITE"]
assert len(dd) + len(dc) == len(dropped)
scope = ("RERUNSCOPE|list=pins|aether_commit=%s|task_named_commit=%s|aether_commits_after_task_named=%d|a_pin_set_and_classes_equal_at=ba1ffe1,7377995,fd792d9"
         "|scan=tracked_text_blobs_at_aether_commit|text_files=15247|clones=65|local_commits=5533|uncovered_pairs=%d"
         "|a_pin=%d|a_pin_repos=%d|b_cite=%d|b_cite_repos=%d|b_dating=%d|b_dating_repos=%d|vendored_or_imported_only=%d|c_filename_only=%d"
         "|run=A_PIN|out_of_scope=B_CITE,B_DATING,VENDORED_OR_IMPORTED_ONLY,C_FILENAME_ONLY"
         "|prior_list=reaudit/missing-A-pins.tsv|prior_a_pin=398|prior_a_pin_nonlocal=1|prior_kept=%d|prior_dropped=%d"
         "|prior_dropped_b_dating=%s|prior_dropped_b_cite=%s|added=%d:%s|nonlocal_cloned=GitRAM@e014252|json=0") % (
    AETHER, TASK_HEAD, 4, len(classes), cnt["A_PIN"], repos_of("A_PIN"), cnt["B_CITE"], repos_of("B_CITE"), cnt["B_DATING"], repos_of("B_DATING"),
    cnt["VENDORED_OR_IMPORTED_ONLY"], cnt["C_FILENAME_ONLY"], len(oldA & newA), len(dropped), ",".join(dd), ",".join(dc),
    len(added), ",".join(f"{r}@{c[:7]}" for r, c in added))
KEYS = ("hbi", "files", "objects", "verified", "failed", "unresolved")
rows, kept, notkept = [], [], []
tot = collections.Counter(); repos = set()
for label, repo, c, gd, mode, src, kinds in targets:
    p = res[label]
    assert p[1] == c and p[5] == "0" and p[9] == "0", label
    v = fields(p[12])
    rows.append(f"RERUN|repo=JesseBrown1980/{repo}|commit={c}|" + "|".join(f"{k}={v[k]}" for k in KEYS)
                + f"|rust_equals_referee={p[10]}|result_sha256={p[6]}|recorded_sha256=-|equal_to_recorded=-|pin_source={src}|json=0")
    for k in KEYS: tot[k] += int(v[k])
    tot["eq"] += int(p[10]); repos.add(repo)
    out = f"{P}/out/{label}.rust.hbp"
    if int(p[7]) < LIMIT and os.path.exists(out): kept.append((out, f"{P}/VAULT-{repo}-{c[:7]}.hbp"))
    else: notkept.append(label)
notes = [l.rstrip("\n") for l in open(W + "/notes.hbp") if l.strip()]
ov = [l.rstrip("\n").split("\t") for l in open(W + "/overlay-verify.tsv")]
val = open(W + "/ovtest-validation.tsv").read().split("\n")[0].split("\t")
ovnote = ("RERUNNOTE|repo=JesseBrown1980/asolaria-stone-to-moss|scope=pins|commits=%d|commit7=%s|tree=overlay_view_lower_read_only_checkout_/home/user/asolaria-stone-to-moss_HEAD_f032bc0_upper_under_pins"
          "|why_not_git_archive_extract=disk_free_768450560_below_tree_bytes_753008975_plus_150000000|tree_files=%d|files_hash_object_no_filters_equal=%d"
          "|files_removed=%d|files_written_from_blob=%d|extra_files=0|missing_files=0|gitattributes_filters=0"
          "|method_check=f032bc0_overlay_result_sha256_%s_equals_RERUN_row_git_archive_result=%d|rust_stdout_compared_to_referee_through_fifo=1|json=0") % (
    len(ov), ",".join(o[1][:7] for o in ov), sum(int(o[2].split()[0]) for o in ov), sum(int(o[2].split()[3]) for o in ov),
    sum(int(o[2].split()[1]) for o in ov), sum(int(o[2].split()[2]) for o in ov), val[6],
    1 if val[6] == "ac1ce83b191ac810cc11a0cdb6a57322d78948ca3369e77e124dc68b95007e0b" and val[10] == "1" else 0)
nonplus = sum(int(fields(n)["objects"]) for n in notes)
assert nonplus == tot["failed"] + tot["unresolved"], (nonplus, tot)
pinstotal = ("PINSTOTAL|rows=%d|repos=%d|hbi=%d|files=%d|objects=%d|verified=%d|failed=%d|unresolved=%d|rust_equals_referee=%d"
             "|notes=%d|non_plus_one_objects_in_notes=%d|skips=0|sub_rows=0|zerohbi_rows=0|vault_files_kept=%d|vault_files_over_5242880_not_kept=%d"
             "|aether_commit=%s|json=0") % (len(rows), len(repos), tot["hbi"], tot["files"], tot["objects"], tot["verified"], tot["failed"],
                                           tot["unresolved"], tot["eq"], len(notes) + 1, nonplus, len(kept), len(notkept), AETHER)
body = [l for l in base if tag(l) != "ALLTOTAL"]
final = body + [scope] + rows + [ovnote] + notes + [pinstotal]
agg = collections.Counter(); n = collections.Counter()
for l in final:
    t = tag(l)
    if t in ("RERUN", "RERUNALT", "RERUNSUB"):
        f = fields(l); n[t] += 1
        for k in KEYS + ("rust_equals_referee",): agg[k] += int(f[k])
assert n["RERUN"] == int(old_all["rerun"]) + len(rows) and n["RERUNALT"] == int(old_all["rerunalt"]) and n["RERUNSUB"] == int(old_all["rerunsub"])
for k in KEYS + ("rust_equals_referee",):
    assert agg[k] == int(old_all[k]) + (tot[k] if k in tot else tot["eq"]), k
zero = sum(1 for l in final if tag(l) == "ZEROHBI")
alltotal = ("ALLTOTAL|rows=%d|rerun=%d|rerunalt=%d|rerunsub=%d|hbi=%d|files=%d|objects=%d|verified=%d|failed=%d|unresolved=%d"
            "|rust_equals_referee=%d|zerohbi_rows=%d|zerohbi_objects=0|row_sum_not_distinct_objects=1|pins_rerun_rows=%d|json=0") % (
    sum(n.values()), n["RERUN"], n["RERUNALT"], n["RERUNSUB"], agg["hbi"], agg["files"], agg["objects"], agg["verified"],
    agg["failed"], agg["unresolved"], agg["rust_equals_referee"], zero, len(rows))
final.append(alltotal)
with open(R + "/RERUN.hbp", "w", newline="\n") as o:
    for l in final:
        assert "\t" not in l and "\n" not in l and "\r" not in l and "{" not in l, l[:80]
        o.write(l + "\n")
for src, dst in kept:
    shutil.copyfile(src, dst)
print(scope[:200]); print(pinstotal); print(alltotal); print("kept", len(kept), "not kept", notkept)
