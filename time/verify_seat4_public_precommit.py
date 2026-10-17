#!/usr/bin/env python3
"""Independent verification of Seat 4's signed *computational* precommit.

Reads exact public blob contents at pinned Git commit. Does not know / use
the private key or blinded salt; does not certify a separate physical host.
Install: python -m pip install cryptography
Run in a checkout that contains the pinned seat-4 commit (fetch-depth: 0).
"""
import base64
import hashlib
import json
import subprocess
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.serialization import load_der_public_key

REPOSITORY="JesseBrown1980/asolaria-stone-to-moss"
COMMIT="59d1e99ba7cec64c2a21c041895e81d5a20cedb3"
DIRECTORY="tracking/checkins/seat-4/20261014T161213Z"
EXPECTED_FINGERPRINT="0c2ccbcfe284e1c76a1b7b6f3063c7145bc295678f1b8d8c55d12e330d79cdd6"
EXPECTED_SALT_COMMITMENT="db400edf79185e5c57e3332533ea0440d82449256018693f4e4580059a7b7fc4"
EXPECTED_TAPS=[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]
EXPECTED_PROTOCOL_SOURCE="50d96e363943273a44b3a195eff9e9b2591f4765"

def git_read(filename):
    return subprocess.check_output(["git","show",f"{COMMIT}:{DIRECTORY}/{filename}"])

def canonical(payload):
    return json.dumps(payload,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode("utf-8")

def verify_signed(document, public):
    original = dict(document)
    signature=base64.b64decode(original.pop("signature_b64"),validate=True)
    public.verify(signature,canonical(original))
    return hashlib.sha256(canonical(original)).hexdigest()

def main():
    checkin=json.loads(git_read("checkin.json"))
    commit=json.loads(git_read("commit.json"))
    assert checkin["schema"]=="ASOLARIA-4-COMPUTATIONAL-SEAT-ATTEST-V1"
    assert checkin["seat"]=="seat-4" and commit["seat"]=="seat-4"
    assert commit["schema"]==checkin["schema"]
    pub_der=base64.b64decode(checkin["public_spki_der_b64"],validate=True)
    fingerprint=hashlib.sha256(pub_der).hexdigest()
    assert fingerprint==EXPECTED_FINGERPRINT
    assert checkin["public_fingerprint_sha256"]==fingerprint
    assert commit["public_fingerprint_sha256"]==fingerprint
    pub=load_der_public_key(pub_der)
    signed_checkin_sha=verify_signed(checkin,pub)
    signed_commit_sha=verify_signed(commit,pub)
    assert commit["salt_commitment_sha256"]==EXPECTED_SALT_COMMITMENT
    assert commit["stage"]=="PRE_CHALLENGE_COMMITMENT"
    assert commit["intended_law_taps"]==EXPECTED_TAPS
    assert commit["model_steps"]==10_000_000_000_000
    assert commit["source_commit_sha"]==EXPECTED_PROTOCOL_SOURCE
    assert checkin["physical_host_independently_verified"] is False
    assert "ephemeral_container" in checkin["host_class"]
    # Mutating an already signed field must invalidate Ed25519 verification.
    tampered=dict(commit);tampered["model_steps"]=10_000_000_000_001
    try:
        verify_signed(tampered,pub)
        raise AssertionError("Tampered commitment was accepted")
    except InvalidSignature:
        pass
    receipt={
        "schema":"ASOLARIA-SEAT4-INDEPENDENT-PRECOMMIT-AUDIT-V1",
        "status":"PASS",
        "attesting_seat":"seat-4",
        "evidence_class":"GitHub-public commit plus independent Ed25519 cryptographic verification",
        "pinned_commit":COMMIT,
        "path_prefix":DIRECTORY,
        "public_key_fingerprint_sha256":fingerprint,
        "signed_checkin_payload_sha256":signed_checkin_sha,
        "signed_commit_payload_sha256":signed_commit_sha,
        "salt_commitment_sha256":EXPECTED_SALT_COMMITMENT,
        "signature_checkin_valid":True,
        "signature_commit_valid":True,
        "negative_tamper_test_rejected":True,
        "separate_fourth_computational_witness":True,
        "physical_independence_verified":False,
        "three_physical_host_precommits_collected":False,
        "coordinator_challenge_issued":False,
        "private_salt_revealed":False,
        "quantum_or_gravity_physical_measurement":False,
        "note":"Seat 4 addendum is not a replacement for any of the required three physical host commitments."
    }
    print(json.dumps(receipt,sort_keys=True,indent=2))
if __name__=="__main__":
    main()
