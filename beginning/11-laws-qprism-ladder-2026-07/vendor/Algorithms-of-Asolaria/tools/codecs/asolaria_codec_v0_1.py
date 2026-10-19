#!/usr/bin/env python3
# ASOLARIA CODEC v0.1 — adaptive order-2 context model + Subbotin carryless range coder.
# History: v0 used a naive lo/hi coder WITHOUT carry handling. It reported an
# impossible 0.156 bpc and its decoder crashed: information was silently destroyed
# during encoding. The restore gate (byte-identical sha check) convicted it.
# v0.1 replaces the coder with a correct carryless range coder; every claim below
# is only valid because decompress() reproduces the input byte-identically.
# Usage: python3 asolaria_codec_v0_1.py <corpus_file> <n_bytes>
import hashlib, sys, time
import numpy as np

TOP = 1 << 24
BOT = 1 << 16
MASK = 0xFFFFFFFF

def make_model():
    # order-2 byte context (65536 contexts) x 256 symbols, Laplace-initialized
    return np.ones((65536, 256), dtype=np.uint32)

def compress(d):
    freq = make_model()
    low, rng = 0, MASK
    out = bytearray(); ctx = 0
    for byte in d:
        f = freq[ctx]
        tot = int(f.sum()); c = int(f[:byte].sum()); fr = int(f[byte])
        r = rng // tot
        low = (low + c * r) & MASK
        rng = fr * r
        while True:
            if (low ^ (low + rng)) & MASK < TOP:
                pass
            elif rng < BOT:
                rng = (-low) & (BOT - 1)
            else:
                break
            out.append((low >> 24) & 0xFF)
            low = (low << 8) & MASK; rng = (rng << 8) & MASK
        f[byte] += 32
        if tot > 60000:
            freq[ctx] = (f >> 1) | 1
        ctx = ((ctx << 8) | byte) & 0xFFFF
    for _ in range(4):
        out.append((low >> 24) & 0xFF); low = (low << 8) & MASK
    return bytes(out)

def decompress(comp, n):
    freq = make_model()
    low, rng = 0, MASK
    code = int.from_bytes(comp[:4], "big"); pos = 4
    out = bytearray(); ctx = 0
    for _ in range(n):
        f = freq[ctx]
        tot = int(f.sum())
        r = rng // tot
        target = min(((code - low) & MASK) // r, tot - 1)
        cum = np.cumsum(f)
        byte = int(np.searchsorted(cum, target, side="right"))
        c = int(cum[byte - 1]) if byte > 0 else 0
        fr = int(f[byte])
        low = (low + c * r) & MASK
        rng = fr * r
        while True:
            if (low ^ (low + rng)) & MASK < TOP:
                pass
            elif rng < BOT:
                rng = (-low) & (BOT - 1)
            else:
                break
            code = ((code << 8) | (comp[pos] if pos < len(comp) else 0)) & MASK
            pos += 1
            low = (low << 8) & MASK; rng = (rng << 8) & MASK
        f[byte] += 32
        if tot > 60000:
            freq[ctx] = (f >> 1) | 1
        out.append(byte)
        ctx = ((ctx << 8) | byte) & 0xFFFF
    return bytes(out)

if __name__ == "__main__":
    path, n = sys.argv[1], int(sys.argv[2])
    data = open(path, "rb").read(n)
    sha_in = hashlib.sha256(data).hexdigest()
    t0 = time.time(); comp = compress(data); t_c = time.time() - t0
    t0 = time.time(); rest = decompress(comp, n); t_d = time.time() - t0
    sha_out = hashlib.sha256(rest).hexdigest()
    open("asolaria_v0_1_output.bin", "wb").write(comp)
    print(f"input_bytes={n} sha256_in={sha_in}")
    print(f"compressed_bytes={len(comp)} sha256_comp={hashlib.sha256(comp).hexdigest()}")
    print(f"bpc={len(comp)*8/n:.3f} ratio={n/len(comp):.2f} enc_s={t_c:.1f} dec_s={t_d:.1f}")
    print("RESTORE=" + ("BYTE_IDENTICAL_0_LOSS" if sha_out == sha_in else "FAILED"))
