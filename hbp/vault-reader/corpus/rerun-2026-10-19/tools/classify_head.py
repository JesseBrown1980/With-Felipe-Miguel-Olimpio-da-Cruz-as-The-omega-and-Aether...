#!/usr/bin/env python3
"""Read-only. Classify every uncovered repo@commit hit at aether HEAD by the textual form of each own-text occurrence.
Writes occ.tsv (one line per own occurrence with kind) and classes.tsv (one line per repo@commit)."""
import os, re, subprocess, sys, collections
S = "/tmp/claude-0/-home-user/b2fb539a-cb4d-5f0b-a22f-ca1a7fcb500d/scratchpad"
A = S + "/asolaria-aether"; R = S + "/vault-rerun"; W = sys.argv[1]; HEAD = sys.argv[2]
covered = {}
for line in open(R + "/RERUN-v2.hbp" if os.path.exists(R + "/RERUN-v2.hbp") else R + "/RERUN.hbp"):
    parts = line.rstrip("\n").split("|")
    if parts[0] in ("RERUN", "RERUNALT", "RERUNSUB", "ZEROHBI", "SKIP"):
        d = dict(p.partition("=")[::2] for p in parts[1:])
        covered.setdefault((d["repo"].split("/", 1)[-1].lower(), d["commit"]), []).append(parts[0])
IMPORTED_VERBATIM = set(l.split("\t")[0] for l in open(W + "/own-verbatim-files.tsv")) - {"docs/THE-RADIATED-SLICE.md", "docs/ADDRESSABLY-ADDRESSING.md"}
cache = {}
def L(rel):
    if rel not in cache:
        b = subprocess.run(["git", "-C", A, "show", f"{HEAD}:{rel}"], capture_output=True).stdout
        cache[rel] = b.decode("utf-8", "replace").split("\n")
    return cache[rel]
hdrcache = {}
def table_header(rel, ln):
    """Header cells of the markdown table containing line ln (1-based), or None."""
    lines = L(rel); i = ln - 1
    while i >= 0 and lines[i].lstrip().startswith("|"):
        if re.match(r"^\s*\|\s*:?-{3,}", lines[i]) and i > 0:
            return [c.strip().lower() for c in lines[i - 1].strip().strip("|").split("|")]
        i -= 1
    return None
def cell_index(line, col):
    # count unescaped pipes before col, ignoring the leading one
    s = line[:col]; n = 0; tick = False
    for ch in s:
        if ch == "`": tick = not tick
        elif ch == "|" and not tick: n += 1
    return n - 1
AT = re.compile(r"([A-Za-z0-9._/\u2026-]+?)(?:\.git)?`?\s*@\s*`?$")
KW = re.compile(r"(source=[^|]*@|generator=[^|]*@|git_head=|head=|commit=|--commit\s+|--names-from\s+"
                r"|pinned by commit[^`]*`|pinned commit:\s*`|pinned at commit\s*`|\bhead\s+`|PR\s*#?\d+\s+head\s+`"
                r"|branch\s+`[^`]+`\s+at\s+`|checked out at\s+`?|harness at\s+`|private mirror at\s+|`main`\s+at\s+`|main`?\s+at\s+`"
                r"|vendored from commit\s+`|read from commit\s+`|at commit\s+`|pinned[^.|]{0,40}`"
                r"|refs/pull/\d+/head`?\s*=\s*`|branch\s+`[^`]+`\s+at\s+`)$", re.I)
secs = {}
def pinned_by_commit_section(rel, ln):
    if rel not in secs:
        flags = []; cur = False
        for x in L(rel):
            m = re.match(r"^(#+)\s", x)
            if m: cur = bool(re.search(r"pinned by commit", x, re.I))
            flags.append(cur)
        secs[rel] = flags
    return secs[rel][ln - 1]
DATE = re.compile(r"(first\s+\d{4}-\d{2}-\d{2}\s*\((?:merge\s+)?`?|first in\s+`|\(\s*`?$|\[vendored:[^\]]*`?$"
                  r"|merged into `?[\w/-]+`? by\s+`|merge\s+`|\d{4}-\d{2}-\d{2}T?[\d:+-]*\s*`?$|introduced\W[^`]{0,25}`?$"
                  r"|(first|since|added=|added by|merged|merge)\W[^`]{0,25}`?$)", re.I)
hits = collections.defaultdict(list)
for line in open(W + "/hits.tsv"):
    repo, c, tok, meta, fc, rel, ln, col = line.rstrip("\n").split("\t")
    hits[(repo, c)].append((tok, int(meta), fc, rel, int(ln), int(col)))
occ = open(W + "/occ.tsv", "w")
rows = []
for (repo, c), hs in sorted(hits.items()):
    if (repo.lower(), c) in covered: continue
    kinds = collections.Counter(); best = []; fcs = set()
    for tok, meta, fc, rel, ln, col in hs:
        fcs.add(fc)
        if fc == "own" and rel in IMPORTED_VERBATIM: fc = "imported"
        fcs.add(fc)
        if fc != "own": continue
        line = L(rel)[ln - 1]
        prev = L(rel)[ln - 2] if ln >= 2 else ""
        pre = line[max(0, col - 160):col]; post = line[col + len(tok): col + len(tok) + 24]
        if len(pre.strip(" `(")) < 12 and prev: pre = prev[-160:] + " " + pre
        if tok != tok.lower(): k = "FILENAME"
        else:
            k = None
            hdr = table_header(rel, ln) if line.lstrip().startswith("|") else None
            if hdr is not None:
                ci = cell_index(line, col)
                h = hdr[ci] if 0 <= ci < len(hdr) else ""
                if "source" in h and ("commit" in h or "@" in h): k = "SRC_COL"
                elif "beginning" in h or "first" in h or "content date" in h or h in ("date", "added"): k = "DATE_COL"
            if k is None and pinned_by_commit_section(rel, ln): k = "PIN_SECTION"
            if k is None:
                m = AT.search(pre)
                if m:
                    nm = m.group(1).split("/")[-1]
                    k = "PIN_AT" if nm.lower() == repo.lower() else "PIN_AT_ALIAS"
                elif KW.search(pre) or re.match(r"`?,\s*blob\s", post): k = "PIN_KW"
                elif re.match(r",\s*\d{2}:\d{2}:\d{2}", post) or DATE.search(pre): k = "DATE_PROSE"
                else: k = "CITE"
        kinds[k] += 1
        occ.write(f"{repo}\t{c}\t{k}\t{meta}\t{rel}:{ln}\t{pre[-110:]!s}<<{tok}>>{post}\n".replace("\r", ""))
    if "own" not in fcs: cls = "VENDORED_OR_IMPORTED_ONLY"
    elif set(kinds) & {"SRC_COL", "PIN_AT", "PIN_AT_ALIAS", "PIN_KW", "PIN_SECTION"}: cls = "A_PIN"
    elif set(kinds) <= {"DATE_COL", "DATE_PROSE", "FILENAME"} and set(kinds) & {"DATE_COL", "DATE_PROSE"}: cls = "B_DATING"
    elif set(kinds) == {"FILENAME"}: cls = "C_FILENAME_ONLY"
    else: cls = "B_CITE"
    rows.append((cls, repo, c, len(hs), ",".join(f"{k}:{v}" for k, v in sorted(kinds.items()))))
occ.close()
with open(W + "/classes.tsv", "w") as f:
    for r in rows: f.write("\t".join(map(str, r)) + "\n")
cnt = collections.Counter(r[0] for r in rows)
print(dict(cnt), "repos_A", len({r[1] for r in rows if r[0] == "A_PIN"}))
