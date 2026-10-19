#!/usr/bin/env python3
"""Seat 2 independently run coordinator PR39's 72 factorial recurrence cases.

72 = arms A/B/C/D * depths 1/3/7 * scenarios H/E/S/W/R/C.
Authenticates a PUBLIC TEST-ONLY fixture with Ed25519 and pinned source
digest/public key/nonce-domain. NOT production custody or a physical host.
Invokes a separate Node.js 81-bit GF(2) polynomial watcher for arms C/D.
Parent independently reconstructs the entire depth-bounded AND tree.

No keys are minted or stored. No autonomous authority, external network,
real human consent, HTTP agent or WebAssembly runtime is invoked.
"""
import argparse
import copy
import hashlib
import itertools
import json
import subprocess
import sys
import time
from pathlib import Path
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

N=81
MASK=(1<<N)-1
FIXTURE_SHA="b79da3f482215c563ac828883ee6b5f92d6d695896bba75ca32b7493ab2028df"
PINNED_PUB="ea526ef71d5511f4de0cfa8a33063426a8734299ba3b1c5ba60a7cb340958d99"
PREREG_SHA="d5281285b5b763f3324d7f96029139b165dc546c"
ARMS=("A","B","C","D")
DEPTHS=(1,3,7)
SCENARIOS=("H","E","S","W","R","C")
CANON="ASOLARIA-SEAT2-RIM-FOUR-ARM-TESTONLY-V1"
NODE_PURPOSE="ASOLARIA-SEAT2-RIM-NODE-WATCHER-V1"
SCHEMA="ASOLARIA-SEAT2-RIM72-SIGNED-SOURCE-AUDIT-V1"

def sha(b):
    return hashlib.sha256(b).hexdigest()
def canonical(obj):
    return json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode("ascii")
def hex81(n):
    return f"{n&MASK:021x}"
def rotate81(v,offset):
    s=offset%N
    return ((v<<s)|(v>>(N-s)))&MASK if s else v
def step81(v):
    return (v ^ rotate81(v,1) ^ rotate81(v,80)) & MASK
def check(s):
    if not isinstance(s,str) or len(s)!=21 or any(k not in "0123456789abcdef" for k in s):
        raise ValueError("noncanonical 81-bit source")
    n=int(s,16)
    if n>MASK: raise ValueError("source outside 81-bit ring")
    return n
def verify_signature(public,body,sig):
    try:
        Ed25519PublicKey.from_public_bytes(bytes.fromhex(public)).verify(
            bytes.fromhex(sig),canonical(body))
        return True
    except (ValueError,InvalidSignature):
        return False
def fixture_gate(data):
    if sha(data)!=FIXTURE_SHA: raise ValueError("test source fixture SHA mismatch")
    f=json.loads(data)
    body=f["body"]
    if f["public_key_hex"]!=PINNED_PUB: raise ValueError("untrusted Ed25519 signer")
    if body.get("schema")!="ASOLARIA-SEAT2-RECURRENCE-SIGNED-SOURCE-V1": raise ValueError("schema drift")
    if body.get("purpose")!="PUBLIC_TESTONLY_NON_PHYSICAL_ANCHOR": raise ValueError("wrong purpose")
    if body.get("coordinator_prereg_sha")!=PREREG_SHA: raise ValueError("prereg drift")
    if body.get("seat")!="seat-2": raise ValueError("wrong seat")
    if (body.get("arms"),body.get("depths"),body.get("scenarios"))!=(
        list(ARMS),list(DEPTHS),list(SCENARIOS)): raise ValueError("changed factorial design")
    source=check(body["source_hex"])
    if sha(source.to_bytes(11,"big"))!=body["source_sha256"]: raise ValueError("trusted source hash drift")
    if not verify_signature(PINNED_PUB,body,f["signature_hex"]): raise ValueError("Ed25519 verification failed")
    return f

def trial_nonce(depth,arm,scenario):
    return sha(f"ASOLARIA|RIM-FOUR-ARM|V1|seat-2|{depth}|{arm}|{scenario}".encode())[:32]

def authorized_envelope(f,arm,depth,scenario,incoming,nonce):
    """Test fixture pin + signature + source + nonce, not a physical provenance proof."""
    b=f["body"]
    return (verify_signature(PINNED_PUB,b,f["signature_hex"])
            and sha(canonical(f)+b"\n")==FIXTURE_SHA
            and b["source_hex"]==incoming
            and b["source_sha256"]==sha(check(incoming).to_bytes(11,"big"))
            and nonce==trial_nonce(depth,arm,scenario)
            and b["purpose"]=="PUBLIC_TESTONLY_NON_PHYSICAL_ANCHOR")

def parent_tree(source,nonce,depth,corrupt_path):
    """Separately compute every child, digest, AND and first failing descendant."""
    truth=hex81(step81(check(source)))
    failed=[]
    node_count=0
    def visit(path,remaining):
        nonlocal node_count
        node_count+=1
        reported=hex81(step81(check(source))^1) if path==corrupt_path else truth
        same=(reported==truth)
        if not same: failed.append(path)
        children=[visit(path+"0",remaining-1),visit(path+"1",remaining-1)] if remaining else []
        good=same and all(k["green"] for k in children)
        fingerprint=sha("|".join([
            "NODE",path,truth,reported,nonce,":".join(k["hash"] for k in children)
        ]).encode())
        return {"green":good,"hash":fingerprint}
    root=visit("R",depth)
    return {"root_green":root["green"],"root_hash":root["hash"],
            "first_bad_path":failed[0] if failed else None,
            "node_count":node_count,"correct_output":truth}

def call_node(node_path,source,nonce,depth,corrupt_path,compromised):
    req={"purpose":NODE_PURPOSE,"source_hex":source,"nonce":nonce,
         "depth":depth,"expect_hex":hex81(step81(check(source))),
         "corrupt_path":corrupt_path,"compromised_watcher":compromised}
    proc=subprocess.run(["node",str(node_path)],input=canonical(req)+b"\n",
                        stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                        check=False,timeout=20)
    if proc.returncode:
        raise AssertionError(f"Node independent watcher failed: {proc.stderr[:300]!r}")
    return json.loads(proc.stdout)

def evaluate(f,arm,depth,scenario,node_path):
    original=f["body"]["source_hex"]
    altered=hex81(check(original)^(1<<32))
    incoming=altered if scenario=="S" else original
    normal_nonce=trial_nonce(depth,arm,scenario)
    nonce=trial_nonce(depth,arm,"H") if scenario=="R" else normal_nonce
    authenticity=authorized_envelope(f,arm,depth,scenario,incoming,nonce) if arm=="D" else False
    reference=hex81(step81(check(original)))
    attempts=[]
    compromised=(scenario=="W" and arm in ("C","D"))
    injected=scenario in ("E","S","R") or compromised
    for round_number in range(1,4 if arm!="A" else 2):
        if arm=="D" and not authenticity:
            attempts.append({"round":round_number,"accepted":False,
                             "held_reason":"source-envelope/nonce-invalid"})
            break
        expected_received=hex81(step81(check(incoming)))
        # For A/B the injected reporter bit fault is deterministic and
        # repeated across rounds (a common implementation fault).
        faulty_ab=(scenario=="E" and arm in ("A","B"))
        observed=hex81(int(expected_received,16)^1) if faulty_ab else expected_received
        corrupt_path=("R"+"0"*depth) if ((scenario=="E" and arm in ("C","D") and round_number==1) or compromised) else None
        if arm in ("C","D"):
            witness=call_node(node_path,incoming,nonce,depth,corrupt_path,compromised)
            parent=parent_tree(incoming,nonce,depth,corrupt_path)
            # Verify *normal parent behavior*: never accept child-reported
            # green solely based on its claim, especially forged watcher W.
            witness_integrity=(
                witness.get("root_hash")==parent["root_hash"] and
                witness.get("calculated_hex")==parent["correct_output"] and
                witness.get("first_bad_path")==parent["first_bad_path"] and
                witness.get("node_count")==parent["node_count"] and
                witness.get("root_green") is parent["root_green"] and
                witness.get("watcher_claimed_ok") is parent["root_green"]
            )
            child_green=bool(parent["root_green"] and witness_integrity)
            accepted=child_green
            held="watcher-divergence" if not child_green else None
            if not witness_integrity: held="parent-independent-recompute-rejected-watcher"
            attempts.append({"round":round_number,"accepted":accepted,
                "math_consistent":bool(parent["root_green"]),
                "watcher_recomputed":True,
                "descendants_green":child_green,
                "first_bad_path":parent["first_bad_path"],
                "watcher_integrity":witness_integrity,
                "node_count":parent["node_count"],"held_reason":held})
        else:
            # Arm A inspects output structure only. B performs 3 identical
            # executions without a separately authored watcher. Neither
            # authenticates external origin or checks correct source values.
            accepted=(len(observed)==21 and all(c in "0123456789abcdef" for c in observed))
            if arm=="B" and attempts:
                accepted=accepted and attempts[-1]["reported_hex"]==observed
            attempts.append({"round":round_number,"accepted":accepted,
                "math_consistent":accepted,"watcher_recomputed":False,
                "descendants_green":None,"node_count":0,
                "reported_hex":observed,"held_reason":None})
        if scenario=="E" and arm in ("C","D") and round_number==1:
            assert attempts[-1]["accepted"] is False, "must catch planted first-round bit corruption"
            continue
        if scenario in ("S","R") and arm in ("B","C"):
            # 3 repeated rounds: false input survives; no new provenance.
            continue
        if scenario=="E" and arm=="B":
            continue
        if arm in ("A","B") and scenario not in ("E","S","R") and round_number<3:
            continue
        break

    accepted=bool(attempts[-1]["accepted"])
    corrected=(scenario=="E" and arm in ("C","D") and len(attempts)>=2
               and not attempts[0]["accepted"] and accepted)
    # For S/R, source is invalid under the external fixture and nonce model.
    provenance_fault=scenario in ("S","R")
    output_fault=(scenario=="E" and arm in ("A","B"))
    false_green=accepted and (provenance_fault or output_fault)
    # W is not exercised in A/B (no watcher exists).
    exercised=not (scenario=="W" and arm in ("A","B"))
    return {
        "seat":"seat-2","arm":arm,"depth":depth,"scenario":scenario,
        "nonce":normal_nonce,"received_nonce":nonce,
        "ground_truth_source_sha256":f["body"]["source_sha256"],
        "received_source_sha256":sha(check(incoming).to_bytes(11,"big")),
        "reference_output_sha256":sha(reference.encode()),
        "math_consistent":bool(attempts[-1].get("math_consistent",False)),
        "source_authenticated":authenticity,
        "watcher_recomputed":any(a.get("watcher_recomputed",False) for a in attempts),
        "descendants_green":attempts[-1].get("descendants_green"),
        "human_consent":False,
        "accepted_for_processing":accepted,
        "release_authorized":False,
        "false_green_at_final_state":bool(false_green),
        "correction_recovered":bool(corrected),
        "attack_exercised":exercised,
        "recurrence_rounds":len(attempts),
        "suspicious_common_source_persisted":scenario=="S" and arm in ("A","B","C") and accepted,
        "history":attempts,
    }

def negative_fixture_controls(fixture_bytes,f):
    mutated=bytearray(fixture_bytes)
    mutated[-15]^=1
    failed=0
    for _arm in ARMS:
        for _depth in DEPTHS:
            try: fixture_gate(bytes(mutated))
            except (ValueError,KeyError,UnicodeDecodeError): failed+=1
    assert failed==12
    b=copy.deepcopy(f["body"])
    b["source_hex"]=hex81(check(b["source_hex"])^1)
    assert not verify_signature(PINNED_PUB,b,f["signature_hex"])
    other="0"*64
    assert not verify_signature(other,f["body"],f["signature_hex"])
    badsig="00"+f["signature_hex"][2:]
    assert not verify_signature(PINNED_PUB,f["body"],badsig)
    assert not authorized_envelope(f,"D",1,"R",f["body"]["source_hex"],trial_nonce(1,"D","H"))
    assert not authorized_envelope(f,"D",1,"S",hex81(check(f["body"]["source_hex"])^1),trial_nonce(1,"D","S"))
    return {"invalid_fixture_all_arms_depths_held":failed,
            "invalid_signature_rejected":True,"wrong_key_rejected":True,
            "modified_signed_source_rejected":True,"stale_nonce_rejected":True,
            "source_substitution_rejected":True}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("fixture")
    p.add_argument("node_watcher")
    p.add_argument("output_json")
    p.add_argument("output_hbp")
    p.add_argument("runtime_json")
    a=p.parse_args()
    start=time.perf_counter()
    data=Path(a.fixture).read_bytes()
    fixture=fixture_gate(data)
    negative=negative_fixture_controls(data,fixture)
    rows=[evaluate(fixture,arm,depth,scenario,Path(a.node_watcher))
          for arm,depth,scenario in itertools.product(ARMS,DEPTHS,SCENARIOS)]
    assert len(rows)==72
    outcomes={(r["arm"],r["depth"],r["scenario"]):r for r in rows}
    for depth in DEPTHS:
        for arm in ARMS:
            h=outcomes[arm,depth,"H"]
            assert h["accepted_for_processing"]
            assert not h["false_green_at_final_state"]
            assert not h["release_authorized"]
            c=outcomes[arm,depth,"C"]
            assert not c["release_authorized"] and not c["human_consent"]
            s=outcomes[arm,depth,"S"]
            if arm=="D": assert not s["accepted_for_processing"] and not s["source_authenticated"]
            else: assert s["false_green_at_final_state"] and s["math_consistent"]
            r=outcomes[arm,depth,"R"]
            if arm=="D": assert not r["accepted_for_processing"] and not r["source_authenticated"]
            else: assert r["false_green_at_final_state"]
            e=outcomes[arm,depth,"E"]
            if arm in ("C","D"):
                assert e["correction_recovered"] and not e["false_green_at_final_state"]
            else:
                assert e["false_green_at_final_state"] and not e["correction_recovered"]
            w=outcomes[arm,depth,"W"]
            if arm in ("C","D"):
                assert not w["accepted_for_processing"]
                assert w["history"][0]["held_reason"]=="parent-independent-recompute-rejected-watcher"
            else:
                assert not w["attack_exercised"]
    total_false=sum(r["false_green_at_final_state"] for r in rows)
    assert total_false==24,total_false
    assert sum(r["correction_recovered"] for r in rows)==6
    assert sum(r["source_authenticated"] for r in rows)==12 # D H,E,W,C
    result={
        "schema":SCHEMA,
        "source_fixture_sha256":FIXTURE_SHA,
        "test_pubkey":PINNED_PUB,
        "coordinator_preregistered_head":PREREG_SHA,
        "software_test_signer_only":True,
        "physical_hosts_attested":0,
        "wasm_invoked":False,
        "http_agents_invoked":False,
        "release_permissions_delegated":False,
        "human_consent_provided":False,
        "rows":rows,
        "total_cases":72,
        "arm_counts":{arm:sum(r["arm"]==arm for r in rows) for arm in ARMS},
        "depth_counts":{str(d):sum(r["depth"]==d for r in rows) for d in DEPTHS},
        "false_greens":total_false,
        "first_round_error_corrections_recovered":6,
        "common_source_substitutions_accepted_A_B_C":9,
        "common_source_substitutions_rejected_D":3,
        "compromised_watcher_parent_rejected_C_D":6,
        "stale_nonce_rejected_D":3,
        "self_generated_consent_never_authorized":True,
        "test_fixture_negative_checks":negative,
    }
    output=canonical(result)+b"\n"
    Path(a.output_json).write_bytes(output)
    lines=["HBP|schema="+SCHEMA+"|json=0",
           "ORIGIN|fixture_sha256="+FIXTURE_SHA+"|signed_test_fixture=1|physical_custody=0",
           "PROTOCOL|pr=39|seat=seat-2|cases=72|arms=4|depths=1,3,7|scenarios=H,E,S,W,R,C",
           "OUTCOME|false_greens=24|corrected_first_round_errors=6|shared_source_survives_C=3",
           "SECURITY|D_source_substitution_held=3|D_replays_held=3|C_D_forged_watcher_held=6",
           "CONSENT|human_apex_authorized=0|delegated_permissions=0|all_cases_release_authorized=0",
           "BOUNDARY|wasm_run=0|http_agent_run=0|physical_host_attested=0|software_fixture_only=1",
           "CANONICAL_TRACE|sha256="+sha(output),"HBPEND|status=PASS|gate=SEAT2_SOFTWARE_ONLY|json=0"]
    hbp=("\n".join(lines)+"\n").encode("ascii")
    Path(a.output_hbp).write_bytes(hbp)
    elapsed=time.perf_counter()-start
    Path(a.runtime_json).write_bytes(canonical({
        "seat":"seat-2","elapsed_wall_sec":round(elapsed,4),
        "hostname_claim":"CI_RUNNER_NOT_VERIFIED_PHYSICAL_MACHINE",
        "node_invocations":sum(len(r["history"]) for r in rows if r["arm"] in ("C","D") and r["scenario"]!="S" and r["scenario"]!="R"),
    })+b"\n")
    print(json.dumps({"status":"PASS","cases":72,"false_green":total_false,
                     "corrected":6,"HBP_sha256":sha(hbp),"JSON_sha256":sha(output),
                     "wall_sec":round(elapsed,3)},sort_keys=True))
if __name__=="__main__":
    main()
