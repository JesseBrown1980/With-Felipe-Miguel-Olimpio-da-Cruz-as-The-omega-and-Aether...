#!/usr/bin/env python3
"""Independent Seat1 source-provenance software receipt verification."""
import hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/"stones/2026-10-15-rainbow81"
STEM="seat-1-crossview-provenance-18336"
TRACE="b8ca261a6e0e4712e7457af80b8136e19d218a9edbec796730006670d07045a1"
def digest(raw):return hashlib.sha256(raw).hexdigest()
def main():
    files={}
    for ext in (".json",".hbp",".hbi"):
        path=DIR/(STEM+ext)
        raw=path.read_bytes()
        chk=(path.parent/(path.name+".sha256")).read_text("ascii").split()
        assert chk==[digest(raw),path.name],path
        files[ext]=raw
    receipt=json.loads(files[".json"])
    assert receipt["schema"]=="ASOLARIA-SEAT1-CROSSVIEW-PROVENANCE-V1"
    assert receipt["full_trace_sha256"]==TRACE
    assert receipt["full_trace_bytes"]==4320118
    assert receipt["case_level_checks"]==18336
    assert receipt["joint_rank81_pairs"]==24
    assert [receipt[k] for k in ("valid_common_source_roundtrips",
      "mathematically_inconsistent_mismatches_rejected",
      "source_identity_substitutions_accepted_as_different_valid_source",
      "invisible_second_source_mismatches")]==[4584]*4
    assert receipt["limitations"]["physical_host_attested"] is False
    assert receipt["limitations"]["cryptographic_source_authentication_established"] is False
    index=files[".hbi"].decode("ascii")
    for ext in (".json",".hbp"):
        assert f"file={STEM+ext}|sha256={digest(files[ext])}" in index
    assert f"sha256={TRACE}" in index
    assert len(sys.argv) in (1,3)
    for arg in sys.argv[1:]:
        raw=Path(arg).read_bytes()
        assert len(raw)==4320118
        assert digest(raw)==TRACE
        assert raw.count(b"PROVENANCE|")==18336
    if len(sys.argv)==3:assert Path(sys.argv[1]).read_bytes()==Path(sys.argv[2]).read_bytes()
    print(json.dumps({"status":"PASS","receipt_sha256_sidecars":3,
        "record_count":18336,"full_traces_verified":len(sys.argv)-1,
        "trace_sha256":TRACE,"physical_host_attested":False},sort_keys=True))
if __name__=="__main__":main()
