#!/usr/bin/env python3
"""Independent integer-only oracle; no original Rust logic called or optical data."""
import csv,hashlib,sys
from math import gcd
from pathlib import Path
B,D,YEAR=1118465,512338,36525000
def phase(n,p):
    g=gcd(YEAR,p);d=p//g
    return ((n%d)*(YEAR//g))%d,d
def audit_hbp(body):
    lines=body.splitlines()
    assert lines[0].startswith('HBP1|schema=ASOLARIA-PROXIMA-RUST181-R1')
    assert 'field=GF3|trits=-1,0,+1|float_used=0' in lines[0]
    levels=[line for line in lines if line.startswith('LEVEL|')]
    assert len(levels)==7
    fields_needed=['HRM_fast=','HRM_slow=','MTP1=PASS','MTP2=PASS','MTP3=PASS',
        'MTP_checks=6','BobbyFischer=PASS','Shannon_negative=',
        'Shannon_zero=','Shannon_positive=','GNN_cycle=','GULP_note=',
        'ChariotForward=27','ChariotReverse=27','rainbow=SYMBOLIC_NOT_CALIBRATED']
    for k,line in enumerate(levels,1):
        values=dict(token.split('=',1) for token in line.split('|')[1:] if '=' in token)
        assert int(values['nodes'])==3**k
        assert values['wave_years']==str(3**k)
        assert sum(int(values['Shannon_'+cat]) for cat in ('negative','zero','positive'))==3**k
        assert all(field in line for field in fields_needed),(k,line)
    assert 'original_taps_013_81_nilpotent=true' in body
    assert 'original_taps_047_81_nilpotent=true' in body
    e200=[x for x in lines if x.startswith('E200|')]
    assert len(e200)==1
    for label,period in [('b',B),('d',D)]:
        n,d=phase(pow(3,10**200,period//gcd(YEAR,period)),period)
        assert f'{label}_phase={n}/{d}' in e200[0]
def main():
    out=Path(sys.argv[1] if len(sys.argv)>1 else 'out')
    hbp=(out/'ASOLARIA-PROXIMA-RUST181.hbp').read_text()
    audit_hbp(hbp)
    with (out/'EPOCHS-RUST181.csv').open(newline='') as f:rows=list(csv.DictReader(f))
    assert len(rows)==200
    for i,row in enumerate(rows,1):
        assert int(row['exponent'])==i
        assert row['years_exact']==str(3**i)
        for name,p in [('b',B),('d',D)]:
            assert (int(row[name+'_phase_numerator']),int(row[name+'_phase_denominator']))==phase(3**i,p)
        assert row['field']=='GF3' and row['observed_photons']=='false'
    # Mutations must really fail; not just be named as negative tests.
    for before,after in [('BobbyFischer=PASS','BobbyFischer=FAIL'),
                         ('MTP1=PASS','MTP1=FAIL'),
                         ('Shannon_zero=','Shannon_zero=-11')]:
        candidate=hbp.replace(before,after,1)
        try:audit_hbp(candidate)
        except (AssertionError,ValueError,KeyError):pass
        else:raise AssertionError('FORGED_RECORD_ACCEPTED:'+after)
    for name in ('ASOLARIA-PROXIMA-RUST181.hbp','EPOCHS-RUST181.csv'):
        data=(out/name).read_bytes()
        print('SHA256',name,hashlib.sha256(data).hexdigest(),'bytes',len(data))
    print('PASS_INDEPENDENT_FISCHER_GATES+SEVEN_LEVELS+200_EPOCHS+E200_MODULAR')
if __name__=='__main__':main()
