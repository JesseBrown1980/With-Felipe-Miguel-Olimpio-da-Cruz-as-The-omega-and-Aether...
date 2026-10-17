#!/usr/bin/env python3
"""Writes gguf/MANIFEST.hbp from the GGUF files in this tree and the verifier's own output.

Usage: make_manifest.py <gguf-verify-hbp binary> [--check]
Pinned upstream sources are listed in SOURCES below; every path keeps its upstream path under the
source's directory, byte-identical (Git LFS pointers stay pointers, as upstream stores them).
"""
import hashlib
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
MANIFEST = HERE / "MANIFEST.hbp"
SOURCES = {
    "universe-simulator": (
        "JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills",
        "3f9f42dab6247c40b30921b253e3f73c9e942ca5",
    ),
    "follow": (
        "JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS",
        "8712368c851abe347ddf97a25bfbd96275d4316c",
    ),
}
LFS_HEADER = b"version https://git-lfs.github.com/spec/v1\n"


def git_blob_id(data):
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def verifier_fields(binary, path):
    out = subprocess.run([binary, str(path)], check=True, capture_output=True, text=True).stdout
    fields = {}
    for line in out.splitlines():
        parts = line.split("|")
        row = dict(p.split("=", 1) for p in parts[1:] if "=" in p)
        if parts[0] == "HEADER":
            fields["tensors"] = row["tensors"]
            fields["gguf_version"] = row["version"]
        elif parts[0] == "META" and row.get("key") in ("general.architecture", "general.name"):
            fields[row["key"].split(".")[1]] = row["value"].removeprefix("s:")
        elif parts[0] == "VERDICT":
            fields["structure"] = row["structure"]
    return fields


def rows(binary):
    out = []
    for folder, (repo, commit) in SOURCES.items():
        for path in sorted((HERE / folder).rglob("*.gguf")):
            data = path.read_bytes()
            upstream_path = path.relative_to(HERE / folder).as_posix()
            row = {"repo": repo, "commit": commit, "path": upstream_path, "git_blob": git_blob_id(data)}
            if data.startswith(LFS_HEADER):
                pointer = dict(line.split(" ", 1) for line in data.decode().splitlines())
                row.update(storage="lfs_pointer", bytes=pointer["size"], sha256=pointer["oid"].removeprefix("sha256:"))
            else:
                row.update(storage="file", bytes=str(len(data)), sha256=hashlib.sha256(data).hexdigest())
                row.update(verifier_fields(binary, path))
            fields = "|".join(f"{k}={v}" for k, v in row.items())
            out.append(f"GGUF|local={folder}/{upstream_path}|{fields}|json=0")
    return out


def render(binary):
    body = rows(binary)
    files = sum("|storage=file|" in r for r in body)
    pointers = len(body) - files
    head = [
        "HBP1|schema=ASOLARIA-AETHER-GGUF-MANIFEST-V1|json=0",
        f"COUNT|gguf={len(body)}|file={files}|lfs_pointer={pointers}|json=0",
    ]
    return "\n".join(head + body) + "\n"


def main():
    if len(sys.argv) not in (2, 3) or (len(sys.argv) == 3 and sys.argv[2] != "--check"):
        print(__doc__, file=sys.stderr)
        return 2
    text = render(sys.argv[1])
    if len(sys.argv) == 3:
        if MANIFEST.read_text(encoding="utf-8") != text:
            print("GGUF_MANIFEST|check=FAIL|json=0")
            return 1
        print(f"GGUF_MANIFEST|check=PASS|rows={text.count(chr(10)) - 2}|json=0")
        return 0
    MANIFEST.write_text(text, encoding="utf-8")
    print(f"GGUF_MANIFEST|written=MANIFEST.hbp|rows={text.count(chr(10)) - 2}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
