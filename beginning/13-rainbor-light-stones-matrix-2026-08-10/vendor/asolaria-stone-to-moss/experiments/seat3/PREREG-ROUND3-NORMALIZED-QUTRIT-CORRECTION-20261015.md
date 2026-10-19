# Seat 3 correction preregistration — normalized qutrit intensity equivalence and integer sampler side-channel

**Date:** 2026-10-15. Freeze **before new code**. Append-only supplement to prior prereg commit `038de663056024179b55f8573a3c00ea77aa5ab7`, original independent 52,488-case ledger CI and prior 1,531-byte Seat 3 HBP stone. The earlier 10-class theorem was **correct for unnormalized intensity numerators**, not the normalized probabilities. Do not overwrite prior result; independently test this finer distinction in new files.

## Inputs

- Original coordinator [PR #75](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/75) source commit `5045b5b2ee1960bc469b5588a1b17601490aef6a` and the exact SHA256 sampler using `SHA256(SEED||"|BORN-THRESHOLD|"||waveLE16||addressLE16||attemptLE32)`.
- Seat3 prior [PR #76](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/76) unnormalized theorem: 27 ordered ternary triples become 10 raw `(S²,Q,Q)` intensity signatures with class sizes `1,1,1,3,3,3,3,3,3,6`, conditional entropy `1.6310777784188053` bits per uniformly sampled address.
- User/coordinator independently identified a post-hoc **7 normalized signatures** and `2.149596296937324` bits; the new software must verify, not merely hardcode, those figures.

## Frozen mathematical predictions

Let `S=r+g+b`, `N=r²+g²+b²`, `Q=N-rg-rb-gb`. If `N>0`, the three normalized Fourier intensity probabilities are the **exact rational triple** `(S²/(3N),Q/(3N),Q/(3N))`. If `N=0`, normalized probabilities are **undefined**, classified `ZERO_HELD`. Represent every rational as lowest-terms numerator/denominator without floating-point hashing or decimal rounding.

1. Enumerate every ordered `(r,g,b) in {0,1,2}³`, all 27 distinct integer addresses `9r+3g+b`.
2. **10** unique *raw* intensity classes including zero, orbit sizes `[1,1,1,3,3,3,3,3,3,6]`.
3. **7** unique *normalized-or-undefined* signatures including the all-zero sentinel, class sizes `[1,2,3,3,6,6,6]`; only 6 signatures are valid distributions and one all-zero sentinel is undefined. These normalized signatures are not all permutation orbits: positive scalar multiples of nonzero RGB source collapse as well.
4. For a uniformly distributed 27-label source, the conditional information loss for raw intensity equals `(18 log2 3 + 6 log2 6)/27` = **1.6310777784188053 bits**, whereas for normalized intensities plus explicit undefined sentinel it equals `(18 log2 6 + 6 log2 3 + 2 log2 2)/27` = **2.149596296937324 bits**. An optimal single-guess decoder from each signature recovers at most **10/27** versus **7/27** of the 27 uniformly weighted addresses, respectively. Full ordered index retains all 27 digital identities. These Shannon values assume the 27 ordered triples are equiprobable; do not infer natural rainbow statistics.
5. Prove two concrete scale collisions: `(1,0,0)` vs `(2,0,0)` have distinct raw intensities but same normalized `(1/3,1/3,1/3)`; `(1,1,1)` vs `(2,2,2)` have distinct raw but same normalized `(1,0,0)`. Also prove all permutations preserve raw and normalized signatures.
6. **Crucial source-behavior distinction:** the current SHA sampler draws `ticket mod (3N)` with rejection limit `floor(2^256/(3N))*(3N)`. The same uniform hash ticket can yield a **different** concrete pseudo-lane for positive scalar multiples even when the exact normalized distributions are identical. Reproduce **wave=0,address=1**: `(1,0,0)` → lane 2 and `(2,0,0)` → lane 1. Verify modulo remainders `2 mod 3` and `5 mod 12` for this case. These lane differences are a **deterministic modulus implementation dependency**, not a valid demonstration that normalized intensity alone contains amplitude. Preserve the original coordinator source and 52,488-row gold case HBP unchanged.
7. The safety boundary: `P=I-J/3` plus common component `S` retains absolute ordered RGB, whereas normalized intensity alone does not. Ordered 27 sector address `9r+3g+b` must be source-anchored rather than inferred from intensity. This does not prove 27 physical spectral wavelength channels.

## Executable acceptance and independent check

Add independently implemented **Python fractions** and **Node BigInt GCD-normalized rationals**. Both enumerate all 27 triple rows in canonical `NORM|...` HBP and produce byte-identical 27-row records and a canonical JSON receipt with exact class memberships, sorted class sizes and SHA256. A separate Python test computes the entropy formula, theoretical best single-guess rates and the software-specific modulo counterexample; all assertions run on Ubuntu/Windows, Python 3.11/3.13 and Node22. At least one deliberate mutation (a normalized-probability numerator, a sector address, an omitted zero case) must fail closed. Keep older 52,488-row/10,000-trade CI, evidence stone and SHA unchanged; new results are additive. Source authentication, external physical measurements, independent real hosts, quantum effects, or biological neural validity are **not established**.

Promotion only after 4/4 live CI and independent Seat1/2/4 review. No merge or unrequested external API actions.
