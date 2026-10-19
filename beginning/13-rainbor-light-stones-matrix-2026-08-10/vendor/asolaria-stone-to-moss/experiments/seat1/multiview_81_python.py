#!/usr/bin/env python3
"""Seat 1: complementary GF(2) observations, cyclic-polynomial implementation.
Public software math only; not a physical-host claim.
"""
import hashlib
import itertools
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[2]
CHALLENGE=ROOT/"experiments/seat1/TRIAD-27-CHALLENGE-20261014.json"
CHALLENGE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
DOMAIN="ASOLARIA-SEAT1-MULTIVIEW-81-V1"
N=81
MASK=(1<<N)-1
T=10_000_000_000_000
HORIZONS=(1,T,T+1,T+81)
LAWS=(
 ("CA150",(0,1,80)),("CA90",(1,80)),("CA60",(0,1)),
 ("CA102",(0,80)),("TAP0",(0,1)),("TAP1",(0,2)),
 ("TAP4",(0,1,5,9)),
)
LAW_TAPS=dict(LAWS)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def rotate(state,amount):
    amount%=N
    return ((state<<amount)|(state>>(N-amount)))&MASK if amount else state&MASK

def multiply(a,b):
    result=0
    while a:
        low=a&-a
        result^=rotate(b,low.bit_length()-1)
        a^=low
    return result

def polynomial_power(taps,horizon):
    operator=0
    for t in taps:operator^=1<<t
    result=1
    while horizon:
        if horizon&1:result=multiply(result,operator)
        operator=multiply(operator,operator)
        horizon>>=1
    return result

def observe(columns,source):
    result=0
    while source:
        low=source&-source
        result ^= columns[low.bit_length()-1]
        source^=low
    return result

def basis(columns):
    pivots={}
    free=[]
    for i,original in enumerate(columns):
        residue=original
        source=1<<i
        while residue:
            bit=residue.bit_length()-1
            if bit not in pivots:
                pivots[bit]=(residue,source)
                break
            pivot,induced=pivots[bit]
            residue^=pivot
            source^=induced
        else:
            free.append(i)
    return pivots,free

def solve(pivots,output):
    source=0
    while output:
        index=output.bit_length()-1
        if index not in pivots:raise AssertionError("unreachable output")
        residual,sourcebits=pivots[index]
        source^=sourcebits
        output^=residual
    return source

def tag_of(source,free):
    return sum(((source>>bit)&1)<<i for i,bit in enumerate(free))

def source_from_tag(tag,free):
    if not (0<=tag<(1<<len(free))):raise AssertionError("invalid side bits")
    return sum(((tag>>i)&1)<<bit for i,bit in enumerate(free))

def decode(columns,pivots,free,output,tag):
    partial=source_from_tag(tag,free)
    residual=output^observe(columns,partial)
    original=solve(pivots,residual)^partial
    assert observe(columns,original)==output and tag_of(original,free)==tag
    return original

def samples(c):
    yield 0
    yield MASK
    for bit in range(N):yield 1<<bit
    for time in c["time"]:
        for color in c["color"]:
            for space in c["space"]:
                for bit in (0,17,40,80):
                    label=f"ASOLARIA|SEAT1|TRIAD|V1|{c['nonce']}|{time}|{color}|{space}|{bit}"
                    yield (int(sha(label.encode("ascii")),16)&MASK)^(1<<bit)

def test():
    raw=CHALLENGE.read_bytes()
    assert sha(raw)==CHALLENGE_SHA,"pinned public challenge drift"
    c=json.loads(raw)
    assert c["waves"]==27 and c["bodies"]==81
    assert c["time"]==["past","now","future"]
    assert c["color"]==["R","G","B"]
    assert c["space"]==["x","y","z"]
    assert c["horizons"]==[T,T+1,T+81]
    assert c["laws"]==[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]

    configurations=[(name,) for name,_ in LAWS]
    configurations+=list(itertools.combinations((name for name,_ in LAWS),2))
    assert len(configurations)==28
    inputs=list(samples(c))
    assert len(inputs)==191
    lines=[f"PORTAL|schema={DOMAIN}|challenge_sha256={CHALLENGE_SHA}|configs=112|sources_per_config=191|physical_host_attested=0|json=0"]
    rows=0;zero_bits=0;one_bit=0;two_bits=0;nonzero_kernel=0;wrong_tags=0;no_future_gain=0
    rank_map={}
    for h in HORIZONS:
        ops={name:polynomial_power(taps,h) for name,taps in LAWS}
        for law in LAW_TAPS:
            early=[rotate(ops[law],j) for j in range(N)]
            for later in (T+1,T+81) if h==T else ():
                late_poly=polynomial_power(LAW_TAPS[law],later)
                stacked=[col|(rotate(late_poly,j)<<N) for j,col in enumerate(early)]
                assert len(basis(stacked)[0])==len(basis(early)[0])
                no_future_gain+=1
        for combo in configurations:
            vectors=[ops[name] for name in combo]
            columns=[sum(rotate(op,j)<<(N*k) for k,op in enumerate(vectors)) for j in range(N)]
            pivots,free=basis(columns)
            rank=len(pivots)
            expected=(79 if combo==("CA150",) else
                      80 if len(combo)==1 or "CA150" not in combo else 81)
            assert rank==expected,(h,combo,rank,expected)
            rank_map[f"{h}/"+"/".join(combo)]=rank
            # Enumerate all nullspace alternatives for each configuration.
            kernel=[]
            for free_bit in free:
                witness=(1<<free_bit)^solve(pivots,columns[free_bit])
                assert witness and observe(columns,witness)==0
                kernel.append(witness)
            assert len(kernel)==N-rank
            for tag in range(1,1<<len(free)):
                witness=0
                for i,w in enumerate(kernel):
                    if tag>>i&1:witness^=w
                assert witness!=0 and observe(columns,witness)==0
                assert decode(columns,pivots,free,0,tag_of(witness,free))==witness
                assert sha(f"{witness:021x}".encode())!=sha(f"{0:021x}".encode())
                nonzero_kernel+=1
            if free:
                original=1<<17
                output=observe(columns,original)
                other=decode(columns,pivots,free,output,tag_of(original,free)^1)
                assert other!=original and observe(columns,other)==output
                wrong_tags+=1
            for k,source in enumerate(inputs):
                output=observe(columns,source)
                tag=tag_of(source,free)
                restored=decode(columns,pivots,free,output,tag)
                assert restored==source
                if not free:zero_bits+=1
                elif len(free)==1:one_bit+=1
                else:two_bits+=1
                out0=f"{output&MASK:021x}"
                out1=f"{output>>N:021x}" if len(combo)==2 else "-"
                label="+".join(combo)
                fields=f"{h}|{label}|{k}|{rank}|{source:021x}|{out0}|{out1}|{tag:x}|{restored:021x}"
                lines.append("RECORD|"+fields+"|sha="+sha(("ROW|"+fields).encode())+"|json=0")
                rows+=1
    assert (rows,zero_bits,one_bit,two_bits,nonzero_kernel,wrong_tags,no_future_gain)==(21392,4584,16044,764,96,88,14)
    lines.append("END|rows=21392|zero_bits=4584|one_bit=16044|two_bits=764|kernel_witnesses=96|wrong_tags=88|future_rank_no_gain=14|physical_tested=0|json=0")
    raw=("\n".join(lines)+"\n").encode("ascii")
    return raw,{
        "status":"PASS","seat":"seat-1","implementation":"independent_python_cyclic_polynomial",
        "sha256":sha(raw),"challenge_sha256":CHALLENGE_SHA,
        "records":rows,"recovered_without_side_bits":zero_bits,
        "recovered_with_one_side_bit":one_bit,"recovered_with_two_side_bits":two_bits,
        "kernel_collision_witnesses":nonzero_kernel,"wrong_tag_controls":wrong_tags,
        "same_law_future_rank_no_gain":no_future_gain,"rank_cases":len(rank_map),
        "physical_host_verified":False
    }

if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("usage: python multiview_81_python.py out.hbp")
    data,receipt=test()
    Path(sys.argv[1]).write_bytes(data)
    print(json.dumps(receipt,sort_keys=True))
