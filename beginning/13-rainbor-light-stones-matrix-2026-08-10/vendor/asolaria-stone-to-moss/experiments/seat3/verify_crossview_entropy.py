#!/usr/bin/env python3
"""Seat 3 reproducible verification of independently implemented full HBP traces."""
import hashlib
import json
import sys
from pathlib import Path

EXPECT_SHA='6bfeccf834d67440e6864039b53767205cf1a85678e05f6f99c89b83ce3b4156'
EXPECT_LENGTH=5906257

def sha(b):return hashlib.sha256(b).hexdigest()

def verify(phpb,nhpb,pjson,njson,stone_dir):
    a=Path(phpb).read_bytes();b=Path(nhpb).read_bytes()
    assert a==b, 'Python / Node full byte output mismatch'
    assert len(a)==EXPECT_LENGTH and sha(a)==EXPECT_SHA,'pinned trace SHA or length mismatch'
    assert b'|physical_hosts_attested=0|' in a.splitlines()[0]
    assert a.count(b'CASE|')==30560
    assert len([s for s in a.splitlines() if s.startswith(b'PAIR|')])==20
    assert len([s for s in a.splitlines() if s.startswith(b'TRIPLE|')])==40
    assert a.endswith(b'physical=0|json=0\n')
    assert sha(bytes([a[0]^1])+a[1:])!=EXPECT_SHA,'tamper not detected'
    pm=json.loads(Path(pjson).read_text());nm=json.loads(Path(njson).read_text())
    for k in ('trace_sha256','trace_bytes','pair_cases','triple_cases','controlled_cases','toy_pair_accept','toy_triple_accept','controls'):
        assert pm[k]==nm[k],('cross-language metrics mismatch',k)
    assert pm['trace_sha256']==EXPECT_SHA and pm['trace_bytes']==EXPECT_LENGTH
    assert len(pm['pairs'])==20 and len(pm['triples'])==40
    assert all(x['ranks']==[79,80] and x['joint_rank']==81 and x['cross_source_constraints']==78 for x in pm['pairs'])
    assert all(x['ranks']==[79,80,80] and x['joint_rank']==81 and x['cross_source_constraints']==158 for x in pm['triples'])
    assert nm['controls']==dict(honest=7640,rejected=7640,alternate_accepted=7640,invisible_B_change=7640)
    base=Path(stone_dir)
    for suffix in ('hbp','json'):
        f=base/('seat3-crossview-consistency-entropy.'+suffix)
        expected=(f.parent/(f.name+'.sha256')).read_text().split()[0]
        assert sha(f.read_bytes())==expected,('invalid sealed summary',suffix)
    stone=json.loads((base/'seat3-crossview-consistency-entropy.json').read_text())
    assert stone['trace_sha256']==EXPECT_SHA and stone['trace_bytes']==EXPECT_LENGTH
    assert stone['negative_controls']==nm['controls']
    assert stone['first_triple_witness']==pm['triples'][0]
    assert all(x['joint_rank']==81 for x in pm['triples'])
    print(json.dumps({'status':'PASS','trace_sha256':EXPECT_SHA,'bytes':EXPECT_LENGTH,
                      'pairs':20,'triples':40,'cases':30560,'toy_pair':128,'toy_triple':256,
                      'tamper_check':'PASS','summary_sidecars':'PASS'},sort_keys=True))

if __name__=='__main__':
    if len(sys.argv)!=6:raise SystemExit('usage: python verify_crossview_entropy.py python.hbp node.hbp python.json node.json stone_dir')
    verify(*sys.argv[1:])
