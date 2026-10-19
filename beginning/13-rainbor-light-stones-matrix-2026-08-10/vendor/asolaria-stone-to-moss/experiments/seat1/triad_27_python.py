#!/usr/bin/env python3
"""Seat 1 preregistered public 27-wave x 81-body x 5-law x 3-horizon test.
Pure Python GF(2) column matrices; no physical measurement or HF credentials.
"""
import argparse
import hashlib
import json
from pathlib import Path

N=81
MASK=(1<<N)-1
T=10_000_000_000_000
SCHEMA="ASOLARIA-SEAT1-TRIAD-27WAVE-3HORIZON-V1"
LAWS=((0,1),(0,2),(0,1,3),(0,4,7),(0,1,5,9))
TIMES=("past","now","future")
COLORS=("R","G","B")
SPACES=("x","y","z")
HORIZONS=(T,T+1,T+81)

def sha(text):
    return hashlib.sha256(text.encode("ascii")).hexdigest()

def check_challenge(p):
    raw=Path(p).read_bytes()
    c=json.loads(raw)
    assert c["schema"]==SCHEMA
    assert c["waves"]==27 and c["bodies"]==N
    assert c["base_horizon"]==T and c["horizons"]==list(HORIZONS)
    assert c["laws"]==[list(x) for x in LAWS]
    assert c["time"]==list(TIMES) and c["color"]==list(COLORS) and c["space"]==list(SPACES)
    assert c["classification"]=="PUBLIC_SOFTWARE_CHALLENGE_NOT_PHYSICAL_HOST"
    assert isinstance(c["source_commit"],str) and len(c["source_commit"])==40
    assert len(c["nonce"])==32 and all(ch in "0123456789abcdef" for ch in c["nonce"])
    return c,hashlib.sha256(raw).hexdigest()

def apply(columns,x):
    val=0
    while x:
        lsb=x&-x
        val^=columns[lsb.bit_length()-1]
        x^=lsb
    return val

def multiply(a,b):
    return [apply(a,col) for col in b]

def power(taps,exponent):
    transform=[sum(1<<((i+t)%N) for t in taps) for i in range(N)]
    result=[1<<i for i in range(N)]
    while exponent:
        if exponent&1:result=multiply(transform,result)
        transform=multiply(transform,transform)
        exponent>>=1
    return result

def direct(taps,state):
    value=0
    for k in taps:
        value^=((state<<k)|(state>>(N-k)))&MASK if k else state
    return value&MASK

def rotate(v):
    return ((v<<1)|(v>>(N-1)))&MASK

def self_test():
    tests=0
    for taps in LAWS:
        for n in (0,1,2,3,9,21):
            matrix=power(taps,n)
            for bit in (0,1,40,80):
                slow=1<<bit
                for _ in range(n):slow=direct(taps,slow)
                assert slow==apply(matrix,1<<bit),(taps,n,bit)
                tests+=1
    return tests

def calculate(c,challenge_sha):
    lines=[f"PORTAL|schema={SCHEMA}|challenge_sha256={challenge_sha}|nonce={c['nonce']}|waves=27|bodies=81|laws=5|horizons=3|json=0"]
    count=0
    linearity=0
    successors=0
    plus81=0
    rotations=0
    for law_id,taps in enumerate(LAWS):
        operators=[power(taps,h) for h in HORIZONS]
        one=power(taps,1)
        eightyone=power(taps,81)
        for wave_id in range(27):
            time=TIMES[wave_id//9]
            color=COLORS[(wave_id//3)%3]
            space=SPACES[wave_id%3]
            for body in range(N):
                seed=f"ASOLARIA|SEAT1|TRIAD|V1|{c['nonce']}|{time}|{color}|{space}|{body}"
                state=(int(sha(seed),16)&MASK)^(1<<body)
                flip=1<<((body+wave_id)%N)
                values=[]
                for idx,mat in enumerate(operators):
                    out=apply(mat,state)
                    delta=apply(mat,flip)
                    changed=apply(mat,state^flip)
                    assert changed^out==delta,(law_id,wave_id,body,idx,"linearity")
                    linearity+=1
                    values.append(out)
                    fields=f"{law_id}|{wave_id}|{time}|{color}|{space}|{body}|{idx}|{out:021x}|{delta:021x}"
                    digest=sha("ROW|"+fields)
                    lines.append(f"WAVE|law={law_id}|wave={wave_id}|time={time}|color={color}|space={space}|body={body}|horizon={idx}|state={out:021x}|delta={delta:021x}|sha={digest}|json=0")
                    count+=1
                assert values[1]==apply(one,values[0]),"T+1 successor mismatch"
                successors+=1
                assert values[2]==apply(eightyone,values[0]),"T+81 composition mismatch"
                plus81+=1
                assert apply(operators[0],rotate(state))==rotate(values[0]),"rotation mismatch"
                rotations+=1
    assert count==32805 and linearity==32805
    assert successors==plus81==rotations==10935
    lines.append("END|rows=32805|linearity=32805|successor=10935|plus81=10935|rotation=10935|physical_tested=0|json=0")
    return ("\n".join(lines)+"\n").encode("ascii"),{
        "rows":count,"linearity":linearity,"successor":successors,
        "plus81":plus81,"rotation":rotations}

def main():
    a=argparse.ArgumentParser()
    a.add_argument("challenge")
    a.add_argument("output")
    a.add_argument("--self-test",action="store_true")
    args=a.parse_args()
    controls=self_test() if args.self_test else 0
    c,ch_sha=check_challenge(args.challenge)
    data,checks=calculate(c,ch_sha)
    Path(args.output).write_bytes(data)
    print(json.dumps({"status":"PASS","algorithm":"independent_Python_column_matrix",
        "sha256":hashlib.sha256(data).hexdigest(),"challenge_sha256":ch_sha,
        "smallstep":controls,**checks},sort_keys=True))

if __name__=="__main__":main()
