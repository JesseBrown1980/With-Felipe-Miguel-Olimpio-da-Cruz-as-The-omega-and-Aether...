#!/usr/bin/env python3
"""Seat2/4 independent replay of per-particle Rust1.81 memories and 10-Gyr jump.
Integer-only. No HTTP, no NumPy, no unobserved external source assumptions."""
import hashlib
from pathlib import Path
import sys

YEAR=10_000_000_000
B,D,SCALED_YEAR=1_118_465,512_338,36_525_000

def balanced(n):
    return (n+1)%3-1

def source_seed(address):
    assert address and set(address)<={'-','0','+'}
    state=0
    for char in address:
        state=balanced(state+{'-':-1,'0':0,'+':1}[char])
    return state

def addr(number,depth):
    chars=['-']*depth
    for i in range(depth-1,-1,-1):
        chars[i]='-0+'[number%3]
        number//=3
    assert number==0
    return ''.join(chars)

def replay(notes,address,year):
    state=source_seed(address)
    current=0
    prev=-1
    for tick,observation,before,after in notes:
        assert tick>prev and observation in (-1,0,1)
        if tick>year:break
        state=balanced(state+(tick-current)%3)
        assert state==before,('invalid source prestate',address,tick)
        state=balanced(state+observation)
        assert state==after,('invalid poststate',address,tick)
        prev=tick
        current=tick
    return balanced(state+(year-current)%3)

def parse_ledger(data):
    lines=data.splitlines()
    assert lines and lines[0]=='ASOLARIA-PARTICLE-LEDGER-V1'
    memories={}
    for line in lines[1:]:
        cells=line.split('|')
        if len(cells)==2 and cells[0]=='P':
            address=cells[1]
            assert address not in memories
            source_seed(address)
            memories[address]=[]
        elif len(cells)==6 and cells[0]=='E':
            _,address,tick,obs,before,after=cells
            assert address in memories
            values=tuple(int(v) for v in (tick,obs,before,after))
            assert values[0]>=0
            notes=memories[address]
            assert not notes or values[0]>notes[-1][0]
            assert replay(notes,address,values[0])==values[2]
            assert balanced(values[2]+values[1])==values[3]
            notes.append(values)
        else:raise AssertionError('malformed particle record')
    return memories

def phase(years,period):
    from math import gcd
    g=gcd(period,SCALED_YEAR)
    denom=period//g
    return ((years%denom)*(SCALED_YEAR//g))%denom,denom

def hbp_fields(line):
    return dict(token.split('=',1) for token in line.split('|')[1:] if '=' in token)

def main():
    base=Path(sys.argv[1] if len(sys.argv)>1 else 'out')
    raw=(base/'PARTICLE-MEMORY-R1.ledger').read_bytes()
    memories=parse_ledger(raw.decode('utf8'))
    assert len(memories)==81
    assert sum(len(notes) for notes in memories.values())==2187
    assert all(len(notes)==27 for notes in memories.values())
    for number in range(81):
        address=addr(number,4)
        assert address in memories
        notes=memories[address]
        assert [tick for tick,*_ in notes]==list(range(1,82,3))
        for k,(tick,input_trit,_,_) in enumerate(notes):
            assert input_trit==(-1,0,1)[(number+2*k)%3],('wrong source','no real source')
        assert replay(notes,address,YEAR)==replay(notes,address,YEAR+3)
    # Alter real saved event, don't merely assert a Boolean 'tamper fail'.
    altered=raw.decode('utf8').replace('E|','E|',1)
    sample=next(line for line in altered.splitlines() if line.startswith('E|'))
    prefix='|'.join(sample.split('|')[:-1])+'|'
    after=int(sample.split('|')[-1])
    fake=prefix+str(-after if after else 1)
    assert fake!=sample
    altered=altered.replace(sample,fake,1)
    try:parse_ledger(altered)
    except (AssertionError,ValueError):pass
    else:raise AssertionError('forged history accepted')
    # Removing particle declaration must also fail.
    first=next(line for line in raw.decode('utf8').splitlines() if line.startswith('P|'))
    try:parse_ledger(raw.decode('utf8').replace(first+'\n','',1))
    except (AssertionError,ValueError):pass
    else:raise AssertionError('unparented history accepted')

    r2=(base/'PARTICLE-MEMORY-R1.hbp').read_text()
    assert f'exact_decimal={3**180}' in r2
    assert 'materialized_in_benchmark=0' in r2
    assert 'stored_events=2187' in r2
    assert r2.count('\nDEPTH|')==7
    r3=(base/'TEN-BILLION-YEAR-R1.hbp').read_text()
    lines=r3.splitlines()
    assert lines[0].startswith('HBP1|schema=ASOLARIA-INDIVIDUAL-MEMORY-10GYR-R1')
    snapshots=[l for l in lines if l.startswith('PARTICLE|')]
    assert len(snapshots)==81
    for ln in snapshots:
        fields=hbp_fields(ln)
        address=fields['id']
        assert int(fields['events'])==27
        assert int(fields['memory_state'])==replay(memories[address],address,YEAR)
        assert int(fields['year_plus_3_state'])==replay(memories[address],address,YEAR+3)
    levels=[l for l in lines if l.startswith('LEVEL|')]
    assert len(levels)==7
    for idx,l in enumerate(levels,1):
        d=hbp_fields(l)
        assert int(d['depth'])==idx
        assert int(d['cells'])==3**idx
        address=addr(0,idx)
        assert d['own_address']==address
        assert d['memory_mode']==('MATERIALIZED' if address in memories else 'DERIVED_UNMODIFIED')
        assert int(d['own_memory_state'])==replay(memories.get(address,[]),address,YEAR)
        for component in ('HRM','MTP123','Fischer','Shannon','GNN','GULP','Chariots'):
            assert component+'=' in l
    orbits=[hbp_fields(l) for l in lines if l.startswith('ORBIT|')]
    assert len(orbits)==1
    o=orbits[0]
    for name,period in [('b',B),('d',D)]:
        a,b=phase(YEAR,period)
        assert o[f'{name}_phase']==f'{a}/{b}'
        a,b=phase(YEAR+1,period)
        assert o[f'one_year_later_{name}']==f'{a}/{b}'
    mass=next(l for l in lines if l.startswith('MASS|'))
    assert 'sum_minimum_proxies_microearth=1315000' in mass
    assert 'true_masses_unresolved=TRUE' in mass
    assert 'd_MsinI_microearth=260000' in mass
    assert 'b_MsinI_microearth=1055000' in mass
    assert 'new_rocky_planet=NO_NEW_EVIDENCE' in r3
    for filename in ('PARTICLE-MEMORY-R1.ledger','PARTICLE-MEMORY-R1.hbp','TEN-BILLION-YEAR-R1.hbp'):
        raw=(base/filename).read_bytes()
        print('SHA256',filename,hashlib.sha256(raw).hexdigest(),'bytes',len(raw))
    print('PASS_81_INDEPENDENT_PARTICLE_MEMORIES_2187_EVENT_REPLAYS_7_DEPTHS_10GYR_MASS_GATE')
if __name__=='__main__':main()
