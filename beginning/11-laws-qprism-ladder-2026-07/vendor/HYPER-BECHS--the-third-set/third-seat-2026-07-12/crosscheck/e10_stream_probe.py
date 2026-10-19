#!/usr/bin/env python3
"""Ten-pass 10^10-byte cumulative BEHCS exactness probe over enwik9.

Each pass XORs the one-billion-byte source with a deterministic pass key and
round-trips each chunk through the BEHCS-1024 5-byte/4-glyph mapping. The claim
is cumulative bytes processed, not materialization of a separate 10 GB corpus.
"""
from __future__ import annotations
import argparse, hashlib, json, time
from pathlib import Path
import numpy as np
from behcs_ladder_v2 import encode_decode_block


def run(path: Path, passes: int = 10, chunk_bytes: int = 20_000_000) -> dict[str, object]:
    size = path.stat().st_size
    if size != 1_000_000_000:
        raise ValueError(f"expected 1,000,000,000 bytes, got {size}")
    if chunk_bytes % 5:
        raise ValueError("chunk_bytes must be divisible by 5")
    rows=[]; total=0; t0=time.perf_counter()
    for p in range(passes):
        key=(p*37+11)&0xFF
        hb=hashlib.sha256(); hw=hashlib.sha256(); glyphs=0
        with path.open('rb') as f:
            while True:
                raw=f.read(chunk_bytes)
                if not raw: break
                a=np.frombuffer(raw,dtype=np.uint8)
                transformed=np.bitwise_xor(a,key).tobytes()
                hb.update(transformed)
                restored,g=encode_decode_block(transformed)
                hw.update(restored); glyphs+=g; total+=len(transformed)
        sb,sw=hb.hexdigest(),hw.hexdigest()
        if sb!=sw: raise AssertionError(f"pass {p}: mismatch")
        row={'pass':p,'key':key,'bytes':size,'glyphs':glyphs,'sha256':sb,'match':True}
        rows.append(row)
        print('E10PASS|'+'|'.join(f'{k}={v}' for k,v in row.items())+'|json=0',flush=True)
    result={'passes':passes,'source_bytes':size,'total_processed_bytes':total,'all_match':True,'elapsed_s':time.perf_counter()-t0,'claim':'cumulative-ten-pass-exactness-not-separate-10GB-materialization'}
    print('E10VERDICT|'+'|'.join(f'{k}={v}' for k,v in result.items())+'|json=0')
    return {'result':result,'passes_detail':rows}

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('path',type=Path); ap.add_argument('--passes',type=int,default=10); ap.add_argument('--chunk',type=int,default=20_000_000); ap.add_argument('--json',type=Path); a=ap.parse_args()
    r=run(a.path,a.passes,a.chunk)
    if a.json: a.json.write_text(json.dumps(r,indent=2)+'\n')
