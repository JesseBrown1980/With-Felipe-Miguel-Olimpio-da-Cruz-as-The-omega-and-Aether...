"""Check the DIVIDE / GC rows: the giant cut into 3,174 B pieces. usage: divide_check.py GGUF"""
import sys, hashlib
from collections import Counter
import numpy as np
b = open(sys.argv[1], "rb").read()
P = 3174
n = len(b) // P
pieces = [b[i * P:(i + 1) * P] for i in range(n)]
cnt = Counter(pieces)
tied = sum(c for c in cnt.values() if c >= 2)
a = np.frombuffer(b[:n * P], np.uint8).reshape(n, P).astype(np.int32)
ctx = a[:, :-2] * 256 + a[:, 1:-1]
cpb = []
for row in ctx:
    cpb.append(len(np.unique(row)) / P)
cpb = np.array(cpb)
print(f"sha256={hashlib.sha256(b).hexdigest()} bytes={len(b)} pieces={n} remainder={len(b) - n * P} "
      f"distinct={len(cnt)} tied_ge2={tied} tie_pct={100 * tied / n:.2f} carried_lt_0.30={int((cpb < 0.30).sum())} "
      f"mean_ctx_per_byte={cpb.mean()!r}")
import math
L = [len(set(zip(p[:-2], p[1:-1]))) / len(p) for p in pieces]
L2 = [len(set(zip(p[:-1], p[1:]))) / len(p) for p in pieces]
print("py_sum/n", repr(sum(L) / n), "fsum/n", repr(math.fsum(L) / n), "np.mean(list)", repr(float(np.mean(L))),
      "pairs_full sum/n", repr(sum(L2) / n), "np.mean(full)", repr(float(np.mean(L2))))
C = [len(set(zip(p[:-2], p[1:-1]))) for p in pieces]
tgt = 0.0013569263171007775
cands = {
    "sum(C)/(n*P)": sum(C) / (n * P), "sum(C)/n/P": sum(C) / n / P, "mean(C)/P np": float(np.mean(C)) / P,
    "np.mean(f32)": float(np.mean(np.array(L, np.float32))), "np.mean(C/P f64 arr)": float(np.mean(np.array(C) / P)),
    "sum(L[:len-1]) excl": sum(L) / n, "sum over sorted": sum(sorted(L)) / n,
    "np.array(L).mean()": float(np.array(L).mean()),
    "np.mean(np.array(C,float))/P": float(np.mean(np.array(C, float)) / P),
    "sum(C)/len(b-rem)": sum(C) / (n * P),
}
for k, v in cands.items():
    print(f"{k:<28} {v!r} {'EQUAL' if v == tgt else ''}")
print("sum(C)", sum(C), "target*n*P", tgt * n * P)
m = 0.0
for k, x in enumerate(L, 1):
    m += (x - m) / k
s32 = np.float32(0)
for x in L:
    s32 += np.float32(x)
print("running_mean", repr(m), m == tgt, "| f32 accum/n", repr(float(s32) / n))
