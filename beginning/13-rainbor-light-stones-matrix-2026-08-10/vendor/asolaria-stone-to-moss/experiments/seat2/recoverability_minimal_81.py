#!/usr/bin/env python3
"""Seat 2: independently test minimum-bit recovery of 81-bit GF(2) CA outputs.

Software-only mathematical test; no physical host attribution, challenge, or secret.
"""
import hashlib
import json

N, FULL, T = 81, (1 << 81) - 1, 10**13
LAWS = [
    ('stress-01',(0,1)),('stress-02',(0,2)),('stress-013',(0,1,3)),
    ('stress-047',(0,4,7)),('stress-0159',(0,1,5,9)),
    ('CA150',(-1,0,1)),('CA90',(-1,1)),('CA60',(-1,0)),
    ('CA102',(0,1)),('SHIFT',(1,)),
]

def rotate(x,k):
    k %= N
    return ((x<<k)|(x>>(N-k))) & FULL if k else x

def multiply(a,b):
    out = 0
    while b:
        low=b&-b
        out ^= rotate(a, low.bit_length()-1)
        b ^= low
    return out

def power(p,e):
    out=1
    while e:
        if e & 1: out = multiply(out,p)
        p = multiply(p,p)
        e >>= 1
    return out

def rref(lines):
    a = list(lines)
    pivots = []
    for col in range(N):
        candidate=next((i for i in range(len(pivots),len(a)) if a[i]>>col&1),None)
        if candidate is None: continue
        t=len(pivots)
        a[t],a[candidate]=a[candidate],a[t]
        for j in range(len(a)):
            if j!=t and a[j]>>col&1:a[j]^=a[t]
        pivots.append(col)
    return a,pivots

def rank(lines): return len(rref(lines)[1])

def rank_k(lines):
    basis={}
    for value in lines:
        while value:
            j=value.bit_length()-1
            if j in basis:value^=basis[j]
            else:basis[j]=value;break
    return len(basis)

def analyze(name,taps,horizon):
    polynomial = 0
    for tap in taps: polynomial ^= 1 << (tap%N)
    operator = power(polynomial,horizon)
    columns = [rotate(operator,j) for j in range(N)]
    output_rows = [sum(((col>>i)&1)<<j for j,col in enumerate(columns)) for i in range(N)]
    reduced,pivots = rref(output_rows)
    frees = [j for j in range(N) if j not in pivots]
    kernel=[]
    for free in frees:
        vector=1<<free
        for k,col in enumerate(pivots):
            if reduced[k]>>free&1:vector |= 1<<col
        assert multiply(operator,vector)==0
        kernel.append(vector)
    probes=[]
    measurements=[]
    for bit in range(N):
        pattern=sum(((v>>bit)&1)<<j for j,v in enumerate(kernel))
        if rank_k(measurements+[pattern])>len(measurements):
            measurements.append(pattern)
            probes.append(bit)
        if len(probes)==len(frees):break
    assert len(probes)==len(frees)
    chosen_rows=[]
    chosen_output_bits=[]
    for i,row in enumerate(output_rows):
        if rank(chosen_rows+[row])>len(chosen_rows):
            chosen_rows.append(row)
            chosen_output_bits.append(i)
    combined=chosen_rows + [1<<i for i in probes]
    assert len(combined)==N and rank(combined)==N
    assert all(rank(combined[:len(chosen_rows)]+[1<<j for j in probes if j!=p])==N-1 for p in probes)
    a=list(combined)
    inverse_rows=[1<<i for i in range(N)]
    for bit in range(N):
        loc=next(i for i in range(bit,N) if a[i]>>bit&1)
        a[bit],a[loc]=a[loc],a[bit]
        inverse_rows[bit],inverse_rows[loc]=inverse_rows[loc],inverse_rows[bit]
        for j in range(N):
            if j!=bit and a[j]>>bit&1:
                a[j]^=a[bit]
                inverse_rows[j]^=inverse_rows[bit]
    assert a==[1<<i for i in range(N)]
    def recover(x):
        future=multiply(operator,x)
        measurement=sum(((future>>i)&1)<<k for k,i in enumerate(chosen_output_bits))
        measurement |= sum(((x>>i)&1)<<(k+len(chosen_output_bits)) for k,i in enumerate(probes))
        return sum((inverse_rows[k]&measurement).bit_count()%2<<k for k in range(N))
    trials=[0,FULL]+[1<<i for i in range(N)]
    for i in range(16):
        d=hashlib.sha256(f'seat2-recovery:{name}:{horizon}:{i}'.encode()).digest()
        trials.append(int.from_bytes(d,'big')&FULL)
    assert all(recover(x)==x for x in trials)
    if kernel:
        assert multiply(operator,kernel[0])==multiply(operator,0)
        assert recover(kernel[0])==kernel[0] and recover(0)==0
    return {
        'law':name,'taps':list(taps),'horizon':str(horizon),
        'rank':len(pivots),'lost_bits':len(frees), 'minimal_probe_bit_indices':probes,
        'input_reconstructions':len(trials),
        'full_reconstruction':True,'kernel_collision_verified':bool(kernel),
        'each_probe_necessary':True, 'recovery_without_side_information':not bool(kernel),
        'operator_hex':format(operator,'021x'),
    }

def main():
    items=[analyze(name,taps,t) for name,taps in LAWS for t in (T,T+1)]
    assert len(items)==20
    ret={
        'schema':'ASOLARIA-SEAT2-MINIMAL-SIDEINFORMATION-81-V1',
        'date':'2026-10-14',
        'evidence':'deterministic software GF2 81-site maps, not physical measurements',
        'physical_host_verified':False,'challenge_issued':False,
        'seat':'seat-2 computational follow-on (distinct session from original signer)',
        'row_count':len(items),'total_reconstructions':sum(i['input_reconstructions'] for i in items),
        'laws':items,
        'conclusion':'rank deficiency k requires at least k additional independent source bits for exact recovery; constructive bit probes attain k',
    }
    print(json.dumps(ret,indent=2,sort_keys=True))

if __name__=='__main__':main()
