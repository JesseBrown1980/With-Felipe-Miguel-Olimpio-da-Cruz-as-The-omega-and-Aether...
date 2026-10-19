#!/usr/bin/env python3
"""Persistent adaptive order-2 range-coder curve with per-read restore gates.

This independently extends the supplied codec v0.1. The 65,536x256 prior table
persists across reads. Every read is encoded with state learned only from earlier
reads, decoded from a cloned pre-read state, SHA-verified, and the resulting encoder
and decoder states are required to match. Checkpoint cost is reported separately.
"""
from __future__ import annotations
import argparse,hashlib,json,time,zlib
from pathlib import Path
import numpy as np
TOP=1<<24;BOT=1<<16;MASK=0xFFFFFFFF

def make_model(): return np.ones((65536,256),dtype=np.uint32)

def compress_with_model(d,freq,ctx=0):
    low,rng=0,MASK;out=bytearray()
    for byte in d:
        f=freq[ctx];tot=int(f.sum());c=int(f[:byte].sum());fr=int(f[byte]);r=rng//tot
        if not r: raise ArithmeticError("range underflow")
        low=(low+c*r)&MASK;rng=fr*r
        while True:
            if ((low^(low+rng))&MASK)<TOP: pass
            elif rng<BOT: rng=(-low)&(BOT-1)
            else: break
            out.append((low>>24)&0xFF);low=(low<<8)&MASK;rng=(rng<<8)&MASK
        f[byte]+=32
        if tot>60000:freq[ctx]=(f>>1)|1
        ctx=((ctx<<8)|byte)&0xFFFF
    for _ in range(4):out.append((low>>24)&0xFF);low=(low<<8)&MASK
    return bytes(out),ctx

def decompress_with_model(comp,n,freq,ctx=0):
    low,rng=0,MASK;code=int.from_bytes(comp[:4],"big");pos=4;out=bytearray()
    for _ in range(n):
        f=freq[ctx];tot=int(f.sum());r=rng//tot
        if not r: raise ArithmeticError("range underflow")
        target=min(((code-low)&MASK)//r,tot-1);cum=np.cumsum(f)
        byte=int(np.searchsorted(cum,target,side="right"));c=int(cum[byte-1]) if byte else 0;fr=int(f[byte])
        low=(low+c*r)&MASK;rng=fr*r
        while True:
            if ((low^(low+rng))&MASK)<TOP: pass
            elif rng<BOT:rng=(-low)&(BOT-1)
            else:break
            code=((code<<8)|(comp[pos] if pos<len(comp) else 0))&MASK;pos+=1
            low=(low<<8)&MASK;rng=(rng<<8)&MASK
        f[byte]+=32
        if tot>60000:freq[ctx]=(f>>1)|1
        out.append(byte);ctx=((ctx<<8)|byte)&0xFFFF
    return bytes(out),ctx

def sparse_estimate(freq):
    n=int(np.count_nonzero(freq!=1));return n,32+n*7

def run(path,chunk_bytes,reads,offset,carry_context,checkpoint_every,output):
    enc_model=make_model();enc_ctx=0;rows=[];cumulative=0
    with Path(path).open('rb') as f:
        f.seek(offset)
        for idx in range(1,reads+1):
            data=f.read(chunk_bytes)
            if len(data)!=chunk_bytes:raise EOFError(f"read {idx}: got {len(data)}")
            pre=enc_model.copy();pre_ctx=enc_ctx if carry_context else 0;dec_model=pre.copy()
            sha=hashlib.sha256(data).hexdigest()
            t=time.perf_counter();comp,new_enc_ctx=compress_with_model(data,enc_model,pre_ctx);enc_s=time.perf_counter()-t
            t=time.perf_counter();rest,new_dec_ctx=decompress_with_model(comp,len(data),dec_model,pre_ctx);dec_s=time.perf_counter()-t
            restore=rest==data and hashlib.sha256(rest).hexdigest()==sha
            state_match=np.array_equal(enc_model,dec_model) and new_enc_ctx==new_dec_ctx
            if not (restore and state_match):raise AssertionError(f"read {idx}: restore/state mismatch")
            enc_ctx=new_enc_ctx if carry_context else 0;cumulative+=len(comp)
            nondefault,sparse=sparse_estimate(enc_model)
            zcp=None
            if checkpoint_every and (idx%checkpoint_every==0 or idx==reads):zcp=len(zlib.compress(enc_model.tobytes(),9))
            row={'read':idx,'offset':offset+(idx-1)*chunk_bytes,'raw_bytes':len(data),'compressed_bytes':len(comp),'bpc':len(comp)*8/len(data),'ratio':len(data)/len(comp),'sha256':sha,'restore':True,'state_match':True,'enc_s':enc_s,'dec_s':dec_s,'model_nondefault_cells':nondefault,'model_dense_bytes':enc_model.nbytes,'model_sparse_est_bytes':sparse,'model_zlib_checkpoint_bytes':zcp,'cumulative_payload_bpc':cumulative*8/(idx*chunk_bytes)}
            rows.append(row)
            print('PRIORREAD|'+'|'.join(f'{k}={v:.6f}' if isinstance(v,float) else f'{k}={v}' for k,v in row.items())+'|json=0',flush=True)
    if output:Path(output).write_text(json.dumps(rows,indent=2),encoding='utf-8')
    print(f"PRIORCURVE|reads={reads}|first_bpc={rows[0]['bpc']:.6f}|last_bpc={rows[-1]['bpc']:.6f}|change_pct={(rows[-1]['bpc']/rows[0]['bpc']-1)*100:.3f}|all_restore=1|all_state_match=1|carry_context={int(carry_context)}|json=0")

def selftest():
    p=Path('/tmp/persistent-order2-selftest.bin');unit=(b'<page><title>Asolaria</title><text>quant glyph cube </text></page>\n'*300);p.write_bytes(unit*4);run(p,len(unit),4,0,False,2,None)

def main():
    a=argparse.ArgumentParser();a.add_argument('path',nargs='?');a.add_argument('--chunk-bytes',type=int,default=1_000_000);a.add_argument('--reads',type=int,default=20);a.add_argument('--offset',type=int,default=0);a.add_argument('--carry-context',action='store_true');a.add_argument('--checkpoint-every',type=int,default=5);a.add_argument('--output');a.add_argument('--selftest',action='store_true');x=a.parse_args()
    if x.selftest or not x.path:selftest()
    if x.path:run(x.path,x.chunk_bytes,x.reads,x.offset,x.carry_context,x.checkpoint_every,x.output)
if __name__=='__main__':main()
