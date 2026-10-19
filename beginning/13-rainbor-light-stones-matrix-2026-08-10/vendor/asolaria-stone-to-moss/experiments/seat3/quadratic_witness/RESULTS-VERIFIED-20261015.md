# Seat 3 — A three-bit nonlinear witness for ordered Rainbow27 identities

**October 15, 2026.** New digital information-theory result. **[Draft PR #90](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/90)**, directly addressing **[Math Challenge #84](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/84)**. This is a **post-hoc independently replicated computational theorem**, not a blinded discovery preregistration. The hypothesis was found locally before the [frozen implementation protocol](POSTHOC-PROTOCOL.md), commit `611008d2703ac47801db217e1d048138c0679e01`.

## Main identity result

Let `(r,g,b)∈{0,1,2}³` have ordered digital ID `id=9r+3g+b`; define `S=r+g+b`, `Q=r²+g²+b²−rg−rb−gb`. Let `P` be the GCD-primitive integer triple for Fourier intensities `(S²,Q,Q)`, or the explicit `DARK` sentinel if every intensity vanishes. Across the 27 inputs there are exactly **7 normalized-or-dark classes** (6 normalized probability distributions plus one undefined dark case), with group sizes `[1,2,3,3,6,6,6]`. The class by itself loses ordered identity.

The following nonlinear, bounded polynomial **is injective WITHIN every normalized probability class**:

```
W(r,g,b) = (r + 4g + 3b + 4rg) mod 8
```

The pair `(P, W)` uniquely identifies every one of the 27 ordered triples, including the dark input. A maximum class of six proves by pigeonhole that a fixed-width auxiliary index conditional on P requires **at least ceil(log2(6))=3 bits**. W is three bits, hence it meets the worst-class auxiliary bit-width lower bound exactly.

### Explicit finite certificate — no collision within a normalized class

| GCD-primitive normalized probability class P | Ordered integer sector IDs | W for those IDs, same order |
|---|---|---|
| DARK (undefined) | 0 | 0 |
| 1,1,1 | 1, 2, 3, 6, 9, 18 | 3, 6, 4, 0, 1, 2 |
| 4,1,1 | 4, 8, 10, 12, 20, 24 | 7, 6, 4, 1, 0, 2 |
| 3,1,1 | 5, 7, 11, 15, 19, 21 | 2, 3, 7, 1, 5, 6 |
| 1,0,0 | 13, 26 | 4, 0 |
| 16,1,1 | 14, 16, 22 | 7, 4, 1 |
| 25,1,1 | 17, 23, 25 | 7, 4, 5 |

Every row's W values are pairwise distinct; therefore the inverse `(P,W)→id` exists on the stated 27-symbol alphabet. This is a finite mathematical proof, not an assumption that light photons physically expose W.

**Critical total-bit distinction:** the 3-bit result assumes **P is already known**. If transmitting class as one fixed 3-bit label plus witness W as 3 fixed bits, this is **6 total bits**, larger than the direct one-field fixed 5-bit ID for 27 alternatives. No compressed source memory, independent optical capacity or universal encoding advantage is claimed. Under a uniform 27-sector prior, normalized P alone retains conditional identity uncertainty **2.149596296937 bits**; a truthful, source-bound W resolves it to zero.

## Second theorem — restricted affine-modulus minimum

For `L_m(r,g,b)=(ar+bg+cb) mod m`, coefficients `a,b,c∈[0,m)`, test exhaustively against EVERY normalized class (not merely representative permutations). The independently implemented search examined each full family of `m³` triples:

| Modulus m | Affine coefficient triples that fully distinguish each P-class |
|---|---:|
| 2 | 0 |
| 3 | 0 |
| 4 | 0 |
| 5 | 0 |
| 6 | 0 |
| 7 | 0 |
| 8 | 0 |
| 9 | 0 |
| 10 | 0 |
| **11** | **60** |

First lexicographic valid modulo-11 coefficients: `(a,b,c)=(1,3,4)`. Thus within the explicitly limited class of **single affine-linear modular witnesses**, **11** is the minimum viable modulus. This does NOT prove a generic 4-bit lower bound for nonlinear witnesses or physical measurements.

For the restricted family `(ar+bg+cb+dT) mod8`, with `a,b,c,d∈{0..7}` and one degree-two monomial from `r²,g²,b²,rg,rb,gb`, all **6×4096** coefficient cases were independently enumerated:

| Quadratic term T | Number of valid coefficient quadruples (mod 8) |
|---|---:|
| r² | 0 |
| g² | 0 |
| b² | 0 |
| rg | **8** |
| rb | **8** |
| gb | **8** |

The first lexicographic valid **rg** polynomial has coefficients `(1,4,3,4)`, exactly the witness above. This is an exhaustive proof about THESE bounded polynomial families, not the global complexity of all possible inverse maps.

## Source-pinned full-trace empirical check

Two **independently written** implementations—[Python](quadratic_witness.py) (integer/GCD/SHA256) and [Node22](quadratic_witness.js) (independent BigInt/SHA256)—recompute all coefficients, all 27 class inverse mappings and **all 59,049 original PR81 V2 cases** with the correct original digital three-lane qutrit output. A third [independent verifier](verify_witness.py) checks all 59,049 new `MAP` lines against their matching historical original `CASE` source record, verifies source hash and regenerated `P,W,id`, and rejects altered evidence.

Historical source is pinned to original Seat3 [PR81 commit](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/81) `c32d472dfe84f352450eb50469e0e9a987c33d78`, original [Actions 38747014513](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38747014513) archive `rainbow27-v2-ubuntu-latest-py3.11`, 3,886,535-byte HBP SHA256 `8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672`. Prior PR76 source commit `98e62f1e7218c7fbb20e21fd5c3d734304e4ee6a` remains unchanged.

**[Exact-head hosted CI #38763638453](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38763638453) completed 5/5 PASS:** independent Python and Node on Ubuntu/Windows × Python3.11/3.13 plus fifth independent four-archive byte identity; active mutations of original PR81 HBP and new full HBP both correctly HELD. All hosted results byte-for-byte identical:

- `witness59049.hbp`: **3,260,349 bytes**, SHA256 `18e611242d5d48ceb35b0bba14a13bbae192fd51141fe659f6052ada7f5c506a`.
- `witness-result.json`: **2,981 bytes**, SHA256 `98fbe2a386c72700934e86aaf1f02da94a78d680ece533aeb7df824fd0ac4f7c`.
- `witness-independent-check.json`: **436 bytes**, SHA256 `beb22f9ebb0bea52790adfbfdec61a4dcfaf0ce1b1f9bcc4c084911348f3542c`.

### Reproduce

Download and unpack the already hosted original PR81 artifact into `pr81/` so it contains `rainbow27/rainbow27-v2.hbp`. Python >=3.11 and Node22, no third-party dependencies:

```bash
python experiments/seat3/quadratic_witness/quadratic_witness.py pr81 out/python
node experiments/seat3/quadratic_witness/quadratic_witness.js pr81 out/node
python experiments/seat3/quadratic_witness/verify_witness.py out/python out/node pr81 out/verified
```

### Mathematical recovery ≠ independently authenticated source

A forged witness *can* be another entirely valid `(P,W)` codeword for a DIFFERENT ordered source member within the same class. The three-bit theorem cannot diagnose a source substitution from `(P,W)` alone. Verified tests distinguish `mathematical_recovery=true` and `digital_integrity_against_pinned_source=true` from `externally_authenticated_origin=false`. The latter requires a separately trusted signer/custody/authenticated measurement of original ordered color data, not a caller-replaceable SHA receipt. Changing a witness while keeping a fixed original ordered-ID anchor is HELD; a co-forged entire source and replacement 'trusted' reference cannot be dismissed by this arithmetic alone.

No physical sensor spectrum, quantum processing, photonic memory persistence, neuronal optogenetic response, or independent host attestation has been demonstrated. Existing Seat3 factorized memory [PR87](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/87), Round4 [PR83](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/83), and public computational release are unchanged; the scientific [Issue10](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/10) remains a distinct release gate. This PR remains **DRAFT** pending independent Seats1/2/4 review.
