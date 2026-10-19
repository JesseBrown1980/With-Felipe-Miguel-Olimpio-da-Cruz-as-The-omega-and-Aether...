#!/usr/bin/env python3
"""Seat 1 factorized 27-sector x 7-band x 81-identity digital memory resolver.

Uses 567 source entries in memory and computes sector identity on demand.
Never claims to store 15,309 independent memories or physical photons.
Preregistered at experiments/seat1/factorized27/PREREG-FACTOR-INDEX-20261015.md.
"""
import hashlib
import json
from pathlib import Path
import sys

SOURCE_SHA="02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22"
BANK_SHA="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345"
BASE_SHA="6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee"
EXPANDED_SHA="2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e"
SCHEMA="ASOLARIA-RAINBOW27-FACTORIZED-RESOLVER-V1"
BANDS=("red","orange","yellow","green","blue","indigo","violet")

def sha(blob):
    return hashlib.sha256(blob).hexdigest()

def require(condition,reason):
    if not condition: raise ValueError(reason)

def pin(blob,expected,name):
    require(sha(blob)==expected,"PIN_"+name+"_MISMATCH")

class Resolver:
    def __init__(self,source,bank,index):
        pin(source,SOURCE_SHA,"SOURCE")
        pin(bank,BANK_SHA,"BANK")
        pin(index,BASE_SHA,"BASE_INDEX")
        raw=json.loads(source)
        require(raw.get("schema")=="ASOLARIA-SEAT1-81-RGB-LIGHTBANK-V1" and len(raw.get("records",[]))==81,
                "INVALID_81_SOURCE")
        self.records=raw["records"]
        self.bank=bank
        lines=index.decode("ascii").splitlines()
        require(index.endswith(b"\n") and len(lines)==567,"BASE_INDEX_COUNT")
        lookup={}
        for line in lines:
            chunks=line.split("|")
            require(len(chunks)==6 and chunks[0]=="MEM","BASE_INDEX_FORMAT")
            kv={}
            for field in chunks[1:]:
                key,sep,value=field.partition("=")
                require(bool(sep) and key not in kv,"BASE_INDEX_FIELD")
                kv[key]=value
            require(set(kv)=={"band","id","offset","length","sha256"},"BASE_INDEX_FIELDS")
            band,identity=kv["band"],kv["id"]
            require(band in BANDS and identity in {f"site-{i:03d}" for i in range(81)},
                    "BASE_INDEX_IDENTITY")
            require((band,identity) not in lookup,"DUPLICATE_BASE_REFERENCE")
            require(kv["offset"].isdigit() and kv["length"].isdigit(),"BASE_INDEX_BOUNDS")
            offset,length=int(kv["offset"]),int(kv["length"])
            require(length>0 and offset+length<=len(bank),"BASE_INDEX_BOUNDS")
            payload=bank[offset:offset+length]
            require(sha(payload)==kv["sha256"],"BASE_ROW_HASH_MISMATCH")
            obj=json.loads(payload)
            require(obj.get("schema")=="ASOLARIA-RAINBOW7-BANK-ENTRY-V1"
                    and obj.get("id")==identity and obj.get("band")==band
                    and obj.get("address")==f"rainbow7/{band}/{identity}", "BANK_ENTRY_IDENTITY")
            require(obj.get("record")==self.records[int(identity[5:])],"ORIGINAL_81_ANCESTRY")
            lookup[(band,identity)]=(offset,length,kv["sha256"])
        require(len(lookup)==567 and all((b,f"site-{n:03d}") in lookup for b in BANDS for n in range(81)),
                "INCOMPLETE_BASE_INDEX")
        self.lookup=lookup # 567 entries, NOT a 15,309-row alias index
        self.base_bytes=len(index)

    def resolve(self,sector,band,identity,coordinates=None):
        require(type(sector) is int and 0<=sector<27,"INVALID_SECTOR")
        require(band in BANDS and type(band) is str,"INVALID_BAND")
        require(type(identity) is str and identity in {f"site-{n:03d}" for n in range(81)},
                "INVALID_SITE")
        rgb=(sector//9,(sector//3)%3,sector%3)
        if coordinates is not None:
            require(type(coordinates) is tuple and len(coordinates)==3 and
                    all(type(c) is int and 0<=c<=2 for c in coordinates) and
                    coordinates==rgb,"ORDERED_COORDINATE_MISMATCH")
        require((band,identity) in self.lookup,"MISSING_BASE_ROW")
        offset,length,digest=self.lookup[(band,identity)]
        payload=self.bank[offset:offset+length]
        require(sha(payload)==digest,"RESOLVED_ROW_HASH_MISMATCH")
        return sector,rgb,band,identity,offset,length,digest

    def stream_expanded_digest(self):
        hasher=hashlib.sha256()
        total=count=0
        for sector in range(27):
            for band in BANDS:
                for n in range(81):
                    s,rgb,b,id_,off,length,digest=self.resolve(sector,band,f"site-{n:03d}")
                    line=(f"ADDR|sector={s}|r={rgb[0]}|g={rgb[1]}|b={rgb[2]}|"
                          f"band={b}|id={id_}|offset={off}|length={length}|"
                          f"source_sha256={digest}\n").encode("ascii")
                    hasher.update(line)
                    total+=len(line)
                    count+=1
        return hasher.hexdigest(),total,count

def expect(label,fn,reason):
    error=None
    try: fn()
    except (ValueError,KeyError,UnicodeError,json.JSONDecodeError) as e:
        error=str(e)
    require(error==reason,"FAILURE_TEST_NOT_REJECTED_"+label+"_"+str(error))
    return True

def run(original,bankdir,outdir):
    original,bankdir,outdir=map(Path,(original,bankdir,outdir))
    source=(original/"lightbank-memories.json").read_bytes()
    bank=(bankdir/"rainbow7-bank.jsonl").read_bytes()
    index=(bankdir/"rainbow7-index.hbi").read_bytes()
    resolver=Resolver(source,bank,index)
    digest,expanded_bytes,logical=resolver.stream_expanded_digest()
    require(digest==EXPANDED_SHA,"LEGACY_EXPANDED_INDEX_DIFFERENT")
    require((expanded_bytes,logical,engine_bytes(resolver))==(2344761,15309,70043),
            "LEGACY_SIZE_DRIFT")
    require(len(bank)==184815,"LEGACY_BANK_SIZE_DRIFT")
    for sector in range(27):
        r,g,b=sector//9,(sector//3)%3,sector%3
        require(9*r+3*g+b==sector,"ORDERED_INVERSE_FAIL")
    left=resolver.resolve(18,"red","site-000")
    right=resolver.resolve(6,"red","site-000")
    require(left[1]!=(right[1]) and left[4:]==right[4:],"ORDERED_IDENTITY_COLLISION")
    def intensity(rgb):
        r,g,b=rgb
        q=r*r+g*g+b*b-r*g-r*b-g*b
        return ((r+g+b)**2,q,q)
    require(intensity(left[1])==intensity(right[1]),"EXPECTED_INTENSITY_SYMMETRY_ABSENT")
    require(resolver.resolve(0,"red","site-000")[1]==(0,0,0),"DARK_SECTOR_DROPPED")
    def flip(buf):
        b=bytearray(buf)
        b[min(20,len(b)-1)]^=1
        return bytes(b)
    negative=[
        expect("source_byte",lambda:Resolver(flip(source),bank,index),"PIN_SOURCE_MISMATCH"),
        expect("bank_byte",lambda:Resolver(source,flip(bank),index),"PIN_BANK_MISMATCH"),
        expect("index_byte",lambda:Resolver(source,bank,flip(index)),"PIN_BASE_INDEX_MISMATCH"),
        expect("base_index_missing_row",lambda:Resolver(source,bank,b"\n".join(index.splitlines()[:-1])+b"\n"),"PIN_BASE_INDEX_MISMATCH"),
        expect("sector_negative",lambda:resolver.resolve(-1,"red","site-000"),"INVALID_SECTOR"),
        expect("sector_27",lambda:resolver.resolve(27,"red","site-000"),"INVALID_SECTOR"),
        expect("sector_fraction",lambda:resolver.resolve(0.5,"red","site-000"),"INVALID_SECTOR"),
        expect("sector_string",lambda:resolver.resolve("0","red","site-000"),"INVALID_SECTOR"),
        expect("band_missing",lambda:resolver.resolve(0,"infrared","site-000"),"INVALID_BAND"),
        expect("site_missing",lambda:resolver.resolve(0,"red","site-081"),"INVALID_SITE"),
        expect("ordered_coordinate_swap",lambda:resolver.resolve(18,"red","site-000",(0,2,0)),"ORDERED_COORDINATE_MISMATCH"),
        expect("wrong_external_anchor",lambda:pin(bank,"0"*64,"BANK"),"PIN_BANK_MISMATCH"),
    ]
    require(len(negative)==12 and all(negative),"NEGATIVE_CONTROL_MISSING")
    # Actively remove base references, attempt EVERY logical address, then restore.
    # Do not equate arithmetic about expected erasure with observed rejected reads.
    def erasure(removed,expected):
        removed=set(removed)
        saved={key:resolver.lookup.pop(key) for key in removed}
        try:
            rejected=accepted=0
            for s in range(27):
                for band in BANDS:
                    for n in range(81):
                        identity=f"site-{n:03d}"
                        try:
                            resolver.resolve(s,band,identity)
                        except ValueError as e:
                            require(str(e)=="MISSING_BASE_ROW" and (band,identity) in saved,
                                    "ERASURE_FAILED_FOR_WRONG_REASON")
                            rejected+=1
                        else:
                            require((band,identity) not in saved,"ERASURE_NOT_DETECTED")
                            accepted+=1
            require(rejected==expected and accepted==15309-expected,"ERASURE_COUNT_MISMATCH")
            return rejected
        finally:
            resolver.lookup.update(saved)
    missing_violet=erasure(((band,f"site-{n:03d}") for band in ("violet",) for n in range(81)),2187)
    missing_one_source=erasure((("red","site-000"),),27)
    summary={
        "schema":SCHEMA,
        "source_sha256":SOURCE_SHA,"bank_sha256":BANK_SHA,"base_index_sha256":BASE_SHA,
        "legacy_expanded_index_sha256":digest,
        "logical_addresses":logical,"stored_bank_rows":len(resolver.lookup),"original_memories":81,
        "sector_count":27,"symbolic_bands":7,
        "expanded_index_bytes":expanded_bytes,"factorized_base_index_bytes":resolver.base_bytes,
        "retained_bank_bytes":len(bank),"avoided_repeated_index_bytes":expanded_bytes-resolver.base_bytes,
        "payload_compression_bytes":0,
        "missing_violet_logical_aliases":missing_violet,"missing_one_row_logical_aliases":missing_one_source,
        "ordered_color_identity_preserved":True,"symmetric_intensity_permutation_collision":True,
        "dark_address_retained":True,"negative_faults_rejected":len(negative),
        "external_origin_authenticated":False,"coherent_anchor_substitution":"HELD",
        "physical_optical_memory_verified":False,"quantum_effect_verified":False,"release_authorized":False
    }
    report=(json.dumps(summary,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
    hbp=(
        f"FACTOR27|schema={SCHEMA}|source_sha256={SOURCE_SHA}|bank_sha256={BANK_SHA}|base_index_sha256={BASE_SHA}\n"
        f"COUNTS|logical=15309|unique_bank=567|original=81|expanded_bytes=2344761|base_index_bytes=70043|metadata_avoided_bytes=2274718|payload_saved_bytes=0\n"
        f"PROOF|expanded_index_sha256={digest}|ordered_permutation_distinct=1|faults_rejected=12|source_trust=HELD|physical_optics=0\n"
    ).encode("ascii")
    outdir.mkdir(parents=True,exist_ok=True)
    for name,blob in (("factorized27.json",report),("factorized27.hbp",hbp)):
        (outdir/name).write_bytes(blob)
        (outdir/(name+".sha256")).write_bytes(f"{sha(blob)}  {name}\n".encode("ascii"))
    print(json.dumps({"status":"PASS","logical_addresses":logical,"expanded_sha256":digest,
        "factorized_base_bytes":resolver.base_bytes,"metadata_avoided":expanded_bytes-resolver.base_bytes,
        "receipt_sha256":sha(hbp),"actual_failures":len(negative),"optical_physical_verified":False},
        sort_keys=True))

def engine_bytes(resolver):
    return resolver.base_bytes

if __name__=="__main__":
    if len(sys.argv)!=4:
        raise SystemExit("usage: factorized27.py original-qr-evidence rainbow7-evidence output-evidence")
    run(*sys.argv[1:])
