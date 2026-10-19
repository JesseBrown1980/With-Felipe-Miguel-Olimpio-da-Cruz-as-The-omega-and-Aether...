#!/usr/bin/env python3
"""Seat-3 independently authored replay of Seat-1's *original* public challenge.
Cyclic GF(2) polynomials, not the Seat-1 Python matrix code. Not physical-host evidence."""
import hashlib,json,sys
from pathlib import Path

N=81
MASK=(1<<N)-1
HORIZONS=(10**13,10**13+1,10**13+81)
LAWS=((0,1),(0,2),(0,1,3),(0,4,7),(0,1,5,9))
TIMES=("past","now","future")
COLORS=("R","G","B")
SPACES=("x","y","z")
SCHEMA="ASOLARIA-SEAT1-TRIAD-27WAVE-3HORIZON-V1"
CHALLENGE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
EXPECTED="720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3"
EXPECTED_BYTES=6392029

def sha(x):return hashlib.sha256(x.encode("ascii")).hexdigest()
def rot(v,k):return ((v<<k)|(v>>(N-k)))&MASK if k else v
def conv(a,b):
    out=0
    while a:
        low=a&-a
        out^=rot(b,low.bit_length()-1)
        a-=low
    return out
def operator(taps,steps):
    base=sum(1<<i for i in taps)
    out=1
    while steps:
        if steps&1:out=conv(out,base)
        base=conv(base,base)
        steps>>=1
    return out
def challenge_check(filename):
    raw=Path(filename).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=CHALLENGE_SHA:raise ValueError("original challenge byte SHA mismatch")
    c=json.loads(raw)
    assert c["schema"]==SCHEMA and c["classification"]=="PUBLIC_SOFTWARE_CHALLENGE_NOT_PHYSICAL_HOST"
    assert c["horizons"]==list(HORIZONS) and c["laws"]==[list(t) for t in LAWS]
    assert c["waves"]==27 and c["bodies"]==81
    assert c["time"]==list(TIMES) and c["color"]==list(COLORS) and c["space"]==list(SPACES)
    assert c["nonce"]=="eff1eda90f40cd6fa1e9e9f22e34ecf3"
    assert c["source_commit"]=="d092bcc06908a5f5864eada406d5b3ddf4933a5d"
    return c
def run(challenge,output):
    c=challenge_check(challenge); nonce=c["nonce"]
    size=0;count=0;follow=0;rotations=0
    digest=hashlib.sha256()
    with open(output,"wb") as output_file:
        def line(s):
            nonlocal size
            b=(s+"\n").encode("ascii")
            output_file.write(b);digest.update(b);size+=len(b)
        line(f"PORTAL|schema={SCHEMA}|challenge_sha256={CHALLENGE_SHA}|nonce={nonce}|waves=27|bodies=81|laws=5|horizons=3|json=0")
        for li,taps in enumerate(LAWS):
            operators=[operator(taps,T) for T in HORIZONS]
            one=operator(taps,1)
            eightyone=operator(taps,81)
            for w in range(27):
                ti=TIMES[w//9];co=COLORS[(w//3)%3];sp=SPACES[w%3]
                for b in range(N):
                    seed=f"ASOLARIA|SEAT1|TRIAD|V1|{nonce}|{ti}|{co}|{sp}|{b}"
                    s=(int(sha(seed),16)&MASK)^(1<<b)
                    mask=1<<((b+w)%N)
                    x=[]
                    for j,p in enumerate(operators):
                        v=conv(p,s)
                        delta=conv(p,mask)
                        assert conv(p,s^mask)==(v^delta)
                        x.append(v)
                        fields=f"{li}|{w}|{ti}|{co}|{sp}|{b}|{j}|{v:021x}|{delta:021x}"
                        h=sha("ROW|"+fields)
                        line(f"WAVE|law={li}|wave={w}|time={ti}|color={co}|space={sp}|body={b}|horizon={j}|state={v:021x}|delta={delta:021x}|sha={h}|json=0")
                        count+=1
                    assert conv(one,x[0])==x[1] and conv(eightyone,x[0])==x[2]
                    follow+=1
                    assert conv(operators[0],rot(s,1))==rot(x[0],1)
                    rotations+=1
        line("END|rows=32805|linearity=32805|successor=10935|plus81=10935|rotation=10935|physical_tested=0|json=0")
    observed=digest.hexdigest()
    assert count==32805 and follow==rotations==10935 and size==EXPECTED_BYTES
    assert observed==EXPECTED,(observed,EXPECTED)
    print(json.dumps({"status":"PASS","seat":"seat-3","original_seat1_challenge_replay":True,
      "records":count,"size_bytes":size,"sha256":observed,"challenge_sha256":CHALLENGE_SHA,
      "linearity":count,"successor":follow,"plus81":follow,"rotation":rotations,
      "evidence":"public software, not physical host verification"},sort_keys=True))
if __name__=="__main__":
    assert len(sys.argv)==3,"usage: python replay.py challenge.json output.hbp"
    run(sys.argv[1],sys.argv[2])
