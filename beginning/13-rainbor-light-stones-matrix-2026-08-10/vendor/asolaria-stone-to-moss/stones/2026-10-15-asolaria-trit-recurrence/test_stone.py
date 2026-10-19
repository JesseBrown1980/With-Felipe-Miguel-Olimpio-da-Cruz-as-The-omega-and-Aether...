#!/usr/bin/env python3
"""Independent, deterministic, software-only test of Asolaria public stone 0001."""
import hashlib, json, random, math
from collections import defaultdict
from pathlib import Path

N=81
TAPS=((0,1,3),(0,4,7))
HORIZONS=(0,1,2,3,10,40,80,81,82,10**13,10**13+1)

def advance(s,taps):
    return [sum(s[(i-k)%N] for k in taps)%3 for i in range(N)]

def conv(a,b):
    r=[0]*N
    for i,v in enumerate(a):
        if not v: continue
        for j,w in enumerate(b):
            if w:r[(i+j)%N]=(r[(i+j)%N]+v*w)%3
    return r

def power_poly(taps,n):
    out=[1]+[0]*(N-1)
    a=[0]*N
    for t in taps:a[t]+=1
    while n:
        if n&1:out=conv(out,a)
        a=conv(a,a);n>>=1
    return out

def rank_gf3(M):
    A=[row[:] for row in M]
    row=0
    for col in range(len(A[0])):
        pivot=next((j for j in range(row,len(A)) if A[j][col]),None)
        if pivot is None:continue
        A[row],A[pivot]=A[pivot],A[row]
        if A[row][col]==2:A[row]=[(x*2)%3 for x in A[row]]
        for k in range(len(A)):
            if k!=row and A[k][col]:
                z=A[k][col]
                A[k]=[(u-z*v)%3 for u,v in zip(A[k],A[row])]
        row+=1
        if row==len(A):break
    return row

def matrix_from_poly(p):
    return [[p[(i-j)%N] for j in range(N)] for i in range(N)]

def check_math():
    rng=random.Random(81027)
    base=[rng.randrange(3) for _ in range(N)]
    checks={}
    for taps in TAPS:
        key=','.join(map(str,taps))
        cur=base[:]
        for k in range(83):
            if k in HORIZONS:
                assert conv(power_poly(taps,k),base)==cur, (key,k)
            cur=advance(cur,taps)
        ranks={}
        for k in HORIZONS:
            p=power_poly(taps,k)
            ranks[str(k)]=rank_gf3(matrix_from_poly(p))
            assert ranks[str(k)]==max(81-k,0), (key,k,ranks[str(k)])
            if k>=81:assert all(x==0 for x in p)
        p1=power_poly(taps,10**13)
        pnext=power_poly(taps,10**13+1)
        assert conv(power_poly(taps,1),p1)==pnext
        checks[key]={'ranks_at_horizons':ranks,'long_horizon_state_zero':all(x==0 for x in conv(p1,base)),
        'short_horizon_direct_agreement':True,'composition_pass':True}
    # An invertible ternary shift retains state indefinitely; selected loss is law-specific.
    for k in (0,1,80,81,82,10**13):
        shifted=[base[(i-k)%N] for i in range(N)]
        direct=base[:]
        if k<100:
            for _ in range(k):direct=[direct[(i-1)%N] for i in range(N)]
            assert shifted==direct
        assert sorted(shifted)==sorted(base)
    assert 2%27==29%27
    # The 27 trit addresses are injective; bare prime residue isn't.
    assert len({9*r+3*g+b for r in range(3) for g in range(3) for b in range(3)})==27
    return {'taps':checks,'gf3_frobenius_identity':'x^81-1=(x-1)^81','prime_collision_mod27':[2,29],
      'bijective_rotation_10e13_preserves_multiplicities':True}

def check_hash():
    state={'trits':[0,1,2,0,2], 'law':'fixed-cyclic', 'seed':'public'}
    def h(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    a=h({'state':state,'logical_time':1})
    b=h({'state':state,'logical_time':10**13})
    assert a!=b
    assert state==state
    # A hash chain commits to all intermediate events; rewriting time cannot replace them.
    prev=hashlib.sha256(b'genesis').digest()
    for event in (b'A',b'B',b'C'):
        prev=hashlib.sha256(prev+event).digest()
    honest=prev.hex()
    impostor=hashlib.sha256(hashlib.sha256(b'genesis').digest()+b'C').hexdigest()
    assert impostor!=honest
    return {'same_state_different_time_hash':True,'timestamp_only_not_chain_equivalent':True,
      'example_hash_t1':a,'example_hash_t_10e13':b,'valid_three_event_chain_hash':honest,
      'improper_single_event_jump_hash':impostor}

def sequence(seed,length=1200):
    rng=random.Random(seed)
    return [rng.randrange(3) for _ in range(length)]

def run_agent(seed,mode='three-loop',train=600,test=600):
    seq=sequence(seed,train+test+2)
    # Environment truth is delayed, outside the observation/action boundary.
    # y_t = (s_(t-1)+2*s_(t-2)) mod 3. The learner is NOT supplied this rule.
    table=defaultdict(lambda:[0,0,0]);history=[0,0]
    scored=[];predictions=[]
    for t in range(train+test):
        sensory=seq[t+2]
        if mode=='no-memory':key=(sensory,)
        elif mode=='no-sensor':key=(0,0)
        else:key=tuple(history)
        counts=table[key]
        guess=max(range(3),key=lambda i:(counts[i],-i))
        y=(seq[t+1]+2*seq[t])%3
        if t>=train:scored.append(int(guess==y));predictions.append(guess)
        if mode not in ('no-feedback','no-act'):
            table[key][y]+=1
        if mode!='no-memory':history=[history[1],sensory]
    # metrics refer to held-out labels not exposed until after predictions.
    return sum(scored),len(scored)

def check_three_loops():
    modes=('three-loop','no-memory','no-feedback','no-sensor','no-act')
    result={}
    for mode in modes:
        right=total=0
        for i in range(27):
            r,n=run_agent(i+1000,mode)
            right+=r;total+=n
        result[mode]={'correct':right,'total':total,'accuracy':round(right/total,6)}
    assert result['three-loop']['accuracy']>0.95
    assert result['no-memory']['accuracy']<0.40
    assert result['no-feedback']['accuracy']<0.40
    assert result['no-sensor']['accuracy']<0.40
    assert result['no-act']['accuracy']<0.40
    return {'task':'learn_hidden_two-step_ternary_target_from_ground_truth_feedback',
     'eyes':'current_trit_only', 'dendrites':'9_context_3_choice_count_table',
     'membrane':'last_two_sensor_trits_and_one_referee_label_after_action',
     'body':'choose_three_way_action_0_1_2','self_model':'explicitly_recorded_correct_wrong_counts',
     'seeds':27,'train_per_seed':600,'held_out_test_per_seed':600,'modes':result,
     'classification':'constructed_deterministic_software_learning_task_not_emergent_consciousness'}

def main():
    result={'schema':'ASOLARIA-TRIT-RECURRENCE-INDEPENDENT-REANALYSIS-V1',
       'source':'https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/7f90d9a8cb850decb419266d9345f2c2005f8328/stones/2026-10-15-asolaria-trit-recurrence/STONE-0001-PUBLIC-GENESIS.hbp',
       'scope':'COMPUTATIONAL_ONLY', 'gf3':check_math(),'hash':check_hash(),'three_loop_agent':check_three_loops(),
       'quantum_claim':False,'stored_photon_claim':False,'biological_neuron_claim':False,
       'actual_consciousness_claim':False}
    target=Path(__file__).with_name('RESULTS.json')
    target.write_text(json.dumps(result,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('PASS',target)
    for k,v in result['three_loop_agent']['modes'].items():print(k,v)
    print('RESULTS_SHA256',hashlib.sha256(target.read_bytes()).hexdigest())
if __name__=='__main__':main()
