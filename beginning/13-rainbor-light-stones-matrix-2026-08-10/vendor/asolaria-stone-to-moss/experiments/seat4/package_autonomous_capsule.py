#!/usr/bin/env python3
"""Deterministic offline ZIP packaging + full tamper-tested replay of Seat4.

Source bytes are retrieved from Git objects, preventing Windows core.autocrlf
from silently changing the capsule. The ZIP is ZIP_STORED, with fixed timestamps,
permissions, file order and a SHA256 per-file manifest. No credentials, network
or human decision is invoked during the replay or simulation steps.
"""
import argparse,hashlib,io,json,subprocess,sys,tempfile,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
N_NEST="307903651f56e8a28ef98ca36aef22ee8cda935c"
RECURRENCE_SHA="c0b44be3857af23cef02e9274e335868d2efbfe2f73d59a290ddc24a1bd8ca14"
RECURRENCE_STONE="b73b09e3e89d4af4d815d5e8f2456daec4103b206cbe0190d2ac5274590ae3a8"
TRIAD_SHA="720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3"

SEAT4_SOURCES=[
 "experiments/seat4/recurrence_trial.py",
 "experiments/seat4/recurrence_trial_node.js",
 "experiments/seat4/verify_recurrence_trial.py",
 "experiments/seat4/autonomous_lattice.py",
 "experiments/seat4/autonomous_lattice_node.js",
 "experiments/seat4/verify_autonomous_lattice.py",
 "experiments/seat4/nnest_wave_gate.py",
 "experiments/seat4/seat1_original_triad_replay.py",
 "experiments/seat4/verify_original_seat1_triad_peer.py",
 "experiments/seat4/PREREG-RECURRENCE-IS-MIND-MULTIENTITY-20261015.md",
 "experiments/seat4/PREREG-AUTONOMOUS-SIM-CAPSULE-20261015.md",
 "experiments/seat4/RECURRENCE-IS-MIND-FOUR-ARM-RESULTS-20261015.md",
 "experiments/seat4/N-NEST-27-WAVE-OPERATING-GATE.md",
 "experiments/seat1/TRIAD-27-CHALLENGE-20261014.json",
 "experiments/seat1/triad_27_python.py",
 "experiments/seat1/triad_27_node.js",
 "experiments/seat1/triad_release_verify.py",
 "stones/2026-10-15-rainbow81/seat4-recurrence-is-mind-3888.json",
 "stones/2026-10-15-rainbow81/seat4-recurrence-is-mind-3888.json.sha256",
 "stones/2026-10-15-rainbow81/seat4-nnest-wave-27.json",
 "stones/2026-10-15-rainbow81/seat4-nnest-wave-27.json.sha256",
 "stones/2026-10-15-rainbow81/seat4-seat1-original-triad-replay.json",
 "stones/2026-10-15-rainbow81/seat4-seat1-original-triad-replay.json.sha256",
]
SEAT1_RECEIPT="stones/2026-10-14-rainbow81/seat-1-20261014-triad27-three-horizon"

def sha(b):
    return hashlib.sha256(b).hexdigest()
def cmd(args,cwd=ROOT):
    p=subprocess.run([str(x) for x in args],cwd=cwd,check=True,
                      stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=240)
    return p.stdout
def git_blob(repo,rev,path):
    return cmd(["git","show",rev+":"+path],cwd=repo)
def get_upstream(nnest):
    nnest=nnest.resolve()
    assert cmd(["git","rev-parse","HEAD"],cwd=nnest).strip().decode("ascii")==N_NEST
    paths=cmd(["git","ls-tree","-r","--name-only",N_NEST],cwd=nnest).decode("utf8").splitlines()
    assert len(paths)==23,"Original N-Nest source count differs from frozen upstream"
    return {"nnest-upstream/"+p:git_blob(nnest,N_NEST,p) for p in paths}

def files_for_capsule(nnest,tmp):
    files={p:git_blob(ROOT,"HEAD",p) for p in SEAT4_SOURCES}
    for ext in ("json","hbp","hbi"):
        for suffix in ("",".sha256"):
            path=SEAT1_RECEIPT+"."+ext+suffix
            files[path]=git_blob(ROOT,"HEAD",path)
    files.update(get_upstream(nnest))
    files["capsule/README.md"]=git_blob(
        ROOT,"HEAD","experiments/seat4/AUTONOMOUS-CAPSULE-README.md"
    )
    files["capsule/verify_capsule.py"]=git_blob(
        ROOT,"HEAD","experiments/seat4/capsule_verify.py"
    )
    # Generate *rather than assume* full row outputs, keeping only frozen
    # externally available public challenge, source and signed-free hashes.
    recurrence=tmp/"recurrence-3888.hbp"
    rrec=tmp/"recurrence-3888.json"
    autorec=tmp/"autonomous-2187.json"
    autot=tmp/"autonomous-2187.hbp"
    triad=tmp/"original-triad-32805.hbp"
    r=json.loads(cmd([sys.executable,
        ROOT/"experiments/seat4/verify_recurrence_trial.py",rrec,recurrence]))
    assert r["status"]=="PASS" and r["trace_sha256"]==RECURRENCE_SHA
    a=json.loads(cmd([sys.executable,
        ROOT/"experiments/seat4/verify_autonomous_lattice.py",autot,autorec]))
    assert a["status"]=="PASS" and a["manual_prompts"]==0
    t=json.loads(cmd([sys.executable,
        ROOT/"experiments/seat4/seat1_original_triad_replay.py",
        ROOT/"experiments/seat1/TRIAD-27-CHALLENGE-20261014.json",triad]))
    assert t["status"]=="PASS" and t["full_hbp_sha256"]==TRIAD_SHA
    o=json.loads(cmd([sys.executable,
        ROOT/"experiments/seat4/verify_original_seat1_triad_peer.py"]))
    assert o["status"]=="PASS"
    for name,source in (
        ("capsule/data/recurrence-3888.hbp",recurrence),
        ("capsule/data/recurrence-3888.json",rrec),
        ("capsule/data/autonomous-2187.hbp",autot),
        ("capsule/data/autonomous-2187.json",autorec),
        ("capsule/data/original-triad-32805.hbp",triad)):
        files[name]=source.read_bytes()
    assert sha(files["capsule/data/recurrence-3888.hbp"])==RECURRENCE_SHA
    assert sha(files["stones/2026-10-15-rainbow81/seat4-recurrence-is-mind-3888.json"])==RECURRENCE_STONE
    assert sha(files["capsule/data/original-triad-32805.hbp"])==TRIAD_SHA
    assert files["capsule/data/recurrence-3888.json"]==files[
        "stones/2026-10-15-rainbow81/seat4-recurrence-is-mind-3888.json"]
    return files

def zip_member(name,data):
    info=zipfile.ZipInfo(name,date_time=(2026,10,15,0,0,0))
    info.create_system=3
    info.external_attr=0o100644<<16
    info.compress_type=zipfile.ZIP_STORED
    return info

def build(out,nnest):
    with tempfile.TemporaryDirectory(prefix="seat4-package-build-") as td:
        f=files_for_capsule(nnest,Path(td))
        manifest={
            "schema":"ASOLARIA-SEAT4-PORTABLE-SIMULATION-CAPSULE-V1",
            "source_repository":"https://github.com/JesseBrown1980/asolaria-stone-to-moss",
            "baseline_recursion_commit":"57edafc472462c3db63207fe8662274ad07c7c1a",
            "n_nest_upstream":"https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED",
            "n_nest_pinned_commit":N_NEST,
            "simulation":{"identities_are_immutable":True,
                          "per_tick_human_interventions":0,
                          "preconfigured_automatic_ticks":2187,
                          "synthetic_entity_position_updates":177147,
                          "physical_optical_measurement":False},
            "gate":{
                "recurrence_cases":3888,
                "original_triad_records":32805,
                "recurrence_trace_sha256":RECURRENCE_SHA,
                "original_triad_sha256":TRIAD_SHA,
                "offline_command":"python capsule/verify_capsule.py",
                "external_network_required":False,
            },
            "files":[{"path":p,"bytes":len(f[p]),"sha256":sha(f[p])}
                     for p in sorted(f)]
        }
        man=(json.dumps(manifest,sort_keys=True,indent=2)+"\n").encode("ascii")
        f["capsule/manifest.json"]=man
        f["capsule/manifest.json.sha256"]=(
            sha(man)+"  manifest.json\n").encode("ascii")
        out=out.resolve()
        out.parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(out,"w",allowZip64=True) as z:
            for name in sorted(f):
                assert not name.startswith("/") and ".." not in Path(name).parts
                z.writestr(zip_member(name,f[name]),f[name])
    return {"sha256":sha(out.read_bytes()),
            "bytes":out.stat().st_size,"manifest_sha256":sha(man),
            "entries":len(f),"file_count":len(manifest["files"])}

def unpack_verify(archive):
    with zipfile.ZipFile(archive,"r") as z:
        assert z.testzip() is None
        names=z.namelist()
        assert names==sorted(names) and len(names)==len(set(names))
        assert all(not n.startswith("/") and ".." not in Path(n).parts for n in names)
        with tempfile.TemporaryDirectory(prefix="seat4-unpack-") as td:
            z.extractall(td)
            return json.loads(cmd([sys.executable,
                Path(td)/"capsule/verify_capsule.py","--root",td],cwd=td))

def tamper_check(archive):
    raw=bytearray(archive.read_bytes())
    # The uncompressed ZIP contains the actual original ASCII per-tick rows.
    needle=b"W|w=00|t=001|field="
    offset=raw.find(needle)
    assert offset>=0,"autonomous full trace not present in ZIP archive"
    raw[offset+len(needle)]^=1
    with zipfile.ZipFile(io.BytesIO(raw),"r") as z:
        assert z.testzip() is not None,"single-byte archive mutation passed CRC32"
    return True

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--build",type=Path)
    ap.add_argument("--nnest",type=Path)
    ap.add_argument("--verify",type=Path)
    ap.add_argument("--tamper-check",action="store_true")
    args=ap.parse_args()
    if args.build:
        assert args.nnest is not None,"--nnest checkout required for package build"
        result=build(args.build,args.nnest)
        checked=unpack_verify(args.build)
        assert checked["status"]=="PASS"
        assert checked["manifest_sha256"]==result["manifest_sha256"]
        assert checked["zero_human_approvals_within_simulation"] is True
        assert checked["automatic_ticks"]==2187
        assert checked["movement_events"]==177147
        if args.tamper_check:
            assert tamper_check(args.build)
        print(json.dumps({"status":"PASS","package":str(args.build),
            **result,"offline_replay":checked,"corruption_rejected":args.tamper_check},sort_keys=True))
    else:
        assert args.verify,"set --build or --verify"
        checked=unpack_verify(args.verify)
        print(json.dumps(checked,sort_keys=True))
if __name__=="__main__":
    main()
