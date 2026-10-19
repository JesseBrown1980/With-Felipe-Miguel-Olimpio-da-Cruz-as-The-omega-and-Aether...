#!/usr/bin/env python3
"""Seat3 byte-exact independent full trace verifier, structural and policy checks."""
import hashlib
import json
import sys
from pathlib import Path

SHA = lambda raw: hashlib.sha256(raw).hexdigest()

def check(pfile,nfile,pmeta,nmeta,outdir):
    p=Path(pfile).read_bytes(); n=Path(nfile).read_bytes()
    assert p==n, "Two independently authored implementations generated different HBP bytes"
    assert p.startswith(b"PORTAL|schema=ASOLARIA-SEAT3-AUTONOMOUS-IDENTITY-V1")
    assert p.endswith(b"|real_hardware=0|physical_hosts=0|json=0\n")
    lines=p.decode("ascii").splitlines()
    ticks=[x for x in lines if x.startswith("TICK|")]
    spawns=[x for x in lines if x.startswith("SPAWN|")]
    corrected=[x for x in lines if x.startswith("CORRECTED|")]
    assert len(ticks)==1080 and len(spawns)==27 and len(corrected)==4
    for index,line in enumerate(ticks,1):
        assert line.startswith(f"TICK|k={index:04d}|"), (index,line)
        assert "|state_sha256=" in line and line.endswith("|json=0")
    assert [x.split("|")[1] for x in corrected] == [
        "tick=0031","tick=0401","tick=0799","tick=1000"]
    assert all("raw_report_rejected=1" in x and "source_authenticated=0" in x
               and "path=" in x for x in corrected)
    assert ">" in corrected[-1].split("|path=")[-1]
    assert any("|depth=7|" in x for x in spawns)
    assert any(x.startswith("HALT|before_tick=777|blocked_tick=777|no_advance=1") for x in lines)
    assert any(x.startswith("POLICY|denied_external_hardware=1|denied_109th_child=1") for x in lines)
    a=json.loads(Path(pmeta).read_text());b=json.loads(Path(nmeta).read_text())
    assert a==b, "Python/Node metrics differ"
    assert a["ticks"]==1080 and a["initial_entities"]==81 and a["final_entities"]==108
    assert a["virtual_spawns"]==27 and a["max_depth"]==7
    assert len(a["corrections"])==4
    assert all(e["path"].endswith(e["id"]) for e in a["corrections"])
    assert a["baseline_final_sha256"]==a["faulted_final_sha256"]==a["paused_resumed_final_sha256"]
    assert a["operator_prompts_per_tick"]==0 and a["standing_policy_grants"]==1
    assert a["halt_blocked_tick"]==777 and a["invalid_resume_denials"]==1
    assert a["authorized_resume_grants"]==1
    assert a["denied_hardware"]==1 and a["denied_budget"]==1
    assert a["movement_events"]>1080
    assert a["source_authenticated"] is False and a["physical_host_attested"] is False
    assert a["trace_sha256"]==SHA(p) and a["trace_bytes"]==len(p)
    altered=bytes([p[0]^1])+p[1:]
    assert SHA(altered)!=SHA(p)
    out=Path(outdir);out.mkdir(parents=True,exist_ok=True)
    (out/"seat3-autonomous-identity.hbp").write_bytes(p)
    (out/"seat3-autonomous-identity.hbp.sha256").write_text(
        SHA(p)+"  seat3-autonomous-identity.hbp\n")
    metrics=json.dumps(a,sort_keys=True,separators=(",",":"),ensure_ascii=True)+"\n"
    (out/"seat3-autonomous-identity.json").write_text(metrics)
    (out/"seat3-autonomous-identity.json.sha256").write_text(
        SHA(metrics.encode("ascii"))+"  seat3-autonomous-identity.json\n")
    seal=(f"INDEX|schema=ASOLARIA-SEAT3-IDENTITY-INDEX-V1|json=0\n"
          f"HBP|sha256={SHA(p)}|bytes={len(p)}|json=0\n"
          f"JSON|sha256={SHA(metrics.encode('ascii'))}|json=0\n"
          "END|physical_hosts=0|json=0\n").encode("ascii")
    (out/"seat3-autonomous-identity.hbi").write_bytes(seal)
    (out/"seat3-autonomous-identity.hbi.sha256").write_text(
        SHA(seal)+"  seat3-autonomous-identity.hbi\n")
    print(json.dumps({"verdict":"PASS","traces_identical":True,"ticks":1080,
        "children":27,"corrections":4,"halt_at":777,"operator_prompts_per_tick":0,
        "full_trace_bytes":len(p),"full_trace_sha256":SHA(p),
        "final_world_sha256":a["baseline_final_sha256"],"output_dir":str(out)},
        sort_keys=True))

if __name__=="__main__":
    if len(sys.argv)!=6:
        raise SystemExit("usage: python verify_autonomous_universe.py python.hbp node.hbp python.json node.json output_dir")
    check(*sys.argv[1:])
