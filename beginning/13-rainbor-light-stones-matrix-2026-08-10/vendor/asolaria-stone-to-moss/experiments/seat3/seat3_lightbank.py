#!/usr/bin/env python3
"""Seat3 August light-bank protocol, integer projector and bounded slot audit.

Digital byte protocol ONLY. No physical light, no actual QR raster/RS decoder.
"""
from __future__ import annotations
import base64
import hashlib
import json
import struct
import sys
from collections import Counter
from pathlib import Path

CAPACITY = 729
CHUNK = 2100
N = 65536
PLANES = "RGB"
SCHEMA = "ASOLARIA-SEAT3-AUGUST-LIGHTBANK-PROJECTOR-RGB-V1"

def h(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def source_bytes() -> bytes:
    return bytes((((73 * i) ^ (i >> 3) ^ ((i * i) >> 9) ^ 165) & 255)
                 for i in range(N))

def projector_encode(src: bytes) -> bytes:
    pad = (-len(src)) % 3
    data = src + (b"\x00" * pad)
    out = bytearray()
    for i in range(0, len(data), 3):
        a, b, c = data[i:i+3]
        s = a + b + c
        dr = 3 * a - s
        dg = 3 * b - s
        out.extend(struct.pack("<Hhh", s, dr, dg))
    return bytes(out)

def projector_decode(encoded: bytes, original_size: int) -> bytes:
    if len(encoded) % 6 != 0:
        raise ValueError("incomplete common-mode and differences")
    out = bytearray()
    for i in range(0, len(encoded), 6):
        s, dr, dg = struct.unpack_from("<Hhh", encoded, i)
        numerators = (s+dr, s+dg, s-dr-dg)
        if any(n % 3 for n in numerators):
            raise ValueError("projector inverse non-integral")
        triple = tuple(n//3 for n in numerators)
        if any(n < 0 or n > 255 for n in triple):
            raise ValueError("projector inverse out of byte range")
        out.extend(triple)
    if len(out) != original_size + (-original_size)%3:
        raise ValueError("projector inverse length mismatch")
    if any(out[original_size:]):
        raise ValueError("nonzero projector padding")
    return bytes(out[:original_size])

def project_differences(triple):
    s = sum(triple)
    return (3*triple[0]-s,3*triple[1]-s,-(3*triple[0]-s)-(3*triple[1]-s))

def projector_proofs():
    a = ((2,-1,-1),(-1,2,-1),(-1,-1,2))
    for row in range(3):
        for col in range(3):
            product = sum(a[row][k] * a[k][col] for k in range(3))
            assert product == 3*a[row][col], (row,col)
        assert sum(a[row]) == 0
    assert sum(a[i][i] for i in range(3)) == 6
    assert a[0][0]*a[1][1]-a[0][1]*a[1][0] == 3
    checked=0
    for r in range(9):
        for g in range(9):
            for b in range(9):
                src=bytes((r,g,b))
                assert projector_decode(projector_encode(src),3)==src
                checked+=1
    old=(10,20,30);shifted=(15,25,35)
    assert project_differences(old)==project_differences(shifted)
    assert sum(old)!=sum(shifted)
    try:
        projector_decode(b"\x00\x00\x00\x00",3)
    except ValueError:
        pass
    else:
        raise AssertionError("missing common mode incorrectly reconstructed")
    return checked

def packets(data: bytes):
    result=[]
    for i in range((len(data)+CHUNK-1)//CHUNK):
        body=data[i*CHUNK:(i+1)*CHUNK]
        raw=struct.pack("<I",i)+body
        result.append(dict(index=i,plane=PLANES[i%3],
                           b64=base64.b64encode(raw).decode("ascii"),
                           body_len=len(body),body_sha=h(body),raw_sha=h(raw)))
    return result

def frame_count(p):
    count=(len(p)+2)//3
    lanes=[[None,None,None] for _ in range(count)]
    for v in p:
        k=v["index"]
        assert lanes[k//3][k%3] is None
        lanes[k//3][k%3]=v
    return lanes

def decode_packet(wire, expected_count, body_hashes, full_size):
    plane,b64=wire
    try:
        raw=base64.b64decode(b64.encode("ascii"),validate=True)
    except Exception as exc:
        raise ValueError("bad base64") from exc
    if base64.b64encode(raw).decode("ascii")!=b64:
        raise ValueError("noncanonical base64")
    if len(raw)<4:
        raise ValueError("missing 4-byte Fischer index")
    index=struct.unpack_from("<I",raw)[0]
    if index >= expected_count:
        raise ValueError("Fischer index outside manifest")
    if PLANES[index%3]!=plane:
        raise ValueError("RGB plane and index disagree")
    body=raw[4:]
    expected_len=min(CHUNK,full_size-index*CHUNK)
    if len(body)!=expected_len:
        raise ValueError("inconsistent chunk size")
    if h(body)!=body_hashes[index]:
        raise ValueError("pinned chunk digest disagreement")
    return index,body

def readback(wires, expected_count, body_hashes, source_sha, size):
    found={}
    for wire in wires:
        index,body=decode_packet(wire,expected_count,body_hashes,size)
        if index in found:
            raise ValueError("duplicate Fischer index")
        found[index]=body
    if set(found) != set(range(expected_count)):
        raise ValueError("missing chunk: impossible lossless readback")
    output=b"".join(found[i] for i in range(expected_count))
    if len(output)!=size or h(output)!=source_sha:
        raise ValueError("manifest root SHA or size mismatch")
    return output

class Bank:
    def __init__(self):
        self.slots=[dict(slot_id=f"BLOCK:{i:03d}",generation=0,key=None,wire=None)
                    for i in range(CAPACITY)]
        self.stable=tuple(v["slot_id"] for v in self.slots)
        self.where={}
        self.next=0
        self.evictions=0
        self.hits=0

    def store(self,key,wire):
        if key in self.where:
            raise ValueError("duplicate memory index")
        cell=self.slots[self.next]
        if cell["key"] is not None:
            old=cell["key"]
            del self.where[old]
            self.evictions+=1
        cell["generation"]+=1
        cell["key"]=key
        cell["wire"]=wire
        self.where[key]=self.next
        self.next=(self.next+1)%CAPACITY

    def read(self,key):
        at=self.where.get(key)
        if at is None or self.slots[at]["key"] != key:
            raise ValueError("missing or evicted memory index")
        self.hits+=1
        return self.slots[at]["wire"]

    def occupancy(self):
        return len(self.where)

    def identities_unchanged(self):
        return tuple(x["slot_id"] for x in self.slots)==self.stable

def expect_hold(label,fn):
    try:
        fn()
    except (ValueError,IndexError,struct.error):
        return {"name":label,"verdict":"HELD"}
    raise AssertionError("negative unexpectedly green: "+label)

def audit():
    src=source_bytes()
    raw_pk=packets(src)
    encoded=projector_encode(src)
    proj_pk=packets(encoded)
    assert len(raw_pk)==32 and len(proj_pk)==63
    assert len(frame_count(raw_pk))==11 and len(frame_count(proj_pk))==21
    assert frame_count(raw_pk)[-1][-1] is None
    assert all(e is not None for frame in frame_count(proj_pk) for e in frame)
    assert len(encoded)==131076 and len(encoded)//6==21846
    assert projector_decode(encoded,N)==src
    projector_cases=projector_proofs()

    lines=[f"PORTAL|schema={SCHEMA}|source_kind=deterministic_synthetic_bytes|physical_optics=0|json=0",
           f"SOURCE|bytes={len(src)}|sha256={h(src)}|json=0",
           f"PROJECTOR|original_bytes={len(src)}|pad=2|transformed_bytes={len(encoded)}"
           f"|triples=21846|sha256={h(encoded)}|extra_multiplier_vs_padded=2|json=0",
           f"LAW|p2_equals_p=1|kernel_common=1|rank=2|trace=2|exact_triplet_tests={projector_cases}|json=0"]
    banks={}
    bank_stats={}
    for mode,packet_set,full_data in (("raw",raw_pk,src),("projected",proj_pk,encoded)):
        frames=frame_count(packet_set)
        bank=Bank()
        for item in packet_set:
            bank.store(item["index"],(item["plane"],item["b64"]))
            lines.append(f"PACKET|mode={mode}|index={item['index']:04d}|plane={item['plane']}"
                         f"|body_bytes={item['body_len']}|body_sha256={item['body_sha']}"
                         f"|packet_sha256={item['raw_sha']}|base64_chars={len(item['b64'])}|json=0")
        assert bank.occupancy()==len(packet_set) and bank.evictions==0
        hashes=[x["body_sha"] for x in packet_set]
        # Reverse arrival order is a bijection; no trust is placed in transport order.
        received=[bank.read(i) for i in reversed(range(len(packet_set)))]
        recovered=readback(received,len(packet_set),hashes,h(full_data),len(full_data))
        assert recovered==full_data
        if mode=="projected":
            assert projector_decode(recovered,N)==src
        lines.append(f"RECALL|mode={mode}|chunks={len(packet_set)}|frames={len(frames)}"
                     f"|hits={bank.hits}|evictions={bank.evictions}"
                     f"|reconstructed_sha256={h(recovered)}|exact=1|json=0")
        banks[mode]=bank
        bank_stats[mode]={"chunks":len(packet_set),"frames":len(frames),
                          "hits":bank.hits,"evictions_initial":bank.evictions,
                          "bytes":len(full_data),"sha256":h(full_data)}
    raw_hashes=[x["body_sha"] for x in raw_pk]
    proj_hashes=[x["body_sha"] for x in proj_pk]
    baseline=[(p["plane"],p["b64"]) for p in raw_pk]

    # Genuine executed report mutations (not assertions about possible failures).
    p=raw_pk[0]
    corrupted=bytearray(base64.b64decode(p["b64"]))
    corrupted[4]^=1
    bad_wire=(p["plane"],base64.b64encode(corrupted).decode("ascii"))
    negatives=[expect_hold("flipped_body_byte",lambda:readback(
        [bad_wire]+baseline[1:],len(raw_pk),raw_hashes,h(src),len(src)))]
    swapped=list(baseline)
    swapped[0]=(PLANES[1],swapped[0][1])
    negatives.append(expect_hold("swapped_R_to_G_plane",lambda:readback(
        swapped,len(raw_pk),raw_hashes,h(src),len(src))))
    negatives.append(expect_hold("duplicate_index",lambda:readback(
        baseline+[baseline[0]],len(raw_pk),raw_hashes,h(src),len(src))))
    negatives.append(expect_hold("missing_chunk_fake_filler",lambda:readback(
        baseline[:-1],len(raw_pk),raw_hashes,h(src),len(src))))
    changed=bytearray(base64.b64decode(raw_pk[1]["b64"]))
    changed[0:4]=struct.pack("<I",65535)
    forged=list(baseline)
    forged[1]=(raw_pk[1]["plane"],base64.b64encode(changed).decode("ascii"))
    negatives.append(expect_hold("forged_LE32_index",lambda:readback(
        forged,len(raw_pk),raw_hashes,h(src),len(src))))

    # Attacker can recompute *local* per-chunk hashes; pinned root still rejects.
    changed_proj=bytearray(encoded)
    s=struct.unpack_from("<H",changed_proj)[0]
    assert s<=762
    struct.pack_into("<H",changed_proj,0,s+3)
    reencoded=bytes(changed_proj)
    local=packets(reencoded)
    local_wires=[(x["plane"],x["b64"]) for x in local]
    local_hashes=[x["body_sha"] for x in local]
    negatives.append(expect_hold("corrupt_common_sum_root_anchored",lambda:
        readback(local_wires,len(local),local_hashes,h(encoded),len(encoded))))
    assert project_differences((10,20,30))==project_differences((15,25,35))
    lines.append("KERNEL|a=10,20,30|b=15,25,35|same_differences=1"
                 "|sum_a=60|sum_b=75|lossless_without_common=0|json=0")

    # Fill 729 new names, evict every original projected chunk.
    bank=banks["projected"]
    prior_ids=bank.stable
    for i in range(CAPACITY):
        bank.store(1000+i,("R","QkFOSy1GSUxMRVI="))
    assert bank.occupancy()==CAPACITY and bank.evictions==63
    assert bank.stable==prior_ids and bank.identities_unchanged()
    assert all(i not in bank.where for i in range(63))
    negatives.append(expect_hold("evicted_stale_memory",lambda: bank.read(0)))
    lines.append(f"BANK|capacity={CAPACITY}|occupancy={bank.occupancy()}|evictions={bank.evictions}"
                 f"|initial_hits={bank_stats['projected']['hits']}|slot_ids_stable=1"
                 f"|stale_original_chunks=63|json=0")

    outcomes=("T","A","R")*9
    closure=Counter(outcomes)
    trit_sum=sum({"T":1,"A":0,"R":-1}[o] for o in outcomes)
    assert [closure[k] for k in "TAR"]==[9,9,9] and trit_sum==0
    assert len(outcomes)==27
    lines.append("LIGHT|synthetic_events=27|T=9|A=9|R=9|trit_sum=0"
                 "|per_event_one_outcome=1|physical_photons_measured=0|json=0")
    for test in negatives:
        lines.append(f"NEG|name={test['name']}|verdict={test['verdict']}|json=0")
    assert len(negatives)==7 and all(x["verdict"]=="HELD" for x in negatives)
    lines.append("TRUST|coherent_packet_and_local_hash_forgery_can_be_self_consistent=1"
                 "|external_source_authenticated=0|actual_QR_pixels_rendered=0"
                 "|real_camera_or_optical_storage_used=0|json=0")
    lines.append("END|raw_chunks=32|raw_frames=11|projected_chunks=63|projected_frames=21"
                 "|lossless_both_modes=1|negative_held=7|bounded_slot_ids=729"
                 "|historical_stones_unchanged=1|json=0")
    full=("\n".join(lines)+"\n").encode("ascii")
    report=dict(schema=SCHEMA,status="PASS",source_bytes=len(src),source_sha256=h(src),
                projected_bytes=len(encoded),projected_sha256=h(encoded),
                projected_triples=21846,padding_bytes=2,
                matrix_rank=2,matrix_trace=2,matrix_projector_identity=True,
                test_triples=projector_cases,
                raw_mode=bank_stats["raw"],projected_mode=bank_stats["projected"],
                initial_total_stored_packets=95,
                bank_capacity=729,post_fill_occupancy=729,post_fill_evictions=63,
                immutable_slot_identities=True,
                optical_events=27,optical_census={"T":9,"A":9,"R":9},trit_sum=0,
                executed_negative_controls=negatives,negative_held_count=7,
                common_mode_required_for_lossless=True,
                full_trace_bytes=len(full),full_trace_sha256=h(full),
                origin_authenticated=False,
                qr_pixels_generated=False,camera_used=False,
                optical_device_used=False,
                physical_hosts_attested=False)
    return full,report

if __name__=="__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: python seat3_lightbank.py trace.hbp metrics.json")
    raw,report=audit()
    Path(sys.argv[1]).write_bytes(raw)
    Path(sys.argv[2]).write_text(json.dumps(report,sort_keys=True,indent=2)+"\n")
    print(json.dumps({
        "status":"PASS","source_sha256":report["source_sha256"],
        "encoded_sha256":report["projected_sha256"],
        "trace_bytes":len(raw),"trace_sha256":report["full_trace_sha256"],
        "raw_chunks":report["raw_mode"]["chunks"],
        "projected_chunks":report["projected_mode"]["chunks"],
        "evictions":report["post_fill_evictions"],
        "held":report["negative_held_count"]},sort_keys=True))
