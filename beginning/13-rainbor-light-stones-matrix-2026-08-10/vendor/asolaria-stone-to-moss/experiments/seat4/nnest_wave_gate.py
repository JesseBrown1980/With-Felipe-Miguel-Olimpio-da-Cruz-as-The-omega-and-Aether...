#!/usr/bin/env python3
"""Seat 4 / N-Nest prime corrective-gate integration on the ORIGINAL 27-wave trial.

Real upstream N-Nest depth3/depth7 scripts execute from an immutable commit.
Three existing Asolaria software implementations produce 27 independent wave
input surfaces (Python matrix / Node polynomial / Seat4 polynomial).
A 3-ary depth-3 agent/watcher tree gates each wave and rolls up to the apex.
Every nesting depth is fault-injected and must be caught at the root.

Finite bounded digital verifier only. No new LLM processes, human consent,
physical-host identity, quantum dynamics or signal propagation are asserted.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[2]
N_NEST_COMMIT="307903651f56e8a28ef98ca36aef22ee8cda935c"
N_NEST_REPO="JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED"
CHALLENGE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
FULL_SHA="720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3"
ORIGINAL_BLOBS={
    "experiments/seat1/TRIAD-27-CHALLENGE-20261014.json":"b098e2ce7c9878434bea7b7bf34202ed492e4548",
    "experiments/seat1/triad_27_python.py":"64a69452ebde97cf97cc76200b96e1985b6c6521",
    "experiments/seat1/triad_27_node.js":"ee4128040f9aa4aee468e100bcad406b6ecc323a",
}
VERDICTS=("MEASURED_PASS","MEASURED_FAIL","NOT_MEASURED")
LEAF_COUNT=27
TOTAL_NODES=40
WAVE_RE=re.compile(rb"^WAVE\|law=(\d+)\|wave=(\d+)\|")

def sha(data):
    return hashlib.sha256(data).hexdigest()

def blob_sha(data):
    return hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()

def check_source():
    for filename,expected in ORIGINAL_BLOBS.items():
        raw=(ROOT/filename).read_bytes()
        assert blob_sha(raw)==expected,("source blob differs",filename)
    assert sha((ROOT/"experiments/seat1/TRIAD-27-CHALLENGE-20261014.json").read_bytes())==CHALLENGE_SHA

def command(argv, cwd=None):
    c=subprocess.run([str(x) for x in argv],cwd=cwd,check=True,capture_output=True,
                     text=True,timeout=180)
    return c.stdout

def check_original_n_nest(nn):
    nn=nn.resolve()
    assert nn.is_dir(),"N-Nest checkout absent"
    head=command(["git","rev-parse","HEAD"],cwd=nn).strip()
    assert head==N_NEST_COMMIT,("unexpected N-Nest source revision",head)
    preload=(nn/"AGENT-PRELOAD.md").read_text("utf8")
    discipline=(nn/"AGENT-DISCIPLINE.md").read_text("utf8")
    law=(nn/"LAW.md").read_text("utf8")
    readme=(nn/"README.md").read_text("utf8")
    prism=(nn/"PRISM-COMB-0LOSS-NEST.md").read_text("utf8")
    inverse=(nn/"PATH2-DBWH-NNEST-INVERSE-GATE-2026-07-11.md").read_text("utf8")
    assert "inverse map" in prism and "biject" in prism
    assert "child.reported == watcher.recomputed_truth" in inverse
    assert "P(R(P(X))) = P(X)" in inverse
    assert "AGENT-DISCIPLINE.md" in preload
    for requirement in ("RUN IT. THEN SAY IT.","A VERDICT IS THREE-VALUED",
                        "MEASURED_IS","LET THE MACHINES DECIDE"):
        assert requirement in discipline,("missing N-Nest discipline",requirement)
    assert "Consent does not nest" in law
    assert "child.reported == watcher.recomputed_truth" in readme
    upstream_blobs={
        "nest-depth3-verify.cjs":"2baca296edec2d46a9bc197efee8850bd168a5ef",
        "nest-depthN-prime-verify.cjs":"fd24c0eceff455351f27e7244d5bd61bffd38a25"
    }
    results=[]
    for script,archive in (
        ("nest-depth3-verify.cjs","nest-depth3-verify-2026-06-03.hbp"),
        ("nest-depthN-prime-verify.cjs","nest-depthN-prime-verify-2026-06-03.hbp"),
    ):
        with tempfile.TemporaryDirectory(prefix="nnest-original-") as td:
            # The original scripts write relative output paths; keep checkout read-only.
            output=command(["node",nn/script],cwd=td)
            hp=Path(td)/"data"/"behcs"/archive
            actual=hp.read_bytes()
            fields=hp.with_name(archive+".sha256").read_text("ascii").split()
            assert fields==[sha(actual),archive],("N-Nest archive SHA mismatch",script)
            assert actual.decode("utf8") in output,("archive not present in stdout",script)
            assert b"PASS=false" not in actual
            if script=="nest-depth3-verify.cjs":
                assert b"RUN-CLEAN|apex_addr=R|apex_gate_ok=true" in actual
                assert b"GATE-CAUGHT=true" in actual
                assert b"consent-clean-only=true" in actual
                faults=1
            else:
                assert b"prime=true" in actual
                assert b"RUN-CLEAN|apex_subtree_ok=true" in actual
                assert b"EVERY-LEVEL-CATCHES-CONFABULATION=true" in actual
                for depth in range(1,8):
                    line=next(s for s in actual.splitlines()
                              if s.startswith(f"LEVEL-{depth}|".encode()))
                    assert b"CAUGHT=true" in line
                    assert f"@depth{depth}".encode() in line
                faults=7
            actual_source_sha=blob_sha(subprocess.run(
                ["git","show",N_NEST_COMMIT+":"+script],cwd=nn,
                capture_output=True,check=True).stdout)
            assert actual_source_sha==upstream_blobs[script],("upstream script blob differs",script)
            results.append({
                "script":script,
                "pinned_git_blob_sha1":actual_source_sha,
                "clean_tree":"MEASURED_PASS",
                "fault_levels_detected":faults,
                "timestamped_hbp_sidecar_verified":True,
                "hbp_size_bytes":len(actual),
                "scope":"local software demonstration under pinned upstream source"
            })
    return results

def run_asolaria_sources(td):
    tmp=Path(td)
    source=ROOT/"experiments"/"seat1"
    challenge=source/"TRIAD-27-CHALLENGE-20261014.json"
    scripts=[
        ("agent",(sys.executable,source/"triad_27_python.py",challenge,tmp/"agent.hbp","--self-test")),
        ("watcher",("node",source/"triad_27_node.js",challenge,tmp/"watcher.hbp","--self-test")),
        ("referee",(sys.executable,ROOT/"experiments"/"seat4"/"seat1_original_triad_replay.py",
                    challenge,tmp/"referee.hbp")),
    ]
    buffers=[]
    summary=[]
    for name,cmd in scripts:
        meta=json.loads(command(cmd))
        assert meta["status"]=="PASS"
        assert meta["challenge_sha256"]==CHALLENGE_SHA
        assert meta.get("sha256",meta.get("full_hbp_sha256"))==FULL_SHA
        assert meta["rows"]==32805 and meta["smallstep"]==120
        payload=(tmp/(name+".hbp")).read_bytes()
        assert len(payload)==6392029 and sha(payload)==FULL_SHA
        buffers.append(payload)
        summary.append({"implementation":name,"full_hbp_sha256":sha(payload),
                        "record_count":meta["rows"],"smallstep":meta["smallstep"]})
    assert buffers[0]==buffers[1]==buffers[2],"agent, watcher, referee disagree byte-for-byte"
    # Original owning gate checks all three legacy receipt sidecars as well.
    existing=json.loads(command([sys.executable,source/"triad_release_verify.py",
                                  tmp/"agent.hbp",tmp/"watcher.hbp"]))
    assert existing["status"]=="PASS" and existing["checksums_verified"]==3
    return buffers,summary

def waves(payload):
    records=[[] for _ in range(LEAF_COUNT)]
    counts=[[0 for _ in range(5)] for _ in range(LEAF_COUNT)]
    for line in payload.splitlines(keepends=True):
        if not line.startswith(b"WAVE|"):
            continue
        match=WAVE_RE.match(line)
        assert match is not None,"malformed WAVE row"
        law,wave=map(int,match.groups())
        assert 0<=law<5 and 0<=wave<27
        records[wave].append(line)
        counts[wave][law]+=1
    for i in range(LEAF_COUNT):
        assert counts[i]==[243]*5,("missing law/body/horizon rows",i,counts[i])
        assert len(records[i])==1215
    assert sum(map(len,records))==32805
    return [sha(b"".join(w)) for w in records]

def pid(addr,role):
    return sha(f"NNEST|81|{role}|{addr}".encode())[:16]

def node_digest(addr,values,kind):
    # Every node has deterministic identity and its own recomputable result.
    return sha(("NNEST81|"+kind+"|"+addr+"|"+("|".join(values))).encode())

def build_tree(agent,watcher,referee,tamper=None):
    """Agent reports are *not* accepted as truth. Watcher source is independent."""
    counters={"nodes":0,"leaves":0,"gates":0}
    failed=[]
    tree_rows=[]
    def recur(addr,depth,prefix):
        counters["nodes"]+=1
        agent_pid=pid(addr,"agent")
        watcher_pid=pid(addr,"watcher")
        assert agent_pid!=watcher_pid
        if depth==3:
            wave=prefix[0]*9+prefix[1]*3+prefix[2]
            counters["leaves"]+=1
            a=node_digest(addr,[str(wave),agent[wave]],"LEAF")
            w=node_digest(addr,[str(wave),watcher[wave]],"LEAF")
            independent_ref=node_digest(addr,[str(wave),referee[wave]],"LEAF")
            assert w==independent_ref,"independent watcher/referee wave mismatch"
            descendants_ok=True
        else:
            kids=[recur(addr+"."+str(i),depth+1,prefix+(i,)) for i in range(3)]
            a=node_digest(addr,[v["agent"] for v in kids],"NODE")
            w=node_digest(addr,[v["watcher"] for v in kids],"NODE")
            descendants_ok=all(v["ok"] for v in kids)
        if tamper==addr:
            a=sha((a+"|FAULT_INJECTED").encode())
        gate=(a==w)
        counters["gates"]+=1
        if not gate:failed.append(addr)
        ok=gate and descendants_ok
        tree_rows.append({"path":addr,"depth":depth,"agent_pid":agent_pid,
                          "watcher_pid":watcher_pid,"gate_ok":gate,
                          "subtree_ok":ok,"agent":a,"watcher":w})
        return {"agent":a,"watcher":w,"ok":ok}
    apex=recur("R",0,())
    assert counters=={"nodes":40,"leaves":27,"gates":40}
    return {"apex_ok":apex["ok"],"apex_truth_digest":apex["watcher"],
            "apex_agent_digest":apex["agent"],"failed_paths":sorted(failed),
            "counts":counters,"nodes":tree_rows}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--nnest",required=True,type=Path)
    p.add_argument("--receipt",type=Path)
    args=p.parse_args()
    check_source()
    original=check_original_n_nest(args.nnest)
    with tempfile.TemporaryDirectory(prefix="nnest-seat4-") as temp:
        outputs,implementations=run_asolaria_sources(temp)
        a,w,r=[waves(x) for x in outputs]
    assert a==w==r
    clean=build_tree(a,w,r)
    assert clean["apex_ok"]
    assert all(n["gate_ok"] and n["subtree_ok"] for n in clean["nodes"])
    injections=[]
    for depth in range(4):
        victim="R"+".0"*depth
        disturbed=build_tree(a,w,r,tamper=victim)
        assert not disturbed["apex_ok"]
        assert victim in disturbed["failed_paths"]
        injections.append({"depth":depth,"path":victim,
                           "at_depth_detected":True,"root_blocked":True})
    # Independent tamper of the reported *wave data*, not just an internal hash.
    corrupted=list(a)
    corrupted[13]=sha(("TAMPER|"+corrupted[13]).encode())
    disturbed=build_tree(corrupted,w,r)
    assert not disturbed["apex_ok"]
    assert "R.1.1.1" in disturbed["failed_paths"]
    assert clean["apex_truth_digest"]!=disturbed["apex_agent_digest"]
    meas={
      "class":"MEASURED_IS",
      "subject":"Seat4 27-wave N-Nest corrective software gate",
      "is":"27 wave leaves, 40 nodes, 40 independent node watcher gates, 4 injected depth failures caught",
      "obtained":"python experiments/seat4/nnest_wave_gate.py --nnest n-nest-upstream --receipt receipt.json",
      "falsifier":"any 1215-row wave mismatch, any child/watcher digest disagreement accepted, or any injected descendant fault that leaves the apex green",
      "scope":"original Seat1 public 27-wave GF2 challenge; pinned N-Nest commit "+N_NEST_COMMIT+"; Python 3.11/3.13 and Node 22; software-only"
    }
    receipt={
      "schema":"ASOLARIA-SEAT4-NNEST-CORRECTIVE-81-V1",
      "seat":"seat-4",
      "evidence_class":"MEASURED_SOFTWARE_CORRECTIVE_GATE",
      "nnest_upstream":{"repository":N_NEST_REPO,"commit":N_NEST_COMMIT,
                        "original_script_results":original,
                        "discipline_loaded":True,"law_loaded":True},
      "asolaria":{"challenge_sha256":CHALLENGE_SHA,"full_hbp_sha256":FULL_SHA,
                  "records":32805,"waves":27,"records_per_wave":1215,
                  "implementations":implementations},
      "nested":{"branching":3,"depth":3,"leaves":27,"nodes":40,"pids":80,
                "original_clean_apex":"MEASURED_PASS",
                "watcher_per_node":True,
                "root_truth_sha256":clean["apex_truth_digest"],
                "injected_node_faults":injections,
                "tampered_wave_13_rejected":True,
                "all_child_verdicts_AND_to_root":True,
                "human_scale_authorization":"NOT_REQUESTED",
                "unbounded_agent_spawning":False},
      "findings":[meas],
      "gate_verdict":"MEASURED_PASS",
      "physical_host_independence":"NOT_MEASURED",
      "physical_host_reason":"NO_INDEPENDENT_HARDWARE_ATTESTATIONS",
      "falsifier":"Change a verified wave without failing a descendant watcher or root gate",
      "limitations":"bounded 3^3 digital watcher tree + original N-Nest prime depth7 verification; no actual autonomous LLM agent farm or physical light/gravity/FTL measurement",
    }
    text=json.dumps(receipt,indent=2,sort_keys=True)+"\n"
    if args.receipt:
        args.receipt.parent.mkdir(parents=True,exist_ok=True)
        args.receipt.write_text(text,encoding="utf8",newline="\n")
    print(text,end="")

if __name__=="__main__":
    main()
