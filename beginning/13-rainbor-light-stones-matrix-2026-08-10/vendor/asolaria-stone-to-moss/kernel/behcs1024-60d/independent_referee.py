#!/usr/bin/env python3
"""Independent FIPS SHA-256 reference; never imports the Rust implementation."""
import hashlib
import pathlib
import subprocess
import sys


def sha(raw):
    return hashlib.sha256(raw).digest()


def project(raw):
    assert len(raw) <= 508
    glyphs = []
    for counter in range(4):
        h = sha(raw + counter.to_bytes(4, "big"))
        glyphs.extend((int.from_bytes(h[i:i+2], "big") & 0x3ff)
                      for i in range(0, 32, 2))
    glyphs = glyphs[:60]
    coordinate = b"".join(g.to_bytes(2, "big") for g in glyphs)
    return glyphs, sha(coordinate).hex(), sha(coordinate)[:8].hex(), sha(raw).hex()


def run(binary, raw):
    p = subprocess.run([str(binary), raw.hex()], check=False, text=True,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
    return p


def main():
    # Preserve identical byte receipts across Windows and Linux runners.
    sys.stdout.reconfigure(newline="\n")
    binary = pathlib.Path(sys.argv[1]).resolve()
    assert binary.is_file(), binary
    cases = [
        b"", b"abc", bytes(range(256)), bytes(range(256)) + bytes(range(252)),
        bytes([42]) * 508, b"\x00" * 508, b"stage-three-reference",
    ]
    for i, raw in enumerate(cases):
        proc = run(binary, raw)
        assert proc.returncode == 0, (i, proc.stderr)
        lines = proc.stdout.splitlines()
        assert len(lines) == 4 and lines[0] == (
            "HBP1|schema=ASOLARIA-BEHCS1024-60D-SAFE-V1|dims=60|alphabet=1024|json=0"
        )
        assert lines[1].startswith("COORD|glyphs=") and lines[1].endswith("|json=0")
        assert lines[2].startswith("DIGEST|source_sha256=") and lines[2].endswith("|json=0")
        assert lines[3].startswith("BOUNDARY|inverse=NOT_ESTABLISHED|")
        coordinate = tuple(int(g) for g in lines[1].split("=")[1].split("|")[0].split("."))
        expected = project(raw)
        assert coordinate == tuple(expected[0]), i
        assert f"source_sha256={expected[3]}" in lines[2]
        assert f"coordinate_sha256={expected[1]}" in lines[2]
        assert f"host8={expected[2]}" in lines[2]
        assert proc.stdout == run(binary, raw).stdout
        print(f"PARITY|case={i}|bytes={len(raw)}|coordinates=60|source_sha256={expected[3]}|pass=TRUE|json=0")
    for length in (509, 510, 511, 512, 513):
        p = run(binary, bytes([42]) * length)
        assert p.returncode != 0 and "HELD" in p.stderr, length
        print(f"REJECT|case=legacy_counter_truncation|bytes={length}|pass=TRUE|json=0")
    print("VERDICT|independent_reference=PASS|physical_instrument=NOT_TESTED|json=0")


if __name__ == "__main__":
    main()
