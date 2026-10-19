#!/usr/bin/env python3
"""Corpus-based Asolaria eight-stage head/tail cross-check.

Builds CountSketch/Turbo/Polar/Zeta/Triple/Quadruple/histogram/prime-power
channels from raw bytes. Emits the historical Q4-3200 packet and a Q8v2 packet
containing every computed channel, scale, raw SHA and source length. Neither
packet reconstructs the raw body; raw SHA remains the identity witness.
"""
from __future__ import annotations
import argparse,hashlib,hmac,json,math,os,statistics,struct,time
from pathlib import Path
import numpy as np
D=1024

def prime_power_table():
    t=np.zeros(D,dtype=np.uint8)
    def isp(n):
        if n<2:return False
        p=2
        while p*p<=n:
            if n%p==0:return False
            p+=1
        return True
    for n in range(2,D):
        if isp(n):t[n]=1;continue
        for p in range(2,int(math.sqrt(n))+1):
            if not isp(p):continue
            m=n;k=0
            while m%p==0:m//=p;k+=1
            if m==1:t[n]=5 if k>3 else k+1;break
    return t
PPOW=prime_power_table()

def pack_nibbles(x):
    x=np.asarray(x,dtype=np.uint8)
    if len(x)%2:x=np.pad(x,(0,1))
    return (((x[0::2]&15)<<4)|(x[1::2]&15)).tobytes()

def pack_2bit(x):
    x=np.asarray(x,dtype=np.uint8);pad=(-len(x))%4
    if pad:x=np.pad(x,(0,pad))
    return (((x[0::4]&3)<<6)|((x[1::4]&3)<<4)|((x[2::4]&3)<<2)|(x[3::4]&3)).tobytes()

def build(path,chunk=4<<20):
    path=Path(path);proj=np.zeros(D,dtype=np.float64);h=hashlib.sha256();total=0;t0=time.perf_counter()
    with path.open('rb') as f:
        while True:
            raw=f.read(chunk)
            if not raw:break
            h.update(raw);arr=np.frombuffer(raw,dtype=np.uint8).astype(np.float64)
            idx=np.arange(total,total+len(arr),dtype=np.uint64);hv=(idx*np.uint64(2654435761))&np.uint64(0xffffffff)
            buckets=(hv&np.uint64(D-1)).astype(np.int64);sgn=np.where((hv&np.uint64(0x80000000))!=0,-1.0,1.0)
            proj+=np.bincount(buckets,weights=arr*sgn,minlength=D);total+=len(arr)
    raw_sha=h.digest();maxabs=max(1e-12,float(np.max(np.abs(proj))));v=proj/maxabs
    turbo=np.rint(v*127).astype(np.int8);signs=np.packbits(v<0,bitorder='little')
    a=np.abs(v);zeta=np.where(a<1e-9,15,np.minimum(15,np.floor(-np.log2(np.maximum(a,1e-300))))).astype(np.uint8)
    triple=np.where(v>.33,2,np.where(v<-.33,0,1)).astype(np.uint8);quad=np.where(v>.5,3,np.where(v>0,2,np.where(v>-.5,1,0))).astype(np.uint8)
    hist=np.bincount(((turbo.astype(np.int16)+128)&255),minlength=256).astype('<u4');vm=int(PPOW[turbo!=0].sum())
    q4=turbo.tobytes()+signs.tobytes()+zeta.tobytes()+hist.tobytes();assert len(q4)==3200
    q8=b'Q8V2'+struct.pack('>QdQ',total,maxabs,vm)+raw_sha+turbo.tobytes()+signs.tobytes()+pack_nibbles(zeta)+pack_2bit(triple)+pack_2bit(quad)+hist.tobytes()
    return {'bytes':total,'raw_sha':raw_sha.hex(),'head_s':time.perf_counter()-t0,'q4':q4,'q8':q8}

def med(fn,reps):
    xs=[]
    for _ in range(reps):t=time.perf_counter_ns();fn();xs.append(time.perf_counter_ns()-t)
    return statistics.median(xs)

def hash_file(path,chunk=8<<20):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        while b:=f.read(chunk):h.update(b)
    return h.digest()

def compare_file(path,chunk=8<<20):
    with Path(path).open('rb') as a,Path(path).open('rb') as b:
        while True:
            x=a.read(chunk);y=b.read(chunk)
            if not hmac.compare_digest(x,y):return False
            if not x:return True

def run(path,output=None):
    r=build(path);q4=r['q4'];q8=r['q8'];raw_sha_ns=med(lambda:hash_file(path),3);q4_sha_ns=med(lambda:hashlib.sha256(q4).digest(),1000);q8_sha_ns=med(lambda:hashlib.sha256(q8).digest(),1000);raw_cmp_ns=med(lambda:compare_file(path),3);q4_cmp_ns=med(lambda:hmac.compare_digest(q4,q4),10000);q8_cmp_ns=med(lambda:hmac.compare_digest(q8,q8),10000)
    row={'raw_bytes':r['bytes'],'raw_sha256':r['raw_sha'],'head_s':r['head_s'],'q4_bytes':len(q4),'q8v2_bytes':len(q8),'q4_sha256':hashlib.sha256(q4).hexdigest(),'q8v2_sha256':hashlib.sha256(q8).hexdigest(),'raw_sha_ns':raw_sha_ns,'q4_sha_ns':q4_sha_ns,'q8_sha_ns':q8_sha_ns,'raw_compare_ns':raw_cmp_ns,'q4_compare_ns':q4_cmp_ns,'q8_compare_ns':q8_cmp_ns,'q4_sha_gain':raw_sha_ns/q4_sha_ns,'q8_sha_gain':raw_sha_ns/q8_sha_ns,'q4_compare_gain':raw_cmp_ns/q4_cmp_ns,'q8_compare_gain':raw_cmp_ns/q8_cmp_ns,'q4_payload_ratio':r['bytes']/len(q4),'q8_payload_ratio':r['bytes']/len(q8),'restore_capable':False,'identity_bound_by_raw_sha':True,'fidelity_sweep':False}
    print('QUANT8CROSS|'+'|'.join(f'{k}={v:.6f}' if isinstance(v,float) else f'{k}={int(v) if isinstance(v,bool) else v}' for k,v in row.items())+'|json=0')
    if output:Path(output).write_text(json.dumps(row,indent=2),encoding='utf-8')

def selftest():
    p=Path('/tmp/q8-selftest.bin');p.write_bytes((b'Asolaria quant glyph cube watcher\n'*10000)+os.urandom(10000));run(p)

def main():
    a=argparse.ArgumentParser();a.add_argument('path',nargs='?');a.add_argument('--output');a.add_argument('--selftest',action='store_true');x=a.parse_args()
    if x.selftest or not x.path:selftest()
    if x.path:run(x.path,x.output)
if __name__=='__main__':main()
