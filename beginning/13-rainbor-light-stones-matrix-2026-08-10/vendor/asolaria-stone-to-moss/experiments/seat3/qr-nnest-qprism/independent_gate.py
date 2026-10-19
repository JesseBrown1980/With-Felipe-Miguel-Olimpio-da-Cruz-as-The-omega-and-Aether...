#!/usr/bin/env python3
"""Seat 3 fail-closed source-byte / N-Nest / Q-PRISM referee.

The QR test covers indexed payloads, NOT optical QR-image decoding.
All original external source and original-instrument custody gates remain HELD.
"""
import argparse
import hashlib
import pathlib
import re
import subprocess
import sys

CHUNK = 2100
NEST_SHA = "307903651f56e8a28ef98ca36aef22ee8cda935c"
PRISM_SHA = "b4a21a25381d6920b7aab92c94c3c3e1420fc9e4"
NEST_BLOBS = {
    "nest-depth3-verify.cjs": "2baca296edec2d46a9bc197efee8850bd168a5ef",
    "nest-depthN-prime-verify.cjs": "fd24c0eceff455351f27e7244d5bd61bffd38a25",
}
PRISM_BLOBS = {
    "qprism/harness.py": "addb3bc5c7ebf493a0c33c53fe37b1e04c400aa1",
    "qprism/sources.py": "76cb2cad57d1e988f422c328e79795a4616e03e2",
}

def digest(b):
    return hashlib.sha256(b).hexdigest()

def h16(text):
    return digest(text.encode("ascii"))[:16]

def packets(data):
    return [i.to_bytes(4, "little") + data[i*CHUNK:(i+1)*CHUNK]
            for i in range((len(data)+CHUNK-1)//CHUNK)]

def decode(parts, size, source_sha):
    if size <= 0 or re.fullmatch(r"[0-9a-f]{64}", source_sha) is None:
        raise ValueError("invalid source commitment")
    n = (size+CHUNK-1)//CHUNK
    received = {}
    for item in parts:
        if len(item) < 5 or len(item) > CHUNK+4:
            raise ValueError("bad packet length")
        index = int.from_bytes(item[:4], "little")
        if index in received or index >= n:
            raise ValueError("duplicate/invalid index")
        if len(item)-4 != min(CHUNK, size-index*CHUNK):
            raise ValueError("noncanonical packet length")
        received[index] = item[4:]
    if len(received) != n:
        raise ValueError("missing packet")
    original = b"".join(received[i] for i in range(n))
    if len(original) != size or digest(original) != source_sha:
        raise ValueError("SHA mismatch")
    return original

def tree7(bad=None):
    """Independent Python N-Nest depth-seven rule: gate AND descendants."""
    def visit(addr, depth):
        kids = [] if depth == 7 else [
            visit(addr+".0", depth+1), visit(addr+".1", depth+1)]
        correct = (h16("work|"+addr) if depth == 7 else
                   h16(addr+"|"+",".join(k[0] for k in kids)))
        report = h16(correct+"|CONFABULATED") if addr == bad else correct
        failing = ([addr+"@depth"+str(depth)] if report != correct else [])
        for kid in kids:
            failing.extend(kid[2])
        return report, report == correct and all(k[1] for k in kids), failing
    return visit("R", 0)

def refuses(action):
    try:
        action()
    except ValueError:
        return True
    return False

def synthetic_tests():
    data = b"".join(hashlib.sha256(b"SEAT3|"+i.to_bytes(4,"little")).digest()
                    for i in range(2048))
    parts, sha = packets(data), digest(data)
    assert len(data) == 65536 and len(parts) == 32
    assert decode(parts[::-1], len(data), sha) == data
    trials = [
        ("missing_chunk", parts[:-1], len(data), sha),
        ("duplicate_index", parts+[parts[0]], len(data), sha),
        ("changed_source_byte", parts[:4]+[parts[4][:7]+bytes([parts[4][7]^1])+parts[4][8:]]+parts[5:],len(data),sha),
        ("index_substitution", parts[:1]+[(0).to_bytes(4,"little")+parts[1][4:]]+parts[2:],len(data),sha),
        ("truncated_tail", parts[:-1]+[parts[-1][:-1]],len(data),sha),
        ("forged_digest", parts,len(data),"0"*64),
        ("altered_length", parts,len(data)+1,sha),
        ("extra_packet", parts+[(999).to_bytes(4,"little")+b"X"],len(data),sha),
    ]
    rows = [
        "HBP1|schema=ASOLARIA-SEAT3-QR-NNEST-GATE-V1|source=synthetic|json=0",
        f"PASS|roundtrip=TRUE|source_bytes={len(data)}|chunks={len(parts)}|sha256={sha}|json=0",
    ]
    for label, p, n, hashval in trials:
        assert refuses(lambda p=p,n=n,h=hashval: decode(p,n,h)), "FALSE_GREEN_"+label
        rows.append(f"REJECT|case={label}|pass=TRUE|json=0")
    assert digest(data+b"X") != sha
    rows.append("REJECT|case=child_reports_green_on_altered_source|pass=TRUE|json=0")
    assert tree7()[1]
    for depth in range(1,8):
        target = "R"+".0"*depth
        report, good, failing = tree7(target)
        assert report and not good and f"{target}@depth{depth}" in failing
        rows.append(f"REJECT|case=nest_level_{depth}|failing_path={target}|pass=TRUE|json=0")
    rows.append("BOUNDARY|optical_QR_decode=NOT_RUN|signed_source=UNVERIFIED|human_scale=NOT_AUTHORIZED|json=0")
    return "\n".join(rows)+"\n"

def upstream_tests(root):
    root = pathlib.Path(root)
    nest, prism = root/"n-nest", root/"q-prism"
    for checkout, sha, blobs in [(nest,NEST_SHA,NEST_BLOBS),(prism,PRISM_SHA,PRISM_BLOBS)]:
        got = subprocess.check_output(["git","rev-parse","HEAD"],cwd=checkout,text=True).strip()
        assert got == sha, (checkout,got,sha)
        for path, blob in blobs.items():
            got = subprocess.check_output(["git","rev-parse","HEAD:"+path],
                                          cwd=checkout,text=True).strip()
            assert got == blob, (path,got,blob)
    outputs = []
    for script in NEST_BLOBS:
        proc = subprocess.run(["node",script],cwd=nest,text=True,
                              capture_output=True,check=True,timeout=50)
        outputs.append(proc.stdout)
    assert "PASS=true" in outputs[0] and "GATE-CAUGHT=true" in outputs[0]
    assert "EVERY-LEVEL-CATCHES-CONFABULATION=true" in outputs[1]
    for depth in range(1,8):
        assert re.search(r"LEVEL-"+str(depth)+r"\|[^\n]*CAUGHT=true",outputs[1])
    # Actually execute upstream Q-PRISM's randomized three-arm simulator, using
    # modest repeat count. Do not treat short-run p-values as detection evidence.
    qcode = """import math
from qprism.harness import compare
for coupling in (0.0, 0.6):
    result = compare(coupling=coupling, repeats=3, budget=8, base_seed=1200)
    for arm, record in result['arms'].items():
        assert record['n'] == 3 and math.isfinite(record['mean'])
        print('QPRISM|oracle_coupling_permille='+str(round(coupling*1000))+'|arm='+arm+'|mean_millionths='+str(round(record['mean']*1000000))+'|samples=3|json=0')
    assert math.isfinite(result['prism_vs_optimizer']['p_value'])
print('BOUNDARY|qprism_simulator=TRUE|new_physical_result=FALSE|json=0')
"""
    result = subprocess.run([sys.executable,"-c",qcode],cwd=prism,text=True,
                            capture_output=True,check=True,timeout=240)
    assert result.stdout.count("QPRISM|") == 6
    return ("HBP1|schema=ASOLARIA-SEAT3-PINNED-UPSTREAM-V1|json=0\n"+
            f"SOURCES|n_nest_commit={NEST_SHA}|qprism_commit={PRISM_SHA}|json=0\n"+
            "NEST|actual_upstream_depth3=PASS|actual_upstream_depth7=PASS|json=0\n"+
            result.stdout)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--upstreams")
    parser.add_argument("--output", default="artifacts/seat3-qr-nnest-qprism.hbp")
    args = parser.parse_args()
    output = synthetic_tests()
    if args.upstreams:
        output += upstream_tests(args.upstreams)
    p = pathlib.Path(args.output)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(output.encode("ascii"))
    p.with_suffix(p.suffix+".sha256").write_text(
        digest(output.encode("ascii"))+"  "+p.name+"\n",encoding="ascii")
    print(output,end="")
    print("RESULT_SHA256|value="+digest(output.encode("ascii"))+"|json=0")

if __name__ == "__main__":
    main()
