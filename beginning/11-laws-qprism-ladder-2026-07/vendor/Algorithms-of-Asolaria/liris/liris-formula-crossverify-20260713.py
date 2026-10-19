#!/usr/bin/env python3
# LIRIS independent cross-verification of the 2026-07-13 Asolaria formula packs.
# Pure re-implementation from the formula statements (NOT a re-run of repo code).
# Deterministic: fixed seed. Emits pipe rows for the HBP receipt.
import hashlib, random, sys, math

random.seed(20260713)
OUT = []
def row(s): OUT.append(s); print(s)

def sha(b): return hashlib.sha256(b).hexdigest()

# ---------- modular linear algebra ----------
def rank_mod(rows, p):
    m = [r[:] for r in rows]; n = len(m); cols = len(m[0]); r = 0
    for c in range(cols):
        piv = next((i for i in range(r, n) if m[i][c] % p), None)
        if piv is None: continue
        m[r], m[piv] = m[piv], m[r]
        inv = pow(m[r][c], p - 2, p)
        m[r] = [(v * inv) % p for v in m[r]]
        for i in range(n):
            if i != r and m[i][c]:
                f = m[i][c]
                m[i] = [(a - f * b) % p for a, b in zip(m[i], m[r])]
        r += 1
        if r == n: break
    return r

def solve_mod(rows, ys, p, ncols):
    aug = [rows[i][:] + [ys[i]] for i in range(len(rows))]
    n = len(aug); r = 0; piv_cols = []
    for c in range(ncols):
        piv = next((i for i in range(r, n) if aug[i][c] % p), None)
        if piv is None: continue
        aug[r], aug[piv] = aug[piv], aug[r]
        inv = pow(aug[r][c], p - 2, p)
        aug[r] = [(v * inv) % p for v in aug[r]]
        for i in range(n):
            if i != r and aug[i][c]:
                f = aug[i][c]
                aug[i] = [(a - f * b) % p for a, b in zip(aug[i], aug[r])]
        piv_cols.append(c); r += 1
        if r == ncols: break
    if r < ncols: return None
    x = [0] * ncols
    for i, c in enumerate(piv_cols): x[c] = aug[i][ncols]
    return x

# ---------- 1. N-VANTAGE-30 ladder over F_257 ----------
p1 = 257; g = 3  # 3 is a primitive root mod 257
VANTAGES = 30; RAYS = 8; DIM = 60
nodes = {}  # (v,j) -> distinct nonzero node
k = 0
for v in range(VANTAGES):
    for j in range(RAYS):
        nodes[(v, j)] = pow(g, k, p1); k += 1  # 240 distinct powers of g (ord(g)=256)
assert len(set(nodes.values())) == 240
stripe = [random.randrange(p1) for _ in range(DIM)]  # random body stripe
def vrows(vs):
    rws, ys = [], []
    for v in vs:
        for j in range(RAYS):
            x = nodes[(v, j)]
            r_ = [pow(x, c, p1) for c in range(DIM)]
            rws.append(r_); ys.append(sum(a * b for a, b in zip(r_, stripe)) % p1)
    return rws, ys
ladder_ok = True
for kk in [1, 4, 7, 8]:
    rws, _ = vrows(list(range(kk)))
    rk = rank_mod(rws, p1)
    expect = min(8 * kk, DIM)
    ladder_ok &= (rk == expect)
    row(f"NV30LADDER|k={kk}|rows={8*kk}|rank={rk}|expected={expect}|nullity={DIM-rk}|match={int(rk==expect)}")
rec_ok = held_ok = True
for trial in range(5):
    vs = random.sample(range(VANTAGES), 8)
    rws, ys = vrows(vs)
    x = solve_mod(rws, ys, p1, DIM)
    rec_ok &= (x == stripe)
for trial in range(5):
    vs = random.sample(range(VANTAGES), 7)
    rws, _ = vrows(vs)
    held_ok &= (rank_mod(rws, p1) == 56)
row(f"NV30RECOVER|random_8of30_subsets=5|exact_recovery={int(rec_ok)}|random_7of30_subsets=5|held_rank56={int(held_ok)}")
# tamper: flip one redundant y with full 30 vantages, reproject
rws, ys = vrows(list(range(VANTAGES)))
x = solve_mod(rws[:DIM], ys[:DIM], p1, DIM)
ys_t = ys[:]; ys_t[200] = (ys_t[200] + 1) % p1
mism = sum(1 for i in range(len(rws)) if sum(a*b for a,b in zip(rws[i], x)) % p1 != ys_t[i])
row(f"NV30TAMPER|flipped_redundant_elements=1|reprojection_mismatches={mism}|held={int(mism>0)}")

# ---------- 2. N-LENS-20 zero-mirror over F_65537 ----------
p2 = 65537; g2 = 3  # 3 is a primitive root mod 65537
LENSES = 20; PER = 3
sel = [random.randrange(p2) for _ in range(DIM)]
lnodes = [pow(g2, 7 * i + 1, p2) for i in range(LENSES * PER)]
assert len(set(lnodes)) == 60
def lrows(kk):
    rws, ys = [], []
    for i in range(kk * PER):
        x = lnodes[i]
        r_ = [pow(x, c, p2) for c in range(DIM)]
        rws.append(r_); ys.append(sum(a * b for a, b in zip(r_, sel)) % p2)
    return rws, ys
nullity_path = []
for kk in [1, 7, 13, 19, 20]:
    rws, _ = lrows(kk)
    rk = rank_mod(rws, p2)
    nullity_path.append((kk, DIM - rk))
row("NL20NULLITY|" + "|".join(f"k{a}_nullity={b}" for a, b in nullity_path) + f"|contract_57_to_0={int(nullity_path[0][1]==57 and nullity_path[-1][1]==0)}")
rws, ys = lrows(20)
xr = solve_mod(rws, ys, p2, DIM)
reproj = sum(1 for i in range(60) if sum(a*b for a,b in zip(rws[i], xr)) % p2 != ys[i])
row(f"NL20RECOVER|recovered_eq_source={int(xr==sel)}|reprojection_mismatch={reproj}of60")
# four invertible lights: identity, reverse, affine, permute
lights_ok = True
perm = list(range(DIM)); random.shuffle(perm)
a_, b_ = 12345, 6789
transforms = [lambda v: v[:], lambda v: v[::-1], lambda v: [(a_*t + b_) % p2 for t in v], lambda v: [v[perm[i]] for i in range(DIM)]]
inverses = [lambda v: v[:], lambda v: v[::-1], lambda v: [((t - b_) * pow(a_, p2-2, p2)) % p2 for t in v],
            lambda v: [v[perm.index(i)] for i in range(DIM)]]
for T, Ti in zip(transforms, inverses):
    tsel = T(sel)
    tys = [sum(a*b for a,b in zip(rws[i], tsel)) % p2 for i in range(60)]
    xt = solve_mod(rws, tys, p2, DIM)
    lights_ok &= (Ti(xt) == sel)
row(f"NL20FOURLIGHT|lights=identity+reverse+affine+permute|all_recover_canonical={int(lights_ok)}")

# ---------- 3. CRT arithmetic comb ----------
q1, q2 = 33554467, 33554473  # liris-chosen ~25-bit coprimes (gcd checked)
assert math.gcd(q1, q2) == 1 and q1 * q2 >= 2**48
crt_ok = True
for _ in range(50000):
    xv = random.getrandbits(48)
    s1, s2 = xv % q1, xv % q2
    # CRT reconstruction
    m1 = pow(q1, -1, q2)
    xrec = (s1 + q1 * ((s2 - s1) * m1 % q2)) % (q1 * q2)
    crt_ok &= (xrec == xv)
margin = math.log2(q1 * q2) - 48
row(f"CRTCOMB|blocks=50000|bits=48|liris_moduli={q1}+{q2}|exact={int(crt_ok)}|joint_margin_bits={margin:.6f}|single_shadow_max_bits={math.log2(q1):.7f}")

# ---------- 4. E100 address bound ----------
b33, b34 = 1024**33, 1024**34
e100_bound = (b33 < 10**100 <= b34)
e100_pow = (1024**60 == 2**600)
lg = 600 * math.log10(2)
e_ok = True
for _ in range(100000):
    n = random.randrange(10**100)
    glyphs = []
    t = n
    for _ in range(34): glyphs.append(t & 1023); t >>= 10
    back = 0
    for gl in reversed(glyphs): back = (back << 10) | gl
    e_ok &= (back == n)
row(f"E100|bound_1024e33_lt_10e100_le_1024e34={int(e100_bound)}|1024e60_eq_2e600={int(e100_pow)}|log10_1024e60={lg:.12f}|ints=100000|glyphs=34|exact={int(e_ok)}")

# ---------- 5. BEHCS-1024 bijection at liris scale (1MB real local bytes) ----------
src_path = sys.argv[1]
data = open(src_path, 'rb').read(1_000_000)
n_bytes = len(data)
sha_in = sha(data)
# pack 8-bit stream -> 10-bit glyphs (orig_len framed)
glyphs = []; buf = 0; bits = 0
for byte in data:
    buf = (buf << 8) | byte; bits += 8
    while bits >= 10:
        bits -= 10
        glyphs.append((buf >> bits) & 1023)
if bits: glyphs.append((buf << (10 - bits)) & 1023)
# unpack
out = bytearray(); buf = 0; bits = 0
for gl in glyphs:
    buf = (buf << 10) | gl; bits += 10
    while bits >= 8 and len(out) < n_bytes:
        bits -= 8
        out.append((buf >> bits) & 255)
sha_out = sha(bytes(out))
rate = (len(glyphs) * 10) / (n_bytes * 8)
row(f"BEHCS1024|src_bytes={n_bytes}|src_sha={sha_in[:16]}|glyphs={len(glyphs)}|readback_sha_match={int(sha_out==sha_in)}|bit_rate={rate:.6f}|law=bijection_0_loss_not_compression")

print("ALL-DONE")
