#!/usr/bin/env python3
"""CI-only three-seat software integration test; ONE host, not physical evidence."""
import json
import hashlib
import pathlib
import shutil
import subprocess
import tempfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
def run(*args):
    cp=subprocess.run(list(map(str,args)),cwd=HERE.parent,stdout=subprocess.PIPE,
                      stderr=subprocess.PIPE,text=True)
    if cp.returncode!=0:
        raise RuntimeError(f"command failed ({args[0:2]}): {cp.stderr[-2000:]}")
    return cp.stdout.strip()
def main():
    with tempfile.TemporaryDirectory(prefix="asolaria-SOFTWARE-ONLY-") as tmp:
        root=Path(tmp)
        for n in range(1,4):
            seat=f"seat-{n}"
            dr=root/"private"/seat
            print(run("node",HERE/"seat_receipts.js","init",seat,dr,
                      "CI software fixture only, NOT physically distinct hardware"))
            print(run("node",HERE/"seat_receipts.js","commit",dr))
        challenge=root/"challenge.json"
        p=[]
        for n in range(1,4):
            private=root/"private"/f"seat-{n}"
            p.extend([private/"checkin.json",private/"commit.json"])
        print(run("node",HERE/"create_challenge.js",*p,challenge))
        original=root/"result.hbp"
        print(run("python",HERE/"evolve_gf2_python.py",challenge,original,"--self-test"))
        alternate=root/"node.hbp"
        print(run("node",HERE/"evolve_gf2_node.js",challenge,alternate,"--self-test"))
        assert original.read_bytes()==alternate.read_bytes()
        receipts=root/"receipts"
        # All three result commits must be generated BEFORE any reveal.
        for n in range(1,4):
            dr=root/"private"/f"seat-{n}"
            print(run("node",HERE/"seat_receipts.js","seal",dr,challenge,original,
                      "simulated_CI_Python_Node_crosscheck"))
        for n in range(1,4):
            seat=f"seat-{n}"
            dr=root/"private"/seat
            print(run("node",HERE/"seat_receipts.js","reveal",dr))
            dest=receipts/seat
            dest.mkdir(parents=True)
            for name in ("checkin.json","commit.json","result-commit.json","reveal.json"):
                shutil.copyfile(dr/name,dest/name)
            shutil.copyfile(original,dest/"result.hbp")
        report=json.loads(run("node",HERE/"referee.js",challenge,receipts))
        assert report["verdict"]=="THREE_SIGNED_SOFTWARE_RECEIPTS_MATCH"
        assert report["level"]=="physical_device_separation_unverified"
        assert report["total_records"]==4860
        assert len({seat["public_key_fingerprint"] for seat in report["seats"]})==3
        # Adversarial negative controls: corrupt reveal, corrupt HBP.
        target=receipts/"seat-1"/"reveal.json"
        valid=target.read_bytes()
        doc=json.loads(valid)
        doc["salt_hex"]="00"*32
        target.write_text(json.dumps(doc),encoding="utf-8")
        try:
            run("node",HERE/"referee.js",challenge,receipts)
        except RuntimeError:
            pass
        else:
            raise AssertionError("Tampered reveal signature was accepted")
        target.write_bytes(valid)
        target=receipts/"seat-2"/"result.hbp"
        valid=target.read_bytes()
        target.write_bytes(valid[:-2]+b"ZZ")
        try:
            run("node",HERE/"referee.js",challenge,receipts)
        except RuntimeError:
            pass
        else:
            raise AssertionError("Tampered result was accepted")
        report["synthetic_CI_only"]=True
        report["signature_tamper_negative_test"]="PASS"
        report["output_tamper_negative_test"]="PASS"
        report["private_keys_published"]=False
        result=json.dumps(report,sort_keys=True,indent=2)+"\n"
        (HERE.parent/"three-seat-ci-only-result.json").write_text(result,encoding="utf-8")
        print("THREE_SEAT_SIMULATED_PROTOCOL_PASS "+
              hashlib.sha256(result.encode()).hexdigest())
if __name__=="__main__":main()
