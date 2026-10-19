#!/usr/bin/env python3
"""Independent normalized-QFT 27-sector auditor; no producer import.

Validates full canonical Python/Node bytes plus every triple's rational weights,
class membership, absolute amplitude loss, entropy and SHA modulus behavior.
"""
from __future__ import annotations

from collections import defaultdict
from fractions import Fraction
import hashlib
import json
import math
import sys
from pathlib import Path

SCHEMA="ASOLARIA-SEAT3-ROUND3-NORMALIZED-INTENSITY-V1"
SRC_SEED=b"ASOLARIA-LIGHT-BEING-ROUND3-20261015"

def sha(v):return hashlib.sha256(v).hexdigest()
def canonical(x):return (json.dumps(x,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")

def inspect(py_dir,js_dir,output):
    roots=[Path(py_dir),Path(js_dir)]
    for name in ("normalized27.hbp","normalized27.json"):
        a=(roots[0]/name).read_bytes()
        b=(roots[1]/name).read_bytes()
        assert a==b,"Python/Node bytes differ: "+name
        for d in roots:
            assert (d/(name+".sha256")).read_bytes()==(sha(a)+"  "+name+"\n").encode("ascii")
    raw=(roots[0]/"normalized27.hbp").read_bytes()
    blob=(roots[0]/"normalized27.json").read_bytes()
    stats=json.loads(blob)
    assert canonical(stats)==blob
    assert stats["status"]=="PASS" and stats["schema"]==SCHEMA
    assert len(raw)==stats["trace_bytes"] and sha(raw)==stats["trace_sha256"]
    assert stats["ordered_trit_addresses"]==27
    rows=raw.decode("ascii").splitlines()
    assert len(rows)==27
    observed_raw=defaultdict(list)
    observed_norm=defaultdict(list)
    for k,line in enumerate(rows):
        r=k//9;g=(k//3)%3;b=k%3
        S=r+g+b
        N=r*r+g*g+b*b
        Q=N-r*g-r*b-g*b
        assert Q>=0 and S*S+2*Q==3*N
        before=(S*S,Q,Q)
        if N:
            probabilities=tuple(Fraction(t,3*N) for t in before)
            norm=",".join(f"{v.numerator}/{v.denominator}" for v in probabilities)
        else:
            assert k==0
            norm="UNDEFINED"
        raw_sig=",".join(map(str,before))
        expected=(f"NORM|addr={k:02d}|r={r}|g={g}|b={b}"
                  f"|raw={raw_sig}|normalized={norm}"
                  f"|valid={int(bool(N))}|json=0")
        assert line==expected,("MISMATCHED_EXACT_NORMALIZED_TRIPLE",k)
        observed_raw[raw_sig].append(k)
        observed_norm[norm].append(k)
    assert len(observed_raw)==10 and len(observed_norm)==7
    assert observed_norm["UNDEFINED"]==[0]
    assert sorted(map(len,observed_raw.values()))==[1,1,1,3,3,3,3,3,3,6]
    assert sorted(map(len,observed_norm.values()))==[1,2,3,3,6,6,6]

    def entries(d):
        return sorted([{"signature":sig,"addresses":addrs}
                       for sig,addrs in d.items()],key=lambda e:e["addresses"][0])
    assert stats["raw_classes"]==entries(observed_raw)
    assert stats["normalized_classes"]==entries(observed_norm)
    assert stats["raw_class_sizes"]==[1,1,1,3,3,3,3,3,3,6]
    assert stats["normalized_class_sizes"]==[1,2,3,3,6,6,6]
    assert stats["normalized_or_undefined_class_count"]==7
    assert stats["valid_normalized_probability_classes"]==6
    assert stats["undefined_zero_classes"]==1
    assert stats["raw_best_single_guess"]=="10/27"
    assert stats["normalized_best_single_guess"]=="7/27"

    hraw=(18*math.log2(3)+6*math.log2(6))/27
    hnorm=(18*math.log2(6)+6*math.log2(3)+2*math.log2(2))/27
    assert abs(float(stats["raw_conditional_entropy_uniform_27_bits"])-hraw)<1e-11
    assert abs(float(stats["normalized_conditional_entropy_uniform_27_bits"])-hnorm)<1e-11
    assert hnorm>hraw

    # Derive SHA ticket independently; neither produced class nor reporter's
    # "lane" is trusted. The distribution equivalence is exact, but the
    # software's modulus is non-invariant to global input intensity scale.
    ticket=int.from_bytes(hashlib.sha256(
        SRC_SEED+b"|BORN-THRESHOLD|"+
        (0).to_bytes(2,"little")+(1).to_bytes(2,"little")+
        (0).to_bytes(4,"little")
    ).digest(),"big")
    assert ticket%3==2 and ticket%12==5
    assert [x["rgb"] for x in stats["sample_scale_pair"]]==[[1,0,0],[2,0,0]]
    assert [(x["lane"],x["modulo_remainder"],x["total"],x["rejects"])
            for x in stats["sample_scale_pair"]]==[(2,2,3,0),(1,5,12,0)]
    assert stats["normalized_distribution_equal_in_pair"] is True
    assert stats["deterministic_modulus_lane_different"] is True

    # Trace byte flip and loss of dark-sentinel row must not verify.
    mutated=bytearray(raw)
    mutated[20]^=1
    assert sha(mutated)!=stats["trace_sha256"]
    assert len(raw.splitlines()[1:])==26
    assert raw.splitlines()[0].find(b"|normalized=UNDEFINED|valid=0")>=0
    assert stats["actual_photon_wavelengths_measured"] is False
    assert stats["quantum_computer_executed"] is False
    assert stats["source_cryptographically_authenticated"] is False

    out=Path(output);out.mkdir(parents=True,exist_ok=True)
    for name in ("normalized27.hbp","normalized27.json"):
        content=(roots[0]/name).read_bytes()
        (out/name).write_bytes(content)
        (out/(name+".sha256")).write_bytes(
            (sha(content)+"  "+name+"\n").encode("ascii"))
    summary={
        "status":"PASS",
        "raw_class_count":10,
        "normalized_or_undefined_class_count":7,
        "defined_normalized_class_count":6,
        "class_sizes":[1,2,3,3,6,6,6],
        "ordered_digital_addresses":27,
        "raw_conditional_entropy_bits":f"{hraw:.12f}",
        "normalized_conditional_entropy_bits":f"{hnorm:.12f}",
        "same_normalized_probs_but_sampler_different":True,
        "python_node_byte_identical":True,
        "full_27_row_hbp_sha256":sha(raw),
        "actual_photon_spectrum_measured":False
    }
    packed=canonical(summary)
    (out/"normalization-peer.json").write_bytes(packed)
    (out/"normalization-peer.json.sha256").write_bytes(
        (sha(packed)+"  normalization-peer.json\n").encode("ascii"))
    print(json.dumps(summary,sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=4:
        raise SystemExit("usage: python verify_round3_normalized.py PY_DIR NODE_DIR OUTPUT_DIR")
    inspect(*sys.argv[1:])
