#!/usr/bin/env python3
"""Seat 4 adversarial peer test of exact Seat 1 PR #32 N-Nest/Q-PRISM adapter.

PINNED PUBLIC SYNTHETIC SOFTWARE ONLY. This intentionally demonstrates which
claims the producer's trusted watcher can verify, and which claims collapse
if its process, trust anchor, or input configuration are controlled by another
actor. Never deploy this forged-watcher specimen against a real service.
"""
import argparse,copy,hashlib,importlib.util,json,pathlib,subprocess,sys

ROOT=pathlib.Path(__file__).resolve().parents[3]
SEAT1_COMMIT="4e30f2e2d924dba4c0ad21013e8067c61d9b16c8"
SEAT1_BRIDGE_BLOB="f8a841db62d84cc0ad369c7cd336fdbdbf161acd"
NNEST_COMMIT="307903651f56e8a28ef98ca36aef22ee8cda935c"
QPRISM_COMMIT="b4a21a25381d6920b7aab92c94c3c3e1420fc9e4"
TRUST_PARAMS={"control_arm":"prism","seed":20261015,"coupling":0.9,
              "budget":8,"reference_samples":200,"influence":0.5,
              "synthetic_only":True}

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def git_output(repo,*args):
    return subprocess.run(["git","-C",str(repo),*args],check=True,
                          capture_output=True).stdout.strip().decode("ascii")

def pin_checkout(folder,commit):
    assert git_output(folder,"rev-parse","HEAD")==commit,("checkout commit drift",folder)

def git_blob(repo,commit,path):
    raw=subprocess.run(["git","-C",str(repo),"show",commit+":"+path],
                       check=True,capture_output=True).stdout
    return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

def load_bridge(seat1):
    file=seat1/"experiments/integration/seat1/upstream_bridge.py"
    actual=git_blob(seat1,SEAT1_COMMIT,"experiments/integration/seat1/upstream_bridge.py")
    assert actual==SEAT1_BRIDGE_BLOB
    spec=importlib.util.spec_from_file_location("pinned_seat1_qprism_bridge",file)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def expect(cond,reason):
    if not cond:
        raise AssertionError(reason)

def trusted_anchor_accepts(bridge,expected,approved_params,pin,params,reported,watcher,consent=True):
    # This is explicitly an *external* source/policy anchor, not present in the
    # producer's constructed check_nested parent, and not a physical identity.
    if not consent or pin!=expected["trusted_pin"] or params!=approved_params:
        return False
    if reported!=expected["trusted_report"]:
        return False
    if watcher.get("verdict")!="PASS" or watcher.get("checks") is not True:
        return False
    if watcher.get("reported_sha256")!=sha(bridge.canonical(reported)):
        return False
    if watcher.get("recomputed_sha256")!=sha(bridge.canonical(reported)):
        return False
    if watcher.get("recomputed")!=reported:
        return False
    return True

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--seat1",type=pathlib.Path,required=True)
    parser.add_argument("--nnest",type=pathlib.Path,required=True)
    parser.add_argument("--qprism",type=pathlib.Path,required=True)
    parser.add_argument("--out",type=pathlib.Path,required=True)
    args=parser.parse_args()
    seat1=args.seat1.resolve();nn=args.nnest.resolve();q=args.qprism.resolve()
    pin_checkout(seat1,SEAT1_COMMIT)
    pin_checkout(nn,NNEST_COMMIT)
    pin_checkout(q,QPRISM_COMMIT)
    bridge=load_bridge(seat1)
    upstream,verified=bridge.source_check(nn,q)
    expect(len(verified)==2,"Expected two independent checked-out source repositories")
    nn_results=bridge.native_nnest(nn)
    expect(nn_results["3"]["clean_apex"] and nn_results["7"]["tamper_gate"],
           "Native N-Nest original programs failed")
    qpin=copy.deepcopy(upstream["sources"][1])
    original_params=copy.deepcopy(TRUST_PARAMS)
    honest_report=bridge.leaf(q,original_params,qpin)
    honest=bridge.independent_watcher(q,original_params,qpin,honest_report)
    expect(honest["checks"] is True and honest["verdict"]=="PASS",
           "Original uncompromised live OS watcher must accept real proposal")
    expect(bridge.check_nested(honest,3)["apex_green"],"Clean depth3 apex should accept")
    expect(bridge.check_nested(honest,7)["apex_green"],"Clean depth7 apex should accept")
    expected={"trusted_pin":qpin,"trusted_report":honest_report}
    expect(trusted_anchor_accepts(bridge,expected,original_params,
                                  qpin,original_params,honest_report,honest),
           "External anchored honest source should accept")
    outcomes={"honest_source_and_real_watcher":"MEASURED_PASS"}
    # A genuine watcher must detect visible tampering before external compromise.
    corrupt=copy.deepcopy(honest_report)
    corrupt["selector"]="HG1024:QPRISM:FORGED-SELECTOR"
    corrupt["scores"]["snr"]+=3.0
    real_reject=bridge.independent_watcher(q,original_params,qpin,corrupt)
    expect(real_reject["checks"] is False and real_reject["verdict"]=="HELD",
           "Genuine independent source recomputation should reject bad selector/SNR")
    expect(not bridge.check_nested(real_reject,3)["apex_green"],
           "Genuine watcher HOLD must propagate to apex")
    outcomes["genuine_watcher_rejects_tampered_proposal"]="MEASURED_PASS"

    # This is the exact subprocess API used by bridge.independent_watcher.
    # Temporarily substitute a separate attacker-controlled OS process.
    original_process=bridge.process
    forged_script=pathlib.Path(__file__).resolve().with_name("forged_watcher.py")
    replaced={"actual_subprocess_spawned":False}
    def injected_process(argv,cwd=None,input=None):
        if len(argv)>=3 and str(argv[2])=="watch":
            replaced["actual_subprocess_spawned"]=True
            return original_process([sys.executable,str(forged_script)],
                                    cwd=cwd,input=input)
        return original_process(argv,cwd=cwd,input=input)
    bridge.process=injected_process
    try:
        fake=bridge.independent_watcher(q,original_params,qpin,corrupt)
    finally:
        bridge.process=original_process
    expect(replaced["actual_subprocess_spawned"],
           "Attack must actually route through a separate OS process")
    expect(fake["reported_sha256"]==sha(bridge.canonical(corrupt)),
           "Adversarial reply must satisfy the producer wrapper's hash check")
    expect(fake["recomputed_sha256"]==sha(bridge.canonical(corrupt)),
           "Compromised watcher response is intentionally SELF CONSISTENT")
    expect(fake["watcher_pid"]!=0 and fake["checks"] and fake["verdict"]=="PASS",
           "Compromised watcher response not delivered")
    green3=bridge.check_nested(fake,3)["apex_green"]
    green7=bridge.check_nested(fake,7)["apex_green"]
    expect(green3 and green7,
           "Unexpected: parent independently rejects compromised self-consistent watcher")
    expect(not trusted_anchor_accepts(bridge,expected,original_params,
                                      qpin,original_params,corrupt,fake),
           "Separate trusted source anchor did not reject the compromised watcher")
    outcomes["compromised_os_watcher_self_consistent_forgery_accepted_by_unanchored_parent"]="MEASURED_PASS"
    outcomes["independent_trusted_source_anchor_rejects_forged_watcher"]="MEASURED_PASS"

    # If the watcher accepts the source label as untrusted input, then a false
    # source commit can be used consistently by both reporter and watcher.
    spoof_pin=copy.deepcopy(qpin)
    spoof_pin["commit"]="0"*40
    spoof_pin["repo"]="untrusted/synthetic-source-substitution"
    spoof_report=bridge.leaf(q,original_params,spoof_pin)
    spoof_check=bridge.independent_watcher(q,original_params,spoof_pin,spoof_report)
    expect(spoof_check["checks"] and bridge.check_nested(spoof_check,7)["apex_green"],
           "Unanchored forged source label no longer accepted; record defense if so")
    expect(not trusted_anchor_accepts(bridge,expected,original_params,
                                      spoof_pin,original_params,spoof_report,spoof_check),
           "External source commit lock did not reject false label")
    outcomes["self_consistent_fake_source_label_passes_unanchored_watcher"]="MEASURED_PASS"
    outcomes["pinned_git_commit_anchor_rejects_fake_source_label"]="MEASURED_PASS"

    # An operator's approved task specification must not be replaced by another
    # internally consistent computation.
    other_params=copy.deepcopy(original_params)
    other_params["seed"]+=1
    other_params["coupling"]=0.0
    other_report=bridge.leaf(q,other_params,qpin)
    other_check=bridge.independent_watcher(q,other_params,qpin,other_report)
    expect(other_check["checks"] and bridge.check_nested(other_check,3)["apex_green"],
           "Unanchored alternate task unexpectedly held; revise predicted result")
    expect(not trusted_anchor_accepts(bridge,expected,original_params,
                                      qpin,other_params,other_report,other_check),
           "Frozen operator task specification did not reject alternate seed/coupling")
    outcomes["changed_seed_and_null_coupling_pass_unanchored_watcher"]="MEASURED_PASS"
    outcomes["operator_pinned_seed_and_coupling_hold_substitution"]="MEASURED_PASS"

    no_consent=bridge.check_nested(honest,7,forced_hold=True)
    expect(not no_consent["apex_green"],"Human consent gate did not block apex")
    expect(not trusted_anchor_accepts(bridge,expected,original_params,
                                      qpin,original_params,honest_report,honest,consent=False),
           "External human consent blocked incorrectly")
    outcomes["human_apex_no_consent_holds"]="MEASURED_PASS"

    # Directly validate this is a compromised SOFTWARE watcher example, not
    # an external signer/physical hardware breach.
    result={
        "schema":"ASOLARIA-SEAT4-NNEST-QPRISM-COMPROMISED-WATCHER-V1",
        "seat":"seat-4",
        "source_pr":32,"producer_commit":SEAT1_COMMIT,
        "producer_source_git_blob_sha1":SEAT1_BRIDGE_BLOB,
        "nnest_commit":NNEST_COMMIT,"qprism_commit":QPRISM_COMMIT,
        "actual_upstream_nnest_depth3_and_depth7":"PASS",
        "actual_pinned_qprism_proposal_computed":True,
        "genuine_watcher_external_process":True,
        "adversarial_watcher_external_process":True,
        "cases":outcomes,
        "case_count":len(outcomes),
        "source_compromise_scope":"caller-controlled source label and policy inputs",
        "unsafe_unanchored_acceptance_observed":True,
        "external_source_bound_authorization_holds_for_all_attacks":True,
        "physical_chassis_authentication_measured":False,
        "independent_physical_experiment":False,
        "physical_neural_or_quantum_signal_measured":False,
        "neural_training_performed":False,
        "claim":"Simulated Q-PRISM deterministic reporter/watcher trust-boundary test; no source signature or real hardware attack",
        "falsifier":"The original unmodified parent rejects a compromised watcher or forged source label, or the external pinned source/policy gate accepts either forged input.",
    }
    assert len(outcomes)==9
    output=json.dumps(result,indent=2,sort_keys=True)+"\n"
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(output,encoding="utf8",newline="\n")
    args.out.with_name(args.out.name+".sha256").write_text(
        sha(output.encode("utf8"))+"  "+args.out.name+"\n",encoding="ascii",newline="\n")
    print(json.dumps({"status":"PASS","cases":len(outcomes),
                      "software_only":True,"unanchored_gate_false_green_detected":True,
                      "external_pin_and_policy_hold":True,
                      "receipt_sha256":sha(output.encode("utf8"))},sort_keys=True))

if __name__=="__main__":main()
