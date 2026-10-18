#!/usr/bin/env python3
"""Stream-verifies ACER's item 6B and 6C delivery zips in corpora/ without extracting them, and the 6A cube.

For each zip: its bytes and sha256 against the pins below; every entry name is safe (relative, no '..', no
backslash, no directory, not encrypted, stored or deflated, no duplicate); the entries are exactly CUBE.hbp,
SHA256SUMS and the cube's FILE rows; SHA256SUMS lists the FILE rows' names and sha256 in the same order; the
cube's files= count and merkle_sha256 (sha256 of the FILE rows' hex digests concatenated in row order, the
rule all three item-6 cubes follow) hold; and every body, decompressed as a stream in 1 MiB pieces, has the
FILE row's byte count and sha256 (zipfile also checks each entry's CRC-32). The corpora's bytes and sha256
are also checked against the CORPUS rows of vendor/ITEM6-STATUS.hbp, and the events file against its RECIPE
row. For vendor/: CUBE.hbp's FILE rows against SHA256SUMS and the files on disk, and its merkle_sha256.
Stdlib only, integers only. Prints one HBP row per check; exit 0 when every check passes.
"""
import hashlib
import pathlib
import re
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CORPORA = ROOT / "corpora"
VENDOR = ROOT / "vendor"
PIECE = 1 << 20

ZIPS = {
    "FABLE5-REGEN-ITEM6B-GNN-ZOO-CORPORA-2026-10-18.zip": (
        7618451, "b8e156977c2e43c7335eae1251fffbf57cbfc25c7889b7a7e051eda5ee10b38a",
        "85131051f202f42f51f248fc82508d1fc19e057dfac74c26ac395decfe6d9221",
        "74db51c0986cca82674b30ce95897c71fc28dc54393d265bc7a8af9be1326076"),
    "FABLE5-REGEN-ITEM6C-GNN-EXPORT-AND-EVENTS-2026-10-18.zip": (
        18398818, "3344d8c5869aa48bfbd2b8ed7e591b7c34304736eb10939d8d34ca7aefb9fd2b",
        "5295f7d958bed64be28c7eef7e0fce9be50e1f9060a4213490dd0bc2a090bb02",
        "5cbbbc92ac2fbf47d46b7384e1c82d0daca2db7aa32dd66372f290d44795ea3b"),
}
VENDOR_CUBE_SHA256 = "cc53b07744617b433126d29a41ee2a7fb52a71cbb07aa984d162e71784f7ce6d"
VENDOR_SUMS_SHA256 = "1605623d3baec38ec136fe9ef43e24b0219997c82237ec0cfca5c9a1d6e79b8d"

failures = []


def row(text, ok=True):
    print(text + "|json=0")
    if not ok:
        failures.append(text)


def fields(line):
    return dict(f.split("=", 1) for f in line.split("|")[1:] if "=" in f)


def parse_cube(text):
    lines = text.splitlines()
    head = fields(lines[0]) if lines and lines[0].startswith("CUBEHDR|") else {}
    foot = fields(lines[-1]) if lines and lines[-1].startswith("CUBEFTR|") else {}
    files = [fields(line) for line in lines if line.startswith("FILE|")]
    return head, foot, [(f["name"], int(f["bytes"]), f["sha256"]) for f in files]


def parse_sums(text):
    out = []
    for line in text.splitlines():
        m = re.fullmatch(r"([0-9a-f]{64})  (\S.*)", line)
        if not m:
            return None
        out.append((m.group(2), m.group(1)))
    return out


def check_cube(label, head, foot, files, sums):
    merkle = hashlib.sha256("".join(sha for _, _, sha in files).encode()).hexdigest()
    row(f"CUBE|{label}|files_header={head.get('files')}|file_rows={len(files)}",
        head.get("files") == str(len(files)))
    row(f"MERKLE|{label}|header={head.get('merkle_sha256')}|footer={foot.get('merkle_sha256')}|computed={merkle}",
        head.get("merkle_sha256") == merkle == foot.get("merkle_sha256"))
    row(f"SUMS|{label}|lines={len(sums) if sums is not None else 'malformed'}|equal_to_file_rows_in_order="
        f"{int(sums == [(n, s) for n, _, s in files])}", sums == [(n, s) for n, _, s in files])


def status_rows():
    text = (VENDOR / "ITEM6-STATUS.hbp").read_text(encoding="utf-8")
    corpus = {}
    recipe = None
    for line in text.splitlines():
        if line.startswith("CORPUS|"):
            f = fields(line)
            corpus[f["file"]] = (int(f["bytes"]), f["sha256"])
        elif line.startswith("RECIPE|"):
            m = re.search(r"input=data/graph-runtime-events\.ndjson:([0-9a-f]{64})\(bytes=(\d+);", line)
            recipe = (int(m.group(2)), m.group(1)) if m else None
    return corpus, recipe


def safe_name(name):
    return (name and not name.startswith("/") and "\\" not in name and not name.endswith("/")
            and ".." not in name.split("/") and "" not in name.split("/"))


def verify_zip(name, pins, corpus, recipe):
    size, sha, cube_sha, sums_sha = pins
    path = CORPORA / name
    h = hashlib.sha256()
    n = 0
    with path.open("rb") as f:
        while piece := f.read(PIECE):
            h.update(piece)
            n += len(piece)
    row(f"ZIP|name={name}|bytes={n}|sha256={h.hexdigest()}", n == size and h.hexdigest() == sha)
    with zipfile.ZipFile(path) as z:
        infos = z.infolist()
        names = [i.filename for i in infos]
        unsafe = [i.filename for i in infos if not safe_name(i.filename) or i.flag_bits & 1
                  or i.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)]
        row(f"ENTRIES|name={name}|count={len(names)}|duplicates={len(names) - len(set(names))}|unsafe={len(unsafe)}",
            len(names) == len(set(names)) and not unsafe)
        cube = z.read("CUBE.hbp")
        sums = z.read("SHA256SUMS")
        row(f"CUBEFILE|name={name}|sha256={hashlib.sha256(cube).hexdigest()}", hashlib.sha256(cube).hexdigest() == cube_sha)
        row(f"SUMSFILE|name={name}|sha256={hashlib.sha256(sums).hexdigest()}", hashlib.sha256(sums).hexdigest() == sums_sha)
        head, foot, files = parse_cube(cube.decode("utf-8"))
        check_cube(f"name={name}", head, foot, files, parse_sums(sums.decode("utf-8")))
        expected = {"CUBE.hbp", "SHA256SUMS"} | {n for n, _, _ in files}
        row(f"MEMBERS|name={name}|equal_to_cube={int(set(names) == expected)}", set(names) == expected)
        for entry, want_bytes, want_sha in files:
            info = z.getinfo(entry)
            h = hashlib.sha256()
            got = 0
            with z.open(info) as body:
                while piece := body.read(PIECE):
                    h.update(piece)
                    got += len(piece)
            ok = got == want_bytes == info.file_size and h.hexdigest() == want_sha
            row(f"BODY|zip={name}|entry={entry}|bytes={got}|sha256={h.hexdigest()}", ok)
            base = entry.rsplit("/", 1)[-1]
            if base in corpus:
                row(f"STATUS|entry={entry}|corpus_row_matches={int(corpus[base] == (got, h.hexdigest()))}",
                    corpus[base] == (got, h.hexdigest()))
                corpus.pop(base)
            elif base == "graph-runtime-events.ndjson":
                row(f"STATUS|entry={entry}|recipe_input_matches={int(recipe == (got, h.hexdigest()))}",
                    recipe == (got, h.hexdigest()))


def verify_vendor():
    cube = (VENDOR / "CUBE.hbp").read_bytes()
    sums = (VENDOR / "SHA256SUMS").read_bytes()
    row(f"CUBEFILE|name=vendor|sha256={hashlib.sha256(cube).hexdigest()}",
        hashlib.sha256(cube).hexdigest() == VENDOR_CUBE_SHA256)
    row(f"SUMSFILE|name=vendor|sha256={hashlib.sha256(sums).hexdigest()}",
        hashlib.sha256(sums).hexdigest() == VENDOR_SUMS_SHA256)
    head, foot, files = parse_cube(cube.decode("utf-8"))
    check_cube("name=vendor", head, foot, files, parse_sums(sums.decode("utf-8")))
    bad = 0
    for entry, want_bytes, want_sha in files:
        body = (VENDOR / entry).read_bytes()
        bad += len(body) != want_bytes or hashlib.sha256(body).hexdigest() != want_sha
    row(f"BODIES|name=vendor|files={len(files)}|mismatched={bad}", bad == 0)


def main():
    if sys.argv[1:]:
        print("usage: verify_corpora.py", file=sys.stderr)
        return 2
    corpus, recipe = status_rows()
    verify_vendor()
    for name, pins in ZIPS.items():
        verify_zip(name, pins, corpus, recipe)
    row(f"STATUS|corpus_rows_not_found={','.join(sorted(corpus)) if corpus else 'none'}", not corpus)
    verdict = "PASS" if not failures else "FAIL"
    print(f"VERIFY|verdict={verdict}|failed={len(failures)}|json=0")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
