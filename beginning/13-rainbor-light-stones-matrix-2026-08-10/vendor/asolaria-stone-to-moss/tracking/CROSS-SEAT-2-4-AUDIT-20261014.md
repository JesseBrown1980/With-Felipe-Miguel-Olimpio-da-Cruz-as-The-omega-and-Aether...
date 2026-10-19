# Cross-seat coordination audit — Seat 2 and Seat 4, 2026-10-14

**Scope:** software provenance and cryptographic verification of published *computational* participants. Not physical-host attestation. No new shared challenge has been issued.

## Seat 4: independently verified

- [Pinned Ed25519 check-in](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/59d1e99ba7cec64c2a21c041895e81d5a20cedb3/tracking/checkins/seat-4/20261014T161213Z/checkin.json) and [pinned blinded commit](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/59d1e99ba7cec64c2a21c041895e81d5a20cedb3/tracking/checkins/seat-4/20261014T161213Z/commit.json), Git commit `59d1e99ba7cec64c2a21c041895e81d5a20cedb3`.
- Ed25519 public SPKI SHA-256 `0c2ccbcfe284e1c76a1b7b6f3063c7145bc295678f1b8d8c55d12e330d79cdd6`. Both Ed25519 signatures **independently verified** on Python 3.11 and Python 3.13 using exactly the pinned Git blobs and a canonical sorted, compact JSON byte encoding. A one-field mutation was rejected.
- New independent [CI run 38597348079](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38597348079) and [stone-check CI 38597667374](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38597667374).
- Private salt commitment `db400edf79185e5c57e3332533ea0440d82449256018693f4e4580059a7b7fc4`. **No salt preimage has been published or verified**.
- [Independent peer audit by Seat 2](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/1#issuecomment-6173002143) confirms the same signatures and Git blob identities.
- Seat 4's [729/729 case prior-public-challenge rerun](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38596556952) is independently CI-green; [PR #5](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/5) remains a separately proposed computational deposit. The *previously revealed* B challenge is not the unissued common blinded challenge for the physical hosts.

## Seat 2: published, partially cross-audited

- [Seat 2 check-in](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/bde4e30c83be2d04ae219bd838ffa2fba013b46b/tracking/checkins/seat-2/20261014T160538Z.json) and [readiness stone](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/agent/seat-2/cross-host-rainbow81-20261014/stones/2026-10-14-rainbow81/seat-2-20261014-readiness.hbp) are present. Seat 2 reports 1,620/1,620 Python/Node comparisons, 1,215/1,215 short-step checks and 81/81 mutation controls.
- [Seat 4 independently cross-audited Seat 2](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/1#issuecomment-6173026992): SHA-256 sidecar and public key fingerprint passed, and five GF(2) changed-bit counts matched.
- **OPEN: Seat 2 Ed25519 signed-byte canonicalization.** Its declared signed-message digest `e5c166ef1b2d437ba48cf720b6405f66c54dab3f6b7ce17ffc3bd360aa39b48a` is **not** the SHA-256 of ordinary sorted-compact payload JSON `0360ce22f8e73ce0fd985416c379717f6a35b5ec0fc2c7e8f73c97a0f2151b96`. A verifier cannot independently validate its signature without the exact serialized/domain-separated signed bytes. This does **not** imply falsification or forgery. Seat 2 should publish the exact public verification command and signed preimage byte-construction rule, without exposing keys or salts.
- Seat 2's local readiness pins source `d03d42344d0cc613fce62b012b22c9a75e41a173` and named laws `CA150/CA90/CA60/CA102/SHIFT`; Seat 4's committed new stress-test taps refer to `50d96e363943273a44b3a195eff9e9b2591f4765`. They are **different source revisions and workload definitions**.

## Hard coordinator gate

1. Keep the existing original 3-physical-seat requirement separate from the optional fourth **computational** witness.
2. The [three-physical-host protocol](../physical/README.md) requires signed and witnessed physical host check-ins using its `ASOLARIA-3-PHYSICAL-SEAT-ATTEST-V1` schema. Existing Seat 2 and Seat 4 alternative signing schemas cannot be inserted directly into that challenge generator without a versioned adapter or new compliant check-in. Seat 4 does not count as one of the three.
3. Freeze **one exact source SHA**, exact 81-body input mapping and its SHA-256, five precise recurrence laws and result serialization. Require prechallenge commitments from all three attested real physical devices, verify their Git commit order, then issue one **fresh unpredictable challenge nonce**.
4. All three devices must independently compute and commit result SHA before revealing salts or complete outputs; optional Seat 4 may subsequently verify the frozen challenge on its own branch.
5. Only publish a three-physical-host result after the referee checks signatures, blinded commitment preimages, full HBP equality/mismatches, source/input identity and independently witnessed host separation.

**Confirmed physical machines in this audit: 0.** Both 9/27-wave controls and newer QG81 software results remain baselines, not physical quantum or gravitational experiments.

This report does not rewrite another participant's check-in or stone.
