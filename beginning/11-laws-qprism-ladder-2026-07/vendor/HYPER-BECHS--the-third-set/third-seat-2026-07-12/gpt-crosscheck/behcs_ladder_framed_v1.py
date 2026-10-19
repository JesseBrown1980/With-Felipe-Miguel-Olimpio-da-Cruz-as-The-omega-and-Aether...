#!/usr/bin/env python3
"""Arbitrary-length BEHCS-1024 5-byte <-> 4-glyph round trip.

The supplied third-seat script is exact for lengths divisible by five. This version
preserves orig_len and zero-pads only the final partial 5-byte word, giving every
byte length a deterministic inverse.
"""
from __future__ import annotations
import argparse, hashlib, random
from dataclasses import dataclass
import numpy as np

@dataclass(frozen=True)
class FramedGlyphs:
    orig_len: int
    glyphs: np.ndarray

def encode(raw: bytes) -> FramedGlyphs:
    orig_len=len(raw); padded=raw+(b"\x00"*((-orig_len)%5))
    if not padded: return FramedGlyphs(0,np.empty(0,dtype=np.uint16))
    a=np.frombuffer(padded,dtype=np.uint8).reshape(-1,5).astype(np.uint64)
    v=(a[:,0]<<32)|(a[:,1]<<24)|(a[:,2]<<16)|(a[:,3]<<8)|a[:,4]
    g=np.empty((len(v),4),dtype=np.uint16)
    g[:,0]=(v>>30)&0x3FF;g[:,1]=(v>>20)&0x3FF;g[:,2]=(v>>10)&0x3FF;g[:,3]=v&0x3FF
    return FramedGlyphs(orig_len,g.reshape(-1))

def decode(frame: FramedGlyphs) -> bytes:
    g=np.asarray(frame.glyphs,dtype=np.uint16)
    if g.size%4: raise ValueError("glyph count must be divisible by four")
    if np.any(g>1023): raise ValueError("glyph outside BEHCS-1024")
    if not g.size:
        if frame.orig_len: raise ValueError("nonzero length with empty glyph stream")
        return b""
    gv=g.reshape(-1,4).astype(np.uint64)
    v=(gv[:,0]<<30)|(gv[:,1]<<20)|(gv[:,2]<<10)|gv[:,3]
    b=np.empty((len(v),5),dtype=np.uint8)
    b[:,0]=(v>>32)&0xFF;b[:,1]=(v>>24)&0xFF;b[:,2]=(v>>16)&0xFF;b[:,3]=(v>>8)&0xFF;b[:,4]=v&0xFF
    raw=b.tobytes()
    if frame.orig_len>len(raw): raise ValueError("orig_len exceeds padded bytes")
    return raw[:frame.orig_len]

def property_test(cases=250,max_len=8192,seed=20260713):
    rng=random.Random(seed)
    lengths=list(range(17))+[31,32,33,63,64,65,999,1000,1001]+[rng.randrange(max_len+1) for _ in range(cases)]
    for n in lengths:
        raw=bytes(rng.randrange(256) for _ in range(n))
        if decode(encode(raw))!=raw: raise AssertionError(f"round trip failed at {n}")
    print(f"BEHCS_FRAMED_PROPERTY|cases={len(lengths)}|max_len={max(lengths)}|status=PASS|json=0")

def main():
    p=argparse.ArgumentParser();p.add_argument("path",nargs="?");p.add_argument("--property",action="store_true");a=p.parse_args()
    if a.property or not a.path: property_test()
    if a.path:
        raw=open(a.path,"rb").read();frame=encode(raw);rest=decode(frame)
        h1=hashlib.sha256(raw).hexdigest();h2=hashlib.sha256(rest).hexdigest()
        print(f"BEHCS_FRAMED|bytes={len(raw)}|glyphs={frame.glyphs.size}|orig_len={frame.orig_len}|sha_in={h1}|sha_out={h2}|match={int(raw==rest)}|json=0")
        if raw!=rest: raise SystemExit(1)
if __name__=="__main__":main()
