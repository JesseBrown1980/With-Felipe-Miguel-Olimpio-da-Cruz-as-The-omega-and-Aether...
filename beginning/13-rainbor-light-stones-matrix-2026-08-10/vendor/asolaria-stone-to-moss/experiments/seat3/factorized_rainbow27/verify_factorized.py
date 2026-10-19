#!/usr/bin/env python3
"""Third read-only acceptance check on two independent factorized resolvers.

This verifier compares entire byte streams plus SHA256 sidecars, actual original
source roots and essential numeric claims. Does NOT import either resolver.
"""
import hashlib
import json
from pathlib import Path
import sys

def sha(b):return hashlib.sha256(b).hexdigest()
KNOWN={
  "source_root_sha256":"02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22",
  "bank_root_sha256":"52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345",
  "base_index_root_sha256":"6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee",
  "golden_expanded_index_sha256":"2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e",
  "original_v2_root_sha256":"8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672"
}
def check(py,js,out):
    a=Path(py);b=Path(js)
    result={}
    for name in ("factorized-r27-results.hbp","factorized-r27-results.json"):
        raw=(a/name).read_bytes()
        assert raw==(b/name).read_bytes(),"PY_NODE_BYTE_DRIFT:"+name
        digest=sha(raw)
        for origin in (a,b):
            side=(origin/(name+".sha256")).read_bytes()
            assert side==(digest+"  "+name+"\n").encode("ascii"),"SIDECAR_MISMATCH:"+name
        result[name]=raw
    report=json.loads(result["factorized-r27-results.json"])
    assert report["verdict"]=="PASS"
    assert report["schema"]=="ASOLARIA-SEAT3-FACTORIZED-R27-RAINBOW7-V1"
    for k,v in KNOWN.items():assert report[k]==v,k
    assert report["expanded_logical_addresses"]==27*7*81==15309
    assert report["unique_original_records"]==81
    assert report["stored_band_site_entries"]==567
    assert report["in_memory_alias_map_entries"]==0
    assert report["expanded_index_bytes_not_persisted"]==2344761
    assert report["base_index_bytes"]==70043
    assert report["repeated_index_metadata_bytes_avoided"]==2274718
    assert report["bank_payload_bytes_unchanged"]==184815
    assert report["runtime_memory_source_payloads"]==567
    assert report["crosswalk_rows"]==59049
    assert report["verified_real_byte_reads"]==413343
    assert report["route_census"]=={"0":36906,"1":10179,"2":9777,"H":2187}
    assert report["violet_erasure_held_addresses_one_wave"]==2187
    assert report["other_bands_available_one_wave"]==13122
    assert len(report["streamed_full_read_transcript_sha256"])==64
    bad=report["adversarial_cases"]
    assert sum(v=="HELD" for v in bad.values())==14,bad
    assert bad["self_consistent_local_hash_not_authentication"]=="ORIGIN_UNAUTHENTICATED"
    assert report["source_origin_authenticated"] is False
    for k in ("physical_optical_memory_verified","quantum_hardware_verified",
              "seven_wavelengths_measured","external_host_attestation_verified"):
        assert report[k] is False,k
    hbp=result["factorized-r27-results.hbp"]
    assert hbp.startswith(b"PORTAL|schema=ASOLARIA-SEAT3-FACTORIZED-R27-RAINBOW7-V1|")
    assert b"ADDRESSES|logical=15309|stored_references=567|unique_sources=81|in_memory_alias_map=0|json=0\n" in hbp
    assert b"INDEX|old_expanded_bytes=2344761|base_bytes=70043|avoided_repeated_metadata=2274718|old_sha256=" in hbp
    expected=("READS|route_rows=59049|full_byte_reads=413343|stream_sha256="+report["streamed_full_read_transcript_sha256"]+"|json=0\n").encode("ascii")
    assert expected in hbp
    assert b"ERASURE|violet_held=2187|others_available=13122|json=0\n" in hbp
    assert b"ATTACKS|held=14|locally_coherent_origin=NOT_AUTHENTICATED|json=0\n" in hbp
    assert hbp.endswith(b"END|physical_photon_memory=0|optical_spectrum=0|external_source_signing=0|release_issue10=OPEN|json=0\n")
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    for name,raw in result.items():
        (out/name).write_bytes(raw)
        (out/(name+".sha256")).write_bytes((sha(raw)+"  "+name+"\n").encode("ascii"))
    stats={"verdict":"THIRD_AUDITOR_PASS","addresses":15309,"source_banks":567,
           "read_count":413343,"test_held":14,
           "streamed_read_sha256":report["streamed_full_read_transcript_sha256"],
           "hbp_sha256":sha(hbp),
           "json_sha256":sha(result["factorized-r27-results.json"]),
           "external_origin_attested":False}
    text=(json.dumps(stats,sort_keys=True,separators=(",",":"))+"\n").encode("ascii")
    (out/"third-party-check.json").write_bytes(text)
    (out/"third-party-check.json.sha256").write_bytes(
        (sha(text)+"  third-party-check.json\n").encode("ascii"))
    print(json.dumps(stats,sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=4:raise SystemExit("usage: verify_factorized.py PY_OUTPUT NODE_OUTPUT ARTIFACT_OUTPUT")
    check(*sys.argv[1:])
