#!/usr/bin/env python3
"""Seat 4 independent GF(2)[x] certificate for Seat 3's cross-view rank theorem.

This uses Euclidean polynomial GCD and quotient-ring structure, NOT Seat 3's
Gaussian elimination, transfer matrices or cyclic polynomial implementation.
We preregistered all predictions BEFORE writing this program.

The certificate establishes rank facts for all positive horizons for this
specific square-free modulus; no provenance, physical independence or
cryptographic authentication is inferred from linear consistency.
"""
from __future__ import annotations
import argparse
import hashlib
import itertools
import json
from pathlib import Path

N=81
MOD=(1<<N)|1                       # over GF(2), x^81-1 == x^81+1
T=10_000_000_000_000
LAWS={
    "CA150": (0,1,80),
    "CA90": (1,80),
    "CA60": (0,1),
    "CA102": (0,80),
    "TAP1": (0,2),
    "TAP4": (0,1,5,9),
}
B_NAMES=tuple(k for k in LAWS if k!="CA150")
SOURCE_COMMIT="a1c3573d4e036d21d590d0d1a499a206fd827682"
PREREG_COMMIT="087e699535cf37172986d0b453d26f2d4719318e"
SOURCE_SHA="6bfeccf834d67440e6864039b53767205cf1a85678e05f6f99c89b83ce3b4156"
CHECK_HORIZONS=(1,2,3,7,81,82,1000,T,T+1,T+81,10**100)

def deg(x: int) -> int:
    return x.bit_length()-1

def divmod2(a: int, b: int) -> tuple[int,int]:
    if b==0: raise ZeroDivisionError("zero polynomial")
    quotient=0
    while a and deg(a)>=deg(b):
        d=deg(a)-deg(b)
        quotient^=1<<d
        a^=b<<d
    return quotient,a

def rem(a: int, b: int) -> int:
    return divmod2(a,b)[1]

def gcd2(a: int, b: int) -> int:
    while b:a,b=b,rem(a,b)
    return a

def mul(a: int, b: int) -> int:
    c=0
    while b:
        if b&1:c^=a
        a<<=1
        b>>=1
    return c

def powmod2(base: int, exponent: int, modulus: int) -> int:
    assert exponent>=0
    result=1
    base=rem(base,modulus)
    while exponent:
        if exponent&1:result=rem(mul(result,base),modulus)
        base=rem(mul(base,base),modulus)
        exponent>>=1
    return result

def tap_poly(taps: tuple[int,...]) -> int:
    x=0
    for t in taps:x^=1<<t
    return x

def rank(factors: tuple[int,...], modulus: int) -> int:
    d=modulus
    for f in factors:d=gcd2(d,f)
    return deg(modulus)-deg(d)

def pop_rank_h(factors: tuple[int,...], h: int, modulus: int) -> int:
    return rank(tuple(powmod2(f,h,modulus) for f in factors),modulus)

def sha(data: bytes)->str:
    return hashlib.sha256(data).hexdigest()

def toy_exact(modulus: int, n: int, polys: tuple[int,...]) -> dict:
    outputs=[[rem(mul(p,x),modulus) for x in range(1<<n)] for p in polys]
    diagonal={tuple(cols[x] for cols in outputs) for x in range(1<<n)}
    compatible=0
    for srcs in itertools.product(range(1<<n),repeat=len(polys)):
        obs=tuple(outputs[i][s] for i,s in enumerate(srcs))
        compatible+=(obs in diagonal)
    single_ranks=[rank((p,),modulus) for p in polys]
    stacked=rank(polys,modulus)
    count_formula=1<<(len(polys)*n-sum(single_ranks)+stacked)
    assert compatible==count_formula
    return {"ranks":single_ranks,"stacked_rank":stacked,"source_tuples":1<<(len(polys)*n),
            "compatible_tuples":compatible,"predicted_tuples":count_formula}

def test_gf2_polynomial_axioms():
    # Independently check exact division and Euclidean GCD on all small
    # nonnegative polynomials of degree < 5.
    checks=0
    for a in range(32):
        for b in range(1,32):
            q,r=divmod2(a,b)
            assert a==(mul(q,b)^r),("broken polynomial division",a,b)
            assert r==0 or deg(r)<deg(b)
            g=gcd2(a,b)
            assert g!=0
            assert rem(a,g)==rem(b,g)==0
            checks+=1
    assert checks==992
    return checks

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--receipt",type=Path,required=True)
    args=parser.parse_args()
    division_checks=test_gf2_polynomial_axioms()
    dpoly={name:tap_poly(taps) for name,taps in LAWS.items()}
    # Formal derivative in characteristic 2 keeps exponents that are odd.
    derivative=(1<<(N-1))             # (x^81+1)' = x^80 in GF(2)
    squarefree=gcd2(MOD,derivative)==1
    assert squarefree and gcd2(MOD,derivative)==1
    gc={name:gcd2(poly,MOD) for name,poly in dpoly.items()}
    assert gc["CA150"]==0b111        # x^2 + x + 1
    assert all(gc[name]==0b11 for name in B_NAMES)  # x + 1
    ranks={name:N-deg(g) for name,g in gc.items()}
    assert ranks=={"CA150":79,"CA90":80,"CA60":80,"CA102":80,"TAP1":80,"TAP4":80}
    # Literal all-ones source vector: each B map annihilates it, A preserves it.
    allones=(1<<N)-1
    for name in B_NAMES:
        assert rem(mul(dpoly[name],allones),MOD)==0
    assert rem(mul(dpoly["CA150"],allones),MOD)==allones
    # Exhaust all 63 distinct view selections, even when they don't include A.
    subset_rows=[]
    fullrank=rank80=rank79=0
    for count in range(1,7):
        for names in itertools.combinations(LAWS,count):
            ps=tuple(dpoly[n] for n in names)
            joint=rank(ps,MOD)
            codim=sum(ranks[n] for n in names)-joint
            assert codim>=0
            if "CA150" in names:
                expect=79 if len(names)==1 else 81
            else:expect=80
            assert joint==expect,("preregistered subset rank false",names,joint)
            if joint==81:fullrank+=1
            elif joint==80:rank80+=1
            elif joint==79:rank79+=1
            else:raise AssertionError("unexpected rank")
            subset_rows.append({"views":list(names),"unit_cost":count,
                                "individual_rank_sum":sum(ranks[n] for n in names),
                                "joint_rank":joint,
                                "consistency_codimension":codim,
                                "blind_acceptance_probability":f"2^-{codim}",
                                "unique_recovery_of_81bit_source":joint==N})
    assert len(subset_rows)==63 and (fullrank,rank80,rank79)==(31,31,1)
    for names,codim in [(("CA150","CA90"),78),(("CA150","CA90","CA60"),158),
                         (("CA90","CA60"),80),(("CA90","CA60","CA102"),160)]:
        record=next(x for x in subset_rows if x["views"]==list(names))
        assert record["consistency_codimension"]==codim
        assert record["unique_recovery_of_81bit_source"]==("CA150" in names)
    target_certificates=[]
    for target,expected_count in [(78,2),(158,3),(238,4),(318,5),(398,6)]:
        eligible=[x for x in subset_rows if x["unique_recovery_of_81bit_source"]
                  and x["consistency_codimension"]>=target]
        assert eligible
        mincost=min(x["unit_cost"] for x in eligible)
        assert mincost==expected_count
        assert all(x["unit_cost"]>=mincost for x in eligible)
        target_certificates.append({"min_codimension":target,
                                    "unit_cost_minimum":mincost,
                                    "admissible_full_rank_subsets":len(eligible)})
    # Check several concrete positive horizons, including the 10^13 and huge
    # 10^100 probes, against theorem for *all* positive horizons.
    for h in CHECK_HORIZONS:
        for name,poly in dpoly.items():
            assert pop_rank_h((poly,),h,MOD)==ranks[name]
        for row in subset_rows:
            if h in (1,2,T,T+81,10**100):
                ps=tuple(dpoly[n] for n in row["views"])
                assert pop_rank_h(ps,h,MOD)==row["joint_rank"],(h,row["views"])
    # A small exhaustive oracle uses only integer truth tables, no ranks from
    # the source verifier, over 8^2/8^3 independently uniform source tuples.
    toyM=(1<<3)|1
    toyA=0b111  # x^2 + x + 1
    toyB=0b011  # x+1
    toyC=0b101  # x^2+1
    toy={
        "A_B":toy_exact(toyM,3,(toyA,toyB)),
        "B_C":toy_exact(toyM,3,(toyB,toyC)),
        "A_B_C":toy_exact(toyM,3,(toyA,toyB,toyC)),
    }
    assert (toy["A_B"]["compatible_tuples"],toy["B_C"]["compatible_tuples"],
            toy["A_B_C"]["compatible_tuples"])==(64,16,128)
    # The horizon invariance needs square-free modulus. n=4 is EVEN,
    # x^4+1=(x+1)^4: rank decreases upon taking the 4th power.
    non_squarefree=(1<<4)|1
    # In characteristic 2 the derivative of x^4+1 is ZERO (4=0 mod 2).
    # The first attempted test incorrectly used x^3; that defective
    # derivative assertion failed in hosted run 38716127396. Correction is
    # appended here, not silently concealed.
    assert gcd2(non_squarefree,0)==non_squarefree
    f=0b11
    rank_h1=pop_rank_h((f,),1,non_squarefree)
    rank_h4=pop_rank_h((f,),4,non_squarefree)
    assert (rank_h1,rank_h4)==(3,0)
    report={
        "schema":"ASOLARIA-SEAT4-INDEPENDENT-CROSSVIEW-POLYGCD-V1",
        "seat":"seat-4",
        "status":"MEASURED_PASS",
        "peer_source_pr":34,"peer_source_commit":SOURCE_COMMIT,
        "peer_original_trace_sha256":SOURCE_SHA,
        "prereg_commit":PREREG_COMMIT,
        "method":"binary polynomial Euclidean gcd, ideal/kernel theorem, not peer Gaussian elimination",
        "polynomial_modulus":"x^81+1 over GF(2)",
        "modulus_squarefree":True,
        "derivative_polynomial":"x^80",
        "rank_horizon_scope":"all positive integer horizons via square-free modulus theorem",
        "positive_horizons_explicitly_checked":[str(h) for h in CHECK_HORIZONS],
        "gcd_results":{k:{"binary_polynomial_hex":hex(v),"degree":deg(v)} for k,v in gc.items()},
        "individual_ranks":ranks,
        "subset_count":63,"full_rank_subsets":31,
        "rank80_subsets":31,"rank79_subsets":1,
        "subset_proofs":subset_rows,
        "minimum_unit_view_cost_certificates":target_certificates,
        "stronger_blind_detection_can_fail_recovery":True,
        "all_rank80_views_share_allones_kernel":True,
        "ca150_maps_allones_to_itself":True,
        "small_polynomial_division_and_gcd_checks":division_checks,
        "toy_exact_uniform_source_counts":toy,
        "non_squarefree_counterexample":{"n":4,"f":"x+1","rank_h1":3,"rank_h4":0},
        "scope":"finite GF(2) cyclic digital maps, uniformly blind source draws; software only",
        "independent_source_identity_attested":False,
        "physical_host_independence_attested":False,
        "adversarial_forgery_success_upper_bound_claimed":False,
        "measured_is":{
            "subject":"81-bit Asolaria six cyclic operator ranks at all h>=1",
            "is":"63 nonempty subsets: 31 stacked rank81, 31 rank80, 1 rank79; all B-only share an allones kernel",
            "obtained":"python experiments/seat4/crossview_polygcd_certificate.py --receipt <path>",
            "falsifier":"a polynomial GCD disagreeing with named values, a subset whose stacked rank disagrees, or a positive horizon violating the square-free argument",
            "scope":"these six frozen polynomial taps over GF(2) quotient by x^81+1; prereg commit "+PREREG_COMMIT
        }
    }
    data=(json.dumps(report,sort_keys=True,indent=2,ensure_ascii=True)+"\n").encode("ascii")
    args.receipt.parent.mkdir(parents=True,exist_ok=True)
    args.receipt.write_bytes(data)
    args.receipt.with_name(args.receipt.name+".sha256").write_text(
        sha(data)+"  "+args.receipt.name+"\n",encoding="ascii",newline="\n")
    print(json.dumps({"status":"MEASURED_PASS","sha256":sha(data),
       "subsets":63,"full_rank":fullrank,"rank80":rank80,"rank79":rank79,
       "toy_cases":64+512,"all_horizon_theorem":"squarefree_GCD",
       "stronger_blind_detection_not_unique_recovery":True},
       sort_keys=True))

if __name__=="__main__":
    main()
