# Seat 3 append-only correction — normalized qutrit intensities have seven classes, not ten

**Date:** 2026-10-15 · **Status:** independently executable normalized-vs-unnormalized correction to draft Seat3 [PR #76](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/76), original [Coordinator PR #75](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/75). This is an **additional qualification**, not a retraction of the ten-class theorem for *raw* intensity numerators. The prior 52,488-row source HBP, Seat3 fleet ledger and earlier 1,531-byte evidence stone remain unchanged.

## What the initial finding counted

The earlier proof enumerated the **unnormalized** squared Fourier intensity weights

`W(r,g,b)=(S²,Q,Q)`, `S=r+g+b`, `Q=r²+g²+b²-rg-rb-gb`.

Across the 27 ordered ternary source vectors in `{0,1,2}³`, `W` has **10 signatures**: orbit sizes `1,1,1,3,3,3,3,3,3,6`. Its exact conditional Shannon uncertainty for uniformly selected source labels is:

`H(X|W)=[18 log₂(3)+6 log₂(6)]/27 = 1.6310777784188053 bits`.

That statement remains correct, but it is not the correct count for the **normalized probability distribution** used to describe the qutrit Born-style intensity probabilities.

## Correct normalized result (exact fractions, no float equality for grouping)

For `N=r²+g²+b²>0`, define `p=(S²,Q,Q)/(3N)`; for `N=0`, `p` is **undefined**. The complete finite normalized-or-undefined partition has **7** equivalence classes: one undefined dark case and six genuine probability classes.

| Exact normalized probability triple | Ordered source members (r,g,b) | Class size |
|---|---|---:|
| UNDEFINED | (0,0,0) | 1 |
| (1/3, 1/3, 1/3) | permutations of (0,0,1) and (0,0,2) | 6 |
| (2/3, 1/6, 1/6) | permutations of (0,1,1) and (0,2,2) | 6 |
| (3/5, 1/5, 1/5) | permutations of (0,1,2) | 6 |
| (1, 0, 0) | (1,1,1), (2,2,2) | 2 |
| (8/9, 1/18, 1/18) | permutations of (1,1,2) | 3 |
| (25/27, 1/27, 1/27) | permutations of (1,2,2) | 3 |

**Normalized class sizes:** `1,2,3,3,6,6,6`. In addition to RGB permutation invariance, normalized probabilities are invariant under positive global scaling whenever the scaled RGB remains within the permitted values. Example: raw intensities for `(1,0,0)` are `(1,1,1)`, whereas those for `(2,0,0)` are `(4,4,4)`; both normalize to `(1/3,1/3,1/3)`.

If all 27 ordered triples are equally likely, the corrected information bound is

`H(X|p)=[18 log₂(6)+6 log₂(3)+2 log₂(2)]/27 = 2.149596296937324 bits per uniformly drawn address.`

The two bounds are not interchangeable:

- **Raw intensity only:** 10 classes; residual uncertainty `1.631077778419` bits; maximum single deterministic exact address guess success `10/27` under the uniform prior.
- **Normalized probabilities (plus explicit undefined symbol):** 7 classes; residual uncertainty `2.149596296937` bits; maximum single deterministic exact address guess success `7/27` under the same prior.
- **Explicit source-anchored ordered ternary index `9r+3g+b`:** 27 possible values; zero remaining ambiguity under a trusted, correctly transported index.

The *all-zero* input cannot be given normalized nonzero Born probabilities: it must remain a separate dark/undefined source flag. There are six defined probability signatures—not seven.

## Additional software-specific issue: modulus output can leak scale

The current coordinator's SHA sampler takes an integer ticket `x`, reduces `x mod (3N)` and compares that residue with the cumulative **unnormalized** intensity thresholds. This is a deterministic software choice designed to mimic normalized probabilities under an ideal uniformly random ticket; **it is not a function of the normalized probability vector alone**.

A new frozen counterexample uses `wave=0`, `address=1`:

| Source RGB | Probability weights `p` | Raw total 3N | SHA-ticket residue | Digital selected lane |
|---|---|---:|---:|---:|
| (1,0,0) | (1/3,1/3,1/3) | 3 | 2 | 2 |
| (2,0,0) | (1/3,1/3,1/3) | 12 | 5 | 1 |

The SHA ticket is the **same** for both test inputs, but `x mod 3 = 2` and `x mod 12 = 5`; comparing each residue to its own raw thresholds produces a different lane. This deterministic implementation dependency does **not** overturn the normalized probability equivalence theorem, nor prove physical amplitude sensing. It also means that when describing the implementation, one should avoid asserting that any normalized-equivalent scaled colors necessarily produce identical deterministic routes. RGB **permutations with identical raw W** do produce identical deterministic routes at fixed wave/address.

## Executable independent evidence

Frozen amendment preregistration commit `8842af509e70384110f92a44fb986b92ad1b9d96`, before writing the new scripts.

- `experiments/seat3/round3_normalized_intensity.py`: independent exhaustive Python `fractions.Fraction` arithmetic.
- `experiments/seat3/round3_normalized_intensity.js`: independent Node22 BigInt / GCD exact-rational arithmetic.
- `experiments/seat3/verify_round3_normalized.py`: independently recomputes all 27 rational rows, 7 class memberships, entropy values, modulo counterexample, SHA sidecars; rejects tampered normalized ratios and omitted dark case.

Both Ubuntu matrix configurations have already passed the new `normalized27.hbp` **27-row SHA256** `b2e87ffff9f3845defd4108094b6a5e5e0d082a00cec09d3df373176f180517a` and the unchanged original Round3 52,488-case full HBP/source stone. The Windows configurations are separately required for final four-platform promotion in [run 38745021834](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38745021834).

**Scientific boundary:** All values are digital enumerations of a classical mathematical three-channel Fourier representation and SHA pseudo-routing. Neither seven normalized classes nor 27 ordered trit labels constitute directly measured optical wavelengths, actual stored photons, independent physical source custody, an engineered photonic medium, biological optogenetic activity, or quantum processing.

**Seat actions:** Coordinator update descriptions of *normalized* probability information loss; Seat1 verify exact rational seven-class theorem; Seat2 independently inspect sampler modulo-scale artifact, independently trusted source and QR source-gate integrity; Seat4 test intentional RGB plane-swaps and positive amplitude scaling with correct ordered Fischer index and 27-address identity as separate channels. No automatic merge or changes to historical frozen source.
