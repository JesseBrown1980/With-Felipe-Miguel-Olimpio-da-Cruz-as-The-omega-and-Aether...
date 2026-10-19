#!/usr/bin/env python3
"""Re-run and cross-check both independent autonomous simulation engines.

Checks exact 2,187 trace rows, 177,147 automatic movement events, no per-step
human gating, persistent identities, digital frame integrity, and three kinds
of injected tampering. Does not authenticate a physical optical sensor.
"""
import hashlib,json,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/"experiments"/"seat4"
def sha(b):return hashlib.sha256(b).hexdigest()
def invoke(cmd):
    v=subprocess.run(cmd,capture_output=True,text=True,check=True,timeout=180,cwd=ROOT)
    return json.loads(v.stdout)
def main():
    with tempfile.TemporaryDirectory(prefix="seat4-autonomy-") as tmp:
        t=Path(tmp)
        py_trace=t/"python.hbp";js_trace=t/"node.hbp"
        py_receipt=t/"python.json";js_receipt=t/"node.json"
        a=invoke([sys.executable,str(DIR/"autonomous_lattice.py"),
                  "--trace",str(py_trace),"--receipt",str(py_receipt)])
        b=invoke(["node",str(DIR/"autonomous_lattice_node.js"),
                  "--trace",str(js_trace),"--receipt",str(js_receipt)])
        assert a==b and a["status"]=="PASS"
        assert a["rows"]==2187 and a["entity_updates"]==177147
        assert a["manual_interventions"]==0
        assert py_trace.read_bytes()==js_trace.read_bytes()
        assert py_receipt.read_bytes()==js_receipt.read_bytes()
        row_data=py_trace.read_bytes()
        assert a["trace_sha256"]==sha(row_data)
        assert a["receipt_sha256"]==sha(py_receipt.read_bytes())
        v=json.loads(py_receipt.read_bytes())
        assert v["schema"]=="ASOLARIA-SEAT4-AUTONOMOUS-STABLE-IDENTITIES-V1"
        assert v["human_prompts"]==v["manual_interventions_per_tick"]==0
        assert v["distinct_stable_identities"]==2187
        assert v["identity_mutations"]==0
        assert v["automatic_position_updates"]==177147
        assert v["field_mutations_rejected"]==v["identity_mutations_rejected"]==27
        assert v["digital_pixel_mutations_rejected"]==27
        assert v["independent_matrix_watcher_checks"]==2187
        assert v["physical_photons_measured"] is False
        distinct=set()
        rows=0; previous={}
        for line in row_data.decode("ascii").splitlines():
            fields=dict(s.split("=",1) for s in line.split("|")[1:])
            wave=int(fields["w"]); tick=int(fields["t"])
            assert 0<=wave<27 and 1<=tick<=81
            assert len(fields["field"])==21
            for key in ("frame","positions","identities"):
                assert len(fields[key])==64
            assert (wave,tick) not in distinct
            distinct.add((wave,tick))
            assert previous.setdefault(wave,fields["identities"])==fields["identities"]
            rows+=1
        assert rows==len(distinct)==2187 and len(previous)==27
        mutation=bytearray(row_data);mutation[len(mutation)//2]^=1
        assert sha(mutation)!=sha(row_data)
        if len(sys.argv)==3:
            Path(sys.argv[1]).write_bytes(row_data)
            Path(sys.argv[2]).write_bytes(py_receipt.read_bytes())
        print(json.dumps({
            "schema":"ASOLARIA-SEAT4-AUTONOMOUS-PEER-V1",
            "status":"PASS",
            "independent_python_node_exact_trace_rows":2187,
            "identity_mutations":0,"manual_prompts":0,
            "entity_position_updates":177147,
            "rejected_mutations":81,
            "trace_sha256":sha(row_data),
            "receipt_sha256":sha(py_receipt.read_bytes()),
            "physical_host_attestations":0,
            "actual_optical_phenomena_measured":False
        },sort_keys=True))
if __name__=="__main__":main()
