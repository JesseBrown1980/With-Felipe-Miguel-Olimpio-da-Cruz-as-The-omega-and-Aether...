"""Independent integer recheck: "the six" (icosahedral axes) and the buckyball counts.

Usage: python3 -I check_icosa_bucky.py
Builds the icosahedron and the truncated icosahedron (C60) graph from scratch,
enumerates every graph automorphism, separates rotations by face orientation,
and counts axes, faces, cycle rank and GF(2) rank of the face cycles. Integers only.
"""
import sys

out = []
fails = []


def say(s=""):
    out.append(s)


def check(label, record, mine):
    ok = record == mine
    say("  %-60s record=%-12s mine=%-12s %s" % (label, record, mine, "MATCH" if ok else "DIFF"))
    if not ok:
        fails.append(label)


def icosahedron():
    # 0 top, 1..5 upper ring, 6..10 lower ring, 11 bottom
    e = set()
    for i in range(5):
        up, upn = 1 + i, 1 + (i + 1) % 5
        lo, lon = 6 + i, 6 + (i + 1) % 5
        e |= {(0, up), (up, upn), (lo, lon), (lo, 11), (up, lo), (upn, lo)}
    adj = {v: set() for v in range(12)}
    for a, b in e:
        adj[a].add(b)
        adj[b].add(a)
    return adj


def triangles(adj):
    t = set()
    for a in adj:
        for b in adj[a]:
            for c in adj[a] & adj[b]:
                t.add(frozenset((a, b, c)))
    return [tuple(sorted(x)) for x in t]


def edges_of(adj):
    return sorted({(min(a, b), max(a, b)) for a in adj for b in adj[a]})


def automorphisms(adj):
    verts = sorted(adj)
    order = []
    seen = set()
    for s in verts:
        if s in seen:
            continue
        queue = [s]
        seen.add(s)
        while queue:
            x = queue.pop(0)
            order.append(x)
            for y in sorted(adj[x]):
                if y not in seen:
                    seen.add(y)
                    queue.append(y)
    result = []

    def extend(i, m, used):
        if i == len(order):
            result.append(dict(m))
            return
        x = order[i]
        mapped_nb = [y for y in adj[x] if y in m]
        if mapped_nb:
            cands = set(adj[m[mapped_nb[0]]])
            for y in mapped_nb[1:]:
                cands &= adj[m[y]]
        else:
            cands = set(verts)
        for c in sorted(cands):
            if c in used or len(adj[c]) != len(adj[x]):
                continue
            ok = True
            for y in adj[x]:
                if y in m and m[y] not in adj[c]:
                    ok = False
                    break
            if not ok:
                continue
            for y in m:
                if y not in adj[x] and m[y] in adj[c]:
                    ok = False
                    break
            if not ok:
                continue
            m[x] = c
            used.add(c)
            extend(i + 1, m, used)
            del m[x]
            used.discard(c)

    extend(0, {}, set())
    return result


def orient_faces(faces):
    """faces: list of vertex cycles (tuples). Returns consistently oriented cycles."""
    def darts(f):
        return {(f[i], f[(i + 1) % len(f)]) for i in range(len(f))}

    oriented = {0: tuple(faces[0])}
    edge_faces = {}
    for idx, f in enumerate(faces):
        for i in range(len(f)):
            key = frozenset((f[i], f[(i + 1) % len(f)]))
            edge_faces.setdefault(key, []).append(idx)
    queue = [0]
    while queue:
        fi = queue.pop(0)
        for (a, b) in darts(oriented[fi]):
            for fj in edge_faces[frozenset((a, b))]:
                if fj == fi or fj in oriented:
                    continue
                f = tuple(faces[fj])
                oriented[fj] = f if (b, a) in darts(f) else tuple(reversed(f))
                queue.append(fj)
    cyc = [oriented[i] for i in range(len(faces))]
    all_darts = [d for f in cyc for d in darts(f)]
    consistent = len(all_darts) == len(set(all_darts))
    return cyc, consistent


def is_rotation(sigma, oriented_faces):
    """True when sigma carries every oriented face onto an oriented face (not reversed)."""
    face_darts = set()
    for f in oriented_faces:
        face_darts.add(frozenset((f[i], f[(i + 1) % len(f)]) for i in range(len(f))))
    for f in oriented_faces:
        img = frozenset((sigma[f[i]], sigma[f[(i + 1) % len(f)]]) for i in range(len(f)))
        if img not in face_darts:
            return False
    return True


def perm_order(sigma):
    k = 1
    cur = dict(sigma)
    while any(cur[v] != v for v in cur):
        cur = {v: sigma[cur[v]] for v in cur}
        k += 1
    return k


def cyclic_subgroups(perms, n):
    subs = set()
    for s in perms:
        if perm_order(s) != n:
            continue
        powers = []
        cur = dict(s)
        for _ in range(n):
            powers.append(tuple(sorted(cur.items())))
            cur = {v: s[cur[v]] for v in cur}
        subs.add(frozenset(powers))
    return subs


def gf2_rank(vectors):
    basis = {}
    rank = 0
    for v in vectors:
        x = v
        while x:
            top = x.bit_length() - 1
            if top in basis:
                x ^= basis[top]
            else:
                basis[top] = x
                rank += 1
                break
    return rank


def face_cycles_c60(ico, tris):
    pent = []
    for u in sorted(ico):
        # walk the 5-cycle formed by u's neighbours
        nb = sorted(ico[u])
        cyc = [nb[0]]
        while len(cyc) < 5:
            nxt = [w for w in ico[cyc[-1]] & ico[u] if w not in cyc]
            cyc.append(sorted(nxt)[0])
        pent.append(tuple((u, v) for v in cyc))
    hexa = []
    for a, b, c in tris:
        hexa.append(((a, b), (b, a), (b, c), (c, b), (c, a), (a, c)))
    return pent, hexa


def main():
    ico = icosahedron()
    tris = triangles(ico)
    say("[A] icosahedron built combinatorially")
    check("vertices", 12, len(ico))
    check("edges", 30, len(edges_of(ico)))
    check("all degrees 5", True, all(len(ico[v]) == 5 for v in ico))
    check("triangles", 20, len(tris))

    say("")
    say("[B] the six: every automorphism enumerated, rotations kept by face orientation")
    auts = automorphisms(ico)
    tri_cycles, ok = orient_faces([list(t) for t in tris])
    check("triangle orientation consistent (orientable)", True, ok)
    check("|Aut(icosahedron graph)| = |Ih|", 120, len(auts))
    rots = [s for s in auts if is_rotation(s, tri_cycles)]
    check("rotations |I|", 60, len(rots))
    by_order = {}
    for s in rots:
        by_order[perm_order(s)] = by_order.get(perm_order(s), 0) + 1
    say("    rotation element orders: %s" % dict(sorted(by_order.items())))
    ax5 = len(cyclic_subgroups(rots, 5))
    ax3 = len(cyclic_subgroups(rots, 3))
    ax2 = len(cyclic_subgroups(rots, 2))
    check("five-fold axes (cyclic subgroups of order 5)", 6, ax5)
    check("three-fold axes", 10, ax3)
    check("two-fold axes", 15, ax2)
    check("class equation 1 + 6*4 + 10*2 + 15*1", 60, 1 + ax5 * 4 + ax3 * 2 + ax2 * 1)
    sols = [(a, b, c) for a in range(0, 15) for b in range(0, 30) for c in range(0, 60)
            if 1 + 4 * a + 2 * b + c == 60]
    say("    non-negative (c5,c3,c2) with 1+4c5+2c3+c2 = 60: %d solutions; the program's" % len(sols))
    say("    sum check therefore cannot pick out (6,10,15) on its own")

    say("")
    say("[C] buckyball = truncated icosahedron, built as the 60 darts (u,v) of the icosahedron")
    verts = sorted((u, v) for u in ico for v in ico[u])
    adj = {x: set() for x in verts}
    for (u, v) in verts:
        adj[(u, v)].add((v, u))
        for w in ico[u] & ico[v]:
            adj[(u, v)].add((u, w))
    V = len(verts)
    E = len({frozenset((x, y)) for x in adj for y in adj[x]})
    pent, hexa = face_cycles_c60(ico, tris)
    faces = pent + hexa
    for f in faces:
        for i in range(len(f)):
            if f[(i + 1) % len(f)] not in adj[f[i]]:
                fails.append("face edge missing")
    F = len(faces)
    check("V", 60, V)
    check("E", 90, E)
    check("pentagons", 12, len(pent))
    check("hexagons", 20, len(hexa))
    check("F", 32, F)
    check("Euler V - E + F", 2, V - E + F)
    check("degree check: every degree 3 and 3V = 2E", True, all(len(adj[x]) == 3 for x in adj) and 3 * V == 2 * E)
    check("incidence 5P + 6H = 2E", 2 * E, 5 * len(pent) + 6 * len(hexa))
    every_edge_twice = {}
    for f in faces:
        for i in range(len(f)):
            k = frozenset((f[i], f[(i + 1) % len(f)]))
            every_edge_twice[k] = every_edge_twice.get(k, 0) + 1
    check("every edge on exactly two faces", True, set(every_edge_twice.values()) == {2} and len(every_edge_twice) == E)
    # connected components by union-find
    parent = {x: x for x in verts}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for x in adj:
        for y in adj[x]:
            parent[find(x)] = find(y)
    comps = len({find(x) for x in verts})
    check("connected components", 1, comps)
    check("cycle rank E - V + c", 31, E - V + comps)
    eidx = {k: i for i, k in enumerate(sorted(every_edge_twice, key=lambda s: tuple(sorted(s))))}
    vecs = []
    for f in faces:
        bits = 0
        for i in range(len(f)):
            bits ^= 1 << eidx[frozenset((f[i], f[(i + 1) % len(f)]))]
        vecs.append(bits)
    check("GF(2) rank of the 32 face cycles (= dim of cycle space)", 31, gf2_rank(vecs))
    say("    cycle space has 2**31 = %d elements; the 32 face cycles alone are 32 distinct" % (2 ** 31))
    say("    cycles, so 31 is a basis size (independent chains), not a count of distinct chains")
    # independence of the three checks
    say("    independence: (P,H)=(13,19) passes Euler (%d) but incidence gives %d != 180"
        % (60 - 90 + 13 + 19, 5 * 13 + 6 * 19))
    say("                  (P,H)=(0,30)  passes incidence (%d) but Euler gives %d != 2"
        % (5 * 0 + 6 * 30, 60 - 90 + 30))

    say("")
    say("[D] symmetry of the buckyball graph itself")
    c_auts = automorphisms(adj)
    check("|Aut(C60 graph)|", 120, len(c_auts))
    fcyc, ok = orient_faces([list(f) for f in faces])
    check("C60 face orientation consistent", True, ok)
    c_rots = [s for s in c_auts if is_rotation(s, fcyc)]
    check("C60 rotations", 60, len(c_rots))
    check("C60 five-fold axes", 6, len(cyclic_subgroups(c_rots, 5)))
    check("C60 three-fold axes", 10, len(cyclic_subgroups(c_rots, 3)))
    check("C60 two-fold axes", 15, len(cyclic_subgroups(c_rots, 2)))
    # each five-fold rotation fixes exactly two opposite pentagons (as sets)
    pent_sets = [frozenset(p) for p in pent]
    fixed_ok = True
    for sub in cyclic_subgroups(c_rots, 5):
        gen = dict(next(iter(sub)))
        if len(gen) == 0:
            continue
        g = [dict(t) for t in sub if any(a != b for a, b in t)][0]
        fixed = [p for p in pent_sets if frozenset(g[x] for x in p) == p]
        if len(fixed) != 2:
            fixed_ok = False
    check("each five-fold axis passes through exactly 2 pentagons", True, fixed_ok)
    say("    other sixes in the object: every hexagonal face has 6 edges (20 such faces)")

    say("")
    say("FAILS: %d %s" % (len(fails), fails[:10]))
    print("\n".join(out))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
