#!/usr/bin/env python3
"""Exact multi-level BPE mint plus zstd tail experiment.

Each level trains BPE merge rules on the current token language. The destination
level is quanted again. Catalogs and framing are counted. Final tokens are packed
as uint16 and losslessly entropy-coded with zstd. Reverse traversal expands every
level and must reproduce the original bytes SHA-exact.
"""
from __future__ import annotations
import argparse, collections, hashlib, heapq, json, struct, time
from dataclasses import dataclass
from pathlib import Path
import zstandard as zstd

@dataclass
class Level:
    start_id: int
    rules: list[tuple[int, int]]
    tokens: list[int]
    train_s: float

class BPETrainer:
    def __init__(self, tokens: list[int]):
        n = len(tokens)
        self.val = list(tokens)
        self.prev = [i - 1 for i in range(n)]
        self.nxt = [i + 1 for i in range(n)]
        if n:
            self.nxt[-1] = -1
        self.alive = [True] * n
        self.occ = collections.defaultdict(set)
        self.heap = []
        for i in range(max(0, n - 1)):
            self.occ[(self.val[i], self.val[i + 1])].add(i)
        for pair, positions in self.occ.items():
            if len(positions) >= 2:
                heapq.heappush(self.heap, (-len(positions), pair))

    def pair_at(self, i):
        if i < 0 or i >= len(self.val) or not self.alive[i]:
            return None
        j = self.nxt[i]
        if j < 0 or not self.alive[j]:
            return None
        return self.val[i], self.val[j]

    def train(self, merges: int, start_id: int):
        rules = []
        next_id = start_id
        for _ in range(merges):
            while self.heap:
                neg, pair = heapq.heappop(self.heap)
                positions = self.occ.get(pair)
                if positions is not None and len(positions) >= 2 and -neg == len(positions):
                    break
            else:
                break
            selected = sorted(positions)
            touched = set()
            actual = 0

            def remove_at(i):
                p = self.pair_at(i)
                if p is not None and i in self.occ[p]:
                    self.occ[p].remove(i)
                    touched.add(p)

            def add_at(i):
                p = self.pair_at(i)
                if p is not None:
                    self.occ[p].add(i)
                    touched.add(p)

            for i in selected:
                if self.pair_at(i) != pair:
                    self.occ[pair].discard(i)
                    touched.add(pair)
                    continue
                j = self.nxt[i]
                left = self.prev[i]
                right = self.nxt[j]
                remove_at(left)
                remove_at(i)
                remove_at(j)
                self.val[i] = next_id
                self.nxt[i] = right
                if right >= 0:
                    self.prev[right] = i
                self.alive[j] = False
                self.prev[j] = self.nxt[j] = -2
                add_at(left)
                add_at(i)
                actual += 1
            if not actual:
                continue
            rules.append(pair)
            next_id += 1
            for p in touched:
                count = len(self.occ[p])
                if count >= 2:
                    heapq.heappush(self.heap, (-count, p))
        return rules

    def output(self):
        if not self.val:
            return []
        out = []
        i = 0
        while i >= 0:
            if not self.alive[i]:
                raise AssertionError("broken BPE linked list")
            out.append(self.val[i])
            i = self.nxt[i]
        return out

def train_level(tokens, merges):
    start_id = max(tokens, default=-1) + 1
    t0 = time.perf_counter()
    trainer = BPETrainer(tokens)
    rules = trainer.train(merges, start_id)
    return Level(start_id, rules, trainer.output(), time.perf_counter() - t0)

def expand_level(tokens, level):
    out = []
    stack = list(reversed(tokens))
    limit = level.start_id + len(level.rules)
    while stack:
        token = stack.pop()
        if level.start_id <= token < limit:
            left, right = level.rules[token - level.start_id]
            stack.append(right)
            stack.append(left)
        else:
            out.append(token)
    return out

def serialize_catalog(levels, orig_len):
    out = bytearray(b"ABPE1")
    out.extend(struct.pack(">QB", orig_len, len(levels)))
    for level in levels:
        out.extend(struct.pack(">IH", level.start_id, len(level.rules)))
        for left, right in level.rules:
            if left > 65535 or right > 65535:
                raise ValueError("uint16 catalog exhausted")
            out.extend(struct.pack(">HH", left, right))
    return bytes(out)

def encode(data, level_count, merges, zstd_level=19):
    tokens = list(data)
    levels = []
    trace = []
    for level_no in range(level_count):
        input_tokens = len(tokens)
        level = train_level(tokens, merges)
        levels.append(level)
        tokens = level.tokens
        trace.append({
            "level": level_no + 1,
            "input_tokens": input_tokens,
            "output_tokens": len(tokens),
            "rules": len(level.rules),
            "train_s": level.train_s,
            "max_token": max(tokens, default=0),
        })
    packed = struct.pack(">" + ("H" * len(tokens)), *tokens) if tokens else b""
    payload = zstd.ZstdCompressor(level=zstd_level).compress(packed)
    return serialize_catalog(levels, len(data)), payload, levels, tokens, trace

def decode(catalog, payload, levels, token_count, orig_len):
    raw = zstd.ZstdDecompressor().decompress(payload, max_output_size=token_count * 2)
    if len(raw) != token_count * 2:
        raise ValueError("token payload length mismatch")
    tokens = list(struct.unpack(">" + ("H" * token_count), raw)) if token_count else []
    for level in reversed(levels):
        tokens = expand_level(tokens, level)
    if any(token > 255 for token in tokens):
        raise ValueError("non-byte token after reverse traversal")
    restored = bytes(tokens)
    if len(restored) != orig_len:
        raise ValueError("restored length mismatch")
    return restored

def run(path, n_bytes, max_levels, merges, output=None):
    data = Path(path).read_bytes()[:n_bytes]
    sha = hashlib.sha256(data).hexdigest()
    raw_zstd = len(zstd.ZstdCompressor(level=19).compress(data))
    rows = []
    for level_count in range(1, max_levels + 1):
        t0 = time.perf_counter()
        catalog, payload, levels, tokens, trace = encode(data, level_count, merges)
        enc_s = time.perf_counter() - t0
        t0 = time.perf_counter()
        restored = decode(catalog, payload, levels, len(tokens), len(data))
        dec_s = time.perf_counter() - t0
        if restored != data:
            raise AssertionError("multi-level restore mismatch")
        total = len(catalog) + len(payload)
        row = {
            "levels": level_count,
            "raw_bytes": len(data),
            "merges_per_level": merges,
            "catalog_bytes": len(catalog),
            "token_count": len(tokens),
            "packed_token_bytes": len(tokens) * 2,
            "payload_bytes": len(payload),
            "total_bytes": total,
            "bpc": total * 8 / len(data),
            "payload_bpc": len(payload) * 8 / len(data),
            "raw_zstd19_bytes": raw_zstd,
            "raw_zstd19_bpc": raw_zstd * 8 / len(data),
            "delta_vs_raw_zstd_pct": (total / raw_zstd - 1) * 100,
            "sha256": sha,
            "restore": True,
            "enc_s": enc_s,
            "dec_s": dec_s,
            "trace": trace,
        }
        rows.append(row)
        print("MULTILEVELBPE|" + "|".join(
            f"{k}={v:.6f}" if isinstance(v, float) else f"{k}={v}"
            for k, v in row.items() if k != "trace"
        ) + "|json=0", flush=True)
    if output:
        Path(output).write_text(json.dumps(rows, indent=2), encoding="utf-8")

def selftest():
    path = Path("/tmp/multilevel-bpe-selftest.bin")
    unit = b"<page><title>Asolaria</title><text>quant glyph cube watcher persistent prior </text></page>\n"
    path.write_bytes((unit * 2000)[:100000])
    run(path, 100000, 2, 64)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path", nargs="?")
    parser.add_argument("--bytes", type=int, default=1_000_000)
    parser.add_argument("--levels", type=int, default=2)
    parser.add_argument("--merges", type=int, default=512)
    parser.add_argument("--output")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    if args.selftest or not args.path:
        selftest()
    if args.path:
        run(args.path, args.bytes, args.levels, args.merges, args.output)

if __name__ == "__main__":
    main()
