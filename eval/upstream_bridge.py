#!/usr/bin/env python3
"""Seat1 upstream N-Nest × Q-PRISM software watcher bridge (public, synthetic).
ACTUALLY invokes pinned upstream source. Does NOT claim physical authenticated hosts.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import subprocess
import sys

HERE=Path(__file__).resolve().parent
LOCK=HERE/"UPSTREAM-LOCK.json"
SCHEMA="ASOLARIA-SEAT1-QPRISM-NNEST-BRIDGE-V1"

def canonical(doc):
    return json.dumps(doc,sort_keys=True,separators=(",",":"),ensure_ascii=True,allow_nan=False).encode("ascii")

def sha(data):
    return hashlib.sha256(data).hexdigest()

def process(args,cwd=None,input=None):
    r=subprocess.run(args,cwd=cwd,input=input,capture_output=True,check=False,text=True,encoding="utf-8")
    if r.returncode:
        raise RuntimeError("Upstream command failed "+repr(args)+": "+r.stderr[-1300:])
    return r.stdout

def git(repo,*args):
    return process(["git","-C",str(repo),*args]).strip()

def source_check(nn,q):
    pins=json.loads(LOCK.read_text("utf-8"))
    assert pins["schema"]=="ASOLARIA-SEAT1-NNEST-QPRISM-SOURCE-PINS-V1"
    tested={}
    for source,base in zip(pins["sources"],(nn,q)):
        rev=git(base,"rev-parse","HEAD")
        assert rev==source["commit"],"Upstream source revision drift: "+str(base)
        blobs={}
        for name,expected in source["files"].items():
            actual=git(base,"hash-object","--",name)
            assert actual==expected,(name,actual,expected)
            blobs[name]=actual
        tested[source["repo"]]={"commit":rev,"blobs":blobs}
    return pins,tested

def native_nnest(nn):
    evidence={}
    for depth,script,base in (
        (3,"nest-depth3-verify.cjs","nest-depth3-verify-2026-06-03.hbp"),
        (7,"nest-depthN-prime-verify.cjs","nest-depthN-prime-verify-2026-06-03.hbp"),
    ):
        stdout=process(["node",script],cwd=nn)
        hbp=nn/"data"/"behcs"/base
        contents=hbp.read_bytes()
        side=hbp.with_name(hbp.name+".sha256")
        parts=side.read_text("ascii").split()
        assert parts==[sha(contents),base],"Upstream N-Nest sidecar failure"
        assert stdout.startswith("NEST-DEPTH"),"Unexpected native transcript header"
        transcript=contents.decode("utf-8")
        if depth==3:
            assert "RUN-CLEAN|apex_addr=R|apex_gate_ok=true" in transcript
            assert "RUN-TAMPERED|injected_confabulation_at=R.1.2.0(depth-3)|apex_gate_ok=false" in transcript
            assert "|GATE-CAUGHT=true" in transcript
        else:
            assert "RUN-CLEAN|apex_subtree_ok=true" in transcript
            for level in range(1,8):
                line=next((line for line in transcript.splitlines()
                           if line.startswith("LEVEL-"+str(level)+"|")),None)
                assert (line is not None and "|CAUGHT=true" in line and
                        ("@depth"+str(level)) in line), "Native depth-7 watcher did not catch planted fault"
            assert "EVERY-LEVEL-CATCHES-CONFABULATION=true" in transcript
        evidence[str(depth)]={"upstream_script":script,"native_hbp_sha256":sha(contents),
                              "native_hbp_bytes":len(contents),
                              "native_simulated_pid_labels_not_os_pids":True,
                              "clean_apex":True,"tamper_gate":True}
    return evidence

def q_modules(q):
    if str(q) not in sys.path:
        sys.path.insert(0,str(q))
    from qprism.harness import compare,reference_optimum
    from qprism.sources import (RandomSource,OptimizerSource,PrismSource,NeuralStream,denormalize)
    from qprism.physics import Apparatus,observe
    from qprism.behcs import schedule_id
    return compare,reference_optimum,RandomSource,OptimizerSource,PrismSource,NeuralStream,denormalize,Apparatus,observe,schedule_id

def proposal(q,arm,seed,coupling,budget,samples):
    (compare,reference_optimum,RandomSource,OptimizerSource,PrismSource,
     NeuralStream,denormalize,Apparatus,observe,schedule_id)=q_modules(q)
    ap=Apparatus()
    target,_=reference_optimum(ap,n=samples,seed=7)
    if arm=="random":
        source=RandomSource(seed)
    elif arm=="optimizer":
        source=OptimizerSource(seed)
    elif arm=="prism":
        source=PrismSource(seed,NeuralStream(seed,coupling=coupling,toward=target),influence=0.5)
    else:
        raise ValueError("unknown source arm")
    observations=[]
    for _ in range(budget):
        x=source.ask()
        schedule=denormalize(x,ap)
        snr=observe(schedule,ap)["snr"]
        source.tell(x,snr)
        data={k:float(getattr(schedule,k)) for k in
              ("P2_mW","v_center","v_half","mass_center","mass_half")}
        observations.append({"selector":schedule_id(data),"schedule":data,"snr":float(snr)})
    winner=max(observations,key=lambda x:x["snr"])
    return {"arm":arm,"best":winner,"samples":budget,
            "source_sequence_sha256":sha(canonical(observations))}

def leaf(q,params,pin):
    result=proposal(q,params["control_arm"],params["seed"],params["coupling"],
                    params["budget"],params["reference_samples"])
    return {
        "source_repo":pin["repo"],"source_commit":pin["commit"],
        "input_sha256":sha(canonical(params)),
        "selector":result["best"]["selector"],
        "control_arm":result["arm"],"seed":params["seed"],
        "scores":{"snr":result["best"]["snr"],"proposal_count":result["samples"]},
        "schedule":result["best"]["schedule"],
        "proposal_sequence_sha256":result["source_sequence_sha256"],
    }

def check_leaf(reported,params,pin,q):
    failures=[]
    def require(cond,what):
        if not cond: failures.append(what)
    expected=leaf(q,params,pin)
    for key in ("source_repo","source_commit","input_sha256","selector","control_arm",
                "seed","proposal_sequence_sha256"):
        require(reported.get(key)==expected[key],key)
    actual=reported.get("scores",{})
    require(isinstance(actual,dict) and actual.get("proposal_count")==expected["scores"]["proposal_count"],
            "proposal_count")
    require(isinstance(actual,dict) and isinstance(actual.get("snr"),(int,float)) and
            math.isfinite(float(actual.get("snr"))) and
            math.isclose(float(actual.get("snr")),expected["scores"]["snr"],rel_tol=1e-11,abs_tol=1e-12),
            "reported_snr")
    require(reported.get("schedule")==expected["schedule"],"schedule")
    return {"watcher_pid":os.getpid(),"reported_sha256":sha(canonical(reported)),
            "recomputed_sha256":sha(canonical(expected)),
            "recomputed":expected,"checks":len(failures)==0,
            "failing_checks":failures,"verdict":"PASS" if not failures else "HELD"}

def independent_watcher(q,params,pin,reported):
    args=[sys.executable,str(Path(__file__).resolve()),"watch","--q",str(q)]
    payload={"params":params,"pin":pin,"reported":reported}
    response=process(args,input=json.dumps(payload,sort_keys=True))
    result=json.loads(response)
    assert isinstance(result["watcher_pid"],int)
    assert result["reported_sha256"]==sha(canonical(reported))
    return result

def parent_recompute_watcher_gate(q,pin,params,reported,witness):
    """Fail closed at the *parent*, not only within the watcher subprocess.

    The parent separately computes the expected Q-PRISM trace from pinned code
    and fixed input. This protects against a forged PASS/digest from the child,
    but a shared attacker-controlled input is NOT authenticated by this check.
    """
    truth=check_leaf(reported,params,pin,q)
    recomputed=truth["recomputed"]
    faults=[]
    def require(condition,label):
        if not condition: faults.append(label)
    require(isinstance(witness.get("watcher_pid"),int) and
            witness["watcher_pid"]!=os.getpid(),"watcher_process_identity")
    require(witness.get("reported_sha256")==sha(canonical(reported)),"watcher_report_digest")
    require(witness.get("recomputed_sha256")==sha(canonical(recomputed)),"watcher_recomputed_digest")
    require(witness.get("recomputed")==recomputed,"watcher_recomputation_content")
    require(witness.get("checks") is truth["checks"],"watcher_claimed_status")
    require(witness.get("verdict")==truth["verdict"],"watcher_claimed_verdict")
    require(witness.get("failing_checks")==truth["failing_checks"],"watcher_failure_list")
    faults.extend(truth["failing_checks"])
    green=not faults
    return {
        "watcher_pid":witness.get("watcher_pid"),
        "reported_sha256":sha(canonical(reported)),
        "recomputed_sha256":sha(canonical(recomputed)),
        "recomputed":recomputed,
        "failing_checks":faults,
        "checks":green,
        "verdict":"PASS" if green else "HELD",
        "mathematical_consistency":truth["checks"],
        "watcher_digest_integrity_passed":not any(x.startswith("watcher_") for x in faults),
        "source_authenticated":False,
        "physical_host_attested":False
    }

def check_nested(watcher,depth,forced_hold=False):
    # Adapter, not native N-Nest leaf-injection API. Each parent rechecks the child's gate.
    path="R"+".0"*(depth-1)+".1"
    good=watcher["checks"] and watcher["verdict"]=="PASS" and not forced_hold
    leaf={"path":path,"own_gate":good,"children":[],"green":good}
    current=leaf
    parents=[]
    for level in range(depth-1,-1,-1):
        ancestor="R"+".0"*level
        siblings=[{"path":ancestor+".s"+str(i),"own_gate":True,"green":True,"children":[]}
                  for i in range(2)]
        allkids=[current,*siblings]
        own=True
        green=own and all(k["green"] for k in allkids)
        parents.append({"path":ancestor,"own_gate":own,"all_children_green":all(k["green"] for k in allkids),
                        "green":green})
        current={"path":ancestor,"own_gate":own,"children":allkids,"green":green}
    failing=[] if current["green"] else [path]
    return {"depth":depth,"leaf_path":path,"apex_green":current["green"],
            "failed_paths":failing,"parents":parents}

def checks(q,pin,params):
    pristine=leaf(q,params,pin)
    honest_witness=independent_watcher(q,params,pin,pristine)
    honest=parent_recompute_watcher_gate(q,pin,params,pristine,honest_witness)
    assert honest["checks"] and honest["verdict"]=="PASS"
    assert honest["mathematical_consistency"] is True
    assert honest["source_authenticated"] is False
    assert honest["watcher_pid"]!=os.getpid(),"Watcher must be another OS process"
    stats={"valid":0,"held":0,"cases":{}}
    def record(name,r,expect_green):
        witness=independent_watcher(q,params,pin,r)
        observed=parent_recompute_watcher_gate(q,pin,params,r,witness)
        tree3=check_nested(observed,3)
        tree7=check_nested(observed,7)
        assert tree3["apex_green"]==tree7["apex_green"]==expect_green,name
        if expect_green:stats["valid"]+=1
        else:stats["held"]+=1
        stats["cases"][name]={"verdict":observed["verdict"],
                              "failure_checks":observed["failing_checks"],
                              "apex_depth3":tree3["apex_green"],
                              "apex_depth7":tree7["apex_green"],
                              "held_at":tree7["failed_paths"]}
    record("honest",pristine,True)
    def bad(name,field,value):
        r=json.loads(json.dumps(pristine))
        r[field]=value
        record(name,r,False)
    r=json.loads(json.dumps(pristine));r["scores"]["snr"]+=0.12
    record("forged_score",r,False)
    bad("wrong_selector","selector","HG1024:QPRISM:INVALID-SELECTOR")
    bad("wrong_source_sha","source_commit","0"*40)
    bad("wrong_input_sha","input_sha256","0"*64)
    bad("wrong_control_arm","control_arm","optimizer")
    r=json.loads(json.dumps(pristine));r["schedule"]["P2_mW"]+=0.01
    record("tampered_schedule",r,False)
    # Consent is an independent policy gate, not a property of source scoring.
    missing_consent=check_nested(honest,7,forced_hold=True)
    assert not missing_consent["apex_green"] and missing_consent["failed_paths"]
    stats["held"]+=1
    stats["cases"]["missing_consent"]={"verdict":"HELD","apex_depth7":False,
                                       "held_at":missing_consent["failed_paths"]}
    # Compromised watcher: forge the recomputation digest while claiming PASS.
    # This attack MUST traverse the same normal parent->nested gate as clean data.
    forged=json.loads(json.dumps(honest_witness))
    forged["recomputed_sha256"]="0"*64
    caught=parent_recompute_watcher_gate(q,pin,params,pristine,forged)
    parent3=check_nested(caught,3)
    parent7=check_nested(caught,7)
    assert "watcher_recomputed_digest" in caught["failing_checks"]
    assert caught["verdict"]=="HELD" and not parent3["apex_green"] and not parent7["apex_green"]
    stats["held"]+=1
    stats["cases"]["compromised_watcher_inconsistent_digest"]={
        "verdict":caught["verdict"],
        "failure_checks":caught["failing_checks"],
        "apex_depth3":parent3["apex_green"],
        "apex_depth7":parent7["apex_green"],
        "held_at":parent7["failed_paths"]}
    assert stats["valid"]==1 and stats["held"]==8
    # M1 falsifier: a self-consistent attacker-chosen substitute input still
    # makes mathematically green watcher and parent results. No origin trust.
    adversarial_params=dict(params)
    adversarial_params["seed"]=params["seed"]+1
    substitute=leaf(q,adversarial_params,pin)
    assert substitute["input_sha256"]!=pristine["input_sha256"]
    substitute_witness=independent_watcher(q,adversarial_params,pin,substitute)
    substitute_parent=parent_recompute_watcher_gate(
        q,pin,adversarial_params,substitute,substitute_witness)
    tree3=check_nested(substitute_parent,3)
    tree7=check_nested(substitute_parent,7)
    assert substitute_parent["mathematical_consistency"] is True
    assert tree3["apex_green"] and tree7["apex_green"]
    assert substitute_parent["source_authenticated"] is False
    stats["untrusted_source_false_green"]=1
    stats["cases"]["self_consistent_untrusted_input"]={
        "verdict":"SOFTWARE_PASS_ONLY",
        "apex_depth3":tree3["apex_green"],
        "apex_depth7":tree7["apex_green"],
        "input_digest_changed":True,
        "mathematical_consistency":True,
        "source_authenticated":False,
        "release_authorized":False
    }
    return pristine,honest,stats,check_nested(honest,3),check_nested(honest,7)

def experimental_controls(q):
    (compare,_,*rest)=q_modules(q)
    from qprism.physics import Apparatus
    output={}
    for coupling in (0.0,0.9):
        res=compare(Apparatus(),coupling=coupling,budget=60,repeats=25,base_seed=2000,influence=0.5)
        assert all(res["arms"][name]["n"]==25 for name in ("random","optimizer","prism"))
        stats=res["prism_vs_optimizer"]
        assert math.isfinite(stats["p_value"]) and 0<=stats["p_value"]<=1
        if coupling==0.0:
            assert "no significant" in stats["verdict"],"Zero-coupling bias gate failed"
        else:
            assert res["arms"]["prism"]["mean"]>=res["arms"]["optimizer"]["mean"],"Injected-signal power gate failed"
        output[str(coupling)]=res
    return output

def native_pytest(q):
    out=process([sys.executable,"-m","pytest","tests/test_harness_null.py","-q"],cwd=q)
    assert "passed" in out.lower(),out[-700:]
    return {"status":"PASS","tail":out[-450:]}

def seal(out,payload):
    out.mkdir(parents=True,exist_ok=True)
    raw=canonical(payload)+b"\n"
    name="seat1-source-bridge"
    j=out/(name+".json");j.write_bytes(raw)
    hbp=(
        "HBP|schema="+SCHEMA+"|class=synthetic_computational_only|json=0\n"+
        "SOURCE|nnest_commit="+payload["sources"][0]["commit"]+"|qprism_commit="+payload["sources"][1]["commit"]+"|json=0\n"+
        "CONTROL|zero_coupling_verdict="+payload["statistics"]["0.0"]["prism_vs_optimizer"]["verdict"].replace(" ","_")+
        "|injected_oracle_coupling=0.9|json=0\n"+
        "BRIDGE|leaf_input_sha256="+payload["input_sha256"]+"|selector_sha256="+sha(payload["selector"].encode("utf-8"))+"|json=0\n"+
        "GATES|honest=1|held=8|depth3=PASS|depth7=PASS|mathematical_consistency=1|source_authenticated=0|release_authorized=0|physical=0|json=0\n"+
        "M1|self_consistent_untrusted_source=GREEN_SOFTWARE_ONLY|false_green_for_origin_authentication=1|source_authenticated=0|release_authorized=0|json=0\n"+
        "RESULT|verdict=PASS|upstream_native_depth3=PASS|upstream_native_depth7=PASS|json=0\n"+
        "HBPEND|schema="+SCHEMA+"|json=0\n"
    ).encode()
    h=out/(name+".hbp");h.write_bytes(hbp)
    entries=[]
    for file in (j,h):
        dg=sha(file.read_bytes())
        file.with_name(file.name+".sha256").write_text(dg+"  "+file.name+"\n","ascii")
        entries.append((file.name,dg))
    hbi=out/(name+".hbi")
    hbi.write_text("HBI|schema=ASOLARIA-SEAT1-UPSTREAM-BRIDGE-INDEX-V1|json=0\n"+
                   "".join("ARTIFACT|name="+n+"|sha256="+d+"|json=0\n" for n,d in entries)+
                   "HBIEND|schema=ASOLARIA-SEAT1-UPSTREAM-BRIDGE-INDEX-V1|json=0\n","ascii")
    hbi.with_name(hbi.name+".sha256").write_text(sha(hbi.read_bytes())+"  "+hbi.name+"\n","ascii")

def run(nn,q,out):
    pins,tested=source_check(nn,q)
    native=native_nnest(nn)
    upstream_tests=native_pytest(q)
    statistics=experimental_controls(q)
    qpin=pins["sources"][1]
    params={"control_arm":"prism","seed":20261015,"coupling":0.9,
            "budget":8,"reference_samples":200,"influence":0.5,"synthetic_only":True}
    reported,watcher,negative,depth3,depth7=checks(q,qpin,params)
    payload={
        "version":SCHEMA,"source_repo":qpin["repo"],
        "source_commit":qpin["commit"],
        "input_sha256":sha(canonical(params)),
        "selector":reported["selector"],
        "control_arm":params["control_arm"],"seed":params["seed"],
        "scores":reported["scores"],
        "watcher_pid":watcher["watcher_pid"],
        "reported":reported,"recomputed":watcher["recomputed"],
        "parents":{"depth3":depth3["parents"],"depth7":depth7["parents"]},
        "verdict":"PASS" if all((depth3["apex_green"],depth7["apex_green"])) else "HELD",
        "verification_layers":{
            "mathematical_consistency":watcher["mathematical_consistency"],
            "watcher_digest_integrity_passed":watcher["watcher_digest_integrity_passed"],
            "software_parent_gates_green":all((depth3["apex_green"],depth7["apex_green"])),
            "source_authenticated":False,
            "source_identity_independently_attested":False,
            "physical_host_attested":False,
            "release_authorized":False
        },
        "sources":pins["sources"],"verified_upstream_blobs":tested,
        "upstream_nnest_native":native,"qprism_upstream_pytest":upstream_tests,
        "statistics":statistics,"negative_controls":negative,
        "runtime":{"python":sys.version.split()[0],"platform":platform.platform(),
                   "run_id":os.environ.get("GITHUB_RUN_ID"),"run_attempt":os.environ.get("GITHUB_RUN_ATTEMPT"),
                   "github_source_commit":os.environ.get("GITHUB_SHA")},
        "evidence_class":"actual upstream software files executed; constructed adapter, not physical neural/quantum/hardware",
        "unsupported_claims":["not independently authenticated hardware","not actual neural signals",
                              "not upstream native external-leaf plug-in","not independent peer implementation",
                              "not physical matter-wave or gravity measurements"]
    }
    assert payload["verdict"]=="PASS"
    seal(out,payload)
    print(json.dumps({"status":"PASS","source_blobs_verified":sum(len(x["blobs"]) for x in tested.values()),
         "upstream_native_nnest_depths":[3,7],"qprism_arms":["random","optimizer","prism"],
         "qprism_null_verdict":statistics["0.0"]["prism_vs_optimizer"]["verdict"],
         "qprism_oracle_verdict":statistics["0.9"]["prism_vs_optimizer"]["verdict"],
         "held_negative_controls":negative["held"],"actual_watcher_process":True,
         "physical_host_verified":False,"out_dir":str(out)},sort_keys=True))

def audit(out):
    name="seat1-source-bridge"
    pairs={}
    for ext in (".json",".hbp",".hbi"):
        f=out/(name+ext)
        raw=f.read_bytes()
        expected=(out/(f.name+".sha256")).read_text("ascii").split()
        assert expected==[sha(raw),f.name],"bad checksum "+f.name
        pairs[ext]=raw
    receipt=json.loads(pairs[".json"])
    assert receipt["version"]==SCHEMA and receipt["verdict"]=="PASS"
    assert receipt["negative_controls"]["held"]==8
    assert receipt["negative_controls"]["valid"]==1
    assert receipt["negative_controls"]["untrusted_source_false_green"]==1
    m1=receipt["negative_controls"]["cases"]["self_consistent_untrusted_input"]
    assert m1["mathematical_consistency"] is True and m1["apex_depth7"] is True
    assert m1["source_authenticated"] is False and m1["release_authorized"] is False
    layers=receipt["verification_layers"]
    assert layers["mathematical_consistency"] is True
    assert layers["watcher_digest_integrity_passed"] is True
    assert layers["software_parent_gates_green"] is True
    assert layers["source_authenticated"] is False
    assert layers["source_identity_independently_attested"] is False
    assert layers["physical_host_attested"] is False
    assert layers["release_authorized"] is False
    assert receipt["negative_controls"]["cases"]["compromised_watcher_inconsistent_digest"]["apex_depth7"] is False
    assert receipt["watcher_pid"]!=0 and receipt["reported"]==receipt["recomputed"]
    assert "physical" in pairs[".hbp"].decode()
    assert "self_consistent_untrusted_source=GREEN_SOFTWARE_ONLY" in pairs[".hbp"].decode()
    index=pairs[".hbi"].decode()
    for ext in (".json",".hbp"):
        assert "sha256="+sha(pairs[ext]) in index
    print("SEAT1_UPSTREAM_BRIDGE_AUDIT_PASS receipts=3 held=8")

def main():
    ap=argparse.ArgumentParser()
    mode=ap.add_subparsers(dest="mode",required=True)
    w=mode.add_parser("watch");w.add_argument("--q",required=True,type=Path)
    r=mode.add_parser("run");r.add_argument("--nn",required=True,type=Path)
    r.add_argument("--q",required=True,type=Path);r.add_argument("--out",required=True,type=Path)
    a=mode.add_parser("audit");a.add_argument("--out",required=True,type=Path)
    args=ap.parse_args()
    if args.mode=="watch":
        payload=json.loads(sys.stdin.read())
        print(json.dumps(check_leaf(payload["reported"],payload["params"],payload["pin"],args.q),sort_keys=True))
    elif args.mode=="run":
        run(args.nn,args.q,args.out)
    else:
        audit(args.out)

if __name__=="__main__":
    main()
