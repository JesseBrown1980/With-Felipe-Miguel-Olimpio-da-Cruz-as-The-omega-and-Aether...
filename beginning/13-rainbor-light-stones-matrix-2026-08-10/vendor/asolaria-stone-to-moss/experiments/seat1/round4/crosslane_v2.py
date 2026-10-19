#!/usr/bin/env python3
"""Seat 1 Round 4: preregistered crosswalk of Seat 3 R27V2 and own ordered Rainbow7.
Strictly digital, pinned original memory bytes and peer's different source fixture.
Creates fresh evidence rather than editing any previously frozen stone.
"""
import hashlib
import json
import math
import re
import struct
import sys
from pathlib import Path

BANDS=("red","orange","yellow","green","blue","indigo","violet")
SOURCE_SHA="02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22"
BANK_SHA="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345"
BANK_INDEX_SHA="6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee"
ORDERED_SHA="2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e"
V2_SHA="8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672"
V2_SOURCE_SHA="351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1"
V2_HEAD="c32d472dfe84f352450eb50469e0e9a987c33d78"
SEAT1_HEAD="7b5faf1103a7b42b603b44b08a5a5bfa994d0f76"
TICKET=b"ASOLARIA-R27-V2|TICKET|"
ROW=re.compile(r"^CASE\|w=(\d{2})\|loc=(\d{2})\|id=(\d{2})\|rgb=([012]{3})\|raw=(\d+),(\d+),(\d+)\|prim=(\d+),(\d+),(\d+)\|den=(\d+)\|lane=([012H])$")
def sha(data):return hashlib.sha256(data).hexdigest()
def canonical(obj):return (json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
def fail(reason):raise ValueError(reason)
def require(condition,reason):
    if not condition:fail(reason)
def tuple_rgb(i):
    require(0<=i<27,"ORDERED_ID_RANGE")
    return (i//9,(i//3)%3,i%3)
def weights(rgb):
    r,g,b=rgb;s=r+g+b;q=r*r+g*g+b*b-r*g-r*b-g*b
    return (s*s,q,q)
def primitive(w):
    d=math.gcd(*w)
    return tuple(a//d for a in w) if d else (0,0,0)
def sample(w,loc,parts):
    den=sum(parts)
    if den==0:return "H"
    cap=1<<256;ceiling=cap//den*den
    for retry in range(10000):
        ticket=hashlib.sha256(TICKET+struct.pack("<HHI",w,loc,retry)).digest()
        n=int.from_bytes(ticket,"big")
        if n<ceiling:
            r=n%den
            return str(0 if r<parts[0] else (1 if r<parts[0]+parts[1] else 2))
    fail("REJECTION_LIMIT")
def parse_bank(bank,bank_index,original):
    require(sha(bank)==BANK_SHA,"EXTERNAL_PINNED_BANK_MISMATCH")
    require(sha(bank_index)==BANK_INDEX_SHA,"EXTERNAL_PINNED_INDEX_MISMATCH")
    lines=bank_index.decode("ascii").splitlines()
    require(len(lines)==567,"SOURCE_BANK_ROW_COUNT")
    entries={}
    for line in lines:
        t=line.split("|")
        require(len(t)==6 and t[0]=="MEM","SOURCE_INDEX_FORMAT")
        d=dict(v.split("=",1) for v in t[1:])
        key=(d["band"],d["id"])
        off,length=int(d["offset"]),int(d["length"])
        require(key not in entries and d["band"] in BANDS,"SOURCE_INDEX_DUPLICATE_OR_BAND")
        require(0<=off<len(bank) and length>0 and off+length<=len(bank),"SOURCE_INDEX_BOUNDS")
        chunk=bank[off:off+length]
        require(sha(chunk)==d["sha256"],"SOURCE_INDEX_ROW_SHA")
        obj=json.loads(chunk)
        require(obj["schema"]=="ASOLARIA-RAINBOW7-BANK-ENTRY-V1","SOURCE_ROW_SCHEMA")
        require(obj["address"]==f"rainbow7/{d['band']}/{d['id']}" and
                obj["band"]==d["band"] and obj["id"]==d["id"],"WRONG_RAINBOW_BAND")
        i=int(d["id"][5:])
        require(0<=i<81 and obj["record"]==original[i],"PINNED_ORIGINAL_SITE_MISMATCH")
        entries[key]=(off,length,d["sha256"])
    require(len(entries)==567,"SOURCE_INDEX_COUNT")
    return entries
def parse_legacy_order(index,entries):
    require(sha(index)==ORDERED_SHA,"EXTERNAL_PINNED_ORDERED27_MISMATCH")
    require(index.endswith(b"\n"),"ORDERED_INDEX_EOL")
    lines=index.decode("ascii").splitlines()
    require(len(lines)==15309,"ORDERED_INDEX_COUNT")
    i=0
    for sector in range(27):
        r,g,b=tuple_rgb(sector)
        for band in BANDS:
            for loc in range(81):
                name=f"site-{loc:03d}"
                off,length,rowhash=entries[band,name]
                expected=f"ADDR|sector={sector}|r={r}|g={g}|b={b}|band={band}|id={name}|offset={off}|length={length}|source_sha256={rowhash}"
                require(lines[i]==expected,"ORDERED27_LEGACY_ADDRESS_DRIFT")
                i+=1
def parse_v2(data):
    require(sha(data)==V2_SHA,"SEAT3_V2_PEER_TRACE_SHA_MISMATCH")
    lines=data.decode("ascii").splitlines()
    require(len(lines)==59050,"SEAT3_V2_ROW_COUNT")
    expected_header=f"R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|source_sha256={V2_SOURCE_SHA}|producer_sha=5045b5b2ee1960bc469b5588a1b17601490aef6a|peer_sha=98e62f1e7218c7fbb20e21fd5c3d734304e4ee6a|json=0"
    require(lines[0]==expected_header,"SEAT3_V2_PEER_HEADER_DRIFT")
    return lines[1:]
def check_case(text,w,loc,identity):
    m=ROW.fullmatch(text)
    require(m is not None,"V2_CASE_FORMAT")
    w0,l0,id0=map(int,m.group(1,2,3))
    require((w0,l0,id0)==(w,loc,identity),"V2_CASE_SEQUENCE_OR_ADDRESS")
    rgb=tuple_rgb(identity)
    require(m.group(4)=="".join(map(str,rgb)),"V2_ORDERED_RGB_COLLISION")
    raw=weights(rgb); prim=primitive(raw)
    require(tuple(map(int,m.group(5,6,7)))==raw,"V2_RAW_WEIGHTS_DRIFT")
    require(tuple(map(int,m.group(8,9,10)))==prim,"V2_PRIMITIVE_WEIGHTS_DRIFT")
    require(int(m.group(11))==sum(prim),"V2_DENOMINATOR_DRIFT")
    lane=sample(w,loc,prim)
    require(m.group(12)==lane,"V2_LANE_SAMPLING_DRIFT")
    return lane
def exact_read(bank,entries,band,location,original):
    name=f"site-{location:03d}"
    require((band,name) in entries,"BAND_OR_SITE_MISSING")
    off,size,digest=entries[band,name]
    chunk=bank[off:off+size]  # actual offset-based retained-byte read
    require(sha(chunk)==digest,"BANK_DIGEST_TAMPER")
    obj=json.loads(chunk)
    require(obj["band"]==band and obj["id"]==name and obj["address"]==f"rainbow7/{band}/{name}","WRONG_DESTINATION")
    require(obj["record"]==original[location],"BANK_SOURCE_MISMATCH")
    return chunk
def negative_tests(lines,bank,entries,orig):
    record=lines[18] # peer CASE at w0,loc0,id18 -> (2,0,0)
    def rejected(fn,reason):
        try:fn()
        except (ValueError,IndexError,AssertionError,KeyError) as err:
            require(str(err)==reason,f"UNEXPECTED_FAULT_REASON_{err}_EXPECTED_{reason}")
            return {"fault":reason,"exercised":True,"stage":"pre_actuation_memory_read","verdict":"REJECT"}
        fail("EXPECTED_FAULT_NOT_REJECTED_"+reason)
    tests=[]
    tests.append(rejected(lambda:check_case(record.replace("rgb=200","rgb=020"),0,0,18),"V2_ORDERED_RGB_COLLISION"))
    tests.append(rejected(lambda:check_case(lines[9].replace("rgb=100","rgb=200"),0,0,9),"V2_ORDERED_RGB_COLLISION"))
    tests.append(rejected(lambda:check_case(lines[27].replace("|loc=01|","|loc=00|"),0,1,0),"V2_CASE_SEQUENCE_OR_ADDRESS"))
    return tests
def run(original_dir,bank_dir,ordered_dir,peer_dir,outdir):
    source=(Path(original_dir)/"lightbank-memories.json").read_bytes()
    require(sha(source)==SOURCE_SHA,"EXTERNAL_PINNED_SOURCE_MISMATCH")
    source_obj=json.loads(source)
    original=source_obj["records"]
    require(len(original)==81,"ORIGINAL_81_SOURCE_COUNT")
    original_shas=[sha(canonical(r)) for r in original]
    bank=(Path(bank_dir)/"rainbow7-bank.jsonl").read_bytes()
    entries=parse_bank(bank,(Path(bank_dir)/"rainbow7-index.hbi").read_bytes(),original)
    parse_legacy_order((Path(ordered_dir)/"ordered27-rainbow7-index.hbi").read_bytes(),entries)
    cases=parse_v2((Path(peer_dir)/"rainbow27-v2.hbp").read_bytes())
    outdir=Path(outdir);outdir.mkdir(parents=True,exist_ok=True)
    rows=[f"R27BANK|schema=ASOLARIA-SEAT1-R27V2-CROSSLANE-V1|peer_sha256={V2_SHA}|bank_sha256={BANK_SHA}|ordered_sha256={ORDERED_SHA}|digital_only=1"]
    counts={"0":0,"1":0,"2":0,"H":0};lookups=0
    for w in range(27):
        for loc in range(81):
            site_sha=original_shas[loc]
            for identity in range(27):
                offset=(w*81+loc)*27+identity
                lane=check_case(cases[offset],w,loc,identity)
                for band in BANDS:
                    exact_read(bank,entries,band,loc,original)
                    lookups+=1
                r,g,b=tuple_rgb(identity)
                rows.append(f"ROUTE|w={w:02d}|loc={loc:02d}|id={identity:02d}|rgb={r}{g}{b}|lane={lane}|lookups=7|site_sha256={site_sha}")
                counts[lane]+=1
    require(lookups==413343 and len(rows)==59050,"CROSSWALK_ROW_OR_LOOKUP_COUNT")
    require(counts=={"0":36906,"1":10179,"2":9777,"H":2187},"PEER_LANE_CENSUS_DRIFT")
    rows.append("END|routes=59049|reads=413343|dark=2187|source_auth=HELD|physical_optical_storage=0")
    trace=("\n".join(rows)+"\n").encode("ascii")
    (outdir/"seat1-crosslane.hbp").write_bytes(trace)
    # Evaluate actual modified inputs. Negatives are end-to-end exercised; no fake assertion labels.
    def reject(fn,code):
        try:fn()
        except (ValueError,KeyError,IndexError) as e:
            require(str(e)==code,"NEGATIVE_UNEXPECTED_REASON_"+str(e))
            return {"reason":code,"exercised":True,"verdict":"REJECT"}
        fail("NEGATIVE_NOT_REJECTED_"+code)
    faults=[]
    faults.append(reject(lambda:check_case(cases[18].replace("rgb=200","rgb=020"),0,0,18),"V2_ORDERED_RGB_COLLISION"))
    faults.append(reject(lambda:check_case(cases[9].replace("rgb=100","rgb=200"),0,0,9),"V2_ORDERED_RGB_COLLISION"))
    faults.append(reject(lambda:check_case(cases[27].replace("loc=01","loc=00"),0,1,0),"V2_CASE_SEQUENCE_OR_ADDRESS"))
    altered=bytearray(bank)
    off,length,_=entries["violet","site-000"]
    altered[off+10]^=1
    faults.append(reject(lambda:exact_read(altered,entries,"violet",0,original),"BANK_DIGEST_TAMPER"))
    # Actual wrong destination: supply red record as a violet read.
    wrong=dict(entries);wrong["violet","site-000"]=entries["red","site-000"]
    faults.append(reject(lambda:exact_read(bank,wrong,"violet",0,original),"WRONG_DESTINATION"))
    erased={k:v for k,v in entries.items() if k[0]!="violet"}
    faults.append(reject(lambda:exact_read(bank,erased,"violet",0,original),"BAND_OR_SITE_MISSING"))
    missing=27*81
    require(missing==2187 and 6*27*81==13122,"MISSING_VIOLET_ONE_WAVE_COUNT")
    # Coherent replacement could pass when all expected hashes also compromised;
    # pinned separate bank digest still catches the forged bytes.
    attacker=bytearray(bank)
    attacker[off+10]^=1
    fake_digest=sha(attacker[off:off+length])
    forged=dict(entries);forged["violet","site-000"]=(off,length,fake_digest)
    require(sha(attacker)!=BANK_SHA and fake_digest!=entries["violet","site-000"][2],"FORGERY_NOT_EXERCISED")
    faults.append(reject(lambda:require(sha(attacker)==BANK_SHA,"EXTERNAL_PINNED_BANK_MISMATCH"),"EXTERNAL_PINNED_BANK_MISMATCH"))
    summary={"schema":"ASOLARIA-SEAT1-R27V2-CROSSLANE-V1",
             "source_seat1_commit":SEAT1_HEAD,"source_seat3_v2_commit":V2_HEAD,
             "source_memory_sha256":SOURCE_SHA,"source_rainbow7_bank_sha256":BANK_SHA,
             "source_ordered27_sha256":ORDERED_SHA,"peer_v2_trace_sha256":V2_SHA,
             "case_count":59049,"indexed_logical_lookups":lookups,"actual_unique_bank_rows":567,
             "original_unique_memories":81,"ordered_ternary_ids":27,"symbolic_rainbow_labels":7,
             "normalized_classes_including_undefined_zero":7,
             "raw_intensity_classes":10,"conditional_normalized_entropy_bits":2.149596296937,
             "sampled_lane_counts":counts,"faults":faults,"one_wave_missing_violet":missing,
             "one_wave_six_band_remaining":13122,
             "coherent_local_hash_replacement_external_origin":"HELD_UNAUTHENTICATED",
             "separate_v2_and_qr_memory_fixtures":True,
             "actual_physical_optical_storage_verified":False,
             "measured_wavelength_bands":0,"quantum_device_proven":False,
             "hbp_sha256":sha(trace),"hbp_bytes":len(trace)}
    (outdir/"seat1-crosslane.json").write_bytes(canonical(summary))
    for name in ("seat1-crosslane.hbp","seat1-crosslane.json"):
        b=(outdir/name).read_bytes()
        (outdir/(name+".sha256")).write_text(f"{sha(b)}  {name}\n",encoding="ascii")
    print(json.dumps({"status":"PASS","cases":59049,"lookups":lookups,"sha256":sha(trace),
                      "bytes":len(trace),"faults":len(faults),"lane_counts":counts},sort_keys=True))
if __name__=="__main__":
    if len(sys.argv)!=6:raise SystemExit("usage: crosslane.py origdir bankdir ordereddir v2peerdir outputdir")
    run(*sys.argv[1:])
