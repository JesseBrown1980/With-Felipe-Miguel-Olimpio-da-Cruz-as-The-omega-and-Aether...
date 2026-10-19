#!/usr/bin/env python3
"""Seat3 reversible three-channel light-bank *digital memory*, NOT physical photons.
Pinned historical B1/B2 traces; August Colour-QR 2100B indexed RGB framing;
P=I-J/3, with separate conserved common-mode S. Four-seat peer fixture.
"""
from __future__ import annotations
import hashlib
import json
import math
import struct
import sys
from collections import OrderedDict
from pathlib import Path

MAGIC=b"LBK1"
EPOCH=20261015
CHUNK=2100
CAPACITY=729
EXPECTED_LENGTHS=(611999,365671)
EXPECTED_SHA=(
    "de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b",
    "435eccff256d119e608926ba3f3ec46a961d9f0d18801c440de2c3552200101d",
)
HEADER_FMT="<4sIIII"
PACKET_FMT="<BHH32s"
HEADER_SIZE=struct.calcsize(HEADER_FMT)+96
PACKET_SIZE=struct.calcsize(PACKET_FMT)
SCHEMA="ASOLARIA-SEAT3-AUGUST-LIGHTBANK-RGB-PROJECTOR-V1"
LANE=("R","G","B")
def sha(b):return hashlib.sha256(b).hexdigest()
def fail(msg):raise ValueError(msg)
def check_source(a,b):
    if (len(a),len(b))!=EXPECTED_LENGTHS:fail("pinned historical lengths")
    if (sha(a),sha(b))!=EXPECTED_SHA:fail("pinned historical SHA")
def exact_triple(x):
    a,b,c=x
    s=a+b+c
    return (3*a-s,3*b-s,s)
def encode_triples(raw):
    pad=raw+b"\0"*((-len(raw))%3)
    out=bytearray()
    for k in range(0,len(pad),3):
        dr,dg,s=exact_triple(pad[k:k+3])
        out.extend(struct.pack("<hhH",dr,dg,s))
    return bytes(out)
def decode_triples(block,original_length):
    if len(block)!=6*((original_length+2)//3):fail("projected length")
    out=bytearray()
    for k in range(0,len(block),6):
        dr,dg,s=struct.unpack_from("<hhH",block,k)
        nums=(dr+s,dg+s,s-dr-dg)
        if any(v%3 for v in nums):fail("fractional RGB")
        vals=tuple(v//3 for v in nums)
        if any(v<0 or v>255 for v in vals):fail("RGB overflow")
        if exact_triple(vals)!=(dr,dg,s):fail("projector contradiction")
        out.extend(vals)
    if any(out[original_length:]):fail("nonzero pad")
    return bytes(out[:original_length])

def packet(index,body):
    indexed=struct.pack("<I",index)+body
    lane=index%3
    frame=index//3
    if frame>65535 or len(indexed)>65535:fail("frame overflow")
    return (struct.pack(PACKET_FMT,lane,frame,len(indexed),
                        hashlib.sha256(indexed).digest())+encode_triples(indexed),
            sha(indexed))

def assemble(a,b):
    if len(a)>0xffffffff or len(b)>0xffffffff:fail("source length overflow")
    content=a+b
    pieces=[content[i:i+CHUNK] for i in range(0,len(content),CHUNK)]
    header=(struct.pack(HEADER_FMT,MAGIC,EPOCH,len(a),len(b),len(pieces))
           +hashlib.sha256(a).digest()+hashlib.sha256(b).digest()
           +hashlib.sha256(content).digest())
    assert len(header)==HEADER_SIZE
    # Route packets into the actual three independently bounded RGB lane
    # banks; serialize by canonical Fischer index only AFTER storing/recalling.
    lane_banks=[OrderedDict(),OrderedDict(),OrderedDict()]
    rows=[]
    for index,body in enumerate(pieces):
        chunk,checksum=packet(index,body)
        bank=lane_banks[index%3]
        if index in bank:fail("duplicate lane identity")
        if len(bank)>=CAPACITY:fail("source bank capacity exceeded")
        bank[index]=chunk
        rows.append(f"PACKET|index={index:04d}|frame={index//3:03d}"
                    f"|lane={LANE[index%3]}|body_bytes={len(body)}"
                    f"|indexed_sha256={checksum}|json=0")
    assert [len(bank) for bank in lane_banks]==[156,155,155]
    return header+b"".join(lane_banks[i%3][i] for i in range(len(pieces))),rows

def decode_stick(stick,anchored=True):
    if len(stick)<HEADER_SIZE:fail("missing manifest")
    magic,epoch,la,lb,n=struct.unpack_from(HEADER_FMT,stick,0)
    if magic!=MAGIC or epoch!=EPOCH:fail("version/epoch")
    digest_a=stick[20:52]
    digest_b=stick[52:84]
    digest_ab=stick[84:116]
    expected_packets=(la+lb+CHUNK-1)//CHUNK
    if n!=expected_packets:fail("packet count")
    offset=HEADER_SIZE
    restored=bytearray()
    lane_counts=[0,0,0]
    for index in range(n):
        if len(stick)-offset<PACKET_SIZE:fail("missing packet")
        lane,frame,rawlen,digest=struct.unpack_from(PACKET_FMT,stick,offset)
        offset+=PACKET_SIZE
        if lane!=index%3 or frame!=index//3:fail("wrong RGB lane/frame or packet ordering")
        expected_len=4+min(CHUNK,la+lb-index*CHUNK)
        if rawlen!=expected_len:fail("indexed length/order")
        bodylen=6*((rawlen+2)//3)
        if len(stick)-offset<bodylen:fail("truncated projected packet")
        indexed=decode_triples(stick[offset:offset+bodylen],rawlen)
        offset+=bodylen
        if hashlib.sha256(indexed).digest()!=digest:fail("indexed packet SHA")
        if struct.unpack_from("<I",indexed)[0]!=index:fail("Fischer index changed")
        restored.extend(indexed[4:])
        lane_counts[lane]+=1
    if offset!=len(stick):fail("unaccounted trailing bytes")
    if len(restored)!=la+lb:fail("source length")
    b1=bytes(restored[:la]);b2=bytes(restored[la:])
    if hashlib.sha256(b1).digest()!=digest_a or hashlib.sha256(b2).digest()!=digest_b:fail("source manifest SHA")
    if hashlib.sha256(restored).digest()!=digest_ab:fail("composite SHA")
    if anchored:check_source(b1,b2)
    return b1,b2,lane_counts

def must_hold(name,fn,record):
    try:fn()
    except (ValueError,struct.error,IndexError) as exc:
        record[name]="HELD"
        return
    raise AssertionError("negative unexpectedly green: "+name)

def cache_test():
    bank=OrderedDict()
    evicted=[]
    recall_hits=0
    for index in range(CAPACITY+27):
        if index in bank:
            recall_hits+=1
        else:
            if len(bank)==CAPACITY:
                evicted.append(bank.popitem(last=False)[0])
            bank[index]=bytes([index%256])
    assert len(bank)==CAPACITY and evicted==list(range(27))
    assert 0 not in bank and 26 not in bank and 27 in bank
    for index in (27,728,755):
        if index in bank:recall_hits+=1
    assert recall_hits==3
    return {"capacity":CAPACITY,"writes":CAPACITY+27,"evictions":27,
            "evicted_recall":"HELD","hits":recall_hits}

def negative_tests(a,b,stick):
    results={}
    assert exact_triple((10,20,30))[:2]==exact_triple((11,21,31))[:2]
    assert exact_triple((10,20,30))[2]!=exact_triple((11,21,31))[2]
    results["projection_without_common_mode"]="AMBIGUOUS_HELD"
    original=bytearray(stick)
    one=bytearray(original);one[HEADER_SIZE+PACKET_SIZE+2]^=1
    must_hold("flipped_encoded_byte",lambda:decode_stick(one),results)
    must_hold("truncated_packet",lambda:decode_stick(original[:-6]),results)
    one=bytearray(original);one[HEADER_SIZE]=1
    must_hold("swapped_first_rgb_lane",lambda:decode_stick(one),results)
    one=bytearray(original);struct.pack_into("<I",one,4,EPOCH-1)
    must_hold("stale_epoch",lambda:decode_stick(one),results)
    must_hold("missing_manifest",lambda:decode_stick(original[HEADER_SIZE:]),results)
    # With consistent local projector equations S+3 makes all 3 reconstructed
    # byte values +1, but packet SHA (and the source SHA) MUST hold.
    one=bytearray(original)
    at=HEADER_SIZE+PACKET_SIZE+4
    s=struct.unpack_from("<H",one,at)[0]
    struct.pack_into("<H",one,at,s+3)
    must_hold("forged_common_component",lambda:decode_stick(one),results)
    # Replace first indexed chunk with a correctly encoded different index.
    first_content=a[:CHUNK]
    wrong,_=packet(1,first_content)
    orig_len=PACKET_SIZE+6*((4+CHUNK+2)//3)
    assert len(wrong)==orig_len
    one=bytes(original[:HEADER_SIZE])+wrong+bytes(original[HEADER_SIZE+orig_len:])
    must_hold("duplicate_or_swapped_fischer_index",lambda:decode_stick(one),results)
    # Locally coherent replacement source/manifest passes self-hashes but not
    # pinned Git-independent frozen historical source digests.
    fake=bytes([a[0]^1])+a[1:]
    fake_stick,_=assemble(fake,b)
    decode_stick(fake_stick,anchored=False)
    must_hold("coherent_fake_source_anchored",lambda:decode_stick(fake_stick),results)
    results["coherent_fake_source_without_external_anchor"]="MATH_GREEN_ORIGIN_UNAUTHENTICATED"
    results["cache_eviction_without_archive"]=cache_test()["evicted_recall"]
    assert len([k for k,v in results.items() if v=="HELD"])==9
    return results

def study(a,b,output):
    check_source(a,b)
    stick,packet_rows=assemble(a,b)
    Path(output).mkdir(parents=True,exist_ok=True)
    path=Path(output)/"lightbank.lbk"
    path.write_bytes(stick)
    # COLD read from file only; the decoder is separately callable by Node.
    ra,rb,lanes=decode_stick(path.read_bytes())
    assert ra==a and rb==b
    assert lanes==[156,155,155]
    negatives=negative_tests(a,b,stick)
    cache=cache_test()
    combined=a+b
    metrics={
        "schema":SCHEMA,"status":"PASS",
        "source_lengths":list(EXPECTED_LENGTHS),
        "source_sha256":list(EXPECTED_SHA),
        "combined_bytes":len(combined),"combined_sha256":sha(combined),
        "indexed_packets":len(packet_rows),"rgb_frames":math.ceil(len(packet_rows)/3),
        "rgb_lanes":lanes,"original_rgb_triples":math.ceil((len(combined)+4*len(packet_rows))/3),
        "memory_banks":3,"capacity_per_bank":CAPACITY,"stress":cache,
        "negative_controls":negatives,"lightstick_bytes":len(stick),
        "lightstick_sha256":sha(stick),
        "physical_photon_memory":False,"actual_qr_images":False,
        "independent_physical_hosts":False,"source_authenticated":False,
        "compression_claim":False,
    }
    lines=[f"PORTAL|schema={SCHEMA}|epoch={EPOCH}|source_bytes={len(combined)}"
           f"|capacity_per_lane={CAPACITY}|physical_light=0|json=0"]
    lines.extend(packet_rows)
    for key in sorted(negatives):
        lines.append(f"NEG|name={key}|verdict={negatives[key]}|json=0")
    lines.append(f"MEMORY|packets={len(packet_rows)}|frames={metrics['rgb_frames']}"
                 f"|lanes={','.join(map(str,lanes))}|stick_bytes={len(stick)}"
                 f"|stick_sha256={sha(stick)}|json=0")
    lines.append(f"SOURCES|b1_sha256={sha(a)}|b2_sha256={sha(b)}"
                 f"|combined_sha256={sha(combined)}|json=0")
    lines.append("END|cold_read=PASS|projection_only=HELD|external_origin_authenticated=0"
                 "|real_QR_photon_capture=0|zero_human_per_tick=1|json=0")
    hbp=("\n".join(lines)+"\n").encode("ascii")
    (Path(output)/"lightbank.hbp").write_bytes(hbp)
    metrics["receipt_bytes"]=len(hbp);metrics["receipt_sha256"]=sha(hbp)
    (Path(output)/"lightbank.json").write_bytes((json.dumps(metrics,sort_keys=True,
        separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii"))
    for name in ("lightbank.lbk","lightbank.hbp","lightbank.json"):
        raw=(Path(output)/name).read_bytes()
        (Path(output)/(name+".sha256")).write_bytes((sha(raw)+"  "+name+"\n").encode("ascii"))
    return metrics

def main(args):
    if len(args)==5 and args[1]=="encode":
        m=study(Path(args[2]).read_bytes(),Path(args[3]).read_bytes(),args[4])
        print(json.dumps({"status":m["status"],"lightstick_bytes":m["lightstick_bytes"],
                          "lightstick_sha256":m["lightstick_sha256"],"receipt_sha256":m["receipt_sha256"],
                          "rgb_frames":m["rgb_frames"],"packets":m["indexed_packets"],
                          "held_cases":sum(v=="HELD" for v in m["negative_controls"].values())},sort_keys=True))
    elif len(args)==5 and args[1]=="decode":
        a,b,lanes=decode_stick(Path(args[2]).read_bytes())
        Path(args[3]).write_bytes(a);Path(args[4]).write_bytes(b)
        print(json.dumps({"cold_read":"PASS","bytes":[len(a),len(b)],"lanes":lanes,
                          "sha256":[sha(a),sha(b)]},sort_keys=True))
    else:
        raise SystemExit("usage: python lightbank_memory.py encode b1.hbp b2.hbp outdir | decode lightbank.lbk out_b1 out_b2")

if __name__=="__main__":main(sys.argv)
