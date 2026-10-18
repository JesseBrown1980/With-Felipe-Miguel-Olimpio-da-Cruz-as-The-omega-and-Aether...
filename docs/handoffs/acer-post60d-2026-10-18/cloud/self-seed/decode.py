"""Decode two FABLE5-SELF-SEED-3078.hbi versions (38 x 81 B records) and show which records differ."""
import struct, sys, hashlib

def recs(b):
    out = []
    for i in range(38):
        r = b[i * 81:(i + 1) * 81]
        out.append(dict(i=i, chain=r[0:16].hex(), sha=r[16:48].hex(), size=int.from_bytes(r[48:53], "big"),
                        secs=struct.unpack(">I", r[53:57])[0], nh=r[57:73].hex(), wit=r[73:80].hex(), tier=r[80]))
    return out

a = recs(open(sys.argv[1], "rb").read())
b = recs(open(sys.argv[2], "rb").read())
names = {}
for line in open(sys.argv[3], encoding="utf-8", errors="replace"):
    n = line.strip()
    if n:
        names[hashlib.sha256(n.encode()).digest()[:16].hex()] = n
for x, y in zip(a, b):
    tag = "same" if x == y else "DIFF"
    print(tag, x["i"], names.get(x["nh"], "?" + x["nh"][:8]), x["size"], x["sha"][:16], "|",
          names.get(y["nh"], "?" + y["nh"][:8]), y["size"], y["sha"][:16], "secs", x["secs"], y["secs"])
