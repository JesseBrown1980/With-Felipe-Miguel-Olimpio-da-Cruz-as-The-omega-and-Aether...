#!/usr/bin/env python3
"""Four-seat nested Rainbow81 parent: independent GF2 column matrices.

Parent Python -> child Node cyclic polynomial -> grandchild Python direct watcher.
All levels run as separate, simultaneously live OS processes. The parent gates
each child wave on full-byte equality and the independently recomputed watcher.
"""
import hashlib, json, os, platform, subprocess, sys, time
from pathlib import Path

N=81
MASK=(1<<N)-1
LAWS=((0,1),(0,2),(0,1,3),(0,4,7),(0,1,5,9))
HORIZONS=(10**13,10**13+1,10**13+81)
CHALLENGE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
TIMES=("past","now","future")
COLORS=("R","G","B")
SPACES=("x","y","z")

def sha(raw):return hashlib.sha256(raw).hexdigest()
def apply(cols,bits):
    result=0
    while bits:
        low=bits&-bits
        result^=cols[low.bit_length()-1]
        bits-=low
    return result
def compose(a,b):return [apply(a,v) for v in b]
def power(taps,steps):
    p=[sum(1<<((i+t)%N) for t in taps) for i in range(N)]
    result=[1<<i for i in range(N)]
    while steps:
        if steps&1:result=compose(p,result)
        p=compose(p,p)
        steps>>=1
    return result
def require_challenge(path):
    raw=Path(path).read_bytes()
    if sha(raw)!=CHALLENGE_SHA:raise ValueError("frozen challenge SHA mismatched")
    c=json.loads(raw)
    assert c["schema"]=="ASOLARIA-SEAT1-TRIAD-27WAVE-3HORIZON-V1"
    assert c["nonce"]=="eff1eda90f40cd6fa1e9e9f22e34ecf3"
    assert c["laws"]==[list(x) for x in LAWS] and c["horizons"]==list(HORIZONS)
    assert c["waves"]==27 and c["bodies"]==81
    return c
def pwrite(proc,payload):
    proc.stdin.write(json.dumps(payload,separators=(",",":"))+"\n")
    proc.stdin.flush()
def pread(proc):
    line=proc.stdout.readline()
    if not line:raise RuntimeError("Child terminated before required verification verdict")
    return json.loads(line)
def canonical_row(seat,w,li,body,h,value):
    return (f"R|seat={seat}|w={w:02d}|t={TIMES[w//9]}|c={COLORS[(w//3)%3]}|s={SPACES[w%3]}"
            f"|law={li}|body={body:02d}|h={h}|value={value:021x}\n")
def calculate_wave(seat,nonce,w,operators):
    rows=[]
    for li in range(5):
        for body in range(N):
            seed=f"ASOLARIA|NESTED|V1|{nonce}|{seat}|{w}|{body}"
            initial=(int(sha(seed.encode("ascii")),16)&MASK)^(1<<body)
            for idx,op in enumerate(operators[li]):
                rows.append(canonical_row(seat,w,li,body,idx,apply(op,initial)))
    return rows
def accept_child_wave(msg, seat, wave, parent_rows):
    """One acceptance function for real child results AND forged-record controls."""
    if msg.get("kind")!="wave" or msg.get("seat")!=seat or msg.get("wave")!=wave:
        raise ValueError("child-wave-role-or-order-mismatch")
    if msg.get("gate_ok") is not True or msg.get("watcher_gate_ok") is not True:
        raise ValueError("child-or-watcher-gate-not-green")
    if msg.get("watcher_checked")!=405 or msg.get("records")!=1215:
        raise ValueError("incomplete-child-receipt")
    reported_rows=msg.get("rows")
    if not isinstance(reported_rows,list) or len(reported_rows)!=1215:
        raise ValueError("missing-full-child-states")
    incoming_bytes="".join(reported_rows).encode("ascii")
    reported_digest=msg.get("rows_sha256")
    if sha(incoming_bytes)!=reported_digest:
        raise ValueError("forged-child-rows-sha")
    if reported_rows!=parent_rows:
        raise ValueError("child-and-independent-parent-disagree")
    parent_digest=sha("".join(parent_rows).encode("ascii"))
    if reported_digest!=parent_digest:
        raise ValueError("child-digest-does-not-match-parent")
    return parent_digest

def main(seat,challenge_file,out_dir):
    if seat not in ("seat-1","seat-2","seat-3","seat-4"):raise ValueError("bad seat")
    c=require_challenge(challenge_file)
    out=Path(out_dir);out.mkdir(parents=True,exist_ok=True)
    started_ms=time.time_ns()//1_000_000
    node_js=Path(__file__).with_name("child_poly.js")
    proc=subprocess.Popen(["node",str(node_js),str(Path(challenge_file).resolve()),seat],
                          stdin=subprocess.PIPE,stdout=subprocess.PIPE,
                          stderr=sys.stderr,text=True,bufsize=1)
    try:
        ready=pread(proc)
        assert ready["kind"]=="ready" and ready["seat"]==seat
        assert ready["role"]=="child-polynomial"
        assert ready["watcher"]["kind"]=="ready"
        assert len({os.getpid(),ready["pid"],ready["watcher"]["pid"]})==3
        # The child sends its tampered vector to the independent grandchild.
        pwrite(proc,{"kind":"tamper_test"})
        tamper=pread(proc)
        assert tamper["kind"]=="tamper-result" and tamper["status"]=="TAMPER_REJECTED"
        operators=[[power(taps,k) for k in HORIZONS] for taps in LAWS]
        all_lines=[];wave_records=[];witness_checks=0;overlap=0;overlap_ms=0
        for wave in range(27):
            pwrite(proc,{"kind":"wave","wave":wave,"seat":seat})
            parent_begin=time.time_ns()//1_000_000
            local_rows=calculate_wave(seat,c["nonce"],wave,operators)
            parent_end=time.time_ns()//1_000_000
            msg=pread(proc)
            digest=accept_child_wave(msg,seat,wave,local_rows)
            # Exercise the EXACT same real-child acceptance function with
            # adversarially forged message content. Both must be rejected.
            forged_sha=dict(msg)
            forged_sha["rows_sha256"]="0"*64
            try:
                accept_child_wave(forged_sha,seat,wave,local_rows)
            except ValueError:
                pass
            else:
                raise AssertionError("parent-accepted-forged-child-digest")
            forged_rows=dict(msg)
            forged_rows["rows"]=list(msg["rows"])
            forged_rows["rows"][0]=forged_rows["rows"][0].replace("|value=","|value=0",1)
            try:
                accept_child_wave(forged_rows,seat,wave,local_rows)
            except ValueError:
                pass
            else:
                raise AssertionError("parent-accepted-forged-child-state")
            overlap_this=max(0,min(parent_end,msg["child_math_completed_ms"])-
                              max(parent_begin,msg["child_started_ms"]))
            overlap_ms+=overlap_this
            if overlap_this>0:overlap+=1
            witness_checks+=msg["watcher_checked"]
            wave_records.append({
                "wave":wave,"rows":1215,"sha256":digest,
                "parent_math_begin_ms":parent_begin,"parent_math_end_ms":parent_end,
                "child_math_begin_ms":msg["child_started_ms"],
                "child_math_end_ms":msg["child_math_completed_ms"],
                "watcher_begin_ms":msg["watcher_started_ms"],
                "watcher_end_ms":msg["watcher_ended_ms"],
                "watcher_cases":msg["watcher_checked"],
                "subtree_green":True,"math_interval_overlap_ms":overlap_this})
            all_lines.extend(local_rows)
            print("NEST_WAVE_PASS seat=%s wave=%02d rows=1215 child_parent_overlap_ms=%d"%(seat,wave,overlap_this),flush=True)
        pwrite(proc,{"kind":"stop"})
        stopped=pread(proc)
        assert stopped["kind"]=="stopped" and stopped["verified_waves"]==27
        assert stopped["negative_checks"]==1
        proc.stdin.close()
        assert proc.wait(timeout=60)==0
        bytes_out="".join(all_lines).encode("ascii")
        assert len(all_lines)==32805 and witness_checks==10935
        hbp_path=out/(seat+".hbp");hbp_path.write_bytes(bytes_out)
        digest=sha(bytes_out)
        ended_ms=time.time_ns()//1_000_000
        summary={
            "schema":"ASOLARIA-FOUR-SEAT-NNEST-DEPTH3-V1",
            "seat":seat,"status":"PASS","source_challenge_sha256":CHALLENGE_SHA,
            "source_reference_repo":"JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED",
            "nest_path":"root."+seat+".wave.body",
            "nest_depth":3,"live_process_count":3,"parent_python_pid":os.getpid(),
            "child_node_pid":ready["pid"],"grandchild_python_pid":ready["watcher"]["pid"],
            "parent_rows":len(all_lines),"child_rows_matched":len(all_lines),
            "watcher_direct_step_checks":witness_checks,
            "parent_child_mathematical_overlap_waves":overlap,
            "parent_child_mathematical_overlap_ms":overlap_ms,
            "process_lifetimes_overlap":ready["started_ms"]<=ended_ms and
             ready["watcher"]["started_ms"]<=ended_ms and stopped["ended_ms"]>=started_ms,
            "negative_grandchild_tamper_rejected":True,
            "negative_parent_digest_tamper_rejected":True,
            "canonical_hbp_sha256":digest,"hbp_bytes":len(bytes_out),
            "parent_started_epoch_ms":started_ms,"parent_ended_epoch_ms":ended_ms,
            "child_started_epoch_ms":ready["started_ms"],"child_ended_epoch_ms":stopped["ended_ms"],
            "watcher_started_epoch_ms":ready["watcher"]["started_ms"],
            "wave_stones":wave_records,
            "python_version":platform.python_version(),"node_version":ready["node"],
            "runner_os":os.environ.get("RUNNER_OS",platform.system()),
            "github_run_id":os.environ.get("GITHUB_RUN_ID","LOCAL"),
            "scientific_limit":"Real nested OS process computation; hardware chassis and neural learning not authenticated."
        }
        (out/(seat+".json")).write_text(json.dumps(summary,sort_keys=True,indent=2)+"\n")
        print("NEST_SEAT_PASS",json.dumps({k:summary[k] for k in
              ("seat","parent_rows","watcher_direct_step_checks",
               "parent_child_mathematical_overlap_waves","canonical_hbp_sha256")},sort_keys=True),flush=True)
    finally:
        if proc.poll() is None:
            proc.kill();proc.wait(timeout=30)
if __name__=="__main__":
    if len(sys.argv)!=4:raise SystemExit("Usage: python parent_matrix.py seat-3 original-challenge.json output-folder")
    main(*sys.argv[1:])
