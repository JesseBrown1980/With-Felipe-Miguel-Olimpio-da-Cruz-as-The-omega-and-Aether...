#!/usr/bin/env python3
"""Independent full-trace scientific audit of August light-bank digital protocol."""
import hashlib
import json
import re
import sys
from pathlib import Path

SCHEMA="ASOLARIA-SEAT3-AUGUST-LIGHTBANK-PROJECTOR-RGB-V1"
N=65536
sha=lambda b:hashlib.sha256(b).hexdigest()
NEG_NAMES=("flipped_body_byte","swapped_R_to_G_plane","duplicate_index",
           "missing_chunk_fake_filler","forged_LE32_index",
           "corrupt_common_sum_root_anchored","evicted_stale_memory")
def verify(python_hbp,node_hbp,python_json,node_json,directory):
    a=Path(python_hbp).read_bytes()
    b=Path(node_hbp).read_bytes()
    if a!=b:
        p=a.splitlines()
        q=b.splitlines()
        at=next((i for i in range(min(len(p),len(q))) if p[i]!=q[i]),None)
        raise AssertionError("Python/Node HBP mismatch "+(
            f"at row {at+1}: Python {p[at][:160]!r} Node {q[at][:160]!r}"
            if at is not None else f"lengths {len(p)} vs {len(q)}"))
    rows=a.decode("ascii").splitlines()
    assert rows[0]==f"PORTAL|schema={SCHEMA}|source_kind=deterministic_synthetic_bytes|physical_optics=0|json=0"
    assert rows[-1]=="END|raw_chunks=32|raw_frames=11|projected_chunks=63|projected_frames=21|lossless_both_modes=1|negative_held=7|bounded_slot_ids=729|historical_stones_unchanged=1|json=0"
    pa=json.loads(Path(python_json).read_text("utf8"))
    na=json.loads(Path(node_json).read_text("utf8"))
    assert pa==na,"independently authored Python/Node metrics drift"
    assert pa["schema"]==SCHEMA and pa["status"]=="PASS"
    assert pa["full_trace_bytes"]==len(a) and pa["full_trace_sha256"]==sha(a)
    assert pa["source_bytes"]==N
    # A third, isolated source re-derivation. No import of either implementation.
    origin=bytes((((i*73) ^ (i//8) ^ ((i*i)//512) ^ 0xA5)&0xFF)
                 for i in range(N))
    assert pa["source_sha256"]==sha(origin)
    assert f"SOURCE|bytes=65536|sha256={sha(origin)}|json=0" in rows
    assert pa["projected_bytes"]==131076
    assert pa["projected_triples"]==21846
    assert pa["padding_bytes"]==2
    assert pa["matrix_rank"]==2 and pa["matrix_trace"]==2
    assert pa["matrix_projector_identity"] is True
    assert pa["test_triples"]==729
    assert pa["initial_total_stored_packets"]==95
    assert pa["raw_mode"]["chunks"]==32 and pa["raw_mode"]["frames"]==11
    assert pa["raw_mode"]["hits"]==32 and pa["raw_mode"]["evictions_initial"]==0
    assert pa["raw_mode"]["bytes"]==65536 and pa["raw_mode"]["sha256"]==sha(origin)
    assert pa["projected_mode"]["chunks"]==63 and pa["projected_mode"]["frames"]==21
    assert pa["projected_mode"]["hits"]==63 and pa["projected_mode"]["evictions_initial"]==0
    assert pa["projected_mode"]["bytes"]==131076
    assert pa["bank_capacity"]==729 and pa["post_fill_occupancy"]==729
    assert pa["post_fill_evictions"]==63
    assert pa["immutable_slot_identities"] is True
    assert pa["optical_events"]==27 and pa["trit_sum"]==0
    assert pa["optical_census"]=={"T":9,"A":9,"R":9}
    assert pa["negative_held_count"]==7
    assert pa["executed_negative_controls"]==[
        {"name":name,"verdict":"HELD"} for name in NEG_NAMES]
    assert pa["common_mode_required_for_lossless"] is True
    for field in ("origin_authenticated","qr_pixels_generated",
                  "camera_used","optical_device_used","physical_hosts_attested"):
        assert pa[field] is False,(field,pa[field])
    packet_rows=[row for row in rows if row.startswith("PACKET|")]
    assert len(packet_rows)==95
    for mode,nchunks,bytesize in (("raw",32,65536),("projected",63,131076)):
        subset=[x for x in packet_rows if x.startswith("PACKET|mode="+mode+"|")]
        assert len(subset)==nchunks
        for i,row in enumerate(subset):
            fields=dict(part.split("=",1) for part in row.split("|") if "=" in part)
            assert int(fields["index"])==i
            assert fields["plane"]=="RGB"[i%3]
            assert int(fields["body_bytes"])==min(2100,bytesize-2100*i)
            assert len(fields["body_sha256"])==64
            assert len(fields["packet_sha256"])==64
            assert int(fields["base64_chars"])>0
        assert (f"RECALL|mode={mode}|chunks={nchunks}|frames={(nchunks+2)//3}"
                f"|hits={nchunks}|evictions=0|reconstructed_sha256="
                f"{pa['raw_mode' if mode=='raw' else 'projected_mode']['sha256']}|exact=1|json=0") in rows
    assert len([r for r in rows if r.startswith("NEG|")])==7
    for name in NEG_NAMES:
        assert f"NEG|name={name}|verdict=HELD|json=0" in rows
    assert "KERNEL|a=10,20,30|b=15,25,35|same_differences=1|sum_a=60|sum_b=75|lossless_without_common=0|json=0" in rows
    assert "BANK|capacity=729|occupancy=729|evictions=63|initial_hits=63|slot_ids_stable=1|stale_original_chunks=63|json=0" in rows
    assert "LIGHT|synthetic_events=27|T=9|A=9|R=9|trit_sum=0|per_event_one_outcome=1|physical_photons_measured=0|json=0" in rows
    assert any(x.startswith("TRUST|") and "|external_source_authenticated=0|" in x and "|actual_QR_pixels_rendered=0|" in x for x in rows)
    assert sha(bytes([a[0]^1])+a[1:]) != sha(a)
    dst=Path(directory)
    dst.mkdir(parents=True,exist_ok=True)
    hbp=dst/"seat3-august-lightbank.hbp"
    hbp.write_bytes(a)
    j=dst/"seat3-august-lightbank.json"
    jj=(json.dumps(pa,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
    j.write_bytes(jj)
    index=dst/"seat3-august-lightbank.hbi"
    index.write_bytes((
        f"HBI|schema=ASOLARIA-SEAT3-AUGUST-LIGHTBANK-V1|json=0\n"
        f"HBP|bytes={len(a)}|sha256={sha(a)}|json=0\n"
        f"JSON|bytes={len(jj)}|sha256={sha(jj)}|json=0\n"
        "END|qr_pixels=0|physical_storage=0|source_authenticated=0|json=0\n"
    ).encode("ascii"))
    for path in (hbp,j,index):
        (dst/(path.name+".sha256")).write_text(
            sha(path.read_bytes())+"  "+path.name+"\n")
    print(json.dumps({
        "verdict":"PASS","trace_bytes":len(a),"trace_sha256":sha(a),
        "source_sha256":pa["source_sha256"],"projected_sha256":pa["projected_sha256"],
        "chunks":{"raw":32,"projected":63},
        "projected_relative_size":"2x padded raw",
        "slot_capacity":729,"evictions":63,
        "actual_mutation_holds":7,
        "qr_pixels_rendered":False,"physical_light_device":False
    },sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=6:
        raise SystemExit("usage: python verify_lightbank.py py.hbp node.hbp py.json node.json artifact_dir")
    verify(*sys.argv[1:])
