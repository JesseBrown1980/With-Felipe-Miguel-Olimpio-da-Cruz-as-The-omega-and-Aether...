#!/usr/bin/env python3
"""Seat One — 72-case computational recurrence/source-trust trial.

Uses actual pinned Q-PRISM source and Seat 1 source-bound watcher bridge.
Uses an OFFLINE-signed PUBLIC TEST fixture, not real source custody or consent.
Historical N-Nest and Rainbow81 stones remain unchanged.
"""
from __future__ import annotations
import argparse,copy,hashlib,importlib.util,json,os,pathlib,sys,time
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

ROOT=pathlib.Path(__file__).resolve().parents[3]
HERE=pathlib.Path(__file__).resolve().parent
SCHEMA="ASOLARIA-SEAT1-RECURRENCE-FOUR-ARM-V1"
PUBLIC_KEY="caf1d530709535853dfd17cf24852ac74de4946ff0559d598a3bad6ac283659f"
SOURCE_DIGEST="fbd45109f1c5cbccf31591e79bc7e1c55d927b15d665e9bb40f86313eb5e0c8c"
SOURCE_SEAT1="cf356383d397e7dbe2dc66baaf4981937afc8f01"
NN_COMMIT="307903651f56e8a28ef98ca36aef22ee8cda935c"
Q_COMMIT="b4a21a25381d6920b7aab92c94c3c3e1420fc9e4"
DOMAIN=b"ASOLARIA|RIM-SEAT1|SIGNED-FIXTURE|V1\n"
ARMS=("A","B","C","D")
DEPTHS=(1,3,7)
SCENARIOS=("H","E","S","W","R","C")
PARAMS={"control_arm":"prism","seed":20261015,"coupling":0.9,
        "budget":8,"reference_samples":200,"influence":0.5,"synthetic_only":True}

def canon(v):
    return json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=True,allow_nan=False).encode("ascii")

def sha(blob):
    return hashlib.sha256(blob).hexdigest()

def load_bridge(seat1):
    path=seat1/"experiments/integration/seat1/upstream_bridge.py"
    spec=importlib.util.spec_from_file_location("source_pinned_seat1_bridge",path)
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def verify_fixture(what,params,nonce,used):
    f=what["envelope"]
    msg=DOMAIN+canon(f)
    try:
        assert what["public_key_hex"]==PUBLIC_KEY
        assert sha(msg)==what["signature_message_sha256"]
        Ed25519PublicKey.from_public_bytes(bytes.fromhex(PUBLIC_KEY)).verify(
            bytes.fromhex(what["signature_hex"]),msg)
        assert f["schema"]=="ASOLARIA-SEAT1-RIM-SIGNED-TEST-FIXTURE-V1"
        assert f["purpose"]=="synthetic-recurrence-ablation-not-real-authentication"
        assert f["consent"]=="SIMULATED_TEST_CONSENT_ONLY"
        assert f["qprism_commit"]==Q_COMMIT and f["nnest_commit"]==NN_COMMIT
        assert sha(canon(params))==SOURCE_DIGEST==f["source_sha256"]
        assert nonce==f["session_nonce"] and nonce not in used
        used.add(nonce)
        return True
    except (AssertionError,ValueError,KeyError,TypeError):
        return False
    except Exception as exc:
        # An invalid Ed25519 signature is an expected rejection, never PASS.
        if type(exc).__name__=="InvalidSignature":
            return False
        raise

def fixture_safety_controls(what):
    assert not verify_fixture(what,{**PARAMS,"seed":PARAMS["seed"]+1},
                              what["envelope"]["session_nonce"],set())
    assert not verify_fixture(what,PARAMS,"00000000000000000000000000000000",set())
    seen=set()
    assert verify_fixture(what,PARAMS,what["envelope"]["session_nonce"],seen)
    assert not verify_fixture(what,PARAMS,what["envelope"]["session_nonce"],seen)
    f=copy.deepcopy(what)
    f["envelope"]["schema"]="CORRUPTED"
    assert not verify_fixture(f,PARAMS,what["envelope"]["session_nonce"],set())
    g=copy.deepcopy(what)
    g["signature_hex"]="00"*64
    assert not verify_fixture(g,PARAMS,what["envelope"]["session_nonce"],set())
    return {"invalid_schema_rejected":True,"wrong_input_rejected":True,
            "wrong_nonce_rejected":True,"replay_in_same_session_rejected":True,
            "invalid_signature_rejected":True}

def inject_score_fault(report):
    altered=copy.deepcopy(report)
    altered["scores"]["snr"]=float(altered["scores"]["snr"])+1.0
    return altered

def full_case(bridge,q,pin,fixture,arm,depth,scenario,truth,substituted):
    label=f"ASOLARIA|RIM-FOUR-ARM|V1|seat-1|{depth}|{arm}|{scenario}"
    seed=sha(label.encode("ascii"))
    received_params=dict(PARAMS)
    if scenario=="S":received_params["seed"]+=1
    report=copy.deepcopy(substituted if scenario=="S" else truth)
    # W is a watcher compromise: for A/B no watcher exists. Preserve this
    # factorial cell without pretending that score corruption is a W attack.
    if scenario=="E" or (scenario=="W" and arm in ("C","D")):
        report=inject_score_fault(report)
    # Independent reference is NEVER taken from the mutable submitted record.
    trust_nonce=fixture["envelope"]["session_nonce"]
    requested_nonce=("00000000000000000000000000000000" if scenario=="R" else trust_nonce)
    session_seen=set()
    source_signed=verify_fixture(fixture,received_params,requested_nonce,session_seen)
    source_authenticated=(arm=="D" and source_signed)
    # This is a public TEST key, not physical source identity or human consent.
    # Recurrence does not mint its own human consent.
    human_consent=False
    watcher_recomputed=False
    math_consistent=None
    nested=None
    rounds=1
    if arm=="A":
        accepted=True
    elif arm=="B":
        rounds=3
        # Recompute with the same Q-PRISM model and the same received source.
        # Byte equality does not grant input provenance or new independence.
        model=bridge.leaf(q,received_params,pin)
        math_consistent=(report==model)
        accepted=math_consistent
    else:
        watcher_recomputed=True
        rounds=2
        if scenario=="W":
            # A watcher claiming PASS while returning a fabricated self-consistent
            # response is challenged by the parent's *own* recomputation.
            forged={
                "watcher_pid":os.getpid()+100001,
                "checks":True,"verdict":"PASS","failing_checks":[],
                "reported_sha256":sha(bridge.canonical(report)),
                "recomputed_sha256":sha(bridge.canonical(report)),
                "recomputed":copy.deepcopy(report)
            }
            witness=forged
        else:
            witness=bridge.independent_watcher(q,received_params,pin,report)
        verified=bridge.parent_recompute_watcher_gate(
            q,pin,received_params,report,witness)
        math_consistent=bool(verified["mathematical_consistency"])
        nested=bridge.check_nested(verified,depth)
        assert nested["apex_green"]==verified["checks"]
        accepted=bool(nested["apex_green"])
        if arm=="D" and not source_authenticated:
            accepted=False
    # Fabricated child-generated consent NEVER counts as human approval.
    attempted_autoconsent=(scenario=="C")
    synthetic_fixture_authorized=(
        arm=="D" and source_authenticated and accepted and not attempted_autoconsent)
    authorized=False
    assert authorized is False and human_consent is False
    return {
        "seat":"seat-1","depth":depth,"arm":arm,"scenario":scenario,
        "case_seed_sha256":seed,
        "actual_source_sha256":SOURCE_DIGEST,
        "received_input_sha256":sha(canon(received_params)),
        "received_proposal_sha256":sha(canon(report)),
        "math_consistent":math_consistent,
        "source_authenticated":source_authenticated,
        "watcher_recomputed":watcher_recomputed,
        "descendants_green":None if nested is None else bool(nested["apex_green"]),
        "human_consent":human_consent,
        "accepted_for_processing":bool(accepted),
        "release_authorized":authorized,
        "synthetic_fixture_authorized":bool(synthetic_fixture_authorized),
        "self_generated_authorization_attempt":attempted_autoconsent,
        "watcher_attack_exercised":(scenario=="W" and arm in ("C","D")),
        "fault_injection_stage":(
            "report_postcompute_snr" if scenario=="E"
            else ("watcher_response_compromised" if scenario=="W" and arm in ("C","D")
                  else ("not_applicable_no_watcher" if scenario=="W"
                        else ("initial_shared_input_substitution" if scenario=="S"
                              else ("source_nonce" if scenario=="R"
                                    else ("descendant_generated_consent" if scenario=="C" else "none")))))
        ),
        "same_source_replays":rounds,
        "untrusted_source_substitution_detected":(arm=="D" and scenario=="S" and not source_signed),
        "wrong_nonce_replay_rejected":(arm=="D" and scenario=="R" and not source_signed),
        "wasm_invoked":False,
        "source_independent_physical_host_attested":False
    }

def run(seat1,nn,q,out):
    # Verify immutable exact upstream source bytes before any testing.
    bridge=load_bridge(seat1)
    assert bridge.git(seat1,"rev-parse","HEAD")==SOURCE_SEAT1
    pin,verified=bridge.source_check(nn,q)
    assert pin["sources"][0]["commit"]==NN_COMMIT
    assert pin["sources"][1]["commit"]==Q_COMMIT
    assert sum(len(r["blobs"]) for r in verified.values())==9
    assert bridge.native_nnest(nn)["7"]["tamper_gate"]
    fixture=json.loads((HERE/"PUBLIC-SIGNED-TEST-FIXTURE.json").read_text())
    negative=fixture_safety_controls(fixture)
    qpin=pin["sources"][1]
    # Real pinned Q-PRISM generates both source records, not a surrogate mock.
    original=bridge.leaf(q,PARAMS,qpin)
    changed=dict(PARAMS);changed["seed"]+=1
    substituted=bridge.leaf(q,changed,qpin)
    assert original["input_sha256"]==SOURCE_DIGEST
    assert original["input_sha256"]!=substituted["input_sha256"]
    assert original["source_commit"]==Q_COMMIT
    tests=[]
    begin=time.perf_counter()
    for arm in ARMS:
        for depth in DEPTHS:
            for scenario in SCENARIOS:
                result=full_case(bridge,q,qpin,fixture,arm,depth,scenario,original,substituted)
                tests.append(result)
    elapsed_ms=int((time.perf_counter()-begin)*1000)
    assert len(tests)==72
    idx={(x["arm"],x["depth"],x["scenario"]):x for x in tests}
    for d in DEPTHS:
        for a in ARMS:
            h=idx[(a,d,"H")]
            assert h["accepted_for_processing"]
            assert not h["release_authorized"]
            assert not idx[(a,d,"C")]["release_authorized"]
            if a in ("A","B"):
                assert idx[(a,d,"W")]["watcher_attack_exercised"] is False
                assert idx[(a,d,"W")]["accepted_for_processing"] is True
            if a in ("C","D"):
                assert not idx[(a,d,"E")]["accepted_for_processing"]
                assert not idx[(a,d,"W")]["accepted_for_processing"]
                assert idx[(a,d,"S")]["math_consistent"] is True
            if a=="D":
                assert not idx[(a,d,"S")]["accepted_for_processing"]
                assert not idx[(a,d,"R")]["accepted_for_processing"]
                assert idx[(a,d,"H")]["source_authenticated"] is True
                assert idx[(a,d,"H")]["synthetic_fixture_authorized"] is True
                assert idx[(a,d,"C")]["synthetic_fixture_authorized"] is False
            else:
                assert not idx[(a,d,"S")]["source_authenticated"]
    # Unified fixture source pin is public and test-only, signed off-line. This
    # separate test envelope is *not* the old historical Seat2 private key.
    result={
        "schema":SCHEMA,"status":"PASS","seat":"seat-1",
        "case_count":72,"arms":list(ARMS),"depths":list(DEPTHS),
        "scenarios":list(SCENARIOS),
        "upstream_source_pins":pin["sources"],
        "verified_upstream_git_blobs":verified,
        "source_fixture_sha256":sha((HERE/"PUBLIC-SIGNED-TEST-FIXTURE.json").read_bytes()),
        "public_test_signing_key_only":True,
        "private_key_in_repository":False,
        "signed_test_fixture_verified":True,
        "negative_fixture_controls":negative,
        "ground_truth_reference_different_from_untrusted_report":True,
        "physical_host_verified":False,
        "actual_human_consent":False,
        "http_wasm_execution":"PLANNED_NOT_EXECUTED",
        "runtime_ms":elapsed_ms,
        "run_metadata":{"gha_run_id":os.environ.get("GITHUB_RUN_ID"),
                        "gha_commit":os.environ.get("GITHUB_SHA"),
                        "python":sys.version.split()[0],
                        "platform":sys.platform},
        "results":tests
    }
    out.mkdir(parents=True,exist_ok=True)
    body=canon({"schema":SCHEMA,"cases":tests,"source_fixture_sha256":result["source_fixture_sha256"]})
    trace=b"RIM|schema="+SCHEMA.encode()+b"|seat=seat-1|cases=72|physical=0\n"
    trace+=b"".join(b"CASE|"+canon(x)+b"\n" for x in tests)
    trace+=b"END|cases=72|human_authorized=0|independent_physical_hosts=0\n"
    result["trace_sha256"]=sha(trace)
    result["trace_bytes"]=len(trace)
    (out/"seat1-recurrence.hbp").write_bytes(trace)
    (out/"seat1-recurrence.json").write_bytes(canon(result)+b"\n")
    lines=["HBI|schema=ASOLARIA-SEAT1-RIM-SIGNED-FIXTURE-INDEX-V1|json=0"]
    for name in ("seat1-recurrence.hbp","seat1-recurrence.json"):
        b=(out/name).read_bytes()
        (out/(name+".sha256")).write_text(sha(b)+"  "+name+"\n")
        lines.append(f"ARTIFACT|name={name}|sha256={sha(b)}|json=0")
    lines.append("HBIEND|human_release=0|physical_hosts=0|json=0")
    idxfile=out/"seat1-recurrence.hbi"
    idxfile.write_text("\n".join(lines)+"\n")
    (out/"seat1-recurrence.hbi.sha256").write_text(sha(idxfile.read_bytes())+"  seat1-recurrence.hbi\n")
    print(json.dumps({"status":"PASS","cases":len(tests),"trace_sha256":sha(trace),
                      "duration_ms":elapsed_ms,
                      "signed_public_fixture_only":True,
                      "external_human_release_authorized":False,
                      "physical_hosts_attested":False},sort_keys=True))

def audit(out):
    mapping={}
    for ext in ("hbp","json","hbi"):
        file=out/("seat1-recurrence."+ext)
        data=file.read_bytes()
        side=(out/(file.name+".sha256")).read_text().split()
        assert side==[sha(data),file.name]
        mapping[ext]=data
    record=json.loads(mapping["json"])
    assert record["schema"]==SCHEMA and record["case_count"]==72
    assert sha(mapping["hbp"])==record["trace_sha256"]
    assert len(mapping["hbp"])==record["trace_bytes"]
    assert mapping["hbp"].count(b"CASE|")==72
    assert all(not r["release_authorized"] and not r["human_consent"] for r in record["results"])
    assert len({(r["arm"],r["depth"],r["scenario"]) for r in record["results"]})==72
    for ext in ("hbp","json"):
        assert "sha256="+sha(mapping[ext]) in mapping["hbi"].decode()
    assert record["negative_fixture_controls"]["replay_in_same_session_rejected"] is True
    print("SEAT1_RECURRENCE_72_RECEIPT_PASS cases=72 sidecars=3 source_auth_bound=PUBLIC_TEST_ONLY")

def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="mode",required=True)
    a=sub.add_parser("run")
    for param in ("seat1","nn","q","out"):
        a.add_argument("--"+param,required=True,type=pathlib.Path)
    b=sub.add_parser("audit")
    b.add_argument("--out",required=True,type=pathlib.Path)
    args=p.parse_args()
    if args.mode=="run":run(args.seat1,args.nn,args.q,args.out)
    else:audit(args.out)
if __name__=="__main__":main()
