#!/usr/bin/env python3
# BEHCS-1024 ladder round trip: 5 bytes (40 bits) <-> 4 glyphs of 10 bits.
# Bijective rebase, information rate exactly 1.0. Zero-loss test on a corpus.
# Usage: python3 behcs_ladder_roundtrip.py <corpus_file>
import hashlib, sys, time
import numpy as np

CHUNK = 100_000_000  # bytes per chunk; must be divisible by 5

def main(path):
    h_black, h_white = hashlib.sha256(), hashlib.sha256()
    t_enc = t_dec = 0.0
    total = glyphs = 0
    with open(path, "rb") as f:
        while True:
            raw = f.read(CHUNK)
            if not raw:
                break
            assert len(raw) % 5 == 0, "corpus length must be divisible by 5"
            total += len(raw)
            h_black.update(raw)

            # BLACK -> GLYPHS (encode): 5 bytes -> one 40-bit word -> 4 x 10-bit glyphs
            t0 = time.time()
            a = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 5).astype(np.uint64)
            v = (a[:,0]<<32)|(a[:,1]<<24)|(a[:,2]<<16)|(a[:,3]<<8)|a[:,4]
            g = np.empty((len(v), 4), dtype=np.uint16)
            g[:,0]=(v>>30)&0x3FF; g[:,1]=(v>>20)&0x3FF
            g[:,2]=(v>>10)&0x3FF; g[:,3]=v&0x3FF
            t_enc += time.time() - t0
            glyphs += g.size

            # GLYPHS -> WHITE (decode): exact inverse
            t0 = time.time()
            gv = g.astype(np.uint64)
            v2 = (gv[:,0]<<30)|(gv[:,1]<<20)|(gv[:,2]<<10)|gv[:,3]
            b = np.empty((len(v2), 5), dtype=np.uint8)
            b[:,0]=(v2>>32)&0xFF; b[:,1]=(v2>>24)&0xFF; b[:,2]=(v2>>16)&0xFF
            b[:,3]=(v2>>8)&0xFF;  b[:,4]=v2&0xFF
            t_dec += time.time() - t0
            h_white.update(b.tobytes())

    sb, sw = h_black.hexdigest(), h_white.hexdigest()
    print(f"corpus={path} bytes={total} glyphs={glyphs}")
    print(f"sha256_black={sb}")
    print(f"sha256_white={sw}")
    print(f"encode_s={t_enc:.1f} decode_s={t_dec:.1f} info_rate={glyphs*10/8/total:.6f}")
    print("READBACK=" + ("VERIFIED_CLONE_0_LOSS" if sb == sw else "HELD"))

if __name__ == "__main__":
    main(sys.argv[1])
