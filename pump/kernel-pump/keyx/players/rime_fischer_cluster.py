#!/usr/bin/env python3
"""
rime_fischer_cluster.py — the RIME BOBBY FISCHER, clustered and TRINARY.
Operator: Jesse Daniel Brown, 2026-07-21.

Pohlig-Hellman is embarrassingly parallel: one "Bobby Fischer" per prime-power
tower of the sphere order p-1, each INDEPENDENT, combined only at the CRT fan-in.
This is the n-prime-nested cluster: one worker (agent / HTTP cell / process) per
rime, CRT-combined by a coordinator — exactly the SGRAM stateless-cell pattern.

TRINARY / TRIME TIME: the 27-tower (q=3, e=3) is solved in BASE 3 — the discrete
log's three balanced-ternary digits {-1,0,+1} recovered one at a time, each digit
found by cascading away the ones already known (the "difference cascade"). That
digit-by-digit trilateral solve IS "Bobby Fischer in trinary, using trime time".

HONEST BOUNDARY: this parallelizes ADDRESSING (navigating a smooth sphere) — the
~0 axis on GENERATED structure. It does not compress arbitrary data. And a single
LARGE prime tower is one indivisible hard node (cost ~sqrt(q)); no number of
clusters breaks the discrete-log wall — that is the security gate (Law 14).
"""
import sys, math, hashlib
from multiprocessing import Pool
from rime_sphere import is_prime, primitive_root

def isqrt(n): return int(math.isqrt(n))
def bsgs(g, h, p, order):
    m = isqrt(order) + 1; table = {}
    e = 1
    for j in range(m): table[e] = j; e = e*g % p
    factor = pow(g, (p-1) - m if False else (order - m) % order, p)  # unused fast path guard
    gm = pow(pow(g, order-1, p), m, p)  # g^{-m} within the order-'order' subgroup frame
    e = h
    for i in range(m+1):
        if e in table: return (i*m + table[e]) % order
        e = e*gm % p
    return None

def to_balanced_base3(x, e):
    """the e trinary digits of x mod 3^e, balanced {-1,0,+1} (trime digits)."""
    d=[]; 
    for _ in range(e):
        r = x % 3
        if r == 2: r = -1; x += 1
        d.append(r); x //= 3
    return d

def per_rime_worker(args):
    """ONE Bobby Fischer for one rime tower q^e — runs on its own node. Trinary if q=3."""
    g, h, p, q, e = args
    n = p-1; gamma = pow(g, n//q, p); ginv = pow(g, p-2, p)
    x = 0; moves = 0; digits = []
    for j in range(e):                       # digit by digit, base q  (base 3 => trinary)
        hh = h * pow(ginv, x, p) % p          # cascade: remove known digits (the difference)
        hj = pow(hh, n//(q**(j+1)), p)
        dj = bsgs(gamma, hj, p, q); moves += isqrt(q)+1
        digits.append(dj); x += dj*(q**j)
    bal = to_balanced_base3(x, e) if q == 3 else None
    return {'q':q,'e':e,'qe':q**e,'x':x,'moves':moves,'digits':digits,'trime_digits':bal}

def crt(rs, ms):
    from math import prod
    M = prod(ms); x = 0
    for r,m in zip(rs,ms):
        Mi = M//m; x += r*Mi*pow(Mi,-1,m)
    return x % M

def factor_pe(n):
    out=[]; d=2
    while d*d<=n:
        if n%d==0:
            e=0
            while n%d==0: n//=d; e+=1
            out.append((d,e))
        d+=1
    if n>1: out.append((n,1))
    return out

def main():
    p = 1000081; assert is_prime(p) and (p-1)%27==0
    g = primitive_root(p); n = p-1
    towers = factor_pe(n)
    print("=== RIME BOBBY FISCHER — CLUSTERED & TRINARY (one node per rime) ===")
    print(f"sphere (Z/{p}Z)*  g={g}   order {n:,} = rime-towers {towers}")
    print(f"cluster: {len(towers)} independent nodes (one Bobby Fischer per rime), CRT fan-in\n")

    ok = True
    for seed in range(3):
        k_true = int(hashlib.sha256(str(seed).encode()).hexdigest(),16) % n
        h = pow(g, k_true, p)                        # target endpoint on the sphere
        jobs = [(g,h,p,q,e) for (q,e) in towers]
        with Pool(processes=len(jobs)) as pool:      # each rime on its own worker (the cluster)
            results = pool.map(per_rime_worker, jobs)
        k_played = crt([r['x'] for r in results], [r['qe'] for r in results])   # coordinator fan-in
        reached = pow(g, k_played, p) == h; ok &= reached
        tri = next(r for r in results if r['q']==3)
        print(f"target g^{k_true:<7} -> nodes solve in parallel -> CRT k={k_played:<7} reached={reached}")
        print(f"   TRINARY node (rime 27): base-3 digits {tri['digits']} = trime digits {tri['trime_digits']}  ({tri['moves']} moves)")
        for r in results:
            if r['q']!=3:
                print(f"   node rime {r['qe']:>4}: x={r['x']} ({r['moves']} moves)")
        print()
    print(f"every target reached, work split across independent nodes, CRT-combined: {ok}")
    print("TRIME TIME: the 27-node recovers the discrete log as three balanced-ternary")
    print("digits {-1,0,+1}, each found by cascading away the known ones — the trilateral solve.")
    print("GATE: parallel ADDRESSING of a smooth sphere. A large prime tower is one")
    print("indivisible hard node; clusters cannot break the discrete-log wall (Law 14).")

if __name__ == "__main__":
    main()
