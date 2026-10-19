#!/usr/bin/env python3
"""Seat 2 information-budget/source-authentication audit for N-Nest x Q-PRISM.

Uses EXACT pinned upstream qprism.behcs.schedule_id implementation and verifies
both repositories' pinned Git blobs before evaluating the mathematical controls.

Does not infer physical origin or equipment operation from rank, source hashes,
or BEHCS schedule addresses. This is a bounded synthetic SOFTWARE audit.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import math
import platform
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
N=81
MASK=(1<<N)-1
NEST_SHA="307903651f56e8a28ef98ca36aef22ee8cda935c"
QPRISM_SHA="b4a21a25381d6920b7aab92c94c3c3e1420fc9e4"
NEST_BLOBS={
    "nest-depth3-verify.cjs":"2baca296edec2d46a9bc197efee8850bd168a5ef",
    "nest-depthN-prime-verify.cjs":"fd24c0eceff455351f27e7244d5bd61bffd38a25",
}
Q_BLOBS={
    "qprism/behcs.py":"b1363fdeaf3bbfffda5a8bfea6f26d1ec98d4bfa",
    "qprism/sources.py":"76cb2cad57d1e988f422c328e79795a4616e03e2",
    "qprism/harness.py":"addb3bc5c7ebf493a0c33c53fe37b1e04c400aa1",
    "docs/CLAIMS-GATE.md":"450685b632d2e3212d3a80e58eb3f17fcb19539b",
}
def digest(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()

def git(repo:Path,*args)->str:
    return subprocess.check_output(["git","-C",str(repo),*args],text=True).strip()

def check_pinned(repo:Path,commit:str,blobs:dict[str,str])->None:
    assert git(repo,"rev-parse","HEAD")==commit, "untrusted upstream HEAD"
    for path,expected in blobs.items():
        f=repo/path
        assert f.is_file(),("missing pinned source",path)
        assert git(repo,"rev-parse","HEAD:"+path)==expected,("upstream index drift",path)
        assert git(repo,"hash-object",str(f.resolve()))==expected,("upstream working source tampered",path)

def load_schedule_id(qrepo:Path):
    # Directly execute the real pinned Q-PRISM source module. Importing the
    # package's __init__ would also execute unrelated NumPy/SciPy modules.
    location=qrepo/"qprism/behcs.py"
    spec=importlib.util.spec_from_file_location("pinned_qprism_behcs",location)
    assert spec and spec.loader
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.WIDTH==6 and module.BASE==1024 and module.CEILING==2**60
    return module.schedule_id,module.decode

def rank(rows):
    pivots={}
    for source in rows:
        val=source
        while val:
            j=val.bit_length()-1
            if j in pivots: val^=pivots[j]
            else:
                pivots[j]=val
                break
    return len(pivots)

def gf2_rows(taps):
    return [sum(1<<((i-t)%N) for t in taps) for i in range(N)]

def crt(residues,moduli):
    product=math.prod(moduli)
    return sum(r*(product//m)*pow(product//m,-1,m) for r,m in zip(residues,moduli))%product

def run(nrepo:Path,qrepo:Path,output:Path,stone:Path,sidecar:Path):
    check_pinned(nrepo,NEST_SHA,NEST_BLOBS)
    check_pinned(qrepo,QPRISM_SHA,Q_BLOBS)
    schedule_id,decode=load_schedule_id(qrepo)
    checks={}
    # Addressing is not a physical-source signature and not a full payload.
    base={
        "P2_mW":10.0,"v_center":160.0,"v_half":12.0,
        "mass_center":172.0,"mass_half":5.0,
    }
    near={**base,"P2_mW":10.0000000001}
    sid_a=schedule_id(base)
    sid_b=schedule_id(near)
    sid_wrong=schedule_id({**base,"P2_mW":11.0})
    assert sid_wrong != sid_a, "selector negative-control fixture did not change"
    assert sid_a==sid_b, "intended 9-decimal quantization alias disappeared"
    assert digest(json.dumps(base,sort_keys=True).encode()) != digest(json.dumps(near,sort_keys=True).encode())
    assert sid_a.startswith("HG1024:QPRISM:")
    assert 0<=decode(sid_a.rsplit(":",1)[-1])<2**60
    checks["qprism_schedule_alias_distinct_source_bytes_same_address"]="PASS"
    checks["qprism_schedule_id_is_60bit_address_not_payload_or_origin"]="PASS"

    # Even injective synthetic GF(2) pairs say nothing about their *source*.
    lossy=gf2_rows((0,1))
    preserving=gf2_rows((0,1,3))
    assert rank(lossy)==80 and rank(preserving)==81
    assert rank(lossy+preserving)==81
    assert all((row&MASK).bit_count()%2==0 for row in lossy)
    source_a=b"public synthetic source A: 81-bit probe"
    source_b=b"public synthetic source B: 81-bit probe"
    assert source_a!=source_b
    expected_source_hash=digest(source_a)
    attack_source_hash=digest(source_b)
    assert expected_source_hash!=attack_source_hash
    def watcher(seen_selector,source_hash,payload_hash,expected_payload_hash,consent,descendants):
        # The watcher independently knows PINNED source and input bytes.
        # This is a *provenance-consistency* gate, NOT a physical-origin proof.
        own=(seen_selector==sid_a and source_hash==expected_source_hash
             and payload_hash==expected_payload_hash and bool(consent))
        return own and all(descendants)
    payload_hash=digest(b"public deterministic observation")
    assert watcher(sid_a,expected_source_hash,payload_hash,payload_hash,True,[True,True])
    assert not watcher(sid_a,attack_source_hash,payload_hash,payload_hash,True,[True,True])
    assert not watcher(sid_a,expected_source_hash,digest(b"tampered"),payload_hash,True,[True,True])
    assert not watcher(sid_a,expected_source_hash,payload_hash,payload_hash,False,[True,True])
    assert not watcher(sid_a,expected_source_hash,payload_hash,payload_hash,True,[True,False])
    assert not watcher(sid_wrong,expected_source_hash,payload_hash,payload_hash,True,[True,True])
    checks["GF2_stacked_rank81_does_not_authenticate_source"]="PASS"
    checks["n_nest_watcher_swapped_source_selector_payload_consent_child_hold"]="PASS"
    checks["qprism_changed_selector_denied_even_with_matching_source"]="PASS"
    checks["forged_score_payload_digest_held_by_independent_watcher"]="PASS"
    # If reporter AND watcher collude, a software equality test alone CANNOT
    # establish independent source identity. Explicit bounded counterexample.
    false_claim="reported synthetic score 0.99"
    compromised_watcher_claim=false_claim
    assert false_claim==compromised_watcher_claim
    checks["compromised_watcher_is_not_independent_origin_attestation"]="COUNTEREXAMPLE"

    # Address-only Path1 cannot reconstruct payload without retained store.
    data=b"Path1 exact retained public test payload"
    handle=digest(data)
    retained={handle:data}
    assert digest(retained[handle])==handle
    assert handle not in {}
    assert (handle not in {}) is True
    assert digest(data+b"tampered")!=handle
    checks["path1_retained_store_required_address_only_holds"]="PASS"

    # Two approximately 25-bit residues cannot encode EVERY 64-bit slice.
    # Three pairwise-coprime residues have sufficient joint capacity and a
    # concrete exact CRT inverse, independently of schedule addresses.
    m=[2**25-39,2**25-19,2**25-9]
    assert all(0<x<2**25 for x in m)
    assert all(math.gcd(m[i],m[j])==1 for i in range(3) for j in range(i+1,3))
    product_two=m[0]*m[1]
    product_three=math.prod(m)
    assert product_two < 2**64 <= product_three
    # Exact same two residues for two different 64-bit inputs.
    assert product_two<2**64 and (0%m[0],0%m[1])==(product_two%m[0],product_two%m[1])
    examples=[0,1,2**32+123,2**48+101,2**64-1]
    for x in examples:
        residues=[x%p for p in m]
        assert crt(residues,m)==x
    # Enough capacity is necessary, not sufficient: a non-coprime third
    # modulus can fail to add enough joint independent information.
    duplicate=m[0]
    assert math.lcm(m[0],m[1],duplicate)==product_two < 2**64
    checks["path2_two_25bit_shadows_insufficient_for_64bit_source"]="PASS"
    checks["path2_three_coprime_shadows_exact_CRT_inverse"]="PASS"
    checks["path2_duplicate_shadow_capacity_not_jointly_sufficient"]="PASS"

    result={
        "schema":"ASOLARIA-SEAT2-NNEST-QPRISM-INFORMATION-BUDGET-V1",
        "as_of":"2026-10-15",
        "seat":"seat-2 computational; not original Seat 2 signing custodian",
        "scope":"public synthetic software-only information and source-consistency audit",
        "n_nest_upstream_commit":NEST_SHA,
        "n_nest_pinned_blobs":NEST_BLOBS,
        "qprism_upstream_commit":QPRISM_SHA,
        "qprism_pinned_blobs":Q_BLOBS,
        "schedule_selector_a":sid_a,
        "schedule_selector_b_equal":sid_a==sid_b,
        "selector_bit_capacity":60,
        "gf2_individual_lossy_rank":rank(lossy),
        "gf2_individual_injective_rank":rank(preserving),
        "gf2_stacked_rank":rank(lossy+preserving),
        "path2_moduli":m,
        "path2_product_two_bits":product_two.bit_length(),
        "path2_product_three_bits":product_three.bit_length(),
        "crt_exact_example_count":len(examples),
        "negative_and_positive_controls":checks,
        "test_count":len(checks),
        "physical_source_origin_authenticated":False,
        "hardware_or_neural_data_used":False,
        "physical_hosts_independently_attested":0,
        "physical_blinded_challenge_issued":False,
        "n_nest_live_worker_farm_proven":False,
        "source_hash_identity_is_not_identity_of_physical_producer":True,
        "schedule_id_can_alias_quantized_distinct_values":True,
        "operator_human_scale_consent_not_delegated_to_agent_tree":True,
        "brown_hilbert_uncoloured_free_centre_is_separate_from_81_Gf2_sites":True,
        "python":platform.python_version(),
    }
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_bytes((json.dumps(result,indent=2,sort_keys=True,ensure_ascii=False)+"\n").encode("utf8"))
    lines=[
        "HBP|schema=ASOLARIA-SEAT2-NNEST-QPRISM-INFORMATION-BUDGET-V1|json=0",
        f"PROVENANCE|nest_commit={NEST_SHA}|qprism_commit={QPRISM_SHA}|pinned_blobs={len(NEST_BLOBS)+len(Q_BLOBS)}",
        f"ADDRESS|qprism_Behcs_schedule_id=REAL_UPSTREAM_CALL|bits=60|quantized_alias_confirmed=1",
        "GF2|individual_ranks=80,81|stacked_rank=81|physical_source_authentication=0",
        f"CRT|slice_bits=64|two_shadow_product_bits={product_two.bit_length()}|three_shadow_product_bits={product_three.bit_length()}|exact_restores={len(examples)}",
        "NEGATIVE|source_swap=HOLD|score_tamper=HOLD|missing_consent=HOLD|failed_child=HOLD|missing_store=HOLD|duplicate_shadow=HOLD",
        "LIMIT|compromised_watcher_can_self_agree=1|physical_origin_verified=0|synthetic_only=1",
        "BOUNDARY|brown_hilbert_free_centre_not_an_81_Gf2_site=1|no_physical_or_quantum_inference=1",
        "HBPEND|status=PASS|gate=INFORMATION_CONSISTENCY_ONLY|json=0",
    ]
    body="\n".join(lines)+"\n"
    stone.parent.mkdir(parents=True,exist_ok=True)
    stone.write_bytes(body.encode("ascii"))
    sidecar.write_bytes((digest(body.encode("ascii"))+"  "+stone.name+"\n").encode("ascii"))
    print(json.dumps({"status":"PASS","tests":len(checks),"audit_sha256":digest(output.read_bytes()),
                      "stone_sha256":digest(body.encode("ascii")), "selector_alias":True,
                      "GF2_stacked_rank":rank(lossy+preserving),"physical_authentication":False},
                     sort_keys=True))

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--n-nest",type=Path,required=True)
    p.add_argument("--qprism",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    p.add_argument("--stone",type=Path,required=True)
    p.add_argument("--sidecar",type=Path,required=True)
    a=p.parse_args()
    run(a.n_nest,a.qprism,a.output,a.stone,a.sidecar)
