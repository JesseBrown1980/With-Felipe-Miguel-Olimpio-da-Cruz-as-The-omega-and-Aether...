#!/usr/bin/env python3
"""Seat1 ordered Rainbow27 -> existing Rainbow7 bank, digital only.
Prereg: PREREG-ORDERED27-RAINBOW7-20261015.md.
"""
from collections import Counter
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import sys

BANDS=("red","orange","yellow","green","blue","indigo","violet")
SOURCE_SHA="02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22"
BANK_SHA="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345"
INDEX_SHA="6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee"
SCHEMA="ASOLARIA-ORDERED27-RAINBOW7-LOGICAL-V1"

def sha(b):
    return hashlib.sha256(b).hexdigest()

def canonical(obj):
    return (json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=False)+"\n").encode("utf-8")

def parse_existing(bank,index):
    if sha(bank)!=BANK_SHA or sha(index)!=INDEX_SHA:
        raise ValueError("EXTERNAL_PINNED_BANK_OR_INDEX_MISMATCH")
    lines=index.decode("ascii").splitlines()
    if len(lines)!=567 or not index.endswith(b"\n"):
        raise ValueError("SOURCE_INDEX_LENGTH")
    lookup={}
    for row in lines:
        tokens=row.split("|")
        if tokens[0]!="MEM" or len(tokens)!=6:raise ValueError("SOURCE_INDEX_FORMAT")
        d=dict(x.split("=",1) for x in tokens[1:])
        k=(d["band"],d["id"])
        if k in lookup:raise ValueError("DUPLICATE_SOURCE_ADDRESS")
        offset=int(d["offset"])
        length=int(d["length"])
        if offset<0 or length<=0 or offset+length>len(bank):
            raise ValueError("SOURCE_INDEX_BOUNDS")
        payload=bank[offset:offset+length]
        if sha(payload)!=d["sha256"]:raise ValueError("SOURCE_ROW_SHA_MISMATCH")
        content=json.loads(payload)
        if content["schema"]!="ASOLARIA-RAINBOW7-BANK-ENTRY-V1" or content["address"]!=f"rainbow7/{k[0]}/{k[1]}":
            raise ValueError("SOURCE_ROW_ADDRESS")
        lookup[k]=(offset,length,d["sha256"])
    if len(lookup)!=567:raise ValueError("SOURCE_INDEX_COUNT")
    return lookup

def intensities(r,g,b):
    S=r+g+b
    Q=r*r+g*g+b*b-r*g-r*b-g*b
    return (S*S,Q,Q)

def signature_stats():
    raw=Counter()
    norm=Counter()
    for sector in range(27):
        r,g,b=sector//9,(sector//3)%3,sector%3
        S=r+g+b
        dr=3*r-S
        dg=3*g-S
        if ((dr+S)//3,(dg+S)//3,(S-dr-dg)//3)!=(r,g,b):
            raise AssertionError("PROJECTOR_NONINVERTIBLE_WITH_CENTER")
        v=intensities(r,g,b)
        raw[v]+=1
        norm[("UNDEFINED",) if sum(v)==0 else tuple(Fraction(t,sum(v)) for t in v)]+=1
    def loss(counts):
        return math.log2(27)-sum(-(v/27)*math.log2(v/27) for v in counts.values())
    if len(raw)!=10 or len(norm)!=7:
        raise AssertionError("CLASS_CARDINALITY_DRIFT")
    if intensities(2,0,0)!=intensities(0,2,0) or intensities(2,0,0)!=intensities(0,0,2):
        raise AssertionError("PERMUTATION_NOT_COLLIDING")
    if not (abs(loss(raw)-1.6310777784188053)<1e-12 and abs(loss(norm)-2.1495962969373235)<1e-12):
        raise AssertionError("EXPECTED_ENTROPY_DRIFT")
    return len(raw),len(norm),round(loss(raw),12),round(loss(norm),12)

def build(original_dir,rainbow_dir,dest):
    original_dir=Path(original_dir)
    rainbow_dir=Path(rainbow_dir)
    dest=Path(dest)
    dest.mkdir(parents=True,exist_ok=True)
    original=(original_dir/"lightbank-memories.json").read_bytes()
    if sha(original)!=SOURCE_SHA:
        raise ValueError("ORIGINAL_PIXEL_QR_SOURCE_SHA_MISMATCH")
    source=json.loads(original)
    if source.get("schema")!="ASOLARIA-SEAT1-81-RGB-LIGHTBANK-V1" or len(source.get("records",[]))!=81:
        raise ValueError("ORIGINAL_SOURCE_SCHEMA_OR_COUNT")
    bank=(rainbow_dir/"rainbow7-bank.jsonl").read_bytes()
    base_index=(rainbow_dir/"rainbow7-index.hbi").read_bytes()
    lookup=parse_existing(bank,base_index)
    for band in BANDS:
        for i,record in enumerate(source["records"]):
            identity=f"site-{i:03d}"
            offset,length,digest=lookup[(band,identity)]
            row=json.loads(bank[offset:offset+length])
            if row["id"]!=identity or row["band"]!=band or row["record"]!=record:
                raise ValueError("ORIGINAL_CONTENT_DISAGREES_WITH_BANK")
    raw,norm,hraw,hnorm=signature_stats()
    lines=[]
    for sector in range(27):
        r,g,b=sector//9,(sector//3)%3,sector%3
        for band in BANDS:
            for i in range(81):
                site=f"site-{i:03d}"
                offset,length,digest=lookup[(band,site)]
                lines.append(f"ADDR|sector={sector}|r={r}|g={g}|b={b}|band={band}|id={site}|offset={offset}|length={length}|source_sha256={digest}")
    if len(lines)!=15309:raise AssertionError("ADDRESS_COUNT")
    index=("\n".join(lines)+"\n").encode("ascii")
    manifest={
        "schema":SCHEMA,
        "source_branch":"agent/seat-1/rainbow7-lightbank-memory-20261015",
        "source_commit":"7a1374935421c73dc8760c22fc268b1a3f5c79bd",
        "source_81_sha256":SOURCE_SHA,
        "pinned_existing_bank_sha256":BANK_SHA,
        "pinned_existing_index_sha256":INDEX_SHA,
        "new_index_sha256":sha(index),
        "ordered_ternary_sector_count":27,
        "logical_rainbow_band_count":7,
        "unique_original_source_records":81,
        "actual_stored_rainbow7_rows":567,
        "new_logical_address_probes":15309,
        "raw_intensity_equivalence_classes":raw,
        "normalized_intensity_equivalence_classes_including_zero":norm,
        "conditional_address_uncertainty_bits_raw":hraw,
        "conditional_address_uncertainty_bits_normalized":hnorm,
        "full_bank_retained_bytes":len(bank),
        "bytes_saved_by_addressing":0,
        "coherent_source_anchor_replacement":"HELD",
        "external_provenance":"HELD_HASH_ONLY",
        "physical_optical_storage_verified":False,
        "quantum_photon_or_wavelength_measurement":False
    }
    data=canonical(manifest)
    for name,blob in (("ordered27-rainbow7-index.hbi",index),("ordered27-rainbow7-manifest.json",data)):
        (dest/name).write_bytes(blob)
        (dest/(name+".sha256")).write_text(f"{sha(blob)}  {name}\n",encoding="ascii")
    print(json.dumps({"status":"PASS","logical_addresses":len(lines),"raw_classes":raw,
                      "normalized_classes":norm,"index_sha256":sha(index),"source_sha256":SOURCE_SHA},
                     sort_keys=True))
    return manifest

if __name__=="__main__":
    if len(sys.argv)!=4:raise SystemExit("usage: ordered27_index.py base-evidence rainbow-evidence out-evidence")
    build(*sys.argv[1:])
