#!/usr/bin/env python3
"""Verify public canonical BEHCS1024 60D source and 1024-trit bijection."""
from hashlib import sha256
from pathlib import Path
from urllib.request import Request,urlopen
P=Path(__file__).resolve().parent
PIN="52b712d8e8555b6f963121c2b464168c6a4de53a"
EXPECTED="a3cc883151b9ed538b93a9b797d7f5fdf5249dd4970b303f800862107a535d9d"
URL="https://raw.githubusercontent.com/JesseBrown1980/asolaria-tribit/"+PIN+"/kernel/behcs1024-60d/src/lib.rs"
req=Request(URL,headers={"User-Agent":"Asolaria-public-BEHCS1024-source-audit"})
with urlopen(req,timeout=60) as f:
    original=f.read(160000)
assert 5000<len(original)<160000
assert sha256(original).hexdigest()==EXPECTED,"PINNED_SOURCE_SHA_FAILED"
assert b"pub fn project_60d_checked" in original
for name in ("BEHCS1024-60D-LINK.hbi","BEHCS1024-60D-LINK.hbp"):
    raw=(P/name).read_bytes()
    expected=(P/(name+".sha256")).read_text().split()[0]
    assert sha256(raw).hexdigest()==expected,"RECEIPT_SHA_FAILED:"+name
def legacy(raw):
    raw=raw[:512]
    arr=[]
    for counter in range(4):
        h=sha256((raw+counter.to_bytes(4,"big"))[:512]).digest()
        arr.extend(int.from_bytes(h[i:i+2],"big")&1023 for i in range(0,32,2))
    return arr[:60]
assert legacy(b"abc")[:8]==[813,428,103,701,206,505,788,597]
assert legacy(b"B"*508)[:16]!=legacy(b"B"*508)[16:32]
for count in (509,510,511,512):
    v=legacy(b"B"*count)
    assert v[:16]==v[16:32]==v[32:48]
for g in range(1024):
    n=g
    trits=[]
    for _ in range(7):
        trits.append(n%3-1)
        n//=3
    assert sum((t+1)*(3**i) for i,t in enumerate(trits))==g
print("BEHCS1024|home=stone|upstream_SHA256=PASS|counter_falsifier=PASS|balanced_trit_1024of1024=PASS|HBI_HBP_SHA=PASS|json=0")
