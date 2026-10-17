#!/usr/bin/env python3
"""Independent model of upstream project_60d (hashlib, never the Rust code), checked against the demo."""
import hashlib
import pathlib
import subprocess
import sys

TUPLE_CAP = 512


def upstream_sha(raw):
    # Upstream's fixed-buffer helper hashes at most TUPLE_CAP bytes.
    return hashlib.sha256(raw[:TUPLE_CAP]).digest()


def project(raw):
    tuple_ = raw[:TUPLE_CAP]
    glyphs = []
    for counter in range(4):
        h = upstream_sha(tuple_ + counter.to_bytes(4, "big"))
        glyphs.extend((int.from_bytes(h[i:i+2], "big") & 0x3ff)
                      for i in range(0, 32, 2))
    glyphs = glyphs[:60]
    coordinate = b"".join(g.to_bytes(2, "big") for g in glyphs)
    digest = upstream_sha(coordinate)
    return glyphs, digest.hex(), digest[:8].hex(), upstream_sha(raw).hex()


def run(binary, raw):
    return subprocess.run([str(binary), raw.hex()], check=False, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)


def main():
    # Preserve identical byte receipts across Windows and Linux runners.
    sys.stdout.reconfigure(newline="\n")
    binary = pathlib.Path(sys.argv[1]).resolve()
    assert binary.is_file(), binary
    pattern = lambda n: bytes(i % 256 for i in range(n))
    cases = [
        b"", b"abc", bytes(range(256)), pattern(508),
        bytes([42]) * 508, b"\x00" * 508, b"stage-three-reference",
        pattern(509), pattern(510), pattern(511), pattern(512),
        bytes([42]) * 512, pattern(513), pattern(1024),
    ]
    for i, raw in enumerate(cases):
        proc = run(binary, raw)
        assert proc.returncode == 0, (i, proc.stderr)
        lines = proc.stdout.splitlines()
        assert len(lines) == 4 and lines[0] == (
            "HBP1|schema=ASOLARIA-BEHCS1024-60D-UPSTREAM-V1|dims=60|alphabet=1024|json=0"
        )
        assert lines[1].startswith("COORD|glyphs=") and lines[1].endswith("|json=0")
        assert lines[2].startswith("DIGEST|source_sha256=") and lines[2].endswith("|json=0")
        read = min(len(raw), TUPLE_CAP)
        counter = min(TUPLE_CAP - read, 4)
        assert lines[3] == (
            "BOUNDARY|inverse=NOT_ESTABLISHED|full_source_required=TRUE|tuple_cap=512"
            f"|bytes={len(raw)}|bytes_read={read}|counter_bytes_hashed={counter}|json=0"
        ), (i, lines[3])
        coordinate = tuple(int(g) for g in lines[1].split("=")[1].split("|")[0].split("."))
        expected = project(raw)
        assert coordinate == tuple(expected[0]), i
        assert f"source_sha256={expected[3]}" in lines[2]
        assert f"coordinate_sha256={expected[1]}" in lines[2]
        assert f"host8={expected[2]}" in lines[2]
        assert proc.stdout == run(binary, raw).stdout
        repeats = all(coordinate[k] == coordinate[k % 16] for k in range(60))
        assert repeats == (counter < 4), i
        print(f"PARITY|case={i}|bytes={len(raw)}|counter_bytes_hashed={counter}|groups_repeat={int(repeats)}"
              f"|source_sha256={expected[3]}|pass=TRUE|json=0")
    print("VERDICT|independent_reference=PASS|physical_instrument=NOT_TESTED|json=0")


if __name__ == "__main__":
    main()
