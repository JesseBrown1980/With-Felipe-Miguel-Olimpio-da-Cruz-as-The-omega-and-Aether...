#!/usr/bin/env python3
"""Independent remediated PR111 forensic review, original archives + GitHub API.

The four genuine original host reports remain OS-reported process observations.
Runs original Seat2 Node reviewer against TEMPORARY coherent metadata attacks
under a documented historic-CI CONTEXT EMULATION assembled from independently
retrieved GitHub run/commit/job metadata. Not hardware attestation. No network
required within verifier; GitHub metadata fetched separately by Actions.
"""
from __future__ import annotations
import hashlib,json,os,shutil,subprocess,sys,tempfile
from pathlib import Path
from datetime import datetime,timezone
SHA=lambda b:hashlib.sha256(b).hexdigest()
RUN_ID="38783337268"
HEAD="e2532396bbd42bb2a0bace2f26d4b5d6b8f2e966"
MERGE="e7011fe09868f0a84de0434964cc3dadc205b808"
MAIN="5d3e3a1147ad7af84c1b5b1ba482dfddd9832c86"
SOURCE_SHA="077bf98dc7c10e3125ce1147270cc927ce978ab63a19ec30e4655267f1770400"
DIGEST_SHA="ae3474a94a03e024ad41bd6d0c508a18cbb3ed43c551da0ed3c6ec701e5b61cf"
BANK_SHA="52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345"
REL="stones/2026-10-15-rainbow81/seat4-round5-signed-spectrum-mapping-20261015.hbp"
ORIGINAL_META={
    "seat2-r9-ubuntu-latest-py3.11":("Linux","3.11"),
    "seat2-r9-ubuntu-latest-py3.13":("Linux","3.13"),
    "seat2-r9-windows-latest-py3.11":("Windows","3.11"),
    "seat2-r9-windows-latest-py3.13":("Windows","3.13"),
}
FILES=("digital.json","host-activity.json","instrument-status.json",
       "node-review.json","attack-review.json")
SCHEMA="ASOLARIA-SEAT3-PR111-NEW-HEAD-INDEPENDENT-FORENSICS-V2"
def demand(cond,code):
    if not cond:raise AssertionError(code)
def canon(obj):
    return (json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
def fromiso(s):return datetime.fromisoformat(s.replace("Z","+00:00"))
def pin_source(frozen):
    src=(Path(frozen)/REL).read_bytes()
    demand(len(src)==701 and SHA(src)==SOURCE_SHA,"CHANGED_701_BYTE_HBP")
    demand(BANK_SHA.encode() in src,"MISSING_DECLARED_BANK_REFERENCE")
    payload=(src*((2097152+len(src)-1)//len(src)))[:2097152]
    h=hashlib.sha256()
    for i in range(256):
        h.update(payload);h.update(i.to_bytes(4,"little"))
    demand(h.hexdigest()==DIGEST_SHA,"INDEPENDENT_DIGITAL_SHA_MISMATCH")
    return SHA(payload)
def run_command(cwd,*args):
    return subprocess.check_output(args,cwd=cwd,text=True).strip()
def git_meta(run_obj,commit,job_obj,merge_checkout):
    demand(str(run_obj["id"])==RUN_ID and run_obj["event"]=="pull_request"
           and run_obj["conclusion"]=="success"
           and run_obj["head_sha"]==HEAD
           and run_obj["run_attempt"]==1,"AUTHORITATIVE_ACTIONS_RUN_WRONG")
    demand(commit["sha"]==MERGE,"MERGE_COMMIT_API_WRONG")
    ancestry=[x["sha"] for x in commit["parents"]]
    demand(ancestry==[MAIN,HEAD],"GITHUB_MERGE_SECOND_PARENT_WRONG")
    demand(run_command(merge_checkout,"git","rev-parse","HEAD")==MERGE,
           "GIT_CHECKOUT_NOT_ORIGINAL_TEST_MERGE")
    demand(run_command(merge_checkout,"git","rev-parse","HEAD^2")==HEAD,
           "GIT_CHECKOUT_SECOND_PARENT_WRONG")
    jobs=job_obj["jobs"]
    demand(len(jobs)==5 and all(x["conclusion"]=="success" for x in jobs),
           "AUTHORITATIVE_FIVE_JOB_COMPLETION_WRONG")
    names=[x["name"] for x in jobs]
    expected=[
        "Host counters ubuntu-latest Python 3.11",
        "Host counters ubuntu-latest Python 3.13",
        "Host counters windows-latest Python 3.11",
        "Host counters windows-latest Python 3.13",
    ]
    demand(all(x in names for x in expected),"AUTHORITATIVE_RUN_MISSING_HOST_JOB")
    demand(fromiso(run_obj["run_started_at"])<=fromiso(run_obj["updated_at"]),
           "AUTHORITATIVE_CLOCK_ORDER")
    return {x["name"]:x for x in jobs}

def external_packet_read(archive_root,jobs,run_obj):
    root=Path(archive_root)
    result={}
    static={x:[] for x in FILES if x!="host-activity.json"}
    for label,(os_name,py_short) in sorted(ORIGINAL_META.items()):
        directory=root/label
        demand(directory.is_dir(),"ORIGINAL_ARCHIVED_BUNDLE_NOT_FOUND:"+label)
        all_obj={}
        for name in FILES:
            raw=(directory/name).read_bytes()
            demand((directory/(name+".sha256")).read_bytes()==
                   (SHA(raw)+"  "+name+"\n").encode("ascii"),"ORIGINAL_SIDECAR_MISMATCH")
            parsed=json.loads(raw)
            demand(raw==canon(parsed),"ORIGINAL_RECEIPT_NOT_CANONICAL")
            all_obj[name]=parsed
            if name in static:static[name].append(raw)
        h=all_obj["host-activity.json"]
        d=all_obj["digital.json"]
        inst=all_obj["instrument-status.json"]
        atk=all_obj["attack-review.json"]
        demand(h["github_run_id"]==RUN_ID and h["producing_git_sha"]==MERGE and
               h["pr_head_sha"]==HEAD and h["github_run_attempt"]==1 and
               h["github_pr_number"]==111 and h["github_event_name"]=="pull_request" and
               h["github_job"]=="measured-host-activity","FOUR_HOST_PR_COMMIT_CONTEXT_MISMATCH")
        demand(h["runner_os"]==os_name and h["platform_system"]==os_name and
               h["python"].startswith(py_short+"."),"FOUR_HOST_MATRIX_IDENTITY_MISMATCH")
        jobname="Host counters "+label.split("-r9-")[1].replace("-py"," Python ")
        job=jobs.get(jobname)
        demand(job is not None,"API_JOB_MISSING_FOR_HOST")
        s,e=fromiso(h["wall_utc_start"]),fromiso(h["wall_utc_end"])
        begin,end=fromiso(job["started_at"]),fromiso(job["completed_at"])
        demand(begin<=s<=e<=end,"HOST_WORK_INTERVAL_OUTSIDE_GITHUB_JOB")
        monotonic_ns=h["wall_elapsed_ns"]
        utc_ns=(e-s).total_seconds()*1e9
        demand(abs(utc_ns-monotonic_ns)<=2e9,
               "GROSS_HOST_TIMING_CONTRADICTION_IN_ORIGINAL")
        demand(h["cpu_elapsed_ns"]>0 and monotonic_ns>0
               and h["rss_during_bytes"]-h["rss_before_bytes"]>=1024*1024,
               "NOT_ACTUAL_REPORTED_OS_PROCESS_WORK")
        demand(h["memory_allocated_bytes"]==24*1024*1024 and
               h["memory_pages_touched"]==6144,"MEMORY_PROBE_SCOPE")
        demand(d["source_sha256"]==SOURCE_SHA and
               d["original_bank_sha256_as_declared_in_hbp"]==BANK_SHA and
               d["deterministic_workload_sha256"]==DIGEST_SHA,
               "UNVERIFIED_DIGITAL_ROOT")
        demand(inst["externally_attested_instrument_data"] is False and
               inst["optical_retention_measured"] is False
               and all(not v["measured"] and v["value"] is None for v in inst["channels"].values()),
               "FALSE_INSTRUMENT_PROMOTION")
        demand(atk["case_count"]==10 and atk["forgeries_rejected"]==9 and
               atk["unsigned_positive_cpu_counter_forgery_accepted_as_expected"] is True,
               "AUTHOR_CLAIM_OF_TEN_REJECTIONS_OR_FALSE_CASES")
        outcomes={v["case"]:v for v in atk["falsification_cases"]}
        demand(outcomes["counter_cpu_positive"]["unsigned_positive_cpu_forgery_accepted"] is True,
               "UNSIGNED_CPU_RISK_WAS_NOT_PRESERVED")
        demand(all(outcomes[k]["actual_node_reviewer_rejected"]
                   for k in outcomes if k!="counter_cpu_positive"),
               "NINE_AUTHOR_NEGATIVES_NOT_EXECUTED")
        result[label]={
            "os":os_name,"python":py_short,
            "cpu_elapsed_ns":h["cpu_elapsed_ns"],
            "monotonic_wall_ns":h["wall_elapsed_ns"],
            "rss_delta_bytes":h["rss_during_bytes"]-h["rss_before_bytes"],
            "host_packet_sha256":SHA((directory/"host-activity.json").read_bytes()),
            "interval_inside_API_job":True,
            "source_commit_is_GitHub_PR_head_not_merge":h["pr_head_sha"]!=h["producing_git_sha"],
            "physical_calibrated_meter_attached":False,
        }
    for name,blobs in static.items():
        demand(len({SHA(v) for v in blobs})==1,"FOUR_HOST_STATIC_DIGITAL_DRIFT:"+name)
    demand(len(set(x["host_packet_sha256"] for x in result.values()))==4,
           "ORIGINAL_HOST_MEASUREMENT_VALUES_NOT_DISTINCT")
    return result,{name:SHA(static[name][0]) for name in sorted(static)}

def host_env(root,github_head_event,os_type):
    env=os.environ.copy()
    env.update(GITHUB_SHA=MERGE,GITHUB_RUN_ID=RUN_ID,GITHUB_RUN_ATTEMPT="1",
               GITHUB_JOB="measured-host-activity",RUNNER_OS=os_type,
               GITHUB_EVENT_NAME="pull_request",GITHUB_EVENT_PATH=str(github_head_event))
    return env
def execute_current_node(node_code,merge_checkout,original_source,archive,env):
    return subprocess.run(["node",str(Path(node_code).resolve()),
                           str(Path(original_source).resolve()),str(Path(archive).resolve())],
                          cwd=merge_checkout,env=env,
                          stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                          text=True,timeout=45,check=False)
def overwrite_json(folder,name,obj):
    raw=canon(obj)
    (folder/name).write_bytes(raw)
    (folder/(name+".sha256")).write_bytes(
        (SHA(raw)+"  "+name+"\n").encode("ascii"))
def attacks(host_root,source_root,node_source,merge_checkout,run_meta):
    result={}
    with tempfile.TemporaryDirectory(prefix="seat3-pr111-newhead-") as tmp:
        root=Path(tmp)
        eventfile=root/"authenticated-from-GH-run-event.json"
        eventfile.write_bytes(canon({"pull_request":{"number":111,"head":{"sha":HEAD}}}))
        source_real=Path(source_root).resolve()
        for label,(os_type,_) in sorted(ORIGINAL_META.items()):
            env=host_env(root,eventfile,os_type)
            ref=Path(host_root)/label
            working=root/(label+"-cases")
            working.mkdir()
            def candidate(name):
                dest=working/name
                shutil.copytree(ref,dest)
                return dest
            clean=candidate("clean")
            proc=execute_current_node(node_source,merge_checkout,source_real,clean,env)
            demand(proc.returncode==0,
                   "NEW_HEAD_CURRENT_NODE_REJECTED_ORIGINAL:"+label+":"+proc.stderr[-1400:])
            scenarios=[
                "wrong_run_id","wrong_merge_sha","wrong_pr_head",
                "wrong_run_attempt","wrong_pr_number","wrong_runner_os",
                "wrong_job","fake_photon_sensor","missing_host_packet",
                "cross_runner_replay","plausible_unsigned_cpu","hour_cpu_vs_utc",
                "changed_original_hbp"
            ]
            answers={}
            for case in scenarios:
                trial=candidate(case)
                original=source_real
                if case=="changed_original_hbp":
                    substitute=working/"mutated-source"
                    src=substitute/REL
                    src.parent.mkdir(parents=True,exist_ok=True)
                    buf=bytearray((source_real/REL).read_bytes())
                    buf[101]^=1
                    src.write_bytes(buf)
                    original=substitute
                elif case=="missing_host_packet":
                    (trial/"host-activity.json").unlink()
                elif case=="cross_runner_replay":
                    other=next(name for name,fields in ORIGINAL_META.items()
                               if fields[0]!=os_type)
                    for file in ("host-activity.json","host-activity.json.sha256"):
                        shutil.copy2(Path(host_root)/other/file,trial/file)
                else:
                    is_instr=case=="fake_photon_sensor"
                    name="instrument-status.json" if is_instr else "host-activity.json"
                    packet=json.loads((trial/name).read_bytes())
                    if case=="wrong_run_id":packet["github_run_id"]="123456789"
                    elif case=="wrong_merge_sha":packet["producing_git_sha"]="f"*40
                    elif case=="wrong_pr_head":packet["pr_head_sha"]="f"*40
                    elif case=="wrong_run_attempt":packet["github_run_attempt"]=2
                    elif case=="wrong_pr_number":packet["github_pr_number"]=112
                    elif case=="wrong_runner_os":
                        wrong="Linux" if os_type=="Windows" else "Windows"
                        packet["runner_os"]=wrong;packet["platform_system"]=wrong
                    elif case=="wrong_job":packet["github_job"]="some-other-real-job"
                    elif case=="fake_photon_sensor":
                        packet["channels"]["optical_spectral_counts"]={
                            "measured":True,"value":456,
                            "instrument_id":"UNTRUSTED-SYNTHETIC",
                            "raw_capture_sha256":"f"*64}
                    elif case=="plausible_unsigned_cpu":packet["cpu_elapsed_ns"]+=10_000_000
                    elif case=="hour_cpu_vs_utc":
                        packet["cpu_elapsed_ns"]=3_600_000_000_000
                        packet["wall_elapsed_ns"]=3_600_000_000_000
                    overwrite_json(trial,name,packet)
                p=execute_current_node(node_source,merge_checkout,original,trial,env)
                accepts=p.returncode==0
                expected=case in ("plausible_unsigned_cpu","hour_cpu_vs_utc")
                demand(accepts==expected,
                       "OBSERVED_NEW_HEAD_REVIEWER_BEHAVIOR_DIFFERENT:"+label+":"+case+
                       ":accepted="+str(accepts)+":"+p.stderr[-1000:])
                answers[case]="UPSTREAM_ACCEPTED" if accepts else "UPSTREAM_REJECTED"
            result[label]={"clean_original":"UPSTREAM_ACCEPTED",
                           "rehashed_copied_packet_attacks":answers,
                           "real_hardware_metrics_invalidated_by_tests":False,
                           "mechanism":"historic_run_context_emulation_not_hardware_attestation"}
    return result

def main(artifacts,meta,source,merge_checkout,node_code,dest):
    meta=Path(meta)
    api_run=json.loads((meta/"run.json").read_bytes())
    api_merge=json.loads((meta/"merge.json").read_bytes())
    api_jobs=json.loads((meta/"jobs.json").read_bytes())
    jobs=git_meta(api_run,api_merge,api_jobs,merge_checkout)
    payload_sha=pin_source(source)
    observations,static=external_packet_read(artifacts,jobs,api_run)
    fuzz=attacks(artifacts,source,node_code,merge_checkout,api_run)
    report={
       "schema":SCHEMA,"verdict":"NEW_HEAD_GITHUB_RUN_ASSOCIATION_VERIFIED_WITH_UNSIGNED_COUNTER_LIMITATION",
       "target_PR":111,"target_pr_head":HEAD,
       "api_confirmed_pull_merge_sha":MERGE,"api_confirmed_base_main":MAIN,
       "api_run_id":RUN_ID,"api_attempt":1,
       "source_hbp_sha256":SOURCE_SHA,
       "source_derived_2mib_payload_sha256":payload_sha,
       "independently_calculated_256x2mib_sha256":DIGEST_SHA,
       "original_full_bank_sha_reference_only":BANK_SHA,
       "original_184815byte_bank_directly_replayed_in_this_job":False,
       "four_original_os_reported_host_counters":observations,
       "source_digital_sensor_and_attack_receipt_SHA_by_filename":static,
       "executed_current_head_reviewer_attacks":fuzz,
       "identity_or_sensor_cases_rejected_per_original_packet":11,
       "positive_cpu_synthetic_tamper_accepted":"EXPECTED_UNATTESTED_COUNTER",
       "hour_cpu_utc_mismatch_accepted":"ADDITIONAL_UNVALIDATED_DURATION_COHERENCE",
       "evidence_scope_host_process_measured_by_OS":True,
       "physical_electric_current_watts_photons_this_CI":"NOT_MEASURED",
       "august_photon_memory_measurement":"OPERATOR_REPORTED_COMPLETED",
       "august_photon_memory_instrument_originals_independent_validation":"PENDING",
       "independent_host_tpm_or_chassis_attestation":False,
       "edited_any_original_seat2_packet":False,
       "historical_run_context_emulation_not_original_signed_event":True,
    }
    data=canon(report)
    dest=Path(dest);dest.mkdir(parents=True,exist_ok=True)
    name="seat3-remediated-pr111-verdict.json"
    (dest/name).write_bytes(data)
    (dest/(name+".sha256")).write_bytes(
        (SHA(data)+"  "+name+"\n").encode("ascii"))
    print(json.dumps({"status":"PASS","original_host_packets":len(observations),
      "exact_pr_head":HEAD,"new_head_context_attacks_rejected":11,
      "plausible_cpu_accepted":True,"gross_cpu_utc_mismatch_accepted":True,
      "report_sha256":SHA(data)},sort_keys=True))
if __name__=="__main__":
    if len(sys.argv)!=7:
        raise SystemExit("usage: python remediated_referee.py ORIGINAL_ARCHIVES API_FOLDER FROZEN_MAIN MERGE_CHECKOUT AUTHOR_NODE OUT")
    main(*sys.argv[1:])
