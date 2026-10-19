#!/usr/bin/env python3
"""Cross-language peer gate for 3,888 bounded recurrence and screen-frame trials.

The expected false-green counts are deliberately preregistered fixture counts,
not measured population failure probabilities or physical-world guarantees.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/"experiments"/"seat4"
EXPECTED_FALSE={"A":648,"B":216,"C":243,"D":0}
EXPECTED_HELD={"A":0,"B":0,"C":108,"D":216}
ROWS_PER_ARM=972
FROZEN_TRACE_SHA="c0b44be3857af23cef02e9274e335868d2efbfe2f73d59a290ddc24a1bd8ca14"
FROZEN_STONE_SHA="b73b09e3e89d4af4d815d5e8f2456daec4103b206cbe0190d2ac5274590ae3a8"
SEALED=ROOT/"stones"/"2026-10-15-rainbow81"/"seat4-recurrence-is-mind-3888.json"

def sha(data):
    return hashlib.sha256(data).hexdigest()

def execute(cmd):
    c=subprocess.run(cmd,cwd=ROOT,check=True,capture_output=True,text=True,timeout=180)
    return json.loads(c.stdout.strip())

def main():
    with tempfile.TemporaryDirectory(prefix="seat4-recurrence-") as temp:
        tmp=Path(temp)
        tr_py=tmp/"python.trace"
        tr_js=tmp/"node.trace"
        rec_py=tmp/"python.json"
        rec_js=tmp/"node.json"
        p=execute([sys.executable,str(DIR/"recurrence_trial.py"),
                   "--trace",str(tr_py),"--receipt",str(rec_py)])
        j=execute(["node",str(DIR/"recurrence_trial_node.js"),
                   "--trace",str(tr_js),"--receipt",str(rec_js)])
        assert p["status"]==j["status"]=="PASS"
        assert p["cases"]==j["cases"]==3888
        assert p["false_green"]==j["false_green"]==EXPECTED_FALSE
        assert p["held"]==j["held"]==EXPECTED_HELD
        assert tr_py.read_bytes()==tr_js.read_bytes(),"Independent Python/Node row traces differ"
        raw=tr_py.read_bytes()
        assert raw.count(b"\n")==3888
        assert p["trace_sha256"]==j["trace_sha256"]==sha(raw)==FROZEN_TRACE_SHA
        # Both receipts must have identical semantic fields. Exact byte
        # comparisons remain for binary ASCII traces and their digest.
        left=json.loads(rec_py.read_bytes())
        right=json.loads(rec_js.read_bytes())
        assert left==right,"Cross-language semantics of receipt differ"
        assert rec_py.read_bytes()==rec_js.read_bytes(),"Canonical pretty JSON bytes differ"
        assert p["receipt_sha256"]==j["receipt_sha256"]==sha(rec_py.read_bytes())==FROZEN_STONE_SHA
        assert rec_py.read_bytes()==SEALED.read_bytes(),"Receipt diverges from original CI-sealed JSON stone"
        assert SEALED.with_name(SEALED.name+".sha256").read_text("ascii").split()==[
            FROZEN_STONE_SHA,SEALED.name]
        for f in (rec_py,rec_js):
            side=f.with_name(f.name+".sha256").read_text("ascii").split()
            assert side==[sha(f.read_bytes()),f.name]
        assert left["total_cases"]==3888 and left["waves"]==27
        assert left["watcher_counts"]==[1,2,4,8]
        assert len(left["fault_modes"])==9
        assert left["physical_hosts_attested"]==0
        assert left["physical_screen_or_camera_measured"] is False
        assert left["consciousness_or_human_like_mind_established"] is False
        assert all(left["tallies"][arm]["cases"]==ROWS_PER_ARM for arm in EXPECTED_FALSE)
        assert {a:left["tallies"][a]["false_green"] for a in EXPECTED_FALSE}==EXPECTED_FALSE
        assert {a:left["tallies"][a]["holds"] for a in EXPECTED_HELD}==EXPECTED_HELD

        seen=set()
        for line in raw.decode("ascii").splitlines():
            col=line.split("|")
            assert len(col)==14
            wave,fault,arm,n=col[:4]
            key=(int(wave),fault,arm,int(n))
            assert key not in seen
            seen.add(key)
            accepted,correct,false_green,held=map(int,col[4:8])
            assert accepted+held==1
            assert false_green<=accepted
            assert len(col[11])==len(col[12])==21
            assert len(col[13])==64
            # A naive one-pass source substitution remains undetected.
            if fault=="COMMON_SOURCE" and arm in ("A","B","C"):
                assert (accepted,correct,false_green)==(1,0,1)
            if fault=="COMMON_SOURCE" and arm=="D":
                assert (accepted,correct,false_green)==(1,1,0)
            if fault=="CONSENT_MISSING" and arm in ("C","D"):
                assert (accepted,false_green,held)==(0,0,1)
            if fault=="ONE_WATCHER_FORGED" and arm=="C":
                assert false_green==(int(n)==1)
            if fault=="ALL_WATCHERS_FORGED" and arm=="C":
                assert false_green==1
            if fault=="ANCHOR_DELAYED" and arm=="D":
                assert (accepted,int(col[9]))==(1,2)
            if fault=="ANCHOR_MISSING" and arm=="D":
                assert held==1
        assert len(seen)==3888
        corrupted=bytearray(raw)
        corrupted[len(corrupted)//2]^=1
        assert sha(corrupted)!=sha(raw),"Mutation negative control did not change SHA"
        # Store one canonical positive receipt and full trace as workflow
        # outputs; do not claim remote publication from local CI generation.
        if len(sys.argv)==3:
            Path(sys.argv[1]).write_bytes(rec_py.read_bytes())
            Path(sys.argv[2]).write_bytes(raw)
        print(json.dumps({
            "status":"PASS","seat":"seat-4","cases":3888,
            "python_node_exact_rows":3888,
            "false_green":EXPECTED_FALSE,"held":EXPECTED_HELD,
            "trace_sha256":sha(raw),"trace_bytes":len(raw),
            "receipt_sha256":sha(rec_py.read_bytes()),
            "malformed_or_mismatched_rows":0,
            "byte_flip_changes_digest":True,
            "digital_9x9_ppm_only":True,
            "physical_sensor_attested":False
        },sort_keys=True))

if __name__=="__main__":
    main()
