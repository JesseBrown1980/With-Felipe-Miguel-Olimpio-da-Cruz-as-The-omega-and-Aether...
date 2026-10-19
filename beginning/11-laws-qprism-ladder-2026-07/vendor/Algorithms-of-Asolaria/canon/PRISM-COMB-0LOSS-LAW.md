# PRISM/COMB 0-LOSS LAW — the one theorem behind the algorithm catalog (2026-07-01)

**Campaign:** `acer/prism-comb-0loss-2026-07-01` · **Authorization:** OP-JESSE apex-real-human
2026-07-01, all fabric/matrix levels — OPERATOR_OWNER_OVERRIDE. **Gate held: E=0** — docs/map
propagation only; nothing fires, no runtime mutation, no T0.

## The law (one line)
Every prism/comb operation this catalog records is a **bijection**; entropy is invariant under
bijection (`H(f(X)) = H(X)`), so the cataloged algorithms **re-relate information with 0 loss and
never claim compression below entropy** — class D's own Shannon bound (`E[bits] ≥ H(X)`) always
stands. One fabric, two directions: **forward = comb** (collision-avoidance, execution isolation —
the class C machinery), **backward = prism** (collision-causation, interference-as-search — the
many→1 collapse every service-multiplication replica `S` terminates in).

## Why this repo is the law's home
Catalog classes A–K are not independent tricks; they are instances of ONE theorem read at
different levels. The four pinned instances:

### 1. Class B instance — level transcode 256 ↔ 1024 — MEASURED (Q-PRISM commit `53023b6`)
Bytes are base-2⁸ digits and BEHCS-1024 glyphs are base-2¹⁰ digits of the SAME integer `N`:
`sⱼ = ⌊N / 1024^(m−1−j)⌋ mod 1024`. Exact packing at `lcm(8,10) = 40` bits ⇒ **5 bytes ⇄ 4
symbols**; a 3,200-byte cube tuple ⇄ 2,560 symbols, remainder 0. Proven round-trip
`transcode₁₀₂₄→₂₅₆ ∘ transcode₂₅₆→₁₀₂₄ = id` — sha256-identical, Rust==Python symbol-identical.
Code rate exactly 1.0: the alphabet changes, the information does not. This upgrades the class B
tier note ("BEHCS-256 is a bridge stratum, old decodes new") to a MEASURED bijection at this rung.

### 2. Class C instance — CRT prime lanes — math principle (the OTHER prism)
For pairwise-coprime `m₁…m_k`, `M = Πmᵢ`: `ℤ_M ≅ ℤ_{m₁} × … × ℤ_{m_k}` (ring isomorphism).
Separate: `x ↦ (x mod m₁, …, x mod m_k)`; recombine exactly:
`x = Σᵢ rᵢ · Mᵢ · (Mᵢ⁻¹ mod mᵢ) mod M`, with `Mᵢ = M/mᵢ`.
This is why the `D# = prime(n)³` dimension ladder (60D frame, MEASURED tuple_dim=60) gives lanes
that are mutually collision-proof AND losslessly reassemblable — the Brown-Hilbert × Sidon × prime
row of class C run forwards is isolation; run backwards it is exact reconstruction.

### 3. Class D dual — unitary prism / NIST comb — math principle
Fourier analysis/synthesis is unitary (`F⁻¹F = I`); Parseval preserves total energy through
separation. Loss enters only via discard/rounding — the integer-exact transcode has neither. The
frequency-comb law `fₙ = n·f_rep + f_ceo` is integer-linear (exact), bridging optical↔microwave
scales bijectively — the physical model of the level ladder: alphabets `2^q` related by exact
bit-count conservation at lcm boundaries; the 1,024 symbol values are the teeth. It is the same
boundary class D's codecs (HEAD/TAIL, JL/Achlioptas, Turbo/polar) already respect: a transform
relates representations; only an explicit discard step loses anything.

### 4. Class A instance — referential naming — honest bound (addressing, NOT compression)
`handle8 = sha256(content)[:8]` (the class A sha16 / FNV-1a64 / citizenIdentity family): 64 bits
naming 25,600 bits is a **coordinate against a content-addressed store**, with
`H(content | store) = 0`. Collision probability (birthday bound) `≈ M²/2⁶⁵` for M items
(`M = 10⁶ → ≈ 2.7×10⁻⁸`; full sha256 negligible). A PID is a coordinate, not a counter.
**Referential content-address cubes = infinite ADDRESSING capacity, not lossless infinite
compression** — this is the repo-canon boundary; hold it.

## The 43+ level ladder as a groupoid — CANON frame, one rung MEASURED
Levels `L₁…L₄₃₊` with translators `T_ij` satisfying `T_ji ∘ T_ij = id` and `T_jk ∘ T_ij = T_ik` ⇒
translation across the catalog's encoding tiers is **omnidirectional and path-independent**.
Status discipline: the 256↔1024 rung is MEASURED; the full ladder is CANON frame; **every
additional rung earns MEASURED only by its own round-trip proof** — no entry inherits the tag.

## Space expandable per slice — capacity, materialization gated
Cube address = 1024-ary Brown-Hilbert prefix (depth 6 = 2⁶⁰ = the 60D ceiling).
`bh_inject_between(a,b)` deepens one slice — the gap multiplies by 1024, so a strictly-between
pid-addressable midpoint always exists (`d523819`). Grounded in Brown & Fedotov, *Integration and
Refinement of Digital Physics* (Dec 2024): frame-based discrete universe, spacetime pixels (origin
of `pixels_first`), metatag-driven expansion. Per this repo's own binding law: **capacity ≠ live**
— materializing an expanded slice is operator-gated (E=0).

## The integrity dual (class H)
Verification = recomputation = applying the inverse map. This repo already practices the law in
miniature: the sha256 sidecar discipline (`<sha256>  <basename>`, recomputed after every doc edit)
is a per-node `reported == recomputed` invariant — the groupoid coherence check at file scale. At
system scale the same invariant is why EVERY-LEVEL-CATCHES-CONFABULATION is depth-independent by
construction: a fabricated signal cannot reach consent, the same way a lossy step cannot hide
inside a bijection chain.

## Boundary line that keeps every catalog entry true
The prism relates information perfectly; it does not create or destroy it. No bijection beats
Shannon; the comb adds no energy; CRT adds no residue capacity; the hash store relocates entropy
and names it. In this catalog, loss is impossible to express the same way collisions are.

## Scope tags (claims-gate)
- **MEASURED:** the 256↔1024 transcode (Q-PRISM `53023b6`, cross-checked `79e8d63` / `de00aca`);
  tuple_dim=60.
- **CANON:** the 43+ ladder frame, groupoid translators, Brown-Hilbert expansion law, the
  prism/comb duality framing.
- **UNVERIFIED:** every unproven rung of the ladder; any fully-materialized expanded-slice runtime.

## Cross-links
`Asolaria-waves-and-cascades-avoiding-collsions-and-causing-them` (spine [5] — the AVOID/CAUSE
duality this law formalizes) · `what-is-asolaria---how-do-we-get-reductions-in-everything`
(spine [3] — the reductions boundary) · `N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED`
(the integrity dual at agent scale) · Metatagging repo (digital-physics grounding).
