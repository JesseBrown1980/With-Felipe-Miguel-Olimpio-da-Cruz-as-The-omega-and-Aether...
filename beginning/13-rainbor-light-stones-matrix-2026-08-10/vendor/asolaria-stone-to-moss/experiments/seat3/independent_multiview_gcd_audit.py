#!/usr/bin/env python3
"""Seat-3 mathematical peer audit of Seat-1 PR #22.

Uses carryless GF(2) polynomial arithmetic and Euclid/Bezout over
GF(2)[x]/(x^81+1), NOT Seat-1's matrix rank or reconstruction solver.
The reference public software challenge contains no secret seat salts.
"""
from __future__ import annotations
import hashlib
import json
import sys
from pathlib import Path

N=81
MOD=(1 << N) | 1
MASK=(1 << N)-1
T=10**13
HORIZONS=(1,T,T+1,T+81)
LAWS=(
    ("CA150",(0,1,80)),("CA90",(1,80)),("CA60",(0,1)),
    ("CA102",(0,80)),("TAP0",(0,1)),("TAP1",(0,2)),
    ("TAP4",(0,1,5,9)),
)
CHALLENGE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"

def degree(a:int)->int: return a.bit_length()-1
def multiply(a:int,b:int)->int:
    result=0
    while b:
        low=b&-b
        result^=a << degree(low)
        b^=low
    return result
def divmod_gf2(a:int,b:int)->tuple[int,int]:
    if not b: raise ZeroDivisionError("zero GF2 polynomial")
    q=0
    while a and degree(a)>=degree(b):
        k=degree(a)-degree(b)
        q^=1 << k
        a^=b << k
    return q,a
def mod_gf2(a:int)->int:
    return divmod_gf2(a,MOD)[1]
def gcd_gf2(a:int,b:int)->int:
    while b:
        _,r=divmod_gf2(a,b)
        a,b=b,r
    return a
def egcd_gf2(a:int,b:int)->tuple[int,int,int]:
    r0,r1=a,b
    s0,s1=1,0
    t0,t1=0,1
    while r1:
        q,r=divmod_gf2(r0,r1)
        r0,r1=r1,r
        s0,s1=s1,s0^multiply(q,s1)
        t0,t1=t1,t0^multiply(q,t1)
    assert multiply(s0,a)^multiply(t0,b)==r0
    return r0,s0,t0
def pow_mod(base:int,h:int)->int:
    z=1
    while h:
        if h&1:z=mod_gf2(multiply(z,base))
        base=mod_gf2(multiply(base,base))
        h>>=1
    return z
def images(operators:list[int],x:int)->list[int]:
    return [mod_gf2(multiply(o,x)) for o in operators]
def bezout_pair_inverse(a:int,b:int)->tuple[int,int]:
    g,s,t=egcd_gf2(a,b)
    one,u,_=egcd_gf2(g,MOD)
    assert one==1, "combined operator not invertible"
    aa=mod_gf2(multiply(u,s))
    bb=mod_gf2(multiply(u,t))
    assert mod_gf2(multiply(aa,a)^multiply(bb,b))==1
    return aa,bb
def sources(c:dict)->list[int]:
    result=[0,MASK]+[(1<<b) for b in range(N)]
    for ti in c["time"]:
        for co in c["color"]:
            for sp in c["space"]:
                for b in (0,17,40,80):
                    msg=f"ASOLARIA|SEAT1|TRIAD|V1|{c['nonce']}|{ti}|{co}|{sp}|{b}".encode("ascii")
                    result.append((int.from_bytes(hashlib.sha256(msg).digest(),"big")&MASK)^(1<<b))
    assert len(result)==191
    return result

def audit(path:str)->dict:
    raw=Path(path).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==CHALLENGE_SHA
    c=json.loads(raw)
    assert c["schema"]=="ASOLARIA-SEAT1-TRIAD-27WAVE-3HORIZON-V1"
    assert c["classification"]=="PUBLIC_SOFTWARE_CHALLENGE_NOT_PHYSICAL_HOST"
    assert c["horizons"]==[T,T+1,T+81]
    assert c["laws"]==[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]
    probes=sources(c)
    configurations=[(i,) for i in range(7)]+[(i,j) for i in range(7) for j in range(i+1,7)]
    assert len(configurations)==28
    ranks={79:0,80:0,81:0}
    exact_no_tag=0
    lossy_collisions=0
    future_no_gain=0
    sample_failures=0
    triples=[]
    for h in HORIZONS:
        ops=[pow_mod(sum(1 << k for k in taps),h) for _,taps in LAWS]
        for indices in configurations:
            ps=[ops[i] for i in indices]
            g=MOD
            for p in ps:g=gcd_gf2(g,p)
            rank=N-degree(g)
            expected=(79 if indices==(0,) else 80 if len(indices)==1 or 0 not in indices else 81)
            assert rank==expected,(h,indices,rank,expected)
            ranks[rank]+=1
            if rank==81:
                assert len(indices)==2 and indices[0]==0
                a,b=bezout_pair_inverse(*ps)
                for x in probes:
                    y,z=images(ps,x)
                    restored=mod_gf2(multiply(a,y)^multiply(b,z))
                    assert restored==x,(h,indices,x,restored)
                    exact_no_tag+=1
            else:
                quotient,rem=divmod_gf2(MOD,g)
                assert rem==0
                witness=quotient
                assert witness not in (0,)
                assert all(mod_gf2(multiply(p,witness))==0 for p in ps)
                for x in probes:
                    assert images(ps,x)==images(ps,x^witness)
                    assert x!=(x^witness)
                    lossy_collisions+=1
            triples.append((str(h),"+".join(LAWS[i][0] for i in indices),rank))
        if h==T:
            for i,(_,taps) in enumerate(LAWS):
                p=ops[i];g=gcd_gf2(MOD,p);r=N-degree(g)
                for next_h in (T+1,T+81):
                    later=pow_mod(sum(1 << k for k in taps),next_h)
                    joint=gcd_gf2(g,later)
                    assert N-degree(joint)==r
                    future_no_gain+=1
    assert ranks=={79:4,80:84,81:24}
    assert exact_no_tag==4584 and lossy_collisions==16808
    assert future_no_gain==14
    return {
        "schema":"ASOLARIA-SEAT3-PEER-SEAT1-MULTIVIEW-GCD-V1",
        "classification":"independent third mathematical algorithm on PUBLIC software fixture",
        "challenge_sha256":CHALLENGE_SHA,
        "methods":["GF2 polynomial Euclidean GCD","carryless modular exponentiation",
                   "Bezout inversion for full-rank pairs","nonzero kernel witness collision"],
        "seat1_source_pr":22,
        "horizons":list(HORIZONS),
        "configuration_count":len(triples),
        "rank_distribution":{str(k):v for k,v in ranks.items()},
        "rank_violations":sample_failures,
        "exact_no_side_information_recoveries":exact_no_tag,
        "lossy_input_pair_collisions":lossy_collisions,
        "observed_sample_records":exact_no_tag+lossy_collisions,
        "one_bit_categories_by_source_PR22":16044,
        "two_bit_categories_by_source_PR22":764,
        "same_law_later_horizons_add_no_rank":future_no_gain,
        "independent_physical_hosts_verified":0,
        "new_blinded_challenge_issued":False,
        "do_not_infer":"No physically distinct hosts or light/gravity/FTL evidence"
    }
if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("usage: python independent_multiview_gcd_audit.py challenge.json")
    print(json.dumps(audit(sys.argv[1]),sort_keys=True))
