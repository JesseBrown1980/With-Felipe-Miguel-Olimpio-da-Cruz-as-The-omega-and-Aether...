# Seat 3 challenge protocol — three-bit nonlinear rainbow identity witness

Date: 2026-10-15. **Post-hoc mathematical engineering protocol:** exhaustive local exploration already found a candidate polynomial before this document was committed. This is NOT a blinded preregistration of the discovery; the purpose of freezing these hypotheses before new hosted code is an independently reproducible proof/falsification.

Source-locked upstream: [Issue #84](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/84), PR #81 exact original source commit `c32d472dfe84f352450eb50469e0e9a987c33d78`, PR #76 exact prior head `98e62f1e7218c7fbb20e21fd5c3d734304e4ee6a`. No modifications to original code/stones/verified external artifacts.

### Mathematical domain and invariants

Enumerate every ordered ternary triple `X=(r,g,b)∈{0,1,2}³` in canonical `id=9r+3g+b` order. Define `S=r+g+b`, `Q=r²+g²+b²-rg-rb-gb`, `I=(S²,Q,Q)`; its GCD-primitive `P` is the *normalized probability class* for nonzero signals, and a separate `DARK` sentinel for all-zero. Compute all 27 exact integer rows, all 7 normalized classes (sizes [1,2,3,3,6,6,6]), all 10 unnormalized classes, without floating-point comparison. Confirm entropy H(ID|normalized+dark)≈2.149596296937 bits under a uniform 27-label model.

**Three-bit witness candidate:** `W(r,g,b)=(r+4g+3b+4rg) mod 8`. For every normalized-intensity/dark class `P`, the pairs `(P,W)` must distinguish ALL ordered tuples; test every class member and exact inverse. **Pigeonhole:** any fixed-length class-conditioned witness needs >=ceil(log2 maxClass)=3 bits because the largest class contains six members. W uses exactly three bits and is therefore *worst-class bit-optimal, given P is already known*. However if P must ALSO be communicated as an independent fixed-length 7-state label, 3+3=6 bits, larger than a standalone fixed 5-bit ordered id. Do not claim optimal standalone total coding.

### Affine bound (special restricted model)

Independently enumerate EVERY `a,b,c∈{0,...,m−1}` for each `m=2..11` using `L_m=(ar+bg+cb) mod m`. For each normalized equivalence class, `(P,L_m)` must have unique values; record the count of valid coefficient triples and lexicographically first witness. Local prediction: m=2..10 yields zero valid triples; m=11 gives 60 valid triples, first (1,3,4). This finite exhaustive result is a restricted minimum single-*affine modular* alphabet bound, not a proof that any other function requires 4 bits.

### Quadratic witness complexity comparison

Test **all 6** degree-two monomials `r²,g²,b²,rg,rb,gb`, each with EVERY 8^4 coefficient tuple `(a,b,c,d)` for witness `(ar+bg+cb+d*monomial) mod 8`. Local prediction: square monomials have no valid witnesses, each pairwise cross term has exactly 8 valid witnesses; chosen `rg` first lexicographic `(1,4,3,4)`. This forms a complete finite certificate for these bounded polynomial families, but not a physical observable or universal quadratic lower bound.

### Adversarial and source-bound tests

- Inject intentionally wrong 3-bit witness for a class, wrong class, missing `DARK` policy, changed ordered source tuple, replayed source sequence, wrong wave/location binding, dropped `g` or `b` with source ID omitted, modified ledger bytes, and coherent forged local SHA.
- Distinguish cases where wrong witness maps to ANOTHER perfectly valid tuple in the same class. Bare `(P,W)` is a lossless *codec*, **not** independently authenticated provenance. Such swaps are only rejected by comparison with an independently trusted original ordered source or signature; without that, flag `ORIGIN_UNAUTHENTICATED`, not `impossible`.
- Prove source-to-witness internal integrity by recomputing `P`, `W`, and `id` from an independently pinned original ordered tuple. If the original tuple is unavailable or source-root untrusted, do not promote.
- 27×81×27=59,049 synthetic wave/location/ordered-sector cases must preserve the one-to-one mapping while the actual primitive-probability sampler remains an independent *three-lane router* not an identity decoder. Source-pin upstream Git objects (not mere source labels). Existing source custody and experimental absence of actual optical spectrum must remain recorded.
- Publish **two independently authored programs** (Python stdlib and Node22 BigInt/Number exact small integers), canonical 27-row HBP/JSON and optionally full 59,049-row route-attached witness HBP, independently audited cross-language, cross-OS. Run 4 GitHub Actions jobs Ubuntu/Windows × Python3.11/3.13 + Node22, with fifth full byte-parity job. All 27 class roundtrips, all 59,049 source mappings, exhaustive affine/quadratic coefficient results, negative controls, and SHA256 checks required.
- Explicit flags: `mathematical_recovery=true`, `digital_integrity_against_pinned_source=true`, `external_origin_authenticated=false`, `physical_spectrum_measured=false`. Quantum behavior, measured photons, neurons, FTL and optical storage NOT inferred.

### Release and review

Keep PR #87 source-bound factorized resolver and PR #83 Seat1 Round4 source unchanged. Open a separate DRAFT PR, post source-linked results to Issue #84 and Coordinator #55, request Seat1/Seat2/Seat4 peer attack. No auto merge and no release Issue #10 closure.
