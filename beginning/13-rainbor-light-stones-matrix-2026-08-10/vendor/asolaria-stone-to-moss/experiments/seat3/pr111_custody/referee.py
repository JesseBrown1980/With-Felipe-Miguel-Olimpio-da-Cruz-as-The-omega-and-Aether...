#!/usr/bin/env python3
"""Seat3 independent PR111 evidence join and active spoof/cross-run replay tests.

The original Seat2 OS-counter observations are real host-reported activity.
This auditor distinguishes their provenance and internal integrity from
independently attested hardware metrology. Never rewrites original artifacts.
Uses only Python stdlib, independently recomputes 256x2MiB source SHA.
"""
from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
import hashlib,json,shutil,subprocess,sys,tempfile

SCHEMA="ASOLARIA-SEAT3-R9-FORENSIC-CROSS-RUN-VERIFICATION-V1"
RUN="38777263894"
MERGE_SHA="5969b7de9ada80e8feaa18b497c1932c009d90db"
PR_HEAD="8e597ae4c8d5d1ff76a2d25ad394ec49e601afc4"
SOURCE_COMMIT="5d3e3a1147ad7af84c1b5b1ba482dfddd9832c86"
HBP="stones/2026-10-15-rainbow81/seat4-round5-signed-spectrum-mapping-20261015.hbp"
SOURCE_SHA="077bf98dc7c10e3125ce1147270cc927ce978ab63a19ec30e4655267f1770400"
BANK_SHA="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345"
DIGEST_SHA="ae3474a94a03e024ad41bd6d0c508a18cbb3ed43c551da0ed3c6ec701e5b61cf"
NAMES=("digital.json","host-activity.json","instrument-status.json","node-review.json")
ARTIFACTS={
    "seat2-r9-ubuntu-latest-py3.11":("Linux","3.11"),
    "seat2-r9-ubuntu-latest-py3.13":("Linux","3.13"),
    "seat2-r9-windows-latest-py3.11":("Windows","3.11"),
    "seat2-r9-windows-latest-py3.13":("Windows","3.13"),
}
RUN_MIN=datetime(2026,10,15,17,25,tzinfo=timezone.utc)
RUN_MAX=datetime(2026,10,15,17,29,tzinfo=timezone.utc)
def sha(data):return hashlib.sha256(data).hexdigest()
def canonical(obj):return (json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
def check(ok,message):
    if not ok:raise ValueError(message)
def direct_source(root):
    source=(Path(root)/HBP).read_bytes()
    check(len(source)==701 and sha(source)==SOURCE_SHA,"FROZEN_701_HBP_ROOT_MISMATCH")
    check(BANK_SHA.encode("ascii") in source,"BASE_BANK_REFERENCE_MISSING")
    payload=(source*((2*1024*1024+len(source)-1)//len(source)))[:2*1024*1024]
    h=hashlib.sha256()
    for i in range(256):
        h.update(payload)
        h.update(i.to_bytes(4,"little"))
    observed=h.hexdigest()
    check(observed==DIGEST_SHA,"FROZEN_256x2MIB_DIGEST_FAILED")
    return sha(payload),observed

def packet_check(folder,name,expected_payload,expected_digest):
    folder=Path(folder)
    check(name in ARTIFACTS,"UNRECOGNIZED_GITHUB_ARTIFACT")
    expected_os,expected_py=ARTIFACTS[name]
    records={}
    for fn in NAMES:
        data=(folder/fn).read_bytes()
        check((folder/(fn+".sha256")).read_bytes()==
              (sha(data)+"  "+fn+"\n").encode("ascii"),
              "PACKET_SHA256_SIDECAR_INVALID:"+fn)
        obj=json.loads(data)
        check(data==canonical(obj),"PACKET_NONCANONICAL_JSON:"+fn)
        records[fn]=obj
    d=records["digital.json"]
    h=records["host-activity.json"]
    instr=records["instrument-status.json"]
    review=records["node-review.json"]
    check(d["source_git_commit"]==SOURCE_COMMIT and d["source_sha256"]==SOURCE_SHA,
          "DIGITAL_SOURCE_COMMIT_MISMATCH")
    check(d["input_file_bytes"]==701 and d["original_bank_sha256_as_declared_in_hbp"]==BANK_SHA,
          "HBP_BANK_LINK_OR_BYTE_SIZE_MISMATCH")
    check(d["deterministic_payload_size_bytes"]==2*1024*1024 and
          d["deterministic_payload_sha256"]==expected_payload and
          d["hash_loops"]==256 and d["deterministic_workload_sha256"]==expected_digest,
          "UNREPRODUCIBLE_256x2MIB_SOURCE_DIGEST")
    check(d["physical_optical_storage_measured"] is False,"FALSE_PHOTON_STORAGE_CLAIM")
    check(h["schema"]=="ASOLARIA-SEAT2-R9-REAL-OS-PROCESS-METRICS-V1" and
          h["source_sha256"]==SOURCE_SHA and h["source_commit"]==SOURCE_COMMIT,
          "HOST_SOURCE_JOIN_FAILED")
    # These are external constraints for this exact archival CI run, *not*
    # claims of a trusted physical-chassis attestation.
    check(h["github_run_id"]==RUN,"HISTORICAL_RUN_ID_FORGERY_OR_REPLAY")
    check(h["producing_git_sha"]==MERGE_SHA,"HISTORICAL_MERGE_REF_FORGERY_OR_REPLAY")
    check(h["github_job"]=="measured-host-activity","HISTORICAL_JOB_CHANGED")
    check(h["runner_os"]==expected_os and h["platform_system"]==expected_os,
          "CROSS_RUNNER_PLATFORM_IDENTITY_REPLAY")
    check(h["python"].startswith(expected_py+"."),"CROSS_PYTHON_RUNTIME_REPLAY")
    check(isinstance(h["process_pid"],int) and h["process_pid"]>0,"MISSING_OS_PID")
    check(isinstance(h["cpu_elapsed_ns"],int) and h["cpu_elapsed_ns"]>0 and
          isinstance(h["wall_elapsed_ns"],int) and h["wall_elapsed_ns"]>0,
          "CPU_OR_WALL_REPORT_INCOMPLETE")
    # OS CPU may exceed elapsed on multi-thread workloads and due to tick
    # quantization. This is a permissive plausibility screen, not a power meter.
    check(h["cpu_elapsed_ns"]<=max(8*h["wall_elapsed_ns"],h["wall_elapsed_ns"]+2_000_000_000),
          "CPU_COUNTER_INCONSISTENT_WITH_WORKLOAD_INTERVAL")
    start=datetime.fromisoformat(h["wall_utc_start"])
    end=datetime.fromisoformat(h["wall_utc_end"])
    check(start.tzinfo is not None and end.tzinfo is not None and
          RUN_MIN<=start<=end<=RUN_MAX,"UTC_OUTSIDE_HISTORICAL_GITHUB_RUN")
    span=round((end-start).total_seconds()*1e9)
    check(abs(span-h["wall_elapsed_ns"])<=2_000_000_000,
          "MONOTONIC_COUNTER_NOT_LINKED_TO_UTC_WINDOW")
    check(h["memory_allocated_bytes"]==24*1024*1024 and
          h["memory_pages_touched"]==6144,"MISSING_PAGE_TOUCH_DECLARATION")
    check(all(isinstance(h[k],int) and h[k]>0 for k in
              ("rss_before_bytes","rss_during_bytes","rss_after_work_bytes")),
          "INVALID_RSS")
    check(h["rss_during_bytes"]-h["rss_before_bytes"]>=1024*1024,
          "NO_REPORTED_RESIDENT_ALLOCATION")
    check(h["measurement_type"]=="OS_PROCESS_COUNTERS_NOT_INSTRUMENTED_RAIL_POWER",
          "FALSE_METER_STATUS")
    check(instr["externally_attested_instrument_data"] is False and
          instr["optical_retention_measured"] is False and
          instr["biological_neural_memory_measured"] is False,
          "UNSUPPORTED_EXTERNAL_SENSOR_PROMOTION")
    check(len(instr["channels"])==8,"INSTRUMENT_CHANNEL_COUNT")
    for channel in instr["channels"].values():
        check(channel=={"measured":False,"value":None,
                         "instrument_id":None,"raw_capture_sha256":None},
              "FALSIFIED_EXTERNAL_METER")
    check(review["deterministic_workload_sha256"]==expected_digest and
          review["source_sha256"]==SOURCE_SHA and
          review["raw_source_bytes_sha256"]==SOURCE_SHA and
          review["digital_sha256"]==sha((folder/"digital.json").read_bytes()),
          "UPSTREAM_NODE_REVIEW_NOT_BOUND_TO_SOURCE")
    check(review["electric_power_watts_measured"] is False and
          review["photons_detected"] is False and
          review["stored_photons_read"] is False and
          review["no_independent_host_hardware_attestation"] is True,
          "UNSUPPORTED_PHYSICAL_CUSTODY_CLAIM")
    return {
        "artifact":name,
        "runner_os":expected_os,"python_major_minor":expected_py,
        "host_evidence_sha256":sha((folder/"host-activity.json").read_bytes()),
        "process_cpu_ns":h["cpu_elapsed_ns"],
        "monotonic_elapsed_ns":h["wall_elapsed_ns"],
        "rss_delta_bytes":h["rss_during_bytes"]-h["rss_before_bytes"],
        "source_verified":True,"instrument_watts_or_photons_collected":False}

def replace_json(folder,filename,value):
    data=canonical(value)
    (folder/filename).write_bytes(data)
    (folder/(filename+".sha256")).write_bytes(
        (sha(data)+"  "+filename+"\n").encode("ascii"))

def run_upstream(node,original_repo,folder):
    p=subprocess.run(["node",str(Path(node).resolve()),
                      str(Path(original_repo).resolve()),str(folder)],
                     stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                     encoding="utf-8",check=False)
    return p.returncode==0

def prove_spoof(original_root,original_repo,original_node,
                source_payload,source_workload):
    originals={n:Path(original_root)/n for n in ARTIFACTS}
    label="seat2-r9-ubuntu-latest-py3.13"
    original=originals[label]
    copied_other=originals["seat2-r9-windows-latest-py3.13"]
    outcome={}
    with tempfile.TemporaryDirectory(prefix="seat3-r9-falsifier-") as scratch:
        base=Path(scratch)
        cases=("forged_run_and_git","forged_platform",
               "impossible_monotonic_wall","replay_cross_host_packet",
               "invented_photon_meter")
        for case in cases:
            dest=base/case
            shutil.copytree(original,dest)
            if case=="replay_cross_host_packet":
                for f in ("host-activity.json","host-activity.json.sha256"):
                    shutil.copy2(copied_other/f,dest/f)
            else:
                filename=("instrument-status.json" if case=="invented_photon_meter"
                          else "host-activity.json")
                record=json.loads((dest/filename).read_bytes())
                if case=="forged_run_and_git":
                    record["github_run_id"]="9999999999"
                    record["producing_git_sha"]="f"*40
                elif case=="forged_platform":
                    record["runner_os"]="Windows"
                    record["platform_system"]="Windows"
                elif case=="impossible_monotonic_wall":
                    record["cpu_elapsed_ns"]=3_600_000_000_000
                    record["wall_elapsed_ns"]=3_600_000_000_000
                elif case=="invented_photon_meter":
                    record["channels"]["optical_spectral_counts"]={
                        "measured":True,"value":12345,
                        "instrument_id":"ATTACKER-OWNED","raw_capture_sha256":"f"*64}
                replace_json(dest,filename,record)
            original_node_accepts=run_upstream(original_node,original_repo,dest)
            strict_rejected=False
            try:packet_check(dest,label,source_payload,source_workload)
            except (ValueError,KeyError,TypeError,AssertionError):
                strict_rejected=True
            check(strict_rejected,"SEAT3_FALSE_GREEN_ON_SYNTHETIC_ATTACK:"+case)
            # Positive proof of actual permissiveness only where observed.
            if case=="invented_photon_meter":
                check(not original_node_accepts,"UPSTREAM_FALSE_POSITIVE_SENSOR_ATTACK")
            else:
                check(original_node_accepts,"UPSTREAM_ALREADY_BLOCKS_REPLAY_UPDATE_FINDINGS:"+case)
            outcome[case]={
                "original_seat2_node_review_accepts":original_node_accepts,
                "seat3_independent_join_rejects":strict_rejected,
                "packet_type":"COPIED_AND_MODIFIED_SYNTHETIC_ATTACK_NOT_A_REAL_GITHUB_HOST"}
    return outcome

def main(artifacts_dir,frozen_root,seat2_node,outdir):
    expected_payload,expected_workload=direct_source(frozen_root)
    root=Path(artifacts_dir)
    check(all((root/n).is_dir() for n in ARTIFACTS),"FOUR_ARCHIVE_BUNDLES_NOT_PRESENT")
    legit=[packet_check(root/n,n,expected_payload,expected_workload)
           for n in sorted(ARTIFACTS)]
    for fn in ("digital.json","instrument-status.json","node-review.json"):
        blobs={(root/n/fn).read_bytes() for n in ARTIFACTS}
        check(len(blobs)==1,"FOUR_ARTIFACT_DETERMINISTIC_BYTE_DRIFT:"+fn)
    actual_host_sha=[j["host_evidence_sha256"] for j in legit]
    check(len(set(actual_host_sha))==4,"DUPLICATE_FINAL_HOST_BUNDLES")
    attacks=prove_spoof(root,frozen_root,seat2_node,expected_payload,expected_workload)
    report={
        "schema":SCHEMA,
        "verdict":"INDEPENDENT_R9_ORIGINAL_HOST_PACKETS_PASS_ACTIVE_REPLAY_FALSIFIERS_REJECTED",
        "published_run_id":RUN,"seat2_pr_head":PR_HEAD,
        "reported_github_pull_merge_sha":MERGE_SHA,
        "pinned_source_commit":SOURCE_COMMIT,
        "pinned_hbp_sha256":SOURCE_SHA,
        "referenced_but_not_directly_read_retained_bank_sha256":BANK_SHA,
        "directly_read_retained_bank_this_workload":False,
        "pinned_repeated_2mib_workload_sha256":expected_workload,
        "legitimate_four_reported_host_records":legit,
        "copied_packet_falsifications":attacks,
        "copied_packet_upstream_accepts_nonsensor_forgery":
            sum(v["original_seat2_node_review_accepts"]
                for k,v in attacks.items() if k!="invented_photon_meter"),
        "original_hardware_cpu_ram_execution_observed":True,
        "os_process_report_not_unforgeable_independent_hardware_attestation":True,
        "independent_mains_power_or_photon_detector":False,
        "photon_memory_prior_experiment_status":"OPERATOR_REPORTED_COMPLETED_INDEPENDENT_INSTRUMENT_AUDIT_PENDING",
        "liris_pre_light_local_receipt":"REPORTED_HISTORICAL_SEPARATE_EVIDENCE",
        "real_photon_memory_storage_demonstrated_by_PR111":False,
        "changed_any_historical_artifact":False,
    }
    canonical_bytes=canonical(report)
    out=Path(outdir);out.mkdir(parents=True,exist_ok=True)
    name="seat3-pr111-crosshost-verdict.json"
    (out/name).write_bytes(canonical_bytes)
    (out/(name+".sha256")).write_bytes(
        (sha(canonical_bytes)+"  "+name+"\n").encode("ascii"))
    print(json.dumps({"verdict":"PASS","original_host_packets":4,
                      "active_copied_packet_negative_tests":len(attacks),
                      "upstream_schema_accepted_adversarial_metadata_cases":
                          report["copied_packet_upstream_accepts_nonsensor_forgery"],
                      "sha256":sha(canonical_bytes),
                      "original_physical_host_counters_still_supported":True},
                     sort_keys=True))
if __name__=="__main__":
    if len(sys.argv)!=5:
        raise SystemExit("usage: python referee.py ARCHIVES FROZEN_MAIN SEAT2_NODE_SOURCE OUTPUT")
    main(*sys.argv[1:])
