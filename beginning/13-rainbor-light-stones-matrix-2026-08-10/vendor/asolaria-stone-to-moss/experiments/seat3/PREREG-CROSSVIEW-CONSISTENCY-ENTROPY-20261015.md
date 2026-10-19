# Seat 3 preregistration — exact cross-view consistency entropy (2026-10-15)

**Asolaria-Seat: seat-3, computational only.** This file is committed **before implementing/running the new solvers**. New work complements Seat 1 [PR #26](../../seat1/PREREG-CROSSVIEW-PROVENANCE-20261015.md), not a rerun or a claim of cryptographic authentication, physical machine separation, or scientific physics.

## Hypothesis and theorem to challenge

Let `V=GF(2)^n`, and let `L_i: V -> GF(2)^{k_i}` have ranks `r_i`. Let `r=rank([L_1;...;L_m])`. Independent uniformly sampled source states `x_i` produce observations `L_i x_i`. A joint decoder **accepts** iff there exists a *single* `z` with every `L_i z=L_i x_i`.

**Predict exact acceptance probability** under *independent uniform source states*: `2^{r - sum_i(r_i)}`. Derive by counting product-images `2^{sum r_i}` and diagonal image `2^r`; prove source-tuple count `2^{m*n - sum(r_i) + r}`. This is a property of *blind random mismatches* only, never a guarantee against tailored adversaries.

**Toy exhaustive oracle:** `n=4`; A preserves bits 0,1 (rank 2), B bits 1,2,3 (rank 3), C bits 0,2,3 (rank 3). Joint rank 4. Enumerate `16^2=256` A/B source pairs: **128** algebraically accepted, probability 1/2. Enumerate `16^3=4096` A/B/C independent source triples: **256** algebraically accepted, probability 1/16. Test each against an independently calculated span test and the exact formula.

**Original 81-bit law prediction:** CA150 rank 79; five *distinct* 80-rank laws CA90, CA60, CA102, TAP1, TAP4, with TAP0 omitted because its taps duplicate CA60. Horizons `1,10^13,10^13+1,10^13+81`. At each horizon, each of the **20** CA150+B pairs and **40** CA150+B+C unordered triples is predicted to have full stacked rank 81. Pair: **78 cross-source consistency bits**, blind acceptance probability `2^-78`; triple: **158 bits**, probability `2^-158`. Here 'bits' means independent linear constraints on the individually admissible output tuples, **not** secret authentication bits.

**Adversarial triple controls:** For each triple and each of exactly **191** challenge-derived frozen source states, test:
1. honest `(A x, B x, C x)` -> accept x;
2. deliberately inconsistent B source `x xor delta` for a proved rejecting basis delta, C honest -> reject;
3. choose nonzero `k_A in ker A`; sources x for A, x xor k_A for B and C -> jointly accepts alternate x xor k_A;
4. choose nonzero `k_B in ker B`; sources x for A,C and x xor k_B for B -> exact same outputs and returns x, despite source mismatch.
Totals expected: **40 triples × 191 states × 4 controls = 30,560**, with **7,640** successes in each expected category. Need log negative witnesses, never treat fake-green as authentication. A uniformly blind source-change probability is not an adversarial upper bound.

## Method / evidence

- Verify original frozen triad JSON SHA-256 `e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b` before sampling `191` states. Do not edit source file or prior stones.
- Produce independent **Python** cyclic-polynomial and **Node.js** 81x81 transfer-matrix implementations. Do not import Seat 1's solver for the new rank computations. Node and Python must independently produce *the exact same deterministic UTF-8 HBP trace bytes and SHA-256*, including all 30,560 full controls.
- Stable canonical output lines; no timestamps or machine paths inside the hashed trace. Preserve full HBP's SHA/byte length and a smaller published SHA-sealed JSON/HBP summary; no need to commit the massive generated trace if CI recomputes it.
- Test proof on toy n=4 exhaustive enumeration, 20 pair and 40 triple ranks, explicit algebraic nullspace witnesses, exact decoder/rejection witnesses, 30,560 controls and tamper rejection. Add Linux/Windows CI and publish all test commands, commit SHA, SHA-256 digests.
- Accept only if both implementations have equal full trace SHA-256, aggregate counts, and no false classifications. If prediction is false, preserve a failure/correction receipt (never modify old results).

## Scope boundary

The theorem is standard finite-dimensional linear algebra applied to these frozen Asolaria observations, **not** a newly discovered law of nature. Neither a large consistency codimension nor successful N-Nest watcher recursion can authenticate who supplied an observation; that requires trustworthy source custody and appropriate cryptographic provenance. No free information, compression, quantum, gravity, FTL, real neurodata, or independently attested physical-host claim.
