#!/usr/bin/env python3
"""Independently compare complete Python/Node opto-inspired toy simulation receipts."""
import hashlib
import json
import sys
from pathlib import Path

Q=1024
ARMS=("dark","blue","red","mixed")
SHA=lambda x:hashlib.sha256(x).hexdigest()

def verify(py_hbp,node_hbp,py_json,node_json,outdir):
    p=Path(py_hbp).read_bytes()
    n=Path(node_hbp).read_bytes()
    assert p==n, "Python and Node full canonical HBP differ"
    assert p.startswith(b"PORTAL|schema=ASOLARIA-SEAT3-OPTOGATE-TOY-V1")
    assert p.endswith(b"physical_light_claim=0|json=0\n")
    lines=p.decode("ascii").splitlines()
    ticks=[line for line in lines if line.startswith("TICK|")]
    corrections=[line for line in lines if line.startswith("CORRECTED|")]
    sums=[line for line in lines if line.startswith("SUMMARY|")]
    assert len(ticks)==960 and len(corrections)==3 and len(sums)==4
    for arm in ARMS:
        entries=[s for s in ticks if s.startswith("TICK|arm="+arm+"|")]
        assert len(entries)==240
        for k,line in enumerate(entries,1):
            assert line.startswith(f"TICK|arm={arm}|k={k:03d}|"),(arm,k)
            assert "|state_sha256=" in line and "|sum_gate=" in line
        if arm=="dark":
            assert all("|sum_gate=0|sum_spikes=0|" in line for line in entries)
    assert [int(x.split("|tick=")[1][:3]) for x in corrections]==[77,161,181]
    assert all("|id=E:0:0:0:0|" in x and "|identity_changed=0|" in x for x in corrections)
    assert [line.split("|field=")[1].split("|")[0] for line in corrections]==[
        "gate","pulse","id"]
    pa=json.loads(Path(py_json).read_text(encoding="utf-8"))
    na=json.loads(Path(node_json).read_text(encoding="utf-8"))
    assert pa==na,"Independent simulator metrics mismatch"
    assert pa["total_ticks"]==960 and pa["identities"]==81
    assert pa["trace_bytes"]==len(p) and pa["trace_sha256"]==SHA(p)
    assert pa["corrected_faults"]==[77,161,181]
    assert pa["mixed_corrected_equals_clean"] is True
    assert pa["blue_dark_remaining"]<pa["red_dark_remaining"]
    assert pa["arms"]["dark"]["total_spikes"]==pa["arms"]["dark"]["total_gate"]==0
    assert pa["arms"]["blue"]["probe"]["blue_chR2_t1"]>pa["arms"]["blue"]["probe"]["blue_chRmine_t1"]
    assert pa["arms"]["red"]["probe"]["red_chRmine_t25"]>pa["arms"]["red"]["probe"]["red_chR2_t25"]
    assert all(pa["arms"][a]["immutable_identities"]==81 for a in ARMS)
    assert all(pa["arms"][a]["per_tick_operator_prompts"]==0 for a in ARMS)
    assert pa["biological_validation"] is False
    assert pa["physical_light_tested"] is False
    assert pa["qprism_software_connected"] is False
    assert pa["physical_hosts_attested"] is False
    assert SHA(bytes([p[0]^1])+p[1:])!=SHA(p)
    root=Path(outdir);root.mkdir(parents=True,exist_ok=True)
    hbp=root/"seat3-opto-gate.hbp"
    hbp.write_bytes(p)
    hbp.with_name(hbp.name+".sha256").write_text(SHA(p)+"  "+hbp.name+"\n")
    raw=(json.dumps(pa,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n").encode("ascii")
    summary=root/"seat3-opto-gate.json"
    summary.write_bytes(raw)
    summary.with_name(summary.name+".sha256").write_text(SHA(raw)+"  "+summary.name+"\n")
    hbi=(f"INDEX|schema=ASOLARIA-SEAT3-OPTOGATE-INDEX-V1|json=0\n"
         f"HBP|bytes={len(p)}|sha256={SHA(p)}|json=0\n"
         f"JSON|sha256={SHA(raw)}|json=0\n"
         "END|biological_validation=0|physical_hosts=0|json=0\n").encode("ascii")
    index=root/"seat3-opto-gate.hbi"
    index.write_bytes(hbi)
    index.with_name(index.name+".sha256").write_text(SHA(hbi)+"  "+index.name+"\n")
    print(json.dumps({"verdict":"PASS","tick_rows":len(ticks),
      "corrections":len(corrections),"dark_null":"PASS",
      "absent_receptor":"PASS","blue_red_selectivity":"PASS",
      "mixed_clean_equals_faulted":"PASS","trace_bytes":len(p),
      "trace_sha256":SHA(p),"human_prompts_per_tick":0,
      "actual_neural_cells_tested":False},sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=6:
        raise SystemExit("usage: python verify_opto_toy.py python.hbp node.hbp python.json node.json output_dir")
    verify(*sys.argv[1:])
