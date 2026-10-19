#!/usr/bin/env python3
"""Third implementation: check full 59049-row polynomial witness artifact.

Does not import source solvers or execute their search. Re-derives primitive
classes and nonlinear inverse for every row, compares with original PR81 data.
"""
import hashlib
import json
import math
from pathlib import Path
import re
import sys
from collections import Counter,defaultdict

V2_SHA="8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672"
SCHEMA="ASOLARIA-SEAT3-QUADRATIC-3BIT-WITNESS-V1"
IDENTITY=re.compile(r"IDENTITY\|id=(\d{2})\|rgb=([0-2]{3})\|p=(DARK|[\d,]+)\|side=([0-7])\|class_rank=(\d)\|aff11=(\d{1,2})\Z")
MAP=re.compile(r"MAP\|w=(\d{2})\|loc=(\d{2})\|id=(\d{2})\|p=(DARK|[\d,]+)\|side=([0-7])\|lane=([012H])\|restore=(\d{2})\Z")
SRC=re.compile(r"CASE\|w=(\d{2})\|loc=(\d{2})\|id=(\d{2})\|rgb=([0-2]{3})\|raw=(\d+),(\d+),(\d+)\|prim=(\d+),(\d+),(\d+)\|den=(\d+)\|lane=([012H])\Z")

def digest(x):return hashlib.sha256(x).hexdigest()
def rgb(i):return i//9,(i//3)%3,i%3
def primitive(i):
    r,g,b=rgb(i)
    s=r+g+b
    q=r*r+g*g+b*b-r*g-r*b-g*b
    values=(s*s,q,q)
    divisor=math.gcd(*values)
    return values,tuple(v//divisor for v in values) if divisor else (0,0,0)
def cls(i):
    _,p=primitive(i)
    return ",".join(map(str,p)) if sum(p) else "DARK"
def witness(i):
    r,g,b=rgb(i)
    return (r+4*g+3*b+4*r*g)&7

def verify(output_py,output_js,source_dir,verified):
    a=Path(output_py);b=Path(output_js);source=Path(source_dir)
    files=("witness59049.hbp","witness-result.json")
    for name in files:
        left=(a/name).read_bytes();right=(b/name).read_bytes()
        assert left==right,"INDEPENDENT_PY_NODE_BYTE_MISMATCH"
        for folder in (a,b):
            side=(folder/(name+".sha256")).read_bytes()
            assert side==(digest(left)+"  "+name+"\n").encode("ascii"),"SIDECAR_DRIFT"
    report=json.loads((a/"witness-result.json").read_bytes())
    assert report["schema"]==SCHEMA and report["verdict"]=="PASS"
    assert report["ordered_id_count"]==27
    assert report["normalized_classes_including_dark"]==7
    assert report["valid_normalized_probabilities"]==6
    assert report["max_normalized_equivalence_class"]==6
    assert report["minimum_fixed_class_conditioned_side_bits"]==3
    assert report["fixed_class_plus_witness_total_bits"]==6
    assert report["standalone_direct_ordered_id_fixed_bits"]==5
    assert report["additional_normalized_loss_bits_exact"]=="14/27"
    assert report["mathematical_recovery"] is True
    assert report["digital_integrity_against_pinned_source"] is True
    assert report["externally_authenticated_origin"] is False
    assert report["physical_spectrum_measured"] is False
    assert report["affine_search"][-1]=={
        "modulus":11,"valid_coefficient_triples":60,"first":[1,3,4]}
    assert all(q["valid_coefficient_triples"]==0 for q in report["affine_search"][:-1])
    assert [q["valid_coefficient_quads"] for q in report["degree2_monomial_search"]]==[0,0,0,8,8,8]
    assert report["degree2_monomial_search"][3]["first"]==[1,4,3,4]
    assert sum(x=="HELD" for x in report["negative_controls"].values())==10
    assert report["negative_controls"]["self_consistent_attacker_owned_manifest"]=="ORIGIN_UNAUTHENTICATED"
    assert report["negative_controls"]["wrong_valid_in_class_witness_is_decodable_as_another_id"]=="NEEDS_TRUSTED_SOURCE_BINDING"
    full=(a/"witness59049.hbp").read_bytes()
    assert len(full)==report["full_trace_bytes"] and digest(full)==report["full_trace_sha256"]
    original=(source/"rainbow27/rainbow27-v2.hbp").read_bytes()
    assert len(original)==3886535 and digest(original)==V2_SHA
    rows=full.decode("ascii").splitlines()
    originals=original.decode("ascii").splitlines()
    assert len(rows)==59077 and len(originals)==59050
    assert rows[0]=="PORTAL|schema="+SCHEMA+"|ordered=27|normalized_classes=7|external_origin_authenticated=0"
    groups=defaultdict(list)
    inverse={}
    for i in range(27):
        m=IDENTITY.fullmatch(rows[1+i]);assert m is not None
        R,G,B=rgb(i)
        assert int(m.group(1))==i and m.group(2)==f"{R}{G}{B}"
        assert m.group(3)==cls(i)
        assert int(m.group(4))==witness(i)
        assert int(m.group(5))==len(groups[cls(i)])
        assert int(m.group(6))==(R+3*G+4*B)%11
        key=(cls(i),witness(i))
        assert key not in inverse
        inverse[key]=i
        groups[cls(i)].append(i)
    assert len(inverse)==27 and sorted(map(len,groups.values()))==[1,2,3,3,6,6,6]
    census=Counter()
    for k in range(59049):
        m=MAP.fullmatch(rows[28+k]);v=SRC.fullmatch(originals[1+k])
        assert m is not None and v is not None,(k,"PARSER_DRIFT")
        w,loc,i=k//2187,(k//27)%81,k%27
        assert (int(m.group(1)),int(m.group(2)),int(m.group(3)))==(w,loc,i)
        assert (int(v.group(1)),int(v.group(2)),int(v.group(3)))==(w,loc,i)
        assert m.group(4)==cls(i)
        assert int(m.group(5))==witness(i)
        assert inverse[(m.group(4),int(m.group(5)))]==i
        assert m.group(6)==v.group(12)
        assert int(m.group(7))==i
        census[m.group(6)]+=1
    assert dict(census)=={"H":2187,"0":36906,"1":10179,"2":9777}
    assert report["reconstructed_route_census"]=={"0":36906,"1":10179,"2":9777,"H":2187}
    assert report["verified_original_v2_trace_sha256"]==V2_SHA
    assert abs(float(report["norm_conditional_entropy_uniform_bits"])-2.149596296937324)<1e-10

    out=Path(verified);out.mkdir(parents=True,exist_ok=True)
    for name in files:
        raw=(a/name).read_bytes()
        (out/name).write_bytes(raw)
        (out/(name+".sha256")).write_bytes((digest(raw)+"  "+name+"\n").encode("ascii"))
    info={
        "verdict":"INDEPENDENT_THIRD_WITNESS_CHECK_PASS",
        "identity_count":27,"route_cases":59049,
        "nonlinear_fixed_extra_bits":3,"maximum_class_size":6,
        "source_signed_origin_attested":False,
        "raw_source_v2_sha256":V2_SHA,
        "trace_sha256":digest(full),
        "json_sha256":digest((a/"witness-result.json").read_bytes())
    }
    summary=(json.dumps(info,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
    (out/"witness-independent-check.json").write_bytes(summary)
    (out/"witness-independent-check.json.sha256").write_bytes(
      (digest(summary)+"  witness-independent-check.json\n").encode("ascii"))
    print(json.dumps(info,sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=5:raise SystemExit("usage: python verify_witness.py PY_OUTPUT NODE_OUTPUT PR81_SOURCE_DIR VERIFIED_DIR")
    verify(*sys.argv[1:])
