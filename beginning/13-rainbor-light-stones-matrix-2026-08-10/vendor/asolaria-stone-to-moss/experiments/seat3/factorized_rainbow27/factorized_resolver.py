#!/usr/bin/env python3
"""Runnable factorized Rainbow27 x Rainbow7 bank, bounded to 567 source refs.

Legacy expanded 15,309-address HBI is never loaded into the resolver and never
persisted by this program; its SHA is reconstructed by STREAMING. This is only
a digital byte-lookup and classical SHA pseudo-route experiment.

Usage:
  python factorized_resolver.py PR80_EVIDENCE_DIR PR81_EVIDENCE_DIR OUTPUT_DIR
"""
from __future__ import annotations

from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import sys

SCHEMA = "ASOLARIA-SEAT3-FACTORIZED-R27-RAINBOW7-V1"
BANDS = ("red","orange","yellow","green","blue","indigo","violet")
SOURCE_SHA = "02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22"
BANK_SHA = "52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345"
BASE_SHA = "6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee"
EXPANDED_SHA = "2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e"
V2_SHA = "8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672"
V2_SOURCE_SHA = "351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1"
READ_COUNT = 59049*7
SHA_DOMAIN = b"ASOLARIA-R27-V2|TICKET|"
REF = re.compile(r"MEM\|band=(red|orange|yellow|green|blue|indigo|violet)\|id=site-(\d{3})\|offset=(\d+)\|length=(\d+)\|sha256=([a-f0-9]{64})\Z")
CASE = re.compile(r"CASE\|w=(\d{2})\|loc=(\d{2})\|id=(\d{2})\|rgb=([0-2]{3})\|raw=(\d+),(\d+),(\d+)\|prim=(\d+),(\d+),(\d+)\|den=(\d+)\|lane=([012H])\Z")

def digest(raw):return hashlib.sha256(raw).hexdigest()
def require(ok,why):
    if not ok:raise ValueError(why)
def read_pinned(path,sha,size):
    raw=Path(path).read_bytes()
    require(len(raw)==size and digest(raw)==sha,"UNTRUSTED_PINNED_"+path.name)
    return raw

class FactorizedRainbowResolver:
    def __init__(self,source,bank,base_index, available_bands=BANDS):
        require(len(source)==16689 and digest(source)==SOURCE_SHA,"SOURCE_ANCHOR_HELD")
        require(len(bank)==184815 and digest(bank)==BANK_SHA,"BANK_ANCHOR_HELD")
        require(len(base_index)==70043 and digest(base_index)==BASE_SHA,"BASE_INDEX_ANCHOR_HELD")
        self.source=source
        self.bank=bank
        self.base_index=base_index
        self.records=json.loads(source)["records"]
        require(len(self.records)==81,"SITE_COUNT")
        self.entries={}
        lines=base_index.decode("ascii").splitlines()
        require(len(lines)==567 and base_index.endswith(b"\n"),"BASE_INDEX_FORMAT")
        previous_end=0
        for pos,row in enumerate(lines):
            m=REF.fullmatch(row)
            require(m is not None,"BAD_REF_ROW")
            band,site_s,offset_s,length_s,leaf=m.groups()
            site=int(site_s);off=int(offset_s);length=int(length_s)
            require(band==BANDS[pos//81] and site==pos%81,"OUT_OF_ORDER_BASE")
            require(off==previous_end and length>0 and off+length<=len(bank),"BAD_SOURCE_OFFSET")
            previous_end=off+length
            piece=bank[off:previous_end]
            require(digest(piece)==leaf,"BASE_LEAF_HASH_HELD")
            content=json.loads(piece)
            site_id=f"site-{site:03d}"
            require(content["schema"]=="ASOLARIA-RAINBOW7-BANK-ENTRY-V1","BANK_SCHEMA")
            require(content["id"]==site_id and content["band"]==band,"BANK_ID_MISMATCH")
            require(content["address"]==f"rainbow7/{band}/{site_id}","BANK_ADDRESS_MISMATCH")
            require(content["record"]==self.records[site],"ORIGINAL_SOURCE_RECORD_MISMATCH")
            require(self.records[site]["id"]==site_id,"SOURCE_ID_MISMATCH")
            self.entries[(band,site)]=(off,length,leaf)
        require(previous_end==len(bank) and len(self.entries)==567,"BANK_MISSING_BYTES_OR_ROWS")
        self.available=set(available_bands)
        require(self.available.issubset(set(BANDS)),"BAD_BAND_SET")
        # The 15,309 duplicated aliases are NEVER materialized here.
        self.source_origin_authenticated=False

    @staticmethod
    def rgb_for(sector):
        require(type(sector) is int and 0<=sector<27,"INVALID_ORDERED_SECTOR")
        return sector//9,(sector//3)%3,sector%3

    def resolve(self,sector,band,site,claimed_rgb=None):
        r,g,b=self.rgb_for(sector)
        require(type(site) is int and 0<=site<81,"INVALID_SITE")
        require(isinstance(band,str) and band in BANDS,"UNKNOWN_BAND")
        if claimed_rgb is not None:
            require(tuple(claimed_rgb)==(r,g,b),"ORDERED_RGB_SIDEBAND_HELD")
        require(band in self.available,"BAND_ERASED_HELD")
        off,length,leaf=self.entries[(band,site)]
        payload=self.bank[off:off+length]
        require(digest(payload)==leaf,"CHANGED_SOURCE_BYTES_HELD")
        row=(f"ADDR|sector={sector}|r={r}|g={g}|b={b}"
             f"|band={band}|id=site-{site:03d}"
             f"|offset={off}|length={length}|source_sha256={leaf}")
        return row,payload,leaf

    def require_external_authentication(self):
        require(False,"PHYSICAL_ORIGIN_NOT_AUTHENTICATED")

def weights(sector):
    r,g,b=FactorizedRainbowResolver.rgb_for(sector)
    s=r+g+b
    q=r*r+g*g+b*b-r*g-r*b-g*b
    raw=(s*s,q,q)
    require(sum(raw)==3*(r*r+g*g+b*b),"FOURIER_CONSERVATION")
    scale=math.gcd(*raw)
    primitive=tuple(v//scale for v in raw) if scale else (0,0,0)
    return raw,primitive

def expected_lane(wave,location,primitive):
    total=sum(primitive)
    if total==0:return "H"
    bound=(1<<256)//total*total
    for retry in range(10000):
        ticket=hashlib.sha256(SHA_DOMAIN+struct.pack("<HHI",wave,location,retry)).digest()
        n=int.from_bytes(ticket,"big")
        if n<bound:
            u=n%total
            return "0" if u<primitive[0] else "1" if u<primitive[0]+primitive[1] else "2"
    raise ValueError("SAMPLER_REJECTION_LIMIT")

def validate_case(line,index):
    m=CASE.fullmatch(line)
    require(m is not None,"CASE_FORMAT_HELD")
    w,loc,sect,rgb,*fields=m.groups()
    w,loc,sect=int(w),int(loc),int(sect)
    expected_seq=(w*81+loc)*27+sect
    require(index==expected_seq,"STALE_SEQUENCE_OR_REPLAY_HELD")
    r,g,b=FactorizedRainbowResolver.rgb_for(sect)
    require(rgb==f"{r}{g}{b}","WRONG_ORDERED_COLOR_HELD")
    raw,prim=weights(sect)
    require(tuple(map(int,fields[:3]))==raw,"UNTRUSTED_INTENSITIES_HELD")
    require(tuple(map(int,fields[3:6]))==prim,"UNTRUSTED_NORMALIZED_RATIO_HELD")
    require(int(fields[6])==sum(prim),"UNTRUSTED_DENOMINATOR_HELD")
    lane=expected_lane(w,loc,prim)
    require(fields[7]==lane,"FORGED_PSEUDO_LANE_HELD")
    return w,loc,sect,lane

def expanded_index_digest(resolver):
    h=hashlib.sha256()
    nbytes=0
    count=0
    for sector in range(27):
        for band in BANDS:
            for site in range(81):
                metadata,_,_=resolver.resolve(sector,band,site)
                line=(metadata+"\n").encode("ascii")
                h.update(line);nbytes+=len(line);count+=1
    require(count==15309 and nbytes==2344761 and h.hexdigest()==EXPANDED_SHA,
            "CANONICAL_ALIAS_SHA_MISMATCH")
    return nbytes,count,h.hexdigest()

def replay_routes(resolver,v2_blob):
    require(len(v2_blob)==3886535 and digest(v2_blob)==V2_SHA,"V2_GOLD_DIGEST_HELD")
    lines=v2_blob.decode("ascii").splitlines()
    require(len(lines)==59050 and v2_blob.endswith(b"\n"),"V2_FULL_ROWS_HELD")
    require(lines[0].startswith("R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|")
            and f"source_sha256={V2_SOURCE_SHA}" in lines[0],"V2_SOURCE_HEADER_HELD")
    nreads=0;readhash=hashlib.sha256()
    routecounts=Counter()
    for seq,line in enumerate(lines[1:]):
        w,loc,sector,lane=validate_case(line,seq)
        routecounts[lane]+=1
        for band in BANDS:
            metadata,payload,leaf=resolver.resolve(sector,band,loc)
            readhash.update((f"READ|w={w:02d}|loc={loc:02d}|sector={sector:02d}"
                             f"|band={band}|lane={lane}|leaf={leaf}\n").encode("ascii"))
            require(len(payload)>0,"EMPTY_MEMORY_READ")
            nreads+=1
    require(nreads==READ_COUNT and routecounts==Counter({"0":36906,"1":10179,"2":9777,"H":2187}),
            "WRONG_TOTAL_READ_OR_ROUTE")
    return nreads,readhash.hexdigest(),routecounts

def erasure(resolver):
    erased=FactorizedRainbowResolver(resolver.source,resolver.bank,resolver.base_index,
                                      available_bands=BANDS[:-1])
    held=0;good=0
    for sector in range(27):
        for site in range(81):
            for band in BANDS:
                try:erased.resolve(sector,band,site)
                except ValueError as e:
                    require(str(e)=="BAND_ERASED_HELD" and band=="violet","WRONG_ERASURE_GATE")
                    held+=1
                else:
                    require(band!="violet","ERASED_VIOLET_STILL_AVAILABLE")
                    good+=1
    require(held==2187 and good==13122,"ERASURE_ALIAS_COUNT")
    return held,good

def attacks(resolver,v2_lines):
    results={}
    def held(name,fn):
        try:fn()
        except (ValueError,KeyError,IndexError,TypeError,UnicodeError,AssertionError):
            results[name]="HELD"
            return
        raise AssertionError("ATTACK_ACCEPTED:"+name)
    held("wrong_rgb_permutation_same_intensity",
         lambda:resolver.resolve(18,"red",0,claimed_rgb=(0,2,0)))
    held("amplitude_scaled_to_different_ordered_sector",
         lambda:resolver.resolve(9,"blue",0,claimed_rgb=(2,0,0)))
    held("out_of_range_sector",lambda:resolver.resolve(27,"red",0))
    held("wrong_band",lambda:resolver.resolve(0,"ultraviolet",0))
    held("wrong_site",lambda:resolver.resolve(0,"red",81))
    held("tampered_bank",lambda:FactorizedRainbowResolver(
         resolver.source,bytes([resolver.bank[0]^1])+resolver.bank[1:],resolver.base_index))
    held("tampered_base_index",lambda:FactorizedRainbowResolver(
         resolver.source,resolver.bank,bytes([resolver.base_index[0]^1])+resolver.base_index[1:]))
    held("tampered_original_source",lambda:FactorizedRainbowResolver(
         bytes([resolver.source[0]^1])+resolver.source[1:],resolver.bank,resolver.base_index))
    held("missing_source_manifest",lambda:FactorizedRainbowResolver(
         b"",resolver.bank,resolver.base_index))
    held("unattested_origin",resolver.require_external_authentication)
    row=v2_lines[1] # id=01, wave00, location00, a valid non-dark route
    held("forged_lane",lambda:validate_case(row[:-1]+("2" if row[-1]!="2" else "1"),1))
    held("stale_replayed_sequence",lambda:validate_case(row,2))
    row2=v2_lines[19]  # synthetic case from original source
    held("forged_rgb_source_metadata",lambda:validate_case(
         re.sub(r"\|rgb=\d{3}", "|rgb=222",row2),19))
    violet=FactorizedRainbowResolver(resolver.source,resolver.bank,resolver.base_index,
                                     available_bands=BANDS[:-1])
    held("erased_violet_payload",lambda:violet.resolve(0,"violet",0))
    require(len(results)==14,"FAULT_COVERAGE_LOST")

    # An attacker can recompute a LOCAL SHA when changing the claimed source;
    # without immutable trusted source roots this is not authentication.
    fake=bytes([resolver.source[0]^1])+resolver.source[1:]
    fake_local_digest=digest(fake)
    require(fake_local_digest==digest(fake),"LOCAL_HASH_RECOMPUTE")
    require(fake_local_digest!=SOURCE_SHA,"FORGED_LOCAL_SHA_NOT_EXTERNAL_ROOT")
    results["self_consistent_local_hash_not_authentication"]="ORIGIN_UNAUTHENTICATED"
    return results

def canonical(obj):
    return (json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
def store(folder,name,blob):
    (folder/name).write_bytes(blob)
    (folder/(name+".sha256")).write_bytes((digest(blob)+"  "+name+"\n").encode("ascii"))

def run(basedir,v2dir,outdir):
    root=Path(basedir);vroot=Path(v2dir);out=Path(outdir)
    out.mkdir(parents=True,exist_ok=True)
    source=read_pinned(root/"base-evidence/lightbank-memories.json",SOURCE_SHA,16689)
    bank=read_pinned(root/"rainbow-evidence/rainbow7-bank.jsonl",BANK_SHA,184815)
    base=read_pinned(root/"rainbow-evidence/rainbow7-index.hbi",BASE_SHA,70043)
    v2=read_pinned(vroot/"rainbow27/rainbow27-v2.hbp",V2_SHA,3886535)
    resolver=FactorizedRainbowResolver(source,bank,base)
    indexbytes,count,oldsha=expanded_index_digest(resolver)
    reads,streamsha,lane_census=replay_routes(resolver,v2)
    unavailable,available=erasure(resolver)
    controls=attacks(resolver,v2.decode("ascii").splitlines()[1:])
    report={
      "schema":SCHEMA,"verdict":"PASS",
      "source_origin_authenticated":False,
      "source_root_sha256":SOURCE_SHA,"bank_root_sha256":BANK_SHA,"base_index_root_sha256":BASE_SHA,
      "original_v2_root_sha256":V2_SHA,"golden_expanded_index_sha256":oldsha,
      "expanded_logical_addresses":count,"unique_original_records":81,
      "stored_band_site_entries":len(resolver.entries),"in_memory_alias_map_entries":0,
      "expanded_index_bytes_not_persisted":indexbytes,"base_index_bytes":len(base),
      "repeated_index_metadata_bytes_avoided":indexbytes-len(base),
      "bank_payload_bytes_unchanged":len(bank),
      "runtime_memory_source_payloads":len(resolver.entries),
      "crosswalk_rows":59049,"verified_real_byte_reads":reads,
      "streamed_full_read_transcript_sha256":streamsha,
      "route_census":{label:lane_census[label] for label in ("0","1","2","H")},
      "violet_erasure_held_addresses_one_wave":unavailable,
      "other_bands_available_one_wave":available,
      "adversarial_cases":controls,
      "quantum_hardware_verified":False,"physical_optical_memory_verified":False,
      "seven_wavelengths_measured":False,"external_host_attestation_verified":False
    }
    hbp=(
      f"PORTAL|schema={SCHEMA}|simulation=1|source_origin_authenticated=0|json=0\n"
      f"ANCHORS|source={SOURCE_SHA}|bank={BANK_SHA}|base={BASE_SHA}|json=0\n"
      f"ADDRESSES|logical={count}|stored_references=567|unique_sources=81|in_memory_alias_map=0|json=0\n"
      f"INDEX|old_expanded_bytes={indexbytes}|base_bytes={len(base)}|avoided_repeated_metadata={indexbytes-len(base)}|old_sha256={oldsha}|json=0\n"
      f"READS|route_rows=59049|full_byte_reads={reads}|stream_sha256={streamsha}|json=0\n"
      f"ERASURE|violet_held={unavailable}|others_available={available}|json=0\n"
      f"ATTACKS|held={sum(v=='HELD' for v in controls.values())}|locally_coherent_origin=NOT_AUTHENTICATED|json=0\n"
      f"END|physical_photon_memory=0|optical_spectrum=0|external_source_signing=0|release_issue10=OPEN|json=0\n"
    ).encode("ascii")
    store(out,"factorized-r27-results.hbp",hbp)
    store(out,"factorized-r27-results.json",canonical(report))
    print(json.dumps({"verdict":"PASS","addresses":count,"verified_reads":reads,
        "held":sum(x=="HELD" for x in controls.values()),
        "factorized_bytes_avoided":indexbytes-len(base),
        "hbp_sha256":digest(hbp),"json_sha256":digest(canonical(report))},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=4:
        raise SystemExit("usage: python factorized_resolver.py PR80_ARTIFACT PR81_ARTIFACT OUTPUT_DIR")
    run(*sys.argv[1:])
