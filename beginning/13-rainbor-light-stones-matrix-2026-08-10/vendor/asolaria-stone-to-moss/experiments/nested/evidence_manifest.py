#!/usr/bin/env python3
"""Run-bound, fail-closed producer manifest, inspired by July 26 evidence audit.

For the files generated within this exact GitHub Actions run, record:
run ID, attempt, HEAD, each input artifact and SHA, lineage pins, per-wave
witness digests, concurrent overlap and Q-PRISM/CRT verification. No claims
about SHA of outer GitHub artifact ZIP before hosting (available post-upload).
"""
import hashlib, json, os, platform, sys
from pathlib import Path

SEATS=("seat-1","seat-2","seat-3","seat-4")
CHALLENGE="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
REDUCTIONS_COMMIT="29307bfedb512235f69bf7c290ee72b2813c7c92"
QPRISM_COMMIT="b4a21a25381d6920b7aab92c94c3c3e1420fc9e4"
NNEST_COMMIT="307903651f56e8a28ef98ca36aef22ee8cda935c"

def sha(blob):return hashlib.sha256(blob).hexdigest()

def main(root):
    root=Path(root)
    run_id=os.getenv("GITHUB_RUN_ID","")
    checkout=os.getenv("GITHUB_SHA","")
    source=os.getenv("ASOLARIA_PRODUCER_HEAD_SHA",checkout)
    attempt=os.getenv("GITHUB_RUN_ATTEMPT","")
    assert run_id.isdecimal() and attempt.isdecimal() and len(source)==40 and len(checkout)==40, "GitHub execution provenance not available"
    master=json.loads((root/"master-referee.json").read_text())
    prism=json.loads((root/"qprism-reductions-verdict.json").read_text())
    assert master["status"]==prism["status"]=="PASS"
    assert master["all_four_job_intervals_overlap"] is True
    assert master["cross_seat_wall_clock_overlap_ms"]>0
    assert master["rows_verified"]==131220
    assert master["watcher_cases_verified"]==43740
    assert master["all_108_wave_stones_verified"] is True
    assert prism["sha256_witness_wave_count"]==108
    assert prism["exact_2_lane_recoveries"]==1728
    assert prism["substituted_valid_projection_source_rejections"]==108
    byseat={}
    perfile={}
    for s in SEATS:
        base=root/("nested-"+s)
        path=base/(s+".hbp")
        record=base/(s+".json")
        assert path.is_file() and record.is_file(), "missing seat artifact"
        output=path.read_bytes()
        receipt=json.loads(record.read_text())
        assert receipt["github_run_id"]==run_id
        assert receipt["canonical_hbp_sha256"]==sha(output)
        assert receipt["canonical_hbp_sha256"]==master["seat_sha256"][s]
        assert receipt["parent_rows"]==32805
        assert receipt["watcher_direct_step_checks"]==10935
        assert len(receipt["wave_stones"])==27
        byseat[s]={
            "result_sha256":sha(output),
            "receipt_sha256":sha(record.read_bytes()),
            "result_bytes":len(output),
            "wave_sha256":[w["sha256"] for w in receipt["wave_stones"]],
            "root_pid_recorded":receipt["parent_python_pid"],
            "child_pid_recorded":receipt["child_node_pid"],
            "watcher_pid_recorded":receipt["grandchild_python_pid"],
            "math_overlap_ms":receipt["parent_child_mathematical_overlap_ms"],
        }
        perfile["nested-"+s+"/"+s+".hbp"]=sha(output)
        perfile["nested-"+s+"/"+s+".json"]=sha(record.read_bytes())
    for f in ["master-referee.json","qprism-reductions-verdict.json","qprism-wave-seals.hbi"]:
        path=root/f
        assert path.is_file(), "missing mandatory output: "+f
        perfile[f]=sha(path.read_bytes())
    manifest={
        "schema":"ASOLARIA-NNEST-GITHUB-EVIDENCE-MANIFEST-V1",
        "classification":"RUN_BOUND_SOFTWARE_RECEIPT_NOT_PHYSICAL_CHASSIS_ATTESTATION",
        "status":"PASS",
        "github_repository":os.getenv("GITHUB_REPOSITORY",""),
        "producing_github_run_id":run_id,
        "producing_attempt":int(attempt),
        "producing_git_head_sha":source,
        "producing_checkout_sha":checkout,
        "git_sha_semantics":"producing_git_head_sha is PR branch head or workflow-dispatch SHA; producing_checkout_sha is actual GitHub Actions checkout ref (PR synthetic merge when applicable)",
        "original_challenge_source_sha256":CHALLENGE,
        "source_lineage":{
           "n_nest":{"repository":"JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED","commit":NNEST_COMMIT},
           "reductions":{"repository":"JesseBrown1980/what-is-asolaria---how-do-we-get-reductions-in-everything","commit":REDUCTIONS_COMMIT},
           "qprism":{"repository":"JesseBrown1980/Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control","commit":QPRISM_COMMIT}},
        "execution":{
            "four_runner_math_windows_overlap":True,
            "four_runner_math_window_overlap_ms":master["cross_seat_wall_clock_overlap_ms"],
            "nested_process_levels":3,
            "seat_count":4,"total_parent_child_rows":131220,
            "total_grandchild_watcher_checks":43740,
            "wave_seals":108,
            "qprism_shadow_items_reconstructed":1728,
            "source_bound_substitution_rejections":108,
            "physical_machine_chassis_count_attested":0,
            "neural_network_training_performed":False},
        "seats":byseat,
        "file_sha256":perfile,
        "outer_GitHub_artifact_zip_sha256":"NOT_AVAILABLE_UNTIL_AFTER_UPLOAD",
        "note":"Run-local manifest binds producing run and all raw files; retains entire payloads; no entropy-free reconstruction."
    }
    out=root/"RECEIPT-MANIFEST.json"
    out.write_text(json.dumps(manifest,sort_keys=True,indent=2)+"\n")
    sums="".join(v+"  "+name+"\n" for name,v in sorted(perfile.items()))
    (root/"SHA256SUMS").write_text(sums,encoding="ascii")
    print("NEST_RUN_BOUND_MANIFEST_PASS",json.dumps({"run_id":run_id,
        "head":source,"file_count":len(perfile),
        "manifest_sha256":sha(out.read_bytes()),
        "sha256s_sha256":sha(sums.encode("ascii"))},sort_keys=True),flush=True)

if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("usage: evidence_manifest.py nested-artifacts-directory")
    main(sys.argv[1])
