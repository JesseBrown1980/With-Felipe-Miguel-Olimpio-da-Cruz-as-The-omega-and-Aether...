# Seat 1 preregistration — cross-view source-provenance adversarial challenge

**Committed before verifier implementations and before CI test results.** This follows merged computational Seat 1 PR #22, Seat 3 PR #21 independently reproducing our original triad, Seat 3 PR #19 exact recoveries and Seat 2 / Seat 4 recovery studies.

## Question

Does a jointly invertible pair of **lossy** 81-bit GF(2) transformations guarantee that both output observations actually came from the *same* original source?

**No.** Injectivity of the combined map proves mathematical source uniqueness **conditional on both outputs being faithfully sampled from one source**. It does not authenticate where each output came from. Test exact consistency and adversarial mismatched provenance separately.

## Inputs and scope

- Fixed public triad challenge: `experiments/seat1/TRIAD-27-CHALLENGE-20261014.json`, expected SHA-256 `e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b`.
- Seven frozen 81-bit cyclic GF(2) laws from merged Seat 1 PR #22: **A=CA150** taps `[0,1,80]`, six alternative B laws `CA90 [1,80], CA60 [0,1], CA102 [0,80], TAP0 [0,1], TAP1 [0,2], TAP4 [0,1,5,9]`.
- Four horizons `1, T=10^13, T+1, T+81`. **24 full-rank joint maps**. Exactly 191 deterministic source samples from original public triad fixture per pair/horizon ⇒ **4,584 cases per negative-control arm**.
- Independently calculate Python cyclic-polynomial and Node 81-column matrix exact transfer operators, 81-bit source-vector outputs, and solver witnesses.

## Three preregistered mismatched-provenance arms

For each A/B/horizon and source `x`, construct:

1. **Detected mismatch:** Choose the smallest basis index `j` such that `(0, B(e_j))` is NOT in the stacked joint operator's column space. Combine `A(x)` with `B(x XOR e_j)`. The pair is outside the image of the common-source map: **4,584/4,584 rejection controls**. Independently verify the rejection using GF(2) elimination. Do **not** force a preimage.
2. **Source identity substitution accepted:** Construct a nonzero `k_A ∈ ker(A)`. Because `ker(A) ∩ ker(B)={0}`, B(k_A) is nonzero. Combine `A(x)` with `B(x XOR k_A)`. This *is* a valid joint observation for `x XOR k_A`; the decoder must return that **different** original, not x: **4,584/4,584 substitution controls**. Proves exact reconstruction alone **does not authenticate** the claimed source.
3. **Invisible B-source discrepancy:** Construct a nonzero `k_B ∈ ker(B)`. Then `B(x XOR k_B)=B(x)`; the combined outputs are identical to the correct `(A(x), B(x))`. Decoder returns x, but we know the second input was different: **4,584/4,584 undetectable-provenance controls**.

A valid ordinary pair `(A(x),B(x))` recovers x exactly. Require **4,584/4,584 valid reference roundtrips**.

## Exact acceptance and error criteria

- All **24** pairs must have joint GF(2) rank 81, with rank(A)=79, rank(B)=80. Nonzero kernel construction must pass.
- **4 × 4,584 = 18,336** case-level checks across valid and three adversarial arms, excluding 24× independent kernel/rank and minimum-basis controls.
- 24 chosen rejecting bit indices; 24 A-kernel witnesses and 24 B-kernel witnesses; zero mismatches in all predicted outcomes.
- Two **independent** Python polynomial and Node matrix implementations generate byte-identical canonical ASCII HBP trace, result SHA-256 and **full** counts; execute on Ubuntu and Windows.
- Explicit SHA tamper check: modifying a trace byte changes digest. Pin input challenge SHA and laws, refuse changed input. HBP/JSON/HBI evidence gets append-only sidecar verification before main merge.
- This challenge is a public-input software falsification test, **NOT** authenticated communication, cryptographic MAC verification, compression, physically independent devices, quantum entanglement, gravity or superluminal signaling. A structurally consistent output pair alone cannot certify an original data source.

**Asolaria-Seat: seat-1 computational participant only.**
