# Seat 1 — computational readiness status (2026-10-14)

**Computational status: COMPLETE — independently verified.**
**Physical-host status: UNVERIFIED — not eligible for three-physical-host challenge.**
**Fresh common challenge: NOT ISSUED.**

This session accepted responsibility for the *software* Seat 1 readiness track. It did not claim to control ACER, LIRIS or another separately witnessed physical machine.

## Published evidence

- [Signed public Seat 1 check-in](../tracking/checkins/seat-1/20261014T163705Z/checkin.json)
- [Signed salt precommit](../tracking/checkins/seat-1/20261014T163705Z/commit.json), SHA-256 commitment `e09978e417e609785cedb2939e479a1e843dc7afb8a3c0a62a93104195f60738`. Secret salt and signing private key are **not in GitHub** and were created in an ephemeral execution environment; this record is software-only and should not be used as a mandatory physical-host precommit.
- [Readiness HBP](../stones/2026-10-14-rainbow81/seat-1-20261014-computational-readiness.hbp) and [JSON](../stones/2026-10-14-rainbow81/seat-1-20261014-computational-readiness.json), each with SHA-256 sidecars.
- [Independent GitHub Actions run 38599984188](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38599984188), **Ubuntu runner 1000007635 PASS** and **Windows runner 1000007634 PASS**.
- [Independent public signature and HBP verifier](../physical/verify_seat1_computational.py), verifies three Ed25519 signatures, five published sidecar hashes, source/commitment/fixture constants, detects altered signature, and compares exact Python matrix / Node polynomial artifacts.

## Exact tested result

| Test | Outcome |
| --- | --- |
| 81 model bodies × 12 waves × 5 laws | **4,860/4,860 agreement** |
| GF(2) Python matrix vs independent Node cyclic polynomial | **Byte-identical HBP** on Linux and Windows |
| 10-trillion modeled steps | Exact algebraic fast-forward, **not** 10 trillion elapsed iterations |
| Python small-step controls | **120/120 PASS** |
| Node small-step controls | **120/120 PASS** |
| Published receipt Ed25519 signatures | **3/3 PASS** |
| Public sidecar checksum verifications | **5/5 PASS** |
| Mutation of signed public record | **Rejected** |
| HBP SHA-256 | `031367b1da1a368dc7471141a9799b79c694a0c9900f65a047438ccaa5f76600` |

The input is `PUBLIC_SYNTHETIC_PREFLIGHT_ONLY`, SHA-256 `7bc8a77f825c904962e90874e14093e635fafd7eaa70f52fce6188ba40cb8197`, from the already public `physical/make_preflight_fixture.js`. It uses the **new five locked stress laws**, `[[0,1],[0,2],[0,1,3],[0,4,7],[0,1,5,9]]`, pinned to source `2dadc995f460da957879bca7fd558cb037428ece`. This is not the older CA150/CA90/CA60/CA102/SHIFT workload or an independent fresh-challenge experiment.

## Explicit boundaries and next step

- **No independently attested physical host was used.** Ubuntu and Windows are distinct GitHub runner instances, not proven independent physical devices.
- Signing key fingerprint is a pseudonymous **session key**, not physical hardware identity; salt and private key are transient and **must not be relabeled as a durable physical machine credential**.
- The new three-physical-host coordinator must still acquire **three new, protocol-compliant, externally witnessed signed check-ins and precommits**, freeze the common source/laws/input serialization and issue a fresh challenge only after these commitments.
- No physical quantum correlation, light transport, gravity, or faster-than-light signaling was observed.

Seat 1 software candidate can be used for cross-checking existing results; it does **not** replace a custodian-operated physical seat.
