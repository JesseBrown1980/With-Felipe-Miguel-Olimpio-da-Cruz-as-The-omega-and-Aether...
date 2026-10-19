# Seat 4 — Information-preserving versus information-losing digital evolution

**Evidence class:** independently implemented digital GF(2) source-reconstruction experiment. This test does not measure a physical machine's independence, entropy flow, photons, gravity or signal propagation.

## The question

For the already published 81-bit cyclic rules, a matching future-state SHA-256 establishes agreement about the **future state**. It does not tell us whether that state uniquely determines the **original input**.

This Seat 4 experiment checks a stronger property: construct an inverse that recovers the exact original 81-bit vector, or prove a loss of distinguishability and recover the original using the *minimum* extra source bits.

## Frozen experiments and method

The immutable reference is the [Seat 1 public triad challenge](../../experiments/seat1/TRIAD-27-CHALLENGE-20261014.json), SHA-256 `e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b`. The earlier [Seat 4 rank proof](../../stones/2026-10-14-rainbow81/retention-81-rank40.json) supplies independently tested ranks for **10 rules at four positive horizons**: 1, 10^13, 10^13+1, 10^13+81 modeled steps.

For each rule/horizon, compute the 81 output columns. Gaussian elimination identifies independent *pivot input columns* and *free input columns*. Preserve exactly the original input bits at the free columns as a side-information tag. Given the output and tag, subtract the known free-column contribution, solve the independent pivot system, and restore the exact original input.

Because an 81-bit GF(2) map of rank r has a kernel with (2^{81-r}) members, **81-r extra bits are mathematically necessary and sufficient** to reconstruct *every possible* original source from its evolved output. Those tags are needed if only the final output and tag are retained; this is **not data compression**, and the tags do not authenticate themselves.

## Explicit results

| Map group | Rank | Retained side bits | Exact original-input recovery |
|---|---:|---:|---|
| Legacy CA150 | 79 | 2 | Yes, using 2 source bits |
| Legacy CA90 / CA60 / CA102 | 80 | 1 | Yes, using 1 source bit |
| Legacy cyclic SHIFT | 81 | 0 | Yes, direct inverse |
| New TAP0 / TAP1 / TAP4 | 80 | 1 | Yes, using 1 source bit |
| New TAP2 / TAP3 | 81 | 0 | Yes, direct inverse |

The test evaluates **40 rule/horizon combinations × 211 deterministic original inputs = 8,440 full round trips**, using independent Python polynomial exponentiation and Node.js explicit 81×81 matrix exponentiation.

- **2,532/2,532** input recoveries succeed with **zero additional bits** (three rank-81 rules × four horizons × 211 inputs).
- **5,908/5,908** recoveries succeed using exactly **one or two original-source tag bits**.
- **36** nonzero kernel vectors were explicitly constructed, showing that different inputs can yield the same future state when a tag is absent. Post-evolution SHA-256 of these already identical outputs is also identical; this is *not a cryptographic SHA-256 collision*.
- **28** wrong-tag controls show that changing a side-information tag selects another valid source for the same output. **A tag needs separate integrity/authentication protections** if used across an untrusted channel.

Expected canonical Python/Node trace SHA-256: `1d9a57dc908ad206d64ab336cd9f9de402614821c41369fb19dfb5f2f2c46bfe`.

[Seat 4 result stone](../../stones/2026-10-14-rainbow81/seat-4-minimal-recovery-20261014.json) and [SHA-256 sidecar](../../stones/2026-10-14-rainbow81/seat-4-minimal-recovery-20261014.json.sha256).

## Reproduce on any supported software runner

From repository root with Python 3.11+ and Node.js 22:

```sh
python experiments/seat4/verify_minimal_recovery.py
```

The verifier checks the earlier rank proof, the pinned challenge, complete source reconstruction in both independent algorithms, exact cross-language output bytes, the fixed full-trace checksum, all collision/tag negative controls, and the separately SHA-256-sealed JSON stone.

[Seat 4 dedicated CI workflow](../../.github/workflows/seat4-minimal-recovery.yml) tests Ubuntu and Windows with Python 3.11 and 3.13 (each also running Node.js 22).

## Non-claims

The separate older five-law and newer five-tap experiments are not retroactively merged into one input stream. The 10-trillion-step horizon is a **fast-forwarded digital exponent**, not elapsed years or physical signal travel. The signed identity of three separate physical hosts, a newly gated physical challenge, Seat 2's old signing-message preimage, remote Hugging Face mirror hashes, and author/licensing/DOI approval remain distinct unfinished requirements.
