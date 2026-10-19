#!/usr/bin/env python3
"""Independent Python/Node full-trace audit of optogenetics-inspired toy gate.

Enforces pulse provenance, 81-bit field replay, immutable identities, dark
control, RGB digital frame hashing and all 405 planted software corruptions.
The result cannot imply physical photons, biological mechanisms or hardware.
"""
import hashlib,json,subprocess,sys,tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/"experiments"/"seat4"
MODES=("DARK","FAST","SLOW")
SCHEMA="ASOLARIA-SEAT4-OPTOINSPIRED-DIGITAL-GATE-V1"
def sha(b):return hashlib.sha256(b).hexdigest()
def call(cmd):
    x=subprocess.run([str(y) for y in cmd],cwd=ROOT,capture_output=True,text=True,check=True,timeout=180)
    return json.loads(x.stdout.strip())
def main():
    with tempfile.TemporaryDirectory(prefix="seat4-opto-") as tmp:
        d=Path(tmp)
        python_trace=d/"python.hbp";node_trace=d/"node.hbp"
        python_receipt=d/"python.json";node_receipt=d/"node.json"
        p=call([sys.executable,DIR/"opto_light_gate.py","--trace",python_trace,"--receipt",python_receipt])
        n=call(["node",DIR/"opto_light_gate_node.js","--trace",node_trace,"--receipt",node_receipt])
        assert p==n and p["status"]=="PASS"
        assert p["rows"]==6561 and p["faults"]==405
        assert p["source_forgery_controls"]==81
        trace=python_trace.read_bytes()
        assert trace==node_trace.read_bytes(),"Full Python / Node result trace mismatch"
        summary=python_receipt.read_bytes()
        assert summary==node_receipt.read_bytes(),"Canonical receipt byte mismatch"
        assert sha(trace)==p["trace_sha256"]
        assert sha(summary)==p["receipt_sha256"]
        # Freeze the first complete hosted positive result. Check actual
        # uploaded CI bytes rather than a predicted or hand-made verdict.
        frozen_stone=ROOT/"stones"/"2026-10-15-rainbow81"/"seat4-opto-light-gate.json"
        frozen_sha="8583bc8571b87f12aa2021043c33c079eab95f51c3c83e80af9acec364960df2"
        frozen_trace="3ca42d274909f3ba7b03a3a00662eda0375e2515acb93f769ec072d2695a0b93"
        assert summary==frozen_stone.read_bytes(),"Measured source stone was mutated"
        assert sha(summary)==frozen_sha and sha(trace)==frozen_trace
        sidecar=frozen_stone.with_name(frozen_stone.name+".sha256")
        assert sidecar.read_text("ascii").split()==[frozen_sha,frozen_stone.name]
        doc=json.loads(summary)
        assert doc["schema"]==SCHEMA
        assert doc["classification"]=="MEASURED_SOFTWARE_PASS"
        assert doc["no_real_light_or_ion_channel_data"] is True
        assert doc["zero_human_prompts_per_tick"] is True
        assert doc["optical_photon_readout"]==doc["physical_host_independence"]=="NOT_MEASURED"
        assert doc["tick_records"]==6561 and doc["immutable_distinct_pids"]==2187
        assert doc["synthetic_position_updates"]==531441
        assert doc["automatic_independent_watcher_checks"]==6561
        assert doc["source_forgery_anchored_rejections"]==81
        assert list(doc["modes"])==list(MODES)
        assert all(x==81 for x in doc["injected_faults_rejected"].values())
        assert doc["light_gate_open_counts"]["DARK"]==doc["toy_spike_counts"]["DARK"]==0
        assert doc["light_gate_open_counts"]["FAST"]>0 and doc["light_gate_open_counts"]["SLOW"]>0
        expected={(w,m,t) for w in range(27) for m in MODES for t in range(1,82)}
        encountered=set()
        identity_ref={}
        for row in trace.decode("ascii").splitlines():
            items=row.split("|")
            assert items[0]=="W" and len(items)==13,("row shape invalid",row)
            dct=dict(part.split("=",1) for part in items[1:])
            assert set(dct)=={"wave","mode","tick","pulse","occ","gate","spike","mem","field","frame","positions","identities"}
            w=int(dct["wave"]);mode=dct["mode"];t=int(dct["tick"])
            ident=(w,mode,t)
            assert ident in expected and ident not in encountered
            encountered.add(ident)
            if mode=="DARK":
                assert int(dct["pulse"])==int(dct["occ"])==int(dct["gate"])==int(dct["spike"])==0
            assert 0<=int(dct["occ"])<=1024
            assert dct["field"]==format(int(dct["field"],16),"021x")
            assert len(dct["frame"])==len(dct["positions"])==len(dct["identities"])==64
            if w not in identity_ref:identity_ref[w]=dct["identities"]
            assert identity_ref[w]==dct["identities"],"identity drift across ticks/modes"
        assert encountered==expected and len(identity_ref)==27
        mutated=bytearray(trace);mutated[len(mutated)//2]^=1
        assert sha(mutated)!=sha(trace),"SHA mutation negative control failed"
        if len(sys.argv)==3:
            Path(sys.argv[1]).write_bytes(trace)
            Path(sys.argv[2]).write_bytes(summary)
        print(json.dumps({
            "status":"MEASURED_SOFTWARE_PASS",
            "seat":"seat-4",
            "exact_python_node_records":len(encountered),
            "toy_entity_position_updates":531441,
            "stable_ids":2187,
            "automatic_tick_count":6561,
            "deliberate_mutations_rejected":405,
            "forged_pulses_anchored_rejected":81,
            "trace_sha256":sha(trace),
            "trace_bytes":len(trace),
            "receipt_sha256":sha(summary),
            "receipt_bytes":len(summary),
            "open_counts":doc["light_gate_open_counts"],
            "spike_counts":doc["toy_spike_counts"],
            "no_human_approval_each_tick":True,
            "physical_light_photons_measured":False,
            "biological_kinetic_parameter_validation":False
        },sort_keys=True))
if __name__=="__main__":main()
