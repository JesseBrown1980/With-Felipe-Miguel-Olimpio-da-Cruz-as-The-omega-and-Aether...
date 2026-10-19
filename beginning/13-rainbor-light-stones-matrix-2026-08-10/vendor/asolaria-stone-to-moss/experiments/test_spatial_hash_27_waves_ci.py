#!/usr/bin/env python3
"""Independent stdlib-only cross-check for 27 spatial hash waves.
A synthetic software dependency test, not GPU, brain, gravity or FTL evidence.
"""
import hashlib
import json
import math

N=81
SEEDS=(0,1,9,17,26,27,40,53,80)
SCALES=(1,1_000_000,1_000_000_000)
LABELS=("HBI","HBP","SHA","SH","HASH")
SCHEMA="ASOLARIA-81-SPATIAL-HASH-CONTROL-V1"

def H(domain,*items):
    x=hashlib.sha256()
    for thing in (domain,*items):
        b=thing if isinstance(thing,bytes) else str(thing).encode()
        x.update(len(b).to_bytes(8,"big"))
        x.update(b)
    return x.hexdigest()

identities=[H(SCHEMA+"|STABLE_ID",i,i//3,i%3) for i in range(N)]
assert len(set(identities))==N

def root(changed=None):
    src=[H(SCHEMA+"|BODY",i,v,"mutated" if i==changed else "base")
         for i,v in enumerate(identities)]
    return H(SCHEMA+"|ROOT",*src)

def cells(root_value):
    return [[H(SCHEMA+"|CELL|"+k,root_value,i,v) for k in LABELS]
            for i,v in enumerate(identities)]

def local(changed=None):
    return [[H(SCHEMA+"|LOCAL|"+k,i,v,"mutated" if i==changed else "base")
             for k in LABELS] for i,v in enumerate(identities)]

def ring_diff(a,b):
    observations={0:sum(x!=y for x,y in zip(a,b))}
    for r in range(1,41):
        def step(v):
            return [H(SCHEMA+"|RING",r,i,v[(i-1)%N],v[i],v[(i+1)%N])
                    for i in range(N)]
        a,b=step(a),step(b)
        if r in (1,2,10,39,40):
            observations[r]=sum(x!=y for x,y in zip(a,b))
    return observations

baseline=root()
base_cells=cells(baseline)
base_local=local()
observed=0
for scale in SCALES:
    coordinates=[(13*i*scale,11*i*scale,7*i*scale) for i in range(N)]
    assert coordinates[0] == (0,0,0)
    assert root()==baseline
    for seed in SEEDS:
        changed=root(seed)
        updated=cells(changed)
        assert changed!=baseline
        assert sum(a!=b for a,b in zip(base_cells,updated))==81
        assert sum(a!=b for a,b in zip(base_cells,updated) for x,y in zip(a,b) if x!=y)==405
        new_local=local(seed)
        assert sum(a!=b for a,b in zip(base_local,new_local))==1
        assert all(base_local[i]==new_local[i] for i in range(N) if i!=seed)
        a=[row[0] for row in base_local]
        b=[row[0] for row in new_local]
        assert ring_diff(a,b)=={0:1,1:3,2:5,10:21,39:79,40:81}
        assert sum(H(SCHEMA+"|COMPLETE",i,*a)!=H(SCHEMA+"|COMPLETE",i,*b)
                   for i in range(N))==81
        observed+=1

distances=[math.dist((0,0,0),(1040*s,880*s,560*s)) for s in SCALES]
assert math.isclose(distances[0]*1_000_000, distances[1], rel_tol=1e-12)
assert math.isclose(distances[0]*1_000_000_000, distances[2], rel_tol=1e-12)
assert observed==27
print(json.dumps({
 "kind":"independent CI cross-check",
 "waves":observed,"bodies":81,"register_changes_per_wave":405,
 "ring_diff_at_rounds":{"0":1,"1":3,"2":5,"10":21,"39":79,"40":81},
 "same_identity_hash_for_distinct_distance_scales":True,
 "distance_from_hash_alone":"not identifiable",
 "physical_FTL_tested":False},indent=2))
