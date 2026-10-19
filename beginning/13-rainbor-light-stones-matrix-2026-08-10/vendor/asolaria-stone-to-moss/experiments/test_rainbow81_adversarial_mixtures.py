#!/usr/bin/env python3
"""Synthetic Rainbow81 mixture tests; integer-exact tolerance, NO physical claims."""
import itertools,json
N=81; D=128; T=24; W=(1,3,9,27); G=128
tri=[tuple((i//3//3**j)%3-1 for j in range(3))+(i%3-1,) for i in range(N)]
inv={v:i for i,v in enumerate(tri)}
q=[G*sum(w*x*x for w,x in zip(W,t)) for t in tri]
a=[G*sum(w*x for w,x in zip(W,t)) for t in tri]
assert len(inv)==81 and tri[40]==(0,0,0,0)
def possible(nums,den,tol):
    return [[d for d in (-1,0,1) if abs(50*(n-den*d))<=tol*den] for n in nums]
def exact_candidate(nums,den,tol=T):
    ds=possible(nums,den,tol)
    return inv[tuple(x[0] for x in ds)] if all(len(x)==1 for x in ds) else None
def qok(qnum,den,i,tol=T): return abs(qnum-den*q[i])<=tol*den
p4=p5=ad4=ad5=mid=0
exact=affine=quad=0; wp=set(); wa=set(); witness=None; adv_witness=None
for l,r in itertools.combinations(range(N),2):
    u,v=tri[l],tri[r]
    nums=[u[j]+v[j] for j in range(4)]
    target=exact_candidate(nums,2,0)
    if target is not None:
        exact+=1
        affine+=int(a[l]+a[r]==2*a[target])
        quad+=int(q[l]+q[r]==2*q[target])
    for k in range(1,D):
        nums=[k*u[j]+(D-k)*v[j] for j in range(4)]
        qm=k*q[l]+(D-k)*q[r]
        target=exact_candidate(nums,D)
        if target is not None:
            p4+=1
            if qok(qm,D,target):
                p5+=1;wp.add(k);mid+=int(16<=k<=112)
                if witness is None:witness=[l,r,k,D,target]
        opts=possible(nums,D,2*T)
        if not all(opts):continue
        ad4+=1
        for candidate_trits in itertools.product(*opts):
            candidate=inv[candidate_trits]
            if qok(qm,D,candidate,2*T):
                ad5+=1;wa.add(k)
                if adv_witness is None:adv_witness=[l,r,k,D,candidate]
                break
assert (exact,affine,quad)==(272,272,0)
assert p5>0 and ad5>=p5 and ad4>=p4
tr_exact=tr_four=tr_five=0; triple_witness=None
for l,r,s in itertools.combinations(range(N),3):
    nums=[tri[l][j]+tri[r][j]+tri[s][j] for j in range(4)]
    tr_exact+=int(exact_candidate(nums,3,0) is not None)
    candidate=exact_candidate(nums,3)
    if candidate is not None:
        tr_four+=1
        if qok(q[l]+q[r]+q[s],3,candidate):
            tr_five+=1
            if triple_witness is None:triple_witness=[l,r,s,candidate]
report={
"schema":"RAINBOW81-ADVERSARIAL-MIXTURES-V1","seat":"seat-3",
"evidence_class":"synthetic deterministic CPU integer arithmetic",
"wave_A":{"equal_weight_pairs":3240,"exact_four_aliases":exact,
"affine_survivors":affine,"quadratic_survivors":quad},
"wave_B":{"unequal_pair_cases":3240*127,"four_accepted":p4,
"five_accepted":p5,"five_accepted_mid_weights":mid,
"five_accepted_weight_count":len(wp),"example":[witness]},
"wave_C":{"distinct_triples":85320,"exact_four_aliases":tr_exact,
"four_accepted_with_tolerance":tr_four,
"five_accepted_with_tolerance":tr_five,"example":triple_witness},
"wave_D":{"bounded_adversarial_four_feasible":ad4,
"bounded_adversarial_five_feasible":ad5,
"feasible_weight_count":len(wa),"example":adv_witness,
"meaning":"exists independent +/-24 perturbations on five sensor channels"},
"free_uncoloured_centre_is_not_a_seat":True,
"physical_measurements_performed":False}
print(json.dumps(report,indent=2,sort_keys=True))
