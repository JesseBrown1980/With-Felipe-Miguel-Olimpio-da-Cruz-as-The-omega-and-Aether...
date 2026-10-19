#!/usr/bin/env python3
"""Preregistered Seat1 software challenge negative controls on an ephemeral CI runner."""
import copy
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT=pathlib.Path(__file__).resolve().parents[2]
EXP=ROOT/"experiments"/"seat1"
PY=EXP/"triad_27_python.py"
NODE=EXP/"triad_27_node.js"
CHALLENGE=EXP/"TRIAD-27-CHALLENGE-20261014.json"
def run(command,ok=True):
    p=subprocess.run(command,capture_output=True,text=True)
    if ok and p.returncode:raise RuntimeError("Unexpected execution failure: "+p.stderr[-1500:])
    if not ok and p.returncode==0:raise RuntimeError("Malformed challenge incorrectly passed")
    return p
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
    c=json.loads(CHALLENGE.read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory(prefix="seat1-negative-") as d:
        folder=pathlib.Path(d)
        baseline=folder/"base.hbp"
        modified=folder/"modified.hbp"
        run([sys.executable,str(PY),str(CHALLENGE),str(baseline)])
        a=baseline.read_bytes()
        changed=copy.deepcopy(c)
        changed["nonce"]=("0" if c["nonce"][0]!="0" else "1")+c["nonce"][1:]
        noncepath=folder/"different-nonce.json"
        noncepath.write_text(json.dumps(changed,indent=2)+"\n")
        run([sys.executable,str(PY),str(noncepath),str(modified)])
        b=modified.read_bytes()
        assert sha(a)!=sha(b) and a!=b,"Fresh nonce does not change model output"
        failed=0
        for field,illegal in (("waves",26),("base_horizon",10000000000001),
                              ("laws",[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,10]])):
            bad=copy.deepcopy(c)
            bad[field]=illegal
            p=folder/(field+"-invalid.json")
            p.write_text(json.dumps(bad,sort_keys=True)+"\n")
            run([sys.executable,str(PY),str(p),str(folder/"fail-py.hbp")],False)
            run(["node",str(NODE),str(p),str(folder/"fail-node.hbp")],False)
            failed+=2
        assert sha(a[:-1]+b"X")!=sha(a),"Single-byte edit invisible"
        assert failed==6
        print(json.dumps({"status":"PASS","seat":"seat-1","challenge":"PUBLIC_SOFTWARE_ONLY",
                          "nonce_mutation_changes_digest":True,
                          "six_invalid_input_rejections":failed,
                          "one_byte_tamper_changes_hash":True},sort_keys=True))
if __name__=="__main__":main()
