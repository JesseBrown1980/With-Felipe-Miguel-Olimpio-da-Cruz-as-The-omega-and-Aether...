#!/usr/bin/env python3
"""Asolaria Seat 3: two-horizon, one-bit perturbation, deterministic software stress.
This is a SYNTHETIC computational control and not a new physical-host challenge."""
import hashlib, sys, json
N=81; MASK=(1<<N)-1
LAWS=((0,1),(0,2),(0,1,3),(0,4,7),(0,1,5,9))
STEPS=(10**13,10**13+1)
SEED=hashlib.sha256(b'ASOLARIA-SEAT3-TWO-HORIZON-LOCAL-CONTROL-20261014-V1').hexdigest()
def h(x): return hashlib.sha256(x.encode('ascii')).hexdigest()
def apply(cols, bits):
    o=0
    while bits:
        low=bits & -bits
        o^=cols[low.bit_length()-1]
        bits^=low
    return o
def compose(a,b): return [apply(a,c) for c in b]
def power(taps,steps):
    out=[1<<i for i in range(N)]
    op=[sum(1<<((i+t)%N) for t in taps) for i in range(N)]
    while steps:
        if steps&1:out=compose(op,out)
        op=compose(op,op);steps>>=1
    return out
def direct(taps,initial):
    out=0
    for t in taps:
        out^=((initial<<t)|(initial>>(N-t)))&MASK if t else initial
    return out&MASK
def state(li,wave,body):return (int(h(f'{SEED}|{li}|{wave}|{body}'),16)&MASK)^(1<<body)
def run():
    deltas={}; records=[]; self_tests=0; time_morph=0
    for li,taps in enumerate(LAWS):
      op0=power(taps,STEPS[0]);op1=power(taps,STEPS[1]);
      for n in (0,1,2,3,9,21):
       short=power(taps,n)
       for b in (0,1,40,80):
        v=1<<b
        for _ in range(n):v=direct(taps,v)
        assert apply(short,1<<b)==v
        self_tests+=1
      for wave in range(12):
       for b in range(N):
        v=state(li,wave,b)
        for t,op in ((STEPS[0],op0),(STEPS[1],op1)):
          x=apply(op,v); y=apply(op,v^(1<<b)); delta=x^y
          assert delta==op[b]
          if t==STEPS[0]:
           assert direct(taps,x)==apply(op1,v)
           assert direct(taps,y)==apply(op1,v^(1<<b))
           time_morph+=2
          deltas.setdefault((li,t),[]).append(delta.bit_count())
          records.append(f'H|t={t}|law={li}|wave={wave}|body={b}|a={x:021x}|b={y:021x}|delta={delta:021x}|json=0\n')
    digest=hashlib.sha256(''.join(records).encode('ascii')).hexdigest()
    summary={'schema':'ASOLARIA-SEAT3-TWO-HORIZON-STRESS-V1','records':len(records),'sha256':digest,'seed_sha256':SEED,
       'direct_step_controls':self_tests,'t_to_tplus1_controls':time_morph,'horizons':list(STEPS),
       'delta_bit_counts':{f'{li}-{t}':min(z) for (li,t),z in deltas.items()},'delta_uniform_per_law_horizon':all(len(set(z))==1 for z in deltas.values()),
       'physical_host_independent':False,'evidence':'synthetic local computation; physical FTL and gravity not measured'}
    if len(sys.argv)>1:open(sys.argv[1],'wb').write(''.join(records).encode('ascii'))
    print(json.dumps(summary,sort_keys=True))
if __name__=='__main__':run()
