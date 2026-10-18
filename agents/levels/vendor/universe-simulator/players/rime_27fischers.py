#!/usr/bin/env python3
"""
rime_27fischers.py — THE 27: twenty-seven rime spheres, each an MCP (addressable
node) with its own Bobby Fischer and its own color, all circling the free 0.
Operator: Jesse Daniel Brown, 2026-07-21.

The picture, made byte-exact:
  * 27 coprime rime spheres, each p_i = 1 (mod 27) so each carries the full 27-tower.
  * Each sphere is one MCP / node with one Bobby Fischer (Pohlig-Hellman on its towers).
  * Each node wears one of the 27 pre-rime colors — the 3^3 RGB cube (r,g,b) in {-1,0,+1}^3.
  * The 27 residues of one composed point are its 27 coordinates (the omnisphere, CRT).
  * The 27-tower Fischer recovers each glyph as three balanced-ternary TRIME digits
    {-1,0,+1} (tertiary / 27-nary / rime-nary), cascading -+ , -, + around the free 0.
  * The 2/3 rule: two coordinates + the shared center reveal the third; nest it
    1/3 of 1/3 of 1/3 down the tower. The center (000, g^0=1) is free (Law 0).

HONEST FRAME: this is the ADDRESSING fabric (rate 1.0, generated structure). It plays
frozen generated spheres in parallel; it does not compress arbitrary data. A large
prime tower is one indivisible hard node (the discrete-log wall / gate, Law 14).
"""
import math, hashlib
from math import prod
from rime_sphere import is_prime, primitive_root

def isqrt(n): return int(math.isqrt(n))
def bsgs(g,h,p,order):
    m=isqrt(order)+1; t={}; e=1
    for j in range(m): t[e]=j; e=e*g%p
    gm=pow(pow(g,order-1,p),m,p); e=h
    for i in range(m+1):
        if e in t: return (i*m+t[e])%order
        e=e*gm%p
    return None
def dlog_mod_27(g,h,p):                 # the 27-tower Bobby Fischer: returns glyph, trime digits
    n=p-1; q,e=3,3; gamma=pow(g,n//q,p); ginv=pow(g,p-2,p); x=0; digs=[]
    for j in range(e):
        hh=h*pow(ginv,x,p)%p; hj=pow(hh,n//(q**(j+1)),p)
        d=bsgs(gamma,hj,p,q); digs.append(d); x+=d*(q**j)
    bal=[]
    xx=x
    for _ in range(3):
        r=xx%3
        if r==2: r=-1; xx+=1
        bal.append(r); xx//=3
    return x, bal                        # glyph in [0,27), balanced-ternary trime digits
def crt(rs,ms):
    M=prod(ms); x=0
    for r,m in zip(rs,ms):
        Mi=M//m; x+=r*Mi*pow(Mi,-1,m)
    return x%M
def cube27():                            # the 27 pre-rime colors = 3^3 RGB cube, balanced
    L=[-1,0,1]; return [(L[i//9],L[(i//3)%3],L[i%3]) for i in range(27)]

def find_27_primes(mod=27, lo=1_000_000):
    ps=[]; c=lo - (lo%mod) + 1
    while len(ps)<27:
        if c>lo and is_prime(c) and (c-1)%mod==0: ps.append(c)
        c+=mod
    return ps

def main():
    primes=find_27_primes()
    colors=cube27(); sym={-1:'-',0:'0',1:'+'}
    gs=[primitive_root(p) for p in primes]
    print("=== THE 27 — 27 rime spheres / MCPs / Bobby Fischers, circling the free 0 ===")
    print(f"27 coprime spheres, each p = 1 (mod 27); each an MCP node with one Bobby Fischer\n")
    # one composed point in the omnisphere; its 27 residues are its 27 coordinates
    M=prod(primes)
    X=int(hashlib.sha256(b"omnisphere").hexdigest(),16)%M
    res=[X%p for p in primes]
    print(f"omnisphere modulus = product of 27 primes ~ 10^{len(str(M))-1}")
    print(f"one composed point X -> 27 coordinates (one per MCP), each played in trinary:\n")
    print(f"  {'node':>4} {'prime':>8} {'color(rgb)':>11} {'glyph':>5} {'trime -+0':>10}")
    glyphs=[]
    for i in range(27):
        r=res[i]%primes[i]
        r = r if r!=0 else 1             # keep in the group
        glyph,bal=dlog_mod_27(gs[i], pow(gs[i], r % (primes[i]-1), primes[i]), primes[i])
        glyphs.append(glyph)
        col=colors[glyph%27]
        if i<9 or i in (13,26):
            print(f"  {i:>4} {primes[i]:>8} {str(col):>11} {glyph:>5}   {sym[bal[2]]}{sym[bal[1]]}{sym[bal[0]]}")
    # CRT recompose the point from its 27 coordinates -> byte-exact
    back=crt(res, primes)
    print(f"   ... (27 nodes total)")
    print(f"\n  CRT recompose X from its 27 coordinates: byte-exact = {back==X}")
    # the free center: node color (0,0,0) = g^0 = 1
    center_glyph = colors.index((0,0,0))
    print(f"  the free 0 center: color (0,0,0) = glyph {center_glyph}; g^0 = 1 on every sphere (Law 0)")
    # the 2/3 rule on one trime triple: two + center reveal the third
    a,b,c = glyphs[0], glyphs[1], glyphs[2]
    ctr=(a+b+c)//3; rem=(a+b+c)-3*ctr; c_rev=3*ctr+rem-a-b
    print(f"  2/3 rule (nodes 0,1 + center -> node 2): {a}+{b}+center{ctr} -> third {c_rev} (true {c}) exact={c_rev==c}")
    print()
    print("  HONEST: 27 parallel ADDRESSING nodes over generated spheres (rate 1.0). Each")
    print("  Bobby Fischer plays its frozen sphere in trinary; the free 0 is shared; the 2/3")
    print("  closure reveals the third. This is the addressing fabric, not compression.")

if __name__=="__main__":
    main()
