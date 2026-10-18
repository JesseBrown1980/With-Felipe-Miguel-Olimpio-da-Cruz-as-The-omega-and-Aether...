"""Independent integer recheck of callingchain.rs section 1-2 (genus of spheres tubed along a graph).

Usage: python3 -I check_genus.py
For every configuration the record prints, builds an explicit cell complex of the
surface (spheres with holes plus one annulus per edge), forms the integer boundary
matrices, and gets the Betti numbers from exact ranks. Genus = b1 / 2 when b0 = b2 = 1.
Integers and fractions only.
"""
import sys
from fractions import Fraction

out = []
fails = []


def say(s=""):
    out.append(s)


def rank(rows, ncols):
    m = [[Fraction(x) for x in r] for r in rows]
    r = 0
    for c in range(ncols):
        piv = None
        for i in range(r, len(m)):
            if m[i][c] != 0:
                piv = i
                break
        if piv is None:
            continue
        m[r], m[piv] = m[piv], m[r]
        for i in range(len(m)):
            if i != r and m[i][c] != 0:
                f = m[i][c] / m[r][c]
                m[i] = [a - f * b for a, b in zip(m[i], m[r])]
        r += 1
    return r


def surface_betti(nv, edges):
    """Cell complex of S(G). Returns (b0, b1, b2, chi)."""
    holes = {v: [] for v in range(nv)}
    ends = []
    for (a, b) in edges:
        ha = len(holes[a])
        holes[a].append(None)
        hb = len(holes[b])
        holes[b].append(None)
        ends.append(((a, ha), (b, hb)))
    vtx = {}
    edg = {}
    cells2 = []

    def v_id(key):
        if key not in vtx:
            vtx[key] = len(vtx)
        return vtx[key]

    def e_id(key, tail, head):
        if key not in edg:
            edg[key] = (len(edg), tail, head)
        return edg[key][0]

    for v in range(nv):
        d = len(holes[v])
        if d == 0:
            v_id(("pt", v))
            cells2.append([])  # sphere: one 2-cell, constant attaching map
            continue
        for i in range(d):
            x = v_id(("x", v, i))
            e_id(("b", v, i), x, x)
        for i in range(1, d):
            e_id(("a", v, i), vtx[("x", v, 0)], vtx[("x", v, i)])
        word = [(("b", v, 0), 1)]
        for i in range(1, d):
            word += [(("a", v, i), 1), (("b", v, i), 1), (("a", v, i), -1)]
        cells2.append(word)
    for k, ((a, ha), (b, hb)) in enumerate(ends):
        e_id(("s", k), vtx[("x", a, ha)], vtx[("x", b, hb)])
        cells2.append([(("b", a, ha), -1), (("s", k), 1), (("b", b, hb), -1), (("s", k), -1)])
    nV, nE, nF = len(vtx), len(edg), len(cells2)
    d1 = []
    for key, (idx, tail, head) in sorted(edg.items(), key=lambda t: t[1][0]):
        col = [0] * nV
        col[head] += 1
        col[tail] -= 1
        d1.append(col)
    d2 = []
    for word in cells2:
        col = [0] * nE
        for key, sgn in word:
            col[edg[key][0]] += sgn
        d2.append(col)
    r1 = rank(d1, nV) if nE else 0
    r2 = rank(d2, nE) if nE else 0
    b0 = nV - r1
    b1 = (nE - r1) - r2
    b2 = nF - r2
    return b0, b1, b2, nV - nE + nF


def graph(kind):
    if kind == "theta":
        return 2, [(0, 1)] * 3
    if kind == "K4":
        return 4, [(i, j) for i in range(4) for j in range(i + 1, 4)]
    if kind == "K5":
        return 5, [(i, j) for i in range(5) for j in range(i + 1, 5)]
    if kind == "Q3":
        return 8, [(i, i ^ (1 << b)) for i in range(8) for b in range(3) if i < i ^ (1 << b)]
    if kind == "cycle":
        return None
    raise ValueError(kind)


def cycle(n):
    if n == 2:
        return 2, [(0, 1), (0, 1)]
    return n, [(i, (i + 1) % n) for i in range(n)]


def hex_prism():
    e = [(i, (i + 1) % 6) for i in range(6)] + [(6 + i, 6 + (i + 1) % 6) for i in range(6)]
    e += [(i, 6 + i) for i in range(6)]
    return 12, e


def dodecahedron():
    # outer 5-cycle, middle 10-cycle, inner 5-cycle
    e = [(i, (i + 1) % 5) for i in range(5)]
    e += [(i, 5 + 2 * i) for i in range(5)]
    e += [(5 + i, 5 + (i + 1) % 10) for i in range(10)]
    e += [(6 + 2 * i, 15 + i) for i in range(5)]
    e += [(15 + i, 15 + (i + 1) % 5) for i in range(5)]
    return 20, e


def buckyball():
    ico = {v: set() for v in range(12)}
    for i in range(5):
        up, upn, lo, lon = 1 + i, 1 + (i + 1) % 5, 6 + i, 6 + (i + 1) % 5
        for a, b in ((0, up), (up, upn), (lo, lon), (lo, 11), (up, lo), (upn, lo)):
            ico[a].add(b)
            ico[b].add(a)
    darts = sorted((u, v) for u in ico for v in ico[u])
    idx = {d: i for i, d in enumerate(darts)}
    e = set()
    for (u, v) in darts:
        e.add(tuple(sorted((idx[(u, v)], idx[(v, u)]))))
        for w in ico[u] & ico[v]:
            e.add(tuple(sorted((idx[(u, v)], idx[(u, w)]))))
    return 60, sorted(e)


def main():
    say("[A] callingchain.rs 'known' table: genus from cellular homology, not from E - V + 1")
    known = [
        ("one sphere alone", (1, []), 0),
        ("two joined by one tube", (2, [(0, 1)]), 0),
        ("one sphere, one handle", (1, [(0, 0)]), 1),
        ("TWO TOUCHING IN A LOOP", cycle(2), 1),
        ("theta graph", graph("theta"), 2),
        ("tetrahedron K4", graph("K4"), 3),
        ("cube graph Q3", graph("Q3"), 5),
        ("complete graph K5", graph("K5"), 6),
    ]
    ladder = [
        ("ladder 1 hole / 0 callings", (1, []), 0),
        ("ladder 2 / 1", (2, [(0, 1)]), 0),
        ("ladder 2 / 2 doughnut", cycle(2), 1),
        ("ladder 3 / 3", cycle(3), 1),
        ("ladder 5 / 5", cycle(5), 1),
        ("ladder 12 / 12", cycle(12), 1),
        ("ladder 12 / 18 (hexagonal prism graph)", hex_prism(), 7),
        ("ladder 20 / 30 dodecahedral", dodecahedron(), 11),
        ("ladder 60 / 90 buckyball", buckyball(), 31),
    ]
    say("  %-40s %3s %3s  %-6s %-8s %-6s %-6s %s" % ("configuration", "V", "E", "record", "b0,b1,b2", "genus", "E-V+1", "match"))
    for name, (nv, edges), rec in known + ladder:
        b0, b1, b2, chi = surface_betti(nv, edges)
        ok_surface = b0 == 1 and b2 == 1 and b1 % 2 == 0
        g = b1 // 2
        formula = len(edges) - nv + 1
        ok = ok_surface and g == rec and formula == rec
        if not ok:
            fails.append(name)
        say("  %-40s %3d %3d  %-6d %-8s %-6d %-6d %s" % (name, nv, len(edges), rec, "%d,%d,%d" % (b0, b1, b2), g, formula, "1" if ok else "0"))

    say("")
    say("[B] the program's 'consistent(v, e)' test is an algebraic identity")
    taut = all(2 * v - 2 * e == 2 - 2 * (e - v + 1) for v in range(-50, 51) for e in range(-50, 51))
    say("  2V - 2E == 2 - 2(E - V + 1) for every integer V, E in [-50, 50]: %s" % taut)
    say("  so 'consistent' can never be false, and the 'expected genus' column equals E - V + 1;")
    say("  the table in callingchain.rs cannot fail. The independent check is [A] above.")
    if not taut:
        fails.append("tautology")

    say("")
    say("FAILS: %d %s" % (len(fails), fails))
    print("\n".join(out))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
