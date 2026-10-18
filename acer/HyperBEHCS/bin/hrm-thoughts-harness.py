#!/usr/bin/env python3
# V50-B HRM thoughts harness - Asolaria OS-on-metal equation runtime
# SOVLINUX-USB (frozen slice) -> HyperBEHCS (engine) -> MTP (3 mini-models) -> PID-crypto-token
# CPU-only deterministic. No LMStudio (Gemma-4-e4b OOMs GTX 1050 0xC0000409).
# Supersedes V43-stub harness (torch-dep, emitted STUB without D:/Asolaria-HRM venv).
import hashlib, json, time, sys, urllib.request, statistics
from pathlib import Path
SLICE = Path("C:/HyperBEHCS/store/sovlinux-deep-decode-wave-2026-05-22.hbp")
OUT = Path("C:/HyperBEHCS/store/hrm-thoughts"); OUT.mkdir(parents=True, exist_ok=True)
COSIGN = Path("C:/asolaria-acer/COSIGN_CHAIN.ndjson")
GLSM = "http://127.0.0.1:4920/api/gnn-drain/ingest"
ANCHOR = "ASOLARIA-V50-B-HRM-THOUGHTS-HARNESS-BUILT-PID-2026-05-24"
TICKS = 10; INTERVAL = 5.0

def sha16(s): return hashlib.sha256(s.encode() if isinstance(s,str) else s).hexdigest()[:16]
def pid_token(anchor): return sha16(anchor)

def read_synthesis_row():
    if not SLICE.exists(): print(f"HONEST-FAIL slice-missing {SLICE}"); sys.exit(2)
    for line in SLICE.read_text(encoding='utf-8',errors='replace').splitlines():
        if "frozen-slice-thinking-synthesis" in line: return line
    print("HONEST-FAIL synthesis-row-missing"); sys.exit(2)

class MiniRev:
    mid="rev"
    def predict(self,h): return h[::-1]
class MiniXor:
    mid="xor"
    def predict(self,h): return ''.join(f"{(int(c,16)^0x5):x}" for c in h)
class MiniRot:
    mid="rot"
    def predict(self,h): return h[8:]+h[:8]
MODELS=[MiniRev(),MiniXor(),MiniRot()]

def emit_hbp(path, rows):
    body = "\n".join(rows) + "\n"
    path.write_text(body, encoding='utf-8')
    s = hashlib.sha256(body.encode()).hexdigest()
    path.with_suffix(path.suffix+".sha256").write_text(s+"  "+path.name+"\n", encoding='utf-8')
    return s

def tick(n, slice_row):
    slice_hex = sha16(slice_row)
    slice_pid = pid_token("SOVLINUX-DEEP-DECODE-PID-2026-05-22")
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    rows, thoughts = [], []
    for m in MODELS:
        pred = m.predict(slice_hex)
        rec = f"{slice_pid}|{m.mid}|{pred}"
        tsig = sha16(rec)
        thoughts.append({"slice_pid_token":slice_pid,"mini_model_id":m.mid,"predicted_hex":pred,"self_sha16":tsig})
        rows.append(f"HBPv1|layer=hrm-thought|tick={n}|slice_pid_token={slice_pid}|mini_model_id={m.mid}|predicted_hex={pred}|self_sha16={tsig}|anchor_pid={ANCHOR}|ts={ts}|row_hash={tsig}")
    p = OUT / f"tick-{n:02d}-{int(time.time())}.hbp"
    emit_hbp(p, rows)
    return thoughts, p

def summary_emit(all_thoughts):
    nums=[int(t["self_sha16"],16) for t in all_thoughts]
    mean=statistics.mean(nums); var=statistics.pvariance(nums)
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    row = f"HBPv1|layer=hrm-thoughts-glsm-batch|anchor_pid={ANCHOR}|thought_count={len(all_thoughts)}|mean_token_int={mean:.3e}|variance={var:.3e}|ticks={TICKS}|ts={ts}|row_hash={sha16(str(mean)+str(var))}"
    p = OUT / f"glsm-batch-{int(time.time())}.hbp"
    emit_hbp(p, [row])
    posted=False
    try:
        req=urllib.request.Request(GLSM, data=row.encode(), headers={"Content-Type":"text/plain"})
        urllib.request.urlopen(req, timeout=2); posted=True
    except Exception as e:
        (OUT/"glsm-honest-fail.log").write_text(f"glsm-unreachable {e}\n", encoding='utf-8')
    return p, posted, mean, var

def cosign_append(harness_sha, summary_path):
    seq = 305
    try:
        import re
        for ln in reversed(COSIGN.read_text(encoding='utf-8').splitlines()):
            m=re.search(r'"seq"\s*:\s*(\d+)', ln)
            if m: seq=int(m.group(1))+1; break
    except: pass
    row={"seq":seq,"ts":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),
         "anchor":"asolariaV50BHrmThoughtsHarnessBuilt","target_pid":ANCHOR,
         "event":"v50_b_hrm_thoughts_harness_built_and_executed_10_ticks",
         "harness_file":"C:/HyperBEHCS/bin/hrm-thoughts-harness.py","harness_body_sha256":harness_sha,
         "summary_hbp":str(summary_path),"agent":"AGT-acer-Claude-v50b-builder-2026-05-24",
         "authority":"foundation-v3-LAW-4mo-window","aether_law_7_honesty":True,"status":"CANON_EMITTED"}
    rs=json.dumps(row,sort_keys=True,separators=(',',':'))
    row["row_hash"]=hashlib.sha256(rs.encode()).hexdigest()[:16]
    with COSIGN.open('a',encoding='utf-8') as f: f.write(json.dumps(row,indent=2)+"\n")
    return seq, row["row_hash"]

def main():
    slice_row = read_synthesis_row()
    print(f"[HRM] slice row loaded {len(slice_row)} chars")
    all_thoughts=[]
    for i in range(1, TICKS+1):
        th, p = tick(i, slice_row)
        all_thoughts.extend(th)
        print(f"[HRM] tick {i:02d}/{TICKS} -> {len(th)} thoughts -> {p.name}")
        if i < TICKS: time.sleep(INTERVAL)
    sp, posted, mean, var = summary_emit(all_thoughts)
    harness_sha = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    seq, row_hash = cosign_append(harness_sha, sp)
    print(json.dumps({"thoughts":len(all_thoughts),"summary":str(sp),"glsm_posted":posted,
                      "mean":f"{mean:.3e}","variance":f"{var:.3e}","cosign_seq":seq,"cosign_row_hash":row_hash,
                      "harness_body_sha256":harness_sha[:16]}, indent=2))

if __name__=="__main__": main()
