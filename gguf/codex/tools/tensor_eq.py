import struct, sys, hashlib
def parse(p):
    b = open(p, "rb").read()
    o = 0
    def rd(f):
        nonlocal o; v = struct.unpack_from(f, b, o); o += struct.calcsize(f); return v
    def rs():
        (n,) = rd("<Q"); nonlocal o; s = b[o:o+n].decode(); o += n; return s
    _, _, nt, nk = rd("<IIQQ")
    al = 32
    def skip(t):
        nonlocal o
        if t == 8: rs(); return
        if t == 9:
            (et,) = rd("<I"); (n,) = rd("<Q")
            for _ in range(n): skip(et)
            return
        o += {0:1,1:1,2:2,3:2,4:4,5:4,6:4,7:1,10:8,11:8,12:8}[t]
    for _ in range(nk):
        k = rs(); (t,) = rd("<I"); skip(t)
    T = []
    for _ in range(nt):
        n = rs(); (nd,) = rd("<I"); dims = rd("<" + "Q"*nd); tt, off = rd("<IQ"); T.append((n, dims, tt, off))
    ds = (o + al - 1)//al*al
    out = {}
    for n, dims, tt, off in T:
        cnt = 1
        for d in dims: cnt *= d
        sz = cnt * {0:4,24:1}[tt]
        out[n] = b[ds+off: ds+off+sz]
    return out
a = parse(sys.argv[1]); b = parse(sys.argv[2])
for n, v in a.items():
    h = hashlib.sha256(v).hexdigest()[:16]
    m = [k for k, w in b.items() if w == v]
    print(n, len(v), h, "equal_to:", m)
