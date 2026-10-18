"""Measure the white space in the canonical enwik8 (Law 0, Law 17). Integers only, stdlib only.

usage: python3 -I free_space.py <enwik8> <out-dir>
Checks that <enwik8> is the canonical Hutter Prize file, counts its white-space bytes, and
writes three inputs for the compressors into <out-dir>: the whole file without white space, and
the first 10,000,000 bytes with and without white space. Prints one HBP row per fact.
"""

import hashlib
import os
import sys
from collections import Counter

CANON_LEN = 100_000_000
CANON_SHA256 = "2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8"
CANON_MD5 = "a1fa5ffddb56f4953e226637dabbb36a"
SCHEMA = b"http://www.mediawiki.org/xml/export-0.3/"
WHITE = {32: "space", 10: "newline", 9: "tab", 13: "cr"}
PREFIX = 10_000_000


def strip(data):
    return data.translate(None, bytes(WHITE))


def row(name, **fields):
    body = "|".join(f"{k}={v}" for k, v in fields.items())
    print(f"{name}|{body}|json=0")


def main():
    src, out = sys.argv[1], sys.argv[2]
    data = open(src, "rb").read()
    sha = hashlib.sha256(data).hexdigest()
    md5 = hashlib.md5(data).hexdigest()
    canon = len(data) == CANON_LEN and sha == CANON_SHA256 and md5 == CANON_MD5
    row("INPUT", bytes=len(data), sha256=sha, md5=md5, schema_export_0_3=int(SCHEMA in data[:200]),
        canonical=int(canon))
    if not canon:
        sys.exit("not the canonical enwik8")

    counts = {name: data.count(bytes([b])) for b, name in WHITE.items()}
    white = sum(counts.values())
    row("WHITE", **counts, total=white, kept=len(data) - white,
        per10000=white * 10_000 // len(data))

    hist = Counter(data)
    top = sorted(hist, key=lambda b: (-hist[b], b))[:3]
    row("MODE", **{f"rank{i + 1}": f"0x{b:02x}:{hist[b]}" for i, b in enumerate(top)})

    os.makedirs(out, exist_ok=True)
    inputs = {
        "enwik8.nows": strip(data),
        "e10m": data[:PREFIX],
        "e10m.nows": strip(data[:PREFIX]),
    }
    for name, body in inputs.items():
        with open(os.path.join(out, name), "wb") as f:
            f.write(body)
        row("WROTE", file=name, bytes=len(body), sha256=hashlib.sha256(body).hexdigest())


if __name__ == "__main__":
    main()
