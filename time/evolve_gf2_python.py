#!/usr/bin/env python3
"""Independent Python GF(2) 81-body, ten-trillion-step matrix exponentiation.
This is a NEW, explicitly locked five-law control; not an unverified replay of
an earlier unknown law set. Software computation, not physical propagation.
"""
import argparse
import hashlib
import json
from pathlib import Path
N=81
MASK=(1<<N)-1
TAG="ASOLARIA-81-3PHYSICAL-GF2-V1"
LAWS=((0,1),(0,2),(0,1,3),(0,4,7),(0,1,5,9))
STEPS=10_000_000_000_000
SEATS=("seat-1","seat-2","seat-3")
def sha(x):
    return hashlib.sha256(x.encode("ascii")).hexdigest()
def get_challenge(p):
    c=json.loads(Path(p).read_text(encoding="utf-8"))
    assert c["schema"]==TAG
    assert c["steps"]==STEPS and c["waves"]==12 and c["bodies"]==81
    assert c["laws"]==[list(x) for x in LAWS], "Law drift"
    assert sorted(c["seat_commitments"])==list(SEATS), "Need all three commitments"
    for k in SEATS:
        assert len(c["seat_commitments"][k])==64
        int(c["seat_commitments"][k],16)
    assert len(c["nonce"])==32
    int(c["nonce"],16)
    return c
def apply(columns,bits):
    result=0
    while bits:
        low=bits & -bits
        result ^= columns[low.bit_length()-1]
        bits ^= low
    return result
def matrix_for(taps):
    return [sum(1<<((i+t)%N) for t in taps) for i in range(N)]
def compose(left,right):
    return [apply(left,col) for col in right]
def advance_matrix(taps,steps):
    unit=[1<<i for i in range(N)]
    power=matrix_for(taps)
    while steps:
        if steps & 1:
            unit=compose(power,unit)
        power=compose(power,power)
        steps >>= 1
    return unit
def direct_once(taps,initial):
    result=0
    for t in taps:
        result ^= ((initial<<t)|(initial>>(N-t))) & MASK if t else initial
    return result & MASK
def self_test():
    for taps in LAWS:
        for n in (0,1,2,3,9,21):
            matrix=advance_matrix(taps,n)
            for seat in (0,1,40,80):
                v=1<<seat
                expected=v
                for _ in range(n):
                    expected=direct_once(taps,expected)
                assert apply(matrix,v)==expected,(taps,n,seat)
    return True
def build(c):
    master=sha(TAG+"|"+c["nonce"]+"|"+"|".join(c["seat_commitments"][s] for s in SEATS))
    lines=[f"PORTAL|schema={TAG}|nonce={c['nonce']}|master={master}|steps={STEPS}|laws=5|waves=12|bodies=81|json=0"]
    for index,taps in enumerate(LAWS):
        matrix=advance_matrix(taps,STEPS)
        assert len(matrix)==81
        for wave in range(12):
            for body in range(N):
                state=int(sha(master+"|"+str(index)+"|"+str(wave)+"|"+str(body)),16)&MASK
                state^=1<<body
                out=apply(matrix,state)
                out_hex=f"{out:021x}"
                check=sha(f"ASOLARIA|STATE|{index}|{wave}|{body}|{out_hex}")
                lines.append(f"WAVE|law={index}|wave={wave}|body={body}|state={out_hex}|sha={check}|json=0")
    assert len(lines)==4861
    lines.append("END|records=4860|class=EXACT_GF2_DIGITAL_CALCULATION|json=0")
    return ("\n".join(lines)+"\n").encode("ascii")
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("challenge")
    parser.add_argument("output")
    parser.add_argument("--self-test",action="store_true")
    a=parser.parse_args()
    if a.self_test:self_test()
    payload=build(get_challenge(a.challenge))
    Path(a.output).write_bytes(payload)
    print(json.dumps({"status":"PASS","records":4860,
      "sha256":hashlib.sha256(payload).hexdigest(),
      "algorithm":"GF2-column-matrix","steps":STEPS}))
if __name__=="__main__":main()
