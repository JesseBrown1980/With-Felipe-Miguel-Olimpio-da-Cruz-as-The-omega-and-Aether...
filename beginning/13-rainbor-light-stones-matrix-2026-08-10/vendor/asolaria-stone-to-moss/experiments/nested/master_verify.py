#!/usr/bin/env python3
"""Master referee for 4 concurrent N-Nest seat artifacts.
No material from one seat is accepted by another without full hash verification.
"""
import hashlib,json,os,sys,tempfile
from pathlib import Path
SEATS=("seat-1","seat-2","seat-3","seat-4")
CHALLENGE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
def sha(b):return hashlib.sha256(b).hexdigest()
def verify(root,seat):
    base=Path(root)/("nested-"+seat)
    summary=json.loads((base/(seat+".json")).read_text())
    raw=(base/(seat+".hbp")).read_bytes()
    assert summary["schema"]=="ASOLARIA-FOUR-SEAT-NNEST-DEPTH3-V1"
    assert summary["seat"]==seat and summary["status"]=="PASS"
    assert summary["source_challenge_sha256"]==CHALLENGE_SHA
    assert summary["parent_rows"]==summary["child_rows_matched"]==32805
    assert summary["watcher_direct_step_checks"]==10935
    assert summary["nest_depth"]==summary["live_process_count"]==3
    assert len({summary["parent_python_pid"],summary["child_node_pid"],summary["grandchild_python_pid"]})==3
    assert summary["process_lifetimes_overlap"] is True
    assert summary["negative_grandchild_tamper_rejected"] is True
    assert summary["negative_parent_digest_tamper_rejected"] is True
    assert sha(raw)==summary["canonical_hbp_sha256"]
    assert len(raw)==summary["hbp_bytes"]
    lines=raw.splitlines(keepends=True)
    assert len(lines)==32805
    assert len(summary["wave_stones"])==27
    total_overlap=0
    for wave,w in enumerate(summary["wave_stones"]):
        a=b"".join(lines[wave*1215:(wave+1)*1215])
        assert w["wave"]==wave and w["rows"]==1215
        assert w["sha256"]==sha(a) and w["watcher_cases"]==405
        assert w["subtree_green"] is True
        assert a.startswith(("R|seat=%s|w=%02d|"%(seat,wave)).encode("ascii"))
        total_overlap+=w["math_interval_overlap_ms"]
    assert total_overlap==summary["parent_child_mathematical_overlap_ms"]
    return summary
def main(folder):
    summaries=[verify(folder,s) for s in SEATS]
    assert len({x["canonical_hbp_sha256"] for x in summaries})==4
    start=max(x["parent_started_epoch_ms"] for x in summaries)
    end=min(x["parent_ended_epoch_ms"] for x in summaries)
    global_overlap_ms=max(0,end-start)
    # Exercise the SAME production verify(root, seat) function on
    # a deliberately forged archived receipt. No separate toy comparison.
    with tempfile.TemporaryDirectory(prefix="nnest-forged-seat-gate-") as tmp:
        case=Path(tmp)/"nested-seat-1"
        case.mkdir(parents=True)
        original=Path(folder)/"nested-seat-1"
        (case/"seat-1.hbp").write_bytes((original/"seat-1.hbp").read_bytes())
        probe=json.loads((original/"seat-1.json").read_text())
        probe["canonical_hbp_sha256"]="0"*64
        (case/"seat-1.json").write_text(json.dumps(probe))
        try:
            verify(tmp,"seat-1")
        except (AssertionError,ValueError):
            pass
        else:
            raise AssertionError("master-accepted-forged-seat-receipt")
    result={"schema":"ASOLARIA-FOUR-SEAT-NNEST-MASTER-REFEREE-V1",
            "seats":list(SEATS),"verified_seats":4,
            "rows_verified":sum(x["parent_rows"] for x in summaries),
            "watcher_cases_verified":sum(x["watcher_direct_step_checks"] for x in summaries),
            "seat_sha256":{x["seat"]:x["canonical_hbp_sha256"] for x in summaries},
            "cross_seat_wall_clock_overlap_ms":global_overlap_ms,
            "all_four_job_intervals_overlap":global_overlap_ms>0,
            "each_seat_three_live_processes":True,
            "all_108_wave_stones_verified":True,
            "master_forged_digest_rejected":True,
            "physical_host_chassis_verified":False,
            "neural_network_training_performed":False,
            "status":"PASS"}
    Path(folder,"master-referee.json").write_text(json.dumps(result,sort_keys=True,indent=2)+"\n")
    print("NEST_MASTER_PASS",json.dumps(result,sort_keys=True),flush=True)
if __name__=="__main__":
    if len(sys.argv)!=2:raise SystemExit("usage: master_verify.py downloaded-artifact-folder")
    main(sys.argv[1])
