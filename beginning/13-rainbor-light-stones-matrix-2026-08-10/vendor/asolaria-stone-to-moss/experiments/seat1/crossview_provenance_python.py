#!/usr/bin/env python3
"""Seat 1 cross-view source-provenance adversarial audit (software, not physics).
GF(2) cyclic polynomials, separate Node transfer matrix independently checks it.
"""
import hashlib
import json
import sys
from pathlib import Path

from multiview_81_python import (
    N, MASK, T, HORIZONS, LAWS, CHALLENGE, CHALLENGE_SHA,
    sha, rotate, polynomial_power, observe, basis, solve, samples,
)

DOMAIN="ASOLARIA-SEAT1-CROSSVIEW-PROVENANCE-V1"
ARMS=("valid","rejected_mismatch","accepted_source_swap","invisible_B_source_swap")
HEX=lambda v:f"{v:021x}"

def decodable(columns,pivots,output):
    try:
        result=solve(pivots,output)
        return result if observe(columns,result)==output else None
    except AssertionError:
        return None

def check():
    raw=CHALLENGE.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==CHALLENGE_SHA,"challenge SHA mismatch"
    challenge=json.loads(raw)
    assert challenge["laws"]==[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]
    assert challenge["horizons"]==[T,T+1,T+81]
    assert challenge["waves"]==27 and challenge["bodies"]==N
    sources=list(samples(challenge))
    assert len(sources)==191

    rows=[
        f"PORTAL|schema={DOMAIN}|challenge_sha256={CHALLENGE_SHA}"
        "|full_rank_pairs=24|cases_per_arm=4584|arms=4|physical_attested=0|json=0"
    ]
    truth=rejects=substitutions=invisibles=0
    controls=[]
    names=dict(LAWS)
    for horizon in HORIZONS:
        opA=polynomial_power(names["CA150"],horizon)
        columnsA=[rotate(opA,i) for i in range(N)]
        pivA,freeA=basis(columnsA)
        assert len(pivA)==79 and len(freeA)==2
        ka=(1<<freeA[0])^solve(pivA,columnsA[freeA[0]])
        assert ka!=0 and observe(columnsA,ka)==0
        for name,_ in LAWS[1:]:
            opB=polynomial_power(names[name],horizon)
            columnsB=[rotate(opB,i) for i in range(N)]
            pivB,freeB=basis(columnsB)
            assert len(pivB)==80 and len(freeB)==1
            kb=(1<<freeB[0])^solve(pivB,columnsB[freeB[0]])
            assert kb!=0 and observe(columnsB,kb)==0
            stacked=[columnsA[i]|(columnsB[i]<<N) for i in range(N)]
            pivAB,freeAB=basis(stacked)
            assert len(pivAB)==81 and not freeAB
            assert observe(columnsB,ka)!=0 and observe(columnsA,kb)!=0

            reject_index=next((j for j in range(N)
                               if decodable(stacked,pivAB,columnsB[j]<<N) is None),None)
            assert reject_index is not None
            reject_delta=1<<reject_index
            controls.append({"horizon":horizon,"B":name,
                "A_rank":79,"B_rank":80,"joint_rank":81,
                "first_rejected_basis_bit":reject_index,
                "A_kernel_hex":HEX(ka),"B_kernel_hex":HEX(kb)})
            for trial,x in enumerate(sources):
                a=observe(columnsA,x)
                b=observe(columnsB,x)
                configurations=(
                    ("valid",x,b,x),
                    ("rejected_mismatch",x^reject_delta,observe(columnsB,x^reject_delta),None),
                    ("accepted_source_swap",x^ka,observe(columnsB,x^ka),x^ka),
                    ("invisible_B_source_swap",x^kb,observe(columnsB,x^kb),x),
                )
                for kind,inputB,outputB,expected in configurations:
                    packed=a|(outputB<<N)
                    received=decodable(stacked,pivAB,packed)
                    assert received==expected,(name,horizon,trial,kind,received,expected)
                    assert inputB==x if kind=="valid" else inputB!=x
                    if kind=="valid":
                        assert received==x
                        truth+=1
                    elif kind=="rejected_mismatch":
                        rejects+=1
                    elif kind=="accepted_source_swap":
                        assert received!=x and outputB!=b
                        substitutions+=1
                    else:
                        assert outputB==b and received==x
                        invisibles+=1
                    fields=(
                        f"{horizon}|CA150+{name}|{trial}|{kind}|"
                        f"{HEX(x)}|{HEX(inputB)}|{HEX(a)}|{HEX(outputB)}|"
                        f"{HEX(received) if received is not None else '-'}"
                    )
                    rows.append("PROVENANCE|"+fields+"|sha="+sha(("ROW|"+fields).encode("ascii"))+"|json=0")
    assert len(controls)==24
    assert (truth,rejects,substitutions,invisibles)==(4584,4584,4584,4584)
    rows.append("END|cases=18336|valid=4584|rejected=4584|source_swap=4584|invisible=4584|full_rank_pairs=24|physical_attested=0|json=0")
    raw=("\n".join(rows)+"\n").encode("ascii")
    return raw,{
        "schema":DOMAIN,"status":"PASS",
        "implementation":"Python GF2 cyclic polynomial",
        "cases":18336,"rank81_pairs":24,
        "valid_roundtrips":truth,"detected_mismatches":rejects,
        "accepted_wrong_source":substitutions,
        "invisible_provenance_mismatches":invisibles,
        "trace_sha256":hashlib.sha256(raw).hexdigest(),
        "trace_bytes":len(raw),
        "per_pair_controls":controls,
        "physical_host_attested":False
    }

if __name__=="__main__":
    if len(sys.argv)!=3:raise SystemExit("usage: python crossview_provenance_python.py out.hbp metrics.json")
    b,result=check()
    Path(sys.argv[1]).write_bytes(b)
    Path(sys.argv[2]).write_text(json.dumps(result,sort_keys=True,indent=2)+"\n")
    print(json.dumps({k:v for k,v in result.items() if k!="per_pair_controls"},sort_keys=True))
