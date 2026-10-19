# Seat 1 preregistration — complementary lossy views and 81-bit observability

**Recorded before new verifier code or test results.** This is a public deterministic **computational** experiment. It builds on the merged Seat 2 [PR #18](../../experiments/seat2/recoverability_minimal_81.py), Seat 3 [PR #19](../../stones/2026-10-14-rainbow81/seat-3-one-bit-recovery-262440-v2.json), Seat 4 [PR #17](../../experiments/seat4/RECOVERY-VERSUS-LOSS-81.md), and pinned Seat 1 [triad challenge](TRIAD-27-CHALLENGE-20261014.json).

## The falsifiable question

When one lossy 81-bit GF(2) map cannot recover an arbitrary original state, can **two different lossy outputs about the SAME input** jointly determine that original with *zero extra retained source bits*? And can multiple later horizons of **the same map** accomplish the same thing?

All observations must begin with the exact same 81-bit source vector. Comparing unrelated input states is explicitly invalid.

## Frozen inputs, laws and predictions

- Public fixed challenge: `experiments/seat1/TRIAD-27-CHALLENGE-20261014.json`, SHA-256 `e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b`. Use its published nonce **only to construct reproducible test inputs**, not a physical-device precommit.
- Seven independently defined **lossy** 81-bit cyclic GF(2) taps, in fixed order:
  `CA150=[0,1,80]`, `CA90=[1,80]`, `CA60=[0,1]`, `CA102=[0,80]`, `TAP0=[0,1]`, `TAP1=[0,2]`, `TAP4=[0,1,5,9]`.
- Positive horizons: `1, 10000000000000, 10000000000001, 10000000000081`. A horizon is a fast-forwarded **modeled** step count.
- Per horizon **7 singleton views + 21 unordered pairs = 28 configurations**, hence 112 configurations. No invertible TAP2/TAP3 or SHIFT allowed to trivially force a positive result.
- Per configuration 191 states: zero, all-ones, 81 basis vectors, and 4 triad-seeded states (`body in [0,17,40,80]`) across each of 27 symbolic time×color×space waves. Total **21,392 exact source reconstruction records**.
- Preregistered rank predictions at **each horizon**: CA150 alone rank 79 (2 side bits); the other six singletons rank 80 (1 side bit); pairing CA150 with any of six others rank 81 (0 side bits); pairing any two other rank-80 maps rank 80 (1 bit).
- Totals: 24 full-rank paired configurations ×191 = **4,584 zero-extra-bit exact recoveries**; 84 rank-80 configurations ×191 = **16,044 one-bit-tag exact recoveries**; 4 rank-79 configurations ×191 = **764 two-bit-tag exact recoveries**.
- Two outputs `(F^T(x),F^(T+1)(x))` or `(F^T(x),F^(T+81)(x))` from the **same law** must NOT add rank because the later output is deterministically a function of the earlier. Require 14 no-gain assertions across seven laws and two later horizons.

## Independent implementations and acceptance

- Seat 1 Python: explicitly construct cyclic-polynomial 81-bit power, derive 81 source columns and a stacked 162-bit output for pairs; use Gaussian elimination on columns, independently derive kernel/free input coordinates, reconstruct from all outputs plus only the mathematically necessary free-source bits.
- Seat 1 Node.js: independently build a single-step 81×81 binary transfer **matrix** for each law, exponentiate by matrix composition and derive stacked output columns; solve via an independently written binary pivot method. Do not import/share Python algorithm code.
- Require identical canonical ASCII trace/HBP bytes and SHA-256 from both implementations, on Ubuntu and Windows GitHub-hosted runners. Exact rank table and per-case configuration counts are compared, not only SHA agreement.
- Each configuration: reconstruct **all 191** known originals; explicitly construct all nonzero kernel witnesses, show equal outputs for differing sources and different source SHA-256, and show wrong side tags select an alternate valid input (where rank is deficient).
- Predicted **96 explicit nonzero kernel collisions** and **88 wrong-tag checks** across 112 configurations. Tamper control: changing one output byte changes SHA-256; changing the pinned challenge must be rejected.
- FAIL on wrong rank, parity, reconstruction, count, malformed challenge, missing receipt, or any disagreement; publish mismatches instead of changing old stones.

## What this can and cannot demonstrate

A pair of different lossy measurements of **the same source** can be collectively invertible because their nullspaces intersect only in zero. The extra information in the second view is genuinely acquired by observing another transformation—it is **not** recovered from a single already-collapsed output, free compression, or authentication. Distinct future horizons of one law do not create new information. These are symbolic GF(2) simulation observations, not independent physical hosts, optical/photon detectors, gravity, quantum measurements, or faster-than-light signaling.

**Asolaria-Seat: seat-1 computational / physical independence unverified.**
