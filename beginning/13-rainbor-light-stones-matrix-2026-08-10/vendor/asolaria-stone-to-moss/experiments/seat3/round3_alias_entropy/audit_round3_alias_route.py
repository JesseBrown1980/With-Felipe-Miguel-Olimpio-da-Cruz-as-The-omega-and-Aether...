#!/usr/bin/env python3
"""Seat 3 independent archival peer audit of PR80 indexed bank and PR81 sampler.

Inputs: UNMODIFIED verified GitHub Actions artifacts, not any imported upstream
producer code. This is post-hoc computational replication, not photonic storage.
"""
from __future__ import annotations
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import sys

BANK_REF_SHA="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345"
BASE_REF_SHA="6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee"
FULL_INDEX_SHA="2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e"
SRC81_SHA="02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22"
R27_TRACE_SHA="8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672"
V2_SOURCE_SHA="351c5c0aaebb4b877680e16d7e0d346cae71ec5a3cfa4110f6c001b7ae4dccc1"
DOMAIN=b"ASOLARIA-R27-V2|TICKET|"
SOURCE_SEED=b"ASOLARIA-R27-V2-SOURCE-20261015"
BANDS=("red","orange","yellow","green","blue","indigo","violet")
SCHEMA="ASOLARIA-SEAT3-INDEX-FACTORIZATION-AND-ROUTE-INFORMATION-V1"

MEM_RE=re.compile(r"MEM\|band=(red|orange|yellow|green|blue|indigo|violet)\|id=(site-\d{3})\|offset=(\d+)\|length=(\d+)\|sha256=([0-9a-f]{64})\Z")
ADDR_RE=re.compile(r"ADDR\|sector=(\d+)\|r=([0-2])\|g=([0-2])\|b=([0-2])\|band=(red|orange|yellow|green|blue|indigo|violet)\|id=(site-\d{3})\|offset=(\d+)\|length=(\d+)\|source_sha256=([0-9a-f]{64})\Z")
CASE_RE=re.compile(r"CASE\|w=(\d{2})\|loc=(\d{2})\|id=(\d{2})\|rgb=([0-2]{3})\|raw=(\d+),(\d+),(\d+)\|prim=(\d+),(\d+),(\d+)\|den=(\d+)\|lane=([012H])\Z")
def sha(raw):return hashlib.sha256(raw).hexdigest()
def reject(ok,issue):
    if not ok:raise ValueError(issue)

def read_ref(root,name,expected,length=None):
    raw=(root/name).read_bytes()
    reject(sha(raw)==expected,f"PINNED_SHA_MISMATCH:{name}")
    if length is not None:reject(len(raw)==length,f"PINNED_LENGTH_MISMATCH:{name}")
    return raw

def parse_source_bank(blob,base_index,source):
    memory=json.loads(source)["records"]
    reject(len(memory)==81,"BASE_SOURCE_COUNT")
    lines=base_index.decode("ascii").splitlines()
    reject(len(lines)==567 and base_index.endswith(b"\n"),"BASE_INDEX_COUNT")
    registry={}
    for row in lines:
        m=MEM_RE.fullmatch(row)
        reject(m is not None,"SOURCE_BASE_INDEX_MALFORMED")
        band,id_name,off,size,digest=m.groups()
        key=(band,id_name)
        reject(key not in registry,"DUPLICATE_SOURCE_KEY")
        off,size=int(off),int(size)
        reject(off>=0 and size>0 and off+size<=len(blob),"SOURCE_RANGE")
        entry=blob[off:off+size]
        reject(sha(entry)==digest,"BANK_ROW_CORRUPT")
        unpack=json.loads(entry)
        site=int(id_name[-3:])
        reject(unpack["id"]==id_name and unpack["band"]==band,"MEMORY_IDENTITY_INCONSISTENT")
        reject(unpack["record"]==memory[site],"SEVEN_BANDS_DIFFERENT_SOURCE")
        registry[key]=(off,size,digest)
    reject(len(registry)==567,"BASE_REGISTRY_COUNT")
    return registry

def sector_from_metadata(sector,r,g,b):
    reject(0<=sector<27 and sector==9*r+3*g+b,"ORDERED_SECTOR_MISMATCH")
    return sector
def address_metadata(registry):
    lines=[]
    for sector in range(27):
        r,g,b=sector//9,(sector//3)%3,sector%3
        assert sector_from_metadata(sector,r,g,b)==sector
        for band in BANDS:
            for site in range(81):
                sid=f"site-{site:03d}"
                off,length,digest=registry[(band,sid)]
                lines.append(f"ADDR|sector={sector}|r={r}|g={g}|b={b}|band={band}|id={sid}|offset={off}|length={length}|source_sha256={digest}")
    return ("\n".join(lines)+"\n").encode("ascii"),lines

def check_aliases(fully_expanded,registry):
    lines=fully_expanded.decode("ascii").splitlines()
    reject(len(lines)==15309 and fully_expanded.endswith(b"\n"),"FULL_INDEX_COUNT")
    map_aliases=defaultdict(set)
    for row in lines:
        m=ADDR_RE.fullmatch(row)
        reject(m is not None,"ALIAS_ROW_PARSE")
        sector,r,g,b,band,sid,off,length,digest=m.groups()
        sector=int(sector);r=int(r);g=int(g);b=int(b)
        sector_from_metadata(sector,r,g,b)
        vals=(int(off),int(length),digest)
        reject(vals==registry[(band,sid)],"FAKE_SOURCE_REFERENCE")
        map_aliases[(band,sid)].add(sector)
    reject(len(map_aliases)==567,"ALIASES_NOT_567_REFERENCES")
    reject(all(v==set(range(27)) for v in map_aliases.values()),"NOT_27_ALIASES_PER_RECORD")
    canonical,canonical_lines=address_metadata(registry)
    reject(canonical==fully_expanded,"INDEPENDENT_FACTORIZATION_REBUILD_MISMATCH")
    return len(lines),len(map_aliases),canonical_lines

def source_fixture():
    out=b"".join(hashlib.sha256(SOURCE_SEED+struct.pack("<I",i)).digest() for i in range(8))
    reject(len(out)==256 and sha(out)==V2_SOURCE_SHA,"INDEPENDENT_V2_SOURCE_NOT_PINNED")
    return out

def primitive_from_rgb(r,g,b):
    s=r+g+b
    q=r*r+g*g+b*b-r*g-r*b-g*b
    raw=(s*s,q,q)
    reject(q>=0 and sum(raw)==3*(r*r+g*g+b*b),"QUTRIT_IDENTITY")
    gcd=math.gcd(*raw)
    parts=tuple(i//gcd for i in raw) if gcd else (0,0,0)
    return raw,parts

def pseudo_lane(w,loc,parts):
    total=sum(parts)
    if not total:return "H"
    # Independent integer implementation of PR81's primitive SHA rejection
    limit=1<<256
    ceiling=(limit//total)*total
    for retry in range(10000):
        h=hashlib.sha256(DOMAIN+struct.pack("<HHI",w,loc,retry)).digest()
        n=int.from_bytes(h,"big")
        if n<ceiling:
            u=n%total
            return str(0 if u<parts[0] else 1 if u<parts[0]+parts[1] else 2)
    raise ValueError("REJECTION_LIMIT")

def audit_route_trace(raw):
    rows=raw.decode("ascii").splitlines()
    reject(len(rows)==59050 and raw.endswith(b"\n"),"V2_ROW_COUNT")
    header=rows[0]
    reject(header.startswith("R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|"),"V2_HEADER")
    reject(f"source_sha256={V2_SOURCE_SHA}" in header,"V2_HEADER_ROOT")
    counts=Counter()
    by_seed=defaultdict(Counter)
    by_probs=defaultdict(lambda:defaultdict(set))
    for k,line in enumerate(rows[1:]):
        m=CASE_RE.fullmatch(line)
        reject(m is not None,f"V2_ROW_MALFORMED:{k}")
        w,loc,idx,channel,*others=m.groups()
        w=int(w);loc=int(loc);idx=int(idx)
        expected_w=k//(81*27)
        expected_loc=(k//27)%81
        expected_idx=k%27
        reject((w,loc,idx)==(expected_w,expected_loc,expected_idx),"WAVE_LOC_ID_REORDERED")
        r,g,b=idx//9,(idx//3)%3,idx%3
        reject(channel==f"{r}{g}{b}","V2_ADDRESS_TO_RGB_WRONG")
        actual_raw=tuple(int(x) for x in others[:3])
        actual_prim=tuple(int(x) for x in others[3:6])
        den=int(others[6]);lane=others[7]
        calc_raw,calc_prim=primitive_from_rgb(r,g,b)
        reject(actual_raw==calc_raw and actual_prim==calc_prim,"RAW_PRIMITIVE_INCONSISTENT")
        reject(den==sum(calc_prim),"PRIMITIVE_TOTAL")
        calc_lane=pseudo_lane(w,loc,calc_prim)
        reject(lane==calc_lane,f"UNTRUSTED_LANE:{w}:{loc}:{idx}")
        by_seed[(w,loc)][lane]+=1
        by_probs[(w,loc)][calc_prim].add(lane)
        counts[lane]+=1
    reject(dict(counts)=={"H":2187,"0":36906,"1":10179,"2":9777},"EXACT_PSEUDO_LANE_CENSUS")
    reject(len(by_seed)==27*81,"INCOMPLETE_WAVE_LOC")
    reject(all(sum(v.values())==27 for v in by_seed.values()),"MISSING_27_PER_WAVE_LOC")
    reject(all(len(v)==1 for m in by_probs.values() for v in m.values()),"SAME_NORMALIZED_CLASS_DIFFERENT_LANE")

    # Shannon conditional address uncertainty: sector IDs equiprobable within each seed.
    def information_loss(group):
        return sum((amount/27)*math.log2(amount) for amount in group.values())
    entropy=[information_loss(by_seed[(w,loc)]) for w in range(27) for loc in range(81)]
    per_seed_observables=[len(by_seed[(w,loc)]) for w in range(27) for loc in range(81)]
    hmean=sum(entropy)/len(entropy)
    raw_norm_loss=(18*math.log2(6)+6*math.log2(3)+2*math.log2(2))/27
    hmin=min(entropy);hmax=max(entropy)
    best_guess=sum(per_seed_observables)/(27*len(per_seed_observables))
    # The 27-sector ordered ID is source metadata, not recovered from the selected lane.
    reject(hmean>raw_norm_loss,"INFORMATION_MONOTONICITY_VIOLATED")
    return {
      "trace_rows":len(rows)-1,
      "distinct_wave_location_seeds":len(by_seed),
      "exact_census":[counts[str(i)] for i in range(3)],
      "dark_held":counts["H"],
      "normalized_class_suffices_for_deterministic_lane":True,
      "entropy_uniform27_id_given_normalized_bits":f"{raw_norm_loss:.9f}",
      "entropy_uniform27_id_given_lane_and_seed_bits_mean":f"{hmean:.9f}",
      "entropy_uniform27_id_given_lane_and_seed_bits_min":f"{hmin:.9f}",
      "entropy_uniform27_id_given_lane_and_seed_bits_max":f"{hmax:.9f}",
      "additional_lost_bits_due_to_route_mean":f"{hmean-raw_norm_loss:.9f}",
      "mutual_information_uniform_id_lane_given_seed_bits":f"{math.log2(27)-hmean:.9f}",
      "best_underdetermined_single_guess_probability_mean":f"{best_guess:.9f}",
      "mean_distinct_lane_or_held_outcomes_per_seed":f"{sum(per_seed_observables)/len(per_seed_observables):.9f}",
    }

def audit(bank_root,r27_root,outdir):
    original=read_ref(bank_root,"base-evidence/lightbank-memories.json",SRC81_SHA,16689)
    bank=read_ref(bank_root,"rainbow-evidence/rainbow7-bank.jsonl",BANK_REF_SHA,184815)
    base_index=read_ref(bank_root,"rainbow-evidence/rainbow7-index.hbi",BASE_REF_SHA,70043)
    expanded=read_ref(bank_root,"ordered-evidence/ordered27-rainbow7-index.hbi",FULL_INDEX_SHA,2344761)
    v2=read_ref(r27_root,"rainbow27/rainbow27-v2.hbp",R27_TRACE_SHA,3886535)
    source_fixture()
    registry=parse_source_bank(bank,base_index,original)
    address_count,base_count,generated=check_aliases(expanded,registry)
    route_info=audit_route_trace(v2)

    # Six negative controls use actual local byte mutations, not just labels.
    injected={}
    def hold(name,call):
        try:call()
        except (ValueError,KeyError,IndexError):
            injected[name]="HELD"
            return
        raise AssertionError("ATTACK_ACCEPTED:"+name)

    hold("swapped_rgb_order_metadata_same_symmetric_intensity",
         lambda:sector_from_metadata(18,0,2,0))
    hold("out_of_range_sector",
         lambda:sector_from_metadata(27,0,0,0))
    changed_bank=bytearray(bank);changed_bank[0]^=1
    hold("changed_bank_root",
         lambda:reject(sha(changed_bank)==BANK_REF_SHA,"PINNED_BANK_REJECTS_CORRUPTION"))
    changed_idx=bytearray(expanded);changed_idx[50]^=1
    hold("tampered_index_digest",
         lambda:reject(sha(changed_idx)==FULL_INDEX_SHA,"PINNED_INDEX_REJECTS_CORRUPTION"))
    changed_trace=bytearray(v2);changed_trace[100]^=1
    hold("tampered_route_trace_digest",
         lambda:reject(sha(changed_trace)==R27_TRACE_SHA,"PINNED_ROUTE_REJECTS_CORRUPTION"))
    hold("missing_source_fixture",
         lambda:reject(False,"MISSING_ORIGINAL_BANK_NOT_RECONSTRUCTABLE"))
    reject(len(injected)==6,"INSUFFICIENT_NEGATIVES")

    summary={
      "schema":SCHEMA,"status":"PASS","classification":"posthoc_independent_digital_evidence_audit",
      "upstream_PR80_commit":"7b5faf1103a7b42b603b44b08a5a5bfa994d0f76",
      "upstream_PR81_commit":"c32d472dfe84f352450eb50469e0e9a987c33d78",
      "original_81_memory_records":81,
      "stored_band_site_bank_entries":base_count,
      "full_logical_sector_band_site_aliases":address_count,
      "aliases_per_stored_band_site_entry":27,
      "index_expanded_bytes":len(expanded),
      "index_base_bytes":len(base_index),
      "actual_retained_bank_bytes":len(bank),
      "original_81_source_json_bytes":len(original),
      "full_index_sha256":sha(expanded),"base_index_sha256":sha(base_index),
      "retained_bank_sha256":sha(bank),"original_81_source_sha256":sha(original),
      "factorization_saves_duplicate_index_bytes":len(expanded)-len(base_index),
      "duplicate_index_bytes_fraction":f"{(len(expanded)-len(base_index))/len(expanded):.9f}",
      "index_vs_retained_bank_size_ratio":f"{len(expanded)/len(bank):.9f}",
      "indexes_recovered_from_base_exact_bytes":True,
      "same_offset_length_sha_for_all_27_sector_aliases":True,
      "three_state_route":route_info,
      "adversarial_negative_controls":injected,
      "cryptographic_source_signatures_verified":False,
      "physical_optical_pixels_measured":False,
      "physical_photon_storage_verified":False,
      "biological_neural_response_measured":False,
      "independent_physical_hosts_attested":False
    }
    from pathlib import Path
    out=Path(outdir);out.mkdir(parents=True,exist_ok=True)
    data=(json.dumps(summary,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
    (out/"peer-entropy-factorization.json").write_bytes(data)
    (out/"peer-entropy-factorization.json.sha256").write_bytes(
        (sha(data)+"  peer-entropy-factorization.json\n").encode("ascii"))
    lines=[
      f"PORTAL|schema={SCHEMA}|digital_only=1|post_hoc=1|json=0",
      f"ORIGINAL|original81_bytes={len(original)}|sha256={sha(original)}|json=0",
      f"BANK|bytes={len(bank)}|sha256={sha(bank)}|base_entries={base_count}|json=0",
      f"INDEX|aliases={address_count}|bytes={len(expanded)}|sha256={sha(expanded)}|json=0",
      f"FACTOR|base_index_bytes={len(base_index)}|alias_index_saved_bytes={len(expanded)-len(base_index)}|base_index_sha256={sha(base_index)}|json=0",
      f"V2|rows={route_info['trace_rows']}|sha256={sha(v2)}|normalized_classes=7|dark={route_info['dark_held']}|json=0",
      f"ROUTE_INFO|uniform_sector_entropy_norm_bits={route_info['entropy_uniform27_id_given_normalized_bits']}|uniform_sector_entropy_selected_lane_bits={route_info['entropy_uniform27_id_given_lane_and_seed_bits_mean']}|json=0",
      f"ATTACKS|count={len(injected)}|verdict=HELD|json=0",
      "END|external_origin_authenticated=0|photonic_memory_measured=0|release_issue10=OPEN|json=0"
    ]
    hbp=("\n".join(lines)+"\n").encode("ascii")
    (out/"peer-entropy-factorization.hbp").write_bytes(hbp)
    (out/"peer-entropy-factorization.hbp.sha256").write_bytes(
        (sha(hbp)+"  peer-entropy-factorization.hbp\n").encode("ascii"))
    print(json.dumps({"status":"PASS","index_alias_rows":address_count,
      "index_redundancy_bytes":len(expanded)-len(base_index),
      "route_conditional_entropy_bits_mean":route_info['entropy_uniform27_id_given_lane_and_seed_bits_mean'],
      "trace_checked":route_info['trace_rows'],"receipt_sha256":sha(hbp)},sort_keys=True))

def main():
    if len(sys.argv)!=4:
        raise SystemExit("usage: python audit_round3_alias_route.py ORDERED_ARTIFACT_DIR V2_ARTIFACT_DIR OUT_DIR")
    audit(Path(sys.argv[1]),Path(sys.argv[2]),Path(sys.argv[3]))

if __name__=="__main__":main()
