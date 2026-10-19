#!/usr/bin/env python3
"""Seat 2 independently classify recent recurrence experiments without pooling
different designs into an invalid 288-case estimate.

Runs immutable Seat 2 (72 signed reference), Seat 3 (12 exhaustive rational
probabilities), and Seat 4 (3888 digital frame cases) software sources.
Audits Seat 1's EXACT pinned source for the distinct E-reporting fault stage.
All sources are synthetic computational receipts, not physical witnesses.
"""
import argparse
import hashlib
import json
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

PINS={
 "seat1":"432565f6f9f6ab4ba0b1f8ebf67a4f5374d07ab2",
 "seat2":"0e7ff0c14b0d4e86462f42c78adc3104bacb91ea",
 "seat3":"84a02995ecdbc40cbef9933a73a92ee778b3616b",
 "seat4":"57edafc472462c3db63207fe8662274ad07c7c1a",
}
SEAT2_JSON="28aa83689fd47eabf232c4568c53006c03f75b2b89731b32f7aa99a859e7a6b9"
SEAT2_HBP="c8192ae33825c6585b72a915aafcabfd82e4286b8e7278f9650d9c8234155f5e"
SEAT3_HBP="3f4d0d407eefa32ff0806f2075fdd66569f79c4d49c2f466dc0e0580d18a94ff"
SEAT4_TRACE="c0b44be3857af23cef02e9274e335868d2efbfe2f73d59a290ddc24a1bd8ca14"
SEAT4_STONE="b73b09e3e89d4af4d815d5e8f2456daec4103b206cbe0190d2ac5274590ae3a8"
SEAT2_FIXTURE="b79da3f482215c563ac828883ee6b5f92d6d695896bba75ca32b7493ab2028df"

def sha(raw):return hashlib.sha256(raw).hexdigest()
def run(*args):
    p=subprocess.run(list(map(str,args)),check=True,stdout=subprocess.PIPE,
                     stderr=subprocess.PIPE,timeout=240)
    return p.stdout.decode("utf8")
def git_head(repo):
    return run("git","-C",repo,"rev-parse","HEAD").strip()
def pinned_sources(dirs):
    for seat,dir in dirs.items():
        got=git_head(dir)
        assert got==PINS[seat],(seat,got,PINS[seat])
def independently_evaluate_bernoulli():
    # Exact enumerated rational mathematics, NOT 72-case/3888-case field data.
    table={}
    q,p=Fraction(1,8),Fraction(1,4)
    for m in (1,3,7):
        same=q+(1-q)*p
        diverse=q+(1-q)*p**m
        trusted=p**m
        assert diverse>=q and trusted<=diverse
        table[str(m)]={
          "single":str(same),"identical_repeats":str(same),
          "new_independent_checks_shared_source":str(diverse),
          "new_independent_checks_assumed_anchor":str(trusted)}
    assert [table[k]["new_independent_checks_shared_source"] for k in ("1","3","7")]==[
        "11/32","71/512","16391/131072"]
    return table

def next_ca150(v):
    mask=(1<<81)-1
    return (v ^ ((v<<1)|(v>>80)) ^ ((v<<80)|(v>>1)))&mask

def stage_counterexample(seed):
    """Independently computed one-off post-computation vs persistent fault."""
    actual=next_ca150(seed)
    faulty=actual ^ 1
    replay_clean=next_ca150(seed)
    replay_persistent=next_ca150(seed)^1
    assert replay_clean==actual and replay_clean!=faulty
    assert replay_persistent==faulty and replay_persistent!=actual
    # Common-source corruption remains mathematically consistent in all views.
    bad_source=seed ^ (1<<32)
    assert bad_source!=seed
    wrong=next_ca150(bad_source)
    assert wrong==next_ca150(bad_source)
    assert wrong!=actual
    return {
      "once_corrupted_report_b_recomputes_correctly":True,
      "persistent_faulty_reporter_b_repeats_wrong_state":True,
      "coherent_substitute_passes_unanchored_self_comparison":True,
      "exact_source_input_bits":81,
      "not_reconciled_without_a_common_fault_stage":True,
    }

def main():
    p=argparse.ArgumentParser()
    for name in PINS:p.add_argument("--"+name,required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args()
    dirs={s:getattr(args,s).resolve() for s in PINS}
    pinned_sources(dirs)
    s1=(dirs["seat1"]/"experiments/seat1/recurrence/seat1_recurrence_72.py").read_text("utf8")
    s2=(dirs["seat2"]/"experiments/seat2/recurrence/seat2_rim72_verify.py").read_text("utf8")
    assert 'report=inject_score_fault(report)' in s1
    assert 'model=bridge.leaf(q,received_params,pin)' in s1
    assert 'math_consistent=(report==model)' in s1
    assert 'faulty_ab=(scenario=="E" and arm in ("A","B"))' in s2
    assert 'observed=hex81(int(expected_received,16)^1) if faulty_ab else expected_received' in s2
    assert 'if arm=="B" and attempts:' in s2
    assert 'assert not c["release_authorized"]' in s2 # verify enforced no release
    assert 'watcher_attack_exercised' in s1
    assert 'scenario=="W" and arm in ("C","D")' in s1

    test=dirs["seat2"]/"experiments/seat2/recurrence"
    assert sha((test/"seat2_rim_signed_source_v1.json").read_bytes())==SEAT2_FIXTURE
    temp=args.out.parent
    temp.mkdir(parents=True,exist_ok=True)
    run(sys.executable,test/"seat2_rim72_verify.py",
        test/"seat2_rim_signed_source_v1.json",test/"rim_node_watcher.js",
        temp/"seat2.json",temp/"seat2.hbp",temp/"seat2-metrics.json")
    a=(temp/"seat2.json").read_bytes()
    assert sha(a)==SEAT2_JSON
    assert sha((temp/"seat2.hbp").read_bytes())==SEAT2_HBP
    seat2=json.loads(a)
    assert seat2["total_cases"]==72 and seat2["false_greens"]==24
    assert seat2["first_round_error_corrections_recovered"]==6
    assert not seat2["wasm_invoked"] and not seat2["http_agents_invoked"]

    third=dirs["seat3"]/"experiments/seat3"
    pathstone=dirs["seat3"]/"stones/2026-10-15-rainbow81/seat3-recurrence-common-mode-20261015.hbp"
    run(sys.executable,third/"seat3_recurrence_floor.py",temp/"seat3-py.hbp",temp/"seat3-py.json")
    run("node",third/"seat3_recurrence_floor.js",temp/"seat3-node.hbp",temp/"seat3-node.json")
    run(sys.executable,third/"verify_recurrence_floor.py",
        temp/"seat3-py.hbp",temp/"seat3-node.hbp",temp/"seat3-py.json",temp/"seat3-node.json",pathstone)
    assert sha((temp/"seat3-py.hbp").read_bytes())==SEAT3_HBP
    seat3=json.loads((temp/"seat3-py.json").read_bytes())
    assert seat3["rows"]==12 and seat3["source_authenticated"] is False
    independent=independently_evaluate_bernoulli()
    for m in ("1","3","7"):
        assert seat3["counts"][m]["independent_common_source"]["probability"]==independent[m]["new_independent_checks_shared_source"]
        assert seat3["counts"][m]["independent_trusted_anchor"]["probability"]==independent[m]["new_independent_checks_assumed_anchor"]

    fourth=dirs["seat4"]/"experiments/seat4/verify_recurrence_trial.py"
    run(sys.executable,fourth,temp/"seat4-stone.json",temp/"seat4-full.hbp")
    assert sha((temp/"seat4-full.hbp").read_bytes())==SEAT4_TRACE
    assert sha((temp/"seat4-stone.json").read_bytes())==SEAT4_STONE
    seat4=json.loads((temp/"seat4-stone.json").read_bytes())
    assert seat4["total_cases"]==3888 and seat4["physical_hosts_attested"]==0
    assert {k:seat4["tallies"][k]["false_green"] for k in "ABCD"}=={
      "A":648,"B":216,"C":243,"D":0}
    seed=int(json.loads((test/"seat2_rim_signed_source_v1.json").read_bytes())["body"]["source_hex"],16)
    stages=stage_counterexample(seed)
    # Seat1 source bytes sometimes drift across Windows/Linux despite
    # identical semantic outcomes. Do not assert a deterministic cause.
    notes=(dirs["seat1"]/"experiments/seat1/recurrence/RAW-PROPOSAL-DRIFT-SECOND-AUDIT-20261015.md").read_text("utf8")
    assert "72/72 semantic decisions" in notes and "0/72" in notes and "72/72" in notes
    findings={
      "schema":"ASOLARIA-SEAT2-RECURRENCE-CROSS-SEAT-INTEROPERABILITY-V1",
      "seat":"seat-2 computational source-pinned peer audit",
      "source_head_shas":PINS,
      "software_replays":{
        "seat2":{"cases":72,"json_sha256":SEAT2_JSON,"hbp_sha256":SEAT2_HBP,
                 "false_green":24,"bounded_corrections":6,"signed_public_test_fixture":True},
        "seat3":{"exact_model_rows":12,"hbp_sha256":SEAT3_HBP,
                 "independent_fraction_oracle":independent,"physical_error_rate_measured":False},
        "seat4":{"cases":3888,"trace_sha256":SEAT4_TRACE,
                 "stone_sha256":SEAT4_STONE,"false_greens_by_arm":{"A":648,"B":216,"C":243,"D":0},
                 "digital_image_only":True},
      },
      "seat1":{
        "exact_source_commit_checked":True,
        "full_72_case_QPRISM_runtime_reexecuted_here":False,
        "known_all_72_semantic_decisions_cross_os_agreed":True,
        "intermittent_received_proposal_sha256_raw_byte_drift":True,
        "root_cause_of_proposal_byte_drift":"UNRESOLVED",
      },
      "fault_stage_interoperability":{
        "seat1_B_E":"ONE_POSTCOMPUTE_REPORT_SCORE_CORRUPTION_RECOMPUTED_CLEAN",
        "seat2_B_E":"PERSISTENT_REPORTER_BIT_CORRUPTION_EACH_RECURRENT_ROUND",
        "not_identical_interventions":True,
        "toy_counterexample":stages,
      },
      "aggregation":{
        "full_288_from_all_four_seats":False,
        "may_pool_false_green_rates_across_72_12_3888":False,
        "needs_common_error_injection_stage":True,
        "signed_fixture_not_external_host_attestation":True,
        "wasm_or_http_agent_verified":False,
        "human_apex_release_authorized":False,
        "physical_hosts_attested":0,
        "huggingface_remote_readback_verified":False,
      },
      "status":"PASS_SOFTWARE_BOUNDARY_AUDIT_WITH_COMPARABILITY_HOLD",
    }
    out=json.dumps(findings,sort_keys=True,indent=2,ensure_ascii=True).encode()+b"\n"
    args.out.write_bytes(out)
    print(json.dumps({"status":findings["status"],"seat2":72,"seat3":12,"seat4":3888,
                      "seat1_run_this_audit":False,"sha256":sha(out)},sort_keys=True))

if __name__=="__main__":
    main()
