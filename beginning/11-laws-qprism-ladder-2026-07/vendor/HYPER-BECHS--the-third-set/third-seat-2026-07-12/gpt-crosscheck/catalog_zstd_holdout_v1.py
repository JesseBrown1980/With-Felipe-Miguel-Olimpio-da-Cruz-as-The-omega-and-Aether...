#!/usr/bin/env python3
"""Held-out learned-catalog control using zstd dictionaries.

The holdout chunk is fixed and never participates in dictionary training. For each
training depth, a dictionary is trained only on preceding chunks, then the same
holdout is compressed/decompressed and SHA-verified. Dictionary bytes are counted.
"""
from __future__ import annotations
import argparse,bz2,gzip,hashlib,json,lzma,time
from pathlib import Path
import zstandard as zstd

def samples_from(chunks,block=8192,max_samples=4096):
    out=[]
    for ch in chunks:
        for o in range(0,len(ch),block):
            s=ch[o:o+block]
            if len(s)>=64:out.append(s)
            if len(out)>=max_samples:return out
    return out

def compress_verify(data,dict_bytes=None,level=19):
    dd=zstd.ZstdCompressionDict(dict_bytes) if dict_bytes else None
    cctx=zstd.ZstdCompressor(level=level,dict_data=dd);dctx=zstd.ZstdDecompressor(dict_data=dd)
    t=time.perf_counter();comp=cctx.compress(data);enc=time.perf_counter()-t
    t=time.perf_counter();rest=dctx.decompress(comp,max_output_size=len(data));dec=time.perf_counter()-t
    if rest!=data:raise AssertionError('zstd restore mismatch')
    return comp,enc,dec

def run(path,chunk_bytes,holdout_index,train_points,dict_max,output):
    with Path(path).open('rb') as f:chunks=[f.read(chunk_bytes) for _ in range(holdout_index+1)]
    if any(len(x)!=chunk_bytes for x in chunks):raise EOFError('corpus too short')
    hold=chunks[holdout_index];sha=hashlib.sha256(hold).hexdigest();base,_,_=compress_verify(hold)
    rows=[]
    for k in train_points:
        if not 1<=k<=holdout_index:continue
        target=min(dict_max,max(2048,1024*k));samples=samples_from(chunks[:k])
        t=time.perf_counter();zd=zstd.train_dictionary(target,samples);train_s=time.perf_counter()-t
        db=zd.as_bytes();comp,enc,dec=compress_verify(hold,db)
        row={'train_reads':k,'holdout_read':holdout_index+1,'raw_bytes':len(hold),'dict_bytes':len(db),'compressed_bytes':len(comp),'payload_bpc':len(comp)*8/len(hold),'standalone_bpc':(len(comp)+len(db))*8/len(hold),'baseline_zstd19_bytes':len(base),'baseline_zstd19_bpc':len(base)*8/len(hold),'delta_vs_baseline_pct':(len(comp)/len(base)-1)*100,'train_s':train_s,'enc_s':enc,'dec_s':dec,'sha256':sha,'restore':True}
        rows.append(row);print('CATALOGHOLDOUT|'+'|'.join(f'{a}={b:.6f}' if isinstance(b,float) else f'{a}={b}' for a,b in row.items())+'|json=0',flush=True)
    for name,comp in {'gzip9':gzip.compress(hold,compresslevel=9),'bz2_9':bz2.compress(hold,compresslevel=9),'xz_6':lzma.compress(hold,preset=6)}.items():print(f'BASELINE|name={name}|bytes={len(comp)}|bpc={len(comp)*8/len(hold):.6f}|sha256={sha}|json=0')
    if output:Path(output).write_text(json.dumps(rows,indent=2),encoding='utf-8')

def selftest():
    p=Path('/tmp/catalog-zstd-selftest.bin');chunks=[(f'<page>{i%3}: Asolaria quant glyph cube persistent catalog watcher </page>\n'.encode()*3000)[:100000] for i in range(8)];p.write_bytes(b''.join(chunks));run(p,100000,7,[1,2,4,7],8192,None)

def main():
    a=argparse.ArgumentParser();a.add_argument('path',nargs='?');a.add_argument('--chunk-bytes',type=int,default=1_000_000);a.add_argument('--holdout-index',type=int,default=19);a.add_argument('--train-points',default='1,2,4,8,12,16,19');a.add_argument('--dict-max',type=int,default=20480);a.add_argument('--output');a.add_argument('--selftest',action='store_true');x=a.parse_args()
    if x.selftest or not x.path:selftest()
    if x.path:run(x.path,x.chunk_bytes,x.holdout_index,[int(v) for v in x.train_points.split(',') if v],x.dict_max,x.output)
if __name__=='__main__':main()
