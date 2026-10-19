#!/usr/bin/env python3
"""Independent-run fresh challenge / durable replay-ledger *synthetic software* test.
Does not create source signatures, authenticate physical hosts or grant operator scope.
"""
import hashlib,json,secrets,sys,tempfile
from pathlib import Path
from seat2_rim72_verify import fixture_gate
SCHEMA="ASOLARIA-SEAT2-SYNTHETIC-REPLAY-CONSUMPTION-V2"
def h(x):return hashlib.sha256(x).hexdigest()
def canon(o):return json.dumps(o,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode()
class Gate:
    def __init__(self,path,session,challenge,root):
        self.path=Path(path);self.session=session;self.challenge=challenge;self.root=root
    def receive(self,msg,halt=False):
        if halt:return "HOLD_HALT"
        if not isinstance(msg,dict) or set(msg)!={"session","challenge","sequence","source_sha256"}:return "HOLD_SCHEMA"
        if msg["session"]!=self.session or msg["challenge"]!=self.challenge:return "HOLD_OLD_OR_WRONG_CHALLENGE"
        if msg["source_sha256"]!=self.root:return "HOLD_SOURCE_ROOT"
        seq=msg["sequence"]
        if type(seq)!=int or seq<=0:return "HOLD_SEQUENCE"
        if self.path.exists():
            saved=json.loads(self.path.read_bytes())
            if saved["session"]!=self.session or saved["challenge_digest"]!=h(bytes.fromhex(self.challenge)):
                return "HOLD_SESSION_LEDGER"
            last=saved["last_sequence"]
        else:last=0
        if seq<=last:return "HOLD_REPLAY"
        record={"session":self.session,"challenge_digest":h(bytes.fromhex(self.challenge)),
                "last_sequence":seq,"source_root":self.root}
        # Bounded sequential single-writer test only: no concurrent locking assertion.
        tmp=self.path.with_suffix(".pending")
        tmp.write_bytes(canon(record)+b"\n")
        tmp.replace(self.path)
        return "PASS_TESTONLY"
def run(fixture_file,out):
    raw=Path(fixture_file).read_bytes()
    fixture=fixture_gate(raw) # independently anchored public test-only Ed25519 signed fixture
    root=fixture["body"]["source_sha256"]
    # Nonce chosen only after process starts; kept out of evidence receipt.
    challenge=secrets.token_bytes(32).hex()
    other=secrets.token_bytes(32).hex()
    assert challenge!=other
    out=Path(out)
    with tempfile.TemporaryDirectory() as scratch:
        ledger=Path(scratch)/"replay-state.json"
        a=Gate(ledger,"session-a",challenge,root)
        mk=lambda seq:{"session":"session-a","challenge":challenge,"sequence":seq,"source_sha256":root}
        tests={}
        assert a.receive(mk(1))=="PASS_TESTONLY"
        tests["first_challenged_request_accepted"]="PASS"
        assert a.receive(mk(1))=="HOLD_REPLAY"
        tests["same_exact_packet_second_use"]="HOLD"
        assert Gate(ledger,"session-a",challenge,root).receive(mk(1))=="HOLD_REPLAY"
        tests["same_packet_after_disk_reload"]="HOLD"
        assert a.receive(mk(2))=="PASS_TESTONLY"
        tests["next_autonomous_in_policy_tick"]="PASS"
        assert a.receive(mk(1))=="HOLD_REPLAY"
        tests["earlier_sequence_after_new_tick"]="HOLD"
        assert a.receive({**mk(3),"challenge":other})=="HOLD_OLD_OR_WRONG_CHALLENGE"
        tests["different_nonce"]="HOLD"
        assert a.receive({**mk(3),"source_sha256":"0"*64})=="HOLD_SOURCE_ROOT"
        tests["source_root_mutation"]="HOLD"
        assert a.receive({**mk(3),"session":"session-b"})=="HOLD_OLD_OR_WRONG_CHALLENGE"
        tests["wrong_session"]="HOLD"
        assert a.receive({**mk(3),"sequence":"3"})=="HOLD_SEQUENCE"
        tests["noninteger_sequence"]="HOLD"
        assert a.receive({**mk(3),"unexpected_field":"fake"})=="HOLD_SCHEMA"
        tests["forged_field"]="HOLD"
        assert a.receive(mk(3),halt=True)=="HOLD_HALT"
        tests["halt_preemption"]="HOLD"
        # New trial after session rotation, with NEW durable state and NEW nonce.
        otherledger=Path(scratch)/"session-b.json"
        b=Gate(otherledger,"session-b",other,root)
        n={"session":"session-b","challenge":other,"sequence":1,"source_sha256":root}
        assert b.receive(n)=="PASS_TESTONLY"
        assert b.receive(n)=="HOLD_REPLAY"
        assert b.receive(mk(2))=="HOLD_OLD_OR_WRONG_CHALLENGE"
        tests["fresh_session_first_request"]="PASS"
        tests["fresh_session_same_packet_replayed"]="HOLD"
        tests["old_session_packet_in_new_session"]="HOLD"
        assert len(tests)==14
    result={"schema":SCHEMA,"control_count":len(tests),"tests":tests,
       "source_fixture_sha256":h(raw),"trust_scope":"pinned Ed25519 PUBLIC SYNTHETIC fixture only",
       "fresh_unpredictable_local_challenge_used":True,
       "one_time_replay_state_persisted_across_reload":True,
       "authenticated_physical_origin":False,"real_operator_signature":False,
       "multiwriter_atomicity_proven":False,"release_authorized":False,
       "original_72_case_trace_unchanged":True}
    data=canon(result)+b"\n"
    out.write_bytes(data)
    out.with_name(out.name+".sha256").write_bytes((h(data)+"  "+out.name+"\n").encode("ascii"))
    print("PASS_SYNTHETIC_REPLAY_LEDGER",len(tests),h(data))
if __name__=="__main__":
    if len(sys.argv)!=3:raise SystemExit("usage: python session_replay_gate.py original-signed-fixture.json new-result.json")
    run(sys.argv[1],sys.argv[2])
