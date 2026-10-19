# Chain Topology of Merged Spheres

### Definitions, theorems, and step-by-step proofs

**Jesse Daniel Brown**

26 July 2026

---

### Contents

**0.** What this document is, and what it is not · **1.** Definitions · **2.** Statement of the theorems being claimed · **3.** Theorem 1 — Closure and non-collision · **4.** Theorem 2 — The three-distance theorem · **5.** Theorem 3 — The six · **6.** Theorem 4 — Cycle rank · **7.** Theorem 5 — The bridge · **8.** Proposition 6 — Density falls as the inverse square of the mass · **9.** What the literature already establishes about horizon topology · **10.** The conjecture — fenced · **11.** Computational verification · **12.** Summary of standing · **13.** References · **14.** Provenance

---

## 0. What this document is, and what it is not

A reviewer asked for four things: the actual mathematical derivation, the definitions, the theorem being claimed, and the proof step by step. This document is those four things and nothing else. Everything in it is stated in one of exactly three registers, and the register is marked every time:

**PROVED HERE.** A theorem with a complete proof written out below. These are statements of pure mathematics — finite group theory, combinatorics on the circle, algebraic graph theory, and the Euler characteristic of surfaces. They do not depend on any physical assumption, and if the physics in Section 9 is wrong they remain true.

**ESTABLISHED ELSEWHERE.** Results from the published literature, cited to a specific paper, used but not re-derived.

**CONJECTURE.** Claims that are neither proved here nor established elsewhere. Section 10 lists them, all of them, in one place, with what would have to happen for each to be believed.

The honest summary of the mathematical content is this: every theorem in Sections 3 through 8 is classical. None of them is new. Theorem 1 is elementary number theory with a standard knot-theoretic reading. Theorem 2 is the three-distance theorem, proved independently by Sós, Surányi and Świerczkowski between 1958 and 1959. Theorem 3 is the classical rotation group of the icosahedron. Theorem 4 is the first Betti number of a graph. Theorem 5 is the genus of the boundary of a handlebody neighbourhood. Proposition 6 is two lines of algebra.

What is offered as new is not any one of them. It is the observation in Theorem 5 and its corollary that two counts which arise in completely different parts of the construction — the number of independent closed circuits in a chain of merged objects, and the number of holes in the single surface those objects become — are not merely related, they are *the same integer*, forced by the Euler characteristic and not by any choice; and that for the sixty-vertex, ninety-edge chain this integer is 31, which is also the number of faces of that chain minus one. That is a synthesis of known results, not a new theorem, and it is presented as such.

Anyone who wants to check this document needs no special apparatus. Sections 3 through 8 can be verified with a pencil. Section 11 reports what happened when the same statements were checked by machine over twenty-one thousand instances.

---

## 1. Definitions

Throughout, `⌊x⌋` is the greatest integer not exceeding `x`, and `{x} = x − ⌊x⌋ ∈ [0,1)` is the fractional part. `ℤ/n` is the integers modulo `n`. `gcd` is the greatest common divisor. The circle is `ℝ/ℤ` with total length 1; *clockwise distance* from `x` to `y` means `{y − x}`.

**Definition 1.1 (Rime axes).** The *rime axes* are the ordered triple of moduli

    R = (R₁, R₂, R₃) = (2731, 1999, 1723).

Each `Rᵢ` is prime, and they are pairwise coprime. (Primality and coprimality are verified in Section 11.1; they are also immediate, since distinct primes are coprime.)

**Definition 1.2 (Glyph track).** Given a stride triple `s = (s₁, s₂, s₃) ∈ ℤ³`, the *glyph track* is the map

    T : ℤ → (ℤ/R₁) × (ℤ/R₂) × (ℤ/R₃),    T(k) = (k·s₁ mod R₁, k·s₂ mod R₂, k·s₃ mod R₃).

**Definition 1.3 (Closure period).** The *closure period* of the track is the least `L > 0` with `T(k + L) = T(k)` for all `k`. When every `sᵢ` is coprime to `Rᵢ`, Theorem 1(i) gives `L = lcm(R₁,R₂,R₃)`, and since the `Rᵢ` are pairwise coprime,

    L = R₁ · R₂ · R₃ = 2731 · 1999 · 1723 = 9,406,320,487.

**Definition 1.4 (Ring gaps).** Fix a modulus `R ≥ 2`, a stride `s` with `s mod R ≠ 0`, and `N ≥ 2`. Place the points `y_k = k·s mod R` for `k = 0,…,N−1` on a cycle of `R` positions. Delete duplicates, sort the survivors, and let the *gap multiset* `Γ(R,s,N)` be the multiset of cyclic differences between consecutive survivors (the last difference wrapping through `R`). The gaps are positive integers summing to `R`.

**Definition 1.5 (Chain graph).** A *chain graph* is a finite, connected multigraph `G = (V, E)` with no loops. `V` is a set of nodes ("holes", in the operator's usage — the individual objects), `E` a multiset of unordered pairs ("callings" — the joins between them). `deg(v)` is the number of edge-ends at `v`; the handshake lemma `Σ_{v∈V} deg(v) = 2|E|` will be used.

**Definition 1.6 (Sphere-chain surface).** Let `G = (V,E)` be a chain graph. For each `v ∈ V` take a copy `Σ_v` of the 2-sphere `S²`. On `Σ_v` choose `deg(v)` pairwise disjoint closed discs, one for each edge-end at `v`, and delete their interiors; call the result `Σ_v°`, a sphere with `deg(v)` boundary circles. For each edge `e = {u,v}` take a cylinder `C_e ≅ S¹ × [0,1]` and glue `S¹×{0}` homeomorphically to the boundary circle of `Σ_u°` assigned to that edge-end, and `S¹×{1}` to the corresponding circle of `Σ_v°`, choosing the gluing homeomorphisms so that fixed orientations of the spheres agree across every cylinder. The resulting space

    S(G) = ( ⨆_v Σ_v° ⊔ ⨆_e C_e ) / ~

is a closed, connected, orientable surface. It is the surface obtained by placing one sphere at every node of the chain and running one tube along every calling.

**Definition 1.7 (Buckyball chain).** The *buckyball chain* `B` is the graph of the truncated icosahedron: `|V| = 60`, `|E| = 90`, planar with `|F| = 32` faces (12 pentagons, 20 hexagons). Its rotation group is the icosahedral group `I` of Theorem 3.

---

## 2. Statement of the theorems being claimed

- **Theorem 1 (Closure and non-collision).** Stepping by `s` around a ring of `R` positions visits exactly `R/gcd(R,s)` distinct positions; two steps land together exactly when their indices agree modulo `R/gcd(R,s)`; the track covers the whole ring precisely when `gcd(R,s) = 1`. Equivalently, the `(R,s)` torus link has exactly `gcd(R,s)` components.
- **Theorem 2 (Three-distance theorem, weak and strong form).** `N` points obtained by repeated rotation cut the circle into arcs of at most three distinct lengths; and when exactly three lengths occur, the largest is the sum of the other two.
- **Theorem 3 (The six).** The rotation group of the icosahedron has order 60 and contains exactly six five-fold axes, ten three-fold axes and fifteen two-fold axes.
- **Theorem 4 (Cycle rank).** A connected graph has exactly `|E| − |V| + 1` independent closed circuits.
- **Theorem 5 (The bridge: genus of a sphere-chain).** The surface `S(G)` has genus `|E| − |V| + 1`. Hence the number of holes in the merged object equals the number of independent circuits in the chain — one integer, two readings.
- **Corollary 5.4 (The 31).** For the buckyball chain, that integer is 31.
- **Proposition 6 (Density).** The mass of a Schwarzschild black hole divided by the Euclidean volume of a ball of its own Schwarzschild radius is `3c⁶/(32πG³M²)`. It falls as the inverse square of the mass.

---

## 3. Theorem 1 — Closure and non-collision

> **PROVED HERE.** Classical; elementary number theory, plus the standard braid-closure reading in knot theory.

**Lemma 3.1.** Let `R ≥ 1`, `s ∈ ℤ`, `d = gcd(R,s)`. Then in `ℤ/R` the cyclic subgroups generated by `s` and by `d` coincide: `⟨s⟩ = ⟨d⟩`.

*Proof.* Since `d | s`, we have `s ∈ ⟨d⟩`, and therefore `⟨s⟩ ⊆ ⟨d⟩`. Conversely, by Bézout's identity there are integers `x, y` with `xR + ys = d`. Reducing modulo `R` gives `d ≡ ys (mod R)`, so `d ∈ ⟨s⟩`, and therefore `⟨d⟩ ⊆ ⟨s⟩`. The two inclusions give equality. ∎

**Lemma 3.2.** With `d = gcd(R,s)`, the subgroup `⟨d⟩ ≤ ℤ/R` has exactly `R/d` elements, namely `{0, d, 2d, …, (R/d − 1)d}`.

*Proof.* `d | R`, so write `R = d·m` with `m = R/d`. The listed elements are pairwise distinct modulo `R`, because if `id ≡ jd (mod R)` with `0 ≤ i < j ≤ m−1` then `R | (j−i)d`, i.e. `m | (j−i)`, impossible for `0 < j−i < m`. And `md = R ≡ 0`, so the list closes. Hence `|⟨d⟩| = m = R/d`. ∎

**Theorem 1.** Let `R ≥ 1`, `s ∈ ℤ`, `d = gcd(R,s)`, and `x_k = ks mod R`.

1. `x_j = x_k` if and only if `j ≡ k (mod R/d)`.
2. The set `{x_k : k ∈ ℤ}` has exactly `R/d` elements and equals the set of multiples of `d` in `ℤ/R`.
3. The track covers all of `ℤ/R` if and only if `d = 1`.
4. The `(R,s)` torus link — the closure of the braid `(σ₁σ₂⋯σ_{R−1})^s` on `R` strands — has exactly `d` components.

*Proof.*

**(1).** `x_j = x_k ⟺ (j−k)s ≡ 0 (mod R) ⟺ R | (j−k)s`. Write `R = d·(R/d)` and `s = d·(s/d)`, where `gcd(R/d, s/d) = 1`. Then `R | (j−k)s ⟺ d(R/d) | (j−k)d(s/d) ⟺ (R/d) | (j−k)(s/d)`. Since `R/d` and `s/d` are coprime, Euclid's lemma gives `(R/d) | (j−k)`. Conversely if `(R/d) | (j−k)` then `R = d(R/d)` divides `(j−k)d`, which divides `(j−k)s`. Hence `x_j = x_k ⟺ j ≡ k (mod R/d)`.

**(2).** The set `{x_k}` is the orbit of `0` under repeated addition of `s`, which is exactly the subgroup `⟨s⟩`. By Lemma 3.1 that subgroup is `⟨d⟩`, and by Lemma 3.2 it has `R/d` elements and consists of the multiples of `d`.

**(3).** By (2), the orbit is all of `ℤ/R` iff `R/d = R` iff `d = 1`.

**(4).** By definition, closing a braid on `R` strands joins strand endpoint `k` to endpoint `π(k)`, where `π` is the permutation the braid word induces on strands; the components of the closure are in bijection with the cycles of `π`. The braid `(σ₁σ₂⋯σ_{R−1})` is the full cyclic shift, inducing `k ↦ k+1 (mod R)`; therefore its `s`-th power induces `π(k) = k + s (mod R)`. The cycles of `π` are precisely the cosets of `⟨s⟩` in `ℤ/R`, of which there are `R/|⟨s⟩| = R/(R/d) = d`. Hence the link has `d` components. ∎

**Corollary 3.3 (the never-touch condition).** A single glyph track closes into one strand, visiting every position exactly once before returning, if and only if the stride is coprime to the modulus. Coprimality *is* the non-collision condition; it is not a convenience.

**Corollary 3.4 (the rime axes).** `2731`, `1999` and `1723` are prime and pairwise coprime, so for any strides not divisible by the respective moduli the three tracks each close over their full ring, and the joint track of Definition 1.2 closes only after

    L = 2731 · 1999 · 1723 = 9,406,320,487 steps.

---

## 4. Theorem 2 — The three-distance theorem

> **PROVED HERE**, with a complete proof. **ESTABLISHED ELSEWHERE**: this is the Steinhaus conjecture, proved independently by V. T. Sós (1958), J. Surányi (1958) and S. Świerczkowski (1959). The proof below is a self-contained version of the standard argument. The strong form — that the largest gap is the sum of the other two — is part of the classical statement and is what makes the theorem a usable test rather than a coincidence.

**Setting.** Fix `α ∈ (0,1)` and `N ≥ 2`. Put `x_k = {kα}` for `k = 0,1,…,N−1`, and assume these `N` points are pairwise distinct. They cut the circle `ℝ/ℤ` into `N` arcs. For each `k`, write `rn(x_k)` for the first point of the set encountered travelling clockwise from `x_k`, and let the *gap at* `x_k` be the clockwise distance from `x_k` to `rn(x_k)`.

Because the points are distinct, the values `{kα}` for `k ∈ [1, N−1]` are distinct and nonzero, so there are unique indices

    p = the index in [1, N−1] minimising {kα},      a = {pα},
    q = the index in [1, N−1] maximising {kα},      b = 1 − {qα}.

So `a` is the smallest clockwise displacement achieved by any index in range, and `b` is the smallest anticlockwise displacement.

**Lemma 4.1.** `a + b ≤ 1`, with equality only when `N = 2`.

*Proof.* `a = min_{k} {kα} ≤ max_k {kα} = 1 − b`, hence `a + b ≤ 1`. Equality forces `min = max`, so the index range `[1,N−1]` is a single index, i.e. `N = 2`. ∎

For the rest of this section assume `N ≥ 3`, so `a + b < 1` and `p ≠ q`. (The case `N = 2` is trivial: two points, two arcs, at most two lengths.)

**Lemma 4.2.** `p + q ≥ N`.

*Proof.* Suppose instead `p + q ≤ N−1`. Since `p, q ≥ 1`, the index `p+q` lies in `[1, N−1]`, so `{(p+q)α}` is subject to both the minimality of `a` and the maximality of `1−b`. Now

    {(p+q)α} = { {pα} + {qα} } = { a + (1 − b) } = { 1 + (a − b) }.

*Case `a ≥ b`.* Then `1 + (a−b) ∈ [1, 2)`, so `{(p+q)α} = a − b`. Since `q ≥ 1`, the index `p+q ≠ p`, so by distinctness `{(p+q)α} ≠ a`, giving `a − b < a`. This contradicts the minimality of `a`.

*Case `a < b`.* Then `1 + (a−b) ∈ (0,1)`, so `{(p+q)α} = 1 − (b − a) > 1 − b`. This contradicts the maximality of `1 − b`.

Both cases are impossible, so `p + q ≥ N`. ∎

**Lemma 4.3 (the `a`-arcs).** If `0 ≤ k ≤ N−1−p`, then `rn(x_k) = x_{k+p}` and the gap at `x_k` is `a`.

*Proof.* The index `k+p` lies in `[0, N−1]`, so `x_{k+p}` is one of our points, and its clockwise distance from `x_k` is `{pα} = a`. It remains to show no point lies strictly inside the arc. Suppose `x_j` does, at clockwise distance `c` with `0 < c < a`.

*Case `j > k`.* Put `m = j − k ∈ [1, N−1]`. Then `{mα} = c < a`, contradicting the minimality of `a`.

*Case `j < k`.* Put `m = k − j ∈ [1, N−1]`. Travelling clockwise from `x_k` by `c` reaches `x_j`, so `{−mα} = c`, i.e. `{mα} = 1 − c`. Now consider the index `m + p`. Since `m ≤ k ≤ N−1−p`, we have `m + p ≤ N−1`, so `m+p ∈ [1, N−1]` and minimality applies to it. And

    {(m+p)α} = { (1 − c) + a } = { 1 + (a − c) } = a − c,

because `0 < a − c < a < 1` puts `1 + (a−c)` in `(1,2)`. So `{(m+p)α} = a − c < a`, contradicting the minimality of `a`.

Both cases are impossible. ∎

**Lemma 4.4 (the `b`-arcs).** If `q ≤ k ≤ N−1`, then `rn(x_k) = x_{k−q}` and the gap at `x_k` is `b`.

*Proof.* The index `k−q` lies in `[0, N−1]`, and the clockwise distance from `x_k` to `x_{k−q}` is `{−qα} = 1 − {qα} = b`. Suppose `x_j` lies strictly inside, at clockwise distance `c` with `0 < c < b`.

*Case `j < k`.* Put `m = k − j ∈ [1, N−1]`. Then `{−mα} = c`, so `{mα} = 1 − c > 1 − b`, contradicting the maximality of `1 − b`.

*Case `j > k`.* Put `m = j − k ∈ [1, N−1]`, so `{mα} = c`. Since `j ≤ N−1` and `k ≥ q`, we get `m ≤ N−1−k ≤ N−1−q`, hence `m + q ≤ N−1` and maximality applies at index `m+q`. And

    {(m+q)α} = { c + (1 − b) } = 1 − (b − c),

because `0 < c < b` puts `c + 1 − b` in `(1−b, 1) ⊂ (0,1)`. So `{(m+q)α} = 1 − (b−c) > 1 − b`, contradicting the maximality of `1 − b`.

Both cases are impossible. ∎

**Lemma 4.5 (the index bookkeeping).** The index sets `[0, N−1−p]` and `[q, N−1]` are disjoint, of sizes `N−p` and `N−q`; the remaining indices form `[N−p, q−1]`, of size `p + q − N ≥ 0`.

*Proof.* Disjointness is `N−1−p < q`, i.e. `p + q > N − 1`, i.e. `p + q ≥ N`, which is Lemma 4.2. The sizes are immediate. The complement of the two sets inside `[0, N−1]` is `[N−p, q−1]`, whose size is `(q−1) − (N−p) + 1 = p + q − N`, non-negative by Lemma 4.2. ∎

**Lemma 4.6 (the long arcs).** If `N−p ≤ k ≤ q−1`, then `rn(x_k) = x_{k+p−q}` and the gap at `x_k` is `a + b`.

*Proof.* First, the index is in range: `k ≥ N−p` gives `k+p−q ≥ N−q ≥ 1`, and `k ≤ q−1` gives `k+p−q ≤ p−1 ≤ N−2`. Next, the distance:

    {(p−q)α} = { a − (1 − b) } = { (a + b) − 1 } = a + b,

using `0 < a + b < 1` from Lemma 4.1. So `x_{k+p−q}` sits at clockwise distance exactly `a+b`. Now suppose some `x_j` lies strictly inside, at clockwise distance `c` with `0 < c < a + b`.

*Case `j > k`.* Put `m = j − k`, so `{mα} = c`. From `j ≤ N−1` and `k ≥ N−p` we get `m ≤ N−1−k ≤ p−1`, so `m ∈ [1, p−1] ⊆ [1, N−1]`. Minimality gives `c ≥ a`, and `m ≠ p` gives `c ≠ a`, so `c > a`. Now consider the index `p − m ∈ [1, p−1] ⊆ [1, N−1]`:

    {(p−m)α} = { a − c } = 1 − (c − a),

since `0 < c − a`. Maximality of `1 − b` gives `1 − (c−a) ≤ 1 − b`, that is `c ≥ a + b` — contradicting `c < a + b`.

*Case `j < k`.* Put `m = k − j`, so `{mα} = 1 − c`. From `k ≤ q−1` we get `m ≤ k ≤ q−1`, so `m ∈ [1, q−1] ⊆ [1, N−1]`. Maximality gives `1 − c ≤ 1 − b`, i.e. `c ≥ b`, and `m ≠ q` gives `c ≠ b`, so `c > b`. Now consider the index `q − m ∈ [1, q−1] ⊆ [1, N−1]`:

    {(q−m)α} = { (1 − b) − (1 − c) } = { c − b } = c − b,

since `0 < c − b < a < 1` (the upper bound because `c < a + b`). So `{(q−m)α} = c − b < a`, contradicting the minimality of `a`.

Both cases are impossible. ∎

**Theorem 2.** Let `α ∈ (0,1)` and `N ≥ 2`, with `x_0,…,x_{N−1}` pairwise distinct. Then the `N` arcs they cut the circle into have lengths given exactly by:

| gap length | number of arcs |
|---|---|
| `a` | `N − p` |
| `b` | `N − q` |
| `a + b` | `p + q − N` |

Consequently:

- **(weak form)** at most three distinct arc lengths occur;
- **(strong form)** if exactly three distinct lengths occur, the largest is the sum of the other two.

*Proof.* Lemmas 4.3, 4.4 and 4.6 determine the gap at every index, and Lemma 4.5 says the three index ranges partition `[0, N−1]` with the stated sizes. That is the table. Only the three values `a`, `b`, `a+b` occur, giving the weak form. If all three occur then all three multiplicities are positive; since `a, b > 0` the value `a+b` is strictly larger than each of `a` and `b`, so it is the largest, and it is their sum. That is the strong form. ∎

**Corollary 4.7 (a consistency identity).** The arc lengths sum to the circumference 1, so

    (N−p)a + (N−q)b + (p+q−N)(a+b) = q·a + p·b = 1.

This is an independent check on any implementation: it must hold exactly.

**Corollary 4.8 (the discrete form — what is actually computed).** Fix a modulus `R`, a stride `s` with `s mod R ≠ 0`, and let `d = gcd(R,s)`. For `N ≤ R/d`, the points `y_k = ks mod R` are distinct by Theorem 1(1), and applying Theorem 2 with `α = (s mod R)/R` and multiplying all lengths by `R` gives: the gap multiset `Γ(R,s,N)` of Definition 1.4 contains at most three distinct integer values, and when three occur the largest is the sum of the other two. For `N > R/d` the track has already closed, only `R/d` distinct points exist, they are the multiples of `d`, and every gap equals `d` — exactly one distinct gap.

**Remark 4.9.** Theorem 2 requires *no* coprimality. Theorem 1 does. They are separate results with separate hypotheses, and Section 11.3 reports a sweep deliberately designed to keep them separate: it includes composite moduli sharing factors with their strides, where Theorem 1's conclusion fails and Theorem 2's still holds.

---

## 5. Theorem 3 — The six

> **PROVED HERE.** Classical; the rotation groups of the Platonic solids.

**Theorem 3.** Let `I` be the group of rotations of ℝ³ carrying a regular icosahedron to itself. Then `|I| = 60`, and the non-identity elements of `I` are distributed over axes as follows: exactly **6** axes of order 5, exactly **10** axes of order 3, exactly **15** axes of order 2.

*Proof.* The icosahedron has `V = 12` vertices, `E = 30` edges, `F = 20` triangular faces (`V − E + F = 12 − 30 + 20 = 2`), and is centrally symmetric, so vertices, edge-midpoints and face-centres each come in antipodal pairs: 6, 15 and 10 pairs respectively.

*Order.* `I` acts transitively on the 20 faces, and the stabiliser of a face is the group of rotations about the axis through that face's centre preserving the triangle, which is cyclic of order 3. By orbit–stabiliser, `|I| = 20 · 3 = 60`.

*Axes.* Every non-identity rotation `g ∈ I` fixes a unique axis through the centre, meeting the surface in an antipodal pair of points. Each such point is fixed by `g`, and since `g` permutes the vertex/edge/face structure, a fixed point on the surface must be a vertex, an edge midpoint, or a face centre. So every non-identity element belongs to one of three families of axes.

- *Vertex axes.* 6 antipodal pairs. Five faces meet at each vertex, so the stabiliser of a vertex axis is cyclic of order 5, contributing 4 non-identity rotations per axis: `6 × 4 = 24` elements.
- *Face axes.* 10 antipodal pairs. Faces are triangles, so each such axis has stabiliser cyclic of order 3, contributing 2 non-identity rotations: `10 × 2 = 20` elements.
- *Edge axes.* 15 antipodal pairs. The rotation by π about an edge-midpoint axis preserves the solid, giving a cyclic group of order 2 and 1 non-identity rotation: `15 × 1 = 15` elements.

These families are disjoint (a vertex, an edge midpoint and a face centre of the icosahedron are never the same point of the surface), so the count of group elements is

    1 + 24 + 20 + 15 = 60 = |I|.

The count is exact, so no axis and no element has been missed, and the three families are precisely 6, 10 and 15 axes. ∎

**Corollary 5.1 (buckyball).** The truncated icosahedron of Definition 1.7 has the same rotation group `I`, since truncation is performed symmetrically about each vertex. Its 12 pentagonal faces sit on the 6 five-fold axes, its 20 hexagonal faces on the 10 three-fold axes. In particular the buckyball chain admits exactly **six** distinct five-fold axes of rotation — not five, not twelve.

**Remark 5.2.** `I ≅ A₅`, the alternating group on 5 letters, whose non-identity elements are 24 five-cycles, 20 three-cycles and 15 double transpositions — the same `24 / 20 / 15` split, arrived at independently. This is a cross-check on the proof, not a step in it.

---

## 6. Theorem 4 — Cycle rank

> **PROVED HERE.** Classical; this is the first Betti number of a graph.

Let `G = (V,E)` be a finite connected multigraph. Over the field `𝔽₂`, let `𝔽₂^E` be the space of edge subsets (symmetric difference as addition), `𝔽₂^V` the space of vertex subsets, and let the boundary map

    ∂ : 𝔽₂^E → 𝔽₂^V,    ∂(e) = u + v   for e = {u,v},

extend linearly. The *cycle space* is `Z(G) = ker ∂`: the edge sets in which every vertex has even degree, i.e. the edge-disjoint unions of closed circuits.

**Theorem 4.** `dim Z(G) = |E| − |V| + 1`.

*Proof.* By rank–nullity, `dim ker ∂ = |E| − rank ∂`. It suffices to show `rank ∂ = |V| − 1`.

*Upper bound.* Let `W ⊆ 𝔽₂^V` be the subspace of even-size vertex subsets. Each generator `∂(e) = u+v` has size 2, hence lies in `W`; `W` is a subspace, so `im ∂ ⊆ W`. And `dim W = |V| − 1`, since `W` is the kernel of the surjective linear functional "size mod 2". Hence `rank ∂ ≤ |V| − 1`.

*Lower bound.* Fix a root `r ∈ V`. For any `u ≠ r`, connectedness gives a path `r = v₀, v₁, …, v_t = u`; summing the boundaries of its edges telescopes:

    ∂(v₀v₁) + ∂(v₁v₂) + ⋯ + ∂(v_{t−1}v_t) = v₀ + 2v₁ + ⋯ + 2v_{t−1} + v_t = r + u   (over 𝔽₂).

So every `r + u`, `u ≠ r`, lies in `im ∂`. These `|V| − 1` vectors are linearly independent (a vanishing 𝔽₂-sum of a nonempty subset of them has `u`-coordinate 1 for each `u` in the subset, hence is nonzero), and they span `W` (any even set `{u₁,…,u_{2m}}` equals `Σ_i (r + u_i)`, the `2m` copies of `r` cancelling). Hence `im ∂ = W` and `rank ∂ = |V| − 1`.

Therefore `dim Z(G) = |E| − (|V| − 1) = |E| − |V| + 1`. ∎

**Remark 6.1.** For a graph with `c` connected components the same argument gives `|E| − |V| + c`. Equivalently: `|E| − |V| + 1` is the number of edges outside any spanning tree, since a spanning tree has `|V| − 1` edges and each remaining edge closes exactly one independent circuit.

---

## 7. Theorem 5 — The bridge

> **PROVED HERE.** Classical in substance: `S(G)` is the boundary of a regular neighbourhood of `G` in ℝ³, a handlebody, and the genus of a handlebody equals the first Betti number of its spine. The proof below is self-contained and uses only the additivity of the Euler characteristic.

**Lemma 7.1.** `S(G)` of Definition 1.6 is a closed, connected, orientable surface.

*Proof.* It is a finite union of compact pieces glued along circles, hence compact; every point has a disc neighbourhood, since the gluings identify boundary circles of surfaces-with-boundary in pairs, hence it is a closed surface. It is connected because `G` is. It is orientable because the gluing homeomorphisms were chosen (Definition 1.6) to match fixed orientations across every cylinder; equivalently, `S(G)` embeds in ℝ³ as the boundary of a regular neighbourhood of any embedding of `G` in ℝ³, and every closed surface embedded in ℝ³ is orientable. ∎

**Lemma 7.2 (Euler characteristic of the pieces).**
`χ(S²) = 2`. Deleting the interior of one closed disc from a surface lowers `χ` by 1, so `χ(Σ_v°) = 2 − deg(v)`. And `χ(S¹ × [0,1]) = 0`.

*Proof.* `χ(S²) = 2` is standard (`V − E + F = 2` for any polyhedral subdivision). If `X = Y ∪ D` with `D` a closed disc meeting `Y` in the circle `∂D`, then by inclusion–exclusion `χ(X) = χ(Y) + χ(D) − χ(S¹) = χ(Y) + 1 − 0`, so removing the open disc lowers `χ` by 1. The cylinder deformation-retracts to a circle, and `χ` is a homotopy invariant, so `χ(S¹×[0,1]) = χ(S¹) = 0. ∎

**Theorem 5.** For any chain graph `G = (V,E)`,

    χ(S(G)) = 2|V| − 2|E|,     and     genus S(G) = |E| − |V| + 1.

*Proof.* `S(G)` is assembled from the pieces `Σ_v°` and `C_e`, glued along circles. Since `χ(S¹) = 0`, inclusion–exclusion along each gluing circle contributes nothing, and the Euler characteristics simply add:

    χ(S(G)) = Σ_{v∈V} χ(Σ_v°) + Σ_{e∈E} χ(C_e)
            = Σ_{v∈V} (2 − deg v) + Σ_{e∈E} 0
            = 2|V| − Σ_{v∈V} deg(v)
            = 2|V| − 2|E|,

the last step by the handshake lemma. By Lemma 7.1, `S(G)` is a closed connected orientable surface, so `χ(S(G)) = 2 − 2g` where `g` is its genus. Equating,

    2 − 2g = 2|V| − 2|E|   ⟹   g = |E| − |V| + 1. ∎

**Corollary 7.3 (the bridge).** For every chain graph `G`,

    genus S(G) = dim Z(G).

The number of holes in the merged surface and the number of independent closed circuits in the chain are the same integer. This is not a similarity of magnitude and not a modelling choice; both sides equal `|E| − |V| + 1` by Theorems 4 and 5, and the equality is forced by `χ = 2|V| − 2|E|`.

**Corollary 7.4 (the small cases, which is where the doughnut comes from).**

| chain `G` | `V` | `E` | `χ` | genus | shape of `S(G)` |
|---|---|---|---|---|---|
| one node, no edges | 1 | 0 | 2 | 0 | sphere |
| two nodes, one edge | 2 | 1 | 2 | 0 | sphere (they merge; no hole) |
| **two nodes, two parallel edges** | **2** | **2** | **0** | **1** | **torus — a doughnut** |
| triangle | 3 | 3 | 0 | 1 | torus |
| any cycle `C_n` | `n` | `n` | 0 | 1 | torus |
| theta graph | 2 | 3 | −2 | 2 | genus 2 |
| tetrahedron `K₄` | 4 | 6 | −4 | 3 | genus 3 |
| cube `Q₃` | 8 | 12 | −8 | 5 | genus 5 |
| `K₅` | 5 | 10 | −10 | 6 | genus 6 |
| **buckyball `B`** | **60** | **90** | **−60** | **31** | **genus 31** |

The third row is the one worth pausing on: *two spheres joined along a closed loop of two tubes are a torus.* That is not an analogy or a picture. It is the genus, computed. Every row of this table was checked against an independently known genus in Section 11.2.

**Corollary 7.5 (the 31, read three ways).** For the buckyball chain `B`:

1. **As circuits.** `dim Z(B) = 90 − 60 + 1 = 31` independent closed circuits (Theorem 4).
2. **As holes.** `genus S(B) = 90 − 60 + 1 = 31` holes in the merged surface (Theorem 5).
3. **As faces.** `B` is planar with `|F| = 32` faces (12 pentagons + 20 hexagons); Euler's formula `V − E + F = 2` gives `F = E − V + 2`, so the number of *bounded* faces is `F − 1 = 31`.

Three counts arrived at through three different routes — algebraic graph theory, surface topology, planar Euler — returning the same integer. Reading (3) is a genuine independent check: `12 + 20 = 32` was counted off the solid, not derived from `E − V + 1`.

---

## 8. Proposition 6 — Density falls as the inverse square of the mass

> **PROVED HERE** (the algebra). The convention being used is flagged explicitly below, because it is the part a physicist will want fenced.

**Definition 8.1.** For a Schwarzschild black hole of mass `M`, the Schwarzschild radius is `r_s = 2GM/c²`. Define the *nominal mean density*

    ρ(M) = M / ( (4/3)π r_s³ ).

**This is a bookkeeping quantity, not a local density.** The interior of a black hole is not a uniform fluid, and `(4/3)π r_s³` is the volume of a Euclidean ball of radius `r_s`, not the proper volume of any spatial slice inside the horizon. `ρ` is mass divided by that Euclidean volume, which is the standard convention behind the familiar remark that supermassive black holes have very low average density. No claim about interior structure is made or needed.

**Proposition 6.** `ρ(M) = 3c⁶ / (32 π G³ M²)`. In particular `ρ ∝ M⁻²`: **the more massive the hole, the lower its nominal mean density.**

*Proof.*

    (4/3)π r_s³ = (4/3)π (2GM/c²)³ = (4/3)π · 8G³M³/c⁶ = 32 π G³ M³ / (3c⁶).

Hence

    ρ(M) = M · 3c⁶ / (32 π G³ M³) = 3c⁶ / (32 π G³ M²).

The mass cancels once and reappears squared in the denominator. ∎

**Corollary 8.2 (the mass at a given density).** Inverting, a hole whose nominal mean density equals `ρ` has mass `M = c³ √(3/(32πG³ρ))`.

**Table 8.3 (computed at `G = 6.67430×10⁻¹¹`, `c = 2.99792458×10⁸`, `M_☉ = 1.98847×10³⁰` kg).**

| object | `M` (M_☉) | `r_s` | `ρ` (kg m⁻³) |
|---|---|---|---|
| stellar-mass hole | 10 | 29.5 km | 1.843 × 10¹⁷ |
| Cygnus X-1 class | 21 | 62.0 km | 4.179 × 10¹⁶ |
| GW150914 remnant | 62 | 183 km | 4.794 × 10¹⁵ |
| intermediate-mass | 10⁵ | 2.95 × 10⁵ km | 1.843 × 10⁹ |
| Sgr A* | 4.297 × 10⁶ | 1.269 × 10⁷ km | 9.981 × 10⁵ |
| **M87\*** | **6.5 × 10⁹** | **1.920 × 10¹⁰ km** | **0.4362** |

**Table 8.4 (read the other way).**

| a hole as dense as… | must weigh |
|---|---|
| nuclear matter, 2.3 × 10¹⁷ kg m⁻³ | 8.95 M_☉ |
| the Sun (mean), 1408 kg m⁻³ | 1.144 × 10⁸ M_☉ |
| liquid water, 1000 kg m⁻³ | 1.358 × 10⁸ M_☉ |
| **air at sea level, 1.225 kg m⁻³** | **3.879 × 10⁹ M_☉** |

M87\*, the hole the Event Horizon Telescope imaged, has a nominal mean density of **0.436 kg m⁻³ — lower than the density of air.** The very largest holes are the thinnest. Whatever else is or is not true, the direction is settled: mass up, nominal density down, exactly as `M⁻²`.

---

## 9. What the literature already establishes about horizon topology

> **ESTABLISHED ELSEWHERE.** Cited, not derived here. These results are what connect Section 7's pure topology to black holes at all. They also constrain it, and the constraints are stated as plainly as the support.

**9.1 — A stationary horizon in four dimensions must be a sphere.** Hawking's horizon topology theorem: the cross-sections of a stationary event horizon in 3+1 dimensions, under the dominant energy condition, are topologically `S²`. Consequence for this document: **in four dimensions a genus-`g` horizon with `g ≥ 1` cannot be a stationary end state.** Any doughnut is transient.

**9.2 — Merging horizons do pass through a toroidal phase.** Bohn, Kidder and Teukolsky, *Toroidal horizons in binary black hole mergers*, Phys. Rev. D **94**, 064009 (2016), arXiv:1606.00436, report the first numerical observation of the long-predicted transient toroidal event horizon in a binary black hole merger. This is the `V=2, E=2, genus 1` row of Corollary 7.4 occurring in a real simulation.

**9.3 — The caveat in that same paper, stated here so nobody has to find it.** The authors are explicit that the toroidal phase they find is foliation-dependent: the topology depends on the choice of time slicing, and the toroidal feature can be removed by an inverse coordinate transformation, so it satisfies topological censorship by construction. **This is a real limitation and it is not being hidden.** It means 9.2 does not by itself establish a slicing-independent doughnut.

**9.4 — In five dimensions the doughnut is permanent.** Emparan and Reall, *A rotating black ring solution in five dimensions*, Phys. Rev. Lett. **88**, 101101 (2002), arXiv:hep-th/0110260, exhibit a stationary, asymptotically flat five-dimensional vacuum solution whose horizon has topology `S¹ × S²` — a black ring. Adding one dimension changes the permissible stationary horizon topology. Hawking's theorem is a statement about four dimensions specifically.

**9.5 — What 9.1 through 9.4 do and do not license.** They establish that toroidal horizon topology is a real object of study in general relativity, transiently in 4D and stationarily in 5D. They do **not** establish that black holes form extended chains, that such chains persist, or that they take any particular combinatorial shape. Sections 3 to 8 are unconditional mathematics; Section 9 is cited physics; Section 10 is neither.

---

## 10. The conjecture — fenced

> **CONJECTURE. Nothing in this section is proved, and nothing in Sections 3 to 8 depends on it.** If every claim here is false, every theorem above is still true.

**C1 — Chain formation.** That real black holes stack into *calling chains*: that there is a physically meaningful graph whose nodes are horizons and whose edges are merger tubes, persisting long enough to be treated as a single object with a well-defined topology.

*Status:* unproved. *What would support it:* a slicing-independent characterisation of the merged horizon of three or more holes, and a demonstration that the toroidal phase of 9.2 generalises beyond two bodies. *What would kill it:* a proof that multi-body horizon merger topology is always reducible by coordinate change, extending the 9.3 caveat to all `n`.

**C2 — Buckyball arrangement.** That such a chain, at sufficient node count, arranges itself into the truncated-icosahedral configuration of Definition 1.7 — 60 nodes, 90 callings, genus 31.

*Status:* unproved, and it is the strongest of the three. *What would support it:* an energy or entropy argument selecting the truncated icosahedron among graphs of the same order, analogous to the arguments that make C₆₀ the stable fullerene. *What would kill it:* any configuration of the same node count with lower action, which is the expected outcome absent such an argument. **This claim should be treated as speculative until such an argument exists.**

**C3 — Rotation as chain.** That the rotation of a Kerr hole *is* the calling chain rather than merely being described by one.

*Status:* unproved and, as stated, not yet sharp enough to test. *What it needs first:* an operational statement — a quantity computable from the Kerr metric that the conjecture predicts and the standard account does not.

**A note on what Section 7 does and does not give C1–C3.** Corollary 7.3 is a theorem about surfaces built from spheres and tubes. Applying it to horizons requires the assumption that a merged horizon *is* such a surface, which is C1. The theorem is therefore a consequence-generator for the conjecture, not evidence for it. Stating this explicitly is the point of the fence.

---

## 11. Computational verification

Every check below was run in this workspace on 26 July 2026 in Rust 1.81, release profile, integer arithmetic wherever the quantity is an integer, with no external dependencies. Source and raw output are archived alongside this document.

**11.1 — The rime axes.** `2731`, `1999`, `1723` verified prime by trial division; pairwise gcds all 1; product `9,406,320,487`, matching Definition 1.3 and matching the 5-byte field `0x02 30 A9 0F 67` written into the emitted binary record.

**11.2 — The genus law (Theorem 5).** `genus = E − V + 1` and `χ = 2V − 2E` computed for eight configurations whose genus is independently known — single sphere, two joined by one tube, one sphere with one handle, two in a closed loop, theta graph, `K₄`, `Q₃`, `K₅` — and the identity `χ = 2 − 2g` confirmed in every case. Then applied to `B`: `V=60, E=90, g=31, χ=−60`. Program `callingchain`, output `callingchain.hbp`, SHA-256 `3c4780edd1f82b7819bb5fba56cc8ecdd27cdd1b763c6754d30a261970ad4d33`.

**11.3 — The three-distance theorem (Theorem 2), exhaustive.** Program `threegap`. Swept `N = 2 … 400`, every value, no sampling, over: all ordered pairs of the rime axes; all ordered pairs of a control set `{97, 233, 512, 1000, 4096, 9973}` chosen to include composites sharing factors with the strides; and rime rings strided by control values. Degenerate pairs (`stride ≡ 0 mod ring`) excluded and counted.

| set | instances | 1 gap | 2 gaps | 3 gaps | more than 3 | of the 3-gap cases, `max = min + mid` |
|---|---|---|---|---|---|---|
| rime × rime | 2,394 | 0 | 90 | 2,304 | **0** | 2,304 / 2,304 |
| control × control | 11,571 | 3,642 | 1,423 | 6,506 | **0** | 6,506 / 6,506 |
| rime rings × control strides | 7,182 | 0 | 789 | 6,393 | **0** | 6,393 / 6,393 |
| **total** | **21,147** | 3,642 | 2,302 | **15,203** | **0** | **15,203 / 15,203** |

Weak form: **21,147 / 21,147**. Strong form: **15,203 / 15,203**. No violations of either.

Two features of this table are worth reading rather than skimming. First, the strong form is the sharper test: a wrong implementation can produce three distinct gaps by accident, but not three gaps satisfying `max = min + mid` at every one of fifteen thousand values of `N`. Second, the 3,642 single-gap instances all occur in the control set, exactly where Corollary 4.8 predicts them — those are the cases `N > R/gcd(R,s)`, where the track has closed and the surviving points are evenly spaced. Their presence confirms the composite moduli really are composite and that the sweep is testing what it claims to test.

**11.4 — SHA-256, against published vectors.** The addressing primitive is implemented in-tree with no dependency to cross-check against, so it was checked against the FIPS 180-4 / NIST published values: the empty string, `"abc"`, the 56-byte and 112-byte standard messages, and the one-million-`'a'` vector — all MATCH. The million-`'a'` case was then recomputed streamed in 7-byte chunks, also MATCH, which is the check that matters for record trailers computed incrementally: incremental equals one-shot.

**11.5 — Kerr null geodesics, against closed forms.** The shadow computation was checked at the two limits where the literature gives an exact answer. At `a = 0` the shadow must be a circle of radius `√27 M = 5.196152423 M`; computed `r_min = 5.196150421`, `r_max = 5.196154424`, maximum error `2.0 × 10⁻⁶`. At `a → M` viewed edge-on the shadow's horizontal extent must be exactly `[−2M, +7M]`; computed `−2.000764` and `+6.999955`, width `9.000718 M` against a literature value of `9 M`. Both pass.

**11.6 — Disclosure of a defect found and fixed.** The first run of the gap census in the predecessor program hard-coded the stride to a single axis rather than enumerating ordered pairs. When the ring and stride coincided, `stride mod ring = 0`, every point collapsed onto one position, and five rows reported "1 distinct gap, ≤ 3, OK" while testing nothing. Those five rows were vacuous and are **withdrawn**. The program was rewritten to enumerate all ordered pairs, to detect and skip degenerate pairs, and to print the tested and skipped counts separately; it now reports 30 genuinely tested rows and 3 skipped. The exhaustive sweep of 11.3 supersedes that census entirely. This paragraph exists because a reviewer is entitled to know what went wrong before they find it.

---

## 12. Summary of standing

| claim | register |
|---|---|
| Stepping by `s` on a ring of `R` visits `R/gcd(R,s)` places; torus link has `gcd(R,s)` components | **proved** (Thm 1), classical |
| Rime axes pairwise coprime; joint closure at 9,406,320,487 | **proved** (Cor 3.4), computed |
| At most 3 gap lengths; largest is the sum of the other two | **proved** (Thm 2), classical (Sós / Surányi / Świerczkowski) |
| Icosahedral group: order 60, exactly 6 five-fold axes | **proved** (Thm 3), classical |
| Connected graph has `E − V + 1` independent circuits | **proved** (Thm 4), classical |
| `genus S(G) = E − V + 1` — holes = circuits, one integer | **proved** (Thm 5, Cor 7.3), classical in substance |
| Two spheres joined in a closed loop are a torus | **proved** (Cor 7.4) |
| Buckyball chain: 31 circuits = 31 holes = 32 faces − 1 | **proved** (Cor 7.5) |
| Nominal mean density `∝ M⁻²`; M87\* at 0.436 kg m⁻³ | **proved** (Prop 6), computed |
| Stationary 4D horizons are spheres | **established** — Hawking |
| Merging horizons show a transient torus | **established** — Bohn–Kidder–Teukolsky 2016 |
| …but that torus is foliation-dependent | **established, and it cuts against us** — same paper |
| 5D black ring: stationary `S¹ × S²` | **established** — Emparan–Reall 2002 |
| Real black holes form calling chains | **conjecture C1** |
| The chain arranges as a buckyball | **conjecture C2 — the weakest claim here** |
| Kerr rotation *is* the calling chain | **conjecture C3 — not yet sharp enough to test** |

---

## 13. References

1. V. T. Sós, *On the distribution mod 1 of the sequence nα*, Ann. Univ. Sci. Budapest, Eötvös Sect. Math. **1** (1958), 127–134.
2. J. Surányi, *Über die Anordnung der Vielfachen einer reellen Zahl mod 1*, Ann. Univ. Sci. Budapest, Eötvös Sect. Math. **1** (1958), 107–111.
3. S. Świerczkowski, *On successive settings of an arc on the circumference of a circle*, Fund. Math. **46** (1959), 187–189.
4. S. W. Hawking, *Black holes in general relativity*, Commun. Math. Phys. **25** (1972), 152–166.
5. M. I. Bohn, L. E. Kidder, S. A. Teukolsky, *Toroidal horizons in binary black hole mergers*, Phys. Rev. D **94**, 064009 (2016); arXiv:1606.00436.
6. R. Emparan, H. S. Reall, *A rotating black ring solution in five dimensions*, Phys. Rev. Lett. **88**, 101101 (2002); arXiv:hep-th/0110260.
7. J. M. Bardeen, in *Black Holes* (Les Houches 1972), eds. C. DeWitt and B. S. DeWitt, Gordon & Breach (1973) — the `√27 M` shadow radius and the extremal `[−2M, +7M]` extent.
8. National Institute of Standards and Technology, *FIPS PUB 180-4: Secure Hash Standard* (2015).

---

## 14. Provenance

The conjecture in Section 10 and the architecture it belongs to are the author's. The proofs in Sections 3 to 8 were assembled, written out, and machine-checked in a documented working session using an AI assistant; every numerical claim in Sections 8 and 11 comes from a program that was run, not from an estimate, and the programs and their raw output are archived with this document and available on request. The defect in 11.6 was found by that process and is disclosed rather than quietly corrected. Any error that remains is the author's.

*Correspondence: plasmatoid@gmail.com*
