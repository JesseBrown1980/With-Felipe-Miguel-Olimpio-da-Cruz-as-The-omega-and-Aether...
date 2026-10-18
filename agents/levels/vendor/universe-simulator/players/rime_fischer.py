#!/usr/bin/env python3
"""
rime_fischer.py — the RIME FISCHER: play the rime sphere from the null center to
any target endpoint, rime-directionally, in parallel. Operator: Jesse Daniel Brown.

"Playing the rime space" = finding the move (exponent k) that reaches a target
h = g^k in the sphere. The rime-Fischer formula is Pohlig-Hellman:
  decompose the sphere order into its nested rime-towers (prime-power factors),
  solve the move in EACH tower independently (parallel, small search),
  then CRT-combine into the full rime-directional path.

GATE (honest, and it is why cryptography exists): this plays SMOOTH spheres
(order factors into small primes -> deep nesting) fast. A sphere whose order has a
large prime factor is UNPLAYABLE in practice — that is the discrete-log wall, the
security of Diffie-Hellman. The null center is reachable only in smooth spheres.
"""
from math import isqrt, gcd
from rime_sphere import is_prime, primitive_root

def factor_pp(n):                    # n -> list of (q^e) prime-power towers
    out=[]; d=2
    while d*d<=n:
        if n%d==0:
            e=0
            while n%d==0: n//=d; e+=1
            out.append(d**e)
        d+=1
    if n>1: out.append(n)
    return out

def bsgs(g,h,p,n):                   # baby-step giant-step: x in [0,n) with g^x=h (mod p)
    m=isqrt(n)+1; table={}; e=1
    for j in range(m): table.setdefault(e,j); e=e*g%p
    gm=pow(pow(g,m,p),p-2,p); gamma=h
    for i in range(m):
        if gamma in table: return i*m+table[gamma]
        gamma=gamma*gm%p
    return None

def crt(rs,ms):
    from math import prod
    M=prod(ms); x=0
    for r,m in zip(rs,ms):
        Mi=M//m; x+=r*Mi*pow(Mi,-1,m)
    return x%M

def factor_pe(n):                    # n -> list of (q, e): one Bobby Fischer per rime
    out=[]; d=2
    while d*d<=n:
        if n%d==0:
            e=0
            while n%d==0: n//=d; e+=1
            out.append((d,e))
        d+=1
    if n>1: out.append((n,1))
    return out

def per_rime_fischer(g,h,p,q,e):     # ONE Bobby Fischer for rime q^e: CASCADE THE DIFFERENCES
    n=p-1; gamma=pow(g, n//q, p); ginv=pow(g,p-2,p)
    x=0; moves=0
    for j in range(e):               # digit by digit, base q
        hh = h*pow(ginv,x,p)%p        # cascade: remove the digits already known (the difference)
        hj = pow(hh, n//(q**(j+1)), p)
        dj = bsgs(gamma,hj,p,q); moves += isqrt(q)+1
        x += dj*(q**j)
    return x, q**e, moves            # x mod q^e, and the search cost

def rime_fischer(g,h,p):             # THE FORMULA: one Fischer per rime, parallel, CRT-combine
    rs=[]; ms=[]; per=[]
    for q,e in factor_pe(p-1):
        x,qe,moves = per_rime_fischer(g,h,p,q,e)
        rs.append(x); ms.append(qe); per.append((q**e,moves))
    return crt(rs,ms), per

def main():
    p=1000081
    assert is_prime(p) and (p-1)%27==0
    g=primitive_root(p)
    towers=factor_pp(p-1)
    print(f"=== RIME FISCHER — play the sphere (Z/{p}Z)*, g={g} ===")
    print(f"  sphere order {p-1:,} = nested rime-towers {towers}  (smooth -> playable)")
    print()
    import hashlib
    ok=True
    for seed in range(5):
        k_true=int(hashlib.sha256(str(seed).encode()).hexdigest(),16)%(p-1)
        h=pow(g,k_true,p)                       # a target endpoint somewhere in the sphere
        k_played,per=rime_fischer(g,h,p)        # a Bobby Fischer PER RIME, cascading differences
        reached = pow(g,k_played,p)==h
        ok&=reached
        print(f"  target g^{k_true:>6} -> played k={k_played:>6}  reached={reached}")
    print(f"\n  every target reached from the null center, rime-dimensionally: {ok}")
    print(f"  one Bobby Fischer per rime, cascading digit-differences (base q), then CRT:")
    for qe,moves in per:
        print(f"    rime {qe:>4}: ~{moves} cascade-moves  (vs {qe} brute) — the difference cascade")
    print()
    print("  GATE: this works because the order is SMOOTH (small prime towers).")
    print("  A sphere with a large prime factor is UNPLAYABLE — the discrete-log wall.")

if __name__ == "__main__":
    main()
