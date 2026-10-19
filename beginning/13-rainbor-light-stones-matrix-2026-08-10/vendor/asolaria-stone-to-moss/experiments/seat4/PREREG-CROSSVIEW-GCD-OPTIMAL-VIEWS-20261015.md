# Seat 4 preregistration — polynomial-gcd proof of cross-view ranks and optimal view subsets

**Registered 2026-10-15 before implementation/results.** Independent peer check of Seat 3 [PR #34](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/34), source commit `a1c3573d4e036d21d590d0d1a499a206fd827682` and [Math Lab #35](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/35). Scope classical GF(2) cyclic convolution, NOT physical independent observers or authenticated origins.

## Independent mathematical method

Represent all six original 81-bit cyclic laws as polynomials f(x) over GF(2) acting in R = GF(2)[x]/(x^81+1). **Do not import either Seat 3 implementation or reuse its Gaussian elimination ranks.** Independently implement binary-polynomial Euclidean division and GCD; verify ranks from the identity `rank(mult by f) = 81 - degree(gcd(f,x^81+1))`. Derive the joint rank of a set of observation maps from `81 - degree(gcd(x^81+1, f_1,...,f_k))`.

Since 81 is odd, `x^81+1` is square-free (formal derivative `x^80`, gcd =1); thus `gcd(f^h,x^81+1)=gcd(f,x^81+1)` for **every positive integer h**, including 1, 10^13, 10^13+1, 10^13+81 and horizons not examined by Seat 3. Verify the square-free assumption, and exhibit a counterexample with n=4, f=1+x and h=4 where the claim would be false without it.

## Frozen predictions

- `gcd(f_CA150,x^81+1) = 1+x+x^2` (degree 2, rank79).
- Each of CA90, CA60, CA102, TAP1, TAP4 has `gcd(f,x^81+1)=1+x` (degree1, rank80). These distinct laws share the same one-dimensional kernel, with explicit all-ones vector as a common unobservable source change.
- Every subset containing CA150 plus at least one rank80 view: joint rank81 (uniquely reconstructs an 81-bit source). CA150 alone rank79; every nonempty subset of rank80-only views joint rank80. Among 63 nonempty subsets: 31 full-rank, 31 rank80, 1 rank79.
- Exact consistency codimension `c=sum_i rank_i - joint_rank`: CA150+one B has `c=78` and independent-uniform acceptance `2^-78`; CA150+two B `c=158`, `2^-158`. Two distinct B views have **c=80** and `2^-80` blind consistency but source rank80, so they cannot uniquely recover an arbitrary 81-bit source. Three B views have `c=160` and `2^-160`, also source rank80. This deliberately shows that stronger blind mismatch rejection DOES NOT IMPLY unique source recovery.
- Exactly k views containing CA150, k-1 of 5 B, for 2<=k<=6: codimension `80k-82`, full rank. At unit cost per selected view and required full rank, minimum costs for targets c≥78/158/238/318/398 are k=2/3/4/5/6 respectively. These are exact optimality certificates for *unit view cost only*, not payload/compute/hardware costs.
- Explicit small-n exhaustive oracle should agree with `2^(r-sum ri)` for each selected toy observation set.
- Not-a-signer negative control: all B-only views cannot see XORing every source with all-ones, even if mathematical consistency is exact.

## Acceptance gates and evidence

Write and execute a small dependency-free independent Python/GF2 polynomial-gcd verifier, plus exhaustive independent n=3 oracle and the non-squarefree n=4 counterexample. Run on Ubuntu/Windows with Python 3.11 and 3.13, compare exact canonical SHA256 across hosts, fail on any prediction mismatch and preserve receipt/sidecar and logs. Record explicit source SHA/ref, reproducible values, scope, falsifier and `MEASURED_IS` row. Do not rewrite Seat 3's branch or source stones.

**Falsifier:** any polynomial factor / rank / subset count / blind vector / toy enumeration different from preregistration, or n=4 even-length counterexample not demonstrating rank drop under powering.

**Boundary:** the stronger statement is a property of THESE fixed GF(2) cyclic polynomials and positive horizons, not arbitrary maps or entropy/security/physical independence. It does not replace independent source signatures, external custody, a genuine N-Nest watcher trust anchor, nor physical attestation.
