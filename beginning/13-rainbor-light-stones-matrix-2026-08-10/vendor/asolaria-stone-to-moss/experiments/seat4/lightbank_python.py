#!/usr/bin/env python3
"""Seat 4 B3 - 27-colour symbolic light sticks and original Colour QR transport.

No optical electronics or QR image pixels are generated; 27 RGB 3-trit states
are digital bytes. Three erasure banks use A,B,A-XOR-B and any TWO reconstruct.
The separate Colour QR transport encodes 2100-byte indexed Base64 payloads.
The independent Node verifier regenerates all bytes and challenges the decoder.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import struct

N=512
HALF=256
MAGIC=b"ASOLARIA-LIGHTBANK-G27-V1\n"
QR_MAGIC=b"ASOLARIA-COLORQR-PAYLOAD-V1\n"
NONCE=hashlib.sha256(b"ASOLARIA|LIGHTBANK|2026-10-15|B3|PUBLIC").digest()
QR_CHUNK=2100
BANKS=("A","B","P")
KNOWN_SOURCE_SHA={
 "august-rainbor-design.hbp":"bb870f697af209f228f0d42c0de15ece58b550ed9e9bbb31f855956190ac7306",
 "retention-rank40.tsv":"f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78",
 "seat1-3state-photocycle.hbp":"de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b",
 "seat4-b2-fault-ledger.hbp":"ad471bc627451f65d6f26797ddf6c03546ac1f74ab8e3698d9825f1409f9bbb2",
 "seat4-b2-full-ticks.hbp":"2b9575a8d46c2d2f0842d590081641ed2b20daddccc7153107d76efa0d597277",
}

def sha(b):
    return hashlib.sha256(b).hexdigest()

def digits(g):
    assert 0<=g<27
    return g//9,(g//3)%3,g%3

def rotate(g,phase):
    a,b,c=digits(g)
    if phase==1:
        a,b,c=b,c,a
    elif phase==2:
        a,b,c=c,a,b
    else:
        assert phase==0
    return 9*a+3*b+c

def lookup_tables():
    enc=[[bytes((rotate(x//27,p),rotate(x%27,p))) for x in range(256)]
         for p in range(3)]
    inv=[{rotate(g,p):g for g in range(27)} for p in range(3)]
    return enc,inv

ENC,INV=lookup_tables()
assert all(len(set(t))==256 for t in ENC)

def encode_shard(shard,phase):
    assert len(shard)==HALF
    return b"".join(ENC[phase][b] for b in shard)

def decode_shard(glyphs,phase):
    if len(glyphs)!=N:
        raise ValueError("shard length")
    inverse=INV[phase]
    try:
        vals=[inverse[g] for g in glyphs]
    except KeyError as e:
        raise ValueError("RGB ternary glyph out of range") from e
    out=bytearray(HALF)
    for i in range(HALF):
        v=27*vals[2*i]+vals[2*i+1]
        if v>=256:
            raise ValueError("invalid 2-glyph byte; must be <256")
        out[i]=v
    return bytes(out)

def header(bank,raw_size,digest):
    assert bank in range(3)
    return MAGIC+struct.pack(">BQQ",bank,raw_size,(raw_size+N-1)//N)+digest+NONCE

HEADER_BYTES=len(header(0,0,b"\0"*32))

def read_header(blob,idx,length,digest):
    assert blob[:len(MAGIC)]==MAGIC
    bank_id,raw_size,stripes=struct.unpack(">BQQ",blob[len(MAGIC):len(MAGIC)+17])
    if bank_id!=idx or raw_size!=length or stripes!=(length+N-1)//N:
        raise ValueError("stale/wrong header, bank ID or size")
    if blob[len(MAGIC)+17:len(MAGIC)+49]!=digest:
        raise ValueError("wrong original-source archive digest")
    if blob[len(MAGIC)+49:HEADER_BYTES]!=NONCE:
        raise ValueError("stale symbolic nonce")
    if len(blob)!=HEADER_BYTES+stripes*N:
        raise ValueError("wrong bank glyph length")
    return memoryview(blob)[HEADER_BYTES:]

def make_glyph_banks(source,out):
    raw=source.read_bytes()
    size=len(raw)
    assert size>35_000_000
    expected_digest=hashlib.sha256(raw).digest()
    stripes=(size+N-1)//N
    bpaths=[out/f"lightbank-{letter}.g27" for letter in BANKS]
    h=tuple(header(bank,size,expected_digest) for bank in range(3))
    with bpaths[0].open("wb") as a, bpaths[1].open("wb") as b, bpaths[2].open("wb") as p:
        outputs=[a,b,p]
        for f,head in zip(outputs,h):
            f.write(head)
        for stripe in range(stripes):
            payload=raw[stripe*N:(stripe+1)*N]
            payload=payload.ljust(N,b"\0")
            left,right=payload[:HALF],payload[HALF:]
            parity=bytes(u^v for u,v in zip(left,right))
            for bank,shard in enumerate((left,right,parity)):
                outputs[bank].write(encode_shard(shard,(stripe+bank)%3))
    hashes={letter:sha(path.read_bytes()) for letter,path in zip(BANKS,bpaths)}
    return hashes

def rebuild(raw,banks,available):
    if len(set(available))!=2:
        raise ValueError("exactly two independent bank identities required")
    dig=hashlib.sha256(raw).digest()
    have={i:read_header(banks[i],i,len(raw),dig) for i in available}
    size=len(raw)
    recovered=bytearray()
    for stripe in range((size+N-1)//N):
        parts={i:decode_shard(have[i][stripe*N:(stripe+1)*N],(stripe+i)%3)
               for i in available}
        if 0 not in parts:
            parts[0]=bytes(a^b for a,b in zip(parts[1],parts[2]))
        if 1 not in parts:
            parts[1]=bytes(a^b for a,b in zip(parts[0],parts[2]))
        recovered.extend(parts[0])
        recovered.extend(parts[1])
    return bytes(recovered[:size])

def color_qr_transport(raw,out):
    count=(len(raw)+QR_CHUNK-1)//QR_CHUNK
    path=out/"colourqr-rgb-transport.hbp"
    with path.open("wb") as f:
        f.write(QR_MAGIC)
        for index in range(count):
            chunk=raw[index*QR_CHUNK:(index+1)*QR_CHUNK]
            encoded=base64.b64encode(struct.pack("<I",index)+chunk)
            assert len(encoded)<65536
            # The unrendered QR frame has 3 plane slots: idx%3 -> 0 R,1 G,2 B.
            f.write(struct.pack(">IBH",index//3,index%3,len(encoded)))
            f.write(encoded)
    return {"chunks":count,"colour_frames":(count+2)//3,
            "last_frame_used_planes":((count-1)%3)+1,
            "sha256":sha(path.read_bytes()),"bytes":path.stat().st_size}

def decode_transport(data,expected,negative=False):
    if not data.startswith(QR_MAGIC):
        raise ValueError("invalid RGB packet stream header")
    ptr=len(QR_MAGIC)
    chunks={}
    while ptr<len(data):
        if ptr+7>len(data):
            raise ValueError("partial RGB packet header")
        frame,plane,n=struct.unpack(">IBH",data[ptr:ptr+7])
        ptr+=7
        if n==0 or n>4096 or ptr+n>len(data):
            raise ValueError("invalid plane payload length")
        ascii_chunk=data[ptr:ptr+n];ptr+=n
        try:
            indexed=base64.b64decode(ascii_chunk,validate=True)
        except Exception as e:
            raise ValueError("invalid Base64") from e
        if len(indexed)<5 or len(indexed)>QR_CHUNK+4:
            raise ValueError("invalid indexed chunk length")
        index=struct.unpack("<I",indexed[:4])[0]
        if index in chunks or frame!=index//3 or plane!=index%3:
            raise ValueError("duplicate index, wrong address, or wrong RGB plane")
        chunks[index]=indexed[4:]
    count=(len(expected)+QR_CHUNK-1)//QR_CHUNK
    if set(chunks)!=set(range(count)):
        raise ValueError("missing indexed chunks")
    recovered=b"".join(chunks[i] for i in range(count))
    if len(recovered)!=len(expected) or sha(recovered)!=sha(expected):
        raise ValueError("original archive hash/length mismatch")
    return recovered

def projector_control():
    # P=I-J/3. Use integer numerators (exact), never physical-light model.
    tests=0;collisions=0;recoveries=0
    for a in (-7,-3,0,1,2,7,19):
        for b in (-7,-3,0,1,2,7,19):
            for c in (-7,-3,0,1,2,7,19):
                s=a+b+c
                y=(3*a-s,3*b-s,3*c-s)
                assert sum(y)==0
                for k in (-11,1,13):
                    shifted=tuple(x+k for x in (a,b,c))
                    sp=sum(shifted)
                    yp=tuple(3*x-sp for x in shifted)
                    assert yp==y and shifted!=(a,b,c)
                    collisions+=1
                assert tuple((v+s)//3 for v in y)==(a,b,c)
                assert all((v+s)%3==0 for v in y)
                recoveries+=1
                tests+=1
    return {"exact_rank":2,"exact_nullity":1,
            "common_mode_collisions":collisions,
            "restored_with_original_sum":recoveries,"triples":tests,
            "physical_instantaneous_signaling_measured":False}

def negative_controls(raw,banks,qr):
    dig=hashlib.sha256(raw).digest()
    stripes=(len(raw)+N-1)//N
    examples=0
    controls={}
    # For every 0/1/2 surviving bank, exhibit two distinct valid source
    # completions having the SAME surviving shard (no full source SHA bypass).
    for survivor in range(3):
        one=read_header(banks[survivor],survivor,len(raw),dig)
        shard=decode_shard(one[:N],survivor)
        a0,b0=raw[:N].ljust(N,b"\0")[:HALF],raw[:N].ljust(N,b"\0")[HALF:]
        if survivor==0:
            a1,b1=a0,bytes([b0[0]^1])+b0[1:]
        elif survivor==1:
            a1,b1=bytes([a0[0]^1])+a0[1:],b0
        else:
            a1=bytes([a0[0]^1])+a0[1:]
            b1=bytes([b0[0]^1])+b0[1:]
        assert (a1,b1)!=(a0,b0)
        original=(a0,b0,bytes(x^y for x,y in zip(a0,b0)))
        variant=(a1,b1,bytes(x^y for x,y in zip(a1,b1)))
        assert original[survivor]==variant[survivor]==shard
        examples+=1
    controls["single_bank_ambiguity_witnesses"]=examples
    for bank in range(3):
        src=banks[bank]
        corrupted=bytearray(src[:HEADER_BYTES+N])
        corrupted[HEADER_BYTES+3]=(corrupted[HEADER_BYTES+3]+1)%27
        assert corrupted!=src[:HEADER_BYTES+N]
        # A full-bank digest must reject any mutated glyph, independent of QR.
        # Hash changed without allocating/copying 35MB of source.
        mutated_hash=hashlib.sha256()
        mutated_hash.update(corrupted)
        mutated_hash.update(src[HEADER_BYTES+N:])
        assert mutated_hash.hexdigest()!=sha(src)
    controls["corrupt_glyph_digest_rejected"]=3
    try:
        decode_shard(bytes([27])+bytes(N-1),0)
        raise AssertionError("invalid RGB glyph unexpectedly accepted")
    except ValueError:
        controls["out_of_range_glyph_rejected"]=1
    try:
        decode_shard(bytes([26,26])+bytes(N-2),0)
        raise AssertionError("illegal 2-glyph high digit accepted")
    except ValueError:
        controls["out_of_range_byte_rejected"]=1
    try:
        read_header(banks[0],1,len(raw),dig)
        raise AssertionError("bank ID confusion accepted")
    except ValueError:
        controls["wrong_bank_id_rejected"]=1
    try:
        read_header(banks[0],0,len(raw)+1,dig)
        raise AssertionError("stale address/length accepted")
    except ValueError:
        controls["wrong_length_rejected"]=1
    try:
        read_header(banks[0],0,len(raw),b"\x77"*32)
        raise AssertionError("forged original digest accepted")
    except ValueError:
        controls["forged_archive_digest_rejected"]=1
    wrong_nonce=bytearray(banks[0][:HEADER_BYTES])
    wrong_nonce[-1]^=1
    try:
        read_header(bytes(wrong_nonce)+banks[0][HEADER_BYTES:],0,len(raw),dig)
        raise AssertionError("stale nonce accepted")
    except ValueError:
        controls["stale_nonce_rejected"]=1
    # Indexed 2100-byte packet, QR plane assignments, duplicates and gaps.
    assert decode_transport(qr,raw)==raw
    qpos=len(QR_MAGIC)
    frame,plane,length=struct.unpack(">IBH",qr[qpos:qpos+7])
    assert (frame,plane)==(0,0)
    try:
        decode_transport(qr[:qpos+7+length]+qr[qpos:],raw)
        raise AssertionError("duplicate frame accepted")
    except ValueError:
        controls["duplicated_colour_qr_index_rejected"]=1
    try:
        decode_transport(qr[qpos+7+length:],raw)
        raise AssertionError("missing frame accepted")
    except ValueError:
        controls["missing_colour_qr_index_rejected"]=1
    altered=bytearray(qr[:qpos+7+length])
    altered[qpos+4]=2
    try:
        decode_transport(bytes(altered)+qr[qpos+7+length:],raw)
        raise AssertionError("wrong RGB plane accepted")
    except ValueError:
        controls["wrong_colour_qr_plane_rejected"]=1
    # Base64 shape cannot be accepted if one character is invalid.
    altered=bytearray(qr[:qpos+7+length])
    altered[qpos+7]=ord("!")
    try:
        decode_transport(bytes(altered)+qr[qpos+7+length:],raw)
        raise AssertionError("bad Base64 accepted")
    except ValueError:
        controls["malformed_base64_rejected"]=1
    assert len(banks)==3 and stripes>50_000
    controls["physical_hardware_claims"]=0
    return controls

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--archive",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    raw=args.archive.read_bytes()
    assert len(raw)>35_000_000
    bankhashes=make_glyph_banks(args.archive,args.out)
    banks=[(args.out/f"lightbank-{l}.g27").read_bytes() for l in BANKS]
    for a,b in ((0,1),(0,2),(1,2)):
        assert rebuild(raw,banks,(a,b))==raw
    qr_info=color_qr_transport(raw,args.out)
    qr=(args.out/"colourqr-rgb-transport.hbp").read_bytes()
    assert decode_transport(qr,raw)==raw
    controls=negative_controls(raw,banks,qr)
    projector=projector_control()
    report={
        "status":"PASS",
        "schema":"ASOLARIA-SEAT4-B3-LIGHTBANK-G27-QR-V1",
        "evidence_class":"SOFTWARE_RGB_SYMBOLIC_ERASURE_STORAGE_NO_PHOTONS",
        "archive_bytes":len(raw),"archive_sha256":sha(raw),
        "bank_count":3,"stripes":(len(raw)+N-1)//N,
        "bank_bytes":{l:len(b) for l,b in zip(BANKS,banks)},
        "bank_sha256":bankhashes,
        "pairwise_full_archive_exact_restore":3,
        "one_bank_cannot_uniquely_restore":True,
        "symbolic_colour_levels":27,"glyphs_per_source_byte":2,
        "colour_qr_transport":qr_info,
        "negative_controls":controls,
        "projector":projector,
        "gf2_retention_loss_test_separate":True,
        "physical_photons_or_optical_memory_hardware_measured":False,
        "source_encryption_or_secret_sharing":False,
    }
    (args.out/"lightbank-result.json").write_text(json.dumps(report,sort_keys=True,indent=2)+"\n",
                                               encoding="utf-8",newline="\n")
    print(json.dumps(report,sort_keys=True))

if __name__=="__main__":
    main()
