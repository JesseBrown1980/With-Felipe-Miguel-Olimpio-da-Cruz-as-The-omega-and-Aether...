#!/usr/bin/env python3
"""Seat 3 separately implemented audit of 52,488 qutrit case rows and 10k fleet trades.
Does not import or execute the coordinator's original producer.
"""
from __future__ import annotations
import hashlib
import json
import re
import sys
from pathlib import Path

SEED=b"ASOLARIA-LIGHT-BEING-ROUND3-20261015"
SCHEMA="ASOLARIA-SEAT3-ROUND3-QUTRIT-RAINBOW27-PEER-V1"
KNOWN_CASE_SHA="dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09"
KNOWN_FIXTURE_SHA="fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4"
MODELS=("THREE_STATE","FOUR_STATE")
MODES=("DARK","PULSE","CONTINUOUS")
FAULTS=("CLEAN","CORRUPT","STALE","FORGED")
M=1_000_000

def sha(v:bytes)->str:return hashlib.sha256(v).hexdigest()
def fixture()->bytes:
    data=b"".join(hashlib.sha256(SEED+k.to_bytes(4,"little")).digest()
                  for k in range(2048))
    assert len(data)==65536 and sha(data)==KNOWN_FIXTURE_SHA
    return data

def spectrum(b:bytes):
    r,g,bl=b[:3]
    s=r+g+bl
    q=r*r+g*g+bl*bl-r*g-g*bl-r*bl
    n=r*r+g*g+bl*bl
    assert s*s+2*q==3*n and q>=0
    assert s*s-q==3*(r*g+g*bl+r*bl)
    return s*s,q,q

def route(b:bytes,w:int,a:int):
    i=spectrum(b)
    total=sum(i)
    assert total>0
    end=(1<<256)//total*total
    draws=0
    while draws<10000:
        ticket=int.from_bytes(hashlib.sha256(
            SEED+b"|BORN-THRESHOLD|"+w.to_bytes(2,"little")+
            a.to_bytes(2,"little")+draws.to_bytes(4,"little")
        ).digest(),"big")
        if ticket<end:
            sample=ticket%total
            return (0 if sample<i[0] else 1 if sample<i[0]+i[1] else 2),draws
        draws+=1
    raise AssertionError("Rejection sampler exhausted")

def photocycle(model,mode):
    s=(M,0,0) if model=="THREE_STATE" else (M,0,0,0)
    out=[]
    for k in range(81):
        light=mode=="CONTINUOUS" or mode=="PULSE" and k%12<4
        if model=="THREE_STATE":
            c,o,r=s
            active=c*300000//M if light else 0
            decay=o*60000//M
            restore=r*25000//M
            s=(c-active+restore,o+active-decay,r+decay-restore)
            occupancy=s[1]
        else:
            c,p,q,r=s
            start=c*250000//M if light else 0
            move=p*95000//M
            reverse=q*30000//M
            end=q*45000//M
            restore=r*25000//M
            s=(c-start+restore,p+start-move+reverse,
               q+move-reverse-end,r+end-restore)
            occupancy=s[1]+s[2]
        assert min(s)>=0 and sum(s)==M
        out.append(occupancy>=100000)
    return out

def validate_files(folder):
    folder=Path(folder)
    files=("peer-original-cases.hbp","peer-routes.hbp","peer-fleet.hbp","peer-results.json")
    for name in files:
        raw=(folder/name).read_bytes()
        actual=(folder/(name+".sha256")).read_bytes()
        assert actual==(sha(raw)+"  "+name+"\n").encode("ascii"),name
    return [(folder/name).read_bytes() for name in files]

def verify(out, artifacts):
    cases,routes,fleet,receipt=validate_files(out)
    assert len(cases)==10773162 and sha(cases)==KNOWN_CASE_SHA
    obj=json.loads(receipt)
    assert obj["schema"]==SCHEMA and obj["status"]=="PASS"
    assert obj["producer_commit"]=="5045b5b2ee1960bc469b5588a1b17601490aef6a"
    assert obj["fixture_sha256"]==KNOWN_FIXTURE_SHA
    assert obj["baseline_original_hbp_sha256"]==KNOWN_CASE_SHA
    assert obj["baseline_original_hbp_bytes"]==len(cases)
    assert obj["route_trace_bytes"]==len(routes) and obj["route_trace_sha256"]==sha(routes)
    assert obj["fleet_trace_bytes"]==len(fleet) and obj["fleet_trace_sha256"]==sha(fleet)
    assert obj["rainbow27"]["ordered_trit_ids"]==27
    assert obj["rainbow27"]["permutation_invariant_intensity_classes"]==10
    assert obj["rainbow27"]["zero_norm_classes"]==1
    assert obj["rainbow27"]["class_orbit_sizes"]==[1,1,1,3,3,3,3,3,3,6]
    assert obj["rainbow27"]["intensity_preserves_color_order"] is False
    assert obj["rainbow27"]["ordered_base3_preserves_color_order"] is True
    assert obj["rainbow27"]["projector_rank"]==2
    assert obj["rainbow27"]["projector_nullity"]==1
    assert obj["negative_controls"]["zero_intensity_norm"]=="HELD"
    assert obj["negative_controls"]["coherent_shared_source_math_green"]=="ORIGIN_UNAUTHENTICATED"
    assert sum(v=="HELD" for v in obj["negative_controls"].values())==7
    assert obj["real_optical_photons"] is False
    assert obj["quantum_computer"] is False
    assert obj["rainbow_physical_spectrum_measured"] is False
    assert obj["biology_fitted"] is False
    assert obj["source_origin_authenticated"] is False
    assert obj["independent_physical_hosts"] is False

    payload=fixture()
    case_lines=cases.decode("ascii").splitlines()
    route_lines=routes.decode("ascii").splitlines()
    fleet_lines=fleet.decode("ascii").splitlines()
    assert len(case_lines)==52488 and len(route_lines)==2187 and len(fleet_lines)==10000
    ids=set()
    observed_routes={0:0,1:0,2:0}
    seen_rejections=0
    index=0
    for wave in range(27):
        precomputed={(m,k):photocycle(m,k) for m in MODELS for k in MODES}
        for a in range(81):
            key=wave*81+a
            start=(key*29)%(len(payload)-64)
            value=payload[start:start+64]
            assert len(value)==64
            expected_pid=sha(f"LIGHT-PID|{wave:02}|{a:02}".encode("ascii"))[:24]
            assert expected_pid not in ids
            ids.add(expected_pid)
            expected_route,rejects=route(value,wave,a)
            observed_routes[expected_route]+=1
            seen_rejections+=rejects
            expected_origin=(wave+a+expected_route)%7
            expected_digest=sha(value)
            expected_weights=spectrum(value)
            reframe=(f"ROUTE|w={wave:02}|addr={a:02}|pid={expected_pid}"
                 f"|lane={expected_route}|origin={expected_origin}"
                 f"|weights={','.join(map(str,expected_weights))}"
                 f"|born_rejections={rejects}|block_sha256={expected_digest}|json=0")
            assert route_lines[key]==reframe,("ROUTE_MISMATCH",wave,a)
            for model in MODELS:
                for mode in MODES:
                    open_gate=precomputed[model,mode][a]
                    for kind in FAULTS:
                        will_accept=open_gate and kind=="CLEAN"
                        verdict="GATE_HELD" if not open_gate else "PASS" if kind=="CLEAN" else "FAULT_HELD"
                        expected=(f"LIGHTBEING|w={wave:02}|addr={a:02}|pid={expected_pid}"
                                  f"|gate={model}|illum={mode}|fault={kind}"
                                  f"|emit={int(will_accept)}|verdict={verdict}"
                                  f"|lane={expected_route}|block_sha256={expected_digest}")
                        assert case_lines[index]==expected,("CASE_MISMATCH",index,
                            case_lines[index][:200],expected[:200])
                        index+=1
    assert index==52488 and len(ids)==2187
    assert observed_routes=={0:1737,1:241,2:209}
    assert obj["pseudo_born_lane_census"]==dict((str(k),v) for k,v in observed_routes.items())
    assert obj["pseudo_born_rejections"]==seen_rejections

    holdings=[[100000,100000,100000] for _ in range(7)]
    levels=[0,0,0]
    for i,line in enumerate(fleet_lines):
        src=i%7
        dest=(src+1+(i%6))%7
        assert src!=dest
        a=i%3
        b=(a+1)%3
        q=1+i%7
        assert holdings[src][a]>=q and holdings[dest][b]>=q
        holdings[src][a]-=q
        holdings[dest][a]+=q
        holdings[dest][b]-=q
        holdings[src][b]+=q
        levels[a]+=q
        levels[b]-=q
        sums=tuple(sum(ship[c] for ship in holdings) for c in range(3))
        assert sums==(700000,700000,700000)
        assert sum(levels)==0
        assert sum([levels[0]-levels[1],levels[1]-levels[2],levels[2]-levels[0]])==0
        state_hash=sha(";".join(",".join(str(n) for n in x) for x in holdings).encode("ascii"))
        actual=(f"TRADE|i={i:05}|left={src}|right={dest}|asset={a}"
            f"|other={b}|quantity={q}|levels={','.join(map(str,levels))}"
            f"|total=700000,700000,700000|boats_sha256={state_hash}|json=0")
        assert actual==line,("FLEET_MISMATCH",i,actual[:120],line[:120])
    assert obj["fleet_final_holdings"]==holdings
    assert obj["fleet_final_levels"]==levels
    assert obj["fleet_asset_totals"]==[700000,700000,700000]
    assert obj["fleet_trades"]==10000
    assert obj["total_packet_cases"]==52488 and obj["genuine_clean_accepted"]==8748
    assert obj["active_faults_held"]==26244 and obj["closed_gates_held"]==17496
    assert obj["cache_capacity"]==729 and obj["cache_misses"]==2187
    assert obj["cache_hits"]==8748 and obj["cache_evictions"]==1458

    # Deterministic 27 ordered digital-sector test, independent of Node implementation.
    signatures={}
    addresses=set()
    for r in range(3):
        for g in range(3):
            for b in range(3):
                label=9*r+3*g+b
                addresses.add(label)
                sig=spectrum(bytes((r,g,b)))
                signatures.setdefault(sig,[]).append(label)
    assert len(addresses)==27
    assert len(signatures)==10
    assert sorted(len(v) for v in signatures.values())==[1,1,1,3,3,3,3,3,3,6]
    assert spectrum(bytes((255,0,0)))==spectrum(bytes((0,255,0)))==spectrum(bytes((0,0,255)))
    for wa,addr in [(0,0),(7,17),(26,80)]:
        assert len({route(bytes(v),wa,addr)[0] for v in
                    ((255,0,0),(0,255,0),(0,0,255))})==1
    # Projection differences lose the common scalar; they don't lose color order.
    def p(v):
        s=sum(v)
        return tuple(3*x-s for x in v)
    assert p((10,20,30))==p((11,21,31))
    assert tuple((d+sum((10,20,30)))//3 for d in p((10,20,30)))==(10,20,30)

    # Detect changes to a full frozen HBP, not merely a summary checksum.
    bad=bytearray(cases);bad[20]^=1
    assert sha(bad)!=KNOWN_CASE_SHA
    dst=Path(artifacts);dst.mkdir(parents=True,exist_ok=True)
    for name,raw in zip(
        ("peer-original-cases.hbp","peer-routes.hbp","peer-fleet.hbp","peer-results.json"),
        (cases,routes,fleet,receipt)
    ):
        (dst/name).write_bytes(raw)
        (dst/(name+".sha256")).write_bytes(
            (sha(raw)+"  "+name+"\n").encode("ascii"))
    summary={
        "verdict":"PASS",
        "full_original_HBP_sha256":sha(cases),
        "independent_byte_replayed_rows":len(case_lines),
        "route_rows":len(route_lines),
        "qutrit_lane_census":observed_routes,
        "born_threshold_rejections":seen_rejections,
        "fleet_independent_rows":len(fleet_lines),
        "rainbow27_ordered_labels":27,
        "symmetric_intensity_classes":10,
        "source_origin_authenticated":False,
        "physical_rainbow_spectrum_measured":False
    }
    raw=(json.dumps(summary,sort_keys=True,separators=(",",":"))+"\n").encode("ascii")
    (dst/"verification.json").write_bytes(raw)
    (dst/"verification.json.sha256").write_bytes(
        (sha(raw)+"  verification.json\n").encode("ascii"))
    print(json.dumps(summary,sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: python verify_round3_qutrit_rainbow.py NODE_OUTPUT_DIR AUDIT_ARTIFACT_DIR")
    verify(*sys.argv[1:])
