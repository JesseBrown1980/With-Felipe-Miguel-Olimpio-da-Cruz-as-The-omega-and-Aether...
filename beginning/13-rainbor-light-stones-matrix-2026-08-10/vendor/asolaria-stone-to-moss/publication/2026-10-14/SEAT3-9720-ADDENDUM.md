# Seat 3 follow-on audit addendum — 9,720 two-horizon computational controls

**Date:** 2026-10-14 UTC  
**Evidence class:** deterministic, reproducible software experiment; **not** an additional physically independent device.

This document adds a **distinct later experiment** to the original four-seat computational release. It does **not** replace or increase the original Seat 3 readiness count of 4,860, and it does **not** recast the four seat labels as a single common-input four-host experiment.

## Published source and verification

- [Merged experiment PR #11](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/11), merge `bf956c8e92ff7b6efed07b97c1e8df25b10e6d20`.
- [Result metadata](../../stones/2026-10-14-rainbow81/seat-3-two-horizon-9720-control.json).
- [Python 81-column matrix reference](../../experiments/seat3/two_horizon_matrix.py).
- [Independent Node.js cyclic-polynomial reference](../../experiments/seat3/two_horizon_polynomial.js).
- [Linux/Python 3.11 and 3.13 CI run 38647138816](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38647138816): PASS for both Python versions.
- [Credential-free publisher staging](../../tools/publish_seat3_two_horizon_to_hf.py) independently rebuilds the full HBP, checks both algorithms' byte equality and verifies the pinned output SHA-256.

The separate test comprises **12 waves × 5 laws × 81 bodies × 2 modeled horizons = 9,720 state records per implementation**. The two horizons are `10^13` and `10^13 + 1` *modeled* GF(2) steps; binary exponentiation computes the states without physically waiting for that many steps. There were **9,720/9,720** equal records, zero reported disagreements, 120 direct small-step controls and 9,720 `t→t+1` consistency controls per implementation.

Full regenerated HBP SHA-256: `245ab02b30cbdd9215d161c6561adc6a6c3bf72dd3fa2cb62979b2fb74031cef`.

Five-tap vectors, in order: `[[0,1], [0,2], [0,1,3], [0,4,7], [0,1,5,9]]`. These are **not** CA150/CA90/CA60/CA102/SHIFT, and input/canonical-output identity with those historical tests is **not** claimed.

## Release integration

The four-seat release audit now invokes the independent Python/Node staging verifier and validates this follow-on stone's metadata. The four-seat Hugging Face package now **includes** its JSON stone and both source implementations alongside this addendum. The staged manifest hashes each included file. This addition does not alter the immutable earlier receipt contents.

## Open gates

**Hugging Face remote publication:** not yet verified. Existing GitHub CI validates local staging only. Remote publication still requires the protected, newly rotated write-scoped `HF_TOKEN` secret and a successful upload followed by remote SHA-256 readback.

**Original Seat 2 Ed25519 signed-message preimage:** unresolved; do not count as independently verified.

**Three independently attested physical hosts, fresh post-precommit nonce and cross-device measurements:** not established. No photon/gravity effects, entanglement or faster-than-light signaling were measured by this software experiment.

[Main public release report](REPORT.md) · [Machine-readable release status](STATUS.json) · [Release gate Issue #10](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/10).
