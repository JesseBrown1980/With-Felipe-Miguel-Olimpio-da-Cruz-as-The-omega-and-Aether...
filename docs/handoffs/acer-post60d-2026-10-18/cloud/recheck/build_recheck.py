"""Build CLOUD-RECHECK.hbp from the dumped trees, history objects and estate hits.

usage: python3 -I build_recheck.py WORK_DIR ACER_HBP OUT_HBP
"""
import os
import sys

EMPTY = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"

# Decided by reading both files and their git history (see FINDING rows).
COUNTERPART = {
    ("asolaria", ".gitattributes"): ".gitattributes",
    ("asolaria", "README.md"): "README.md",
    ("asolaria", "slice_glyph_messaging.py"): "slice_glyph_messaging.py",
}
SELF_REPO = {
    "matrixcolour": {"home:asolaria-matrix-in-colour"},
    "asolaria": {"home:asolaria"},
}


def read_tree(path):
    by_blob, by_base = {}, {}
    for line in open(path, encoding="utf-8"):
        meta, p = line.rstrip("\n").split("\t", 1)
        blob = meta.split()[2]
        by_blob.setdefault(blob, []).append(p)
        by_base.setdefault(os.path.basename(p), []).append((p, blob))
    return by_blob, by_base


def read_objects(path):
    seen = {}
    for line in open(path, encoding="utf-8"):
        parts = line.rstrip("\n").split(" ", 1)
        seen.setdefault(parts[0], []).append(parts[1] if len(parts) > 1 else "")
    return seen


def classify(src, path, blob, by_blob, by_base):
    if blob in by_blob:
        return "SAME", by_blob[blob]
    want = COUNTERPART.get((src, path))
    if want is not None and want in [p for p, _ in by_base.get(os.path.basename(want), [])]:
        return "COUNTERPART_DIFF", [want]
    base = by_base.get(os.path.basename(path), [])
    if base:
        return "BASENAME_ONLY", [p for p, _ in base]
    return "MISSING", []


ACER_TO_CLOUD = {"SAME": {"SAME"}, "NAMEDIFF": {"COUNTERPART_DIFF"}, "MISSING": {"MISSING", "BASENAME_ONLY"}}


def main():
    work, acer_hbp, out = sys.argv[1], sys.argv[2], sys.argv[3]
    manifest = [line.rstrip("\n").split("\t") for line in open(os.path.join(work, "manifest.tsv"), encoding="utf-8")]
    head_blob, head_base = read_tree(os.path.join(work, "aether-d203721.tree"))
    old_blob, old_base = read_tree(os.path.join(work, "aether-4646e9f.tree"))
    hist = read_objects(os.path.join(work, "aether-history.objects"))
    mirror = read_objects(os.path.join(work, "mirror-history.objects"))
    estate = {}
    hits_dir = os.path.join(work, "hits")
    repos = sorted(f[:-5] for f in os.listdir(hits_dir) if f.endswith(".hits"))
    for name in repos:
        for line in open(os.path.join(hits_dir, name + ".hits"), encoding="utf-8"):
            estate.setdefault(line.split(" ", 1)[0], set()).add(name)
    acer = {}
    for line in open(acer_hbp, encoding="utf-8"):
        if line.startswith("CMPQR|"):
            f = dict(kv.split("=", 1) for kv in line.rstrip("\n").split("|")[1:])
            acer[(f["src"], f["file"])] = f

    rows, summary = [], {}
    for src, path, size, blob in manifest:
        a = acer[(src, path)]
        cloud, paths = classify(src, path, blob, head_blob, head_base)
        old, _ = classify(src, path, blob, old_blob, old_base)
        agree = int(cloud in ACER_TO_CLOUD[a["in_aether"]])
        agree_old = int(old in ACER_TO_CLOUD[a["in_aether"]])
        acer_path_blob = "-"
        if a["aether_path"] != "-":
            acer_path_blob = next((b for p, b in old_base.get(os.path.basename(a["aether_path"]), []) if p == a["aether_path"]), "absent")
        literal = int(
            (a["in_aether"] == "SAME" and acer_path_blob == blob)
            or (a["in_aether"] == "NAMEDIFF" and acer_path_blob not in ("absent", blob))
            or (a["in_aether"] == "MISSING" and blob not in old_blob)
        )
        why = []
        if cloud != old:
            why.append("changed_since_4646e9f:%s->%s" % (old, cloud))
        if not agree_old and a["in_aether"] == "NAMEDIFF" and old == "BASENAME_ONLY":
            why.append("name_match_is_coincidence_content_absent")
        if blob == EMPTY:
            why.append("empty_blob_matches_any_empty_file(%d_in_head)" % len(head_blob.get(EMPTY, [])))
        if a["in_aether"] == "SAME" and acer_path_blob == blob and a["aether_path"] not in paths:
            why.append("acer_path_gone_at_d203721")
        hits = sorted(estate.get(blob, set()))
        if blob == EMPTY:
            estate_txt = "%d_repos(empty_blob)" % len(hits)
        else:
            estate_txt = "+".join(h + ("(self)" if h in SELF_REPO.get(src, set()) else "") for h in hits) or "-"
        if cloud == "SAME" and blob == EMPTY:
            head_txt = "+".join(p for p in paths if p.endswith("/" + os.path.basename(path))) + "(+%d_other_empty)" % (len(paths) - 1)
        elif cloud == "SAME":
            head_txt = "+".join(paths)
        elif cloud == "COUNTERPART_DIFF":
            cp = paths[0]
            cp_blob = next(b for p, b in head_base[os.path.basename(cp)] if p == cp)
            head_txt = "-(counterpart:%s@%s)" % (cp, cp_blob[:8])
        elif cloud == "BASENAME_ONLY":
            head_txt = "-(basename_only:%d_unrelated_same-name_paths)" % len(paths)
        else:
            head_txt = "-"
        rows.append(
            "RECHECK|src=%s|file=%s|bytes=%s|blob=%s|aether_head_paths=%s|aether_history=%d|asolaria_mirror=%d|estate_hits=%s|acer_says=%s|acer_path=%s|acer_literal_ok=%d|cloud_says=%s|cloud_at_4646e9f=%s|agree=%d|agree_at_4646e9f=%d|why=%s|json=0"
            % (src, path, size, blob, head_txt, int(blob in hist), int(blob in mirror), estate_txt, a["in_aether"], a["aether_path"],
               literal, cloud, old, agree, agree_old, ";".join(why) or "-")
        )
        s = summary.setdefault(src, {"n": 0, "SAME": 0, "COUNTERPART_DIFF": 0, "BASENAME_ONLY": 0, "MISSING": 0, "hist": 0, "agree": 0, "agree_old": 0, "literal": 0})
        s["n"] += 1
        s[cloud] += 1
        s["hist"] += int(blob in hist)
        s["agree"] += agree
        s["agree_old"] += agree_old
        s["literal"] += literal

    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        for line in HEADER:
            fh.write(line + "\n")
        for src in ("colourqr", "matrixcolour", "asolaria", "shadowcat_acer"):
            s = summary[src]
            fh.write(
                "RECHECKSUM|src=%s|files=%d|same=%d|real_counterpart_different=%d|basename_only=%d|missing=%d|in_aether_history=%d|agree_with_acer_at_d203721=%d/%d|agree_with_acer_at_4646e9f=%d/%d|acer_literal_byte_claims_true=%d/%d|json=0\n"
                % (src, s["n"], s["SAME"], s["COUNTERPART_DIFF"], s["BASENAME_ONLY"], s["MISSING"], s["hist"], s["agree"], s["n"], s["agree_old"], s["n"], s["literal"], s["n"])
            )
        for line in FINDINGS:
            fh.write(line + "\n")
        for r in rows:
            fh.write(r + "\n")


HEADER = []
FINDINGS = []

if __name__ == "__main__":
    HEADER.extend(open(sys.argv[4], encoding="utf-8").read().splitlines())
    FINDINGS.extend(open(sys.argv[5], encoding="utf-8").read().splitlines())
    main()
