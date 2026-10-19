#!/usr/bin/env python3
"""Seat3 exact three-bit nonlinear rainbow identity witness, independent Python.

Not photons, signed custody, or quantum data. Original PR81 59,049-row
classical qutrit route archive is source-pinned and never rewritten.
"""
from __future__ import annotations
from collections import defaultdict, Counter
from itertools import product
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import sys

V2_SHA="8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672"
SOURCE_SHA="351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1"
SCHEMA="ASOLARIA-SEAT3-QUADRATIC-3BIT-WITNESS-V1"
DOMAIN=b"ASOLARIA-R27-V2|TICKET|"
MONOMIALS=("r2","g2","b2","rg","rb","gb")
CASE=re.compile(r"CASE\|w=(\d{2})\|loc=(\d{2})\|id=(\d{2})\|rgb=([0-2]{3})\|raw=(\d+),(\d+),(\d+)\|prim=(\d+),(\d+),(\d+)\|den=(\d+)\|lane=([012H])\Z")

def digest(x):return hashlib.sha256(x).hexdigest()
def need(ok,why):
    if not ok:raise ValueError(why)

def color(idx):
    need(type(idx) is int and 0<=idx<27,"INVALID_SECTOR")
    return idx//9,(idx//3)%3,idx%3

def qutrit(idx):
    r,g,b=color(idx)
    s=r+g+b
    q=r*r+g*g+b*b-r*g-r*b-g*b
    raw=(s*s,q,q)
    need(sum(raw)==3*(r*r+g*g+b*b),"FOURIER_IDENTITY")
    divisor=math.gcd(*raw)
    return raw,tuple(x//divisor for x in raw) if divisor else (0,0,0)

def classname(prim):
    return "DARK" if not sum(prim) else ",".join(str(v) for v in prim)

def witness(idx):
    r,g,b=color(idx)
    return (r+4*g+3*b+4*r*g)%8

def affine(idx,a,b,c,m):
    r,g,bl=color(idx)
    return (a*r+b*g+c*bl)%m

def quadratic(idx,a,b,c,d,monomial):
    r,g,bl=color(idx)
    terms=(r*r,g*g,bl*bl,r*g,r*bl,g*bl)
    v=terms[MONOMIALS.index(monomial)]
    return (a*r+b*g+c*bl+d*v)%8

def lane(w,loc,prim):
    total=sum(prim)
    if not total:return "H"
    bound=((1<<256)//total)*total
    for retry in range(10000):
        ticket=int.from_bytes(hashlib.sha256(DOMAIN+struct.pack("<HHI",w,loc,retry)).digest(),"big")
        if ticket<bound:
            value=ticket%total
            return "0" if value<prim[0] else "1" if value<prim[0]+prim[1] else "2"
    raise ValueError("TICKET_REJECTION_OVERFLOW")

def signatures():
    byclass=defaultdict(list)
    byraw=defaultdict(list)
    for idx in range(27):
        raw,prim=qutrit(idx)
        byclass[classname(prim)].append(idx)
        byraw[raw].append(idx)
    need(len(byclass)==7 and len(byraw)==10,"BASE_CLASSES_WRONG")
    need(sorted(map(len,byclass.values()))==[1,2,3,3,6,6,6],"NORM_GROUP_SIZES")
    need(sorted(map(len,byraw.values()))==[1,1,1,3,3,3,3,3,3,6],"RAW_GROUP_SIZES")
    return byclass,byraw

def validate_witness_class(class_map):
    decode={}
    for name,ids in class_map.items():
        for idx in ids:
            w=witness(idx)
            need((name,w) not in decode,"THREE_BIT_WITNESS_COLLISION")
            decode[(name,w)]=idx
    need(len(decode)==27,"LOST_IDENTITIES")
    for idx in range(27):
        _,primitive=qutrit(idx)
        need(decode[(classname(primitive),witness(idx))]==idx,"NOT_BIJECTIVE")
    need(max(len(x) for x in class_map.values())==6,"MAX_CLASS_CHANGED")
    return decode

def exhaustive_affine(groups):
    results=[]
    for m in range(2,12):
        count=0
        first=None
        for a,b,c in product(range(m),repeat=3):
            if all(len({affine(i,a,b,c,m) for i in members})==len(members)
                   for members in groups.values()):
                count+=1
                if first is None:first=[a,b,c]
        results.append({"modulus":m,"valid_coefficient_triples":count,
                        "first":first})
    need([v["valid_coefficient_triples"] for v in results]==
         [0,0,0,0,0,0,0,0,0,60],"AFFINE_EXHAUSTIVE_COUNTEREXAMPLE")
    need(results[-1]["first"]==[1,3,4],"AFFINE_FIRST_DRIFT")
    return results

def exhaustive_quadratic(groups):
    summary=[]
    for term in MONOMIALS:
        count=0;first=None
        for a,b,c,d in product(range(8),repeat=4):
            if all(len({quadratic(i,a,b,c,d,term) for i in members})==len(members)
                   for members in groups.values()):
                count+=1
                if first is None:first=[a,b,c,d]
        summary.append({"monomial":term,"valid_coefficient_quads":count,"first":first})
    need([x["valid_coefficient_quads"] for x in summary]==[0,0,0,8,8,8],
         "QUADRATIC_SEARCH_DRIFT")
    need(summary[3]["first"]==[1,4,3,4],"FIRST_RG_WITNESS_DRIFT")
    return summary

def exact_source_rows(v2_blob,decoded):
    need(len(v2_blob)==3886535 and digest(v2_blob)==V2_SHA,"ORIGINAL_V2_SHA_HELD")
    rows=v2_blob.decode("ascii").splitlines()
    need(len(rows)==59050 and v2_blob.endswith(b"\n"),"ORIGINAL_V2_ROWS_HELD")
    need(rows[0].startswith("R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|")
         and f"source_sha256={SOURCE_SHA}" in rows[0],"WRONG_ORIGINAL_ANCHOR")
    output=[]
    census=Counter()
    for n,row in enumerate(rows[1:]):
        m=CASE.fullmatch(row)
        need(m is not None,"MALFORMED_PUBLISHED_CASE")
        w,loc,idx=map(int,m.groups()[:3])
        need((w,loc,idx)==(n//2187,(n//27)%81,n%27),"SOURCE_SEQUENCE_REPLAY_HELD")
        red,green,blue=color(idx)
        need(m.group(4)==f"{red}{green}{blue}","SOURCE_RGB_MISMATCH")
        raw,prim=qutrit(idx)
        need(tuple(map(int,m.groups()[4:7]))==raw,"SOURCE_RAW_WEIGHTS_MISMATCH")
        need(tuple(map(int,m.groups()[7:10]))==prim,"SOURCE_PRIMITIVE_MISMATCH")
        need(int(m.group(11))==sum(prim),"SOURCE_TOTAL_MISMATCH")
        actual=lane(w,loc,prim)
        need(actual==m.group(12),"FORGED_LANE_HELD")
        klass=classname(prim)
        side=witness(idx)
        need(decoded[(klass,side)]==idx,"LOSSLESS_ORDER_GUARD")
        census[actual]+=1
        output.append(f"MAP|w={w:02d}|loc={loc:02d}|id={idx:02d}"
                      f"|p={klass}|side={side}|lane={actual}|restore={idx:02d}")
    need(census=={"0":36906,"1":10179,"2":9777,"H":2187},"ROUTE_CENSUS_WRONG")
    return output,census

def verify_packet(expected_id,claimed_p,claimed_w,claimed_lane,wave,loc,
                  expected_wave=None,expected_location=None,anchor=True):
    need(anchor,"ORIGIN_UNAUTHENTICATED")
    need(wave==expected_wave and loc==expected_location,"STALE_CONTEXT_HELD")
    raw,prim=qutrit(expected_id)
    need(claimed_p==classname(prim),"SOURCE_CLASS_MISMATCH")
    need(claimed_w==witness(expected_id),"SOURCE_ORDER_WITNESS_MISMATCH")
    need(claimed_lane==lane(wave,loc,prim),"SOURCE_LANE_MISMATCH")
    return True

def adversaries(groups,decoded,case_rows):
    # Wrong class/witness MAY be a valid encoding of a DIFFERENT source.
    candidate=next((name,ids[0],ids[1]) for name,ids in groups.items() if len(ids)>1)
    klass,left,right=candidate
    need(decoded[(klass,witness(right))]==right and left!=right,
         "EXPLICIT_STRUCTURAL_SPOOF_MISSING")
    bad={}
    def expect_held(key,fn):
        try:fn()
        except (ValueError,IndexError,KeyError,TypeError):
            bad[key]="HELD"
            return
        raise AssertionError("FORGED_PACKET_ACCEPTED:"+key)
    idx=1;_,prim=qutrit(idx)
    name=classname(prim);w=witness(idx);valid=lane(0,0,prim)
    expect_held("wrong_witness_with_valid_other_identity",lambda:
        verify_packet(left,klass,witness(right),lane(0,0,qutrit(left)[1]),0,0,0,0))
    expect_held("wrong_normalized_probability_class",lambda:
        verify_packet(idx,"1,0,0",w,valid,0,0,0,0))
    expect_held("witness_erased",lambda:
        verify_packet(idx,name,None,valid,0,0,0,0))
    expect_held("stale_wave_sequence",lambda:
        verify_packet(idx,name,w,valid,1,0,0,0))
    expect_held("wrong_location",lambda:
        verify_packet(idx,name,w,valid,0,1,0,0))
    expect_held("wrong_route",lambda:
        verify_packet(idx,name,w,"2" if valid!="2" else "1",0,0,0,0))
    expect_held("no_trusted_source_anchor",lambda:
        verify_packet(idx,name,w,valid,0,0,0,0,False))
    expect_held("invalid_out_of_range_id",lambda:qutrit(27))
    expect_held("dark_is_not_valid_probability",lambda:
        verify_packet(0,"1,0,0",0,"0",0,0,0,0))
    expect_held("tampered_original_trace_byte",lambda:
        need(digest(case_rows[:-1]+b"x")==V2_SHA,"ORIGINAL_ROOT_TAMPERED"))
    need(len(bad)==10,"NEGATIVE_TEST_COVERAGE")
    # Crucially: a swapped sideband paired with matching swapped source is a
    # VALID codeword, not a proof of origin. External source pin is essential.
    bad["self_consistent_attacker_owned_manifest"]="ORIGIN_UNAUTHENTICATED"
    bad["wrong_valid_in_class_witness_is_decodable_as_another_id"]="NEEDS_TRUSTED_SOURCE_BINDING"
    return bad

def write_file(dest,name,raw):
    (dest/name).write_bytes(raw)
    (dest/(name+".sha256")).write_bytes((digest(raw)+"  "+name+"\n").encode("ascii"))

def main(original_artifact,output):
    original=Path(original_artifact)/"rainbow27/rainbow27-v2.hbp"
    source=original.read_bytes()
    classes,raw_classes=signatures()
    decoder=validate_witness_class(classes)
    affine_results=exhaustive_affine(classes)
    quadratic_results=exhaustive_quadratic(classes)
    cases,census=exact_source_rows(source,decoder)
    bad=adversaries(classes,decoder,source)
    class_rows=[]
    for idx in range(27):
        r,g,b=color(idx);raw,prim=qutrit(idx);name=classname(prim)
        rank=classes[name].index(idx)
        class_rows.append(f"IDENTITY|id={idx:02d}|rgb={r}{g}{b}|p={name}"
                          f"|side={witness(idx)}|class_rank={rank}|aff11={affine(idx,1,3,4,11)}")
    trace=("\n".join(
        [f"PORTAL|schema={SCHEMA}|ordered=27|normalized_classes=7|external_origin_authenticated=0"]+
        class_rows+cases)+"\n").encode("ascii")
    hraw=(18*math.log2(3)+6*math.log2(6))/27
    hnorm=(18*math.log2(6)+6*math.log2(3)+2*math.log2(2))/27
    need(abs((hnorm-hraw)-14/27)<1e-12,"ENTROPY_DIFF_MISMATCH")
    source_identity={
      "schema":SCHEMA,
      "verdict":"PASS","ordered_id_count":27,
      "normalized_classes_including_dark":7,
      "valid_normalized_probabilities":6,
      "raw_intensity_classes":10,
      "normalized_class_sizes":sorted(map(len,classes.values())),
      "max_normalized_equivalence_class":6,
      "minimum_fixed_class_conditioned_side_bits":3,
      "extra_class_label_fixed_bits":3,
      "fixed_class_plus_witness_total_bits":6,
      "standalone_direct_ordered_id_fixed_bits":5,
      "quadratic_formula":"(r+4g+3b+4rg)%8",
      "quadratic_witness_modulus":8,
      "mathematical_inverse_total":27,
      "normalized_class_members":[{"signature":sig,"ids":ids} for sig,ids in classes.items()],
      "affine_search":affine_results,
      "degree2_monomial_search":quadratic_results,
      "raw_conditional_entropy_uniform_bits":f"{hraw:.12f}",
      "norm_conditional_entropy_uniform_bits":f"{hnorm:.12f}",
      "additional_normalized_loss_bits_exact":"14/27",
      "verified_original_v2_trace_sha256":V2_SHA,
      "verified_original_v2_rows":59049,
      "reconstructed_route_census":{a:census[a] for a in ("0","1","2","H")},
      "full_trace_bytes":len(trace),
      "full_trace_sha256":digest(trace),
      "negative_controls":bad,
      "mathematical_recovery":True,
      "digital_integrity_against_pinned_source":True,
      "externally_authenticated_origin":False,
      "physical_spectrum_measured":False,
    }
    report=(json.dumps(source_identity,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
    dest=Path(output);dest.mkdir(parents=True,exist_ok=True)
    write_file(dest,"witness59049.hbp",trace)
    write_file(dest,"witness-result.json",report)
    print(json.dumps({"verdict":"PASS","witness":"quadratic_mod8","source_cases":59049,
                      "affine11_count":affine_results[-1]["valid_coefficient_triples"],
                      "quadratic_rg_count":quadratic_results[3]["valid_coefficient_quads"],
                      "hbp_sha256":digest(trace),"json_sha256":digest(report)},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=3:raise SystemExit("usage: python quadratic_witness.py SOURCE81_PR81_ACTIONS_DIR OUT_DIR")
    main(*sys.argv[1:])
