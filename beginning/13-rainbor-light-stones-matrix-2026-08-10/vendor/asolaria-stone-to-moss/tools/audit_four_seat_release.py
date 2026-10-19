#!/usr/bin/env python3
"""Public four-seat release audit. No private keys, credentials or hardware claims.

Verifies all published SHA-256 sidecars in the four computational seat receipts,
the consistent reported test counts, and the explicit physical/publication
limitations. Cryptographic checks of supported Ed25519 formats run separately
in the matching GitHub Actions job; Seat 2's original signed-byte encoding
remains unresolved and is NOT reported as verified.
"""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/"publication"/"2026-10-14"
STONE=ROOT/"stones"/"2026-10-14-rainbow81"
CK=ROOT/"tracking"/"checkins"
BASENAMES=[
 CK/"seat-1"/"20261014T163705Z"/"checkin.json",
 CK/"seat-1"/"20261014T163705Z"/"commit.json",
 STONE/"seat-1-20261014-computational-readiness.json",
 STONE/"seat-1-20261014-computational-readiness.hbp",
 STONE/"seat-1-20261014-computational-readiness.hbi",
 CK/"seat-2"/"20261014T160538Z.json",
 CK/"seat-2"/"20261014T160538Z.hbp",
 STONE/"seat-2-20261014-readiness.json",
 STONE/"seat-2-20261014-readiness.hbp",
 CK/"seat-3"/"20261014T163350Z"/"checkin.json",
 CK/"seat-3"/"20261014T163350Z"/"commit.json",
 STONE/"seat-3-20261014-local-preflight.json",
 STONE/"seat-3-20261014-local-preflight.hbp",
 CK/"seat-4"/"20261014T161859Z.json",
 CK/"seat-4"/"20261014T161859Z.hbp",
 STONE/"seat-4-20261014-readiness.json",
 STONE/"seat-4-20261014-readiness.sig.json",
 STONE/"stone-seat4-public-precommit-audit-20261014.hbp",
 STONE/"stone-seat4-public-precommit-audit-20261014.hbi",
 STONE/"quantum-gravity-81-full-CI-result.json",
 STONE/"quantum-gravity-81-compact-receipt.json",
 STONE/"stone-seat3-81-quantum-gravity-2026-10-14.hbp",
 STONE/"stone-seat3-81-quantum-gravity-2026-10-14.hbi",
 STONE/"seat-1-20261014-triad27-three-horizon.json",
 STONE/"seat-1-20261014-triad27-three-horizon.hbp",
 STONE/"seat-1-20261014-triad27-three-horizon.hbi",
 STONE/"retention-81-rank40.json",
 STONE/"retention-81-rank40.tsv",
]
HASH="031367b1da1a368dc7471141a9799b79c694a0c9900f65a047438ccaa5f76600"
def sha(data):
    return hashlib.sha256(data).hexdigest()
def verify(path):
    assert path.is_file(),f"Missing {path.relative_to(ROOT)}"
    side=path.with_name(path.name+".sha256")
    assert side.is_file(),f"Missing checksum {side.relative_to(ROOT)}"
    fields=side.read_text(encoding="ascii").strip().split()
    assert len(fields)==2 and fields[1]==path.name, f"Bad sidecar naming: {side}"
    digest=sha(path.read_bytes())
    assert digest==fields[0],f"Digest mismatch for {path}"
    return {"path":str(path.relative_to(ROOT)),"sha256":digest}
def read(path):
    return json.loads(path.read_text(encoding="utf-8"))
def main():
    files=[verify(path) for path in BASENAMES]
    registry=read(P/"STATUS.json")
    assert registry["schema"]=="ASOLARIA-FOUR-SEAT-COMPUTATIONAL-COMPLETION-V1"
    assert len(registry["seats"])==4
    assert all(s["physical_host_independently_attested"] is False for s in registry["seats"])
    assert registry["experimental_conclusions"]["three_physically_independent_hosts"]==0
    assert registry["experimental_conclusions"]["physical_common_challenge_issued"] is False
    assert registry["publication"]["huggingface_verified"]=="not_done"
    followons=registry["distinct_followon_software_results"]
    assert [(x["source_pr"],x["experiment"]) for x in followons]==[
      (11,"two_horizon_stress"),
      (14,"triad_27_waves_three_horizons"),
      (15,"gf2_information_retention")
    ]
    assert followons[0]["state_rows_verified"]==9720
    assert followons[1]["state_rows_verified"]==32805
    assert followons[2]["law_horizon_cases_verified"]==40
    assert all(item["physical_device_attested"] is False for item in followons)

    s1=read(STONE/"seat-1-20261014-computational-readiness.json")
    s2=read(STONE/"seat-2-20261014-readiness.json")
    s3=read(STONE/"seat-3-20261014-local-preflight.json")
    s4=read(STONE/"seat-4-20261014-readiness.json")
    triad=read(STONE/"seat-1-20261014-triad27-three-horizon.json")
    assert triad["python_node_exact_rows"]==triad["expected_rows"]==32805
    assert triad["disagreements"]==0
    assert triad["model_horizons"]==[10**13,10**13+1,10**13+81]
    assert triad["hbp_sha256"]=="720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3"
    assert triad["challenge_sha256"]=="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
    assert triad["physical_host_independently_verified"] is False
    assert triad["fresh_three_host_challenge"] is False
    retention=read(STONE/"retention-81-rank40.json")
    assert retention["schema"]=="ASOLARIA-GF2-81-INFORMATION-RETENTION-STONE-V1"
    assert retention["cross_language"]["exact_parity_rows"]==40
    assert retention["cross_language"]["mismatches"]==0
    assert retention["cross_language"]["canonical_tsv_sha256"]=="f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78"
    assert retention["scope"]["physical_host_independence_verified"] is False
    assert retention["scope"]["fresh_cross_host_blinded_challenge"] is False
    assert retention["scope"]["huggingface_remote_publication_verified"] is False
    assert retention["scope"]["repairs_original_seat2_signature"] is False
    assert len(retention["results"])==10
    assert [x["rank"] for x in retention["results"]]==[79,80,80,80,81,80,80,81,81,80]
    assert retention["model_horizons"]==[1,10**13,10**13+1,10**13+81]
    assert (P/"INFORMATION-RETENTION-81.md").is_file()
    seat3_followon=read(STONE/"seat-3-two-horizon-9720-control.json")
    assert seat3_followon["schema"]=="ASOLARIA-SEAT3-TWO-HORIZON-STRESS-RECEIPT-V1"
    assert seat3_followon["records_per_language"]==9720
    assert seat3_followon["exact_state_agreements"]==9720
    assert seat3_followon["disagreements"]==0
    assert seat3_followon["modeled_horizons"]==[10**13,10**13+1]
    assert seat3_followon["physical_host_independent"] is False
    assert seat3_followon["fresh_three_physical_host_challenge"] is False
    assert seat3_followon["output_sha256_python"]==seat3_followon["output_sha256_node"]=="245ab02b30cbdd9215d161c6561adc6a6c3bf72dd3fa2cb62979b2fb74031cef"
    addendum=(P/"SEAT3-9720-ADDENDUM.md").read_text(encoding="utf-8")
    for phrase in ("9,720", "software", "not", "Hugging Face"):
        assert phrase in addendum
    assert s1["python_vs_node_agreement"]==4860 and s1["output_sha256"]==HASH
    assert s1["physical_host_independence_verified"] is False
    assert s2["agreements"]==s2["cases_python_vs_node"]==1620
    assert s2["explicit_smallstep_controls"]==1215
    assert s2["physical_host_independence_verified"] is False
    assert s3["agreements"]==4860 and s3["python_node_byte_agreement"] is True
    assert s3["independent_physical_host"] is False
    assert s4["result"]["csv_sha256"]=="e949b8560c9150d3c8a446bf5f675644439fcf7b29ab976b32ad3731337cfd43"
    assert (ROOT/"experiments"/"seat4"/"B-CHALLENGE.json").exists()
    qg=read(STONE/"quantum-gravity-81-full-CI-result.json")
    assert qg["bodies"]==81 and qg["status"]=="PASS"
    assert len(qg["sha_seeded_local_hidden_variable_waves"])==9
    assert len(qg["geometry_and_gravity_controls"]["spatial_waves"])==9
    assert "emergent physical gravity" in qg["not_tested"]
    doc=(P/"REPORT.md").read_text(encoding="utf-8")
    for fragment in ("1,620","4,860","729","42,688","32,805","9,720","information-retention","Hugging Face","physical"):
        assert fragment in doc
    summary={
        "schema":"ASOLARIA-FOUR-SEAT-RELEASE-AUDIT-V1",
        "status":"PASS",
        "sha256_sidecars_verified":len(files),
        "seat1_parity":4860,
        "seat2_reported_parity":1620,
        "seat3_parity":4860,
        "seat4_parity":729,
        "seat1_triad_followon_32805_metadata_checked":True,
        "triad_full_hbp_sha256_expected":"720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3",
        "retention_81_law_horizon_comparisons":40,
        "retention_canonical_tsv_sha256":"f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78",
        "seat3_followon_9720_metadata_checked": True,
        "seat3_followon_raw_hbp_sha256_expected": "245ab02b30cbdd9215d161c6561adc6a6c3bf72dd3fa2cb62979b2fb74031cef",
        "seat3_followon_reproduction_runs_separately": True,
        "seat2_signature_independently_verified":False,
        "physical_hosts_witnessed":0,
        "fresh_physical_challenge_issued":False,
        "hf_publication_verified":False,
        "result_sha256_seat1_seat3":HASH,
        "file_manifest":files,
        "note":"public computational results integrity; does not measure physical quantum/gravity/FTL"
    }
    print(json.dumps(summary,sort_keys=True,indent=2))
if __name__=="__main__":
    main()
