#!/usr/bin/env python3
"""Seal result stone against FRESH independent Python and Node resolver results.

The stone is an immutable archived computational receipt, not an attested
physical source signature. All historical upstream producer artifacts pinned.
"""
import hashlib
import json
from pathlib import Path
import sys

STONE_SHA="8d623b191bfdd472e8fee4d76bd8b81454ed1b6bb549e4f4821ef627922af7bb"
SOURCE_SHA="02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22"
BANK_SHA="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345"
BASE_SHA="6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee"
EXPANDED_SHA="2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e"
V2_SHA="8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672"
HBP_SHA="b062f21f13e4d7a6d7c5ac8752d5eb7193cc161a2e08e3c98596aa9dab3a2bf3"
JSON_SHA="132fefd6af572670a80ace9448af4d8dea93c4b568719d965f4da358f72f0bc1"
STREAM_SHA="465d3369877e8c110f57aa35ffc26a6ab2217a6ee65ac0fb493efd1f56e48314"

def sha(x):return hashlib.sha256(x).hexdigest()

def verify(stone,verified):
    p=Path(stone)
    raw=p.read_bytes()
    assert len(raw)==1692 and sha(raw)==STONE_SHA,"STONE_SHA_OR_LENGTH_DRIFT"
    side=(p.parent/(p.name+".sha256")).read_bytes()
    assert side==(STONE_SHA+"  "+p.name+"\n").encode("ascii"),"STONE_SIDECAR_DRIFT"
    lines=raw.decode("ascii").splitlines()
    assert len(lines)==11,"STONE_ROW_COUNT_DRIFT"
    assert lines[0]=="PORTAL|schema=ASOLARIA-SEAT3-FACTORIZED-R27-RECEIPT-V1|date=2026-10-15|digital_only=1|json=0"
    assert lines[-1]=="END|old_pr80_pr81_stones_unchanged=1|published_computational_release_unchanged=1|scientific_release_issue10=SEPARATE|new_pr_draft=1|json=0"
    root=Path(verified)
    report_blob=(root/"factorized-r27-results.json").read_bytes()
    hbp_blob=(root/"factorized-r27-results.hbp").read_bytes()
    report=json.loads(report_blob)
    assert len(hbp_blob)==947 and sha(hbp_blob)==HBP_SHA
    assert len(report_blob)==1872 and sha(report_blob)==JSON_SHA
    assert report["verdict"]=="PASS" and report["streamed_full_read_transcript_sha256"]==STREAM_SHA
    assert report["source_root_sha256"]==SOURCE_SHA
    assert report["bank_root_sha256"]==BANK_SHA and report["base_index_root_sha256"]==BASE_SHA
    assert report["golden_expanded_index_sha256"]==EXPANDED_SHA
    assert report["original_v2_root_sha256"]==V2_SHA
    assert report["expanded_logical_addresses"]==15309
    assert report["stored_band_site_entries"]==567 and report["unique_original_records"]==81
    assert report["in_memory_alias_map_entries"]==0
    assert report["expanded_index_bytes_not_persisted"]==2344761
    assert report["base_index_bytes"]==70043
    assert report["repeated_index_metadata_bytes_avoided"]==2274718
    assert report["bank_payload_bytes_unchanged"]==184815
    assert report["verified_real_byte_reads"]==413343 and report["crosswalk_rows"]==59049
    assert report["violet_erasure_held_addresses_one_wave"]==2187
    assert report["other_bands_available_one_wave"]==13122
    assert report["route_census"]=={"0":36906,"1":10179,"2":9777,"H":2187}
    assert sum(x=="HELD" for x in report["adversarial_cases"].values())==14
    assert report["source_origin_authenticated"] is False
    assert report["physical_optical_memory_verified"] is False
    expected=[
      f"ANCHORS|source81={SOURCE_SHA}|bank={BANK_SHA}|base={BASE_SHA}|json=0",
      f"INDEX|logical_addresses=15309|stored_entries=567|original_unique_source_records=81|expanded_bytes=2344761|factorized_base_bytes=70043|redundant_metadata_avoided_bytes=2274718|expanded_sha256={EXPANDED_SHA}|json=0",
      f"ROUTES|full_cases=59049|full_verified_memory_reads=413343|original_v2_sha256={V2_SHA}|read_transcript_sha256={STREAM_SHA}|json=0",
      "ERASURE|violet_held=2187|other_bands_ok=13122|json=0",
      "ADVERSARY|actual_faults_held=14|coherent_local_digest=UNAUTHENTICATED|json=0",
      f"ARTIFACTS|hbp_bytes=947|hbp_sha256={HBP_SHA}|json_bytes=1872|json_sha256={JSON_SHA}|json=0",
      "CI|run=38753417405|linux_python311_313_and_windows_python311_313=4/4_PASS|cross_platform_byte_parity=PASS|tamper_fail_closed=PASS|json=0",
    ]
    for record in expected:
        assert record in lines, "STONE_STALE_OR_ALTERED:"+record[:55]
    print(json.dumps({"verdict":"SEALED_FACTORIZED_R27_PASS","stone_sha256":STONE_SHA,
                      "stone_bytes":len(raw),"logical_addresses":15309,
                      "actual_memory_reads":413343,"redundant_metadata_avoided":2274718,
                      "origin_authenticated":False},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=3:raise SystemExit("usage: verify_sealed_factorized.py STONE.hbp FRESH_RESOLVER_OUTPUT")
    verify(*sys.argv[1:])
