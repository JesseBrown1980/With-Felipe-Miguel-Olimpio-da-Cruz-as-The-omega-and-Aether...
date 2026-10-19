#!/usr/bin/env python3
"""Seat-3 deterministic 2/3-view consistency-codimension audit.
Pure Python, no imports of Seat-1 solver. Public software mathematics only.
"""
from __future__ import annotations
import hashlib
import itertools
import json
import sys
from pathlib import Path

N=81
MASK=(1<<N)-1
T=10_000_000_000_000
HORIZONS=(1,T,T+1,T+81)
LAW_A=("CA150",(0,1,80))
LAW_B=(("CA90",(1,80)),("CA60",(0,1)),("CA102",(0,80)),("TAP1",(0,2)),("TAP4",(0,1,5,9)))
CHALLENGE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
DOMAIN="ASOLARIA-SEAT3-CROSSVIEW-CONSISTENCY-ENTROPY-V1"


def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def rot(x:int,k:int,n:int=N)->int:
    k%=n;mask=(1<<n)-1
    return ((x<<k)|(x>>(n-k)))&mask if k else x&mask

def mul(a:int,b:int)->int:
    out=0
    while a:
        least=a&-a;out^=rot(b,least.bit_length()-1);a^=least
    return out

def power(taps:tuple[int,...],h:int)->int:
    a=0
    for t in taps:a^=1<<t
    out=1
    while h:
        if h&1:out=mul(out,a)
        a=mul(a,a);h>>=1
    return out

def observe(cols:list[int],x:int)->int:
    y=0
    while x:
        least=x&-x;y^=cols[least.bit_length()-1];x^=least
    return y

def pivots(cols:list[int])->tuple[dict[int,tuple[int,int]],list[int]]:
    p={};free=[]
    for j,c in enumerate(cols):
        r=c;source=1<<j
        while r:
            bit=r.bit_length()-1
            if bit not in p:
                p[bit]=(r,source);break
            row,tag=p[bit];r^=row;source^=tag
        else:free.append(j)
    return p,free

def decode(p:dict[int,tuple[int,int]],y:int)->int|None:
    x=0
    while y:
        b=y.bit_length()-1
        if b not in p:return None
        row,tag=p[b];y^=row;x^=tag
    return x

def kernel(p:dict[int,tuple[int,int]],free:list[int],cols:list[int])->int:
    assert free
    v=(1<<free[0])^decode(p,cols[free[0]])
    assert v and observe(cols,v)==0
    return v

def samples(c:dict)->list[int]:
    s=[0,MASK]+[1<<j for j in range(N)]
    for t in c["time"]:
        for color in c["color"]:
            for space in c["space"]:
                for bit in (0,17,40,80):
                    label=f"ASOLARIA|SEAT1|TRIAD|V1|{c['nonce']}|{t}|{color}|{space}|{bit}"
                    s.append((int(sha(label.encode("ascii")),16)&MASK)^(1<<bit))
    assert len(s)==191
    return s

def toy()->tuple[int,int]:
    # Exhaustively classify independent x,y,z, not merely independently sampled outputs.
    a=lambda x:x&0b0011
    b=lambda x:x&0b1110
    c=lambda x:x&0b1101
    pair_set={(a(z),b(z)) for z in range(16)}
    triple_set={(a(z),b(z),c(z)) for z in range(16)}
    assert len(pair_set)==16 and len(triple_set)==16
    pair=sum((a(x),b(y)) in pair_set for x in range(16) for y in range(16))
    triple=sum((a(x),b(y),c(z)) in triple_set
               for x in range(16) for y in range(16) for z in range(16))
    assert (pair,triple)==(128,256)
    return pair,triple

def audit(challenge:Path)->tuple[bytes,dict]:
    raw=challenge.read_bytes()
    assert sha(raw)==CHALLENGE_SHA,"frozen challenge bytes changed"
    c=json.loads(raw)
    assert c["bodies"]==81 and c["waves"]==27 and c["horizons"]==[T,T+1,T+81]
    sources=samples(c); toy_pair,toy_triple=toy()
    rows=[f"PORTAL|schema={DOMAIN}|challenge_sha256={CHALLENGE_SHA}|sources=191|physical_hosts_attested=0|json=0"]
    pair_rows=[];triple_rows=[];counts=dict(honest=0,rejected=0,alternate_accepted=0,invisible_B_change=0)
    for h in HORIZONS:
        ap=power(LAW_A[1],h);a=[rot(ap,j) for j in range(N)]
        pa,fa=pivots(a)
        assert (len(pa),len(fa))==(79,2)
        ka=kernel(pa,fa,a)
        ops={name:[rot(power(taps,h),j) for j in range(N)] for name,taps in LAW_B}
        binfo={}
        for name,b in ops.items():
            pb,fb=pivots(b)
            assert (len(pb),len(fb))==(80,1)
            kb=kernel(pb,fb,b)
            ab=[a[j]|(b[j]<<N) for j in range(N)]
            pab,fab=pivots(ab)
            assert len(pab)==81 and not fab
            item={"horizon":h,"A":"CA150","B":name,"ranks":[79,80],"joint_rank":81,
                  "cross_source_constraints":78,"blind_probability":"2^-78", "source_tuple_count":"2^84",
                  "A_kernel":f"{ka:021x}","B_kernel":f"{kb:021x}"}
            pair_rows.append(item)
            rows.append(f"PAIR|{h}|CA150|{name}|rA=79|rB=80|joint=81|constraints=78|blind=2^-78")
            binfo[name]=kb
        for (nameB,b),(nameC,cc) in itertools.combinations(ops.items(),2):
            abc=[a[j]|(b[j]<<N)|(cc[j]<<(2*N)) for j in range(N)]
            p,free=pivots(abc)
            assert len(p)==81 and not free
            rejection_bit=next((j for j in range(N) if decode(p,b[j]<<N) is None),None)
            assert rejection_bit is not None
            delta=1<<rejection_bit
            kb=binfo[nameB]
            assert observe(a,ka)==0 and observe(b,kb)==0
            for trial,x in enumerate(sources):
                ax=observe(a,x)
                original_b=observe(b,x)
                original_c=observe(cc,x)
                configurations=(
                    ("honest",x,x,x),
                    ("rejected",x^delta,x,None),
                    ("alternate_accepted",x^ka,x^ka,x^ka),
                    ("invisible_B_change",x^kb,x,x),
                )
                for arm,sourceB,sourceC,expected in configurations:
                    bx=observe(b,sourceB);cx=observe(cc,sourceC)
                    result=decode(p,ax|(bx<<N)|(cx<<(2*N)))
                    assert result==expected,(h,nameB,nameC,trial,arm,result,expected)
                    assert result is None or (observe(a,result)==ax and observe(b,result)==bx and observe(cc,result)==cx)
                    if arm=="rejected":assert bx!=original_b
                    if arm=="alternate_accepted":
                        assert expected!=x and sourceB!=x and sourceC!=x
                    if arm=="invisible_B_change":assert sourceB!=x and bx==original_b and cx==original_c
                    counts[arm]+=1
                    fields=(str(h),nameB,nameC,str(trial),arm,f"{x:021x}",f"{sourceB:021x}",
                            f"{sourceC:021x}",f"{ax:021x}",f"{bx:021x}",f"{cx:021x}",
                            "-" if result is None else f"{result:021x}")
                    rows.append("CASE|"+"|".join(fields))
            item={"horizon":h,"A":"CA150","B":nameB,"C":nameC,"ranks":[79,80,80],
                  "joint_rank":81,"cross_source_constraints":158,"blind_probability":"2^-158",
                  "source_tuple_count":"2^85","reject_basis_bit":rejection_bit,"A_kernel":f"{ka:021x}",
                  "B_kernel":f"{kb:021x}","counts_per_arm":191}
            triple_rows.append(item)
            rows.append(f"TRIPLE|{h}|CA150|{nameB}|{nameC}|ranks=79,80,80|joint=81|constraints=158|blind=2^-158|reject_bit={rejection_bit}")
    assert len(pair_rows)==20 and len(triple_rows)==40
    assert counts==dict(honest=7640,rejected=7640,alternate_accepted=7640,invisible_B_change=7640),counts
    rows.append("END|pairs=20|triples=40|controls=30560|honest=7640|rejected=7640|alternate_accepted=7640|invisible_B_change=7640|toy_pair=128|toy_triple=256|physical=0|json=0")
    data=("\n".join(rows)+"\n").encode("ascii")
    metrics={"schema":DOMAIN,"status":"PASS","seat":"seat-3","challenge_sha256":CHALLENGE_SHA,
             "trace_bytes":len(data),"trace_sha256":sha(data),"toy_pair_accept":toy_pair,
             "toy_triple_accept":toy_triple,"pair_cases":len(pair_rows),"triple_cases":len(triple_rows),
             "controlled_cases":sum(counts.values()),"controls":counts,"pairs":pair_rows,"triples":triple_rows,
             "scope":"computational GF2 linear consistency; NOT source authentication or physical hardware"}
    return data,metrics

if __name__=="__main__":
    if len(sys.argv)!=4:raise SystemExit("usage: python seat3_crossview_entropy.py challenge.json out.hbp metrics.json")
    data,metrics=audit(Path(sys.argv[1]))
    Path(sys.argv[2]).write_bytes(data)
    Path(sys.argv[3]).write_text(json.dumps(metrics,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in metrics.items() if k not in ("pairs","triples")},sort_keys=True))
