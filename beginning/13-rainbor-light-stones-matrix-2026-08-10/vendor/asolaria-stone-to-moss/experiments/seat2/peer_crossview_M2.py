#!/usr/bin/env python3
"""Seat 2 independent ROW-operator peer audit of Seat 3's cross-view theorem.

M2: Enumerate all subsets of six frozen 81-bit observation maps at four
horizons, computing rank/codimension with independently written GF(2) row
elimination. Negative controls distinguish accidental consistency detection
from source recovery and source authentication.

Does not import the Seat 3 solvers or trust their results for calculations.
No physical-host or cryptographic source attestation is claimed.
"""
from __future__ import annotations
import hashlib
import itertools
import json
import sys
from pathlib import Path

N=81
FULL=(1<<N)-1
HORIZONS=(1,10**13,10**13+1,10**13+81)
LAWS={
    "CA150": (0,1,80),
    "CA90": (1,80),
    "CA60": (0,1),
    "CA102": (0,80),
    "TAP1": (0,2),
    "TAP4": (0,1,5,9),
}
FROZEN_CHALLENGE_SHA256="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
SEAT3_HEAD="a1c3573d4e036d21d590d0d1a499a206fd827682"
SEAT3_FULL_SHA256="6bfeccf834d67440e6864039b53767205cf1a85678e05f6f99c89b83ce3b4156"
SCHEMA="ASOLARIA-SEAT2-PEER-RANK-AND-M2-VIEW-SELECTION-V1"

def sha(data): return hashlib.sha256(data).hexdigest()

def rows_of(taps):
    # Output-bit i depends on input-bit (i-t) mod n.
    return [sum(1<<((i-t)%N) for t in taps) for i in range(N)]

def compose(after,before):
    result=[]
    for after_row in after:
        composed=0
        while after_row:
            bit=after_row & -after_row
            composed ^= before[bit.bit_length()-1]
            after_row ^= bit
        result.append(composed)
    return result

def exponentiate(taps,steps):
    result=[1<<i for i in range(N)]
    op=rows_of(taps)
    while steps:
        if steps & 1: result=compose(op,result)
        op=compose(op,op)
        steps >>= 1
    return result

def rank(rows):
    basis={}
    for row in rows:
        while row:
            key=row.bit_length()-1
            if key in basis: row^=basis[key]
            else:
                basis[key]=row
                break
    return len(basis)

def apply(rows,state):
    return sum((((r&state).bit_count() & 1)<<i) for i,r in enumerate(rows))

def common_source_consistent(operator_rows, observed_states):
    """Independent GF(2) row elimination for stacked consistency equations.

    Each observed output bit appends a single RHS bit to the corresponding
    row. A 0=1 residual certifies that NO shared source can explain inputs.
    """
    pivots={}
    for rows,observed in zip(operator_rows,observed_states):
        for output_bit,coefficients in enumerate(rows):
            equation=coefficients
            target=(observed>>output_bit)&1
            while equation:
                top=equation.bit_length()-1
                if top in pivots:
                    old_equation,old_target=pivots[top]
                    equation ^= old_equation
                    target ^= old_target
                else:
                    pivots[top]=(equation,target)
                    break
            if not equation and target:
                return False
    return True


def oracle_small():
    # Exhaustive *independent source states* (NOT forced to share source).
    views=[lambda x:x&0b0011,lambda x:x&0b1110,lambda x:x&0b1101]
    for num,expected in ((2,128),(3,256)):
        image={tuple(f(z) for f in views[:num]) for z in range(16)}
        actual=sum(tuple(views[j](xs[j]) for j in range(num)) in image
                   for xs in itertools.product(range(16), repeat=num))
        assert actual==expected
    return {"pair_valid":128,"pair_all":256,"triple_valid":256,"triple_all":4096}

def main(source_path,out_json,out_hbp):
    assert sha(Path(source_path).read_bytes())==FROZEN_CHALLENGE_SHA256
    frozen=json.loads(Path(source_path).read_text())
    assert frozen["bodies"]==81 and frozen["waves"]==27
    assert frozen["horizons"]==[10**13,10**13+1,10**13+81]
    toy=oracle_small()
    family=[]
    selection=[]
    pair_count=triple_count=subset_count=0
    for h in HORIZONS:
        operators={name:exponentiate(taps,h) for name,taps in LAWS.items()}
        assert rank(operators["CA150"])==79
        assert all(rank(operators[name])==80 for name in LAWS if name!="CA150")
        # Universal nonzero kernel shared by all five even-tap laws.
        assert all(apply(operators[name],FULL)==0 for name in LAWS if name!="CA150")
        assert apply(operators["CA150"],FULL)==FULL
        # Independently find a CA150 kernel vector of period 3.
        kernelA=sum(1<<i for i in range(N) if i%3 in (0,1))
        assert kernelA and apply(operators["CA150"],kernelA)==0
        assert all(apply(operators[name],kernelA)!=0 for name in LAWS if name!="CA150")

        for size in range(1,7):
            for chosen in itertools.combinations(LAWS,size):
                r=rank(list(itertools.chain.from_iterable(operators[x] for x in chosen)))
                sumr=sum(79 if n=="CA150" else 80 for n in chosen)
                codim=sumr-r
                includes_A="CA150" in chosen
                expected=81 if includes_A and size>1 else (79 if includes_A else 80)
                assert r==expected,(h,chosen,r,expected)
                assert codim>=0 and codim<=sumr
                if size==2 and includes_A:
                    assert (r,codim)==(81,78);pair_count+=1
                if size==3 and includes_A:
                    assert (r,codim)==(81,158);triple_count+=1
                family.append({"horizon":str(h),"views":list(chosen),
                               "size":size,"rank":r,
                               "blind_random_consistency_exponent":codim,
                               "full_source_identifiable":r==N})
                subset_count+=1

        # Smallest unit-cost collection attaining stacked rank 81 AND c>=target.
        opt={}
        for target in (78,158,238,318,398):
            eligible=[f for f in family if f["horizon"]==str(h) and f["rank"]==81
                      and f["blind_random_consistency_exponent"]>=target]
            assert eligible
            m=min(f["size"] for f in eligible)
            winners=[f["views"] for f in eligible if f["size"]==m]
            assert m==2+(target-78)//80
            opt[str(target)]={"minimum_views":m,"attaining_sets":winners}
        selection.append({"horizon":str(h),"unit_cost_optimization":opt})

        # A stronger-looking blind false agreement bound can coexist with
        # unidentifiable inputs: B+B has rank 80 and 80 constraints.
        B=operators["CA90"]
        other=operators["CA60"]
        assert rank(B+other)==80
        assert (80+80-rank(B+other))==80
        assert rank(operators["CA150"]+B)==81
        assert (79+80-rank(operators["CA150"]+B))==78
        # A substituted common fake source is fully decodable by every
        # mathematical view. The consistency decoder cannot infer custody.
        x=0
        forged=1<<17
        assert forged!=x
        selected=["CA150","CA90","CA60"]
        views=[operators[name] for name in selected]
        spoofed_outputs=[apply(rows,forged) for rows in views]
        honest_outputs=[apply(rows,x) for rows in views]
        assert common_source_consistent(views,spoofed_outputs)
        assert common_source_consistent(views,honest_outputs)
        # This *mixed* inconsistent experiment is rejected by actual
        # decoder, unlike the coordinated forged-source triple above.
        assert not common_source_consistent(views,[honest_outputs[0],
                                                   spoofed_outputs[1],
                                                   spoofed_outputs[2]])
        # A trusted source/custody commitment distinguishes x and forged.
        assert sha(f"trusted:{x}".encode())!=sha(f"trusted:{forged}".encode())
        # Identical-output attack on each B view from distinct sources.
        assert all(apply(operators[name],x)==apply(operators[name],x^FULL)
                   for name in LAWS if name!="CA150")

    assert subset_count==252 and pair_count==20 and triple_count==40
    # Additional mathematical boundary: without independent draws, same-
    # source observations are accepted with probability 1, not 2^-158.
    result={
        "schema":SCHEMA,
        "date":"2026-10-15","seat":"seat-2 computational peer verification",
        "peer_pr":34,"peer_commit":SEAT3_HEAD,
        "peer_full_trace_sha256_expected":SEAT3_FULL_SHA256,
        "input_sha256":FROZEN_CHALLENGE_SHA256,
        "method":"independent 81x81 GF(2) OUTPUT-ROW transfer/exponentiation and rank elimination",
        "proof":"count the 2^rank(stacked) common-image tuples within product of 2^sum(r_i) individual images",
        "toy_exhaustive":toy,
        "horizons":list(map(str,HORIZONS)),
        "nonempty_view_subsets_checked":subset_count,
        "A_plus_B_pair_configs":pair_count,
        "A_plus_B_plus_C_triple_configs":triple_count,
        "all_subsets":family,
        "unit_cost_m2_selection":selection,
        "counterexamples":{
            "two_B_views_blind_consistency_exponent":80,
            "two_B_views_source_rank":80,
            "A_plus_B_exponent":78,
            "A_plus_B_source_rank":81,
            "all_five_B_share_nonzero_all_ones_kernel":True,
            "same_fake_source_all_views_always_consistent":True,
            "source_authentication_not_implied_by_rank_or_codimension":True,
            "independently_uniform_source_assumption_required_for_probability":True,
            "correlated_same_source_consistency_probability":"1",
        },
        "checks_passed":True,
        "source_host_attestation":False,
        "physical_challenge_issued":False,
        "brown_hilbert_free_centre_not_81st_computational_site":True,
    }
    data=(json.dumps(result,sort_keys=True,indent=2)+"\n").encode()
    Path(out_json).write_bytes(data)
    hbp="\n".join([
        "HBP|schema="+SCHEMA+"|json=0",
        f"FROZEN|peer_pr=34|peer_commit={SEAT3_HEAD}|challenge_sha256={FROZEN_CHALLENGE_SHA256}",
        "THEOREM|P=2^(r-sum_ri)|independent_uniform_sources_only=1|source_authentication=0",
        "EXHAUSTIVE|n=4|pairs=128/256|triples=256/4096",
        "RANK|horizons=4|nonempty_subsets=252|A_B_pairs=20|A_B_C_triples=40",
        "M2|targets=78,158,238,318,398|minimal_unit_view_counts=2,3,4,5,6",
        "NEGATIVE|two_B_rank=80|two_B_constraints=80|A_B_rank=81|A_B_constraints=78",
        "ORIGIN|correlated_forged_source_accepts=1|crossview_not_provenance=1",
        "BOUNDARY|physical_hosts_verified=0|fresh_cross_host_challenge=0|N_NEST_and_QPRISM_source_authentication_separate=1",
        "END|status=PASS|scope=software_Gf2_rank_audit|json=0",
    ])+"\n"
    Path(out_hbp).write_bytes(hbp.encode("ascii"))
    print(json.dumps({"status":"PASS","subsets":subset_count,
                      "pairs":pair_count,"triples":triple_count,
                      "HBP_sha256":sha(hbp.encode("ascii")),
                      "JSON_sha256":sha(data)},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=4:
        raise SystemExit("usage: peer_crossview_M2.py frozen_challenge.json audit.json audit.hbp")
    main(*sys.argv[1:])
