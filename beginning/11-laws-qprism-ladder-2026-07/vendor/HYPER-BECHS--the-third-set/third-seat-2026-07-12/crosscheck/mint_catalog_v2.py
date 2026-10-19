#!/usr/bin/env python3
"""Monotonic exact glyph catalog + held-out prior curve.

The catalog starts with 256 byte glyphs. New glyphs are append-only pair
compositions of existing glyph IDs. Data are tokenized greedily by longest
known phrase, packed as little-endian u16 IDs, then entropy-coded with zstd.
Every frame is decoded and SHA-checked. Both persistent-system and standalone
costs are reported.

This is an independent reconstruction of the claimed mint/prior mechanism; it
is not presented as Claude Fable 5's missing implementation.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import struct
import subprocess
import time
from array import array
from pathlib import Path
from typing import Iterable

try:
    import zstandard as zstd  # type: ignore
except Exception:
    zstd = None

MAGIC = b"AGLYPH2\0"
HEADER_BYTES = 16


def zstd_compress(data: bytes, level: int) -> bytes:
    if zstd is not None:
        return zstd.ZstdCompressor(level=level).compress(data)
    return subprocess.run(["zstd", "-q", f"-{level}", "-c"], input=data, stdout=subprocess.PIPE, check=True).stdout


def zstd_decompress(data: bytes) -> bytes:
    if zstd is not None:
        return zstd.ZstdDecompressor().decompress(data)
    return subprocess.run(["zstd", "-q", "-d", "-c"], input=data, stdout=subprocess.PIPE, check=True).stdout


class GlyphCatalog:
    def __init__(self) -> None:
        self.phrases: list[bytes] = [bytes([i]) for i in range(256)]
        self.pairs: list[tuple[int, int]] = []
        self._phrase_to_id: dict[bytes, int] = {p: i for i, p in enumerate(self.phrases)}
        self._trie: dict = {}
        self._trie_version = -1

    @property
    def vocab_size(self) -> int:
        return len(self.phrases)

    @property
    def minted_count(self) -> int:
        return len(self.pairs)

    @property
    def serialized_bytes(self) -> int:
        return HEADER_BYTES + 4 * len(self.pairs)

    def serialize(self) -> bytes:
        if self.vocab_size > 65535:
            raise ValueError("v2 catalog exceeds u16 token space")
        out = bytearray(MAGIC)
        out += struct.pack("<HHI", 2, 256, len(self.pairs))
        for left, right in self.pairs:
            out += struct.pack("<HH", left, right)
        if len(out) != self.serialized_bytes:
            raise AssertionError((len(out), self.serialized_bytes))
        return bytes(out)

    @classmethod
    def deserialize(cls, raw: bytes) -> "GlyphCatalog":
        if raw[:8] != MAGIC:
            raise ValueError("bad catalog magic")
        version, base, count = struct.unpack_from("<HHI", raw, 8)
        if version != 2 or base != 256 or len(raw) != HEADER_BYTES + 4 * count:
            raise ValueError("bad catalog framing")
        c = cls()
        off = HEADER_BYTES
        for _ in range(count):
            left, right = struct.unpack_from("<HH", raw, off)
            off += 4
            c.add_pair(left, right)
        return c

    def add_pair(self, left: int, right: int, max_phrase_len: int = 96) -> int | None:
        if left >= self.vocab_size or right >= self.vocab_size:
            raise ValueError("parent token not yet defined")
        phrase = self.phrases[left] + self.phrases[right]
        if len(phrase) > max_phrase_len or phrase in self._phrase_to_id:
            return None
        if self.vocab_size >= 65535:
            raise ValueError("u16 vocabulary exhausted")
        token_id = self.vocab_size
        self.phrases.append(phrase)
        self.pairs.append((left, right))
        self._phrase_to_id[phrase] = token_id
        return token_id

    def _ensure_trie(self) -> None:
        if self._trie_version == self.vocab_size:
            return
        root: dict = {}
        for token_id in range(256, self.vocab_size):
            p = self.phrases[token_id]
            node = root
            for b in p:
                node = node.setdefault(b, {})
            node[-1] = token_id
        self._trie = root
        self._trie_version = self.vocab_size

    def tokenize(self, data: bytes) -> list[int]:
        self._ensure_trie()
        root = self._trie
        out: list[int] = []
        i, n = 0, len(data)
        while i < n:
            node = root.get(data[i])
            if node is None:
                out.append(data[i])
                i += 1
                continue
            best_id = data[i]
            best_end = i + 1
            j = i + 1
            term = node.get(-1)
            if term is not None:
                best_id, best_end = term, j
            while j < n:
                nxt = node.get(data[j])
                if nxt is None:
                    break
                node = nxt
                j += 1
                term = node.get(-1)
                if term is not None:
                    best_id, best_end = term, j
            out.append(best_id)
            i = best_end
        return out

    def detokenize(self, tokens: Iterable[int]) -> bytes:
        return b"".join(self.phrases[t] for t in tokens)

    def learn_pairs(self, data: bytes, count: int, max_phrase_len: int = 96) -> int:
        tokens = self.tokenize(data)
        pair_counts = collections.Counter(zip(tokens, tokens[1:]))
        added = 0
        for (left, right), freq in pair_counts.most_common():
            if freq < 2:
                break
            if self.add_pair(left, right, max_phrase_len=max_phrase_len) is not None:
                added += 1
                if added >= count:
                    break
        return added


def pack_tokens(tokens: list[int]) -> bytes:
    a = array("H", tokens)
    if a.itemsize != 2:
        raise AssertionError("unexpected u16 item size")
    import sys
    if sys.byteorder != "little":
        a.byteswap()
    return a.tobytes()


def unpack_tokens(raw: bytes) -> list[int]:
    if len(raw) % 2:
        raise ValueError("odd token payload")
    a = array("H")
    a.frombytes(raw)
    import sys
    if sys.byteorder != "little":
        a.byteswap()
    return a.tolist()


def encode_frame(data: bytes, catalog: GlyphCatalog, level: int) -> tuple[bytes, int]:
    tokens = catalog.tokenize(data)
    packed = pack_tokens(tokens)
    comp = zstd_compress(packed, level)
    frame = struct.pack("<QQ", len(data), len(tokens)) + comp
    return frame, len(tokens)


def decode_frame(frame: bytes, catalog: GlyphCatalog) -> bytes:
    raw_len, token_count = struct.unpack_from("<QQ", frame, 0)
    packed = zstd_decompress(frame[16:])
    tokens = unpack_tokens(packed)
    if len(tokens) != token_count:
        raise ValueError("token count mismatch")
    data = catalog.detokenize(tokens)
    if len(data) != raw_len:
        raise ValueError("raw length mismatch")
    return data


def same_read_mint(data: bytes, merges: int, zstd_level: int, max_phrase_len: int) -> dict[str, object]:
    catalog = GlyphCatalog()
    t0 = time.perf_counter()
    added = catalog.learn_pairs(data, merges, max_phrase_len)
    train_s = time.perf_counter() - t0
    t0 = time.perf_counter()
    frame, tokens = encode_frame(data, catalog, zstd_level)
    enc_s = time.perf_counter() - t0
    t0 = time.perf_counter()
    restored = decode_frame(frame, GlyphCatalog.deserialize(catalog.serialize()))
    dec_s = time.perf_counter() - t0
    if restored != data:
        raise AssertionError("same-read mint restore failed")
    total = catalog.serialized_bytes + len(frame)
    return {
        "new_glyphs": added,
        "vocab_size": catalog.vocab_size,
        "catalog_bytes": catalog.serialized_bytes,
        "frame_bytes": len(frame),
        "total_bytes": total,
        "bpc": total * 8 / len(data),
        "token_count": tokens,
        "raw_bytes": len(data),
        "restore_match": True,
        "train_s": train_s,
        "enc_s": enc_s,
        "dec_s": dec_s,
        "schema": "monotonic_pair_glyphs_u16+zstd_v2",
    }


def prior_curve(path: Path, reads: int, chunk_bytes: int, merges_per_read: int, zstd_level: int, max_phrase_len: int) -> list[dict[str, object]]:
    catalog = GlyphCatalog()
    cumulative_frames = 0
    cumulative_raw = 0
    rows: list[dict[str, object]] = []
    with path.open("rb") as f:
        for read in range(1, reads + 1):
            data = f.read(chunk_bytes)
            if len(data) != chunk_bytes:
                raise ValueError(f"read {read}: expected {chunk_bytes}, got {len(data)}")
            catalog_before = catalog.serialized_bytes
            catalog_snapshot = catalog.serialize()
            t0 = time.perf_counter()
            frame, tokens = encode_frame(data, catalog, zstd_level)
            enc_s = time.perf_counter() - t0
            t0 = time.perf_counter()
            restored = decode_frame(frame, GlyphCatalog.deserialize(catalog_snapshot))
            dec_s = time.perf_counter() - t0
            if hashlib.sha256(restored).digest() != hashlib.sha256(data).digest():
                raise AssertionError(f"read {read}: restore failed")
            t0 = time.perf_counter()
            added = catalog.learn_pairs(data, merges_per_read, max_phrase_len)
            learn_s = time.perf_counter() - t0
            catalog_after = catalog.serialized_bytes
            delta = catalog_after - catalog_before
            cumulative_frames += len(frame)
            cumulative_raw += len(data)
            persistent_incremental = len(frame) + delta
            standalone_total = len(frame) + catalog_after
            cumulative_total = cumulative_frames + catalog_after
            raw_zstd = zstd_compress(data, zstd_level)
            row = {
                "read": read,
                "raw_bytes": len(data),
                "vocab_before": 256 + (catalog_before - HEADER_BYTES) // 4,
                "vocab_after": catalog.vocab_size,
                "new_glyphs": added,
                "catalog_delta_bytes": delta,
                "catalog_total_bytes": catalog_after,
                "token_count": tokens,
                "frame_bytes": len(frame),
                "persistent_incremental_bpc": persistent_incremental * 8 / len(data),
                "standalone_bpc": standalone_total * 8 / len(data),
                "cumulative_system_bpc": cumulative_total * 8 / cumulative_raw,
                "raw_zstd19_bpc": len(raw_zstd) * 8 / len(data),
                "restore_match": True,
                "sha256": hashlib.sha256(data).hexdigest(),
                "enc_s": enc_s,
                "dec_s": dec_s,
                "learn_s": learn_s,
                "catalog_mode": "append_only_pair_rules",
                "read_mode": "held_out_then_learn",
            }
            rows.append(row)
            print("MINTROW|" + "|".join(f"{k}={v}" for k, v in row.items()) + "|json=0", flush=True)
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=Path)
    ap.add_argument("--reads", type=int, default=20)
    ap.add_argument("--chunk-bytes", type=int, default=1_000_000)
    ap.add_argument("--same-read-merges", type=int, default=512)
    ap.add_argument("--merges-per-read", type=int, default=256)
    ap.add_argument("--zstd-level", type=int, default=19)
    ap.add_argument("--max-phrase-len", type=int, default=96)
    ap.add_argument("--json", type=Path)
    args = ap.parse_args()
    first = args.path.read_bytes()[: args.chunk_bytes]
    same = same_read_mint(first, args.same_read_merges, args.zstd_level, args.max_phrase_len)
    print("MINTSAME|" + "|".join(f"{k}={v}" for k, v in same.items()) + "|json=0")
    rows = prior_curve(args.path, args.reads, args.chunk_bytes, args.merges_per_read, args.zstd_level, args.max_phrase_len)
    out = {"same_read": same, "prior_curve": rows}
    if args.json:
        args.json.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"MINTVERDICT|reads={len(rows)}|first_persistent_bpc={rows[0]['persistent_incremental_bpc']:.6f}|last_persistent_bpc={rows[-1]['persistent_incremental_bpc']:.6f}|best_persistent_bpc={min(r['persistent_incremental_bpc'] for r in rows):.6f}|all_restore=1|json=0")


if __name__ == "__main__":
    main()
