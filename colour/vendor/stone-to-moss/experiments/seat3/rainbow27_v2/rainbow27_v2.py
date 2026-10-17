#!/usr/bin/env python3
"""Rainbow-27 V2 producer: deterministic digital, not physical optics or source authentication."""
import argparse
import hashlib
import json
import math
import struct
from collections import defaultdict
from pathlib import Path

DOMAIN = b"ASOLARIA-R27-V2|TICKET|"
SOURCE_SEED = b"ASOLARIA-R27-V2-SOURCE-20261015"
ORIGINAL_HEAD = "5045b5b2ee1960bc469b5588a1b17601490aef6a"
PEER_HEAD = "98e62f1e7218c7fbb20e21fd5c3d734304e4ee6a"
TOTAL = 27*81*27

def sha(data):
    return hashlib.sha256(data).hexdigest()

def fixture():
    return b"".join(hashlib.sha256(SOURCE_SEED + struct.pack("<I", i)).digest()
                    for i in range(8))

def address(rgb):
    r, g, b = rgb
    return 9*r + 3*g + b

def decode(a):
    assert 0 <= a < 27
    return (a//9, (a//3)%3, a%3)

def weights(rgb):
    r,g,b = rgb
    s=r+g+b
    q=r*r+g*g+b*b-r*g-r*b-g*b
    assert s*s+2*q == 3*(r*r+g*g+b*b) and q >= 0
    return (s*s,q,q)

def primitive(w):
    g=math.gcd(math.gcd(w[0],w[1]),w[2])
    return tuple(x//g for x in w) if g else (0,0,0)

def projector(rgb):
    s=sum(rgb)
    d=tuple(3*x-s for x in rgb)
    assert sum(d)==0
    return s,d

def restore(s,d):
    assert sum(d)==0
    result=tuple((v+s)//3 for v in d)
    assert all((v+s)%3==0 for v in d)
    return result

def sample(wave,loc,p):
    den=sum(p)
    if den==0:
        return "H"
    bound=1<<256
    ceiling=(bound//den)*den
    for retry in range(10000):
        ticket=hashlib.sha256(DOMAIN + struct.pack("<HHI",wave,loc,retry)).digest()
        x=int.from_bytes(ticket,"big")
        if x<ceiling:
            residue=x%den
            return str(0 if residue<p[0] else (1 if residue<p[0]+p[1] else 2))
    raise AssertionError("REJECTION_LIMIT")

def packet_gate(receipt,payload,trust,expected_id,expected_seq):
    return (sha(payload)==trust and receipt["source_sha256"]==trust
            and receipt["payload_sha256"]==sha(payload)
            and receipt["ordered_id"]==expected_id
            and receipt["sequence"]==expected_seq)

def negatives():
    src=fixture()
    anchor=sha(src)
    pkt={"source_sha256":anchor,"payload_sha256":anchor,"ordered_id":13,"sequence":7}
    assert packet_gate(pkt,src,anchor,13,7)
    flipped=bytes([src[0]^1])+src[1:]
    assert not packet_gate(pkt,flipped,anchor,13,7)
    assert not packet_gate({**pkt,"payload_sha256":"0"*64},src,anchor,13,7)
    assert not packet_gate({**pkt,"ordered_id":12},src,anchor,13,7)
    assert not packet_gate({**pkt,"sequence":6},src,anchor,13,7)
    assert not packet_gate({**pkt,"source_sha256":"f"*64},src,anchor,13,7)
    forged=sha(flipped)
    forged_pkt={**pkt,"source_sha256":forged,"payload_sha256":forged}
    assert packet_gate(forged_pkt,flipped,forged,13,7)
    assert not packet_gate(forged_pkt,flipped,anchor,13,7)
    assert sample(0,0,(0,0,0))=="H"
    assert weights((1,0,0))==weights((0,1,0))
    assert address((1,0,0))!=address((0,1,0))
    for w in range(27):
        for loc in range(81):
            assert sample(w,loc,primitive(weights((1,0,0)))) == sample(w,loc,primitive(weights((2,0,0))))
            assert sample(w,loc,primitive(weights((1,1,0)))) == sample(w,loc,primitive(weights((2,2,0))))
    return {"altered_source_held":True,"bad_digest_held":True,"wrong_id_held":True,
            "stale_sequence_held":True,"wrong_source_manifest_held":True,
            "coherent_source_and_manifest_forgery_not_authenticated":True,
            "zero_norm_held":True,"projection_ambiguity_detected":True,
            "positive_scale_route_invariant":True}

def census():
    raw=defaultdict(list)
    normalized=defaultdict(list)
    for idx in range(27):
        rgb=decode(idx)
        assert address(rgb)==idx
        s,d=projector(rgb)
        assert restore(s,d)==rgb
        w=weights(rgb)
        p=primitive(w)
        raw[w].append(idx)
        normalized[p].append(idx)
    raw_sizes=sorted(map(len,raw.values()))
    norm_sizes=sorted(map(len,normalized.values()))
    assert raw_sizes==[1,1,1,3,3,3,3,3,3,6]
    assert norm_sizes==[1,2,3,3,6,6,6]
    assert len(raw)==10 and len(normalized)==7
    def entropy(groups):
        return sum(len(v)/27*math.log2(len(v)) for v in groups.values())
    er,en=entropy(raw),entropy(normalized)
    assert abs(er-1.6310777784188053)<1e-12
    assert abs(en-2.1495962969373235)<1e-12
    assert abs((en-er)-14/27)<1e-12
    return raw, normalized, er, en

def run(outdir):
    raw,normalized,er,en=census()
    negative=negatives()
    payload=fixture()
    source_sha=sha(payload)
    outdir.mkdir(parents=True,exist_ok=True)
    lines=[f"R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|source_sha256={source_sha}|producer_sha={ORIGINAL_HEAD}|peer_sha={PEER_HEAD}|json=0\n"]
    counts=[0,0,0]; held=0
    for wave in range(27):
        for loc in range(81):
            for idx in range(27):
                rgb=decode(idx)
                w=weights(rgb)
                p=primitive(w)
                lane=sample(wave,loc,p)
                if lane=="H": held+=1
                else: counts[int(lane)]+=1
                lines.append(f"CASE|w={wave:02d}|loc={loc:02d}|id={idx:02d}|rgb={rgb[0]}{rgb[1]}{rgb[2]}|raw={w[0]},{w[1]},{w[2]}|prim={p[0]},{p[1]},{p[2]}|den={sum(p)}|lane={lane}\n")
    assert len(lines)==TOTAL+1
    assert held==27*81
    blob="".join(lines).encode("ascii")
    hbp=outdir/"rainbow27-v2.hbp"
    hbp.write_bytes(blob)
    hbp_sha=sha(blob)
    (outdir/"rainbow27-v2.hbp.sha256").write_text(f"{hbp_sha}  rainbow27-v2.hbp\n",encoding="ascii")
    summary={
        "schema":"ASOLARIA-R27-LOSSLESS-ORDER-PRIMITIVE-PROB-V1",
        "classification":"SYNTHETIC_DIGITAL_SOFTWARE",
        "producer_source_commit":ORIGINAL_HEAD,"peer_source_commit":PEER_HEAD,
        "source_fixture_sha256":source_sha,
        "case_count":TOTAL,"wave_count":27,"location_count":81,"ordered_address_count":27,
        "raw_signature_count":10,"normalized_signature_count_including_dark":7,
        "raw_orbit_sizes":sorted(map(len,raw.values())),
        "normalized_orbit_sizes":sorted(map(len,normalized.values())),
        "raw_conditional_entropy_bits":round(er,12),
        "normalized_conditional_entropy_bits":round(en,12),
        "extra_conditional_entropy_bits":round(en-er,12),
        "dark_held":held,"sampled_lane_counts":counts,"negative_controls":negative,
        "scale_invariant":True,"ordered_id_reversible":True,
        "external_source_authenticated":False,"physical_optical_storage_verified":False,
        "release_authorized":False,
        "source_custody":"synthetic fixture hash pin only; not an external signer",
        "trace_sha256":hbp_sha,"trace_bytes":len(blob)
    }
    json_bytes=(json.dumps(summary,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
    (outdir/"rainbow27-v2.json").write_bytes(json_bytes)
    json_sha=sha(json_bytes)
    (outdir/"rainbow27-v2.json.sha256").write_text(f"{json_sha}  rainbow27-v2.json\n",encoding="ascii")
    index=(f"INDEX|R27V2|json=0\nHBP|sha256={hbp_sha}|bytes={len(blob)}|json=0\n"
           f"JSON|sha256={json_sha}|bytes={len(json_bytes)}|json=0\n"
           "END|external_source_authenticated=0|release_authorized=0|json=0\n").encode("ascii")
    (outdir/"rainbow27-v2.hbi").write_bytes(index)
    (outdir/"rainbow27-v2.hbi.sha256").write_text(f"{sha(index)}  rainbow27-v2.hbi\n",encoding="ascii")
    print(json.dumps({"status":"PASS_LOCAL_PYTHON","cases":TOTAL,"dark":held,
          "lane_counts":counts,"trace_sha256":hbp_sha},sort_keys=True))

def main():
    p=argparse.ArgumentParser()
    p.add_argument("outdir",type=Path)
    args=p.parse_args()
    run(args.outdir)

if __name__=="__main__":
    main()
