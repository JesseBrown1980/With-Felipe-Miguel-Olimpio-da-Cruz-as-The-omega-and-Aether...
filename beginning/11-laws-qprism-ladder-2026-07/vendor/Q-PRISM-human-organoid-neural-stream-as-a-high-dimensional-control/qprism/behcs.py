"""Minimal BEHCS-1024 encoder -- ties QPRISM selector tuples to Asolaria's
Brown-Hilbert addressing (spec IX-700-EXTENDED, base 1024, width 6, 2^60 ceiling).

A HyperBEHCS "selector tuple" here is the experimental control schedule. We give each
schedule a compact, collision-resistant glyph id derived from a SHA-256 of its
quantised parameters, encoded little-endian base-1024 to canonical width 6.

This is an *identifier / addressing* layer (names schedules compactly); it stores no
payload and makes no compression-beyond-entropy claim -- consistent with the Asolaria
report Sec.2.3 and Sec.7.
"""
from __future__ import annotations
import hashlib
import json
import os

_ALPHABET_PATH = os.path.join(os.path.dirname(__file__), "data", "alphabet-1024.json")
with open(_ALPHABET_PATH, encoding="utf-8") as _f:
    _A = json.load(_f)
GLYPHS = _A["glyphs"]
BASE = int(_A["base"])          # 1024
WIDTH = int(_A["canonical_width"])  # 6
assert len(GLYPHS) == BASE, "alphabet-1024.json must define exactly 1024 glyphs"
CEILING = BASE ** WIDTH         # 1024**6 == 2**60


def encode(value: int, width: int = WIDTH) -> str:
    """little-endian base-1024 -> glyph run of `width` glyphs (least-significant first)."""
    if value < 0 or value >= BASE ** width:
        raise ValueError(f"value {value} does not fit width {width} at base {BASE}")
    out = []
    n = value
    for _ in range(width):
        out.append(GLYPHS[n % BASE])
        n //= BASE
    return "".join(out)


def decode(run: str) -> int:
    idx = {g: i for i, g in enumerate(GLYPHS)}
    n = 0
    for ch in reversed(run):
        if ch not in idx:
            raise ValueError(f"glyph not in BEHCS-1024 alphabet: {ch!r}")
        n = n * BASE + idx[ch]
    return n


def schedule_id(schedule_dict: dict) -> str:
    """Deterministic BEHCS-1024 glyph id for a schedule (selector tuple).
    Quantises params, SHA-256s the canonical JSON, folds to the 2^60 ceiling."""
    q = {k: round(float(v), 9) for k, v in sorted(schedule_dict.items())}
    digest = hashlib.sha256(json.dumps(q, separators=(",", ":")).encode()).digest()
    val = int.from_bytes(digest[:8], "big") % CEILING     # fold into 60-bit address space
    return "HG1024:QPRISM:" + encode(val)


if __name__ == "__main__":
    demo = {"T1": 2.7e-3, "T2": 2.7e-3, "P": 1.0, "v_center": 100.0, "v_half": 10.0}
    sid = schedule_id(demo)
    print("schedule id :", sid)
    run = sid.split(":")[-1]
    print("decodes to  :", decode(run), "(< 2^60 =", CEILING, ")")
