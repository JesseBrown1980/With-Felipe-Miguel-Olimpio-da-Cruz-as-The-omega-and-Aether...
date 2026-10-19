#!/usr/bin/env python3
"""Fail-closed Round 2 full output, canonical Phase A and cross-OS verifier."""
import hashlib
import json
from pathlib import Path
import sys
EXPECTED_OLD='de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b'
EXPECTED_NEW='208f26fd23f8da5e032b091f238346b386516669c66f3d6ee9323209eafff566'
S=10**9
def sha(b):return hashlib.sha256(b).hexdigest()
def check(d):
    a=(d/'round2-python.hbp').read_bytes()
    b=(d/'round2-node.hbp').read_bytes()
    assert a==b,'PY_NODE_FULL_TRACE_DRIFT'
    assert sha(a)==EXPECTED_NEW,('ROUND2_DIGEST_DRIFT',sha(a))
    assert a.startswith(b'MODEL|schema=ASOLARIA-SEAT1-PHOTOCYCLE-RATES-V1|')
    assert a.endswith(b'END|snapshots=20412|site_ticks=1749600|external_authorization=0|physical_observations=0\n')
    data=a.decode('ascii').splitlines()
    frames=[r for r in data if r.startswith('FRAME|')]
    assert len(frames)==20412
    ids=set()
    for line in frames:
        kv=dict(part.split('=',1) for part in line.split('|')[1:])
        ident=kv['id'];ids.add(ident)
        c,o,r=[int(kv[k]) for k in ('C','O','R')]
        assert min(c,o,r)>=0 and c+o+r==S
        assert int(kv['I_millipA'])==-(120000*o//S)
    assert ids=={f'site-{i:03d}' for i in range(81)}
    p=json.loads((d/'round2-python.json').read_text())
    n=json.loads((d/'round2-node.json').read_text())
    assert p==n,'SEMANTIC_METRICS_DRIFT'
    assert p['sha256']==EXPECTED_NEW and p['snapshot_count']==20412
    assert p['site_tick_count']==1749600
    assert p['per_tick_human_prompts']==p['external_permission_grants']==0
    assert len(p['metrics'])==18 and all(row['light_on_site_ticks']==row['light_on_global_ticks']*81 for row in p['metrics'])
    f=json.loads((d/'round2-faults.json').read_text())
    assert f['executed_negative_controls']==8 and len(f['events'])==8
    assert all(e['exercised'] and e['result']=='HALT' for e in f['events'])
    assert f['coherent_source_and_watcher_forgery']['status']=='HELD_UNAUTHENTICATED'
    assert f['refinement_abs_open_diff_scaled']<=f['refinement_limit_scaled']
    old=(d/'baseline-python.hbp').read_bytes()
    oldjs=(d/'baseline-node.hbp').read_bytes()
    assert old==oldjs and sha(old)==EXPECTED_OLD,('FROZEN_PHASE_A_DRIFT',sha(old))
    for side in d.glob('*.sha256'):
        items=side.read_text('ascii').split()
        assert len(items)==2 and items[0]==sha((d/items[1]).read_bytes())
    return p

def main():
    if len(sys.argv) not in (2,3):raise SystemExit('verify_round2.py evidence [other_os_evidence]')
    a=Path(sys.argv[1]);p=check(a)
    if len(sys.argv)==3:
        b=Path(sys.argv[2]);q=check(b)
        for name in ('round2-python.hbp','round2-node.hbp','baseline-python.hbp','baseline-node.hbp'):
            assert (a/name).read_bytes()==(b/name).read_bytes(),'CROSS_OS_BYTE_DRIFT:'+name
        assert p==q,'CROSS_OS_METRIC_DRIFT'
    m={r['arm']:r for r in p['metrics'] if r['profile']=='paired_short'}
    print(json.dumps({'status':'PASS','phase_A_frozen_sha256':EXPECTED_OLD,
        'phase_B_sha256':EXPECTED_NEW,'new_snapshots':20412,'site_ticks':1749600,
        'real_faults_exercised':8,'external_source_authentication':'HELD',
        'cross_os_checked':len(sys.argv)==3,
        'paired_short_error_full':m['open_loop_full']['error_sum_abs_scaled'],
        'paired_short_error_feedback_now':m['feedback_now']['error_sum_abs_scaled']},sort_keys=True))
if __name__=='__main__':main()
