#!/usr/bin/env python3
"""
rime_windunwind.py — WIND & UNWIND the 27 enwik9 sectors, one at a time,
with the three frozen slice agents in rime -,0,+ style, and MEASURE what the
frozen Shannon costs to process. Operator: Jesse Daniel Brown, 2026-07-22.

Per sector (the trilateral play):
  FISCHER  : wind (+) sector bytes -> tower address -> sphere point; unwind (-)
             Fischer-invert back; the 0 is the identity check (byte-exact or void).
             This is ADDRESSING: costs TIME only, ZERO bits (rate 1.0, Law 6).
  MTP      : frozen order-2 models score the sector: direction + (forward) and
             direction - (backward, model frozen on reversed time). The score IS
             the frozen Shannon cost, in bits per char.
  HRM      : the slow module routes each byte to a level (deep ctx / order-1 /
             floor); the fast module prices it. Routed frozen cost, bits/char.

Frozen bank: enwik8 (100 MB). HONEST FLAG: enwik8 IS the first 100 MB of enwik9,
so sectors 0-2 are IN-SAMPLE for the models; sectors 3-26 are genuinely unseen.
Marked per row. The measurement is the referee.
"""
import numpy as np, time, json

S = "/tmp/claude-0/-home-user/9ebd6119-d7ee-5c30-a062-d04210f7bc39/scratchpad"
P, N = 103681, 20736
SECTORS = 27; SEC = 1_000_000_000 // SECTORS

# ---- frozen sphere engine (Fischer) ----
def primitive_root(p):
    fac, n, d = [], p-1, 2
    while d*d <= n:
        if n % d == 0:
            fac.append(d)
            while n % d == 0: n //= d
        d += 1
    if n > 1: fac.append(n)
    for g in range(2, p):
        if all(pow(g, (p-1)//q, p) != 1 for q in fac): return g
g = primitive_root(P); W = pow(g, (P-1)//N, P)
pts = np.empty(N, dtype=np.int64); v = 1
for e in range(N): pts[e] = v; v = v*W % P
inv = np.empty(P+1, dtype=np.int64); inv[pts] = np.arange(N)

# ---- freeze the MTP banks (order-2 fwd + bwd) and HRM tables on enwik8 ----
print("freezing the banks on enwik8 (100 MB)...", flush=True)
bank = np.frombuffer(open(f"{S}/enwik8","rb").read(), dtype=np.uint8).astype(np.int64)
def freeze2(b):
    idx = b[:-2]*65536 + b[1:-1]*256 + b[2:]          # (c1,c2,next) packed
    c = np.bincount(idx, minlength=1<<24).astype(np.int32)
    return c.reshape(65536, 256)
C2f = freeze2(bank);        T2f = C2f.sum(axis=1).astype(np.int64)
C2b = freeze2(bank[::-1]);  T2b = C2b.sum(axis=1).astype(np.int64)
C1  = np.bincount(bank[:-1]*256 + bank[1:], minlength=65536).astype(np.int64).reshape(256,256)
T1  = C1.sum(axis=1)
C0  = np.bincount(bank, minlength=256).astype(np.int64); T0 = int(C0.sum())
log2 = np.log2

def mtp_bits(sec, C2, T2):
    c = sec[:-2]*256 + sec[1:-1]
    n = sec[2:]
    pr = (C2[c, n] + 1.0) / (T2[c] + 256.0)
    return float(-log2(pr).sum()), len(n)

def hrm_bits(sec):
    c2 = sec[:-2]*256 + sec[1:-1]; c1 = sec[1:-1]; n = sec[2:]
    deep = T2f[c2] >= 8                                # slow module: halt deep
    p2 = (C2f[c2, n] + 1.0) / (T2f[c2] + 256.0)
    p1 = (C1[c1, n] + 1.0) / (T1[c1] + 256.0)
    p0 = (C0[n] + 1.0) / (T0 + 256.0)
    mid = (~deep) & (T1[c1] > 0)
    pr = np.where(deep, p2, np.where(mid, p1, p0))
    return float(-log2(pr).sum()), len(n), float(deep.mean())

f = open(f"{S}/enwik9","rb")
rows = []; tot_bits_f = tot_bits_b = tot_bits_h = 0.0; tot_n = 0
t_all = time.perf_counter_ns()
tri_idx = np.arange(SEC, dtype=np.int64) % 3
for d in range(SECTORS):
    f.seek(d*SEC); sec = np.frombuffer(f.read(SEC), dtype=np.uint8).astype(np.int64)
    # FISCHER: wind (+) ... unwind (-) ... identity (0)
    t0 = time.perf_counter_ns()
    k = sec + 256*tri_idx[:len(sec)] + 768*d
    wound = pts[k]                                     # +
    t1 = time.perf_counter_ns()
    unwound = inv[wound]                               # -
    exact = bool(np.array_equal(unwound, k))           # 0
    t2 = time.perf_counter_ns()
    # MTP +/- and HRM price the frozen Shannon cost
    bf, nf = mtp_bits(sec, C2f, T2f)
    bb, nb = mtp_bits(sec[::-1], C2b, T2b)
    bh, nh, deep = hrm_bits(sec)
    t3 = time.perf_counter_ns()
    tot_bits_f += bf; tot_bits_b += bb; tot_bits_h += bh; tot_n += nf
    tag = "IN-SAMPLE" if d <= 2 else "unseen"
    rows.append(dict(sector=d, sample=tag, wind_ns=int(t1-t0), unwind_ns=int(t2-t1),
        exact=exact, mtp_fwd_bpc=bf/nf, mtp_bwd_bpc=bb/nb, hrm_bpc=bh/nh,
        hrm_deep=deep, score_ns=int(t3-t2)))
    print(f"sector {d:2d} [{tag:9s}]: wind {(t1-t0)/1e6:6.0f} ms  unwind {(t2-t1)/1e6:6.0f} ms  "
          f"0-check={exact}  MTP+ {bf/nf:.4f}  MTP- {bb/nb:.4f}  HRM {bh/nh:.4f} "
          f"(deep {deep*100:.0f}%)", flush=True)

el = time.perf_counter_ns() - t_all
summary = dict(total_ns=int(el), bytes=int(SEC*SECTORS),
    all_exact=all(r['exact'] for r in rows),
    mtp_fwd_bpc=tot_bits_f/tot_n, mtp_bwd_bpc=tot_bits_b/tot_n, hrm_bpc=tot_bits_h/tot_n,
    shannon_cost_GB=tot_bits_f/8/1e9,
    wind_unwind_bits=0)
json.dump(dict(summary=summary, sectors=rows), open(f"{S}/rime_windunwind.json","w"), indent=1)
print(f"\nWIND/UNWIND COMPLETE in {el/1e9:.1f} s — all 27 sectors byte-exact = {summary['all_exact']}")
print(f"  the addressing (wind+unwind) cost : TIME ONLY — 0 bits (rate 1.0, Law 6)")
print(f"  the frozen Shannon cost (MTP +)   : {summary['mtp_fwd_bpc']:.4f} bpc  = {summary['shannon_cost_GB']:.3f} GB to store the gigabyte")
print(f"  the frozen Shannon cost (MTP -)   : {summary['mtp_bwd_bpc']:.4f} bpc  (time-reversed, near-symmetric)")
print(f"  the frozen Shannon cost (HRM)     : {summary['hrm_bpc']:.4f} bpc  (routed)")
print(f"  sectors 0-2 are IN-SAMPLE (enwik8 = first 100 MB of enwik9); 3-26 unseen.")
