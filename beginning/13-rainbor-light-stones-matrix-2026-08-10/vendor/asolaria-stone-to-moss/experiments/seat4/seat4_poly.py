#!/usr/bin/env python3
"""Seat 4: cyclic GF(2) polynomial exponentiation, NOT the Host A/B portal code.
This is a reproducible independent computational control of 10^13 modeled steps.
"""
import hashlib, json, pathlib, struct, sys, time
from functools import reduce

N=81
MASK=(1<<N)-1
LAWS=('CA150','CA90','CA60','CA102','SHIFT')
SEED_DOMAIN=b'ASOLARIA-PORTAL-CHALLENGE-V1\x00'
KERNELS={'CA150':(0,1,80),'CA90':(1,80),'CA60':(0,1),
         'CA102':(0,80),'SHIFT':(1,)}

def rotate(v,k):
    k%=N
    return ((v<<k)|(v>>(N-k)))&MASK if k else v&MASK

def multiply(a,b):
    result=0
    while a:
        bit=a&-a
        result^=rotate(b,bit.bit_length()-1)
        a^=bit
    return result

def jump_poly(law,steps):
    base=sum(1<<k for k in KERNELS[law]); result=1
    while steps:
        if steps&1: result=multiply(result,base)
        base=multiply(base,base)
        steps>>=1
    return result

def step_naive(v,law):
    return reduce(int.__xor__, (rotate(v,k) for k in KERNELS[law]), 0)

def initial_state(seed,wave,seat):
    seq=wave*81+seat
    d=hashlib.sha256(SEED_DOMAIN+seed+struct.pack('>I',seq)).digest()
    return (int.from_bytes(d[:11],'little')&MASK)^(1<<seat)

def compute(challenge):
    t=int(challenge['t']);seed=bytes.fromhex(challenge['seed_hex'])
    assert len(seed)==32 and challenge['waves']==9 and challenge['seats']==81
    assert N==81 and t==10**13
    jumps={law:jump_poly(law,t) for law in LAWS}
    for law in LAWS:
        for trial in (0,1,7,80,0xabcdef123456789):
            v=trial&MASK
            assert step_naive(v,law)==multiply(jump_poly(law,1),v)
            for small in (0,1,2,3,9,31):
                ref=v
                for _ in range(small): ref=step_naive(ref,law)
                assert ref==multiply(jump_poly(law,small),v)
    lines=[]
    for wave in range(9):
        law=LAWS[wave%5]
        for seat in range(81):
            v=initial_state(seed,wave,seat)
            result=multiply(jumps[law],v)
            lines.append(f'{wave},{seat},{law},{v:021x},{result:021x}\n')
    return lines

def main():
    src=pathlib.Path(sys.argv[1])
    raw=src.read_bytes();challenge=json.loads(raw)
    t0=time.perf_counter_ns()
    lines=compute(challenge)
    elapsed=time.perf_counter_ns()-t0
    rawcsv=''.join(lines).encode('ascii')
    result={'schema':'ASOLARIA-SEAT4-CYCLIC-GF2-CONTROL-V1',
       'algorithm':'python-cyclic-polynomial-exponentiation',
       'source_challenge_sha256':hashlib.sha256(raw).hexdigest(),
       'cases':len(lines),'horizon_modeled_steps':challenge['t'],
       'sha256_csv':hashlib.sha256(rawcsv).hexdigest(),
       'law_order':list(LAWS),'elapsed_ns':elapsed,
       'evidence':'synthetic deterministic CPU computation; not Host A/B protocol or physical signal'}
    print(json.dumps(result,sort_keys=True))
    pathlib.Path(sys.argv[2]).write_bytes(rawcsv)

if __name__=='__main__':main()
