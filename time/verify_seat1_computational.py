#!/usr/bin/env python3
"""Independently audit Seat-1 COMPUTATIONAL candidate receipts and GF2 output.
NOT a physical-host check-in, source of a new coordinator challenge or FTL test.
"""
import argparse, base64, hashlib, json
from pathlib import Path
from cryptography.hazmat.primitives.serialization import load_der_public_key
from cryptography.exceptions import InvalidSignature

CHECKIN=Path("tracking/checkins/seat-1/20261014T163705Z")
STONES=Path("stones/2026-10-14-rainbow81")
BASENAME="seat-1-20261014-computational-readiness"
EXPECTED_ROOT="031367b1da1a368dc7471141a9799b79c694a0c9900f65a047438ccaa5f76600"
EXPECTED_PUB="f81b4c680516582cf4cf55f319fbb9649020ac0c9a0b49a9315e3b512e7b69a5"
EXPECTED_COMMIT="e09978e417e609785cedb2939e479a1e843dc7afb8a3c0a62a93104195f60738"
EXPECTED_INPUT="7bc8a77f825c904962e90874e14093e635fafd7eaa70f52fce6188ba40cb8197"
SOURCE_SHA="2dadc995f460da957879bca7fd558cb037428ece"
LAWS=[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]

def sha(data):return hashlib.sha256(data).hexdigest()
def sidecar_verify(folder,name):
    blob=(folder/name).read_bytes()
    record=(folder/(name+".sha256")).read_text(encoding="ascii").strip().split()
    assert record==[sha(blob),name],name
    return json.loads(blob) if name.endswith(".json") else blob
def canonical(doc):
    return json.dumps(doc,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()
def verify_signed(doc,pub):
    obj=doc.copy()
    sig=base64.b64decode(obj.pop("signature_b64"),validate=True)
    pub.verify(sig,canonical(obj))
    return sha(canonical(obj))
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--python-hbp",type=Path)
    parser.add_argument("--node-hbp",type=Path)
    parser.add_argument("--challenge",type=Path)
    args=parser.parse_args()
    checkin=sidecar_verify(CHECKIN,"checkin.json")
    commit=sidecar_verify(CHECKIN,"commit.json")
    ready=sidecar_verify(STONES,BASENAME+".json")
    hbp=sidecar_verify(STONES,BASENAME+".hbp")
    hbi=sidecar_verify(STONES,BASENAME+".hbi")
    assert EXPECTED_ROOT.encode("ascii") not in hbi, "HBI indexes receipt hashes, not the large binary output"
    assert b"physical_host_verified=0" in hbi
    assert b"fresh_three_host_challenge=NOT_ISSUED" in hbi
    pub_der=base64.b64decode(checkin["public_spki_der_b64"],validate=True)
    assert sha(pub_der)==EXPECTED_PUB
    assert checkin["public_key_fingerprint_sha256"]==EXPECTED_PUB
    assert commit["public_key_fingerprint_sha256"]==EXPECTED_PUB
    assert ready["cryptographic_identity_fingerprint_sha256"]==EXPECTED_PUB
    pub=load_der_public_key(pub_der)
    for doc in (checkin,commit,ready):
        assert verify_signed(doc,pub)
        assert doc["seat"]=="seat-1"
    assert commit["secret_commitment_sha256"]==EXPECTED_COMMIT
    assert ready["private_commitment_sha256"]==EXPECTED_COMMIT
    assert checkin["source_commit_sha"]==SOURCE_SHA
    assert ready["source_reference_commit"]==SOURCE_SHA
    assert checkin["laws"]==LAWS and ready["laws"]==LAWS
    assert ready["challenge_kind"]=="PUBLIC_SYNTHETIC_PREFLIGHT_ONLY"
    assert ready["challenge_sha256"]==EXPECTED_INPUT
    assert checkin["physical_host_independently_verified"] is False
    assert ready["physical_host_independence_verified"] is False
    assert commit["three_physical_host_protocol_eligible"] is False
    assert ready["frozen_common_three_host_challenge"]=="NOT_ISSUED"
    assert ready["python_vs_node_agreement"]==4860
    assert ready["small_steps_python"]==ready["small_steps_node"]==120
    assert ready["output_sha256"]==EXPECTED_ROOT
    assert EXPECTED_ROOT.encode("ascii") in hbp
    # Invalid signature must be rejected.
    bad=commit.copy(); bad["source_commit_sha"]="0"*40
    try:verify_signed(bad,pub)
    except InvalidSignature:pass
    else:raise AssertionError("tampered signed record passed")
    if args.challenge:
        assert sha(args.challenge.read_bytes())==EXPECTED_INPUT,"wrong challenge fixture"
    if args.python_hbp and args.node_hbp:
        a=args.python_hbp.read_bytes();b=args.node_hbp.read_bytes()
        assert a==b and sha(a)==EXPECTED_ROOT
        assert a.count(b"\nWAVE|")==4860
        # One edited byte must fail hash validation.
        assert sha(a[:-1]+b"X")!=EXPECTED_ROOT
    print(json.dumps({"status":"PASS","seat":"seat-1",
      "signature_checks":3,"sidecars_verified":5,
      "tampered_signature_rejected":True,
      "python_node_exact_agreement":ready["python_vs_node_agreement"],
      "result_sha256":EXPECTED_ROOT,
      "physical_host_verified":False,
      "fresh_common_physical_challenge_issued":False},sort_keys=True))
if __name__=="__main__":main()
