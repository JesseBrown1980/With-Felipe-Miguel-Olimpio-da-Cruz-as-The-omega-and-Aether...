#!/usr/bin/env python3
"""Seat 3 exact-rational normalization correction, independently enumerated in Python.

This is a finite classical-digital qutrit intensity test, NOT quantum measurement
or physical 27-wavelength rainbow sensing. Original 52,488-row source is frozen.
"""
from __future__ import annotations

from collections import defaultdict
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import sys

SCHEMA="ASOLARIA-SEAT3-ROUND3-NORMALIZED-INTENSITY-V1"
SEED=b"ASOLARIA-LIGHT-BEING-ROUND3-20261015"
def sha(raw):return hashlib.sha256(raw).hexdigest()
def frac_string(x:Fraction):return f"{x.numerator}/{x.denominator}"

def signatures(rgb):
    r,g,b=rgb
    s=r+g+b
    n=r*r+g*g+b*b
    q=n-r*g-g*b-r*b
    assert q>=0 and s*s+2*q==3*n
    raw=(s*s,q,q)
    if n==0:
        assert rgb==(0,0,0)
        return raw,None
    return raw,tuple(Fraction(x,3*n) for x in raw)

def sampler(rgb,wave,addr):
    raw,normalized=signatures(rgb)
    if normalized is None:raise ValueError("ZERO_NORM_HELD")
    denominator=sum(raw)
    cutoff=((1<<256)//denominator)*denominator
    rejects=0
    while rejects<10000:
        ticket=int.from_bytes(hashlib.sha256(
            SEED+b"|BORN-THRESHOLD|"+
            wave.to_bytes(2,"little")+addr.to_bytes(2,"little")+
            rejects.to_bytes(4,"little")
        ).digest(),"big")
        if ticket<cutoff:
            u=ticket%denominator
            lane=0 if u<raw[0] else 1 if u<raw[0]+raw[1] else 2
            return {"lane":lane,"modulo_remainder":u,
                    "total":denominator,"rejects":rejects}
        rejects+=1
    raise AssertionError("IMPOSSIBLE_REJECTION")

def serialize(raw,normalized):
    return ",".join(str(v) for v in raw),(
        "UNDEFINED" if normalized is None else
        ",".join(frac_string(f) for f in normalized)
    )

def class_entries(d):
    return [
        {"signature":key,"addresses":sorted(indices)}
        for key,indices in sorted(d.items(),key=lambda e:min(e[1]))
    ]

def run(output):
    raw_classes=defaultdict(list)
    normalized_classes=defaultdict(list)
    lines=[]
    for r in range(3):
        for g in range(3):
            for b in range(3):
                rgb=(r,g,b)
                addr=9*r+3*g+b
                raw,prob=signatures(rgb)
                raw_string,prob_string=serialize(raw,prob)
                raw_classes[raw_string].append(addr)
                normalized_classes[prob_string].append(addr)
                lines.append(f"NORM|addr={addr:02d}|r={r}|g={g}|b={b}"
                             f"|raw={raw_string}|normalized={prob_string}"
                             f"|valid={int(prob is not None)}|json=0")
    raw_sizes=sorted(len(x) for x in raw_classes.values())
    norm_sizes=sorted(len(x) for x in normalized_classes.values())
    assert raw_sizes==[1,1,1,3,3,3,3,3,3,6]
    assert norm_sizes==[1,2,3,3,6,6,6]
    assert len(raw_classes)==10 and len(normalized_classes)==7
    assert normalized_classes["UNDEFINED"]==[0]
    assert sum(1 for name in normalized_classes if name!="UNDEFINED")==6

    original=(1,0,0)
    scaled=(2,0,0)
    assert signatures(original)[0]!=signatures(scaled)[0]
    assert signatures(original)[1]==signatures(scaled)[1]
    assert signatures((1,1,1))[1]==signatures((2,2,2))[1]
    for triple in ((1,0,0),(1,1,0),(1,2,0),(1,1,2)):
        import itertools
        assert len(set(signatures(v)[0] for v in itertools.permutations(triple)))==1
        assert len(set(signatures(v)[1] for v in itertools.permutations(triple)))==1
    sample1,sample2=sampler(original,0,1),sampler(scaled,0,1)
    assert (sample1["lane"],sample1["modulo_remainder"],sample1["total"])==(2,2,3)
    assert (sample2["lane"],sample2["modulo_remainder"],sample2["total"])==(1,5,12)

    h_raw=sum((size/27)*math.log2(size) for size in raw_sizes)
    h_norm=sum((size/27)*math.log2(size) for size in norm_sizes)
    assert abs(h_raw-((18*math.log2(3)+6*math.log2(6))/27))<1e-14
    assert abs(h_norm-((18*math.log2(6)+6*math.log2(3)+2*math.log2(2))/27))<1e-14
    assert abs(h_raw-1.6310777784188053)<1e-12
    assert abs(h_norm-2.149596296937324)<1e-12
    d={
        "schema":SCHEMA,
        "status":"PASS",
        "ordered_trit_addresses":27,
        "raw_intensity_class_count":len(raw_classes),
        "raw_class_sizes":raw_sizes,
        "raw_classes":class_entries(raw_classes),
        "normalized_or_undefined_class_count":len(normalized_classes),
        "valid_normalized_probability_classes":6,
        "undefined_zero_classes":1,
        "normalized_class_sizes":norm_sizes,
        "normalized_classes":class_entries(normalized_classes),
        "raw_conditional_entropy_uniform_27_bits":f"{h_raw:.12f}",
        "normalized_conditional_entropy_uniform_27_bits":f"{h_norm:.12f}",
        "raw_best_single_guess":"10/27",
        "normalized_best_single_guess":"7/27",
        "sample_scale_pair":[
            {"rgb":[1,0,0],**sample1},
            {"rgb":[2,0,0],**sample2}
        ],
        "normalized_distribution_equal_in_pair":True,
        "deterministic_modulus_lane_different":True,
        "actual_photon_wavelengths_measured":False,
        "quantum_computer_executed":False,
        "source_cryptographically_authenticated":False
    }
    raw=("\n".join(lines)+"\n").encode("ascii")
    d["trace_bytes"]=len(raw)
    d["trace_sha256"]=sha(raw)
    output=Path(output)
    output.mkdir(parents=True,exist_ok=True)
    (output/"normalized27.hbp").write_bytes(raw)
    (output/"normalized27.json").write_bytes(
        (json.dumps(d,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
    )
    for name in ("normalized27.hbp","normalized27.json"):
        content=(output/name).read_bytes()
        (output/(name+".sha256")).write_bytes(
            (sha(content)+"  "+name+"\n").encode("ascii"))
    print(json.dumps({"status":"PASS","raw_classes":len(raw_classes),
        "normalized_classes":len(normalized_classes),
        "norm_entropy_bits":d["normalized_conditional_entropy_uniform_27_bits"],
        "modulus_different":True,"hbp_sha256":sha(raw)},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=2:
        raise SystemExit("usage: python round3_normalized_intensity.py OUTPUT_DIR")
    run(sys.argv[1])
